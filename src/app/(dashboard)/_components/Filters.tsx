"use client";

import React from 'react';
import GenericFilters from './GenericFilters';
import { FilterState } from '@/types/filters';
import { SportStatConfig } from '@/types/database';

// ============================================================================
// UPDATED FILTERS COMPONENT
// ============================================================================
// This component now uses the new base filter system
// Maintains backward compatibility with existing interface
// ============================================================================

export interface FiltersProps {
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  dynamicColumns?: SportStatConfig[];
  filterColumns?: SportStatConfig[];
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | 'recruiting_board';
}

export default function Filters({ 
  onApplyFilters, 
  onResetFilters, 
  dynamicColumns = [], 
  filterColumns = [], 
  dataSource = 'transfer_portal' 
}: FiltersProps) {
  return (
    <GenericFilters
      onApplyFilters={onApplyFilters}
      onResetFilters={onResetFilters}
      dynamicColumns={dynamicColumns}
      filterColumns={filterColumns}
      dataSource={dataSource}
    />
  );
}