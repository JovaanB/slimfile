import React, { useState, useEffect } from "react";
import { usePostHog } from "@/hooks/usePosthog";
import { useDashboard, useDashboardActions } from "@/hooks/useDashboard";
import {
  ChartBarIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  StarIcon,
  TrophyIcon,
  ChartPieIcon,
  CalendarIcon,
  FolderIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

export default function UserDashboard() {
  const { track, events } = usePostHog();
  const { data, loading, error, setTimeRange, timeRange } = useDashboard();
  const { downloadFile, previewFile, exportHistory } = useDashboardActions();
  const [activeTab, setActiveTab] = useState<
    "overview" | "history" | "analytics"
  >("overview");

  // Track dashboard view
  useEffect(() => {
    track(events.DASHBOARD_VIEWED, {
      tab: activeTab,
      time_range: timeRange,
    });
  }, [activeTab, timeRange, track, events]);

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    track("dashboard_tab_changed", { tab });
  };

  const handleTimeRangeChange = (range: typeof timeRange) => {
    setTimeRange(range);
  };

  const handleFileDownload = async (fileId: string, fileName: string) => {
    const result = await downloadFile(fileId, fileName);
    if (!result.success) {
      console.error("Erreur de téléchargement:", result.error);
      // Tu peux afficher une notification d'erreur ici
    }
  };

  const handleFilePreview = async (fileId: string, fileName: string) => {
    await previewFile(fileId, fileName);
  };

  const handleExportHistory = async () => {
    const result = await exportHistory("csv");
    if (!result.success) {
      console.error("Erreur d'export:", result.error);
    }
  };

  const formatFileSize = (sizeInMB: number) => {
    // Convertir MB en bytes pour avoir plus de flexibilité
    const sizeInBytes = sizeInMB * 1024 * 1024;

    if (sizeInBytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));

    const size = sizeInBytes / Math.pow(k, i);

    // Arrondir intelligemment selon la taille
    let formattedSize;
    if (i === 0) {
      // Bytes
      formattedSize = Math.round(size).toString();
    } else if (i === 1) {
      // KB
      formattedSize = size < 10 ? size.toFixed(1) : Math.round(size).toString();
    } else {
      // MB, GB, TB
      formattedSize = size < 10 ? size.toFixed(1) : size.toFixed(0);
    }

    return `${formattedSize} ${sizes[i]}`;
  };

  // Fonction spécialisée pour les très gros nombres (stats cards)
  const formatLargeSize = (sizeInMB: number) => {
    if (sizeInMB === 0) return "0 MB";

    const sizeInBytes = sizeInMB * 1024 * 1024;
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(sizeInBytes) / Math.log(k));

    const size = sizeInBytes / Math.pow(k, i);

    // Pour les stats cards, on veut plus de précision
    let formattedSize;
    if (i <= 1) {
      // B, KB
      formattedSize = Math.round(size).toString();
    } else if (i === 2) {
      // MB
      formattedSize =
        size < 100 ? size.toFixed(1) : Math.round(size).toString();
    } else {
      // GB, TB
      formattedSize = size.toFixed(2);
    }

    return `${formattedSize} ${sizes[i]}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFileIcon = (type: string) => {
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

  const getAchievementLevel = (compressions: number) => {
    if (compressions >= 100)
      return { level: "Expert", icon: "🏆", color: "text-yellow-600" };
    if (compressions >= 50)
      return { level: "Pro", icon: "⭐", color: "text-blue-600" };
    if (compressions >= 20)
      return { level: "Avancé", icon: "🎯", color: "text-green-600" };
    if (compressions >= 10)
      return { level: "Régulier", icon: "📈", color: "text-purple-600" };
    return { level: "Débutant", icon: "🌱", color: "text-gray-600" };
  };

  // Gestion des états de chargement et d'erreur
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-sky-500 text-white px-6 py-2 rounded-lg hover:bg-sky-600 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const stats = data.stats;
  const history = data.history || [];
  const analytics = data.analytics;
  const achievement = getAchievementLevel(stats?.totalCompressions || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="w-8 h-8 mr-3 text-sky-500" />
                Tableau de bord
              </h1>
            </div>
            <p className="text-gray-600 mt-1">
              Suivez vos performances de compression
            </p>
          </div>

          {/* Achievement Badge */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{achievement.icon}</div>
              <div>
                <div className={`font-semibold ${achievement.color}`}>
                  {achievement.level}
                </div>
                <div className="text-sm text-gray-500">
                  {stats?.totalCompressions || 0} compressions
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 shadow-lg mb-8">
        <div className="flex space-x-1">
          {[
            { id: "overview", label: "Vue d'ensemble", icon: ChartPieIcon },
            { id: "history", label: "Historique", icon: ClockIcon },
            { id: "analytics", label: "Analyses", icon: ChartBarIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as typeof activeTab)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sky-100 text-sm">Total économisé</p>
                  <p className="text-3xl font-bold">
                    {formatLargeSize(stats?.totalSizeSavedMB || 0)}
                  </p>
                </div>
                <TrophyIcon className="w-8 h-8 text-sky-200" />
              </div>
              <div className="mt-4 text-sky-100 text-sm">
                Sur {formatLargeSize(stats?.totalOriginalSizeMB || 0)} traités
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Compressions</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.totalCompressions || 0}
                  </p>
                </div>
                <DocumentIcon className="w-8 h-8 text-green-500" />
              </div>
              <div className="mt-4 text-green-600 text-sm font-medium">
                +{stats?.thisMonthCompressions || 0} ce mois-ci
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Ratio moyen</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.avgCompressionRatio || 0}%
                  </p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-purple-500" />
              </div>
              <div className="mt-4 text-purple-600 text-sm font-medium">
                Type favori: {stats?.favoriteFileType || "N/A"}
              </div>
            </div>

            <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-violet-100 text-sm">Efficacité</p>
                  <p className="text-3xl font-bold">
                    {stats?.efficiencyRating || 0}%
                  </p>
                </div>
                <StarIcon className="w-8 h-8 text-violet-200" />
              </div>
              <div className="mt-4 text-violet-100 text-sm">
                Taux de compression global
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Actions rapides
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() =>
                  track("quick_action_clicked", { action: "new_folder" })
                }
                className="flex items-center space-x-3 p-4 bg-sky-50 rounded-xl hover:bg-sky-100 transition-colors"
              >
                <FolderIcon className="w-6 h-6 text-sky-600" />
                <span className="font-medium text-sky-700">
                  Nouveau dossier
                </span>
              </button>
              <button
                onClick={handleExportHistory}
                className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
              >
                <ArrowDownTrayIcon className="w-6 h-6 text-green-600" />
                <span className="font-medium text-green-700">
                  Export historique
                </span>
              </button>
              <button
                onClick={() =>
                  track("quick_action_clicked", { action: "monthly_report" })
                }
                className="flex items-center space-x-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
              >
                <ChartBarIcon className="w-6 h-6 text-purple-600" />
                <span className="font-medium text-purple-700">
                  Rapport mensuel
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                Historique des compressions
              </h3>
              <div className="flex space-x-2">
                {(["7d", "30d", "90d", "all"] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      timeRange === range
                        ? "bg-sky-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {range === "all" ? "Tout" : range}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* History List */}
          <div className="bg-white rounded-2xl shadow-lg border overflow-hidden">
            <div className="divide-y divide-gray-200">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {getFileIcon(item.fileType)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 flex items-center">
                          {item.fileName}
                          {!item.isAvailable && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                              Expiré
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(item.createdAt)} •{" "}
                          {item.fileType.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {formatFileSize(item.originalSize)} →{" "}
                          {formatFileSize(item.compressedSize)}
                        </div>
                        <div className="text-sm font-medium text-green-600">
                          -{item.compressionRatio}% •{" "}
                          {formatFileSize(
                            item.originalSize - item.compressedSize
                          )}{" "}
                          économisé
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() =>
                            handleFilePreview(item.id, item.fileName)
                          }
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          disabled={!item.isAvailable}
                        >
                          <EyeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            handleFileDownload(item.id, item.fileName)
                          }
                          className={`p-2 transition-colors ${
                            item.isAvailable
                              ? "text-sky-600 hover:text-sky-700"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                          disabled={!item.isAvailable}
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Évolution des compressions
            </h3>

            {/* Simple bar chart */}
            <div className="space-y-4">
              {analytics?.monthlyTrend && analytics.monthlyTrend.length > 0 ? (
                analytics.monthlyTrend.map((data, index) => {
                  const maxCompressions = Math.max(
                    ...analytics.monthlyTrend.map((d) => d.compressions)
                  );
                  const width =
                    maxCompressions > 0
                      ? (data.compressions / maxCompressions) * 100
                      : 0;

                  return (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-20 text-sm text-gray-600">
                        {new Date(data.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-200 rounded-full h-6 relative">
                          <div
                            className="bg-gradient-to-r from-sky-500 to-violet-500 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(width, 5)}%` }}
                          >
                            <span className="text-white text-sm font-medium">
                              {data.compressions}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="w-20 text-sm text-gray-600 text-right">
                        {formatFileSize(data.sizeSaved)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Aucune donnée d'analyse disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <h4 className="font-semibold text-gray-900 mb-4">
                Types de fichiers
              </h4>
              <div className="space-y-3">
                {analytics?.fileTypeDistribution &&
                Object.keys(analytics.fileTypeDistribution).length > 0 ? (
                  Object.entries(analytics.fileTypeDistribution).map(
                    ([type, percentage]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between"
                      >
                        <span className="text-gray-600">{type}</span>
                        <span className="font-medium">{percentage}%</span>
                      </div>
                    )
                  )
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Aucune données disponible</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border">
              <h4 className="font-semibold text-gray-900 mb-4">Performances</h4>
              <div className="space-y-3">
                {analytics?.performanceMetrics ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Temps moyen</span>
                      <span className="font-medium">
                        {analytics.performanceMetrics.avgProcessingTime}s
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Taux de succès</span>
                      <span className="font-medium text-green-600">
                        {analytics.performanceMetrics.successRate}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Satisfaction</span>
                      <span className="font-medium text-yellow-600">
                        ⭐ {analytics.performanceMetrics.userSatisfaction}/5
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Aucune métrique disponible</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
