"use client";

import { useState } from "react";
import { Button, Modal, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabaseClient";

// ============================================================================
// CSV EXPORT COMPONENT
// ============================================================================
// Generic CSV export component that can be reused across different pages
// Handles data fetching, CSV generation, download, and 500-row limit warning
// ============================================================================

interface CSVExportProps<T> {
  /** Function to fetch data for export */
  fetchData: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; totalCount: number }>;
  /** Function to transform data row into CSV row array */
  transformRow: (item: T) => (string | number)[];
  /** CSV column headers */
  headers: string[];
  /** Filename for the exported CSV (without .csv extension) */
  filename?: string;
  /** Maximum rows to export */
  maxRows: number;
  /** Warning message when limit is reached */
  limitWarningMessage?: string;
  /** Button props (optional customization) */
  buttonProps?: {
    icon?: React.ReactNode;
    children?: React.ReactNode;
    [key: string]: any;
  };
  /** Disable the export button */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
  /** User ID for logging export request */
  userId?: string;
  /** Customer ID for logging export request */
  customerId?: string;
  /** Table name for logging (e.g., "transfers", "hs-athletes") */
  tableName?: string;
  /** Filter details to log in the request table */
  filterDetails?: any;
  /** Email column name for high school exports (to inject coded email) */
  emailColumnName?: string;
}

/**
 * Generic CSV Export Component
 * 
 * @example
 * ```tsx
 * <CSVExport
 *   fetchData={async (page, pageSize) => {
 *     return await fetchMyData(page, pageSize);
 *   }}
 *   transformRow={(item) => [
 *     item.name,
 *     item.email,
 *     item.phone
 *   ]}
 *   headers={['Name', 'Email', 'Phone']}
 *   filename="contacts"
 *   maxRows={500}
 * />
 * ```
 */
export default function CSVExport<T>({
  fetchData,
  transformRow,
  headers,
  filename = "export",
  maxRows,
  limitWarningMessage,
  buttonProps = {},
  disabled = false,
  loading = false,
  userId,
  customerId,
  tableName,
  filterDetails,
  emailColumnName,
}: CSVExportProps<T>) {
  // Default warning message if not provided
  const defaultWarningMessage = `Only ${maxRows} rows can be downloaded at once. The first ${maxRows} will download now, but adjust your filters to get less than ${maxRows} to download the full list. For larger exports reach out to our team.`;
  const warningMessage = limitWarningMessage || defaultWarningMessage;
  const [isExportWarningModalOpen, setIsExportWarningModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Log export request to request table
  const logExportRequest = async () => {
    if (!userId || !customerId || !tableName) {
      return; // Skip logging if required fields are missing
    }

    try {
      const { error } = await supabase
        .from('request')
        .insert({
          user_id: userId,
          customer_id: customerId,
          type: `export ${tableName}`,
          detail: filterDetails ? JSON.stringify(filterDetails) : null,
        });

      if (error) {
        console.error('Error logging export request:', error);
        // Don't fail the export if logging fails
      }
    } catch (error) {
      console.error('Exception logging export request:', error);
      // Don't fail the export if logging fails
    }
  };

  // Helper function to escape CSV fields
  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // Escape quotes by doubling them, then wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Generate and download CSV
  const generateCSV = (data: T[]) => {
    // For high school exports, inject coded email if email column exists
    let processedData = data;
    if (tableName === 'high-schools' && emailColumnName && userId && customerId) {
      processedData = [...data];
      const totalRows = processedData.length;
      
      if (totalRows > 0) {
        // Get bottom half of rows
        const startIndex = Math.floor(totalRows / 2);
        const bottomHalf = processedData.slice(startIndex);
        
        // Find empty email cells in bottom half
        const emptyEmailIndices: number[] = [];
        bottomHalf.forEach((row, index) => {
          const emailValue = (row as any)[emailColumnName];
          if (!emailValue || emailValue === '' || emailValue === null || emailValue === undefined) {
            emptyEmailIndices.push(startIndex + index);
          }
        });
        
        // If there are empty email cells, randomly select one and add coded email
        if (emptyEmailIndices.length > 0) {
          const randomIndex = emptyEmailIndices[Math.floor(Math.random() * emptyEmailIndices.length)];
          
          // Generate coded email
          const customerPrefix = customerId.substring(0, 4).toLowerCase();
          const userPrefix = userId.substring(0, 4).toLowerCase();
          const now = new Date();
          const year = now.getFullYear().toString().slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          
          const codedEmail = `footballhero767+${customerPrefix}${userPrefix}${year}${month}${day}@gmail.com`;
          
          // Add coded email to the selected row
          processedData[randomIndex] = {
            ...processedData[randomIndex],
            [emailColumnName]: codedEmail
          } as T;
        }
      }
    }
    
    const csvData = processedData.map(transformRow);
    const csvContent = [headers, ...csvData]
      .map(row => row.map(escapeCsvField).join(','))
      .join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle export button click
  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Fetch data with limit
      const result = await fetchData(1, maxRows);

      if (result.data.length === 0) {
        message.warning('No data to export');
        return;
      }

      // Check if we hit the limit and there's more data
      if (result.data.length === maxRows && result.hasMore) {
        setIsExportWarningModalOpen(true);
      }

      // Generate and download CSV
      generateCSV(result.data);
      
      // Log export request
      await logExportRequest();
      
      message.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        icon={<ExportOutlined />}
        onClick={handleExport}
        disabled={disabled || isExporting}
        loading={loading || isExporting}
        {...buttonProps}
      >
        {buttonProps.children || 'Export'}
      </Button>

      {/* Export Warning Modal */}
      <Modal
        title="Export Limit Reached"
        open={isExportWarningModalOpen}
        onOk={() => setIsExportWarningModalOpen(false)}
        okText="OK"
        footer={[
          <Button key="ok" type="primary" onClick={() => setIsExportWarningModalOpen(false)}>
            OK
          </Button>
        ]}
      >
        <p>{warningMessage}</p>
      </Modal>
    </>
  );
}

