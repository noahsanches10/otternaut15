import React from 'react';
import { Users, UserCheck, CheckSquare, DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricCard } from './MetricCard';
import type { Metric } from '../../../types/analytics';

interface MetricsOverviewProps {
  metrics: Metric[];
  onRefresh: () => void;
}

export function MetricsOverview({ metrics, onRefresh }: MetricsOverviewProps) {
  // Helper function to get the latest metric value
  const getLatestMetric = (type: string) => {
    const typeMetrics = metrics.filter(m => m.type === type);
    return typeMetrics.length > 0 ? typeMetrics[0].value : 0;
  };

  // Helper function to get the previous metric value
  const getPreviousMetric = (type: string) => {
    const typeMetrics = metrics.filter(m => m.type === type);
    return typeMetrics.length > 1 ? typeMetrics[1].value : 0;
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Lead Metrics */}
        <MetricCard
          title="Total Leads"
          value={getLatestMetric('total_leads')}
          previousValue={getPreviousMetric('total_leads')}
          icon={<Users className="w-5 h-5" />}
          description="Active leads in your pipeline"
        />
        <MetricCard
          title="Conversion Rate"
          value={getLatestMetric('conversion_rate')}
          previousValue={getPreviousMetric('conversion_rate')}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Lead to customer conversion rate"
        />
        <MetricCard
          title="Average Lead Score"
          value={getLatestMetric('avg_lead_score')}
          previousValue={getPreviousMetric('avg_lead_score')}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Average quality score of leads"
        />
        <MetricCard
          title="Lead Activity"
          value={getLatestMetric('lead_activity')}
          previousValue={getPreviousMetric('lead_activity')}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Follow-ups completed this month"
        />

        {/* Customer Metrics */}
        <MetricCard
          title="Total Customers"
          value={getLatestMetric('total_customers')}
          previousValue={getPreviousMetric('total_customers')}
          icon={<UserCheck className="w-5 h-5" />}
          description="Active customers"
        />
        <MetricCard
          title="New Customers"
          value={getLatestMetric('new_customers')}
          previousValue={getPreviousMetric('new_customers')}
          icon={<UserCheck className="w-5 h-5" />}
          description="New customers this month"
        />
        <MetricCard
          title="Recurring Customers"
          value={getLatestMetric('recurring_customers')}
          previousValue={getPreviousMetric('recurring_customers')}
          icon={<UserCheck className="w-5 h-5" />}
          description="Customers with recurring services"
        />
        <MetricCard
          title="Churn Rate"
          value={getLatestMetric('churn_rate')}
          previousValue={getPreviousMetric('churn_rate')}
          icon={<TrendingDown className="w-5 h-5" />}
          description="Customer churn rate"
        />

        {/* Task Metrics */}
        <MetricCard
          title="Total Tasks"
          value={getLatestMetric('total_tasks')}
          previousValue={getPreviousMetric('total_tasks')}
          icon={<CheckSquare className="w-5 h-5" />}
          description="Active tasks"
        />
        <MetricCard
          title="Completed Tasks"
          value={getLatestMetric('completed_tasks')}
          previousValue={getPreviousMetric('completed_tasks')}
          icon={<CheckSquare className="w-5 h-5" />}
          description="Tasks completed this month"
        />
        <MetricCard
          title="Overdue Tasks"
          value={getLatestMetric('overdue_tasks')}
          previousValue={getPreviousMetric('overdue_tasks')}
          icon={<CheckSquare className="w-5 h-5" />}
          description="Tasks past due date"
        />
        <MetricCard
          title="Task Completion Rate"
          value={getLatestMetric('task_completion_rate')}
          previousValue={getPreviousMetric('task_completion_rate')}
          icon={<TrendingUp className="w-5 h-5" />}
          description="Task completion rate"
        />

        {/* Revenue Metrics */}
        <MetricCard
          title="Total Revenue"
          value={getLatestMetric('total_revenue')}
          previousValue={getPreviousMetric('total_revenue')}
          icon={<DollarSign className="w-5 h-5" />}
          description="Total revenue this month"
        />
        <MetricCard
          title="Recurring Revenue"
          value={getLatestMetric('recurring_revenue')}
          previousValue={getPreviousMetric('recurring_revenue')}
          icon={<DollarSign className="w-5 h-5" />}
          description="Monthly recurring revenue"
        />
        <MetricCard
          title="Average Contract Value"
          value={getLatestMetric('avg_contract_value')}
          previousValue={getPreviousMetric('avg_contract_value')}
          icon={<DollarSign className="w-5 h-5" />}
          description="Average contract value"
        />
        <MetricCard
          title="Revenue by Service"
          value={getLatestMetric('revenue_by_service')}
          previousValue={getPreviousMetric('revenue_by_service')}
          icon={<DollarSign className="w-5 h-5" />}
          description="Revenue breakdown by service"
        />
      </div>
    </div>
  );
}