import { supabase } from './supabaseClient';
import { AthleteData, RecruitingBoardData, SportStatConfig, RecruitingBoardPosition } from '../types/database';
import { FilterState } from '../types/filters';
import { fetchUserDetails } from '../utils/utils';
import { US_STATE_ABBREVIATIONS } from '@/utils/constants';

// Package definitions for different tiers
const NAIA_PACKAGES: Record<string, number> = {
  bsb: 10,  // Baseball
  sb: 14,   // Softball
  wbb: 18,  // Women's Basketball
  mbb: 22,  // Men's Basketball
  wvol: 26, // Women's Volleyball
  mlax: 30, // Men's Lacrosse
  wlax: 34, // Women's Lacrosse
  mten: 38, // Men's Tennis
  wten: 42, // Women's Tennis
  mglf: 46, // Men's Golf
  wglf: 50, // Women's Golf
  mtaf: 54, // Men's Track & Field
  wtaf: 58, // Women's Track & Field
  mswm: 62, // Men's Swimming
  wswm: 66, // Women's Swimming
  mwre: 70, // Men's Wrestling
  msoc: 73, // Men's Soccer
  wsoc: 77, // Women's Soccer
};

const STARTER_PACKAGES: Record<string, number> = {
  bsb: 8,  // Baseball
  sb: 11,   // Softball
  wbb: 15,  // Women's Basketball
  mbb: 19,  // Men's Basketball
  wvol: 23, // Women's Volleyball
  mlax: 27, // Men's Lacrosse
  wlax: 31, // Women's Lacrosse
  mten: 35, // Men's Tennis
  wten: 39, // Women's Tennis
  mglf: 43, // Men's Golf
  wglf: 47, // Women's Golf
  mtaf: 51, // Men's Track & Field
  wtaf: 55, // Women's Track & Field
  mswm: 59, // Men's Swimming
  wswm: 63, // Women's Swimming
  mwre: 67, // Men's Wrestling
  msoc: 71, // Men's Soccer
  wsoc: 75, // Women's Soccer
};

const ELITE_PACKAGES: Record<string, number> = {
  bsb: 7,  // Baseball
  sb: 12,   // Softball
  wbb: 16,  // Women's Basketball
  mbb: 20,  // Men's Basketball
  wvol: 24, // Women's Volleyball
  mlax: 28, // Men's Lacrosse
  wlax: 32, // Women's Lacrosse
  mten: 36, // Men's Tennis
  wten: 40, // Women's Tennis
  mglf: 44, // Men's Golf
  wglf: 48, // Women's Golf
  mtaf: 52, // Men's Track & Field
  wtaf: 56, // Women's Track & Field
  mswm: 60, // Men's Swimming
  wswm: 64, // Women's Swimming
  mwre: 68, // Men's Wrestling
  msoc: 2, // Men's Soccer
  wsoc: 74, // Women's Soccer
};

// Cache for sport column config to prevent repeated calls
const sportColumnConfigCache = new Map<string, SportStatConfig[]>();

// Helper function to determine athletic aid value with override logic


// Helper function to determine package tier based on user packages and sport abbreviation
function determinePackageTier(userPackages: string[], sportAbbrev: string): 'naia' | 'starter' | 'elite' | null {
  const userPackageNumbers = userPackages.map(pkg => parseInt(pkg, 10));
  
  // Check NAIA packages first
  const naiaPackageId = NAIA_PACKAGES[sportAbbrev];
  if (naiaPackageId && userPackageNumbers.includes(naiaPackageId)) {
    return 'naia';
  }
  
  // Check STARTER packages
  const starterPackageId = STARTER_PACKAGES[sportAbbrev];
  if (starterPackageId && userPackageNumbers.includes(starterPackageId)) {
    return 'starter';
  }
  
  // Check ELITE packages
  const elitePackageId = ELITE_PACKAGES[sportAbbrev];
  if (elitePackageId && userPackageNumbers.includes(elitePackageId)) {
    return 'elite';
  }
  
  // No matching package found
  return null;
}

// Helper function to determine which columns to select based on filters and display columns
function getColumnsToSelect(filters?: FilterState, displayColumns?: string[], dataSource?: 'transfer_portal' | 'all_athletes', dynamicColumns?: SportStatConfig[]): string[] {
  const columns = new Set<string>();
  
  // Always include basic columns
  columns.add('athlete_id');
  
  // Use different column names based on data source
  if (dataSource === 'transfer_portal') {
    columns.add('m_first_name');
    columns.add('m_last_name');
  } else {
    columns.add('athlete_first_name');
    columns.add('athlete_last_name');
  }
  
  columns.add('initiated_date');
  columns.add('school_name');
  columns.add('school_id'); // Add school_id for logo fetching
  columns.add('is_receiving_athletic_aid');
  columns.add('commit_school_name');
  columns.add('commit_school_id'); // Add commit_school_id for logo fetching
  
  // Add columns based on filters
  if (filters) {
    if (filters.years?.length) {
      columns.add('year');
    }
    if (filters.divisions?.length) {
      columns.add('division');
    }
    if (filters.states?.length) {
      columns.add('hometown_state');
    }
    if (filters.international?.length) {
      columns.add('hometown_state');
    }
    if (filters.status?.length) {
      columns.add('m_status');
    }
    if (filters.position?.length) {
      columns.add('primary_position');
    }
    if (filters.status?.length) {
      columns.add('m_status');
    }
    if (filters.position?.length) {
      columns.add('primary_position');
    }
    // athletic_aid_override is no longer needed since processing is done upstream
    if (filters.gamesPlayed) {
      columns.add('gp'); // GP
    }

    if (filters.dateRange) {
      columns.add('initiated_date');
    }
    
    // Add dynamic stat columns that are being filtered
    Object.keys(filters).forEach(filterKey => {
      if (filterKey.startsWith('stat_')) {
        const dataTypeId = filterKey.replace('stat_', '');
        const column = dynamicColumns?.find(col => col.data_type_id.toString() === dataTypeId);
        if (column?.sanitized_column_name) {
          columns.add(column.sanitized_column_name);
        }
      }
    });

    if (typeof filters.survey_completed === 'boolean') {
      columns.add('survey_completed');
    }
    
    // Add grad student column if filter is used
    if (filters.gradStudent !== undefined) {
      columns.add('is_transfer_graduate_student');
    }
  }
  
  // Add columns from display columns
  if (displayColumns) {
    displayColumns.forEach(col => {
      // Map display column names to view column names
      if (col === 'date') {
        columns.add('initiated_date');
      } else if (col === 'athletic_aid') {
        columns.add('is_receiving_athletic_aid');
      } else if (col === 'position') {
        columns.add('primary_position');
      } else if (col === 'high_name') {
        columns.add('high_school');
      } else if (col === 'state') {
        columns.add('hometown_state');
      } else if (col === 'true_score') {
        // Skip true_score as it's calculated, not a column
        return;
      } else if (col === 'id') {
        // Skip id as it's mapped to athlete_id
        return;
      } else if (col.startsWith('stat_')) {
        // Skip numbered stat columns as they don't exist in the view
        return;
      } else {
        columns.add(col);
      }
    });
  }
  
  // Always include essential columns for the frontend
  columns.add('high_school');
  columns.add('primary_position');
  columns.add('division'); // Always include division for name column display
  columns.add('year'); // Always include year for name column display
  // Add image_url column for profile pictures
  columns.add('image_url');
  
  // Add height data if data_type_id 304 is in dynamic columns
  if (dynamicColumns?.some(col => col.data_type_id === 304)) {
    columns.add('height_feet');
    columns.add('height_inch');
  }
  
  // Add stat columns needed for true score calculation
  // columns.add('woba'); // woba_score
  // columns.add('fip'); // fip_score
  
  return Array.from(columns);
}

