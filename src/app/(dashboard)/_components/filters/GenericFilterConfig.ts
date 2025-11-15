// ============================================================================
// GENERIC FILTER CONFIGURATION
// ============================================================================
// Configuration for the main Filters.tsx component
// Maps the existing complex filter system to our new base architecture
// ============================================================================

import { FilterConfig, FilterSection, resolveFieldReferences } from './FilterConfig';

// ============================================================================
// DATA SOURCE TYPES
// ============================================================================

export type DataSourceType = 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | 'activity_feed' | 'recruiting_board';

// ============================================================================
// FILTER VISIBILITY CONFIGURATION
// Order of items in each array determines the display order of filters
// ============================================================================

export const FILTER_VISIBILITY_CONFIG = {
  juco: ['position', 'year', 'conference', 'schools', 'stats', 'location','juco-athletic-association', 'juco-region', 'juco-division'] as string[],
  transfer_portal: ['position', 'division', 'year', 'height', 'weight', 'location', 'schools', 'conference', 'stats', 'athletic_aid', 'status', 'date_entered', 'survey_completed', 'honors', 'designated_student_athlete'] as string[],
  recruiting_board: ['position', 'division', 'year', 'height', 'weight', 'schools', 'conference', 'athletic_aid', 'status', 'date_entered', 'survey_completed'] as string[],
  all_athletes: ['position', 'division', 'year', 'height', 'weight', 'location', 'schools', 'conference',  'stats', 'transfer-odds', 'status', 'honors'] as string[],
  high_schools: ['location', 'hs-school-type', 'hs-prospects-score', 'hs-d1-prospects-score', 'hs-team-quality-score', 'hs-athlete-income-score', 'hs-academics-score', 'hs-religious-affiliation'] as string[],
  hs_athletes: ['location', 'hs-school-type', 'grad_year', 'position', 'height', 'weight', 'athletic_projection', 'offer-commit', 'academics-income', 'verified-filters', 'recruiting-service-ratings', 'camp'] as string[],
  activity_feed: ['event-parameters', 'recruiting-college-info', 'athlete-info'] as string[]
};

// ============================================================================
// GENERIC FILTER CONFIGURATION
// ============================================================================

// ============================================================================
// CENTRALIZED FIELD DEFINITIONS
// ============================================================================
// Define all filter fields once and reference them by key

