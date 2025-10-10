"use client";

import { Package2 } from "lucide-react";

export function LogoAnimated() {
  return (
    <div
      className="flex flex-col items-center justify-center mb-8 transition-all duration-500"
      style={{ transform: "scale(1)", opacity: 1 }} // Simulate initial and animate
    >
      <div className="flex items-center justify-center w-20 h-20 bg-primary text-primary-foreground rounded-2xl mb-4 shadow-lg transition-all duration-500 hover:rotate-[-10deg] hover:scale-[1.05]">
        <Package2 className="w-12 h-12" />
      </div>
      <h1
        className="text-3xl font-bold tracking-tight transition-all duration-500"
        style={{ transform: "translateY(0px)", opacity: 1 }} // Simulate initial and animate
      >
        Logistix
      </h1>
      <p
        className="text-sm text-muted-foreground transition-all duration-500"
        style={{ transform: "translateY(0px)", opacity: 1 }} // Simulate initial and animate
      >
        Gestion intelligente de vos parcelles et produits
      </p>
    </div>
  );
}