export async function fetchAthleteData(
  sport: string,
  options?: {
    page?: number;
    limit?: number;
    filters?: FilterState;
    search?: string;
    sportId?: string;
    dataSource?: 'transfer_portal' | 'all_athletes';
    displayColumns?: string[];
    sportAbbrev?: string; // Add sportAbbrev as an optional parameter
    userPackages?: string[]; // Add userPackages as an optional parameter
    dynamicColumns?: SportStatConfig[]; // Add dynamicColumns for stat filtering
    sortField?: string | null; // Add sortField parameter
    sortOrder?: 'ascend' | 'descend' | null; // Add sortOrder parameter
    userSchoolId?: string; // Add userSchoolId parameter for filtering out user's own school
  }
): Promise<{ data: AthleteData[]; hasMore: boolean; totalCount?: number }> {
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;
    const dataSource = options?.dataSource || 'transfer_portal';

    // Get sport abbreviation for the view name - use provided value or fallback to API call
    const sportAbbrev = options?.sportAbbrev;
    
    // Get user packages - either from options or fetch from user details
    let userPackages = options?.userPackages;
    if (!userPackages) {
      const userDetails = await fetchUserDetails();
      userPackages = userDetails?.packages || [];
    }
    
    // Determine package tier based on user packages and sport abbreviation
    if (!sportAbbrev) {
      throw new Error('Sport abbreviation is required to determine package tier');
    }
    
    const packageTier = determinePackageTier(userPackages || [], sportAbbrev);
    
    if (!packageTier) {
      throw new Error(`No access package found for sport abbreviation: ${sportAbbrev}. Available packages: ${(userPackages || []).join(', ')}`);
    }
    
    // Build view name based on data source and package tier
    const tierSuffix = packageTier === 'naia' ? '_naia' : packageTier === 'starter' ? '_starter' : '';
    const viewName = dataSource === 'transfer_portal' 
      ? `vw_tp_athletes_wide_${sportAbbrev}${tierSuffix}`
      : `vw_athletes_wide_${sportAbbrev}`;
    
    // Determine which columns to select
    const columnsToSelect = getColumnsToSelect(options?.filters, options?.displayColumns, dataSource, options?.dynamicColumns);
    const selectString = columnsToSelect.join(', ');
    
    // Build the base query using the new wide view
    let query = supabase
      .from(viewName)
      .select(selectString, { count: 'exact' })
      .limit(limit);

    // Apply filters if provided
    if (options?.filters) {
      if (options.filters.years?.length) {
        query = query.in('year', options.filters.years);
      }
      if (options.filters.divisions?.length) {
        query = query.in('division', options.filters.divisions);
      }
      if (options.filters.states?.length) {
        query = query.in('hometown_state', options.filters.states);
      }
      if (options.filters.international?.length) {
        // Check if "All International" is selected
        if (options.filters.international.includes('ALL_INTERNATIONAL')) {
          // Filter out US states - show all international players
          query = query.not('hometown_state', 'in', `(${US_STATE_ABBREVIATIONS.map(state => `"${state}"`).join(',')})`)
                       .not('hometown_state', 'is', null)
                       .neq('hometown_state', '');
        } else {
          // Filter by specific international locations
          query = query.in('hometown_state', options.filters.international);
        }
      }
      if (options.filters.athleticAid?.length) {
        // Athletic aid filtering now uses the processed value from the database
        query = query.in('is_receiving_athletic_aid', options.filters.athleticAid);
      }
      if (options.filters.status?.length) {
        query = query.in('m_status', options.filters.status);
      }
      if (options.filters.position?.length) {
        query = query.in('primary_position', options.filters.position);
      }
      if (options.filters.status?.length) {
        query = query.in('m_status', options.filters.status);
      }
      if (options.filters.position?.length) {
        query = query.in('primary_position', options.filters.position);
      }

      if (options.filters.dateRange) {
        const { startDate, endDate } = options.filters.dateRange;
        query = query.gte('initiated_date', startDate).lte('initiated_date', endDate);
      }
      
      // Handle dynamic stat filters
      Object.keys(options.filters || {}).forEach(filterKey => {
        if (filterKey.startsWith('stat_')) {
          const dataTypeId = filterKey.replace('stat_', '');
          const filterValue = options.filters![filterKey];
          
          if (filterValue && typeof filterValue === 'object' && 'comparison' in filterValue) {
            // Find the corresponding column name from dynamicColumns
            const column = options.dynamicColumns?.find((col: SportStatConfig) => col.data_type_id.toString() === dataTypeId);
            if (column?.sanitized_column_name) {
              const { comparison } = filterValue;
              const columnName = column.sanitized_column_name;

              // Detect GP/GS by heading or known ids to optionally treat null as 0
              const nameLower = (column.data_type_name || column.display_name || columnName || '').toLowerCase();
              const isGpGsByHeading = ['gp','gs','games played','games started','games_played','games_started'].includes(nameLower);
              const isGpGsColumn = isGpGsByHeading || [98, 99, 83].includes(column.data_type_id);
              
              if (comparison === 'between' && 'minValue' in filterValue && 'maxValue' in filterValue) {
                // Handle between comparison with min and max values
                query = query.gte(columnName, filterValue.minValue)
                          .lte(columnName, filterValue.maxValue);
              } else if ('value' in filterValue) {
                // Handle other comparisons (greater, less, equal)
                const { value } = filterValue;
                if (comparison === 'greater') {
                  query = query.gte(columnName, value);
                } else if (comparison === 'less') {
                  // For GP/GS Max filter, include nulls (treat null as 0)
                  if (isGpGsColumn) {
                    query = query.or(`${columnName}.lte.${value},${columnName}.is.null`);
                  } else {
                    query = query.lte(columnName, value);
                  }
                } else if (comparison === 'equal') {
                  // Special-case: For GP/GS filters where value is 0, treat null as 0
                  if (isGpGsColumn && (value === 0 || value === '0')) {
                    // Note: Using OR here may conflict with other OR filters on the same query.
                    // It ensures athletes with null GP/GS are included when filtering for 0.
                    query = query.or(`${columnName}.eq.0,${columnName}.is.null`);
                  } else {
                    query = query.eq(columnName, value);
                  }
                }
              }
            }
          }
        }
      });

      if (Array.isArray(options.filters.survey_completed)) {
        const values = options.filters.survey_completed;
        if (values.length === 1) {
          if (values[0] === true) {
            query = query.eq('survey_completed', 'true');
          } else if (values[0] === false) {
            query = query.or("survey_completed.is.null,survey_completed.eq.'',survey_completed.eq.'false'");
          }
        }
        // If both Yes and No are selected, do not filter
      } else if (typeof options.filters.survey_completed === 'boolean') {
        if (options.filters.survey_completed === true) {
          query = query.eq('survey_completed', 'true');
        } else {
          query = query.or("survey_completed.is.null,survey_completed.eq.'',survey_completed.eq.'false'");
        }
      }
    }

    // Apply grad student filter if provided
    if (options.filters?.gradStudent !== undefined) {
      if (Array.isArray(options.filters.gradStudent)) {
        const values = options.filters.gradStudent;
        if (values.length === 1) {
          if (values[0] === true) {
            query = query.eq('is_transfer_graduate_student', true);
          } else if (values[0] === false) {
            query = query.or("is_transfer_graduate_student.is.null,is_transfer_graduate_student.eq.false");
          }
        }
        // If both Yes and No are selected, do not filter
      }
    }

    // Apply search if provided
    if (options?.search) {
      const searchTerms = options.search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        if (dataSource === 'transfer_portal') {
          if (searchTerms.length === 1) {
            // Single word: search in first name, last name, and college names (excluding high school)
            const term = searchTerms[0];
            query = query.or(`m_first_name.ilike.%${term}%,m_last_name.ilike.%${term}%,school_name.ilike.%${term}%,commit_school_name.ilike.%${term}%`);
          } else if (searchTerms.length === 2) {
            // Two words: most likely first name and last name
            const [firstTerm, secondTerm] = searchTerms;
            
            // Create a complex OR condition that includes multiple AND scenarios
            // This builds: (first_name LIKE 'john%' AND last_name LIKE 'smith%') OR (first_name LIKE 'smith%' AND last_name LIKE 'john%') OR (first_name LIKE 'john smith%') OR (last_name LIKE 'john smith%')
            const conditions = [
              // Exact order: first term in first name AND second term in last name
              `and(m_first_name.ilike.%${firstTerm}%,m_last_name.ilike.%${secondTerm}%)`,
              // Reverse order: second term in first name AND first term in last name  
              `and(m_first_name.ilike.%${secondTerm}%,m_last_name.ilike.%${firstTerm}%)`,
              // Full search term in first name only
              `m_first_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in last name only
              `m_last_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in reverse order in first name
              `m_first_name.ilike.%${secondTerm} ${firstTerm}%`,
              // Full search term in reverse order in last name  
              `m_last_name.ilike.%${secondTerm} ${firstTerm}%`,
              // College name searches (excluding high school)
              `school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `school_name.ilike.%${secondTerm} ${firstTerm}%`,
              `commit_school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `commit_school_name.ilike.%${secondTerm} ${firstTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          } else {
            // More than 2 words: try different combinations
            const fullSearchTerm = searchTerms.join(' ');
            const firstTerm = searchTerms[0];
            const lastTerm = searchTerms[searchTerms.length - 1];
            const middleTerms = searchTerms.slice(1, -1).join(' ');
            
            const conditions = [
              // First word in first name, rest in last name
              `and(m_first_name.ilike.%${firstTerm}%,m_last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
              // All but last word in first name, last word in last name
              `and(m_first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,m_last_name.ilike.%${lastTerm}%)`,
              // Full term in first name
              `m_first_name.ilike.%${fullSearchTerm}%`,
              // Full term in last name
              `m_last_name.ilike.%${fullSearchTerm}%`,
              // Full term in college names (excluding high school)
              `school_name.ilike.%${fullSearchTerm}%`,
              `commit_school_name.ilike.%${fullSearchTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          }
        } else {
          if (searchTerms.length === 1) {
            // Single word: search in first name, last name, and college names (excluding high school)
            const term = searchTerms[0];
            query = query.or(`athlete_first_name.ilike.%${term}%,athlete_last_name.ilike.%${term}%,school_name.ilike.%${term}%,commit_school_name.ilike.%${term}%`);
          } else if (searchTerms.length === 2) {
            // Two words: most likely first name and last name
            const [firstTerm, secondTerm] = searchTerms;
            
            const conditions = [
              // Exact order: first term in first name AND second term in last name
              `and(athlete_first_name.ilike.%${firstTerm}%,athlete_last_name.ilike.%${secondTerm}%)`,
              // Reverse order: second term in first name AND first term in last name  
              `and(athlete_first_name.ilike.%${secondTerm}%,athlete_last_name.ilike.%${firstTerm}%)`,
              // Full search term in first name only
              `athlete_first_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in last name only
              `athlete_last_name.ilike.%${firstTerm} ${secondTerm}%`,
              // Full search term in reverse order in first name
              `athlete_first_name.ilike.%${secondTerm} ${firstTerm}%`,
              // Full search term in reverse order in last name  
              `athlete_last_name.ilike.%${secondTerm} ${firstTerm}%`,
              // College name searches (excluding high school)
              `school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `school_name.ilike.%${secondTerm} ${firstTerm}%`,
              `commit_school_name.ilike.%${firstTerm} ${secondTerm}%`,
              `commit_school_name.ilike.%${secondTerm} ${firstTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          } else {
            // More than 2 words: try different combinations
            const fullSearchTerm = searchTerms.join(' ');
            const firstTerm = searchTerms[0];
            const lastTerm = searchTerms[searchTerms.length - 1];
            
            const conditions = [
              // First word in first name, rest in last name
              `and(athlete_first_name.ilike.%${firstTerm}%,athlete_last_name.ilike.%${searchTerms.slice(1).join(' ')}%)`,
              // All but last word in first name, last word in last name
              `and(athlete_first_name.ilike.%${searchTerms.slice(0, -1).join(' ')}%,athlete_last_name.ilike.%${lastTerm}%)`,
              // Full term in first name
              `athlete_first_name.ilike.%${fullSearchTerm}%`,
              // Full term in last name
              `athlete_last_name.ilike.%${fullSearchTerm}%`,
              // Full term in college names (excluding high school)
              `school_name.ilike.%${fullSearchTerm}%`,
              `commit_school_name.ilike.%${fullSearchTerm}%`
            ];
            
            query = query.or(conditions.join(','));
          }
        }
      }
    }

    // Filter out user's own school for transfer portal data source
    if (dataSource === 'transfer_portal' && options?.userSchoolId) {
      query = query.neq('school_id', options.userSchoolId);
    }

    // Apply sorting if provided, otherwise use default ordering
    if (options?.sortField && options?.sortOrder) {
      // Map frontend column names to database column names
      let dbColumnName = options.sortField;
      
      // Handle column name mapping
      if (options.sortField === 'date') {
        dbColumnName = 'initiated_date';
      } else if (options.sortField === 'athletic_aid') {
        dbColumnName = 'is_receiving_athletic_aid';
      } else if (options.sortField === 'position') {
        dbColumnName = 'primary_position';
      } else if (options.sortField === 'high_name') {
        dbColumnName = 'high_school';
      } else if (options.sortField === 'state') {
        dbColumnName = 'hometown_state';
      } else if (options.sortField === 'true_score') {
        // For true_score, we'll sort by woba_score as a proxy since it's calculated
        dbColumnName = 'woba_score';
      }
      
      // Check if the column exists in the selected columns
      if (columnsToSelect.includes(dbColumnName)) {
        // For base (non-dynamic) columns, detect GP/GS by heading/name as well
        const dynamicSortColumn = options.dynamicColumns?.find(col => 
          col.sanitized_column_name === options.sortField ||
          col.data_type_name?.toLowerCase().replace(/\s+/g, '_') === options.sortField ||
          col.display_name?.toLowerCase().replace(/\s+/g, '_') === options.sortField
        );
        const sortFieldLower = (options.sortField || '').toLowerCase();
        const headingLower = (dynamicSortColumn?.data_type_name || dynamicSortColumn?.display_name || sortFieldLower).toLowerCase();
        const isGpGsByHeading = ['gp','gs','games played','games started','games_played','games_started'].includes(headingLower);

        if (options.sortOrder === 'ascend') {
          // Ascending: GP/GS -> nulls on top; others -> nulls on bottom
          if (isGpGsByHeading) {
            query = query.order(dbColumnName, { ascending: true, nullsFirst: true });
          } else {
            query = query.order(dbColumnName, { ascending: true, nullsLast: true });
          }
        } else {
          // Descending: nulls at bottom for all, including GP/GS
          if (isGpGsByHeading) {
            query = query.order(dbColumnName, { ascending: false, nullsFirst: false });
          } else {
            query = query.order(dbColumnName, { ascending: false, nullsFirst: false });
          }
        }
      } else {
        // For dynamic columns, check if it's a stat column
        const dynamicColumn = options.dynamicColumns?.find(col => 
          col.sanitized_column_name === options.sortField || 
          col.data_type_name?.toLowerCase().replace(/\s+/g, '_') === options.sortField ||
          col.display_name.toLowerCase().replace(/\s+/g, '_') === options.sortField
        );
        
        if (dynamicColumn?.sanitized_column_name && columnsToSelect.includes(dynamicColumn.sanitized_column_name)) {
          // Check if this is a GP/GS column by id or heading
          const nameLower = (dynamicColumn.data_type_name || dynamicColumn.display_name || dynamicColumn.sanitized_column_name || '').toLowerCase();
          const isGpGsByHeading = ['gp','gs','games played','games started','games_played','games_started'].includes(nameLower);
          const isGpGsColumn = isGpGsByHeading || [98, 99, 83].includes(dynamicColumn.data_type_id);
          
          // Special handling for height column (data_type_id 304)
          if (dynamicColumn.data_type_id === 304) {
            // For height, we'll sort by height_feet first, then height_inch
            // This will be handled in the frontend since we're fetching height data separately
            query = query.order('initiated_date', { ascending: false });
          }
          
          if (options.sortOrder === 'ascend') {
            // Ascending: GP/GS -> nulls on top (treated as 0); others -> nulls on bottom
            if (isGpGsColumn) {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: true, nullsFirst: true });
            } else {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: true, nullsLast: true });
            }
          } else {
            // Descending: nulls at bottom for all, including GP/GS
            if (isGpGsColumn) {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: false, nullsFirst: false });
            } else {
              query = query.order(dynamicColumn.sanitized_column_name, { ascending: false, nullsFirst: false });
            }
          }
        } else {
          // Fallback to default ordering if column not found
          query = query.order('initiated_date', { ascending: false });
        }
      }
    } else {
      // Default ordering
      query = query.order('initiated_date', { ascending: false });
    }
    
    
    // Add final sort by created_at with most recent first
    query = query.order('m_created_at', { ascending: false });
    
    // Add final sort by created_at with most recent first
    query = query.order('m_created_at', { ascending: false });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Add retry logic with exponential backoff and reduced timeout
    let retryCount = 0;
    const maxRetries = 3;
    let athleteData, athleteError, count;
    
    while (retryCount < maxRetries) {
      try {
        // Reduce timeout to 15 seconds to fail faster
        const queryPromise = query;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Query timeout after 15 seconds')), 15000);
        });
        
        const result = await Promise.race([queryPromise, timeoutPromise]) as any;
        athleteData = result.data;
        athleteError = result.error;
        count = result.count;
        break; // Success, exit retry loop
      } catch (error: any) {
        retryCount++;
        console.warn(`Query attempt ${retryCount} failed:`, error.message);
        
        if (retryCount >= maxRetries) {
          // If all retries fail, try a fallback approach with reduced data
          console.warn('All retry attempts failed, trying fallback query...');
          try {
            const fallbackResult = await fetchAthleteDataFallback(sport, options);
            return fallbackResult;
          } catch (fallbackError) {
            throw new Error(`Query failed after ${maxRetries} attempts and fallback: ${error.message}`);
          }
        }
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    if (athleteError) {
      throw new Error(`Failed to fetch athlete data: ${athleteError.message}`);
    }

    // If no data returned, return empty result early
    if (!athleteData || athleteData.length === 0) {
      return {
        data: [],
        hasMore: false
      };
    }

    // Collect school IDs for logo fetching (both current and commit schools)
    const schoolIds = athleteData
      .flatMap((row: any) => [row.school_id, row.commit_school_id])
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

    // Fetch height data from athlete_fact table if data_type_id 304 is in dynamic columns
    const heightData: Record<string, { height_feet: number | null; height_inch: number | null }> = {};
    if (options?.dynamicColumns?.some(col => col.data_type_id === 304)) {
      const athleteIds = athleteData.map((row: any) => row.athlete_id);
      if (athleteIds.length > 0) {
        try {
          const { data: factData, error: factError } = await supabase
            .from('athlete_fact')
            .select('athlete_id, data_type_id, value')
            .in('athlete_id', athleteIds)
            .in('data_type_id', [4, 5]); // height_feet and height_inch

          if (factError) {
            console.error('Error fetching height data:', factError);
          } else if (factData) {
            // Group by athlete_id and extract height data
            factData.forEach((fact: any) => {
              if (!heightData[fact.athlete_id]) {
                heightData[fact.athlete_id] = { height_feet: null, height_inch: null };
              }
              if (fact.data_type_id === 4) {
                heightData[fact.athlete_id].height_feet = parseInt(fact.value);
              } else if (fact.data_type_id === 5) {
                heightData[fact.athlete_id].height_inch = parseInt(fact.value);
              }
            });
          }
        } catch (error) {
          console.error('Error fetching height data:', error);
        }
      }
    }

    // Transform the data directly from the view (both data sources use the same logic)
    const transformedData = athleteData.map((row: any) => {
      // Calculate true score from the stat columns - take highest from woba and fip
      const wobaScore = row.woba_score ? parseFloat(row.woba_score) : 0;
      const fipScore = row.fip_score ? parseFloat(row.fip_score) : 0;
      const trueScore = Math.max(wobaScore, fipScore);

      // Athletic aid is now processed upstream in the database
      const athleticAidValue = row.is_receiving_athletic_aid;

      // Get the correct name columns based on data source
      const firstName = dataSource === 'transfer_portal' ? row.m_first_name : row.athlete_first_name;
      const lastName = dataSource === 'transfer_portal' ? row.m_last_name : row.athlete_last_name;

      // Get the columns to exclude from dynamic stats based on data source
      const excludedColumns = dataSource === 'transfer_portal' 
        ? ['gp', 'athlete_id', 'm_first_name', 'm_last_name', 'initiated_date', 'school_name', 'school_id', 'commit_school_id', 'is_receiving_athletic_aid', 'year', 'division', 'hometown_state', 'high_school', 'primary_position', 'commit_school_name', 'image_url', 'm_status', 'height_feet', 'height_inch']
        : ['gp', 'athlete_id', 'athlete_first_name', 'athlete_last_name', 'initiated_date', 'school_name', 'school_id', 'commit_school_id', 'is_receiving_athletic_aid', 'year', 'division', 'hometown_state', 'high_school', 'primary_position', 'commit_school_name', 'image_url', 'height_feet', 'height_inch'];

      return {
        id: row.athlete_id,
        athlete_name: `${firstName} ${lastName}`,
        name_name: row.school_name || '',
        school_id: row.school_id || '',
        school_logo_url: schoolLogos[row.school_id] || '',
        commit_school_id: row.commit_school_id || '',
        commit_school_logo_url: schoolLogos[row.commit_school_id] || '',
        date: row.initiated_date || '',
        division: row.division || '',
        year: row.year || '',
        athletic_aid: athleticAidValue,
        high_name: row.high_school || '',
        state: row.hometown_state || '',
        position: row.primary_position || '',
        commit_school_name: row.commit_school_name || '',
        status: row.m_status || '',
        image_url: row.image_url || "/blank-user.svg",
        gp: (() => {
          const gpValue = row.gp ? parseInt(row.gp) : null;
          return gpValue;
        })(),
        gs: parseInt(row.gs || '0'),
        goals: parseInt(row.goals || '0'),
        ast: parseInt(row.assists || '0'),
        gk_min: parseInt(row.gk_min || '0'),
        true_score: trueScore,
        // Add height data if available
        height_feet: heightData[row.athlete_id]?.height_feet || (row.height_feet ? parseInt(row.height_feet) : null),
        height_inch: heightData[row.athlete_id]?.height_inch || (row.height_inch ? parseInt(row.height_inch) : null),
        // Add any additional dynamic stats that were selected
        ...Object.keys(row).reduce((acc: any, key: string) => {
          if (!excludedColumns.includes(key)) {
            // Keep the original value type - preserve null values
            acc[key] = row[key];
          }
          return acc;
        }, {})
      };
    });

    return {
      data: transformedData,
      hasMore: count ? offset + limit < count : false,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Error in fetchAthleteData:', error);
    throw error;
  }
}

