import type { TableColumnsType } from "antd";

// College-related types
export type College = {
  name: string;
  conference: string;
  division: string;
};

// Details page types
export type AthleteDetails = {
  is_receiving_athletic_aid: string;
  commit_school_name?: string;
  link?: string;
  email?: string;
  expected_grad_date?: string;
  is_four_year_transfer?: boolean;
  is_transfer_graduate_student?: boolean;
  is_aid_cancelled?: boolean;
  comments?: string;
  hometown_state: string;
  image_url: string;
  high_name: string;
  ok_to_contact?: boolean;
  major?: string;
  previous_names?: string;
  roster_link?: string;
  bio?: string;
};

// Roster types
export type RosterInfo = {
  id: string;
  primary_position: string;
  hometown_state: string;
  image_url: string;
  high_name: string;
  height_feet: number;
  height_inch: number;
  weight: number;
  major?: string;
  bio?: string;
  roster_link?: string;
  twitter?: string;
  hand?: string;
  game_logs?: GameLog[];
  hometown_street?: string;
  hometown?: string;
  hometown_zip?: string;
};

// Add this new type for survey data
export type GenericSurvey = {
  cell?: string;
  pref_contact?: string;
  help_decision?: string;
  gpa?: number;
  important?: string;
  major_importance?: string;
  leaving_other?: string;
  leaving_playing_time?: string;
  leaving_coaches?: string;
  leaving_eligible_academic?: string;
  leaving_eligible_discipline?: string;
  leaving_eligible_other?: string;
  leaving_better_academics?: string;
  leaving_major?: string;
  leaving_home?: string;
  walk_on_t25?: string;
  ideal_division?: string;
  full_scholarship_only?: boolean;
  distance_from_home?: string;
  ideal_campus_size?: string;
  campus_location_type?: string;
  cost_vs_acad_rep?: string;
  winning_vs_location?: string;
  playing_vs_championship?: string;
  winning_vs_academics?: string;
  championship_vs_location?: string;
  party_vs_academics?: string;
  party_vs_winning?: string;
  type_of_staff_preferred?: string;
  male_to_female?: string;
  hbcu?: string;
  faith_based_name?: string;
  pref_d1_name?: string;
  pref_d2_name?: string;
  pref_d3_name?: string;
  pref_naia_name?: string;
  hs_highlight?: string;
  highlight?: string;
};

// Athlete honors type
export type AthleteHonor = {
  id: string;
  athlete_id: string;
  award: string;
  award_year: string;
};

// Survey token type
export type SurveyToken = {
  id: string;
  athlete_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
  used_at: string | null;
  is_active: boolean;
};

// Athlete base type
export type Athlete = {
  id: string;
  sport_id: number;
  first_name: string;
  last_name: string;
};

// Athlete fact type
export type AthleteFact = {
  id: string;
  athlete_id: string;
  data_type_id: number;
  value: string;
};

// Stat type
export type Stat = {
  id: string;
  athlete_id: string;
  data_type_id: number;
  value: string;
  // Add true score stat types
  TGb?: number; // data_type_id 221
  TGp?: number; // data_type_id 223
};

// Main athlete type combining all related data
export interface AthleteData {
  id: string;
  main_tp_page_id?: string;
  sport_id?: number;
  // Original fields
  athlete_name?: string;
  name_name?: string;
  school_id?: string;
  school_logo_url?: string;
  commit_school_id?: string;
  commit_school_logo_url?: string;
  date?: string;
  year?: string;
  division?: string;
  athletic_aid?: string;
  high_name?: string;
  state?: string;
  position?: string;
  commit_school_name?: string;
  status?: string;
  gp?: number;
  gs?: number;
  goals?: number;
  ast?: number;
  gk_min?: number;
  gpa?: string;
  birthday?: string;
  pref_contact?: string;
  help_decision?: string;
  contact_info?: string;
  cell_phone?: string;
  true_score?: number;
  eligibility_remaining?: string;
  game_eval?: string;
  club?: string;
  summer_league?: string;
  primary_position?: string;
  secondary_position?: string;
  image_url?: string;
  hometown?: string;
  hometown_state?: string;
  hometown_street?: string;
  hometown_zip?: string;
  height_feet?: number | null;
  height_inch?: number | null;
  weight?: number | null;
  twitter?: string;
  roster_link?: string;
  bio?: string;
  major?: string;
  hand?: string;
  perfect_game?: string;
  prep_baseball_report?: string;
  tfrrs_link?: string;
  game_logs?: any[];

  // Dynamic stats based on sport_stat_config
  [key: string]: any; // Allow dynamic stat fields like stat_98, stat_99, etc.

