import { Player } from '../types/Player';
import summaryStyles from '../styles/SummaryBox.module.css';
import { formatCompensation, calculatePercentage } from "./utils";
import { SummaryRow } from '../components/cap-manager/SummaryRow';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

export const sumBy = (array: any[], key: string): number => {
    return array.reduce((sum, item) => sum + (item[key] || 0), 0);
  };

const getAdditionalFields = (budgetData: any[]): string[] => {
  if (!budgetData || budgetData.length === 0) return [];
  
  const standardFields = [
    'amount', 'category', 'id', 'order', 'position', 
    'roster_spots', 'scenario', 'scholarships', 'slot', 
    'team', 'year', 'scholarships_dollars'
  ];
  
  // Check all budget items for additional fields
  const allFields = new Set<string>();
  budgetData.forEach(item => {
    Object.entries(item).forEach(([key, value]) => {
      // Include any non-standard field that has a numeric value
      if (!standardFields.includes(key) && typeof value !== 'object') {
        allFields.add(key);
      }
    });
  });
  
  return Array.from(allFields);
};

export const calculateTeamSummary = (
    tasks: Player[], 
    budgetData: any[], 
    selectedYear: number, 
    activeFilters: { [key: string]: string[] },
    deadMoneyPlayers: Player[] = []
) => {
    const additionalFields = getAdditionalFields(budgetData);
    const currentTasks = tasks.filter(task => 
      task.starting_season <= selectedYear &&
      (!activeFilters.position || activeFilters.position.includes(task.position || ''))  
    );

    const filteredDeadMoney = deadMoneyPlayers.filter(player =>
      !activeFilters.position || activeFilters.position.includes(player.position || '')
    );

    // Use only currentTasks for player count
    const actualCount = currentTasks.length;
    const actualRosterSpots = currentTasks.length;

    // Combine tasks for scholarship and compensation calculations
    const allTasks = [...currentTasks, ...filteredDeadMoney];
    const actualScholarships = Math.round(sumBy(allTasks, 'scholarship_perc') * 100) /100;
    const actualCompensation = sumBy(allTasks, 'compensation');

    // Get the overall budget record for additional fields
    const overallBudget = budgetData.find(item => item.category === 'overall');

    // Filter budget data for positions
    const filteredBudgetData = budgetData.reduce((acc: any[], item) => {
      if (!item.position || item.slot !== null) return acc;
      if (activeFilters.position && !activeFilters.position.includes(item.position)) return acc;
      const existingIndex = acc.findIndex(x => x.position === item.position);
      if (existingIndex === -1) {
        acc.push(item);
      } else {
        const existing = acc[existingIndex];
        if (item.year <= selectedYear && 
            (existing.year < item.year || existing.year > selectedYear)) {
          acc[existingIndex] = item;
        }
      }
      return acc;
    }, []);

    const targetScholarships = sumBy(filteredBudgetData, 'scholarships');
    const targetCompensation = sumBy(filteredBudgetData, 'amount');
    const targetRosterSpots = sumBy(filteredBudgetData, 'roster_spots');

    // Calculate additional fields using allTasks and overall budget
    const additionalValues = additionalFields.reduce((acc, field) => {
      const actual = sumBy(allTasks, 'comp_' + field);
      const target = overallBudget ? overallBudget[field] || 0 : 0;
      return {
        ...acc,
        [field]: {
          actual,
          target
        }
      };
    }, {});

    const sumOfScholarshipDollars = allTasks.reduce((sum, p) => sum + (p.scholarship_dollars_total || 0), 0);

    return {
        actual: {
            count: actualCount,
            scholarships: actualScholarships,
            compensation: actualCompensation,
            roster_spots: actualRosterSpots,
            scholarship_dollars_total: sumOfScholarshipDollars,
            ...Object.fromEntries(
              Object.entries(additionalValues).map(([key, value]) => [key, (value as {actual: number}).actual])
            ),
        },
        target: {
            scholarships: targetScholarships,
            compensation: targetCompensation,
            roster_spots: targetRosterSpots,
            ...Object.fromEntries(
              Object.entries(additionalValues).map(([key, value]) => [key, (value as {target: number}).target])
            ),
        },
        difference: {
            scholarships: actualScholarships - targetScholarships,
            compensation: actualCompensation - targetCompensation,
            roster_spots: actualRosterSpots - targetRosterSpots,
            ...Object.fromEntries(
              Object.entries(additionalValues).map(([key, value]) => [
                key, 
                (value as {actual: number, target: number}).actual - (value as {actual: number, target: number}).target
              ])
            ),
        },
        totalTeamBudgetedComp: targetCompensation,
    };
};

