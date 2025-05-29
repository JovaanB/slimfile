// lib/database.ts (extension de ton fichier existant)
import { type User } from "./auth";

// Types pour les compressions
export interface CompressionRecord {
  id: string;
  user_email: string;
  file_name: string;
  original_size: number;
  compressed_size: number;
  compression_ratio: number;
  mime_type: string;
  download_url?: string;
  is_available: boolean;
  created_at: string;
  expires_at: string;
}

export class DatabaseExtended {
  private usePostgres =
    process.env.DATABASE_URL &&
    process.env.DATABASE_URL.startsWith("postgresql://");

  constructor() {
    console.log("🗄️ Database mode:", this.usePostgres ? "PostgreSQL" : "JSON");
    if (this.usePostgres) {
      console.log(
        "🗄️ Database URL configurée:",
        process.env.DATABASE_URL ? "OUI" : "NON"
      );
    }
  }

  async ensureConnection() {
    if (this.usePostgres) {
      await this.initializePostgres();
    }
  }

  private async initializePostgres() {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Table users (existante)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          usage_count INTEGER DEFAULT 0,
          last_reset VARCHAR(7) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_pro BOOLEAN DEFAULT false,
          subscription_id VARCHAR(255),
          subscription_status VARCHAR(50),
          subscription_end TIMESTAMP,
          stripe_customer_id VARCHAR(255),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Nouvelle table compressions pour le dashboard
      await pool.query(`
        CREATE TABLE IF NOT EXISTS compressions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_email VARCHAR(255) NOT NULL,
          file_name TEXT NOT NULL,
          original_size BIGINT NOT NULL,
          compressed_size BIGINT NOT NULL,
          compression_ratio INTEGER NOT NULL,
          mime_type VARCHAR(100) NOT NULL,
          download_url TEXT,
          is_available BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 hour')
        )
      `);

      // Index pour les performances
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_compressions_user_email 
        ON compressions(user_email)
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_compressions_created_at 
        ON compressions(created_at)
      `);

      console.log("✅ Tables users et compressions créées/vérifiées");
      await pool.end();
    } catch (error) {
      console.error("❌ Erreur création tables:", error);
    }
  }

  // === MÉTHODES COMPRESSIONS ===

  async saveCompressionRecord(
    userEmail: string,
    fileName: string,
    originalSize: number,
    compressedSize: number,
    compressionRatio: number,
    mimeType: string,
    downloadUrl?: string
  ): Promise<CompressionRecord> {
    if (this.usePostgres) {
      return this.saveCompressionPostgres(
        userEmail,
        fileName,
        originalSize,
        compressedSize,
        compressionRatio,
        mimeType,
        downloadUrl
      );
    }

    return this.saveCompressionJSON(
      userEmail,
      fileName,
      originalSize,
      compressedSize,
      compressionRatio,
      mimeType,
      downloadUrl
    );
  }

  private async saveCompressionPostgres(
    userEmail: string,
    fileName: string,
    originalSize: number,
    compressedSize: number,
    compressionRatio: number,
    mimeType: string,
    downloadUrl?: string
  ): Promise<CompressionRecord> {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const result = await pool.query(
        `
        INSERT INTO compressions (
          user_email, file_name, original_size, compressed_size, 
          compression_ratio, mime_type, download_url, is_available
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING *
        `,
        [
          userEmail,
          fileName,
          originalSize,
          compressedSize,
          compressionRatio,
          mimeType,
          downloadUrl,
        ]
      );

      await pool.end();

      const row = result.rows[0];
      return {
        id: row.id,
        user_email: row.user_email,
        file_name: row.file_name,
        original_size: row.original_size,
        compressed_size: row.compressed_size,
        compression_ratio: row.compression_ratio,
        mime_type: row.mime_type,
        download_url: row.download_url,
        is_available: row.is_available,
        created_at: row.created_at.toISOString(),
        expires_at: row.expires_at.toISOString(),
      };
    } catch (error) {
      console.error("Erreur sauvegarde compression PostgreSQL:", error);
      throw error;
    }
  }

  private async saveCompressionJSON(
    userEmail: string,
    fileName: string,
    originalSize: number,
    compressedSize: number,
    compressionRatio: number,
    mimeType: string,
    downloadUrl?: string
  ): Promise<CompressionRecord> {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const dbPath = path.join(process.cwd(), "data", "compressions.json");

      // Créer le dossier data s'il n'existe pas
      await fs.mkdir(path.dirname(dbPath), { recursive: true });

      // Lire les compressions existantes
      let compressions: CompressionRecord[] = [];
      try {
        const data = await fs.readFile(dbPath, "utf-8");
        compressions = JSON.parse(data);
      } catch {
        // Le fichier n'existe pas encore
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // +1 heure

      const newCompression: CompressionRecord = {
        id: generateId(),
        user_email: userEmail,
        file_name: fileName,
        original_size: originalSize,
        compressed_size: compressedSize,
        compression_ratio: compressionRatio,
        mime_type: mimeType,
        download_url: downloadUrl,
        is_available: true,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      };

      compressions.push(newCompression);
      await fs.writeFile(dbPath, JSON.stringify(compressions, null, 2));
      return newCompression;
    } catch (error) {
      console.error("Erreur sauvegarde compression JSON:", error);
      throw error;
    }
  }

  async getCompressionHistory(
    userEmail: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<CompressionRecord[]> {
    if (this.usePostgres) {
      return this.getCompressionHistoryPostgres(
        userEmail,
        startDate,
        endDate,
        limit
      );
    }

    return this.getCompressionHistoryJSON(userEmail, startDate, endDate, limit);
  }

  private async getCompressionHistoryPostgres(
    userEmail: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<CompressionRecord[]> {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      let query = `
        SELECT * FROM compressions 
        WHERE user_email = $1
      `;
      const values = [userEmail];
      let paramIndex = 2;

      if (startDate) {
        query += ` AND created_at >= $${paramIndex}`;
        values.push(startDate.toISOString());
        paramIndex++;
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex}`;
        values.push(endDate.toISOString());
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      values.push(limit.toString());

      const result = await pool.query(query, values);
      await pool.end();

      return result.rows.map((row: any) => ({
        id: row.id,
        user_email: row.user_email,
        file_name: row.file_name,
        original_size: row.original_size,
        compressed_size: row.compressed_size,
        compression_ratio: row.compression_ratio,
        mime_type: row.mime_type,
        download_url: row.download_url,
        is_available: row.is_available,
        created_at: row.created_at.toISOString(),
        expires_at: row.expires_at.toISOString(),
      }));
    } catch (error) {
      console.error("Erreur récupération historique PostgreSQL:", error);
      return [];
    }
  }

