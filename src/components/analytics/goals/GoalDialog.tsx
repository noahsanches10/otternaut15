import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Textarea } from '../../ui/textarea';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../hooks/useAuth';
import { toast } from '../../ui/toast';
import type { Goal } from '../../../types/analytics';

interface GoalDialogProps {
  goal: Goal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function GoalDialog({ goal, isOpen, onClose, onSave }: GoalDialogProps) {
  const { session } = useAuth();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!session?.user?.id) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const goalData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      target_value: formData.get('target_value') ? Number(formData.get('target_value')) : null,
      metric_type: formData.get('metric_type') as Goal['metric_type'],
      due_date: formData.get('due_date') || null,
      user_id: session.user.id,
      status: 'in_progress' as const
    };

    try {
      if (goal) {
        const { error } = await supabase
          .from('goals')
          .update(goalData)
          .eq('id', goal.id);

        if (error) throw error;
        toast.success('Goal updated successfully');
      } else {
        const { error } = await supabase
          .from('goals')
          .insert([{ ...goalData, current_value: 0 }]);

        if (error) throw error;
        toast.success('Goal created successfully');
      }

      onSave();
      onClose();
    } catch (error) {
      toast.error('Failed to save goal');
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "!fixed !right-0 !left-auto !translate-x-0",
        "!h-screen !max-h-screen !rounded-none",
        "w-full sm:w-[440px] flex flex-col"
      )}>
        <DialogHeader className="pb-4">
          <DialogTitle>{goal ? 'Edit Goal' : 'Create Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1">
          <div className="flex-1 space-y-4 overflow-y-auto px-1">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              name="title"
              defaultValue={goal?.title}
              required
              placeholder="Enter goal title..."
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              name="description"
              defaultValue={goal?.description || ''}
              placeholder="Enter goal description..."
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="space-y-2">
              <Label>Metric Type</Label>
              <Select name="metric_type" defaultValue={goal?.metric_type || ''}>
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="tasks">Tasks</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Value</Label>
            <Input
              name="target_value"
              type="number"
              defaultValue={goal?.target_value || ''}
              min="0"
              placeholder="Enter target..."
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              name="due_date"
              type="date"
              defaultValue={goal?.due_date?.split('T')[0] || ''}
            />
          </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {goal ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}