export const calculateCategorySummary = (
    tasks: Player[],
    budgetData: any[],
    category: string,
    selectedYear: number,
    activeFilters: { [key: string]: string[] },
    positionOrder: string[],
    deadMoneyPlayers: Player[] = []
) => {
    const additionalFields = getAdditionalFields(budgetData);
    const positionCategoryMap = budgetData.reduce((acc, item) => {
      if (item.position) {
        acc[item.position] = item.category;
      }
      return acc;
    }, {} as { [key: string]: string });

    const categoryMap: { [key: string]: string } = {
      ST: 'Special Teams',
      O: 'Offense',
      D: 'Defense'
    };

    const fullCategory = categoryMap[category] || category;

    const categoryPositions = positionOrder.filter(pos => 
      positionCategoryMap[pos] === fullCategory &&
      (!activeFilters.position || activeFilters.position.includes(pos))
    );

    // Filter current tasks
    const currentTasks = tasks.filter(task => 
      task.starting_season <= selectedYear && 
      categoryPositions.includes(task.position || '')
    );

    // Filter dead money for the category
    const filteredDeadMoney = deadMoneyPlayers.filter(player =>
      categoryPositions.includes(player.position || '')
    );

    // Use only currentTasks for player count
    const actualCount = currentTasks.length;
    const actualRosterSpots = currentTasks.length;

    // Combine tasks for scholarship and compensation calculations
    const allTasks = [...currentTasks, ...filteredDeadMoney];
    const actualScholarships = Math.round(sumBy(allTasks, 'scholarship_perc') * 100) /100;
    const actualCompensation = sumBy(allTasks, 'compensation');

    // Get the category budget record for additional fields
    const categoryBudget = budgetData.find(item => 
      item.category === fullCategory && !item.position && !item.slot
    );

    // Filter budget data for positions in this category
    const filteredBudgetData = budgetData.reduce((acc: any[], item) => {
      if (item.category !== fullCategory || !item.position || item.slot !== null) return acc;
      if (activeFilters.position && !activeFilters.position.includes(item.position)) return acc;
      const existingIndex = acc.findIndex(x => x.position === item.position);
      
      if (existingIndex === -1) {
        acc.push(item);
      } else {
        const existing = acc[existingIndex];
        if (item.year <= selectedYear && 
            (existing.year < item.year || existing.year > selectedYear)) {
          acc[existingIndex] = item;
        }
      }
      
      return acc;
    }, []);

    const targetScholarships = sumBy(filteredBudgetData, 'scholarships');
    const targetCompensation = sumBy(filteredBudgetData, 'amount');
    const targetRosterSpots = sumBy(filteredBudgetData, 'roster_spots');

    // Calculate additional fields using allTasks and category budget
    const additionalValues = additionalFields.reduce((acc, field) => {
      const actual = sumBy(allTasks, 'comp_' + field);
      const target = categoryBudget ? categoryBudget[field] || 0 : 0;
      return {
        ...acc,
        [field]: {
          actual,
          target
        }
      };
    }, {});

    const sumOfScholarshipDollars = allTasks.reduce((sum, p) => sum + (p.scholarship_dollars_total || 0), 0);

    return {
        actual: {
            count: actualCount,
            scholarships: actualScholarships,
            compensation: actualCompensation,
            roster_spots: actualRosterSpots,
            scholarship_dollars_total: sumOfScholarshipDollars,
            ...Object.fromEntries(
              Object.entries(additionalValues).map(([key, value]) => [key, (value as {actual: number}).actual])
            ),
        },
        target: {
            scholarships: targetScholarships,
            compensation: targetCompensation,
            roster_spots: targetRosterSpots,
            ...Object.fromEntries(
              Object.entries(additionalValues).map(([key, value]) => [key, (value as {target: number}).target])
            ),
        },
        difference: {
            scholarships: actualScholarships - targetScholarships,
            compensation: actualCompensation - targetCompensation,
            roster_spots: actualRosterSpots - targetRosterSpots,
            ...Object.fromEntries(
              Object.entries(additionalValues).map(([key, value]) => [
                key, 
                (value as {actual: number, target: number}).actual - (value as {actual: number, target: number}).target
              ])
            ),
        },
        totalTeamBudgetedComp: targetCompensation,
    };
};

