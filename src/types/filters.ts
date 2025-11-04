export interface FilterState {
  columns?: string[]; // Filter by recruiting board column names (position columns)
  years?: string[];
  divisions?: string[];
  // Unified location filter structure
  location?: {
    type: 'hometown_state' | 'international' | 'county' | 'school_state' | 'radius' | 'recruiting_area';
    values: string[];
    // For radius filter
    radius?: {
      center: string; // city, state or coordinates
      distance: number; // in miles
    };
    // For recruiting area filter
    recruitingArea?: {
      coachId: string;
      stateIds: number[];
      countyIds: number[];
      schoolIds: string[];
    };
  };
  // Legacy location filters (to be deprecated)
  states?: string[];
  international?: string[]; // New international filter
  schools?: string[]; // New school filter - contains school IDs
  athleticAid?: string[];
  status?: string[]; // New status filter
  position?: string[]; // New position filter (uses primary_position)
  // Dynamic stat filters - key will be the data_type_id from sport_stat_config
  [key: string]: any;
  gamesPlayed?: {
    comparison: 'min' | 'max' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  gamesStarted?: {
    comparison: 'min' | 'max' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  goals?: {
    comparison: 'min' | 'max' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  assists?: {
    comparison: 'min' | 'max' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  goalkeeperMinutes?: {
    comparison: 'min' | 'max' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  survey_completed?: boolean | boolean[];
  gradStudent?: boolean[];
  height?: {
    comparison: 'min' | 'max' | 'between';
    feet?: number;
    inches?: number;
    minFeet?: number;
    minInches?: number;
    maxFeet?: number;
    maxInches?: number;
  };
  honors?: string[]; // Filter for athlete honors: All American, All Region, All Conference
  designatedStudentAthlete?: boolean[]; // Filter for designated student athlete status
  // JUCO-specific filters
  athleticAssociation?: string[]; // Filter for athletic_association: CCCAA, NJCAA, NWAC
  jucoRegion?: string[]; // Filter for juco_region: Region 1-24
  jucoDivision?: string[]; // Filter for juco_division: Division I, II, III
  schoolState?: string[]; // Filter for school_state using same state list as hometown
  conference?: string[]; // Filter for conferences - sport-dependent column
  // High School-specific filters
  hsState?: string[]; // High school state (data_type_id 1013)
  hsCounty?: string[]; // High school county (data_type_id 991)
  hsReligiousAffiliation?: string[]; // Religious affiliation (data_type_id 929)
  hsSchoolType?: string[]; // HS/JUCO selection (High School, Junior College)
  hsProspectsScore?: { minValue?: number; maxValue?: number }; // Prospects Score (data_type_id 956)
  hsD1ProspectsScore?: { minValue?: number; maxValue?: number }; // D1 Prospects Score (data_type_id 957)
  hsTeamQualityScore?: { minValue?: number; maxValue?: number }; // Team Quality Score (data_type_id 958)
  hsAthleteIncomeScore?: { minValue?: number; maxValue?: number }; // Athlete Income Score (data_type_id 959)
  hsAcademicsScore?: { minValue?: number; maxValue?: number }; // Academics Score (data_type_id 960)
  transfer_odds?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // Transfer odds filter
  grad_year?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // Graduation year filter
  weight?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // Weight filter
  athletic_projection?: string[]; // Athletic projection filter for high school athletes
  // Offer/Commit filters for high school athletes
  best_offer?: string[]; // Best offer filter: P4, G5, FCS, D2/NAIA, D3, None
  committed?: string[]; // Committed filter: Committed, Uncommitted
  signed?: string[]; // Signed filter: Signed, Unsigned
  
  // Academics/Income filters for high school athletes
  gpa?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // GPA filter
  gpa_type?: string[]; // GPA Source filter: Verified Transcript, HS Coach (Adjusted), Predicted
  major?: string; // Major filter (free form text search)
  sat?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // SAT filter
  act?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // ACT filter
  income_category?: string[]; // Income filter: Very High EFC, High EFC, Average EFC, Low EFC
  
  // Verified Filters for high school athletes
  added_date?: { startDate?: string; endDate?: string }; // Date Added filter (date range)
  last_major_change?: { startDate?: string; endDate?: string }; // Last Major Update filter (date range)
  show_archived?: boolean; // Show Archived Athletes filter (checkbox - coming soon)
  
  // Recruiting Service Ratings
  on3_consensus_stars?: string[]; // On3 Consensus Stars filter: None, 2, 3, 4, 5
  rivals_rating?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // Rivals Rating filter
  on3_rating?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // On3 Rating filter
  _247_rating?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // 247 Rating filter
  espn_rating?: { comparison: 'min' | 'max' | 'between'; value?: number; minValue?: number; maxValue?: number }; // ESPN Rating filter
  on3_stars?: string[]; // On3 Stars filter: None, 2, 3, 4, 5
  _247_stars?: string[]; // 247 Stars filter: None, 2, 3, 4, 5
  espn_stars?: string[]; // ESPN Stars filter: None, 2, 3, 4, 5
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  userId: string;
} 