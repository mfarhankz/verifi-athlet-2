import { supabase } from './supabaseClient';
import { fetchCustomerPackageDetails, fetchSchoolLogos } from './queries';
import type { ActivityEvent } from '../app/(dashboard)/activity-feed/types';

// Helper function to format height with fractions instead of decimals
function formatHeightWithFractions(feet: number, inches: number): string {
  if (!feet && !inches) return '';
  
  const wholeInches = Math.floor(inches);
  const fractionalInches = inches - wholeInches;
  
  // Convert decimal to 1/8 fractions
  const eighthInches = Math.round(fractionalInches * 8);
  
  // Remove .0 from feet and whole inches
  const feetStr = Number.isInteger(feet) ? feet.toString() : feet.toString().replace(/\.0$/, '');
  const wholeInchesStr = Number.isInteger(wholeInches) ? wholeInches.toString() : wholeInches.toString().replace(/\.0$/, '');
  
  let heightString = `${feetStr}'`;
  
  if (wholeInches > 0) {
    heightString += wholeInchesStr;
  }
  
  if (eighthInches > 0) {
    // Simplify the fraction
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(eighthInches, 8);
    const numerator = eighthInches / divisor;
    const denominator = 8 / divisor;
    
    heightString += ` ${numerator}/${denominator}`;
  }
  
  heightString += '"';
  return heightString;
}

// Helper function to process offer_counts_by_group data
function processOfferCounts(offerCountsByGroup: any): {
  totalOffers: number;
  p4: number;
  g5: number;
  fcs: number;
  d2Naia: number;
  d3: number;
} {
  const counts = {
    totalOffers: 0,
    p4: 0,
    g5: 0,
    fcs: 0,
    d2Naia: 0,
    d3: 0
  };

  // Handle case where data is a direct JSON object like {"G5":1}
  if (offerCountsByGroup && typeof offerCountsByGroup === 'object' && !Array.isArray(offerCountsByGroup)) {
    const countsByGroup = offerCountsByGroup;
    
    // Sum up all offers for total
    Object.values(countsByGroup).forEach(count => {
      counts.totalOffers += typeof count === 'number' ? count : 0;
    });
    
    // Add specific category counts
    counts.p4 += countsByGroup.P4 || 0;
    counts.g5 += countsByGroup.G5 || 0;
    counts.fcs += countsByGroup.FCS || 0;
    counts.d2Naia += (countsByGroup.D2 || 0) + (countsByGroup.NAIA || 0);
    counts.d3 += countsByGroup.D3 || 0;
    
    return counts;
  }

  // Handle case where data is an array (legacy format)
  if (Array.isArray(offerCountsByGroup)) {
    offerCountsByGroup.forEach(athleteData => {
      if (athleteData.counts_by_group) {
        const countsByGroup = athleteData.counts_by_group;
        
        // Sum up all offers for total
        Object.values(countsByGroup).forEach(count => {
          counts.totalOffers += typeof count === 'number' ? count : 0;
        });
        
        // Add specific category counts
        counts.p4 += countsByGroup.P4 || 0;
        counts.g5 += countsByGroup.G5 || 0;
        counts.fcs += countsByGroup.FCS || 0;
        counts.d2Naia += (countsByGroup.D2 || 0) + (countsByGroup.NAIA || 0);
        counts.d3 += countsByGroup.D3 || 0;
      }
    });
  }

  return counts;
}

/**
 * Get the appropriate activity feed view based on customer package
 * Returns the view name (e.g., 'vw_activity_feed_platinum', 'vw_activity_feed_gold', etc.)
 */
export async function getActivityFeedView(customerId: string): Promise<string> {
  try {
    const packageDetails = await fetchCustomerPackageDetails(customerId);
    
    if (!packageDetails) {
      // No package found - no access
      return 'none';
    }

    // Map package types to activity feed view suffixes in priority order
    const packageType = packageDetails.package_type;
    let viewSuffix = 'none'; // default - no access

    switch (packageType) {
      case 'elite':
      case 'ultra':
        // Platinum access
        viewSuffix = 'platinum';
        break;
      case 'gold':
      case 'naia':
        // Gold access (including old gold and naia gold)
        viewSuffix = 'gold';
        break;
      case 'silver':
        // Silver Plus access (including naia silver plus)
        viewSuffix = 'silver_plus';
        break;
      default:
        // Any other package type gets no access
        viewSuffix = 'none';
        break;
    }

    const viewName = viewSuffix === 'none' ? 'none' : `vw_activity_feed_fb_${viewSuffix}`;
    return viewName;
  } catch (error) {
    console.error('Error in getActivityFeedView:', error);
    // Default to no access on error
    return 'none';
  }
}

/**
 * Fetch activity feed events for a customer based on their package
 */