  private async getCompressionHistoryJSON(
    userEmail: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 50
  ): Promise<CompressionRecord[]> {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const dbPath = path.join(process.cwd(), "data", "compressions.json");

      const data = await fs.readFile(dbPath, "utf-8");
      let compressions: CompressionRecord[] = JSON.parse(data);

      // Filtrer par utilisateur
      compressions = compressions.filter((c) => c.user_email === userEmail);

      // Filtrer par dates
      if (startDate) {
        compressions = compressions.filter(
          (c) => new Date(c.created_at) >= startDate
        );
      }
      if (endDate) {
        compressions = compressions.filter(
          (c) => new Date(c.created_at) <= endDate
        );
      }

      // Trier par date décroissante et limiter
      compressions.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return compressions.slice(0, limit);
    } catch (error) {
      console.error("Erreur récupération historique JSON:", error);
      return [];
    }
  }

  async cleanupExpiredFiles(): Promise<void> {
    if (this.usePostgres) {
      await this.cleanupExpiredFilesPostgres();
    } else {
      await this.cleanupExpiredFilesJSON();
    }
  }

  private async cleanupExpiredFilesPostgres(): Promise<void> {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      await pool.query(`
        UPDATE compressions 
        SET is_available = false 
        WHERE expires_at < CURRENT_TIMESTAMP AND is_available = true
      `);

      await pool.end();
    } catch (error) {
      console.error("Erreur nettoyage fichiers expirés PostgreSQL:", error);
    }
  }

  private async cleanupExpiredFilesJSON(): Promise<void> {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const dbPath = path.join(process.cwd(), "data", "compressions.json");

      const data = await fs.readFile(dbPath, "utf-8");
      let compressions: CompressionRecord[] = JSON.parse(data);

      const now = new Date();
      compressions = compressions.map((c) => {
        if (new Date(c.expires_at) < now && c.is_available) {
          return { ...c, is_available: false };
        }
        return c;
      });

      await fs.writeFile(dbPath, JSON.stringify(compressions, null, 2));
    } catch (error) {
      console.error("Erreur nettoyage fichiers expirés JSON:", error);
    }
  }

  async findUser(email: string): Promise<User | null> {
    if (this.usePostgres) {
      return this.findUserPostgres(email);
    }

    // Fallback vers JSON (développement local)
    return this.findUserJSON(email);
  }

  private async findUserPostgres(email: string): Promise<User | null> {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const result = await pool.query("SELECT * FROM users WHERE email = $1", [
        email,
      ]);

      await pool.end();

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        email: row.email,
        usage_count: row.usage_count,
        last_reset: row.last_reset,
        created_at: row.created_at.toISOString(),
        is_pro: row.is_pro,
        subscription_id: row.subscription_id,
        subscription_status: row.subscription_status,
        subscription_end: row.subscription_end?.toISOString(),
        stripe_customer_id: row.stripe_customer_id,
      };
    } catch (error) {
      console.error("Erreur requête PostgreSQL:", error);
      return null;
    }
  }

  private async findUserJSON(email: string): Promise<User | null> {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const dbPath = path.join(process.cwd(), "data", "users.json");

      const data = await fs.readFile(dbPath, "utf-8");
      const users = JSON.parse(data);
      return users.find((u: User) => u.email === email) || null;
    } catch {
      // Fichier n'existe pas ou erreur de lecture
      return null;
    }
  }

  async createUser(email: string): Promise<User> {
    if (this.usePostgres) {
      return this.createUserPostgres(email);
    }

    return this.createUserJSON(email);
  }

  private async createUserPostgres(email: string): Promise<User> {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      const currentMonth = new Date().toISOString().slice(0, 7);

      const result = await pool.query(
        `
        INSERT INTO users (email, usage_count, last_reset, is_pro)
        VALUES ($1, 0, $2, false)
        RETURNING *
      `,
        [email, currentMonth]
      );

      await pool.end();

      const row = result.rows[0];
      return {
        email: row.email,
        usage_count: row.usage_count,
        last_reset: row.last_reset,
        created_at: row.created_at.toISOString(),
        is_pro: row.is_pro,
      };
    } catch (error) {
      console.error("Erreur création utilisateur PostgreSQL:", error);
      throw error;
    }
  }

  private async createUserJSON(email: string): Promise<User> {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const dbPath = path.join(process.cwd(), "data", "users.json");
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Créer le dossier data s'il n'existe pas
      await fs.mkdir(path.dirname(dbPath), { recursive: true });

      // Lire les utilisateurs existants ou créer un tableau vide
      let users: User[] = [];
      try {
        const data = await fs.readFile(dbPath, "utf-8");
        users = JSON.parse(data);
      } catch {
        // Le fichier n'existe pas encore
      }

      const newUser: User = {
        email,
        usage_count: 0,
        last_reset: currentMonth,
        created_at: new Date().toISOString(),
        is_pro: false,
      };

      users.push(newUser);
      await fs.writeFile(dbPath, JSON.stringify(users, null, 2));
      return newUser;
    } catch (error) {
      console.error("Erreur création utilisateur JSON:", error);
      throw error;
    }
  }

  async updateUser(
    email: string,
    updates: Partial<User>
  ): Promise<User | null> {
    if (this.usePostgres) {
      return this.updateUserPostgres(email, updates);
    }

    return this.updateUserJSON(email, updates);
  }

  private async updateUserPostgres(
    email: string,
    updates: Partial<User>
  ): Promise<User | null> {
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      // Construire la requête dynamiquement
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        await pool.end();
        return null;
      }

      values.push(email); // Pour le WHERE

      const result = await pool.query(
        `
        UPDATE users 
        SET ${setClauses.join(", ")}, updated_at = CURRENT_TIMESTAMP
        WHERE email = $${paramIndex}
        RETURNING *
      `,
        values
      );

      await pool.end();

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        email: row.email,
        usage_count: row.usage_count,
        last_reset: row.last_reset,
        created_at: row.created_at.toISOString(),
        is_pro: row.is_pro,
        subscription_id: row.subscription_id,
        subscription_status: row.subscription_status,
        subscription_end: row.subscription_end?.toISOString(),
        stripe_customer_id: row.stripe_customer_id,
      };
    } catch (error) {
      console.error("Erreur mise à jour utilisateur PostgreSQL:", error);
      return null;
    }
  }

  private async updateUserJSON(
    email: string,
    updates: Partial<User>
  ): Promise<User | null> {
    try {
      const fs = require("fs").promises;
      const path = require("path");

      const dbPath = path.join(process.cwd(), "data", "users.json");

      // Lire les utilisateurs existants
      let users: User[] = [];
      try {
        const data = await fs.readFile(dbPath, "utf-8");
        users = JSON.parse(data);
      } catch {
        return null; // Fichier n'existe pas
      }

      // Trouver et mettre à jour l'utilisateur
      const userIndex = users.findIndex((u: User) => u.email === email);
      if (userIndex === -1) return null;

      users[userIndex] = { ...users[userIndex], ...updates };
      await fs.writeFile(dbPath, JSON.stringify(users, null, 2));
      return users[userIndex];
    } catch (error) {
      console.error("Erreur mise à jour utilisateur JSON:", error);
      return null;
    }
  }
}

