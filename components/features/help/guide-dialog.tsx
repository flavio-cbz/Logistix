"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Book, ArrowRight, CheckCircle2, Package, TrendingUp, Settings } from "lucide-react";

const STEPS = [
    {
        title: "Bienvenue sur Logistix",
        description: "Votre assistant intelligent pour gérer vos ventes e-commerce. Voici comment démarrer en 3 étapes simples.",
        icon: <Book className="w-12 h-12 text-primary" />
    },
    {
        title: "1. Ajoutez vos Produits",
        description: "Allez dans l'onglet 'Produits' pour ajouter manuellement vos articles ou importez-les depuis Superbuy.",
        icon: <Package className="w-12 h-12 text-blue-500" />
    },
    {
        title: "2. Configurez vos Objectifs",
        description: "Définissez vos cibles de revenus et de marge dans les paramètres pour suivre votre progression.",
        icon: <Settings className="w-12 h-12 text-purple-500" />
    },
    {
        title: "3. Suivez vos Performances",
        description: "Consultez le Dashboard pour voir vos ventes, bénéfices et analyses de marché en temps réel.",
        icon: <TrendingUp className="w-12 h-12 text-green-500" />
    }
];

export function GuideDialog({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            setOpen(false);
            setCurrentStep(0);
        }
    };

    const step = STEPS[currentStep] || STEPS[0];

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setTimeout(() => setCurrentStep(0), 300);
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{step?.title}</DialogTitle>
                    <DialogDescription>
                        Étape {currentStep + 1} sur {STEPS.length}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center text-center py-8 space-y-6">
                    <div className="p-4 bg-muted rounded-full">
                        {step?.icon}
                    </div>
                    <p className="text-lg text-muted-foreground max-w-sm">
                        {step?.description}
                    </p>
                </div>

                <DialogFooter className="flex sm:justify-between items-center w-full">
                    <div className="flex gap-1">
                        {STEPS.map((_, idx) => (
                            <div
                                key={idx}
                                className={`h-2 w-2 rounded-full transition-colors ${idx === currentStep ? "bg-primary" : "bg-muted"
                                    }`}
                            />
                        ))}
                    </div>
                    <Button onClick={handleNext}>
                        {currentStep === STEPS.length - 1 ? (
                            <>
                                Terminer
                                <CheckCircle2 className="w-4 h-4 ml-2" />
                            </>
                        ) : (
                            <>
                                Suivant
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
