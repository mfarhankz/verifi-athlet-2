"use client";

import React, { useState, useEffect } from 'react';
import { BaseFilterComponent } from './filters/BaseFilterComponent';
import { createGenericFilterConfig, DataSourceType } from './filters/GenericFilterConfig';
import { FilterState } from '@/types/filters';
import { SportStatConfig } from '@/types/database';
import { fetchHSReligiousAffiliations, fetchPositionsBySportId, fetchSchools, fetchConferences, getUserPackagesForSport } from '@/lib/queries';
import { fetchSchoolsByMultipleDivisions } from '@/utils/schoolUtils';
import { useCustomer, useUser } from '@/contexts/CustomerContext';

// ============================================================================
// GENERIC FILTERS COMPONENT
// ============================================================================
// Updated to use the new base filter system
// Provides all the functionality of the original Filters.tsx but with the new architecture
// ============================================================================

interface GenericFiltersProps {
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  dynamicColumns?: SportStatConfig[];
  filterColumns?: SportStatConfig[];
  dataSource?: DataSourceType;
}

export default function GenericFilters({ 
  onApplyFilters, 
  onResetFilters, 
  dynamicColumns = [], 
  filterColumns = [], 
  dataSource = 'transfer_portal' 
}: GenericFiltersProps) {
  const { activeCustomerId, customers, activeSportAbbrev } = useCustomer();
  const userDetails = useUser();
  const [config, setConfig] = useState(() => createGenericFilterConfig(dataSource, activeSportAbbrev || undefined));
  const [positions, setPositions] = useState<{ name: string; order: number; other_filter: boolean; include_filter: string | null }[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);
  const [graduationYears, setGraduationYears] = useState<string[]>([]);
  const [religiousAffiliations, setReligiousAffiliations] = useState<string[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [conferencesLoading, setConferencesLoading] = useState(false);

  // Helper function to check if Transfer Odds filter should be shown
  const shouldShowTransferOddsFilter = () => {
    // Only show for all_athletes data source (preportal)
    if (dataSource !== 'all_athletes') {
      return false;
    }
    
    // Check if user has packages and sport abbreviation
    if (!userDetails?.packages || !activeSportAbbrev) {
      return false;
    }
    
    const isFootball = activeSportAbbrev.toLowerCase() === 'fb';
    const sportAbbrev = activeSportAbbrev.toLowerCase();
    
    // Check if user has a NAIA package for this sport
    let hasNaiaPackage = false;
    if (sportAbbrev) {
      const userPackageNumbers = (userDetails.packages || []).map((pkg: string | number) => Number(pkg));
      const sportPackages = getUserPackagesForSport(sportAbbrev, userPackageNumbers);
      hasNaiaPackage = sportPackages.some(pkg => pkg.is_naia);
    }
    
    // Show for: football non-NAIA teams OR non-football NAIA teams
    return (isFootball && !hasNaiaPackage) || (!isFootball && hasNaiaPackage);
  };

  // Update config when dataSource or sportAbbrev changes
  useEffect(() => {
    setConfig(createGenericFilterConfig(dataSource, activeSportAbbrev || undefined));
  }, [dataSource, activeSportAbbrev]);

  // Load positions data
  useEffect(() => {
    const loadPositions = async () => {
      if (activeCustomerId) {
        setPositionsLoading(true);
        try {
          // Get sport_id from the active customer
          const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
          if (activeCustomer?.sport_id) {
            const positionsData = await fetchPositionsBySportId(activeCustomer.sport_id);
            setPositions(positionsData);
          }
        } catch (error) {
          console.error('Error loading positions:', error);
          setPositions([]);
        } finally {
          setPositionsLoading(false);
        }
      }
    };

    loadPositions();
  }, [activeCustomerId, customers]);

  // Load schools data
  useEffect(() => {
    const loadSchools = async () => {
      setSchoolsLoading(true);
      try {
        // Helper function to get available divisions based on data source
        const getAvailableDivisions = () => {
          switch (dataSource) {
            case 'transfer_portal':
            case 'all_athletes':
              return ['D1', 'D2', 'D3', 'NAIA', 'NJCAA', 'CCCAA'];
            case 'juco':
              return ['NJCAA', 'CCCAA'];
            case 'high_schools':
            case 'hs_athletes':
              return []; // No division filtering for high schools
            default:
              return ['D1', 'D2', 'D3', 'NAIA', 'NJCAA', 'CCCAA'];
          }
        };

        const availableDivisions = getAvailableDivisions();
        let schoolsData;
        
        // Fetch schools for all available divisions for this data source
        if (availableDivisions.length > 0) {
          schoolsData = await fetchSchoolsByMultipleDivisions(availableDivisions as any);
        }
        
        // Fallback to fetch all schools if no schools found with division filtering
        if (!schoolsData || schoolsData.length === 0) {
          schoolsData = await fetchSchools();
        }
        
        setSchools(schoolsData);
      } catch (error) {
        console.error('Error loading schools:', error);
        setSchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };

    loadSchools();
  }, [dataSource]);

  // Load conferences data
  useEffect(() => {
    const loadConferences = async () => {
      if (activeCustomerId) {
        setConferencesLoading(true);
        try {
          // Get sport abbreviation from the active customer
          const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
          if (activeCustomer?.sport_abbrev) {
            const conferencesData = await fetchConferences(activeCustomer.sport_abbrev);
            setConferences(conferencesData);
          }
        } catch (error) {
          console.error('Error loading conferences:', error);
          setConferences([]);
        } finally {
          setConferencesLoading(false);
        }
      }
    };

    loadConferences();
  }, [activeCustomerId, customers]);

  // Generate graduation year options dynamically based on current date
  useEffect(() => {
    const getYearOptions = () => {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-11 (January = 0)
      
      // If after July 1st (month >= 6), start from next year
      const startYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
      
      // Generate 5 years starting from startYear
      const years = [];
      for (let i = 0; i < 5; i++) {
        years.push((startYear + i).toString());
      }
      
      return years;
    };

    setGraduationYears(getYearOptions());
  }, []);

  // Load religious affiliations when dataSource is high_schools
  useEffect(() => {
    if (dataSource !== 'high_schools') return;
    
    const loadReligiousAffiliations = async () => {
      try {
        const affiliationsData = await fetchHSReligiousAffiliations();
        setReligiousAffiliations(affiliationsData);
      } catch (error) {
        console.error('Error loading religious affiliations:', error);
        setReligiousAffiliations([]);
      }
    };

    const timeoutId = setTimeout(loadReligiousAffiliations, 0);
    return () => clearTimeout(timeoutId);
  }, [dataSource]);

  // Update config with dynamic data
  useEffect(() => {
    const updatedConfig = { ...config };
    
    // Conditionally show/hide transfer_odds filter based on NAIA logic
    const transferOddsSection = updatedConfig.sections.find(s => s.key === 'transfer-odds');
    if (transferOddsSection) {
      const shouldShow = shouldShowTransferOddsFilter();
      if (!shouldShow) {
        // Remove transfer_odds section if it shouldn't be shown
        updatedConfig.sections = updatedConfig.sections.filter(s => s.key !== 'transfer-odds');
      }
    }
    
    // Update columns options (recruiting board column names) - use positions
    const columnsSection = updatedConfig.sections.find(s => s.key === 'columns');
    if (columnsSection && (dataSource === 'transfer_portal' || dataSource === 'recruiting_board')) {
      const columnsField = columnsSection.fields.find(f => f.key === 'columns');
      if (columnsField) {
        // Use positions for columns filter (these are the recruiting board column names)
        columnsField.options = positions.map(pos => ({ value: pos.name, label: pos.name }));
      }
    }

    // Update position options
    const positionSection = updatedConfig.sections.find(s => s.key === 'position');
    if (positionSection) {
      const positionField = positionSection.fields.find(f => f.key === 'position');
      if (positionField) {
        positionField.options = positions.map(pos => ({ value: pos.name, label: pos.name }));
      }
    }

    // Update schools options
    const schoolsSection = updatedConfig.sections.find(s => s.key === 'schools');
    if (schoolsSection) {
      const schoolsField = schoolsSection.fields.find(f => f.key === 'schools');
      if (schoolsField) {
        schoolsField.options = schools.map(school => ({ value: school.id, label: school.name }));
      }
    }

    // Update conferences options
    const conferenceSection = updatedConfig.sections.find(s => s.key === 'conference');
    if (conferenceSection) {
      const conferenceField = conferenceSection.fields.find(f => f.key === 'conference');
      if (conferenceField) {
        conferenceField.options = conferences.map(conf => ({ value: conf, label: conf }));
      }
    }

    // Update stats options
    const statsSection = updatedConfig.sections.find(s => s.key === 'stats');
    if (statsSection && filterColumns.length > 0) {
      const statsField = statsSection.fields.find(f => f.key === 'stats');
      if (statsField) {
        statsField.options = filterColumns.map(column => ({
          value: column.data_type_id.toString(),
          label: column.display_name || column.data_type_name || 'Unknown'
        }));
      }
    }

    // Update graduation year options
    const gradYearSection = updatedConfig.sections.find(s => s.key === 'grad_year');
    if (gradYearSection) {
      const gradYearField = gradYearSection.fields.find(f => f.key === 'grad_year');
      if (gradYearField) {
        gradYearField.options = graduationYears.map(year => ({ value: year, label: year }));
      }
    }

    // Update religious affiliation options
    const religiousAffiliationSection = updatedConfig.sections.find(s => s.key === 'hs-religious-affiliation');
    if (religiousAffiliationSection) {
      const religiousAffiliationField = religiousAffiliationSection.fields.find(f => f.key === 'hsReligiousAffiliation');
      if (religiousAffiliationField) {
        religiousAffiliationField.options = religiousAffiliations.map(affiliation => ({ value: affiliation, label: affiliation }));
      }
    }

    setConfig(updatedConfig);
  }, [positions, schools, conferences, graduationYears, religiousAffiliations, filterColumns, dataSource, userDetails, activeSportAbbrev]); // Added dependencies for NAIA logic

  // Auto-set default transfer odds filter when it should be shown (like in old system)
  useEffect(() => {
    if (dataSource === 'all_athletes' && shouldShowTransferOddsFilter()) {
      // This will be handled by the MinMaxRangeField component's default value logic
      // The default value is set in the field configuration
    }
  }, [dataSource, userDetails, activeSportAbbrev]);

  // Handle applying filters
  const handleApplyFilters = (filters: Record<string, any>) => {
    // Map the generic filter format to FilterState format
    const mappedFilters: FilterState = {
      position: filters.position,
      divisions: filters.divisions,
      level: filters.level,
      years: filters.years,
      height: filters.height,
      location: filters.location,
      schools: filters.schools,
      athleticAid: filters.athleticAid,
      status: filters.status,
      conference: filters.conference,
      // Add all other filter fields
      survey_completed: filters.survey_completed,
      gradStudent: filters.gradStudent,
      honors: filters.honors,
      designatedStudentAthlete: filters.designatedStudentAthlete,
      dateRange: filters.dateRange,
      transfer_odds: filters.transfer_odds,
      // JUCO filters
      athleticAssociation: filters.athleticAssociation,
      jucoRegion: filters.jucoRegion,
      jucoDivision: filters.jucoDivision,
      schoolState: filters.schoolState,
      // High School filters
      hsState: filters.hsState,
      hsCounty: filters.hsCounty,
      hsReligiousAffiliation: filters.hsReligiousAffiliation,
      hsSchoolType: filters.hsSchoolType,
      hsProspectsScore: filters.hsProspectsScore,
      hsD1ProspectsScore: filters.hsD1ProspectsScore,
      hsTeamQualityScore: filters.hsTeamQualityScore,
      hsAthleteIncomeScore: filters.hsAthleteIncomeScore,
      hsAcademicsScore: filters.hsAcademicsScore,
      // High School Athletes filters
      grad_year: filters.grad_year, // This will be an array of selected years
      weight: filters.weight,
      athletic_projection: filters.athletic_projection,
      best_offer: filters.best_offer,
      committed: filters.committed,
      signed: filters.signed,
      offer_count: filters.offer_count,
      gpa: filters.gpa,
      gpa_type: filters.gpa_type,
      major: filters.major,
      sat: filters.sat,
      act: filters.act,
      income_category: filters.income_category,
      added_date: filters.added_date,
      last_major_change: filters.last_major_change,
      show_archived: filters.show_archived,
      on3_consensus_stars: filters.on3_consensus_stars,
      rivals_rating: filters.rivals_rating,
      on3_rating: filters.on3_rating,
      _247_rating: filters._247_rating,
      espn_rating: filters.espn_rating,
      on3_stars: filters.on3_stars,
      _247_stars: filters._247_stars,
      espn_stars: filters.espn_stars,
      // Camp filter
      camp: filters.camp,
    };

    // Add stat filters (stat_${dataTypeId}) to the mapped filters
    Object.keys(filters).forEach(key => {
      if (key.startsWith('stat_')) {
        mappedFilters[key] = filters[key];
      }
    });

    onApplyFilters(mappedFilters);
  };

  // Handle resetting filters
  const handleResetFilters = () => {
    onResetFilters();
  };

  return (
    <BaseFilterComponent
      config={config}
      onApplyFilters={handleApplyFilters}
      onResetFilters={handleResetFilters}
      className="generic-filters"
      dataSource={dataSource}
    />
  );
}
