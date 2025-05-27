import { NextRequest, NextResponse } from "next/server";
import { FileCompressor, validateFile } from "@/lib/compression";
import { dbExtended } from "@/lib/database";
import {
  getUserFromToken,
  incrementUsage,
  canCompress,
  getUsageStats,
} from "@/lib/auth";
import { serverPostHog } from "@/lib/posthog";
import { promises as fs } from "fs";
import path from "path";

interface CompressedFileResponse {
  id: string;
  originalName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  downloadUrl: string;
  type: "pdf" | "image" | "document";
  mimeType: string;
}

/**
 * Détermine le type de fichier pour l'interface
 */
function getFileType(mimeType: string): CompressedFileResponse["type"] {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "document";
}

/**
 * Génère un ID unique pour le fichier
 */
function generateFileId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/**
 * Sauvegarde temporaire du fichier compressé
 */
async function saveCompressedFile(
  buffer: Buffer,
  fileName: string,
  id: string
): Promise<string> {
  const uploadDir = path.join("/tmp", "compressed");

  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error("📁 Dossier tmp existe déjà ou erreur:", error);
  }

  const filePath = path.join(uploadDir, `${id}_${fileName}`);
  await fs.writeFile(filePath, buffer);

  console.log("💾 Fichier sauvegardé:", filePath);

  setTimeout(async () => {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Fichier supprimé: ${filePath}`);
    } catch (error) {
      console.error(`❌ Erreur suppression fichier: ${error}`);
    }
  }, 60 * 60 * 1000);

  return `/api/download/${id}_${fileName}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now(); // Pour mesurer la durée

  try {
    // Vérifier l'authentification
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      // 📊 Track failed auth
      serverPostHog.capture({
        distinctId: "anonymous",
        event: "compression_auth_failed",
        properties: {
          reason: "no_token",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      );
    }

    const user = await getUserFromToken(token);

    if (!user) {
      // 📊 Track invalid token
      serverPostHog.capture({
        distinctId: "anonymous",
        event: "compression_auth_failed",
        properties: {
          reason: "invalid_token",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({ error: "Token invalide" }, { status: 401 });
    }

    // 📊 Track compression attempt
    serverPostHog.capture({
      distinctId: user.email,
      event: "compression_started",
      properties: {
        user_plan: user.is_pro ? "pro" : "free",
        current_usage: user.usage_count,
        timestamp: new Date().toISOString(),
      },
    });

    // Vérifier les limites d'usage
    if (!canCompress(user)) {
      // 📊 Track limit reached
      serverPostHog.capture({
        distinctId: user.email,
        event: "compression_limit_reached",
        properties: {
          user_plan: user.is_pro ? "pro" : "free",
          current_usage: user.usage_count,
          limit: user.is_pro ? "unlimited" : 5,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        {
          error: "Limite mensuelle atteinte",
          upgrade_required: true,
          current_usage: user.usage_count,
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const originalSizes = formData.getAll("originalSizes") as string[];

    console.log("📤 Fichiers reçus:", {
      count: files.length,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      originalSizes: originalSizes.length,
    });

    if (!files || files.length === 0) {
      // 📊 Track no files error
      serverPostHog.capture({
        distinctId: user.email,
        event: "compression_error",
        properties: {
          error_type: "no_files",
          user_plan: user.is_pro ? "pro" : "free",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Vérifier les limites pour les utilisateurs free
    if (!user.is_pro && user.usage_count + files.length > 5) {
      // 📊 Track limit would be exceeded
      serverPostHog.capture({
        distinctId: user.email,
        event: "compression_limit_exceeded",
        properties: {
          user_plan: "free",
          current_usage: user.usage_count,
          attempted_files: files.length,
          would_exceed_by: user.usage_count + files.length - 5,
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        {
          error: `Vous ne pouvez traiter que ${
            5 - user.usage_count
          } fichier(s) supplémentaire(s) ce mois-ci`,
          upgrade_required: true,
        },
        { status: 403 }
      );
    }

    const compressedFiles: CompressedFileResponse[] = [];
    const compressionStats = {
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      fileTypes: {} as Record<string, number>,
      processingTimes: [] as number[],
    };

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalSize = originalSizes[i]
        ? parseInt(originalSizes[i])
        : file.size;
      const fileStartTime = Date.now();

      console.log(`🔄 Traitement fichier ${i + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        originalSize,
      });

      try {
        // Validation
        validateFile({
          size: file.size,
          type: file.type,
          name: file.name,
        });

        console.log(`✅ Validation OK pour: ${file.name}`);

        // Convertir File en Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`🔄 Début compression: ${file.name}`);

        // Compresser
        const result = await FileCompressor.compressFile(buffer, file.type);
        const fileProcessingTime = Date.now() - fileStartTime;

        console.log(`✅ Compression terminée: ${file.name}`, {
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          ratio: result.compressionRatio,
          processingTime: fileProcessingTime,
        });

        // Générer un ID et sauvegarder
        const id = generateFileId();
        const downloadUrl = await saveCompressedFile(
          result.buffer,
          file.name,
          id
        );

        // Calculer le vrai ratio de compression
        const finalSize = result.compressedSize;
        const totalCompressionRatio = Math.round(
          ((originalSize - finalSize) / originalSize) * 100
        );

        const compressedFile = {
          id,
          originalName: file.name,
          originalSize,
          compressedSize: finalSize,
          compressionRatio: Math.max(0, totalCompressionRatio),
          downloadUrl,
          type: getFileType(result.mimeType),
          mimeType: result.mimeType,
        };

        compressedFiles.push(compressedFile);

        // Collecter les stats
        compressionStats.totalOriginalSize += originalSize;
        compressionStats.totalCompressedSize += finalSize;
        compressionStats.fileTypes[compressedFile.type] =
          (compressionStats.fileTypes[compressedFile.type] || 0) + 1;
        compressionStats.processingTimes.push(fileProcessingTime);

        serverPostHog.capture({
          distinctId: user.email,
          event: "file_compressed",
          properties: {
            file_type: compressedFile.type,
            mime_type: result.mimeType,
            original_size_mb: (originalSize / 1024 / 1024).toFixed(2),
            compressed_size_mb: (finalSize / 1024 / 1024).toFixed(2),
            compression_ratio: totalCompressionRatio,
            size_saved_mb: ((originalSize - finalSize) / 1024 / 1024).toFixed(
              2
            ),
            processing_time_ms: fileProcessingTime,
            user_plan: user.is_pro ? "pro" : "free",
            timestamp: new Date().toISOString(),
          },
        });

        try {
          await dbExtended.saveCompressionRecord(
            user.email,
            file.name,
            originalSize,
            finalSize,
            totalCompressionRatio,
            result.mimeType,
            downloadUrl
          );

          console.log(`✅ Compression sauvegardée dans DB: ${file.name}`);
        } catch (saveError) {
          console.error(
            `❌ Erreur sauvegarde DB pour ${file.name}:`,
            saveError
          );
        }

        console.log(`✅ Fichier traité avec succès: ${file.name}`);

        await incrementUsage(user.email);
      } catch (fileError) {
        console.error(`❌ Erreur traitement fichier ${file.name}:`, fileError);

        // 📊 Track file processing error
        serverPostHog.capture({
          distinctId: user.email,
          event: "file_compression_failed",
          properties: {
            file_name: file.name,
            file_type: file.type,
            file_size_mb: (file.size / 1024 / 1024).toFixed(2),
            error_message:
              fileError instanceof Error ? fileError.message : "Unknown error",
            user_plan: user.is_pro ? "pro" : "free",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }

    if (compressedFiles.length === 0) {
      // 📊 Track no files processed
      serverPostHog.capture({
        distinctId: user.email,
        event: "compression_batch_failed",
        properties: {
          attempted_files: files.length,
          successful_files: 0,
          user_plan: user.is_pro ? "pro" : "free",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        { error: "Aucun fichier n'a pu être traité" },
        { status: 422 }
      );
    }

    // Récupérer les stats mises à jour
    const updatedUser = await getUserFromToken(token);
    const stats = updatedUser ? getUsageStats(updatedUser) : null;
    const totalProcessingTime = Date.now() - startTime;

    // 📊 Track successful compression batch
    const avgProcessingTime =
      compressionStats.processingTimes.reduce((a, b) => a + b, 0) /
      compressionStats.processingTimes.length;
    const totalCompressionRatio = Math.round(
      ((compressionStats.totalOriginalSize -
        compressionStats.totalCompressedSize) /
        compressionStats.totalOriginalSize) *
        100
    );

    serverPostHog.capture({
      distinctId: user.email,
      event: "compression_batch_completed",
      properties: {
        files_processed: compressedFiles.length,
        files_attempted: files.length,
        success_rate: Math.round((compressedFiles.length / files.length) * 100),
        total_original_size_mb: (
          compressionStats.totalOriginalSize /
          1024 /
          1024
        ).toFixed(2),
        total_compressed_size_mb: (
          compressionStats.totalCompressedSize /
          1024 /
          1024
        ).toFixed(2),
        total_size_saved_mb: (
          (compressionStats.totalOriginalSize -
            compressionStats.totalCompressedSize) /
          1024 /
          1024
        ).toFixed(2),
        overall_compression_ratio: totalCompressionRatio,
        avg_processing_time_ms: Math.round(avgProcessingTime),
        total_processing_time_ms: totalProcessingTime,
        file_types: compressionStats.fileTypes,
        user_plan: user.is_pro ? "pro" : "free",
        usage_after: updatedUser?.usage_count || 0,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      files: compressedFiles,
      processed: compressedFiles.length,
      total: files.length,
      usage_stats: stats,
    });
  } catch (error) {
    console.error("Erreur API compression:", error);

    // 📊 Track server error
    serverPostHog.capture({
      distinctId: "system",
      event: "compression_server_error",
      properties: {
        error_message:
          error instanceof Error ? error.message : "Unknown server error",
        error_stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    supportedFormats: ["PDF", "JPG", "PNG", "DOCX"],
    maxFileSize: "10MB",
    maxFiles: 5,
  });
}