export async function fetchActivityFeedEvents(
  customerId: string,
  search?: string,
  filters?: {
    eventTypes?: string[];
    eventDateFrom?: string;
    eventDateTo?: string;
    graduationYears?: string[];
    positions?: string[];
    height?: {
      comparison: 'min' | 'max' | 'between';
      value?: number;
      minValue?: number;
      maxValue?: number;
      feet?: number;
      inches?: number;
      minFeet?: number;
      minInches?: number;
      maxFeet?: number;
      maxInches?: number;
    };
    weight?: {
      comparison: 'min' | 'max' | 'between';
      value?: number;
      minValue?: number;
      maxValue?: number;
    };
    athleticProjection?: string[];
    location?: {
      type: 'hometown_state' | 'international' | 'county' | 'school_state' | 'radius' | 'recruiting_area';
      values: string[];
      radius?: {
        center: string;
        distance: number;
        coordinates?: {
          lat: number;
          lng: number;
        };
      };
      recruitingArea?: {
        coachId: string;
        stateIds: number[];
        countyIds: number[];
        schoolIds: string[];
      };
    };
    conferences?: string[];
    schoolLevels?: string[];
    schools?: string[];
    athleteLocation?: {
      type: 'hometown_state' | 'international' | 'county' | 'school_state' | 'radius' | 'recruiting_area';
      values: string[];
      radius?: {
        center: string;
        distance: number;
        coordinates?: {
          lat: number;
          lng: number;
        };
      };
      recruitingArea?: {
        coachId: string;
        stateIds: number[];
        countyIds: number[];
        schoolIds: string[];
      };
    };
  },
  page: number = 1,
  pageSize: number = 25
): Promise<{ data: ActivityEvent[]; hasMore: boolean; totalCount: number }> {
  try {
    // Get the appropriate view for this customer's package
    const viewName = await getActivityFeedView(customerId);
    
    // If no access, return empty result
    if (viewName === 'none') {
      return { data: [], hasMore: false, totalCount: 0 };
    }
    
    // Start building the query
    let query = supabase.from(viewName).select('*');
    
    // Apply filters if provided
    if (filters) {
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        query = query.in('type', filters.eventTypes);
      }
      
      if (filters.eventDateFrom) {
        query = query.gte('offer_date', filters.eventDateFrom);
      }
      
      if (filters.eventDateTo) {
        query = query.lte('offer_date', filters.eventDateTo);
      }
      
      if (filters.graduationYears && filters.graduationYears.length > 0) {
        query = query.in('afw_grad_year', filters.graduationYears);
      }
      
      // Position filter
      if (filters.positions && filters.positions.length > 0) {
        query = query.in('afw_primary_position', filters.positions);
      }
      
      // Height filter
      if (filters.height) {
        const heightFilter = filters.height;
        
        // Convert feet/inches to total inches for accurate comparison
        const convertToTotalInches = (feet: number, inches: number) => {
          return feet * 12 + inches;
        };
        
        if (heightFilter.comparison === 'between' && heightFilter.minFeet !== undefined && heightFilter.minInches !== undefined && heightFilter.maxFeet !== undefined && heightFilter.maxInches !== undefined) {
          const minTotalInches = convertToTotalInches(heightFilter.minFeet, heightFilter.minInches);
          const maxTotalInches = convertToTotalInches(heightFilter.maxFeet, heightFilter.maxInches);
          
          
          // Use a more sophisticated approach: filter by feet first, then by inches within those feet
          const minFeet = Math.floor(minTotalInches / 12);
          const maxFeet = Math.floor(maxTotalInches / 12);
          
          if (minFeet === maxFeet) {
            // Same feet range, filter by inches within that feet range
            const minInches = minTotalInches % 12;
            const maxInches = maxTotalInches % 12;
            query = query
              .gte('afw_height_feet', minFeet)
              .lte('afw_height_feet', maxFeet)
              .gte('afw_height_inch', minInches)
              .lte('afw_height_inch', maxInches);
          } else {
            // Different feet range, use a broader filter
            query = query
              .gte('afw_height_feet', minFeet)
              .lte('afw_height_feet', maxFeet);
          }
        } else if (heightFilter.comparison === 'min' && heightFilter.feet !== undefined && heightFilter.inches !== undefined) {
          const minTotalInches = convertToTotalInches(heightFilter.feet, heightFilter.inches);
          const minFeet = Math.floor(minTotalInches / 12);
          const minInches = minTotalInches % 12;
          
          
          // For minimum height, we need heights >= minTotalInches
          // This means: (feet > minFeet) OR (feet = minFeet AND inches >= minInches)
          query = query.or(`afw_height_feet.gt.${minFeet},and(afw_height_feet.eq.${minFeet},afw_height_inch.gte.${minInches})`);
        } else if (heightFilter.comparison === 'max' && heightFilter.feet !== undefined && heightFilter.inches !== undefined) {
          const maxTotalInches = convertToTotalInches(heightFilter.feet, heightFilter.inches);
          const maxFeet = Math.floor(maxTotalInches / 12);
          const maxInches = maxTotalInches % 12;
          
          
          // For maximum height, we need heights <= maxTotalInches
          // This means: (feet < maxFeet) OR (feet = maxFeet AND inches <= maxInches)
          query = query.or(`afw_height_feet.lt.${maxFeet},and(afw_height_feet.eq.${maxFeet},afw_height_inch.lte.${maxInches})`);
        }
      }
      
      // Weight filter
      if (filters.weight) {
        const weightFilter = filters.weight;
        
        if (weightFilter.comparison === 'between' && weightFilter.minValue !== undefined && weightFilter.maxValue !== undefined) {
          query = query.gte('afw_weight', weightFilter.minValue).lte('afw_weight', weightFilter.maxValue);
        } else if (weightFilter.comparison === 'min' && weightFilter.value !== undefined) {
          query = query.gte('afw_weight', weightFilter.value);
        } else if (weightFilter.comparison === 'max' && weightFilter.value !== undefined) {
          query = query.lte('afw_weight', weightFilter.value);
        }
      }
      
      // Athletic projection filter
      if (filters.athleticProjection && filters.athleticProjection.length > 0) {
        query = query.in('afw_athletic_projection', filters.athleticProjection);
      }
      
      // Handle complex location filter
      if (filters.location && ((filters.location.values && filters.location.values.length > 0) || filters.location.type === 'radius')) {
        const { type, values } = filters.location;
        
        if (type === 'school_state') {
          query = query.in('sfw_school_state', values);
        } else if (type === 'county') {
          // Note: This assumes the view includes hs_county column
          // If not available, this will need to be added to the view
          query = query.in('hs_county', values);
        } else if (type === 'international') {
          if (values.includes('ALL_INTERNATIONAL')) {
            // Filter out US states - show all international schools
            const US_STATE_ABBREVIATIONS = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
            query = query.not('sfw_school_state', 'in', `(${US_STATE_ABBREVIATIONS.map(state => `"${state}"`).join(',')})`);
            query = query.not('sfw_school_state', 'is', null);
            query = query.not('sfw_school_state', 'eq', '');
          } else {
            // Filter by specific international locations
            query = query.in('sfw_school_state', values);
          }
        } else if (type === 'radius') {
          // Handle radius filter with geocoding
          if (filters.location.radius?.center && filters.location.radius?.distance) {
            try {
              // Import geocoding utilities
              const { geocodeLocation, getBoundingBox } = await import('@/utils/geocoding');
              
              // Use coordinates if available, otherwise geocode the center
              let centerLat: number, centerLng: number;
              
              if (filters.location.radius.coordinates) {
                centerLat = filters.location.radius.coordinates.lat;
                centerLng = filters.location.radius.coordinates.lng;
              } else {
                const centerLocation = await geocodeLocation(filters.location.radius.center);
                if (!centerLocation) {
                  console.warn('Could not geocode radius center location');
                  return { data: [], hasMore: false, totalCount: 0 };
                }
                centerLat = centerLocation.lat;
                centerLng = centerLocation.lng;
              }
              
              // Get bounding box coordinates for the radius
              const boundingBox = getBoundingBox(centerLat, centerLng, filters.location.radius.distance);
              
              // Add latitude/longitude range filters to the query
              // Using sfw_ fields for recruiting college location
              query = query
                .gte('sfw_address_latitude', boundingBox.minLat)
                .lte('sfw_address_latitude', boundingBox.maxLat)
                .gte('sfw_address_longitude', boundingBox.minLng)
                .lte('sfw_address_longitude', boundingBox.maxLng);
            } catch (error) {
              console.error('Error setting up radius bounding box:', error);
              // If geocoding fails, don't apply any location filters
            }
          }
        }
        // Note: hometown_state and recruiting_area are not applicable for activity feed
        // as it shows high school athletes, not college athletes
      }
      
      if (filters.conferences && filters.conferences.length > 0) {
        query = query.in('sfw_conference', filters.conferences);
      }
      
      if (filters.schoolLevels && filters.schoolLevels.length > 0) {
        query = query.in('sfw_fbs_conf_group', filters.schoolLevels);
      }
      
      if (filters.schools && filters.schools.length > 0) {
        query = query.in('sfw_school_name', filters.schools);
      }
      
      // Handle athlete location filter (based on athlete's school location)
      if (filters.athleteLocation && ((filters.athleteLocation.values && filters.athleteLocation.values.length > 0) || filters.athleteLocation.type === 'radius' || filters.athleteLocation.type === 'recruiting_area')) {
        const { type, values } = filters.athleteLocation;
        
        if (type === 'hometown_state') {
          query = query.in('ath_hometown_state', values);
        } else if (type === 'international') {
          query = query.eq('ath_international', true);
        } else if (type === 'school_state') {
          query = query.in('ath_school_school_state', values);
        } else if (type === 'county') {
          // For county filtering, convert county names to county IDs and filter by ath_school_county_id
          try {
            const { convertCountyNamesToIds } = await import('./queries');
            const countyIds = await convertCountyNamesToIds(values);
            
            if (countyIds.length > 0) {
              query = query.in('ath_school_county_id', countyIds);
            }
          } catch (error) {
            console.error('❌ Athlete location county filter - error converting county names:', error);
          }
        } else if (type === 'radius') {
          // Handle radius filter for athlete location
          if (filters.athleteLocation.radius?.center && filters.athleteLocation.radius?.distance) {
            try {
              const { geocodeLocation, getBoundingBox } = await import('@/utils/geocoding');
              
              let centerLat: number, centerLng: number;
              
              if (filters.athleteLocation.radius.coordinates) {
                centerLat = filters.athleteLocation.radius.coordinates.lat;
                centerLng = filters.athleteLocation.radius.coordinates.lng;
              } else {
                const centerLocation = await geocodeLocation(filters.athleteLocation.radius.center);
                if (!centerLocation) {
                  console.warn('Could not geocode athlete location radius center');
                  return { data: [], hasMore: false, totalCount: 0 };
                }
                centerLat = centerLocation.lat;
                centerLng = centerLocation.lng;
              }
              
              const boundingBox = getBoundingBox(centerLat, centerLng, filters.athleteLocation.radius.distance);
              
              query = query
                .gte('ath_school_address_latitude', boundingBox.minLat)
                .lte('ath_school_address_latitude', boundingBox.maxLat)
                .gte('ath_school_address_longitude', boundingBox.minLng)
                .lte('ath_school_address_longitude', boundingBox.maxLng);
            } catch (error) {
              console.error('Error processing athlete location radius filter:', error);
              return { data: [], hasMore: false, totalCount: 0 };
            }
          }
        } else if (type === 'recruiting_area') {
          // Handle recruiting area filter for athlete location
          if (filters.athleteLocation.recruitingArea) {
            const { coachId, stateIds, countyIds, schoolIds } = filters.athleteLocation.recruitingArea;
            
            if (coachId) {
              try {
                const { fetchRecruitingAreasForCoach, convertStateIdsToAbbrevs, convertCountyIdsToNames } = await import('./queries');
                const recruitingAreas = await fetchRecruitingAreasForCoach(coachId);
                
                const orConditions = [];
                
                // Add state conditions (convert state IDs to abbreviations and search ath_school_school_state)
                if (recruitingAreas.stateIds.length > 0) {
                  const stateAbbrevs = await convertStateIdsToAbbrevs(recruitingAreas.stateIds);
                  if (stateAbbrevs.length > 0) {
                    orConditions.push(`ath_school_school_state.in.(${stateAbbrevs.map(s => `"${s}"`).join(',')})`);
                  }
                }
                
                // Add county conditions (convert county IDs to county names, then to county IDs for ath_school_county_id)
                if (recruitingAreas.countyIds.length > 0) {
                  const countyNames = await convertCountyIdsToNames(recruitingAreas.countyIds);
                  if (countyNames.length > 0) {
                    // Convert county names back to IDs for ath_school_county_id
                    const { convertCountyNamesToIds } = await import('./queries');
                    const convertedCountyIds = await convertCountyNamesToIds(countyNames);
                    if (convertedCountyIds.length > 0) {
                      orConditions.push(`ath_school_county_id.in.(${convertedCountyIds.join(',')})`);
                    }
                  }
                }
                
                // Add school conditions
                if (recruitingAreas.schoolIds.length > 0) {
                  orConditions.push(`ath_school_id.in.(${recruitingAreas.schoolIds.join(',')})`);
                }
                
                // Apply OR conditions if any exist
                if (orConditions.length > 0) {
                  query = query.or(orConditions.join(','));
                }
              } catch (error) {
                console.error('❌ Error applying recruiting area filter for athlete location:', error);
              }
            }
          }
        }
      }
    }
    
    // Apply search filter if provided
    if (search && search.trim()) {
      const searchTerms = search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        if (searchTerms.length === 1) {
          // Single word: search in first name, last name, and school names
          const term = searchTerms[0];
          query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,ath_school.ilike.%${term}%,sfw_school_name.ilike.%${term}%,afw_primary_position.ilike.%${term}%`);
        } else if (searchTerms.length === 2) {
          // Two words: most likely first name and last name
          const [firstTerm, secondTerm] = searchTerms;
          
          const conditions = [
            // Exact order: first term in first name AND second term in last name
            `and(first_name.ilike.%${firstTerm}%,last_name.ilike.%${secondTerm}%)`,
            // Reverse order: second term in first name AND first term in last name  
            `and(first_name.ilike.%${secondTerm}%,last_name.ilike.%${firstTerm}%)`,
            // Full search term in first name only
            `first_name.ilike.%${firstTerm} ${secondTerm}%`,
            // Full search term in last name only
            `last_name.ilike.%${firstTerm} ${secondTerm}%`,
            // Full search term in reverse order in first name
            `first_name.ilike.%${secondTerm} ${firstTerm}%`,
            // Full search term in reverse order in last name  
            `last_name.ilike.%${secondTerm} ${firstTerm}%`,
            // School name searches
            `ath_school.ilike.%${firstTerm} ${secondTerm}%`,
            `ath_school.ilike.%${secondTerm} ${firstTerm}%`,
            `sfw_school_name.ilike.%${firstTerm} ${secondTerm}%`,
            `sfw_school_name.ilike.%${secondTerm} ${firstTerm}%`
          ];
          
          query = query.or(conditions.join(','));
        } else {
          // More than 2 words: try different combinations
          const fullSearchTerm = searchTerms.join(' ');
          const firstTerm = searchTerms[0];
          const lastTerm = searchTerms[searchTerms.length - 1];
          
          const conditions = [
            // First word in first name, rest in last name
            `and(first_name.ilike.%${firstTerm}%,last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
            // All but last word in first name, last word in last name
            `and(first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,last_name.ilike.%${lastTerm}%)`,
            // Full term in first name
            `first_name.ilike.%${fullSearchTerm}%`,
            // Full term in last name
            `last_name.ilike.%${fullSearchTerm}%`,
            // Full term in school names
            `ath_school.ilike.%${fullSearchTerm}%`,
            `school_name.ilike.%${fullSearchTerm}%`
          ];
          
          query = query.or(conditions.join(','));
        }
      }
    }
    
    // Order by offer date descending (most recent first), nulls last
    query = query.order('offer_date', { ascending: false });
    
    // Get total count for pagination info using the same filtered query
    const countQuery = supabase.from(viewName).select('*', { count: 'exact', head: true });
    
    // Apply the same filters to the count query
    if (filters) {
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        countQuery.in('type', filters.eventTypes);
      }
      
      if (filters.eventDateFrom) {
        countQuery.gte('offer_date', filters.eventDateFrom);
      }
      
      if (filters.eventDateTo) {
        countQuery.lte('offer_date', filters.eventDateTo);
      }
      
      if (filters.graduationYears && filters.graduationYears.length > 0) {
        countQuery.in('afw_grad_year', filters.graduationYears);
      }
      
      // Position filter
      if (filters.positions && filters.positions.length > 0) {
        countQuery.in('afw_primary_position', filters.positions);
      }
      
      // Height filter
      if (filters.height) {
        const heightFilter = filters.height;
        
        // Convert feet/inches to total inches for accurate comparison
        const convertToTotalInches = (feet: number, inches: number) => {
          return feet * 12 + inches;
        };
        
        if (heightFilter.comparison === 'between' && heightFilter.minFeet !== undefined && heightFilter.minInches !== undefined && heightFilter.maxFeet !== undefined && heightFilter.maxInches !== undefined) {
          const minTotalInches = convertToTotalInches(heightFilter.minFeet, heightFilter.minInches);
          const maxTotalInches = convertToTotalInches(heightFilter.maxFeet, heightFilter.maxInches);
          
          const minFeet = Math.floor(minTotalInches / 12);
          const maxFeet = Math.floor(maxTotalInches / 12);
          
          if (minFeet === maxFeet) {
            const minInches = minTotalInches % 12;
            const maxInches = maxTotalInches % 12;
            countQuery
              .gte('afw_height_feet', minFeet)
              .lte('afw_height_feet', maxFeet)
              .gte('afw_height_inch', minInches)
              .lte('afw_height_inch', maxInches);
          } else {
            countQuery
              .gte('afw_height_feet', minFeet)
              .lte('afw_height_feet', maxFeet);
          }
        } else if (heightFilter.comparison === 'min' && heightFilter.feet !== undefined && heightFilter.inches !== undefined) {
          const minTotalInches = convertToTotalInches(heightFilter.feet, heightFilter.inches);
          const minFeet = Math.floor(minTotalInches / 12);
          const minInches = minTotalInches % 12;
          
          countQuery.or(`afw_height_feet.gt.${minFeet},and(afw_height_feet.eq.${minFeet},afw_height_inch.gte.${minInches})`);
        } else if (heightFilter.comparison === 'max' && heightFilter.feet !== undefined && heightFilter.inches !== undefined) {
          const maxTotalInches = convertToTotalInches(heightFilter.feet, heightFilter.inches);
          const maxFeet = Math.floor(maxTotalInches / 12);
          const maxInches = maxTotalInches % 12;
          
          countQuery.or(`afw_height_feet.lt.${maxFeet},and(afw_height_feet.eq.${maxFeet},afw_height_inch.lte.${maxInches})`);
        }
      }
      
      // Weight filter
      if (filters.weight) {
        const weightFilter = filters.weight;
        
        if (weightFilter.comparison === 'between' && weightFilter.minValue !== undefined && weightFilter.maxValue !== undefined) {
          countQuery.gte('afw_weight', weightFilter.minValue).lte('afw_weight', weightFilter.maxValue);
        } else if (weightFilter.comparison === 'min' && weightFilter.value !== undefined) {
          countQuery.gte('afw_weight', weightFilter.value);
        } else if (weightFilter.comparison === 'max' && weightFilter.value !== undefined) {
          countQuery.lte('afw_weight', weightFilter.value);
        }
      }
      
      // Athletic projection filter
      if (filters.athleticProjection && filters.athleticProjection.length > 0) {
        countQuery.in('afw_athletic_projection', filters.athleticProjection);
      }
      
      // Location filter (simplified for count query)
      if (filters.location && ((filters.location.values && filters.location.values.length > 0) || filters.location.type === 'radius')) {
        const { type, values } = filters.location;
        if (type === 'school_state' && values.length > 0) {
          countQuery.in('sfw_school_state', values);
        } else if (type === 'radius') {
          // Apply same radius logic to count query
          if (filters.location.radius?.center && filters.location.radius?.distance) {
            try {
              const { geocodeLocation, getBoundingBox } = await import('@/utils/geocoding');
              
              let centerLat: number, centerLng: number;
              
              if (filters.location.radius.coordinates) {
                centerLat = filters.location.radius.coordinates.lat;
                centerLng = filters.location.radius.coordinates.lng;
              } else {
                const centerLocation = await geocodeLocation(filters.location.radius.center);
                if (centerLocation) {
                  centerLat = centerLocation.lat;
                  centerLng = centerLocation.lng;
                } else {
                  return { data: [], hasMore: false, totalCount: 0 };
                }
              }
              
              const boundingBox = getBoundingBox(centerLat, centerLng, filters.location.radius.distance);
              
              countQuery
                .gte('sfw_address_latitude', boundingBox.minLat)
                .lte('sfw_address_latitude', boundingBox.maxLat)
                .gte('sfw_address_longitude', boundingBox.minLng)
                .lte('sfw_address_longitude', boundingBox.maxLng);
            } catch (error) {
              console.error('Error setting up radius bounding box for count:', error);
            }
          }
        }
      }
      
      // Conference filter
      if (filters.conferences && filters.conferences.length > 0) {
        countQuery.in('sfw_conference', filters.conferences);
      }
      
      // School level filter
      if (filters.schoolLevels && filters.schoolLevels.length > 0) {
        countQuery.in('sfw_fbs_conf_group', filters.schoolLevels);
      }
      
      // School filter
      if (filters.schools && filters.schools.length > 0) {
        countQuery.in('sfw_school_name', filters.schools);
      }
      
      // Athlete location filter (simplified for count query)
      if (filters.athleteLocation && ((filters.athleteLocation.values && filters.athleteLocation.values.length > 0) || filters.athleteLocation.type === 'radius' || filters.athleteLocation.type === 'recruiting_area')) {
        const { type, values } = filters.athleteLocation;
        if (type === 'hometown_state' && values.length > 0) {
          countQuery.in('ath_hometown_state', values);
        } else if (type === 'international') {
          countQuery.eq('ath_international', true);
        } else if (type === 'school_state' && values.length > 0) {
          countQuery.in('ath_school_school_state', values);
        } else if (type === 'county' && values.length > 0) {
          // For county filtering in count query, convert county names to county IDs
          try {
            const { convertCountyNamesToIds } = await import('./queries');
            const countyIds = await convertCountyNamesToIds(values);
            
            if (countyIds.length > 0) {
              countQuery.in('ath_school_county_id', countyIds);
            }
          } catch (error) {
            console.error('❌ Athlete location county filter (count) - error converting county names:', error);
          }
        } else if (type === 'radius') {
          // Apply same radius logic to count query for athlete location
          if (filters.athleteLocation.radius?.center && filters.athleteLocation.radius?.distance) {
            try {
              const { geocodeLocation, getBoundingBox } = await import('@/utils/geocoding');
              
              let centerLat: number, centerLng: number;
              
              if (filters.athleteLocation.radius.coordinates) {
                centerLat = filters.athleteLocation.radius.coordinates.lat;
                centerLng = filters.athleteLocation.radius.coordinates.lng;
              } else {
                const centerLocation = await geocodeLocation(filters.athleteLocation.radius.center);
                if (centerLocation) {
                  centerLat = centerLocation.lat;
                  centerLng = centerLocation.lng;
                } else {
                  return { data: [], hasMore: false, totalCount: 0 };
                }
              }
              
              const boundingBox = getBoundingBox(centerLat, centerLng, filters.athleteLocation.radius.distance);
              
              countQuery
                .gte('ath_school_address_latitude', boundingBox.minLat)
                .lte('ath_school_address_latitude', boundingBox.maxLat)
                .gte('ath_school_address_longitude', boundingBox.minLng)
                .lte('ath_school_address_longitude', boundingBox.maxLng);
            } catch (error) {
              console.error('Error processing athlete location radius filter in count query:', error);
              return { data: [], hasMore: false, totalCount: 0 };
            }
          }
        } else if (type === 'recruiting_area' && filters.athleteLocation.recruitingArea) {
          const { coachId } = filters.athleteLocation.recruitingArea;
          
          if (coachId) {
            try {
              const { fetchRecruitingAreasForCoach, convertStateIdsToAbbrevs, convertCountyIdsToNames } = await import('./queries');
              const recruitingAreas = await fetchRecruitingAreasForCoach(coachId);
              
              const orConditions = [];
              
              // Add state conditions (convert state IDs to abbreviations and search ath_school_school_state)
              if (recruitingAreas.stateIds.length > 0) {
                const stateAbbrevs = await convertStateIdsToAbbrevs(recruitingAreas.stateIds);
                if (stateAbbrevs.length > 0) {
                  orConditions.push(`ath_school_school_state.in.(${stateAbbrevs.map(s => `"${s}"`).join(',')})`);
                }
              }
              
              // Add county conditions (convert county IDs to county names, then to county IDs for ath_school_county_id)
              if (recruitingAreas.countyIds.length > 0) {
                const countyNames = await convertCountyIdsToNames(recruitingAreas.countyIds);
                if (countyNames.length > 0) {
                  // Convert county names back to IDs for ath_school_county_id
                  const { convertCountyNamesToIds } = await import('./queries');
                  const convertedCountyIds = await convertCountyNamesToIds(countyNames);
                  if (convertedCountyIds.length > 0) {
                    orConditions.push(`ath_school_county_id.in.(${convertedCountyIds.join(',')})`);
                  }
                }
              }
              
              // Add school conditions
              if (recruitingAreas.schoolIds.length > 0) {
                orConditions.push(`ath_school_id.in.(${recruitingAreas.schoolIds.join(',')})`);
              }
              
              // Apply OR conditions if any exist
              if (orConditions.length > 0) {
                countQuery.or(orConditions.join(','));
              }
            } catch (error) {
              console.error('❌ Error applying recruiting area filter for athlete location in count query:', error);
            }
          }
        }
      }
    }
    
    // Apply search filter to count query if provided
    if (search && search.trim()) {
      const searchTerms = search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        if (searchTerms.length === 1) {
          const term = searchTerms[0];
          countQuery.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,ath_school.ilike.%${term}%,sfw_school_name.ilike.%${term}%,afw_primary_position.ilike.%${term}%`);
        } else if (searchTerms.length === 2) {
          const [firstTerm, secondTerm] = searchTerms;
          const conditions = [
            `and(first_name.ilike.%${firstTerm}%,last_name.ilike.%${secondTerm}%)`,
            `and(first_name.ilike.%${secondTerm}%,last_name.ilike.%${firstTerm}%)`,
            `first_name.ilike.%${firstTerm} ${secondTerm}%`,
            `last_name.ilike.%${firstTerm} ${secondTerm}%`,
            `first_name.ilike.%${secondTerm} ${firstTerm}%`,
            `last_name.ilike.%${secondTerm} ${firstTerm}%`,
            `ath_school.ilike.%${firstTerm} ${secondTerm}%`,
            `ath_school.ilike.%${secondTerm} ${firstTerm}%`,
            `sfw_school_name.ilike.%${firstTerm} ${secondTerm}%`,
            `sfw_school_name.ilike.%${secondTerm} ${firstTerm}%`
          ];
          countQuery.or(conditions.join(','));
        } else {
          const fullSearchTerm = searchTerms.join(' ');
          const firstTerm = searchTerms[0];
          const lastTerm = searchTerms[searchTerms.length - 1];
          const conditions = [
            `and(first_name.ilike.%${firstTerm}%,last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
            `and(first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,last_name.ilike.%${lastTerm}%)`,
            `first_name.ilike.%${fullSearchTerm}%`,
            `last_name.ilike.%${fullSearchTerm}%`,
            `ath_school.ilike.%${fullSearchTerm}%`,
            `sfw_school_name.ilike.%${fullSearchTerm}%`
          ];
          countQuery.or(conditions.join(','));
        }
      }
    }
    
    // Add pagination to main query
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    // console.log('Executing query with filters:', { viewName, filters });
    const { data, error } = await query;
    const { count } = await countQuery;
    
    if (error) {
      console.error('Error fetching activity feed events:', error);
      // If the view doesn't exist, try falling back to a basic query
      if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        console.warn(`View ${viewName} does not exist yet. This is expected during development.`);
        return { data: [], hasMore: false, totalCount: 0 };
      }
      return { data: [], hasMore: false, totalCount: 0 };
    }
    
    // Calculate pagination info
    const totalCount = count || 0;
    const hasMore = (from + (data?.length || 0)) < totalCount;
    
    
    // Collect school IDs for logo fetching
    const schoolIds = (data || [])
      .map((event: any) => event.sfw_school_id)
      .filter((id: string) => id && id.trim() !== '');

    // Fetch school logos
    let schoolLogos: Record<string, string> = {};
    if (schoolIds.length > 0) {
      try {
        schoolLogos = await fetchSchoolLogos(schoolIds);
      } catch (error) {
        console.error('Error fetching school logos:', error);
      }
    }
    
    // Transform the data to match the ActivityEvent interface
    const transformedData = (data || []).map((event: any, index: number) => ({
      key: event.offer_id || index.toString(),
      athleteId: event.athlete_id || event.afw_id || event.id || event.afw_athlete_id || null,
      athlete: {
        name: event.first_name && event.last_name 
          ? `${event.first_name} ${event.last_name}`.trim()
          : event.first_name || event.last_name || 'Unknown',
        image: event.afw_image_url && event.afw_image_url !== '404' ? event.afw_image_url : '/blank-user.svg',
        height: event.afw_height_feet && event.afw_height_inch ? formatHeightWithFractions(event.afw_height_feet, event.afw_height_inch) : '',
        weight: event.afw_weight ? `${Math.round(event.afw_weight)}lbs` : '',
        position: event.afw_primary_position || ''
      },
      position: event.afw_primary_position || '',
      highSchool: {
        name: event.ath_school || '',
        location: event.ath_school_address_city && event.ath_school_school_state 
          ? `${event.ath_school_address_city}, ${event.ath_school_school_state}`
          : event.ath_school_school_state || '',
        schoolType: event.ath_school__school_type || ''
      },
      graduation: event.afw_grad_year || event.afw_year || '',
      college: {
        name: event.sfw_school_name || '',
        logo: schoolLogos[event.sfw_school_id] || '/blank-hs.svg'
      },
      eventDate: (() => {
        if (!event.offer_date) return '';
        
        // Parse the date and check if it falls within the invalid range
        const offerDate = new Date(event.offer_date);
        const dateString = offerDate.toISOString().split('T')[0]; // Get YYYY-MM-DD part
        
        // Check if date falls within the invalid range (1999-12-31 to 2000-01-02)
        if (dateString >= '1999-12-31' && dateString <= '2000-01-02') {
          return '';
        }
        
        return event.offer_date;
      })(),
      type: event.type || '',
      typeIcon: getTypeIcon(event.type),
      source: event.source || 'Unknown',
      offerCounts: processOfferCounts(event.offer_counts_by_group || [])
    }));
    
    return { data: transformedData, hasMore, totalCount };
    
  } catch (error) {
    console.error('Error in fetchActivityFeedEvents:', error);
    return { data: [], hasMore: false, totalCount: 0 };
  }
}

