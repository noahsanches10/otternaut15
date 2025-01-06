export interface Metric {
  id: string;
  created_at: string;
  user_id: string;
  type: string;
  value: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  period_start: string;
}

export interface Badge {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  type: string;
  progress: number;
  target: number;
  achieved_at: string | null;
  icon: string;
}

export interface Goal {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  description: string | null;
  description: string | null;
  target_value: number | null;
  current_value: number;
  metric_type: 'leads' | 'customers' | 'tasks' | 'revenue' | 'other' | null;
  due_date: string | null;
  completed_at: string | null;
  status: 'in_progress' | 'completed' | 'expired';
}

export interface LeadSourceMetric {
  lead_source: string;
  lead_count: number;
  percentage: number;
}

export interface CustomerTypeMetric {
  service_type: string;
  customer_count: number;
  percentage: number;
}

export interface CustomerFrequencyMetric {
  service_frequency: string;
  customer_count: number;
  percentage: number;
}

export interface MetricCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: React.ReactNode;
  description?: string;
  loading?: boolean;
}

export interface BadgeCardProps {
  badge: Badge;
  onRefresh: () => void;
}

export interface GoalCardProps {
  goal: Goal;
  onRefresh: () => void;
  metrics: Metric[];
  onDelete: (id: string) => void;
}