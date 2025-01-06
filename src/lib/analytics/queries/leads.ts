import { supabase } from '../../supabase';
import { buildDateRangeQuery } from './base';
import type { DateRange } from '../types';

export async function fetchLeadsBySource(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('leads')
      .select('lead_source')
      .eq('user_id', userId);

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    const sourceCounts = data.reduce((acc, { lead_source }) => {
      acc[lead_source] = (acc[lead_source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(sourceCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(sourceCounts).map(([source, count]) => ({
      lead_source: source,
      lead_count: count,
      percentage: Number(((count / total) * 100).toFixed(2))
    })).sort((a, b) => b.lead_count - a.lead_count);
  } catch (error) {
    console.error('Error fetching leads by source:', error);
    throw error;
  }
}

export async function fetchConversionRate(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let leadsQuery = supabase
      .from('leads')
      .select('created_at', { count: 'exact' })
      .eq('user_id', userId);

    let customersQuery = supabase
      .from('customers')
      .select('created_at', { count: 'exact' })
      .eq('user_id', userId);

    leadsQuery = buildDateRangeQuery(leadsQuery, range, customRange);
    customersQuery = buildDateRangeQuery(customersQuery, range, customRange);

    const [{ count: leadsCount }, { count: customersCount }] = await Promise.all([
      leadsQuery,
      customersQuery
    ]);

    if (!leadsCount) return 0;
    return Number(((customersCount || 0) * 100 / leadsCount).toFixed(1));
  } catch (error) {
    console.error('Error fetching conversion rate:', error);
    throw error;
  }
}

export async function fetchLeadsHistory(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('leads')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    // Group by date and count leads
    const dailyLeads = data.reduce((acc, lead) => {
      const date = lead.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for chart
    return Object.entries(dailyLeads).map(([date, value]) => ({
      date,
      value
    }));
  } catch (error) {
    console.error('Error fetching leads history:', error);
    throw error;
  }
}

export async function fetchConversionRateHistory(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let leadsQuery = supabase
      .from('leads')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at');

    let customersQuery = supabase
      .from('customers')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at');

    leadsQuery = buildDateRangeQuery(leadsQuery, range, customRange);
    customersQuery = buildDateRangeQuery(customersQuery, range, customRange);

    const [{ data: leadsData }, { data: customersData }] = await Promise.all([
      leadsQuery,
      customersQuery
    ]);

    if (!leadsData || !customersData) return [];

    // Group by date
    const dailyData = leadsData.reduce((acc, lead) => {
      const date = lead.created_at.split('T')[0];
      if (!acc[date]) {
        acc[date] = { leads: 0, customers: 0 };
      }
      acc[date].leads++;
      return acc;
    }, {} as Record<string, { leads: number; customers: number }>);

    customersData.forEach(customer => {
      const date = customer.created_at.split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { leads: 0, customers: 0 };
      }
      dailyData[date].customers++;
    });

    // Calculate daily conversion rates
    return Object.entries(dailyData).map(([date, { leads, customers }]) => ({
      date,
      value: leads > 0 ? Number(((customers / leads) * 100).toFixed(1)) : 0
    }));
  } catch (error) {
    console.error('Error fetching conversion rate history:', error);
    throw error;
  }
}