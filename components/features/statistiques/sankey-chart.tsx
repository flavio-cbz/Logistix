"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface SankeyNode {
  name: string;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyChartProps {
  data: SankeyData;
}

export function SankeyChart({ data }: SankeyChartProps) {
  if (!data || !data.nodes || !data.links || data.nodes.length === 0 || data.links.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Diagramme de Sankey (Flux de Ventes)</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Pas de données de flux disponibles pour le diagramme de Sankey.</p>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Diagramme de Sankey (Flux de Ventes)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <h5 className="font-semibold mb-2">Nœuds:</h5>
          <ul className="list-disc pl-5 mb-4">
            {data.nodes.map((node, index) => (
              <li key={index}>{node.name}</li>
            ))}
          </ul>
          <h5 className="font-semibold mb-2">Liens:</h5>
          <ul className="list-disc pl-5">
            {data.links.map((link, index) => (
              <li key={index}>
                {data.nodes[link.source]?.name} &rarr; {data.nodes[link.target]?.name}: {link.value}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-muted-foreground">
            (Le diagramme Sankey complet nécessite une librairie de visualisation dédiée et sera implémenté ultérieurement.)
          </p>
        </div>
      </CardContent>
    </Card>
  )
}