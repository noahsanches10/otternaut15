import { supabase } from '../../supabase';

export async function calculateCurrentMonthStats(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // Get leads count
  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth);

  // Get customers count and revenue
  const { data: customers } = await supabase
    .from('customers')
    .select('sale_value')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth);

  const customerCount = customers?.length || 0;
  const totalRevenue = customers?.reduce((sum, c) => sum + (c.sale_value || 0), 0) || 0;
  const conversionRate = leadsCount ? (customerCount / leadsCount) * 100 : 0;

  return {
    total_revenue: totalRevenue,
    total_leads: leadsCount || 0,
    conversion_rate: Number(conversionRate.toFixed(1))
  };
}

export async function fetchMonthlyStats(userId: string) {
  const defaultStats = {
    current: {
      total_revenue: 0,
      total_leads: 0,
      conversion_rate: 0
    },
    bests: {
      monthly_revenue: 0,
      monthly_leads: 0,
      monthly_conversion: 0
    }
  };

  try {
    const currentStats = await calculateCurrentMonthStats(userId);
    
    const { data: personalBests, error: bestsError } = await supabase
      .from('personal_bests')
      .select('*')
      .eq('user_id', userId);

    if (bestsError) {
      console.error('Error fetching personal bests:', bestsError);
      return defaultStats;
    }

    return {
      current: currentStats,
      bests: personalBests?.reduce((acc, best) => {
        acc[best.metric_type] = best.value;
        return acc;
      }, {
        monthly_revenue: 0,
        monthly_leads: 0,
        monthly_conversion: 0
      } as Record<string, number>)
    };
  } catch (error) {
    console.error('Error fetching leaderboard stats:', error);
    return defaultStats;
  }
}