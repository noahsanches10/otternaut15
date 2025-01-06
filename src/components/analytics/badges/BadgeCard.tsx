import React from 'react';
import { cn } from '../../../lib/utils';
import { Medal, Trophy, Target, Users, UserCheck, CheckSquare, DollarSign } from 'lucide-react';
import type { BadgeCardProps } from '../../../types/analytics';

const BADGE_ICONS = {
  'leads': Users,
  'customers': UserCheck,
  'tasks': CheckSquare,
  'revenue': DollarSign,
  'achievement': Trophy,
  'milestone': Medal,
  'goal': Target
} as const;

export function BadgeCard({ badge, onRefresh }: BadgeCardProps) {
  const Icon = BADGE_ICONS[badge.icon as keyof typeof BADGE_ICONS] || Trophy;
  const progress = Math.min(100, Math.round((badge.progress / badge.target) * 100));
  const isAchieved = badge.achieved_at !== null;

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border p-6",
      "transition-all duration-200 hover:shadow-lg",
      "relative overflow-hidden"
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-lg",
            isAchieved ? "bg-primary/10" : "bg-muted"
          )}>
            <Icon className={cn(
              "w-5 h-5",
              isAchieved ? "text-primary" : "text-muted-foreground"
            )} />
          </div>
          <div>
            <h3 className="font-medium text-sm">{badge.title}</h3>
            <p className="text-xs text-muted-foreground">{badge.description}</p>
          </div>
        </div>
        {isAchieved && (
          <div className="text-xs text-muted-foreground">
            {new Date(badge.achieved_at!).toLocaleDateString()}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAchieved ? "bg-primary" : "bg-primary/50"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {badge.progress} / {badge.target} {badge.type}
        </div>
      </div>

      {isAchieved && (
        <div className="absolute top-0 right-0 -mt-2 -mr-2">
          <div className="animate-bounce">
            <Medal className="w-8 h-8 text-primary" />
          </div>
        </div>
      )}
    </div>
  );
}