import React, { useState, useEffect } from 'react';
import { Plus, LayoutGrid, List, Archive, Search, Filter, X } from 'lucide-react';
import { CustomerForm } from '../components/customers/CustomerForm';
import { QuickView } from '../components/leads/QuickView';
import { PostConversionDialog } from '../components/leads/PostConversionDialog';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/Modal';
import { KanbanView } from '../components/leads/KanbanView';
import { ListView } from '../components/leads/ListView';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { toast } from '../components/ui/toast';
import type { Lead } from '../types/supabase';
import type { UserProfile } from '../types/supabase';

export function Leads() {
  const { session } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickViewLead, setQuickViewLead] = useState<Lead | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Partial<Customer> | null>(null);
  const [filters, setFilters] = useState({
    source: 'all',
    score: 'all',
    priority: 'all',
    stage: 'all'
  });
  
  // Check for selected lead from sessionStorage
  useEffect(() => {
    const selectedLead = sessionStorage.getItem('selectedLead');
    if (selectedLead) {
      setQuickViewLead(JSON.parse(selectedLead));
      sessionStorage.removeItem('selectedLead');
    }
  }, []);
  
  useEffect(() => {
    Promise.all([fetchLeads(), fetchProfile()]);
  }, [activeTab]);

  // Check URL parameters for actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setSelectedLead(null);
      setIsModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/leads');
    }
  }, []);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSource = filters.source === 'all' || lead.lead_source === filters.source;
    const matchesScore = filters.score === 'all' || 
      (filters.score === 'hot' && lead.total_score >= 8) ||
      (filters.score === 'warm' && lead.total_score >= 5 && lead.total_score < 8) ||
      (filters.score === 'cold' && (!lead.total_score || lead.total_score < 5));
    const matchesPriority = filters.priority === 'all' || lead.priority === filters.priority;
    const matchesStage = filters.stage === 'all' || lead.status === filters.stage;

    return matchesSearch && matchesSource && matchesScore && matchesPriority && matchesStage;
  });

  const resetFilters = () => {
    setFilters({
      source: 'all',
      score: 'all',
      priority: 'all',
      stage: 'all'
    });
    setSearchTerm('');
  };

  const handleArchiveLead = async (id: string) => {
    if (!confirm('Are you sure you want to archive this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead archived successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to archive lead');
    }
  };

  const handleRestoreLead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ archived: false, archived_at: null })
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead restored successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to restore lead');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this lead? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead permanently deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to archive lead');
    }
  };

  const handleConvertToCustomer = async (lead: Lead) => {
    setQuickViewLead(null);
    setIsModalOpen(true);
    const customerData: Partial<Customer> = {
      first_name: lead.name.split(' ')[0] || '',
      last_name: lead.name.split(' ').slice(1).join(' ') || '',
      email: lead.email || '',
      phone: lead.phone || '',
      source: lead.lead_source,
      property_street1: lead.address || '',
      property_city: '',
      property_state: '',
      property_zip: '',
      property_country: 'United States',
      billing_same_as_property: true,
      service_type: '',
      service_frequency: profile?.service_frequencies?.[0] || 'One-Time',
      line_items: [],
      notes: `Converted from lead on ${new Date().toLocaleDateString()}\n\nOriginal Lead Notes:\n${lead.notes || ''}\n\nProjected Value: $${lead.projected_value || 0}`,
      sale_value: lead.projected_value || 0,
    };
    setSelectedCustomer(customerData);
  };

  const priorities: LeadPriority[] = ['low', 'medium', 'high'];

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      toast.error('Failed to fetch profile');
    }
  }

  async function fetchLeads() {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('archived', activeTab === 'archived')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const followUpDate = formData.get('follow_up_date');
    const projectedValue = formData.get('projected_value');
    
    try {
      if (selectedLead) {
        const { error } = await supabase
          .from('leads')
          .update({
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            priority: formData.get('priority') as LeadPriority,
            address: formData.get('address'),
            projected_value: projectedValue ? Number(projectedValue) : null,
            follow_up_date: followUpDate || null,
            lead_source: formData.get('lead_source'),
            service_type: formData.get('service_type') || null,
            status: formData.get('status') as string,
            notes: formData.get('notes'),
          })
          .eq('id', selectedLead.id);

        if (error) throw error;
        toast.success('Lead updated successfully');
      } else {
        const { error } = await supabase
          .from('leads')
          .insert([{
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            priority: formData.get('priority') as LeadPriority,
            address: formData.get('address'),
            projected_value: projectedValue ? Number(projectedValue) : null,
            follow_up_date: followUpDate || null,
            lead_source: formData.get('lead_source'),
            service_type: formData.get('service_type') || null,
            status: formData.get('status') as string,
            notes: formData.get('notes'),
            user_id: session?.user.id,
          }]);

        if (error) throw error;
        toast.success('Lead created successfully');
      }

      setIsModalOpen(false);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to save lead');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  }

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', draggableId);

      if (error) throw error;
      
      // Update local state
      setLeads(prev => prev.map(lead => 
        lead.id === draggableId ? { ...lead, status: newStatus } : lead
      ));

      toast.success('Lead status updated');
    } catch (error) {
      toast.error('Failed to update lead status');
    }
  };

