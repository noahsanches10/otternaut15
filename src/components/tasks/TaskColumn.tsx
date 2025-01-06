import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { MoreVertical, Pencil, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { TaskCard } from './TaskCard';
import { cn } from '../../lib/utils';
import type { Task } from '../../types/supabase';

interface TaskColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TASKS_PER_PAGE = 4;

export function TaskColumn({ id, title, tasks, onEditTask, onDelete }: TaskColumnProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(tasks.length / TASKS_PER_PAGE);
  
  const visibleTasks = tasks.slice(
    currentPage * TASKS_PER_PAGE,
    (currentPage + 1) * TASKS_PER_PAGE
  );

  return (
    <Droppable droppableId={id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "flex flex-col h-full rounded-lg border border-border flex-shrink-0",
            "bg-muted/50 w-[305px]"
          )}
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-medium text-sm">
              {title}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">
                {tasks.length}
              </span>
              {totalPages > 1 && (
                <span className="text-xs text-muted-foreground">
                  ({currentPage + 1}/{totalPages})
                </span>
              )}
            </div>
          </div>

          <div className={cn(
            "flex-1 p-4 overflow-y-auto space-y-3 min-h-[200px]",
            snapshot.isDraggingOver && "bg-accent"
          )}>
            {visibleTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                onDelete={onDelete}
              />
            ))}
            {totalPages > 1 && (
              <div className="flex justify-center space-x-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages - 1}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
            )}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}