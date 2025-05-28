import React, { useState } from "react";
import { usePostHog } from "@/hooks/usePosthog";
import {
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  DocumentIcon,
  UserIcon,
  ArrowRightStartOnRectangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { AuthUser, useAuth } from "@/hooks/useAuth";

interface MobileNavbarProps {
  user: AuthUser | null;
  currentPage: "compress" | "dashboard";
  onNavigate: (page: "compress" | "dashboard") => void;
  onLogout: () => void;
}

export default function MobileNavbar({
  user,
  currentPage,
  onNavigate,
  onLogout,
}: MobileNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { track } = usePostHog();
  const { logout } = useAuth();

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    track("mobile_menu_toggled", {
      action: !isMenuOpen ? "open" : "close",
      current_page: currentPage,
    });
  };

  const handleNavigation = (page: "compress" | "dashboard") => {
    track("mobile_navigation_clicked", {
      from: currentPage,
      to: page,
      source: "mobile_menu",
    });
    onNavigate(page);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    track("mobile_logout_clicked");
    onLogout();
    setIsMenuOpen(false);
    logout();
  };

  return (
    <>
      {/* Header Mobile */}
      <header className="bg-white shadow-sm border-b lg:hidden">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold bg-gradient-to-r from-sky-300 to-violet-500 bg-clip-text text-transparent">
                SlimFile
              </h1>
              {currentPage === "dashboard" && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600 text-sm">Dashboard</span>
                </>
              )}
            </div>

            {/* Menu Button */}
            <button
              onClick={handleMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <XMarkIcon className="w-6 h-6 text-gray-600" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t bg-white shadow-lg">
            <div className="px-4 py-3 space-y-1">
              {/* User Info */}
              <div className="pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-violet-500 rounded-full flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          user?.is_pro
                            ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user?.is_pro ? (
                          <>
                            <SparklesIcon className="w-3 h-3 mr-1" />
                            Pro
                          </>
                        ) : (
                          "🆓 Gratuit"
                        )}
                      </span>
                      {!user?.is_pro && (
                        <span className="text-xs text-gray-500">
                          {user?.remaining || 0}/{user?.max || 5} restantes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1 py-2">
                <button
                  onClick={() => handleNavigation("compress")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === "compress"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <DocumentIcon className="w-5 h-5" />
                  <span className="font-medium">Compresser</span>
                  {currentPage === "compress" && (
                    <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full"></div>
                  )}
                </button>

                <button
                  onClick={() => handleNavigation("dashboard")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentPage === "dashboard"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <ChartBarIcon className="w-5 h-5" />
                  <span className="font-medium">Dashboard</span>
                  {(user?.current ?? 0) > 0 && (
                    <span className="ml-auto bg-sky-100 text-sky-600 text-xs px-2 py-0.5 rounded-full">
                      {user?.current}
                    </span>
                  )}
                  {currentPage === "dashboard" && (
                    <div className="ml-auto w-2 h-2 bg-sky-500 rounded-full"></div>
                  )}
                </button>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <ArrowRightStartOnRectangleIcon className="w-5 h-5" />
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Desktop Header reste identique */}
      <header className="bg-white shadow-sm border-b hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-300 to-violet-500 bg-clip-text text-transparent">
                  SlimFile
                </h1>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">
                  {currentPage === "compress"
                    ? "Compresseur de fichiers"
                    : "Dashboard"}
                </span>
              </div>

              {/* Navigation Desktop */}
              <nav className="flex space-x-6">
                <button
                  onClick={() => handleNavigation("compress")}
                  className={`transition-colors ${
                    currentPage === "compress"
                      ? "text-sky-600 font-medium"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Compresser
                </button>
                <button
                  onClick={() => handleNavigation("dashboard")}
                  className={`flex items-center space-x-1 transition-colors ${
                    currentPage === "dashboard"
                      ? "text-sky-600 font-medium"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <ChartBarIcon className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Usage Counter Desktop */}
              {!user?.is_pro && (
                <div className="bg-gray-100 px-3 py-1 rounded-lg">
                  <span className="text-sm text-gray-600">
                    {user?.remaining || 0}/{user?.max || 5}
                  </span>
                </div>
              )}

              {/* Plan Badge Desktop */}
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user?.is_pro
                    ? "bg-gradient-to-r from-sky-500 to-violet-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {user?.is_pro ? "⚡ Pro" : "🆓 Gratuit"}
              </div>

              {/* User Menu Desktop */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
