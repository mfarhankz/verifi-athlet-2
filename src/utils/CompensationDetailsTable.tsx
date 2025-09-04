import React, { useState, useEffect, useImperativeHandle } from 'react';
import { FaChevronUp, FaChevronDown, FaExclamationTriangle, FaPlus } from 'react-icons/fa';
import DollarInput from '../utils/DollarInput';
import styles from '../components/cap-manager/FullPageDetails.module.css';
import { supabase } from '../lib/supabaseClient';

export interface YearlyData {
  year: number;
  compensation: number;
  scholarshipPerc: number;
  onRoster: boolean;
  ending_season?: number;
  additionalBudgets?: Record<string, number>;
}

export interface MonthlyCompensationDetail {
  month: string;
  amount: number;
  scholarshipPerc: number;
  onRoster: boolean;
  additionalBudgets?: Record<string, number>;
}

export const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface AdditionalBudget {
  name: string;
  amount: number;
}

interface CompensationDetailsTableProps {
  athleteId: string;
  selectedScenario: string;
  additionalBudgets?: AdditionalBudget[];
  onDataChange?: (
    yearlyData: Record<number, YearlyData>, 
    monthlyDetails: Record<number, MonthlyCompensationDetail[]>,
    expandedYears: number[],
    ending_season?: number | undefined
  ) => void;
  onValidationChange?: (isValid: boolean) => void;  
}

export interface CompensationDetailsTableRef {
  handleYearlyDataChange: (year: number, field: keyof YearlyData, value: any) => void;
  handleMonthlyCompensationChange: (year: number, month: string, field: string, value: any) => void;
  handleYearlyRosterChange: (year: number, checked: boolean) => void;
  handleAdditionalBudgetChange: (year: number, budgetName: string, value: number) => void;
  validateCompensationTotals: () => Promise<boolean>;
}

