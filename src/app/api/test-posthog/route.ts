// app/api/test-posthog/route.ts
import { NextResponse } from "next/server";
import { serverPostHog } from "@/lib/posthog";

export async function GET() {
  try {
    console.log("🧪 Test PostHog - Début");
    console.log("📊 PostHog config:", {
      hasApiKey: !!process.env.POSTHOG_API_KEY,
      apiKeyLength: process.env.POSTHOG_API_KEY?.length,
      host: process.env.POSTHOG_HOST || "https://app.posthog.com",
    });

    // Test événement simple
    const testEvent = {
      distinctId: "test-user-" + Date.now(),
      event: "posthog_connection_test",
      properties: {
        test_timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        test_source: "api_endpoint",
      },
    };

    console.log("📤 Envoi événement test:", testEvent);

    // Envoyer l'événement
    await serverPostHog.capture(testEvent);

    console.log("✅ Événement envoyé avec succès");

    // Test événement avec plus de propriétés
    await serverPostHog.capture({
      distinctId: "test-user-detailed",
      event: "posthog_detailed_test",
      properties: {
        test_type: "detailed",
        server_time: new Date().toISOString(),
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        uptime: process.uptime(),
      },
    });

    console.log("✅ Événement détaillé envoyé");

    // Flush pour s'assurer que tout est envoyé
    await serverPostHog.shutdown();

    return NextResponse.json({
      success: true,
      message: "PostHog connecté avec succès !",
      events_sent: 2,
      config: {
        api_key_configured: !!process.env.POSTHOG_API_KEY,
        host: process.env.POSTHOG_HOST || "https://app.posthog.com",
        environment: process.env.NODE_ENV,
      },
      next_steps: [
        "1. Va sur PostHog > Events",
        '2. Cherche "posthog_connection_test"',
        "3. Tu devrais voir 2 événements de test",
      ],
    });
  } catch (error) {
    console.error("❌ Erreur test PostHog:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
        config: {
          api_key_configured: !!process.env.POSTHOG_API_KEY,
          api_key_length: process.env.POSTHOG_API_KEY?.length,
          host: process.env.POSTHOG_HOST || "https://app.posthog.com",
        },
        troubleshooting: [
          "Vérifie ta clé API PostHog dans .env.local",
          "Format: POSTHOG_API_KEY=phc_xxxxxxxxx",
          "Redémarre ton serveur de dev après ajout .env",
        ],
      },
      { status: 500 }
    );
  }
}
