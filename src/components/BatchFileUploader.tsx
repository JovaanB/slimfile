import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CompressedFile } from "@/app/compress/page";

interface BatchFileUploaderProps {
  onCompressionStart: (fileCount: number, fileTypes: string[]) => void;
  onCompressionEnd: () => void;
  onFilesCompressed: (files: CompressedFile[]) => void;
  isDisabled?: boolean;
}

interface FileProgress {
  id: string;
  file: File;
  progress: number;
  status:
    | "pending"
    | "optimizing"
    | "uploading"
    | "compressing"
    | "completed"
    | "error";
  error?: string;
  preview?: string;
  clientOptimization?: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  };
}

export default function BatchFileUploader({
  onCompressionStart,
  onCompressionEnd,
  onFilesCompressed,
  isDisabled = false,
}: BatchFileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileProgresses, setFileProgresses] = useState<FileProgress[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const optimizeImage = async (
    file: File
  ): Promise<{ file: File; stats: any }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        let { width, height } = img;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const quality = file.size > 2 * 1024 * 1024 ? 0.7 : 0.8;
        const outputType =
          file.type === "image/png" && file.size > 1024 * 1024
            ? "image/jpeg"
            : file.type;

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const optimizedFile = new File([blob], file.name, {
                type: blob.type,
              });
              const compressionRatio = Math.round(
                ((file.size - blob.size) / file.size) * 100
              );

              resolve({
                file: optimizedFile,
                stats: {
                  originalSize: file.size,
                  optimizedSize: blob.size,
                  compressionRatio: Math.max(0, compressionRatio),
                },
              });
            } else {
              resolve({ file, stats: null });
            }
          },
          outputType,
          quality
        );
      };

      img.onerror = () => resolve({ file, stats: null });
      img.src = URL.createObjectURL(file);
    });
  };

  const processFile = async (file: File, index: number): Promise<File> => {
    const id = `file-${index}`;

    setFileProgresses((prev) =>
      prev.map((fp) =>
        fp.id === id ? { ...fp, status: "optimizing", progress: 15 } : fp
      )
    );

    await new Promise((resolve) => setTimeout(resolve, 300));

    setFileProgresses((prev) =>
      prev.map((fp) => (fp.id === id ? { ...fp, progress: 30 } : fp))
    );

    let processedFile = file;
    let clientOptimization = undefined;

    if (file.type.startsWith("image/")) {
      try {
        const result = await optimizeImage(file);
        processedFile = result.file;
        clientOptimization = result.stats;

        // Mise à jour progressive
        setFileProgresses((prev) =>
          prev.map((fp) => (fp.id === id ? { ...fp, progress: 45 } : fp))
        );
      } catch (error) {
        console.warn("Optimisation image échouée:", error);
      }
    } else {
      // Simulation pour autres types avec progression
      await new Promise((resolve) => setTimeout(resolve, 200));
      setFileProgresses((prev) =>
        prev.map((fp) => (fp.id === id ? { ...fp, progress: 45 } : fp))
      );
    }

    setFileProgresses((prev) =>
      prev.map((fp) =>
        fp.id === id
          ? { ...fp, status: "uploading", progress: 50, clientOptimization }
          : fp
      )
    );

    return processedFile;
  };

  const uploadToServer = async (
    processedFiles: File[],
    originalFiles: File[]
  ) => {
    const formData = new FormData();

    processedFiles.forEach((file) => formData.append("files", file));
    originalFiles.forEach((file) =>
      formData.append("originalSizes", file.size.toString())
    );

    // Animation de progression pendant l'upload
    setFileProgresses((prev) =>
      prev.map((fp) => ({
        ...fp,
        status: "compressing" as const,
        progress: 75,
      }))
    );

    // Simulation de progression upload
    const uploadProgress = [75, 80, 85, 90, 95];
    for (const progress of uploadProgress) {
      await new Promise((resolve) => setTimeout(resolve, 150));
      setFileProgresses((prev) => prev.map((fp) => ({ ...fp, progress })));
    }

    const response = await fetch("/api/compress", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Erreur de compression serveur");

    return data.files;
  };

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (file.size > maxSize) return "Le fichier dépasse 10MB";
    if (!allowedTypes.includes(file.type)) return "Format non supporté";
    return null;
  };

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (isDisabled) return;

      const validFiles: File[] = [];
      const errors: string[] = [];

      files.forEach((file) => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        alert("Erreurs détectées:\n" + errors.join("\n"));
      }
      if (validFiles.length === 0) return;

      // Initialiser avec animation
      const newProgresses: FileProgress[] = validFiles.map((file, index) => ({
        id: `file-${index}`,
        file,
        progress: 0,
        status: "pending",
      }));

      setFileProgresses(newProgresses);
      onCompressionStart(
        validFiles.length,
        validFiles.map((f) => f.type)
      );

      try {
        const processedFiles: File[] = [];

        // Traitement séquentiel avec animations
        for (let i = 0; i < validFiles.length; i++) {
          try {
            const processedFile = await processFile(validFiles[i], i);
            processedFiles.push(processedFile);
          } catch (error) {
            console.error(
              `Erreur traitement fichier ${validFiles[i].name}:`,
              error
            );
            setFileProgresses((prev) =>
              prev.map((fp) =>
                fp.id === `file-${i}`
                  ? {
                      ...fp,
                      status: "error",
                      error:
                        error instanceof Error
                          ? error.message
                          : "Erreur inconnue",
                    }
                  : fp
              )
            );
          }
        }

        if (processedFiles.length === 0)
          throw new Error("Aucun fichier n'a pu être traité");

        const serverResults = await uploadToServer(processedFiles, validFiles);

        // Animation finale avec délai
        setFileProgresses((prev) =>
          prev.map((fp) => ({
            ...fp,
            status: "completed" as const,
            progress: 100,
          }))
        );

        const compressedFiles: CompressedFile[] = serverResults.map(
          (file: any) => ({
            id: file.id,
            originalName: file.originalName,
            originalSize: file.originalSize,
            compressedSize: file.compressedSize,
            compressionRatio: file.compressionRatio,
            downloadUrl: file.downloadUrl,
            type: file.type,
          })
        );

        onFilesCompressed(compressedFiles);

        // Cleanup après animation de succès
        setTimeout(() => setFileProgresses([]), 4000);
      } catch (error) {
        console.error("Erreur globale:", error);
        setFileProgresses((prev) =>
          prev.map((fp) => ({
            ...fp,
            status: "error" as const,
            error: error instanceof Error ? error.message : "Erreur inconnue",
          }))
        );
        alert(
          `Erreur: ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`
        );
      } finally {
        onCompressionEnd();
      }
    },
    [isDisabled, onCompressionStart, onCompressionEnd, onFilesCompressed]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current += 1;
      if (!isDisabled) setIsDragOver(true);
    },
    [isDisabled]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragOver(false);
      if (!isDisabled && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [isDisabled, handleFiles]
  );

  const removeFile = (fileId: string) => {
    setFileProgresses((prev) => prev.filter((fp) => fp.id !== fileId));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (file: File) => {
    if (file.type === "application/pdf") return "📄";
    if (file.type.startsWith("image/")) return "🖼️";
    return "📝";
  };

  const getStatusIcon = (status: FileProgress["status"]) => {
    const icons = {
      pending: "⏳",
      optimizing: "⚡",
      uploading: "📤",
      compressing: "🔄",
      completed: "✅",
      error: "❌",
    };
    return icons[status];
  };

  const getStatusText = (status: FileProgress["status"]) => {
    const texts = {
      pending: "En attente",
      optimizing: "Optimisation côté client",
      uploading: "Upload vers serveur",
      compressing: "Compression serveur",
      completed: "Terminé",
      error: "Erreur",
    };
    return texts[status];
  };

  return (
    <div className="space-y-6">
      {/* Zone de drop améliorée */}
      <div
        className={`relative border-3 border-dashed rounded-3xl transition-all duration-500 cursor-pointer overflow-hidden ${
          isDisabled
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : isDragOver
            ? "border-green-400 bg-gradient-to-br from-green-50 to-blue-50 scale-[1.02] shadow-xl"
            : "border-gray-300 hover:border-sky-400 hover:bg-gradient-to-br hover:from-sky-50 hover:to-indigo-50 hover:scale-[1.01] hover:shadow-lg"
        }`}
        style={{ minHeight: isDragOver ? "200px" : "180px" }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
      >
        {/* Animation de background */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-500 to-green-400 opacity-0 transition-opacity duration-500 ${
            isDragOver ? "opacity-10" : ""
          }`}
        />

        <div className="relative z-10 text-center p-8">
          {isDisabled ? (
            <>
              <ExclamationTriangleIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-semibold text-gray-500 mb-2">
                Limite atteinte
              </p>
              <p className="text-gray-400">
                Passez à Pro pour continuer à compresser
              </p>
            </>
          ) : (
            <>
              <div
                className={`relative transform transition-transform duration-300 ${
                  isDragOver ? "scale-110" : ""
                }`}
              >
                <CloudArrowUpIcon
                  className={`w-16 h-16 mx-auto mb-4 transition-colors duration-300 ${
                    isDragOver ? "text-green-500" : "text-gray-400"
                  }`}
                />
                <SparklesIcon className="w-6 h-6 absolute -top-1 -right-1 text-yellow-500 animate-pulse" />
              </div>

              <p
                className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                  isDragOver ? "text-green-700" : "text-gray-700"
                }`}
              >
                {isDragOver
                  ? "Déposez vos fichiers ici !"
                  : "Glissez vos fichiers ici"}
              </p>

              <p className="text-gray-500 mb-4">ou cliquez pour sélectionner</p>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 max-w-md mx-auto border border-blue-100">
                <p className="text-sm text-blue-800 font-medium">
                  ⚡ Traitement par lots intelligent
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Optimisation côté client + compression serveur
                </p>
              </div>

              <p className="text-xs text-gray-400 mt-4">
                PDF, JPG, PNG, DOCX • Max 10MB par fichier
              </p>
            </>
          )}
        </div>
      </div>

      {/* Liste des fichiers avec previews */}
      {fileProgresses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <SparklesIcon className="w-5 h-5 mr-2 text-blue-500" />
              Traitement en cours (
              {fileProgresses.filter((fp) => fp.status === "completed").length}/
              {fileProgresses.length})
            </h3>

            {/* Progression globale */}
            <div className="text-sm text-gray-500">
              {Math.round(
                fileProgresses.reduce((sum, fp) => sum + fp.progress, 0) /
                  fileProgresses.length
              )}
              % complet
            </div>
          </div>

          <div className="grid gap-4">
            {fileProgresses.map((fileProgress) => (
              <div
                key={fileProgress.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300 ${
                  fileProgress.status === "completed"
                    ? "border-green-200 bg-green-50"
                    : fileProgress.status === "error"
                    ? "border-red-200 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border border-gray-200">
                        <span className="text-2xl">
                          {getFileIcon(fileProgress.file)}
                        </span>
                      </div>
                    </div>

                    {/* Informations du fichier */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate pr-4">
                          {fileProgress.file.name}
                        </p>
                        {fileProgress.status === "pending" && (
                          <button
                            onClick={() => removeFile(fileProgress.id)}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(fileProgress.file.size)}</span>
                        {fileProgress.clientOptimization && (
                          <>
                            <span>→</span>
                            <span className="text-green-600 font-medium">
                              {formatFileSize(
                                fileProgress.clientOptimization.optimizedSize
                              )}
                              <span className="ml-1">
                                (-
                                {
                                  fileProgress.clientOptimization
                                    .compressionRatio
                                }
                                %)
                              </span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status et progression */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        <span
                          className={`text-lg ${
                            fileProgress.status === "compressing"
                              ? "animate-spin"
                              : ""
                          }`}
                        >
                          {getStatusIcon(fileProgress.status)}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {fileProgress.progress}%
                          </p>
                          <p className="text-xs text-gray-500">
                            {getStatusText(fileProgress.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Barre de progression animée */}
                  <div className="mt-3">
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ease-out ${
                          fileProgress.status === "error"
                            ? "bg-red-500"
                            : fileProgress.status === "completed"
                            ? "bg-green-500"
                            : "bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"
                        }`}
                        style={{
                          width: `${fileProgress.progress}%`,
                          backgroundSize:
                            fileProgress.status === "compressing"
                              ? "200% 100%"
                              : "100% 100%",
                          animation:
                            fileProgress.status === "compressing"
                              ? "gradient-x 2s ease infinite"
                              : "none",
                        }}
                      />
                    </div>
                  </div>

                  {fileProgress.error && (
                    <div className="mt-3 text-xs text-red-600 bg-red-100 rounded-lg p-3 border border-red-200">
                      <strong>Erreur:</strong> {fileProgress.error}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) =>
          e.target.files && handleFiles(Array.from(e.target.files))
        }
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        multiple
        className="hidden"
      />

      <style jsx>{`
        @keyframes gradient-x {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}
