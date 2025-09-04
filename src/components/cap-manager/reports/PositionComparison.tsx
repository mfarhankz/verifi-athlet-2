import React, { useState, useEffect } from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { fetchSalaryComparisonDataByGroup, fetchUserDetails, fetchAdjustedPlayers, fetchBudgetData, fetchPositionOrder } from '@/utils/utils';
import { calculateTeamSummary, calculateCategorySummary, calculatePositionSummary } from '@/utils/summaryBoxUtils';

const COLOR_LABELS = [
  { name: 'Blue', color: '#468df3' },
  { name: 'Orange', color: '#ffa600' },
  { name: 'Green', color: '#2edb8f' },
];

// Updated positions and categories
const POSITIONS = [
  { pos: 'QB', cat: 'O' },
  { pos: 'RB', cat: 'O' },
  { pos: 'WR', cat: 'O' },
  { pos: 'TE', cat: 'O' },
  { pos: 'OL', cat: 'O' },
  { pos: 'IDL', cat: 'D' },
  { pos: 'EDGE', cat: 'D' },
  { pos: 'LB', cat: 'D' },
  { pos: 'CB', cat: 'D' },
  { pos: 'S', cat: 'D' },
];
const CATEGORIES = ['O', 'D', 'ST'];

// Add O, D, ST as x-axis categories with mock data
const ALL_X = [...POSITIONS.map(p => p.pos), ...CATEGORIES];

const NORMALIZED_POSITION_CATEGORY_MAP: { [key: string]: string } = {
  QB: 'Offense',
  RB: 'Offense',
  WR: 'Offense',
  TE: 'Offense',
  OL: 'Offense',
  IDL: 'Defense',
  EDGE: 'Defense',
  LB: 'Defense',
  CB: 'Defense',
  S: 'Defense',
  // Add special teams if needed
};

interface PositionComparisonProps {
  selectedYear: number;
  selectedMonth: string;
  selectedScenario: string;
  activeFilters: { [key: string]: string[] | string };
}

function normalizePositionName(pos: string): string {
  if (!pos) return "";
  const p = pos.replace(/\s/g, "");
  if (["DL", "DT", "NOSE", "IDL"].includes(p)) return "IDL";
  if (["EDGE", "END", "DE"].includes(p)) return "EDGE";
  if (["CB", "FC", "BC"].includes(p)) return "CB";
  if (["S", "SAF", "FS", "BS", "SS"].includes(p)) return "S";
  if (["WR", "WR-Z", "WR-X"].includes(p)) return "WR";
  if (["TE", "TE-A", "TE-Y"].includes(p)) return "TE";
  if (["LB", "MLB", "OLB", "ILB", "WILL", "SAM", "MIKE", "M"].includes(p)) return "LB";
  if (["RB", "HB", "B", "F"].includes(p)) return "RB";
  if (["OL", "OG", "OT", "OC", "OGC", "G"].includes(p)) return "OL";
  if (["QB"].includes(p)) return "QB";
  return p;
}

