import { type User } from "./auth";

// Base de données adaptative : JSON en dev, PostgreSQL en prod
class Database {
  private isProduction = process.env.NODE_ENV === "production";

  async ensureConnection() {
    if (this.isProduction && process.env.DATABASE_URL) {
      await this.initializePostgres();
    }
  }

  private async initializePostgres() {
    // Créer la table users si elle n'existe pas
    try {
      const { Pool } = require("pg");
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

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
      console.log("✅ Table users créée/vérifiée");
      await pool.end();
    } catch (error) {
      console.error("❌ Erreur création table:", error);
    }
  }

  async findUser(email: string): Promise<User | null> {
    if (this.isProduction && process.env.DATABASE_URL) {
      return this.findUserPostgres(email);
    }

    // Fallback vers JSON (développement)
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
    if (this.isProduction && process.env.DATABASE_URL) {
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
    if (this.isProduction && process.env.DATABASE_URL) {
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

export const db = new Database();
