// Define tooltip text for specific columns
export const COLUMN_TOOLTIPS: Record<string, string> = {
  'IS': 'Verified Impact Score - a single score that quantifies a player\'s impact using a formula based solely on their box score data - 10+ = All-time season | 8+ = MVP season | 6+ = All-conference season | 4+ = consideration for all-conference season | 2+ = role player/contributor | 0+ = not a regular contributor',
  'V': 'Verified Player Rating - A single score that takes a players Verified Impact Score and adjusts for competition level, allowing D1, D2 and D3 players to be accurately compared — rated on a 50–100 scale, with 100 as the top score.',
  'V(b)': 'Verified Rating - Batting - A single score that adjusts wOBA (weighted on-base average) for competition level, allowing D1, D2 and D3 players to be accurately compared — rated on a 50–100 scale, with 100 as the top score. (min 50 AB)',
  'V(p)': 'Verified Rating - Pitching - A single score that adjusts FIP (Fielding Independent Pitching) for competition level, allowing D1, D2 and D3 players to be accurately compared — rated on a 50–100 scale, with 100 as the top score. (min 20 IP)',
  'V(m)': 'A single rating that factors in stats like goals, assists, games played, games started, and postseason awards — adjusted for team quality and level of competition — allowing D1, D2, and D3 players to be compared on the same scale. Rated from 50–100, with 100 as the highest possible score.',
  'V(w)': 'A single rating that factors in stats like goals, assists, games played, games started, and postseason awards — adjusted for team quality and level of competition — allowing D1, D2, and D3 players to be compared on the same scale. Rated from 50–100, with 100 as the highest possible score.'
};

// Sport-specific tooltips for columns that have different meanings across sports
// Key format: "columnName_sportId"
const SPORT_SPECIFIC_TOOLTIPS: Record<string, string> = {
  // Soccer Verified Rating (sport_id 3 = men's soccer, sport_id 4 = women's soccer)
  'V_3': 'A single rating that factors in stats like goals, assists, games played, games started, and postseason awards — adjusted for team quality and level of competition — allowing D1, D2, and D3 players to be compared on the same scale. Rated from 50–100, with 100 as the highest possible score.',
  'V_4': 'A single rating that factors in stats like goals, assists, games played, games started, and postseason awards — adjusted for team quality and level of competition — allowing D1, D2, and D3 players to be compared on the same scale. Rated from 50–100, with 100 as the highest possible score.',
  'Verified Rating_3': 'A single rating that factors in stats like goals, assists, games played, games started, and postseason awards — adjusted for team quality and level of competition — allowing D1, D2, and D3 players to be compared on the same scale. Rated from 50–100, with 100 as the highest possible score.',
  'Verified Rating_4': 'A single rating that factors in stats like goals, assists, games played, games started, and postseason awards — adjusted for team quality and level of competition — allowing D1, D2, and D3 players to be compared on the same scale. Rated from 50–100, with 100 as the highest possible score.'
};

/**
 * Get tooltip text for a given column name
 * @param columnName - The column name to get tooltip for
 * @param sportId - Optional sport ID for sport-specific tooltips
 * @returns The tooltip text or null if no tooltip exists for this column
 */
export const getColumnTooltip = (columnName: string, sportId?: string | number): string | null => {
  // Check for sport-specific tooltip first if sportId is provided
  if (sportId) {
    const sportSpecificKey = `${columnName}_${sportId}`;
    if (SPORT_SPECIFIC_TOOLTIPS[sportSpecificKey]) {
      return SPORT_SPECIFIC_TOOLTIPS[sportSpecificKey];
    }
  }
  
  // Fall back to general tooltip
  return COLUMN_TOOLTIPS[columnName] || null;
};
