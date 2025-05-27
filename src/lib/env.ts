// Validation et typage des variables d'environnement

export const env = {
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || "",

  // App
  BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-in-production",

  // Database
  DATABASE_URL: process.env.DATABASE_URL || "",

  // Environment
  NODE_ENV: process.env.NODE_ENV || "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
};

// Validation pour la production
export function validateEnv() {
  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "JWT_SECRET",
  ];

  if (env.IS_PRODUCTION) {
    required.push(
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRO_PRICE_ID",
      "DATABASE_URL"
    );
  }

  const missing = required.filter((key) => !env[key as keyof typeof env]);

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missing.join(", ")}`
    );
  }
}

// Auto-validation au démarrage (sauf pendant le build)
if (typeof window === "undefined" && !process.env.NEXT_PHASE) {
  try {
    validateEnv();
  } catch (error) {
    console.warn("⚠️ Variables d'environnement:", error);
  }
}
