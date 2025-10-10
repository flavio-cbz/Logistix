"use client";

import {
  memo,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type Attributes,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Euro, TrendingDown, TrendingUp } from "lucide-react";
import type { VintedAnalysisResult } from "@/types/vinted-market-analysis";

interface KeyMetricsWidgetProps {
  analysis: VintedAnalysisResult;
}

interface MetricCardProps {
  title: string;
  titleId: string;
  icon: ReactNode;
  value: string | number | ReactElement;
  subtitle: string;
  valueClassName?: string;
  "data-testid"?: string;
}

/**
 * Formatters (created once for perf and consistency)
 */
const CURRENCY_FORMATTER = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});
const INTEGER_FORMATTER = new Intl.NumberFormat("fr-FR");

const formatPrice = (price: number) => CURRENCY_FORMATTER.format(price);
const formatInt = (n: number) => INTEGER_FORMATTER.format(n);

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

/**
 * Internal presentational card with accessibility and test hooks.
 */
const MetricCard = memo(function MetricCard({
  title,
  titleId,
  icon,
  value,
  subtitle,
  valueClassName,
  "data-testid": testId,
}: MetricCardProps): ReactElement {
  const renderedIcon = isValidElement(icon)
    ? cloneElement(
        icon as ReactElement<any, string | React.JSXElementConstructor<any>>,
        { "aria-hidden": true, focusable: false } as Partial<Attributes>,
      )
    : null;

  return (
    <Card role="region" aria-labelledby={titleId} data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle id={titleId} className="text-sm font-medium">
          {title}
        </CardTitle>
        {renderedIcon}
      </CardHeader>
      <CardContent>
        <div
          className={cx("text-2xl font-bold", valueClassName)}
          aria-live="polite"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {value}
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
});

/**
 * Base component (wrapped with React.memo below).
 */
function KeyMetricsWidgetBase({
  analysis,
}: KeyMetricsWidgetProps): ReactElement {
  // Defensive extraction with sensible fallbacks
  const salesVolume = analysis?.salesVolume ?? 0;
  const avgPrice = analysis?.avgPrice ?? 0;
  const minPrice = analysis?.priceRange?.min ?? 0;
  const maxPrice = analysis?.priceRange?.max ?? 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Volume de ventes"
        titleId="metric-sales-volume-title"
        icon={<ShoppingCart className="h-4 w-4 text-muted-foreground" />}
        value={formatInt(salesVolume)}
        subtitle="articles vendus analysés"
        data-testid="metric-sales-volume"
      />

      <MetricCard
        title="Prix moyen"
        titleId="metric-avg-price-title"
        icon={<Euro className="h-4 w-4 text-muted-foreground" />}
        value={formatPrice(avgPrice)}
        subtitle="prix de vente moyen"
        data-testid="metric-avg-price"
      />

      <MetricCard
        title="Prix minimum"
        titleId="metric-min-price-title"
        icon={
          <TrendingDown className="h-4 w-4 text-[hsl(var(--success-foreground))]" />
        }
        value={formatPrice(minPrice)}
        subtitle="prix le plus bas"
        valueClassName="text-[hsl(var(--success-foreground))]"
        data-testid="metric-min-price"
      />

      <MetricCard
        title="Prix maximum"
        titleId="metric-max-price-title"
        icon={
          <TrendingUp className="h-4 w-4 text-[hsl(var(--destructive-foreground))]" />
        }
        value={formatPrice(maxPrice)}
        subtitle="prix le plus élevé"
        valueClassName="text-[hsl(var(--destructive-foreground))]"
        data-testid="metric-max-price"
      />
    </div>
  );
}

/**
 * Memoize the widget to avoid unnecessary re-renders when the used fields are unchanged.
 */
const areEqual = (
  prev: KeyMetricsWidgetProps,
  _next: KeyMetricsWidgetProps,
) => {
  const p = prev.analysis;
  const n = _next.analysis;
  return (
    p?.salesVolume === n?.salesVolume &&
    p?.avgPrice === n?.avgPrice &&
    (p?.priceRange?.min ?? 0) === (n?.priceRange?.min ?? 0) &&
    (p?.priceRange?.max ?? 0) === (n?.priceRange?.max ?? 0)
  );
};

export default memo(KeyMetricsWidgetBase, areEqual);
