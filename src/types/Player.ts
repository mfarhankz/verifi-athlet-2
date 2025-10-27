export interface CompensationFields {
  [key: string]: number;
}

export interface Player {
  id: string;
  name__first: string;
  name__last: string;
  position: string;
  image_url: string;
  elig_remaining: number;
  year: string;
  scholarship_perc: number;
  redshirt_status: string;
  compensation: number;
  month: string;
  pos_rank: number;
  starting_season: number;
  commit: number;
  injury: number;
  monthlyCompensation?: number[];
  positionCategory?: string;
  hide?: number;
  athlete_id?: string;
  ending_season: number;
  tier?: number;
  title?: string;  // Computed from name__first + name__last
  description?: string;  // Same as position
  compensationDisplay?: string;
  slot?: number;  // Same as pos_rank
  budgetDifference?: number;
  teamPercentage?: number;
  positionPercentage?: number;
  isRecruit?: boolean;
  eligRemaining?: number;
  is_committed?: number;
  is_injured?: number;
  compensationFields?: CompensationFields;
  [key: `comp_${string}`]: number;
  pff_link?: string;
  player_tag?: string;
  scholarship_dollars_total?: number;
  scholarship_dollars_tuition?: number;
  scholarship_dollars_fees?: number;
  scholarship_dollars_room?: number;
  scholarship_dollars_books?: number;
  scholarship_dollars_meals?: number;
  scholarship_dollars_cost_attendance?: number;
  notes?: string;
}