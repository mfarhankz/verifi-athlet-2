export interface DepthChartFormation {
  id: string;
  name: string;
  order: number;
  created_at: string;
  ended_at: string | null;
  customer_id: string;
}

export interface DepthChartSubPosition {
  id: string;
  name: string;
  x_coord: number;
  y_coord: number;
  depth_chart_formation_id: string;
  created_at: string;
  ended_at: string | null;
}

export interface DepthChartAssignment {
  id: string;
  athlete_id: string;
  sub_position_id: string;
  customer_id: string;
  ranking: number;
  year: number;
  scenario: string;
  month: number;
  created_at: string;
  updated_at: string;
}

export interface EffectiveDepthChartAssignment extends DepthChartAssignment {
  is_inherited: boolean;
  source_scenario: string;
  source_month: number;
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    image_url?: string;
    primary_position?: string;
    secondary_position?: string;
  };
}

export interface DepthChartAssignmentWithAthlete extends DepthChartAssignment {
  athlete: {
    id: string;
    first_name: string;
    last_name: string;
    image_url?: string;
    primary_position?: string;
    secondary_position?: string;
  };
} 