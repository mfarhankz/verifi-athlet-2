import { supabase } from "../lib/supabaseClient";
import { Player } from '../types/Player';
import type { Alert } from '../types/database';
import styles from '../components/cap-manager/KanbanBoard.module.css';
import { useEffect, useState } from "react";
import { useCustomer } from "@/contexts/CustomerContext";
import { DepthChartSubPosition, DepthChartFormation } from '@/types/depthChart';

export const CURRENT_YEAR = new Date().getFullYear();
// Define test athlete ID as a constant to use throughout the codebase
export const TEST_ATHLETE_ID = 'df5615c8-ed4e-4a9b-8f82-c4aeaa237c25';

export const getYearOptions = (currentYear: number = CURRENT_YEAR): number[] => {
  const startYear = Math.min(2022, currentYear);
  const endYear = currentYear + 6;
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
};

export const formatYear = (year: string, redshirtStatus: string) => {
  if (redshirtStatus === "has") {
    return `T${year}`;
  } else if (redshirtStatus === "used") {
    return `R${year}`;
  }
  return year;
};

export const formatPhoneNumber = (phoneNumber: string | null | undefined): string => {
  if (!phoneNumber) return "";
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");
  
  // Check if it's a valid US phone number (10 digits)
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Check if it's a valid US phone number with country code (11 digits starting with 1)
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  // If it doesn't match expected format, return the original
  return phoneNumber;
};

export const adjustPlayerForYear = (player: Player, selectedYear: number): Player | null => {
  const yearDifference = selectedYear - player.starting_season;
  const updatedEligRemaining = Math.max(0, player.elig_remaining - yearDifference);
  
  if (updatedEligRemaining <= 0) {
    return null; // Player is no longer eligible
  }

  let updatedYear = player.year;
  for (let i = 0; i < yearDifference; i++) {
    if (updatedYear === 'FR') updatedYear = 'SO';
    else if (updatedYear === 'SO') updatedYear = 'JR';
    else if (updatedYear === 'JR') updatedYear = 'SR';
    else if (updatedYear === 'SR' || updatedYear === 'GR') updatedYear = 'GR';
  }

  return {
    ...player,
    year: formatYear(updatedYear, player.redshirt_status),
    elig_remaining: updatedEligRemaining,
  };
};

interface AdjustedPlayersResult {
  players: Player[];
  deadMoney: Player[];
  totalTeamCompensation: number;
  positionCompensation: { [key: string]: number };
}