export const calculatePositionSummary = (
    tasks: Player[], 
    position: string, 
    budgetData: any[], 
    selectedYear: number, 
    totalTeamBudgetedComp: number,
    deadMoneyPlayers: Player[] = [],
    showScholarshipDollars: boolean = false
) => {
    const additionalFields = getAdditionalFields(budgetData);
    // Filter tasks for specific position
    const currentTasks = tasks.filter(task => 
        task.starting_season <= selectedYear && 
        task.position === position
    );

    const deadMoneyForPosition = deadMoneyPlayers.filter(player => 
        player.position === position
    );
  
    // Use only currentTasks for player count
    const actualCount = currentTasks.length;
    const actualRosterSpots = currentTasks.length;

    // Combine tasks for scholarship and compensation calculations
    const allTasks = [...currentTasks, ...deadMoneyForPosition];
    const actualScholarships = Math.round(sumBy(allTasks, 'scholarship_perc') * 100) /100;
    const actualScholarshipDollars = allTasks.reduce((sum, p) => sum + (p.scholarship_dollars_total || 0), 0);
    const actualCompensation = sumBy(allTasks, 'compensation');
  
    const positionBudget = budgetData.find(b => b.position === position && b.slot === null);
    const targetScholarships = positionBudget ? positionBudget.scholarships : 0;
    const targetScholarshipDollars = positionBudget ? positionBudget.scholarships_dollars || 0 : 0;
    const targetCompensation = positionBudget ? positionBudget.amount : 0;
    const targetRosterSpots = positionBudget ? positionBudget.roster_spots : 0;

    // Calculate additional fields using all tasks for compensation
    const additionalValues = additionalFields.reduce((acc, field) => {
      const actual = sumBy(allTasks, 'comp_' + field);
      return {
        ...acc,
        [field]: {
          actual,
          target: positionBudget ? positionBudget[field] || 0 : 0,
        }
      };
    }, {});
  
    return {
      actual: {
        count: actualCount,
        scholarships: actualScholarships,
        compensation: actualCompensation,
        roster_spots: actualRosterSpots,
        scholarship_dollars_total: actualScholarshipDollars,
        ...Object.fromEntries(
          Object.entries(additionalValues).map(([key, value]) => [key, (value as {actual: number}).actual])
        ),
      },
      target: {
        scholarships: targetScholarships,
        compensation: targetCompensation,
        roster_spots: targetRosterSpots,
        ...Object.fromEntries(
          Object.entries(additionalValues).map(([key, value]) => [key, (value as {target: number}).target])
        ),
      },
      difference: {
        scholarships: actualScholarships - targetScholarships,
        compensation: actualCompensation - targetCompensation,
        roster_spots: actualRosterSpots - targetRosterSpots,
        ...Object.fromEntries(
          Object.entries(additionalValues).map(([key, value]) => [
            key, 
            (value as {actual: number, target: number}).actual - (value as {actual: number, target: number}).target
          ])
        ),
      },
      totalTeamBudgetedComp,
      targetScholarshipDollars,
    };
};

