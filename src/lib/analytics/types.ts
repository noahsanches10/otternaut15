export type MetricType = 
  | 'total_revenue' 
  | 'recurring_revenue' 
  | 'conversion_rate' 
  | 'new_leads' 
  | 'leads_by_source' 
  | 'new_customers' 
  | 'customers_by_type' 
  | 'customers_by_frequency' 
  | 'customers_lost';

export type DateRange = 
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_12_months'
  | 'all_time'
  | 'custom';