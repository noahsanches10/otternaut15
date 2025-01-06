import React, { useState } from 'react';
import { Mail, Phone, Calendar, DollarSign, Tag, Pencil, Archive, Trash2, Undo, Calculator, Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { toast } from '../ui/toast';
import { cn, formatValue, formatDate } from '../../lib/utils';
import type { Lead } from '../../types/supabase';

interface ListViewProps {
  leads: Lead[];
  onEditLead: (lead: Lead) => void;
  onViewLead?: (lead: Lead) => void;
  onArchiveLead?: (id: string) => void;
  onRestoreLead?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  isArchiveView?: boolean;
  itemsPerPage?: number;
}

function downloadLeadsAsCsv(leads: Lead[]) {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Priority',
    'Status',
    'Lead Source',
    'Service Type',
    'Projected Value',
    'Follow Up Date',
    'Score',
    'Notes'
  ];

  const csvContent = [
    headers.join(','),
    ...leads.map(lead => [
      `"${lead.name}"`,
      `"${lead.email || ''}"`,
      `"${lead.phone || ''}"`,
      `"${lead.priority}"`,
      `"${lead.status}"`,
      `"${lead.lead_source}"`,
      `"${lead.service_type || ''}"`,
      lead.projected_value,
      `"${lead.follow_up_date || ''}"`,
      lead.total_score || '',
      `"${(lead.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `leads_export_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

async function downloadLeadsAsXlsx(leads: Lead[]) {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Priority',
    'Status',
    'Lead Source',
    'Service Type',
    'Projected Value',
    'Follow Up Date',
    'Score',
    'Notes'
  ];

  // Create worksheet data
  const wsData = [
    headers,
    ...leads.map(lead => [
      lead.name,
      lead.email || '',
      lead.phone || '',
      lead.priority,
      lead.status,
      lead.lead_source,
      lead.service_type || '',
      lead.projected_value,
      lead.follow_up_date || '',
      lead.total_score || '',
      lead.notes || ''
    ])
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Write and download file
  XLSX.writeFile(wb, `leads_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function ListView({
  leads,
  onEditLead,
  onViewLead,
  onArchiveLead,
  onRestoreLead,
  onPermanentDelete,
  isArchiveView
}: ListViewProps) {
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calculate dynamic height based on items per page (each row is approximately 41px)
  const tableHeight = `calc(${itemsPerPage * 41}px + 100px)`; // 100px for header and padding

  const totalPages = Math.ceil(leads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleLeads = leads.slice(startIndex, startIndex + itemsPerPage);

  const handleBulkArchive = async () => {
    if (!onArchiveLead || selectedLeads.size === 0) return;
    
    if (!confirm(`Are you sure you want to archive ${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''}?`)) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .in('id', Array.from(selectedLeads));

      if (error) throw error;
      
      toast.success(`${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''} archived`);
      setSelectedLeads(new Set());
      
      // Refresh leads list
      if (onArchiveLead) {
        Array.from(selectedLeads).forEach(id => onArchiveLead(id));
      }
    } catch (error) {
      console.error('Error archiving leads:', error);
      toast.error('Failed to archive leads');
    }
  };

  const handleBulkRestore = async () => {
    if (!onRestoreLead || selectedLeads.size === 0) return;
    
    if (!confirm(`Are you sure you want to restore ${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''}?`)) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          archived: false, 
          archived_at: null 
        })
        .in('id', Array.from(selectedLeads));

      if (error) throw error;
      
      toast.success(`${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''} restored`);
      setSelectedLeads(new Set());
      
      // Refresh leads list
      if (onRestoreLead) {
        Array.from(selectedLeads).forEach(id => onRestoreLead(id));
      }
    } catch (error) {
      console.error('Error restoring leads:', error);
      toast.error('Failed to restore leads');
    }
  };

  const handleBulkDelete = async () => {
    if (!onPermanentDelete || selectedLeads.size === 0) return;
    
    if (!confirm(`Are you sure you want to permanently delete ${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''}? This action cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', Array.from(selectedLeads));

      if (error) throw error;
      
      toast.success(`${selectedLeads.size} lead${selectedLeads.size > 1 ? 's' : ''} deleted permanently`);
      setSelectedLeads(new Set());
      
      // Refresh leads list
      if (onPermanentDelete) {
        Array.from(selectedLeads).forEach(id => onPermanentDelete(id));
      }
    } catch (error) {
      console.error('Error deleting leads:', error);
      toast.error('Failed to delete leads');
    }
  };

  const handleBulkDownload = (format: 'csv' | 'xlsx') => {
    const selectedLeadsData = leads.filter(lead => selectedLeads.has(lead.id));
    if (format === 'csv') {
      downloadLeadsAsCsv(selectedLeadsData);
    } else {
      downloadLeadsAsXlsx(selectedLeadsData);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (e: React.ChangeEvent<HTMLInputElement>, leadId: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedLeads);
    if (e.target.checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  return (
    <div className={cn(
      "bg-card rounded-lg border border-border overflow-hidden flex flex-col",
      `min-h-[${tableHeight}]`
    )}>
      {selectedLeads.size > 0 && (
        <div className="flex items-center justify-between p-2 bg-muted border-b border-border">
          <span className="text-sm text-muted-foreground ml-2">
            {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulkDownload('csv')}>
                  Download as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkDownload('xlsx')}>
                  Download as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isArchiveView ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkRestore}
                  className="h-8"
                >
                  <Undo className="w-4 h-4 mr-2" />
                  Restore
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-8"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Permanently
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkArchive}
                className="h-8"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto flex-1 max-w-full">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted sticky top-0 z-10">
          <tr className="text-[11px] whitespace-nowrap">
            <th className="px-3 py-2 w-[40px]">
              <input
                type="checkbox"
                className={cn(
                  "rounded border-input bg-background text-primary",
                  "focus:ring-2 focus:ring-ring"
                )}
                checked={leads.length > 0 && selectedLeads.size === leads.length}
                onChange={handleSelectAll}
              />
            </th>
            <th className="sticky left-0 px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[140px] bg-muted">
              Name
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
              Email
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[100px]">
              Phone
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[60px]">
              Score
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
              Priority
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
              Stage
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[60px]">
              PV
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[70px]">
              Follow Up
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[70px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visibleLeads.map((lead, index) => (
            <tr className="whitespace-nowrap"
              key={lead.id}
              className={cn(
                "cursor-pointer transition-colors",
                !isArchiveView && "hover:bg-muted/50",
                "h-[41px]" // Fixed height for each row
              )}
            >
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className={cn(
                    "rounded border-input bg-background text-primary",
                    "focus:ring-2 focus:ring-ring"
                  )}
                  checked={selectedLeads.has(lead.id)}
                  onChange={(e) => handleSelectLead(e, lead.id)}
                />
              </td>
              <td className="sticky left-0 px-3 py-2 cursor-pointer bg-card" onClick={() => !isArchiveView && onViewLead?.(lead)}>
                <div className="text-xs font-medium text-card-foreground">
                  {lead.name}
                </div>
              </td>
              <td className="px-3 py-2 cursor-pointer" onClick={() => !isArchiveView && onViewLead?.(lead)}>
                <span className="text-[11px] text-muted-foreground">{lead.email || '-'}</span>
              </td>
              <td className="px-3 py-2 cursor-pointer" onClick={() => !isArchiveView && onViewLead?.(lead)}>
                <span className="text-[11px] text-muted-foreground">{lead.phone || '-'}</span>
              </td>
              <td className="px-3 py-2 cursor-pointer" onClick={() => !isArchiveView && onViewLead?.(lead)}>
                <span className={cn(
                  "text-[11px] font-bold",
                  lead.total_score >= 8 ? "text-emerald-500" :
                  lead.total_score >= 5 ? "text-yellow-500" :
                  "text-red-500"
                )}>
                  {lead.total_score || '-'}
                </span>
              </td>
              <td className="px-3 py-2 cursor-pointer" onClick={() => !isArchiveView && onViewLead?.(lead)}>
                <span className={cn(
                  "px-2 inline-flex text-[11px] leading-4 font-semibold rounded-full",
                  lead.priority === 'high' ? 'bg-destructive text-white' :
                  lead.priority === 'medium' ? 'bg-yellow-500 text-white' :
                  'bg-emerald-500 text-white'
                )}>
                  {lead.priority === 'medium' ? 'Med' : lead.priority.charAt(0).toUpperCase() + lead.priority.slice(1)}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="px-2 inline-flex text-[11px] leading-4 font-semibold rounded-full bg-primary/10 text-primary">
                  {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="text-[11px] text-card-foreground flex items-center">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  {formatValue(lead.projected_value)}
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  {lead.follow_up_date ? new Date(formatDate(lead.follow_up_date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                </span>
              </td>
              <td className="px-3 py-2">
                {isArchiveView ? (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreLead?.(lead.id);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Undo className="w-4 h-4" />
                      <span className="sr-only">Restore</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPermanentDelete?.(lead.id);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="sr-only">Delete Permanently</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditLead(lead);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveLead?.(lead.id);
                      }}
                      className="h-7 w-7 p-0"
                    >
                      <Archive className="w-4 h-4" />
                      <span className="sr-only">Archive</span>
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      
      {/* Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-t border-border mt-auto">
        <div className="flex items-center space-x-2">
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[55px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </Button>
          <div className="flex items-center space-x-1">
            {/* First page */}
            <Button
              variant={currentPage === 1 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCurrentPage(1)}
              className="w-8 h-8 p-0"
            >
              1
            </Button>

            {/* Show ellipsis if there are more than 3 pages and we're not at the start */}
            {totalPages > 3 && currentPage > 2 && (
              <span className="px-2 text-muted-foreground">...</span>
            )}

            {/* Middle page - only show if we're not at the start or end */}
            {totalPages > 2 && currentPage !== 1 && currentPage !== totalPages && (
              <Button
                variant="default"
                size="sm"
                className="w-8 h-8 p-0"
              >
                {currentPage}
              </Button>
            )}

            {/* Show ellipsis if there are more than 3 pages and we're not at the end */}
            {totalPages > 3 && currentPage < totalPages - 1 && (
              <span className="px-2 text-muted-foreground">...</span>
            )}

            {/* Last page - only show if there's more than one page */}
            {totalPages > 1 && (
              <Button
                variant={currentPage === totalPages ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                className="w-8 h-8 p-0"
              >
                {totalPages}
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}