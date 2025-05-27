// app/api/dashboard/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { serverPostHog } from "@/lib/posthog";
import { dbExtended, getFileTypeFromMime } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

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

    // 📊 Track export request
    serverPostHog.capture({
      distinctId: user.email,
      event: "dashboard_export_requested",
      properties: {
        format: format,
        user_plan: user.is_pro ? "pro" : "free",
        timestamp: new Date().toISOString(),
      },
    });

    // Récupérer toutes les données de compression de l'utilisateur depuis ta DB
    await dbExtended.ensureConnection();
    const rawCompressions = await dbExtended.getCompressionHistory(user.email);

    // Convertir pour l'export
    const compressionHistory = rawCompressions.map((record) => ({
      id: record.id,
      fileName: record.file_name,
      fileType: getFileTypeFromMime(record.mime_type),
      originalSize: record.original_size / (1024 * 1024), // MB
      compressedSize: record.compressed_size / (1024 * 1024), // MB
      compressionRatio: record.compression_ratio,
      createdAt: record.created_at,
      downloadUrl: record.download_url,
      isAvailable: record.is_available,
    }));

    if (format === "csv") {
      const csvContent = generateCSV(compressionHistory);

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="slimfile-history-${
            new Date().toISOString().split("T")[0]
          }.csv"`,
        },
      });
    } else if (format === "json") {
      const jsonContent = JSON.stringify(
        {
          user: {
            email: user.email,
            plan: user.is_pro ? "pro" : "free",
            exportDate: new Date().toISOString(),
          },
          compressions: compressionHistory,
          summary: {
            totalCompressions: compressionHistory.length,
            totalSizeSaved: compressionHistory.reduce(
              (sum, item) => sum + (item.originalSize - item.compressedSize),
              0
            ),
            avgCompressionRatio:
              compressionHistory.length > 0
                ? compressionHistory.reduce(
                    (sum, item) => sum + item.compressionRatio,
                    0
                  ) / compressionHistory.length
                : 0,
          },
        },
        null,
        2
      );

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="slimfile-history-${
            new Date().toISOString().split("T")[0]
          }.json"`,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Format non supporté. Utilisez 'csv' ou 'json'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Erreur API Export:", error);

    // Track error
    serverPostHog.capture({
      distinctId: "system",
      event: "dashboard_export_error",
      properties: {
        error_message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      { error: "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}

// Génération du CSV
function generateCSV(data: any[]) {
  const headers = [
    "ID",
    "Nom du fichier",
    "Type",
    "Taille originale (MB)",
    "Taille compressée (MB)",
    "Ratio de compression (%)",
    "Économie (MB)",
    "Date de création",
    "Disponible",
  ];

  const csvRows = [
    headers.join(","),
    ...data.map((item) =>
      [
        item.id,
        `"${item.fileName}"`, // Guillemets pour gérer les virgules dans les noms
        item.fileType.toUpperCase(),
        item.originalSize.toFixed(2),
        item.compressedSize.toFixed(2),
        item.compressionRatio,
        (item.originalSize - item.compressedSize).toFixed(2),
        new Date(item.createdAt).toLocaleDateString("fr-FR"),
        item.isAvailable ? "Oui" : "Non",
      ].join(",")
    ),
  ];

  return csvRows.join("\n");
}
