import type React from "react"
import type { Metadata, Viewport } from "next"
// Removed external Google font import to avoid network fetch during dev
import { AccessibilityProvider } from "@/lib/contexts/accessibility-context";
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { LiveRegionProvider } from "@/components/ui/live-region"
import "./globals.css"

// Use system font stack (Tailwind's font-sans) to avoid remote font requests
const systemFontClass = "font-sans"

// Mettre à jour le titre et la description
export const metadata: Metadata = {
  title: "Logistix",
  description: "Application de gestion de logistique pour le suivi des parcelles et produits",
  keywords: ["logistique", "gestion", "parcelles", "produits", "suivi"],
  authors: [{ name: "Logistix Team" }],
  robots: "index, follow",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        sizes: "any",
      },
      {
        url: "/icon-512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: {
      url: "/apple-icon.png",
      sizes: "180x180",
    },
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        {/* Removed preconnect to Google Fonts to avoid external network fetch during dev */}
        {/* Preload critical image */}
        <link rel="preload" href="/icon.png" as="image" type="image/png" />
      </head>
      <body className={systemFontClass} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <AccessibilityProvider>
              <LiveRegionProvider>
                  {children}
              </LiveRegionProvider>
            </AccessibilityProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}