/**
 * Get the appropriate icon for event type
 */
function getTypeIcon(eventType: string): "checkmark" | "cross" | "solid-check" | "visit" | "camp" | null {
  if (!eventType) return null;
  
  const type = eventType.toLowerCase();
  
  // Offer events - green checkmark
  if (type === 'offer' || type === 'offer no football') {
    return 'checkmark';
  }
  
  // Signed/Commit events - green solid check
  if (type === 'signed' || type === 'commit' || type === 'commit no football') {
    return 'solid-check';
  }
  
  // Visit events - gray visit icon
  if (type === 'visit') {
    return 'visit';
  }
  
  // Camp events - gray camp icon
  if (type === 'camp' || type === 'camp no football') {
    return 'camp';
  }
  
  // Negative events - red cross
  if (type === 'de-commit') {
    return 'cross';
  }
  
  // Neutral events - no icon
  return null;
}

/**
 * Search activity feed events by text
 */
export async function searchActivityFeedEvents(
  customerId: string,
  searchText: string,
  filters?: {
    eventTypes?: string[];
    eventDateFrom?: string;
    eventDateTo?: string;
    graduationYears?: string[];
    positions?: string[];
    height?: {
      comparison: 'min' | 'max' | 'between';
      value?: number;
      minValue?: number;
      maxValue?: number;
      feet?: number;
      inches?: number;
      minFeet?: number;
      minInches?: number;
      maxFeet?: number;
      maxInches?: number;
    };
    weight?: {
      comparison: 'min' | 'max' | 'between';
      value?: number;
      minValue?: number;
      maxValue?: number;
    };
    athleticProjection?: string[];
    location?: {
      type: 'hometown_state' | 'international' | 'county' | 'school_state' | 'radius' | 'recruiting_area';
      values: string[];
      radius?: {
        center: string;
        distance: number;
        coordinates?: {
          lat: number;
          lng: number;
        };
      };
      recruitingArea?: {
        coachId: string;
        stateIds: number[];
        countyIds: number[];
        schoolIds: string[];
      };
    };
    conferences?: string[];
    schoolLevels?: string[];
    schools?: string[];
    athleteLocation?: {
      type: 'hometown_state' | 'international' | 'county' | 'school_state' | 'radius' | 'recruiting_area';
      values: string[];
      radius?: {
        center: string;
        distance: number;
        coordinates?: {
          lat: number;
          lng: number;
        };
      };
      recruitingArea?: {
        coachId: string;
        stateIds: number[];
        countyIds: number[];
        schoolIds: string[];
      };
    };
  },
  page: number = 1,
  pageSize: number = 25
): Promise<{ data: ActivityEvent[]; hasMore: boolean; totalCount: number }> {
  try {
    const viewName = await getActivityFeedView(customerId);
    
    // If no access, return empty result
    if (viewName === 'none') {
      return { data: [], hasMore: false, totalCount: 0 };
    }
    
    // For now, we'll fetch all events and filter client-side
    // In the future, this could be optimized with database text search
    const result = await fetchActivityFeedEvents(customerId, searchText, filters, page, pageSize);
    
    if (!searchText.trim()) {
      return result;
    }
    
    const searchLower = searchText.toLowerCase();
    
    const filteredData = result.data.filter(event => 
      event.athlete.name.toLowerCase().includes(searchLower) ||
      event.highSchool.name.toLowerCase().includes(searchLower) ||
      event.college.name.toLowerCase().includes(searchLower) ||
      event.type.toLowerCase().includes(searchLower)
    );
    
    return { 
      data: filteredData, 
      hasMore: result.hasMore, 
      totalCount: result.totalCount 
    };
    
  } catch (error) {
    console.error('Error in searchActivityFeedEvents:', error);
    return { data: [], hasMore: false, totalCount: 0 };
  }
}
