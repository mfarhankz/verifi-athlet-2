import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './ListView.module.css';
import { Player } from '../../types/Player';
import { FaFilter, FaPlus, FaMinus, FaLayerGroup, FaCalendarAlt } from 'react-icons/fa';
import Details from './Details';
import { 
  fetchAdjustedPlayers, 
  fetchBudgetData, 
  fetchUserDetails, 
  calculateBudgetDifference, 
  calculateCompPercentage, 
  fetchPositionOrder,
  TEST_ATHLETE_ID,
  useShowScholarshipDollars,
} from "../../utils/utils";
import { useEffectiveCompAccess } from '../../utils/compAccessUtils';
import { useCustomer } from "@/contexts/CustomerContext";
import { CommentService } from '../../lib/commentService';
import { Comment } from '@/types/database';
import CommentsModal from './CommentsModal';

export interface ListViewProps {
    selectedYear: number;
    selectedMonth: string;
    selectedScenario: string;
    activeFilters: { [key: string]: string[] };
    targetScenario?: string;
    numberOfMonths?: number;
}

const formatPayment = (amount: number): string => {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(1)}%`;
};

const formatBudgetDifference = (amount: number): string => {
  if (Math.abs(amount) < 500) {
    return '$0';
  }
  const absAmount = Math.abs(amount);
  const roundedAmount = Math.round(absAmount / 1000);
  return amount < 0 ? `-$${roundedAmount}k` : `$${roundedAmount}k`;
};

// Helper function to safely get monthly compensation value
const getMonthlyValue = (player: Player, month: string): number => {
  if (!player || !player.monthlyCompensation) {
    return (player?.compensation || 0) / 12;
  }
  
  if (typeof player.monthlyCompensation === 'object') {
    // If it's an object with month keys like {Jan: 1000, Feb: 2000}
    // Safe cast to unknown first to satisfy the linter
    const monthlyComp = player.monthlyCompensation as unknown as Record<string, number>;
    return monthlyComp[month] || 0;
  }
  
  // Fallback to dividing total compensation by 12
  return (player.compensation || 0) / 12;
};

const ListView: React.FC<ListViewProps> = ({ selectedYear, selectedMonth, selectedScenario, activeFilters, targetScenario, numberOfMonths = 12 }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filters, setFilters] = useState<{ [key: string]: Set<string> }>({});
  const [sortColumn, setSortColumn] = useState<string>('name__last');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<Player | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [totalTeamCompensation, setTotalTeamCompensation] = useState(0);
  const [team, setTeam] = useState<string>("");
  const { effectiveCompAccess } = useEffectiveCompAccess();
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>({});
  const [positionOrder, setPositionOrder] = useState<Array<{position: string, category: string}>>([]);
  const [showMonthlyBreakdown, setShowMonthlyBreakdown] = useState(false);
  const [showBucketBreakdown, setShowBucketBreakdown] = useState(false);
  const [showBuckets, setShowBuckets] = useState(false);
  const [showPayMainMonthly, setShowPayMainMonthly] = useState(false);
  const [expandedBucketMonths, setExpandedBucketMonths] = useState<Set<string>>(new Set());
  const [availableBuckets, setAvailableBuckets] = useState<string[]>([]);
  const selectedScenarioTemp = selectedScenario || "aiuhgahfaoiuhfkjnq";
  const [editingCell, setEditingCell] = useState<{ playerId: string, field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [tempEditValue, setTempEditValue] = useState<string>('');
  const [deadMoney, setDeadMoney] = useState<Player[]>([]);
  const [positionCompensation, setPositionCompensation] = useState<{ [key: string]: number }>({});
  const [budgetData, setBudgetData] = useState<Player[]>([]);
  const [totalBudgetedCompensation, setTotalBudgetedCompensation] = useState(0);
  const [columns, setColumns] = useState<{ [key: string]: Player[] }>({});
  const [loading, setLoading] = useState(true);
  const [playerComments, setPlayerComments] = useState<Record<string, Comment[]>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAthlete, setModalAthlete] = useState<{ id: string; name: string } | null>(null);
  const { activeCustomerId } = useCustomer();
  const showScholarshipDollars = useShowScholarshipDollars();

  // Initialize team
  useEffect(() => {
    const initializeTeam = async () => {
      const userDetails = await fetchUserDetails();
      if (userDetails) {
        setTeam(userDetails.customer_id);
      }
    };
    initializeTeam();
  }, []);

  const fetchPlayers = useCallback(async (teamId: string) => {
    if (!teamId) return;
  
    try {
      const { players: adjustedPlayers, totalTeamCompensation: totalTeamComp, positionCompensation: positionComp } = await fetchAdjustedPlayers(teamId, selectedYear, selectedScenario, activeFilters, selectedMonth);
      
      // Look for our target player for debugging
      const targetPlayer = adjustedPlayers.find(p => p.athlete_id === TEST_ATHLETE_ID);
      if (targetPlayer) {
        // Debug log removed('DEBUG-LISTVIEW: Target player data from fetchAdjustedPlayers:');
        // Debug log removed('Player:', targetPlayer.name__first, targetPlayer.name__last);
        // Debug log removed('monthlyCompensation:', targetPlayer.monthlyCompensation);
        // Debug log removed('Type:', typeof targetPlayer.monthlyCompensation);
        if (typeof targetPlayer.monthlyCompensation === 'object') {
          // Debug log removed('monthlyCompensation Keys:', Object.keys(targetPlayer.monthlyCompensation));
          // Debug log removed('monthlyCompensation Values:', Object.values(targetPlayer.monthlyCompensation));
        }
        // Debug log removed('Total compensation:', targetPlayer.compensation);
        
        // Log the athlete's entire structure to see all available fields
        // Debug log removed('FULL TARGET PLAYER DATA:', JSON.stringify(targetPlayer, null, 2));
      } else {
        // Debug log removed('DEBUG-LISTVIEW: Target player not found in adjustedPlayers');
      }
      
      // Filter out future players
      const currentPlayers = adjustedPlayers.filter(player => player.starting_season <= selectedYear);
      
      const budgetData = await fetchBudgetData(teamId, selectedYear, selectedScenario);
      const positionOrderData = await fetchPositionOrder(teamId, selectedYear);
      const positionOrder = positionOrderData.map(item => item.position);
      setPositionOrder(positionOrder);
  
      const categoryMap = positionOrderData.reduce((acc, item) => {
        acc[item.position] = item.category;
        return acc;
      }, {} as Record<string, string>);
      setCategoryMap(categoryMap);
  
      // Calculate compensation totals only for current players
      const totalTeamCompensation = currentPlayers.reduce((sum, player) => sum + player.compensation, 0);
      // Debug log removed('Total Team Compensation:', totalTeamCompensation);
      // Fetch all compensation data for the team for both current and next year
      // to cover the entire fiscal year
      const { data: allTeamCompData, error: compError } = await supabase
        .from('compensation')
        .select('athlete_id, month, amount, scenario, year')
        .in('year', [selectedYear, selectedYear + 1])
        .in('scenario', ['', selectedScenarioTemp])
  
      if (compError) console.error('Error fetching compensation data:', compError);
  
      // No need to merge and process compensation data since we now have monthlyCompensation from fetchAdjustedPlayers
      const formattedPlayers = await Promise.all(currentPlayers.map(async (player) => {
        // Special logging for our target player
        const isTargetPlayer = player.athlete_id === TEST_ATHLETE_ID;
        
        if (isTargetPlayer) {
          // Debug log removed('DEBUG-PROCESSING: Processing player in formattedPlayers:', player.name__first, player.name__last);
          // Debug log removed('DEBUG-PROCESSING: Initial monthlyCompensation:', player.monthlyCompensation);
        }
        
        const slotNumber = player.pos_rank + 1;
        const budgetForSlot = budgetData?.find(
          (item: { position: string; slot: number; }) => item.position === player.position && item.slot === slotNumber
        )?.amount || 0;
        
        // Calculate total player compensation including additional comp fields
        const totalPlayerCompensation = player.compensation + 
          Object.entries(player)
            .filter(([key]) => key.startsWith('comp_'))
            .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
            
        const isRecruit = player.starting_season > selectedYear;
        const budgetDifference = isRecruit ? 0 : calculateBudgetDifference(totalPlayerCompensation, budgetForSlot);
        const teamPercentage = isRecruit ? 0 : calculateCompPercentage(totalPlayerCompensation, totalTeamCompensation);
        const category = categoryMap[player.position] || '';
        
        // Create the result object with all properties
        const result = {
          ...player,
          scholarship_perc: player.scholarship_perc ? parseFloat(player.scholarship_perc.toString()) : 0,
          budgetDifference,
          teamPercentage,
          positionCategory: category,
          // monthlyCompensation is already set in the player object from fetchAdjustedPlayers
        };
        

        
        return result;
      }));

      const sortedPlayers = formattedPlayers.sort((a, b) => {
        const posA = positionOrderData.findIndex(p => p.position === a.position);
        const posB = positionOrderData.findIndex(p => p.position === b.position);
        if (posA !== posB) return posA - posB;
        return a.pos_rank - b.pos_rank;
      });

      setPlayers(sortedPlayers);
      setTotalTeamCompensation(totalTeamComp);
      setPositionCompensation(positionComp);
      setBudgetData(budgetData || []);
      
      // Detect available compensation buckets
      const buckets = detectAvailableBuckets(sortedPlayers);
      setAvailableBuckets(buckets);
      
      setLoading(false);

      // After setting players state, immediately check if our target player is correctly formatted
      const postTargetPlayer = sortedPlayers.find(p => p.athlete_id === TEST_ATHLETE_ID);
      if (postTargetPlayer) {
        // Debug log removed('DEBUG-LISTVIEW: Target player after formatting:');
        // Debug log removed('Player:', postTargetPlayer.name__first, postTargetPlayer.name__last);
        // Debug log removed('monthlyCompensation:', postTargetPlayer.monthlyCompensation);
        // Debug log removed('Type:', typeof postTargetPlayer.monthlyCompensation);
        if (typeof postTargetPlayer.monthlyCompensation === 'object') {
          // Debug log removed('monthlyCompensation Keys:', Object.keys(postTargetPlayer.monthlyCompensation));
          // Debug log removed('monthlyCompensation Values:', Object.values(postTargetPlayer.monthlyCompensation));
        }
      }
    } catch (error) {
      console.error('Error in fetchPlayers:', error);
      setLoading(false);
    }
  }, [selectedYear, selectedScenario, activeFilters, selectedMonth, selectedScenarioTemp]);

  // Call fetchPlayers when team or other dependencies change
  useEffect(() => {
    if (team) {
      fetchPlayers(team);
    }
  }, [team, fetchPlayers]);

  // Add debug logs in the fiscal year months calculation function
  const getFiscalYearMonths = (startMonth: string): string[] => {
    const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startIndex = MONTH_ORDER.indexOf(startMonth);
    if (startIndex === -1) return MONTH_ORDER; // Default to calendar year if month not found
    
    // Create array with months of the fiscal year with year indicators
    const fiscalYearMonths = [];
    
    // Add current year months (from selected month to December)
    for (let i = startIndex; i < 12; i++) {
      fiscalYearMonths.push(`${MONTH_ORDER[i]} ${selectedYear}`);
    }
    
    // Add next year months (from January to month before selected month)
    for (let i = 0; i < startIndex; i++) {
      fiscalYearMonths.push(`${MONTH_ORDER[i]} ${selectedYear + 1}`);
    }
    
    return fiscalYearMonths;
  };

  // Get the selected number of months from the fiscal year
  const getSelectedMonths = (): string[] => {
    const allFiscalYearMonths = getFiscalYearMonths(selectedMonth);
    return allFiscalYearMonths.slice(0, numberOfMonths);
  };

  // Calculate main pay only (base compensation for selected months)
  const getMainPayForSelectedMonths = (player: Player): number => {
    const selectedMonths = getSelectedMonths();
    return selectedMonths.reduce((total, monthWithYear) => {
      const [month] = monthWithYear.split(' ');
      const monthlyValue = getMonthlyValue(player, month);
      return total + monthlyValue;
    }, 0);
  };

  // Calculate total pay (sum of all buckets including main)
  const getTotalPayForSelectedMonths = (player: Player): number => {
    const mainPay = getMainPayForSelectedMonths(player);
    const bucketTotals = availableBuckets.reduce((sum, bucketKey) => {
      return sum + getBucketTotalForSelectedMonths(player, bucketKey);
    }, 0);
    return mainPay + bucketTotals;
  };

  // Get total for a specific compensation bucket for selected months
  const getBucketTotalForSelectedMonths = (player: Player, bucketKey: string): number => {
    const selectedMonths = getSelectedMonths();
    return selectedMonths.reduce((total, monthWithYear) => {
      const [month] = monthWithYear.split(' ');
      const monthlyValue = getMonthlyValue(player, month);
      // For now, distribute bucket amount evenly across months
      // This could be enhanced to have monthly breakdowns for buckets too
      const bucketAmount = (player[bucketKey as keyof Player] as number) || 0;
      const monthlyBucketAmount = bucketAmount / 12;
      return total + monthlyBucketAmount;
    }, 0);
  };

  // Get main budget amount for selected months
  const getMainBudgetForSelectedMonths = (player: Player): number => {
    const selectedMonths = getSelectedMonths();
    return selectedMonths.reduce((total, monthWithYear) => {
      const [month] = monthWithYear.split(' ');
      // Get the budget amount for this player's position and slot
      const slotNumber = player.pos_rank + 1;
      const budgetForSlot = budgetData?.find(
        (item: any) => item.position === player.position && item.slot === slotNumber
      );
      const amount = budgetForSlot ? (budgetForSlot as any).amount : 0;
      return total + (amount / 12); // Distribute budget evenly across months
    }, 0);
  };

  // Detect available compensation buckets
  const detectAvailableBuckets = (players: Player[]): string[] => {
    const buckets = new Set<string>();
    players.forEach(player => {
      Object.keys(player).forEach(key => {
        if (key.startsWith('comp_') && key !== 'compensation') {
          const value = player[key as keyof Player] as number;
          if (value && value > 0) {
            buckets.add(key);
          }
        }
      });
    });
    return Array.from(buckets).sort();
  };

  const handleSort = (column: string) => {
    const direction = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(column);
    setSortDirection(direction);

    const sortedPlayers = [...players].sort((a, b) => {
      if (column === 'position' || column === 'positionCategory') {
        const posA = positionOrder.findIndex(p => p.position === a.position);
        const posB = positionOrder.findIndex(p => p.position === b.position);
        return direction === 'asc' ? posA - posB : posB - posA;
      } else {
        let aValue, bValue;

        // Handle special column cases
        if (column === 'totalPay') {
          aValue = getTotalPayForSelectedMonths(a);
          bValue = getTotalPayForSelectedMonths(b);
        } else if (column === 'mainPay') {
          aValue = getMainPayForSelectedMonths(a);
          bValue = getMainPayForSelectedMonths(b);
        } else if (column === 'budget') {
          aValue = getMainBudgetForSelectedMonths(a);
          bValue = getMainBudgetForSelectedMonths(b);
        } else if (availableBuckets.includes(column)) {
          aValue = getBucketTotalForSelectedMonths(a, column);
          bValue = getBucketTotalForSelectedMonths(b, column);
        } else {
          aValue = a[column as keyof Player];
          bValue = b[column as keyof Player];
        }

        if (column === 'compensation' || column === 'teamPercentage' || column === 'budgetDifference' || 
            column === 'totalPay' || column === 'mainPay' || column === 'budget' || 
            availableBuckets.includes(column)) {
          aValue = Number(aValue);
          bValue = Number(bValue);
        }

        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
    setPlayers(sortedPlayers);
  };

  const toggleFilter = (column: string) => {
    setActiveFilter(activeFilter === column ? null : column);
  };

  const toggleBucketMonthlyExpansion = (bucketKey: string) => {
    setExpandedBucketMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bucketKey)) {
        newSet.delete(bucketKey);
      } else {
        newSet.add(bucketKey);
      }
      return newSet;
    });
  };

  const handleFilterChange = (column: string, value: string, checked: boolean) => {
    setFilters(prev => {
      const columnFilters = prev[column] || new Set();
      if (checked) {
        columnFilters.add(value);
      } else {
        columnFilters.delete(value);
      }
      return { ...prev, [column]: columnFilters };
    });
  };

  const playersWithPositionPercentage = useMemo(() => {
    // Filter out recruits (players with starting_season > selectedYear)
    const nonRecruitPlayers = players.filter(player => player.starting_season <= selectedYear);
    
    // Calculate total compensation per position including additional comp fields
    const positionTotals = nonRecruitPlayers.reduce((totals, player) => {
      const totalPlayerCompensation = player.compensation + 
        Object.entries(player)
          .filter(([key]) => key.startsWith('comp_'))
          .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
          
      totals[player.position] = (totals[player.position] || 0) + totalPlayerCompensation;
      return totals;
    }, {} as { [key: string]: number });

    return players.map(player => {
      const isRecruit = player.starting_season > selectedYear;
      
      if (isRecruit) {
        return {
          ...player,
          positionPercentage: 0
        };
      }
      
      const totalPlayerCompensation = player.compensation + 
        Object.entries(player)
          .filter(([key]) => key.startsWith('comp_'))
          .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
          
      return {
        ...player,
        positionPercentage: (totalPlayerCompensation / positionTotals[player.position]) * 100
      };
    });
  }, [players, selectedYear]);

  const filteredPlayers = useMemo(() => {
    const filtered = playersWithPositionPercentage.filter(player =>
      Object.entries(filters).every(([column, values]) => {
        if (values.size === 0) return true;
        if (column === 'compensation') {
          return values.has(formatPayment(player.compensation));
        } else if (column === 'teamPercentage') {
          return values.has(formatPercentage(player.teamPercentage || 0));
        } else if (column === 'positionPercentage') {
          return values.has(formatPercentage(player.positionPercentage || 0));
        } else if (column === 'budgetDifference') {
          return values.has(formatBudgetDifference(player.budgetDifference || 0));
        }
        return values.has(String((player as any)[column] ?? ''));
      })
    );
    return filtered;
  }, [playersWithPositionPercentage, filters]);

  const getUniqueValues = (column: string) => {
    const values = Array.from(new Set(players.map(player => {
      let value;
      
      // Handle special column cases
      if (column === 'totalPay') {
        value = getTotalPayForSelectedMonths(player);
        return formatPayment(value);
      } else if (column === 'mainPay') {
        value = getMainPayForSelectedMonths(player);
        return formatPayment(value);
      } else if (column === 'budget') {
        value = getMainBudgetForSelectedMonths(player);
        return formatPayment(value);
      } else if (availableBuckets.includes(column)) {
        value = getBucketTotalForSelectedMonths(player, column);
        return formatPayment(value);
      } else {
        value = player[column as keyof Player];
        if (column === 'compensation') {
          return formatPayment(value as number);
        } else if (column === 'teamPercentage') {
          return formatPercentage(value as number);
        } else if (column === 'budgetDifference') {
          return formatBudgetDifference(value as number);
        }
        return String(value);
      }
    })));
    
    if (column === 'compensation' || column === 'teamPercentage' || column === 'budgetDifference' || 
        column === 'totalPay' || column === 'mainPay' || column === 'budget' || 
        availableBuckets.includes(column)) {
      return values.sort((a, b) => {
        const aNum = parseFloat(String(a).replace(/[^0-9.-]+/g, ""));
        const bNum = parseFloat(String(b).replace(/[^0-9.-]+/g, ""));
        return aNum - bNum;
      });
    } else {
      return values.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    }
  };

  const renderFilterDropdown = (column: string) => {
    const uniqueValues = getUniqueValues(column);
    const allSelected = filters[column]?.size === uniqueValues.length;

    const handleSelectAll = () => {
      setFilters(prev => ({
        ...prev,
        [column]: new Set(uniqueValues.map(String))
      }));
    };

    const handleSelectNone = () => {
      setFilters(prev => ({
        ...prev,
        [column]: new Set()
      }));
    };

    return (
      <div className={styles.filterDropdown}>
        <div className={styles.filterActions}>
          <button onClick={handleSelectAll} className={styles.filterActionButton}>
            Select All
          </button>
          <button onClick={handleSelectNone} className={styles.filterActionButton}>
            Select None
          </button>
        </div>
        {uniqueValues.map(value => (
          <label key={String(value)} className={styles.filterOption}>
            <input
              type="checkbox"
              checked={filters[column]?.has(String(value)) || false}
              onChange={(e) => handleFilterChange(column, String(value), e.target.checked)}
            />
            <span className={styles.filterOptionText}>
              {String(value).length > 20 ? `${String(value).substring(0, 20)}...` : String(value)}
            </span>
          </label>
        ))}
      </div>
    );
  };

  const isFilterActive = (column: string) => {
    return filters[column] && filters[column].size > 0;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setActiveFilter(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePlayerClick = async (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player && `${player.name__first} ${player.name__last}` === "TBD") {
      return; // Do nothing for TBD players
    }

    try {
      const result = await fetchAdjustedPlayers(
        team,
        selectedYear,
        selectedScenario,
        activeFilters,
        selectedMonth,
        playerId
      );

      if (result.players.length > 0) {
        const player = result.players[0];
        setSelectedAthlete(player);
        setShowDetails(true);
      } else {
        console.error("No player data found");
      }
    } catch (error) {
      console.error("Error fetching player data:", error);
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

  const summaryData = useMemo(() => {
    // Calculate total pay for selected months only
    const totalPay = filteredPlayers.reduce((sum, player) => {
      return sum + getTotalPayForSelectedMonths(player);
    }, 0);
    
    const totalTeamPercentage = filteredPlayers.reduce((sum, player) => sum + (player.teamPercentage || 0), 0);
    const totalBudgetDifference = filteredPlayers.reduce((sum, player) => sum + (player.budgetDifference || 0), 0);
    const totalScholarship = filteredPlayers.reduce((sum, player) => sum + player.scholarship_perc, 0);

    // Calculate monthly pay totals for selected months only
    const selectedMonths = getSelectedMonths();
    const monthlyPay = Array(numberOfMonths).fill(0);
    
    filteredPlayers.forEach(player => {
      selectedMonths.forEach((monthWithYear, index) => {
        const [month] = monthWithYear.split(' ');
        const monthlyValue = getMonthlyValue(player, month);
        monthlyPay[index] += monthlyValue;
      });
    });

    return {
      totalPay,
      totalTeamPercentage,
      totalBudgetDifference,
      totalScholarship,
      monthlyPay
    };
  }, [filteredPlayers, numberOfMonths, selectedMonth]);

  const groupedAndFilteredPlayers = useMemo(() => {
    let players = filteredPlayers;

    if (!sortColumn || sortColumn === 'name__last') {
      // Default sort by name__last
      players = [...players].sort((a, b) => {
        const aValue = a.name__last.toLowerCase();
        const bValue = b.name__last.toLowerCase();
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (sortColumn === 'position' || sortColumn === 'elig_remaining' || sortColumn === 'positionCategory') {
      const groupKey = sortColumn === 'position' ? 'position' : 
                       sortColumn === 'elig_remaining' ? 'elig_remaining' : 'positionCategory';
      const grouped = players.reduce((acc, player) => {
        const key = String(player[groupKey as keyof typeof player] ?? '');
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(player);
        return acc;
      }, {} as { [key: string]: Player[] });

      // Use positionOrder to determine group order
      let sortedGroups;
      if (sortColumn === 'elig_remaining') {
        sortedGroups = Object.keys(grouped).sort((a, b) => {
          return sortDirection === 'asc' 
            ? Number(a) - Number(b) 
            : Number(b) - Number(a);
        });
      } else if (sortColumn === 'positionCategory') {
        // Get unique categories in the order they appear in positionOrder
        const categoryOrder = Array.from(new Set(positionOrder.map(pos => {
          const position = typeof pos === 'string' ? pos : pos.position;
          return categoryMap[position];
        })));
        sortedGroups = categoryOrder
          .filter(category => Object.keys(grouped).includes(category))
          .sort((a, b) => {
            const posA = categoryOrder.indexOf(a);
            const posB = categoryOrder.indexOf(b);
            return sortDirection === 'asc' ? posA - posB : posB - posA;
          });
      } else {
        sortedGroups = positionOrder
          .filter(pos => {
            const position = typeof pos === 'string' ? pos : pos.position;
            return grouped[position];
          })
          .map(pos => typeof pos === 'string' ? pos : pos.position);
        sortedGroups = sortedGroups.sort((a, b) => {
          const posA = positionOrder.findIndex(p => (typeof p === 'string' ? p : p.position) === a);
          const posB = positionOrder.findIndex(p => (typeof p === 'string' ? p : p.position) === b);
          return sortDirection === 'asc' ? posA - posB : posB - posA;
        });
      }


      return sortedGroups.map(group => ({
        group,
        players: grouped[group],
        summary: {
          totalPay: grouped[group].reduce((sum, p) => sum + getTotalPayForSelectedMonths(p), 0),
          totalTeamPercentage: grouped[group].reduce((sum, p) => sum + (p.teamPercentage || 0), 0),
          totalBudgetDifference: grouped[group].reduce((sum, p) => sum + (p.budgetDifference || 0), 0),
          totalScholarship: grouped[group].reduce((sum, p) => sum + (p.scholarship_perc || 0), 0),
          monthlyPay: (() => {
            const selectedMonths = getSelectedMonths();
            const monthlyPay = Array(numberOfMonths).fill(0);
            
            grouped[group].forEach(player => {
              selectedMonths.forEach((monthWithYear, index) => {
                const [month] = monthWithYear.split(' ');
                const monthlyValue = getMonthlyValue(player, month);
                monthlyPay[index] += monthlyValue;
              });
            });
            
            return monthlyPay;
          })()
        }
      }));
    }

    // If not sorted by position, eligibility, or position category, return a single group with all players
    return [{
      group: 'All',
      players,
      summary: summaryData
    }];
  }, [filteredPlayers, sortColumn, sortDirection, summaryData, positionOrder, categoryMap]);
  const handleCellClick = (playerId: string, field: string, value: string) => {
    if (field === 'year') {
      const player = players.find(p => p.id === playerId);
      if (player) {
        // Construct the proper display value with redshirt prefix
        const redshirtPrefix = player.redshirt_status === 'has' ? 'T' : 'R';
        const yearValue = player.year;
        const fullValue = yearValue.startsWith('T') || yearValue.startsWith('R') 
        ? yearValue 
        : `${player.redshirt_status === 'has' ? 'T' : 'R'}${yearValue}`;
        setEditValue(fullValue);
        setTempEditValue(fullValue);
      }
    } else {
      setEditValue(String(value));
    }
    setEditingCell({ playerId, field });
  };

  const handleCellBlur = async () => {
    if (editingCell) {
      const { playerId, field } = editingCell;
      const newValue = field === 'scholarship_perc' ? parseFloat(tempEditValue) : tempEditValue;

      const existingPlayer = players.find(p => p.id === playerId);
      if (!existingPlayer) {
        setEditingCell(null);
        setTempEditValue('');
        return;
      }

      let updates: any = {};
      if (field === 'year') {
        const redshirtStatus = tempEditValue.charAt(0);
        const academicYear = tempEditValue.slice(1);
        if (existingPlayer.redshirt_status === (redshirtStatus === 'T' ? 'has' : 'used') && existingPlayer.year === academicYear) {
          setEditingCell(null);
          setTempEditValue('');
          return;
        }
        updates = {
          redshirt_status: redshirtStatus === 'T' ? 'has' : 'used',
          year: academicYear
        };
      } else {
        if (existingPlayer[field as keyof Player] === newValue) {
          setEditingCell(null);
          setTempEditValue('');
          return;
        }
        updates = { [field]: newValue };
      }

      try {
        // Create override entries for each changed field
        const overrideEntries = [];

        if (field === 'year') {
          // Add year override
          overrideEntries.push({
            category: 'year',
            value: updates.year,
            athlete_id: existingPlayer.athlete_id,
            scenario: selectedScenario,
            month: '00',
            season_override: selectedYear
          });

          // Add redshirt_status override
          overrideEntries.push({
            category: 'redshirt_status',
            value: updates.redshirt_status,
            athlete_id: existingPlayer.athlete_id,
            scenario: selectedScenario,
            month: '00',
            season_override: selectedYear
          });
        } else {
          // Add single field override
          overrideEntries.push({
            category: field,
            value: newValue.toString(),
            athlete_id: existingPlayer.athlete_id,
            scenario: selectedScenario,
            month: '00',
            season_override: selectedYear
          });
        }

        // Perform the upserts
        for (const entry of overrideEntries) {
          const { error } = await supabase
            .from('athletes_override_category')
            .upsert([entry]);

          if (error) {
            console.error('Error updating athlete override:', error);
            throw error;
          }
        }

        // Update the local state
        setPlayers(players.map(player => 
          player.id === playerId ? { ...player, ...updates } : player
        ));

      } catch (error) {
        console.error('Error updating athlete:', error);
      }

      setEditingCell(null);
      setTempEditValue('');
    }
  };

  const renderEditableCell = (player: Player, field: string) => {
    const isEditing = editingCell?.playerId === player.id && editingCell?.field === field;
    const value = player[field as keyof Player];

    const handleSave = () => {
      setEditValue(tempEditValue);
      handleCellBlur();
    };

    const handleCancel = () => {
      setTempEditValue('');
      setEditingCell(null);
    };

    if (isEditing) {
      let input;
      if (field === 'position') {        
        let positionOptions;
        if (Array.isArray(positionOrder)) {
          if (typeof positionOrder[0] === 'string') {
            positionOptions = (positionOrder as unknown as string[]).map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ));
          } else if (typeof positionOrder[0] === 'object' && positionOrder[0].position) {
            positionOptions = positionOrder.map((pos) => (
              <option key={pos.position} value={pos.position}>{pos.position}</option>
            ));
          } 
        } 

        input = (
          <select
            className={styles.editDropdown}
            value={tempEditValue || editValue}
            onChange={(e) => setTempEditValue(e.target.value)}
            autoFocus
          >
            {positionOptions}
          </select>
        );
      } else if (field === 'elig_remaining') {
        input = (
          <select
            className={styles.editDropdown}
            value={tempEditValue || editValue}
            onChange={(e) => setTempEditValue(e.target.value)}
            autoFocus
          >
            {[1, 2, 3, 4, 5].map((elig) => (
              <option key={elig} value={elig}>{elig}</option>
            ))}
          </select>
        );
      } else if (field === 'year') {
        const displayValue = tempEditValue || editValue;
        // Debug log removed('displayValue', displayValue);
        const redshirtStatus = displayValue.charAt(0);
        const academicYear = displayValue.slice(1);
        input = (
          <>
            <select
              className={styles.editDropdown}
              value={redshirtStatus}
              onChange={(e) => {
                const newValue = `${e.target.value}${academicYear}`;
                setTempEditValue(newValue);
              }}
            >
              <option value="T">T</option>
              <option value="R">R</option>
            </select>
            <select
              className={styles.editDropdown}
              value={academicYear}
              onChange={(e) => {
                const newValue = `${redshirtStatus}${e.target.value}`;
                setTempEditValue(newValue);
              }}
            >
              <option value="FR">FR</option>
              <option value="SO">SO</option>
              <option value="JR">JR</option>
              <option value="SR">SR</option>
              <option value="GR">GR</option>
            </select>
          </>
        );
      } else if (field === 'scholarship_perc') {
        input = (
          <input
            className={`${styles.editInput} ${styles.smallEditInput}`}
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={tempEditValue || editValue}
            onChange={(e) => setTempEditValue(e.target.value)}
            autoFocus
          />
        );
      } else {
        input = (
          <input
            className={`${styles.editInput} ${styles.smallEditInput}`}
            type="text"
            value={tempEditValue || editValue}
            onChange={(e) => setTempEditValue(e.target.value)}
            autoFocus
          />
        );
      }

      return (
        <div className={styles.editingCell}>
          {input}
          <button className={`${styles.editButton} ${styles.smallButton}`} onClick={handleSave}>✓</button>
          <button className={`${styles.cancelButton} ${styles.smallButton}`} onClick={handleCancel}>✗</button>
        </div>
      );
    } else {
      let displayValue = value;
      if (field === 'year') {
        const yearValue = String(value);
        if (!yearValue.startsWith('T') && !yearValue.startsWith('R')) {
          const redshirtPrefix = player.redshirt_status === 'has' ? 'T' : 'R';
          displayValue = `${redshirtPrefix}${yearValue}`;
        } else {
          displayValue = yearValue;
        }
      } else if (field === 'scholarship_perc') {
        displayValue = showScholarshipDollars
          ? (player.scholarship_dollars_total != null
              ? `$${player.scholarship_dollars_total.toLocaleString()}`
              : "—")
          : (player.scholarship_perc === 0
              ? "Walk-on"
              : `${(player.scholarship_perc * 100).toFixed(0)}% Schol.`)
      }

      return (
        <span onClick={() => handleCellClick(player.id, field, String(value))}>
          {String(displayValue)}
        </span>
      );
    }
  };

  const renderTable = (players: Player[], summary: typeof summaryData, groupHeader: string) => {
    const bucketColumns = showBuckets ? availableBuckets.length : 0;
    const expandedBucketMonthlyColumns = Array.from(expandedBucketMonths).length * numberOfMonths;
    const payMainMonthlyColumns = showPayMainMonthly ? numberOfMonths : 0;
    const totalColumns = effectiveCompAccess 
      ? (showMonthlyBreakdown ? 23 : 11) + 1 + bucketColumns + expandedBucketMonthlyColumns + payMainMonthlyColumns
      : 7;
    
    return (
    <table className={styles.table}>
      <thead>
        <tr><th colSpan={totalColumns}>{groupHeader}</th></tr>
        <tr>
          <th>
            <div className={styles.columnHeader}>
              <span onClick={() => handleSort('name__last')}>Name</span>
              <FaFilter 
                onClick={() => toggleFilter('name__last')} 
                className={isFilterActive('name__last') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'name__last' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('name__last')}
                </div>
              )}
            </div>
          </th>
          <th>
            <div className={styles.columnHeader}>
              <span onClick={() => handleSort('positionCategory')}>Cat</span>
              <FaFilter 
                onClick={() => toggleFilter('positionCategory')} 
                className={isFilterActive('positionCategory') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'positionCategory' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('positionCategory')}
                </div>
              )}
            </div>
          </th>
          <th>
            <div className={styles.columnHeader}>
              <span onClick={() => handleSort('position')}>Pos</span>
              <FaFilter 
                onClick={() => toggleFilter('position')} 
                className={isFilterActive('position') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'position' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('position')}
                </div>
              )}
            </div>
          </th>
          <th>
            <div className={styles.columnHeader}>
              <span onClick={() => handleSort('elig_remaining')}>Elig</span>
              <FaFilter 
                onClick={() => toggleFilter('elig_remaining')} 
                className={isFilterActive('elig_remaining') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'elig_remaining' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('elig_remaining')}
                </div>
              )}
            </div>
          </th>
          <th>
            <div className={styles.columnHeader}>
              <span onClick={() => handleSort('year')}>Year</span>
              <FaFilter 
                onClick={() => toggleFilter('year')} 
                className={isFilterActive('year') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'year' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('year')}
                </div>
              )}
            </div>
          </th>
          <th>
            <div className={styles.columnHeader}>
              <span onClick={() => handleSort('scholarship_perc')}>Schol.</span>
              <FaFilter 
                onClick={() => toggleFilter('scholarship_perc')} 
                className={isFilterActive('scholarship_perc') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'scholarship_perc' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('scholarship_perc')}
                </div>
              )}
            </div>
          </th>
          {effectiveCompAccess && (
            <>
              <th>
                <div className={styles.columnHeader}>
                  <span onClick={() => handleSort('totalPay')}>Pay</span>
                  <FaFilter 
                    onClick={() => toggleFilter('totalPay')} 
                    className={isFilterActive('totalPay') ? styles.activeFilter : styles.inactiveFilter}
                  />
                  {activeFilter === 'totalPay' && (
                    <div ref={filterRef}>
                      {renderFilterDropdown('totalPay')}
                    </div>
                  )}
                  <button 
                    onClick={() => setShowBuckets(!showBuckets)}
                    className={styles.toggleButton}
                    title={showBuckets ? "Hide Bucket Columns" : "Show Bucket Columns"}
                  >
                    {showBuckets ? <FaMinus color="red" /> : <FaLayerGroup color="green" />}
                  </button>
                  <button 
                    onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
                    className={styles.toggleButton}
                    title={showMonthlyBreakdown ? "Hide Monthly Columns" : "Show Monthly Columns"}
                  >
                    {showMonthlyBreakdown ? <FaMinus color="red" /> : <FaCalendarAlt color="green" />}
                  </button>
                </div>
              </th>
              {showMonthlyBreakdown && getSelectedMonths().map((monthWithYear) => {
                // Split the month and year
                const [month, year] = monthWithYear.split(' ');
                // Format as short month + last 2 digits of year (e.g., "Feb 25")
                const shortYear = year.slice(-2);
                
                return (
                  <th key={monthWithYear}>{month} {shortYear}</th>
                );
              })}
              {showBuckets && (
                <th>
                  <div className={styles.columnHeader}>
                    <span onClick={() => handleSort('mainPay')}>Pay Main</span>
                    <FaFilter 
                      onClick={() => toggleFilter('mainPay')} 
                      className={isFilterActive('mainPay') ? styles.activeFilter : styles.inactiveFilter}
                    />
                    {activeFilter === 'mainPay' && (
                      <div ref={filterRef}>
                        {renderFilterDropdown('mainPay')}
                      </div>
                    )}
                    <button 
                      onClick={() => setShowPayMainMonthly(!showPayMainMonthly)}
                      className={styles.toggleButton}
                      title={showPayMainMonthly ? "Hide Monthly Breakdown" : "Show Monthly Breakdown"}
                    >
                      {showPayMainMonthly ? <FaMinus color="red" /> : <FaCalendarAlt color="green" />}
                    </button>
                  </div>
                </th>
              )}
              {showPayMainMonthly && getSelectedMonths().map((monthWithYear) => {
                // Split the month and year
                const [month, year] = monthWithYear.split(' ');
                // Format as short month + last 2 digits of year (e.g., "Feb 25")
                const shortYear = year.slice(-2);
                
                return (
                  <th key={`paymain-${monthWithYear}`}>Main {month} {shortYear}</th>
                );
              })}
              {showBuckets && availableBuckets.map(bucketKey => (
                <th key={bucketKey}>
                  <div className={styles.columnHeader}>
                    <span onClick={() => handleSort(bucketKey)}>{bucketKey.replace('comp_', 'Pay ')}</span>
                    <FaFilter 
                      onClick={() => toggleFilter(bucketKey)} 
                      className={isFilterActive(bucketKey) ? styles.activeFilter : styles.inactiveFilter}
                    />
                    {activeFilter === bucketKey && (
                      <div ref={filterRef}>
                        {renderFilterDropdown(bucketKey)}
                      </div>
                    )}
                    <button 
                      onClick={() => toggleBucketMonthlyExpansion(bucketKey)}
                      className={styles.toggleButton}
                      title={expandedBucketMonths.has(bucketKey) ? "Hide Monthly Breakdown" : "Show Monthly Breakdown"}
                    >
                      {expandedBucketMonths.has(bucketKey) ? <FaMinus color="red" /> : <FaCalendarAlt color="green" />}
                    </button>
                  </div>
                </th>
              ))}
              {availableBuckets.map(bucketKey => 
                expandedBucketMonths.has(bucketKey) ? 
                  getSelectedMonths().map((monthWithYear) => {
                    const [month, year] = monthWithYear.split(' ');
                    const shortYear = year.slice(-2);
                    return (
                      <th key={`${bucketKey}-${monthWithYear}`}>
                        {bucketKey.replace('comp_', '')} {month} {shortYear}
                      </th>
                    );
                  }) : []
              ).flat()}
              <th>
                <div className={styles.columnHeader}>
                  <span onClick={() => handleSort('budget')}>Budget</span>
                  <FaFilter 
                    onClick={() => toggleFilter('budget')} 
                    className={isFilterActive('budget') ? styles.activeFilter : styles.inactiveFilter}
                  />
                  {activeFilter === 'budget' && (
                    <div ref={filterRef}>
                      {renderFilterDropdown('budget')}
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className={styles.columnHeader}>
                  <span onClick={() => handleSort('teamPercentage')}>Team %</span>
                  <FaFilter 
                    onClick={() => toggleFilter('teamPercentage')} 
                    className={isFilterActive('teamPercentage') ? styles.activeFilter : styles.inactiveFilter}
                  />
                  {activeFilter === 'teamPercentage' && (
                    <div ref={filterRef}>
                      {renderFilterDropdown('teamPercentage')}
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className={styles.columnHeader}>
                  <span onClick={() => handleSort('positionPercentage')}>Pos %</span>
                  <FaFilter 
                    onClick={() => toggleFilter('positionPercentage')} 
                    className={isFilterActive('positionPercentage') ? styles.activeFilter : styles.inactiveFilter}
                  />
                  {activeFilter === 'positionPercentage' && (
                    <div ref={filterRef}>
                      {renderFilterDropdown('positionPercentage')}
                    </div>
                  )}
                </div>
              </th>
              <th>
                <div className={styles.columnHeader}>
                  <span onClick={() => handleSort('budgetDifference')}>Budget +/-</span>
                  <FaFilter 
                    onClick={() => toggleFilter('budgetDifference')} 
                    className={isFilterActive('budgetDifference') ? styles.activeFilter : styles.inactiveFilter}
                  />
                  {activeFilter === 'budgetDifference' && (
                    <div ref={filterRef}>
                      {renderFilterDropdown('budgetDifference')}
                    </div>
                  )}
                </div>
              </th>
            </>
          )}
          <th>
            <div className={styles.columnHeader}>
              <span>Notes</span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {players.map(player => {
          // Add debug log for target player
          const isTargetPlayer = player.athlete_id === TEST_ATHLETE_ID;
          
          if (isTargetPlayer) {
            // Debug log removed(`Debug: Found target player ${player.name__first} ${player.name__last}`);
            // Debug log removed(`Debug: monthlyCompensation:`, player.monthlyCompensation);
          }
          
          return (
            <tr key={player.id}>
              <td 
                onClick={() => handlePlayerClick(player.athlete_id || '')} 
                className={styles.playerName}
              >
                {player.name__first} {player.name__last}
              </td>
              <td>{player.positionCategory}</td>
              <td>{renderEditableCell(player, 'position')}</td>
              <td>{renderEditableCell(player, 'elig_remaining')}</td>
              <td>{renderEditableCell(player, 'year')}</td>
              <td>{renderEditableCell(player, 'scholarship_perc')}</td>
              {effectiveCompAccess && (
                <>
                  <td>{formatPayment(getTotalPayForSelectedMonths(player))}</td>
                  {showMonthlyBreakdown && getSelectedMonths().map((monthWithYear) => {
                    // Split the month and year
                    const [month, year] = monthWithYear.split(' ');
                    
                    // Get the monthly value
                    const monthlyValue = getMonthlyValue(player, month);
                    
                    // Debug logs for the target player
                    if (isTargetPlayer && monthlyValue > 0) {
                      // Debug log removed(`Debug: ${month} ${year} value = ${monthlyValue}`);
                    }
                    
                    return (
                      <td key={monthWithYear}>
                        {formatPayment(monthlyValue)}
                      </td>
                    );
                  })}
                  {showBuckets && (
                    <td>{formatPayment(getMainPayForSelectedMonths(player))}</td>
                  )}
                  {showPayMainMonthly && getSelectedMonths().map((monthWithYear) => {
                    // Split the month and year
                    const [month, year] = monthWithYear.split(' ');
                    
                    // Get the monthly value for Pay Main (same as main monthly breakdown)
                    const monthlyValue = getMonthlyValue(player, month);
                    
                    return (
                      <td key={`paymain-${monthWithYear}`}>
                        {formatPayment(monthlyValue)}
                      </td>
                    );
                  })}
                  {showBuckets && availableBuckets.map(bucketKey => (
                    <td key={bucketKey}>
                      {formatPayment(getBucketTotalForSelectedMonths(player, bucketKey))}
                    </td>
                  ))}
                  {availableBuckets.map(bucketKey => 
                    expandedBucketMonths.has(bucketKey) ? 
                      getSelectedMonths().map((monthWithYear) => {
                        const [month] = monthWithYear.split(' ');
                        const bucketAmount = (player[bucketKey as keyof Player] as number) || 0;
                        const monthlyBucketAmount = bucketAmount / 12;
                        return (
                          <td key={`${bucketKey}-${monthWithYear}`}>
                            {formatPayment(monthlyBucketAmount)}
                          </td>
                        );
                      }) : []
                  ).flat()}
                  <td>{formatPayment(getMainBudgetForSelectedMonths(player))}</td>
                  <td>{formatPercentage(player.teamPercentage || 0)}</td>
                  <td>{formatPercentage(player.positionPercentage || 0)}</td>
                  <td style={{ color: Math.abs(player.budgetDifference || 0) < 500 ? 'black' : ((player.budgetDifference || 0) > 0 ? 'red' : 'green') }}>
                    {formatBudgetDifference(player.budgetDifference || 0)}
                  </td>
                </>
              )}
              <td>
                <div 
                  className={styles.commentPreview} 
                  onClick={() => handleOpenCommentsModal(player)}
                  style={{ cursor: 'pointer' }}
                >
                  {player.athlete_id && playerComments[player.athlete_id]?.length > 0 ? (
                    <>
                      <div className={styles.commentContent}>
                        {playerComments[player.athlete_id][0].content}
                      </div>
                      <div className={styles.commentMeta}>
                        <span className={styles.commentAuthor}>
                          {playerComments[player.athlete_id][0].user_detail.name_first} {playerComments[player.athlete_id][0].user_detail.name_last}
                        </span>
                        <span className={styles.commentDate}>
                          {new Date(playerComments[player.athlete_id][0].created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {playerComments[player.athlete_id].length > 1 && (
                        <div className={styles.commentCount}>
                          +{playerComments[player.athlete_id].length - 1} more
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={styles.noCommentsText}>Click to add comment</div>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
        <tr className={styles.summaryRow}>
          <td colSpan={effectiveCompAccess ? 5 : 5}>Total</td>
          <td>{summary.totalScholarship}</td>
          {effectiveCompAccess && (
            <>
              <td>{formatPayment(summary.totalPay)}</td>
              {showMonthlyBreakdown && getSelectedMonths().map((monthWithYear, index) => {
                const monthlyValue = summary.monthlyPay && summary.monthlyPay.length >= numberOfMonths 
                  ? summary.monthlyPay[index] 
                  : (summary.totalPay || 0) / numberOfMonths;
                
                return (
                  <td key={monthWithYear}>
                    {formatPayment(monthlyValue || 0)}
                  </td>
                );
              })}
              {showBuckets && (
                <td>{formatPayment(
                  players.reduce((sum, player) => 
                    sum + getMainPayForSelectedMonths(player), 0
                  )
                )}</td>
              )}
              {showPayMainMonthly && getSelectedMonths().map((monthWithYear, index) => {
                const monthlyValue = summary.monthlyPay && summary.monthlyPay.length >= numberOfMonths 
                  ? summary.monthlyPay[index] 
                  : (summary.totalPay || 0) / numberOfMonths;
                
                return (
                  <td key={`paymain-${monthWithYear}`}>
                    {formatPayment(monthlyValue || 0)}
                  </td>
                );
              })}
              {showBuckets && availableBuckets.map(bucketKey => (
                <td key={bucketKey}>
                  {formatPayment(
                    players.reduce((sum, player) => 
                      sum + getBucketTotalForSelectedMonths(player, bucketKey), 0
                    )
                  )}
                </td>
              ))}
              {availableBuckets.map(bucketKey => 
                expandedBucketMonths.has(bucketKey) ? 
                  getSelectedMonths().map((monthWithYear) => {
                    const [month] = monthWithYear.split(' ');
                    const bucketTotal = players.reduce((sum, player) => {
                      const bucketAmount = (player[bucketKey as keyof Player] as number) || 0;
                      return sum + (bucketAmount / 12);
                    }, 0);
                    return (
                      <td key={`${bucketKey}-${monthWithYear}`}>
                        {formatPayment(bucketTotal)}
                      </td>
                    );
                  }) : []
              ).flat()}
              <td>{formatPayment(
                players.reduce((sum, player) => 
                  sum + getMainBudgetForSelectedMonths(player), 0
                )
              )}</td>
              <td>{formatPercentage(summary.totalTeamPercentage)}</td>
              <td></td>
              <td style={{ color: Math.abs(summary.totalBudgetDifference) < 500 ? 'black' : (summary.totalBudgetDifference > 0 ? 'red' : 'green') }}>
                {formatBudgetDifference(summary.totalBudgetDifference)}
              </td>
            </>
          )}
          <td></td>
        </tr>
      </tbody>
    </table>
    );
  };

  // Update debug logs in useEffect to use the new target player ID
  // Fetch comments for all players
  useEffect(() => {
    const fetchAllComments = async () => {
      const commentsMap: Record<string, Comment[]> = {};
      for (const player of players) {
        if (player.athlete_id) {
          try {
            const comments = await CommentService.getCommentsForAthlete(player.athlete_id);
            commentsMap[player.athlete_id] = comments;
          } catch (error) {
            console.error('Error fetching comments for player:', player.athlete_id, error);
          }
        }
      }
      setPlayerComments(commentsMap);
    };

    if (players.length > 0) {
      fetchAllComments();
    }
  }, [players]);

  useEffect(() => {
    if (!loading && players.length > 0) {
      // Debug log removed("DEBUG-LISTVIEW: After setting players state");
      
      // Try to find our target player for debugging
      const targetPlayer = players.find(p => p.athlete_id === TEST_ATHLETE_ID);
      if (targetPlayer) {
        // Debug log removed("DEBUG-LISTVIEW: Found target player in state:", targetPlayer.name__first, targetPlayer.name__last);
        // Debug log removed("Total compensation:", targetPlayer.compensation);
        
        // Log raw monthly compensation object for the target player
        // Debug log removed("Raw monthlyCompensation object:", targetPlayer.monthlyCompensation);
        
        // Log monthly values one by one
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        // Debug log removed("Monthly values by month:");
        months.forEach((month) => {
          const value = getMonthlyValue(targetPlayer, month);
          // Debug log removed(`${month}: ${value}`);
        });
        
        // Also log the fiscal year months
        // Debug log removed("Fiscal year monthly values:");
        getFiscalYearMonths(selectedMonth).forEach((monthWithYear) => {
          const [month] = monthWithYear.split(' ');
          const value = getMonthlyValue(targetPlayer, month);
          // Debug log removed(`${monthWithYear}: ${value}`);
        });
      }
    }
  }, [loading, players, selectedMonth]);

  const handleOpenCommentsModal = (player: Player) => {
    // Debug log removed('Opening comments modal for player:', player);
    setModalAthlete({
      id: player.athlete_id || '',
      name: `${player.name__first} ${player.name__last}`
    });
    setModalOpen(true);
  };

  const handleCloseCommentsModal = () => {
    setModalOpen(false);
    setModalAthlete(null);
    // Refresh comments when modal closes
    const fetchAllComments = async () => {
      const commentsMap: Record<string, Comment[]> = {};
      for (const player of players) {
        if (player.athlete_id) {
          try {
            const comments = await CommentService.getCommentsForAthlete(player.athlete_id);
            commentsMap[player.athlete_id] = comments;
          } catch (error) {
            console.error('Error fetching comments for player:', player.athlete_id, error);
          }
        }
      }
      setPlayerComments(commentsMap);
    };
    fetchAllComments();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.listView}>
      {groupedAndFilteredPlayers && groupedAndFilteredPlayers.length > 0 ? (
        groupedAndFilteredPlayers.map((group, index) => (
          <div key={group.group} className={styles.groupContainer}>
            {renderTable(
              group.players, 
              group.summary, 
              sortColumn === 'position' || sortColumn === 'elig_remaining' || sortColumn === 'positionCategory' ? group.group : ''
            )}
          </div>
        ))
      ) : (
        <div>No players to display</div>
      )}
      {showDetails && selectedAthlete && (
        <Details 
          athlete={selectedAthlete}
          onClose={() => setShowDetails(false)}
          fetchTasks={() => fetchPlayers(team)}
          team={team}
          selectedYear={selectedYear}
          effectiveYear={Math.max(selectedYear, selectedAthlete?.starting_season || selectedYear)}
          selectedScenario={selectedScenario}
          targetScenario={targetScenario || ''}
        />
      )}
      
      {modalOpen && modalAthlete && (
        <>
          <CommentsModal
            isOpen={modalOpen}
            onClose={handleCloseCommentsModal}
            athleteId={modalAthlete?.id || ''}
            athleteName={modalAthlete?.name || ''}
          />
        </>
      )}
    </div>
  );
};

export default ListView;
