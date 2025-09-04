export interface School {
  school: string;
  address: string;
  county?: string;
  state?: string;
  head_coach_first?: string;
  head_coach_last?: string;
  private_public?: string;
  league_classification?: string;
  score_college_player?: number;
  score_d1_producing?: number;
  score_team_quality?: number;
  score_income?: number;
  score_academics?: number;
  recruiting_coaches?: string;
  head_coach_email?: string;
  head_coach_cell?: string;
  head_coach_work_phone?: string;
  head_coach_home_phone?: string;
  coach_twitter_handle?: string;
  visit_info?: string;
  best_phone?: string;
  coach_best_contact?: string;
  school_phone?: string;
  ad_name_first?: string;
  ad_name_last?: string;
  ad_email?: string;
  record_2024?: string;
  position?: {
    lat: number;
    lng: number;
  };
  raw_data?: {
    address_street1: string;
    address_street2?: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    high_school_id: string;
    [key: string]: string | number | boolean | null | undefined;
  };
  address_street1?: string;
  address_street2?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
} 