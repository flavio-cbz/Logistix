"use client";

import { useState } from "react";
import { useMarketAnalysis } from "@/lib/hooks/useMarketAnalysis";
import { AnalysisStepper } from "./steps/analysis-stepper";
import { SearchStep } from "./steps/search-step";
import { SelectionStep } from "./steps/selection-step";
import { ResultsStep } from "./steps/results-step";

export function MarketAnalysisWizard() {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [query, setQuery] = useState("");

    const {
        isSearching,
        isAnalyzing,
        searchResults,
        analysis,
        searchProducts,
        analyzeProduct,
        resetAnalysis
    } = useMarketAnalysis();

    const handleSearch = async () => {
        if (!query.trim()) return;
        await searchProducts(query);
        setStep(2);
    };

    const handleSelect = async (id: string) => {
        await analyzeProduct(id);
        setStep(3);
    };

    const reset = () => {
        setStep(1);
        setQuery("");
        resetAnalysis();
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <AnalysisStepper currentStep={step} />

            {step === 1 && (
                <SearchStep
                    query={query}
                    setQuery={setQuery}
                    handleSearch={handleSearch}
                    isSearching={isSearching}
                />
            )}

            {step === 2 && (
                <SelectionStep
                    query={query}
                    isSearching={isSearching}
                    isAnalyzing={isAnalyzing}
                    searchResults={searchResults}
                    handleSelect={handleSelect}
                    reset={reset}
                />
            )}

            {isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-lg font-medium text-muted-foreground">Analyse du marché en cours...</p>
                </div>
            )}

            {step === 3 && analysis && !isAnalyzing && (
                <ResultsStep analysis={analysis} reset={reset} />
            )}
        </div>
    );
}