// Fallback function for when the main query fails
async function fetchAthleteDataFallback(
  sport: string,
  options?: {
    page?: number;
    limit?: number;
    filters?: FilterState;
    search?: string;
    sportId?: string;
    displayColumns?: string[];
    sportAbbrev?: string; // Add sportAbbrev as an optional parameter
    userPackages?: string[]; // Add userPackages as an optional parameter
    dynamicColumns?: SportStatConfig[]; // Add dynamicColumns for stat filtering
    sortField?: string | null; // Add sortField parameter
    sortOrder?: 'ascend' | 'descend' | null; // Add sortOrder parameter
    userSchoolId?: string; // Add userSchoolId parameter for filtering out user's own school
  }
): Promise<{ data: AthleteData[]; hasMore: boolean; totalCount?: number }> {
  console.warn('Using fallback query approach...');
  
  try {
    const page = options?.page || 1;
    const limit = options?.limit || 25;
    const offset = (page - 1) * limit;

    // Use a simpler query approach - query the base athlete table directly
    let query = supabase
      .from('athlete')
      .select(`
        id,
        first_name,
        last_name,
        sport_id
      `, { count: 'exact' })
      .limit(limit);

    // Apply sport_id filter if provided
    if (options?.sportId) {
      query = query.eq('sport_id', options.sportId);
    }

    // Apply search if provided
    if (options?.search) {
      const searchTerms = options.search.toLowerCase().trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        if (searchTerms.length === 1) {
          // Single word: search in first name, last name (fallback doesn't have school access)
          const term = searchTerms[0];
          query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%`);
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
            `last_name.ilike.%${secondTerm} ${firstTerm}%`
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
            `last_name.ilike.%${fullSearchTerm}%`
          ];
          
          query = query.or(conditions.join(','));
        }
      }
    }

    // Note: Fallback function doesn't have school_id filtering capability
    // as it queries the base athlete table which doesn't have school_id
    // The school filtering will only work with the main query using the wide views

    // Apply sorting if provided, otherwise use default ordering
    if (options?.sortField && options?.sortOrder) {
      // Map frontend column names to database column names for fallback
      let dbColumnName = options.sortField;
      
      // Handle column name mapping for fallback query
      if (options.sortField === 'date') {
        dbColumnName = 'created_at'; // Fallback uses created_at instead of initiated_date
      } else if (options.sortField === 'athletic_aid') {
        // Fallback doesn't have athletic aid data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'position') {
        // Fallback doesn't have position data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'high_name') {
        // Fallback doesn't have high school data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'state') {
        // Fallback doesn't have state data, skip sorting
        dbColumnName = 'id';
      } else if (options.sortField === 'true_score') {
        // Fallback doesn't have true score data, skip sorting
        dbColumnName = 'id';
      }
      
      // Note: Fallback function doesn't have access to dynamic columns with data_type_ids
      // So we can't check for GP/GS columns here, but they're handled in the main function
      // For ascending: nulls should come first (treated as 0)
      // For descending: nulls should come last (treated as 0) except for GP/GS
      if (options.sortOrder === 'ascend') {
        // For ascending, use nullsFirst to put nulls at the beginning
        query = query.order(dbColumnName, { ascending: true, nullsFirst: true });
      } else {
        // For descending, use nullsFirst: false to put nulls at the end
        // Note: GP/GS special handling is not available in fallback mode
        query = query.order(dbColumnName, { ascending: false, nullsFirst: false });
      }
    } else {
      // Default ordering for fallback
      query = query.order('id', { ascending: false });
    }
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: athleteData, error: athleteError, count } = await query;

    if (athleteError) {
      throw new Error(`Fallback query failed: ${athleteError.message}`);
    }

    if (!athleteData || athleteData.length === 0) {
      return {
        data: [],
        hasMore: false
      };
    }

    // Get basic athlete facts for the returned athletes
    const athleteIds = athleteData.map((a: any) => a.id);
    const { data: factData } = await supabase
      .from('athlete_fact')
      .select('athlete_id, data_type_id, value')
      .in('athlete_id', athleteIds)
      .in('data_type_id', [1, 2, 7, 24]) // Basic facts only
      .limit(100); // Limit to prevent timeouts

    // Create basic transformed data
    const transformedData = athleteData.map((row: any) => {
      const facts = factData?.filter((f: any) => f.athlete_id === row.id) || [];
      const year = facts.find((f: any) => f.data_type_id === 1)?.value || '';
      const position = facts.find((f: any) => f.data_type_id === 2)?.value || '';
      const highName = facts.find((f: any) => f.data_type_id === 7)?.value || '';
      const state = facts.find((f: any) => f.data_type_id === 24)?.value || '';

      return {
        id: row.id,
        athlete_name: `${row.first_name} ${row.last_name}`,
        name_name: '',
        date: '',
        division: '',
        year: year,
        athletic_aid: 'None',
        high_name: highName,
        state: state,
        position: position,
        gp: 0,
        gs: 0,
        goals: 0,
        ast: 0,
        gk_min: 0,
        true_score: 0
      };
    });

    return {
      data: transformedData,
      hasMore: count ? offset + limit < count : false,
      totalCount: count || 0
    };
  } catch (error) {
    console.error('Fallback query also failed:', error);
    throw error;
  }
}

// Function to get athlete_id from main_tp_page_id
export async function getAthleteIdFromMainTpPageId(mainTpPageId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('main_tp_page')
      .select('athlete_id')
      .eq('id', mainTpPageId)
      .single();
    
    if (error) {
      console.error('Error fetching athlete_id from main_tp_page_id:', error);
      return null;
    }
    
    return data?.athlete_id || null;
  } catch (error) {
    console.error('Error in getAthleteIdFromMainTpPageId:', error);
    return null;
  }
}

// Function to get main_tp_page_id from athlete_id
export async function getMainTpPageIdFromAthleteId(athleteId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('main_tp_page')
      .select('id')
      .eq('athlete_id', athleteId)
      .single();
    
    if (error) {
      console.error('Error fetching main_tp_page_id from athlete_id:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in getMainTpPageIdFromAthleteId:', error);
    return null;
  }
}

export async function fetchAthleteById(athleteId: string, userPackages?: string[]): Promise<AthleteData | null> {
  try {
    // First, try to get athlete data from the athlete table directly
    const { data: athleteData, error: athleteError } = await supabase
      .from('athlete')
      .select(`
        id,
        first_name,
        last_name,
        sport_id
      `)
      .eq('id', athleteId)
      .single();
    
    if (athleteError) {
      console.error('Error fetching athlete data:', athleteError);
      return null;
    }
    
    if (!athleteData) {
      console.error('No athlete data found with ID:', athleteId);
      return null;
    }

    // Get the sport abbreviation for the view name
    const sportIdToAbbrev: Record<number, string> = {
      1: 'mbb',
      2: 'wbb',
      3: 'msoc',
      4: 'wsoc',
      5: 'wvol',
      6: 'bsb',
      7: 'sb',
      8: 'mcc',
      9: 'wcc',
      10: 'mglf',
      11: 'wglf',
      12: 'mlax',
      13: 'wlax',
      14: 'mten',
      15: 'wten',
      16: 'mtaf',
      17: 'wtaf',
      18: 'mswm',
      19: 'wswm',
      20: 'mwre',
      21: 'fb',
    };
    const sportAbbrev = sportIdToAbbrev[athleteData.sport_id];
    if (!sportAbbrev) {
      throw new Error(`Unknown sport_id: ${athleteData.sport_id}`);
    }
    
    // Try to get data from the wide view first (this should contain the commit field)
    let wideViewData = null;
    const wideViewError = null;
    
    // Determine the correct view based on user packages
    if (userPackages && userPackages.length > 0) {
      const packageTier = determinePackageTier(userPackages, sportAbbrev);
      if (packageTier) {
        const tierSuffix = packageTier === 'naia' ? '_naia' : packageTier === 'starter' ? '_starter' : '';
        const viewName = `vw_tp_athletes_wide_${sportAbbrev}${tierSuffix}`;
        
        const { data: tierViewData, error: tierViewError } = await supabase
          .from(viewName)
          .select('commit_school_name, athlete_id')
          .eq('athlete_id', athleteId)
          .limit(1);
        
        if (!tierViewError && tierViewData && tierViewData.length > 0) {
          wideViewData = tierViewData;
        }
      }
    }
    
    // Fallback: if no user packages or no match, try the base view
    if (!wideViewData) {
              const { data: baseViewData, error: baseViewError } = await supabase
          .from(`vw_tp_athletes_wide_${sportAbbrev}`)
          .select('commit_school_name, athlete_id')
          .eq('athlete_id', athleteId)
          .limit(1);
      
      if (!baseViewError && baseViewData && baseViewData.length > 0) {
        wideViewData = baseViewData;
      }
    }
    
    let wideViewResult = null;
    if (wideViewData && wideViewData.length > 0) {
      wideViewResult = wideViewData[0];
    }

    // Fallback: try to get transfer portal data if the athlete is in the portal
    const { data: tpData, error: tpError } = await supabase
      .from('athlete_with_tp_page_details')
      .select(`
        id,
        first_name,
        last_name,
        initiated_date,
        year,
        school_id,
        school_name,
        is_receiving_athletic_aid
      `)
      .eq('id', athleteId)
      .limit(1);
    
    let transferPortalData = null;
    if (!tpError && tpData && tpData.length > 0) {
      transferPortalData = tpData[0];
    }

    // Get main_tp_page data (both id and status) for this athlete
    const { data: mainTpData, error: mainTpError } = await supabase
      .from('main_tp_page')
      .select(`
        id,
        status,
        designated_student_athlete
      `)
      .eq('athlete_id', athleteId)
      .limit(1);
    
    if (mainTpError) {
      console.error('Error fetching main_tp_page data:', mainTpError);
    }
    
    let detailsTpData = null;
    let detailsTpError = null;
    
    // Only query details_tp_page if there's a main_tp_page entry
    if (!mainTpError && mainTpData && mainTpData.length > 0) {
      const { data: detailsData, error: detailsError } = await supabase
        .from('details_tp_page')
        .select(`
          expected_grad_date,
          comments,
          email,
          ok_to_contact,
          is_four_year_transfer,
          commit,
          is_transfer_graduate_student
        `)
        .eq('main_tp_page_id', mainTpData[0].id)
        .limit(1);
      
      detailsTpData = detailsData;
      detailsTpError = detailsError;
    }
    
    if (detailsTpError) {
      console.error('Error fetching details_tp_page data:', detailsTpError);
    }

    // Get the first result from the arrays
    const mainTpResult = mainTpData && mainTpData.length > 0 ? mainTpData[0] : null;
    const detailsTpResult = detailsTpData && detailsTpData.length > 0 ? detailsTpData[0] : null;

    // Get all relevant athlete facts for survey data and athletic aid override
    const { data: surveyFacts, error: surveyFactsError } = await supabase
      .from('athlete_fact')
      .select(`
        data_type_id,
        value,
        created_at
      `)
      .eq('athlete_id', athleteId)
      .in('data_type_id', [
        31, // leaving_other
        40,  // leaving_playing_time
        41,  // leaving_higher_level
        42,  // leaving_coaches
        43,  // leaving_eligible_academic
        44,  // leaving_eligible_discipline
        45,  // leaving_eligible_other
        46,  // leaving_better_academics
        47,  // leaving_major
        48,  // leaving_home
        32,  // important
        34,  // walk_on_t25
        36,  // major_importance
        78,  // best_pos
        49,  // ideal_division
        50,  // full_scholarship_only
        51,  // distance_from_home
        52,  // ideal_campus_size
        53,  // campus_location_type
        54,  // cost_vs_acad_rep
        55,  // winning_vs_location
        56,  // playing_vs_championship
        57,  // cost_vs_campus_type
        58,  // playing_vs_size
        59,  // winning_vs_academics
        60,  // championship_vs_location
        61,  // party_vs_academics
        62,  // party_vs_winning
        77,  // type_of_staff_preferred
        63,  // male_to_female
        64,  // hbcu
        65,  // faith_based_name
        66,  // pref_d1_name
        67,  // pref_d2_name
        68,  // pref_d3_name
        69,  // pref_naia_name
        // athletic_aid_override is no longer needed since processing is done upstream
      ])
      .order('created_at', { ascending: false });

    if (surveyFactsError) {
      console.error('Error fetching survey facts:', surveyFactsError);
    }

    // Get name names for preferred names
    // const preferrednameIds = surveyFacts
    //   ?.filter((fact: { data_type_id: number; value: string }) => [66, 67, 68, 69].includes(fact.data_type_id))
    //   .map((fact: { data_type_id: number; value: string }) => fact.value)
    //   .filter(Boolean);

    // let nameNames: { [key: string]: string } = {};
    // if (preferrednameIds && preferrednameIds.length > 0) {
    //   const { data: schools, error: schoolsError } = await supabase
    //     .from('school')
    //     .select('id, name')
    //     .in('id', preferrednameIds);

    //   if (schoolsError) {
    //     console.error('Error fetching school names:', schoolsError);
    //   } else if (schools) {
    //     nameNames = schools.reduce((acc: { [key: string]: string }, school: { id: string; name: string }) => ({
    //       ...acc,
    //       [school.id]: school.name
    //     }), {});
    //   }
    // }

    // Helper function to find fact value by data_type_id
    // Since we ordered by created_at DESC, the first occurrence will be the most recent
    const findFactValue = (dataTypeId: number): string | undefined => {
      return surveyFacts?.find((fact: { data_type_id: number; value: string }) => fact.data_type_id === dataTypeId)?.value;
    };

    // Athletic aid override is no longer needed since processing is done upstream

    // Transform survey facts into the expected format
    const surveyData = {
      leaving_other: findFactValue(31),
      leaving_playing_time: findFactValue(40),
      leaving_higher_level: findFactValue(41),
      leaving_coaches: findFactValue(42),
      leaving_eligible_academic: findFactValue(43),
      leaving_eligible_discipline: findFactValue(44),
      leaving_eligible_other: findFactValue(45),
      leaving_better_academics: findFactValue(46),
      leaving_major: findFactValue(47),
      leaving_home: findFactValue(48),
      important: findFactValue(32),
      walk_on_t25: findFactValue(34),
      major_importance: findFactValue(36),
      best_pos: findFactValue(78),
      ideal_division: findFactValue(49),
      full_scholarship_only: findFactValue(50),
      distance_from_home: findFactValue(51),
      ideal_campus_size: findFactValue(52),
      campus_location_type: findFactValue(53),
      cost_vs_acad_rep: findFactValue(54),
      winning_vs_location: findFactValue(55),
      playing_vs_championship: findFactValue(56),
      cost_vs_campus_type: findFactValue(57),
      playing_vs_size: findFactValue(58),
      winning_vs_academics: findFactValue(59),
      championship_vs_location: findFactValue(60),
      party_vs_academics: findFactValue(61),
      party_vs_winning: findFactValue(62),
      type_of_staff_preferred: findFactValue(77),
      male_to_female: findFactValue(63),
      hbcu: findFactValue(64),
      faith_based_name: findFactValue(65),
      pref_d1_name: findFactValue(66),
      pref_d2_name: findFactValue(67),
      pref_d3_name: findFactValue(68),
      pref_naia_name: findFactValue(69)
    };

    // Get conference, division, and logo from school_fact table
    let conference: string | undefined = undefined;
    let division: string | undefined = undefined;
    let schoolLogoUrl: string | undefined = undefined;
    if (transferPortalData?.school_id) {
      // Map sport_id to conference data_type_id
      const sportIdToConferenceDataType: Record<number, number> = {
        1: 244,   // mbb_conference
        2: 260,   // wbb_conference  
        3: 116,   // msoc_conference
        4: 273,   // wsoc_conference
        5: 274,   // wvol_conference (assuming)
        6: 244,   // bsb_conference (assuming same as mbb for now)
        7: 263,   // sb_conference
        8: 262,   // mcc_conference (cross country)
        9: 262,   // wcc_conference (cross country) 
        10: 269,  // mglf_conference (golf)
        11: 270,  // wglf_conference (golf)
        12: 264,  // mlax_conference
        13: 265,  // wlax_conference
        14: 266,  // mten_conference
        15: 267,  // wten_conference
        16: 271,  // mtaf_conference (track and field)
        17: 272,  // wtaf_conference (track and field)
        18: 273,  // mswm_conference (swimming)
        19: 274,  // wswm_conference (swimming)
        20: 275,  // mwre_conference (wrestling)
        21: 259,  // fb_conference (football)
      };
      
      const conferenceDataTypeId = sportIdToConferenceDataType[athleteData.sport_id];
      const dataTypeIds = conferenceDataTypeId ? [conferenceDataTypeId, 119, 23] : [119, 23]; // 119 for division, 23 for logo URL
      
      const { data: schoolFactData, error: schoolFactError } = await supabase
        .from('school_fact')
        .select('data_type_id, value')
        .eq('school_id', transferPortalData.school_id)
        .in('data_type_id', dataTypeIds)
        .limit(3);

      if (schoolFactError) {
        console.error('Error fetching school fact data:', schoolFactError);
      } else if (schoolFactData && schoolFactData.length > 0) {
        schoolFactData.forEach((fact: { data_type_id: number; value: string }) => {
          if (fact.data_type_id === conferenceDataTypeId) {
            conference = fact.value;
          } else if (fact.data_type_id === 119) {
            division = fact.value;
          } else if (fact.data_type_id === 23) {
            schoolLogoUrl = fact.value;
          }
        });
      }
    }
    
    // Get commit school logo if there's a commit school
    let commitSchoolLogoUrl: string | undefined = undefined;
    const commitSchoolName = (wideViewResult as any)?.commit_school_name || (detailsTpResult as any)?.commit_school_name;
    if (commitSchoolName) {
      // First get the school ID from the school table
      const { data: commitSchoolData, error: commitSchoolError } = await supabase
        .from('school')
        .select('id')
        .eq('name', commitSchoolName)
        .limit(1);
      
      if (!commitSchoolError && commitSchoolData && commitSchoolData.length > 0) {
        const commitSchoolId = commitSchoolData[0].id;
        
        // Then get the logo URL from school_fact table
        const { data: commitSchoolFactData, error: commitSchoolFactError } = await supabase
          .from('school_fact')
          .select('value')
          .eq('school_id', commitSchoolId)
          .eq('data_type_id', 23) // Logo URL data type
          .limit(1);
        
        if (!commitSchoolFactError && commitSchoolFactData && commitSchoolFactData.length > 0) {
          commitSchoolLogoUrl = commitSchoolFactData[0].value;
        }
      }
    }
    
    // Get athlete facts for additional details
    const { data: factData, error: factError } = await supabase
      .from('athlete_fact')
      .select('data_type_id, value, created_at')
      .eq('athlete_id', athleteId)
              .in('data_type_id', [
        1,  // year
        2,  // primary_position
        3,  // secondary_position
        4,  // height_feet
        5,  // height_inch
        6,  // weight
        7,  // high_name
        8,  // previous_name
        10, // major
        11, // roster_link
        13, // twitter
        21, // bio
        23, // image_url
        24, // state
        26, // preferredContactWay
        27, // cellPhone
        29, // helpingWithDecision
        30, // contactInfo
        35, // gpa
        36, // importance
        37, // highlight
        38, // highnamehighlight
        121, // birthday
        25, // eligibilityRemaining
        16, // hand
        230, // perfect_game
        231, // prep_baseball_report
        232, // game_eval
        233, // club
        234, // summer_league
        246, // hometown_street
        247, // city (used for hometown)
        248  // state
      ])
      .order('created_at', { ascending: false });

    if (factError) {
      console.error('Error fetching athlete facts:', factError);
    }
    
    // Get stats for the athlete
    const { data: statsData, error: statsError } = await supabase
      .from('stat')
      .select(`
        data_type_id,
        value,
        season
      `)
      .eq('athlete_id', athleteId)
      .in('data_type_id', [98, 99, 100, 101, 84, 221, 223, 313]) // Added 221 (TGb), 223 (TGp), and 313 (TFRRS Link)
      .order('season', { ascending: false });

    if (statsError) {
      console.error('Error fetching stats:', statsError);
    }

    // Get athlete names for each season
    // Query athlete_name with school join - Modified to use athlete_fact instead
    const { data: athletenames, error: athletenamesError } = await supabase
      .from('athlete_fact')
      .select(`
        data_type_id,
        value,
        created_at
      `)
      .eq('athlete_id', athleteId)
      .in('data_type_id', [7, 8]) // Using data_type_id 7 for high school name and 8 for previous school
      .order('created_at', { ascending: false });

    if (athletenamesError) {
      console.error('Error fetching athlete facts:', athletenamesError);
    }

    // Helper function to find name for a given season - Modified to work with athlete_fact
    const findnameForSeason = (season: number) => {
      if (!athletenames || athletenames.length === 0) {
        return null;
      }
      
      // For now, just return the most recent school name
      const schoolName = athletenames.find((fact: { data_type_id: number; value: string }) => fact.data_type_id === 7)?.value;
      return schoolName ? { school: { name: schoolName } } : null;
    };

    // Process stats by season
    const statsBySeason = statsData?.reduce((acc: any, stat: any) => {
      const season = stat.season;
      if (!acc[season]) {
        const nameForSeason = findnameForSeason(season);
        acc[season] = {
          season,
          name: nameForSeason?.school?.name || 'Unknown name',
          stats: {}
        };
      }
      acc[season].stats[stat.data_type_id] = stat.value;
      return acc;
    }, {});

    // Transform stats into the expected format and sort by season
    const transformedStats = Object.values(statsBySeason || {})
      .sort((a: any, b: any) => b.season - a.season)
      .map((seasonData: any) => ({
        season: seasonData.season,
        name: seasonData.name,
        gp: parseInt(seasonData.stats[98] || '0'),
        gs: parseInt(seasonData.stats[99] || '0'),
        goals: parseInt(seasonData.stats[100] || '0'),
        assists: parseInt(seasonData.stats[101] || '0'),
        points: parseInt(seasonData.stats[102] || '0'),
        sh_att: parseInt(seasonData.stats[103] || '0'),
        g_min_played: parseInt(seasonData.stats[84] || '0'),
        saves: parseInt(seasonData.stats[87] || '0')
      }));

    // Get school facts instead of name facts
    const collegeId = (athleteData as any)?.school_id;
    let schoolFactData = null;
    
    if (collegeId) {
      const { data: schoolFacts, error: schoolFactError } = await supabase
        .from('school_fact')
        .select('data_type_id, value')
        .eq('school_id', collegeId);
      
      if (schoolFactError) {
        console.error('Error fetching school facts:', schoolFactError);
      } else {
        schoolFactData = schoolFacts;
      }
    }
    
    // Helper function to find facts
    // Since we ordered by created_at DESC, the first occurrence will be the most recent
    const findFact = (facts: any[] | null, dataTypeId: number): string | null => 
      facts?.find((fact: any) => fact.data_type_id === dataTypeId)?.value || null;
    
    // Parse the values as numbers, defaulting to 0 if invalid
    const parseStatValue = (value: string | null | undefined): number => {
      if (!value) return 0;
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Process athlete facts
    const year = findFact(factData, 1);
    const highname = findFact(factData, 7);
    const state = findFact(factData, 24);
    const hometown = findFact(factData, 247);
    const heightFeet = findFact(factData, 4);
    const heightInch = findFact(factData, 5);
    const weight = findFact(factData, 6);
    const imageUrl = findFact(factData, 23) || "/blank-user.svg";
    const twitter = findFact(factData, 13);
    const primaryPosition = findFact(factData, 2);
    const secondaryPosition = findFact(factData, 3);
    const highnamehighlight = findFact(factData, 38);
    const highlight = findFact(factData, 37);
    const previous_name = findFact(factData, 8);
    const eligibilityRemaining = findFact(factData, 25);
    const hand = findFact(factData, 16);
    const perfectGame = findFact(factData, 230);
    const prepBaseballReport = findFact(factData, 231);
    const gameEval = findFact(factData, 232);
    const club = findFact(factData, 233);
    const summerLeague = findFact(factData, 234);
    const tfrrsLink = findFact(statsData, 313);

    // Bio tab specific data
    const cellPhone = findFact(factData, 27);
    const birthday = findFact(factData, 121);
    const preferredContactWay = findFact(factData, 26);
    const helpingWithDecision = findFact(factData, 29);
    const contactInfo = findFact(factData, 30);
    const gpa = findFact(factData, 35);
    const major = findFact(factData, 10);
    const importance = findFact(factData, 36);
    const bio = findFact(factData, 21);
    const rosterLink = findFact(factData, 11);
    
    // Get remaining stats
    const gp = findFact(statsData, 98);
    const gs = findFact(statsData, 99);
    const goals = findFact(statsData, 100);
    const assists = findFact(statsData, 101);
    const points = findFact(statsData, 102);
    const shotAttempts = findFact(statsData, 103);
    const saves = findFact(statsData, 87);
    const minPlayed = findFact(statsData, 84);
    
    // Get true scores and parse them as numbers
    const tgb = findFact(statsData, 221);
    const tgp = findFact(statsData, 223);
    
    const tgbValue = parseStatValue(tgb);
    const tgpValue = parseStatValue(tgp);
    const trueScore = Math.round(Math.max(tgbValue, tgpValue));
    

    
    // Get athlete honors if there's an athlete_id
    let honorsData = null;
    if (athleteId) {
      const { data: honors, error: honorsError } = await supabase
        .from('athlete_honor')
        .select('id, award, award_year')
        .eq('athlete_id', athleteId);
      
      if (honorsError) {
        console.error('Error fetching athlete honors:', honorsError);
      } else {
        honorsData = honors;
      }
    }
    
    // Combine all data into the structure expected by the frontend
    const transformedData: AthleteData = {
      id: athleteData.id,
      first_name: athleteData.first_name,
      last_name: athleteData.last_name,
      sport_id: athleteData.sport_id,
      initiated_date: transferPortalData?.initiated_date,
      year: year || undefined,
      game_eval: gameEval || undefined,
      club: club || undefined,
      summer_league: summerLeague || undefined,
      primary_position: primaryPosition as string | undefined,
      secondary_position: secondaryPosition as string | undefined,
      image_url: imageUrl as string | undefined,
      high_name: highname as string | undefined,
      hometown_street: findFact(factData, 246) as string | undefined,
      hometown: findFact(factData, 247) as string | undefined,
      hometown_state: findFact(factData, 24) as string | undefined,
      hometown_zip: findFact(factData, 248) as string | undefined,
      height_feet: heightFeet ? parseInt(heightFeet) : null,
      height_inch: heightInch ? parseInt(heightInch) : null,
      weight: weight ? parseInt(weight) : null,
      twitter: twitter as string | undefined,
      roster_link: rosterLink as string | undefined,
      bio: bio as string | undefined,
      major: major as string | undefined,
      hand: hand as string | undefined,
      perfect_game: perfectGame as string | undefined,
      prep_baseball_report: prepBaseballReport as string | undefined,
      tfrrs_link: tfrrsLink as string | undefined,
      gpa: gpa || undefined,
      birthday: birthday || undefined,
      pref_contact: preferredContactWay || undefined,
      help_decision: helpingWithDecision || undefined,
      contact_info: contactInfo || undefined,
      cell_phone: cellPhone || undefined,
      true_score: trueScore || undefined,
      eligibility_remaining: eligibilityRemaining || undefined,
      school_logo_url: schoolLogoUrl,
      commit_school_logo_url: commitSchoolLogoUrl,
      school: {
        name: transferPortalData?.school_name,
        conference: conference,
        division: division
      },
      details_tp_page: [{
        is_receiving_athletic_aid: transferPortalData?.is_receiving_athletic_aid || 'None',
        expected_grad_date: detailsTpResult?.expected_grad_date,
        comments: detailsTpResult?.comments,
        email: detailsTpResult?.email,
        ok_to_contact: detailsTpResult?.ok_to_contact,
        is_four_year_transfer: detailsTpResult?.is_four_year_transfer,
        commit_school_name: (wideViewResult as any)?.commit_school_name || (detailsTpResult as any)?.commit_school_name,
        previous_name: previous_name || undefined,
        is_transfer_graduate_student: detailsTpResult?.is_transfer_graduate_student
      }],
      main_tp_page: [{
        id: mainTpResult?.id,
        initiated_date: transferPortalData?.initiated_date,
        year: year || undefined,
        school_id: transferPortalData?.school_id,
        status: mainTpResult?.status,
        designated_student_athlete: mainTpResult?.designated_student_athlete,
        school: {
          name: transferPortalData?.school_name,
          division: division
        }
      }],
      generic_survey: [{
        ...surveyData,
        hs_highlight: highnamehighlight as string | undefined,
        highlight: highlight as string | undefined
      }],
      athlete_honor: honorsData && honorsData.length > 0 ? honorsData as [{ id: string; award: string; award_year: string }] : undefined
    };
    
    return transformedData;
  } catch (error) {
    console.error('Unexpected error in fetchAthleteById:', error);
    return null;
  }
}

export async function fetchRecruitingBoardPositions(customerId: string): Promise<RecruitingBoardPosition[]> {
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('recruiting_board_position')
      .select('*')
      .eq('customer_id', customerId)
      .is('ended_at', null)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching recruiting board positions:', error);
      throw new Error('Failed to fetch recruiting board positions');
    }

    const totalTime = performance.now() - startTime;
    
    return data || [];
  } catch (error) {
    const errorTime = performance.now() - startTime;
    throw error;
  }
}

export async function createRecruitingBoardPosition(customerId: string, positionName: string): Promise<RecruitingBoardPosition> {
  try {
    // Get the next display order
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('recruiting_board_position')
      .select('display_order')
      .eq('customer_id', customerId)
      .is('ended_at', null)
      .order('display_order', { ascending: false })
      .limit(1);

    if (maxOrderError) {
      console.error('Error getting max display order:', maxOrderError);
      throw new Error('Failed to get max display order');
    }

    // Start at 1 if no positions exist, otherwise add 1 to the max
    const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('recruiting_board_position')
      .insert({
        customer_id: customerId,
        position_name: positionName,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recruiting board position:', error);
      throw new Error('Failed to create recruiting board position');
    }

    return data;
  } catch (error) {
    console.error('Error in createRecruitingBoardPosition:', error);
    throw error;
  }
}

export async function updateRecruitingBoardPositionOrder(customerId: string, positions: { id: string; display_order: number }[]): Promise<void> {
  try {
    // Update each position's display order
    for (const position of positions) {
      const { error } = await supabase
        .from('recruiting_board_position')
        .update({ display_order: position.display_order })
        .eq('id', position.id)
        .eq('customer_id', customerId);

      if (error) {
        console.error('Error updating position order:', error);
        throw new Error('Failed to update position order');
      }
    }
  } catch (error) {
    console.error('Error in updateRecruitingBoardPositionOrder:', error);
    throw error;
  }
}

export async function endRecruitingBoardPosition(customerId: string, positionName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('recruiting_board_position')
      .update({ ended_at: new Date().toISOString() })
      .eq('position_name', positionName)
      .eq('customer_id', customerId)
      .is('ended_at', null);

    if (error) {
      console.error('Error ending recruiting board position:', error);
      throw new Error('Failed to end recruiting board position');
    }
  } catch (error) {
    console.error('Error in endRecruitingBoardPosition:', error);
    throw error;
  }
}

export async function resetRecruitingBoardPositionOrders(customerId: string): Promise<void> {
  try {
    // Get all active positions for this customer, ordered by current display_order
    const { data: positions, error: fetchError } = await supabase
      .from('recruiting_board_position')
      .select('id, display_order')
      .eq('customer_id', customerId)
      .is('ended_at', null)
      .order('display_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching positions for reset:', fetchError);
      throw new Error('Failed to fetch positions for reset');
    }

    if (!positions || positions.length === 0) {
      return; // No positions to reset
    }

    // Update each position with a new sequential order starting at 1
    for (let i = 0; i < positions.length; i++) {
      const { error: updateError } = await supabase
        .from('recruiting_board_position')
        .update({ display_order: i + 1 })
        .eq('id', positions[i].id)
        .eq('customer_id', customerId);

      if (updateError) {
        console.error('Error updating position order:', updateError);
        throw new Error('Failed to update position order');
      }
    }
  } catch (error) {
    console.error('Error in resetRecruitingBoardPositionOrders:', error);
    throw error;
  }
}

export async function updateRecruitingBoardRanks(
  customerId: string, 
  updates: { athleteId: string; rank: number; position?: string }[]
): Promise<void> {
  try {
    // Update each athlete's rank and position
    for (const update of updates) {
      const updateData: any = { rank: update.rank };
      
      // Only update position if it's provided (when moving between columns)
      if (update.position !== undefined) {
        updateData.position = update.position;
      }

      const { error } = await supabase
        .from('recruiting_board')
        .update(updateData)
        .eq('athlete_id', update.athleteId)
        .eq('customer_id', customerId)
        .is('ended_at', null);

      if (error) {
        console.error('Error updating recruiting board rank:', error);
        throw new Error('Failed to update recruiting board rank');
      }
    }
  } catch (error) {
    console.error('Error in updateRecruitingBoardRanks:', error);
    throw error;
  }
}

export async function endRecruitingBoardAthlete(recruitingBoardId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('recruiting_board')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', recruitingBoardId)
      .is('ended_at', null);

    if (error) {
      console.error('Error ending recruiting board athlete:', error);
      throw new Error('Failed to remove athlete from recruiting board');
    }
  } catch (error) {
    console.error('Error in endRecruitingBoardAthlete:', error);
    throw error;
  }
}

export async function fetchRecruitingBoardData(sportId?: string, cachedUserDetails?: any): Promise<RecruitingBoardData[]> {
  const startTime = performance.now();
  
  try {
    
    // Use cached user details if provided, otherwise fetch them
    let userDetails = cachedUserDetails;
    if (!userDetails) {
      // Timer for session fetch
      const sessionStart = performance.now();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error('User not authenticated');
      }
      const sessionEnd = performance.now();

      // Timer for user details fetch (note: this will have its own internal timing)
      const userDetailsStart = performance.now();
      userDetails = await fetchUserDetails();
      if (!userDetails?.customer_id) {
        throw new Error('No customer ID found');
      }
      const userDetailsEnd = performance.now();
    } else {
    }
    
    if (sportId) {
    }

    // Timer for basic recruiting board data fetch
    const recruitingBoardStart = performance.now();
    const { data: recruitingBoardBasic, error: recruitingBoardBasicError } = await supabase
      .from('recruiting_board')
      .select(`
        id,
        athlete_id,
        user_id,
        created_at,
        athlete_tier,
        position,
        rank,
        user_detail!user_id (
          id,
          name_first,
          name_last
        )
      `)
      .eq('customer_id', userDetails.customer_id)
      .is('ended_at', null) // Only show athletes that haven't been ended/removed
      .order('rank', { ascending: true, nullsFirst: false });
    const recruitingBoardEnd = performance.now();

    if (recruitingBoardBasicError) {
      console.error('[fetchRecruitingBoardData] Error fetching basic recruiting board data:', recruitingBoardBasicError);
      throw new Error('Failed to fetch recruiting board data');
    }

    if (!recruitingBoardBasic || recruitingBoardBasic.length === 0) {
      console.log('[fetchRecruitingBoardData] No recruiting board data found');
      return [];
    }

    console.log('[fetchRecruitingBoardData] Found', recruitingBoardBasic.length, 'athletes on recruiting board');

    // Get athlete IDs and fetch their sport_ids
    const athleteIds = recruitingBoardBasic.map((item: any) => item.athlete_id);
    console.log('[fetchRecruitingBoardData] Athlete IDs:', athleteIds);
    
    // Timer for athlete sport data fetch
    const athleteDataStart = performance.now();
    
    let athleteQuery = supabase
      .from('athlete')
      .select('id, sport_id')
      .in('id', athleteIds);

    // Filter by sport if sportId is provided
    if (sportId) {
      athleteQuery = athleteQuery.eq('sport_id', sportId);
    }

    const { data: athleteData, error: athleteError } = await athleteQuery;
    const athleteDataEnd = performance.now();

    if (athleteError) {
      console.error('[fetchRecruitingBoardData] Error fetching athlete sport data:', athleteError);
      throw new Error('Failed to fetch athlete sport data');
    }

    console.log('[fetchRecruitingBoardData] Athlete sport data retrieved:', athleteData?.map((a: any) => ({ id: a.id, sport_id: a.sport_id })));
    
    if (sportId && athleteData) {
      console.log(`[fetchRecruitingBoardData] Filtered to ${athleteData.length} athletes for sport ID ${sportId}`);
    }

    // Create sport_id to sport_abbreviation mapping
    const sportIdToAbbrev: Record<number, string> = {
      1: 'mbb',  // Men's Basketball
      2: 'wbb',  // Women's Basketball
      3: 'msoc', // Men's Soccer
      4: 'wsoc', // Women's Soccer
      5: 'wvol', // Women's Volleyball
      6: 'bsb',  // Baseball
      7: 'sb',   // Softball
      8: 'mcc',  // Men's Cross Country
      9: 'wcc',  // Women's Cross Country
      10: 'mglf', // Men's Golf
      11: 'wglf', // Women's Golf
      12: 'mlax', // Men's Lacrosse
      13: 'wlax', // Women's Lacrosse
      14: 'mten', // Men's Tennis
      15: 'wten', // Women's Tennis
      16: 'mtaf', // Men's Track & Field
      17: 'wtaf', // Women's Track & Field
      18: 'mswm', // Men's Swimming
      19: 'wswm', // Women's Swimming
      20: 'mwre', // Men's Wrestling
      21: 'fb',   // Football
    };

    // Group athletes by sport to optimize queries
    const athletesBySport = athleteData?.reduce((acc: Record<string, string[]>, athlete: any) => {
      const sportAbbrev = sportIdToAbbrev[athlete.sport_id];
      if (sportAbbrev) {
        if (!acc[sportAbbrev]) {
          acc[sportAbbrev] = [];
        }
        acc[sportAbbrev].push(athlete.id);
      } else {
        console.warn('[fetchRecruitingBoardData] Unknown sport_id:', athlete.sport_id, 'for athlete:', athlete.id);
      }
      return acc;
    }, {}) || {};

    console.log('[fetchRecruitingBoardData] Athletes grouped by sport:', athletesBySport);

    // 🚀 [OPTIMIZATION] If sportId is provided, only process that specific sport
    let sportsToProcess = Object.entries(athletesBySport);
    if (sportId) {
      const targetSportAbbrev = sportIdToAbbrev[parseInt(sportId)];
      if (targetSportAbbrev && athletesBySport[targetSportAbbrev]) {
        sportsToProcess = [[targetSportAbbrev, athletesBySport[targetSportAbbrev]]];
      }
    }

    // 🚀 [OPTIMIZATION] Pre-filter recruiting board data by sport to avoid querying non-existent athletes
    let preFilteredRecruitingBoard = recruitingBoardBasic;
    if (sportId && athleteData && athleteData.length > 0) {
      const validAthleteIds = new Set(athleteData.map((a: any) => a.id));
      preFilteredRecruitingBoard = recruitingBoardBasic.filter((item: any) => 
        validAthleteIds.has(item.athlete_id)
      );
    }

    // Fetch athlete details from appropriate views for each sport
    const athleteDetailsMap: Record<string, any> = {};
    
    for (const [sportAbbrev, athleteIdsForSport] of sportsToProcess) {
      console.log(`[fetchRecruitingBoardData] Processing sport: ${sportAbbrev} with ${(athleteIdsForSport as string[]).length} athletes`);
      
      // Determine package tier for this sport
      const packageTier = determinePackageTier(userDetails.packages || [], sportAbbrev);
      console.log(`[fetchRecruitingBoardData] Package tier for ${sportAbbrev}:`, packageTier);
      
      if (packageTier) {
        const tierSuffix = packageTier === 'naia' ? '_naia' : packageTier === 'starter' ? '_starter' : '';
        const viewName = `vw_tp_athletes_wide_${sportAbbrev}${tierSuffix}`;
        console.log(`[fetchRecruitingBoardData] Querying view: ${viewName} for athletes:`, athleteIdsForSport as string[]);
        
        // 🚀 [OPTIMIZATION] Only query for athletes that exist in recruiting board
        const athleteIdsToQuery = preFilteredRecruitingBoard
          .filter((item: any) => athletesBySport[sportAbbrev]?.includes(item.athlete_id))
          .map((item: any) => item.athlete_id);

        console.log(`[fetchRecruitingBoardData] Querying ${viewName} for ${athleteIdsToQuery.length} athletes instead of ${(athleteIdsForSport as string[]).length}`);

        try {
          const { data: sportAthleteData, error: sportAthleteError } = await supabase
            .from(viewName)
            .select(`
              athlete_id,
              m_first_name,
              m_last_name,
              initiated_date,
              year,
              school_id,
              school_name,
              is_receiving_athletic_aid,
              high_school,
              hometown_state,
              image_url,
              height_feet,
              height_inch,
              weight,
              division
            `)
            .in('athlete_id', athleteIdsToQuery);

          if (!sportAthleteError && sportAthleteData) {
            console.log(`[fetchRecruitingBoardData] Successfully fetched ${sportAthleteData.length} athletes from ${viewName}`);
            sportAthleteData.forEach((athlete: any) => {
              athleteDetailsMap[athlete.athlete_id] = athlete;
            });
          } else if (sportAthleteError) {
            console.error(`[fetchRecruitingBoardData] Error fetching data from ${viewName}:`, sportAthleteError);
          }
        } catch (error) {
          console.error(`[fetchRecruitingBoardData] Error accessing view ${viewName}:`, error);
        }
      } else {
        console.warn(`[fetchRecruitingBoardData] No package tier found for sport ${sportAbbrev}. User packages:`, userDetails.packages);
      }
    }

    console.log(`[fetchRecruitingBoardData] Athlete details map populated with ${Object.keys(athleteDetailsMap).length} entries`);
    console.log('[fetchRecruitingBoardData] Missing athlete details for:', 
      preFilteredRecruitingBoard
        .filter((item: any) => !athleteDetailsMap[item.athlete_id])
        .map((item: any) => item.athlete_id)
    );

    // Combine the recruiting board data with athlete details (already pre-filtered by sport)
    const recruitingBoardData = preFilteredRecruitingBoard
      .map((item: any) => ({
        ...item,
        athlete_with_tp_page_details: athleteDetailsMap[item.athlete_id] || null
      }));
    
    console.log(`[fetchRecruitingBoardData] After sport filtering: ${recruitingBoardData.length} recruiting board entries`);

    // Transform the data after fetching
    const recruitingBoardDataTransformed = recruitingBoardData?.map((item: any) => ({
      ...item,
      athlete_with_tp_page_details: item.athlete_with_tp_page_details
        ? {
            ...item.athlete_with_tp_page_details,
            first_name: item.athlete_with_tp_page_details.m_first_name,
            last_name: item.athlete_with_tp_page_details.m_last_name,
          }
        : null,
    })) ?? [];

    console.log(`[fetchRecruitingBoardData] Transformed ${recruitingBoardDataTransformed.length} recruiting board entries`);



    if (!recruitingBoardDataTransformed || recruitingBoardDataTransformed.length === 0) {
      return [];
    }

    console.log(`[fetchRecruitingBoardData] All data fetched from dynamic views. Starting final data transformation`);

    // Transform the data to match the expected structure
    const transformedData = recruitingBoardDataTransformed.map((item: any, index: number) => {
      const athlete = item.athlete_with_tp_page_details;
      const userDetail = item.user_detail;

      // Calculate true score - using fallback values for now
      const trueScore = 0; // Will be implemented later when tgb_score and tgp_score are added

      // Use the image URL from the athlete object with fallback

      // Use the same default image logic as athlete profile
      const imageUrl = athlete?.image_url || "/blank-user.svg";

      // Determine tier from database - if athlete_tier is null or empty, no tier is assigned
      let tier = null;
      let tierColor = null;
      
      if (item.athlete_tier) {
        const tierNumber = parseInt(item.athlete_tier);
        if (tierNumber >= 1 && tierNumber <= 3) {
          tier = tierNumber;
          // Set tier color based on tier number
          switch (tierNumber) {
            case 1:
              tierColor = "#7363BC";
              break;
            case 2:
              tierColor = "#36C5F0";
              break;
            case 3:
              tierColor = "#FF24BA";
              break;
            default:
              tierColor = "#FF24BA";
          }
        }
      }

      // Format height using data from the athlete object
      const heightFeet = athlete?.height_feet;
      const heightInch = athlete?.height_inch;
      const height = heightFeet && heightInch ? `${heightFeet}'${heightInch}"` : 'N/A';

      return {
        key: (index + 1).toString(),
        id: athlete?.athlete_id || '',
        recruiting_board_id: item.id,
        fname: athlete?.first_name || '',
        lname: athlete?.last_name || '',
        image: imageUrl,
        imageLarge: imageUrl,
        unread: 0, // You can implement unread logic if needed
        rating: tier || 0, // Use tier as rating if available, or 0 if no tier
        avg: trueScore, // This will be displayed as the number below the image
        school: athlete?.school_name || '',
        schoolIcon: "/b.svg",
        academy: athlete?.high_school || '', // high school name from athlete object
        academyIcon: "/b.svg",
        date: athlete?.initiated_date ? new Date(athlete.initiated_date).toLocaleDateString() : '',
        evaluation: 'Some Info', // Will be implemented later when games_eval is added
        div: athlete?.division || 'D2', // division from athlete object
        yr: athlete?.year || 'Jr',
        $: athlete?.is_receiving_athletic_aid || 'None',
        ht: height,
        high_school: athlete?.high_school || '',
        st: athlete?.hometown_state || '',
        wt: athlete?.weight || '',
        s: "540", // You can add actual stats if needed
        h: "Y",
        direction: "Flat",
        position: item.position || 'Unassigned', // Use position from recruiting_board table
        tier, // Use stored tier (can be null)
        tierColor, // Use stored tier color (can be null)
        // Add user details for the footer
        userFirstName: userDetail?.name_first || '',
        userLastName: userDetail?.name_last || '',
        // Add rating information (Note: ratings may need separate query if not in view)
        ratingName: null,
        ratingColor: null,
        // Add rank from recruiting_board table
        rank: item.rank
      };
    });

    console.log(`[fetchRecruitingBoardData] Final transformation complete. Returning ${transformedData.length} athletes`);
    
    const totalTime = performance.now() - startTime;
    
    return transformedData;
  } catch (error) {
    const errorTime = performance.now() - startTime;
    throw error;
  }
}



