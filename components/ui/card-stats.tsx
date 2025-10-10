"use client";

import type React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface CardStatsProps {
  title: string;
  value: string | number;
  description?: string; // Make description optional
  Icon?: React.ReactNode;
  className?: string;
  change?: string;
  loading?: boolean;
}

export function CardStats({
  title,
  value,
  description,
  Icon,
  className,
  change,
  loading,
}: CardStatsProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
            {change !== undefined && (
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
            )}
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold transition-all duration-500 transform translate-y-0 opacity-100">
              {value}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {change !== undefined && (
              <div
                className={cn(
                  "text-xs mt-2",
                  change.startsWith("+")
                    ? "text-green-500"
                    : change.startsWith("-")
                      ? "text-red-500"
                      : "text-muted-foreground",
                )}
              >
                <span className="font-medium">{change}</span>{" "}
                <span className="text-muted-foreground">vs mois précédent</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
