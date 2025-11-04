// ============================================================================
// TYPES FOR SCORE TRACKER
// ============================================================================
// These types define the data structure for the Score Tracker page
// All types should map to your database schema when integrating
// ============================================================================

// Player information
export interface Player {
  id: string;
  name: string;
  recruitingCoach: string; // initials like "MK"
  position: string;
  record?: string; // e.g., "10W - 0L"
  highSchool: string;
  state: string;
  year: string; // graduation year
  phone?: string;
  rating?: string;
}

// Game result information
export interface GameResult {
  playerId: string;
  opponent: string;
  homeAway: 'H' | 'A';
  result: 'W' | 'L'; // Win or Loss
  score: string; // e.g., "34-0", "7-21"
  date: string; // e.g., "Sat 9/6"
  gameSummary?: string; // e.g., "Saguache CO @ Monte Vista"
  source?: string; // e.g., "MP SS"
}

// Weekly game data (for grid view)
export interface WeeklyGameData {
  weekLabel: string; // e.g., "9/1-9/7"
  games: GameResult[];
}

// Column configuration for table columns
export interface ColumnConfig {
  key: string;
  displayName: string;
  visible: boolean;
  frozen?: boolean; // Columns that stay visible when scrolling horizontally
  order: number;
  dataIndex?: string; // For mapping to data source
  iconOnly?: boolean; // If true, only show icon (e.g., Surprise column)
}

// Saved filter/view configuration
export interface SavedView {
  id: string;
  name: string;
  viewType: 'player' | 'grid' | 'dateRange';
  selectedPlayers: string[]; // player IDs
  columnConfig: ColumnConfig[];
  filters?: {
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    weekRange?: {
      startWeek: string;
      endWeek: string;
    };
  };
  isActive?: boolean;
}

// Score tracker state
export interface ScoreTrackerState {
  selectedView: 'player' | 'grid' | 'dateRange';
  selectedPlayers: string[];
  columnConfig: ColumnConfig[];
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  customViewSelected?: string;
}

