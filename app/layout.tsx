import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
// import { Providers } from "./providers" // Removed Providers import
import { Toaster } from "@/components/ui/sonner"
// import { Analytics } from "@vercel/analytics/react" // Removed Analytics import

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
  title: "Logistix",
  description: "Plateforme d'analyse de marché Vinted",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable
        )}
      >
        {/* <Providers> */} {/* Removed Providers usage */}
          {children}
          <Toaster />
        {/* </Providers> */} {/* Removed Providers usage */}
        {/* <Analytics /> */} {/* Removed Analytics usage */}
      </body>
    </html>
  )
}