import { render, screen } from '@testing-library/react';
import { test, expect, describe, vi } from 'vitest';
import VentesPlateformes from '../ventes-plateformes';
import type { Produit } from '@/types/database';
import React from 'react';

// Mock de la librairie recharts
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Pie: () => <div data-testid="pie" />,
    Cell: () => null,
    Tooltip: () => null,
    Legend: () => null,
}));

describe('VentesPlateformes Chart', () => {
    test('should render the chart with correct data', () => {
        const mockProduits: Produit[] = [
            { id: '1', nom: 'p1', plateforme: 'Vinted', prixVente: 10, vendu: true, commandeId: 'c1', poids: 1, parcelleId: 'p1', prixArticle: 1, prixLivraison: 1 },
            { id: '2', nom: 'p2', plateforme: 'Leboncoin', prixVente: 20, vendu: true, commandeId: 'c2', poids: 1, parcelleId: 'p1', prixArticle: 1, prixLivraison: 1 },
            { id: '3', nom: 'p3', plateforme: 'Vinted', prixVente: 15, vendu: true, commandeId: 'c3', poids: 1, parcelleId: 'p1', prixArticle: 1, prixLivraison: 1 },
        ];

        render(<VentesPlateformes produits={mockProduits} />);

        expect(screen.getByText('Répartition par plateforme')).toBeInTheDocument();
        expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    test('should display a message when there are no sales data', () => {
        render(<VentesPlateformes produits={[]} />);

        expect(screen.getByText('Aucune donnée de vente disponible')).toBeInTheDocument();
    });
});