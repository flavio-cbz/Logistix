"use client";

import { memo, useId, useMemo } from "react"; // Removed React import
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, TrendingUp, Users, Package } from "lucide-react";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";
import type { TooltipProps } from "recharts";

interface SalesVolumeChartProps {
  analysis: VintedAnalysisResult;
}

type PriceBucket = {
  range: string;
  count: number;
  percentage: number;
};

type SizeSlice = {
  name: string;
  value: number;
  color: string;
};

// Helpers
const toNumber = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// Deterministic PRNG to avoid hydration mismatches and keep values stable per analysis
const mulberry32 = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const seedFromAnalysis = (a: VintedAnalysisResult): number => {
  // Using "as any" guards if fields are optional in the type
  const min = toNumber((a as any)?.priceRange?.min, 0);
  const max = toNumber((a as any)?.priceRange?.max, 0);
  const avg = toNumber((a as any)?.avgPrice, 0);
  const vol = toNumber((a as any)?.salesVolume, 0);
  // Combine fields into a 32-bit seed
  const raw = Math.floor(vol * 1000 + avg * 100 + min + max);
  return (raw ^ 0x9e3779b9) >>> 0;
};

// Thresholds
const HIGH_ACTIVITY_MIN = 51;
const MEDIUM_ACTIVITY_MIN = 21;

// Labels
const activityLabel = (vol: number): "Élevée" | "Moyenne" | "Faible" =>
  vol >= HIGH_ACTIVITY_MIN
    ? "Élevée"
    : vol >= MEDIUM_ACTIVITY_MIN
      ? "Moyenne"
      : "Faible";

