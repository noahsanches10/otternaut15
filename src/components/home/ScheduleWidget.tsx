import React, { useState } from 'react';
import { Calendar as CalendarIcon, CheckSquare, ChevronLeft, ChevronRight, Check, LayoutGrid, List } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, isWithinInterval } from 'date-fns';
import { Link } from 'react-router-dom';

interface ScheduleItem {
  id: string;
  type: 'task' | 'followup';
  title: string;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  completed: boolean;
}

interface ScheduleWidgetProps {
  items: ScheduleItem[];
  onDateChange: (date: Date) => void;
}

type ViewMode = 'day' | 'week' | 'month';

export function ScheduleWidget({ items, onDateChange }: ScheduleWidgetProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedViewDate, setSelectedViewDate] = useState<Date | null>(null);

  const handlePrevious = () => {
    let newDate;
    switch (viewMode) {
      case 'day':
        newDate = subDays(selectedDate, 1);
        break;
      case 'week':
        newDate = subWeeks(selectedDate, 1);
        break;
      case 'month':
        newDate = subMonths(selectedDate, 1);
        break;
    }
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  const handleNext = () => {
    let newDate;
    switch (viewMode) {
      case 'day':
        newDate = addDays(selectedDate, 1);
        break;
      case 'week':
        newDate = addWeeks(selectedDate, 1);
        break;
      case 'month':
        newDate = addMonths(selectedDate, 1);
        break;
    }
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  const handleToday = () => {
    const newDate = new Date();
    setSelectedDate(newDate);
    setSelectedViewDate(null);
    onDateChange(newDate);
  };

  const isToday = isSameDay(selectedDate, new Date());

  const getItemsForDate = (date: Date) => {
    return items.filter(item => {
      if (!item.due_date) return false;
      // Add one day to the stored date to match the display date
      const itemDate = addDays(new Date(item.due_date), 1);
      return isSameDay(itemDate, date);
    });
  };

  const renderDayView = () => {
    const dayItems = getItemsForDate(selectedDate);
    
    return (
      <div className="space-y-4">
        {dayItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No follow-ups or tasks scheduled
          </p>
        ) : (
          dayItems.map((item) => (
            <Link
              to={item.type === 'task' ? '/tasks' : '/leads'}
              key={`${item.type}-${item.id}`}
              className={cn(
                "flex items-start space-x-4 p-4 rounded-lg border",
                "hover:bg-accent/50 transition-colors",
                "border-border"
              )}
            >
              <div className="p-2 rounded-lg bg-primary/10">
                {item.type === 'task' ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <CalendarIcon className="w-4 h-4 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      item.completed && "line-through text-muted-foreground"
                    )}>
                      {item.title}
                    </p>
                    {item.completed && (
                      <Check className="w-4 h-4 text-emerald-500 ml-2 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>

              <div className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white",
                item.completed ? "bg-muted text-muted-foreground" :
                item.priority === 'high' ? "bg-destructive" :
                item.priority === 'medium' ? "bg-yellow-500" :
                "bg-emerald-500"
              )}>
                {item.priority === 'medium' ? 'Med' : item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
              </div>
            </Link>
          ))
        )}
      </div>
    );
  };

  const renderWeekView = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });

    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {['M', 'T', 'W', 'Th', 'F', 'Sa', 'S'].map((day) => (
            <div key={day} className="text-xs text-muted-foreground text-center py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayItems = getItemsForDate(day);
            const isSelected = selectedViewDate && isSameDay(day, selectedViewDate);
            const tasks = dayItems.filter(item => item.type === 'task').length;
            const followUps = dayItems.filter(item => item.type === 'followup').length;

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedViewDate(isSelected ? null : day);
                  if (!isSelected) {
                    setSelectedDate(day);
                    onDateChange(day);
                  }
                }}
                className={cn(
                  "p-1 rounded-lg border text-left min-h-[100px]",
                  "hover:bg-accent/50 transition-colors",
                  isSelected && "ring-2 ring-primary",
                  isSameDay(day, new Date()) && "bg-accent/50"
                )}
              >
                {(tasks > 0 || followUps > 0) && (
                  <div className="space-y-1">
                    {tasks > 0 && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <CheckSquare className="w-3 h-3 mr-0.5" />
                        {tasks}
                      </div>
                    )}
                    {followUps > 0 && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <CalendarIcon className="w-3 h-3 mr-0.5" />
                        {followUps}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const firstWeekStart = startOfWeek(start, { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(end, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: firstWeekStart, end: lastWeekEnd });

    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {['M', 'T', 'W', 'Th', 'F', 'Sa', 'S'].map((day) => (
            <div key={day} className="text-xs text-muted-foreground text-center py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayItems = getItemsForDate(day);
            const isSelected = selectedViewDate && isSameDay(day, selectedViewDate);
            const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
            const tasks = dayItems.filter(item => item.type === 'task').length;
            const followUps = dayItems.filter(item => item.type === 'followup').length;

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  setSelectedViewDate(isSelected ? null : day);
                  if (!isSelected) {
                    setSelectedDate(day);
                    onDateChange(day);
                  }
                }}
                className={cn(
                  "p-1 rounded-lg border aspect-square",
                  "hover:bg-accent/50 transition-colors",
                  isSelected && "ring-2 ring-primary",
                  isSameDay(day, new Date()) && "bg-accent/50",
                  !isCurrentMonth && "opacity-40"
                )}
              >
                <div className="text-xs font-medium mb-1">
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {tasks > 0 && (
                    <div className="flex items-center text-[10px] text-muted-foreground">
                      <CheckSquare className="w-2.5 h-2.5 mr-0.5" />
                      {tasks}
                    </div>
                  )}
                  {followUps > 0 && (
                    <div className="flex items-center text-[10px] text-muted-foreground">
                      <CalendarIcon className="w-2.5 h-2.5 mr-0.5" />
                      {followUps}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 mb-6">
        <div className="flex items-center space-x-2 justify-between sm:justify-start w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Schedule</h2>
          </div>
          <div className="flex items-center space-x-1 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              disabled={isToday && !selectedViewDate}
            >
              T
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between sm:space-x-4">
          <div className="border border-border rounded-lg p-0.5 flex">
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="h-7 px-2 flex-1"
            >
              D
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="h-7 px-2 flex-1"
            >
              W
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
              className="h-7 px-2 flex-1"
            >
              M
            </Button>
          </div>
          <div className="hidden sm:flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              disabled={isToday && !selectedViewDate}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        {viewMode === 'day' && format(selectedDate, 'EEEE, MMMM d, yyyy')}
        {viewMode === 'week' && (
          <>
            {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMMM d')} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMMM d, yyyy')}
          </>
        )}
        {viewMode === 'month' && format(selectedDate, 'MMMM yyyy')}
      </div>

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}

      {selectedViewDate && viewMode !== 'day' && (
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">
              {format(selectedViewDate, 'MMMM d, yyyy')}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedViewDate(null)}
            >
              Close
            </Button>
          </div>
          {renderDayView()}
        </div>
      )}
    </div>
  );
}