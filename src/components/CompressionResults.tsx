"use client";

import { ArrowDownTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { CompressedFile } from "@/app/compress/page";
import { useState } from "react";

interface CompressionResultsProps {
  files: CompressedFile[];
}

export default function CompressionResults({ files }: CompressionResultsProps) {
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(
    new Set()
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (type: CompressedFile["type"]) => {
    switch (type) {
      case "pdf":
        return "📄";
      case "image":
        return "🖼️";
      case "document":
        return "📝";
      default:
        return "📁";
    }
  };

  const getCompressionColor = (ratio: number) => {
    if (ratio >= 70) return "text-green-600 bg-green-100";
    if (ratio >= 50) return "text-blue-600 bg-blue-100";
    if (ratio >= 30) return "text-orange-600 bg-orange-100";
    if (ratio >= 10) return "text-yellow-600 bg-yellow-100";
    return "text-gray-600 bg-gray-100";
  };

  const handleDownload = (file: CompressedFile) => {
    // Simulation du téléchargement
    const link = document.createElement("a");
    link.href = file.downloadUrl;
    link.download = `compressed_${file.originalName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedFiles((prev) => new Set(Array.from(prev).concat(file.id)));

    // Message de succès
    const notification = document.createElement("div");
    notification.className =
      "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50";
    notification.textContent = `${file.originalName} téléchargé avec succès!`;
    document.body.appendChild(notification);

    setTimeout(() => {
      document.body.removeChild(notification);
    }, 3000);
  };

  const handleDownloadAll = () => {
    files.forEach((file) => {
      setTimeout(() => handleDownload(file), 200); // Petit délai entre chaque téléchargement
    });
  };

  const totalOriginalSize = files.reduce(
    (sum, file) => sum + file.originalSize,
    0
  );
  const totalCompressedSize = files.reduce(
    (sum, file) => sum + file.compressedSize,
    0
  );
  const totalSavings = totalOriginalSize - totalCompressedSize;
  const averageCompression =
    Math.round((totalSavings / totalOriginalSize) * 100) || 0;

  return (
    <div className="bg-white rounded-3xl shadow-lg p-8">
      {/* Header avec statistiques globales */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Résultats de compression
          </h3>
          <p className="text-gray-600">
            {files.length} fichier{files.length > 1 ? "s" : ""} traité
            {files.length > 1 ? "s" : ""}
          </p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="bg-green-50 px-4 py-3 rounded-2xl text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatFileSize(totalSavings)}
            </div>
            <div className="text-sm text-green-700">Économisés</div>
          </div>
          <div className="bg-blue-50 px-4 py-3 rounded-2xl text-center">
            <div className="text-2xl font-bold text-blue-600">
              {averageCompression}%
            </div>
            <div className="text-sm text-blue-700">Compression moy.</div>
          </div>
        </div>
      </div>

      {/* Action globale */}
      <div className="mb-6">
        <button
          onClick={handleDownloadAll}
          className="bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-600 hover:to-violet-700 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105 flex items-center space-x-2"
        >
          <ArrowDownTrayIcon className="w-5 h-5" />
          <span>Télécharger tout ({files.length})</span>
        </button>
      </div>

      {/* Liste des fichiers */}
      <div className="space-y-4">
        {files.map((file) => (
          <div
            key={file.id}
            className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              {/* Info fichier */}
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                <div className="text-3xl">{getFileIcon(file.type)}</div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {file.originalName}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                    <span>{formatFileSize(file.originalSize)}</span>
                    <span>→</span>
                    <span className="text-green-600 font-medium">
                      {formatFileSize(file.compressedSize)}
                    </span>
                    <span className="text-xs text-gray-400">
                      (économie:{" "}
                      {formatFileSize(file.originalSize - file.compressedSize)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistiques */}
              <div className="flex items-center space-x-4">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${getCompressionColor(
                    file.compressionRatio
                  )}`}
                >
                  -{file.compressionRatio}%
                </div>

                <button
                  onClick={() => handleDownload(file)}
                  disabled={downloadedFiles.has(file.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all ${
                    downloadedFiles.has(file.id)
                      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 text-white transform hover:scale-105"
                  }`}
                >
                  {downloadedFiles.has(file.id) ? (
                    <>
                      <span>✓</span>
                      <span>Téléchargé</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      <span>Télécharger</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Barre de progression visuelle de la compression */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Taille originale</span>
                <span>Compression réalisée</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-400 to-green-400 h-2 rounded-full transition-all duration-1000"
                  style={{ width: `${file.compressionRatio}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info de suppression automatique */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
        <div className="flex items-center space-x-2 text-yellow-800">
          <span>⏰</span>
          <div>
            <p className="font-medium">Suppression automatique dans 1 heure</p>
            <p className="text-sm">
              Téléchargez vos fichiers maintenant pour les conserver.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
