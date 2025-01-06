import React, { useState } from 'react';
import { Mail, Phone, Building2, DollarSign, Pencil, Archive, Trash2, Undo, Download, ChevronDown } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { toast } from '../ui/toast';
import { cn, formatValue } from '../../lib/utils';
import type { Customer } from '../../types/supabase';

interface ListViewProps {
  customers: Customer[];
  onEditCustomer: (customer: Customer) => void;
  onViewCustomer?: (customer: Customer) => void;
  onArchiveCustomer?: (id: string) => void;
  onRestoreCustomer?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  isArchiveView?: boolean;
}

function downloadCustomersAsCsv(customers: Customer[]) {
  const headers = [
    'First Name',
    'Last Name',
    'Company',
    'Email',
    'Phone',
    'Service Type',
    'Service Frequency',
    'Sale Value',
    'Status',
    'Notes'
  ];

  const csvContent = [
    headers.join(','),
    ...customers.map(customer => [
      `"${customer.first_name}"`,
      `"${customer.last_name}"`,
      `"${customer.company_name || ''}"`,
      `"${customer.email || ''}"`,
      `"${customer.phone || ''}"`,
      `"${customer.service_type}"`,
      `"${customer.service_frequency}"`,
      customer.sale_value,
      `"${customer.status}"`,
      `"${(customer.notes || '').replace(/"/g, '""')}"` // Escape quotes in notes
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `customers_export_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

async function downloadCustomersAsXlsx(customers: Customer[]) {
  const headers = [
    'First Name',
    'Last Name',
    'Company',
    'Email',
    'Phone',
    'Service Type',
    'Service Frequency',
    'Sale Value',
    'Status',
    'Notes'
  ];

  const wsData = [
    headers,
    ...customers.map(customer => [
      customer.first_name,
      customer.last_name,
      customer.company_name || '',
      customer.email || '',
      customer.phone || '',
      customer.service_type,
      customer.service_frequency,
      customer.sale_value,
      customer.status,
      customer.notes || ''
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Customers');
  XLSX.writeFile(wb, `customers_export_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function ListView({
  customers,
  onEditCustomer,
  onViewCustomer,
  onArchiveCustomer,
  onRestoreCustomer,
  onPermanentDelete,
  isArchiveView
}: ListViewProps) {
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Calculate total pages
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const visibleCustomers = customers.slice(startIndex, startIndex + itemsPerPage);

  const handleBulkArchive = async () => {
    if (!onArchiveCustomer || selectedCustomers.size === 0) return;
    
    if (!confirm(`Are you sure you want to archive ${selectedCustomers.size} customer${selectedCustomers.size > 1 ? 's' : ''}?`)) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({ 
          archived: true, 
          archived_at: new Date().toISOString() 
        })
        .in('id', Array.from(selectedCustomers));

      if (error) throw error;
      
      toast.success(`${selectedCustomers.size} customer${selectedCustomers.size > 1 ? 's' : ''} archived`);
      setSelectedCustomers(new Set());
      
      Array.from(selectedCustomers).forEach(id => onArchiveCustomer(id));
    } catch (error) {
      console.error('Error archiving customers:', error);
      toast.error('Failed to archive customers');
    }
  };

  const handleBulkRestore = async () => {
    if (!onRestoreCustomer || selectedCustomers.size === 0) return;
    
    if (!confirm(`Are you sure you want to restore ${selectedCustomers.size} customer${selectedCustomers.size > 1 ? 's' : ''}?`)) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .update({ 
          archived: false, 
          archived_at: null 
        })
        .in('id', Array.from(selectedCustomers));

      if (error) throw error;
      
      toast.success(`${selectedCustomers.size} customer${selectedCustomers.size > 1 ? 's' : ''} restored`);
      setSelectedCustomers(new Set());
      
      Array.from(selectedCustomers).forEach(id => onRestoreCustomer(id));
    } catch (error) {
      console.error('Error restoring customers:', error);
      toast.error('Failed to restore customers');
    }
  };

  const handleBulkDelete = async () => {
    if (!onPermanentDelete || selectedCustomers.size === 0) return;
    
    if (!confirm(`Are you sure you want to permanently delete ${selectedCustomers.size} customer${selectedCustomers.size > 1 ? 's' : ''}? This action cannot be undone.`)) return;
    
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', Array.from(selectedCustomers));

      if (error) throw error;
      
      toast.success(`${selectedCustomers.size} customer${selectedCustomers.size > 1 ? 's' : ''} deleted permanently`);
      setSelectedCustomers(new Set());
      
      Array.from(selectedCustomers).forEach(id => onPermanentDelete(id));
    } catch (error) {
      console.error('Error deleting customers:', error);
      toast.error('Failed to delete customers');
    }
  };

  const handleBulkDownload = (format: 'csv' | 'xlsx') => {
    const selectedCustomersData = customers.filter(customer => selectedCustomers.has(customer.id));
    if (format === 'csv') {
      downloadCustomersAsCsv(selectedCustomersData);
    } else {
      downloadCustomersAsXlsx(selectedCustomersData);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCustomers(new Set(customers.map(customer => customer.id)));
    } else {
      setSelectedCustomers(new Set());
    }
  };

  const handleSelectCustomer = (e: React.ChangeEvent<HTMLInputElement>, customerId: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedCustomers);
    if (e.target.checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden flex flex-col">
      {selectedCustomers.size > 0 && (
        <div className="flex items-center justify-between p-2 bg-muted border-b border-border">
          <span className="text-sm text-muted-foreground ml-2">
            {selectedCustomers.size} customer{selectedCustomers.size > 1 ? 's' : ''} selected
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
          <tr className="text-[11px]">
            <th className="px-3 py-2 w-[40px]">
              <input
                type="checkbox"
                className={cn(
                  "rounded border-input bg-background text-primary",
                  "focus:ring-2 focus:ring-ring"
                )}
                checked={customers.length > 0 && selectedCustomers.size === customers.length}
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
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[140px]">
              Address
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
              City
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
              Status
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[100px]">
              Type
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[80px]">
              Frequency
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[60px]">
              SV
            </th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider w-[70px]">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {visibleCustomers.map((customer) => (
            <tr
              key={customer.id}
              onClick={() => !isArchiveView && onViewCustomer?.(customer)}
              className={cn(
                "cursor-pointer transition-colors",
                !isArchiveView && "hover:bg-muted/50"
              )}
            >
              <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className={cn(
                    "rounded border-input bg-background text-primary",
                    "focus:ring-2 focus:ring-ring"
                  )}
                  checked={selectedCustomers.has(customer.id)}
                  onChange={(e) => handleSelectCustomer(e, customer.id)}
                />
              </td>
              <td className="sticky left-0 px-3 py-2 cursor-pointer bg-card">
                <div className="text-xs text-card-foreground">
                  {customer.first_name} {customer.last_name}
                </div>
                {customer.company_name && (
                  <div className="text-[11px] text-muted-foreground">{customer.company_name}</div>
                )}
              </td>
              <td className="px-3 py-2 truncate">
                <span className="text-[11px] text-muted-foreground">{customer.email || '-'}</span>
              </td>
              <td className="px-3 py-2 truncate">
                <span className="text-[11px] text-muted-foreground">{customer.phone || '-'}</span>
              </td>
              <td className="px-3 py-2 truncate">
                <span className="text-[11px] text-muted-foreground">{customer.property_street1 || '-'}</span>
              </td>
              <td className="px-3 py-2 truncate">
                <span className="text-[11px] text-muted-foreground">{customer.property_city || '-'}</span>
              </td>
              <td className="px-3 py-2">
                <span className={cn(
                  "px-2 py-0.5 text-[11px] font-medium rounded-full",
                  customer.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  {customer.status?.charAt(0).toUpperCase() + customer.status?.slice(1)}
                </span>
              </td>
              <td className="px-3 py-2 truncate">
                <span className="text-[11px] text-muted-foreground">{customer.service_type}</span>
              </td>
              <td className="px-3 py-2 truncate">
                <span className="text-[11px] text-muted-foreground">{customer.service_frequency}</span>
              </td>
              <td className="px-3 py-2">
                <div className="text-[11px] text-card-foreground flex items-center">
                  <DollarSign className="w-4 h-4 text-muted-foreground mr-1" />
                  {formatValue(customer.sale_value)}
                </div>
              </td>
              <td className="px-3 py-2">
                {isArchiveView ? (
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreCustomer?.(customer.id);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Undo className="w-4 h-4" />
                      <span className="sr-only">Restore</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPermanentDelete?.(customer.id);
                      }}
                      className="h-8 w-8 p-0"
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
                        onEditCustomer(customer);
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveCustomer?.(customer.id);
                      }}
                      className="h-8 w-8 p-0"
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