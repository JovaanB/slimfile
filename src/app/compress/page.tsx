"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePostHog } from "@/hooks/usePosthog";
import AuthModal from "@/components/AuthModal";
import BatchFileUploader from "@/components/BatchFileUploader";
import CompressionResults from "@/components/CompressionResults";
import UsageCounter from "@/components/UsageCounter";
import UpgradeModal from "@/components/UpgradeModal";

export interface CompressedFile {
  id: string;
  originalName: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  downloadUrl: string;
  type: "pdf" | "image" | "document";
}

export default function CompressPage() {
  const { user, isLoading, isAuthenticated, logout, refreshUser } = useAuth();
  const { track, identify, events } = usePostHog();

  const [compressedFiles, setCompressedFiles] = useState<CompressedFile[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 📊 Track page view et user identification
  useEffect(() => {
    track("compress_page_viewed", {
      is_authenticated: isAuthenticated,
      user_plan: user?.is_pro ? "pro" : "free",
      usage_count: user?.current || 0,
      remaining_compressions: user?.remaining || 0,
    });

    // Identifier l'utilisateur pour PostHog
    if (user) {
      identify(user.email, {
        is_pro: user.is_pro,
        usage_count: user.current,
        max_compressions: user.max,
        signup_date: user.created_at || new Date().toISOString(),
      });
    }
  }, [user, isAuthenticated, track, identify]);

  // Afficher le modal d'auth si pas connecté
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setShowAuthModal(true);

      // 📊 Track auth required
      track("auth_modal_shown", {
        trigger: "page_load",
        page: "compress",
      });
    }
  }, [isLoading, isAuthenticated, track]);

  const handleFilesCompressed = (files: CompressedFile[]) => {
    setCompressedFiles((prev) => [...prev, ...files]);

    // 📊 Track successful compression batch
    track(events.COMPRESSION_COMPLETED, {
      files_processed: files.length,
      file_types: files.map((f) => f.type),
      total_original_size_mb:
        files.reduce((sum, f) => sum + f.originalSize, 0) / 1024 / 1024,
      total_compressed_size_mb:
        files.reduce((sum, f) => sum + f.compressedSize, 0) / 1024 / 1024,
      avg_compression_ratio:
        files.reduce((sum, f) => sum + f.compressionRatio, 0) / files.length,
      user_plan: user?.is_pro ? "pro" : "free",
      usage_after: user?.current || 0 + files.length,
    });

    // Rafraîchir les stats d'usage
    refreshUser();
  };

  const handleCompressionStart = (fileCount: number, fileTypes: string[]) => {
    setIsCompressing(true);

    // 📊 Track compression start
    track(events.COMPRESSION_STARTED, {
      file_count: fileCount,
      file_types: fileTypes,
      user_plan: user?.is_pro ? "pro" : "free",
      usage_before: user?.current || 0,
      remaining_before: user?.remaining || 0,
    });
  };

  const handleCompressionEnd = () => {
    setIsCompressing(false);
  };

  const handleAuthSuccess = (userData: any) => {
    setShowAuthModal(false);
    refreshUser();

    // 📊 Track successful auth
    track(events.LOGIN_COMPLETED, {
      method: userData.method || "magic_link",
      user_type: userData.is_new_user ? "new" : "returning",
      from_page: "compress",
    });

    console.log("🔍 Auth réussi, utilisateur:", userData);
  };

  const handleUpgradeClick = (source: "sidebar_promo" | "limit_reached") => {
    setShowUpgradeModal(true);

    // 📊 Track upgrade intent
    track(events.CHECKOUT_STARTED, {
      source: source,
      current_usage: user?.current || 0,
      remaining: user?.remaining || 0,
      plan_viewed: "pro",
    });
  };

  const handlePlanViewed = () => {
    // 📊 Track plan viewed
    track(events.PLAN_VIEWED, {
      plan_type: "pro",
      price: 9,
      currency: "EUR",
      current_usage: user?.current || 0,
      trigger: "upgrade_modal",
    });
  };

  const handleLogout = () => {
    // 📊 Track logout
    track("user_logout", {
      session_duration: "unknown", // Tu peux calculer si besoin
      compressions_this_session: compressedFiles.length,
    });

    logout();
  };

  // Affichage de chargement
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

  // Debug de l'état utilisateur
  console.log("🔍 État utilisateur:", {
    user,
    isAuthenticated,
    isLoading,
    canCompress: user ? user.remaining > 0 || user.is_pro : false,
  });

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-300 to-violet-500 bg-clip-text text-transparent">
                  SlimFile
                </h1>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">Compresseur de fichiers</span>
              </div>

              <div className="flex items-center space-x-4">
                {user && <UsageCounter current={user.current} max={user.max} />}

                {user && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{user.email}</span>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Zone principale de compression */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-lg p-8">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Compressez vos fichiers
                  </h2>
                  <p className="text-gray-600 text-lg">
                    Glissez-déposez vos fichiers ou cliquez pour les
                    sélectionner
                  </p>
                </div>

                <BatchFileUploader
                  onCompressionStart={handleCompressionStart}
                  onCompressionEnd={handleCompressionEnd}
                  onFilesCompressed={handleFilesCompressed}
                  isDisabled={user ? user.remaining <= 0 && !user.is_pro : true}
                />

                {/* Formats supportés */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500 mb-4">
                    Formats supportés :
                  </p>
                  <div className="flex justify-center space-x-6">
                    {[
                      {
                        name: "PDF",
                        icon: "📄",
                        color: "bg-red-100 text-red-600",
                      },
                      {
                        name: "JPG",
                        icon: "🖼️",
                        color: "bg-blue-100 text-blue-600",
                      },
                      {
                        name: "PNG",
                        icon: "🎨",
                        color: "bg-green-100 text-green-600",
                      },
                      {
                        name: "DOCX",
                        icon: "📝",
                        color: "bg-purple-100 text-purple-600",
                      },
                    ].map((format) => (
                      <div
                        key={format.name}
                        className={`px-4 py-2 rounded-full ${format.color} text-sm font-medium cursor-pointer hover:scale-105 transition-transform`}
                        onClick={() =>
                          track("format_info_clicked", { format: format.name })
                        }
                      >
                        <span className="mr-2">{format.icon}</span>
                        {format.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Résultats des compressions */}
              {compressedFiles.length > 0 && (
                <div className="mt-8">
                  <CompressionResults files={compressedFiles} />
                </div>
              )}
            </div>

            {/* Sidebar avec conseils et upgrade */}
            <div className="space-y-6">
              {/* Conseils d'utilisation */}
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">💡</span>
                  Conseils d'utilisation
                </h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    Les fichiers sont supprimés automatiquement après 1 heure
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    Compression optimisée pour les démarches administratives
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    Qualité préservée selon le type de document
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 mt-0.5">•</span>
                    Taille maximale : 10 MB par fichier
                  </li>
                </ul>
              </div>

              {/* Upgrade Card */}
              {user && user.current >= 4 && !user.is_pro && (
                <div className="bg-gradient-to-br from-sky-500 to-violet-600 rounded-3xl shadow-lg p-6 text-white">
                  <h3 className="font-semibold mb-2 flex items-center">
                    <span className="mr-2">⚡</span>
                    Passez à Pro
                  </h3>
                  <p className="text-sky-100 text-sm mb-4">
                    Plus que {user.remaining} compression(s) gratuite(s) ce
                    mois-ci
                  </p>
                  <ul className="space-y-2 text-sm text-sky-100 mb-4">
                    <li className="flex items-center">
                      <span className="mr-2">✓</span>
                      Compressions illimitées
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">✓</span>
                      Traitement par lots
                    </li>
                    <li className="flex items-center">
                      <span className="mr-2">✓</span>
                      API d'intégration
                    </li>
                  </ul>
                  <button
                    onClick={() => handleUpgradeClick("sidebar_promo")}
                    className="w-full bg-white text-violet-600 py-2 rounded-full font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Upgrader - {9}€/mois
                  </button>
                </div>
              )}

              {/* Limite atteinte */}
              {user && user.current >= user.max && !user.is_pro && (
                <div className="bg-orange-50 border border-orange-200 rounded-3xl p-6">
                  <h3 className="font-semibold text-orange-800 mb-2 flex items-center">
                    <span className="mr-2">🚫</span>
                    Limite atteinte
                  </h3>
                  <p className="text-orange-700 text-sm mb-4">
                    Vous avez utilisé vos 5 compressions gratuites ce mois-ci.
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleUpgradeClick("limit_reached")}
                      className="w-full bg-orange-600 text-white py-2 rounded-full font-semibold hover:bg-orange-700 transition-colors"
                    >
                      Passer à Pro
                    </button>
                    <p className="text-xs text-orange-600 text-center">
                      Ou attendez le mois prochain
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          track("auth_modal_closed", { completed: false });
        }}
        onSuccess={handleAuthSuccess}
      />

      {user && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            track("upgrade_modal_closed", { converted: false });
          }}
          onPlanViewed={handlePlanViewed}
        />
      )}
    </>
  );
}
