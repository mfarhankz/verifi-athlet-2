export interface FilterState {
  years?: string[];
  divisions?: string[];
  states?: string[];
  international?: string[]; // New international filter
  athleticAid?: string[];
  status?: string[]; // New status filter
  position?: string[]; // New position filter
  // Dynamic stat filters - key will be the data_type_id from sport_stat_config
  [key: string]: any;
  gamesPlayed?: {
    comparison: 'greater' | 'less' | 'equal' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  gamesStarted?: {
    comparison: 'greater' | 'less' | 'equal' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  goals?: {
    comparison: 'greater' | 'less' | 'equal' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  assists?: {
    comparison: 'greater' | 'less' | 'equal' | 'between';
    value?: number;
    minValue?: number;
    maxValue?: number;
  };
  goalkeeperMinutes?: {
    comparison: 'greater' | 'less' | 'equal' | 'between';
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
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  userId: string;
} 