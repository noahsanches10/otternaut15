export * from './types';
export * from './queries/base';
export * from './queries/revenue';
export * from './queries/customers';
export * from './queries/leads';

import { supabase } from '../supabase';
import type { MetricType, DateRange } from './types';
import { fetchTotalRevenue, fetchRecurringRevenue } from './queries/revenue';
import { fetchCustomersByType, fetchCustomersByFrequency, fetchCustomersLost } from './queries/customers';
import { fetchLeadsBySource, fetchConversionRate } from './queries/leads';
import { fetchBasicMetric } from './queries/basic';

export async function fetchMetric(
  type: MetricType,
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    switch (type) {
      case 'conversion_rate':
        return fetchConversionRate(userId, range, customRange);
      case 'total_revenue':
        return fetchTotalRevenue(userId, range, customRange);
      case 'recurring_revenue':
        return fetchRecurringRevenue(userId, range, customRange);
      case 'leads_by_source':
        return fetchLeadsBySource(userId, range, customRange);
      case 'customers_by_type':
        return fetchCustomersByType(userId, range, customRange);
      case 'customers_by_frequency':
        return fetchCustomersByFrequency(userId, range, customRange);
      case 'customers_lost':
        return fetchCustomersLost(userId, range, customRange);
      default:
        return fetchBasicMetric(type === 'new_leads' ? 'leads' : 'customers', userId, range, customRange);
    }
  } catch (error) {
    console.error('Error fetching metric:', error);
    throw error;
  }
}