const FIELD_DEFINITIONS = {
  // Graduation Year
  grad_year: {
    key: "grad_year",
    label: "Graduation Year",
    type: "multiselect" as const,
    placeholder: "Select graduation years",
    options: (() => {
      // Generate year options dynamically based on current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth(); // 0-11 (January = 0)
      
      // If after July 1st (month >= 6), start from next year
      const startYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
      
      const years = [];
      for (let year = startYear; year <= startYear + 6; year++) {
        years.push({ value: year.toString(), label: year.toString() });
      }
      
      return years;
    })()
  },
  
  // Height
  height: {
    key: "height",
    label: "Height",
    type: "height" as const,
    placeholder: "Select height range"
  },
  
  // Weight
  weight: {
    key: "weight",
    label: "Weight",
    type: "weight" as const,
    placeholder: "Enter weight range"
  },
  
  // Athletic Projection
  athletic_projection: {
    key: "athletic_projection",
    label: "Athletic Projection",
    type: "multiselect" as const,
    placeholder: "Select athletic projections",
    options: [
      { value: "FBS P4 - Top half", label: "FBS P4 - Top half" },
      { value: "FBS P4", label: "FBS P4" },
      { value: "FBS G5 - Top half", label: "FBS G5 - Top half" },
      { value: "FBS G5", label: "FBS G5" },
      { value: "FCS - Full Scholarship", label: "FCS - Full Scholarship" },
      { value: "FCS", label: "FCS" },
      { value: "D2 - Top half", label: "D2 - Top half" },
      { value: "D2", label: "D2" },
      { value: "D3 - Top half", label: "D3 - Top half" },
      { value: "D3", label: "D3" },
      { value: "D3 Walk-on", label: "D3 Walk-on" }
    ]
  },
  
  // Location
  location: {
    key: "location",
    label: "Location",
    type: "location" as const,
    placeholder: "Select location",
    dataSource: "activity_feed"
  },
  
  // Conference
  conference: {
    key: "conference",
    label: "Conference",
    type: "multiselect" as const,
    placeholder: "Select conference",
    options: [], // Will be populated dynamically
    showSearch: true,
    filterOption: (input: string, option?: { label: string; value: string }) =>
      (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
    fetchOptions: async () => {
      try {
        const { fetchActivityFeedConferences } = await import('../../../../lib/queries');
        const conferences = await fetchActivityFeedConferences();
        return conferences.map(conf => ({ value: conf, label: conf }));
      } catch (error) {
        console.error('Error fetching conference options:', error);
        return [];
      }
    }
  },
  
  // Division
  division: {
    key: "division",
    label: "Division",
    type: "multiselect" as const,
    placeholder: "Select division",
    options: [
      { value: 'D1', label: 'D1' },
      { value: 'D2', label: 'D2' },
      { value: 'D3', label: 'D3' }
    ]
  },
  
  // Level (for activity feed - maps to sfw_fbs_conf_group)
  level: {
    key: "level",
    label: "Level",
    type: "multiselect" as const,
    placeholder: "Select level",
    options: [
      { value: 'P4', label: 'P4' },
      { value: 'G5', label: 'G5' },
      { value: 'FCS', label: 'FCS' },
      { value: 'D2', label: 'D2' },
      { value: 'NAIA', label: 'NAIA' },
      { value: 'D3', label: 'D3' },
      { value: 'Other', label: 'Other' }
    ],
    fetchOptions: async () => {
      try {
        const { fetchActivityFeedLevels } = await import('../../../../lib/queries');
        const levels = await fetchActivityFeedLevels();
        
        // Define the correct order
        const levelOrder = ['P4', 'G5', 'FCS', 'D2', 'NAIA', 'D3', 'Other'];
        
        // Sort the fetched levels according to the specified order
        const sortedLevels = levelOrder.filter(level => levels.includes(level));
        
        return sortedLevels.map(level => ({ value: level, label: level }));
      } catch (error) {
        console.error('Error fetching level options:', error);
        return [
          { value: 'P4', label: 'P4' },
          { value: 'G5', label: 'G5' },
          { value: 'FCS', label: 'FCS' },
          { value: 'D2', label: 'D2' },
          { value: 'NAIA', label: 'NAIA' },
          { value: 'D3', label: 'D3' },
          { value: 'Other', label: 'Other' }
        ];
      }
    }
  },

  // School (for activity feed - searches sfw_school_name)
  school: {
    key: "school",
    label: "School",
    type: "multiselect" as const,
    placeholder: "Select school",
    options: [], // Will be populated dynamically
    showSearch: true,
    filterOption: (input: string, option?: { label: string; value: string }) =>
      (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
    fetchOptions: async () => {
      try {
        const { fetchActivityFeedSchools } = await import('../../../../lib/queries');
        const schools = await fetchActivityFeedSchools();
        return schools.map(school => ({ value: school, label: school }));
      } catch (error) {
        console.error('Error fetching school options:', error);
        return [];
      }
    }
  },

  // Athlete Location (for activity feed - based on athlete's school location)
  athleteLocation: {
    key: "athleteLocation",
    label: "Athlete Location",
    type: "location" as const,
    placeholder: "Select location",
    dataSource: "activity_feed_athlete"
  },
  
  // Position
  position: {
    key: "position",
    label: "Position",
    type: "multiselect" as const,
    placeholder: "Select positions",
    options: [
      { value: "QB", label: "QB" },
      { value: "RB", label: "RB" },
      { value: "WR", label: "WR" },
      { value: "TE", label: "TE" },
      { value: "OL", label: "OL" },
      { value: "OC", label: "OC" },
      { value: "OG", label: "OG" },
      { value: "OT", label: "OT" },
      { value: "DL", label: "DL" },
      { value: "DE", label: "DE" },
      { value: "DT", label: "DT" },
      { value: "LB", label: "LB" },
      { value: "ILB", label: "ILB" },
      { value: "OLB", label: "OLB" },
      { value: "DB", label: "DB" },
      { value: "CB", label: "CB" },
      { value: "S", label: "S" },
      { value: "P", label: "P" },
      { value: "K", label: "K" },
      { value: "PR", label: "PR" },
      { value: "KR", label: "KR" },
      { value: "LS", label: "LS" },
      { value: "ATH", label: "ATH" }
    ]
  }
};

export const createGenericFilterConfig = (dataSource: DataSourceType, sportAbbrev?: string): FilterConfig => {
  // For football, replace 'division' with 'level' in visibility config for transfer_portal and all_athletes
  let visibilityConfig = FILTER_VISIBILITY_CONFIG[dataSource];
  const isFootball = sportAbbrev?.toLowerCase() === 'fb';
  
  if (isFootball && (dataSource === 'transfer_portal' || dataSource === 'all_athletes')) {
    visibilityConfig = visibilityConfig.map(key => key === 'division' ? 'level' : key);
  }
  
  const allSections = [
    {
      key: "columns", // Columns (recruiting board column names)
      title: "Columns",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "columns",
          label: "Columns",
          type: "multiselect" as const,
          placeholder: "Select columns",
          options: [], // Will be populated dynamically from positions
          showSearch: true,
          filterOption: (input: string, option?: { label: string; value: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
          fetchOptions: async () => {
            // For recruiting board, this will be populated from the positions prop
            // Return empty array as fallback - options will be set via positions prop
            return [];
          }
        }
      ]
    },
    {
      key: "position", // Position
      title: "Position",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "position",
          label: "Position",
          type: "multiselect" as const,
          placeholder: "Select positions",
          options: [], // Will be populated dynamically
          showSearch: true,
          filterOption: (input: string, option?: { label: string; value: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      ]
    },
    {
      key: "division", // Division
      title: "Division",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "divisions",
          label: "Division",
          type: "multiselect" as const,
          placeholder: "Select divisions",
          options: [
            { value: 'D1', label: 'D1' },
            { value: 'D2', label: 'D2' },
            { value: 'D3', label: 'D3' }
          ]
        }
      ]
    },
    {
      key: "level", // Level (for football - maps to fbs_conf_group)
      title: "Level",
      collapsible: true,
      defaultExpanded: false,
      fields: [],
      fieldRefs: ["level"] // Reuse existing level field definition
    },
    {
      key: "year", // Year
      title: "Year",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "years",
          label: "Year",
          type: "multiselect" as const,
          placeholder: "Select years",
          options: dataSource === 'juco' ? [
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
          ]
        }
      ]
    },
    {
      key: "height",
      title: "Height",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "height",
          label: "Height",
          type: "height" as const,
          placeholder: "Enter height range"
        }
      ]
    },
    {
      key: "location",
      title: "Location",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "location",
          label: "Location",
          type: "location" as const,
          placeholder: "Select location",
          dataSource: dataSource
        }
      ]
    },
    {
      key: "schools",
      title: "Schools",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "schools",
          label: "Schools",
          type: "multiselect" as const,
          placeholder: "Select schools",
          options: [], // Will be populated dynamically
          showSearch: true,
          filterOption: (input: string, option?: { label: string; value: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      ]
    },
    {
      key: "stats",
      title: "Stats",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "stats",
          label: "Stats",
          type: "stats" as const,
          placeholder: "Select stats",
          options: [], // Will be populated dynamically
          showSearch: true,
          filterOption: (input: string, option?: { label: string; value: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      ]
    },
    {
      key: "athletic_aid", // Athletic Aid
      title: "Athletic Aid",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "athleticAid",
          label: "Athletic Aid",
          type: "multiselect" as const,
          placeholder: "Select aid status",
          options: [
            { value: 'Yes', label: 'Yes' },
            { value: 'Partial (50% or more)', label: 'Partial (50% or more)' },
            { value: 'Partial (less than 50%)', label: 'Partial (less than 50%)' },
            { value: 'None', label: 'None' }
          ]
        }
      ]
    },
    {
      key: "status", // Status
      title: "Status",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "status",
          label: "Status",
          type: "multiselect" as const,
          placeholder: "Select status",
          options: [
            { value: 'null', label: 'Not In Portal' },
            { value: 'Active', label: 'Active' },
            { value: 'Withdrawn', label: 'Withdrawn' },
            { value: 'Matriculated', label: 'Matriculated' },
            { value: 'Signed', label: 'Signed' }
          ]
        }
      ]
    },
    {
      key: "date_entered", // Date Entered
      title: "Date Entered",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "dateRange",
          label: "Date Range",
          type: "date-range" as const,
          placeholder: "Select date range"
        }
      ]
    },
    {
      key: "survey_completed", // Survey Completed
      title: "Survey Completed",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "survey_completed",
          label: "Survey Completed",
          type: "multiselect" as const,
          placeholder: "Select survey completion status",
          options: [
            { value: true, label: 'Yes' },
            { value: false, label: 'No' }
          ]
        }
      ]
    },
    {
      key: "honors", // Honors
      title: "Honors",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "honors",
          label: "Honors",
          type: "multiselect" as const,
          placeholder: "Select honors",
          options: [
            { value: 'All American', label: 'All American' },
            { value: 'All Region', label: 'All Region' },
            { value: 'All Conference', label: 'All Conference' }
          ]
        }
      ]
    },
    {
      key: "designated_student_athlete", // Designated Student Athlete
      title: "Designated Student Athlete",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "designatedStudentAthlete",
          label: "Designated Student Athlete",
          type: "multiselect" as const,
          placeholder: "Select DSA status",
          options: [
            { value: true, label: 'Yes' },
            { value: false, label: 'No' }
          ]
        }
      ]
    },
    {
      key: "conference",
      title: "Conference",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "conference",
          label: "Conference",
          type: "multiselect" as const,
          placeholder: "Select conference",
          options: [], // Will be populated dynamically
          showSearch: true,
          filterOption: (input: string, option?: { label: string; value: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      ]
    },
    {
      key: "transfer-odds",
      title: "Transfer Odds",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "transfer_odds",
          label: "Transfer Odds",
          type: "min-max-range" as const,
          placeholder: "Enter percentage",
          min: 0,
          max: 100,
          defaultValue: { comparison: 'min', value: 80 }
        }
      ]
    },
    // JUCO-specific filters
    {
      key: "juco-athletic-association",
      title: "Athletic Association",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "athleticAssociation",
          label: "Athletic Association",
          type: "multiselect" as const,
          placeholder: "Select association",
          options: [
            { value: 'CCCAA', label: 'CCCAA' },
            { value: 'NJCAA', label: 'NJCAA' },
            { value: 'NWAC', label: 'NWAC' }
          ]
        }
      ]
    },
    {
      key: "juco-region",
      title: "JUCO Region",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "jucoRegion",
          label: "JUCO Region",
          type: "multiselect" as const,
          placeholder: "Select region",
          options: Array.from({ length: 24 }, (_, i) => ({
            value: `Region ${i + 1}`,
            label: `Region ${i + 1}`
          }))
        }
      ]
    },
    {
      key: "juco-division",
      title: "JUCO Division",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "jucoDivision",
          label: "JUCO Division",
          type: "multiselect" as const,
          placeholder: "Select division",
          options: [
            { value: 'Division I', label: 'Division I' },
            { value: 'Division II', label: 'Division II' },
            { value: 'Division III', label: 'Division III' }
          ]
        }
      ]
    },
    // High School-specific filters
    {
      key: "hs-state",
      title: "High School State",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsState",
          label: "High School State",
          type: "multiselect" as const,
          placeholder: "Select HS state",
          options: [] // Will be populated dynamically
        }
      ]
    },
    {
      key: "hs-county",
      title: "High School County",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsCounty",
          label: "High School County",
          type: "multiselect" as const,
          placeholder: "Select HS county",
          options: [] // Will be populated dynamically
        }
      ]
    },
    {
      key: "hs-religious-affiliation",
      title: "Religious Affiliation",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsReligiousAffiliation",
          label: "Religious Affiliation",
          type: "multiselect" as const,
          placeholder: "Select religious affiliation",
          options: [] // Will be populated dynamically
        }
      ]
    },
    {
      key: "hs-school-type",
      title: "School Type",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsSchoolType",
          label: "School Type",
          type: "multiselect" as const,
          placeholder: "Select school type",
          options: [
            { value: 'High School', label: 'High School' },
            { value: 'Junior College', label: 'JUCO' }
          ]
        }
      ]
    },
    {
      key: "hs-prospects-score",
      title: "Prospects Score",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsProspectsScore",
          label: "Prospects Score",
          type: "slider" as const,
          placeholder: "Select prospects score range",
          min: 1,
          max: 10,
          step: 1,
          mode: "range" as const
        }
      ]
    },
    {
      key: "hs-d1-prospects-score",
      title: "D1 Prospects Score",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsD1ProspectsScore",
          label: "D1 Prospects Score",
          type: "slider" as const,
          placeholder: "Select D1 prospects score range",
          min: 1,
          max: 10,
          step: 1,
          mode: "range" as const
        }
      ]
    },
    {
      key: "hs-team-quality-score",
      title: "Team Quality Score",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsTeamQualityScore",
          label: "Team Quality Score",
          type: "slider" as const,
          placeholder: "Select team quality score range",
          min: 1,
          max: 10,
          step: 1,
          mode: "range" as const
        }
      ]
    },
    {
      key: "hs-athlete-income-score",
      title: "Athlete Income Score",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsAthleteIncomeScore",
          label: "Athlete Income Score",
          type: "slider" as const,
          placeholder: "Select athlete income score range",
          min: 1,
          max: 10,
          step: 1,
          mode: "range" as const
        }
      ]
    },
    {
      key: "hs-academics-score",
      title: "Academics Score",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "hsAcademicsScore",
          label: "Academics Score",
          type: "slider" as const,
          placeholder: "Select academics score range",
          min: 1,
          max: 10,
          step: 1,
          mode: "range" as const
        }
      ]
    },
    // High School Athletes specific filters
    {
      key: "grad_year",
      title: "Graduation Year",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "grad_year",
          label: "Graduation Year",
          type: "multiselect" as const,
          placeholder: "Select graduation years",
          options: [] // Will be populated dynamically with getYearOptions()
        }
      ]
    },
    {
      key: "weight",
      title: "Weight",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "weight",
          label: "Weight",
          type: "weight" as const,
          placeholder: "Enter weight range"
        }
      ]
    },
    {
      key: "athletic_projection",
      title: "Athletic Projection",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "athletic_projection",
          label: "Athletic Projection",
          type: "multiselect" as const,
          placeholder: "Select athletic projection",
          options: [
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
          ],
          showSearch: true,
          filterOption: (input: string, option?: { label: string; value: string }) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      ]
    },
    {
      key: "offer-commit",
      title: "Offer/Commit",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "best_offer",
          label: "Best Offer",
          type: "multiselect" as const,
          placeholder: "Select best offer",
          options: [
            { value: 'P4', label: 'P4' },
            { value: 'G5', label: 'G5' },
            { value: 'FCS', label: 'FCS' },
            { value: 'D2/NAIA', label: 'D2/NAIA' },
            { value: 'D3', label: 'D3' },
            { value: 'None', label: 'None' }
          ]
        },
        {
          key: "committed",
          label: "Committed",
          type: "multiselect" as const,
          placeholder: "Select committed status",
          options: [
            { value: 'Committed', label: 'Committed' },
            { value: 'Uncommitted', label: 'Uncommitted' }
          ]
        },
        {
          key: "signed",
          label: "Signed",
          type: "multiselect" as const,
          placeholder: "Select signed status",
          options: [
            { value: 'Signed', label: 'Signed' },
            { value: 'Unsigned', label: 'Unsigned' }
          ]
        },
        {
          key: "offer_count",
          label: "Offer Count",
          type: "offer-count" as const,
          placeholder: "Select category and enter count range"
        }
      ]
    },
    {
      key: "academics-income",
      title: "Academics/Income",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "gpa",
          label: "GPA",
          type: "min-max-range" as const,
          placeholder: "Enter GPA range",
          min: 0,
          max: 4.0,
          step: 0.1
        },
        {
          key: "gpa_type",
          label: "GPA Source",
          type: "multiselect" as const,
          placeholder: "Select GPA source",
          options: [
            { value: 'Verified Transcript', label: 'Verified Transcript' },
            { value: 'HS Coach (Adjusted)', label: 'HS Coach (Adjusted)' },
            { value: 'Predicted', label: 'Predicted' }
          ]
        },
        {
          key: "major",
          label: "Major",
          type: "text" as const,
          placeholder: "Enter major"
        },
        {
          key: "sat",
          label: "SAT",
          type: "min-max-range" as const,
          placeholder: "Enter SAT score range",
          min: 400,
          max: 1600,
          step: 10
        },
        {
          key: "act",
          label: "ACT",
          type: "min-max-range" as const,
          placeholder: "Enter ACT score range",
          min: 1,
          max: 36,
          step: 1
        },
        {
          key: "income_category",
          label: "Income Category",
          type: "multiselect" as const,
          placeholder: "Select income category",
          options: [
            { value: 'Very High EFC', label: 'Very High EFC' },
            { value: 'High EFC', label: 'High EFC' },
            { value: 'Average EFC', label: 'Average EFC' },
            { value: 'Low EFC', label: 'Low EFC' }
          ]
        }
      ]
    },
    {
      key: "verified-filters",
      title: "Verified Filters",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "added_date",
          label: "Date Added",
          type: "date-range" as const,
          placeholder: "Select date range"
        },
        {
          key: "last_major_change",
          label: "Last Major Update",
          type: "date-range" as const,
          placeholder: "Select date range"
        },
        {
          key: "show_archived",
          label: "Show Archived Athletes",
          type: "checkbox" as const,
          placeholder: "Show archived athletes"
        }
      ]
    },
    {
      key: "camp",
      title: "Camp",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "camp",
          label: "Camp Events",
          type: "camp" as const,
          placeholder: "Select camp events"
        }
      ]
    },
    {
      key: "recruiting-service-ratings",
      title: "Recruiting Service Ratings",
      collapsible: true,
      defaultExpanded: false,
      fields: [
        {
          key: "on3_consensus_stars",
          label: "On3 Consensus Stars",
          type: "multiselect" as const,
          placeholder: "Select stars",
          options: [
            { value: 'None', label: 'None' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' }
          ]
        },
        {
          key: "rivals_rating",
          label: "Rivals Rating",
          type: "min-max-range" as const,
          placeholder: "Enter rivals rating range",
          min: 0,
          max: 6.5,
          step: 0.1
        },
        {
          key: "on3_rating",
          label: "On3 Rating",
          type: "min-max-range" as const,
          placeholder: "Enter on3 rating range",
          min: 0,
          max: 100,
          step: 0.1
        },
        {
          key: "_247_rating",
          label: "247 Rating",
          type: "min-max-range" as const,
          placeholder: "Enter 247 rating range",
          min: 0,
          max: 100,
          step: 0.1
        },
        {
          key: "espn_rating",
          label: "ESPN Rating",
          type: "min-max-range" as const,
          placeholder: "Enter ESPN rating range",
          min: 0,
          max: 100,
          step: 0.1
        },
        {
          key: "on3_stars",
          label: "On3 Stars",
          type: "multiselect" as const,
          placeholder: "Select stars",
          options: [
            { value: 'None', label: 'None' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' }
          ]
        },
        {
          key: "_247_stars",
          label: "247 Stars",
          type: "multiselect" as const,
          placeholder: "Select stars",
          options: [
            { value: 'None', label: 'None' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' }
          ]
        },
        {
          key: "espn_stars",
          label: "ESPN Stars",
          type: "multiselect" as const,
          placeholder: "Select stars",
          options: [
            { value: 'None', label: 'None' },
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' }
          ]
        }
      ]
    },
    // Activity Feed specific filters
    {
      key: "event-parameters",
      title: "Event Parameters",
      collapsible: true,
      defaultExpanded: true,
      fields: [
        {
          key: "eventType",
          label: "Event Type",
          type: "multiselect" as const,
          placeholder: "Select event types",
          options: [
            { value: "commit", label: "Commit" },
            { value: "decommit", label: "De-Commit" },
            { value: "offer", label: "Offer" },
            { value: "visit", label: "Visit" },
            { value: "camp", label: "Camp" },
            { value: "coach note", label: "Coach Note" },
            { value: "coach call", label: "Coach Call" },
            { value: "coach message", label: "Coach Message" },
            { value: "coach visit", label: "Coach Visit" },
            { value: "coach multiple visit", label: "Coach Multiple Visit" },
            { value: "newProfile", label: "New Profile" },
            { value: "changedSchool", label: "Changed High School" },
            { value: "ratingChange", label: "Meaningful Rating Change" },
            { value: "heightWeightChange", label: "Meaningful Height/Weight Change" },
            { value: "personalBest", label: "Personal Best" },
            { value: "contactUpdate", label: "Updated Cell/Email" },
          ]
        },
        {
          key: "eventDate",
          label: "Event Date",
          type: "date-range" as const,
          placeholder: "Select date range"
        }
      ]
    },
    {
      key: "recruiting-college-info",
      title: "Recruiting College Filters",
      collapsible: true,
      defaultExpanded: true,
      fields: [],
      fieldRefs: ["location", "conference", "level", "school"] // Reference existing fields
    },
    {
      key: "athlete-info",
      title: "Athlete Filters",
      collapsible: true,
      defaultExpanded: true,
      fields: [], // No direct fields
      fieldRefs: ["position", "grad_year", "height", "weight", "athletic_projection", "athleteLocation"] // Reference existing fields
    }
  ];

  // Filter sections based on visibility configuration and maintain order
  const visibleSections: FilterSection[] = [];
  for (const key of visibilityConfig) {
    const section = allSections.find(s => s.key === key);
    if (section) {
      visibleSections.push(section as FilterSection);
    }
  }

  // Convert field definitions to actual fields and resolve references
  const configWithFields = {
    title: "Filters",
    showSaveFilter: true,
    showActiveFilters: true,
    maxWidth: 400,
    sections: visibleSections.map(section => ({
      ...section,
      fields: section.fields.map(field => 
        typeof field === 'string' ? FIELD_DEFINITIONS[field] : field
      ).filter(Boolean)
    }))
  };
  
  // Resolve field references by looking up fields in FIELD_DEFINITIONS
  const resolvedConfig = { ...configWithFields };
  
  resolvedConfig.sections = configWithFields.sections.map(section => {
    if (!section.fieldRefs || section.fieldRefs.length === 0) {
      return section;
    }
    
    // Find referenced fields from FIELD_DEFINITIONS
    const referencedFields = section.fieldRefs
      .map(fieldKey => FIELD_DEFINITIONS[fieldKey as keyof typeof FIELD_DEFINITIONS])
      .filter(Boolean);
    
    return {
      ...section,
      fields: [...section.fields, ...referencedFields]
    };
  });
  
  return resolvedConfig;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const shouldShowSection = (dataSource: DataSourceType, sectionKey: string): boolean => {
  const config = FILTER_VISIBILITY_CONFIG[dataSource];
  return config.includes(sectionKey);
};

// ============================================================================
// ACTIVITY FEED MAPPING FUNCTIONS
// ============================================================================

export const mapActivityFeedFilters = (filters: Record<string, any>) => {
  // Map the generic filter format to the activity feed service format
  return {
    eventTypes: filters.eventType,
    eventDateFrom: filters.eventDate?.startDate,
    eventDateTo: filters.eventDate?.endDate,
    graduationYears: filters.grad_year,
    positions: filters.position,
    height: filters.height,
    weight: filters.weight,
    athleticProjection: filters.athletic_projection,
    location: filters.location, // Pass the full location object
    conferences: filters.conference ? [filters.conference] : undefined,
    schoolLevels: filters.level ? [filters.level] : undefined,
    schools: filters.school ? [filters.school] : undefined,
    athleteLocation: filters.athleteLocation, // Pass the full location object for athlete
  };
};

export const mapActivityFeedFiltersFromService = (serviceFilters: Record<string, any>) => {
  // Map the activity feed service format back to the generic filter format
  return {
    eventType: serviceFilters.eventTypes,
    eventDate: serviceFilters.eventDateFrom && serviceFilters.eventDateTo ? {
      startDate: serviceFilters.eventDateFrom,
      endDate: serviceFilters.eventDateTo
    } : undefined,
    graduationYear: serviceFilters.graduationYears?.[0],
    location: serviceFilters.schoolLocations?.[0],
    conference: serviceFilters.conferences?.[0],
    level: serviceFilters.schoolLevels?.[0],
  };
};