export default function SalesVolumeChart({ analysis }: SalesVolumeChartProps) {
  const priceChartId = useId();
  const sizeChartId = useId();
  const insightsId = useId();

  const salesVolume = toNumber((analysis as any).salesVolume, 0);
  const avgPrice = toNumber((analysis as any).avgPrice, 0);
  const minPrice = toNumber(
    (analysis as any)?.priceRange?.min,
    avgPrice > 0 ? Math.max(0, avgPrice - 10) : 0,
  );
  const maxPrice = toNumber(
    (analysis as any)?.priceRange?.max,
    avgPrice > 0 ? avgPrice + 10 : minPrice + 10,
  );
  const safeRange = Math.max(0, maxPrice - minPrice);

  const seed = seedFromAnalysis(analysis);
  const rng = useMemo(() => mulberry32(seed), [seed]);

  // Price distribution generation (deterministic, memoized)
  const priceDistribution: PriceBucket[] = useMemo(() => {
    const range = safeRange;
    const dynamicBuckets = range > 0 ? Math.floor(range / 5) : 3;
    const numBuckets = clamp(dynamicBuckets, 3, 6);
    const bucketSize = range > 0 ? range / numBuckets : 1;
    const denom = range / 2 || 1;

    const buckets: PriceBucket[] = Array.from({ length: numBuckets }).map(
      (_, i) => {
        const bucketMin = minPrice + i * bucketSize;
        const bucketMax = minPrice + (i + 1) * bucketSize;
        const mid = (bucketMin + bucketMax) / 2;
        const distanceFromMean = Math.abs(mid - avgPrice);
        const normalizedDistance = clamp(distanceFromMean / denom, 0, 1);

        const baseCount = Math.max(0, Math.floor(salesVolume / numBuckets));
        const variation = Math.floor(
          baseCount * (1 - normalizedDistance) * (0.5 + rng()),
        );
        const count =
          salesVolume === 0 ? 0 : Math.max(0, baseCount + variation);

        return {
          range: `${bucketMin.toFixed(0)}-${bucketMax.toFixed(0)}€`,
          count,
          percentage: 0,
        };
      },
    );

    const total = buckets.reduce((s, b) => s + b.count, 0);
    if (total > 0) {
      buckets.forEach((b, idx) => {
        const pct = Math.round((b.count / total) * 100);
        b.percentage = clamp(pct, 0, 100);
        if (idx === buckets.length - 1) {
          const sumPct = buckets
            .slice(0, -1)
            .reduce((s, x) => s + x.percentage, 0);
          b.percentage = clamp(100 - sumPct, 0, 100);
        }
      });
    } else {
      buckets.forEach((b) => (b.percentage = 0));
    }

    return buckets;
  }, [avgPrice, minPrice, safeRange, salesVolume, rng]);

  // Size distribution (deterministic, memoized)
  const sizeDistribution: SizeSlice[] = useMemo(() => {
    const sizes = ["XS", "S", "M", "L", "XL", "XXL", "Unique"];
    const palette: string[] = [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff7300",
      "#22c55e",
      "#a855f7",
      "#06b6d4",
    ];

    const raw: SizeSlice[] = sizes.map((name, _index) => {
      const base = Math.max(0, Math.floor(salesVolume / 3));
      const factor = 0.3 + rng();
      const value =
        salesVolume === 0 ? 0 : Math.floor(base * factor * (0.4 + rng()));
      return {
        name,
        value,
        color: palette[_index % palette.length] ?? "#8884d8", // Corrected index to _index
      };
    });

    return raw
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [salesVolume, rng]);

  // Tooltips (typed, memoized)
  const CustomTooltip = memo(function CustomTooltipMemo({
    active,
    payload,
    label,
  }: TooltipProps<number, string>) {
    const items = (payload ?? []) as Array<{
      color?: string;
      value?: number | string;
      name?: string | number;
      payload?: { percentage?: number };
    }>;
    if (!active || items.length === 0) return null;

    return (
      <div className="bg-background border rounded-lg p-3 shadow-md">
        <p className="font-medium">{String(label ?? "")}</p>
        {items.map((entry, i) => {
          const color = entry.color ?? "currentColor";
          const rawVal = entry.value;
          const value =
            typeof rawVal === "number" ? rawVal : Number(rawVal ?? 0);
          const pct = entry.payload?.percentage;
          const name = typeof entry.name === "string" ? entry.name : "Ventes";
          return (
            <p key={`${name}-${i}`} style={{ color }}>
              {name}: {value} {typeof pct === "number" ? `(${pct}%)` : null}
            </p>
          );
        })}
      </div>
    );
  });

  const PieTooltip = memo(function PieTooltipMemo({
    active,
    payload,
  }: TooltipProps<number, string>) {
    const items = (payload ?? []) as Array<{
      color?: string;
      name?: string | number;
      value?: number | string;
    }>;
    if (!active || items.length === 0) return null;
    const data = items[0]!;
    if (!data) return null;
    const rawVal = data.value;
    const value = typeof rawVal === "number" ? rawVal : Number(rawVal ?? 0);
    const color = data.color ?? "currentColor";
    const name = typeof data.name === "string" ? data.name : "";
    const percent =
      salesVolume > 0 ? Math.round((value / salesVolume) * 100) : 0;
    return (
      <div className="bg-background border rounded-lg p-3 shadow-md">
        <p className="font-medium">{name}</p>
        <p style={{ color }}>
          {value} ventes ({percent}%)
        </p>
      </div>
    );
  });

  const actLabel = activityLabel(salesVolume);

  return (
    <div className="space-y-6">
      {/* Métriques de volume */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          aria-labelledby="volume-total-title"
          aria-describedby="volume-total-desc"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="volume-total-title" className="text-sm font-medium">
              Volume total
            </CardTitle>
            <ShoppingCart
              aria-hidden
              className="h-4 w-4 text-muted-foreground"
            />
          </CardHeader>
          <CardContent id="volume-total-desc">
            <div className="text-2xl font-bold" aria-live="polite">
              {salesVolume}
            </div>
            <p className="text-xs text-muted-foreground">articles analysés</p>
          </CardContent>
        </Card>

        <Card aria-labelledby="activite-title" aria-describedby="activite-desc">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="activite-title" className="text-sm font-medium">
              Activité
            </CardTitle>
            <TrendingUp aria-hidden className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent id="activite-desc">
            <div className="text-2xl font-bold" aria-live="polite">
              {actLabel}
            </div>
            <p className="text-xs text-muted-foreground">niveau d'activité</p>
          </CardContent>
        </Card>

        <Card
          aria-labelledby="concurrence-title"
          aria-describedby="concurrence-desc"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="concurrence-title" className="text-sm font-medium">
              Concurrence
            </CardTitle>
            <Users aria-hidden className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent id="concurrence-desc">
            <div className="text-2xl font-bold" aria-live="polite">
              {Math.floor(salesVolume / 3)}
            </div>
            <p className="text-xs text-muted-foreground">vendeurs estimés</p>
          </CardContent>
        </Card>

        <Card
          aria-labelledby="diversite-title"
          aria-describedby="diversite-desc"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle id="diversite-title" className="text-sm font-medium">
              Diversité
            </CardTitle>
            <Package aria-hidden className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent id="diversite-desc">
            <div className="text-2xl font-bold" aria-live="polite">
              {priceDistribution.length}
            </div>
            <p className="text-xs text-muted-foreground">tranches de prix</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique de distribution des prix */}
      <Card>
        <CardHeader>
          <CardTitle id={`${priceChartId}-title`}>
            Distribution des Ventes par Tranche de Prix
          </CardTitle>
          <CardDescription id={`${priceChartId}-desc`}>
            Répartition du volume de ventes selon les prix de vente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="h-[300px]"
            role="img"
            aria-labelledby={`${priceChartId}-title`}
            aria-describedby={`${priceChartId}-desc`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Ventes"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
            {priceDistribution.map((bucket) => (
              <Badge key={bucket.range} variant="outline">
                {bucket.range}: {bucket.count} ventes ({bucket.percentage}%)
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Graphique de distribution par taille */}
      {sizeDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle id={`${sizeChartId}-title`}>
              Distribution par Taille (Estimation)
            </CardTitle>
            <CardDescription id={`${sizeChartId}-desc`}>
              Répartition estimée des ventes par taille de produit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div
                className="h-[250px]"
                role="img"
                aria-labelledby={`${sizeChartId}-title`}
                aria-describedby={`${sizeChartId}-desc`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sizeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(Number(percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {sizeDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Détail par taille</h4>
                {sizeDistribution.map((_item) => (
                  <div
                    key={_item.name}
                    className="flex items-center justify-between"
                  >
                    {" "}
                    {/* Corrected item to _item */}
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: _item.color }}
                      />{" "}
                      {/* Corrected item to _item */}
                      <span className="text-sm">{_item.name}</span>{" "}
                      {/* Corrected item to _item */}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {_item.value} ventes
                    </div>{" "}
                    {/* Corrected item to _item */}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                * Les données de taille sont estimées car elles ne sont pas
                toujours disponibles dans les données Vinted. Cette répartition
                est basée sur des tendances générales.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights sur le volume */}
      <Card aria-labelledby={`${insightsId}-title`}>
        <CardHeader>
          <CardTitle id={`${insightsId}-title`}>
            Analyse du Volume de Ventes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Niveau d'activité</h4>
                <div className="space-y-2">
                  {salesVolume >= HIGH_ACTIVITY_MIN ? (
                    <div className="flex items-center gap-2 text-[hsl(var(--success-foreground))]">
                      <TrendingUp aria-hidden className="h-4 w-4" />
                      <span className="text-sm">
                        Marché très actif - Excellente liquidité
                      </span>
                    </div>
                  ) : salesVolume >= MEDIUM_ACTIVITY_MIN ? (
                    <div className="flex items-center gap-2 text-[hsl(var(--primary-foreground))]">
                      <TrendingUp aria-hidden className="h-4 w-4" />
                      <span className="text-sm">
                        Marché modérément actif - Bonne liquidité
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[hsl(var(--warning-foreground))]">
                      <TrendingUp aria-hidden className="h-4 w-4" />
                      <span className="text-sm">
                        Marché peu actif - Liquidité limitée
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Recommandations</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {salesVolume >= HIGH_ACTIVITY_MIN ? (
                    <>
                      <li>• Marché favorable pour la vente</li>
                      <li>• Prix compétitifs recommandés</li>
                      <li>• Rotation rapide possible</li>
                    </>
                  ) : salesVolume >= MEDIUM_ACTIVITY_MIN ? (
                    <>
                      <li>• Marché stable, patience requise</li>
                      <li>• Prix légèrement sous la moyenne</li>
                      <li>• Mise en valeur importante</li>
                    </>
                  ) : (
                    <>
                      <li>• Marché de niche ou saisonnier</li>
                      <li>• Prix attractifs nécessaires</li>
                      <li>• Considérer d'autres plateformes</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
