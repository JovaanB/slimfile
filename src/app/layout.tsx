import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import "@/lib/env-validation"; // Validation automatique
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SlimFile - Compressez vos fichiers en 10 secondes",
  description:
    "Réduisez instantanément la taille de vos fichiers PDF, images et documents Word. Outil gratuit et simple pour vos démarches administratives.",
  keywords: [
    "compression fichier",
    "réduire taille PDF",
    "compresser image",
    "démarches administratives",
    "CAF",
    "impôts",
  ],
  authors: [{ name: "SlimFile" }],
  creator: "SlimFile",
  publisher: "SlimFile",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://slimfile.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SlimFile - Compressez vos fichiers instantanément",
    description:
      "Réduisez la taille de vos PDF, images et documents Word en quelques secondes. Gratuit et sécurisé.",
    url: "https://slimfile.com",
    siteName: "SlimFile",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SlimFile - Compressez vos fichiers instantanément",
    description:
      "Réduisez la taille de vos PDF, images et documents Word en quelques secondes.",
    creator: "@slimfile",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#667eea" />
      </head>
      <body className={inter.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
