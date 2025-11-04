"use client";

import React, { useState, useEffect } from 'react';
import { Button, Drawer, Collapse, Flex, Input, Select, DatePicker, Slider, Checkbox } from 'antd';
import { CloseOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { FilterConfig, FilterField, getFieldByKey } from './FilterConfig';
import { FilterBadges } from './FilterBadges';
import { SavedFilters, SavedFilter, saveFilterToStorage, getSavedFiltersFromStorage, deleteFilterFromStorage } from './SavedFilters';
import { renderFilterField } from './FilterFieldRenderer';
import dayjs from 'dayjs';

// ============================================================================
// BASE FILTER COMPONENT
// ============================================================================
// Core filter functionality that can be reused across different filter types
// Handles rendering, state management, and common filter operations
// ============================================================================

interface BaseFilterComponentProps {
  config: FilterConfig;
  onApplyFilters: (filters: Record<string, any>) => void;
  onResetFilters: () => void;
  initialFilters?: Record<string, any>;
  className?: string;
}

export function BaseFilterComponent({
  config,
  onApplyFilters,
  onResetFilters,
  initialFilters = {},
  className = ""
}: BaseFilterComponentProps) {
  const [filterState, setFilterState] = useState<Record<string, any>>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Record<string, any>>(initialFilters);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

  // Load saved filters on mount
  useEffect(() => {
    const saved = getSavedFiltersFromStorage();
    setSavedFilters(saved);
  }, []);

  // Handle filter value changes
  const handleFilterChange = (key: string, value: any) => {
    if (key === 'stats' && value && typeof value === 'object' && !Array.isArray(value)) {
      // Special handling for stats - convert to individual stat_${dataTypeId} filters
      setFilterState(prev => {
        const newState = { ...prev };
        
        // Remove existing stat filters
        Object.keys(newState).forEach(filterKey => {
          if (filterKey.startsWith('stat_')) {
            delete newState[filterKey];
          }
        });
        
        // Add new stat filters
        Object.keys(value).forEach(statId => {
          newState[`stat_${statId}`] = value[statId];
        });
        
        // Also keep the stats object for the UI
        newState.stats = value;
        
        return newState;
      });
    } else {
      setFilterState(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  // Handle removing a filter
  const handleRemoveFilter = (key: string) => {
    if (key.startsWith('stat_')) {
      // Handle removing individual stat filters
      setFilterState(prev => {
        const newState = { ...prev };
        delete newState[key];
        
        // Update the stats object to remove the corresponding stat
        const statId = key.replace('stat_', '');
        if (newState.stats && newState.stats[statId]) {
          const updatedStats = { ...newState.stats };
          delete updatedStats[statId];
          newState.stats = updatedStats;
        }
        
        return newState;
      });
      
      setAppliedFilters(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      
      // Trigger query refresh by calling onApplyFilters with updated filters
      const updatedFilters = { ...appliedFilters };
      delete updatedFilters[key];
      onApplyFilters(updatedFilters);
    } else {
      setFilterState(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      
      setAppliedFilters(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      
      // Trigger query refresh by calling onApplyFilters with updated filters
      const updatedFilters = { ...appliedFilters };
      delete updatedFilters[key];
      onApplyFilters(updatedFilters);
    }
  };

  // Handle applying filters
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterState });
    onApplyFilters(filterState);
    setIsPanelOpen(false);
  };

  // Handle resetting filters
  const handleReset = () => {
    setFilterState({});
    setAppliedFilters({});
    setIsPanelOpen(false); // Close the filter panel when resetting
    onResetFilters();
  };

  // Handle loading a saved filter
  const handleLoadFilter = (filters: Record<string, any>) => {
    setFilterState(filters);
    setAppliedFilters(filters);
    onApplyFilters(filters);
  };

  // Handle saving a filter
  const handleSaveFilter = (filter: SavedFilter) => {
    saveFilterToStorage(filter);
    setSavedFilters(prev => [...prev, filter]);
  };

  // Handle deleting a saved filter
  const handleDeleteFilter = (filterId: string) => {
    deleteFilterFromStorage(filterId);
    setSavedFilters(prev => prev.filter(f => f.id !== filterId));
  };

  // Render a single filter field
  const renderField = (field: FilterField) => {
    // Let individual field components handle their own default values
    // This ensures defaults are propagated via onChange and counted as real changes
    const value = filterState[field.key];
    return renderFilterField(field, value, handleFilterChange);
  };

  // Count active filters (excluding empty or incomplete ones)
  const getActiveFilterCount = () => {
    return Object.entries(appliedFilters).filter(([key, value]) => {
      // Skip the stats object - only count individual stat filters
      if (key === 'stats') return false;
      
      // Filter out empty values
      if (value === null || value === undefined) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'string' && value.trim() === '') return false;
      if (typeof value === 'object' && Object.keys(value).length === 0) return false;
      
      // Special handling for comparison objects - filter out if comparison is empty or no value is set
      if (typeof value === 'object' && 'comparison' in value) {
        if (!value.comparison || value.comparison === '') return false;
        if (value.comparison === 'between') {
          return value.minValue !== undefined && value.maxValue !== undefined;
        }
        return value.value !== undefined && value.value !== null && value.value !== '';
      }
      
      return true;
    }).length;
  };

  // Render filter panel content
  const renderPanelContent = () => (
    <Flex vertical style={{ height: '100%', gap: '16px' }}>
      {/* Header */}
      <Flex justify="space-between" align="center" style={{ 
        padding: '16px 0', 
        borderBottom: '1px solid rgba(18, 109, 184, 0.2)', 
        background: 'rgba(18, 109, 184, 0.1)' 
      }}>
        <h4 style={{ margin: 0, paddingLeft: '16px' }}>
          {config.title || 'Filters'}
        </h4>
        <Button 
          type="text" 
          icon={<CloseOutlined />}
          onClick={() => setIsPanelOpen(false)}
        />
      </Flex>

      {/* Filter Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <Collapse
          defaultActiveKey={config.sections
            .filter(section => section.defaultExpanded !== false)
            .map(section => section.key)
          }
          ghost
          expandIcon={({ isActive }) =>
            isActive ? (
              <i className="icon-minus" style={{ fontSize: '18px' }}></i>
            ) : (
              <i className="icon-add" style={{ fontSize: '18px' }}></i>
            )
          }
          expandIconPosition="end"
          style={{ backgroundColor: '#fff' }}
        >
          {config.sections.map(section => (
            <Collapse.Panel
              key={section.key}
              header={section.title}
              style={{ marginBottom: '8px' }}
            >
              <div style={{ padding: '12px' }}>
                {section.fields.map(field => (
                  <div key={field.key} style={{ marginBottom: '12px' }}>
                    {/* Only show field label if there are multiple fields in the section */}
                    {section.fields.length > 1 && (
                      <label style={{ 
                        display: 'block', 
                        marginBottom: '4px', 
                        fontWeight: 500,
                        fontSize: '14px'
                      }}>
                        {field.label}
                      </label>
                    )}
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </Collapse.Panel>
          ))}
        </Collapse>
      </div>

      {/* Saved Filters */}
      {config.showSaveFilter && (
        <div style={{ 
          borderTop: '1px solid #f0f0f0', 
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          <SavedFilters
            currentFilters={filterState}
            onLoadFilter={handleLoadFilter}
            onSaveFilter={handleSaveFilter}
            onDeleteFilter={handleDeleteFilter}
            savedFilters={savedFilters}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
        <Flex gap={8} justify="center">
          <Button size="large" onClick={handleReset} style={{ flex: 1 }}>
            Reset
          </Button>
          <Button type="primary" size="large" onClick={handleApplyFilters} style={{ flex: 1 }}>
            Apply Filters
          </Button>
        </Flex>
      </div>
    </Flex>
  );

  return (
    <div className={`base-filter-component ${className}`}>
      {/* Filter Button and Active Filters */}
      <Flex gap={8} align="center">
        {config.showActiveFilters && (
          <FilterBadges
            config={config}
            appliedFilters={appliedFilters}
            onRemoveFilter={handleRemoveFilter}
          />
        )}
        <Button 
          className="select-dropdown"
          onClick={() => setIsPanelOpen(true)}
        >
          <i className="icon-filter-1"></i> 
          Filters {getActiveFilterCount() > 0 && `(${getActiveFilterCount()})`}
        </Button>
      </Flex>

      {/* Filter Drawer */}
      <Drawer
        title={null}
        placement="right"
        onClose={() => setIsPanelOpen(false)}
        open={isPanelOpen}
        width={config.maxWidth || 400}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' }
        }}
        maskClosable={true}
        destroyOnClose={false}
      >
        {renderPanelContent()}
      </Drawer>
    </div>
  );
}
