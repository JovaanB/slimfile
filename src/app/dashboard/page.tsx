// app/dashboard/page.tsx
"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import UserDashboard from "@/components/UserDashboard";
import { usePostHog } from "@/hooks/usePosthog";
import MobileNavbar from "@/components/MobileNavbar";

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { track } = usePostHog();
  const router = useRouter();

  const navigate = (page: string) => {
    window.location.href = `/${page}`;
  };

  // Rediriger si pas connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      track("dashboard_access_denied", {
        reason: "not_authenticated",
        redirect_to: "/",
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
      <MobileNavbar
        user={user}
        currentPage="dashboard"
        onNavigate={(page) => {
          router.push(`/${page}`);
        }}
        onLogout={() => {
          track("dashboard_logout_clicked");
        }}
      />
      {/* Dashboard Content */}
      <UserDashboard />
    </div>
  );
}
