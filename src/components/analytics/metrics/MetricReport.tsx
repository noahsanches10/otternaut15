import React, { useState, useEffect } from 'react';
import { LineChart, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { fetchMetric, type DateRange, type MetricType } from '../../../lib/analytics';
import { fetchRevenueHistory, fetchRecurringRevenueHistory } from '../../../lib/analytics/queries/revenue';
import { fetchLeadsHistory, fetchConversionRateHistory } from '../../../lib/analytics/queries/leads';
import { fetchCustomersHistory, fetchCustomersLostHistory } from '../../../lib/analytics/queries/customers';
import { RevenueChart } from './RevenueChart';
import { SourceChart } from './SourceChart';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../ui/toast';
import type { Metric, LeadSourceMetric, CustomerTypeMetric, CustomerFrequencyMetric } from '../../../types/analytics';

export const DATE_RANGES = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This Week',
  last_week: 'Last Week',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  this_year: 'This Year',
  last_12_months: 'Last 12 Months',
  all_time: 'All Time',
  custom: 'Custom Range'
} as const;

interface MetricReportProps {
  metrics: Metric[];
  reportType: MetricType;
  selectedRange: keyof typeof DATE_RANGES;
  customRange?: { start: string; end: string };
  shouldRun: boolean;
  onMetricRun: () => void;
  onRefresh: () => void;
}

