import React, { useState, useEffect, useCallback } from 'react';
import { MetricsWidget } from '../components/home/MetricsWidget';
import { ScheduleWidget } from '../components/home/ScheduleWidget';
import { GoalsWidget } from '../components/home/GoalsWidget';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/toast';
import { addDays, startOfMonth, endOfMonth } from 'date-fns';

export function Home() {
  const { session } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [metrics, setMetrics] = useState({
    totalLeads: 0,
    totalCustomers: 0,
    pipelineValue: 0,
    overdueFollowUps: 0, 
    dueTodayFollowUps: 0,
    overdueTasks: 0,
    dueTodayTasks: 0
  });
  const [scheduleItems, setScheduleItems] = useState([]);
  const [goals, setGoals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  useEffect(() => {
    if (session?.user?.id) {
      Promise.all([
        fetchMetrics(),
        fetchSchedule(selectedDate),
        fetchGoals(),
        fetchProfile()
      ]).finally(() => setIsLoading(false));
    }
  }, [session?.user?.id, selectedDate]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }

  async function fetchMetrics() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Fetch leads count and pipeline value
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('projected_value')
        .eq('archived', false)
        .throwOnError();

      if (leadsError) throw leadsError;

      // Fetch customers count
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('archived', false)
        .throwOnError();

      if (customersError) throw customersError;

      // Fetch leads with follow-ups
      const { data: followUpLeads, error: followUpError } = await supabase
        .from('leads')
        .select('id, follow_up_date')
        .eq('archived', false) 
        .lt('follow_up_date', today)
        .throwOnError();

      if (followUpError) throw followUpError;

      // Fetch leads due today
      const { data: todayLeads, error: todayError } = await supabase
        .from('leads')
        .select('id, follow_up_date')
        .eq('archived', false) 
        .eq('follow_up_date', today)
        .throwOnError();

      if (todayError) throw todayError;

      let dueTodayCount = 0;
      if (todayLeads?.length) {
        for (const lead of todayLeads) {
          const { data: interactions } = await supabase
            .from('lead_interactions')
            .select('created_at')
            .eq('lead_id', lead.id)
            .gte('created_at', today)
            .lt('created_at', tomorrow)
            .limit(1);

          if (!interactions?.length) {
            dueTodayCount++;
          }
        }
      }

      // Fetch interactions for overdue leads
      let overdueCount = 0;
      if (followUpLeads?.length) {
        for (const lead of followUpLeads) {
          const { data: interactions } = await supabase
            .from('lead_interactions')
            .select('created_at')
            .eq('lead_id', lead.id)
            .gte('created_at', lead.follow_up_date)
            .limit(1);

          if (!interactions?.length) {
            overdueCount++;
          }
        }
      }

      // Fetch overdue tasks
      const { count: overdueTasksCount, error: overdueTasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .lt('due_date', today)
        .neq('status', 'done');

      if (overdueTasksError) throw overdueTasksError;

      // Fetch today's tasks
      const { count: dueTodayTasksCount, error: dueTodayTasksError } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('due_date', today)
        .neq('status', 'done');

      if (dueTodayTasksError) throw dueTodayTasksError;

      setMetrics({
        totalLeads: leads?.length || 0,
        totalCustomers: customersCount || 0,
        pipelineValue: leads?.reduce((sum, lead) => sum + (lead.projected_value || 0), 0) || 0,
        overdueFollowUps: overdueCount || 0,
        dueTodayFollowUps: dueTodayCount || 0,
        overdueTasks: overdueTasksCount || 0,
        dueTodayTasks: dueTodayTasksCount || 0
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast.error('Failed to fetch metrics');
    }
  }

  async function fetchSchedule(date: Date) {
    try {
      // Get start and end dates based on selected date
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      // Fetch today's tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('due_date', startStr)
        .lte('due_date', endStr)
        .order('due_date');

      if (tasksError) throw tasksError;

      // Fetch follow-ups for the date range
      const { data: leads, error: followUpsError } = await supabase
        .from('leads')
        .select('id, name, follow_up_date')
        .gte('follow_up_date', startStr)
        .lte('follow_up_date', endStr)
        .eq('archived', false)
        .order('follow_up_date');

      if (followUpsError) throw followUpsError;

      // For each follow-up, check if there's an interaction on its due date
      const followUpsWithStatus = await Promise.all((leads || []).map(async (lead) => {
        const followUpDate = lead.follow_up_date;
        const nextDay = addDays(new Date(followUpDate), 1).toISOString().split('T')[0];
        
        const { data: interactions } = await supabase
          .from('lead_interactions')
          .select('created_at')
          .eq('lead_id', lead.id)
          .gte('created_at', followUpDate)
          .lt('created_at', nextDay)
          .limit(1);

        return {
          id: lead.id,
          type: 'followup' as const,
          title: `Follow up with ${lead.name}`,
          priority: 'high' as const,
          due_date: lead.follow_up_date,
          completed: Boolean(interactions?.length)
        };
      }));

      const scheduleItems = [
        ...(tasks || []).map(task => ({
          id: task.id,
          type: 'task' as const,
          title: task.name,
          priority: task.priority,
          due_date: task.due_date,
          completed: task.status === 'done'
        })),
        ...followUpsWithStatus
      ];

      setScheduleItems(scheduleItems);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      toast.error('Failed to fetch schedule');
    }
  }

  async function fetchGoals() {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('status', 'in_progress')
        .order('due_date');

      if (error) throw error;

      setGoals(data.map(goal => ({
        id: goal.id,
        title: goal.title,
        progress: goal.current_value,
        target: goal.target_value,
        dueDate: goal.due_date,
        type: goal.metric_type
      })));
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to fetch goals');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      <h1 className={cn(
        "font-bold text-foreground",
        isMobile ? "text-xl" : isTablet ? "text-2xl" : "text-3xl",
        "-mt-2"
      )}>
        Welcome back, {profile?.first_name || 'there'}!
      </h1>

      <MetricsWidget metrics={metrics} isMobile={isMobile} isTablet={isTablet} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ScheduleWidget 
          items={scheduleItems} 
          onDateChange={(date) => setSelectedDate(date)}
          isMobile={isMobile}
          isTablet={isTablet}
        />
        <div className="h-full">
          <GoalsWidget goals={goals} />
        </div>
      </div>
    </div>
  );
}