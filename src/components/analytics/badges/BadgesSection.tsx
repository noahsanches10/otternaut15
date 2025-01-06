import React from 'react';
import { BadgeCard } from './BadgeCard';
import type { Badge } from '../../../types/analytics';

interface BadgesSectionProps {
  badges: Badge[];
  onRefresh: () => void;
}

export function BadgesSection({ badges, onRefresh }: BadgesSectionProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      <h2 className="text-lg font-semibold">Badges</h2>
      {badges.map(badge => (
        <BadgeCard
          key={badge.id}
          badge={badge}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}