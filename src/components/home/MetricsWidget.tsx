import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '../ui/button'; 
import { FollowUpsDialog } from './FollowUpsDialog';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    label: string;
  };
  to?: string;
  alert?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function MetricCard({ label, value, trend, to, alert, action }: MetricCardProps) {
  const Card = to ? Link : 'div';
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;
  
  return (
    <Card
      to={to || ''}
      className={cn(
        "group block bg-card rounded-lg border border-border shadow-sm",
        isMobile ? "p-3" : isTablet ? "p-4" : "p-6",
        "hover:bg-accent hover:border-accent transition-all duration-200",
        alert && "border-destructive/50"
      )}
    >
      <div className="flex flex-col h-full">
        <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </p>
        <p className={cn(
          "font-semibold text-foreground",
          typeof value === 'string' && value.includes('/') 
            ? isMobile ? "text-xs" : isTablet ? "text-sm" : "text-base"
            : isMobile ? "text-lg" : isTablet ? "text-xl" : "text-2xl"
        )}>{value}</p>
        {trend && (
          <p className={cn(
            "text-muted-foreground mt-0.5",
            isMobile ? "text-[9px]" : isTablet ? "text-[10px]" : "text-xs"
          )}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </p>
        )}
        {action && isDesktop && (
          <Button
            size="sm"
            className="w-auto px-4 mx-auto mt-auto h-8 text-sm hidden lg:flex" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              action.onClick();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

interface MetricsWidgetProps {
  metrics: {
    totalLeads: number;
    totalCustomers: number;
    pipelineValue: number;
    overdueFollowUps: number;
    dueTodayFollowUps: number;
    overdueTasks: number;
    dueTodayTasks: number;
  };
}

export function MetricsWidget({ metrics, isMobile, isTablet }: MetricsWidgetProps) {
  const [isFollowUpsDialogOpen, setIsFollowUpsDialogOpen] = useState(false);

  return (
    <>
    <div className={cn(
      "grid gap-2 sm:gap-3 lg:gap-4",
      isMobile ? "grid-cols-2" :
      isTablet ? "grid-cols-3" :
      "grid-cols-5"
    )}>
      <MetricCard
        label="Total Leads"
        value={metrics.totalLeads}
        to="/leads"
        action={!isMobile && !isTablet ? {
          label: 'Add Lead',
          onClick: () => {
            // Navigate to leads page and open modal
            window.location.href = '/leads?action=add';
          }
        } : undefined}
      />
      <MetricCard
        label="Total Customers"
        value={metrics.totalCustomers}
        to="/customers"
        action={!isMobile && !isTablet ? {
          label: 'Add Customer',
          onClick: () => {
            // Navigate to customers page and open modal
            window.location.href = '/customers?action=add';
          }
        } : undefined}
      />
      <MetricCard
        label="Pipeline Value"
        value={`$${metrics.pipelineValue.toLocaleString()}`}
        to="/leads"
      />
      <MetricCard
        label="Follow-Ups Overview"
        value={`${metrics.overdueFollowUps} Overdue / ${metrics.dueTodayFollowUps} Today`}
        to="/leads" 
        action={!isMobile && !isTablet ? {
          label: 'Add Interaction',
          onClick: () => setIsFollowUpsDialogOpen(true)
        } : undefined}
        alert={metrics.overdueFollowUps > 0}
      />
      <MetricCard
        label="Tasks Overview"
        value={`${metrics.overdueTasks} Overdue / ${metrics.dueTodayTasks} Today`}
        to="/tasks" 
        action={!isMobile && !isTablet ? {
          label: 'Add Task',
          onClick: () => {
            // Navigate to tasks page and open modal
            window.location.href = '/tasks?action=add';
          }
        } : undefined}
        alert={metrics.overdueTasks > 0}
      />
    </div>
    <FollowUpsDialog 
      isOpen={isFollowUpsDialogOpen}
      onClose={() => setIsFollowUpsDialogOpen(false)}
    />
    </>
  );
}