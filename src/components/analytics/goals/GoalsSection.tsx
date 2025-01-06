import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from '../../../components/ui/toast';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/button';
import { GoalCard } from './GoalCard';
import { GoalDialog } from './GoalDialog';
import type { Goal, Metric } from '../../../types/analytics';

interface GoalsSectionProps {
  goals: Goal[];
  onRefresh: () => void;
  metrics: Metric[];
}

export function GoalsSection({ goals, onRefresh, metrics }: GoalsSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [isCompletedVisible, setIsCompletedVisible] = useState(false);
  const goalsPerPage = 2;

  const activeGoals = goals.filter(g => g.status === 'in_progress');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const expiredGoals = goals.filter(g => g.status === 'expired');

  const activeTotalPages = Math.ceil(activeGoals.length / goalsPerPage);
  const completedTotalPages = Math.ceil(completedGoals.length / goalsPerPage);
  
  const activeStartIndex = (activePage - 1) * goalsPerPage;
  const completedStartIndex = (completedPage - 1) * goalsPerPage;
  
  const visibleActiveGoals = activeGoals.slice(activeStartIndex, activeStartIndex + goalsPerPage);
  const visibleCompletedGoals = completedGoals.slice(completedStartIndex, completedStartIndex + goalsPerPage);

  const handleDeleteGoal = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Goal deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Goals</h2>
        <Button
          size="sm"
          onClick={() => {
            setSelectedGoal(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>

      <div className="space-y-4">
        {visibleActiveGoals.map(goal => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onRefresh={onRefresh}
            metrics={metrics}
            onDelete={handleDeleteGoal}
            onEdit={() => {
              setSelectedGoal(goal);
              setIsDialogOpen(true);
            }}
          />
        ))}
      </div>
      
      {activeTotalPages > 1 && (
        <div className="flex justify-end space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
            disabled={activePage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActivePage(prev => Math.min(activeTotalPages, prev + 1))}
            disabled={activePage === activeTotalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {completedGoals.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center">
              Completed Goals ({completedGoals.length})
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCompletedVisible(!isCompletedVisible)}
              className="h-7 px-2"
            >
              {isCompletedVisible ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isCompletedVisible && (
            <div className="space-y-4 mt-4">
              {visibleCompletedGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onRefresh={onRefresh}
                  metrics={metrics}
                  onDelete={handleDeleteGoal}
                  onEdit={() => {
                    setSelectedGoal(goal);
                    setIsDialogOpen(true);
                  }}
                />
              ))}
              
              {completedTotalPages > 1 && (
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompletedPage(prev => Math.max(1, prev - 1))}
                    disabled={completedPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompletedPage(prev => Math.min(completedTotalPages, prev + 1))}
                    disabled={completedPage === completedTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {expiredGoals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted-foreground">Expired Goals</h3>
          <div className="space-y-4 mt-4">
            {expiredGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onRefresh={onRefresh}
                metrics={metrics}
                onDelete={handleDeleteGoal}
                onEdit={() => {
                  setSelectedGoal(goal);
                  setIsDialogOpen(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      <GoalDialog
        goal={selectedGoal}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedGoal(null);
        }}
        onSave={onRefresh}
      />
    </div>
  );
}