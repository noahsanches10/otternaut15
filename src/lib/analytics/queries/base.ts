import { supabase } from '../../supabase';
import type { DateRange } from '../types';

export function buildDateRangeQuery(query: any, range: DateRange, customRange?: { start: string; end: string }) {
  switch (range) {
    case 'today':
      return query
        .gte('created_at', new Date().toISOString().split('T')[0])
        .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    case 'yesterday':
      return query
        .gte('created_at', new Date(Date.now() - 86400000).toISOString().split('T')[0])
        .lt('created_at', new Date().toISOString().split('T')[0]);

    case 'this_week':
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
      return query
        .gte('created_at', thisWeekStart.toISOString().split('T')[0])
        .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    case 'last_week':
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - lastWeekStart.getDay() - 7);
      const lastWeekEnd = new Date();
      lastWeekEnd.setDate(lastWeekEnd.getDate() - lastWeekEnd.getDay());
      return query
        .gte('created_at', lastWeekStart.toISOString().split('T')[0])
        .lt('created_at', lastWeekEnd.toISOString().split('T')[0]);

    case 'last_30_days':
      return query
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    case 'this_month':
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      return query
        .gte('created_at', thisMonthStart.toISOString().split('T')[0])
        .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    case 'last_month':
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      const lastMonthEnd = new Date();
      lastMonthEnd.setDate(1);
      return query
        .gte('created_at', lastMonthStart.toISOString().split('T')[0])
        .lt('created_at', lastMonthEnd.toISOString().split('T')[0]);

    case 'this_year':
      const thisYearStart = new Date();
      thisYearStart.setMonth(0, 1);
      return query
        .gte('created_at', thisYearStart.toISOString().split('T')[0])
        .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    case 'last_12_months':
      return query
        .gte('created_at', new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0])
        .lt('created_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]);

    case 'custom':
      if (customRange?.start && customRange?.end) {
        return query
          .gte('created_at', customRange.start)
          .lt('created_at', new Date(new Date(customRange.end).getTime() + 86400000).toISOString().split('T')[0]);
      }
      return query;

    default:
      return query;
  }
}