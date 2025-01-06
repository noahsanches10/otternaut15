import { supabase } from '../../supabase';
import { buildDateRangeQuery } from './base';
import type { DateRange } from '../types';

export async function fetchTotalRevenue(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('line_items')
      .eq('user_id', userId);

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    const totalRevenue = data?.reduce((sum, customer) => {
      const lineItems = customer.line_items || [];
      const customerTotal = lineItems.reduce((total, item) => total + (item.price || 0), 0);
      return sum + customerTotal;
    }, 0) || 0;

    return totalRevenue;
  } catch (error) {
    console.error('Error fetching total revenue:', error);
    throw error;
  }
}

export async function fetchRecurringRevenue(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('sale_value, service_frequency')
      .eq('user_id', userId)
      .neq('service_frequency', 'One-Time');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    const totalRecurringRevenue = data?.reduce((sum, customer) => 
      sum + (customer.sale_value || 0), 0) || 0;

    return totalRecurringRevenue;
  } catch (error) {
    console.error('Error fetching recurring revenue:', error);
    throw error;
  }
}

export async function fetchRecurringRevenueHistory(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('created_at, sale_value, service_frequency')
      .eq('user_id', userId)
      .neq('service_frequency', 'One-Time')
      .order('created_at');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    // Group by date and sum values
    const dailyRevenue = data.reduce((acc, customer) => {
      const date = customer.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + (customer.sale_value || 0);
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for chart
    return Object.entries(dailyRevenue).map(([date, value]) => ({
      date,
      value
    }));
  } catch (error) {
    console.error('Error fetching recurring revenue history:', error);
    throw error;
  }
}

export async function fetchRevenueHistory(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('created_at, line_items')
      .eq('user_id', userId)
      .order('created_at');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    // Group by date and sum values
    const dailyRevenue = data.reduce((acc, customer) => {
      const date = customer.created_at.split('T')[0];
      const lineItemsTotal = (customer.line_items || []).reduce(
        (sum, item) => sum + (item.price || 0),
        0
      );
      acc[date] = (acc[date] || 0) + lineItemsTotal;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for chart
    return Object.entries(dailyRevenue).map(([date, value]) => ({
      date,
      value
    }));
  } catch (error) {
    console.error('Error fetching revenue history:', error);
    throw error;
  }
}