export const fetchAdjustedPlayers = async (
  team: string, 
  selectedYear: number, 
  selectedScenario: string,
  activeFilters: { [key: string]: string[] | string },
  selectedMonth: string = 'Jan',
  athleteId?: string
): Promise<AdjustedPlayersResult> => {
  // Split scenarios and add empty scenario to the filter
  const scenarios = selectedScenario.split(',').map(s => s.trim()).filter(s => s);
  const scenarioFilter = [...scenarios, '', 'aiuhgahfaoiuhfkjnq'];
  // Modify the initial query to handle athleteId
  let query = supabase
    .from("athletes")
    .select(`
      id, 
      name__first, 
      name__last, 
      position, 
      image_url,
      hide,
      pos_rank,
      elig_remaining, 
      year, 
      scholarship_perc,
      redshirt_status, 
      notes,
      starting_season,
      commit,
      injury,
      scenario,
      ending_season,
      tier
    `)
    .eq('customer_id', team)
    .neq('hide', 1)
    .in('scenario', scenarioFilter);

  // Add athleteId filter if provided
  if (athleteId) {
    query = query.eq('id', athleteId);
  }

  const { data: athletesData, error: athletesError } = await query;

  if (athletesError) {
    return { players: [], deadMoney: [], totalTeamCompensation: 0, positionCompensation: {} };
  }
  
  // Fetch yearly compensation data (month='00')
  const { data: compensationData, error: compensationError } = await supabase
    .from("compensation")
    .select(`
      *,
      compensation_extra (
        budget_name,
        amount
      )
    `)
    .in('athlete_id', athletesData.map((a: { id: any; }) => a.id))
    .eq('month', '00')
    .in('scenario', scenarioFilter);
  if (compensationError) {
    return { players: [], deadMoney: [], totalTeamCompensation: 0, positionCompensation: {} };
  }

  // Fetch monthly compensation data for fiscal year calculations
  const { data: monthlyCompensationData, error: monthlyCompensationError } = await supabase
    .from("compensation")
    .select(`
      *,
      compensation_extra (
        budget_name,
        amount
      )
    `)
    .in('athlete_id', athletesData.map((a: { id: any; }) => a.id))
    .neq('month', '00')
    .in('scenario', scenarioFilter);
  
  if (monthlyCompensationError) {
    console.error("Error fetching monthly compensation data:", monthlyCompensationError);
    return { players: [], deadMoney: [], totalTeamCompensation: 0, positionCompensation: {} };
  }

  // Process compensation data to include extra fields
  const processedCompensationData = compensationData.map((comp: any) => {
    const baseComp = { ...comp };
    
    // Filter out 'scholarships_dollars' from compensation_extra
    if (comp.compensation_extra) {
      comp.compensation_extra = comp.compensation_extra.filter(
        (extra: { budget_name: string }) => extra.budget_name !== 'scholarships_dollars'
      );
      comp.compensation_extra.forEach((extra: { budget_name: string; amount: number; }) => {
        baseComp[`comp_${extra.budget_name}`] = extra.amount;
      });
    }
    
    delete baseComp.compensation_extra;
    
    // Only log if it's for the specific athlete
    if (baseComp.athlete_id === TEST_ATHLETE_ID) {
      // Debug log removed('baseComp', baseComp);
    }

    return baseComp;
  });

  // Process monthly compensation data similarly
  const processedMonthlyCompensationData = monthlyCompensationData.map((comp: any) => {
    const baseComp = { ...comp };
    // Filter out 'scholarships_dollars' from compensation_extra
    if (comp.compensation_extra) {
      comp.compensation_extra = comp.compensation_extra.filter(
        (extra: { budget_name: string }) => extra.budget_name !== 'scholarships_dollars'
      );
      comp.compensation_extra.forEach((extra: { budget_name: string; amount: number; }) => {
        baseComp[`comp_${extra.budget_name}`] = extra.amount;
      });
    }
    delete baseComp.compensation_extra;
    return baseComp;
  });

  // Define the months order for fiscal year calculations
  const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Use processedCompensationData instead of compensationData in the rest of your code
  const uniqueCompensationData = processedCompensationData.reduce((acc: any[], curr: any) => {
    const key = `${curr.athlete_id}_${curr.year}_${curr.month}`;
    const existingIndex = acc.findIndex((item: any) => 
      `${item.athlete_id}_${item.year}_${item.month}` === key
    );

    if (existingIndex === -1) {
      acc.push(curr);
    } else if (curr.scenario === selectedScenario && acc[existingIndex].scenario !== selectedScenario) {
      acc[existingIndex] = curr;
    }

    return acc;
  }, []);

  // Group monthly compensation data by athlete and year
  const monthlyCompByAthleteAndYear = processedMonthlyCompensationData.reduce((acc: any, curr: any) => {
    const key = `${curr.athlete_id}_${curr.year}`;
    if (!acc[key]) {
      acc[key] = {};
    }
    // Add entry for this month
    acc[key][curr.month] = {
      amount: curr.amount as number,
      // Also include any additional budget fields
      ...Object.entries(curr)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((obj, [key, value]) => {
          obj[key] = value as number;
          return obj;
        }, {} as Record<string, number>)
    };
    return acc;
  }, {});

  // Fetch override data from athletes_override_category table
  const { data: overridesData, error: overridesError } = await supabase
    .from("athletes_override_category")
    .select('*')
    .eq('month', '00')
    .in('scenario', scenarioFilter)
    // Then by most recent season
    .order('season_override', { ascending: false });

  if (overridesError) {
    console.error("Error fetching overrides data:", overridesError);
    return { players: [], deadMoney: [], totalTeamCompensation: 0, positionCompensation: {} };
  }

  interface Override {
    athlete_id: string;
    category: string;
    scenario: string;
    season_override: number;
    month: string;
    value: string;
  }

  // First filter out any overrides with season_override > selectedYear
  const validOverridesData = overridesData.filter((override: Override) => 
    override.season_override <= selectedYear
  );

  // Sort overrides based on scenario priority and season_override
  const sortedOverridesData = validOverridesData.sort((a: Override, b: Override) => {
    const aIndex = scenarioFilter.indexOf(a.scenario);
    const bIndex = scenarioFilter.indexOf(b.scenario);
    if (aIndex === bIndex) {
      // If scenarios have same priority, use season_override
      return b.season_override - a.season_override;
    }
    return aIndex - bIndex;
  });

  // Deduplicate overrides based on athlete_id, category, and scenario
  // Keep only the highest season_override <= selectedYear for each combination
  const dedupedOverridesData = sortedOverridesData.reduce((acc: any[], curr: any) => {
    const key = `${curr.athlete_id}_${curr.category}_${curr.scenario}`;
    const existingIndex = acc.findIndex(item => 
      `${item.athlete_id}_${item.category}_${item.scenario}` === key
    );

    // If no existing entry or current entry has a more recent season_override
    // (but still <= selectedYear), use the current entry
    if (existingIndex === -1) {
      acc.push(curr);
    } else {
      const existing = acc[existingIndex];
      if (curr.season_override > existing.season_override && curr.season_override <= selectedYear) {
        acc[existingIndex] = curr;
      }
    }
    return acc;
  }, []);

  // Process overrides by athlete
  const processedOverrides = dedupedOverridesData.reduce((acc: any[], curr: any) => {
    // Convert value based on category type
    let processedValue = curr.value;
    switch (curr.category) {
      case 'pos_rank':
      case 'ending_season':
        processedValue = parseInt(curr.value);
        break;
        case 'tier':
          processedValue = parseInt(curr.value);
          break;
      case 'scholarship_perc':
        processedValue = parseFloat(curr.value);
        break;
      case 'hide':
      case 'commit':
      case 'injury':
        processedValue = parseInt(curr.value) === 1;
        break;
      default:
        processedValue = curr.value;
    }

    acc.push({
      athlete_id: curr.athlete_id,
      season_override: curr.season_override,
      month: curr.month,
      scenario: curr.scenario,
      [curr.category]: processedValue
    });

    return acc;
  }, []);

  // Filter overrides based on the selectedYear and athlete's starting_season
  const filteredOverridesData = processedOverrides.filter((override: any) => {
    const athlete = athletesData.find((a: any) => a.id === override.athlete_id);
    if (!athlete) return false;
    
    if (athlete.starting_season <= selectedYear) {
      return override.season_override <= selectedYear;
    } else {
      return override.season_override <= athlete.starting_season;
    }
  });

  // Combine athletesData and uniqueOverridesData
  const athleteMergedData = athletesData.map((athlete: any) => {
    // Get all overrides for this athlete
    const athleteOverrides = filteredOverridesData.filter((override: any) => 
      override.athlete_id === athlete.id
    );

    if (athleteOverrides.length > 0) {
      // Start with the base athlete data
      const mergedAthlete = { ...athlete };

      // Apply each override's specific category
      athleteOverrides.forEach((override: { 
        athlete_id: string;
        season_override: number;
        month: string;
        scenario: string;
        [key: string]: any;  // For the dynamic category field
      }) => {
        // Find the category field in the override (it will be the only field besides the metadata fields)
        const categoryField = Object.keys(override).find(key => 
          !['athlete_id', 'season_override', 'month', 'scenario'].includes(key)
        );

        if (categoryField) {
          // Apply just this category's value
          mergedAthlete[categoryField] = override[categoryField];

          // Update starting_season if this override's season is later
          if (override.season_override > mergedAthlete.starting_season) {
            mergedAthlete.starting_season = override.season_override;
          }
        }
      });

      return mergedAthlete;
    }
    return athlete;
  });
  // // Debug log removed('athleteMergedData', athleteMergedData);
  
  // Create a map that groups compensation by athlete
  const athleteCompensationMap = new Map();
  
  // Group all compensation entries by athlete_id
  uniqueCompensationData.forEach((comp: any) => {
    if (!athleteCompensationMap.has(comp.athlete_id)) {
      athleteCompensationMap.set(comp.athlete_id, []);
    }
    athleteCompensationMap.get(comp.athlete_id).push(comp);
  });

  // Create a map for yearly compensation values
  const yearlyCompensationMap = new Map();
  
  // Populate the yearly compensation map with values where month === '00'
  uniqueCompensationData.forEach((comp: any) => {
    if (comp.month === '00') {
      const key = `${comp.athlete_id}_${comp.year}`;
      yearlyCompensationMap.set(key, comp.amount || 0);
      
      // Log yearly compensation for the specific athlete
      if (comp.athlete_id === TEST_ATHLETE_ID) {
        // Debug log removed(`DEBUG: Yearly compensation for athlete 2adca696 - Year ${comp.year}, Amount: ${comp.amount}, Scenario: ${comp.scenario}`);
      }
    }
  });

  // Now add code to carry forward compensation values to future years based on eligibility
  // Get all unique athlete IDs from the raw data
  const uniqueAthleteIds = [...new Set(athletesData.map((a: any) => a.id))];

  // For each athlete
  uniqueAthleteIds.forEach((athleteId) => {
    const athlete = athletesData.find((a: any) => a.id === athleteId);
    if (!athlete) return;
    
    // Calculate the ending year based on starting_season and eligibility
    const startingYear = athlete.starting_season;
    const eligRemaining = athlete.elig_remaining || 0;
    const endingYear = athlete.ending_season || (startingYear + eligRemaining - 1);
    
    // Get all years that have compensation data for this athlete
    const yearsWithComp = Array.from(yearlyCompensationMap.keys())
      .filter(key => key.startsWith(`${athleteId}_`))
      .map(key => parseInt(key.split('_')[1]))
      .sort((a, b) => a - b);
    
    if (yearsWithComp.length === 0) return;
    
    // If we have compensation data for this athlete
    const isTargetAthlete = athleteId === TEST_ATHLETE_ID;
    if (isTargetAthlete) {
      // Debug log removed(`DEBUG-FORWARD: Athlete ID ${athleteId} (${athlete.name__first} ${athlete.name__last})`);
      // Debug log removed(`DEBUG-FORWARD: Starting year: ${startingYear}, Eligibility remaining: ${eligRemaining}, Ending year: ${endingYear}`);
      // Debug log removed(`DEBUG-FORWARD: Years with compensation data: ${yearsWithComp.join(', ')}`);
    }
    
    // For each year where we have data, carry it forward until the next year with data or until ending year
    for (let i = 0; i < yearsWithComp.length; i++) {
      const currentYear = yearsWithComp[i];
      const nextYearWithData = yearsWithComp[i + 1] || (endingYear + 1);
      const currentYearAmount = yearlyCompensationMap.get(`${athleteId}_${currentYear}`);
      
      if (isTargetAthlete) {
        // Debug log removed(`DEBUG-FORWARD: Considering year ${currentYear}`);
        // Debug log removed(`DEBUG-FORWARD: Next year with data: ${nextYearWithData}`);
        // Debug log removed(`DEBUG-FORWARD: Current year amount: ${currentYearAmount}`);
      }
      
      // Carry the current year amount forward to all years until the next year with data
      // But don't go beyond the ending year
      const carryForwardUntil = Math.min(nextYearWithData - 1, endingYear);
      
      for (let year = currentYear + 1; year <= carryForwardUntil; year++) {
        // Only set if not already set
        const key = `${athleteId}_${year}`;
        if (!yearlyCompensationMap.has(key) && currentYearAmount) {
          yearlyCompensationMap.set(key, currentYearAmount);
          
          if (isTargetAthlete) {
            // Debug log removed(`DEBUG-FORWARD: Carrying forward compensation to year ${year}: ${currentYearAmount}`);
          }
        }
      }
    }
  });

  // After carrying values forward, log the values for the target athlete
  if (TEST_ATHLETE_ID) {
    const allYearsKeys = Array.from(yearlyCompensationMap.keys())
      .filter(key => key.startsWith(`${TEST_ATHLETE_ID}_`))
      .sort();
      
    // Debug log removed('DEBUG-FORWARD: Final yearly compensation map for target athlete:');
    allYearsKeys.forEach(key => {
      // Debug log removed(`DEBUG-FORWARD: ${key}: ${yearlyCompensationMap.get(key)}`);
    });
  }

  // Log monthly compensation data for the specific athlete
  Object.entries(monthlyCompByAthleteAndYear).forEach(([key, months]) => {
    if (key.includes(TEST_ATHLETE_ID)) {
      // // Debug log removed(`DEBUG: Monthly data for athlete - Key: ${key}`);
      // // Debug log removed('Monthly data:', months);
    }
  });
  
  // // Debug log removed('athleteCompensationMap', athleteCompensationMap);
  // Helper function to calculate fiscal year compensation based on selected month
  const calculateFiscalYearCompensation = (
    athleteId: string, 
    year: number, 
    extraProps: Record<string, any> = {}
  ): { amount: number; monthlyValues: Record<string, number>; [key: string]: any } => {
    // Add debug logs for the specific athlete
    const isTargetAthlete = athleteId === TEST_ATHLETE_ID;
    
    if (isTargetAthlete) {
      // Debug log removed(`DEBUG-FY: Starting fiscal year calc for athlete 94dcde39 - Year: ${year}, Month: ${selectedMonth}`);
      // Debug log removed('DEBUG-FY: Extra Props:', extraProps);
    }
    
    // Find the index of the selected month
    const selectedMonthIndex = MONTH_ORDER.indexOf(selectedMonth);
    if (selectedMonthIndex === -1) return { amount: 0, monthlyValues: {}, ...extraProps };
    
    // Get the yearly compensation values
    const currentYearComp = yearlyCompensationMap.get(`${athleteId}_${year}`) || 0;
    let nextYearComp = yearlyCompensationMap.get(`${athleteId}_${year + 1}`) || 0;

    // If next year comp is 0, but current year comp exists, carry forward the value
    if (nextYearComp === 0 && currentYearComp > 0) {
      // Check if the athlete is eligible for the next year
      const athlete = athletesData.find((a: any) => a.id === athleteId);
      if (athlete) {
        const startingYear = athlete.starting_season;
        const eligRemaining = athlete.elig_remaining || 0;
        const endingYear = athlete.ending_season || (startingYear + eligRemaining - 1);
        
        // If next year is within eligibility, use current year's value
        if (year + 1 <= endingYear) {
          nextYearComp = currentYearComp;
          
          if (isTargetAthlete) {
            // Debug log removed(`DEBUG-FY: Carrying forward current year comp to next year: ${nextYearComp}`);
          }
        }
      }
    }

    if (isTargetAthlete) {
      // Debug log removed(`DEBUG-FY: Current year comp (${year}): ${currentYearComp}`);
      // Debug log removed(`DEBUG-FY: Next year comp (${year + 1}): ${nextYearComp}`);
    }
    
    // Get the monthly compensation data
    const currentYearKey = `${athleteId}_${year}`;
    const nextYearKey = `${athleteId}_${year + 1}`;
    const currentYearMonthlyData = monthlyCompByAthleteAndYear[currentYearKey] || {};
    const nextYearMonthlyData = monthlyCompByAthleteAndYear[nextYearKey] || {};
    
    // Track the selected scenario
    const scenario = extraProps['scenario'] || '';
    
    if (isTargetAthlete) {
      // Debug log removed(`DEBUG-FY: Using scenario: ${scenario}, Selected scenario: ${selectedScenario}`);
      // Debug log removed('DEBUG-FY: Current year monthly data:', currentYearMonthlyData);
      // Debug log removed('DEBUG-FY: Next year monthly data:', nextYearMonthlyData);
    }
    
    // Calculate total for fiscal year: selectedMonth of current year to previous month of next year
    let fiscalYearTotal = 0;
    const extraTotals: Record<string, number> = {};
    
    // Create a map to store calculated monthly values for later use
    const calculatedMonthlyValues: Record<string, number> = {};
    
    // Initialize extra totals
    Object.keys(extraProps).forEach(key => {
      extraTotals[key] = 0;
    });
    
    // Helper function to get the monthly value following the correct priority order
    /**
     * Returns the monthly value for a given month, following this priority:
     * 1. Monthly value for selected scenario
     * 2. Annual value for selected scenario (divided by 12)
     * 3. Monthly value for no scenario
     * 4. Annual value for no scenario (divided by 12)
     *
     * @param allMonthlyData - all monthly data for the year (object keyed by month)
     * @param currentMonth - the month to get value for (e.g., 'Jan')
     * @param annualSelectedScenario - annual value for selected scenario
     * @param annualNoScenario - annual value for no scenario
     * @returns number
     */
    const getMonthlyValue = (
      allMonthlyData: Record<string, any>,
      currentMonth: string,
      annualSelectedScenario: number,
      annualNoScenario: number
    ): number => {
      const monthData = allMonthlyData[currentMonth];
      // 1. Monthly value for selected scenario (or no scenario if selectedScenario is empty)
      if (monthData && (
        (selectedScenario && monthData.scenario === selectedScenario) ||
        (!selectedScenario && (!monthData.scenario || monthData.scenario === ''))
      )) {
        if (isTargetAthlete) {
          // Debug log removed(`DEBUG-MV: Using monthly value for selected scenario (or no scenario if none selected):`, monthData.amount);
        }
        return monthData.amount || 0;
      }
      // 2. Annual value for selected scenario
      if (annualSelectedScenario > 0) {
        if (isTargetAthlete) {
          // Debug log removed(`DEBUG-MV: Using annual value for selected scenario / 12:`, annualSelectedScenario / 12);
        }
        return annualSelectedScenario / 12;
      }
      // 3. Monthly value for no scenario
      if (monthData && (!monthData.scenario || monthData.scenario === '')) {
        if (isTargetAthlete) {
          // Debug log removed(`DEBUG-MV: Using monthly value for no scenario:`, monthData.amount);
        }
        return monthData.amount || 0;
      }
      // 4. Annual value for no scenario
      if (annualNoScenario > 0) {
        if (isTargetAthlete) {
          // Debug log removed(`DEBUG-MV: Using annual value for no scenario / 12:`, annualNoScenario / 12);
        }
        return annualNoScenario / 12;
      }
      // Default fallback
      if (isTargetAthlete) {
        // Debug log removed(`DEBUG-MV: No value found, returning 0`);
      }
      return 0;
    };
    
    // Helper function to gather extra compensation
    const gatherExtraCompValues = (
      monthData: any, 
      extraProps: Record<string, any>,
      isCurrentYear: boolean
    ): void => {
      // If we have monthly data and it's either from the selected scenario or we're using base data
      if (monthData && 
          (monthData.scenario === selectedScenario || 
           (!monthData.scenario || monthData.scenario === ''))) {
        // Add extra amounts from the monthly data
        Object.entries(monthData)
          .filter(([key]) => key.startsWith('comp_'))
          .forEach(([key, value]) => {
            extraTotals[key] = (extraTotals[key] || 0) + (value as number || 0);
          });
      } else {
        // Use the yearly extra props
        const props = isCurrentYear ? extraProps : (extraProps.comp_next_year || extraProps);
        Object.entries(props)
          .filter(([key]) => key.startsWith('comp_'))
          .forEach(([key, value]) => {
            extraTotals[key] = (extraTotals[key] || 0) + (value as number || 0) / 12;
          });
      }
    };
    
    // Current year months (selectedMonth to Dec)
    for (let i = selectedMonthIndex; i < 12; i++) {
      const month = MONTH_ORDER[i];
      // Get the monthly value based on priority
      const monthlyValue = getMonthlyValue(
        currentYearMonthlyData,
        month,
        currentYearComp,
        yearlyCompensationMap.get(`${athleteId}_${year}`) || 0
      );
      fiscalYearTotal += monthlyValue;
      // Store the calculated monthly value for later use
      calculatedMonthlyValues[month] = monthlyValue;
      if (isTargetAthlete) {
        // Debug log removed(`DEBUG-FY: ${month} ${year} value: ${monthlyValue} (running total: ${fiscalYearTotal})`);
        // Debug log removed(`DEBUG-FY: monthData for ${month}:`, currentYearMonthlyData[month]);
      }
      // Gather extra compensation values
      gatherExtraCompValues(currentYearMonthlyData[month], extraProps, true);
    }
    // Next year months (Jan to month before selectedMonth)
    for (let i = 0; i < selectedMonthIndex; i++) {
      const month = MONTH_ORDER[i];
      // Get the monthly value based on priority, using next year's annual value
      const monthlyValue = getMonthlyValue(
        nextYearMonthlyData,
        month,
        nextYearComp,
        yearlyCompensationMap.get(`${athleteId}_${year + 1}`) || 0
      );
      fiscalYearTotal += monthlyValue;
      // Store the calculated monthly value for later use
      calculatedMonthlyValues[month] = monthlyValue;
      if (isTargetAthlete) {
        // Debug log removed(`DEBUG-FY: ${month} ${year + 1} value: ${monthlyValue} (running total: ${fiscalYearTotal})`);
        // Debug log removed(`DEBUG-FY: monthData for ${month}:`, nextYearMonthlyData[month]);
      }
      // Gather extra compensation values
      gatherExtraCompValues(nextYearMonthlyData[month], extraProps, false);
    }
    
    if (isTargetAthlete) {
      // Debug log removed(`DEBUG-FY: Final fiscal year total: ${fiscalYearTotal}`);
      // Debug log removed(`DEBUG-FY: Final calculatedMonthlyValues:`, calculatedMonthlyValues);
    }
    
    return {
      amount: fiscalYearTotal,
      ...extraTotals,
      // Include the calculated monthly values for later use
      monthlyValues: calculatedMonthlyValues
    };
  };

  const athletesWithCompensation = athleteMergedData.map((athlete: any) => {
      // Log athlete info for the target athlete
      const isTargetAthlete = athlete.id === TEST_ATHLETE_ID;
      
      if (isTargetAthlete) {
        // Debug log removed('DEBUG-ATH: Found target athlete:', athlete.name__first, athlete.name__last);
      }
      
      const originalYear = athlete.year; // Store original year
      
      // Get all compensation data for this athlete
      const athleteCompData = athleteCompensationMap.get(athlete.id) || [];
      
      if (isTargetAthlete) {
        // Debug log removed('DEBUG-ATH: Athlete yearly compensation data (athleteCompData):', athleteCompData);
        
        // SPECIAL DEBUGGING: Get the monthly data directly from the source
        const targetAthleteKeys = Object.keys(monthlyCompByAthleteAndYear).filter(key => 
          key.includes(athlete.id)
        );
        if (targetAthleteKeys.length > 0) {
          // Debug log removed('DEBUG-ATH: Athlete monthly compensation data keys:', targetAthleteKeys);
          targetAthleteKeys.forEach(key => {
            // Debug log removed(`DEBUG-ATH: Monthly data for key ${key}:`, monthlyCompByAthleteAndYear[key]);
          });
        } else {
          // Debug log removed('DEBUG-ATH: No monthly data found for this athlete');
        }
      }
      
      // Find the best matching compensation based on priority
      let matchingCompensation: any = null;
      let nextYearMatchingCompensation: any = null;
      
      if (athlete.starting_season > selectedYear) {
        // For future players, prioritize data equal to their starting season
        // Then fallback to current year and previous years
        const sortedCompData = [...athleteCompData].sort((a, b) => {
          // If one matches the starting season exactly, prioritize it
          if (a.year === athlete.starting_season && b.year !== athlete.starting_season) return -1;
          if (b.year === athlete.starting_season && a.year !== athlete.starting_season) return 1;
          
          // Otherwise prioritize by most recent year
          return b.year - a.year;
        });
        
        matchingCompensation = sortedCompData[0];
        // Try to find next year's compensation
        nextYearMatchingCompensation = sortedCompData.find(comp => 
          comp.year === (matchingCompensation?.year || 0) + 1
        );
      } else {
        // For current or past players, keep existing behavior (most recent year)
        const sortedCompData = [...athleteCompData].sort((a, b) => {
          // Only consider years up to selectedYear
          if (a.year > selectedYear && b.year <= selectedYear) return 1;
          if (b.year > selectedYear && a.year <= selectedYear) return -1;
          // Normal sorting by recent year
          return b.year - a.year;
        });
        
        // Get the most recent compensation data that's not beyond selectedYear
        matchingCompensation = sortedCompData.find(comp => comp.year <= selectedYear);
        
        // Try to find next year's compensation
        const currentYear = matchingCompensation?.year || selectedYear;
        nextYearMatchingCompensation = sortedCompData.find(comp => comp.year === currentYear + 1);
      }

      if (isTargetAthlete) {
        // Debug log removed('DEBUG-ATH: Matching compensation for current year:', matchingCompensation);
        // Debug log removed('DEBUG-ATH: Matching compensation for next year:', nextYearMatchingCompensation);
      }

      // Extract extra comp fields from matching compensation
      const extraFields: Record<string, any> = {};
      if (matchingCompensation) {
        Object.entries(matchingCompensation).forEach(([key, value]) => {
          if (key.startsWith('comp_')) {
            extraFields[key] = value;
          }
        });
        // Also add the scenario information
        extraFields['scenario'] = matchingCompensation.scenario || '';
      }
      
      if (isTargetAthlete) {
        // Debug log removed('DEBUG-ATH: Extra fields:', extraFields);
      }
      
      // Add next year's compensation to the yearlyCompensationMap if available
      if (nextYearMatchingCompensation) {
        const nextYear = (matchingCompensation?.year || selectedYear) + 1;
        const nextYearKey = `${athlete.id}_${nextYear}`;
        yearlyCompensationMap.set(nextYearKey, nextYearMatchingCompensation.amount || 0);
        
        if (isTargetAthlete) {
          // Debug log removed(`DEBUG-ATH: Added next year comp to map: ${nextYearKey} = ${nextYearMatchingCompensation.amount}`);
        }
      }

      // Calculate fiscal year compensation if we have monthly data
      const year = (matchingCompensation?.year) || selectedYear;
      const fiscalYearCompensation = calculateFiscalYearCompensation(athlete.id, year, extraFields);

      if (isTargetAthlete) {
        // Debug log removed('DEBUG-ATH: Fiscal year compensation result:', fiscalYearCompensation);
      }

      // Create a new object with all athlete data and compensation
      const athleteWithComp = {
          ...athlete,
          ...matchingCompensation,  // This will spread all comp_* fields
          year: originalYear, // Re-apply year in case it was overwritten
          compensation: fiscalYearCompensation.amount // Always use fiscal year calculation regardless of month
      };

      // Add any extra compensation fields with comp_ prefix based on the fiscal year
      // Always use the fiscal year calculations regardless of month
      Object.entries(fiscalYearCompensation).forEach(([key, value]) => {
          if (key.startsWith('comp_')) {
              athleteWithComp[key] = value;
          }
      });
      
      // Add a field to indicate monthly compensation - use the previously calculated values
      const monthlyValues = fiscalYearCompensation.monthlyValues || {};
      const monthlyCompensationEntries: [string, number][] = MONTH_ORDER.map(month => {
        return [month, monthlyValues[month] || 0];
      });
      
      athleteWithComp.monthlyCompensation = Object.fromEntries(monthlyCompensationEntries);
      
      if (isTargetAthlete) {
        // Debug log removed('DEBUG-ATH: Final monthly compensation:', athleteWithComp.monthlyCompensation);
        // Debug log removed('DEBUG-ATH: Final total compensation:', athleteWithComp.compensation);
        
        // SPECIFIC DEBUG: Show monthlyValues directly from fiscalYearCompensation
        // Debug log removed('DEBUG-ATH: monthlyValues from fiscalYearCompensation:', monthlyValues);
        // Debug log removed('DEBUG-ATH: monthlyCompensationEntries array:', monthlyCompensationEntries);
        // Debug log removed('DEBUG-ATH: Object.fromEntries result:', Object.fromEntries(monthlyCompensationEntries));
      }
      
      return athleteWithComp;
  });
  // // Debug log removed('athletesWithCompensation', athletesWithCompensation);
    // Fetch additional data from athletes_additional_data table
    const { data: additionalData, error: additionalDataError } = await supabase
      .from("athletes_additional_data")
      .select('*')
      .in('athlete_id', athletesData.map((a: { id: any; }) => a.id))
      .or(`season.is.null,season.eq.${selectedYear}`);
    if (additionalDataError) {
      console.error("Error fetching additional data:", additionalDataError);
      return { players: [], deadMoney: [], totalTeamCompensation: 0, positionCompensation: {} };
    }
    // Create a map to store additional data by athlete_id
    const additionalDataMap = additionalData.reduce((acc: any, curr: any) => {
      if (!acc[curr.athlete_id]) {
        acc[curr.athlete_id] = {};
      }
      acc[curr.athlete_id][curr.category_name] = curr.value;
      return acc;
    }, {});
    // Merge additional data into athlete data
    const athletesWithAdditionalData = athletesWithCompensation.map((athlete: any) => {
      const additionalFields = additionalDataMap[athlete.athlete_id] || {};

      // Parse the new fields as numbers if present
      const newFields = [
        "scholarship_dollars_total",
        "scholarship_dollars_tuition",
        "scholarship_dollars_fees",
        "scholarship_dollars_room",
        "scholarship_dollars_books",
        "scholarship_dollars_meals",
        "scholarship_dollars_cost_attendance"
      ];

      const parsedFields: Record<string, number | undefined> = {};
      for (const key of newFields) {
        if (additionalFields[key] !== undefined) {
          const val = Number(additionalFields[key]);
          parsedFields[key] = isNaN(val) ? undefined : val;
        }
      }

      return {
        ...athlete,
        ...additionalFields,
        ...parsedFields, // ensures the new fields are numbers
      };
    });
    const sortedData = athletesWithAdditionalData
      .sort((a: any, b: any) => {
        if (a.position === b.position) {
          return a.pos_rank - b.pos_rank;
        }
        return a.position.localeCompare(b.position);
      })
      .map((player: any) => adjustPlayerForYear(player, selectedYear))
      .filter((player: Player | null): player is Player => player !== null)
    // Apply active filters
    // // Debug log removed('sortedData', sortedData);
    // // Debug log removed('activeFilters', activeFilters);
    const filteredData = sortedData.filter((player: Player) => {
      // Filter by position
      if (activeFilters.position && activeFilters.position.length > 0) {
        if (!activeFilters.position.includes(player.position)) {
          return false;
        }
      }
      if (player.id === TEST_ATHLETE_ID) {
        // Debug log removed('player', player);
      }

      // Filter by recruit status
      const recruitFilter = activeFilters.recruit as string | undefined;
      if (recruitFilter === 'only') {
        // Only show future players (recruits)
        if (player.starting_season <= selectedYear) {
          return false;
        }
      } else if (recruitFilter === 'off') {
        // Only show current players (non-recruits)
        if (player.starting_season > selectedYear) {
          return false;
        }
      }
      // If recruitFilter is undefined (meaning 'on'), show all players

      return true;
    });

    // Calculate total team compensation including additional comp
    const totalTeamCompensation = filteredData.reduce((sum: number, player: Player) => {
      // Skip recruits
      if (player.starting_season > selectedYear) {
        return sum;
      }
      
      const baseComp = player.compensation || 0;
      const additionalComp = Object.entries(player)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((compSum, [_, value]) => compSum + (value as number || 0), 0);
      return sum + baseComp + additionalComp;
    }, 0);

    // Calculate position compensation including additional comp
    const positionCompensation = filteredData.reduce((acc: { [key: string]: number }, player: Player) => {
      // Skip recruits
      if (player.starting_season > selectedYear) {
        return acc;
      }
      
      if (!acc[player.position]) {
        acc[player.position] = 0;
      }
      const baseComp = player.compensation || 0;
      const additionalComp = Object.entries(player)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((compSum, [_, value]) => compSum + (value as number || 0), 0);
      acc[player.position] += baseComp + additionalComp;
      return acc;
    }, {} as { [key: string]: number });

    // Split the filtered data into active and dead money players
    const activeData = filteredData.filter((player: Player) => 
      player.ending_season === 0 || player.ending_season >= selectedYear
    );

    const deadMoneyData = filteredData.filter((player: Player) => 
      player.ending_season !== 0 && player.ending_season < selectedYear
    );
    // Debug log removed('activeData', activeData.filter((player: Player) => player.athlete_id === TEST_ATHLETE_ID));
  // // Debug log removed('deadMoneyData', deadMoneyData);
    return {
      players: activeData,
      deadMoney: deadMoneyData,
      totalTeamCompensation,
      positionCompensation
    };
};

