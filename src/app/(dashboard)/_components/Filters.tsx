import React, { useState, useEffect } from "react";
import { Button, Flex, Input, Radio, Select, InputNumber, Drawer, Slider, DatePicker, Checkbox } from "antd";
import type { CollapseProps } from "antd";
import { Collapse } from "antd";
import { FilterState } from "@/types/filters";
import { SportStatConfig } from "@/types/database";
import { fetchPositionsBySportId, fetchInternationalOptions, fetchSchools, fetchConferences, fetchHSStates, fetchHSCounties, fetchHSReligiousAffiliations, fetchCountiesWithStateAbbrev, fetchRecruitingAreasForCoach, convertCountyIdsToNames, convertStateIdsToAbbrevs, checkCoachHasActiveAreas, getUserPackagesForSport } from "@/lib/queries";
import { fetchUsersForCustomer } from "@/utils/utils";
import { geocodeLocation, getLocationSuggestions, type GeocodingResult } from "@/utils/geocoding";
import { fetchSchoolsByMultipleDivisions } from "@/utils/schoolUtils";
import type { DivisionType } from "@/utils/schoolUtils";
import { useCustomer, useUser } from '@/contexts/CustomerContext';
import { US_STATE_ABBREVIATIONS } from '@/utils/constants';
import TimeInput from './TimeInput';
import dayjs from 'dayjs';

// Helper function to determine if a stat is time-based
const TIME_BASED_STATS = [
  '100_m', '200_m', '400_m', '60_h', '110_h', '400_h', '6k_xc', '600_m', '800_m',
  '1500_m', 'mile', '3000_m', '5000_m', '8k_xc', '10k_xc', '3000_s', '5_mile_xc',
  '60_m', '1000_m', '4_mile_xc', '300_m', '55_m', '500_m', '100_h',
  '50_y_free', '50_l_free', '100_y_free', '100_l_free', '200_y_free', '200_l_free',
  '400_y_free', '400_l_free', '500_y_free', '800_l_free', '1000_y_free', '1500_l_free',
  '1650_y_free', '50_y_back', '50_l_back', '100_y_back', '100_l_back', '200_y_back',
  '200_l_back', '50_y_breast', '50_l_breast', '100_y_breast', '100_l_breast',
  '200_y_breast', '200_l_breast', '50_s_fly_turn', '50_l_fly_turn', '100_s_fly',
  '100_l_fly', '200_s_fly', '200_l_fly', '75_y_im_turn', '100_s_im', '200_y_im',
  '200_l_im', '400_y_im', '400_l_im'
];

const isTimeBasedStat = (column: SportStatConfig): boolean => {
  const statName = (column.data_type_name || '').toLowerCase();
  return TIME_BASED_STATS.includes(statName);
};

// Filter visibility configuration based on dataSource
// Keys: '1'=Position, '2'=Division, '3'=Year, 'height'=Height, 'location'=Hometown Location, 
// 'schools'=Schools, 'stats'=Stats, '4'=Athletic Aid, '5'=Status, '6'=Date Entered, 
// '7'=Survey Completed, '8'=Grad Student, '9'=Honors, '10'=Designated Student Athlete, 'conference'=Conference
// 'transfer-odds'=Transfer Odds
// JUCO keys: 'juco-athletic-association', 'juco-region', 'juco-division', 'juco-school-state'
// High School keys: 'hs-state', 'hs-county', 'hs-religious-affiliation', 'hs-school-type', 'hs-prospects-score', 'hs-d1-prospects-score', 'hs-team-quality-score', 'hs-athlete-income-score', 'hs-academics-score'
const FILTER_VISIBILITY_CONFIG = {
  juco: {
    visible: ['1', '3', 'location', 'schools', 'stats', 'juco-athletic-association', 'juco-region', 'juco-division'], // Position, Year, Location, Schools, Stats, and JUCO-specific filters
    hidden: ['2', 'height', '4', '5', '6', '7', '8', '9', '10', 'conference', 'juco-school-state'] // Hide Division, Height, Athletic Aid, Status, Date Entered, Survey Completed, Grad Student, Honors, DSA, Conference, and old school state
  },
  transfer_portal: {
    visible: ['1', '2', '3', 'height', 'location', 'schools', 'stats', '4', '5', '6', '7', '8', '9', '10', 'conference'],
    hidden: []
  },
  all_athletes: {
    visible: ['1', '2', '3', 'height', 'location', 'schools', 'stats', '8', '9', 'conference', 'transfer-odds'],
    hidden: ['4', '5', '6', '7', '10'] // Hide Athletic Aid, Status, Date Entered, Survey Completed, and Designated Student Athlete filters for all_athletes (pre-portal-search) - Status is handled conditionally
  },
  high_schools: {
    visible: ['location', 'hs-religious-affiliation', 'hs-school-type', 'hs-prospects-score', 'hs-d1-prospects-score', 'hs-team-quality-score', 'hs-athlete-income-score', 'hs-academics-score'], // High school specific filters with unified location
    hidden: ['1', '2', '3', 'height', 'schools', 'stats', '4', '5', '6', '7', '8', '9', '10', 'conference', 'juco-athletic-association', 'juco-region', 'juco-division', 'juco-school-state', 'hs-state', 'hs-county']
  },
  hs_athletes: {
    visible: ['grad_year', '1', 'height', 'weight', 'athletic_projection', 'offer-commit', 'academics-income', 'verified-filters', 'recruiting-service-ratings', 'location'], // Similar to all_athletes but without transfer-odds, plus grouped Offer/Commit, Academics/Income, Verified filters, and Recruiting Service Ratings
    hidden: ['2', '3', '4', '5', '6', '7',  '8', '9', '10', 'conference','schools', 'stats', 'juco-athletic-association', 'juco-region', 'juco-division', 'juco-school-state', 'hs-state', 'hs-county', 'hs-religious-affiliation', 'hs-school-type', 'hs-prospects-score', 'hs-d1-prospects-score', 'hs-team-quality-score', 'hs-athlete-income-score', 'hs-academics-score']
  }
} as const;

type DataSourceType = keyof typeof FILTER_VISIBILITY_CONFIG;

// Helper function to format seconds into MM:SS format
const formatTimeValue = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = (seconds % 60).toFixed(2);
  // Ensure two digits before decimal point
  const [whole, decimal] = remainingSeconds.split('.');
  return `${minutes}:${whole.padStart(2, '0')}.${decimal}`;
};

// Helper function to get handle color based on position

export interface FiltersProps {
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  dynamicColumns?: SportStatConfig[];
  filterColumns?: SportStatConfig[];
  dataSource?: DataSourceType;
}

