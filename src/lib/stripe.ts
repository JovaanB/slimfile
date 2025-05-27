import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Fonction pour valider les variables Stripe
function getStripeConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  // En développement, utiliser des clés de test ou fallback
  if (process.env.NODE_ENV === "development") {
    return {
      secretKey: secretKey || "sk_test_fallback_development",
      publishableKey: publishableKey || "pk_test_fallback_development",
      webhookSecret: webhookSecret || "whsec_fallback_development",
      priceId: priceId || "price_fallback_development",
    };
  }

  // En production, les variables sont obligatoires
  if (!secretKey || !publishableKey) {
    throw new Error("Variables Stripe manquantes en production");
  }

  return {
    secretKey,
    publishableKey,
    webhookSecret: webhookSecret || "",
    priceId: priceId || "",
  };
}

const config = getStripeConfig();

// Configuration Stripe côté serveur
export const stripe = new Stripe(config.secretKey, {
  apiVersion: "2025-04-30.basil",
  typescript: true,
});

// Configuration Stripe côté client
export const stripePromise = loadStripe(config.publishableKey);

// Plans d'abonnement
export const PLANS = {
  FREE: {
    name: "Gratuit",
    price: 0,
    compressions: 5,
    features: [
      "5 compressions par mois",
      "Tous les formats supportés",
      "Suppression automatique",
      "Support par email",
    ],
  },
  PRO: {
    name: "Pro",
    price: 9,
    priceId: config.priceId,
    compressions: Infinity,
    features: [
      "Compressions illimitées",
      "Traitement par lots",
      "API d'intégration",
      "Support prioritaire",
      "Extension Gmail/Outlook",
    ],
  },
} as const;

// Export des configs pour les webhooks
export const STRIPE_CONFIG = {
  webhookSecret: config.webhookSecret,
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
};

export type PlanType = keyof typeof PLANS;

/**
 * Crée une session de checkout Stripe
 */
export async function createCheckoutSession(
  customerEmail: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
) {
  const session = await stripe.checkout.sessions.create({
    customer_email: customerEmail,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      customerEmail,
    },
    subscription_data: {
      metadata: {
        customerEmail,
      },
    },
  });

  return session;
}

/**
 * Crée un portail de gestion client
 */
export async function createCustomerPortal(
  customerId: string,
  returnUrl: string
) {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return portalSession;
}

/**
 * Récupère les détails d'un abonnement
 */
export async function getSubscriptionDetails(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return {
      id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.ended_at,
      customer: subscription.customer,
      plan: subscription.items.data[0]?.price.id,
    };
  } catch (error) {
    console.error("Erreur récupération abonnement:", error);
    return null;
  }
}

/**
 * Annule un abonnement
 */
export async function cancelSubscription(subscriptionId: string) {
  try {
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  } catch (error) {
    console.error("Erreur annulation abonnement:", error);
    throw error;
  }
}
