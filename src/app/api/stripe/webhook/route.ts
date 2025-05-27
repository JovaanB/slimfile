import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { updateUser, type User } from "@/lib/auth";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Signature manquante" },
        { status: 400 }
      );
    }

    // Vérifier la signature Stripe
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Erreur signature webhook:", err);
      return NextResponse.json(
        { error: "Signature invalide" },
        { status: 400 }
      );
    }

    // Traiter les événements Stripe
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerEmail = session.metadata?.customerEmail;

        if (customerEmail) {
          // Activer Pro pour l'utilisateur
          await updateUser(customerEmail, {
            is_pro: true,
            subscription_id: session.subscription as string,
            subscription_status: "active",
            stripe_customer_id: session.customer as string,
          });

          console.log(`✅ Utilisateur ${customerEmail} passé en Pro`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if (customer && !customer.deleted && customer.email) {
          await updateUser(customer.email, {
            subscription_status:
              subscription.status as User["subscription_status"],
            subscription_end: subscription.ended_at
              ? new Date(subscription.ended_at * 1000).toISOString()
              : undefined,
          });

          console.log(`🔄 Abonnement mis à jour pour ${customer.email}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        try {
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );

          if (customer && !customer.deleted && customer.email) {
            // Rétrograder vers gratuit
            await updateUser(customer.email, {
              is_pro: false,
              subscription_status: "canceled",
              subscription_id: undefined,
              subscription_end: undefined,
            });

            console.log(
              `❌ Utilisateur ${customer.email} rétrogradé vers gratuit`
            );
          }
        } catch (error) {
          console.error("Erreur récupération customer:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        try {
          const customer = await stripe.customers.retrieve(
            invoice.customer as string
          );

          if (customer && !customer.deleted && customer.email) {
            await updateUser(customer.email, {
              subscription_status: "past_due",
            });

            console.log(`⚠️ Paiement échoué pour ${customer.email}`);
          }
        } catch (error) {
          console.error("Erreur récupération customer:", error);
        }
        break;
      }

      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur webhook Stripe:", error);
    return NextResponse.json(
      { error: "Erreur traitement webhook" },
      { status: 500 }
    );
  }
}