export const renderPositionSummary = (
  players: Player[], 
  position: string, 
  budgetData: any[], 
  selectedYear: number, 
  totalTeamCompensation: number, 
  totalBudgetedCompensation: number, 
  deadMoneyPlayers: Player[] = [],
  showSubBudgets: boolean = false,
  toggleSubBudgets?: () => void,
  effectiveCompAccess: boolean = true,
  showScholarshipDollars: boolean = false
) => {
    const summary = calculatePositionSummary(players, position, budgetData, selectedYear, totalTeamCompensation, deadMoneyPlayers, showScholarshipDollars);
    const additionalFields = getAdditionalFields(budgetData);
    const hasAdditionalFields = additionalFields.length > 0;

    // Calculate total compensation including all additional fields
    const actualTotal = hasAdditionalFields 
      ? (summary.actual.compensation + additionalFields.reduce((sum, field) => sum + (summary.actual as any)[field], 0))
      : summary.actual.compensation;
    
    const targetTotal = hasAdditionalFields 
      ? (summary.target.compensation + additionalFields.reduce((sum, field) => sum + (summary.target as any)[field], 0))
      : summary.target.compensation;

    // Custom total row with inline chevron
    const TotalRow = () => {
      const diff = Math.round((actualTotal - targetTotal) * 100) / 100;
      const diffPrefix = diff < 0 ? '-' : '+';
      const absDiff = Math.abs(diff);
      
      const compColor = absDiff < 1000 ? summaryStyles.black : (diff < 0 ? summaryStyles.green : summaryStyles.red);

      return (
        <div className={summaryStyles.summaryRow}>
          <span className={summaryStyles.label}>Total</span>
          <span className={summaryStyles.actual}>
            {formatCompensation(actualTotal)}
            <div className={summaryStyles.percentage}>
              {calculatePercentage(actualTotal, totalTeamCompensation)}%
            </div>
          </span>
          <span className={summaryStyles.target}>
            {formatCompensation(targetTotal)}
            <div className={summaryStyles.percentage}>
              {calculatePercentage(targetTotal, totalBudgetedCompensation)}%
            </div>
          </span>
          <span className={`${summaryStyles.diff}`}>
            <div className={`${summaryStyles.diffContainer}`}>
              <span className={`${compColor}`}>{`${diffPrefix}${formatCompensation(absDiff)}`}</span>
              {hasAdditionalFields && toggleSubBudgets && (
                <button 
                  className={summaryStyles.expandCollapseButtonInline}
                  onClick={toggleSubBudgets}
                  aria-label={showSubBudgets ? "Collapse budget details" : "Expand budget details"}
                >
                  {showSubBudgets ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              )}
            </div>
            <div className={`${summaryStyles.percentage} ${compColor}`}>
              {calculatePercentage(absDiff, targetTotal)}%
            </div>
          </span>
        </div>
      );
    };

    return (
      <div className={summaryStyles.positionSummary}>
        <div className={summaryStyles.summaryContent}>
          <div className={summaryStyles.summaryHeader} style={{ padding: '2px 0' }}>
            <span className={summaryStyles.position} style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{position}</span>
            <span className={summaryStyles.actual}>Actual</span>
            <span className={summaryStyles.target}>Budget</span>
            <span className={summaryStyles.diff}>Diff</span>
          </div>
          <SummaryRow 
            label="Players" 
            actual={summary.actual.roster_spots} 
            target={summary.target.roster_spots} 
            isCompensation={false}
            showPercentages={false}
            totalActualCompensation={totalTeamCompensation}
          />
          <SummaryRow 
            label={showScholarshipDollars ? "Schol. $" : "Schol."}
            actual={showScholarshipDollars ? summary.actual.scholarship_dollars_total : summary.actual.scholarships}
            target={showScholarshipDollars ? summary.targetScholarshipDollars : summary.target.scholarships}
            isCompensation={false}
            scholAsDollar={showScholarshipDollars}
            showPercentages={true}
            totalActualCompensation={totalTeamCompensation}
          />
          
          {/* Only show compensation data if effectiveCompAccess is true */}
          {effectiveCompAccess && (
            <>
              {/* Show the total row with the expand/collapse button */}
              {hasAdditionalFields ? (
                <TotalRow />
              ) : (
                <SummaryRow 
                  label="Comp"
                  actual={summary.actual.compensation}
                  target={summary.target.compensation}
                  isCompensation={true}
                  showPercentages={true}
                  totalActualCompensation={totalTeamCompensation}
                  totalTeamBudgetedComp={summary.totalTeamBudgetedComp}
                />
              )}
              
              {/* Show detailed budget items only when expanded */}
              {showSubBudgets && hasAdditionalFields && (
                <div className={summaryStyles.detailedBudget}>
                  <SummaryRow 
                    label="Main"
                    actual={summary.actual.compensation} 
                    target={summary.target.compensation} 
                    isCompensation={true}
                    showPercentages={false}
                    totalActualCompensation={totalTeamCompensation} 
                    totalTeamBudgetedComp={summary.totalTeamBudgetedComp}
                  />
                  {additionalFields.map(field => (
                    <SummaryRow 
                      key={field}
                      label={field.charAt(0).toUpperCase() + field.slice(1)} 
                      actual={(summary.actual as { [key: string]: number })[field]} 
                      target={(summary.target as { [key: string]: number })[field]} 
                      isCompensation={true}
                      showPercentages={false}
                      totalActualCompensation={totalTeamCompensation}
                      totalTeamBudgetedComp={summary.totalTeamBudgetedComp}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };