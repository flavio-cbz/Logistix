"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Target,
  Activity
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPercentage } from "@/lib/shared/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  description?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  trend,
  icon,
  description,
  className
}: MetricCardProps) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3" />;
      case 'down': return <TrendingUp className="w-3 h-3 rotate-180" />;
      default: return null;
    }
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:scale-[1.02] border-border/50",
      "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-md",
      "dark:from-card/50 dark:to-card/20",
      "h-full flex flex-col justify-between", // Added h-full and flex-col
      isAnimated && "animate-in slide-in-from-bottom-4 fade-in duration-700",
      className
    )}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 opacity-0 hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -right-12 -top-12 w-24 h-24 bg-primary/10 blur-3xl rounded-full pointer-events-none" />

      <CardHeader className="relative flex flex-row items-center justify-between pb-2 pt-4 px-4 z-10">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl bg-background/50 shadow-sm ring-1 ring-border/50",
            "transition-all duration-300 group-hover:bg-primary/10 group-hover:scale-110 group-hover:rotate-3"
          )}>
            {icon}
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="relative px-4 pb-4 flex flex-col flex-1 justify-end">
        <div className="flex items-center justify-between mb-auto py-2">
          <div className="space-y-1">
            <div className={cn(
              "text-3xl font-bold transition-all duration-500",
              isAnimated && "animate-in fade-in slide-in-from-left-4"
            )}>
              {value}
            </div>
            {description && (
              <CardDescription className="text-xs">
                {description}
              </CardDescription>
            )}
          </div>

          <div className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
            {change !== 0 && (
              <>
                {getTrendIcon()}
                <span className="font-medium">
                  {change > 0 ? '+' : ''}{formatPercentage(Number(change.toFixed(2)) / 100)}
                </span>
              </>
            )}
            {change === 0 && <span className="text-muted-foreground">-</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface AlertCardProps {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  actionLabel?: string;
  onAction?: () => void;
}

export function AlertCard({ title, message, severity, actionLabel, onAction }: AlertCardProps) {
  const getSeverityStyles = () => {
    switch (severity) {
      case 'error':
        return {
          bg: 'bg-destructive/10',
          border: 'border-destructive/20',
          icon: <AlertTriangle className="w-4 h-4 text-destructive" />,
          titleColor: 'text-destructive'
        };
      case 'warning':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/20',
          icon: <AlertTriangle className="w-4 h-4 text-warning" />,
          titleColor: 'text-warning'
        };
      case 'success':
        return {
          bg: 'bg-success/10',
          border: 'border-success/20',
          icon: <Target className="w-4 h-4 text-success" />,
          titleColor: 'text-success'
        };
      default:
        return {
          bg: 'bg-primary/5',
          border: 'border-primary/20',
          icon: <Activity className="w-4 h-4 text-primary" />,
          titleColor: 'text-primary'
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md",
      styles.bg,
      styles.border
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {styles.icon}
          <CardTitle className={cn("text-sm font-semibold", styles.titleColor)}>
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{message}</p>
        {actionLabel && onAction && (
          <Button size="sm" variant="outline" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

export function QuickAction({
  title,
  description,
  icon,
  onClick,
  badge,
  variant = 'default'
}: QuickActionProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'hover:bg-primary/5 border-primary/20 hover:border-primary/30';
      case 'secondary':
        return 'hover:bg-secondary/5 border-secondary/20 hover:border-secondary/30';
      default:
        return 'hover:bg-accent/50 border-border hover:border-accent-foreground/20';
    }
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-md hover:scale-[1.02]",
        getVariantStyles()
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-all duration-300",
            variant === 'primary' ? "bg-primary/10" :
              variant === 'secondary' ? "bg-secondary/10" : "bg-muted"
          )}>
            {icon}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">{title}</h4>
              {badge && (
                <Badge variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}