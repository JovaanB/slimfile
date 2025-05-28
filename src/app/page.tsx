"use client";

import { useState, useRef } from "react";
import {
  CloudArrowUpIcon,
  BoltIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

export default function HomePage() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    setFileName(files[0].name);
    setIsProcessing(true);
    setIsComplete(false);

    // Simulation de compression
    setTimeout(() => {
      setIsProcessing(false);
      setIsComplete(true);
    }, 2000);
  };

  const resetDemo = () => {
    setIsComplete(false);
    setIsProcessing(false);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="min-h-screen p-12 bg-gradient-to-br from-sky-300 to-violet-500 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-3xl"></div>
          <div className="absolute top-40 right-32 w-24 h-24 bg-white rounded-full blur-2xl"></div>
          <div className="absolute bottom-32 left-1/3 w-40 h-40 bg-white rounded-full blur-3xl"></div>
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen text-center">
          <div className="max-w-4xl">
            {/* Titre principal */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 animate-fade-in-up">
              Compressez vos fichiers
              <br />
              <span className="bg-gradient-to-r from-green-300 to-blue-600 bg-clip-text text-transparent">
                en 10 secondes
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-12 animate-fade-in-up">
              Réduisez instantanément la taille de vos PDF, images et documents
              Word. Parfait pour vos démarches administratives et envois
              professionnels.
            </p>

            {/* Demo Container */}
            <div className="bg-white/15 backdrop-blur-xl rounded-3xl p-8 mb-8 border border-white/20 animate-fade-in-up">
              <div
                className={`border-3 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer ${
                  isDragOver
                    ? "border-green-400 bg-green-400/20 scale-105"
                    : "border-white/50 hover:border-white hover:bg-white/10"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() =>
                  !isProcessing && !isComplete && fileInputRef.current?.click()
                }
              >
                {isComplete ? (
                  <div className="text-white">
                    <div className="text-6xl mb-4 text-green-400">✓</div>
                    <div>
                      <strong className="text-xl">Fichier compressé !</strong>
                      <br />
                      <span className="text-white/80">
                        Réduction de 78% • {fileName}
                      </span>
                      <br />
                      <div className="flex gap-4 justify-center mt-6">
                        <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-full font-semibold transition-all transform hover:scale-105">
                          📥 Télécharger
                        </button>
                        <button
                          onClick={resetDemo}
                          className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-semibold transition-all"
                        >
                          🔄 Nouveau fichier
                        </button>
                      </div>
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="text-white">
                    <div className="text-6xl mb-4 animate-spin">⚡</div>
                    <div>
                      <strong className="text-xl">
                        Compression en cours...
                      </strong>
                      <br />
                      <span className="text-white/80">{fileName}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-white">
                    <CloudArrowUpIcon className="w-16 h-16 mx-auto mb-4 animate-float" />
                    <div>
                      <strong className="text-xl">
                        Glissez votre fichier ici
                      </strong>
                      <br />
                      <span className="text-white/80">
                        ou cliquez pour sélectionner
                      </span>
                      <br />
                      <small className="text-white/60 mt-2 block">
                        PDF • JPG • PNG • DOCX
                      </small>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* CTA Button */}
            <a
              href="/compress"
              className="inline-block bg-gradient-to-r from-green-400 to-green-600 text-white px-8 py-4 rounded-full text-xl font-semibold shadow-2xl shadow-green-400/40 hover:shadow-green-400/60 transition-all transform hover:scale-105 hover:-translate-y-1 animate-fade-in-up"
            >
              ⚡ Essayer gratuitement
            </a>

            {/* Stats */}
            <div className="flex flex-col md:flex-row justify-center px-4 gap-8 mt-12 text-white animate-fade-in-up">
              <div className="text-center">
                <div className="text-3xl font-bold">12,847</div>
                <div className="text-white/80">Fichiers compressés</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">2.4 GB</div>
                <div className="text-white/80">Espace économisé</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">4.9★</div>
                <div className="text-white/80">Note utilisateurs</div>
              </div>
            </div>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.docx"
          className="hidden"
          multiple
        />
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Pourquoi choisir SlimFile ?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: BoltIcon,
                title: "Ultra rapide",
                description:
                  "Compression instantanée sans perte de qualité. Vos fichiers sont prêts en quelques secondes.",
              },
              {
                icon: ShieldCheckIcon,
                title: "100% sécurisé",
                description:
                  "Vos fichiers sont supprimés automatiquement après 1 heure. Aucun stockage permanent.",
              },
              {
                icon: DevicePhoneMobileIcon,
                title: "Compatible partout",
                description:
                  "Fonctionne sur tous vos appareils : ordinateur, tablette et smartphone.",
              },
              {
                icon: DocumentTextIcon,
                title: "Tous formats",
                description:
                  "PDF, JPG, PNG, DOCX - Un seul outil pour tous vos besoins de compression.",
              },
              {
                icon: BuildingLibraryIcon,
                title: "Spécial administratif",
                description:
                  "Optimisé pour les contraintes des organismes publics (CAF, impôts, etc.).",
              },
              {
                icon: SparklesIcon,
                title: "Intelligence automatique",
                description:
                  "Détection automatique du meilleur ratio compression/qualité selon votre usage.",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center mb-6">
                  <feature.icon className="w-16 h-16" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Tarifs simples et transparents
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Plan Gratuit */}
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Gratuit</h3>
              <div className="text-4xl font-bold text-primary-500 mb-6">
                0€<span className="text-lg text-gray-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "5 compressions par mois",
                  "Tous les formats supportés",
                  "Suppression auto des fichiers",
                  "Support par email",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="text-green-500 mr-3">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-primary-500 hover:bg-primary-600 text-white py-3 rounded-full font-semibold transition-all">
                Commencer gratuitement
              </button>
            </div>

            {/* Plan Pro */}
            <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-primary-500 relative transform scale-105">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-sky-500 to-violet-500 text-white px-6 py-2 rounded-full text-sm font-semibold">
                POPULAIRE
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Pro</h3>
              <div className="text-4xl font-bold text-primary-500 mb-6">
                9€<span className="text-lg text-gray-500">/mois</span>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Compressions illimitées",
                  "Traitement par lots",
                  "API d'intégration",
                  "Support prioritaire",
                  "Extension Gmail/Outlook",
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="text-green-500 mr-3">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-600 hover:to-secondary-600 text-white py-3 rounded-full font-semibold transition-all transform hover:scale-105">
                Choisir Pro
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
