'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/utils/logging/logger';

interface ChartExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'csv';
  resolution: 'standard' | 'hd' | 'print';
  includeTitle: boolean;
  includeLegend: boolean;
  includeSource: boolean;
  customText?: string;
}

export interface ChartExportDialogProps { // Export de l'interface
  isOpen: boolean;
  onClose: () => void;
  chartRef: React.RefObject<HTMLDivElement>;
  chartTitle: string;
  chartData: any[]; // Données brutes du graphique
  csvHeaders: string[]; // En-têtes pour l'export CSV
}

const defaultOptions: ChartExportOptions = {
  format: 'png',
  resolution: 'standard',
  includeTitle: true,
  includeLegend: true,
  includeSource: true,
  customText: '',
};

export function ChartExportDialog({ isOpen, onClose, chartRef, chartTitle, chartData, csvHeaders }: ChartExportDialogProps) {
  const [options, setOptions] = useState<ChartExportOptions>(defaultOptions);
  const [isExporting, setIsExporting] = useState(false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setOptions(defaultOptions); // Réinitialiser les options quand la modale se ferme
    }
  }, [isOpen]);

  const handleOptionChange = useCallback((_key: keyof ChartExportOptions, value: any) => {
    setOptions(prev => ({ ...prev, [_key]: value }));
  }, []);

  const exportChart = useCallback(async () => {
    if (!chartRef.current) {
      toast({
        title: "Erreur d'export",
        description: "Graphique non trouvé pour l'export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      if (options.format === 'csv') {
        exportCSV();
      } else {
        // Logique pour l'export d'image (PNG/JPEG/SVG)
        toast({
          title: "Export d'image",
          description: `Exportation en ${options.format.toUpperCase()} non implémentée pour le moment.`,
          variant: "default",
        });
        logger.warn(`Image export for ${options.format.toUpperCase()} not implemented.`);
      }
      onClose();
    } catch (error) {
      logger.error("Erreur lors de l'export du graphique:", error);
      toast({
        title: "Erreur d'export",
        description: "Une erreur est survenue lors de l'exportation.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [options, chartRef, onClose, chartData, csvHeaders]);

  const exportCSV = useCallback(() => {
    if (!chartData || chartData.length === 0) {
      toast({
        title: "Export CSV",
        description: "Aucune donnée de graphique à exporter en CSV.",
        variant: "destructive",
      });
      return;
    }

    const header = csvHeaders.join(',');
    const rows = chartData.map(row => csvHeaders.map(header => row[header]).join(','));
    const csvContent = [header, ...rows].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = `${chartTitle.replace(/\s/g, '_')}_data.csv`;
      downloadLinkRef.current.click();
    } else {
      // Fallback for environments where ref might not be available or clickable
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chartTitle.replace(/\s/g, '_')}_data.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    URL.revokeObjectURL(url); // Clean up the URL object
    toast({
      title: "Export CSV",
      description: "Données du graphique exportées en CSV.",
    });
  }, [chartData, csvHeaders, chartTitle]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exporter le graphique</DialogTitle>
          <DialogDescription>
            Configurez les options d'exportation pour votre graphique "{chartTitle}".
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="format" className="text-right">
              Format
            </Label>
            <Select value={options.format} onValueChange={(val: 'png' | 'jpeg' | 'svg' | 'csv') => handleOptionChange('format', val)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Sélectionner un format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpeg">JPEG</SelectItem>
                <SelectItem value="svg">SVG</SelectItem>
                <SelectItem value="csv">CSV (Données)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {options.format !== 'csv' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resolution" className="text-right">
                Résolution
              </Label>
              <Select value={options.resolution} onValueChange={(val: 'standard' | 'hd' | 'print') => handleOptionChange('resolution', val)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Sélectionner une résolution" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (Web)</SelectItem>
                  <SelectItem value="hd">HD (Écran)</SelectItem>
                  <SelectItem value="print">Impression (300 DPI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="includeTitle" className="text-right">
              Titre
            </Label>
            <Switch
              id="includeTitle"
              checked={options.includeTitle}
              onCheckedChange={(checked) => handleOptionChange('includeTitle', checked)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="includeLegend" className="text-right">
              Légende
            </Label>
            <Switch
              id="includeLegend"
              checked={options.includeLegend}
              onCheckedChange={(checked) => handleOptionChange('includeLegend', checked)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="includeSource" className="text-right">
              Source
            </Label>
            <Switch
              id="includeSource"
              checked={options.includeSource}
              onCheckedChange={(checked) => handleOptionChange('includeSource', checked)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="customText" className="text-right">
              Texte perso.
            </Label>
            <Input
              id="customText"
              value={options.customText}
              onChange={(e) => handleOptionChange('customText', e.target.value)}
              placeholder="Ajouter un texte personnalisé"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={exportChart} disabled={isExporting}>
            {isExporting ? 'Exportation...' : 'Exporter'}
          </Button>
          <a ref={downloadLinkRef} style={{ display: 'none' }} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}