  // New fields for the detail box section
  first_name?: string;
  last_name?: string;
  initiated_date?: string;
  school?: {
    name?: string;
    conference?: string;
    division?: string;
  };
  main_tp_page?: [{
    id?: string;
    initiated_date?: string;
    year?: string;
    school_id?: string;
    status?: string;
    designated_student_athlete?: string;
    school?: {
      name?: string;
      division?: string;
    }
  }];
  details_tp_page?: [{
    is_receiving_athletic_aid?: string;
    expected_grad_date?: string;
    school?: {
      name?: string;
    };
    email?: string;
    ok_to_contact?: boolean;
    comments?: string;
    commit_school_name?: string;
    is_four_year_transfer?: boolean;
    previous_name?: string;
    is_transfer_graduate_student?: boolean;
  }];
  generic_survey?: [{
    cell?: string;
    pref_contact?: string;
    help_decision?: string;
    gpa?: number;
    important?: string;
    major_importance?: string;
    hs_highlight?: string;
    highlight?: string;
    birthday?: string;
    contact_info?: string;
    leaving_other?: string;
    leaving_playing_time?: string;
    leaving_coaches?: string;
    leaving_higher_level?: string;
    leaving_eligible_academic?: string;
    leaving_eligible_discipline?: string;
    leaving_eligible_other?: string;
    leaving_better_academics?: string;
    leaving_major?: string;
    leaving_home?: string;
    walk_on_t25?: string;
    ideal_division?: string;
    full_scholarship_only?: string;
    distance_from_home?: string;
    ideal_campus_size?: string;
    campus_location_type?: string;
    cost_vs_acad_rep?: string;
    winning_vs_location?: string;
    playing_vs_championship?: string;
    cost_vs_campus_type?: string;
    playing_vs_size?: string;
    winning_vs_academics?: string;
    championship_vs_location?: string;
    party_vs_academics?: string;
    party_vs_winning?: string;
    type_of_staff_preferred?: string;
    male_to_female?: string;
    hbcu?: string;
    faith_based_name?: string;
    pref_d1_name?: string;
    pref_d2_name?: string;
    pref_d3_name?: string;
    pref_naia_name?: string;
  }];
  msoc_survey?: [{
    best_pos?: string;
  }];
  athlete_honor?: [{
    id: string;
    award: string;
    award_year: string;
  }];
}

// Add other types as needed... 
// nate is awesome...

export type UserDetails = {
  id: string;
  name_first: string;
  name_last: string;
  packages?: string[]; // Array of package IDs the user has access to
};

export type Comment = {
  id: string;
  athlete_id: string;
  user_id: string;
  user_detail_id: string;
  customer_id: string;
  content: string;
  created_at: string;
  updated_at: string | null;
  user_detail: {
    id: string;
    name_first: string;
    name_last: string;
    customer_id: string;
  };
};

// Game Log type
export type GameLog = {
  id: string;
  season: number;
  athlete_year: string;
  season_team_id: string;
  opponent: string;
  date?: string;
  result?: string;
  school?: { 
    name: string;
  };
  // Player stats
  gp?: number;
  gs?: number;
  goals?: number;
  assists?: number;
  points?: number;
  sh_att?: number;
  fouls?: number;
  // Goalie stats
  goal_app?: number;
  g_min_played?: number;
  ga?: number;
  gaa?: number;
  sv_pct?: number;
};

// Alert type for tp_alert table
export interface Alert {
  created_at: string;
  id: number;
  rule: string;
  recipient: string;
  ended_date: string | null;
  survey_alert?: boolean;
}

// Sport Stat Config types
export interface SportStatConfig {
  id: string;
  sport_id: string;
  data_type_id: number;
  display_name: string;
  display_order: number;
  stat_category: string;
  search_column_display?: number; // Order for transfer page table columns
  data_type_name?: string; // Name of the connected data_type
  sanitized_column_name?: string; // Sanitized column name for SQL queries
  decimal_places?: number; // Number of decimal places to display (default: 2)
  is_percentage?: boolean; // Whether the value should be displayed as a percentage (multiply by 100)
  convert_negative_to_zero?: boolean; // Whether to convert negative values to zero
  is_calculated?: boolean; // Whether this is a calculated formula column
  formula?: string; // Formula string (e.g., "160+161" for data_type_id 160 + data_type_id 161)
}

export interface StatCategory {
  name: string;
  columns: TableColumnsType<any>;
  data: any[];
}

// Recruiting board data type
export interface RecruitingBoardPosition {
  id: string;
  customer_id: string;
  position_name: string;
  display_order: number;
  created_at: string;
  ended_at: string | null;
}

export interface RecruitingBoardData {
  key: string;
  id: string;
  recruiting_board_id: string;
  fname: string;
  lname: string;
  image: string;
  imageLarge: string;
  unread: number;
  rating: number;
  avg: number;
  school: string;
  schoolIcon: string;
  academy: string;
  academyIcon: string;
  date: string;
  evaluation: string;
  div: string;
  yr: string;
  $: string;
  ht: string;
  high_school: string;
  st: string;
  wt: string;
  s: string;
  h: string;
  direction: string;
  position: string;
  tier: number | null;
  tierColor: string | null;
  userFirstName: string;
  userLastName: string;
  ratingName: string | null;
  ratingColor: string | null;
  rank: number | null;
}