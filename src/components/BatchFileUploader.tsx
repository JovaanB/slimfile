"use client";

import { useState, useRef, useCallback } from "react";
import {
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CompressedFile } from "@/app/compress/page";

interface BatchFileUploaderProps {
  onCompressionStart: () => void;
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

  /**
   * Optimise une image côté client
   */
  const optimizeImage = async (
    file: File
  ): Promise<{ file: File; stats: any }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new Image();

      img.onload = () => {
        // Calculer nouvelles dimensions
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

        // Conversion avec qualité adaptative
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
              // Fallback si échec
              resolve({ file, stats: null });
            }
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        resolve({ file, stats: null });
      };

      img.src = URL.createObjectURL(file);
    });
  };

  /**
   * Traite un fichier individuellement
   */
  const processFile = async (file: File, index: number): Promise<File> => {
    const id = `file-${index}`;

    // Mise à jour : optimisation
    setFileProgresses((prev) =>
      prev.map((fp) =>
        fp.id === id ? { ...fp, status: "optimizing", progress: 25 } : fp
      )
    );

    let processedFile = file;
    let clientOptimization = undefined;

    // Optimisation pour les images
    if (file.type.startsWith("image/")) {
      try {
        const result = await optimizeImage(file);
        processedFile = result.file;
        clientOptimization = result.stats;
      } catch (error) {
        console.warn("Optimisation image échouée:", error);
      }
    }

    // Simulation délai (pour autres types)
    if (!file.type.startsWith("image/")) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Mise à jour : optimisation terminée
    setFileProgresses((prev) =>
      prev.map((fp) =>
        fp.id === id
          ? {
              ...fp,
              status: "uploading",
              progress: 50,
              clientOptimization,
            }
          : fp
      )
    );

    return processedFile;
  };

  /**
   * Upload vers le serveur
   */
  const uploadToServer = async (
    processedFiles: File[],
    originalFiles: File[]
  ) => {
    const formData = new FormData();

    // Ajouter les fichiers traités
    processedFiles.forEach((file) => {
      formData.append("files", file);
    });

    // Ajouter les tailles originales pour le calcul correct
    originalFiles.forEach((file) => {
      formData.append("originalSizes", file.size.toString());
    });

    // Mise à jour : compression serveur
    setFileProgresses((prev) =>
      prev.map((fp) => ({
        ...fp,
        status: "compressing" as const,
        progress: 75,
      }))
    );

    const response = await fetch("/api/compress", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erreur de compression serveur");
    }

    return data.files;
  };

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (file.size > maxSize) {
      return "Le fichier dépasse 10MB";
    }

    if (!allowedTypes.includes(file.type)) {
      return "Format non supporté";
    }

    return null;
  };

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (isDisabled) return;

      // Validation
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

      // Initialiser les progrès
      const newProgresses: FileProgress[] = validFiles.map((file, index) => ({
        id: `file-${index}`,
        file,
        progress: 0,
        status: "pending",
      }));

      setFileProgresses(newProgresses);
      onCompressionStart();

      try {
        // Traitement par lots côté client
        const processedFiles: File[] = [];

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

        if (processedFiles.length === 0) {
          throw new Error("Aucun fichier n'a pu être traité");
        }

        // Upload vers serveur avec les tailles originales
        const serverResults = await uploadToServer(processedFiles, validFiles);

        // Finaliser
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

        // Nettoyer après 3 secondes
        setTimeout(() => {
          setFileProgresses([]);
        }, 3000);
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

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDisabled) {
        setIsDragOver(true);
      }
    },
    [isDisabled]
  );

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!isDisabled && e.dataTransfer.files.length > 0) {
        handleFiles(Array.from(e.dataTransfer.files));
      }
    },
    [isDisabled, handleFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles]
  );

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
    switch (status) {
      case "pending":
        return "⏳";
      case "optimizing":
        return "⚡";
      case "uploading":
        return "📤";
      case "compressing":
        return "🔄";
      case "completed":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStatusText = (status: FileProgress["status"]) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "optimizing":
        return "Optimisation côté client";
      case "uploading":
        return "Upload vers serveur";
      case "compressing":
        return "Compression serveur";
      case "completed":
        return "Terminé";
      case "error":
        return "Erreur";
      default:
        return "En attente";
    }
  };

  return (
    <div className="space-y-6">
      {/* Zone de drop */}
      <div
        className={`relative border-3 border-dashed rounded-3xl transition-all duration-300 cursor-pointer ${
          isDisabled
            ? "border-gray-300 bg-gray-50 cursor-not-allowed p-8"
            : isDragOver
            ? "border-green-400 bg-green-50 scale-105 p-16"
            : "border-gray-300 hover:border-sky-400 hover:bg-sky-50 p-12"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isDisabled && fileInputRef.current?.click()}
      >
        <div className="text-center">
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
              <div className="relative">
                <CloudArrowUpIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <SparklesIcon className="w-6 h-6 absolute -top-1 -right-1 text-yellow-500 animate-pulse" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                Glissez vos fichiers ici
              </p>
              <p className="text-gray-500 mb-4">ou cliquez pour sélectionner</p>
              <div className="bg-blue-50 rounded-2xl p-4 max-w-md mx-auto">
                <p className="text-sm text-blue-800 font-medium">
                  ⚡ Traitement par lots
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

      {/* Progrès des fichiers */}
      {fileProgresses.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-blue-500" />
            Traitement en cours (
            {fileProgresses.filter((fp) => fp.status === "completed").length}/
            {fileProgresses.length})
          </h3>
          {fileProgresses.map((fileProgress) => (
            <div
              key={fileProgress.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="text-2xl">{getFileIcon(fileProgress.file)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {fileProgress.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(fileProgress.file.size)}
                    {fileProgress.clientOptimization && (
                      <span className="ml-2 text-green-600">
                        →{" "}
                        {formatFileSize(
                          fileProgress.clientOptimization.optimizedSize
                        )}
                        (-{fileProgress.clientOptimization.compressionRatio}%
                        côté client)
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
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

              {/* Barre de progression */}
              <div className="mt-3">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      fileProgress.status === "error"
                        ? "bg-red-500"
                        : "bg-gradient-to-r from-blue-500 to-green-500"
                    }`}
                    style={{ width: `${fileProgress.progress}%` }}
                  />
                </div>
              </div>

              {fileProgress.error && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg p-2">
                  {fileProgress.error}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        multiple
        className="hidden"
      />
    </div>
  );
}
