import React from 'react';
import { Target, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Goal {
  id: string;
  title: string;
  progress: number;
  target: number;
  dueDate: string;
  type: string;
}

interface GoalsWidgetProps {
  goals: Goal[];
}

export function GoalsWidget({ goals }: GoalsWidgetProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Active Goals</h2>
        </div>
      </div>

      <div className="space-y-6">
        {goals.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No active goals
          </p>
        ) : (
          goals.map((goal) => {
            const progress = Math.min(100, Math.round((goal.progress / goal.target) * 100));
            const daysLeft = Math.ceil(
              (new Date(goal.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );

            return (
              <div key={goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{goal.title}</h3>
                    {goal.dueDate && (
                      <div className="flex items-center mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 mr-1" />
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                      </div>
                    )}
                  </div>
                  {goal.target && (
                    <span className="text-sm font-medium">
                      {progress}%
                    </span>
                  )}
                </div>

                {goal.target && (
                  <>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          progress >= 100 ? "bg-emerald-500" :
                          progress >= 75 ? "bg-primary" :
                          progress >= 50 ? "bg-yellow-500" :
                          "bg-destructive"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{goal.progress} / {goal.target}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}