const PositionComparison: React.FC<PositionComparisonProps> = ({
  selectedYear,
  selectedMonth,
  selectedScenario,
  activeFilters
}) => {
  const [positionOrder, setPositionOrder] = useState<string[]>([]);
  const [salaryOptions, setSalaryOptions] = useState<{ group: string; year: string }[]>([]);
  const [selectedBars, setSelectedBars] = useState(['off', 'off', 'off']);
  const [salaryData, setSalaryData] = useState<any[]>([]);

  const excludeFields = ['scholarships', 'scholarship_dollars_total', 'roster_spots', 'count'];
  const sumValues = (obj: any) => Object.entries(obj)
    .filter(([key, value]) => !excludeFields.includes(key) && typeof value === 'number')
    .reduce((sum, [_, value]) => sum + (value as number), 0);

  const [barYearData, setBarYearData] = useState<Record<number, { tasks: any[]; deadMoney: any[] }>>({});
  const [barYearBudgetData, setBarYearBudgetData] = useState<Record<number, any[]>>({});
  const [barYearPositionOrder, setBarYearPositionOrder] = useState<Record<number, string[]>>({});

  useEffect(() => {
    const fetchAll = async () => {
      const userDetails = await fetchUserDetails();
      if (!userDetails) return;

      // Always prefetch 2025 and 2026 data on mount
      const prefetchYears = [2025, 2026];
      // Find all years needed for the current selected bars
      const barYears = selectedBars
        .filter(barKey => barKey !== 'off')
        .map(barKey => {
          const parts = barKey.split('_');
          return parts.length > 1 && !isNaN(Number(parts[1])) ? Number(parts[1]) : selectedYear;
        });
      const uniqueYears = Array.from(new Set([selectedYear, ...barYears, ...prefetchYears]));

      // Fetch and cache player data for each year
      const newBarYearData: Record<number, { tasks: any[]; deadMoney: any[] }> = { ...barYearData };
      const newBarYearBudgetData: Record<number, any[]> = { ...barYearBudgetData };
      const newBarYearPositionOrder: Record<number, string[]> = { ...barYearPositionOrder };
      
      for (const year of uniqueYears) {
        if (!newBarYearData[year]) {
          const { players, deadMoney } = await fetchAdjustedPlayers(
            userDetails.customer_id,
            year,
            selectedScenario,
            activeFilters,
            selectedMonth
          );
          // Normalize positions for all players and dead money
          const normPlayers = players.map(p => ({
            ...p,
            position: normalizePositionName(p.position)
          }));
          const normDeadMoney = deadMoney.map(p => ({
            ...p,
            position: normalizePositionName(p.position)
          }));
          newBarYearData[year] = { tasks: normPlayers, deadMoney: normDeadMoney };
        }
        if (!newBarYearBudgetData[year]) {
          const budget = await fetchBudgetData(userDetails.customer_id, year, selectedScenario);
          // Normalize positions in budgetData
          const normBudget = (budget || []).map(b => ({
            ...b,
            position: normalizePositionName(b.position)
          }));
          newBarYearBudgetData[year] = normBudget;
        }
        if (!newBarYearPositionOrder[year]) {
          const posOrder = await fetchPositionOrder(userDetails.customer_id, year);
          newBarYearPositionOrder[year] = posOrder.map((item: any) => normalizePositionName(item.position));
        }
      }
      setBarYearData(newBarYearData);
      setBarYearBudgetData(newBarYearBudgetData);
      setBarYearPositionOrder(newBarYearPositionOrder);

      // Set the current year's position order for backward compatibility
      setPositionOrder(newBarYearPositionOrder[selectedYear] || []);
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, selectedMonth, selectedScenario, JSON.stringify(activeFilters), JSON.stringify(selectedBars)]);

  useEffect(() => {
    // Fetch all salary_comparison_data and build unique group/year options
    const fetchOptions = async () => {
      const data = await fetchSalaryComparisonDataByGroup();
      setSalaryData(data || []);
      // Static options
      const staticOptions = [
        { group: 'My Budget', year: '2025' },
        { group: 'My Actual', year: '2025' },
        { group: 'My Budget', year: '2026' },
        { group: 'My Actual', year: '2026' },
      ];
      // Build unique group/year pairs from data
      const dynamic: { group: string; year: string }[] = [];
      const seen = new Set();
      data.forEach((row: any) => {
        const key = `${row.group}_${row.year}`;
        if (!seen.has(key)) {
          dynamic.push({ group: row.group, year: row.year });
          seen.add(key);
        }
      });
      // Sort: NFL first, then rest alphabetically
      const nfl = dynamic.filter(opt => opt.group.toUpperCase().startsWith('NFL'));
      const rest = dynamic.filter(opt => !opt.group.toUpperCase().startsWith('NFL'));
      nfl.sort((a, b) => a.group.localeCompare(b.group) || a.year.localeCompare(b.year));
      rest.sort((a, b) => a.group.localeCompare(b.group) || a.year.localeCompare(b.year));
      const sortedOptions = [...staticOptions, ...nfl, ...rest];
      setSalaryOptions(sortedOptions);
      setSelectedBars([
        sortedOptions[0] ? `${sortedOptions[0].group}_${sortedOptions[0].year}` : 'off',
        sortedOptions[1] ? `${sortedOptions[1].group}_${sortedOptions[1].year}` : 'off',
        'off',
      ]);
    };
    fetchOptions();
  }, [selectedYear]);

  const handleDropdownChange = (index: number, value: string) => {
    if (value !== 'off' && selectedBars.includes(value)) {
      const otherIndex = selectedBars.findIndex(v => v === value);
      if (otherIndex !== index) {
        const newBars = [...selectedBars];
        newBars[otherIndex] = selectedBars[index];
        newBars[index] = value;
        setSelectedBars(newBars);
        return;
      }
    }
    const newBars = [...selectedBars];
    newBars[index] = value;
    setSelectedBars(newBars);
  };

  // Helper to get chart data for selected bars
  const getChartData = () => {
    // Get team totals for normalization
    const barDataMap: Record<string, Record<string, number>> = {};
    // Helper to sum all relevant numeric values in a summary object
    const sumSummaryValues = (obj: any) => Object.entries(obj)
      .filter(([key, value]) => !excludeFields.includes(key) && typeof value === 'number')
      .reduce((sum, [_, value]) => sum + (value as number), 0);

    const positionCategoryMap = {
      ...NORMALIZED_POSITION_CATEGORY_MAP,
      ...barYearBudgetData[selectedYear]?.reduce((acc, item) => {
        if (item.position) {
          acc[item.position] = item.category;
        }
        return acc;
      }, {} as { [key: string]: string })
    };

    selectedBars.forEach(barKey => {
      if (barKey === 'off') return;
      // Parse year from barKey (e.g., 'My Actual_2025' => 2025)
      let barYear = selectedYear;
      const barKeyParts = barKey.split('_');
      if (barKeyParts.length > 1 && !isNaN(Number(barKeyParts[1]))) {
        barYear = Number(barKeyParts[1]);
      }
      // Use year-specific tasks/deadMoney for this bar
      const yearData = barYearData[barYear];
      const yearBudgetData = barYearBudgetData[barYear] || [];
      if (!yearData) {
        // Not loaded yet, show 0s
        barDataMap[barKey] = {};
        ALL_X.forEach(pos => { barDataMap[barKey][pos] = 0; });
        return;
      }
      const { tasks: yearTasks, deadMoney: yearDeadMoney } = yearData;
      if (barKey.startsWith('My Budget_') || barKey.startsWith('My Actual_')) {
        const isBudget = barKey.startsWith('My Budget_');
        const summaryProp = isBudget ? 'target' : 'actual';

        barDataMap[barKey] = {};
        console.log('yearTasks', yearTasks);
        console.log('yearBudgetData', yearBudgetData);
        console.log('barYear', barYear);
        console.log('yearDeadMoney', yearDeadMoney);
        console.log('summaryProp', summaryProp);
        const teamSummary = calculateTeamSummary(yearTasks, yearBudgetData, barYear, {}, yearDeadMoney);
        console.log('teamSummary', teamSummary);
        const teamTotal = sumValues(teamSummary[summaryProp]);
        console.log('teamTotal', teamTotal);
        if (barKey.startsWith('My Budget_')) {
          console.log('teamSummary', teamSummary);
        }
        ALL_X.forEach(pos => {
          if (CATEGORIES.includes(pos)) {
            console.log(yearTasks)
            console.log(yearBudgetData)
            const yearPositionOrder = barYearPositionOrder[barYear] || [];
            const catSummary = calculateCategorySummary(yearTasks, yearBudgetData, pos, barYear, {}, yearPositionOrder, yearDeadMoney);
            const catTotal = sumSummaryValues(catSummary[summaryProp]);
            barDataMap[barKey][pos] = teamTotal > 0 ? Math.round((catTotal / teamTotal) * 100) : 0;
            if (barKey.startsWith('My Actual_')) {
              console.log(pos)
              console.log('catSummary', catSummary);
            }
          } else {
            const norm = normalizePositionName(pos);
            const posSummary = calculatePositionSummary(yearTasks, norm, yearBudgetData, barYear, 0, yearDeadMoney);
            const posTotal = sumSummaryValues(posSummary[summaryProp]);
            barDataMap[barKey][pos] = teamTotal > 0 ? Math.round((posTotal / teamTotal) * 100) : 0;
            if (barKey.startsWith('My Budget_')) {

          }
        }
        });
        return;
      }
      // Database-driven: parse group and year
      const [group, year] = barKey.split('_');
      const rows = salaryData.filter(row => row.group === group && String(row.year) === String(year));
      let sumPositions = 0;
      let sumCats = 0;
      const posValues: Record<string, number> = {};
      const catValues: Record<string, number> = {};
      rows.forEach(row => {
        if (ALL_X.includes(row.position)) {
          if (CATEGORIES.includes(row.position)) {
            catValues[row.position] = (catValues[row.position] || 0) + Number(row.amount || 0);
            sumCats += Number(row.amount || 0);
          } else {
            posValues[row.position] = (posValues[row.position] || 0) + Number(row.amount || 0);
            sumPositions += Number(row.amount || 0);
          }
        }
      });
      barDataMap[barKey] = {};
      ALL_X.forEach(pos => {
        if (CATEGORIES.includes(pos)) {
          barDataMap[barKey][pos] = sumCats > 0 ? Math.round((catValues[pos] || 0) / sumCats * 100) : 0;
        } else {
          barDataMap[barKey][pos] = sumPositions > 0 ? Math.round((posValues[pos] || 0) / sumPositions * 100) : 0;
        }
      });
    });
    // Build chart data array
    return ALL_X.map(pos => {
      const row: any = { position: pos };
      selectedBars.forEach(barKey => {
        if (barKey === 'off') return;
        row[barKey] = barDataMap[barKey][pos] ?? 0;
      });
      return row;
    });
  };

  const activeBarKeys = selectedBars.filter(v => v !== 'off');

  // Custom tick rendering for x-axis
  const CustomAxisBottom = (tick: any) => {
    const posIndex = ALL_X.findIndex(x => x === tick.value);
    const isLastPos = posIndex === POSITIONS.length - 1;
    const isCategory = CATEGORIES.includes(tick.value);
    return (
      <g transform={`translate(${tick.x},${tick.y + 22})`}>
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 14, fill: isCategory ? '#888' : '#222', fontWeight: isCategory ? 600 : 400 }}
        >
          {tick.value}
        </text>
        {/* Draw vertical separator after last position, extending up the chart */}
        {isLastPos && (
          <line x1={30} y1={-350} x2={30} y2={10} stroke="#bbb" strokeWidth={2} />
        )}
      </g>
    );
  };

  return (
    <>
      {/* Bar selection dropdowns */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ fontWeight: 500, marginBottom: 4, color: COLOR_LABELS[i].color }}>
              {COLOR_LABELS[i].name}
            </label>
            <select
              value={selectedBars[i]}
              onChange={e => handleDropdownChange(i, e.target.value)}
              style={{ padding: '0.5rem 1rem', fontSize: '1rem', borderRadius: 4 }}
            >
              {/* Move 'off' option to the top for dropdowns 2 and 3 */}
              {i > 0 && (
                <option value="off">Off</option>
              )}
              {salaryOptions.map(opt => {
                const val = `${opt.group}_${opt.year}`;
                return (
                  <option
                    key={val}
                    value={val}
                    disabled={selectedBars.includes(val) && selectedBars[i] !== val}
                  >
                    {opt.group} ({opt.year})
                  </option>
                );
              })}
            </select>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 16, minHeight: '600px' }}>
        <ResponsiveBar
          data={getChartData()}
          keys={activeBarKeys}
          indexBy="position"
          margin={{ top: 30, right: 80, bottom: 70, left: 60 }}
          padding={0.3}
          groupMode="grouped"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={({ id }) => {
            const idx = selectedBars.findIndex(v => v === id);
            return COLOR_LABELS[idx]?.color || '#888';
          }}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '',
            legendPosition: 'middle',
            legendOffset: 32,
            renderTick: CustomAxisBottom,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: '%',
            legendPosition: 'middle',
            legendOffset: -40,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          animate={true}
          legends={[]}
          role="application"
          ariaLabel="Position Compare Bar Chart"
          barAriaLabel={function(e){return e.id+': '+e.formattedValue+' at position: '+e.indexValue;}}
        />
      </div>
    </>
  );
};

export default PositionComparison; 