export default function Filters({ onApplyFilters, onResetFilters, dynamicColumns = [], filterColumns = [], dataSource = 'transfer_portal' }: FiltersProps) {
  const [filterState, setFilterState] = useState<FilterState>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({});
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dropdownKey, setDropdownKey] = useState(0);
  const [locationDropdownKey, setLocationDropdownKey] = useState(0);
  const [locationTypeDropdownKey, setLocationTypeDropdownKey] = useState(0);
  const [positions, setPositions] = useState<{ name: string; order: number; other_filter: boolean; include_filter: string | null }[]>([]);
  const [internationalOptions, setInternationalOptions] = useState<string[]>([]);
  const [internationalLoading, setInternationalLoading] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [conferences, setConferences] = useState<string[]>([]);
  const [conferencesLoading, setConferencesLoading] = useState(false);
  const [hsStates, setHsStates] = useState<string[]>([]);
  const [hsStatesLoading, setHsStatesLoading] = useState(false);
  const [hsCounties, setHsCounties] = useState<string[]>([]);
  const [hsCountiesLoading, setHsCountiesLoading] = useState(false);
  const [countiesWithState, setCountiesWithState] = useState<{ value: string; label: string }[]>([]);
  const [countiesWithStateLoading, setCountiesWithStateLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<GeocodingResult[]>([]);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null);
  const [coaches, setCoaches] = useState<{ id: string; name_first: string; name_last: string; hasActiveAreas: boolean }[]>([]);
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<string | null>(null);
  const [hsReligiousAffiliations, setHsReligiousAffiliations] = useState<string[]>([]);
  const [hsReligiousAffiliationsLoading, setHsReligiousAffiliationsLoading] = useState(false);
  const [isTransferOddsExpanded, setIsTransferOddsExpanded] = useState(false);
  const { activeCustomerId, customers, activeSportAbbrev } = useCustomer();
  const userDetails = useUser();

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

  // Helper function to check if Status filter should be shown
  const shouldShowStatusFilter = () => {
    // Show for all_athletes data source (preportal) and transfer_portal data source
    if (dataSource !== 'all_athletes' && dataSource !== 'transfer_portal') {
      return false;
    }
    
    // Check if user has packages and sport abbreviation
    if (!userDetails?.packages || !activeSportAbbrev) {
      return false;
    }
    
    const sportAbbrev = activeSportAbbrev.toLowerCase();
    
    // Check if user has a NAIA package for this sport
    let hasNaiaPackage = false;
    if (sportAbbrev) {
      const userPackageNumbers = (userDetails.packages || []).map((pkg: string | number) => Number(pkg));
      const sportPackages = getUserPackagesForSport(sportAbbrev, userPackageNumbers);
      hasNaiaPackage = sportPackages.some(pkg => pkg.is_naia);
    }
    
    // Status filter shows for non-NAIA teams (regardless of sport)
    return !hasNaiaPackage;
  };

  // Auto-set default transfer odds filter when it should be shown
  useEffect(() => {
    if (dataSource === 'all_athletes' && shouldShowTransferOddsFilter() && !filterState.transfer_odds) {
      handleFilterChange('transfer_odds', {
        comparison: 'min',
        value: 80
      });
    }
  }, [dataSource, activeCustomerId, activeSportAbbrev, userDetails]);









  // Use shared US state abbreviations constant (includes DC)
  const states = US_STATE_ABBREVIATIONS;

  const statusOptions = [
    { value: 'null', label: 'Not In Portal' },
    { value: 'Active', label: 'Active' },
    { value: 'Withdrawn', label: 'Withdrawn' },
    { value: 'Matriculated', label: 'Matriculated' },
    { value: 'Signed', label: 'Signed' }
  ].filter(option => {
    // For transfer_portal data source, exclude "Not In Portal" option
    if (dataSource === 'transfer_portal' && option.value === 'null') {
      return false;
    }
    return true;
  });

  // JUCO-specific filter options
  const athleticAssociationOptions = [
    { value: 'CCCAA', label: 'CCCAA' },
    { value: 'NJCAA', label: 'NJCAA' },
    { value: 'NWAC', label: 'NWAC' }
  ];

  const jucoRegionOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `Region ${i + 1}`,
    label: `Region ${i + 1}`
  }));

  const jucoDivisionOptions = [
    { value: 'Division I', label: 'Division I' },
    { value: 'Division II', label: 'Division II' },
    { value: 'Division III', label: 'Division III' }
  ];

  // Location type options for unified location filter
  const allLocationTypeOptions = [
    { value: 'hometown_state', label: 'Hometown State' },
    { value: 'international', label: 'International Location' },
    { value: 'county', label: 'School County' },
    { value: 'school_state', label: 'School State' },
    { value: 'radius', label: 'Radius' },
    { value: 'recruiting_area', label: 'Recruiting Area' }
  ];

  // Get available location options based on data source
  const getAvailableLocationOptions = () => {
    const hiddenOptions: string[] = [];
    
    switch (dataSource) {
      case 'high_schools':
        // Hide Hometown State for High School
        hiddenOptions.push('hometown_state');
        break;
      case 'transfer_portal':
        // Hide School County and Recruiting Area for Transfers
        hiddenOptions.push('county', 'recruiting_area');
        break;
      case 'juco':
        // Hide Hometown State, International Location, and Recruiting Area for JUCO
        hiddenOptions.push('hometown_state', 'international', 'recruiting_area');
        break;
      case 'all_athletes':
        // Hide School County and Recruiting Area for pre-portal search
        hiddenOptions.push('county', 'recruiting_area');
        break;
      default:
        // No hidden options for other data sources
        break;
    }
    
    return allLocationTypeOptions.filter(option => !hiddenOptions.includes(option.value));
  };

  const compareOptions = [
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'between', label: 'Between' }
  ];

  // Fetch positions when component mounts or sport changes
  useEffect(() => {
    const loadPositions = async () => {
      if (activeCustomerId) {
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
        }
      }
    };

    loadPositions();
  }, [activeCustomerId, customers]);

  // Fetch international options when component mounts or sport changes
  useEffect(() => {
    const loadInternationalOptions = async () => {
      if (activeCustomerId) {
        try {
          setInternationalLoading(true);
          // Get sport_id from the active customer
          const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
          if (activeCustomer?.sport_id) {
            const internationalData = await fetchInternationalOptions(activeCustomer.sport_id);
            setInternationalOptions(internationalData);
          }
        } catch (error) {
          console.error('Error loading international options:', error);
          setInternationalOptions([]);
        } finally {
          setInternationalLoading(false);
        }
      }
    };

    // Use setTimeout to prevent React state update during render
    const timeoutId = setTimeout(loadInternationalOptions, 0);
    
    return () => clearTimeout(timeoutId);
  }, [activeCustomerId, customers]);

  // Fetch schools when component mounts or data source changes
  useEffect(() => {
    const loadSchools = async () => {
      try {
        setSchoolsLoading(true);
        let schoolsData;
        
        // Determine which divisions to show based on data source
        const getAvailableDivisions = (): DivisionType[] => {
          switch (dataSource) {
            case 'transfer_portal':
              // Transfer portal only shows D1, D2, D3 schools
              return ['D1', 'D2', 'D3'];
            case 'all_athletes':
              // Pre-portal search shows all divisions
              return ['D1', 'D2', 'D3', 'NAIA'];
            case 'juco':
              // JUCO: show Junior Colleges from school_fact (data_type_id 117, value 'Junior College')
              return ['JUNIOR_COLLEGE'];
            default:
              return ['D1', 'D2', 'D3', 'NAIA'];
          }
        };

        const availableDivisions = getAvailableDivisions();
        
        // Fetch schools for all available divisions for this data source
        schoolsData = await fetchSchoolsByMultipleDivisions(availableDivisions);
        
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

    // Use setTimeout to prevent React state update during render
    const timeoutId = setTimeout(loadSchools, 0);
    
    return () => clearTimeout(timeoutId);
  }, [dataSource]);

  // Fetch conferences when component mounts or sport changes
  useEffect(() => {
    const loadConferences = async () => {
      if (activeSportAbbrev) {
        try {
          setConferencesLoading(true);
          const conferencesData = await fetchConferences(activeSportAbbrev);
          setConferences(conferencesData);
        } catch (error) {
          console.error('Error loading conferences:', error);
          setConferences([]);
        } finally {
          setConferencesLoading(false);
        }
      }
    };

    // Use setTimeout to prevent React state update during render
    const timeoutId = setTimeout(loadConferences, 0);
    
    return () => clearTimeout(timeoutId);
  }, [activeSportAbbrev]);

  // Fetch high school states when dataSource is high_schools
  useEffect(() => {
    if (dataSource !== 'high_schools') return;
    
    const loadHSStates = async () => {
      try {
        setHsStatesLoading(true);
        const statesData = await fetchHSStates();
        setHsStates(statesData);
      } catch (error) {
        console.error('Error loading high school states:', error);
        setHsStates([]);
      } finally {
        setHsStatesLoading(false);
      }
    };

    const timeoutId = setTimeout(loadHSStates, 0);
    return () => clearTimeout(timeoutId);
  }, [dataSource]);

  // Fetch high school counties when dataSource is high_schools
  useEffect(() => {
    if (dataSource !== 'high_schools') return;
    
    const loadHSCounties = async () => {
      try {
        setHsCountiesLoading(true);
        const countiesData = await fetchHSCounties();
        setHsCounties(countiesData);
      } catch (error) {
        console.error('Error loading high school counties:', error);
        setHsCounties([]);
      } finally {
        setHsCountiesLoading(false);
      }
    };

    const timeoutId = setTimeout(loadHSCounties, 0);
    return () => clearTimeout(timeoutId);
  }, [dataSource]);

  // Fetch counties with state abbreviations for unified location filter
  useEffect(() => {
    const loadCountiesWithState = async () => {
      try {
        setCountiesWithStateLoading(true);
        const countiesData = await fetchCountiesWithStateAbbrev();
        setCountiesWithState(countiesData);
      } catch (error) {
        console.error('Error loading counties with state info:', error);
        setCountiesWithState([]);
      } finally {
        setCountiesWithStateLoading(false);
      }
    };

    const timeoutId = setTimeout(loadCountiesWithState, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // Fetch coaches for recruiting area filter
  useEffect(() => {
    const loadCoaches = async () => {
      if (!activeCustomerId) return;
      
      try {
        setCoachesLoading(true);
        const coachesData = await fetchUsersForCustomer(activeCustomerId);
        
        // Check which coaches have active recruiting areas
        const coachesWithAreaStatus = await Promise.all(
          coachesData.map(async (coach) => {
            const hasActiveAreas = await checkCoachHasActiveAreas(coach.id);
            return {
              ...coach,
              hasActiveAreas
            };
          })
        );
        
        // Remove duplicates based on coach ID
        const uniqueCoaches = coachesWithAreaStatus.filter((coach, index, self) => 
          index === self.findIndex(c => c.id === coach.id)
        );
        
        // Sort coaches: those with active areas first, then those without
        const sortedCoaches = uniqueCoaches.sort((a, b) => {
          if (a.hasActiveAreas && !b.hasActiveAreas) return -1;
          if (!a.hasActiveAreas && b.hasActiveAreas) return 1;
          return 0;
        });
        
        
        setCoaches(sortedCoaches);
      } catch (error) {
        console.error('Error loading coaches:', error);
        setCoaches([]);
      } finally {
        setCoachesLoading(false);
      }
    };

    const timeoutId = setTimeout(loadCoaches, 0);
    return () => clearTimeout(timeoutId);
  }, [activeCustomerId]);

  // Fetch high school religious affiliations when dataSource is high_schools
  useEffect(() => {
    if (dataSource !== 'high_schools') return;
    
    const loadHSReligiousAffiliations = async () => {
      try {
        setHsReligiousAffiliationsLoading(true);
        const affiliationsData = await fetchHSReligiousAffiliations();
        setHsReligiousAffiliations(affiliationsData);
      } catch (error) {
        console.error('Error loading high school religious affiliations:', error);
        setHsReligiousAffiliations([]);
      } finally {
        setHsReligiousAffiliationsLoading(false);
      }
    };

    const timeoutId = setTimeout(loadHSReligiousAffiliations, 0);
    return () => clearTimeout(timeoutId);
  }, [dataSource]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilterState(prev => {
      // Special handling for dateRange to set end date to today if not provided
      if (key === 'dateRange') {
        const today = new Date().toISOString().split('T')[0];
        return {
          ...prev,
          [key]: {
            ...value,
            endDate: value.endDate || today
          }
        };
      }
      
      // Special handling for transfer_odds to set default value to 80% when first accessed
      if (key === 'transfer_odds') {
        const transferOddsValue = { ...value };
        
        // If this is the first time setting the filter, set default to 80% with Min selected
        if (!prev.transfer_odds) {
          transferOddsValue.value = 80;
          transferOddsValue.comparison = 'min'; // Auto-select Min
        }
        
        return {
          ...prev,
          [key]: transferOddsValue
        };
      }
      
      
      // Special handling for height to default blank inches to 0
      if (key === 'height') {
        const heightValue = { ...value };
        
        // Convert null/undefined inches to 0 for all height fields
        if (heightValue.inches === null || heightValue.inches === undefined) {
          heightValue.inches = 0;
        }
        if (heightValue.minInches === null || heightValue.minInches === undefined) {
          heightValue.minInches = 0;
        }
        if (heightValue.maxInches === null || heightValue.maxInches === undefined) {
          heightValue.maxInches = 0;
        }
        
        return {
          ...prev,
          [key]: heightValue
        };
      }
      
      const newState = {
        ...prev,
        [key]: value
      };
      return newState;
    });
  };

  const handleRemoveFilter = (key: keyof FilterState) => {
    setFilterState(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    
    setAppliedFilters(prev => {
      const newState = { ...prev };
      delete newState[key];
      // Use setTimeout to defer the callback and avoid setState during render
      setTimeout(() => onApplyFilters(newState), 0);
      return newState;
    });
  };

  const getAlertFilterLabel = (key: keyof FilterState): string => {
    const filtersToUse = appliedFilters;

    if (key === 'height' && filtersToUse.height) {
      const { comparison, feet, inches, minFeet, minInches, maxFeet, maxInches } = filtersToUse.height;
      if (comparison === 'between' && minFeet !== undefined && maxFeet !== undefined) {
        const minTotalInches = (minFeet * 12) + (minInches || 0);
        const maxTotalInches = (maxFeet * 12) + (maxInches || 0);
        return `height_total_inches Min: ${minTotalInches}, Max: ${maxTotalInches}`;
      } else if (comparison === 'min' && feet !== undefined) {
        const totalInches = (feet * 12) + (inches || 0);
        return `height_total_inches Min: ${totalInches}`;
      } else if (comparison === 'max' && feet !== undefined) {
        const totalInches = (feet * 12) + (inches || 0);
        return `height_total_inches Max: ${totalInches}`;
      }
    }
    return getFilterLabel(key);
  };

  const getFilterLabel = (key: keyof FilterState): string => {
    const filtersToUse = appliedFilters;
    
    switch (key) {
      case 'years':
        return `Year: ${filtersToUse.years?.join(', ')}`;
      case 'divisions':
        return `Division: ${filtersToUse.divisions?.join(', ')}`;
      case 'location':
        if (filtersToUse.location) {
          const { type, values, radius, recruitingArea } = filtersToUse.location;
          switch (type) {
            case 'hometown_state':
              return `Hometown State: ${values?.join(', ')}`;
            case 'international':
              const internationalLabels = values?.map(item => 
                item === 'ALL_INTERNATIONAL' ? 'All International' : item
              );
              return `International: ${internationalLabels?.join(', ')}`;
             case 'county':
               return `School County: ${values?.join(', ')}`;
            case 'school_state':
              return `School State: ${values?.join(', ')}`;
            case 'radius':
              return `Radius: ${radius?.center} (${radius?.distance} miles)`;
            case 'recruiting_area':
              if (recruitingArea?.coachId) {
                const coach = coaches.find(c => c.id === recruitingArea.coachId);
                const coachName = coach ? `${coach.name_first} ${coach.name_last}` : 'Unknown Coach';
                return `Recruiting Area: ${coachName}`;
              }
              return 'Recruiting Area: Selected';
            default:
              return `Location: ${values?.join(', ')}`;
          }
        }
        return '';
      case 'states':
        return `Home State: ${filtersToUse.states?.join(', ')}`;
      case 'international':
        // Handle "All International" selection specially
        const internationalLabels = filtersToUse.international?.map(item => 
          item === 'ALL_INTERNATIONAL' ? 'All International' : item
        );
        return `International: ${internationalLabels?.join(', ')}`;
      case 'status':
        // Map 'null' to 'Not In Portal' for display
        const statusLabels = filtersToUse.status?.map(item => 
          item === 'null' ? 'Not In Portal' : item
        );
        return `Status: ${statusLabels?.join(', ')}`;
      case 'position':
        return `Position: ${filtersToUse.position?.join(', ')}`;
      case 'schools':
        // Map school IDs to school names for display
        const schoolNames = filtersToUse.schools?.map(schoolId => {
          const school = schools.find(s => s.id === schoolId);
          return school?.name || schoolId;
        });
        return `Schools: ${schoolNames?.join(', ')}`;
      case 'gamesPlayed':
        return `GP ${filtersToUse.gamesPlayed?.comparison} ${filtersToUse.gamesPlayed?.value}`;
      case 'gamesStarted':
        return `GS ${filtersToUse.gamesStarted?.comparison} ${filtersToUse.gamesStarted?.value}`;
      case 'goals':
        return `Goals ${filtersToUse.goals?.comparison} ${filtersToUse.goals?.value}`;
      case 'assists':
        return `Assists ${filtersToUse.assists?.comparison} ${filtersToUse.assists?.value}`;
      case 'goalkeeperMinutes':
        return `GK Min ${filtersToUse.goalkeeperMinutes?.comparison} ${filtersToUse.goalkeeperMinutes?.value}`;
      case 'athleticAid':
        return `Athletic Aid: ${filtersToUse.athleticAid?.join(', ')}`;
      case 'dateRange':
        return `Date Entered: ${filtersToUse.dateRange?.startDate} - ${filtersToUse.dateRange?.endDate}`;
      case 'survey_completed':
        // Handle both array format (from multiple select) and boolean format
        if (Array.isArray(filtersToUse.survey_completed)) {
          if (filtersToUse.survey_completed.includes(true) && filtersToUse.survey_completed.includes(false)) {
            return 'Survey Completed: Yes, No';
          } else if (filtersToUse.survey_completed.includes(true)) {
            return 'Survey Completed: Yes';
          } else if (filtersToUse.survey_completed.includes(false)) {
            return 'Survey Completed: No';
          }
        } else {
          // Handle direct boolean values
          if (filtersToUse.survey_completed === true) return 'Survey Completed: Yes';
          if (filtersToUse.survey_completed === false) return 'Survey Completed: No';
        }
        return '';
      case 'gradStudent':
        // Handle array format for grad student filter
        if (Array.isArray(filtersToUse.gradStudent)) {
          if (filtersToUse.gradStudent.includes(true) && filtersToUse.gradStudent.includes(false)) {
            return 'Grad Student: Yes, No';
          } else if (filtersToUse.gradStudent.includes(true)) {
            return 'Grad Student: Yes';
          } else if (filtersToUse.gradStudent.includes(false)) {
            return 'Grad Student: No';
          }
        }
        return '';
      case 'honors':
        return `Honors: ${filtersToUse.honors?.join(', ')}`;
      case 'designatedStudentAthlete':
        // Handle array format for designated student athlete filter
        if (Array.isArray(filtersToUse.designatedStudentAthlete)) {
          if (filtersToUse.designatedStudentAthlete.includes(true) && filtersToUse.designatedStudentAthlete.includes(false)) {
            return 'Designated Student Athlete: Yes, No';
          } else if (filtersToUse.designatedStudentAthlete.includes(true)) {
            return 'Designated Student Athlete: Yes';
          } else if (filtersToUse.designatedStudentAthlete.includes(false)) {
            return 'Designated Student Athlete: No';
          }
        }
        return '';
      case 'athleticAssociation':
        return `Athletic Association: ${filtersToUse.athleticAssociation?.join(', ')}`;
      case 'jucoRegion':
        return `NJCAA Region: ${filtersToUse.jucoRegion?.join(', ')}`;
      case 'jucoDivision':
        return `NJCAA Division: ${filtersToUse.jucoDivision?.join(', ')}`;
      case 'schoolState':
        return `School State: ${filtersToUse.schoolState?.join(', ')}`;
      case 'conference':
        return `Conference: ${filtersToUse.conference?.join(', ')}`;
      case 'height':
        if (filtersToUse.height) {
          const { comparison, feet, inches, minFeet, minInches, maxFeet, maxInches } = filtersToUse.height;
          if (comparison === 'between') {
            return `Height: ${minFeet}'${minInches || 0}" - ${maxFeet}'${maxInches || 0}"`;
          } else if (comparison === 'min') {
            return `Height: Min ${feet}'${inches || 0}"`;
          } else if (comparison === 'max') {
            return `Height: Max ${feet}'${inches || 0}"`;
          }
        }
        return '';
      case 'hsState':
        return `State: ${filtersToUse.hsState?.join(', ')}`;
      case 'hsCounty':
        return `County: ${filtersToUse.hsCounty?.join(', ')}`;
      case 'hsReligiousAffiliation':
        return `Religious Affiliation: ${filtersToUse.hsReligiousAffiliation?.join(', ')}`;
      case 'hsSchoolType':
        const schoolTypeParts = [];
        if (filtersToUse.hsSchoolType?.schoolType?.length) {
          schoolTypeParts.push(`Type: ${filtersToUse.hsSchoolType.schoolType.join(', ')}`);
        }
        if (filtersToUse.hsSchoolType?.publicPrivate?.length) {
          schoolTypeParts.push(`Private/Public: ${filtersToUse.hsSchoolType.publicPrivate.join(', ')}`);
        }
        return schoolTypeParts.length > 0 ? `School Type: ${schoolTypeParts.join('; ')}` : '';
      case 'hsProspectsScore':
        if (filtersToUse.hsProspectsScore) {
          const { minValue, maxValue } = filtersToUse.hsProspectsScore;
          if (minValue !== undefined && maxValue !== undefined) {
            return `Prospects Score: ${minValue} - ${maxValue}`;
          } else if (minValue !== undefined) {
            return `Prospects Score: Min ${minValue}`;
          } else if (maxValue !== undefined) {
            return `Prospects Score: Max ${maxValue}`;
          }
        }
        return '';
      case 'hsD1ProspectsScore':
        if (filtersToUse.hsD1ProspectsScore) {
          const { minValue, maxValue } = filtersToUse.hsD1ProspectsScore;
          if (minValue !== undefined && maxValue !== undefined) {
            return `D1 Prospects Score: ${minValue} - ${maxValue}`;
          } else if (minValue !== undefined) {
            return `D1 Prospects Score: Min ${minValue}`;
          } else if (maxValue !== undefined) {
            return `D1 Prospects Score: Max ${maxValue}`;
          }
        }
        return '';
      case 'hsTeamQualityScore':
        if (filtersToUse.hsTeamQualityScore) {
          const { minValue, maxValue } = filtersToUse.hsTeamQualityScore;
          if (minValue !== undefined && maxValue !== undefined) {
            return `Team Quality Score: ${minValue} - ${maxValue}`;
          } else if (minValue !== undefined) {
            return `Team Quality Score: Min ${minValue}`;
          } else if (maxValue !== undefined) {
            return `Team Quality Score: Max ${maxValue}`;
          }
        }
        return '';
      case 'hsAthleteIncomeScore':
        if (filtersToUse.hsAthleteIncomeScore) {
          const { minValue, maxValue } = filtersToUse.hsAthleteIncomeScore;
          if (minValue !== undefined && maxValue !== undefined) {
            return `Athlete Income Score: ${minValue} - ${maxValue}`;
          } else if (minValue !== undefined) {
            return `Athlete Income Score: Min ${minValue}`;
          } else if (maxValue !== undefined) {
            return `Athlete Income Score: Max ${maxValue}`;
          }
        }
        return '';
      case 'hsAcademicsScore':
        if (filtersToUse.hsAcademicsScore) {
          const { minValue, maxValue } = filtersToUse.hsAcademicsScore;
          if (minValue !== undefined && maxValue !== undefined) {
            return `Academics Score: ${minValue} - ${maxValue}`;
          } else if (minValue !== undefined) {
            return `Academics Score: Min ${minValue}`;
          } else if (maxValue !== undefined) {
            return `Academics Score: Max ${maxValue}`;
          }
        }
        return '';
      case 'transfer_odds':
        if (filtersToUse.transfer_odds) {
          const { comparison, value } = filtersToUse.transfer_odds;
          if (comparison === 'min' && value !== undefined) {
            return `Transfer Odds: Min ${value}%`;
          } else if (comparison === 'max' && value !== undefined) {
            return `Transfer Odds: Max ${value}%`;
          }
        }
        return '';
      case 'grad_year':
        if (filtersToUse.grad_year) {
          const { comparison, value, minValue, maxValue } = filtersToUse.grad_year;
          if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
            return `Graduation Year: ${minValue} - ${maxValue}`;
          } else if (comparison === 'min' && value !== undefined) {
            return `Graduation Year: Min ${value}`;
          } else if (comparison === 'max' && value !== undefined) {
            return `Graduation Year: Max ${value}`;
          }
        }
        return '';
      case 'weight':
        if (filtersToUse.weight) {
          const { comparison, value, minValue, maxValue } = filtersToUse.weight;
          if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
            return `Weight: ${minValue} - ${maxValue} lbs`;
          } else if (comparison === 'min' && value !== undefined) {
            return `Weight: Min ${value} lbs`;
          } else if (comparison === 'max' && value !== undefined) {
            return `Weight: Max ${value} lbs`;
          }
        }
        return '';
      case 'athletic_projection':
        return `Athletic Projection: ${filtersToUse.athletic_projection?.join(', ')}`;
      case 'best_offer':
        return `Best Offer: ${filtersToUse.best_offer?.join(', ')}`;
      case 'committed':
        return `Committed: ${filtersToUse.committed?.join(', ')}`;
      case 'signed':
        return `Signed: ${filtersToUse.signed?.join(', ')}`;
      case 'gpa':
        if (filtersToUse.gpa) {
          const { comparison, value, minValue, maxValue } = filtersToUse.gpa;
          if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
            return `GPA: ${minValue} - ${maxValue}`;
          } else if (comparison === 'min' && value !== undefined) {
            return `GPA: Min ${value}`;
          } else if (comparison === 'max' && value !== undefined) {
            return `GPA: Max ${value}`;
          }
        }
        return '';
      case 'gpa_type':
        return `GPA Source: ${filtersToUse.gpa_type?.join(', ')}`;
      case 'major':
        return `Major: ${filtersToUse.major}`;
      case 'sat':
        if (filtersToUse.sat) {
          const { comparison, value, minValue, maxValue } = filtersToUse.sat;
          if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
            return `SAT: ${minValue} - ${maxValue}`;
          } else if (comparison === 'min' && value !== undefined) {
            return `SAT: Min ${value}`;
          } else if (comparison === 'max' && value !== undefined) {
            return `SAT: Max ${value}`;
          }
        }
        return '';
      case 'act':
        if (filtersToUse.act) {
          const { comparison, value, minValue, maxValue } = filtersToUse.act;
          if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
            return `ACT: ${minValue} - ${maxValue}`;
          } else if (comparison === 'min' && value !== undefined) {
            return `ACT: Min ${value}`;
          } else if (comparison === 'max' && value !== undefined) {
            return `ACT: Max ${value}`;
          }
        }
        return '';
      case 'income_category':
        return `Income: ${filtersToUse.income_category?.join(', ')}`;
      case 'added_date':
        if (filtersToUse.added_date?.startDate && filtersToUse.added_date?.endDate) {
          return `Date Added: ${filtersToUse.added_date.startDate} - ${filtersToUse.added_date.endDate}`;
        }
        return '';
      case 'last_major_change':
        if (filtersToUse.last_major_change?.startDate && filtersToUse.last_major_change?.endDate) {
          return `Last Major Update: ${filtersToUse.last_major_change.startDate} - ${filtersToUse.last_major_change.endDate}`;
        }
        return '';
      case 'on3_consensus_stars':
        if (filtersToUse.on3_consensus_stars && filtersToUse.on3_consensus_stars.length > 0) {
          return `On3 Consensus Stars: ${filtersToUse.on3_consensus_stars.join(', ')}`;
        }
        return '';
      case 'rivals_rating':
        if (filtersToUse.rivals_rating?.comparison === 'between' && filtersToUse.rivals_rating?.minValue !== undefined && filtersToUse.rivals_rating?.maxValue !== undefined) {
          return `Rivals Rating: ${filtersToUse.rivals_rating.minValue} - ${filtersToUse.rivals_rating.maxValue}`;
        } else if (filtersToUse.rivals_rating?.comparison === 'min' && filtersToUse.rivals_rating?.value !== undefined) {
          return `Rivals Rating: Min ${filtersToUse.rivals_rating.value}`;
        } else if (filtersToUse.rivals_rating?.comparison === 'max' && filtersToUse.rivals_rating?.value !== undefined) {
          return `Rivals Rating: Max ${filtersToUse.rivals_rating.value}`;
        }
        return '';
      case 'on3_rating':
        if (filtersToUse.on3_rating?.comparison === 'between' && filtersToUse.on3_rating?.minValue !== undefined && filtersToUse.on3_rating?.maxValue !== undefined) {
          return `On3 Rating: ${filtersToUse.on3_rating.minValue} - ${filtersToUse.on3_rating.maxValue}`;
        } else if (filtersToUse.on3_rating?.comparison === 'min' && filtersToUse.on3_rating?.value !== undefined) {
          return `On3 Rating: Min ${filtersToUse.on3_rating.value}`;
        } else if (filtersToUse.on3_rating?.comparison === 'max' && filtersToUse.on3_rating?.value !== undefined) {
          return `On3 Rating: Max ${filtersToUse.on3_rating.value}`;
        }
        return '';
      case '_247_rating':
        if (filtersToUse._247_rating?.comparison === 'between' && filtersToUse._247_rating?.minValue !== undefined && filtersToUse._247_rating?.maxValue !== undefined) {
          return `247 Rating: ${filtersToUse._247_rating.minValue} - ${filtersToUse._247_rating.maxValue}`;
        } else if (filtersToUse._247_rating?.comparison === 'min' && filtersToUse._247_rating?.value !== undefined) {
          return `247 Rating: Min ${filtersToUse._247_rating.value}`;
        } else if (filtersToUse._247_rating?.comparison === 'max' && filtersToUse._247_rating?.value !== undefined) {
          return `247 Rating: Max ${filtersToUse._247_rating.value}`;
        }
        return '';
      case 'espn_rating':
        if (filtersToUse.espn_rating?.comparison === 'between' && filtersToUse.espn_rating?.minValue !== undefined && filtersToUse.espn_rating?.maxValue !== undefined) {
          return `ESPN Rating: ${filtersToUse.espn_rating.minValue} - ${filtersToUse.espn_rating.maxValue}`;
        } else if (filtersToUse.espn_rating?.comparison === 'min' && filtersToUse.espn_rating?.value !== undefined) {
          return `ESPN Rating: Min ${filtersToUse.espn_rating.value}`;
        } else if (filtersToUse.espn_rating?.comparison === 'max' && filtersToUse.espn_rating?.value !== undefined) {
          return `ESPN Rating: Max ${filtersToUse.espn_rating.value}`;
        }
        return '';
      case 'on3_stars':
        if (filtersToUse.on3_stars && filtersToUse.on3_stars.length > 0) {
          return `On3 Stars: ${filtersToUse.on3_stars.join(', ')}`;
        }
        return '';
      case '_247_stars':
        if (filtersToUse._247_stars && filtersToUse._247_stars.length > 0) {
          return `247 Stars: ${filtersToUse._247_stars.join(', ')}`;
        }
        return '';
      case 'espn_stars':
        if (filtersToUse.espn_stars && filtersToUse.espn_stars.length > 0) {
          return `ESPN Stars: ${filtersToUse.espn_stars.join(', ')}`;
        }
        return '';
      case 'show_archived':
        return filtersToUse.show_archived ? 'Show Archived: Yes' : '';
      default:
        // Handle dynamic stat filters
        if (key.toString().startsWith('stat_')) {
          const dataTypeId = key.toString().replace('stat_', '');
          const column = filterColumns.find(col => col.data_type_id.toString() === dataTypeId);
          const filterValue = filtersToUse[key];
          
          // Use display_name or data_type_name as fallback, or the key itself as last resort
          let columnName = column?.display_name || column?.data_type_name || `Stat ${dataTypeId}`;
          
          // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
          // Exclude position-agnostic stats like GP (Games Played)
          const isBaseball = Number(column?.sport_id) === 6;
          const isPositionAgnostic = column?.display_name === 'GP' || column?.display_name === 'GS' || 
                                          column?.data_type_id === 98 || column?.data_type_id === 83;
          if (isBaseball && column?.stat_category && !isPositionAgnostic) {
            const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
            columnName = `${categoryPrefix} - ${columnName}`;
          }
          
          if (filterValue && typeof filterValue === 'object' && 'comparison' in filterValue) {
            const isTimeBased = column ? isTimeBasedStat(column) : false;
            
            if (filterValue.comparison === 'between' && 'minValue' in filterValue && 'maxValue' in filterValue) {
              const minDisplay = isTimeBased ? formatTimeValue(filterValue.minValue) : filterValue.minValue;
              const maxDisplay = isTimeBased ? formatTimeValue(filterValue.maxValue) : filterValue.maxValue;
              return `${columnName} between ${minDisplay} - ${maxDisplay}`;
            } else if ('value' in filterValue) {
              const comparisonLabel = filterValue.comparison === 'min' ? 'Min' : 
                                    filterValue.comparison === 'less' ? 'Max' : 
                                    filterValue.comparison;
              const valueDisplay = isTimeBased ? formatTimeValue(filterValue.value) : filterValue.value;
              return `${columnName} ${comparisonLabel} ${valueDisplay}`;
            }
          }
        }
        return '';
    }
  };

  const renderFilterBadges = () => {
    return Object.keys(appliedFilters).map((key) => (
      <div key={key} className="filter-badge">
        <span>{getFilterLabel(key as keyof FilterState)}</span>
        <i 
          className="icon-xmark-regular" 
          onClick={() => handleRemoveFilter(key as keyof FilterState)}
          style={{ cursor: 'pointer' }}
        ></i>
      </div>
    ));
  };

  const handleApplyFilters = () => {
    // Create a filtered version of filterState that excludes transfer_odds if conditions aren't met
    const filteredState = { ...filterState };
    
    // Only include transfer_odds filter if:
    // 1. Transfer Odds section was expanded when save was clicked, OR
    // 2. The value is not the default (80) or comparison is not 'min'
    if (filteredState.transfer_odds) {
      const isDefaultValue = filteredState.transfer_odds.comparison === 'min' && 
                             filteredState.transfer_odds.value === 80;
      
      if (!isTransferOddsExpanded && isDefaultValue) {
        // Remove transfer_odds filter if section wasn't expanded and it's the default value
        delete filteredState.transfer_odds;
      }
    }
    
    setAppliedFilters(filteredState);
    onApplyFilters(filteredState);
    setIsPanelOpen(false);
  };

  const handleReset = () => {
    setFilterState({});
    setAppliedFilters({});
    onResetFilters();
  };

  // Generate stats filter options for dropdown
  const generateStatsOptions = () => {
    return filterColumns.map((column) => ({
      value: column.data_type_id.toString(),
      label: column.data_type_name
    }));
  };

  // Handle stat selection change
  const handleStatSelectionChange = (selectedStatId: string) => {
    if (selectedStatId) {
      // Add the selected stat filter if it doesn't already exist
      if (!filterState[`stat_${selectedStatId}`]) {
        const column = filterColumns.find(col => col.data_type_id.toString() === selectedStatId);
        const defaultComparison = column && isTimeBasedStat(column) ? 'less' : 'min';
        handleFilterChange(`stat_${selectedStatId}`, { comparison: defaultComparison, value: 0 });
      }
    }
    
    // Force the dropdown to reset by changing its key
    setDropdownKey(prev => prev + 1);
  };

  // Get all selected stats
  const getSelectedStats = () => {
    return Object.keys(filterState).filter(key => key.startsWith('stat_')).map(key => key.replace('stat_', ''));
  };

  // Get available stats (excluding already selected ones)
  const getAvailableStats = () => {
    const selectedStatIds = getSelectedStats();
    return filterColumns.filter(column => {
      // Exclude already selected stats
      if (selectedStatIds.includes(column.data_type_id.toString())) {
        return false;
      }
      
      // For juco data source, only include stats where juco_stat is true
      if (dataSource === 'juco' && !column.juco_stat) {
        return false;
      }
      
      return true;
    });
  };

  // Get active keys for the collapse component
  const getActiveKeys = () => {
    const activeKeys: string[] = [];
    
    // Check which sections have active filters
    if (appliedFilters.height) activeKeys.push("height");
    if (appliedFilters.position?.length) activeKeys.push("1");
    if (appliedFilters.divisions?.length) activeKeys.push("2");
    if (appliedFilters.location || appliedFilters.states?.length || appliedFilters.international?.length) activeKeys.push("location");
    if (appliedFilters.schools?.length) activeKeys.push("schools");
    if (appliedFilters.years?.length) activeKeys.push("3");
    
    const activeStatKeys = Object.keys(appliedFilters).filter(key => key.startsWith('stat_'));
    if (activeStatKeys.length > 0) activeKeys.push("stats");
    
    if (appliedFilters.athleticAid?.length) {
      activeKeys.push("4");
    }
    if (appliedFilters.status?.length) {
      activeKeys.push("5");
    }
    if (appliedFilters.dateRange?.startDate || appliedFilters.dateRange?.endDate) {
      activeKeys.push("6");
    }
    if (appliedFilters.survey_completed !== undefined) {
      activeKeys.push("7");
    }
    if (appliedFilters.gradStudent !== undefined) {
      activeKeys.push("8");
    }
    if (appliedFilters.honors?.length && shouldShowHonorsFilter()) {
      activeKeys.push("9");
    }
    if (appliedFilters.designatedStudentAthlete !== undefined) {
      activeKeys.push("10");
    }
    
    // JUCO-specific filters
    if (appliedFilters.athleticAssociation?.length) {
      activeKeys.push("juco-athletic-association");
    }
    if (appliedFilters.jucoRegion?.length) {
      activeKeys.push("juco-region");
    }
    if (appliedFilters.jucoDivision?.length) {
      activeKeys.push("juco-division");
    }
    if (appliedFilters.schoolState?.length) {
      activeKeys.push("juco-school-state");
    }
    if (appliedFilters.conference?.length) {
      activeKeys.push("conference");
    }
    
    // High school-specific filters
    if (appliedFilters.hsState?.length) {
      activeKeys.push("hs-state");
    }
    if (appliedFilters.hsCounty?.length) {
      activeKeys.push("hs-county");
    }
    if (appliedFilters.hsReligiousAffiliation?.length) {
      activeKeys.push("hs-religious-affiliation");
    }
    if (appliedFilters.hsSchoolType?.schoolType?.length || appliedFilters.hsSchoolType?.publicPrivate?.length) {
      activeKeys.push("hs-school-type");
    }
    if (appliedFilters.hsProspectsScore?.minValue !== undefined || appliedFilters.hsProspectsScore?.maxValue !== undefined) {
      activeKeys.push("hs-prospects-score");
    }
    if (appliedFilters.hsD1ProspectsScore?.minValue !== undefined || appliedFilters.hsD1ProspectsScore?.maxValue !== undefined) {
      activeKeys.push("hs-d1-prospects-score");
    }
    if (appliedFilters.hsTeamQualityScore?.minValue !== undefined || appliedFilters.hsTeamQualityScore?.maxValue !== undefined) {
      activeKeys.push("hs-team-quality-score");
    }
    if (appliedFilters.hsAthleteIncomeScore?.minValue !== undefined || appliedFilters.hsAthleteIncomeScore?.maxValue !== undefined) {
      activeKeys.push("hs-athlete-income-score");
    }
    if (appliedFilters.hsAcademicsScore?.minValue !== undefined || appliedFilters.hsAcademicsScore?.maxValue !== undefined) {
      activeKeys.push("hs-academics-score");
    }
    if (appliedFilters.transfer_odds?.value !== undefined) {
      activeKeys.push("transfer-odds");
    }
    if (appliedFilters.grad_year?.value !== undefined || appliedFilters.grad_year?.minValue !== undefined || appliedFilters.grad_year?.maxValue !== undefined) {
      activeKeys.push("grad_year");
    }
    if (appliedFilters.weight?.value !== undefined || appliedFilters.weight?.minValue !== undefined || appliedFilters.weight?.maxValue !== undefined) {
      activeKeys.push("weight");
    }
    if (appliedFilters.athletic_projection?.length) {
      activeKeys.push("athletic_projection");
    }
    if (appliedFilters.best_offer?.length || appliedFilters.committed?.length || appliedFilters.signed?.length) {
      activeKeys.push("offer-commit");
    }
    if (appliedFilters.gpa?.value !== undefined || appliedFilters.gpa?.minValue !== undefined || appliedFilters.gpa?.maxValue !== undefined || 
        appliedFilters.gpa_type?.length || appliedFilters.major || appliedFilters.sat?.value !== undefined || 
        appliedFilters.sat?.minValue !== undefined || appliedFilters.sat?.maxValue !== undefined || 
        appliedFilters.act?.value !== undefined || appliedFilters.act?.minValue !== undefined || 
        appliedFilters.act?.maxValue !== undefined || appliedFilters.income_category?.length) {
      activeKeys.push("academics-income");
    }
    if (appliedFilters.added_date?.startDate || appliedFilters.added_date?.endDate || 
        appliedFilters.last_major_change?.startDate || appliedFilters.last_major_change?.endDate || 
        appliedFilters.show_archived) {
      activeKeys.push("verified-filters");
    }
    if (appliedFilters.on3_consensus_stars?.length || 
        appliedFilters.rivals_rating?.value !== undefined || appliedFilters.rivals_rating?.minValue !== undefined || appliedFilters.rivals_rating?.maxValue !== undefined ||
        appliedFilters.on3_rating?.value !== undefined || appliedFilters.on3_rating?.minValue !== undefined || appliedFilters.on3_rating?.maxValue !== undefined ||
        appliedFilters._247_rating?.value !== undefined || appliedFilters._247_rating?.minValue !== undefined || appliedFilters._247_rating?.maxValue !== undefined ||
        appliedFilters.espn_rating?.value !== undefined || appliedFilters.espn_rating?.minValue !== undefined || appliedFilters.espn_rating?.maxValue !== undefined ||
        appliedFilters.on3_stars?.length || appliedFilters._247_stars?.length || appliedFilters.espn_stars?.length) {
      activeKeys.push("recruiting-service-ratings");
    }
    
    return activeKeys;
  };

  // Remove a specific stat filter
  const removeStatFilter = (statId: string) => {
    const newFilterState = { ...filterState };
    delete newFilterState[`stat_${statId}`];
    setFilterState(newFilterState);
  };

  // Handle unified location filter selection
  const handleLocationTypeSelection = (selectedType: string) => {
    if (selectedType) {
      // Initialize the location filter with the selected type
      handleFilterChange('location', {
        type: selectedType as any,
        values: []
      });
    }
    
    // Force the dropdown to reset by changing its key
    setLocationTypeDropdownKey(prev => prev + 1);
  };

  // Check if current location filter type is available for current data source
  const isCurrentLocationTypeAvailable = () => {
    if (!filterState.location?.type) return true;
    const availableOptions = getAvailableLocationOptions();
    return availableOptions.some(option => option.value === filterState.location?.type);
  };

  // Clear location filter if current type is not available
  useEffect(() => {
    if (filterState.location && !isCurrentLocationTypeAvailable()) {
      handleFilterChange('location', undefined);
    }
  }, [dataSource]);

  // Handle location filter selection (states or international) - legacy
  const handleLocationSelectionChange = (selectedType: string) => {
    if (selectedType) {
      // Add the selected location filter if it doesn't already exist
      if (selectedType === 'states' && !filterState.states) {
        handleFilterChange('states', []);
      } else if (selectedType === 'international' && !filterState.international) {
        handleFilterChange('international', []);
      }
    }
    
    // Force the dropdown to reset by changing its key
    setLocationDropdownKey(prev => prev + 1);
  };

  // Get available location filter types (excluding already selected ones)
  const getAvailableLocationTypes = () => {
    const availableTypes = [];
    if (filterState.states === undefined) {
      availableTypes.push({ value: 'states', label: 'Hometown State' });
    }
    if (filterState.international === undefined) {
      availableTypes.push({ value: 'international', label: 'International Location' });
    }
    return availableTypes;
  };

  // Remove unified location filter
  const removeUnifiedLocationFilter = () => {
    const newFilterState = { ...filterState };
    delete newFilterState.location;
    setFilterState(newFilterState);
    setSelectedLocation(null);
  };

  // Handle location search for radius filter
  const handleLocationSearch = async (value: string) => {
    if (!value || value.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      setLocationSearchLoading(true);
      const suggestions = await getLocationSuggestions(value);
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching locations:', error);
      setLocationSuggestions([]);
    } finally {
      setLocationSearchLoading(false);
    }
  };

  // Handle location selection for radius filter
  const handleLocationSelect = (location: GeocodingResult) => {
    setSelectedLocation(location);
    setLocationSuggestions([]);
    
    // Update the filter state with the selected location
    handleFilterChange('location', {
      ...filterState.location,
      radius: {
        center: location.formatted_address,
        distance: filterState.location?.radius?.distance || 25
      }
    });
  };

  // Handle radius distance change
  const handleRadiusChange = (distance: number | null) => {
    if (selectedLocation && distance) {
      handleFilterChange('location', {
        ...filterState.location,
        radius: {
          center: selectedLocation.formatted_address,
          distance: distance
        }
      });
    }
  };

  // Handle coach selection for recruiting area
  const handleCoachSelect = async (coachId: string) => {
    const selectedCoachData = coaches.find(coach => coach.id === coachId);
    
    // Don't allow selection of coaches without active areas
    if (!selectedCoachData?.hasActiveAreas) {
      return;
    }
    
    setSelectedCoach(coachId);
    
    try {
      const recruitingAreas = await fetchRecruitingAreasForCoach(coachId);
      
      // Build the recruiting area filter
      const recruitingAreaData = {
        coachId,
        stateIds: recruitingAreas.stateIds,
        countyIds: recruitingAreas.countyIds,
        schoolIds: recruitingAreas.schoolIds
      };
      
      
      const newLocationFilter = {
        type: 'recruiting_area',
        values: [],
        recruitingArea: recruitingAreaData
      };
      
      
      handleFilterChange('location', newLocationFilter);
      
    } catch (error) {
      console.error('❌ Error loading recruiting areas:', error);
    }
  };

  // Remove a specific location filter (legacy)
  const removeLocationFilter = (filterType: string) => {
    const newFilterState = { ...filterState };
    delete newFilterState[filterType];
    setFilterState(newFilterState);
  };

  const baseItems: CollapseProps["items"] = [
    {
      key: "1",
      label: <span>Position</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select positions"
            style={{ width: '100%' }}
            value={filterState.position}
            onChange={value => handleFilterChange('position', value)}
            options={positions.map(pos => ({ value: pos.name, label: pos.name }))}
          />
        </Flex>
      ),
    },
    {
      key: "2",
      label: <span>Division</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select divisions"
            style={{ width: '100%' }}
            value={filterState.divisions}
            onChange={value => handleFilterChange('divisions', value)}
            options={[
              { value: 'D1', label: 'D1' },
              { value: 'D2', label: 'D2' },
              { value: 'D3', label: 'D3' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "3",
      label: <span>Year</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select years"
            style={{ width: '100%' }}
            value={filterState.years}
            onChange={value => handleFilterChange('years', value)}
            options={dataSource === 'juco' ? [
              { value: 'FR', label: 'Freshman' },
              { value: 'SO', label: 'Sophomore' },
              { value: 'RFR', label: 'Redshirt Freshman' },
              { value: 'RSO', label: 'Redshirt Sophomore' }
            ] : [
              { value: 'FR', label: 'Freshman' },
              { value: 'SO', label: 'Sophomore' },
              { value: 'JR', label: 'Junior' },
              { value: 'SR', label: 'Senior' },
              { value: 'RFR', label: 'Redshirt Freshman' },
              { value: 'RSO', label: 'Redshirt Sophomore' },
              { value: 'RJR', label: 'Redshirt Junior' },
              { value: 'RSR', label: 'Redshirt Senior' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "height",
      label: <span>Height</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.height?.comparison}
            style={{ width: '100%' }}
            placeholder="Select comparison"
            onChange={value => handleFilterChange('height', { 
              ...filterState.height,
              comparison: value 
            })}
            options={compareOptions}
          />
          {filterState.height?.comparison === 'between' ? (
            <>
              <Flex gap={8}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={4}
                  max={8}
                  placeholder="Min feet"
                  value={filterState.height?.minFeet}
                  onChange={value => handleFilterChange('height', {
                    ...filterState.height,
                    minFeet: value
                  })}
                />
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  max={11}
                  placeholder="Min inches"
                  value={filterState.height?.minInches}
                  onChange={value => handleFilterChange('height', {
                    ...filterState.height,
                    minInches: value
                  })}
                />
              </Flex>
              <Flex gap={8}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={4}
                  max={8}
                  placeholder="Max feet"
                  value={filterState.height?.maxFeet}
                  onChange={value => handleFilterChange('height', {
                    ...filterState.height,
                    maxFeet: value
                  })}
                />
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  max={11}
                  placeholder="Max inches"
                  value={filterState.height?.maxInches}
                  onChange={value => handleFilterChange('height', {
                    ...filterState.height,
                    maxInches: value
                  })}
                />
              </Flex>
            </>
          ) : (
            <Flex gap={8}>
              <InputNumber
                style={{ flex: 1 }}
                min={4}
                max={8}
                placeholder="Feet"
                value={filterState.height?.feet}
                onChange={value => handleFilterChange('height', {
                  ...filterState.height,
                  feet: value
                })}
              />
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={11}
                placeholder="Inches"
                value={filterState.height?.inches}
                onChange={value => handleFilterChange('height', {
                  ...filterState.height,
                  inches: value
                })}
              />
            </Flex>
          )}
        </Flex>
      ),
    },
    {
      key: "4",
      label: <span>Athletic Aid</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select aid status"
            style={{ width: '100%' }}
            value={filterState.athleticAid}
            onChange={value => handleFilterChange('athleticAid', value)}
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'Partial (50% or more)', label: 'Partial (50% or more)' },
              { value: 'Partial (less than 50%)', label: 'Partial (less than 50%)' },
              { value: 'None', label: 'None' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "5",
      label: <span>Status</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select status"
            style={{ width: '100%' }}
            value={filterState.status}
            onChange={value => handleFilterChange('status', value)}
            options={statusOptions}
          />
        </Flex>
      ),
    },
    {
      key: "6",
      label: <span>Date Entered</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Input 
            type="date" 
            placeholder="Start Date"
            value={filterState.dateRange?.startDate}
            onChange={e => handleFilterChange('dateRange', {
              ...filterState.dateRange,
              startDate: e.target.value
            })}
          />
          <Input 
            type="date" 
            placeholder="End Date"
            value={filterState.dateRange?.endDate || new Date().toISOString().split('T')[0]}
            onChange={e => handleFilterChange('dateRange', {
              ...filterState.dateRange,
              endDate: e.target.value
            })}
          />
        </Flex>
      ),
    },
    {
      key: "7",
      label: <h6>Survey Completed</h6>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select survey completion status"
            style={{ width: '100%' }}
            value={filterState.survey_completed}
            onChange={value => handleFilterChange('survey_completed', value)}
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "8",
      label: <h6>Grad Student</h6>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select grad student status"
            style={{ width: '100%' }}
            value={filterState.gradStudent}
            onChange={value => handleFilterChange('gradStudent', value)}
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "9",
      label: <h6>Honors</h6>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            placeholder="Select honors level"
            style={{ width: '100%' }}
            value={filterState.honors?.[0]}
            onChange={value => handleFilterChange('honors', value ? [value] : [])}
            allowClear
            options={[
              { value: 'All American', label: 'All American' },
              { value: 'All Region', label: 'All Region' },
              { value: 'All Conference', label: 'All Conference' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "10",
      label: <h6>Designated Student Athlete</h6>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select designated student athlete status"
            style={{ width: '100%' }}
            value={filterState.designatedStudentAthlete}
            onChange={value => handleFilterChange('designatedStudentAthlete', value)}
            options={[
              { value: true, label: 'Yes' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "grad_year",
      label: <span>Graduation Year</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.grad_year?.comparison}
            style={{ width: '100%' }}
            placeholder="Select comparison"
            onChange={value => handleFilterChange('grad_year', { 
              ...filterState.grad_year,
              comparison: value 
            })}
            options={compareOptions}
          />
          {filterState.grad_year?.comparison === 'between' ? (
            <>
              <InputNumber
                style={{ flex: 1 }}
                min={2020}
                max={2030}
                placeholder="Min year"
                value={filterState.grad_year?.minValue}
                onChange={value => handleFilterChange('grad_year', {
                  ...filterState.grad_year,
                  minValue: value
                })}
              />
              <InputNumber
                style={{ flex: 1 }}
                min={2020}
                max={2030}
                placeholder="Max year"
                value={filterState.grad_year?.maxValue}
                onChange={value => handleFilterChange('grad_year', {
                  ...filterState.grad_year,
                  maxValue: value
                })}
              />
            </>
          ) : (
            <InputNumber
              style={{ width: '100%' }}
              min={2020}
              max={2030}
              placeholder="Graduation year"
              value={filterState.grad_year?.value}
              onChange={value => handleFilterChange('grad_year', {
                ...filterState.grad_year,
                value: value
              })}
            />
          )}
        </Flex>
      ),
    },
    {
      key: "weight",
      label: <span>Weight</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.weight?.comparison}
            style={{ width: '100%' }}
            placeholder="Select comparison"
            onChange={value => handleFilterChange('weight', { 
              ...filterState.weight,
              comparison: value 
            })}
            options={compareOptions}
          />
          {filterState.weight?.comparison === 'between' ? (
            <>
              <InputNumber
                style={{ flex: 1 }}
                min={100}
                max={400}
                placeholder="Min weight"
                value={filterState.weight?.minValue}
                onChange={value => handleFilterChange('weight', {
                  ...filterState.weight,
                  minValue: value
                })}
                addonAfter="lbs"
              />
              <InputNumber
                style={{ flex: 1 }}
                min={100}
                max={400}
                placeholder="Max weight"
                value={filterState.weight?.maxValue}
                onChange={value => handleFilterChange('weight', {
                  ...filterState.weight,
                  maxValue: value
                })}
                addonAfter="lbs"
              />
            </>
          ) : (
            <InputNumber
              style={{ width: '100%' }}
              min={100}
              max={400}
              placeholder="Weight"
              value={filterState.weight?.value}
              onChange={value => handleFilterChange('weight', {
                ...filterState.weight,
                value: value
              })}
              addonAfter="lbs"
            />
          )}
        </Flex>
      ),
    },
    {
      key: "athletic_projection",
      label: <span>Athletic Projection</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select athletic projection"
            style={{ width: '100%' }}
            value={filterState.athletic_projection}
            onChange={value => handleFilterChange('athletic_projection', value)}
            options={[
              { value: 'FBS P4 - Top half', label: 'FBS P4 - Top half' },
              { value: 'FBS P4', label: 'FBS P4' },
              { value: 'FBS G5 - Top half', label: 'FBS G5 - Top half' },
              { value: 'FBS G5', label: 'FBS G5' },
              { value: 'FCS - Full Scholarship', label: 'FCS - Full Scholarship' },
              { value: 'FCS', label: 'FCS' },
              { value: 'D2 - Top half', label: 'D2 - Top half' },
              { value: 'D2', label: 'D2' },
              { value: 'D3 - Top half', label: 'D3 - Top half' },
              { value: 'D3', label: 'D3' },
              { value: 'D3 Walk-on', label: 'D3 Walk-on' }
            ]}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Flex>
      ),
    },
    {
      key: "gpa",
      label: <span>GPA</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.gpa?.comparison}
            onChange={value => {
              console.log('GPA Comparison Change:', { 
                oldFilter: filterState.gpa, 
                newComparison: value,
                currentValue: filterState.gpa?.value
              });
              handleFilterChange('gpa', { ...filterState.gpa, comparison: value });
            }}
            placeholder="Select comparison type"
            style={{ width: '100%' }}
            options={[
              { value: 'min', label: 'Min' },
              { value: 'max', label: 'Max' },
              { value: 'between', label: 'Between' }
            ]}
          />
          {filterState.gpa?.comparison === 'between' ? (
            <Flex gap={8}>
              <InputNumber
                placeholder="Min GPA"
                value={filterState.gpa?.minValue}
                onChange={value => handleFilterChange('gpa', { ...filterState.gpa, minValue: value })}
                min={0}
                max={4.0}
                step={0.1}
                style={{ width: '50%' }}
              />
              <InputNumber
                placeholder="Max GPA"
                value={filterState.gpa?.maxValue}
                onChange={value => handleFilterChange('gpa', { ...filterState.gpa, maxValue: value })}
                min={0}
                max={4.0}
                step={0.1}
                style={{ width: '50%' }}
              />
            </Flex>
          ) : (
            <InputNumber
              placeholder={filterState.gpa?.comparison === 'min' ? 'Min GPA' : filterState.gpa?.comparison === 'max' ? 'Max GPA' : 'Select comparison type first'}
              value={filterState.gpa?.value}
              onChange={value => {
                const newGpaFilter = { 
                  ...filterState.gpa, 
                  value,
                  comparison: filterState.gpa?.comparison
                };
                console.log('GPA Filter Change:', { 
                  oldFilter: filterState.gpa, 
                  newFilter: newGpaFilter,
                  value,
                  comparison: newGpaFilter.comparison
                });
                handleFilterChange('gpa', newGpaFilter);
              }}
              disabled={!filterState.gpa?.comparison}
              min={0}
              max={4.0}
              step={0.1}
              style={{ width: '100%' }}
            />
          )}
        </Flex>
      ),
    },
    {
      key: "gpa_type",
      label: <span>GPA Source</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select GPA source"
            style={{ width: '100%' }}
            value={filterState.gpa_type}
            onChange={value => handleFilterChange('gpa_type', value)}
            options={[
              { value: 'Verified Transcript', label: 'Verified Transcript' },
              { value: 'HS Coach (Adjusted)', label: 'HS Coach (Adjusted)' },
              { value: 'Predicted', label: 'Predicted' }
            ]}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Flex>
      ),
    },
    {
      key: "major",
      label: <span>Major</span>,
      children: (
        <Flex vertical className="mb-3">
          <Input
            placeholder="Enter major (e.g., Business, Engineering)"
            value={filterState.major}
            onChange={e => handleFilterChange('major', e.target.value)}
            style={{ width: '100%' }}
          />
        </Flex>
      ),
    },
    {
      key: "sat",
      label: <span>SAT</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.sat?.comparison}
            onChange={value => handleFilterChange('sat', { ...filterState.sat, comparison: value })}
            placeholder="Select comparison type"
            style={{ width: '100%' }}
            options={[
              { value: 'min', label: 'Min' },
              { value: 'max', label: 'Max' },
              { value: 'between', label: 'Between' }
            ]}
          />
          {filterState.sat?.comparison === 'between' ? (
            <Flex gap={8}>
              <InputNumber
                placeholder="Min SAT"
                value={filterState.sat?.minValue}
                onChange={value => handleFilterChange('sat', { ...filterState.sat, minValue: value })}
                min={400}
                max={1600}
                style={{ width: '50%' }}
              />
              <InputNumber
                placeholder="Max SAT"
                value={filterState.sat?.maxValue}
                onChange={value => handleFilterChange('sat', { ...filterState.sat, maxValue: value })}
                min={400}
                max={1600}
                style={{ width: '50%' }}
              />
            </Flex>
          ) : (
            <InputNumber
              placeholder={filterState.sat?.comparison === 'min' ? 'Min SAT' : filterState.sat?.comparison === 'max' ? 'Max SAT' : 'Select comparison type first'}
              value={filterState.sat?.value}
              onChange={value => {
                const newSatFilter = { 
                  ...filterState.sat, 
                  value,
                  comparison: filterState.sat?.comparison
                };
                console.log('SAT Filter Change:', { 
                  oldFilter: filterState.sat, 
                  newFilter: newSatFilter,
                  value,
                  comparison: newSatFilter.comparison
                });
                handleFilterChange('sat', newSatFilter);
              }}
              disabled={!filterState.sat?.comparison}
              min={400}
              max={1600}
              style={{ width: '100%' }}
            />
          )}
        </Flex>
      ),
    },
    {
      key: "act",
      label: <span>ACT</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.act?.comparison}
            onChange={value => handleFilterChange('act', { ...filterState.act, comparison: value })}
            placeholder="Select comparison type"
            style={{ width: '100%' }}
            options={[
              { value: 'min', label: 'Min' },
              { value: 'max', label: 'Max' },
              { value: 'between', label: 'Between' }
            ]}
          />
          {filterState.act?.comparison === 'between' ? (
            <Flex gap={8}>
              <InputNumber
                placeholder="Min ACT"
                value={filterState.act?.minValue}
                onChange={value => handleFilterChange('act', { ...filterState.act, minValue: value })}
                min={1}
                max={36}
                style={{ width: '50%' }}
              />
              <InputNumber
                placeholder="Max ACT"
                value={filterState.act?.maxValue}
                onChange={value => handleFilterChange('act', { ...filterState.act, maxValue: value })}
                min={1}
                max={36}
                style={{ width: '50%' }}
              />
            </Flex>
          ) : (
            <InputNumber
              placeholder={filterState.act?.comparison === 'min' ? 'Min ACT' : filterState.act?.comparison === 'max' ? 'Max ACT' : 'Select comparison type first'}
              value={filterState.act?.value}
              onChange={value => {
                const newActFilter = { 
                  ...filterState.act, 
                  value,
                  comparison: filterState.act?.comparison
                };
                console.log('ACT Filter Change:', { 
                  oldFilter: filterState.act, 
                  newFilter: newActFilter,
                  value,
                  comparison: newActFilter.comparison
                });
                handleFilterChange('act', newActFilter);
              }}
              disabled={!filterState.act?.comparison}
              min={1}
              max={36}
              style={{ width: '100%' }}
            />
          )}
        </Flex>
      ),
    },
    {
      key: "income_category",
      label: <span>Income</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select income category"
            style={{ width: '100%' }}
            value={filterState.income_category}
            onChange={value => handleFilterChange('income_category', value)}
            options={[
              { value: 'Very High EFC', label: 'Very High EFC' },
              { value: 'High EFC', label: 'High EFC' },
              { value: 'Average EFC', label: 'Average EFC' },
              { value: 'Low EFC', label: 'Low EFC' }
            ]}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Flex>
      ),
    },
    {
      key: "added_date",
      label: <span>Date Added</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            value={filterState.added_date?.startDate && filterState.added_date?.endDate ? [
              dayjs(filterState.added_date.startDate),
              dayjs(filterState.added_date.endDate)
            ] : null}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                handleFilterChange('added_date', {
                  startDate: dates[0].format('YYYY-MM-DD'),
                  endDate: dates[1].format('YYYY-MM-DD')
                });
              } else {
                handleFilterChange('added_date', undefined);
              }
            }}
            placeholder={['Start Date', 'End Date']}
          />
        </Flex>
      ),
    },
    {
      key: "last_major_change",
      label: <span>Last Major Update</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <DatePicker.RangePicker
            style={{ width: '100%' }}
            value={filterState.last_major_change?.startDate && filterState.last_major_change?.endDate ? [
              dayjs(filterState.last_major_change.startDate),
              dayjs(filterState.last_major_change.endDate)
            ] : null}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                handleFilterChange('last_major_change', {
                  startDate: dates[0].format('YYYY-MM-DD'),
                  endDate: dates[1].format('YYYY-MM-DD')
                });
              } else {
                handleFilterChange('last_major_change', undefined);
              }
            }}
            placeholder={['Start Date', 'End Date']}
          />
        </Flex>
      ),
    },
    {
      key: "show_archived",
      label: <span>Show Archived Athletes</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#f5f5f5',
            opacity: 0.6
          }}>
            <Flex align="center" gap={8}>
              <Checkbox 
                disabled
                checked={false}
              />
              <span style={{ color: '#666' }}>Coming Soon</span>
            </Flex>
            <div style={{ 
              fontSize: '12px', 
              color: '#999', 
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              This feature will be available in a future update
            </div>
          </div>
        </Flex>
      ),
    }
  ];

  // Helper function to check if Honors filter should be shown
  const shouldShowHonorsFilter = () => {
    // Only show Honors filter for transfer_portal and all_athletes data sources
    if (dataSource !== 'transfer_portal' && dataSource !== 'all_athletes') {
      return false;
    }
    
    // Only show for specific sports: MSOC, WSOC, WBB, MBB, WVOL, FB
    const honorsSports = ['msoc', 'wsoc', 'wbb', 'mbb', 'wvol', 'fb'];
    return activeSportAbbrev && honorsSports.includes(activeSportAbbrev.toLowerCase());
  };

  // Helper function to filter items based on dataSource configuration
  const filterItemsByDataSource = (items: CollapseProps["items"]) => {
    const config = FILTER_VISIBILITY_CONFIG[dataSource];
    if (!config) return items;
    
    return items?.filter(item => {
      if (!item?.key) return false;
      const keyStr = item.key.toString();
      
      // Special handling for Honors filter (key "9")
      if (keyStr === '9') {
        return shouldShowHonorsFilter();
      }
      
      // Special handling for Status filter (key "5")
      if (keyStr === '5') {
        return shouldShowStatusFilter();
      }
      
      // Special handling for Transfer Odds filter (key "transfer-odds")
      if (keyStr === 'transfer-odds') {
        return shouldShowTransferOddsFilter();
      }
      
      return config.visible.includes(keyStr as never);
    }) || [];
  };

  // Create items with Hometown Location and Stats
  const itemsWithStats: CollapseProps["items"] = [
    baseItems[11], // Graduation Year (first)
    ...baseItems.slice(0, 3), // Position, Division, Year
    baseItems[3], // Height
    baseItems[12], // Weight (after height)
    baseItems[13], // Athletic Projection (after weight)
    {
      key: "offer-commit",
      label: <span>Offer/Commit</span>,
      children: (
        <Flex vertical className="mb-3" gap={16}>
          {/* Best Offer Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Best Offer</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select best offer level"
              style={{ width: '100%' }}
              value={filterState.best_offer}
              onChange={value => handleFilterChange('best_offer', value)}
              options={[
                { value: 'P4', label: 'P4' },
                { value: 'G5', label: 'G5' },
                { value: 'FCS', label: 'FCS' },
                { value: 'D2/NAIA', label: 'D2/NAIA' },
                { value: 'D3', label: 'D3' },
                { value: 'None', label: 'None' }
              ]}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
          
          {/* Committed Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Committed</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select commitment status"
              style={{ width: '100%' }}
              value={filterState.committed}
              onChange={value => handleFilterChange('committed', value)}
              options={[
                { value: 'Committed', label: 'Committed' },
                { value: 'Uncommitted', label: 'Uncommitted' }
              ]}
            />
          </div>
          
          {/* Signed Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Signed</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select signing status"
              style={{ width: '100%' }}
              value={filterState.signed}
              onChange={value => handleFilterChange('signed', value)}
              options={[
                { value: 'Signed', label: 'Signed' },
                { value: 'Unsigned', label: 'Unsigned' }
              ]}
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "academics-income",
      label: <span>Academics/Income</span>,
      children: (
        <Flex vertical className="mb-3" gap={16}>
          {/* GPA Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>GPA</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState.gpa?.comparison}
                onChange={value => handleFilterChange('gpa', { ...filterState.gpa, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState.gpa?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min GPA"
                    value={filterState.gpa?.minValue}
                    onChange={value => handleFilterChange('gpa', { ...filterState.gpa, minValue: value })}
                    min={0}
                    max={4.0}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max GPA"
                    value={filterState.gpa?.maxValue}
                    onChange={value => handleFilterChange('gpa', { ...filterState.gpa, maxValue: value })}
                    min={0}
                    max={4.0}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState.gpa?.comparison === 'min' ? 'Min GPA' : filterState.gpa?.comparison === 'max' ? 'Max GPA' : 'Select comparison type first'}
                  value={filterState.gpa?.value}
                  onChange={value => {
                    const newGpaFilter = { 
                      ...filterState.gpa, 
                      value,
                      comparison: filterState.gpa?.comparison
                    };
                    handleFilterChange('gpa', newGpaFilter);
                  }}
                  disabled={!filterState.gpa?.comparison}
                  min={0}
                  max={4.0}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* GPA Source Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>GPA Source</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select GPA source"
              style={{ width: '100%' }}
              value={filterState.gpa_type}
              onChange={value => handleFilterChange('gpa_type', value)}
              options={[
                { value: 'Verified Transcript', label: 'Verified Transcript' },
                { value: 'HS Coach (Adjusted)', label: 'HS Coach (Adjusted)' },
                { value: 'Predicted', label: 'Predicted' }
              ]}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
          
          {/* Major Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Major</strong>
            </Flex>
            <Input
              placeholder="Enter major (e.g., Business, Engineering)"
              value={filterState.major}
              onChange={e => handleFilterChange('major', e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* SAT Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>SAT</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState.sat?.comparison}
                onChange={value => handleFilterChange('sat', { ...filterState.sat, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState.sat?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min SAT"
                    value={filterState.sat?.minValue}
                    onChange={value => handleFilterChange('sat', { ...filterState.sat, minValue: value })}
                    min={400}
                    max={1600}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max SAT"
                    value={filterState.sat?.maxValue}
                    onChange={value => handleFilterChange('sat', { ...filterState.sat, maxValue: value })}
                    min={400}
                    max={1600}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState.sat?.comparison === 'min' ? 'Min SAT' : filterState.sat?.comparison === 'max' ? 'Max SAT' : 'Select comparison type first'}
                  value={filterState.sat?.value}
                  onChange={value => {
                    const newSatFilter = { 
                      ...filterState.sat, 
                      value,
                      comparison: filterState.sat?.comparison
                    };
                    handleFilterChange('sat', newSatFilter);
                  }}
                  disabled={!filterState.sat?.comparison}
                  min={400}
                  max={1600}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* ACT Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>ACT</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState.act?.comparison}
                onChange={value => handleFilterChange('act', { ...filterState.act, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState.act?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min ACT"
                    value={filterState.act?.minValue}
                    onChange={value => handleFilterChange('act', { ...filterState.act, minValue: value })}
                    min={1}
                    max={36}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max ACT"
                    value={filterState.act?.maxValue}
                    onChange={value => handleFilterChange('act', { ...filterState.act, maxValue: value })}
                    min={1}
                    max={36}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState.act?.comparison === 'min' ? 'Min ACT' : filterState.act?.comparison === 'max' ? 'Max ACT' : 'Select comparison type first'}
                  value={filterState.act?.value}
                  onChange={value => {
                    const newActFilter = { 
                      ...filterState.act, 
                      value,
                      comparison: filterState.act?.comparison
                    };
                    handleFilterChange('act', newActFilter);
                  }}
                  disabled={!filterState.act?.comparison}
                  min={1}
                  max={36}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* Income Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Income</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select income category"
              style={{ width: '100%' }}
              value={filterState.income_category}
              onChange={value => handleFilterChange('income_category', value)}
              options={[
                { value: 'Very High EFC', label: 'Very High EFC' },
                { value: 'High EFC', label: 'High EFC' },
                { value: 'Average EFC', label: 'Average EFC' },
                { value: 'Low EFC', label: 'Low EFC' }
              ]}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "verified-filters",
      label: <span>Verified Filters</span>,
      children: (
        <Flex vertical className="mb-3" gap={16}>
          {/* Date Added Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Date Added</strong>
            </Flex>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              value={filterState.added_date?.startDate && filterState.added_date?.endDate ? [
                dayjs(filterState.added_date.startDate),
                dayjs(filterState.added_date.endDate)
              ] : null}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  handleFilterChange('added_date', {
                    startDate: dates[0].format('YYYY-MM-DD'),
                    endDate: dates[1].format('YYYY-MM-DD')
                  });
                } else {
                  handleFilterChange('added_date', undefined);
                }
              }}
              placeholder={['Start Date', 'End Date']}
            />
          </div>
          
          {/* Last Major Update Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Last Major Update</strong>
            </Flex>
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              value={filterState.last_major_change?.startDate && filterState.last_major_change?.endDate ? [
                dayjs(filterState.last_major_change.startDate),
                dayjs(filterState.last_major_change.endDate)
              ] : null}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  handleFilterChange('last_major_change', {
                    startDate: dates[0].format('YYYY-MM-DD'),
                    endDate: dates[1].format('YYYY-MM-DD')
                  });
                } else {
                  handleFilterChange('last_major_change', undefined);
                }
              }}
              placeholder={['Start Date', 'End Date']}
            />
          </div>
          
          {/* Show Archived Athletes Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#f5f5f5',
            opacity: 0.6
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Show Archived Athletes</strong>
            </Flex>
            <Flex align="center" gap={8}>
              <Checkbox 
                disabled
                checked={false}
              />
              <span style={{ color: '#666' }}>Coming Soon</span>
            </Flex>
            <div style={{ 
              fontSize: '12px', 
              color: '#999', 
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              This feature will be available in a future update
            </div>
          </div>
        </Flex>
      ),
    },
    {
      key: "recruiting-service-ratings",
      label: <span>Recruiting Service Ratings</span>,
      children: (
        <Flex vertical className="mb-3" gap={16}>
          {/* On3 Consensus Stars Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>On3 Consensus Stars</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select star ratings"
              value={filterState.on3_consensus_stars}
              onChange={(value) => handleFilterChange('on3_consensus_stars', value)}
              style={{ width: '100%' }}
              options={[
                { value: 'None', label: 'None' },
                { value: '2', label: '2 Stars' },
                { value: '3', label: '3 Stars' },
                { value: '4', label: '4 Stars' },
                { value: '5', label: '5 Stars' }
              ]}
            />
          </div>
          
          {/* Rivals Rating Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Rivals Rating</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState.rivals_rating?.comparison}
                onChange={value => handleFilterChange('rivals_rating', { ...filterState.rivals_rating, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState.rivals_rating?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min Rating"
                    value={filterState.rivals_rating?.minValue}
                    onChange={value => handleFilterChange('rivals_rating', { ...filterState.rivals_rating, minValue: value })}
                    disabled={!filterState.rivals_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max Rating"
                    value={filterState.rivals_rating?.maxValue}
                    onChange={value => handleFilterChange('rivals_rating', { ...filterState.rivals_rating, maxValue: value })}
                    disabled={!filterState.rivals_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState.rivals_rating?.comparison === 'min' ? 'Min Rating' : filterState.rivals_rating?.comparison === 'max' ? 'Max Rating' : 'Select comparison type first'}
                  value={filterState.rivals_rating?.value}
                  onChange={value => handleFilterChange('rivals_rating', { ...filterState.rivals_rating, value, comparison: filterState.rivals_rating?.comparison })}
                  disabled={!filterState.rivals_rating?.comparison}
                  min={0}
                  max={100}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* On3 Rating Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>On3 Rating</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState.on3_rating?.comparison}
                onChange={value => handleFilterChange('on3_rating', { ...filterState.on3_rating, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState.on3_rating?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min Rating"
                    value={filterState.on3_rating?.minValue}
                    onChange={value => handleFilterChange('on3_rating', { ...filterState.on3_rating, minValue: value })}
                    disabled={!filterState.on3_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max Rating"
                    value={filterState.on3_rating?.maxValue}
                    onChange={value => handleFilterChange('on3_rating', { ...filterState.on3_rating, maxValue: value })}
                    disabled={!filterState.on3_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState.on3_rating?.comparison === 'min' ? 'Min Rating' : filterState.on3_rating?.comparison === 'max' ? 'Max Rating' : 'Select comparison type first'}
                  value={filterState.on3_rating?.value}
                  onChange={value => handleFilterChange('on3_rating', { ...filterState.on3_rating, value, comparison: filterState.on3_rating?.comparison })}
                  disabled={!filterState.on3_rating?.comparison}
                  min={0}
                  max={100}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* 247 Rating Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>247 Rating</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState._247_rating?.comparison}
                onChange={value => handleFilterChange('_247_rating', { ...filterState._247_rating, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState._247_rating?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min Rating"
                    value={filterState._247_rating?.minValue}
                    onChange={value => handleFilterChange('_247_rating', { ...filterState._247_rating, minValue: value })}
                    disabled={!filterState._247_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max Rating"
                    value={filterState._247_rating?.maxValue}
                    onChange={value => handleFilterChange('_247_rating', { ...filterState._247_rating, maxValue: value })}
                    disabled={!filterState._247_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState._247_rating?.comparison === 'min' ? 'Min Rating' : filterState._247_rating?.comparison === 'max' ? 'Max Rating' : 'Select comparison type first'}
                  value={filterState._247_rating?.value}
                  onChange={value => handleFilterChange('_247_rating', { ...filterState._247_rating, value, comparison: filterState._247_rating?.comparison })}
                  disabled={!filterState._247_rating?.comparison}
                  min={0}
                  max={100}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* ESPN Rating Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>ESPN Rating</strong>
            </Flex>
            <Flex vertical gap={8}>
              <Select
                value={filterState.espn_rating?.comparison}
                onChange={value => handleFilterChange('espn_rating', { ...filterState.espn_rating, comparison: value })}
                placeholder="Select comparison type"
                style={{ width: '100%' }}
                options={[
                  { value: 'min', label: 'Min' },
                  { value: 'max', label: 'Max' },
                  { value: 'between', label: 'Between' }
                ]}
              />
              {filterState.espn_rating?.comparison === 'between' ? (
                <Flex gap={8}>
                  <InputNumber
                    placeholder="Min Rating"
                    value={filterState.espn_rating?.minValue}
                    onChange={value => handleFilterChange('espn_rating', { ...filterState.espn_rating, minValue: value })}
                    disabled={!filterState.espn_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                  <InputNumber
                    placeholder="Max Rating"
                    value={filterState.espn_rating?.maxValue}
                    onChange={value => handleFilterChange('espn_rating', { ...filterState.espn_rating, maxValue: value })}
                    disabled={!filterState.espn_rating?.comparison}
                    min={0}
                    max={100}
                    step={0.1}
                    style={{ width: '50%' }}
                  />
                </Flex>
              ) : (
                <InputNumber
                  placeholder={filterState.espn_rating?.comparison === 'min' ? 'Min Rating' : filterState.espn_rating?.comparison === 'max' ? 'Max Rating' : 'Select comparison type first'}
                  value={filterState.espn_rating?.value}
                  onChange={value => handleFilterChange('espn_rating', { ...filterState.espn_rating, value, comparison: filterState.espn_rating?.comparison })}
                  disabled={!filterState.espn_rating?.comparison}
                  min={0}
                  max={100}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              )}
            </Flex>
          </div>
          
          {/* On3 Stars Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>On3 Stars</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select star ratings"
              value={filterState.on3_stars}
              onChange={(value) => handleFilterChange('on3_stars', value)}
              style={{ width: '100%' }}
              options={[
                { value: 'None', label: 'None' },
                { value: '2', label: '2 Stars' },
                { value: '3', label: '3 Stars' },
                { value: '4', label: '4 Stars' },
                { value: '5', label: '5 Stars' }
              ]}
            />
          </div>
          
          {/* 247 Stars Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>247 Stars</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select star ratings"
              value={filterState._247_stars}
              onChange={(value) => handleFilterChange('_247_stars', value)}
              style={{ width: '100%' }}
              options={[
                { value: 'None', label: 'None' },
                { value: '2', label: '2 Stars' },
                { value: '3', label: '3 Stars' },
                { value: '4', label: '4 Stars' },
                { value: '5', label: '5 Stars' }
              ]}
            />
          </div>
          
          {/* ESPN Stars Filter */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>ESPN Stars</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select star ratings"
              value={filterState.espn_stars}
              onChange={(value) => handleFilterChange('espn_stars', value)}
              style={{ width: '100%' }}
              options={[
                { value: 'None', label: 'None' },
                { value: '2', label: '2 Stars' },
                { value: '3', label: '3 Stars' },
                { value: '4', label: '4 Stars' },
                { value: '5', label: '5 Stars' }
              ]}
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "location",
      label: <span>Location</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            key={locationTypeDropdownKey}
            placeholder="Select location type"
            style={{ width: '100%' }}
            value={filterState.location?.type}
            onChange={handleLocationTypeSelection}
             options={getAvailableLocationOptions()}
            allowClear
          />
          
          {/* Unified Location Filter Content */}
          {filterState.location && (
            <div style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              padding: '12px',
              backgroundColor: '#fafafa'
            }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
                 <strong>{getAvailableLocationOptions().find(opt => opt.value === filterState.location?.type)?.label}</strong>
                <Button 
                  type="text" 
                  size="small"
                  icon={<i className="icon-xmark-regular"></i>}
                  onClick={removeUnifiedLocationFilter}
                />
              </Flex>
              
              {/* Render appropriate input based on location type */}
              {filterState.location.type === 'hometown_state' && (
              <Select
                mode="multiple"
                placeholder="Select states"
                style={{ width: '100%' }}
                  value={filterState.location.values}
                  onChange={value => handleFilterChange('location', {
                    ...filterState.location,
                    values: value
                  })}
                options={states.map(state => ({ value: state, label: state }))}
              />
              )}
              
              {filterState.location.type === 'international' && (
              <Select
                mode="multiple"
                placeholder={internationalLoading ? "Loading international options..." : "Select countries/regions"}
                style={{ width: '100%' }}
                  value={filterState.location.values}
                  onChange={value => handleFilterChange('location', {
                    ...filterState.location,
                    values: value
                  })}
                loading={internationalLoading}
                options={[
                  { value: 'ALL_INTERNATIONAL', label: 'All International' },
                  ...internationalOptions.map(option => ({ value: option, label: option }))
                ]}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={internationalLoading ? "Loading..." : "No countries found"}
                />
              )}
              
              {filterState.location.type === 'county' && (
                <Select
                  mode="multiple"
                  placeholder={countiesWithStateLoading ? "Loading counties..." : "Select counties"}
                  style={{ width: '100%' }}
                  value={filterState.location.values}
                  onChange={value => handleFilterChange('location', {
                    ...filterState.location,
                    values: value
                  })}
                  loading={countiesWithStateLoading}
                  options={countiesWithState}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  notFoundContent={countiesWithStateLoading ? "Loading..." : "No counties found"}
                />
              )}
              
              {filterState.location.type === 'school_state' && (
                <Select
                  mode="multiple"
                  placeholder="Select school states"
                  style={{ width: '100%' }}
                  value={filterState.location.values}
                  onChange={value => handleFilterChange('location', {
                    ...filterState.location,
                    values: value
                  })}
                  options={states.map(state => ({ value: state, label: state }))}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              )}
              
              {filterState.location.type === 'radius' && (
                <Flex vertical gap={8}>
                  <Select
                    showSearch
                    placeholder="Search for a location..."
                    style={{ width: '100%' }}
                    value={selectedLocation ? selectedLocation.formatted_address : undefined}
                    onSearch={handleLocationSearch}
                    loading={locationSearchLoading}
                    notFoundContent={locationSearchLoading ? "Searching..." : "No locations found"}
                    filterOption={false}
                    onSelect={(value, option) => {
                      const location = locationSuggestions.find(s => s.formatted_address === value);
                      if (location) {
                        handleLocationSelect(location);
                      }
                    }}
                    options={locationSuggestions.map(suggestion => ({
                      value: suggestion.formatted_address,
                      label: suggestion.formatted_address
                    }))}
                  />
                  <InputNumber
                    placeholder="Distance in miles"
                    style={{ width: '100%' }}
                    min={1}
                    max={500}
                    value={filterState.location.radius?.distance}
                    onChange={handleRadiusChange}
                    addonAfter="miles"
                  />
                </Flex>
              )}
              
              {filterState.location.type === 'recruiting_area' && (
                <Select
                  placeholder={coachesLoading ? "Loading coaches..." : "Select a coach"}
                  style={{ width: '100%' }}
                  value={selectedCoach}
                  onChange={handleCoachSelect}
                  loading={coachesLoading}
                  options={coaches.map(coach => ({
                    value: coach.id,
                    label: coach.hasActiveAreas 
                      ? `${coach.name_first} ${coach.name_last}`
                      : `${coach.name_first} ${coach.name_last} (no area assigned)`,
                    disabled: !coach.hasActiveAreas,
                    style: !coach.hasActiveAreas ? { color: '#999' } : {}
                  }))}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  notFoundContent={coachesLoading ? "Loading..." : "No coaches found"}
                />
              )}
            </div>
          )}
        </Flex>
      ),
    },
    {
      key: "schools",
      label: <span>Schools</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder={schoolsLoading ? "Loading schools..." : "Select schools"}
            style={{ width: '100%' }}
            value={filterState.schools}
            onChange={value => handleFilterChange('schools', value)}
            loading={schoolsLoading}
            options={schools.map(school => ({ value: school.id, label: school.name }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={schoolsLoading ? "Loading..." : "No schools found"}
          />
        </Flex>
      ),
    },
    {
      key: "conference",
      label: <span>Conference</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder={conferencesLoading ? "Loading conferences..." : "Select conferences"}
            style={{ width: '100%' }}
            value={filterState.conference}
            onChange={value => handleFilterChange('conference', value)}
            loading={conferencesLoading}
            options={conferences.map(conference => ({ value: conference, label: conference }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={conferencesLoading ? "Loading..." : "No conferences found"}
          />
        </Flex>
      ),
    },
    {
      key: "stats",
      label: <span>Stats</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            key={dropdownKey}
            placeholder="Add a stat to filter by"
            style={{ width: '100%' }}
            value={undefined}
            onChange={handleStatSelectionChange}
            options={getAvailableStats().map(column => {
              // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
              // Exclude position-agnostic stats like GP (Games Played)
              const isBaseball = Number(column.sport_id) === 6;
              const isPositionAgnostic = column.display_name === 'GP' || column.display_name === 'GS' || 
                                              column.data_type_id === 98 || column.data_type_id === 83;
              let label = column.display_name;
              
              if (isBaseball && column.stat_category && !isPositionAgnostic) {
                const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
                label = `${categoryPrefix} - ${column.display_name}`;
              }
              
              return {
                value: column.data_type_id.toString(),
                label: label
              };
            })}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          
          {getSelectedStats().map(statId => {
            const column = filterColumns.find(col => col.data_type_id.toString() === statId);
            const statFilter = filterState[`stat_${statId}`];
            
            // Skip rendering if column is not found to prevent display issues
            if (!column) {
              return null;
            }
            
            return (
              <div key={`stat-filter-${statId}`} style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px', 
                padding: '12px',
                backgroundColor: '#fafafa'
              }}>
                <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
                  <strong>{(() => {
                    // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
                    // Exclude position-agnostic stats like GP (Games Played)
                    const isBaseball = Number(column.sport_id) === 6;
                    const isPositionAgnostic = column.display_name === 'GP' || column.display_name === 'GS' || 
                                              column.data_type_id === 98 || column.data_type_id === 83;
                    
                    if (isBaseball && column.stat_category && !isPositionAgnostic) {
                      const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
                      return `${categoryPrefix} - ${column.display_name}`;
                    }
                    
                    return column.display_name;
                  })()}</strong>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<i className="icon-xmark-regular"></i>}
                    onClick={() => removeStatFilter(statId)}
                  />
                </Flex>
                <Flex gap={8}>
                  <Select
                    value={statFilter?.comparison}
                    style={{ flex: 1 }}
                    options={compareOptions}
                    onChange={value => handleFilterChange(`stat_${statId}`, { 
                      ...statFilter,
                      comparison: value 
                    })}
                    key={`comparison-${statId}`}
                  />
                  {statFilter?.comparison === 'between' ? (
                    <>
                      {isTimeBasedStat(column) ? (
                        <>
                          <TimeInput
                            style={{ flex: 1 }}
                            min={0}
                            placeholder="Min"
                            value={statFilter?.minValue}
                            onChange={value => handleFilterChange(`stat_${statId}`, {
                              ...statFilter,
                              minValue: value || 0
                            })}
                            key={`min-${statId}`}
                          />
                          <TimeInput
                            style={{ flex: 1 }}
                            min={0}
                            placeholder="Max"
                            value={statFilter?.maxValue}
                            onChange={value => handleFilterChange(`stat_${statId}`, {
                              ...statFilter,
                              maxValue: value || 0
                            })}
                            key={`max-${statId}`}
                          />
                        </>
                      ) : (
                        <>
                          <InputNumber 
                            style={{ flex: 1 }} 
                            min={0} 
                            placeholder="Min"
                            value={statFilter?.minValue}
                            onChange={value => handleFilterChange(`stat_${statId}`, { 
                              ...statFilter,
                              minValue: value || 0
                            })}
                            key={`min-${statId}`}
                          />
                          <InputNumber 
                            style={{ flex: 1 }} 
                            min={0} 
                            placeholder="Max"
                            value={statFilter?.maxValue}
                            onChange={value => handleFilterChange(`stat_${statId}`, { 
                              ...statFilter,
                              maxValue: value || 0
                            })}
                            key={`max-${statId}`}
                          />
                        </>
                      )}
                    </>
                  ) : (
                    isTimeBasedStat(column) ? (
                      <TimeInput
                        style={{ flex: 1 }}
                        min={0}
                        placeholder="Value"
                        value={statFilter?.value}
                        onChange={value => handleFilterChange(`stat_${statId}`, {
                          ...statFilter,
                          value: value || 0
                        })}
                        key={`value-${statId}`}
                      />
                    ) : (
                      <InputNumber 
                        style={{ flex: 1 }} 
                        min={0} 
                        placeholder="Value"
                        value={statFilter?.value}
                        onChange={value => handleFilterChange(`stat_${statId}`, { 
                          ...statFilter,
                          value: value || 0
                        })}
                        key={`value-${statId}`}
                      />
                    )
                  )}
                </Flex>
              </div>
            );
          })}
        </Flex>
      ),
    },
    {
      key: "transfer-odds",
      label: <span>Transfer Odds</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            value={filterState.transfer_odds?.comparison || 'min'}
            style={{ width: '100%' }}
            placeholder="Select comparison"
            onChange={value => handleFilterChange('transfer_odds', { 
              ...filterState.transfer_odds,
              comparison: value 
            })}
            options={[
              { value: 'min', label: 'Min' },
              { value: 'less', label: 'Max' }
            ]}
          />
          <InputNumber
            style={{ width: '100%' }}
            min={0}
            max={100}
            placeholder="Enter percentage"
            value={filterState.transfer_odds?.value || 80}
            onChange={value => handleFilterChange('transfer_odds', {
              ...filterState.transfer_odds,
              value: value
            })}
            addonAfter="%"
          />
        </Flex>
      ),
    },
    // Athletic Aid (key: "4")
    {
      ...baseItems[4],
      key: "4"
    },
    // Status (key: "5") 
    {
      ...baseItems[5],
      key: "5"
    },
    // Date Entered (key: "6")
    {
      ...baseItems[6],
      key: "6"
    },
    // Survey Completed (key: "7")
    {
      ...baseItems[7],
      key: "7"
    },
    // Grad Student (key: "8")
    {
      ...baseItems[8],
      key: "8"
    },
    // Honors (key: "9")
    {
      ...baseItems[9],
      key: "9"
    },
    // Designated Student Athlete (key: "10")
    {
      ...baseItems[10],
      key: "10"
    },
    // JUCO-specific filters
    {
      key: "juco-athletic-association",
      label: <span>Athletic Association</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select athletic association"
            style={{ width: '100%' }}
            value={filterState.athleticAssociation}
            onChange={value => handleFilterChange('athleticAssociation', value)}
            options={athleticAssociationOptions}
          />
        </Flex>
      ),
    },
    {
      key: "juco-region",
      label: <span>NJCAA Region</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select NJCAA region"
            style={{ width: '100%' }}
            value={filterState.jucoRegion}
            onChange={value => handleFilterChange('jucoRegion', value)}
            options={jucoRegionOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Flex>
      ),
    },
    {
      key: "juco-division",
      label: <span>NJCAA Division</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select NJCAA division"
            style={{ width: '100%' }}
            value={filterState.jucoDivision}
            onChange={value => handleFilterChange('jucoDivision', value)}
            options={jucoDivisionOptions}
          />
        </Flex>
      ),
    },
    {
      key: "juco-school-state",
      label: <span>School State</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select school states"
            style={{ width: '100%' }}
            value={filterState.schoolState}
            onChange={value => handleFilterChange('schoolState', value)}
            options={states.map(state => ({ value: state, label: state }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Flex>
      ),
    },
    // High School-specific filters
    {
      key: "hs-state",
      label: <span>State</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder={hsStatesLoading ? "Loading states..." : "Select states"}
            style={{ width: '100%' }}
            value={filterState.hsState}
            onChange={value => handleFilterChange('hsState', value)}
            loading={hsStatesLoading}
            options={hsStates.map(state => ({ value: state, label: state }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={hsStatesLoading ? "Loading..." : "No states found"}
          />
        </Flex>
      ),
    },
    {
      key: "hs-county",
      label: <span>County</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder={hsCountiesLoading ? "Loading counties..." : "Select counties"}
            style={{ width: '100%' }}
            value={filterState.hsCounty}
            onChange={value => handleFilterChange('hsCounty', value)}
            loading={hsCountiesLoading}
            options={hsCounties.map(county => ({ value: county, label: county }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={hsCountiesLoading ? "Loading..." : "No counties found"}
          />
        </Flex>
      ),
    },
    {
      key: "hs-religious-affiliation",
      label: <span>Religious Affiliation</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder={hsReligiousAffiliationsLoading ? "Loading..." : "Select religious affiliations"}
            style={{ width: '100%' }}
            value={filterState.hsReligiousAffiliation}
            onChange={value => handleFilterChange('hsReligiousAffiliation', value)}
            loading={hsReligiousAffiliationsLoading}
            options={hsReligiousAffiliations.map(affiliation => ({ value: affiliation, label: affiliation }))}
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={hsReligiousAffiliationsLoading ? "Loading..." : "No affiliations found"}
          />
        </Flex>
      ),
    },
    {
      key: "hs-school-type",
      label: <span>School Type</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          {/* HS/JUCO Selection */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>School Type (HS/JUCO)</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select school types"
              style={{ width: '100%' }}
              value={filterState.hsSchoolType?.schoolType}
              onChange={value => handleFilterChange('hsSchoolType', {
                ...filterState.hsSchoolType,
                schoolType: value
              })}
              options={[
                { value: 'High School', label: 'High School' },
                { value: 'Junior College', label: 'JUCO' }
              ]}
            />
          </div>
          
          {/* Private/Public Selection */}
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#fafafa'
          }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
              <strong>Private/Public</strong>
            </Flex>
            <Select
              mode="multiple"
              placeholder="Select private/public"
              style={{ width: '100%' }}
              value={filterState.hsSchoolType?.publicPrivate}
              onChange={value => handleFilterChange('hsSchoolType', {
                ...filterState.hsSchoolType,
                publicPrivate: value
              })}
              options={[
                { value: 'Private - All Boys', label: 'Private - All Boys' },
                { value: 'Private', label: 'Private' },
                { value: 'Public - All Boys', label: 'Public - All Boys' },
                { value: 'Public', label: 'Public' }
              ]}
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "hs-prospects-score",
      label: <span>Prospects Score</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <div style={{ padding: '0 8px' }}>
            <Slider
              range
              min={1}
              max={10}
              step={1}
              value={[
                filterState.hsProspectsScore?.minValue || 1,
                filterState.hsProspectsScore?.maxValue || 10
              ]}
              onChange={([min, max]) => handleFilterChange('hsProspectsScore', {
                minValue: min,
                maxValue: max
              })}
              marks={{
                1: '1',
                2: '2',
                3: '3',
                4: '4',
                5: '5',
                6: '6',
                7: '7',
                8: '8',
                9: '9',
                10: '10'
              }}
              className="custom-slider-handles"
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "hs-d1-prospects-score",
      label: <span>D1 Prospects Score</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <div style={{ padding: '0 8px' }}>
            <Slider
              range
              min={1}
              max={10}
              step={1}
              value={[
                filterState.hsD1ProspectsScore?.minValue || 1,
                filterState.hsD1ProspectsScore?.maxValue || 10
              ]}
              onChange={([min, max]) => handleFilterChange('hsD1ProspectsScore', {
                minValue: min,
                maxValue: max
              })}
              marks={{
                1: '1',
                2: '2',
                3: '3',
                4: '4',
                5: '5',
                6: '6',
                7: '7',
                8: '8',
                9: '9',
                10: '10'
              }}
              className="custom-slider-handles"
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "hs-team-quality-score",
      label: <span>Team Quality Score</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <div style={{ padding: '0 8px' }}>
            <Slider
              range
              min={1}
              max={10}
              step={1}
              value={[
                filterState.hsTeamQualityScore?.minValue || 1,
                filterState.hsTeamQualityScore?.maxValue || 10
              ]}
              onChange={([min, max]) => handleFilterChange('hsTeamQualityScore', {
                minValue: min,
                maxValue: max
              })}
              marks={{
                1: '1',
                2: '2',
                3: '3',
                4: '4',
                5: '5',
                6: '6',
                7: '7',
                8: '8',
                9: '9',
                10: '10'
              }}
              className="custom-slider-handles"
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "hs-athlete-income-score",
      label: <span>Athlete Income Score</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <div style={{ padding: '0 8px' }}>
            <Slider
              range
              min={1}
              max={10}
              step={1}
              value={[
                filterState.hsAthleteIncomeScore?.minValue || 1,
                filterState.hsAthleteIncomeScore?.maxValue || 10
              ]}
              onChange={([min, max]) => handleFilterChange('hsAthleteIncomeScore', {
                minValue: min,
                maxValue: max
              })}
              marks={{
                1: '1',
                2: '2',
                3: '3',
                4: '4',
                5: '5',
                6: '6',
                7: '7',
                8: '8',
                9: '9',
                10: '10'
              }}
              className="custom-slider-handles"
            />
          </div>
        </Flex>
      ),
    },
    {
      key: "hs-academics-score",
      label: <span>Academics Score</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <div style={{ padding: '0 8px' }}>
            <Slider
              range
              min={1}
              max={10}
              step={1}
              value={[
                filterState.hsAcademicsScore?.minValue || 1,
                filterState.hsAcademicsScore?.maxValue || 10
              ]}
              onChange={([min, max]) => handleFilterChange('hsAcademicsScore', {
                minValue: min,
                maxValue: max
              })}
              marks={{
                1: '1',
                2: '2',
                3: '3',
                4: '4',
                5: '5',
                6: '6',
                7: '7',
                8: '8',
                9: '9',
                10: '10'
              }}
              className="custom-slider-handles"
            />
          </div>
        </Flex>
      ),
    }
  ].map(item => ({
    ...item,
    children: (
      <div style={{ padding: '0 12px' }}>
        {item.children}
      </div>
    )
  }));

  const panelContent = () => (
    <Flex vertical style={{ height: '100%', gap: '16px' }}>
      <Flex justify="space-between" align="center" style={{ padding: '16px 0', borderBottom: '1px solid rgba(18, 109, 184, 0.2)', background:'rgba(18, 109, 184, 0.1)', }}>
        <h4 style={{ margin: 0, paddingLeft: '16px' }}>Filters</h4>
        <Button 
          type="text" 
          icon={<i className="icon-xmark-regular"></i>}
          onClick={() => setIsPanelOpen(false)}
        />
      </Flex>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <Collapse
          defaultActiveKey={getActiveKeys()}
          ghost
          items={filterItemsByDataSource(itemsWithStats)}
          expandIcon={({ isActive }) =>
            isActive ? (
              <i className="icon-minus"></i>
            ) : (
              <i className="icon-add"></i>
            )
          }
          expandIconPosition="end"
          style={{ 
            backgroundColor: '#fff'
          }}
          key={`collapse-${Object.keys(appliedFilters).length}`}
          onChange={(activeKeys) => {
            // Track if transfer-odds section is expanded
            setIsTransferOddsExpanded(activeKeys.includes('transfer-odds'));
          }}
        />
      </div>
      
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
    <>
      <Flex gap={8} align="center">
        <div className="flex gap-1">
          {renderFilterBadges()}
        </div>
        <Button 
          className="select-dropdown"
          onClick={() => setIsPanelOpen(true)}
        >
          <i className="icon-filter-1"></i> 
          Filters {Object.keys(appliedFilters).length > 0 && `(${Object.keys(appliedFilters).length})`}
        </Button>
      </Flex>

      <Drawer
        title={null}
        placement="right"
        onClose={() => setIsPanelOpen(false)}
        open={isPanelOpen}
        width={400}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' }
        }}
        maskClosable={true}
        destroyOnClose={false}
      >
        {panelContent()}
      </Drawer>
      
      <style jsx global>{`
        .custom-slider-handles .ant-slider-handle {
          background-color: #1890ff !important;
          border: none !important;
          width: 18px !important;
          height: 18px !important;
          margin-top: -7px !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
          border-radius: 50% !important;
        }
        
        .custom-slider-handles .ant-slider-handle::before {
          display: none !important;
        }
        
        .custom-slider-handles .ant-slider-handle::after {
          display: none !important;
        }
        
        .custom-slider-handles .ant-slider-handle:hover {
          background-color: #40a9ff !important;
          border: none !important;
        }
        
        .custom-slider-handles .ant-slider-handle:focus {
          background-color: #1890ff !important;
          border: none !important;
          box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2) !important;
        }
        
        .custom-slider-handles .ant-slider-rail {
          background: linear-gradient(to right, #ff4d4f, #52c41a) !important;
          height: 6px !important;
        }
        
        .custom-slider-handles .ant-slider-track {
          background: transparent !important;
          height: 6px !important;
        }
      `}</style>
    </>
  );
}