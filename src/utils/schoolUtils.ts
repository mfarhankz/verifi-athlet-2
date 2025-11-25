import { supabase } from "@/lib/supabaseClient";
import type { DataSourceType } from "@/app/(dashboard)/_components/filters/GenericFilterConfig";

export interface School {
  id: string;
  name: string;
}

export type DivisionType = 'D1' | 'D2' | 'D3' | 'NAIA' | 'HIGH_SCHOOL' | 'JUNIOR_COLLEGE' | 'ALL' | 'NJCAA' | 'CCCAA' | 'NWAC';

/**
 * Helper function to get available divisions based on data source
 * @param dataSource - The data source type
 * @returns Array of division types available for the data source
 */
export function getAvailableDivisions(dataSource?: DataSourceType): DivisionType[] {
  switch (dataSource) {
    case 'transfer_portal':
    case 'all_athletes':
      return ['D1', 'D2', 'D3', 'NAIA', 'NJCAA', 'CCCAA', 'NWAC'];
    case 'juco':
      return ['NJCAA', 'CCCAA', 'NWAC'];
    case 'high_schools':
    case 'hs_athletes':
      return []; // No division filtering for high schools
    case 'activity_feed':
    case 'recruiting_board':
      return []; // No division filtering for activity feed or recruiting board
    default:
      return ['D1', 'D2', 'D3', 'NAIA', 'NJCAA', 'CCCAA', 'NWAC'];
  }
}

export interface SchoolFilterOptions {
  division?: DivisionType;
  divisions?: DivisionType[];
  sportId?: string;
  conference?: string;
  state?: string;
}

/**
 * Fetches schools filtered by division and other criteria
 * @param options - Filtering options for schools
 * @returns Promise<School[]> - Array of schools matching the criteria
 */
export async function fetchSchoolsByDivision(options: SchoolFilterOptions = {}): Promise<School[]> {
  try {
    const { division, divisions, sportId, conference, state } = options;

    // If no division filter is specified, return all schools
    if (!division && !divisions) {
      const { data, error } = await supabase
        .from('school')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error fetching all schools:', error);
        return [];
      }

      return data || [];
    }

    // Determine which divisions to fetch
    const targetDivisions = divisions || (division ? [division] : []);
    
    // Build the division filter conditions
    const divisionConditions = targetDivisions.map(div => {
      if (div === 'NAIA') {
        return { data_type_id: 118, value: 'NAIA' };
      } else if (div === 'NJCAA' || div === 'CCCAA' || div === 'NWAC') {
        // NJCAA, CCCAA, and NWAC are stored in athletic_association (data_type_id 118)
        return { data_type_id: 118, value: div };
      } else if (div === 'HIGH_SCHOOL') {
        return { data_type_id: 117, value: 'High School' };
      } else if (div === 'JUNIOR_COLLEGE') {
        return { data_type_id: 117, value: 'Junior College' };
      } else {
        // D1, D2, D3 are stored in division (data_type_id 119)
        return { data_type_id: 119, value: div };
      }
    });

    // Fetch school IDs for each division
    const schoolIdPromises = divisionConditions.map(async (condition) => {
      const { data, error } = await supabase
        .from("school_fact")
        .select("school_id")
        .eq("data_type_id", condition.data_type_id)
        .eq("value", condition.value);

      if (error) {
        console.error(`Error fetching ${condition.value} school IDs:`, error);
        return [];
      }

      return data?.map((item: { school_id: string }) => item.school_id) || [];
    });

    const schoolIdArrays = await Promise.all(schoolIdPromises);
    
    // Flatten and deduplicate school IDs
    const allSchoolIds = [...new Set(schoolIdArrays.flat())];

    if (allSchoolIds.length === 0) {
      return [];
    }

    // Batch the school IDs to avoid URL length limits
    const batchSize = 100; // Process 100 school IDs at a time
    const batches = [];
    
    for (let i = 0; i < allSchoolIds.length; i += batchSize) {
      batches.push(allSchoolIds.slice(i, i + batchSize));
    }


    // Fetch schools in batches
    const batchPromises = batches.map(async (batch) => {
      let query = supabase
        .from("school")
        .select("id, name")
        .in("id", batch);

      // Apply additional filters if provided
      if (conference) {
        // Get school IDs that match the conference
        const { data: conferenceData } = await supabase
          .from("school_fact")
          .select("school_id")
          .eq("data_type_id", 120) // Assuming 120 is conference data_type_id
          .eq("value", conference);

        if (conferenceData && conferenceData.length > 0) {
          const conferenceSchoolIds = conferenceData.map((item: { school_id: string }) => item.school_id);
          query = query.in("id", conferenceSchoolIds);
        }
      }

      if (state) {
        // Get school IDs that match the state
        const { data: stateData } = await supabase
          .from("school_fact")
          .select("school_id")
          .eq("data_type_id", 121) // Assuming 121 is state data_type_id
          .eq("value", state);

        if (stateData && stateData.length > 0) {
          const stateSchoolIds = stateData.map((item: { school_id: string }) => item.school_id);
          query = query.in("id", stateSchoolIds);
        }
      }

      const { data, error } = await query.order("name");

      if (error) {
        console.error('Error fetching schools batch:', error);
        return [];
      }

      return data || [];
    });

    const batchResults = await Promise.all(batchPromises);
    const allSchools = batchResults.flat();

    return allSchools;
  } catch (error) {
    console.error('Error in fetchSchoolsByDivision:', error);
    return [];
  }
}

/**
 * Fetches schools for a specific division (convenience function)
 * @param division - The division to filter by
 * @returns Promise<School[]> - Array of schools in the specified division
 */
export async function fetchSchoolsBySingleDivision(division: DivisionType): Promise<School[]> {
  return fetchSchoolsByDivision({ division });
}

/**
 * Fetches all schools (convenience function)
 * @returns Promise<School[]> - Array of all schools
 */
export async function fetchAllSchools(): Promise<School[]> {
  return fetchSchoolsByDivision();
}

/**
 * Fetches schools for multiple divisions
 * @param divisions - Array of divisions to filter by
 * @returns Promise<School[]> - Array of schools in the specified divisions
 */
export async function fetchSchoolsByMultipleDivisions(divisions: DivisionType[]): Promise<School[]> {
  return fetchSchoolsByDivision({ divisions });
}

/**
 * Fetches high schools (convenience function)
 * @returns Promise<School[]> - Array of high schools
 */
export async function fetchHighSchools(): Promise<School[]> {
  return fetchSchoolsByDivision({ division: 'HIGH_SCHOOL' });
}

/**
 * Hook-like function for React components to fetch schools with loading state
 * @param options - Filtering options for schools
 * @returns Object with schools array and loading state
 */
export async function useSchoolsByDivision(options: SchoolFilterOptions = {}): Promise<{
  schools: School[];
  loading: boolean;
  error: string | null;
}> {
  try {
    const schools = await fetchSchoolsByDivision(options);
    return {
      schools,
      loading: false,
      error: null
    };
  } catch (error) {
    console.error('Error in useSchoolsByDivision:', error);
    return {
      schools: [],
      loading: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
