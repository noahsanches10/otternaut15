import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, DollarSign, MoreVertical, Pencil, Archive, Gauge, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { cn, formatValue, formatDate, isOverdue } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import type { Lead } from '../../types/supabase';
import { useState, useEffect } from 'react';

interface KanbanViewProps {
  leads: Lead[];
  stages: string[];
  onViewLead: (lead: Lead) => void;
  onDragEnd: (result: any) => void;
  onEditLead: (lead: Lead) => void;
  onArchiveLead: (id: string) => void;
}

export function KanbanView({ leads, stages, onViewLead, onDragEnd, onEditLead, onArchiveLead }: KanbanViewProps) {
  const [leadInteractions, setLeadInteractions] = useState<Record<string, boolean>>({});
  const [stagePages, setStagePages] = useState<Record<string, number>>({});
  const INITIAL_LEADS_SHOWN = 4;
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  useEffect(() => {
    const fetchInteractions = async () => {
      for (const lead of leads) {
        if (lead.follow_up_date) {
          // For leads due today, check if there's an interaction today
          if (lead.follow_up_date === today) {
            const { data: todayInteractions } = await supabase
              .from('lead_interactions')
              .select('created_at')
              .eq('lead_id', lead.id)
              .gte('created_at', today)
              .lt('created_at', tomorrow)
              .limit(1);
            
            setLeadInteractions(prev => ({
              ...prev,
              [lead.id]: todayInteractions && todayInteractions.length > 0
            }));
          } else {
            // For overdue leads, check for interactions since follow-up date
            const { data } = await supabase
              .from('lead_interactions')
              .select('created_at')
              .eq('lead_id', lead.id)
              .gte('created_at', lead.follow_up_date)
              .limit(1);
          
            setLeadInteractions(prev => ({
              ...prev,
              [lead.id]: data && data.length > 0
            }));
          }
        }
      }
    };

    fetchInteractions();
  }, [leads]);

  const getLeadsByStage = (stage: string) => {
    return leads.filter(lead => lead.status === stage);
  };

  const getVisibleLeads = (stage: string) => {
    const stageLeads = getLeadsByStage(stage);
    const currentPage = stagePages[stage] || 0;
    return stageLeads.slice(currentPage * INITIAL_LEADS_SHOWN, (currentPage + 1) * INITIAL_LEADS_SHOWN);
  };

  const getTotalPages = (stage: string) => {
    return Math.ceil(getLeadsByStage(stage).length / INITIAL_LEADS_SHOWN);
  };

  const shouldHighlight = (lead: Lead) => {
    if (!lead.follow_up_date) return false;
    return !leadInteractions[lead.id] && (
      lead.follow_up_date < today || // Overdue
      lead.follow_up_date === today  // Due today but no interaction
    );
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-x-auto pb-4">
        {stages.map(stage => (
          <Droppable key={stage} droppableId={stage}>
            {(provided, snapshot) => ( 
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "flex flex-col h-full rounded-lg border border-border flex-shrink-0",
                  "bg-muted/50",
                  snapshot.isDraggingOver && "bg-accent", "w-[220px]"
                )}
              >
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50 sticky top-0 z-10">
                  <h3 className="font-medium text-sm">
                    {stage.charAt(0).toUpperCase() + stage.slice(1)}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">
                      {getLeadsByStage(stage).length}
                    </span>
                    {getTotalPages(stage) > 1 && (
                      <span className="text-xs text-muted-foreground">
                          ({(stagePages[stage] || 0) + 1}/{getTotalPages(stage)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {getVisibleLeads(stage).map((lead, index) => (
                    <Draggable
                      key={lead.id}
                      draggableId={lead.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={cn(
                            "p-2 bg-card rounded-lg border border-border cursor-pointer",
                            "hover:border-ring transition-colors",
                            "relative",
                            snapshot.isDragging && "shadow-lg",
                            shouldHighlight(lead) && "border-destructive"
                          )}
                          onClick={() => onViewLead(lead)}
                        >
                          {/* Row 1: Name and Menu */}
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-xs">
                              {lead.name.length > 30 
                                ? `${lead.name.split(' ')[0]} ${lead.name.split(' ')[1]?.charAt(0) || ''}.`
                                : lead.name}
                            </h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  onEditLead(lead);
                                }}>
                                  <Pencil className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  onArchiveLead(lead.id);
                                }}>
                                  <Archive className="w-4 h-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Row 2: Priority and Value */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn(
                              "px-1.5 py-0.5 text-[10px] font-medium rounded-full",
                              lead.priority === 'high' ? 'bg-destructive text-white' :
                              lead.priority === 'medium' ? 'bg-yellow-500 text-white' :
                              'bg-emerald-500 text-white'
                            )}>
                              {lead.priority === 'medium' ? 'Med' : lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                            </span>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <DollarSign className="w-3 h-3 inline" />
                              <span>{formatValue(lead.projected_value)}</span>
                            </div>
                            <div
                              className="ml-auto"
                              title={`Lead Score: ${lead.total_score || '-'}`}
                            >
                              <Gauge className={cn(
                                "w-4 h-4",
                                lead.total_score >= 8 ? "text-emerald-500" :
                                lead.total_score >= 5 ? "text-yellow-500" :
                                "text-red-500"
                              )} />
                            </div>
                          </div>

                          {/* Row 3: Follow-up Date (if exists) */}
                          {lead.follow_up_date && (
                            <div className="flex items-center text-[10px] text-muted-foreground">
                              <Calendar className="w-3 h-3 mr-1" />
                              <span>{new Date(formatDate(lead.follow_up_date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {getTotalPages(stage) > 1 && (
                    <div className="flex justify-center space-x-2 mt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={(stagePages[stage] || 0) === 0}
                        onClick={() => setStagePages(prev => ({
                          ...prev,
                          [stage]: Math.max(0, (prev[stage] || 0) - 1)
                        }))}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={(stagePages[stage] || 0) === getTotalPages(stage) - 1}
                        onClick={() => setStagePages(prev => ({
                          ...prev,
                          [stage]: Math.min(getTotalPages(stage) - 1, (prev[stage] || 0) + 1)
                        }))}
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
        ))}
      </div>
    </DragDropContext>
  );
}