export const fetchUserDetails = async () => {
  const startTime = performance.now();
  
  try {
    if (typeof window === 'undefined') {
      console.error("fetchUserDetails called on server! This must run on the client.");
      return null;
    }
    
    // Timer for session fetch
    const sessionStart = performance.now();
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("getSession timeout")), 5000)
    );
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
    const sessionEnd = performance.now();
    
    if (!session) return null;

    // Timer for user detail fetch
    const userDetailStart = performance.now();
    const { data: userData, error: userError } = await supabase
      .from('user_detail')
      .select('*')
      .eq('id', session.user.id)
      .single();
    const userDetailEnd = performance.now();

    if (userError) {
      console.error('Error fetching user details:', userError);
      return null;
    }

    // Timer for customer data fetch
    const customerStart = performance.now();
    const { data: customerData, error: customerError } = await supabase
      .from('user_customer_map')
      .select(`
        customer_id,
        customer:customer_id (
          id,
          school_id,
          sport_id
        )
      `)
      .eq('user_id', session.user.id);
    const customerEnd = performance.now();

    // Process customer data to create a clean list of customer_id and sport pairs
    const customers = customerData?.map((item: { 
      customer_id: string;
      customer?: {
        id: string;
        school_id: string;
        sport_id: string;
      }
    }) => ({
      customer_id: item.customer_id,
      school_id: item.customer?.school_id,
      sport_id: item.customer?.sport_id
    })) || [];

    // Get active customer from localStorage or use first customer as default
    let activeCustomerId: string | null = null;
    
    // Only try to access localStorage in browser environment
    if (typeof window !== 'undefined') {
      activeCustomerId = localStorage.getItem('activeCustomerId');
    }
    
    // Validate that the active customer ID is in the user's list of customers
    const isValidActiveCustomer = activeCustomerId && 
      customers.some((customer: { customer_id: string }) => customer.customer_id === activeCustomerId);
    
    // If no active customer or active customer is invalid, set first customer as active
    if (!isValidActiveCustomer && customers.length > 0) {
      activeCustomerId = customers[0].customer_id;
      // Save to localStorage
      if (typeof window !== 'undefined' && activeCustomerId) {
        localStorage.setItem('activeCustomerId', activeCustomerId);
      }
    }

    // Get packages the user has access to
    const accessiblePackages = new Set<string>();
    
    // Timer for user override access check
    const userOverrideStart = performance.now();
    const { data: userOverrides, error: userOverrideError } = await supabase
      .from('user_access_override')
      .select('customer_package_id')
      .eq('user_id', session.user.id)
      .is('access_end', null);
    const userOverrideEnd = performance.now();
    
    if (userOverrideError) {
      console.error('Error checking user package overrides:', userOverrideError);
    } else if (userOverrides) {
      // Add all direct user overrides to the set
      userOverrides.forEach((override: { customer_package_id: string }) => {
        accessiblePackages.add(override.customer_package_id);
      });
    }
    
    // Then check for access through customer packages
    if (customers.length > 0) {
      // Get customer_ids from user's customers array
      const customerIds = customers.map((customer: { customer_id: string }) => customer.customer_id);
      
      // Timer for customer package access check
      const customerPackageStart = performance.now();
      const { data: customerPackages, error: customerPackageError } = await supabase
        .from('customer_package_map')
        .select('customer_package_id')
        .in('customer_id', customerIds)
        .is('access_end', null);
      const customerPackageEnd = performance.now();
      
      if (customerPackageError) {
        console.error('Error checking customer package access:', customerPackageError);
      } else if (customerPackages) {
        // Add all customer package accesses to the set
        customerPackages.forEach((pkg: { customer_package_id: string }) => {
          accessiblePackages.add(pkg.customer_package_id);
        });
      }
    }
    
    // Convert set to array
    const packages = Array.from(accessiblePackages);
    
    const totalTime = performance.now() - startTime;
    
    // Return both user details and customer information
    return {
      ...userData,
      customers,
      customer_id: activeCustomerId,  // This is the active customer ID
      packages  // Add packages array to the returned object
    };
  } catch (err) {
    const errorTime = performance.now() - startTime;
    return null;
  }
};

