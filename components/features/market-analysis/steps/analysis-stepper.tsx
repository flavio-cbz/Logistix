
import { cn } from "@/lib/shared/utils";

interface AnalysisStepperProps {
    currentStep: 1 | 2 | 3;
}

export function AnalysisStepper({ currentStep }: AnalysisStepperProps) {
    return (
        <div className="flex items-center justify-center gap-4">
            <div className={cn("flex items-center gap-2", currentStep >= 1 ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors", currentStep >= 1 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>1</div>
                <span className="font-medium hidden sm:inline">Recherche</span>
            </div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className={cn("flex items-center gap-2", currentStep >= 2 ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors", currentStep >= 2 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>2</div>
                <span className="font-medium hidden sm:inline">Sélection</span>
            </div>
            <div className="w-12 h-0.5 bg-muted" />
            <div className={cn("flex items-center gap-2", currentStep >= 3 ? "text-primary" : "text-muted-foreground")}>
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors", currentStep >= 3 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground")}>3</div>
                <span className="font-medium hidden sm:inline">Analyse</span>
            </div>
        </div>
    );
}
