import { render, screen } from '@testing-library/react';
import { test, expect, describe, vi } from 'vitest';
import PerformanceChart from '../performance-chart';
import type { Produit } from '@/types/database';
import React from 'react';

// Mock de la librairie recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Line: () => <div data-testid="line" />,
}));

describe('PerformanceChart', () => {
    test('should render the chart with correct data', () => {
        const mockProduits: Produit[] = [
            { id: '1', nom: 'p1', dateVente: '2023-01-15', prixVente: 10, benefices: 5, vendu: true, commandeId: 'c1', poids: 1, parcelleId: 'p1', prixArticle: 1, prixLivraison: 1 },
            { id: '2', nom: 'p2', dateVente: '2023-01-20', prixVente: 20, benefices: 10, vendu: true, commandeId: 'c2', poids: 1, parcelleId: 'p1', prixArticle: 1, prixLivraison: 1 },
        ];

        render(<PerformanceChart produits={mockProduits} />);

        expect(screen.getByText('Performance des ventes')).toBeInTheDocument();
        expect(screen.getAllByTestId('line').length).toBeGreaterThan(0);
    });

    test('should display a message when there are no sales data', () => {
        render(<PerformanceChart produits={[]} />);

        expect(screen.getByText('Aucune donnée de vente pour le moment.')).toBeInTheDocument();
    });
});