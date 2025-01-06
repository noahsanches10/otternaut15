import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '../../../lib/utils';

interface SourceChartProps {
  data: Array<{
    label: string;
    value: number;
    percentage: number;
  }>;
  className?: string;
  tooltipLabel?: string;
}

export function SourceChart({ 
  data, 
  className,
  tooltipLabel = 'Count'
}: SourceChartProps) {
  // Generate vibrant colors for the bars
  const colors = data.map((_, index) => {
    const colors = [
      'hsl(221, 70%, 55%)', // Muted blue
      'hsl(142, 55%, 45%)', // Muted green
      'hsl(262, 60%, 52%)', // Muted purple
      'hsl(334, 65%, 45%)', // Muted pink
      'hsl(15, 70%, 50%)',  // Muted orange
      'hsl(168, 55%, 40%)', // Muted teal
      'hsl(291, 45%, 45%)', // Muted magenta
      'hsl(43, 70%, 50%)',  // Muted yellow
      'hsl(192, 60%, 45%)', // Muted cyan
      'hsl(var(--primary) / 0.8)' // Muted primary
    ];
    return colors[index % colors.length];
  });

  return (
    <div className={cn("w-full h-[300px]", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="label"
            angle={-45}
            textAnchor="end"
            height={60}
            className="text-xs text-muted-foreground"
          />
          <YAxis
            className="text-xs text-muted-foreground"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
                  <p className="text-sm font-medium">
                    {data.label}
                  </p>
                  <p className="text-sm text-primary mt-1">
                    <span className="text-muted-foreground mr-1">{tooltipLabel}:</span>
                    {data.value}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {data.percentage}% of total
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value">
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}