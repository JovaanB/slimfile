// components/PostHogProvider.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPostHog } from "@/lib/posthog-client";
import posthog from "posthog-js";
import { Suspense } from "react";

function PostHogProviderInternal({ children }: { children: React.ReactNode }) {
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
    if (pathname && typeof window !== "undefined") {
      try {
        let url = window.origin + pathname;
        if (searchParams.toString()) {
          url = url + `?${searchParams.toString()}`;
        }
        // Utiliser posthog directement au lieu de window.posthog
        posthog.capture("$pageview", { $current_url: url });
      } catch (error) {
        console.error("❌ Erreur pageview tracking:", error);
      }
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <PostHogProviderInternal>{children}</PostHogProviderInternal>
    </Suspense>
  );
}

// Hook sécurisé pour utiliser PostHog
export function usePostHog() {
  return {
    track: (eventName: string, properties?: Record<string, any>) => {
      try {
        if (typeof window !== "undefined") {
          posthog.capture(eventName, properties);
        }
      } catch (error) {
        console.error("❌ Erreur tracking:", error);
      }
    },
    identify: (userId: string, properties?: Record<string, any>) => {
      try {
        if (typeof window !== "undefined") {
          posthog.identify(userId, properties);
        }
      } catch (error) {
        console.error("❌ Erreur identify:", error);
      }
    },
    reset: () => {
      try {
        if (typeof window !== "undefined") {
          posthog.reset();
        }
      } catch (error) {
        console.error("❌ Erreur reset:", error);
      }
    },
  };
}
