import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import styles from './ListView.module.css';
import { Player } from '../../types/Player';
import { FaFilter, FaPlus, FaMinus } from 'react-icons/fa';
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

export interface ListViewProps {
    selectedYear: number;
    selectedMonth: string;
    selectedScenario: string;
    activeFilters: { [key: string]: string[] };
    targetScenario?: string;
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

const ListView: React.FC<ListViewProps> = ({ selectedYear, selectedMonth, selectedScenario, activeFilters, targetScenario }) => {
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
        console.log('DEBUG-LISTVIEW: Target player data from fetchAdjustedPlayers:');
        console.log('Player:', targetPlayer.name__first, targetPlayer.name__last);
        console.log('monthlyCompensation:', targetPlayer.monthlyCompensation);
        console.log('Type:', typeof targetPlayer.monthlyCompensation);
        if (typeof targetPlayer.monthlyCompensation === 'object') {
          console.log('monthlyCompensation Keys:', Object.keys(targetPlayer.monthlyCompensation));
          console.log('monthlyCompensation Values:', Object.values(targetPlayer.monthlyCompensation));
        }
        console.log('Total compensation:', targetPlayer.compensation);
        
        // Log the athlete's entire structure to see all available fields
        console.log('FULL TARGET PLAYER DATA:', JSON.stringify(targetPlayer, null, 2));
      } else {
        console.log('DEBUG-LISTVIEW: Target player not found in adjustedPlayers');
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
      console.log('Total Team Compensation:', totalTeamCompensation);
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
          console.log('DEBUG-PROCESSING: Processing player in formattedPlayers:', player.name__first, player.name__last);
          console.log('DEBUG-PROCESSING: Initial monthlyCompensation:', player.monthlyCompensation);
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
        
        if (isTargetPlayer) {
          console.log('DEBUG-PROCESSING: Final result for target player:', {
            compensation: result.compensation,
            monthlyCompensation: result.monthlyCompensation
          });
        }
        
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
      setLoading(false);

      // After setting players state, immediately check if our target player is correctly formatted
      const postTargetPlayer = sortedPlayers.find(p => p.athlete_id === TEST_ATHLETE_ID);
      if (postTargetPlayer) {
        console.log('DEBUG-LISTVIEW: Target player after formatting:');
        console.log('Player:', postTargetPlayer.name__first, postTargetPlayer.name__last);
        console.log('monthlyCompensation:', postTargetPlayer.monthlyCompensation);
        console.log('Type:', typeof postTargetPlayer.monthlyCompensation);
        if (typeof postTargetPlayer.monthlyCompensation === 'object') {
          console.log('monthlyCompensation Keys:', Object.keys(postTargetPlayer.monthlyCompensation));
          console.log('monthlyCompensation Values:', Object.values(postTargetPlayer.monthlyCompensation));
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
        let aValue = a[column as keyof Player];
        let bValue = b[column as keyof Player];

        if (column === 'compensation' || column === 'teamPercentage' || column === 'budgetDifference') {
          aValue = Number(aValue);
          bValue = Number(bValue);
        } else if (column === 'notes') {
          aValue = aValue || '';
          bValue = bValue || '';
        }

        if (aValue === undefined || aValue === null) aValue = '';
        if (bValue === undefined || bValue === null) bValue = '';

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    setPlayers(sortedPlayers);
  };

  const toggleFilter = (column: string) => {
    setActiveFilter(activeFilter === column ? null : column);
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
        } else if (column === 'notes') {
          return values.has(player.notes || '');
        }
        return values.has(String((player as any)[column] ?? ''));
      })
    );
    return filtered;
  }, [playersWithPositionPercentage, filters]);

  const getUniqueValues = (column: keyof Player) => {
    const values = Array.from(new Set(players.map(player => {
      const value = player[column];
      if (column === 'compensation') {
        return formatPayment(value as number);
      } else if (column === 'teamPercentage') {
        return formatPercentage(value as number);
      } else if (column === 'budgetDifference') {
        return formatBudgetDifference(value as number);
      } else if (column === 'notes') {
        return value || '';
      }
      return String(value);
    })));
    
    if (column === 'compensation' || column === 'teamPercentage' || column === 'budgetDifference') {
      return values.sort((a, b) => {
        const aNum = parseFloat(String(a).replace(/[^0-9.-]+/g, ""));
        const bNum = parseFloat(String(b).replace(/[^0-9.-]+/g, ""));
        return aNum - bNum;
      });
    } else {
      return values.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    }
  };

  const renderFilterDropdown = (column: keyof Player) => {
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
    // Calculate total pay including all additional compensation fields
    const totalPay = filteredPlayers.reduce((sum, player) => {
      const totalPlayerCompensation = player.compensation + 
        Object.entries(player)
          .filter(([key]) => key.startsWith('comp_'))
          .reduce((compSum, [_, value]) => compSum + (value as number || 0), 0);
      return sum + totalPlayerCompensation;
    }, 0);
    
    const totalTeamPercentage = filteredPlayers.reduce((sum, player) => sum + (player.teamPercentage || 0), 0);
    const totalBudgetDifference = filteredPlayers.reduce((sum, player) => sum + (player.budgetDifference || 0), 0);
    const totalScholarship = filteredPlayers.reduce((sum, player) => sum + player.scholarship_perc, 0);

    // Calculate monthly pay totals by summing up each player's monthly compensation values
    const monthlyPay = Array(12).fill(0);
    
    filteredPlayers.forEach(player => {
      if (player.monthlyCompensation) {
        for (let i = 0; i < 12; i++) {
          monthlyPay[i] += (player.monthlyCompensation[i] || 0);
        }
      } else if (player.compensation) {
        // If player doesn't have monthly data, distribute their total compensation evenly across months
        const totalPlayerCompensation = player.compensation + 
          Object.entries(player)
            .filter(([key]) => key.startsWith('comp_'))
            .reduce((compSum, [_, value]) => compSum + (value as number || 0), 0);
        const monthlyAmount = totalPlayerCompensation / 12;
        for (let i = 0; i < 12; i++) {
          monthlyPay[i] += monthlyAmount;
        }
      }
    });

    return {
      totalPay,
      totalTeamPercentage,
      totalBudgetDifference,
      totalScholarship,
      monthlyPay
    };
  }, [filteredPlayers]);

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
          totalPay: grouped[group].reduce((sum, p) => sum + (p.compensation || 0), 0),
          totalTeamPercentage: grouped[group].reduce((sum, p) => sum + (p.teamPercentage || 0), 0),
          totalBudgetDifference: grouped[group].reduce((sum, p) => sum + (p.budgetDifference || 0), 0),
          totalScholarship: grouped[group].reduce((sum, p) => sum + (p.scholarship_perc || 0), 0),
          monthlyPay: Array(12).fill(0).map((_, i) => {
            return grouped[group].reduce((sum, p) => {
              if (p.monthlyCompensation && p.monthlyCompensation[i]) {
                return sum + p.monthlyCompensation[i];
              } else if (p.compensation) {
                return sum + p.compensation / 12;
              }
              return sum;
            }, 0);
          })
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
        console.log('displayValue', displayValue);
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

  const renderTable = (players: Player[], summary: typeof summaryData, groupHeader: string) => (
    <table className={styles.table}>
      <thead>
        <tr><th colSpan={effectiveCompAccess ? (showMonthlyBreakdown ? 23 : 11) : 7}>{groupHeader}</th></tr>
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
                  <span onClick={() => handleSort('compensation')}>Pay</span>
                  <FaFilter 
                    onClick={() => toggleFilter('compensation')} 
                    className={isFilterActive('compensation') ? styles.activeFilter : styles.inactiveFilter}
                  />
                  {activeFilter === 'compensation' && (
                    <div ref={filterRef}>
                      {renderFilterDropdown('compensation')}
                    </div>
                  )}
                  <button 
                    onClick={() => setShowMonthlyBreakdown(!showMonthlyBreakdown)}
                    className={styles.toggleButton}
                  >
                    {showMonthlyBreakdown ? <FaMinus color="red" /> : <FaPlus color="green" />}
                  </button>
                </div>
              </th>
              {showMonthlyBreakdown && getFiscalYearMonths(selectedMonth).map((monthWithYear) => {
                // Split the month and year
                const [month, year] = monthWithYear.split(' ');
                // Format as short month + last 2 digits of year (e.g., "Feb 25")
                const shortYear = year.slice(-2);
                
                return (
                  <th key={monthWithYear}>{month} {shortYear}</th>
                );
              })}
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
              <span onClick={() => handleSort('notes')}>Notes</span>
              <FaFilter 
                onClick={() => toggleFilter('notes')} 
                className={isFilterActive('notes') ? styles.activeFilter : styles.inactiveFilter}
              />
              {activeFilter === 'notes' && (
                <div ref={filterRef}>
                  {renderFilterDropdown('notes')}
                </div>
              )}
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        {players.map(player => {
          // Add debug log for target player
          const isTargetPlayer = player.athlete_id === TEST_ATHLETE_ID;
          
          if (isTargetPlayer) {
            console.log(`Debug: Found target player ${player.name__first} ${player.name__last}`);
            console.log(`Debug: monthlyCompensation:`, player.monthlyCompensation);
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
                  <td>{formatPayment(player.compensation || 0)}</td>
                  {showMonthlyBreakdown && getFiscalYearMonths(selectedMonth).map((monthWithYear) => {
                    // Split the month and year
                    const [month, year] = monthWithYear.split(' ');
                    
                    // Get the monthly value
                    const monthlyValue = getMonthlyValue(player, month);
                    
                    // Debug logs for the target player
                    if (isTargetPlayer && monthlyValue > 0) {
                      console.log(`Debug: ${month} ${year} value = ${monthlyValue}`);
                    }
                    
                    return (
                      <td key={monthWithYear}>
                        {formatPayment(monthlyValue)}
                      </td>
                    );
                  })}
                  <td>{formatPercentage(player.teamPercentage || 0)}</td>
                  <td>{formatPercentage(player.positionPercentage || 0)}</td>
                  <td style={{ color: Math.abs(player.budgetDifference || 0) < 500 ? 'black' : ((player.budgetDifference || 0) > 0 ? 'red' : 'green') }}>
                    {formatBudgetDifference(player.budgetDifference || 0)}
                  </td>
                </>
              )}
              <td>{player.notes || ''}</td>
            </tr>
          );
        })}
        <tr className={styles.summaryRow}>
          <td colSpan={effectiveCompAccess ? 5 : 5}>Total</td>
          <td>{summary.totalScholarship}</td>
          {effectiveCompAccess && (
            <>
              <td>{formatPayment(summary.totalPay)}</td>
              {showMonthlyBreakdown && getFiscalYearMonths(selectedMonth).map((monthWithYear, index) => {
                const monthlyValue = summary.monthlyPay && summary.monthlyPay.length >= 12 
                  ? summary.monthlyPay[index] 
                  : (summary.totalPay || 0) / 12;
                
                return (
                  <td key={monthWithYear}>
                    {formatPayment(monthlyValue || 0)}
                  </td>
                );
              })}
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

  // Update debug logs in useEffect to use the new target player ID
  useEffect(() => {
    if (!loading && players.length > 0) {
      console.log("DEBUG-LISTVIEW: After setting players state");
      
      // Try to find our target player for debugging
      const targetPlayer = players.find(p => p.athlete_id === TEST_ATHLETE_ID);
      if (targetPlayer) {
        console.log("DEBUG-LISTVIEW: Found target player in state:", targetPlayer.name__first, targetPlayer.name__last);
        console.log("Total compensation:", targetPlayer.compensation);
        
        // Log raw monthly compensation object for the target player
        console.log("Raw monthlyCompensation object:", targetPlayer.monthlyCompensation);
        
        // Log monthly values one by one
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        console.log("Monthly values by month:");
        months.forEach((month) => {
          const value = getMonthlyValue(targetPlayer, month);
          console.log(`${month}: ${value}`);
        });
        
        // Also log the fiscal year months
        console.log("Fiscal year monthly values:");
        getFiscalYearMonths(selectedMonth).forEach((monthWithYear) => {
          const [month] = monthWithYear.split(' ');
          const value = getMonthlyValue(targetPlayer, month);
          console.log(`${monthWithYear}: ${value}`);
        });
      }
    }
  }, [loading, players, selectedMonth]);

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
          effectiveYear={Math.max(selectedYear, selectedAthlete.starting_season)}
          selectedScenario={selectedScenario}
          targetScenario={targetScenario || ''}
        />
      )}
    </div>
  );
};

export default ListView;
