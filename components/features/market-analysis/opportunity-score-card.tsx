import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Trophy, ThumbsUp, ThumbsDown, HelpCircle } from 'lucide-react';

type OpportunityScoreInput = {
  avgPrice: number[];
  salesVolume: number[];
};

function calculateOpportunityScore({ avgPrice, salesVolume }: OpportunityScoreInput): { score: number; label: string; icon: React.ReactNode; color: string } {
  if (!avgPrice.length || !salesVolume.length) {
    return { score: 0, label: 'Données insuffisantes', icon: <HelpCircle className="text-gray-400 h-6 w-6" />, color: 'gray' };
  }
  // Score = volume moyen * (1 - coefficient de variation du prix)
  const meanVolume = salesVolume.reduce((a, b) => a + b, 0) / salesVolume.length;
  const meanPrice = avgPrice.reduce((a, b) => a + b, 0) / avgPrice.length;
  const stdPrice = Math.sqrt(avgPrice.reduce((a, b) => a + Math.pow(b - meanPrice, 2), 0) / avgPrice.length);
  const priceStability = 1 - Math.min(stdPrice / meanPrice, 1); // 0 = instable, 1 = très stable
  const score = Math.round(meanVolume * priceStability);

  if (score > 80) return { score, label: 'Excellente opportunité', icon: <Trophy className="text-yellow-500 h-6 w-6" />, color: 'yellow' };
  if (score > 40) return { score, label: 'Bonne opportunité', icon: <ThumbsUp className="text-green-600 h-6 w-6" />, color: 'green' };
  if (score > 0) return { score, label: 'Opportunité limitée', icon: <ThumbsDown className="text-red-600 h-6 w-6" />, color: 'red' };
  return { score, label: 'Données insuffisantes', icon: <HelpCircle className="text-gray-400 h-6 w-6" />, color: 'gray' };
}

interface OpportunityScoreCardProps {
  avgPriceHistory: number[];
  salesVolumeHistory: number[];
  isLoading?: boolean;
}

const OpportunityScoreCard: React.FC<OpportunityScoreCardProps> = ({ avgPriceHistory, salesVolumeHistory, isLoading }) => {
  const { score, label, icon, color } = calculateOpportunityScore({ avgPrice: avgPriceHistory, salesVolume: salesVolumeHistory });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calcul du score d'opportunité...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score d'opportunité</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-2">
          {icon}
          <span className={`text-2xl font-bold ${color === 'yellow' ? 'text-yellow-500' : color === 'green' ? 'text-green-600' : color === 'red' ? 'text-red-600' : 'text-gray-400'}`}>
            {score}
          </span>
        </div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Calcul basé sur le volume moyen et la stabilité du prix (écart-type / moyenne).
        </div>
      </CardContent>
    </Card>
  );
};

export default OpportunityScoreCard;