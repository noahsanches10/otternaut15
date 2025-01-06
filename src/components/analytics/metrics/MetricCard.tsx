import React from 'react';
import { cn } from '../../../lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricCardProps } from '../../../types/analytics';

export function MetricCard({
  title,
  value,
  previousValue,
  icon,
  description,
  loading = false
}: MetricCardProps) {
  const percentageChange = previousValue
    ? ((value - previousValue) / previousValue) * 100
    : 0;

  const formatValue = (val: number) => {
    if (title.toLowerCase().includes('rate')) {
      return `${val}%`;
    }
    if (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('value')) {
      return `$${val.toLocaleString()}`;
    }
    return val.toLocaleString();
  };

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-6",
      "transition-all duration-200 hover:shadow-lg",
      "relative overflow-hidden"
    )}>
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                {icon}
              </div>
              <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
            </div>
            {percentageChange !== 0 && (
              <div className={cn(
                "flex items-center text-xs font-medium rounded-full px-2 py-1",
                percentageChange > 0
                  ? "text-emerald-500 bg-emerald-500/10"
                  : percentageChange < 0
                  ? "text-red-500 bg-red-500/10"
                  : "text-gray-500 bg-gray-500/10"
              )}>
                {percentageChange > 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : percentageChange < 0 ? (
                  <TrendingDown className="w-3 h-3 mr-1" />
                ) : (
                  <Minus className="w-3 h-3 mr-1" />
                )}
                {Math.abs(percentageChange).toFixed(1)}%
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold">
              {formatValue(value)}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="absolute bottom-0 right-0 opacity-5">
            <div className="text-8xl transform translate-x-4 translate-y-4">
              {icon}
            </div>
          </div>
        </>
      )}
    </div>
  );
}