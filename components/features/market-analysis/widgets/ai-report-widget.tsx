"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";
import { generateReport } from "@/lib/services/ai/report-generator";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface AiReportWidgetProps {
  analysis: VintedAnalysisResult;
}

export default function AiReportWidget({ analysis }: AiReportWidgetProps) {
  const [report, setReport] = useState<{
    summary?: string;
    recommendations?: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      const result = await generateReport(analysis as any);
      setReport(
        result as { summary?: string; recommendations?: string[] } | null,
      );
      setLoading(false);
    };

    fetchReport();
  }, [analysis]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rapport d'Analyse IA</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : report ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold">Résumé</h4>
              <p className="text-sm text-muted-foreground">
                {report.summary ?? ""}
              </p>
            </div>
            <div>
              <h4 className="font-semibold">Recommandations</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {(report.recommendations || []).map((rec, _index) => (
                  <li key={_index}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Impossible de générer le rapport.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
