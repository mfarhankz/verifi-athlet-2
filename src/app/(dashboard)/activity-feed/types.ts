// ============================================================================
// TYPES FOR ACTIVITY FEED
// ============================================================================
// These types define the data structure for the Activity Feed page
// All types should map to your database schema when integrating
// ============================================================================

// Athlete information display
export interface AthleteInfo {
  name: string;
  image: string;
  height: string;
  weight: string;
  position: string;
}

// High school information
export interface SchoolInfo {
  name: string;
  location: string;
  schoolType?: string;
}

// College/university information
export interface CollegeInfo {
  name: string;
  logo: string;
}

// Activity event structure - this is what displays in the table
// TODO: Map this to your database activity_events table structure
export interface ActivityEvent {
  key: string;
  athleteId?: string; // Add athlete ID for navigation
  athlete: AthleteInfo;
  position: string;
  highSchool: SchoolInfo;
  graduation: string;
  college: CollegeInfo;
  eventDate: string;
  type: string;
  typeIcon: "checkmark" | "cross" | "solid-check" | "visit" | "camp" | null;
  source: string;
  offerCounts: {
    totalOffers: number;
    p4: number;
    g5: number;
    fcs: number;
    d2Naia: number;
    d3: number;
  };
}

// Activity Feed Filter State - this represents the saved filter state
// TODO: Save to database table like: saved_filters or user_filter_preferences
// This structure matches the inputs in ActivityFeedFilters component
export interface ActivityFeedFilterState {
  id?: string;
  name: string;
  eventParameters: {
    eventDate?: string[];
    eventType?: string[];
  };
  schoolInfo: {
    location?: string[];
    conference?: string[];
    level?: string[];
    school?: string[];
  };
  athleteInfo: {
    graduationYear?: string[];
    graduationLocation?: string[];
    position?: string[];
    height?: {
      comparison: 'min' | 'max' | 'between';
      value?: number;
      minValue?: number;
      maxValue?: number;
    };
    weight?: {
      comparison: 'min' | 'max' | 'between';
      value?: number;
      minValue?: number;
      maxValue?: number;
    };
    athleticProjection?: string[];
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
  };
  createdAt?: string;
  isActive?: boolean;
}

export interface FilterSection {
  title: string;
  fields: {
    label: string;
    type: "input" | "select" | "multiselect";
    options?: string[];
    value?: string | string[];
  }[];
  isExpanded: boolean;
}

