import { supabase } from '../../supabase';
import { buildDateRangeQuery } from './base';
import type { DateRange } from '../types';

export async function fetchCustomersByType(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('service_type')
      .eq('user_id', userId);

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    const typeCounts = data.reduce((acc, { service_type }) => {
      acc[service_type] = (acc[service_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(typeCounts).map(([type, count]) => ({
      service_type: type,
      customer_count: count,
      percentage: Number(((count / total) * 100).toFixed(2))
    })).sort((a, b) => b.customer_count - a.customer_count);
  } catch (error) {
    console.error('Error fetching customers by type:', error);
    throw error;
  }
}

export async function fetchCustomersByFrequency(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('service_frequency')
      .eq('user_id', userId);

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    const frequencyCounts = data.reduce((acc, { service_frequency }) => {
      acc[service_frequency] = (acc[service_frequency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(frequencyCounts).reduce((sum, count) => sum + count, 0);

    return Object.entries(frequencyCounts).map(([frequency, count]) => ({
      service_frequency: frequency,
      customer_count: count,
      percentage: Number(((count / total) * 100).toFixed(2))
    })).sort((a, b) => b.customer_count - a.customer_count);
  } catch (error) {
    console.error('Error fetching customers by frequency:', error);
    throw error;
  }
}

export async function fetchCustomersLost(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'inactive');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;
    return data.length;
  } catch (error) {
    console.error('Error fetching lost customers:', error);
    throw error;
  }
}

export async function fetchCustomersHistory(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    // Group by date and count customers
    const dailyCustomers = data.reduce((acc, customer) => {
      const date = customer.created_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for chart
    return Object.entries(dailyCustomers).map(([date, value]) => ({
      date,
      value
    }));
  } catch (error) {
    console.error('Error fetching customers history:', error);
    throw error;
  }
}

export async function fetchCustomersLostHistory(
  userId: string,
  range: DateRange,
  customRange?: { start: string; end: string }
) {
  try {
    let query = supabase
      .from('customers')
      .select('inactive_at')
      .eq('user_id', userId)
      .eq('status', 'inactive')
      .not('inactive_at', 'is', null)
      .order('inactive_at');

    query = buildDateRangeQuery(query, range, customRange);
    const { data, error } = await query;

    if (error) throw error;

    // Group by date and count lost customers
    const dailyLost = data.reduce((acc, customer) => {
      const date = customer.inactive_at.split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format for chart
    return Object.entries(dailyLost).map(([date, value]) => ({
      date,
      value
    }));
  } catch (error) {
    console.error('Error fetching customers lost history:', error);
    throw error;
  }
}