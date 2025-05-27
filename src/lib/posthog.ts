// lib/posthog.ts
import { PostHog } from "posthog-node";

// ⚠️ SERVER ONLY - Ne jamais importer côté client
export const serverPostHog = new PostHog(process.env.POSTHOG_API_KEY!, {
  host: process.env.POSTHOG_HOST || "https://app.posthog.com",
});

// Key events for SlimFile - Exporté pour réutilisation
export const SlimFileEvents = {
  // Core product events
  FILE_UPLOADED: "file_uploaded",
  COMPRESSION_STARTED: "compression_started",
  COMPRESSION_COMPLETED: "compression_completed",
  FILE_DOWNLOADED: "file_downloaded",

  // User journey events
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_COMPLETED: "login_completed",

  // Business events
  PLAN_VIEWED: "plan_viewed",
  CHECKOUT_STARTED: "checkout_started",
  SUBSCRIPTION_CREATED: "subscription_created",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",

  // Engagement events
  DASHBOARD_VIEWED: "dashboard_viewed",
  SETTINGS_VIEWED: "settings_viewed",
  SUPPORT_CONTACTED: "support_contacted",
} as const;

// Server-side utility functions
export const trackFileCompressionServer = (
  userId: string,
  fileType: string,
  originalSize: number,
  compressedSize: number
) => {
  const compressionRatio = (
    ((originalSize - compressedSize) / originalSize) *
    100
  ).toFixed(2);

  serverPostHog.capture({
    distinctId: userId,
    event: SlimFileEvents.COMPRESSION_COMPLETED,
    properties: {
      file_type: fileType,
      original_size_mb: (originalSize / 1024 / 1024).toFixed(2),
      compressed_size_mb: (compressedSize / 1024 / 1024).toFixed(2),
      compression_ratio: compressionRatio,
      size_saved_mb: ((originalSize - compressedSize) / 1024 / 1024).toFixed(2),
    },
  });
};

export const trackUserConversionServer = (
  userId: string,
  planType: string,
  amount: number
) => {
  serverPostHog.capture({
    distinctId: userId,
    event: SlimFileEvents.SUBSCRIPTION_CREATED,
    properties: {
      plan_type: planType,
      amount_usd: amount,
      conversion_source: "organic", // À personnaliser selon le contexte
    },
  });
};
