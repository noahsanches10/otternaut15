import React, { useState, useEffect } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { TaskColumn } from '../components/tasks/TaskColumn';
import { TaskDialog } from '../components/tasks/TaskDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/ui/toast';
import type { Task } from '../types/supabase';

export function Tasks() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Check URL parameters for actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setSelectedTask(null);
      setIsDialogOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/tasks');
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('position');

      if (error) throw error;
      setTasks(data);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  }

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const columns = {
    open: filteredTasks.filter(t => t.status === 'open'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    waiting: filteredTasks.filter(t => t.status === 'waiting'),
    done: filteredTasks.filter(t => t.status === 'done')
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    // Don't do anything if dropped in the same place
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    try {
      const newStatus = destination.droppableId as Task['status'];
      
      // Update task status and position
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          position: destination.index
        })
        .eq('id', draggableId);

      if (error) throw error;

      // Update local state
      setTasks(prev => {
        const updated = prev.map(task => {
          if (task.id === draggableId) {
            return { ...task, status: newStatus };
          }
          return task;
        });

        // Reorder tasks based on new positions
        return updated.sort((a, b) => a.position - b.position);
      });

      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!session?.user?.id) return;

    // Convert undefined contact fields to null for database update
    const dataToSave = {
      ...taskData,
      contact_id: taskData.contact_id || null,
      contact_type: taskData.contact_type || null
    };

    try {
      if (selectedTask) {
        const { error } = await supabase
          .from('tasks')
          .update(dataToSave)
          .eq('id', selectedTask.id);

        if (error) throw error;
        toast.success('Task updated');
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([{
            ...dataToSave,
            user_id: session.user.id,
            position: tasks.length
          }]);

        if (error) throw error;
        toast.success('Task created');
      }

      setIsDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Task deleted');
      setIsDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between -mt-2">
        {/* Desktop View */}
        <div className="hidden lg:flex lg:items-center lg:space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button 
          size="sm" 
          className="hidden lg:flex h-8 whitespace-nowrap" 
          onClick={() => {
            setSelectedTask(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>

        {/* Mobile/Tablet View */}
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          <div className="relative col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Med</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            className="h-8" 
            onClick={() => {
              setSelectedTask(null);
              setIsDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-x-auto pb-4 snap-x snap-mandatory">
          <TaskColumn
            id="open"
            title="Open"
            tasks={columns.open}
            onEditTask={(task) => {
              setSelectedTask(task);
              setIsDialogOpen(true);
            }}
            onDelete={handleDeleteTask}
          />
          <TaskColumn
            id="in_progress"
            title="In Progress"
            tasks={columns.in_progress}
            onEditTask={(task) => {
              setSelectedTask(task);
              setIsDialogOpen(true);
            }}
            onDelete={handleDeleteTask}
          />
          <TaskColumn
            id="waiting"
            title="Waiting"
            tasks={columns.waiting}
            onEditTask={(task) => {
              setSelectedTask(task);
              setIsDialogOpen(true);
            }}
            onDelete={handleDeleteTask}
          />
          <TaskColumn
            id="done"
            title="Done"
            tasks={columns.done}
            onEditTask={(task) => {
              setSelectedTask(task);
              setIsDialogOpen(true);
            }}
            onDelete={handleDeleteTask}
          />
        </div>
      </DragDropContext>

      <TaskDialog
        task={selectedTask}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}