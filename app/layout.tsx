import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google" // Changer Geist par Inter
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/components/auth/auth-provider"
import { Toaster } from "@/components/ui/toaster"
import { PerformanceMonitor } from "@/components/ui/performance-monitor"
import "./globals.css"

const inter = Inter({ // Changer geist par inter
  subsets: ["latin"],
  display: "swap", // Optimize font loading
  preload: true,
})

// Mettre à jour le titre et la description
export const metadata: Metadata = {
  title: "Logistix - Gestion de logistique",
  description: "Application de gestion de logistique pour le suivi des parcelles et produits",
  keywords: ["logistique", "gestion", "parcelles", "produits", "suivi"],
  authors: [{ name: "Logistix Team" }],
  viewport: "width=device-width, initial-scale=1",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Preload critical resources */}
        <link rel="preload" href="/icon.png" as="image" type="image/png" />
      </head>
      <body className={inter.className}> {/* Changer geist.className par inter.className */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthProvider>
            {children}
            <Toaster />
            {!isProduction && <PerformanceMonitor />}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}