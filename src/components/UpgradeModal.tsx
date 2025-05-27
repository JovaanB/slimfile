"use client";

import { useState } from "react";
import {
  XMarkIcon,
  SparklesIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { PLANS } from "@/lib/stripe";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  userEmail,
}: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: "PRO" }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors du checkout");
      }

      // Rediriger vers Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full relative animate-fade-in-up">
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-300 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Passez à Pro
          </h2>
          <p className="text-gray-600">
            Débloquez toutes les fonctionnalités pour {PLANS.PRO.price}€/mois
          </p>
        </div>

        {/* Comparaison des plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Plan Gratuit */}
          <div className="border border-gray-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Gratuit
            </h3>
            <p className="text-3xl font-bold text-gray-600 mb-4">
              0€<span className="text-sm">/mois</span>
            </p>

            <ul className="space-y-3">
              {PLANS.FREE.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start text-sm text-gray-600"
                >
                  <CheckIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Plan Pro */}
          <div className="border-2 border-sky-500 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-sky-500 text-white px-4 py-1 rounded-full text-sm font-medium">
              Recommandé
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-1">Pro</h3>
            <p className="text-3xl font-bold text-sky-600 mb-4">
              {PLANS.PRO.price}€<span className="text-sm">/mois</span>
            </p>

            <ul className="space-y-3">
              {PLANS.PRO.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start text-sm text-gray-700"
                >
                  <CheckIcon className="w-4 h-4 text-sky-500 mr-2 mt-0.5 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA et info */}
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpgrade}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-sky-300 to-violet-500 hover:from-sky-400 hover:to-violet-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Chargement...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>Passer à Pro - {PLANS.PRO.price}€/mois</span>
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              🔒 Paiement sécurisé par Stripe • Annulation à tout moment
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Facturation mensuelle • Pas d'engagement
            </p>
          </div>
        </div>

        {/* Témoignages/Social proof */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              Déjà utilisé par des professionnels
            </p>
            <div className="flex justify-center space-x-8 text-xs text-gray-500">
              <span>⭐ 4.9/5 (127 avis)</span>
              <span>📈 +2,847 utilisateurs</span>
              <span>💾 8.2 TB économisés</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
