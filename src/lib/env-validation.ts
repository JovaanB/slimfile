/**
 * Validation et affichage des variables d'environnement
 */

export function validateEnvironment() {
  const isDev = process.env.NODE_ENV === "development";
  const isProd = process.env.NODE_ENV === "production";

  console.log(`🔧 Mode: ${process.env.NODE_ENV}`);

  // Variables obligatoires en production
  const requiredInProd = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
    "JWT_SECRET",
  ];

  // Variables recommandées en développement
  const recommendedInDev = [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ];

  const missing = [];
  const present = [];

  for (const key of requiredInProd) {
    const value = process.env[key];
    if (value && !value.includes("fallback")) {
      present.push(key);
    } else {
      missing.push(key);
    }
  }

  if (isDev) {
    console.log("📋 Variables d'environnement (Développement):");
    present.forEach((key) => console.log(`  ✅ ${key}: configuré`));
    missing.forEach((key) => console.log(`  ⚠️  ${key}: utilise fallback`));

    if (missing.length > 0) {
      console.log("\n💡 Pour tester Stripe:");
      console.log("  1. Crée un compte sur https://dashboard.stripe.com");
      console.log("  2. Récupère tes clés de test");
      console.log("  3. Ajoute-les dans .env.local");
      console.log(
        "  4. Utilise: stripe listen --forward-to localhost:3000/api/stripe/webhook"
      );
    }
  }

  if (isProd && missing.length > 0) {
    console.error("❌ Variables manquantes en production:", missing);
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(", ")}`
    );
  }

  return { missing, present, isReady: isProd ? missing.length === 0 : true };
}

// Auto-validation au démarrage (côté serveur uniquement)
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  validateEnvironment();
}
