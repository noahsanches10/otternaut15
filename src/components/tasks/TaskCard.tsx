import React from 'react';
import { Calendar, CheckSquare, Trash2 } from 'lucide-react';
import { format, isPast, addDays } from 'date-fns';
import { Draggable } from '@hello-pangea/dnd';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { toast } from '../ui/toast';
import type { Task } from '../../types/supabase';

interface TaskCardProps {
  task: Task;
  index: number;
  onEdit: (task: Task) => void;
  onDelete?: (id: string) => void;
}

interface ContactDetails {
  name: string;
}

export function TaskCard({ task, index, onEdit, onDelete }: TaskCardProps) {
  const [contactName, setContactName] = useState<string | null>(null);

  useEffect(() => {
    if (task.contact_id && task.contact_type) {
      const fetchContactName = async () => {
        try {
          if (task.contact_type === 'lead') {
            const { data } = await supabase
              .from('leads')
              .select('name')
              .eq('id', task.contact_id)
              .single();
            if (data) setContactName(data.name);
          } else {
            const { data } = await supabase
              .from('customers')
              .select('first_name, last_name')
              .eq('id', task.contact_id)
              .single();
            if (data) setContactName(`${data.first_name} ${data.last_name}`);
          }
        } catch (error) {
          console.error('Error fetching contact name:', error);
        }
      };
      fetchContactName();
    }
  }, [task.contact_id, task.contact_type]);

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'done' })
        .eq('id', task.id);

      if (error) throw error;
      toast.success('Task completed');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(task.id);
    }
  };

  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'done';

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "p-3 mb-2 bg-card rounded-lg border border-border",
            "hover:border-ring transition-colors cursor-pointer",
            "relative",
            snapshot.isDragging && "shadow-lg",
            task.status === 'done' && "opacity-60",
            isOverdue && "border-destructive"
          )}
          onClick={() => onEdit(task)}
        >
          <div>
            <h3 className={cn(
              "font-medium text-xs leading-none",
              "pr-8",
              task.status === 'done' && "line-through text-muted-foreground"
            )}>{task.name}</h3>
          </div>
          {task.status !== 'done' && (
            <button
              onClick={handleComplete}
              className="absolute top-3 right-8 p-1 hover:bg-accent rounded-full transition-colors"
              title="Mark as complete"
            >
              <CheckSquare className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          
          {contactName && (
            <div className="mt-2 text-[11px] leading-none text-muted-foreground">
              {contactName}
            </div>
          )}
          
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-medium",
                task.priority === 'high' ? 'bg-destructive text-white' :
                task.priority === 'medium' ? 'bg-yellow-500 text-white' :
                'bg-emerald-500 text-white'
              )}>
                {task.priority === 'medium' ? 'Med' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </span>
              
              {task.due_date && (
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {format(addDays(new Date(task.due_date), 1), 'MMM d')}
                </span>
              )}
            </div>
            <button
              onClick={handleDelete}
              className="absolute top-3 right-2 p-1 hover:bg-accent rounded-full transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
      )}
    </Draggable>
  );
}