export const fetchPositionOrder = async (teamId: string, selectedYear: number) => {
  const { data, error } = await supabase
    .from('budget_non_secure_view')
    .select('position, category, year')
    .is('slot', null)
    .neq('position', '')
    .lte('year', selectedYear)
    .eq('team', teamId)
    // .order('year', { ascending: false })
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching position order:', error);
    return [];
  }
  // // Debug log removed('data', data);
  // Use a Map to remove duplicates, keeping the first occurrence (which will be from the most recent year)
  const uniquePositions = new Map();
  const categories = new Set();
  data.forEach((item: { position: string; category: string }) => {
    if (!uniquePositions.has(item.position)) {
      const abbreviatedCategory = 
        item.category === 'Offense' ? 'O' :
        item.category === 'Defense' ? 'D' :
        item.category === 'Special Teams' ? 'ST' : item.category;
      
      uniquePositions.set(item.position, {
        position: item.position,
        category: abbreviatedCategory
      });
      categories.add(abbreviatedCategory);
    }
  });

  const positionsArray = Array.from(uniquePositions.values());

  // Return the original format for backwards compatibility
  const originalFormat = positionsArray.map(item => ({
    position: item.position,
    category: item.category
  }));

  // Add a new property for the new format
  (originalFormat as any).extended = {
    positions: positionsArray,
    categories: Array.from(categories) as string[]
  };
  // // Debug log removed('originalFormat', originalFormat);
  return originalFormat;
};