return (
  <div className="space-y-6">
    <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between -mt-2">
      {/* Desktop View */}
      <div className="hidden lg:flex lg:items-center lg:space-x-2">
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <Select value={filters.score} onValueChange={(value) => setFilters((prev) => ({ ...prev, score: value }))}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue placeholder="All Scores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="hot">Hot (≥8)</SelectItem>
            <SelectItem value="warm">Warm (≥5)</SelectItem>
            <SelectItem value="cold">Cold (&lt;5)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.priority} onValueChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {priorities.map((priority) => (
              <SelectItem key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.stage} onValueChange={(value) => setFilters((prev) => ({ ...prev, stage: value }))}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue placeholder="All Stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {[...(profile?.lead_stages || []), ...(profile?.custom_lead_stages || [])].map((stage) => (
              <SelectItem key={stage} value={stage}>
                {stage.charAt(0).toUpperCase() + stage.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.source} onValueChange={(value) => setFilters((prev) => ({ ...prev, source: value }))}>
          <SelectTrigger className="h-8 text-xs w-28">
            <SelectValue placeholder="All Sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])].map((source) => (
              <SelectItem key={source} value={source}>
                {source.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden lg:flex items-center space-x-2">
        <div className="border border-border rounded-lg p-0.5 flex">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-7 px-2"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="h-7 px-2 border-x border-border"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTab === 'archived' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
            className="h-7 px-2"
          >
            <Archive className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" className="h-8" onClick={() => setSelectedLead(null)}>
          <Plus className="w-4 h-4 mr-1" />
          Add Lead
        </Button>
      </div>

      {/* Tablet View */}
      <div className="hidden sm:grid sm:gap-4 lg:hidden w-full">
        <div className="mb-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm w-full"
            />
          </div>
        </div>
        {/* Filters Row */}
        <div className="grid grid-cols-4 gap-4">
          <Select value={filters.score} onValueChange={(value) => setFilters((prev) => ({ ...prev, score: value }))}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="All Scores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scores</SelectItem>
              <SelectItem value="hot">Hot (≥8)</SelectItem>
              <SelectItem value="warm">Warm (≥5)</SelectItem>
              <SelectItem value="cold">Cold (&lt;5)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {priorities.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.stage} onValueChange={(value) => setFilters((prev) => ({ ...prev, stage: value }))}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {[...(profile?.lead_stages || []), ...(profile?.custom_lead_stages || [])].map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage.charAt(0).toUpperCase() + stage.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.source} onValueChange={(value) => setFilters((prev) => ({ ...prev, source: value }))}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])].map((source) => (
                <SelectItem key={source} value={source}>
                  {source.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggles and Add Button */}
        <div className="flex items-center space-x-2 w-full">
          <div className="border border-border rounded-lg p-0.5 flex flex-grow">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2 flex-grow"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-7 px-2 border-x border-border flex-grow"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={activeTab === 'archived' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
              className="h-7 px-2 flex-grow"
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" className="h-8 flex-grow" onClick={() => setSelectedLead(null)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Mobile View */}
      <div className="sm:hidden">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm w-full"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2 w-full">
          <div className="border border-border rounded-lg p-0.5 flex flex-grow">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 px-2 flex-grow"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="h-7 px-2 border-x border-border flex-grow"
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={activeTab === 'archived' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
              className="h-7 px-2 flex-grow"
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
          <Button size="sm" className="h-8 flex-grow" onClick={() => setSelectedLead(null)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Lead
          </Button>
        </div>
      </div>
    </div>

      
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : activeTab === 'archived' ? (
        <ListView
          leads={filteredLeads}
          onViewLead={(lead) => setQuickViewLead(lead)}
          onRestoreLead={handleRestoreLead}
          onPermanentDelete={handlePermanentDelete}
          isArchiveView
        />
      ) : viewMode === 'list' ? (
        <ListView
          leads={filteredLeads}
          onViewLead={(lead) => setQuickViewLead(lead)}
          onEditLead={(lead) => {
            setSelectedLead(lead);
            setIsModalOpen(true);
          }}
          onArchiveLead={handleArchiveLead}
        />
      ) : (
        <KanbanView
          leads={filteredLeads}
          stages={[...(profile?.lead_stages || []), ...(profile?.custom_lead_stages || [])]}
          onViewLead={(lead) => setQuickViewLead(lead)}
          onDragEnd={handleDragEnd}
          onEditLead={(lead) => {
            setSelectedLead(lead);
            setIsModalOpen(true);
          }}
          onArchiveLead={handleArchiveLead}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
          setSelectedLead(null);
        }}
        title={selectedCustomer ? 'Convert to Customer' : selectedLead ? 'Edit Lead' : 'Add Lead'}
      >
        {selectedCustomer ? (
          <CustomerForm
            onSubmit={async (customerData) => {
              try {
                const { error } = await supabase
                  .from('customers')
                  .insert([{ ...customerData, user_id: session?.user.id }]);

                if (error) throw error;
                toast.success('Lead converted to customer successfully');
                setIsModalOpen(false);
                setSelectedCustomer(null);
                
                // Automatically archive the lead after successful conversion
                if (quickViewLead?.id) {
                  const { error: archiveError } = await supabase
                    .from('leads')
                    .update({
                      archived: true,
                      archived_at: new Date().toISOString()
                    })
                    .eq('id', quickViewLead.id);

                  if (archiveError) {
                    console.error('Error archiving lead:', archiveError);
                    toast.error('Lead converted but could not be archived');
                  } else {
                    toast.success('Lead archived');
                    fetchLeads();
                  }
                }
              } catch (error) {
                console.error('Error converting lead:', error);
                toast.error('Failed to convert lead to customer');
              }
            }}
            onCancel={() => {
              setIsModalOpen(false);
              setSelectedCustomer(null);
            }}
            customer={selectedCustomer}
            sources={[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])]}
            serviceTypes={[...(profile?.service_types || []), ...(profile?.custom_service_types || [])]}
            profile={profile}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={selectedLead?.name}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  defaultValue={selectedLead?.email}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={selectedLead?.phone}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  name="priority"
                  defaultValue={selectedLead?.priority || 'medium'}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  name="address"
                  defaultValue={selectedLead?.address}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Lead Source
                </label>
                <select
                  name="lead_source"
                  defaultValue={selectedLead?.lead_source || (profile?.lead_sources?.[0] || '')}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                >
                  {[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])].map(source => (
                    <option key={source} value={source}>
                      {source.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interested Service
                </label>
                <select
                  name="service_type"
                  defaultValue={selectedLead?.service_type || ''}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                >
                  <option value="">Select Service Type</option>
                  {[...(profile?.service_types || []), ...(profile?.custom_service_types || [])].map(type => (
                    <option key={type} value={type}>
                      {type.split('-').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Projected Value
                </label>
                <input
                  type="number"
                  name="projected_value"
                  defaultValue={selectedLead?.projected_value || 0}
                  min="0"
                  step="100"
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Follow-up Date
                </label>
                <input
                  type="date"
                  name="follow_up_date"
                  defaultValue={selectedLead?.follow_up_date}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm focus:ring-2 focus:ring-ring"
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stage
                </label>
                <select
                  name="status"
                  defaultValue={selectedLead?.status || 'new'}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                >
                  {[...(profile?.lead_stages || []), ...(profile?.custom_lead_stages || [])].map(stage => (
                    <option key={stage} value={stage}>
                      {stage.charAt(0).toUpperCase() + stage.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  name="notes"
                  defaultValue={selectedLead?.notes}
                  className={cn(
                    "mt-1 block w-full rounded-md border border-input bg-background",
                    "text-foreground shadow-sm",
                    "focus:ring-2 focus:ring-ring"
                  )}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {selectedLead ? 'Update Lead' : 'Create Lead'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <QuickView
        lead={quickViewLead}
        onClose={() => setQuickViewLead(null)}
        onEditLead={(lead) => {
          setSelectedLead(lead);
          setIsModalOpen(true);
          setQuickViewLead(null);
        }}
        onConvertToCustomer={handleConvertToCustomer} 
      />
    </div>
  );
}
