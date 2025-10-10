"use client";

import { useEffect } from "react";
import { AccessibilityProvider } from "@/lib/contexts/accessibility-context";
import { checkVintedTokenStatus } from "@/lib/services/market-analysis";

export default function AnalyseMarcheLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Vérifie le statut du token Vinted au chargement de la section d'analyse de marché.
    checkVintedTokenStatus();
  }, []);

  return <AccessibilityProvider>{children}</AccessibilityProvider>;
}
