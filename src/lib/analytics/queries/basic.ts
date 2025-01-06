import { supabase } from '../../supabase';
import { buildDateRangeQuery } from './base';
import type { DateRange } from '../types';

export async function fetchBasicMetric(
  table: 'leads' | 'customers',
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    query = buildDateRangeQuery(query, range, customRange);
    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error(`Error fetching ${table} count:`, error);
    throw error;
  }
}