// New function to fetch sport-specific column configurations
export async function fetchSportColumnConfig(sportId: string, allStats: boolean = false): Promise<SportStatConfig[]> {
  // Check cache first
  const cacheKey = `${sportId}_${allStats}`;
  if (sportColumnConfigCache.has(cacheKey)) {
    return sportColumnConfigCache.get(cacheKey)!;
  }
  
  try {
    const queryStartTime = performance.now();
    
    // First, try to join with data_type table if it exists
    let query = supabase
      .from('sport_stat_config')
      .select(`
        *,
        data_type:data_type_id(name)
      `)
      .eq('sport_id', sportId);
    
    // Only filter by search_column_display if not requesting all stats
    if (!allStats) {
      query = query.not('search_column_display', 'is', null);
    }
    
    // Use different ordering based on allStats parameter
    if (allStats) {
      query = query.order('stat_category', { ascending: true }).order('display_order', { ascending: true });
    } else {
      query = query.order('search_column_display', { ascending: true });
    }
    
    const result = await query;
    
    const { error } = result;
    let { data } = result;

    // If the join fails (data_type table doesn't exist), fall back to basic query
    if (error) {
      let basicQuery = supabase
        .from('sport_stat_config')
        .select('*')
        .eq('sport_id', sportId);
      
      // Only filter by search_column_display if not requesting all stats
      if (!allStats) {
        basicQuery = basicQuery.not('search_column_display', 'is', null);
      }
      
      // Use different ordering based on allStats parameter
      if (allStats) {
        basicQuery = basicQuery.order('stat_category', { ascending: true }).order('display_order', { ascending: true });
      } else {
        basicQuery = basicQuery.order('search_column_display', { ascending: true });
      }
      
      const { data: basicData, error: basicError } = await basicQuery;
      
      if (basicError) {
        console.error('Error fetching sport column config:', basicError);
        return [];
      }
      
      data = basicData;
    }

    if (error) {
      console.error('Error fetching sport column config:', error);
      return [];
    }

    // Map data_type_id to names and decimal places if we don't have them from the join
    const dataTypeConfigMap: Record<number, { name: string; decimalPlaces?: number; isPercentage?: boolean; convertNegativeToZero?: boolean }> = {
      98: { name: 'Games Played' },
      99: { name: 'Games Started' }, 
      100: { name: 'Goals' },
      101: { name: 'Assists' },
      102: { name: 'Points' },
      103: { name: 'Shot Attempts' },
      104: { name: 'Fouls' },
      84: { name: 'Minutes Played' },
      85: { name: 'Goals Against' },
      86: { name: 'Goals Against Average' },
      87: { name: 'Saves' },
      88: { name: 'Save Percentage', decimalPlaces: 1, isPercentage: true },
      155: { name: 'BA', decimalPlaces: 3 }, // Batting Average - 3 decimal places
      156: { name: 'OB %', decimalPlaces: 3 }, // On Base Percentage - 1 decimal place as percentage
      157: { name: 'SLG %', decimalPlaces: 3 }, // Slugging Percentage - 1 decimal place as percentage
      178: { name: 'ERA', decimalPlaces: 2 }, // Earned Run Average - 2 decimal places
      179: { name: 'IP', decimalPlaces: 1 }, // Innings Pitched - 1 decimal place
      216: { name: 'WHIP', decimalPlaces: 2 }, // Walks + Hits per Inning - 2 decimal places
      217: { name: 'OPS', decimalPlaces: 3 }, // On Base + Slugging - 3 decimal places
      218: { name: 'K/BB', decimalPlaces: 2 }, // Strikeout to Walk Ratio - 2 decimal places
      220: { name: 'wOBA', decimalPlaces: 3 }, // Weighted On Base Average - 3 decimal places
      221: { name: 'TGb', decimalPlaces: 1 }, // True Score (Batting) - 1 decimal places
      222: { name: 'FIP', decimalPlaces: 1 }, // Fielding Independent Pitching - 1 decimal places
      223: { name: 'TGp', decimalPlaces: 1 }, // True Score (Pitching) - 1 decimal places
      226: { name: 'K/9', decimalPlaces: 1 }, // Strikeouts per 9 innings - 1 decimal place
      227: { name: 'BB/9', decimalPlaces: 1 }, // Walks per 9 innings - 1 decimal place
      628: { name: 'K%', decimalPlaces: 1, isPercentage: true }, // Strikeout Percentage - 1 decimal place as percentage
      629: { name: 'BB%', decimalPlaces: 1, isPercentage: true }, // Walk Percentage - 1 decimal place as percentage
      210: { name: 'FLD %', decimalPlaces: 3 }, // Fielding Percentage - 3 decimal places as percentage
      304: { name: 'Height' }, // Height - special handling for feet/inches
      373: { name: 'VIS', decimalPlaces: 0, convertNegativeToZero: true }, // VIS - no decimal places, convert negatives to zero
      374: { name: 'VPR', decimalPlaces: 0, convertNegativeToZero: true }, // VPR - no decimal places, convert negatives to zero
      288: { name: 'PPG', decimalPlaces: 1 }, // ppg - one decimpal place
      292: { name: 'RPG', decimalPlaces: 1 }, // rpg - one decimpal place
      636: { name: 'APG', decimalPlaces: 1 }, // apg - one decimpal place
      // Add more mappings as needed
    };

    // Add data_type_name to each config and sanitize it for SQL
    const configsWithNames = (data || []).map((config: any) => {
      const dataTypeConfig = dataTypeConfigMap[config.data_type_id];
      const dataTypeName = config.data_type?.name || dataTypeConfig?.name || `Stat ${config.data_type_id}`;
      const decimalPlaces = dataTypeConfig?.decimalPlaces;
      const isPercentage = dataTypeConfig?.isPercentage;
      const convertNegativeToZero = dataTypeConfig?.convertNegativeToZero;
      
      // Sanitize the column name for SQL - replace special characters with underscores
      const sanitizedName = dataTypeName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // Replace any non-alphanumeric characters with underscores
        .replace(/_+/g, '_') // Replace multiple consecutive underscores with single underscore
        .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
      
      return {
        ...config,
        data_type_name: dataTypeName,
        sanitized_column_name: sanitizedName,
        decimal_places: decimalPlaces,
        is_percentage: isPercentage,
        convert_negative_to_zero: convertNegativeToZero
      };
    });



    // For filter columns (allStats = true), deduplicate by data_type_id to prevent duplicate options
    let finalConfigs = configsWithNames;
    if (allStats) {
      const uniqueConfigMap = new Map();
      configsWithNames.forEach((config: any) => {
        const dataTypeId = config.data_type_id;
        if (!uniqueConfigMap.has(dataTypeId)) {
          uniqueConfigMap.set(dataTypeId, config);
        }
      });
      finalConfigs = Array.from(uniqueConfigMap.values());
    }

    // Cache the result with the proper key
    sportColumnConfigCache.set(cacheKey, finalConfigs);
    
    return finalConfigs;
  } catch (error) {
    console.error('Error in fetchSportColumnConfig:', error);
    return [];
  }
}

