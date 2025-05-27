// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import UserDashboard from "@/components/UserDashboard";
import { usePostHog } from "@/hooks/usePosthog";

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { track } = usePostHog();
  const router = useRouter();

  // Rediriger si pas connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      track("dashboard_access_denied", {
        reason: "not_authenticated",
        redirect_to: "/login",
      });
      router.push("/");
    }
  }, [isLoading, isAuthenticated, router, track]);

  // Track page access
  useEffect(() => {
    if (user) {
      track("dashboard_page_accessed", {
        user_plan: user.is_pro ? "pro" : "free",
        user_email: user.email,
        usage_count: user.current || 0,
      });
    }
  }, [user, track]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec navigation */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-300 to-violet-500 bg-clip-text text-transparent">
                  SlimFile
                </h1>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">Dashboard</span>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex space-x-6">
                <button
                  onClick={() => router.push("/compress")}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Compresser
                </button>
                <span className="text-sky-600 font-medium">Dashboard</span>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Plan Badge */}
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.is_pro
                    ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {user.is_pro ? "⚡ Pro" : "🆓 Gratuit"}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={() => {
                    track("dashboard_logout_clicked");
                    router.push("/");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Retour
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard Content */}
      <UserDashboard />
    </div>
  );
}
