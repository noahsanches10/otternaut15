import React from 'react';
import { cn } from '../../../lib/utils';
import confetti from 'canvas-confetti';
import { MoreVertical, CheckCircle, Clock, AlertTriangle, Pencil, BarChart2, Trash, Check } from 'lucide-react';
import { toast } from '../../../components/ui/toast';
import { Button } from '../../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../ui/dropdown-menu';
import { supabase } from '../../../lib/supabase';
import type { GoalCardProps } from '../../../types/analytics';

export function GoalCard({ goal, onRefresh, metrics, onEdit, onDelete }: GoalCardProps) {
  const progress = Math.min(100, Math.round((goal.current_value / (goal.target_value || 1)) * 100));
  const daysLeft = goal.due_date
    ? Math.ceil((new Date(goal.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const triggerConfetti = () => {
    const end = Date.now() + 1000;

    // Launch confetti from both sides
    const colors = ['#22c55e', '#3b82f6', '#6366f1'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
        colors: colors,
        shapes: ['circle', 'square'],
        scalar: 2
      });
      
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
        colors: colors,
        shapes: ['circle', 'square'],
        scalar: 2
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const handleProgressUpdate = async () => {
    const newValue = prompt('Enter progress value:', goal.current_value.toString());
    if (newValue === null) return;
    const numValue = Number(newValue);
    if (isNaN(numValue)) {
      toast.error('Please enter a valid number');
      return;
    }

    // Check if this update will complete the goal
    const willComplete = numValue >= (goal.target_value || 0);
    const wasNotComplete = goal.status !== 'completed';

    try {
      const { error } = await supabase
        .from('goals')
        .update({ 
          current_value: numValue,
          status: numValue >= (goal.target_value || 0) ? 'completed' : 'in_progress',
          completed_at: numValue >= (goal.target_value || 0) ? new Date().toISOString() : null
        })
        .eq('id', goal.id);

      if (error) throw error;
      toast.success('Progress updated');
      
      // Trigger confetti if goal is newly completed
      if (willComplete && wasNotComplete) {
        triggerConfetti();
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress. Please try again.');
    }
  };

  const handleMarkComplete = async () => {
    try {
      const wasNotComplete = goal.status !== 'completed';

      const { error } = await supabase
        .from('goals')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          current_value: goal.target_value || 0
        })
        .eq('id', goal.id);

      if (error) throw error;
      toast.success('Goal marked as complete');
      
      // Trigger confetti since goal was just completed
      if (wasNotComplete) {
        triggerConfetti();
      }
      
      onRefresh();
    } catch (error) {
      console.error('Error marking goal complete:', error);
      toast.error('Failed to mark goal as complete');
    }
  };

  const formatValue = (value: number) => {
    if (goal.metric_type === 'revenue') {
      return `$${value.toLocaleString()}`;
    }
    return value.toString();
  };

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-6",
      "transition-all duration-200 hover:shadow-lg",
      "relative overflow-hidden"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <h3 className="font-medium text-sm">{goal.title}</h3>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {goal.target_value && (
              <DropdownMenuItem onClick={handleProgressUpdate}>
                <BarChart2 className="w-4 h-4 mr-2" />
                Update Progress
              </DropdownMenuItem>
            )}
            {goal.status === 'in_progress' && (
              <DropdownMenuItem onClick={handleMarkComplete}>
                <Check className="w-4 h-4 mr-2" />
                Mark Complete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Goal
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onDelete(goal.id)}
              className="text-destructive focus:text-destructive"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete Goal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="space-y-4">
        {goal.target_value && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  goal.status === 'completed'
                    ? "bg-emerald-500"
                    : goal.status === 'expired'
                    ? "bg-destructive"
                    : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {formatValue(goal.current_value)} / {formatValue(goal.target_value)} {goal.type}
            </div>
          </div>
        )}

        {goal.status === 'completed' ? (
          <div className="flex items-center text-sm text-emerald-500">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed {new Date(goal.completed_at!).toLocaleDateString()}
          </div>
        ) : goal.status === 'expired' ? (
          <div className="flex items-center text-sm text-destructive">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Expired
          </div>
        ) : daysLeft !== null && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="w-4 h-4 mr-1" />
            {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
          </div>
        )}
      </div>
    </div>
  );
}