// Fallback function for batched athlete facts queries
async function fetchAthleteFactsWithBatching(athleteIds: string[]): Promise<any[]> {
  const batchSize = 25;
  const athleteFactData: any[] = [];
  
  for (let i = 0; i < athleteIds.length; i += batchSize) {
    const batch = athleteIds.slice(i, i + batchSize);
    const batchStartTime = performance.now();
    
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('athlete_fact')
        .select('athlete_id, data_type_id, value')
        .in('athlete_id', batch)
        .in('data_type_id', [1, 2, 7, 24, 251])
        .order('athlete_id');

      const batchEndTime = performance.now();
      console.log(`[PERF] Athlete facts batch ${i}-${i + batchSize} completed in ${batchEndTime - batchStartTime}ms`);

      if (batchError) {
        console.error(`[PERF] Athlete fact data query error for batch ${i}-${i + batchSize}:`, batchError);
      } else if (batchData) {
        athleteFactData.push(...batchData);
      }
    } catch (error) {
      console.error(`[PERF] Exception in athlete facts batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  console.log(`[PERF] Fallback batching completed, total facts: ${athleteFactData.length}`);
  return athleteFactData;
}

// Fallback function for batched stats queries
async function fetchStatsWithBatching(athleteIds: string[], dynamicStatTypes: number[]): Promise<any[]> {
  const batchSize = 25;
  const statsData: any[] = [];
  
  for (let i = 0; i < athleteIds.length; i += batchSize) {
    const batch = athleteIds.slice(i, i + batchSize);
    const batchStartTime = performance.now();
    
    try {
      const { data: batchStatsData, error: batchStatsError } = await supabase
        .from('stat')
        .select('athlete_id, data_type_id, value')
        .in('athlete_id', batch)
        .in('data_type_id', dynamicStatTypes)
        .order('athlete_id');

      const batchEndTime = performance.now();
      console.log(`[PERF] Stats batch ${i}-${i + batchSize} completed in ${batchEndTime - batchStartTime}ms`);

      if (batchStatsError) {
        console.error(`[PERF] Stats query error for batch ${i}-${i + batchSize}:`, batchStatsError);
      } else if (batchStatsData) {
        statsData.push(...batchStatsData);
      }
    } catch (error) {
      console.error(`[PERF] Exception in stats batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  console.log(`[PERF] Fallback stats batching completed, total stats: ${statsData.length}`);
  return statsData;
}

// Fallback function for batched school facts queries
async function fetchSchoolFactsWithBatching(schoolIds: string[]): Promise<any[]> {
  const batchSize = 25;
  const schoolFactData: any[] = [];
  
  for (let i = 0; i < schoolIds.length; i += batchSize) {
    const batch = schoolIds.slice(i, i + batchSize);
    const batchStartTime = performance.now();
    
    try {
      const { data: batchSchoolData, error: batchSchoolError } = await supabase
        .from('school_fact')
        .select('school_id, value')
        .eq('data_type_id', 119)
        .in('school_id', batch)
        .order('school_id');

      const batchEndTime = performance.now();
      console.log(`[PERF] School facts batch ${i}-${i + batchSize} completed in ${batchEndTime - batchStartTime}ms`);

      if (batchSchoolError) {
        console.error(`[PERF] School fact query error for batch ${i}-${i + batchSize}:`, batchSchoolError);
      } else if (batchSchoolData) {
        schoolFactData.push(...batchSchoolData);
      }
    } catch (error) {
      console.error(`[PERF] Exception in school facts batch ${i}-${i + batchSize}:`, error);
    }
  }
  
  console.log(`[PERF] Fallback school facts batching completed, total facts: ${schoolFactData.length}`);
  return schoolFactData;
}

// Cache for international options to prevent repeated expensive queries
const internationalOptionsCache = new Map<string, string[]>();

export async function fetchInternationalOptions(sportId?: string): Promise<string[]> {
  // Check cache first
  const cacheKey = sportId || 'all';
  if (internationalOptionsCache.has(cacheKey)) {
    return internationalOptionsCache.get(cacheKey)!;
  }

  try {
    let internationalLocations: string[] = [];

    if (sportId) {
      // Use the pre-computed view for lightning-fast results
      try {
        console.log(`Fetching international locations for sport ${sportId} from view`);
        
        // Query the distinct_state_values_by_sport view for this specific sport
        // (US states are already excluded in the view)
        const { data: viewData, error: viewError } = await supabase
          .from('distinct_state_values_by_sport')
          .select('value')
          .eq('sport_id', sportId)
          .not('value', 'is', null)
          .neq('value', '')
          .order('value', { ascending: true});

        if (viewError) {
          console.error('View query failed:', viewError);
          return getFallbackInternationalOptions();
        }

        if (!viewData || viewData.length === 0) {
          console.log('No international locations found in view for sport:', sportId);
          return getFallbackInternationalOptions();
        }

        // Extract values from the view data
        internationalLocations = viewData.map((item: { value: string }) => item.value).filter((value: string) => value && value.trim() !== '');
        console.log(`Found ${internationalLocations.length} international locations for sport ${sportId} from view`);
        
      } catch (error) {
        console.error('View query failed, using fallback:', error);
        internationalLocations = getFallbackInternationalOptions();
      }
    } else {
      // Get all international locations from the view (across all sports)
      try {
        console.log('Fetching all international locations from view');
        
        const { data: allViewData, error: allViewError } = await supabase
          .from('distinct_state_values_by_sport')
          .select('value')
          .not('value', 'is', null)
          .neq('value', '')
          .order('value', { ascending: true });

        if (allViewError) {
          console.error('Error fetching all international options from view:', allViewError);
          return getFallbackInternationalOptions();
        }

        if (!allViewData || allViewData.length === 0) {
          console.log('No international locations found in view');
          return getFallbackInternationalOptions();
        }

        // Get unique values (in case same location appears in multiple sports)
        const uniqueValues = [...new Set(allViewData.map((item: { value: string }) => item.value).filter((value: string) => value && value.trim() !== ''))] as string[];
        internationalLocations = uniqueValues.sort();
        console.log(`Found ${internationalLocations.length} total international locations across all sports`);
        
      } catch (error) {
        console.error('Error fetching all international options, using fallback:', error);
        internationalLocations = getFallbackInternationalOptions();
      }
    }

    // If no data found, use fallback
    if (internationalLocations.length === 0) {
      console.log('No international locations found, using fallback');
      internationalLocations = getFallbackInternationalOptions();
    }
    
    // Cache the result
    internationalOptionsCache.set(cacheKey, internationalLocations);
    
    return internationalLocations;
  } catch (error) {
    console.error('Error in fetchInternationalOptions:', error);
    return getFallbackInternationalOptions();
  }
}

// Helper function to get fallback international options
function getFallbackInternationalOptions(): string[] {
  const fallbackOptions = [
    'Canada', 'Mexico', 'Puerto Rico', 'Dominican Republic', 'Cuba', 
    'Venezuela', 'Colombia', 'Brazil', 'Argentina', 'Chile', 'Peru',
    'Japan', 'South Korea', 'Taiwan', 'China', 'Australia', 'New Zealand',
    'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
    'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark',
    'Finland', 'Poland', 'Czech Republic', 'Hungary', 'Romania', 'Bulgaria',
    'Greece', 'Turkey', 'Israel', 'South Africa', 'Nigeria', 'Kenya',
    'Ghana', 'Egypt', 'Morocco', 'Tunisia', 'Algeria', 'Libya'
  ];
  
  return fallbackOptions;
}

export async function fetchPositionsBySportId(sportId: string): Promise<{ name: string; order: number }[]> {
  try {
    const { data, error } = await supabase
      .from('position')
      .select('name, "order"')
      .eq('sport_id', sportId)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching positions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchPositionsBySportId:', error);
    return [];
  }
}

// Function to fetch school logos from school_fact table
export async function fetchSchoolLogos(schoolIds: string[]): Promise<Record<string, string>> {
  if (!schoolIds.length) return {};
  
  try {
    const { data, error } = await supabase
      .from('school_fact')
      .select('school_id, value')
      .eq('data_type_id', 23) // Logo URL data type
      .in('school_id', schoolIds);

    if (error) {
      console.error('Error fetching school logos:', error);
      return {};
    }

    // Create a map of school_id to logo URL
    const logoMap: Record<string, string> = {};
    data?.forEach((fact: { school_id: string; value: string }) => {
      if (fact.value) {
        logoMap[fact.school_id] = fact.value;
      }
    });

    return logoMap;
  } catch (error) {
    console.error('Error in fetchSchoolLogos:', error);
    return {};
  }
}