export const fetchBudgetData = async (teamId: string, selectedYear: number, selectedScenario: string = '') => {
  
  const scenarios = selectedScenario.split(',').map(s => s.trim()).filter(s => s);
  const scenarioFilter = [...scenarios, '', 'aiuhgahfaoiuhfkjnq'];
  
  // First, fetch the budget data
  const { data: budgetData, error: budgetError } = await supabase
    .from('budget')
    .select('*')
    .eq('team', teamId)
    .lte('year', selectedYear)
    .in('scenario', scenarioFilter)
    .order('year', { ascending: false })
    .order('scenario', { ascending: false, nullsLast: true })
    .order('order', { ascending: true })
    .order('slot', { ascending: true });

  if (budgetError) {
    console.error('Error fetching budget data:', budgetError);
    return null;
  }

  
  if (budgetData && budgetData.length > 0) {
    const latestBudgetYear = budgetData[0].year;
    const filteredData = budgetData.filter((item: { year: number; }) => item.year === latestBudgetYear);
    
    // Fetch budget_extra data for the filtered budget rows
    const { data: budgetDataExtra, error: compensationError } = await supabase
      .from("budget_extra")
      .select('*')
      .in('budget_id', filteredData.map((item: { id: any; }) => item.id));

    if (compensationError) {
      console.error("Error fetching budget_extra data:", compensationError);
      return null;
    }

    
    // Create a map to store unique combinations
    const uniqueMap = new Map();

    // Prioritize scenario-specific data and eliminate duplicates
    filteredData.forEach((item: any) => {
      const key = `${item.team}-${item.category}-${item.position}-${item.slot}-${item.year}`;
      
      if (!uniqueMap.has(key) || (item.scenario === selectedScenario && uniqueMap.get(key).scenario !== selectedScenario)) {
        // Find all extra budgets for this budget row
        const extraBudgets = {};
        budgetDataExtra
          .filter((extra: { budget_id: number }) => extra.budget_id === item.id)
          .forEach((extra: { budget_name: string; amount: number }) => {
            (extraBudgets as {[key: string]: number})[extra.budget_name] = extra.amount;
          });
        
        // Create new item with extra budgets as columns
        const newItem = {
          ...item,
          ...extraBudgets
        };
        
        uniqueMap.set(key, newItem);
      }
    });

    // Convert the map values back to an array
    const result = Array.from(uniqueMap.values());
    return result;
  }
  return null;
};

// Update the return type of processBudgetData
interface ProcessedBudgetData {
  overallBudget: number;
  overallScholarships: number;
  overallRosterSpots: number;
  categories: Array<{ name: string; amount: number; scholarships: number; roster_spots: number; order: number }>;
  positions: { [key: string]: Array<{ name: string; amount: number; scholarships: number; roster_spots: number; order: number }> };
  slots: { [key: string]: { [key: string]: Array<{ name: number; amount: number }> } };
}

export const processBudgetData = (budgetData: any[]): ProcessedBudgetData => {
  const result = {
    overallBudget: 0,
    overallScholarships: 0,
    overallRosterSpots: 0,
    categories: [] as Array<{ name: string; amount: number; scholarships: number; roster_spots: number; order: number }>,
    positions: {} as { [key: string]: Array<{ name: string; amount: number; scholarships: number; roster_spots: number; order: number }> },
    slots: {} as { [key: string]: { [key: string]: Array<{ name: number; amount: number }> } }
  };

  budgetData.forEach((item: any) => {
    if (item.category === "overall") {
      result.overallBudget = item.amount;
      result.overallScholarships = item.scholarships;
      result.overallRosterSpots = item.roster_spots;
    } else if (item.position === "" && item.slot === null) {
      result.categories.push({ name: item.category, amount: Number(item.amount), scholarships: Number(item.scholarships), roster_spots: Number(item.roster_spots), order: item.order });
    } else if (item.slot === null) {
      if (!result.positions[item.category]) result.positions[item.category] = [];
      result.positions[item.category].push({ name: item.position, amount: Number(item.amount), scholarships: Number(item.scholarships), roster_spots: Number(item.roster_spots), order: item.order });
    } else {
      if (!result.slots[item.category]) result.slots[item.category] = {};
      if (!result.slots[item.category][item.position]) result.slots[item.category][item.position] = [];
      result.slots[item.category][item.position].push({ name: item.slot, amount: Number(item.amount) });
    }
  });

  return result;
};

