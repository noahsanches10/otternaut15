import React, { useState, useEffect } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import { formatDate, isOverdue } from '../../lib/utils';
import { addDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import type { Lead } from '../../types/supabase';

interface FollowUpsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FollowUpsDialog({ isOpen, onClose }: FollowUpsDialogProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      fetchLeads();
    }
  }, [isOpen]);

  async function fetchLeads() {
    try {
      const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];

      // Fetch all leads with follow-ups due today or earlier
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('archived', false) 
        .lte('follow_up_date', today) 
        .order('follow_up_date')
        .throwOnError();

      if (error) throw error;

      // Filter leads based on interactions
      const filteredLeads = [];
      for (const lead of (data || [])) {
        const { data: interactions } = await supabase
          .from('lead_interactions')
          .select('created_at')
          .eq('lead_id', lead.id) 
          .gte('created_at', lead.follow_up_date) 
          .limit(1)
          .throwOnError();

        // For leads due today, check if there's an interaction today
        if (lead.follow_up_date === today) {
          const { data: todayInteractions } = await supabase
            .from('lead_interactions')
            .select('created_at')
            .eq('lead_id', lead.id) 
            .gte('created_at', today)
            .lt('created_at', tomorrow)
            .limit(1)
            .throwOnError();

          if (!todayInteractions?.length) {
            filteredLeads.push(lead);
          }
        } else if (!interactions?.length) {
          // For overdue leads, include if no interaction since follow-up date
          filteredLeads.push(lead);
        }
      }

      setLeads(filteredLeads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const overdueLeads = leads.filter(lead => lead.follow_up_date < today);
  const dueTodayLeads = leads.filter(lead => lead.follow_up_date === today);

  const handleSelectLead = (lead: Lead) => {
    // Store the lead in sessionStorage
    sessionStorage.setItem('selectedLead', JSON.stringify(lead));
    // Navigate to leads page
    navigate('/leads');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Follow-Ups Overview</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : leads.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No follow-ups due
            </p>
          ) : (
            <div className="space-y-6">
              {/* Overdue Section */}
              {overdueLeads.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center text-destructive">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Overdue ({overdueLeads.length})
                  </h3>
                  <div className="space-y-2">
                    {overdueLeads.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => handleSelectLead(lead)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border border-destructive/50",
                          "hover:bg-accent transition-colors"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <span className="text-xs text-destructive">
                            Due {new Date(formatDate(lead.follow_up_date)).toLocaleDateString()}
                          </span>
                        </div>
                        {(lead.email || lead.phone) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {[lead.email, lead.phone].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Due Today Section */}
              {dueTodayLeads.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    Due Today ({dueTodayLeads.length})
                  </h3>
                  <div className="space-y-2">
                    {dueTodayLeads.map(lead => (
                      <button
                        key={lead.id}
                        onClick={() => handleSelectLead(lead)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border border-border",
                          "hover:bg-accent transition-colors"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{lead.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Due Today
                          </span>
                        </div>
                        {(lead.email || lead.phone) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {[lead.email, lead.phone].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}