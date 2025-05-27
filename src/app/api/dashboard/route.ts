// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { serverPostHog } from "@/lib/posthog";
import {
  dbExtended,
  calculateDashboardStats,
  getFileTypeFromMime,
} from "@/lib/database";

// Types pour le dashboard
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    const section = searchParams.get("section") || "all";

    // Vérifier l'authentification
    const token = request.cookies.get("auth-token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);
    if (!user) {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 📊 Track dashboard API access
    serverPostHog.capture({
      distinctId: user.email,
      event: "dashboard_api_accessed",
      properties: {
        section: section,
        time_range: timeRange,
        user_plan: user.is_pro ? "pro" : "free",
        timestamp: new Date().toISOString(),
      },
    });

    // Calculer les dates selon le range
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "all":
        startDate = new Date("2020-01-01");
        break;
    }

    // 🔍 Récupérer les données depuis ta dbExtended
    await dbExtended.ensureConnection();
    await dbExtended.cleanupExpiredFiles(); // Nettoyer les fichiers expirés

    const rawCompressions = await dbExtended.getCompressionHistory(
      user.email,
      startDate,
      now
    );

    // Convertir au format attendu par le frontend
    const compressionHistory: CompressionHistory[] = rawCompressions.map(
      (record) => ({
        id: record.id,
        fileName: record.file_name,
        fileType: getFileTypeFromMime(record.mime_type),
        originalSize: record.original_size / (1024 * 1024), // Convertir en MB
        compressedSize: record.compressed_size / (1024 * 1024), // Convertir en MB
        compressionRatio: record.compression_ratio,
        createdAt: record.created_at,
        downloadUrl: record.download_url,
        isAvailable: record.is_available,
      })
    );

    const dashboardStats = calculateDashboardStats(rawCompressions);
    const analyticsData = generateAnalyticsData(compressionHistory, timeRange);

    // Retourner selon la section demandée
    const response: any = {};

    if (section === "all" || section === "stats") {
      response.stats = dashboardStats;
    }

    if (section === "all" || section === "history") {
      response.history = compressionHistory.slice(0, 50);
    }

    if (section === "all" || section === "analytics") {
      response.analytics = analyticsData;
    }

    return NextResponse.json({
      success: true,
      data: response,
      user: {
        email: user.email,
        plan: user.is_pro ? "pro" : "free",
        usage: {
          current: user.usage_count || 0,
          max: user.is_pro ? "unlimited" : 5,
        },
      },
      meta: {
        timeRange,
        section,
        generatedAt: new Date().toISOString(),
        totalRecords: compressionHistory.length,
      },
    });
  } catch (error) {
    console.error("Erreur API Dashboard:", error);

    // Track error
    serverPostHog.capture({
      distinctId: "system",
      event: "dashboard_api_error",
      properties: {
        error_message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 📊 Générer les données d'analytics
function generateAnalyticsData(
  compressionHistory: CompressionHistory[],
  timeRange: string
): AnalyticsData {
  const fileTypeDistribution = compressionHistory.reduce((acc, item) => {
    const type = item.fileType.toUpperCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const total = compressionHistory.length;
  if (total > 0) {
    Object.keys(fileTypeDistribution).forEach((key) => {
      fileTypeDistribution[key] = Math.round(
        (fileTypeDistribution[key] / total) * 100
      );
    });
  }

  const trendData = new Map<
    string,
    { compressions: number; sizeSaved: number }
  >();

  compressionHistory.forEach((item) => {
    const date = new Date(item.createdAt).toISOString().split("T")[0];
    const existing = trendData.get(date) || { compressions: 0, sizeSaved: 0 };

    existing.compressions += 1;
    existing.sizeSaved += item.originalSize - item.compressedSize;

    trendData.set(date, existing);
  });

  const monthlyTrend: ChartData[] = Array.from(trendData.entries())
    .map(([date, data]) => ({
      date,
      compressions: data.compressions,
      sizeSaved: data.sizeSaved,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // Derniers 30 jours max

  return {
    fileTypeDistribution,
    performanceMetrics: {
      avgProcessingTime: 2.3,
      successRate: 98.5,
      userSatisfaction: 4.8,
    },
    monthlyTrend,
  };
}
