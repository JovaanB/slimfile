import { NextRequest, NextResponse } from "next/server";
import { FileCompressor, validateFile } from "@/lib/compression";
import {
  getUserFromToken,
  incrementUsage,
  canCompress,
  getUsageStats,
} from "@/lib/auth";
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
  const uploadDir = path.join("/tmp", "compressed"); // Utiliser /tmp sur Vercel

  try {
    // Créer le dossier si nécessaire
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error("📁 Dossier tmp existe déjà ou erreur:", error);
  }

  const filePath = path.join(uploadDir, `${id}_${fileName}`);
  await fs.writeFile(filePath, buffer);

  console.log("💾 Fichier sauvegardé:", filePath);

  // Programmer la suppression dans 1 heure
  setTimeout(async () => {
    try {
      await fs.unlink(filePath);
      console.log(`🗑️ Fichier supprimé: ${filePath}`);
    } catch (error) {
      console.error(`❌ Erreur suppression fichier: ${error}`);
    }
  }, 60 * 60 * 1000); // 1 heure

  return `/api/download/${id}_${fileName}`;
}

export async function POST(request: NextRequest) {
  try {
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

    // Vérifier les limites d'usage
    if (!canCompress(user)) {
      return NextResponse.json(
        {
          error: "Limite mensuelle atteinte",
          upgrade_required: true,
          current_usage: user.usage_count,
        },
        { status: 403 }
      );
    }

    // Parse FormData avec l'API Web standard
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const originalSizes = formData.getAll("originalSizes") as string[]; // Nouvelles tailles originales

    console.log("📤 Fichiers reçus:", {
      count: files.length,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
      originalSizes: originalSizes.length,
    });

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur ne dépasse pas sa limite avec ces fichiers
    if (!user.is_pro && user.usage_count + files.length > 5) {
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

    // Traiter chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalSize = originalSizes[i]
        ? parseInt(originalSizes[i])
        : file.size; // Utiliser la vraie taille originale

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

        console.log(`✅ Compression terminée: ${file.name}`, {
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          ratio: result.compressionRatio,
        });

        // Générer un ID et sauvegarder
        const id = generateFileId();
        const downloadUrl = await saveCompressedFile(
          result.buffer,
          file.name,
          id
        );

        // Calculer le vrai ratio de compression (taille originale → taille finale)
        const finalSize = result.compressedSize;
        const totalCompressionRatio = Math.round(
          ((originalSize - finalSize) / originalSize) * 100
        );

        compressedFiles.push({
          id,
          originalName: file.name,
          originalSize, // Vraie taille originale
          compressedSize: finalSize,
          compressionRatio: Math.max(0, totalCompressionRatio), // Vrai ratio total
          downloadUrl,
          type: getFileType(result.mimeType),
          mimeType: result.mimeType,
        });

        console.log(`✅ Fichier traité avec succès: ${file.name}`);

        // Incrémenter l'usage pour chaque fichier traité
        await incrementUsage(user.email);
      } catch (fileError) {
        console.error(`❌ Erreur traitement fichier ${file.name}:`, fileError);
        // Continue avec les autres fichiers
      }
    }

    if (compressedFiles.length === 0) {
      return NextResponse.json(
        { error: "Aucun fichier n'a pu être traité" },
        { status: 422 }
      );
    }

    // Récupérer les stats mises à jour
    const updatedUser = await getUserFromToken(token);
    const stats = updatedUser ? getUsageStats(updatedUser) : null;

    return NextResponse.json({
      success: true,
      files: compressedFiles,
      processed: compressedFiles.length,
      total: files.length,
      usage_stats: stats,
    });
  } catch (error) {
    console.error("Erreur API compression:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

// Méthode GET pour vérifier le statut de l'API
export async function GET() {
  return NextResponse.json({
    status: "active",
    supportedFormats: ["PDF", "JPG", "PNG", "DOCX"],
    maxFileSize: "10MB",
    maxFiles: 5,
  });
}
