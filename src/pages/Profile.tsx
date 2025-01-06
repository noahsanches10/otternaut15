import React, { useState, useEffect } from 'react';
import { Plus, X, Save, RotateCcw, Building2, Settings2, Calculator } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { DEFAULT_LEAD_SOURCES, DEFAULT_LEAD_STATUSES, DEFAULT_FREQUENCIES, DEFAULT_SERVICE_TYPES } from '../lib/constants';
import { updateProfileDefaults, updateCustomFields, restoreDefaults } from '../lib/profile';
import type { UserProfile, Service } from '../types/supabase';
import { toast } from '../components/ui/toast';

export function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newLeadSource, setNewLeadSource] = useState('');
  const [newLeadStage, setNewLeadStage] = useState('');
  const [newFrequency, setNewFrequency] = useState('');
  const [editedSources, setEditedSources] = useState<string[]>([]);
  const [editedStages, setEditedStages] = useState<string[]>([]);
  const [newServiceType, setNewServiceType] = useState('');
  const [editedServiceTypes, setEditedServiceTypes] = useState<string[]>([]);
  const [editedFrequencies, setEditedFrequencies] = useState<string[]>([]);
  const [businessInfo, setBusinessInfo] = useState({
    role: '',
    industry: '',
    location: profile?.location || '',
    website: '',
    personalLinkedIn: '',
    companyLinkedIn: '',
    targetMarket: '',
    productDescription: '',
    additionalInfo: '',
    currency: ''
  });

  useEffect(() => {
    if (profile) {
      setBusinessInfo({
        role: profile.role || '',
        industry: profile.industry || '',
        location: profile.location || '',
        website: profile.website || '',
        personalLinkedIn: profile.personal_linkedin || '',
        companyLinkedIn: profile.company_linkedin || '',
        targetMarket: profile.target_market || '',
        productDescription: profile.product_description || '',
        additionalInfo: profile.additional_info || '',
        currency: profile.currency || ''
      });
    }
  }, [profile]);

  async function handleSaveBusinessInfo() {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          role: businessInfo.role,
          industry: businessInfo.industry,
          location: businessInfo.location,
          website: businessInfo.website,
          personal_linkedin: businessInfo.personalLinkedIn,
          company_linkedin: businessInfo.companyLinkedIn,
          target_market: businessInfo.targetMarket,
          product_description: businessInfo.productDescription,
          additional_info: businessInfo.additionalInfo
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Business information saved successfully');
      await fetchProfile();
    } catch (error) {
      console.error('Error saving business info:', error);
      toast.error('Failed to save business information');
    }
  }

  const [scoringParams, setScoringParams] = useState<UserProfile['scoring_params']>({
    value: {
      threshold_low: 1000,
      threshold_medium: 5000,
      threshold_high: 10000
    },
    engagement: {
      min_interactions: 1,
      optimal_interactions: 3,
      recency_weight: 7
    },
    timeline: {
      overdue_penalty: 3,
      upcoming_bonus: 2,
      optimal_days_ahead: 7
    },
    qualification: {
      stage_weights: {
        new: 2,
        contacted: 4,
        qualified: 6,
        negotiation: 8,
        won: 10,
        lost: 0
      }
    }
  });

  const handleRestoreDefaults = (type: 'sources' | 'stages' | 'services' | 'frequencies') => {
    if (!profile?.id) return;

    const restore = async () => {
      const { success, error } = await restoreDefaults(profile.id, type);
      if (success) {
        await fetchProfile();
        toast.success('Defaults restored successfully');
      } else {
        toast.error('Failed to restore defaults');
      }
    }
    restore();
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.scoring_params) {
        setScoringParams(profile.scoring_params);
      }
      setEditedSources(profile.lead_sources || [...DEFAULT_LEAD_SOURCES]);
      setEditedStages(profile.lead_stages || [...DEFAULT_LEAD_STATUSES]);
      setEditedServiceTypes(profile.service_types || [...DEFAULT_SERVICE_TYPES]);
      setEditedFrequencies(profile.service_frequencies || DEFAULT_FREQUENCIES.map(f => f.name));
    }
  }, [profile]);

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
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddLeadSource(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newLeadSource.trim()) return;
    
    const { success } = await updateCustomFields(
      profile.id,
      'custom_lead_sources',
      [...profile.custom_lead_sources, newLeadSource.trim()]
    );
    
    if (success) {
      await fetchProfile();
      setNewLeadSource('');
      toast.success('Lead source added');
    } else {
      toast.error('Failed to add lead source');
    }
  }

  async function handleRemoveLeadSource(source: string) {
    if (!profile) return;

    const { success } = await updateCustomFields(
      profile.id,
      'custom_lead_sources',
      profile.custom_lead_sources.filter(s => s !== source)
    );
    
    if (success) {
      await fetchProfile();
      toast.success('Lead source removed');
    } else {
      toast.error('Failed to remove lead source');
    }
  }

  async function handleAddLeadStage(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newLeadStage.trim()) return;
    if (profile.custom_lead_stages?.length >= 7) {
      toast.error('Maximum of 7 lead stages allowed');
      return;
    }

    try {
      const updatedStages = [...(profile.custom_lead_stages || []), newLeadStage.trim()];
      const { error } = await supabase
        .from('user_profiles')
        .update({ custom_lead_stages: updatedStages })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, custom_lead_stages: updatedStages });
      setNewLeadStage('');
      toast.success('Lead stage added');
    } catch (error) {
      toast.error('Failed to add lead stage');
    }
  }

  async function handleRemoveLeadStage(stage: string) {
    if (!profile) return;

    // Remove stage weight when removing a custom stage
    const updatedStageWeights = { ...scoringParams.qualification.stage_weights };
    delete updatedStageWeights[stage];
    
    setScoringParams(prev => ({
      ...prev,
      qualification: {
        ...prev.qualification,
        stage_weights: updatedStageWeights
      }
    }));

    try {
      const updatedStages = (profile.custom_lead_stages || []).filter(s => s !== stage);
      const { error } = await supabase
        .from('user_profiles')
        .update({
          custom_lead_stages: updatedStages,
          scoring_params: {
            ...scoringParams,
            qualification: {
              ...scoringParams.qualification,
              stage_weights: updatedStageWeights
            }
          }
        })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, custom_lead_stages: updatedStages });
      toast.success('Lead stage removed');
    } catch (error) {
      toast.error('Failed to remove lead stage');
    }
  }

  async function handleAddServiceType(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newServiceType.trim()) return;

    try {
      const updatedTypes = [...profile.custom_service_types, newServiceType.trim()];
      const { error } = await supabase
        .from('user_profiles')
        .update({ custom_service_types: updatedTypes })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, custom_service_types: updatedTypes });
      setNewServiceType('');
      toast.success('Service type added');
    } catch (error) {
      toast.error('Failed to add service type');
    }
  }

  async function handleRemoveServiceType(type: string) {
    if (!profile) return;

    try {
      const updatedTypes = profile.custom_service_types.filter(t => t !== type);
      const { error } = await supabase
        .from('user_profiles')
        .update({ custom_service_types: updatedTypes })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, custom_service_types: updatedTypes });
      toast.success('Service type removed');
    } catch (error) {
      toast.error('Failed to remove service type');
    }
  }

  async function handleAddFrequency(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !newFrequency.trim()) return;

    try {
      const updatedFrequencies = [...(profile.custom_service_frequencies || []), newFrequency.trim()];
      const { error } = await supabase
        .from('user_profiles')
        .update({ custom_service_frequencies: updatedFrequencies })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, custom_service_frequencies: updatedFrequencies });
      setNewFrequency('');
      toast.success('Frequency added');
    } catch (error) {
      toast.error('Failed to add frequency');
    }
  }

  async function handleRemoveFrequency(frequency: string) {
    if (!profile) return;

    try {
      const updatedFrequencies = (profile.custom_service_frequencies || []).filter(f => f !== frequency);
      const { error } = await supabase
        .from('user_profiles')
        .update({ custom_service_frequencies: updatedFrequencies })
        .eq('id', profile.id);

      if (error) throw error;
      setProfile({ ...profile, custom_service_frequencies: updatedFrequencies });
      toast.success('Frequency removed');
    } catch (error) {
      toast.error('Failed to remove frequency');
    }
  }

  async function handleUpdateDefaults() {
    if (!profile) return;

    const { success } = await updateProfileDefaults(profile.id, {
      lead_sources: editedSources,
      lead_stages: editedStages,
      service_types: editedServiceTypes,
      service_frequencies: editedFrequencies
    });
    
    if (success) {
      await fetchProfile();
      toast.success('Default values updated');
    } else {
      toast.error('Failed to update defaults');
    }
  }

  async function handleRemoveDefault(type: 'source' | 'stage' | 'service' | 'frequency', value: string) {
    if (!profile) return;

    // Format service types to match database format (Title Case)
    const formatServiceType = (str: string) => {
      return str.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('-');
    };

    let updatedSources = editedSources;
    let updatedStages = editedStages;
    let updatedServiceTypes = editedServiceTypes;
    let updatedFrequencies = editedFrequencies;

    if (type === 'source') {
      updatedSources = editedSources.filter(s => s !== value);
      setEditedSources(updatedSources);
    } else if (type === 'stage') {
      updatedStages = editedStages.filter(s => s !== value);
      setEditedStages(updatedStages);
    } else if (type === 'service') {
      const formattedValue = formatServiceType(value);
      updatedServiceTypes = editedServiceTypes.filter(s => formatServiceType(s) !== formattedValue);
      setEditedServiceTypes(updatedServiceTypes);
    } else if (type === 'frequency') {
      updatedFrequencies = editedFrequencies.filter(s => s !== value);
      setEditedFrequencies(updatedFrequencies);
    }

    const { success } = await updateProfileDefaults(profile.id, {
      lead_sources: updatedSources,
      lead_stages: updatedStages,
      service_types: updatedServiceTypes,
      service_frequencies: updatedFrequencies
    });
    
    if (success) {
      await fetchProfile();
      toast.success('Default values updated');
    } else {
      toast.error('Failed to update defaults');
    }
  }

  function handleEditDefault(type: 'source' | 'stage' | 'service' | 'frequency', oldValue: string, newValue: string) {
    if (!newValue.trim()) return;

    if (type === 'source') {
      setEditedSources(prev => prev.map(s => s === oldValue ? newValue.trim() : s));
    } else if (type === 'stage') {
      setEditedStages(prev => prev.map(s => s === oldValue ? newValue.trim() : s));
    } else if (type === 'service') {
      setEditedServiceTypes(prev => prev.map(s => s === oldValue ? newValue.trim() : s));
    } else if (type === 'frequency') {
      setEditedFrequencies(prev => prev.map(s => s === oldValue ? newValue.trim() : s));
    }
  }

  async function handleUpdateScoringParams() {
    if (!profile) return;

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ scoring_params: scoringParams })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Scoring parameters updated');
    } catch (error) {
      toast.error('Failed to update scoring parameters');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground -mt-2">Profile Settings</h1>
      
      <Tabs defaultValue="business">
        <TabsList className="w-full sm:w-auto justify-start overflow-x-auto">
          <TabsTrigger value="business" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="custom-fields" className="flex items-center">
            <Settings2 className="w-4 h-4 mr-2" />
            Custom Fields
          </TabsTrigger>
          <TabsTrigger value="scoring" className="flex items-center">
            <Calculator className="w-4 h-4 mr-2" />
            Lead Scoring
          </TabsTrigger>
        </TabsList>

        {/* Business Tab */}
        <TabsContent value="business" className="mt-6">
          <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={businessInfo.role}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. Owner, Manager"
                />
              </div>
               <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={businessInfo.location}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. San Francisco, California, United States"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Industry</Label>
                <Input
                  value={businessInfo.industry}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, industry: e.target.value }))}
                  placeholder="e.g. Landscaping, Construction"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Website</Label>
                <Input
                  type="url"
                  value={businessInfo.website}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Personal LinkedIn Profile</Label>
                <Input
                  type="url"
                  value={businessInfo.personalLinkedIn}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, personalLinkedIn: e.target.value }))}
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="space-y-2">
                <Label>Company LinkedIn Profile</Label>
                <Input
                  type="url"
                  value={businessInfo.companyLinkedIn}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, companyLinkedIn: e.target.value }))}
                  placeholder="https://linkedin.com/company/name"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Target Market</Label>
                <Input
                  value={businessInfo.targetMarket}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, targetMarket: e.target.value }))}
                  placeholder="Describe your target market or ideal customer profile"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Product or Service Description</Label>
                <Textarea
                  value={businessInfo.productDescription}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, productDescription: e.target.value }))}
                  placeholder="Describe your main products or services..."
                  className="min-h-[100px] resize-none"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Additional Business Information</Label>
                <Textarea
                  value={businessInfo.additionalInfo}
                  onChange={(e) => setBusinessInfo(prev => ({ ...prev, additionalInfo: e.target.value }))}
                  placeholder="Any additional information about your business..."
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleSaveBusinessInfo}>
              <Save className="w-4 h-4 mr-2" />
              Save Business Information
            </Button>
          </div>
        </TabsContent>

        {/* Custom Fields Tab */}
        <TabsContent value="custom-fields" className="mt-6">
          <div className="space-y-6">
            {/* Lead Sources */}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Lead Sources</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreDefaults('sources')}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Defaults
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Default Sources</Label>
                  <div className="flex flex-wrap gap-2">
                    {editedSources.map(source => (
                      <div
                        key={source}
                        className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <span>{source}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDefault('source', source)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Custom Sources</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile?.custom_lead_sources?.map(source => (
                      <div
                        key={source}
                        className="flex items-center bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        <span>{source}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLeadSource(source)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddLeadSource} className="flex gap-2">
                <Input
                  value={newLeadSource}
                  onChange={(e) => setNewLeadSource(e.target.value)}
                  placeholder="Add new lead source..."
                  className="flex-1"
                />
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </form>
            </div>

            {/* Lead Stages */}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Lead Stages</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreDefaults('stages')}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Defaults
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Default Stages</Label>
                  <div className="flex flex-wrap gap-2">
                    {editedStages.map(stage => (
                      <div
                        key={stage}
                        className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <span>{stage}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDefault('stage', stage)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Custom Stages</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile?.custom_lead_stages?.map(stage => (
                      <div
                        key={stage}
                        className="flex items-center bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        <span>{stage}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLeadStage(stage)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddLeadStage} className="flex gap-2">
                <Input
                  value={newLeadStage}
                  onChange={(e) => setNewLeadStage(e.target.value)}
                  placeholder="Add new lead stage..."
                  className="flex-1"
                />
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </form>
            </div>

            {/* Service Types */}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Service Types</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreDefaults('services')}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Defaults
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Default Service Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {editedServiceTypes.map(type => (
                      <div
                        key={type}
                        className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <span>{type}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDefault('service', type)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Custom Service Types</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile?.custom_service_types?.map(type => (
                      <div
                        key={type}
                        className="flex items-center bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        <span>{type}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServiceType(type)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddServiceType} className="flex gap-2">
                <Input
                  value={newServiceType}
                  onChange={(e) => setNewServiceType(e.target.value)}
                  placeholder="Add new service type..."
                  className="flex-1"
                />
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </form>
            </div>

            {/* Service Frequencies */}
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Service Frequencies</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestoreDefaults('frequencies')}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restore Defaults
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Default Frequencies</Label>
                  <div className="flex flex-wrap gap-2">
                    {editedFrequencies.map(frequency => (
                      <div
                        key={frequency}
                        className="flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <span>{frequency}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDefault('frequency', frequency)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground mb-2">Custom Frequencies</Label>
                  <div className="flex flex-wrap gap-2">
                    {profile?.custom_service_frequencies?.map(frequency => (
                      <div
                        key={frequency}
                        className="flex items-center bg-muted px-3 py-1 rounded-full text-sm"
                      >
                        <span>{frequency}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFrequency(frequency)}
                          className="ml-2 h-4 w-4 p-0 hover:bg-transparent"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddFrequency} className="flex gap-2">
                <Input
                  value={newFrequency}
                  onChange={(e) => setNewFrequency(e.target.value)}
                  placeholder="Add new frequency..."
                  className="flex-1"
                />
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </form>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Tip: If experiencing issues while making edits, try keeping at least one Default Service Type temporarily, make your changes, then remove it if desired.
          </p>
        </TabsContent>

        {/* Lead Scoring Tab */}
        <TabsContent value="scoring" className="mt-6">
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border border-border shadow-sm space-y-6">
              <h3 className="text-lg font-medium">Lead Scoring Parameters</h3>
              
              {/* Value Thresholds */}
              <div className="space-y-4">
                <h4 className="font-medium">Value Thresholds</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Low Threshold ($)</Label>
                    <Input
                      type="number"
                      value={scoringParams.value.threshold_low}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        value: {
                          ...prev.value,
                          threshold_low: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Medium Threshold ($)</Label>
                    <Input
                      type="number"
                      value={scoringParams.value.threshold_medium}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        value: {
                          ...prev.value,
                          threshold_medium: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>High Threshold ($)</Label>
                    <Input
                      type="number"
                      value={scoringParams.value.threshold_high}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        value: {
                          ...prev.value,
                          threshold_high: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Engagement Parameters */}
              <div className="space-y-4">
                <h4 className="font-medium">Engagement Parameters</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Minimum Interactions</Label>
                    <Input
                      type="number"
                      value={scoringParams.engagement.min_interactions}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          min_interactions: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Optimal Interactions</Label>
                    <Input
                      type="number"
                      value={scoringParams.engagement.optimal_interactions}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          optimal_interactions: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Recency Weight (days)</Label>
                    <Input
                      type="number"
                      value={scoringParams.engagement.recency_weight}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        engagement: {
                          ...prev.engagement,
                          recency_weight: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Timeline Parameters */}
              <div className="space-y-4">
                <h4 className="font-medium">Timeline Parameters</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Overdue Penalty (points/day)</Label>
                    <Input
                      type="number"
                      value={scoringParams.timeline.overdue_penalty}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        timeline: {
                          ...prev.timeline,
                          overdue_penalty: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Upcoming Bonus (points/day)</Label>
                    <Input
                      type="number"
                      value={scoringParams.timeline.upcoming_bonus}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        timeline: {
                          ...prev.timeline,
                          upcoming_bonus: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label>Optimal Days Ahead</Label>
                    <Input
                      type="number"
                      value={scoringParams.timeline.optimal_days_ahead}
                      onChange={(e) => setScoringParams(prev => ({
                        ...prev,
                        timeline: {
                          ...prev.timeline,
                          optimal_days_ahead: parseInt(e.target.value)
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Stage Weights */}
              <div className="space-y-4">
                <h4 className="font-medium">Stage Weights</h4>
                <div className="grid grid-cols-3 gap-4">
                  {Object.entries(scoringParams.qualification.stage_weights).map(([stage, weight]) => (
                    <div key={stage}>
                      <Label>{stage.charAt(0).toUpperCase() + stage.slice(1)}</Label>
                      <Input
                        type="number"
                        value={weight}
                        onChange={(e) => setScoringParams(prev => ({
                          ...prev,
                          qualification: {
                            ...prev.qualification,
                            stage_weights: {
                              ...prev.qualification.stage_weights,
                              [stage]: parseInt(e.target.value)
                            }
                          }
                        }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleUpdateScoringParams} className="w-full">
                Save Scoring Parameters
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Tip: If experiencing issues while making edits, try keeping at least one Default Service Type temporarily, make your changes, then remove it if desired.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}