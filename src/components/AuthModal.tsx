"use client";

import { useState } from "react";
import {
  XMarkIcon,
  EnvelopeIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "success">("email");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = "Erreur d'authentification";

        try {
          const data = JSON.parse(text);
          errorMessage = data.error || errorMessage;
        } catch {
          // Si ce n'est pas du JSON valide, utiliser le message par défaut
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Connexion directe (pas de magic link en démo)
      setStep("success");

      setTimeout(() => {
        onSuccess(data.user);
        onClose();
        setStep("email");
        setEmail("");
      }, 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setStep("email");
    setEmail("");
    setError("");
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full relative animate-fade-in-up">
        {/* Bouton fermer */}
        <button
          onClick={() => {
            onClose();
            reset();
          }}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {step === "email" ? (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-sky-300 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Commencez gratuitement
              </h2>
              <p className="text-gray-600">
                5 compressions gratuites par mois, aucun mot de passe requis
              </p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Adresse email
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full bg-gradient-to-r from-sky-300 to-violet-500 hover:from-sky-400 hover:to-violet-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-3 rounded-2xl font-semibold transition-all transform hover:scale-105 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="w-5 h-5" />
                    <span>Envoyer le lien magique</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                En continuant, vous acceptez nos{" "}
                <a href="#" className="text-sky-600 hover:underline">
                  conditions d'utilisation
                </a>{" "}
                et notre{" "}
                <a href="#" className="text-sky-600 hover:underline">
                  politique de confidentialité
                </a>
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Succès */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✉️</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                C'est parti !
              </h2>
              <p className="text-gray-600 mb-6">
                Vous êtes maintenant connecté et pouvez utiliser SlimFile.
              </p>
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
                <p className="text-sm text-sky-800">
                  <strong>📧 Email de confirmation envoyé</strong>
                  <br />
                  (En production, vous recevriez un lien de confirmation)
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
