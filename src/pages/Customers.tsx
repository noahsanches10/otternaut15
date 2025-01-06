import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Archive, Search, X, Mail, Phone, Building2, Undo, Trash2, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Modal } from '../components/ui/Modal';
import { QuickView } from '../components/customers/QuickView';
import { CustomerForm } from '../components/customers/CustomerForm';
import { ListView } from '../components/customers/ListView';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { toast } from '../components/ui/toast';
import type { Customer } from '../types/supabase';
import type { UserProfile } from '../types/supabase';

export function Customers() {
  const { session } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedCustomerForView, setSelectedCustomerForView] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    frequency: 'all',
    source: 'all',
    status: 'all'
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      `${customer.first_name} ${customer.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (customer.company_name && customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = filters.type === 'all' || customer.service_type === filters.type;
    const matchesFrequency = filters.frequency === 'all' || customer.service_frequency === filters.frequency;
    const matchesSource = filters.source === 'all' || customer.source === filters.source;
    const matchesStatus = filters.status === 'all' || customer.status === filters.status;

    return matchesSearch && matchesType && matchesFrequency && matchesSource && matchesStatus;
  });

  const resetFilters = () => {
    setFilters({
      type: 'all',
      frequency: 'all',
      source: 'all',
      status: 'all'
    });
    setSearchTerm('');
  };

  useEffect(() => {
    Promise.all([fetchCustomers(), fetchProfile()]);
  }, [activeTab]);
  
  // Check URL parameters for actions
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'add') {
      setSelectedCustomer(null);
      setIsModalOpen(true);
      // Clean up URL
      window.history.replaceState({}, '', '/customers');
    }
  }, []);

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

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('archived', activeTab === 'archived')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data);
    } catch (error) {
      toast.error('Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  }

  const handleArchiveCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to archive this customer?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ archived: true, archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer archived successfully');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to archive customer');
    }
  };

  const handleRestoreCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ archived: false, archived_at: null })
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer restored successfully');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to restore customer');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this customer? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer permanently deleted');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  };

  async function handleSubmit(customerData: Partial<Customer>) {
    try {
      if (selectedCustomer) {
        const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', selectedCustomer.id);

        if (error) throw error;
        toast.success('Customer updated successfully');
      } else {
        const { data, error } = await supabase
          .from('customers')
          .insert([{ 
            ...customerData, 
            user_id: session?.user.id,
            status: 'active'
          }]);

        if (error) throw error;
        toast.success('Customer created successfully');
      }

      setIsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      console.error('Supabase error:', error);
      toast.error(error.message || 'Failed to save customer');
      throw error; // Re-throw to handle in the form
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      toast.error('Failed to delete customer');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4 lg:space-y-0 lg:flex-row lg:items-center lg:justify-between -mt-2">
        {/* Desktop View */}
        <div className="hidden lg:flex lg:items-center lg:space-x-2">
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {[...(profile?.service_types || []), ...(profile?.custom_service_types || [])].map(type => (
                <SelectItem key={type} value={type}>
                  {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.frequency} onValueChange={(value) => setFilters(prev => ({ ...prev, frequency: value }))}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Frequencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              {[...(profile?.service_frequencies || []), ...(profile?.custom_service_frequencies || [])].map(frequency => (
                <SelectItem key={frequency} value={frequency}>
                  {frequency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}>
            <SelectTrigger className="h-8 text-xs w-28">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])].map(source => (
                <SelectItem key={source} value={source}>
                  {source.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 px-2">
            <X className="w-4 h-4" />
            <span className="sr-only">Clear filters</span>
          </Button>
        </div>
        <div className="hidden lg:flex items-center space-x-2">
          <div className="border border-border rounded-lg p-0.5">
            <Button
              variant={activeTab === 'archived' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
              className="h-7 px-2"
            >
              <Archive className="w-4 h-4" />
              <span className="sr-only">{activeTab === 'active' ? 'Archived' : 'Active'}</span>
            </Button>
          </div>
          <Button size="sm" className="h-8" onClick={() => {
            setSelectedCustomer(null);
            setIsModalOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-1" />
            Add Customer
          </Button>
        </div>

{/* Tablet View */}
<div className="hidden sm:grid sm:gap-4 lg:hidden w-full">
  {/* Search Bar */}
  <div className="mb-0">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search customers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9 h-8 text-sm w-full"
      />
    </div>
  </div>

  {/* Filters and Buttons Row */}
  <div className="grid grid-cols-[1fr,1fr,1fr,1fr,1fr,2fr] gap-4">
    {/* Status Filter */}
    <Select 
      value={filters.status} 
      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
    >
      <SelectTrigger className="h-8 text-xs w-full">
        <SelectValue placeholder="All Statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Status</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>

    {/* Type Filter */}
    <Select 
      value={filters.type} 
      onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
    >
      <SelectTrigger className="h-8 text-xs w-full">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Type</SelectItem>
        {[...(profile?.service_types || []), ...(profile?.custom_service_types || [])].map(type => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Frequency Filter */}
    <Select 
      value={filters.frequency} 
      onValueChange={(value) => setFilters(prev => ({ ...prev, frequency: value }))}
    >
      <SelectTrigger className="h-8 text-xs w-full">
        <SelectValue placeholder="All Frequencies" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Frequency</SelectItem>
        {[...(profile?.service_frequencies || []), ...(profile?.custom_service_frequencies || [])].map(frequency => (
          <SelectItem key={frequency} value={frequency}>
            {frequency}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Source Filter */}
    <Select 
      value={filters.source} 
      onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
    >
      <SelectTrigger className="h-8 text-xs w-full">
        <SelectValue placeholder="All Sources" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Source</SelectItem>
        {[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])].map(source => (
          <SelectItem key={source} value={source}>
            {source}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Archive Button */}
    <Button
      variant={activeTab === 'archived' ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
      className="h-8 w-full flex items-center justify-center"
    >
      <Archive className="w-4 h-4" />
    </Button>

    {/* Add Customer Button */}
    <Button 
      size="sm" 
      className="h-8 w-full flex items-center justify-center"
      onClick={() => {
        setSelectedCustomer(null);
        setIsModalOpen(true);
      }}
    >
      <Plus className="w-4 h-4 mr-1" />
      Add Customer
    </Button>
  </div>
</div>



 {/* Mobile View */}
<div className="sm:hidden">
  {/* Search Bar */}
  <div className="mb-4">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search customers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9 h-8 text-sm w-full"
      />
    </div>
  </div>

  {/* Buttons Row */}
  <div className="grid grid-cols-[1fr,1fr,2fr] gap-2">
    {/* Filter Button */}
    <Select 
      value={filters.status} 
      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
      className="flex-shrink-0"
    >
      <SelectTrigger className="h-8 text-xs w-full">
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Status</SelectItem>
        <SelectItem value="active">Active</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
      </SelectContent>
    </Select>

    {/* Archive Button */}
    <Button
      variant={activeTab === 'archived' ? 'default' : 'ghost'} 
      size="sm"
      onClick={() => setActiveTab(activeTab === 'active' ? 'archived' : 'active')}
      className="h-8 w-full flex items-center justify-center"
    >
      <Archive className="w-4 h-4" />
    </Button>

    {/* Add Customer Button */}
    <Button 
      size="sm" 
      className="h-8 flex items-center justify-center"
      onClick={() => {
        setSelectedCustomer(null);
        setIsModalOpen(true);
      }}
    >
      <Plus className="w-4 h-4 mr-1" />
      Add Customer
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
          customers={filteredCustomers}
          onViewCustomer={(customer) => setSelectedCustomerForView(customer)}
          onRestoreCustomer={handleRestoreCustomer}
          onPermanentDelete={handlePermanentDelete}
          onEditCustomer={(customer) => {
            setSelectedCustomer(customer);
            setIsModalOpen(true);
          }}
          isArchiveView
        />
      ) : (
        <ListView
          customers={filteredCustomers}
          onViewCustomer={(customer) => setSelectedCustomerForView(customer)}
          onEditCustomer={(customer) => {
            setSelectedCustomer(customer);
            setIsModalOpen(true);
          }}
          onArchiveCustomer={handleArchiveCustomer}
        />
      )}

      <QuickView
        customer={selectedCustomerForView}
        onClose={() => setSelectedCustomerForView(null)}
        onEdit={(customer) => {
          setSelectedCustomer(customer);
          setIsModalOpen(true);
          setSelectedCustomerForView(null);
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
          customer={selectedCustomer}
          sources={[...(profile?.lead_sources || []), ...(profile?.custom_lead_sources || [])]}
          serviceTypes={[...(profile?.service_types || []), ...(profile?.custom_service_types || [])]}
          profile={profile}
        />
      </Modal>
    </div>
  );
}