export const calculateBudgetDifference = (compensation: number, budgetForSlot: number) => {
  return Math.round((compensation - budgetForSlot) * 100) / 100;
};

export const calculateCompPercentage = (compensation: number, totalCompensation: number): number => {
  if (isNaN(compensation) || isNaN(totalCompensation)) return 0;
  if (totalCompensation === 0) return 0;
  return (compensation / totalCompensation) * 100;
};

export const calculatePercentage = (value: number, total: number): string => {
  if (isNaN(value) || isNaN(total)) return '0.0';
  if (total === 0) return '0.0';
  return (value / total * 100).toFixed(1);
};

export const formatCompensation = (amount: number): string => {
  if (isNaN(amount)) amount = 0;
  const absAmount = Math.abs(amount);
  if (absAmount >= 1000000) {
    return `$${(absAmount / 1000000).toFixed(2)}M`;
  } else if (absAmount >= 1000) {
    return `$${(absAmount / 1000).toFixed(0)}K`;
  } else {
    return `$${absAmount.toFixed(0)}`;
  }
};

export const formatValue = (value: number, isCompensation: boolean): string => {
  if (isCompensation) {
    return formatCompensation(value);
  }
  try {
    if (isNaN(value)) return '0';
    return value.toString();
  } catch (error) {
    console.error('Error formatting value:', error);
    return '0';
  }
};

export const getDiffColor = (actual: number, target: number, isScholarship: boolean) => {
  if (actual === target) return styles.green;
  if (isScholarship) {
    return actual < target ? styles.green : styles.red;
  }
  return actual < target ? styles.red : styles.green;
};

/**
 * Calculates total compensation for each starting year
 * @param players List of players to calculate totals for
 * @returns Object mapping starting year to total compensation
 */
export const calculateStartYearCompensation = (players: Player[]): { [key: number]: number } => {
  return players.reduce((totals: { [key: number]: number }, player: Player) => {
    const startYear = player.starting_season;
    if (!totals[startYear]) {
      totals[startYear] = 0;
    }
    
    const totalPlayerComp = player.compensation + 
      Object.entries(player)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
    
    totals[startYear] += totalPlayerComp;
    return totals;
  }, {} as { [key: number]: number });
};

/**
 * Calculates total compensation for each starting year and position
 * @param players List of players to calculate totals for
 * @returns Nested object mapping starting year to position to total compensation
 */
export const calculateStartYearPositionCompensation = (players: Player[]): { [key: number]: { [key: string]: number } } => {
  return players.reduce((totals: { [key: number]: { [key: string]: number } }, player: Player) => {
    const startYear = player.starting_season;
    const position = player.position;
    
    if (!totals[startYear]) {
      totals[startYear] = {};
    }
    
    if (!totals[startYear][position]) {
      totals[startYear][position] = 0;
    }
    
    const totalPlayerComp = player.compensation + 
      Object.entries(player)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
    
    totals[startYear][position] += totalPlayerComp;
    return totals;
  }, {} as { [key: number]: { [key: string]: number } });
};

/**
 * Calculates total player compensation including additional comp fields
 * @param player Player to calculate total compensation for
 * @returns Total compensation value
 */
export const calculateTotalPlayerCompensation = (player: Player): number => {
  return player.compensation + 
    Object.entries(player)
      .filter(([key]) => key.startsWith('comp_'))
      .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
};

/**
 * Gets all packages a user has access to
 * @returns Promise<string[]> Array of package IDs the user has access to
 */
export const getUserPackages = async (): Promise<string[]> => {
  try {
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    
    const userId = session.user.id;
    const accessiblePackages = new Set<string>();
    
    // First check for direct user override access
    const { data: userOverrides, error: userOverrideError } = await supabase
      .from('user_access_override')
      .select('customer_package_id')
      .eq('user_id', userId)
      .is('access_end', null);
    
    if (userOverrideError) {
      console.error('Error checking user package overrides:', userOverrideError);
    } else if (userOverrides) {
      // Add all direct user overrides to the set
      userOverrides.forEach((override: { customer_package_id: string }) => {
        accessiblePackages.add(override.customer_package_id);
      });
    }
    
    // Then check for access through customer packages
    // First get user's customer_ids from user details
    const userDetails = await fetchUserDetails();
    if (userDetails?.customers?.length > 0) {
      // Get customer_ids from user's customers array
      const customerIds = userDetails.customers.map((customer: { customer_id: string }) => customer.customer_id);
      
      // Get all packages the user's customers have access to
      const { data: customerPackages, error: customerPackageError } = await supabase
        .from('customer_package_map')
        .select('customer_package_id')
        .in('customer_id', customerIds)
        .is('access_end', null);
      
      if (customerPackageError) {
        console.error('Error checking customer package access:', customerPackageError);
      } else if (customerPackages) {
        // Add all customer package accesses to the set
        customerPackages.forEach((pkg: { customer_package_id: string }) => {
          accessiblePackages.add(pkg.customer_package_id);
        });
      }
    }
    
    // Convert set to array and return
    return Array.from(accessiblePackages);
    
  } catch (error) {
    console.error('Error in getUserPackages:', error);
    return [];
  }
};

/**
 * Checks if a user has access to a specific package
 * @param targetPackageId The package ID to check for access
 * @returns Promise<boolean> Whether the user has access to the specified package
 */
export const checkUserPackageAccess = async (targetPackageId: string): Promise<boolean> => {
  const userPackages = await getUserPackages();
  return userPackages.includes(targetPackageId);
};

/**
 * Checks if a user is an admin based on access to package ID 3
 * @returns Promise<boolean> Whether the user has admin access
 */
export const checkUserIsAdmin = async (): Promise<boolean> => {
  const userPackages = await getUserPackages();
  return userPackages.includes('3');
};

/**
 * Interface for tag color rule configuration
 */
export interface TagColorRule {
  id?: number;
  category: string;
  operator: string;
  value1: string | number;
  value2?: string | number;
  color: string;
  option_type?: string;
  order?: number;
}

/**
 * Interface for a customer option (saved configuration)
 */
export interface CustomerOption {
  id?: number;
  name: string;
  customer_id: string;
  created_at?: string;
  ended_at?: string | null;
  facts?: CustomerOptionFact[];
  selected?: number; // 1 = selected, 0 = not selected
}

/**
 * Interface for a customer option fact (individual rule in a configuration)
 */
export interface CustomerOptionFact {
  id?: number;
  customer_option_id: number;
  option_type: string;
  option_type_fact: string;
  operator: string;
  value: string;
  setting: string;
  order?: number;
  created_at?: string;
  ended_at?: string | null;
}

/**
 * Fetches all active color configurations for a customer
 * @param customerId The customer ID to fetch configurations for
 * @returns Promise<CustomerOption[]> Array of customer options with their facts
 */
export const fetchColorConfigurations = async (customerId: string): Promise<CustomerOption[]> => {
  try {
    // // Debug log removed('DEBUG_FETCH: Starting fetchColorConfigurations for customer ID:', customerId);
    
    // 1. Fetch customer options
    const { data: options, error: optionsError } = await supabase
      .from('customer_option')
      .select('*')
      .eq('customer_id', customerId)
      .is('ended_at', null);
    
    // // Debug log removed('DEBUG_FETCH: customer_option query response:', { options, optionsError });
    
    if (optionsError) {
      console.error('Error fetching customer options:', optionsError);
      return [];
    }

    if (!options || options.length === 0) {
      // // Debug log removed('DEBUG_FETCH: No options found for customer ID:', customerId);
      return [];
    }

    // // Debug log removed('DEBUG_FETCH: Found options:', options.length);
    
    // 2. Fetch associated facts for each option
    const optionIds = options.map((option: any) => option.id);
    // // Debug log removed('DEBUG_FETCH: Fetching facts for option IDs:', optionIds);
    
    const { data: facts, error: factsError } = await supabase
      .from('customer_option_fact')
      .select('*')
      .in('customer_option_id', optionIds)
      .is('ended_at', null)
      .or(`option_type.eq.card_color,option_type.eq.side_color`);
    
    // // Debug log removed('DEBUG_FETCH: Facts query response:', { 
    //   factsCount: facts ? facts.length : 0, 
    //   factsError 
    // });
    
    if (factsError) {
      console.error('Error fetching customer option facts:', factsError);
      return options;
    }

    // 3. Combine options with their associated facts
    const optionsWithFacts = options.map((option: any) => {
      const optionFacts = facts
        ? facts.filter((fact: any) => fact.customer_option_id === option.id)
        : [];
      
      // // Debug log removed(`DEBUG_FETCH: Option ${option.id} has ${optionFacts.length} facts`);
      
      return {
        ...option,
        facts: optionFacts
      };
    });

    // // Debug log removed('DEBUG_FETCH: Returning options with facts:', optionsWithFacts.length);
    return optionsWithFacts;
  } catch (error) {
    console.error('Error in fetchColorConfigurations:', error);
    return [];
  }
};

/**
 * Fetches a single color configuration by ID
 * @param configId The configuration ID to fetch
 * @returns Promise<CustomerOption | null> The customer option with its facts or null if not found
 */
