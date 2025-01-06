import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Target } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { fetchMonthlyStats } from '../../../lib/analytics/queries/leaderboard';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../ui/toast';

export function LeaderboardSection() {
  const { session } = useAuth();
  const [stats, setStats] = useState<{
    current: {
      total_revenue: number;
      total_leads: number;
      conversion_rate: number;
    };
    bests: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      loadStats();
    }
  }, [session?.user?.id]);

  async function loadStats() {
    try {
      const data = await fetchMonthlyStats(session!.user.id);
      setStats(data);
    } catch (error) {
      toast.error('Failed to load leaderboard stats');
    } finally {
      setIsLoading(false);
    }
  }

  const achievements = [
    {
      title: "Best Month's Sale Revenue",
      current: stats?.current.total_revenue || 0,
      best: stats?.bests.monthly_revenue || 0,
      icon: Trophy,
      format: (val: number) => `$${val.toLocaleString()}`
    },
    {
      title: "Best Month's New Leads",
      current: stats?.current.total_leads || 0,
      best: stats?.bests.monthly_leads || 0,
      icon: Target,
      format: (val: number) => val.toString()
    },
    {
      title: "Best Month's Conversion Rate",
      current: stats?.current.conversion_rate || 0,
      best: stats?.bests.monthly_conversion || 0,
      icon: Medal,
      format: (val: number) => `${Number(val).toFixed(2)}%`
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {achievements.map((achievement, index) => (
          <div
            key={achievement.title}
            className={cn(
              "bg-card rounded-lg border border-border p-6",
              "transition-all duration-200 hover:shadow-lg"
            )}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <achievement.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-medium text-sm">{achievement.title}</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Current</div>
                <div className="text-2xl font-bold">
                  {achievement.format(achievement.current)}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-1">Personal Best</div>
                <div className="text-2xl font-bold text-primary">
                  {achievement.format(achievement.best)}
                </div>
              </div>

              {achievement.current >= achievement.best && (
                <div className="flex items-center text-sm text-emerald-500">
                  <Trophy className="w-4 h-4 mr-1" />
                  New Record!
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}