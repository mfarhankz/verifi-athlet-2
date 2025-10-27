// Define tooltip text for specific columns
export const COLUMN_TOOLTIPS: Record<string, string> = {
  'IS': 'Verified Impact Score - a single score that quantifies a player\'s impact using a formula based solely on their box score data - 10+ = All-time season | 8+ = MVP season | 6+ = All-conference season | 4+ = consideration for all-conference season | 2+ = role player/contributor | 0+ = not a regular contributor',
  'V': 'Verified Player Rating - A single score that takes a players Verified Impact Score and adjusts for competition level, allowing D1, D2 and D3 players to be accurately compared — rated on a 50–100 scale, with 100 as the top score.',
  'V(b)': 'Verified Rating - Batting - A single score that adjusts wOBA (weighted on-base average) for competition level, allowing D1, D2 and D3 players to be accurately compared — rated on a 50–100 scale, with 100 as the top score. (min 50 AB)',
  'V(p)': 'Verified Rating - Pitching - A single score that adjusts FIP (Fielding Independent Pitching) for competition level, allowing D1, D2 and D3 players to be accurately compared — rated on a 50–100 scale, with 100 as the top score. (min 20 IP)'
};

/**
 * Get tooltip text for a given column name
 * @param columnName - The column name to get tooltip for
 * @returns The tooltip text or null if no tooltip exists for this column
 */
export const getColumnTooltip = (columnName: string): string | null => {
  return COLUMN_TOOLTIPS[columnName] || null;
};