export const fetchColorConfigurationById = async (configId: number): Promise<CustomerOption | null> => {
  try {
    // 1. Fetch the specific customer option
    const { data: option, error: optionError } = await supabase
      .from('customer_option')
      .select('*')
      .eq('id', configId)
      .is('ended_at', null)
      .single();
    
    if (optionError) {
      console.error('Error fetching customer option:', optionError);
      return null;
    }

    if (!option) {
      return null;
    }

    // 2. Fetch associated facts
    const { data: facts, error: factsError } = await supabase
      .from('customer_option_fact')
      .select('*')
      .eq('customer_option_id', option.id)
      .is('ended_at', null)
      .eq('option_type', 'card_color');
    
    if (factsError) {
      console.error('Error fetching customer option facts:', factsError);
      return option;
    }

    return {
      ...option,
      facts: facts || []
    };
  } catch (error) {
    console.error('Error in fetchColorConfigurationById:', error);
    return null;
  }
};

/**
 * Updates the selection state of a configuration
 * @param configId The ID of the configuration to update
 * @param selected The selection state (1 = selected, 0 = not selected)
 * @returns Promise<boolean> Whether the update was successful
 */
export const updateConfigurationSelectionState = async (
  configId: number,
  selected: number
): Promise<boolean> => {
  try {
    // // Debug log removed(`DEBUG_UPDATE: Updating configuration ${configId} selection state to ${selected}`);
    
    const { data, error } = await supabase
      .from('customer_option')
      .update({ selected: selected })
      .eq('id', configId)
      .select();
    
    // // Debug log removed(`DEBUG_UPDATE: Update query response:`, { data, error });
    
    if (error) {
      console.error('Error updating configuration selection state:', error);
      return false;
    }
    
    // Verify the update was successful
    const { data: verifyData, error: verifyError } = await supabase
      .from('customer_option')
      .select('selected')
      .eq('id', configId)
      .single();
    
    // // Debug log removed(`DEBUG_UPDATE: Verification query response:`, { 
    //   verifyData, 
    //   verifyError,
    //   selectionMatches: verifyData && verifyData.selected === selected
    // });
    
    return !verifyError && verifyData && verifyData.selected === selected;
  } catch (error) {
    console.error('Error in updateConfigurationSelectionState:', error);
    return false;
  }
};

/**
 * Creates a new color configuration
 * @param option The customer option to create
 * @param tagRules The tag color rules to save as facts
 * @returns Promise<number | null> The ID of the created configuration or null if failed
 */
export const createColorConfiguration = async (
  option: CustomerOption,
  tagRules: TagColorRule[]
): Promise<number | null> => {
  try {
    // If this is being marked as selected, first unselect any currently selected configurations
    if (option.selected === 1) {
      const { error: updateError } = await supabase
        .from('customer_option')
        .update({ selected: 0 })
        .eq('customer_id', option.customer_id)
        .eq('selected', 1);
      
      if (updateError) {
        console.error('Error unsetting previously selected configurations:', updateError);
        // Continue anyway, not critical
      }
    }
    
    // 1. Create the customer option
    const { data: newOption, error: optionError } = await supabase
      .from('customer_option')
      .insert([{
        name: option.name,
        customer_id: option.customer_id,
        selected: option.selected || 0
      }])
      .select()
      .single();
    
    if (optionError) {
      console.error('Error creating customer option:', optionError);
      return null;
    }

    if (!newOption) {
      console.error('No customer option was created');
      return null;
    }

    // 2. Create the facts for the option
    const facts = tagRules.map(rule => ({
      customer_option_id: newOption.id,
      option_type: rule.option_type || 'card_color',
      option_type_fact: rule.category,
      operator: rule.operator,
      value: rule.value1.toString() + (rule.value2 ? `,${rule.value2}` : ''),
      setting: rule.color,
      order: rule.order || 0
    }));

    const { error: factsError } = await supabase
      .from('customer_option_fact')
      .insert(facts);
    
    if (factsError) {
      console.error('Error creating customer option facts:', factsError);
      // Clean up the customer option if facts failed
      await supabase
        .from('customer_option')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', newOption.id);
      return null;
    }

    return newOption.id;
  } catch (error) {
    console.error('Error in createColorConfiguration:', error);
    return null;
  }
};

/**
 * Updates an existing color configuration
 * @param configId The ID of the configuration to update
 * @param name The new name for the configuration
 * @param tagRules The new tag color rules
 * @returns Promise<boolean> Whether the update was successful
 */