export const CompensationDetailsTable = React.forwardRef<CompensationDetailsTableRef, CompensationDetailsTableProps>(
  (props, ref) => {
    const [expandedYears, setExpandedYears] = useState<number[]>([]);
    const [yearlyData, setYearlyData] = useState<Record<number, YearlyData>>({});
    const [monthlyDetails, setMonthlyDetails] = useState<Record<number, MonthlyCompensationDetail[]>>({});
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState<string | null>(null);
    const [pendingValidationResolve, setPendingValidationResolve] = useState<((value: boolean) => void) | null>(null);
    const [additionalYears, setAdditionalYears] = useState<number>(0);
    const [discrepancies, setDiscrepancies] = useState<Array<{year: number, budget: string, monthlyTotal: number, yearlyTotal: number}>>([]);

    const validateCompensationTotals = async (): Promise<boolean> => {
      const BUFFER = 25; // $25 buffer
      const warningMessages: string[] = [];
      let hasWarnings = false;
      const newDiscrepancies: Array<{year: number, budget: string, monthlyTotal: number, yearlyTotal: number}> = [];
      
      // Check main compensation
      Object.entries(yearlyData).forEach(([year, data]) => {
        const yearInt = parseInt(year);
        const yearlyTotal = data.compensation;
        const monthlyTotal = monthlyDetails[yearInt]?.reduce((sum, month) => sum + (month.amount || 0), 0) || 0;

        if (Math.abs(yearlyTotal - monthlyTotal) > BUFFER) {
          hasWarnings = true;
          warningMessages.push(`Your monthly amounts for Main Budget don't add up to the annual total for year ${year}. The monthlies add up to $${monthlyTotal.toLocaleString()}. The annual amount is $${yearlyTotal.toLocaleString()}.`);
          newDiscrepancies.push({
            year: yearInt,
            budget: 'compensation',
            monthlyTotal,
            yearlyTotal
          });
        }

        // Check additional budgets
        if (data.additionalBudgets && props.additionalBudgets) {
          props.additionalBudgets.forEach(budget => {
            const yearlyBudgetTotal = data.additionalBudgets?.[budget.name] || 0;
            const monthlyBudgetTotal = monthlyDetails[yearInt]?.reduce((sum, month) => {
              return sum + (month.additionalBudgets?.[budget.name] || 0);
            }, 0) || 0;

            if (Math.abs(yearlyBudgetTotal - monthlyBudgetTotal) > BUFFER) {
              hasWarnings = true;
              warningMessages.push(`Your monthly amounts for ${budget.name} don't add up to the annual total for year ${year}. The monthlies add up to $${monthlyBudgetTotal.toLocaleString()}. The annual amount is $${yearlyBudgetTotal.toLocaleString()}.`);
              newDiscrepancies.push({
                year: yearInt,
                budget: budget.name,
                monthlyTotal: monthlyBudgetTotal,
                yearlyTotal: yearlyBudgetTotal
              });
            }
          });
        }
      });

      if (hasWarnings) {
        setWarningMessage(warningMessages.join('\n\n'));
        setShowWarningModal(true);
        setDiscrepancies(newDiscrepancies);
        
        // Return a new promise that will be resolved when the user makes a choice
        const result = await new Promise<boolean>((resolve) => {
          setPendingValidationResolve(() => resolve);
        });

        // Only call onValidationChange after we have the user's decision
        props.onValidationChange?.(result);
        return result;
      }

      props.onValidationChange?.(true);
      return true;
    };

    const handleSaveAnyway = () => {
      setShowWarningModal(false);
      setWarningMessage(null);
      if (pendingValidationResolve) {
        pendingValidationResolve(true);
        setPendingValidationResolve(null);
      }
    };

    const handleCancel = () => {
      setShowWarningModal(false);
      setWarningMessage(null);
      if (pendingValidationResolve) {
        pendingValidationResolve(false);
        setPendingValidationResolve(null);
      }
    };

    const handleUpdateAnnualTotal = () => {
      // Update all annual totals to match monthly sums
      discrepancies.forEach(discrepancy => {
        if (discrepancy.budget === 'compensation') {
          // Update main compensation
          handleYearlyDataChange(discrepancy.year, 'compensation', discrepancy.monthlyTotal);
        } else {
          // Update additional budget
          handleAdditionalBudgetChange(discrepancy.year, discrepancy.budget, discrepancy.monthlyTotal);
        }
      });
      
      setShowWarningModal(false);
      setWarningMessage(null);
      if (pendingValidationResolve) {
        pendingValidationResolve(true);
        setPendingValidationResolve(null);
      }
    };

    // Add useEffect to handle data changes
    const { onDataChange } = props;
    useEffect(() => {
      if (Object.keys(yearlyData).length > 0) {
        // Find the ending season
        const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
        const ending_season = years
          .filter(y => yearlyData[y].onRoster)
          .sort((a, b) => b - a)[0] ?? undefined;

        onDataChange?.(yearlyData, monthlyDetails, expandedYears, ending_season);
      }
    }, [yearlyData, monthlyDetails, expandedYears, onDataChange]);

    useEffect(() => {
      const fetchCompensationData = async () => {
        setLoading(true);
        const selectedScenarioTemp = props.selectedScenario || "aiuhgahfaoiuhfkjnq";
        
        // Fetch athlete data to get starting season and eligibility
        const { data: athleteData, error: athleteError } = await supabase
          .from('athletes')
          .select('starting_season, elig_remaining, scholarship_perc, ending_season')
          .eq('id', props.athleteId)
          .in('scenario', ['', selectedScenarioTemp])
          .single();

        if (athleteError) {
          setLoading(false);
          return;
        }

        // Fetch all athlete override data including additional budgets
        const { data: athleteOverrideData, error: athleteOverrideError } = await supabase
          .from('athletes_override_category')
          .select('*')
          .eq('athlete_id', props.athleteId)
          .in('scenario', ['', selectedScenarioTemp]);

        if (athleteOverrideError) {
          setLoading(false);
          return;
        }

        // Fetch compensation data - make sure we're getting ALL years
        const { data: compensationData, error: compensationError } = await supabase
          .from('compensation')
          .select(`
            *,
            compensation_extra (
              budget_name,
              amount
            )
          `)
          .eq('athlete_id', props.athleteId)
          .in('scenario', ['', selectedScenarioTemp]);

        if (compensationError) {
          setLoading(false);
          return;
        }

        // Filter out 'scholarships_dollars' from compensation_extra for each row
        const filteredCompensationData = (compensationData || []).map((comp: any) => {
          if (comp.compensation_extra) {
            comp.compensation_extra = comp.compensation_extra.filter(
              (extra: { budget_name: string }) => extra.budget_name !== 'scholarships_dollars'
            );
          }
          return comp;
        });

        // Build yearly and monthly data
        const startYear = athleteData.starting_season;
        const eligibilityYears = athleteData.elig_remaining;
        
        const { yearlyData: newYearlyData, monthlyDetails: newMonthlyDetails } = buildCompensationData(
          startYear,
          eligibilityYears,
          filteredCompensationData,
          athleteData,
          athleteOverrideData
        );

        setYearlyData(newYearlyData);
        setMonthlyDetails(newMonthlyDetails);
        setLoading(false);
      };

      fetchCompensationData();
    }, [props.athleteId, props.selectedScenario]);

    const handleYearlyDataChange = (year: number, field: keyof YearlyData, value: any) => {
      setYearlyData(prev => {
        const newData = {
          ...prev,
          [year]: { ...prev[year], [field]: value }
        };
        return newData;
      });
    };

    // Add a handler for budget changes from the main component
    useEffect(() => {
      if (props.additionalBudgets) {
        // Update yearly data with additional budgets from props
        setYearlyData(prev => {
          const newData = { ...prev };
          Object.entries(newData).forEach(([year, data]) => {
            if (!data.additionalBudgets) {
              data.additionalBudgets = {};
            }
            props.additionalBudgets?.forEach(budget => {
              if (data.additionalBudgets && !(budget.name in data.additionalBudgets)) {
                data.additionalBudgets[budget.name] = budget.amount;
              }
            });
          });
          return newData;
        });
      }
    }, [props.additionalBudgets]);

    const formatNumber = (num: number): string => {
      return num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    const handleMonthlyCompensationChange = (year: number, month: string, field: string, value: any) => {
      setMonthlyDetails(prev => {
        const newDetails = { ...prev };
        const monthDetails = [...newDetails[year]];
        const monthIndex = monthDetails.findIndex(m => m.month === month);
        
        if (monthIndex !== -1) {
          if (field === 'amount' || field === 'scholarshipPerc' || field === 'onRoster') {
            // Handle standard fields
            monthDetails[monthIndex] = {
              ...monthDetails[monthIndex],
              [field]: value
            };
          } else {
            // Handle additional budget fields
            if (!monthDetails[monthIndex].additionalBudgets) {
              monthDetails[monthIndex].additionalBudgets = {};
            }
            monthDetails[monthIndex].additionalBudgets![field] = value;
          }
          newDetails[year] = monthDetails;
          
          // Notify parent component of the changes
          setTimeout(() => props.onDataChange?.(yearlyData, newDetails, expandedYears), 0);
        }
        return newDetails;
      });
    };

    const toggleYearExpansion = (year: number) => {
      setExpandedYears(prev => {
        const newExpandedYears = prev.includes(year) 
          ? prev.filter(y => y !== year) 
          : [...prev, year];
        return newExpandedYears;
      });
    };

    const handleYearlyRosterChange = (changedYear: number, checked: boolean) => {

      setYearlyData(prev => {
        const newData = { ...prev };
        const years = Object.keys(newData).map(Number).sort((a, b) => a - b);
        
        // Update roster status
        years.forEach(year => {
          if (checked) {
            if (year <= changedYear) {
              newData[year] = { ...newData[year], onRoster: true };
            }
          } else {
            if (year >= changedYear) {
              newData[year] = { ...newData[year], onRoster: false };
            }
          }
        });

        // Check if all years are checked
        const allChecked = years.every(y => newData[y].onRoster);
        // Calculate single ending_season value
        let ending_season: number | undefined;
        if (allChecked) {
          ending_season = 0;
        } else {
          ending_season = years
            .filter(y => newData[y].onRoster)
            .sort((a, b) => b - a)[0] ?? undefined;
        }

        // Set the same ending_season value for all years
        years.forEach(year => {
          newData[year] = {
            ...newData[year],
            ending_season
          };
        });
        setTimeout(() => props.onDataChange?.(newData, monthlyDetails, expandedYears, ending_season), 0);
        return newData;
      });
    };

    const handleAdditionalBudgetChange = (year: number, budgetName: string, value: number) => {
      setYearlyData(prev => {
        const newData = { ...prev };
        if (!newData[year].additionalBudgets) {
          newData[year].additionalBudgets = {};
        }
        newData[year].additionalBudgets![budgetName] = value;
        
        // Notify parent component of the changes
        setTimeout(() => props.onDataChange?.(newData, monthlyDetails, expandedYears), 0);
        
        return newData;
      });
    };

    const handleAddYear = () => {
      // Get all years and sort them numerically
      const years = Object.keys(yearlyData).map(Number).sort((a, b) => a - b);
      
      // Determine the next year to add (after the highest existing year)
      const lastYear = Math.max(...years);
      const nextYear = lastYear + 1;
      
      // Get the last year's data to use as a template
      const lastYearData = yearlyData[lastYear];
      
      // Create data for the new year
      const newYearData: YearlyData = {
        year: nextYear,
        compensation: lastYearData.compensation,
        scholarshipPerc: lastYearData.scholarshipPerc,
        onRoster: lastYearData.onRoster,
        ending_season: lastYearData.ending_season,
        additionalBudgets: { ...lastYearData.additionalBudgets }
      };
      
      // Create monthly details for the new year
      const newMonthlyDetails = MONTH_ORDER.map(month => ({
        year: nextYear,
        month,
        amount: lastYearData.compensation / 12,
        onRoster: lastYearData.onRoster,
        scholarshipPerc: lastYearData.scholarshipPerc,
        additionalBudgets: lastYearData.additionalBudgets ? 
          Object.entries(lastYearData.additionalBudgets).reduce((acc, [budgetName, amount]) => {
            acc[budgetName] = amount / 12;
            return acc;
          }, {} as Record<string, number>) : 
          undefined
      }));
      
      // Update state
      setYearlyData(prev => ({
        ...prev,
        [nextYear]: newYearData
      }));
      
      setMonthlyDetails(prev => ({
        ...prev,
        [nextYear]: newMonthlyDetails
      }));
      
      setAdditionalYears(prev => prev + 1);
      
      // Notify parent component of the changes
      setTimeout(() => props.onDataChange?.(
        { ...yearlyData, [nextYear]: newYearData }, 
        { ...monthlyDetails, [nextYear]: newMonthlyDetails }, 
        expandedYears
      ), 0);
    };

    // Expose the validation method via ref
    useImperativeHandle(ref, () => ({
      handleYearlyDataChange,
      handleMonthlyCompensationChange: (year: number, month: string, field: string, value: any) => {
        handleMonthlyCompensationChange(year, month, field, value);
      },
      handleYearlyRosterChange,
      handleAdditionalBudgetChange,
      validateCompensationTotals
    }));

const buildCompensationData = (
  startYear: number,
  eligibilityYears: number,
  compensationData: any[],
  athleteData: any,
  overrideData: any[]
) => {
  const newYearlyData: Record<number, YearlyData> = {};
  const newMonthlyDetails: Record<number, MonthlyCompensationDetail[]> = {};

  // Get the ending_season from athlete data or override
  let ending_season = athleteData.ending_season;
  const endingSeasonOverride = overrideData
    .find(o => o.category === 'ending_season' && o.value !== null)?.value;
  if (endingSeasonOverride !== undefined) {
    ending_season = parseInt(endingSeasonOverride);
  }

  // Extract additional budget data from props if available
  const additionalBudgets: Record<string, number> = {};
  if (props.additionalBudgets) {
    props.additionalBudgets.forEach(budget => {
      additionalBudgets[budget.name] = budget.amount || 0;
    });
  }
  
  // Filter yearly compensation data
  const yearlyCompData = compensationData.filter(c => c.month === '00');
  
  // Sort compensation data by year to ensure we process it in order
  const sortedCompData = [...compensationData].sort((a, b) => a.year - b.year);

  // Track the last known values to carry forward only when needed
  let lastCompensation = 0;
  const lastScholarshipPerc = athleteData.scholarship_perc || 0;

  // Create a map of year to compensation for easier lookup
  const yearToCompensationMap: Record<number, number> = {};
  yearlyCompData.forEach(comp => {
    yearToCompensationMap[comp.year] = comp.amount;
  });

  // Create a map of year to additional budgets from compensation_extra
  const yearToAdditionalBudgetsMap: Record<number, Record<string, number>> = {};
  yearlyCompData.forEach(comp => {
    if (comp.compensation_extra && comp.compensation_extra.length > 0) {
      yearToAdditionalBudgetsMap[comp.year] = {};
      comp.compensation_extra.forEach((extra: { budget_name: string; amount: number }) => {
        yearToAdditionalBudgetsMap[comp.year][extra.budget_name] = extra.amount;
      });
    }
  });

  // Create a map of monthly additional budgets from compensation_extra
  const monthlyAdditionalBudgetsMap: Record<string, Record<string, number>> = {};
  compensationData.filter(c => c.month !== '00').forEach(comp => {
    if (comp.compensation_extra && comp.compensation_extra.length > 0) {
      const key = `${comp.year}_${comp.month}`;
      monthlyAdditionalBudgetsMap[key] = {};
      comp.compensation_extra.forEach((extra: { budget_name: string; amount: number }) => {
        monthlyAdditionalBudgetsMap[key][extra.budget_name] = extra.amount;
      });
    }
  });

  // Find all years from compensation data
  const existingDataYears = Array.from(new Set(
    compensationData.map(c => c.year)
  )).sort((a, b) => a - b);

  // Calculate expected years based on eligibility
  const eligibilityBasedYears = Array.from(
    { length: eligibilityYears }, 
    (_, i) => startYear + i
  );

  // Combine all years, removing duplicates
  const allYears = Array.from(new Set([
    ...existingDataYears,
    ...eligibilityBasedYears
  ])).sort((a, b) => a - b);

  // Process each year
  for (const year of allYears) {
    // Get yearly compensation for this specific year directly from the map
    const yearCompensation = yearToCompensationMap[year];
    
    if (yearCompensation !== undefined) {
      lastCompensation = yearCompensation;
    }
    
    // Check for yearly scholarship_perc override
    const yearlyOverride = overrideData.find(o => 
      o.season_override === year && 
      o.month === '00' && 
      o.category === 'scholarship_perc'
    );
    
    // If no yearly override, keep the last scholarship percentage
    const yearScholarshipPerc = yearlyOverride ? parseFloat(yearlyOverride.value) : lastScholarshipPerc;
    
    // Determine if athlete is on roster based on ending_season
    const onRoster = ending_season === 0 || year <= ending_season;

    // Get additional budget data for this year from compensation_extra
    const yearlyAdditionalBudgets: Record<string, number> = {};
    
    // First, add any additional budgets from compensation_extra for this year
    if (yearToAdditionalBudgetsMap[year]) {
      Object.entries(yearToAdditionalBudgetsMap[year]).forEach(([budgetName, amount]) => {
        yearlyAdditionalBudgets[budgetName] = amount;
      });
    } else {
      // If no data in compensation_extra for this year, use default values from props
      Object.keys(additionalBudgets).forEach(budgetName => {
        yearlyAdditionalBudgets[budgetName] = additionalBudgets[budgetName];
      });
    }

    // Create yearly data entry
    newYearlyData[year] = {
      year,
      compensation: lastCompensation,
      scholarshipPerc: yearScholarshipPerc,
      onRoster,
      ending_season,
      additionalBudgets: yearlyAdditionalBudgets
    };

    // Create monthly details
    newMonthlyDetails[year] = MONTH_ORDER.map(month => {
      // Get monthly compensation data first
      const monthlyComp = compensationData.find(c => 
        c.year === year && 
        c.month === month
      );

      // Get monthly scholarship override
      const monthlyOverride = overrideData.find(o => 
        o.season_override === year && 
        o.month === month && 
        o.category === 'scholarship_perc'
      );

      // Get monthly additional budget data from compensation_extra
      const monthlyAdditionalBudgets: Record<string, number> = {};
      const monthKey = `${year}_${month}`;
      
      if (monthlyAdditionalBudgetsMap[monthKey]) {
        // Use data from compensation_extra if available
        Object.entries(monthlyAdditionalBudgetsMap[monthKey]).forEach(([budgetName, amount]) => {
          monthlyAdditionalBudgets[budgetName] = amount;
        });
      } else {
        // If no monthly data, divide yearly budget by 12
        Object.keys(yearlyAdditionalBudgets).forEach(budgetName => {
          monthlyAdditionalBudgets[budgetName] = yearlyAdditionalBudgets[budgetName] / 12;
        });
      }

      return {
        year,
        month,
        amount: monthlyComp?.amount ?? (lastCompensation / 12),
        onRoster,
        scholarshipPerc: monthlyOverride ? parseFloat(monthlyOverride.value) : yearScholarshipPerc,
        additionalBudgets: monthlyAdditionalBudgets
      };
    });
  }

  return { 
    yearlyData: newYearlyData, 
    monthlyDetails: newMonthlyDetails 
  };
};
  
    return (
      <div className={styles.compensationDetailsWrapper}>
        {errorMessage && (
          <div className={`${styles.errorMessageContainer} ${styles.visible}`}>
            <div className={styles.errorMessage}>
              {errorMessage}
            </div>
          </div>
        )}
        {showWarningModal && warningMessage && (
          <div className={styles.warningModal}>
            <div className={styles.warningModalContent}>
              <div className={styles.warningModalHeader}>
                <FaExclamationTriangle />
                <h3>Warning</h3>
              </div>
              <div className={styles.warningModalMessage}>
                {warningMessage}
              </div>
              <div className={styles.warningModalButtons}>
                <button className={styles.cancelButton} onClick={handleCancel}>
                  Go Back
                </button>
                <button className={styles.updateTotalsButton} onClick={handleUpdateAnnualTotal}>
                  Update Annual Totals
                </button>
                <button className={styles.saveAnywayButton} onClick={handleSaveAnyway}>
                  Confirm Anyway
                </button>
              </div>
            </div>
          </div>
        )}
        <div className={styles.compensationDetails}>
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Year</th>
                <th>Month</th>
                <th>{props.additionalBudgets && props.additionalBudgets.length > 0 ? "Main Budget" : "Compensation"}</th>
                {props.additionalBudgets && props.additionalBudgets.map(budget => (
                  <th key={budget.name} className={styles.additionalBudgetColumn}>{budget.name}</th>
                ))}
                <th>Total Compensation</th>
                <th>Schol. %</th>
                <th>On Roster</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(yearlyData)
                .sort(([yearA], [yearB]) => parseInt(yearA) - parseInt(yearB))
                .map(([year, data]) => (
                <React.Fragment key={year}>
                  <tr>
                    <td>
                      <button 
                        className={styles.expandButton}
                        onClick={() => toggleYearExpansion(parseInt(year))}
                      >
                        {expandedYears.includes(parseInt(year)) ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </td>
                    <td>{year}</td>
                    <td>Yearly</td>
                    <td>
                      <DollarInput
                        value={data.compensation || 0}
                        onChange={(value) => handleYearlyDataChange(parseInt(year), 'compensation', value)}
                      />
                    </td>
                    {props.additionalBudgets && props.additionalBudgets.map(budget => (
                      <td key={budget.name} className={styles.additionalBudgetColumn}>
                        <DollarInput
                          value={data.additionalBudgets?.[budget.name] || 0}
                          onChange={(value) => handleAdditionalBudgetChange(parseInt(year), budget.name, value)}
                        />
                      </td>
                    ))}
                    <td>
                      {formatNumber(data.compensation + (props.additionalBudgets?.reduce((sum, budget) => sum + (data.additionalBudgets?.[budget.name] || 0), 0) || 0))}
                    </td>
                    <td>
                      <input
                        type="number"
                        value={(data.scholarshipPerc * 100).toFixed(0)}
                        onChange={(e) => handleYearlyDataChange(parseInt(year), 'scholarshipPerc', parseFloat(e.target.value) / 100)}
                        min="0"
                        max="100"
                        step="1"
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={data.onRoster}
                        onChange={(e) => handleYearlyRosterChange(parseInt(year), e.target.checked)}
                      />
                    </td>
                  </tr>
                  {expandedYears.includes(parseInt(year)) && monthlyDetails[parseInt(year)] && (
                    <>
                      {monthlyDetails[parseInt(year)].map((monthData) => (
                        <tr key={`${year}-${monthData.month}`} className={styles.monthlyRow}>
                          <td></td>
                          <td></td>
                          <td>{monthData.month}</td>
                          <td>
                            <DollarInput
                              value={monthData.amount || 0}
                              onChange={(value) => handleMonthlyCompensationChange(parseInt(year), monthData.month, 'amount', value)}
                            />
                          </td>
                          {props.additionalBudgets && props.additionalBudgets.map(budget => (
                            <td key={budget.name} className={styles.additionalBudgetColumn}>
                              <DollarInput
                                value={monthData.additionalBudgets?.[budget.name] || 0}
                                onChange={(value) => handleMonthlyCompensationChange(parseInt(year), monthData.month, budget.name, value)}
                              />
                            </td>
                          ))}
                          <td>
                            {formatNumber(monthData.amount + (props.additionalBudgets?.reduce((sum, budget) => sum + (monthData.additionalBudgets?.[budget.name] || 0), 0) || 0))}
                          </td>
                          <td>
                            <input
                              type="number"
                              value={(monthData.scholarshipPerc * 100).toFixed(0)}
                              onChange={(e) => handleMonthlyCompensationChange(parseInt(year), monthData.month, 'scholarshipPerc', parseFloat(e.target.value) / 100)}
                              min="0"
                              max="100"
                              step="1"
                            />
                          </td>
                          <td></td>
                        </tr>
                      ))}
                    </>
                  )}
                </React.Fragment>
              ))}
              {/* Add Year Button Row */}
              <tr>
                <td colSpan={props.additionalBudgets ? 8 + props.additionalBudgets.length : 8} style={{ textAlign: 'center' }}>
                  <button 
                    className={styles.addYearButton}
                    onClick={handleAddYear}
                    title="Add another year"
                  >
                    <FaPlus /> Add Year
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
);

CompensationDetailsTable.displayName = 'CompensationDetailsTable';

