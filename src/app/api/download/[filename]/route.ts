import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;

    if (!filename) {
      return NextResponse.json(
        { error: "Nom de fichier manquant" },
        { status: 400 }
      );
    }

    // Sécurité: vérifier que le filename ne contient pas de caractères dangereux
    if (
      filename.includes("..") ||
      filename.includes("/") ||
      filename.includes("\\")
    ) {
      return NextResponse.json(
        { error: "Nom de fichier invalide" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "tmp", "compressed", filename);

    // Vérifier que le fichier existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return NextResponse.json(
        { error: "Fichier non trouvé ou expiré" },
        { status: 404 }
      );
    }

    // Lire le fichier
    const buffer = await fs.readFile(filePath);

    // Déterminer le type MIME basé sur l'extension
    const ext = path.extname(filename).toLowerCase();
    let mimeType = "application/octet-stream";

    switch (ext) {
      case ".pdf":
        mimeType = "application/pdf";
        break;
      case ".jpg":
      case ".jpeg":
        mimeType = "image/jpeg";
        break;
      case ".png":
        mimeType = "image/png";
        break;
      case ".docx":
        mimeType =
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        break;
    }

    // Extraire le nom original du fichier (après l'ID)
    const originalName = filename.split("_").slice(1).join("_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${originalName}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Erreur téléchargement:", error);
    return NextResponse.json(
      { error: "Erreur lors du téléchargement" },
      { status: 500 }
    );
  }
}
