import "./globals.css";
import type { Metadata } from "next";
import { cn } from "@/lib/shared/utils";
import { ThemeProvider } from "@/lib/design-system/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// Use system font stack to avoid fetching Google Fonts during build
const systemFontClass = "font-sans";

export const metadata: Metadata = {
  title: "Logistix",
  description: "Plateforme d'analyse et gestion Logistix",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          systemFontClass,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
