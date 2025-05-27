import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, getUserFromToken, getUsageStats } from "@/lib/auth";

/**
 * POST /api/auth - Connexion/inscription avec email
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const { user, token } = await authenticateUser(email);
    const stats = getUsageStats(user);

    // Simulation d'envoi d'email (à remplacer par un vrai service)
    console.log(`🔐 Magic link pour ${email}: ${token}`);

    const response = NextResponse.json({
      success: true,
      message: "Magic link envoyé par email",
      user: {
        email: user.email,
        created_at: user.created_at,
        is_pro: user.is_pro,
        ...stats,
      },
    });

    // Définir le cookie JWT
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 jours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Erreur auth:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erreur d'authentification",
      },
      { status: 400 }
    );
  }
}

/**
 * GET /api/auth - Vérifier l'authentification actuelle
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const stats = getUsageStats(user);

    return NextResponse.json({
      authenticated: true,
      user: {
        email: user.email,
        created_at: user.created_at,
        is_pro: user.is_pro,
        ...stats,
      },
    });
  } catch (error) {
    console.error("Erreur vérification auth:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/**
 * DELETE /api/auth - Déconnexion
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.delete("auth-token");

  return response;
}
