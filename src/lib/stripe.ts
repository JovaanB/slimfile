import Stripe from "stripe";
import { loadStripe } from "@stripe/stripe-js";

// Configuration Stripe côté serveur
export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_...",
  {
    apiVersion: "2025-04-30.basil",
    typescript: true, // Améliore le typage
  }
);

// Configuration Stripe côté client
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "pk_test_..."
);

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
    priceId: process.env.STRIPE_PRO_PRICE_ID || "price_1234567890",
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
      current_period_end: subscription.current_period_end,
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
