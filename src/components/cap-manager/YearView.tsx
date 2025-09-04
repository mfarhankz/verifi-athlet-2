import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import styles from './YearView.module.css';
import Details from './Details';
import { Player } from '../../types/Player';
import { 
  fetchPositionOrder, 
  fetchUserDetails as fetchUserDetailsUtil, 
  fetchAdjustedPlayers, 
  formatCompensation, 
  fetchBudgetData, 
  calculateBudgetDifference, 
  calculateCompPercentage, 
  formatValue,
  calculateStartYearCompensation,
  calculateStartYearPositionCompensation,
  calculateTotalPlayerCompensation,
  useShowScholarshipDollars
} from "../../utils/utils";
import { sumBy, calculateTeamSummary, renderPositionSummary } from "../../utils/summaryBoxUtils";
import { useEffectiveCompAccess } from '../../utils/compAccessUtils';
import PlayerCard from "./PlayerCard";
import BoardSummaries from './BoardSummaries';
import DeadMoneySummary from './DeadMoneySummary';

interface YearViewProps {
  selectedYear: number;
  selectedMonth: string;
  selectedScenario: string;
  activeFilters: { [key: string]: string[] };
  targetScenario?: string;
}

const YearView: React.FC<YearViewProps> = ({ selectedYear, selectedMonth, selectedScenario, activeFilters, targetScenario }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [deadMoney, setDeadMoney] = useState<Player[]>([]);
  const [sortedPositions, setSortedPositions] = useState<Array<{position: string, category: string}>>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<Player | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [team, setTeam] = useState<string | null>(null);
  const { effectiveCompAccess } = useEffectiveCompAccess();
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [totalTeamCompensation, setTotalTeamCompensation] = useState<number>(0);
  const [positionCompensation, setPositionCompensation] = useState<{ [key: string]: number }>({});
  const [showSummaries, setShowSummaries] = useState(true);
  const [totalBudgetedCompensation, setTotalBudgetedCompensation] = useState(0);
  const [columns, setColumns] = useState<{ [key: string]: Player[] }>({});
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showSubBudgets, setShowSubBudgets] = useState(false);
  const showScholarshipDollars = useShowScholarshipDollars();

  useEffect(() => {
    const fetchTeam = async () => {
      const userDetails = await fetchUserDetailsUtil();
      if (userDetails) {
        setTeam(userDetails.customer_id);
      }
    };
    fetchTeam();
  }, []);


  const refreshData = useCallback(async () => {
    if (!team) return;

    setLoading(true);
    
    const { 
      players: scenarioPlayers, 
      deadMoney: scenarioDeadMoney,
      totalTeamCompensation: scenarioTeamComp, 
      positionCompensation: scenarioPositionComp 
    } = await fetchAdjustedPlayers(team, selectedYear, selectedScenario, activeFilters, selectedMonth);
    const budgetData = await fetchBudgetData(team, selectedYear, selectedScenario);
    setBudgetData(budgetData || []);
    setTotalTeamCompensation(scenarioTeamComp);
    setPositionCompensation(scenarioPositionComp);

    setPlayers(scenarioPlayers);
    setDeadMoney(scenarioDeadMoney);
    const positionOrderData = await fetchPositionOrder(team, selectedYear);
    setSortedPositions(positionOrderData.map(item => ({ position: item.position, category: item.category })));
    setCategories(Array.from(new Set(positionOrderData.map(item => item.category))));

    setLoading(false);
  }, [team, selectedYear, selectedScenario, activeFilters, selectedMonth]);

  useEffect(() => {
    if (team) {
      refreshData();
    }
  }, [refreshData, team, selectedScenario]);

  const groupedPlayers = players.reduce((acc, player) => {
    const key = player.elig_remaining > 5 ? player.starting_season : player.elig_remaining;
    if (!acc[key]) {
      acc[key] = {};
    }
    if (!acc[key][player.position]) {
      acc[key][player.position] = [];
    }
    acc[key][player.position].push(player);
    return acc;
  }, {} as Record<number | string, Record<string, Player[]>>);

  const eligibilityYears = [1, 2, 3, 4, 5];
  const futureSeasonsWithPlayers = Object.keys(groupedPlayers)
    .filter(key => !eligibilityYears.includes(Number(key)) && Number(key) > selectedYear)
    .sort((a, b) => Number(a) - Number(b));

  const allRows = [...eligibilityYears, ...futureSeasonsWithPlayers];

  const handlePlayerClick = (playerId: string) => {
    const player = players.find(player => player.id === playerId);
  
    if (player) {
      setSelectedAthlete(player);
      setShowDetails(true);
    } else {
      console.error("Player not found in players");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        setShowDetails(false);
      }
    };

    if (showDetails) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDetails]);

  const filteredPositions = useMemo(() => {
    return sortedPositions.filter(({ position }) => 
      !activeFilters.position || activeFilters.position.includes(position)
    );
  }, [sortedPositions, activeFilters.position]);

  const teamSummary = useMemo(() => {
    // Convert players to tasks
    const tasks = players.map(player => ({
      ...player,  
      title: player.name__first + ' ' + player.name__last,
      eligRemaining: player.elig_remaining,
      year: player.starting_season.toString(),
      image_url: player.image_url,
      compensationDisplay: player.compensation ? formatCompensation(player.compensation) : 'N/A',
      ...Object.entries(player)
      .filter(([key]) => key.startsWith('comp_'))
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      slot: player.pos_rank,
      is_committed: player.commit,
      is_injured: player.injury,
      athlete_id: player.athlete_id,
      scholarship_perc: player.scholarship_perc,
      compensation: player.compensation,
      pos_rank: player.pos_rank,
      position: `${player.position}${player.pos_rank}`,
      name: player.name__first + ' ' + player.name__last,
      id: player.id,
      isRecruit: player.starting_season > selectedYear,
      budgetDifference: 0,
      teamPercentage: 0,
      positionPercentage: 0,
      scholarship_dollars_total: player.scholarship_dollars_total,
    }));

    return calculateTeamSummary(tasks, budgetData, selectedYear, activeFilters);
  }, [players, budgetData, selectedYear, activeFilters]);

  useEffect(() => {
    // Filter budget data for the current year and overall category
    let currentYearOverallBudget = budgetData.filter(item => 
      item.year === selectedYear && item.category === 'overall'
    );
    if (currentYearOverallBudget.length === 0) {
      const mostRecentYear = Math.max(...budgetData.map(item => item.year));
      currentYearOverallBudget = budgetData.filter(item => 
        item.year === mostRecentYear && item.category === 'overall'
      );
    }

    // Calculate total budgeted amount for the current year
    const totalBudgeted = currentYearOverallBudget.reduce((sum, item) => sum + item.amount, 0);
    setTotalBudgetedCompensation(totalBudgeted);
  }, [budgetData, columns, selectedYear]);

  const calculateRowSummary = useCallback((eligYear: number | string) => {
    const isRecruit = typeof eligYear === 'string' && Number(eligYear) > selectedYear;
    const rowPlayers = players.filter(player => {
      if (typeof eligYear === 'number') {
        return player.elig_remaining === eligYear && player.starting_season <= selectedYear;
      } else {
        return player.starting_season === Number(eligYear);
      }
    });
  
    const actualCount = rowPlayers.length;
    const actualScholarships = sumBy(rowPlayers, 'scholarship_perc');
    const actualCompensation = sumBy(rowPlayers, 'compensation');
    const compensationPercentage = isRecruit ? null : (totalTeamCompensation > 0 
      ? (actualCompensation / totalTeamCompensation) * 100 
      : 0);
  
    return {
      players: actualCount,
      scholarships: actualScholarships,
      compensation: actualCompensation,
      compensationPercentage,
      isRecruit
    };
  }, [players, selectedYear, totalTeamCompensation]);

  const renderCombinedSummary = (eligYear: number | string) => {
    const summary = calculateRowSummary(eligYear);
    return (
      <td>
        <div className={styles.rowSummary}>
          <div className={styles.summaryRow}>
            <span className={styles.yearLabel}>{eligYear}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Players</span>
            <span className={styles.actual}>{summary.players}</span>
          </div>
          <div className={styles.summaryRow}>
            <span className={styles.label}>Schol.</span>
            <span className={styles.actual}>{summary.scholarships}</span>
          </div>
          {effectiveCompAccess && (
            <div className={styles.summaryRow}>
              <span className={styles.label}>Comp</span>
              <div>
                <span className={styles.actual}>{formatValue(summary.compensation, true)}</span>
                {!summary.isRecruit && (
                  <div className={styles.percentage}>
                    {summary.compensationPercentage?.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </td>
    );
  };

  const toggleSummaries = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSummaries(prev => !prev);
  };

  // Calculate total compensation for each starting year
  const startYearCompensation = useMemo(() => {
    return calculateStartYearCompensation(players);
  }, [players]);

  // Calculate total compensation for each starting year and position
  const startYearPositionCompensation = useMemo(() => {
    return calculateStartYearPositionCompensation(players);
  }, [players]);

  return (
    <div className={styles.yearViewContainer}>
      <BoardSummaries 
        showSummaries={showSummaries}
        setShowSummaries={setShowSummaries}
        tasks={players}
        deadMoney={deadMoney}
        budgetData={budgetData}
        selectedYear={selectedYear}
        activeFilters={activeFilters}
        categories={categories}
        columns={columns}
        positionOrder={sortedPositions.map(p => p.position)}
        totalActualCompensation={totalTeamCompensation}
        totalBudgetedCompensation={totalBudgetedCompensation}
      />

      <div className={`${styles.yearView} ${showSummaries ? '' : styles.expanded}`}>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.yearTable}>
              <thead>
                <tr>
                  <td>
                    <div className={styles.stickyHeaderContainer}>
                      <h3 className={styles.stickyHeader}>YRS</h3>
                    </div>
                  </td>
                  {filteredPositions.map(({position}) => (
                    <td key={position} className={styles.positionColumn}>
                      <div className={styles.stickyHeaderContainer} style={{ height: '0' }}>
                        <h3 className={styles.stickyHeader}></h3>
                      </div>
                      {renderPositionSummary(
                        players.filter(p => p.position === position), 
                        position, 
                        budgetData, 
                        selectedYear, 
                        totalTeamCompensation, 
                        totalBudgetedCompensation,
                        deadMoney?.filter(player => player.position === position) || [],
                        showSubBudgets,
                        () => setShowSubBudgets(!showSubBudgets),
                        effectiveCompAccess,
                        showScholarshipDollars
                      )}
                    </td>
                  ))}
                  <td>
                    <div className={styles.stickyHeaderContainer}>
                      <h3 className={styles.stickyHeader}>YRS</h3>
                    </div>
                  </td>
                </tr>
              </thead>
              <tbody>
                {/* Only render dead money row if there are dead money players */}
                {deadMoney && deadMoney.length > 0 && (
                  <tr>
                    <td></td>
                    {filteredPositions.map(({position}) => (
                      <td key={`dead-${position}`}>
                        <DeadMoneySummary 
                          deadMoneyPlayers={deadMoney?.filter(player => player.position === position)}
                          onPlayerClick={setSelectedPlayer}
                        />
                      </td>
                    ))}
                    <td></td>
                  </tr>
                )}

                {allRows.map(row => (
                  <tr key={row} data-elig={row}>
                    {renderCombinedSummary(row)}
                    {filteredPositions.map(({position}) => (
                      <td key={`${row}-${position}`}>
                        {groupedPlayers[row]?.[position]?.sort((a, b) => {
                          // First, sort by redshirt status
                          if (a.redshirt_status === 'has' && b.redshirt_status !== 'has') return 1;
                          if (b.redshirt_status === 'has' && a.redshirt_status !== 'has') return -1;

                          // Then sort by year suffix (GR, SR, JR, SO, FR)
                          const yearOrder = { 'GR': 0, 'SR': 1, 'JR': 2, 'SO': 3, 'FR': 4 };
                          const aYearSuffix = a.year?.slice(-2) || '';
                          const bYearSuffix = b.year?.slice(-2) || '';
                          if (yearOrder[aYearSuffix as keyof typeof yearOrder] !== yearOrder[bYearSuffix as keyof typeof yearOrder]) {
                            return yearOrder[aYearSuffix as keyof typeof yearOrder] - yearOrder[bYearSuffix as keyof typeof yearOrder];
                          }

                          // Finally sort by tier (0 last)
                          if ((a.tier ?? 0) === 0) return 1;
                          if ((b.tier ?? 0) === 0) return -1;
                          return (a.tier ?? 0) - (b.tier ?? 0);
                        }).map(player => {
                          const isRecruit = player.starting_season > selectedYear;
                          let adjustedPosRank = player.pos_rank;
                          if (isRecruit) {
                            const playersAhead = players.filter(p => 
                              p.position === player.position && 
                              p.pos_rank < player.pos_rank &&
                              p.starting_season <= selectedYear
                            );
                            adjustedPosRank = playersAhead.length;
                          }

                          const slotNumber = adjustedPosRank + 1;
                          const baseBudgetForSlot = budgetData?.find(
                            (item: { position: string; slot: number; }) => item.position === player.position && item.slot === slotNumber
                          );
                          const standardFields = [
                            'id', 'team', 'category', 'position', 'slot', 'amount',
                            'scholarships', 'order', 'year', 'scenario', 'roster_spots', 'scholarships_dollars'
                          ];
                          const totalBudgetForSlot = (baseBudgetForSlot?.amount || 0) + 
                          Object.entries(baseBudgetForSlot || {})
                            .filter(([key]) => !standardFields.includes(key))
                            .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
                          
                          const totalPlayerCompensation = calculateTotalPlayerCompensation(player);

                          const budgetDifference = isRecruit ? 0 : calculateBudgetDifference(totalPlayerCompensation, totalBudgetForSlot);
                          
                          // Calculate percentage based on current team for non-recruits
                          // For recruits, calculate based on start year totals
                          let teamPercentage, positionPercentage;
                          
                          if (isRecruit) {
                            // For recruits, use starting year totals
                            teamPercentage = calculateCompPercentage(totalPlayerCompensation, startYearCompensation[player.starting_season] || 0);
                            positionPercentage = calculateCompPercentage(totalPlayerCompensation, 
                              startYearPositionCompensation[player.starting_season]?.[player.position] || 0);
                          } else {
                            // For current players, use current team/position totals
                            teamPercentage = calculateCompPercentage(totalPlayerCompensation, totalTeamCompensation);
                            positionPercentage = calculateCompPercentage(totalPlayerCompensation, positionCompensation[player.position]);
                          }

                          return (
                            <PlayerCard
                              key={player.id}
                              player={{
                                ...player,
                                scholarship_perc: player.scholarship_perc,
                                compensation: player.compensation,
                                compensationDisplay: formatCompensation(totalPlayerCompensation),
                                eligRemaining: player.elig_remaining,
                                is_committed: player.commit,
                                is_injured: player.injury,
                                image_url: player.image_url,
                                budgetDifference,
                                teamPercentage,
                                positionPercentage,
                                slot: player.pos_rank,
                                isRecruit: player.starting_season > selectedYear,
                                description: `${player.position}${slotNumber}`,
                                scholarship_dollars_total: player.scholarship_dollars_total,
                                ...Object.entries(player)
                                .filter(([key]) => key.startsWith('comp_'))
                                .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
                              }}
                              selectedYear={selectedYear}
                              onClick={() => handlePlayerClick(player.id)}
                              context="yearView"
                              showScholarshipDollars={showScholarshipDollars}
                            />
                          );
                        })}
                      </td>
                    ))}
                    {renderCombinedSummary(row)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDetails && selectedAthlete && (
        <Details 
          athlete={selectedAthlete}
          onClose={() => setShowDetails(false)}
          fetchTasks={refreshData}
          team={team || ''}
          selectedYear={selectedYear}
          effectiveYear={Math.max(selectedYear, selectedAthlete.starting_season)}
          selectedScenario={selectedScenario}
          targetScenario={targetScenario || ''}
        />
      )}

      {selectedPlayer && (
        <Details
          athlete={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          fetchTasks={refreshData}
          team={team || ''}
          selectedYear={selectedYear}
          effectiveYear={selectedYear}
          selectedScenario={selectedScenario}
          targetScenario={targetScenario || ''}
        />
      )}
    </div>
  );
};

export default YearView;
