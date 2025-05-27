import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { createCheckoutSession, PLANS } from "@/lib/stripe";

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
      return NextResponse.json(
        { error: "Utilisateur invalide" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur n'est pas déjà Pro
    if (user.is_pro) {
      return NextResponse.json(
        { error: "Vous êtes déjà abonné Pro" },
        { status: 400 }
      );
    }

    const { plan } = await request.json();

    if (plan !== "PRO") {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    // URLs de succès et d'annulation
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "https://slimfile.vercel.app";
    const successUrl = `${baseUrl}/compress?success=true`;
    const cancelUrl = `${baseUrl}/compress?canceled=true`;

    // Créer la session de checkout
    const session = await createCheckoutSession(
      user.email,
      PLANS.PRO.priceId,
      successUrl,
      cancelUrl
    );

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Erreur checkout Stripe:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du checkout" },
      { status: 500 }
    );
  }
}
