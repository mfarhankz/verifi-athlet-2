"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "../../lib/supabaseClient";
import Modal from "./AddPlayer";
import Details from "./Details";
import PlayerCard from "./PlayerCard";
import { formatCompensation } from "../../utils/utils";
import styles from "./KanbanBoard.module.css";
import { Player } from "../../types/Player";
import { 
  fetchAdjustedPlayers, 
  fetchUserDetails, 
  fetchPositionOrder, 
  fetchBudgetData, 
  calculateBudgetDifference, 
  calculateCompPercentage, 
  calculateStartYearCompensation,
  calculateStartYearPositionCompensation,
  calculateTotalPlayerCompensation
} from "../../utils/utils";
import { renderPositionSummary } from "../../utils/summaryBoxUtils";
import BoardSummaries from './BoardSummaries';
import DeadMoneySummary from './DeadMoneySummary';
import { useEffectiveCompAccess } from '../../utils/compAccessUtils';
import { useShowScholarshipDollars } from "../../utils/utils";

export interface KanbanBoardProps {
  selectedYear: number;
  selectedMonth: string;
  selectedScenario: string;
  zoom: number;
  activeFilters: { [key: string]: string[] };
  selectOption: (option: 'Positional Ranking' | 'By Year' | 'List' | 'Budget') => void;
  targetScenario: string;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ selectedYear, selectedMonth, selectedScenario, zoom, activeFilters, selectOption, targetScenario }) => {
  const [tasks, setTasks] = useState<Player[]>([]);
  const [deadMoney, setDeadMoney] = useState<Player[]>([]);
  const [columns, setColumns] = useState<{ [key: string]: Player[] }>({});
  const [showModal, setShowModal] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Player | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [positionOrder, setPositionOrder] = useState<string[]>([]);
  const [team, setTeam] = useState<string>("");
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [totalBudgetedCompensation, setTotalBudgetedCompensation] = useState(0);
  const [totalActualCompensation, setTotalActualCompensation] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [showSummaries, setShowSummaries] = useState(true);
  const [proceedWithoutPositions, setProceedWithoutPositions] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [totalTeamCompensation, setTotalTeamCompensation] = useState<number>(0);
  const [positionCompensation, setPositionCompensation] = useState<{ [key: string]: number }>({});
  const [showSubBudgets, setShowSubBudgets] = useState(false);
  const { effectiveCompAccess } = useEffectiveCompAccess();
  const showScholarshipDollars = useShowScholarshipDollars();

  const groupTasksByPosition = useCallback((tasks: Player[]) => {
    return tasks.reduce((acc, task) => {
      const position = task.position || '';
      if (!acc[position]) {
        acc[position] = [];
      }
      acc[position].push(task);
      return acc;
    }, {} as { [key: string]: Player[] });
  }, []);

  const fetchTasks = useCallback(async (teamId: string) => {
    if (!teamId) return;
    
    // Pass all scenarios at once instead of looping through them
    const { 
      players: scenarioPlayers, 
      deadMoney: scenarioDeadMoney,
      totalTeamCompensation: scenarioTeamComp, 
      positionCompensation: scenarioPositionComp 
    } = await fetchAdjustedPlayers(teamId, selectedYear, selectedScenario, activeFilters, selectedMonth);
    
    setDeadMoney(scenarioDeadMoney);
    setTotalTeamCompensation(scenarioTeamComp);
    setPositionCompensation(scenarioPositionComp);
    setTasks(scenarioPlayers);
    
    // Fetch budget data for all scenarios at once
    const budgetData = await fetchBudgetData(teamId, selectedYear, selectedScenario);
    setBudgetData(budgetData || []);
    const positionOrderData = await fetchPositionOrder(teamId, selectedYear);
    const positionOrder = positionOrderData.map(item => item.position);
    setPositionOrder(positionOrder);
    setCategories(Array.from(new Set(positionOrderData.map(item => item.category))));
    
    // Calculate total compensation for each starting year and position
    const startYearCompensation = calculateStartYearCompensation(scenarioPlayers);
    const startYearPositionCompensation = calculateStartYearPositionCompensation(scenarioPlayers);
    
    // Format tasks with budget data
    const formattedTasks = scenarioPlayers.map((player) => {
      const totalPlayerCompensation = calculateTotalPlayerCompensation(player);

      const isRecruit = player.starting_season > selectedYear;
      let adjustedPosRank = player.pos_rank;
      
      const playersAhead = scenarioPlayers.filter(p => 
        p.position === player.position && 
        p.pos_rank < player.pos_rank &&
        p.starting_season <= selectedYear
      );
      adjustedPosRank = playersAhead.length;
      
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
        teamPercentage = calculateCompPercentage(totalPlayerCompensation, scenarioTeamComp);
        positionPercentage = calculateCompPercentage(totalPlayerCompensation, scenarioPositionComp[player.position] || 0);
      }

      return {
        id: player.id,
        title: `${player.name__first} ${player.name__last}`,
        image_url: player.image_url,
        eligRemaining: player.elig_remaining,
        year: player.year,
        scholarship_perc: player.scholarship_perc,
        redshirt_status: player.redshirt_status,
        compensation: player.compensation,
        compensationDisplay: formatCompensation(totalPlayerCompensation),
        ...Object.entries(player)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
        slot: player.pos_rank,
        budgetDifference,
        teamPercentage,
        positionPercentage,
        starting_season: Number(player.starting_season),
        is_committed: player.commit,
        is_injured: player.injury,
        pos_rank: adjustedPosRank,
        isRecruit,
        monthlyCompensation: player.monthlyCompensation,
        name__first: player.name__first,
        name__last: player.name__last,
        position: player.position,
        positionCategory: player.positionCategory,
        hide: player.hide,
        elig_remaining: player.elig_remaining,
        month: player.month,
        commit: player.commit,
        injury: player.injury,
        athlete_id: player.athlete_id || player.id,
        ending_season: player.ending_season,
        tier: player.tier,
        pff_link: player.pff_link,
        player_tag: player.player_tag,
        scholarship_dollars_total: player.scholarship_dollars_total,
        ...Object.entries(player)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };
    });
    
    setTasks(formattedTasks);
    setColumns(groupTasksByPosition(formattedTasks));
  }, [selectedYear, selectedScenario, groupTasksByPosition, activeFilters, selectedMonth]);

  useEffect(() => {
    const initializeBoard = async () => {
      const userDetails = await fetchUserDetails();
      if (userDetails) {
        setTeam(userDetails.customer_id);
        await fetchTasks(userDetails.customer_id);
      }
      setTimeout(() => {
        setIsLoading(false);
      }, 3000);
    };

    initializeBoard();
  }, [fetchTasks]);

  useEffect(() => {
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
  }, []);

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

    const standardFields = [
      'id', 'team', 'category', 'position', 'slot', 'amount',
      'scholarships', 'order', 'year', 'scenario', 'roster_spots'
    ];
    // Calculate total budgeted amount including additional budgets
    const totalBudgeted = currentYearOverallBudget.reduce((sum, item) => {
      const baseAmount = item.amount || 0;
      const additionalBudgets = Object.entries(item)
        .filter(([key]) => !standardFields.includes(key))
        .reduce((budgetSum, [_, value]) => budgetSum + (value as number || 0), 0);
      return sum + baseAmount + additionalBudgets;
    }, 0);
    setTotalBudgetedCompensation(totalBudgeted);

    // Calculate total actual including additional compensation
    const totalActual = Object.values(columns).reduce((sum, col) => {
      return sum + col
        .filter(task => task.starting_season <= selectedYear)
        .reduce((playerSum, task) => {
          const baseComp = task.compensation || 0;
          const additionalComp = Object.entries(task)
            .filter(([key]) => key.startsWith('comp_'))
            .reduce((compSum, [_, value]) => compSum + (value as number || 0), 0);
          return playerSum + baseComp + additionalComp;
        }, 0);
    }, 0);
    setTotalActualCompensation(totalActual);
  }, [budgetData, columns, selectedYear]);

  const addPlayer = async (player: { name__first: string, name__last: string, position: string, image_url: string, elig_remaining: number, year: string, scholarship_perc: number, compensation?: number, redshirt_status: string, starting_season: number, is_committed: boolean, is_injured: boolean, scenario: string }) => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(`Session error: ${sessionError.message}`);

      const userId = sessionData.session?.user?.id;
      if (!userId) throw new Error('No user ID found in session');

      const userDetails = await fetchUserDetails();
      if (!userDetails) throw new Error('No user details found');

      const customer_id = userDetails.customer_id;
      const pos_rank = tasks.filter(task => task.position === player.position).length;

      const athleteData = {
        name__first: player.name__first,
        name__last: player.name__last,
        position: player.position,
        image_url: player.image_url,
        elig_remaining: player.elig_remaining,
        year: player.year,
        redshirt_status: player.redshirt_status,
        customer_id,
        pos_rank,
        scholarship_perc: player.scholarship_perc,
        starting_season: player.starting_season,
        commit: player.is_committed ? 1 : 0,
        injury: player.is_injured ? 1 : 0,
        scenario: player.scenario,
      };
      const { data, error } = await supabase
        .from('athletes')
        .insert([athleteData])
        .select();

      if (error) throw new Error(`Insert error: ${error.message}`);

      // After successful insert, refresh the board to show the new player
      await fetchTasks(customer_id);
    } catch (error) {
      console.error('Error adding player:', error);
    }
  };

  const handleLinkClick = (playerId: string) => {
    const player = tasks.find(task => task.id === playerId);
    if (player) {
      setSelectedAthlete(player);
      setShowDetails(true);
    } else {
      console.error("Player not found in tasks");
    }
  };

  const handleMoveUp = async (position: string, currentIndex: number) => {
    if (currentIndex <= 0) return;
    
    const column = columns[position];
    const currentPlayer = column[currentIndex];
    const playerAbove = column[currentIndex - 1];
    
    // Check if current player is a recruit and player above is not
    const currentIsRecruit = currentPlayer.starting_season > selectedYear;
    const aboveIsRecruit = playerAbove.starting_season > selectedYear;
    
    // Prevent recruit from moving above non-recruit
    if (currentIsRecruit && !aboveIsRecruit) {
      console.log("Cannot move recruit above non-recruit");
      return;
    }
    
    // Update positions
    const newColumns = {
      ...columns,
      [position]: [...column]
    };
    
    // Swap the players in the column
    newColumns[position][currentIndex] = playerAbove;
    newColumns[position][currentIndex - 1] = currentPlayer;
    
    setColumns(newColumns);
    
    // Here you would typically call an API to update the positions in the database
    // For now, we'll just reorder locally
  };

  const handleMoveDown = async (position: string, currentIndex: number) => {
    const column = columns[position];
    if (currentIndex >= column.length - 1) return;
    
    const currentPlayer = column[currentIndex];
    const playerBelow = column[currentIndex + 1];
    
    // Check if current player is not a recruit and player below is a recruit
    const currentIsRecruit = currentPlayer.starting_season > selectedYear;
    const belowIsRecruit = playerBelow.starting_season > selectedYear;
    
    // Prevent non-recruit from moving below recruit
    if (!currentIsRecruit && belowIsRecruit) {
      console.log("Cannot move non-recruit below recruit");
      return;
    }
    
    // Update positions
    const newColumns = {
      ...columns,
      [position]: [...column]
    };
    
    // Swap the players in the column
    newColumns[position][currentIndex] = playerBelow;
    newColumns[position][currentIndex + 1] = currentPlayer;
    
    setColumns(newColumns);
    
    // Here you would typically call an API to update the positions in the database
    // For now, we'll just reorder locally
  };

  // Check if there's any dead money across all positions
  const hasAnyDeadMoney = deadMoney && deadMoney.length > 0;
  if (!isLoading && positionOrder.length === 0 && !proceedWithoutPositions) {
    return (
      <div className={styles.noPositionsWarning}>
        <h2>No Positions Configured</h2>
        <p>You haven&apos;t set up any positions for your team yet. Please visit the Budget screen to configure your positions.</p>
        <div className={styles.warningButtons}>
          <button 
            onClick={() => selectOption('Budget')}
            className={styles.setupButton}
          >
            Set Up Positions
          </button>
          <button 
            onClick={() => setProceedWithoutPositions(true)}
            className={styles.proceedButton}
          >
            Proceed Anyway
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.kanbanBoardContainer}>
      <BoardSummaries 
        showSummaries={showSummaries}
        setShowSummaries={setShowSummaries}
        tasks={tasks}
        budgetData={budgetData}
        selectedYear={selectedYear}
        activeFilters={activeFilters}
        categories={categories}
        columns={columns}
        positionOrder={positionOrder}
        totalActualCompensation={totalActualCompensation}
        totalBudgetedCompensation={totalBudgetedCompensation}
        deadMoney={deadMoney || []}
      >
        <button className={styles.addPlayerButton} onClick={() => setShowModal(true)}>Add Player</button>
      </BoardSummaries>
      <div className={`${styles.kanbanBoard} ${showSummaries ? '' : styles.expanded}`}>
        <div className={styles.columnsContainer}>
          <div className={styles.columns}>
            {positionOrder?.map((position) => (
              position && columns[position] ? (
                <div key={position} className={styles.column}>
                  <div className={styles.stickyHeaderContainer} style={{ height: '0' }}>
                    <h3 className={styles.stickyHeader}></h3>
                  </div>
                  {renderPositionSummary(
                    columns[position], 
                    position, 
                    budgetData, 
                    selectedYear, 
                    totalActualCompensation, 
                    totalBudgetedCompensation,
                    deadMoney?.filter((player: { position: string; }) => player.position === position) || [],
                    showSubBudgets,
                    () => setShowSubBudgets(!showSubBudgets),
                    effectiveCompAccess,
                    showScholarshipDollars
                  )}
                  {hasAnyDeadMoney && (
                    <DeadMoneySummary 
                      deadMoneyPlayers={deadMoney?.filter((player: { position: string; }) => player.position === position)}
                      onPlayerClick={setSelectedPlayer}
                    />
                  )}
                  <div className={styles.playerCards}>
                    {columns[position].map((task, index) => (
                      <div key={task.id} className={styles.draggableItem}>
                        <PlayerCard
                          player={{
                            ...task,
                            id: task.id,
                            name__first: task.title?.split(' ')[0] || '',
                            name__last: task.title?.split(' ').slice(1).join(' ') || '',
                            description: `${task.position}${task.pos_rank + 1}`,
                            image_url: task.image_url || '',
                            eligRemaining: task.eligRemaining || 0,
                            year: task.year || '',
                            scholarship_perc: task.scholarship_perc || 0,
                            compensation: task.compensation || 0,
                            compensationDisplay: task.compensationDisplay || '',
                            starting_season: task.starting_season || 0,
                            is_committed: task.is_committed || 0,
                            is_injured: task.injury || 0,
                            tier: task.tier || 0,
                            budgetDifference: task.budgetDifference || 0,
                            pff_link: task.pff_link || '',
                            scholarship_dollars_total: task.scholarship_dollars_total,
                          }}
                          selectedYear={selectedYear}
                          showScholarshipDollars={showScholarshipDollars}
                          onClick={() => handleLinkClick(task.id)}
                          onMoveUp={() => handleMoveUp(position, index)}
                          onMoveDown={() => handleMoveDown(position, index)}
                          context={"kanban"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      </div>
      <Modal show={showModal} onClose={() => setShowModal(false)} onSubmit={addPlayer} teamId={team} selectedYear={selectedYear} selectedScenario={selectedScenario} />
      {showDetails && selectedAthlete && (
        <Details 
          athlete={selectedAthlete}
          onClose={() => setShowDetails(false)}
          fetchTasks={() => fetchTasks(team)}
          team={team}
          selectedYear={selectedYear}
          effectiveYear={Math.max(selectedYear, selectedAthlete.starting_season)}
          selectedScenario={selectedScenario}
          targetScenario={targetScenario}
        />
      )}
      {selectedPlayer && (
        <Details
          athlete={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          fetchTasks={() => fetchTasks(team)}
          team={team}
          selectedYear={selectedYear}
          effectiveYear={selectedYear}
          selectedScenario={selectedScenario}
          targetScenario={targetScenario}
        />
      )}
    </div>
  );
};

export default KanbanBoard;