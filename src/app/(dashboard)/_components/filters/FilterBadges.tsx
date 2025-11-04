"use client";

import React from 'react';
import { FilterConfig, getFieldByKey } from './FilterConfig';

// ============================================================================
// FILTER BADGES COMPONENT
// ============================================================================
// Displays active filters as removable badges
// Used across all filter components for consistent UX
// ============================================================================

interface FilterBadgesProps {
  config: FilterConfig;
  appliedFilters: Record<string, any>;
  onRemoveFilter: (key: string) => void;
  className?: string;
}

export function FilterBadges({ 
  config, 
  appliedFilters, 
  onRemoveFilter, 
  className = "" 
}: FilterBadgesProps) {
  const getFilterLabel = (key: string, value: any): string | null => {
    // Handle stat filters (stat_${dataTypeId})
    if (key.startsWith('stat_')) {
      const dataTypeId = key.replace('stat_', '');
      // Find the stat name from the config
      const statsSection = config.sections.find(s => s.key === 'stats');
      const statsField = statsSection?.fields.find(f => f.key === 'stats');
      const statOption = statsField?.options?.find(opt => opt.value === dataTypeId);
      const statName = statOption?.label || `Stat ${dataTypeId}`;
      
      if (value.comparison === 'between' && value.minValue !== undefined && value.maxValue !== undefined) {
        return `${statName}: ${value.minValue} - ${value.maxValue}`;
      } else if (value.comparison && value.value !== undefined) {
        const comparisonText = value.comparison === 'min' ? 'Min' : 
                             value.comparison === 'max' ? 'Max' : 
                             value.comparison === 'less' ? 'Less than' : 
                             value.comparison === 'greater' ? 'Greater than' : value.comparison;
        return `${statName}: ${comparisonText} ${value.value}`;
      }
      return `${statName}: ${value.comparison || 'Filtered'}`;
    }

    const field = getFieldByKey(config, key);
    if (!field) return key;

    // Handle different value types
    if (Array.isArray(value)) {
      if (value.length === 0) return field.label;
      if (value.length === 1) {
        const option = field.options?.find(opt => opt.value === value[0]);
        return `${field.label}: ${option?.label || value[0]}`;
      }
      // Special handling for graduation year - show all selected years
      if (key === 'grad_year') {
        return `${field.label}: ${value.join(', ')}`;
      }
      return `${field.label}: ${value.length} selected`;
    }

    if (typeof value === 'object' && value !== null) {
      // Special handling for location filter
      if (key === 'location') {
        const { type, values, radius, recruitingArea } = value;
        
        switch (type) {
          case 'hometown_state':
            return `Hometown State: ${values?.join(', ') || 'None'}`;
          case 'international':
            const internationalLabels = values?.map((item: string) => 
              item === 'ALL_INTERNATIONAL' ? 'All International' : item
            );
            return `International: ${internationalLabels?.join(', ') || 'None'}`;
          case 'county':
            return `School County: ${values?.join(', ') || 'None'}`;
          case 'school_state':
            return `School State: ${values?.join(', ') || 'None'}`;
          case 'radius':
            return `Radius: ${radius?.center || 'No center'} (${radius?.distance || 0} miles)`;
          case 'recruiting_area':
            return `Recruiting Area: ${recruitingArea?.coachId ? 'Coach Selected' : 'No Coach'}`;
          default:
            return `Location: ${values?.join(', ') || 'None'}`;
        }
      }
      
      // Handle date range objects
      if (value.startDate && value.endDate) {
        return `${field.label}: ${value.startDate} - ${value.endDate}`;
      }
      
      // Handle high school score filters (minValue/maxValue without comparison)
      if (value.minValue !== undefined && value.maxValue !== undefined) {
        return `${field.label}: ${value.minValue} - ${value.maxValue}`;
      }
      
      // Handle comparison objects (height, weight, gpa, sat, act, ratings, etc.)
      if ('comparison' in value) {
        // If comparison is empty or not set with a value, don't show the badge
        if (!value.comparison || value.comparison === '') {
          return null;
        }
        
        if (value.comparison === 'between' && value.minValue !== undefined && value.maxValue !== undefined) {
          return `${field.label}: ${value.minValue} - ${value.maxValue}`;
        } else if (value.value !== undefined && value.value !== null && value.value !== '') {
          const comparisonLabel = value.comparison === 'min' ? 'At Least' : 
                                 value.comparison === 'max' ? 'At Most' : 
                                 value.comparison;
          return `${field.label}: ${comparisonLabel} ${value.value}`;
        }
        // If comparison is set but no value, don't show the badge
        return null;
      }
      
      // Handle other objects - only show if there are meaningful values
      const meaningfulKeys = Object.keys(value).filter(k => 
        value[k] !== null && value[k] !== undefined && value[k] !== ''
      );
      if (meaningfulKeys.length === 0) return null;
      return `${field.label}: ${meaningfulKeys.length} options`;
    }

    // Handle simple values
    const option = field.options?.find(opt => opt.value === value);
    return `${field.label}: ${option?.label || value}`;
  };

  const renderBadge = (key: string, value: any) => {
    // Skip the stats object - only show individual stat filters
    if (key === 'stats') {
      return null;
    }
    
    const label = getFilterLabel(key, value);
    
    // Don't render badge if label is null
    if (!label) {
      return null;
    }
    
    return (
      <div key={key} className="filter-badge" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        backgroundColor: '#f0f0f0',
        border: '1px solid #d9d9d9',
        borderRadius: '4px',
        fontSize: '12px',
        marginRight: '4px',
        marginBottom: '4px'
      }}>
        <span style={{ color: '#666' }}>{label}</span>
        <i 
          className="icon-xmark-regular" 
          onClick={() => onRemoveFilter(key)}
          style={{ 
            cursor: 'pointer',
            color: '#999',
            fontSize: '10px'
          }}
        />
      </div>
    );
  };

  const activeFilters = Object.entries(appliedFilters).filter(([key, value]) => {
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
  });

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className={`filter-badges ${className}`} style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {activeFilters.map(([key, value]) => renderBadge(key, value))}
    </div>
  );
}

// ============================================================================
// CSS STYLES (to be added to global CSS or component styles)
// ============================================================================

export const filterBadgeStyles = `
  .filter-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background-color: #f0f0f0;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    font-size: 12px;
    margin-right: 4px;
    margin-bottom: 4px;
    transition: all 0.2s ease;
  }

  .filter-badge:hover {
    background-color: #e6f7ff;
    border-color: #91d5ff;
  }

  .filter-badge i {
    cursor: pointer;
    color: #999;
    font-size: 10px;
    transition: color 0.2s ease;
  }

  .filter-badge i:hover {
    color: #ff4d4f;
  }

  .filter-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
`;
