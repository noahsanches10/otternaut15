import React, { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { MetricReport } from '../components/analytics/metrics/MetricReport';
import { LeaderboardSection } from '../components/analytics/leaderboard/LeaderboardSection';
import { GoalsSection } from '../components/analytics/goals/GoalsSection';
import { BarChart3, Play } from 'lucide-react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/ui/toast';
import type { Metric, Goal } from '../types/analytics';
import type { MetricType } from '../lib/analytics';
import { DATE_RANGES } from '../components/analytics/metrics/MetricReport';

const REPORT_TYPES = {
  'total_revenue': 'Total Revenue',
  'recurring_revenue': 'Total Recurring Revenue',
  'conversion_rate': 'Conversion Rate',
  'new_leads': 'New Leads',
  'leads_by_source': 'Leads by Source',
  'new_customers': 'New Customers',
  'customers_by_type': 'Customers by Type',
  'customers_by_frequency': 'Customers by Frequency',
  'customers_lost': 'Customers Lost'
} as const;

export function Analytics() {
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedReport, setSelectedReport] = useState<MetricType>('total_revenue');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<keyof typeof DATE_RANGES>('last_30_days');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [shouldRunMetric, setShouldRunMetric] = useState(false);
  const [lastRunReport, setLastRunReport] = useState<MetricType | null>(null);

  useEffect(() => {
    Promise.all([
      fetchMetrics(),
      fetchGoals()
    ]).finally(() => setIsLoading(false));
  }, []);

  async function fetchMetrics() {
    try {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMetrics(data);
    } catch (error) {
      toast.error('Failed to fetch metrics');
    }
  }

  async function fetchGoals() {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data);
    } catch (error) {
      toast.error('Failed to fetch goals');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between -mt-2">
        <div className="hidden lg:flex lg:items-center lg:space-x-2">
          <Select 
            value={selectedReport} 
            onValueChange={(value: keyof typeof REPORT_TYPES) => {
              setSelectedReport(value);
              if (value !== lastRunReport?.toString()) {
                setShouldRunMetric(false);
              }
            }}
          >
            <SelectTrigger className="w-[320px]">
              <SelectValue placeholder="Select report" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPORT_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedRange} onValueChange={(value: keyof typeof DATE_RANGES) => setSelectedRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedRange === 'custom' && (
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-[140px]"
              />
            </div>
          )}
          <Button 
            size="sm"
            onClick={() => {
              setLastRunReport(selectedReport);
              setShouldRunMetric(true);
            }}
            disabled={selectedRange === 'custom' && (!customRange.start || !customRange.end)}
          >
            <Play className="w-4 h-4 mr-2" />
            Run Metric
          </Button>
        </div>
        {/* Tablet View */}
        <div className="hidden sm:grid sm:gap-4 lg:hidden w-full">
          <div className="grid grid-cols-2 gap-4">
            <Select 
              value={selectedReport} 
              onValueChange={(value: keyof typeof REPORT_TYPES) => {
                setSelectedReport(value);
                if (value !== lastRunReport?.toString()) {
                  setShouldRunMetric(false);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select report" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRange} onValueChange={(value: keyof typeof DATE_RANGES) => setSelectedRange(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATE_RANGES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full"
              />
              <Input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full"
              />
            </div>
          )}

          <Button 
            onClick={() => {
              setLastRunReport(selectedReport);
              setShouldRunMetric(true);
            }}
            disabled={selectedRange === 'custom' && (!customRange.start || !customRange.end)}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Metric
          </Button>
        </div>

        {/* Mobile View */}
        <div className="sm:hidden grid gap-4 w-full">
          <Select 
            value={selectedReport} 
            onValueChange={(value: keyof typeof REPORT_TYPES) => {
              setSelectedReport(value);
              if (value !== lastRunReport?.toString()) {
                setShouldRunMetric(false);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select report" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REPORT_TYPES).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRange} onValueChange={(value: keyof typeof DATE_RANGES) => setSelectedRange(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedRange === 'custom' && (
            <div className="grid gap-2">
              <Input
                type="date"
                value={customRange.start}
                onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full"
              />
              <Input
                type="date"
                value={customRange.end}
                onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full"
              />
            </div>
          )}

          <Button 
            onClick={() => {
              setLastRunReport(selectedReport);
              setShouldRunMetric(true);
            }}
            disabled={selectedRange === 'custom' && (!customRange.start || !customRange.end)}
            className="w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            Run Metric
          </Button>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-8">
          <MetricReport 
            metrics={metrics} 
            reportType={selectedReport}
            selectedRange={selectedRange}
            customRange={customRange}
            shouldRun={shouldRunMetric}
            onMetricRun={() => setShouldRunMetric(false)}
            onRefresh={fetchMetrics}
          />
          <LeaderboardSection metrics={metrics} />
        </div>
        <div className="space-y-6">
          <GoalsSection goals={goals} onRefresh={fetchGoals} metrics={metrics} />
        </div>
      </div>
    </div>
  );
}