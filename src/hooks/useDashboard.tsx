// hooks/useDashboard.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { usePostHog } from "@/hooks/usePosthog";

// Types (à synchroniser avec l'API)
interface DashboardStats {
  totalCompressions: number;
  totalSizeSavedMB: number;
  avgCompressionRatio: number;
  totalOriginalSizeMB: number;
  totalCompressedSizeMB: number;
  thisMonthCompressions: number;
  favoriteFileType: string;
  currentMonthSavings: number;
  efficiencyRating: number;
}

interface CompressionHistory {
  id: string;
  fileName: string;
  fileType: "pdf" | "image" | "document";
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  createdAt: string;
  downloadUrl?: string;
  isAvailable: boolean;
}

interface ChartData {
  date: string;
  compressions: number;
  sizeSaved: number;
}

interface AnalyticsData {
  fileTypeDistribution: { [key: string]: number };
  performanceMetrics: {
    avgProcessingTime: number;
    successRate: number;
    userSatisfaction: number;
  };
  monthlyTrend: ChartData[];
}

interface DashboardData {
  stats?: DashboardStats;
  history?: CompressionHistory[];
  analytics?: AnalyticsData;
  user?: {
    email: string;
    plan: "free" | "pro";
    usage: {
      current: number;
      max: number | "unlimited";
    };
  };
}

interface UseDashboardReturn {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchSection: (section: "stats" | "history" | "analytics") => Promise<void>;
  setTimeRange: (range: "7d" | "30d" | "90d" | "all") => void;
  timeRange: "7d" | "30d" | "90d" | "all";
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  );
  const { track } = usePostHog();

  // Fonction pour fetch les données
  const fetchDashboardData = useCallback(
    async (section: "all" | "stats" | "history" | "analytics" = "all") => {
      try {
        setLoading(true);
        setError(null);

        // Track API call
        track("dashboard_data_requested", {
          section,
          time_range: timeRange,
        });

        const response = await fetch(
          `/api/dashboard?timeRange=${timeRange}&section=${section}`,
          {
            method: "GET",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(
            result.error || "Erreur lors du chargement des données"
          );
        }

        // Merge new data with existing data
        setData((prev) => ({
          ...prev,
          ...result.data,
          user: result.user,
        }));

        // Track successful load
        track("dashboard_data_loaded", {
          section,
          time_range: timeRange,
          records_count: result.meta?.totalRecords || 0,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);

        // Track error
        track("dashboard_data_error", {
          section,
          time_range: timeRange,
          error_message: errorMessage,
        });

        console.error("Erreur useDashboard:", err);
      } finally {
        setLoading(false);
      }
    },
    [timeRange, track]
  );

  // Initial load
  useEffect(() => {
    fetchDashboardData("all");
  }, [fetchDashboardData]);

  // Refetch when timeRange changes
  useEffect(() => {
    if (timeRange) {
      fetchDashboardData("all");
    }
  }, [timeRange, fetchDashboardData]);

  // Fonction pour refetch toutes les données
  const refetch = useCallback(() => {
    return fetchDashboardData("all");
  }, [fetchDashboardData]);

  // Fonction pour fetch une section spécifique
  const fetchSection = useCallback(
    (section: "stats" | "history" | "analytics") => {
      return fetchDashboardData(section);
    },
    [fetchDashboardData]
  );

  // Fonction pour changer le timeRange
  const handleTimeRangeChange = useCallback(
    (range: "7d" | "30d" | "90d" | "all") => {
      track("dashboard_timerange_changed", {
        from: timeRange,
        to: range,
      });
      setTimeRange(range);
    },
    [timeRange, track]
  );

  return {
    data,
    loading,
    error,
    refetch,
    fetchSection,
    setTimeRange: handleTimeRangeChange,
    timeRange,
  };
}

// Hook spécialisé pour les actions sur les fichiers
export function useDashboardActions() {
  const { track } = usePostHog();

  const downloadFile = useCallback(
    async (fileId: string, fileName: string) => {
      try {
        track("dashboard_file_download_started", {
          file_id: fileId,
          file_name: fileName,
        });

        const response = await fetch(`/api/download/${fileId}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Erreur lors du téléchargement");
        }

        // Créer un lien de téléchargement
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Track successful download
        track("dashboard_file_downloaded", {
          file_id: fileId,
          file_name: fileName,
          file_size: blob.size,
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur de téléchargement";

        track("dashboard_file_download_failed", {
          file_id: fileId,
          file_name: fileName,
          error_message: errorMessage,
        });

        return { success: false, error: errorMessage };
      }
    },
    [track]
  );

  const previewFile = useCallback(
    async (fileId: string, fileName: string) => {
      track("dashboard_file_preview", {
        file_id: fileId,
        file_name: fileName,
      });

      // TODO: Implémenter la prévisualisation
      // Peut ouvrir un modal avec le contenu du fichier
      console.log(`Preview file: ${fileName} (ID: ${fileId})`);
    },
    [track]
  );

  const exportHistory = useCallback(
    async (format: "csv" | "json" = "csv") => {
      try {
        track("dashboard_export_started", { format });

        const response = await fetch(`/api/dashboard/export?format=${format}`, {
          method: "GET",
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Erreur lors de l'export");
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `slimfile-history-${
          new Date().toISOString().split("T")[0]
        }.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        track("dashboard_export_completed", { format });
        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Erreur d'export";
        track("dashboard_export_failed", { format, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },
    [track]
  );

  return {
    downloadFile,
    previewFile,
    exportHistory,
  };
}
