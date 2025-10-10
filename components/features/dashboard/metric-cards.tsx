"use client";

import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  AlertTriangle,
  Target,
  Activity} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn, formatPercent } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  description?: string;
  target?: number;
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  trend, 
  icon, 
  description, 
  target,
  className 
}: MetricCardProps) {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
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
      "relative overflow-hidden transition-all duration-500 hover:shadow-lg hover:scale-[1.02]",
      "bg-gradient-to-br from-card to-card/50",
      isAnimated && "animate-in slide-in-from-bottom-4",
      className
    )}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
      
      <CardHeader className="relative flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2 rounded-lg bg-primary/10",
            "transition-all duration-300 hover:bg-primary/20 hover:scale-110"
          )}>
            {icon}
          </div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
        
      </CardHeader>
      
      <CardContent className="relative">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className={cn(
              "text-2xl font-bold transition-all duration-500",
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
            {getTrendIcon()}
            <span className="font-medium">
              {change > 0 ? '+' : ''}{formatPercent(Number(change.toFixed(2)), 2)}
            </span>
          </div>
        </div>
        
        {target && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression</span>
              <span>{formatPercent(((typeof value === 'number' ? value : parseFloat(value.toString())) / target * 100), 1)}</span>
            </div>
            <Progress 
              value={(typeof value === 'number' ? value : parseFloat(value.toString())) / target * 100} 
              className="h-2"
            />
          </div>
        )}
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
          bg: 'bg-red-50 dark:bg-red-950/30',
          border: 'border-red-200 dark:border-red-800',
          icon: <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />,
          titleColor: 'text-red-900 dark:text-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950/30',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />,
          titleColor: 'text-yellow-900 dark:text-yellow-100'
        };
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-950/30',
          border: 'border-green-200 dark:border-green-800',
          icon: <Target className="w-4 h-4 text-green-600 dark:text-green-400" />,
          titleColor: 'text-green-900 dark:text-green-100'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/30',
          border: 'border-blue-200 dark:border-blue-800',
          icon: <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />,
          titleColor: 'text-blue-900 dark:text-blue-100'
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
        "border-2 border-dashed",
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