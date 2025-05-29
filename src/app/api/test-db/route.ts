import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("DATABASE_URL présente:", !!process.env.DATABASE_URL);

    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        status: "no_database_url",
        message: "DATABASE_URL non configurée",
      });
    }

    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const result = await pool.query("SELECT NOW() as current_time");
    await pool.end();

    return NextResponse.json({
      status: "success",
      message: "Connexion PostgreSQL réussie",
      current_time: result.rows[0].current_time,
      database_configured: true,
    });
  } catch (error) {
    console.error("❌ Erreur test DB:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Erreur inconnue",
        database_configured: !!process.env.DATABASE_URL,
      },
      { status: 500 }
    );
  }
}
