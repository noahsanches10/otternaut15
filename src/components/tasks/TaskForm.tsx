import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Plus, X } from 'lucide-react';
import type { Task } from '../../types/supabase';

interface TaskFormProps {
  onSubmit: (taskData: Partial<Task>) => void;
  onCancel: () => void;
  contactId?: string;
  contactType?: 'lead' | 'customer';
  task?: Task | null;
}

export function TaskForm({ onSubmit, onCancel, contactId, contactType, task }: TaskFormProps) {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    priority: task?.priority || 'medium',
    due_date: task?.due_date,
    notes: task?.notes || '',
    status: task?.status || 'open' as 'open' | 'in_progress' | 'waiting' | 'done'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      id: task?.id,
      contact_id: contactId,
      contact_type: contactType
    });
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-4 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{task ? 'Edit Task' : 'New Task'}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Task Name</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter task name..."
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(value: 'low' | 'medium' | 'high') => 
              setFormData(prev => ({ ...prev, priority: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={formData.due_date || ''}
            onChange={(e) => setFormData(prev => ({ 
              ...prev, 
              due_date: e.target.value || undefined 
            }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={formData.status}
          onValueChange={(value: 'open' | 'in_progress' | 'waiting' | 'done') => 
            setFormData(prev => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Add any additional notes..."
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full">
        <Plus className="w-4 h-4 mr-2" />
          {task ? 'Update Task' : 'Add Task'}
      </Button>
      </form>
    </div>
  );
}