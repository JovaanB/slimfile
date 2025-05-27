// components/PostHogProvider.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog } from "@/lib/posthog-client"; // Import du client uniquement
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Vérifier que les variables d'env sont présentes
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      console.warn("⚠️ NEXT_PUBLIC_POSTHOG_KEY manquante");
      return;
    }

    try {
      // Initialize PostHog
      initPostHog();
      console.log("✅ PostHog initialisé côté client");
    } catch (error) {
      console.error("❌ Erreur init PostHog:", error);
    }
  }, []);

  useEffect(() => {
    // Track page views seulement si PostHog est initialisé
    if (pathname && typeof window !== "undefined" && window.posthog) {
      try {
        let url = window.origin + pathname;
        if (searchParams.toString()) {
          url = url + `?${searchParams.toString()}`;
        }
        posthog.capture("$pageview", { $current_url: url });
      } catch (error) {
        console.error("❌ Erreur pageview tracking:", error);
      }
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

// Hook sécurisé pour utiliser PostHog
export function usePostHog() {
  return {
    track: (eventName: string, properties?: Record<string, any>) => {
      try {
        if (typeof window !== "undefined" && window.posthog) {
          posthog.capture(eventName, properties);
        }
      } catch (error) {
        console.error("❌ Erreur tracking:", error);
      }
    },
    identify: (userId: string, properties?: Record<string, any>) => {
      try {
        if (typeof window !== "undefined" && window.posthog) {
          posthog.identify(userId, properties);
        }
      } catch (error) {
        console.error("❌ Erreur identify:", error);
      }
    },
    reset: () => {
      try {
        if (typeof window !== "undefined" && window.posthog) {
          posthog.reset();
        }
      } catch (error) {
        console.error("❌ Erreur reset:", error);
      }
    },
  };
}
