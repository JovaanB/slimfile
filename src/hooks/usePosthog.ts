// hooks/usePostHog.ts
"use client";

import { useCallback } from "react";
import posthog from "posthog-js";

// Key events for SlimFile
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

export function usePostHog() {
  // Track any event
  const track = useCallback(
    (eventName: string, properties?: Record<string, any>) => {
      if (typeof window !== "undefined") {
        posthog.capture(eventName, properties);
      }
    },
    []
  );

  // Identify user
  const identify = useCallback(
    (userId: string, properties?: Record<string, any>) => {
      if (typeof window !== "undefined") {
        posthog.identify(userId, properties);
      }
    },
    []
  );

  // Reset user session
  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      posthog.reset();
    }
  }, []);

  // Set user properties
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    if (typeof window !== "undefined") {
      posthog.people.set(properties);
    }
  }, []);

  // Specialized tracking functions for SlimFile
  const trackFileCompression = useCallback(
    (fileType: string, originalSize: number, compressedSize: number) => {
      const compressionRatio = (
        ((originalSize - compressedSize) / originalSize) *
        100
      ).toFixed(2);

      track(SlimFileEvents.COMPRESSION_COMPLETED, {
        file_type: fileType,
        original_size_mb: (originalSize / 1024 / 1024).toFixed(2),
        compressed_size_mb: (compressedSize / 1024 / 1024).toFixed(2),
        compression_ratio: compressionRatio,
        size_saved_mb: ((originalSize - compressedSize) / 1024 / 1024).toFixed(
          2
        ),
      });
    },
    [track]
  );

  const trackUserConversion = useCallback(
    (planType: string, amount: number) => {
      track(SlimFileEvents.SUBSCRIPTION_CREATED, {
        plan_type: planType,
        amount_usd: amount,
        conversion_source: "organic", // À personnaliser selon le contexte
      });
    },
    [track]
  );

  const trackFileUpload = useCallback(
    (fileType: string, fileSize: number) => {
      track(SlimFileEvents.FILE_UPLOADED, {
        file_type: fileType,
        file_size_mb: (fileSize / 1024 / 1024).toFixed(2),
      });
    },
    [track]
  );

  const trackUserSignup = useCallback(
    (method: "email" | "google" | "github") => {
      track(SlimFileEvents.SIGNUP_COMPLETED, {
        signup_method: method,
        timestamp: new Date().toISOString(),
      });
    },
    [track]
  );

  return {
    // Core functions
    track,
    identify,
    reset,
    setUserProperties,

    // Specialized tracking
    trackFileCompression,
    trackUserConversion,
    trackFileUpload,
    trackUserSignup,

    // Events constants
    events: SlimFileEvents,
  };
}
