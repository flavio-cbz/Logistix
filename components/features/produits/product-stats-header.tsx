import { formatEuro } from "@/lib/utils/formatting";

interface ProductStats {
  total: number;
  vendus: number;
  enLigne: number;
  brouillons: number;
  totalBenefices: number;
}

interface ProductStatsHeaderProps {
  stats: ProductStats;
}

export function ProductStatsHeader({ stats }: ProductStatsHeaderProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
      <div className="bg-card border rounded-lg p-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-1">Total</p>
        <p className="text-2xl font-bold">{stats.total}</p>
      </div>
      <div className="bg-card border rounded-lg p-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-1">Vendus</p>
        <p className="text-2xl font-bold text-success">{stats.vendus}</p>
      </div>
      <div className="bg-card border rounded-lg p-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-1">En ligne</p>
        <p className="text-2xl font-bold text-primary">{stats.enLigne}</p>
      </div>
      <div className="bg-card border rounded-lg p-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-1">Brouillons</p>
        <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
          {stats.brouillons}
        </p>
      </div>
      <div className="bg-card border rounded-lg p-3 shadow-sm">
        <p className="text-xs text-muted-foreground mb-1">Bénéfices totaux</p>
        <p
          className={`text-2xl font-bold ${
            stats.totalBenefices >= 0 ? "text-success" : "text-destructive"
          }`}
        >
          {stats.totalBenefices >= 0 ? "+" : ""}
          {formatEuro(stats.totalBenefices)}
        </p>
      </div>
    </div>
  );
}
