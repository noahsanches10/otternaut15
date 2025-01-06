import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { cn } from '../../../lib/utils';

interface RevenueChartProps {
  data: Array<{ date: string; value: number }>;
  className?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  tooltipLabel?: string;
}

export function RevenueChart({ 
  data, 
  className,
  valuePrefix = '',
  valueSuffix = '',
  tooltipLabel = 'Value'
}: RevenueChartProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatValue = (value: number) => {
    return `${valuePrefix}${value.toLocaleString()}${valueSuffix}`;
  };

  return (
    <div className={cn("w-full h-[300px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            className="text-xs text-muted-foreground"
          />
          <YAxis
            tickFormatter={formatValue}
            className="text-xs text-muted-foreground"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                  <p className="text-sm font-medium">
                    {formatDate(payload[0].payload.date)}
                  </p>
                  <p className="text-sm text-primary mt-1">
                    <span className="text-muted-foreground mr-1">{tooltipLabel}:</span>
                    {formatValue(payload[0].value as number)}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, className: "fill-primary stroke-background" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}