export const updateColorConfiguration = async (
  configId: number,
  name: string,
  tagRules: TagColorRule[]
): Promise<boolean> => {
  try {
    // 1. Update the customer option name
    const { error: optionError } = await supabase
      .from('customer_option')
      .update({ name })
      .eq('id', configId);
    
    if (optionError) {
      console.error('Error updating customer option:', optionError);
      return false;
    }

    // 2. Soft delete all existing facts
    const { error: deleteError } = await supabase
      .from('customer_option_fact')
      .update({ ended_at: new Date().toISOString() })
      .eq('customer_option_id', configId)
      .is('ended_at', null)
      .or(`option_type.eq.card_color,option_type.eq.side_color`);
    
    if (deleteError) {
      console.error('Error soft deleting customer option facts:', deleteError);
      return false;
    }

    // 3. Create new facts for the updated rules
    const facts = tagRules.map(rule => ({
      customer_option_id: configId,
      option_type: rule.option_type || 'card_color',
      option_type_fact: rule.category,
      operator: rule.operator,
      value: rule.value1.toString() + (rule.value2 ? `,${rule.value2}` : ''),
      setting: rule.color,
      order: rule.order || 0
    }));

    if (facts.length > 0) {
      const { error: factsError } = await supabase
        .from('customer_option_fact')
        .insert(facts);
      
      if (factsError) {
        console.error('Error creating new customer option facts:', factsError);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error in updateColorConfiguration:', error);
    return false;
  }
};

/**
 * Soft deletes a color configuration by setting ended_at
 * @param configId The ID of the configuration to delete
 * @returns Promise<boolean> Whether the deletion was successful
 */
export const deleteColorConfiguration = async (configId: number): Promise<boolean> => {
  try {
    // 1. Soft delete the customer option
    const { error: optionError } = await supabase
      .from('customer_option')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', configId);
    
    if (optionError) {
      console.error('Error deleting customer option:', optionError);
      return false;
    }

    // 2. Soft delete all associated facts
    const { error: factsError } = await supabase
      .from('customer_option_fact')
      .update({ ended_at: new Date().toISOString() })
      .eq('customer_option_id', configId)
      .is('ended_at', null);
    
    if (factsError) {
      console.error('Error deleting customer option facts:', factsError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteColorConfiguration:', error);
    return false;
  }
};

/**
 * Converts tag rules from the UI format to the database format
 * @param tagRules UI format tag rules
 * @returns CustomerOptionFact[] Facts formatted for the database
 */
export const convertTagRulesToFacts = (
  tagRules: TagColorRule[],
  customerOptionId: number
): CustomerOptionFact[] => {
  return tagRules.map(rule => ({
    customer_option_id: customerOptionId,
    option_type: rule.option_type || 'card_color',
    option_type_fact: rule.category,
    operator: rule.operator,
    value: rule.value1.toString() + (rule.value2 ? `,${rule.value2}` : ''),
    setting: rule.color,
    order: rule.order || 0
  }));
};

/**
 * Converts facts from the database format to the UI format
 * @param facts Database format facts
 * @returns TagColorRule[] Rules formatted for the UI
 */
export const convertFactsToTagRules = (facts: CustomerOptionFact[]): TagColorRule[] => {
  return facts.map((fact, index) => {
    const valueArray = fact.value.split(',');
    const value1 = valueArray[0];
    const value2 = valueArray[1] || undefined;
    
    // Try to convert value to number if possible
    const isNumericValue = !isNaN(Number(value1)) && value1 !== '';
    const isNumericValue2 = value2 !== undefined && !isNaN(Number(value2)) && value2 !== '';
    
    return {
      key: index.toString(),
      category: fact.option_type_fact,
      operator: fact.operator,
      value1: isNumericValue ? Number(value1) : value1,
      value2: isNumericValue2 ? Number(value2) : value2,
      color: fact.setting,
      option_type: fact.option_type,
      order: fact.order || index
    };
  });
};

/**
 * Fetches active alerts (where ended_date is null or 'na') from tp_alert table
 * For customer users, filters alerts based on user_customer_map access
 */
export const fetchActiveAlerts = async (): Promise<Alert[]> => {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('Error getting current user:', userError);
      return [];
    }

    // All users (including admins) only see alerts for customers they have access to
    // First get the customer IDs the user has access to
    const { data: userCustomers, error: userCustomerError } = await supabase
      .from('user_customer_map')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('access_end', null);

    if (userCustomerError) {
      console.error('Error fetching user customers:', userCustomerError);
      return [];
    }

    if (!userCustomers || userCustomers.length === 0) {
      // User has no customer access
      return [];
    }

    const customerIds = userCustomers.map((uc: { customer_id: string }) => uc.customer_id);

    const query = supabase
      .from('tp_alert')
      .select('*')
      .is('ended_at', null)
      .in('customer_id', customerIds)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
    
    return (data || []) as Alert[];
  } catch (err) {
    console.error('Unexpected error in fetchActiveAlerts:', err);
    return [];
  }
};

export const updateAlert = async (alert: Alert) => {
  const { data, error } = await supabase
    .from('tp_alert')
    .update({
      rule: alert.rule,
      recipient: alert.recipient,
    })
    .eq('id', alert.id)
    .select()
    .single();
  if (error) throw error;
  return data as Alert;
};

export const deleteAlert = async (id: number) => {
  const { data, error } = await supabase
    .from('tp_alert')
    .update({ ended_date: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Alert;
};

/**
 * Fetches all active users' emails and names attached to a given customer_id.
 * Only returns users with access_end = null (active users).
 * @param customerId The customer ID to fetch users for
 * @returns Promise<Array<{ id: string; email: string; name_first: string; name_last: string }>>
 */
export const fetchUsersForCustomer = async (
  customerId: string
): Promise<Array<{ id: string; email: string; name_first: string; name_last: string }>> => {
  try {
    const { data, error } = await supabase
      .from('user_customer_map')
      .select(`
        user_id,
        access_end,
        user_detail:user_id (
          id,
          name_first,
          name_last
        )
      `)
      .eq('customer_id', customerId)
      .is('access_end', null); // Only fetch active users

    if (error) {
      console.error('Error fetching users for customer:', error);
      return [];
    }
    // // Debug log removed("[DEBUG] fetchUsersForCustomer returned:", data);
    // Map to a flat array of user info and deduplicate by user ID
    const users: Array<{ id: string; name_first: string; name_last: string }> = data?.filter((item: any) => item.user_detail)
      .map((item: any) => ({
        id: item.user_detail.id,
        name_first: item.user_detail.name_first,
        name_last: item.user_detail.name_last,
      })) || [];
    
    // Deduplicate users by ID
    const uniqueUsers = Array.from(
      new Map(users.map(user => [user.id, user])).values()
    );
    
    return uniqueUsers as Array<{ id: string; email: string; name_first: string; name_last: string }>;
  } catch (err) {
    console.error('Error in fetchUsersForCustomer:', err);
    return [];
  }
};

// Fetch a customer_option row by name and customer_id
export async function fetchCustomerOptionByName(customer_id: string, name: string) {
  const { data, error } = await supabase
    .from('customer_option')
    .select('*')
    .eq('customer_id', customer_id)
    .eq('name', name)
    .is('ended_at', null)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching customer_option by name:', error);
    return null;
  }
  return data || null;
}

// Create or update a customer_option row
export async function createOrUpdateCustomerOption(option: { id?: number, name: string, customer_id: string, selected: number }) {
  if (option.id) {
    // Update
    const { error } = await supabase
      .from('customer_option')
      .update({ selected: option.selected })
      .eq('id', option.id);
    if (error) throw error;
  } else {
    // Create
    const { error } = await supabase
      .from('customer_option')
      .insert([{
        name: option.name,
        customer_id: option.customer_id,
        selected: option.selected,
      }]);
    if (error) throw error;
  }
}

/**
 * Fetches whether scholarships should be displayed as dollars for a customer.
 * Returns true if the customer_option 'scholarship_display_dollars' is set to 1.
 */
export async function fetchShowScholarshipDollars(customer_id: string): Promise<boolean> {
  const option = await fetchCustomerOptionByName(customer_id, "scholarship_display_dollars");
  return !!(option && option.selected === 1);
}

/**
 * React hook to get and subscribe to the scholarship display mode for the active customer.
 */
export function useShowScholarshipDollars(): boolean {
  const { activeCustomerId } = useCustomer();
  const [showScholarshipDollars, setShowScholarshipDollars] = useState(false);

  useEffect(() => {
    if (!activeCustomerId) return;
    fetchShowScholarshipDollars(activeCustomerId).then(setShowScholarshipDollars);
  }, [activeCustomerId]);

  return showScholarshipDollars;
}

export const fetchUserDetailsByIds = async (ids: string[]): Promise<{ [id: string]: string }> => {
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from('user_detail')
    .select('id, name_first, name_last')
    .in('id', ids);

  if (error) {
    console.error('Error fetching user details by IDs:', error);
    return {};
  }
  // Map id to "First Last"
  return (data || []).reduce((acc: { [id: string]: string }, user: any) => {
    acc[user.id] = `${user.name_first} ${user.name_last}`;
    return acc;
  }, {} as { [id: string]: string });
};

/**
 * Fetches salary comparison data from the salary_comparison_data table filtered by group.
 * @returns Array of rows from salary_comparison_data where group matches
 */
export const fetchSalaryComparisonDataByGroup = async () => {
  const { data, error } = await supabase
    .from('salary_comparison_data')
    .select('*')
  if (error) {
    console.error('Error fetching salary_comparison_data:', error);
    return [];
  }
  return data || [];
};

export interface CustomerRating {
  id: string;
  created_at: string;
  ended_at: string | null;
  customer_id: string;
  name: string;
  type: string;
  color: string;
}

export const fetchCustomerRatings = async (customerId: string): Promise<CustomerRating[]> => {
  try {
    const { data, error } = await supabase
      .from('customer_rating_scale')
      .select('*')
      .eq('customer_id', customerId)
      .is('ended_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching customer ratings:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchCustomerRatings:', error);
    throw error;
  }
};

export const addCustomerRating = async (
  customerId: string,
  rating: { name: string; type: string; color: string }
): Promise<CustomerRating | null> => {
  try {
    const { data, error } = await supabase
      .from('customer_rating_scale')
      .insert([{
        customer_id: customerId,
        name: rating.name,
        type: rating.type,
        color: rating.color
      }])
      .select()
      .single();

    if (error) {
      console.error('Error adding customer rating:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in addCustomerRating:', error);
    throw error;
  }
};

export const updateCustomerRating = async (
  ratingId: string,
  rating: { name: string; type: string; color: string }
): Promise<CustomerRating | null> => {
  try {
    const { data, error } = await supabase
      .from('customer_rating_scale')
      .update({
        name: rating.name,
        type: rating.type,
        color: rating.color
      })
      .eq('id', ratingId)
      .select()
      .single();

    if (error) {
      console.error('Error updating customer rating:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateCustomerRating:', error);
    throw error;
  }
};

export const deleteCustomerRating = async (ratingId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('customer_rating_scale')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', ratingId);

    if (error) {
      console.error('Error deleting customer rating:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteCustomerRating:', error);
    throw error;
  }
};

// Depth Chart Formation functions
export async function fetchFormations(customerId: string): Promise<DepthChartFormation[]> {
  const { data, error } = await supabase
    .from('depth_chart_formation')
    .select('*')
    .eq('customer_id', customerId)
    .is('ended_at', null)
    .order('order', { ascending: true });
  if (error) throw error;
  return data as DepthChartFormation[];
}

export async function addFormation(formation: Omit<DepthChartFormation, 'id' | 'created_at' | 'ended_at'>): Promise<DepthChartFormation> {
  const { data, error } = await supabase
    .from('depth_chart_formation')
    .insert([formation])
    .select()
    .single();
  if (error) throw error;
  return data as DepthChartFormation;
}

export async function updateFormation(id: string, updates: Partial<DepthChartFormation>): Promise<DepthChartFormation> {
  const { data, error } = await supabase
    .from('depth_chart_formation')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DepthChartFormation;
}

export async function softDeleteFormation(id: string): Promise<void> {
  const { error } = await supabase
    .from('depth_chart_formation')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function fetchSubPositions(formationId: string): Promise<DepthChartSubPosition[]> {
  const { data, error } = await supabase
    .from('depth_chart_sub_position')
    .select('*')
    .eq('depth_chart_formation_id', formationId)
    .is('ended_at', null);
  if (error) throw error;
  return data as DepthChartSubPosition[];
}

export async function addSubPosition(subPosition: Omit<DepthChartSubPosition, 'id' | 'created_at' | 'ended_at'>) {
  const { data, error } = await supabase
    .from('depth_chart_sub_position')
    .insert([subPosition])
    .select()
    .single();
  if (error) throw error;
  return data as DepthChartSubPosition;
}

export async function updateSubPosition(id: string, updates: Partial<DepthChartSubPosition>) {
  const { data, error } = await supabase
    .from('depth_chart_sub_position')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as DepthChartSubPosition;
}

export async function softDeleteSubPosition(id: string) {
  return updateSubPosition(id, { ended_at: new Date().toISOString() });
}

/**
 * Format a stat value to the specified number of decimal places, or return as-is if not a number.
 * @param value The value to format (string or number)
 * @param decimalPlaces Number of decimal places to format to (if undefined, returns value as-is)
 * @param isPercentage Whether to convert from decimal to percentage (multiply by 100)
 * @param convertNegativeToZero Whether to convert negative values to zero
 * @returns Formatted value as string or original value
 */
export function formatStatDecimal(value: any, decimalPlaces?: number, isPercentage?: boolean, convertNegativeToZero?: boolean): string | number | null {
  if (value === null || value === undefined || value === '') return value;
  if (decimalPlaces === undefined && !isPercentage && !convertNegativeToZero) return value;
  
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return value;
  
  // If it's a percentage, multiply by 100 to convert from decimal to percentage
  let processedNum = isPercentage ? num * 100 : num;
  
  // Convert negative values to zero if specified
  if (convertNegativeToZero && processedNum < 0) {
    processedNum = 0;
  }
  
  // If decimal places is specified, format to that precision, otherwise return the processed number
  return decimalPlaces !== undefined ? processedNum.toFixed(decimalPlaces) : processedNum;
}