export function MetricReport({ 
  metrics, 
  reportType, 
  selectedRange,
  customRange,
  shouldRun,
  onMetricRun,
  onRefresh 
}: MetricReportProps) {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);
  const [previousCount, setPreviousCount] = useState(0);
  const [chartData, setChartData] = useState<Array<{ date: string; value: number }>>([]);
  const [sourceData, setSourceData] = useState<LeadSourceMetric[] | CustomerTypeMetric[] | CustomerFrequencyMetric[]>([]);

  // Clear data when report type changes
  useEffect(() => {
    if (!shouldRun) {
      setCurrentCount(0);
      setPreviousCount(0);
      setSourceData([]);
    }
  }, [reportType, shouldRun]);

  useEffect(() => {
    if (shouldRun && session?.user?.id) {
      onMetricRun();
      fetchData();
    }
  }, [shouldRun]);

  const percentageChange = previousCount
    ? ((currentCount - previousCount) / previousCount) * 100
    : 0;

  async function fetchData() {
    if (!session?.user?.id) return;
    
    setIsLoading(true);
    setChartData([]);
    setSourceData([]);

    try {
      // Fetch main metric
      const count = await fetchMetric(
        reportType,
        session.user.id,
        selectedRange as DateRange,
        selectedRange === 'custom' ? customRange : undefined
      );

      // Fetch historical data for revenue metrics
      if (reportType === 'total_revenue') {
        const historyData = await fetchRevenueHistory(
          session.user.id,
          selectedRange as DateRange,
          selectedRange === 'custom' ? customRange : undefined
        );
        setChartData(historyData);
      }
      
      if (reportType === 'recurring_revenue') {
        const historyData = await fetchRecurringRevenueHistory(
          session.user.id,
          selectedRange as DateRange,
          selectedRange === 'custom' ? customRange : undefined
        );
        setChartData(historyData);
      }
      
      if (reportType === 'new_leads') {
        const historyData = await fetchLeadsHistory(
          session.user.id,
          selectedRange as DateRange,
          selectedRange === 'custom' ? customRange : undefined
        );
        setChartData(historyData);
      }
      
      if (reportType === 'new_customers') {
        const historyData = await fetchCustomersHistory(
          session.user.id,
          selectedRange as DateRange,
          selectedRange === 'custom' ? customRange : undefined
        );
        setChartData(historyData);
      }
      
      if (reportType === 'conversion_rate') {
        const historyData = await fetchConversionRateHistory(
          session.user.id,
          selectedRange as DateRange,
          selectedRange === 'custom' ? customRange : undefined
        );
        setChartData(historyData);
      }
      
      if (reportType === 'customers_lost') {
        const historyData = await fetchCustomersLostHistory(
          session.user.id,
          selectedRange as DateRange,
          selectedRange === 'custom' ? customRange : undefined
        );
        setChartData(historyData);
      }

      let previousCount = 0;
      if (selectedRange !== 'all_time') {
        const prevCustomRange = getPreviousPeriodRange(selectedRange, customRange);
        previousCount = await fetchMetric(
          reportType,
          session.user.id,
          'custom',
          prevCustomRange
        );
      }

      if (reportType === 'leads_by_source' && Array.isArray(count)) {
        setSourceData(count);
        setCurrentCount(count.reduce((sum, item) => sum + item.lead_count, 0));
        return;
      }

      if (reportType === 'customers_by_type' && Array.isArray(count)) {
        setSourceData(count);
        setCurrentCount(count.reduce((sum, item) => sum + item.customer_count, 0));
        return;
      }

      if (reportType === 'customers_by_frequency' && Array.isArray(count)) {
        setSourceData(count);
        setCurrentCount(count.reduce((sum, item) => sum + item.customer_count, 0));
        return;
      }

      setCurrentCount(count);
      setPreviousCount(previousCount);
    } catch (error) {
      toast.error('Failed to fetch leads data');
    } finally {
      setIsLoading(false);
    }
  }

  function getPreviousPeriodRange(range: string, customRange?: { start: string; end: string }) {
    const now = new Date();
    let start: Date, end: Date;

    switch (range) {
      case 'today':
        start = new Date(now.getTime() - 86400000);
        end = now;
        break;
      case 'this_week':
        start = new Date(now.getTime() - 7 * 86400000);
        end = new Date(now.getTime());
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'custom':
        if (customRange?.start && customRange?.end) {
          const duration = new Date(customRange.end).getTime() - new Date(customRange.start).getTime();
          end = new Date(customRange.start);
          start = new Date(end.getTime() - duration);
        } else {
          start = new Date(now.getTime() - 30 * 86400000);
          end = now;
        }
        break;
      default:
        start = new Date(now.getTime() - 30 * 86400000);
        end = now;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }
  
  return (
    <div className="bg-card rounded-lg border border-border p-6 space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">
            {isLoading ? '...' : reportType === 'conversion_rate' 
              ? `${currentCount}%` 
              : (reportType === 'total_revenue' || reportType === 'recurring_revenue')
              ? `$${currentCount.toLocaleString()}`
              : currentCount.toLocaleString()
            }
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {reportType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {percentageChange !== 0 && (
          <div className={cn(
            "flex items-center text-sm font-medium rounded-full px-2 py-1",
            percentageChange > 0
              ? "text-emerald-500 bg-emerald-500/10"
              : percentageChange < 0
              ? "text-red-500 bg-red-500/10"
              : "text-gray-500 bg-gray-500/10"
          )}>
            {percentageChange > 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : percentageChange < 0 ? (
              <TrendingDown className="w-4 h-4 mr-1" />
            ) : (
              <Minus className="w-4 h-4 mr-1" />
            )}
            {Math.abs(percentageChange).toFixed(1)}%
          </div>
        )}
      </div>
      
      {/* Revenue Chart */}
      {(reportType === 'total_revenue' || reportType === 'recurring_revenue' || 
        reportType === 'new_leads' || reportType === 'new_customers' ||
        reportType === 'conversion_rate' || reportType === 'customers_lost') && chartData.length > 0 && (
        <RevenueChart 
          data={chartData} 
          className="mt-6"
          valuePrefix={reportType.includes('revenue') ? '$' : ''}
          valueSuffix={reportType === 'conversion_rate' ? '%' : ''}
          tooltipLabel={
            reportType === 'new_leads' ? 'New Leads' :
            reportType === 'new_customers' ? 'New Customers' :
            reportType === 'conversion_rate' ? 'Conversion Rate' :
            reportType === 'customers_lost' ? 'Customers Lost' :
            'Revenue'
          }
        />
      )}

      {(reportType === 'leads_by_source' || reportType === 'customers_by_type' || reportType === 'customers_by_frequency') && sourceData.length > 0 && (
        <div className="mt-6">
          <SourceChart 
            data={sourceData.map(item => ({
              label: 'lead_source' in item ? item.lead_source :
                     'service_type' in item ? item.service_type :
                     item.service_frequency,
              value: 'lead_count' in item ? item.lead_count : item.customer_count,
              percentage: item.percentage
            }))}
            tooltipLabel={'lead_source' in sourceData[0] ? 'Leads' : 'Customers'}
          />
        </div>
      )}
    </div>
  );
}