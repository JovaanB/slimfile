"use client";

import posthog from "posthog-js";

// CLIENT ONLY - Initialisation PostHog
export const initPostHog = () => {
  if (typeof window !== "undefined" && !window.posthog) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
      loaded: (posthog) => {
        if (process.env.NODE_ENV === "development") {
          posthog.debug();
          console.log("🎯 PostHog initialisé côté client");
        }
      },
    });
  }
  return posthog;
};
