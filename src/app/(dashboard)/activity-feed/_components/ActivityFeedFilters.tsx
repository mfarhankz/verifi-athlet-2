"use client";

import { useState } from "react";
import { BaseFilterComponent } from "../../_components/filters/BaseFilterComponent";
import { createGenericFilterConfig, mapActivityFeedFilters } from "../../_components/filters/GenericFilterConfig";
import type { ActivityFeedFilterState } from "../types";

// ============================================================================
// ACTIVITY FEED FILTERS COMPONENT
// ============================================================================
// Updated to use the new base filter system
// Provides activity feed specific filtering with save/load functionality
// ============================================================================

interface ActivityFeedFiltersProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: ActivityFeedFilterState) => void;
  savedFilters: ActivityFeedFilterState[];
  onSaveFilter: (filter: ActivityFeedFilterState) => void;
}

export function ActivityFeedFilters({
  visible,
  onClose,
  onApply,
  savedFilters,
  onSaveFilter,
}: ActivityFeedFiltersProps) {
  const handleApplyFilters = (filters: Record<string, any>) => {
    // Map the generic filter format to the activity feed ActivityFeedFilterState format
    const mappedFilters: ActivityFeedFilterState = {
      name: "Untitled Filter",
      eventParameters: {
        eventType: filters.eventType,
        eventDate: filters.eventDate ? [filters.eventDate.startDate, filters.eventDate.endDate] : undefined,
      },
      schoolInfo: {
        location: filters.location ? [filters.location] : undefined,
        conference: filters.conference ? [filters.conference] : undefined,
        level: filters.level ? [filters.level] : undefined,
        school: filters.school ? [filters.school] : undefined,
      },
      athleteInfo: {
        graduationYear: filters.grad_year,
        graduationLocation: filters.graduationLocation ? [filters.graduationLocation] : undefined,
        position: filters.position,
        height: filters.height,
        weight: filters.weight,
        athleticProjection: filters.athletic_projection,
        athleteLocation: filters.athleteLocation,
      },
    };
    
    onApply(mappedFilters);
  };

  const handleResetFilters = () => {
    // console.log('Resetting filters');
    // Reset filters and trigger a query refresh with empty filters
    const resetFilters: ActivityFeedFilterState = {
      name: "Reset Filters",
      eventParameters: {},
      schoolInfo: {},
      athleteInfo: {},
    };
    onApply(resetFilters);
  };

  const handleSaveFilter = (filter: any) => {
    // Map the saved filter back to ActivityFeedFilterState format
    const mappedFilter: ActivityFeedFilterState = {
      id: filter.id,
      name: filter.name,
      eventParameters: {
        eventType: filter.config.eventType,
        eventDate: filter.config.eventDate ? [filter.config.eventDate.startDate, filter.config.eventDate.endDate] : undefined,
      },
      schoolInfo: {
        location: filter.config.location ? [filter.config.location] : undefined,
        conference: filter.config.conference ? [filter.config.conference] : undefined,
        level: filter.config.level ? [filter.config.level] : undefined,
      },
      athleteInfo: {
        graduationYear: filter.config.grad_year,
        graduationLocation: filter.config.graduationLocation ? [filter.config.graduationLocation] : undefined,
        position: filter.config.position,
        height: filter.config.height,
        weight: filter.config.weight,
        athleticProjection: filter.config.athletic_projection,
      },
      createdAt: filter.createdAt,
      isActive: filter.isActive,
    };
    onSaveFilter(mappedFilter);
  };

  // Convert saved filters to the format expected by the base component
  const convertedSavedFilters = savedFilters.map(filter => ({
    id: filter.id || Date.now().toString(),
    name: filter.name,
    config: {
      eventType: filter.eventParameters?.eventType,
      eventDate: filter.eventParameters?.eventDate ? {
        startDate: filter.eventParameters.eventDate[0],
        endDate: filter.eventParameters.eventDate[1]
      } : undefined,
      location: filter.schoolInfo?.location?.[0],
      conference: filter.schoolInfo?.conference?.[0],
      level: filter.schoolInfo?.level?.[0],
      school: filter.schoolInfo?.school?.[0],
      grad_year: filter.athleteInfo?.graduationYear,
      graduationLocation: filter.athleteInfo?.graduationLocation?.[0],
      position: filter.athleteInfo?.position,
      height: filter.athleteInfo?.height,
      weight: filter.athleteInfo?.weight,
      athletic_projection: filter.athleteInfo?.athleticProjection,
      athleteLocation: filter.athleteInfo?.athleteLocation,
    },
    createdAt: filter.createdAt || new Date().toISOString(),
    isActive: filter.isActive || false,
  }));

  return (
    <BaseFilterComponent
      config={createGenericFilterConfig('activity_feed')}
      onApplyFilters={handleApplyFilters}
      onResetFilters={handleResetFilters}
      className="activity-feed-filters"
    />
  );
}