// Utilitaires
function generateId(): string {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function getFileTypeFromMime(
  mimeType: string
): "pdf" | "image" | "document" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "document";
}

export function calculateDashboardStats(compressions: CompressionRecord[]) {
  if (compressions.length === 0) {
    return {
      totalCompressions: 0,
      totalSizeSavedMB: 0,
      avgCompressionRatio: 0,
      totalOriginalSizeMB: 0,
      totalCompressedSizeMB: 0,
      thisMonthCompressions: 0,
      favoriteFileType: "PDF",
      currentMonthSavings: 0,
      efficiencyRating: 0,
    };
  }

  const totalOriginalSize = compressions.reduce(
    (sum, c) => sum + c.original_size,
    0
  );
  const totalCompressedSize = compressions.reduce(
    (sum, c) => sum + c.compressed_size,
    0
  );
  const totalSizeSaved = totalOriginalSize - totalCompressedSize;

  // Compressions ce mois-ci
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);

  const thisMonthCompressions = compressions.filter(
    (c) => new Date(c.created_at) >= thisMonth
  ).length;

  const currentMonthSavings = compressions
    .filter((c) => new Date(c.created_at) >= thisMonth)
    .reduce((sum, c) => sum + (c.original_size - c.compressed_size), 0);

  // Type de fichier le plus populaire
  const fileTypeCounts = compressions.reduce((acc, c) => {
    const type = getFileTypeFromMime(c.mime_type);
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const favoriteFileType =
    Object.entries(fileTypeCounts)
      .sort(([, a], [, b]) => b - a)[0]?.[0]
      ?.toUpperCase() || "PDF";

  return {
    totalCompressions: compressions.length,
    totalSizeSavedMB: totalSizeSaved / (1024 * 1024),
    avgCompressionRatio: Math.round(
      compressions.reduce((sum, c) => sum + c.compression_ratio, 0) /
        compressions.length
    ),
    totalOriginalSizeMB: totalOriginalSize / (1024 * 1024),
    totalCompressedSizeMB: totalCompressedSize / (1024 * 1024),
    thisMonthCompressions,
    favoriteFileType,
    currentMonthSavings: currentMonthSavings / (1024 * 1024),
    efficiencyRating: Math.min(
      100,
      Math.round((totalSizeSaved / totalOriginalSize) * 100)
    ),
  };
}

// Instance singleton
export const dbExtended = new DatabaseExtended();
