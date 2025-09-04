import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUserDetails, fetchBudgetData, processBudgetData, useShowScholarshipDollars } from "../../utils/utils";
import styles from './Budget.module.css';
import { supabase } from '../../lib/supabaseClient'; // Import Supabase client
import FilterWarning from './FilterWarning';
import { FaPlus, FaArrowUp, FaArrowDown, FaTrash, FaFolderPlus, FaUserPlus, FaListOl } from 'react-icons/fa'; // Update import
import DollarInput from '../../utils/DollarInput';

interface BudgetProps {
  selectedYear: number;
  selectedMonth: string;
  selectedScenario: string;
  activeFilters: { [key: string]: string[] };
  selectOption: (option: 'Positional Ranking' | 'By Year' | 'List' | 'Budget') => void;
  targetScenario?: string;
}

// Add new interface for budget pools
interface BudgetPool {
  name: string;
  amount: number;
}

interface BudgetAmount {
  mainAmount: number;
  additionalAmounts: { [budgetName: string]: number };
}

interface BudgetData {
  id?: string;
  team?: string;
  category: string;
  position?: string;
  slot?: number;
  amount?: number;
  scholarships?: number;
  roster_spots?: number;
  order?: number;
  year?: number;
  scenario?: string;
  [key: string]: any;
}

interface BudgetInfo {
  mainAmount: number;
  additionalAmounts: { [key: string]: number };
}

interface Category {
  name: string;
  amount: number;
  budgets: BudgetInfo;
  scholarships: number;
  roster_spots: number;
  order: number;
}

interface Position {
  name: string;
  amount: number;
  budgets: BudgetInfo;
  scholarships: number;
  roster_spots: number;
  order: number;
  isEditing?: boolean;
}

interface Slot {
  name: number;
  amount: number;
  budgets: BudgetInfo;
}

interface DeleteWarningState {
  type: 'category' | 'position';
  categoryName?: string;
  positionName?: string;
  index: number;
  isOpen: boolean;
}

interface PositionRenameWarningState {
  categoryName: string;
  positionName: string;
  index: number;
  newName: string;
  isOpen: boolean;
}

// Add these interfaces near the top of the file with other interfaces
interface BudgetRecord {
  id: string;
  team: string;
  category: string;
  position: string | null;
  slot: number | null;
  amount: number;
  scholarships?: number;
  roster_spots?: number;
  order: number;
  scenario: string;
  year: number;
}

interface BudgetExtraRecord {
  budget_id: string;
  budget_name: string;
  amount: number;
}

const Budget: React.FC<BudgetProps> = ({ selectedYear, selectedMonth, selectedScenario, activeFilters, selectOption, targetScenario }) => {
  const [overallBudget, setOverallBudget] = useState<number>(0);
  const [overallScholarships, setOverallScholarships] = useState<number>(0);
  const [overallRosterSpots, setOverallRosterSpots] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [positions, setPositions] = useState<{ [key: string]: Position[] }>({});
  const [slots, setSlots] = useState<{ [key: string]: { [key: string]: Slot[] } }>({});
  const [team, setTeam] = useState<string>("");
  const [showFilterWarning, setShowFilterWarning] = useState(false);
  const [showUndoWarning, setShowUndoWarning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const [showAddBudgetWarning, setShowAddBudgetWarning] = useState(false);
  const [additionalBudgets, setAdditionalBudgets] = useState<BudgetPool[]>([]);
  const [newBudgetName, setNewBudgetName] = useState('');

  const [deleteWarning, setDeleteWarning] = useState<DeleteWarningState>({
    type: 'category',
    index: -1,
    isOpen: false
  });
  const [positionRenameWarning, setPositionRenameWarning] = useState<PositionRenameWarningState>({
    categoryName: '',
    positionName: '',
    index: -1,
    newName: '',
    isOpen: false
  });

  const showScholarshipDollars = useShowScholarshipDollars();
  const scholarshipField = showScholarshipDollars ? 'scholarships_dollars' : 'scholarships';

  const handleBudgetInput = (
    value: string,
    setter: (value: number) => void,
    inputId: string
  ) => {
    const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (!isNaN(numericValue)) {
      setter(numericValue);
    }
    const input = inputRefs.current[inputId];
    if (!input) return;

    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;
    const cleanValue = value.replace(/[^\d]/g, '');
    const formattedValue = cleanValue === '' ? '' : parseInt(cleanValue, 10).toLocaleString();

    setter(parseInt(cleanValue || '0', 10));

    setTimeout(() => {
      input.value = formattedValue;
      const newCursorPosition = cursorPosition + (formattedValue.length - oldValue.length);
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleScholarshipInput = (
    value: string,
    setter: (value: number) => void,
    inputId: string
  ) => {
    const input = inputRefs.current[inputId];
    if (!input) return;

    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;
    
    // Allow decimal input, including just a decimal point
    const cleanValue = value
        .replace(/[^\d.]/g, '')        // Keep only digits and decimal points
        .replace(/(\..*)\./g, '$1');   // Keep only first decimal point

    // If it ends with a decimal point, keep it
    const endsWithDecimal = cleanValue.endsWith('.');
    
    // Parse the number but preserve the decimal point at the end if it exists
    const numValue = cleanValue === '' ? 0 : 
                    cleanValue === '.' ? 0 : 
                    parseFloat(cleanValue);

    // Format the value, but keep decimal point if it was just entered
    const formattedValue = cleanValue === '' ? '' : 
                          endsWithDecimal ? numValue.toLocaleString() + '.' :
                          numValue.toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2
                          });

    setter(numValue);

    setTimeout(() => {
        input.value = formattedValue;
        const newCursorPosition = cursorPosition + (formattedValue.length - oldValue.length);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleRosterSpotInput = (
    value: string,
    setter: (value: number) => void,
    inputId: string
  ) => {
    const input = inputRefs.current[inputId];
    if (!input) return;

    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;
    
    // Only allow whole numbers for roster spots
    const cleanValue = value.replace(/[^\d]/g, '');
    
    const numValue = cleanValue === '' ? 0 : parseInt(cleanValue);
    const formattedValue = cleanValue === '' ? '' : numValue.toLocaleString();

    setter(numValue);

    setTimeout(() => {
        input.value = formattedValue;
        const newCursorPosition = cursorPosition + (formattedValue.length - oldValue.length);
        input.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  useEffect(() => {
    // Check if there are any active filters
    const hasActiveFilters = Object.values(activeFilters).some(filters => filters.length > 0);
    setShowFilterWarning(hasActiveFilters);
  }, [activeFilters]);

  const loadBudgetData = useCallback(async (teamId: string) => {
      
    // Split scenarios string into array and handle priority
    const scenarios = selectedScenario.split(',').map(s => s.trim());
    
    // Fetch budget data for all scenarios
    const budgetDataPromises = scenarios.map(scenario => 
      fetchBudgetData(teamId, selectedYear, scenario)
    );
    const allBudgetData = await Promise.all(budgetDataPromises);
    
    const mergedBudgetData = allBudgetData
      .filter(data => data !== null)  // Filter out null results
      .flat() as BudgetData[];

    // Process budget data with priority
    const processedData = new Map<string, BudgetData>();
    for (const scenario of scenarios) {
      const scenarioBudgetData = mergedBudgetData.filter(item => 
        item && item.scenario === scenario
      );
      
      for (const item of scenarioBudgetData) {
        const key = `${item.category}-${item.position ?? ''}-${item.slot ?? ''}`;
        if (!processedData.has(key)) {
          processedData.set(key, item);
        }
      }
    }

    const finalBudgetData = Array.from(processedData.values());
    
    if (finalBudgetData.length > 0) {
      // Extract additional budget names
      const standardFields = [
        'id', 'team', 'category', 'position', 'slot', 'amount', 
        'scholarships', 'order', 'year', 'scenario', 'roster_spots', 'scholarships_dollars'
      ];
      
      // Find the overall budget item to extract additional budget names
      const overallBudgetItem = finalBudgetData.find(item => item.category === 'overall');
      if (overallBudgetItem) {
        const additionalBudgetNames = Object.keys(overallBudgetItem)
          .filter(key => !standardFields.includes(key))
          .filter(key => overallBudgetItem[key] !== null && overallBudgetItem[key] !== undefined);
        
        // Create additional budget objects
        const newAdditionalBudgets = additionalBudgetNames.map(name => ({
          name,
          amount: Number(overallBudgetItem[name] || 0)
        }));
        
        setAdditionalBudgets(newAdditionalBudgets);
      }

      // Process categories
      const categoryData: Category[] = finalBudgetData
        .filter((item): item is Required<BudgetData> => 
          Boolean(item.category && !item.position && item.category !== 'overall')
        )
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .map(item => {
          const mainAmount = Number(item.amount ?? 0);
          const additionalAmounts = Object.entries(item)
            .filter(([key]) => !['id', 'team', 'category', 'position', 'slot', 'amount', 'scholarships', 'order', 'year', 'scenario', 'roster_spots'].includes(key))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: Number(value ?? 0) }), {} as { [key: string]: number });

          const scholarships = Number(item[showScholarshipDollars ? 'scholarships_dollars' : 'scholarships'] ?? 0);
          const rosterSpots = Number(item.roster_spots ?? 0);
          const order = Number(item.order ?? 0);

          return {
            name: item.category,
            amount: mainAmount,
            budgets: {
              mainAmount,
              additionalAmounts
            },
            scholarships,
            roster_spots: rosterSpots,
            order
          };
        });
      setCategories(categoryData);

      // Process positions
      const positionData = finalBudgetData
        .filter((item): item is Required<BudgetData> => 
          Boolean(item.position && !item.slot)
        )
        .reduce((acc, item) => {
          if (!item.category) return acc;
          if (!acc[item.category]) {
            acc[item.category] = [];
          }
          if (!item.position) return acc;
          
          const mainAmount = Number(item.amount ?? 0);
          const additionalAmounts = Object.entries(item)
            .filter(([key]) => !['id', 'team', 'category', 'position', 'slot', 'amount', 'scholarships', 'order', 'year', 'scenario', 'roster_spots'].includes(key))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: Number(value ?? 0) }), {} as { [key: string]: number });

          const scholarships = Number(item[showScholarshipDollars ? 'scholarships_dollars' : 'scholarships'] ?? 0);
          const rosterSpots = Number(item.roster_spots ?? 0);
          const order = Number(item.order ?? 0);

          acc[item.category].push({
            name: item.position,
            amount: mainAmount,
            budgets: {
              mainAmount,
              additionalAmounts
            },
            scholarships,
            roster_spots: rosterSpots,
            order
          });
          return acc;
        }, {} as { [key: string]: Position[] });
      setPositions(positionData);

      // Process slots
      const slotData = finalBudgetData
        .filter((item): item is Required<BudgetData> => 
          Boolean(item.slot !== undefined && item.slot !== null && item.slot !== 0 && item.category && item.position)
        )
        .reduce((acc, item) => {
          if (!acc[item.category]) {
            acc[item.category] = {};
          }
          if (!acc[item.category][item.position]) {
            acc[item.category][item.position] = [];
          }

          const mainAmount = Number(item.amount ?? 0);
          const additionalAmounts = Object.entries(item)
            .filter(([key]) => !['id', 'team', 'category', 'position', 'slot', 'amount', 'scholarships', 'order', 'year', 'scenario', 'roster_spots'].includes(key))
            .reduce((acc, [key, value]) => ({ ...acc, [key]: Number(value ?? 0) }), {} as { [key: string]: number });

          acc[item.category][item.position].push({
            name: Number(item.slot),
            amount: mainAmount,
            budgets: {
              mainAmount,
              additionalAmounts
            }
          });
          return acc;
        }, {} as { [key: string]: { [key: string]: Slot[] } });
      setSlots(slotData);

      // Set overall budget
      const overallData = finalBudgetData.find(item => item.category === 'overall') as Required<BudgetData> | undefined;
      if (overallData) {
        setOverallBudget(Number(overallData.amount ?? 0));
        setOverallScholarships(Number(overallData[showScholarshipDollars ? 'scholarships_dollars' : 'scholarships'] ?? 0));
        setOverallRosterSpots(Number(overallData.roster_spots ?? 0));
      }
    }
  }, [selectedYear, selectedScenario, showScholarshipDollars]);

  useEffect(() => {
    const initializeBudget = async () => {
      const userDetails = await fetchUserDetails();
      if (userDetails) {
        setTeam(userDetails.customer_id);
        await loadBudgetData(userDetails.customer_id);
      }
    };

    initializeBudget();
  }, [loadBudgetData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate totals before saving
      const validation = validateTotals();
      if (!validation.valid) {
        alert(validation.error);
        setSaving(false);
        return;
      }

      // Ensure we have a valid scenario
      const saveScenario = targetScenario || selectedScenario.split(',')[0].trim();
      
      // Prepare main budget data
      const budgetData = [
        // Overall budget
        {
          team,
          year: selectedYear,
          category: 'overall',
          position: null,
          slot: null,
          amount: overallBudget,
          [scholarshipField]: overallScholarships, // <-- dynamic key
          roster_spots: overallRosterSpots,
          order: 0,
          scenario: saveScenario
        },
        // Category budgets
        ...categories.map((category, index) => ({
          team,
          year: selectedYear,
          category: category.name,
          position: null,
          slot: null,
          amount: category.budgets.mainAmount,
          [scholarshipField]: category.scholarships, // <-- dynamic key
          roster_spots: category.roster_spots,
          order: index + 1,
          scenario: saveScenario
        })),
        // Position budgets
        ...Object.entries(positions).flatMap(([category, positionList], categoryIndex) =>
          positionList.map((position, posIndex) => {
            const categoryOrder = categories.findIndex(cat => cat.name === category) + 1;
            const positionOrder = parseFloat(`${categoryOrder}.${(posIndex + 1).toString().padStart(2, '0')}`);
            
            return {
              team,
              year: selectedYear,
              category,
              position: position.name,
              slot: null,
              amount: position.budgets.mainAmount,
              [scholarshipField]: position.scholarships, // <-- dynamic key
              roster_spots: position.roster_spots,
              order: positionOrder,
              scenario: saveScenario
            };
          })
        ),
        // Slot budgets
        ...Object.entries(slots).flatMap(([category, positions]) =>
          Object.entries(positions).flatMap(([position, slotList]) =>
            slotList.map(slot => ({
              team,
              year: selectedYear,
              category,
              position,
              slot: slot.name,
              amount: slot.budgets.mainAmount,
              order: 0,
              scenario: saveScenario
            }))
          )
        )
      ];

      // First, delete existing records for this scenario
      await supabase
        .from('budget')
        .delete()
        .match({ team, year: selectedYear, scenario: saveScenario });

      // Then insert new budget records and get the inserted records with their IDs
      const { data: insertedBudgets, error: budgetError } = await supabase
        .from('budget')
        .insert(budgetData)
        .select();

      if (budgetError) throw budgetError;
      if (!insertedBudgets) throw new Error('No budget data returned after insert');

      // Delete existing budget_extra records for the old budget records
      await supabase
        .from('budget_extra')
        .delete()
        .in('budget_id', insertedBudgets.map((b: BudgetRecord) => b.id));

      // Prepare budget_extra data
      const budgetExtraData: BudgetExtraRecord[] = [];

      // Add extra budgets for overall budget
      const overallBudgetRecord = insertedBudgets.find((b: BudgetRecord) => b.category === 'overall');
      if (overallBudgetRecord) {
        additionalBudgets.forEach(budget => {
          if (budget.amount !== 0) {
            budgetExtraData.push({
              budget_id: overallBudgetRecord.id,
              budget_name: budget.name,
              amount: budget.amount
            });
          }
        });
      }

      // Add extra budgets for categories
      for (const category of categories) {
        const categoryRecord = insertedBudgets.find(
          (b: BudgetRecord) => b.category === category.name && b.position === null && b.slot === null
        );
        if (categoryRecord) {
          Object.entries(category.budgets.additionalAmounts).forEach(([name, amount]) => {
            if (amount !== 0) {
              budgetExtraData.push({
                budget_id: categoryRecord.id,
                budget_name: name,
                amount: amount
              });
            }
          });
        }
      }

      // Add extra budgets for positions
      for (const [category, positionList] of Object.entries(positions)) {
        for (const position of positionList) {
          const positionRecord = insertedBudgets.find(
            (b: BudgetRecord) => b.category === category && b.position === position.name && b.slot === null
          );
          if (positionRecord) {
            Object.entries(position.budgets.additionalAmounts).forEach(([name, amount]) => {
              if (amount !== 0) {
                budgetExtraData.push({
                  budget_id: positionRecord.id,
                  budget_name: name,
                  amount: amount
                });
              }
            });
          }
        }
      }

      // Add extra budgets for slots
      for (const [category, positions] of Object.entries(slots)) {
        for (const [position, slotList] of Object.entries(positions)) {
          for (const slot of slotList) {
            const slotRecord = insertedBudgets.find(
              (b: BudgetRecord) => b.category === category && b.position === position && b.slot === slot.name
            );
            if (slotRecord) {
              Object.entries(slot.budgets.additionalAmounts).forEach(([name, amount]) => {
                if (amount !== 0) {
                  budgetExtraData.push({
                    budget_id: slotRecord.id,
                    budget_name: name,
                    amount: amount
                  });
                }
              });
            }
          }
        }
      }

      // Insert budget_extra records if there are any
      if (budgetExtraData.length > 0) {
        const { error: extraError } = await supabase
          .from('budget_extra')
          .insert(budgetExtraData);

        if (extraError) throw extraError;
      }

      // Refresh data
      await loadBudgetData(team);
      setSaving(false);
    } catch (error) {
      console.error('Error saving budget data:', error);
      setSaving(false);
    }
  };

  const handleCategoryChange = (index: number, field: string, value: string) => {
    if (field === 'amount' || field.endsWith('-amount')) {
      // Extract budget name if it's an additional budget
      const budgetName = field === 'amount' ? 'main' : field.replace('-amount', '');
      
      handleBudgetInput(
        value,
        (newValue) => {
          const newCategories = [...categories].map((cat, idx) => {
            if (idx === index) {
              const newBudgets = {
                mainAmount: budgetName === 'main' ? newValue : cat.budgets.mainAmount,
                additionalAmounts: {
                  ...cat.budgets.additionalAmounts,
                  ...(budgetName !== 'main' && { [budgetName]: newValue })
                }
              };
              return { ...cat, budgets: newBudgets };
            }
            return cat;
          });
          setCategories(newCategories);

          // Update percentage when amount changes
          const percentageInputId = budgetName === 'main' ? 
            `category-${index}-percentage` : 
            `category-${index}-${budgetName}-percentage`;
          const percentageInput = inputRefs.current[percentageInputId];
          if (percentageInput) {
            const totalBudget = budgetName === 'main' ? overallBudget : 
              additionalBudgets.find(b => b.name === budgetName)?.amount || 0;
            const percentage = calculatePercentage(newValue, totalBudget);
            percentageInput.value = formatNumber(percentage, false, true);
          }
        },
        `category-${index}-${budgetName === 'main' ? 'amount' : `${budgetName}-amount`}`
      );
    } else if (field === 'percentage' || field.endsWith('-percentage')) {
      // Extract budget name if it's an additional budget
      const budgetName = field === 'percentage' ? 'main' : field.replace('-percentage', '');
      const totalBudget = budgetName === 'main' ? overallBudget : 
        additionalBudgets.find(b => b.name === budgetName)?.amount || 0;

      handlePercentageInput(
        value,
        totalBudget,
        (newValue) => {
          const newCategories = [...categories].map((cat, idx) => {
            if (idx === index) {
              const newBudgets = {
                mainAmount: budgetName === 'main' ? newValue : cat.budgets.mainAmount,
                additionalAmounts: {
                  ...cat.budgets.additionalAmounts,
                  ...(budgetName !== 'main' && { [budgetName]: newValue })
                }
              };
              return { ...cat, budgets: newBudgets };
            }
            return cat;
          });
          setCategories(newCategories);

          // Update amount when percentage changes
          const amountInputId = budgetName === 'main' ? 
            `category-${index}-amount` : 
            `category-${index}-${budgetName}-amount`;
          const amountInput = inputRefs.current[amountInputId];
          if (amountInput) {
            amountInput.value = formatNumber(newValue);
          }
        },
        `category-${index}-${budgetName === 'main' ? 'percentage' : `${budgetName}-percentage`}`
      );
    } else if (field === 'scholarships') {
      handleScholarshipInput(
        value,
        (newValue) => {
          const newCategories = [...categories].map((cat, idx) =>
            idx === index
              ? { ...cat, scholarships: newValue }
              : cat
          ).sort((a, b) => a.order - b.order);
          setCategories(newCategories);
        },
        `category-${index}-scholarships`
      );
    } else if (field === 'roster_spots') {
      handleRosterSpotInput(
        value,
        (newValue) => {
          const newCategories = [...categories].map((cat, idx) =>
            idx === index
              ? { ...cat, roster_spots: newValue }
              : cat
          ).sort((a, b) => a.order - b.order);
          setCategories(newCategories);
        },
        `category-${index}-roster_spots`
      );
    }
    // ... rest of the function
  };

  const handlePositionChange = (category: string, index: number, field: string, value: string) => {
    const newPositions = { ...positions };
    
    if (field === 'amount' || field.endsWith('-amount')) {
      const budgetName = field === 'amount' ? 'main' : field.replace('-amount', '');
      handleBudgetInput(
        value,
        (newValue) => { 
          if (!newPositions[category][index].budgets) {
            newPositions[category][index].budgets = { mainAmount: 0, additionalAmounts: {} };
          }
          if (budgetName === 'main') {
            newPositions[category][index].budgets.mainAmount = newValue;
            // Only update the amount property when it's the main budget
            newPositions[category][index].amount = newValue;
          } else {
            newPositions[category][index].budgets.additionalAmounts[budgetName] = newValue;
            // Don't update the amount property for additional budgets
          }
          setPositions(newPositions);
          
          // Update percentage
          const percentageInputId = budgetName === 'main' ? 
            `position-${category}-${index}-percentage` : 
            `position-${category}-${index}-${budgetName}-percentage`;
          const percentageInput = inputRefs.current[percentageInputId];
          if (percentageInput) {
            const categoryBudget = categories.find(c => c.name === category)?.budgets;
            const totalBudget = budgetName === 'main' ? 
              categoryBudget?.mainAmount : // For main budget, use category's main amount
              categoryBudget?.additionalAmounts[budgetName] || 0; // For additional budgets, use category's corresponding additional amount
            const percentage = calculatePercentage(newValue, totalBudget || 0);
            percentageInput.value = formatNumber(percentage, false, true);
          }
        },
        `position-${category}-${index}-${budgetName === 'main' ? 'amount' : `${budgetName}-amount`}`
      );
    } else if (field === 'percentage' || field.endsWith('-percentage')) {
      const budgetName = field === 'percentage' ? 'main' : field.replace('-percentage', '');
      const categoryBudget = categories.find(c => c.name === category)?.budgets;
      const totalBudget = budgetName === 'main' ? 
        categoryBudget?.mainAmount : 
        categoryBudget?.additionalAmounts[budgetName] || 0;

      handlePercentageInput(
        value,
        totalBudget || 0,
        (newValue) => { 
          if (!newPositions[category][index].budgets) {
            newPositions[category][index].budgets = { mainAmount: 0, additionalAmounts: {} };
          }
          if (budgetName === 'main') {
            newPositions[category][index].budgets.mainAmount = newValue;
            // Only update the amount property when it's the main budget
            newPositions[category][index].amount = newValue;
          } else {
            newPositions[category][index].budgets.additionalAmounts[budgetName] = newValue;
            // Don't update the amount property for additional budgets
          }
          setPositions(newPositions);
          
          // Update amount
          const amountInputId = budgetName === 'main' ? 
            `position-${category}-${index}-amount` : 
            `position-${category}-${index}-${budgetName}-amount`;
          const amountInput = inputRefs.current[amountInputId];
          if (amountInput) {
            amountInput.value = formatNumber(newValue);
          }
        },
        `position-${category}-${index}-${budgetName === 'main' ? 'percentage' : `${budgetName}-percentage`}`
      );
    } else if (field === 'scholarships') {
      handleScholarshipInput(
        value,
        (newValue) => {
          newPositions[category][index].scholarships = newValue;
          setPositions(newPositions);
        },
        `position-${category}-${index}-scholarships`
      );
    } else if (field === 'roster_spots') {
      handleRosterSpotInput(
        value,
        (newValue) => {
          newPositions[category][index].roster_spots = newValue;
          setPositions(newPositions);
        },
        `position-${category}-${index}-roster_spots`
      );
    }
    setPositions(newPositions);
  };

  const handleSlotChange = (category: string, position: string, index: number, field: string, value: string) => {
    const newSlots = { ...slots };
    
    if (!newSlots[category]) {
      newSlots[category] = {};
    }
    
    if (!newSlots[category][position]) {
      newSlots[category][position] = [];
    }
    
    if (field === 'amount' || field.endsWith('-amount')) {
      const budgetName = field === 'amount' ? 'main' : field.replace('-amount', '');
      handleBudgetInput(
        value,
        (newValue) => { 
          if (!newSlots[category][position][index].budgets) {
            newSlots[category][position][index].budgets = { mainAmount: 0, additionalAmounts: {} };
          }
          if (budgetName === 'main') {
            newSlots[category][position][index].budgets.mainAmount = newValue;
            // Only update the amount property when it's the main budget
            newSlots[category][position][index].amount = newValue;
          } else {
            newSlots[category][position][index].budgets.additionalAmounts[budgetName] = newValue;
            // Don't update the amount property for additional budgets
          }
          setSlots(newSlots);
          
          // Update percentage
          const percentageInputId = budgetName === 'main' ? 
            `slot-${category}-${position}-${index}-percentage` : 
            `slot-${category}-${position}-${index}-${budgetName}-percentage`;
          const percentageInput = inputRefs.current[percentageInputId];
          if (percentageInput) {
            const positionBudgets = positions[category]?.find(p => p.name === position)?.budgets;
            const totalBudget = budgetName === 'main' ? 
              positionBudgets?.mainAmount : // For main budget, use position's main amount
              positionBudgets?.additionalAmounts[budgetName] || 0; // For additional budgets, use position's corresponding additional amount
            const percentage = calculatePercentage(newValue, totalBudget || 0);
            percentageInput.value = formatNumber(percentage, false, true);
          }
        },
        `slot-${category}-${position}-${index}-${budgetName === 'main' ? 'amount' : `${budgetName}-amount`}`
      );
    } else if (field === 'percentage' || field.endsWith('-percentage')) {
      const budgetName = field === 'percentage' ? 'main' : field.replace('-percentage', '');
      const positionBudgets = positions[category]?.find(p => p.name === position)?.budgets;
      const totalBudget = budgetName === 'main' ? 
        positionBudgets?.mainAmount : 
        positionBudgets?.additionalAmounts[budgetName] || 0;

      handlePercentageInput(
        value,
        totalBudget || 0,
        (newValue) => { 
          if (!newSlots[category][position][index].budgets) {
            newSlots[category][position][index].budgets = { mainAmount: 0, additionalAmounts: {} };
          }
          if (budgetName === 'main') {
            newSlots[category][position][index].budgets.mainAmount = newValue;
            // Only update the amount property when it's the main budget
            newSlots[category][position][index].amount = newValue;
          } else {
            newSlots[category][position][index].budgets.additionalAmounts[budgetName] = newValue;
            // Don't update the amount property for additional budgets
          }
          setSlots(newSlots);
          
          // Update amount
          const amountInputId = budgetName === 'main' ? 
            `slot-${category}-${position}-${index}-amount` : 
            `slot-${category}-${position}-${index}-${budgetName}-amount`;
          const amountInput = inputRefs.current[amountInputId];
          if (amountInput) {
            amountInput.value = formatNumber(newValue);
          }
        },
        `slot-${category}-${position}-${index}-${budgetName === 'main' ? 'percentage' : `${budgetName}-percentage`}`
      );
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const [movedCategory] = newCategories.splice(index, 1);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    newCategories.splice(newIndex, 0, movedCategory);
    
    // Update order values for all categories
    newCategories.forEach((category, idx) => {
      category.order = idx + 1;
    });
    
    setCategories(newCategories);
  };

  const movePosition = (category: string, index: number, direction: 'up' | 'down') => {
    const newPositions = { ...positions };
    const positionsList = newPositions[category];
    const [movedPosition] = positionsList.splice(index, 1);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    positionsList.splice(newIndex, 0, movedPosition);
  
    // Recalculate orders
    positionsList.forEach((position, posIndex) => {
      const order = (posIndex + 1).toFixed(2);  // Format order as 0.01, 0.02, etc.
      const categoryIndex = categories.findIndex(cat => cat.name === category);
      position.order = parseFloat(`${categoryIndex + 1}.${order}`);
    });
  
    setPositions(newPositions);
  };

  const addCategoryField = () => {
    setCategories([...categories, { budgets: { mainAmount: 0, additionalAmounts: {} }, name: '', amount: 0, scholarships: 0, roster_spots: 0, order: categories.length + 1 }]);
  };

  const addPositionField = (category: string) => {
    const newPositions = { ...positions };
    if (!newPositions[category]) newPositions[category] = [];
    const order = (newPositions[category].length + 1).toString().padStart(2, '0'); // Format order as 01, 02, etc.
    const categoryIndex = categories.findIndex(cat => cat.name === category);
    newPositions[category].push({ name: '', amount: 0, scholarships: 0, roster_spots: 0, order: parseFloat(`${categoryIndex + 1}.${order}`), budgets: { mainAmount: 0, additionalAmounts: {} } });
    setPositions(newPositions);
  };

  const addSlotField = (category: string, position: string) => {
    const newSlots = { ...slots };
    if (!newSlots[category]) newSlots[category] = {};
    if (!newSlots[category][position]) newSlots[category][position] = [];
    
    // Initialize the new slot with proper budgets structure
    newSlots[category][position].push({
      name: newSlots[category][position].length + 1,
      amount: 0,
      budgets: {
        mainAmount: 0,
        additionalAmounts: {}
      }
    });
    
    setSlots(newSlots);
  };

  const removeCategory = (index: number) => {
    setDeleteWarning({
      type: 'category',
      categoryName: categories[index].name,
      index,
      isOpen: true
    });
  };

  const confirmRemoveCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
    const categoryName = categories[index].name;
    const newPositions = { ...positions };
    delete newPositions[categoryName];
    setPositions(newPositions);
    const newSlots = { ...slots };
    delete newSlots[categoryName];
    setSlots(newSlots);
    setDeleteWarning({ type: 'category', index: -1, isOpen: false });
  };

  const removePosition = (category: string, index: number) => {
    setDeleteWarning({
      type: 'position',
      categoryName: category,
      positionName: positions[category][index].name,
      index,
      isOpen: true
    });
  };

  const confirmRemovePosition = (category: string, index: number) => {
    const newPositions = { ...positions };
    const positionName = positions[category][index].name;
    newPositions[category] = newPositions[category].filter((_, i) => i !== index);
    setPositions(newPositions);
    const newSlots = { ...slots };
    if (newSlots[category]) {
      delete newSlots[category][positionName];
      setSlots(newSlots);
    }
    setDeleteWarning({ type: 'position', index: -1, isOpen: false });
  };

  const handlePositionNameClick = (category: string, index: number) => {
    const position = positions[category][index];
    if (!position.isEditing && position.name.trim() !== '') {
      setPositionRenameWarning({
        categoryName: category,
        positionName: position.name,
        index,
        newName: position.name,
        isOpen: true
      });
    }
  };

  const handlePositionNameChange = (category: string, index: number, newName: string) => {
    const newPositions = { ...positions };
    newPositions[category][index].name = newName;
    setPositions(newPositions);
  };

  const confirmPositionNameChange = (category: string, index: number, newName: string) => {
    const newPositions = { ...positions };
    newPositions[category][index].name = newName;
    newPositions[category][index].isEditing = true;
    setPositions(newPositions);
    setPositionRenameWarning({
      categoryName: '',
      positionName: '',
      index: -1,
      newName: '',
      isOpen: false
    });
  };

  const removeSlot = (category: string, position: string, index: number) => {
    const newSlots = { ...slots };
    newSlots[category][position] = newSlots[category][position].filter((_, i) => i !== index);
    setSlots(newSlots);
  };

  const calculateTotalForBudget = (budgets: BudgetAmount): number => {
    // For display purposes only - do not modify the main amount
    // This function is used to show the total of all budgets (main + additional)
    // but should not affect the main budget amount stored in the database
    return budgets.mainAmount + Object.values(budgets.additionalAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  const validateTotals = (): { valid: boolean, error?: string } => {
    const epsilon = 0.01; // Small value to account for floating-point imprecision
  
    // Check main budget totals
    const categoryMainTotal = categories.reduce((acc, category) => acc + category.budgets.mainAmount, 0);
    const scholarshipsTotal = categories.reduce((acc, category) => acc + category.scholarships, 0);
    const rosterSpotsTotal = categories.reduce((acc, category) => acc + category.roster_spots, 0);
  
    if (Math.abs(categoryMainTotal - overallBudget) > epsilon && categoryMainTotal !== 0 && overallBudget !== 0) {
      return { 
        valid: false, 
        error: `The overall main budget is $${formatNumber(overallBudget)}, but the categories main budgets add up to $${formatNumber(categoryMainTotal)}.` 
      };
    }
  
    // Check additional budget totals
    for (const additionalBudget of additionalBudgets) {
      const categoryAdditionalTotal = categories.reduce((acc, category) => 
        acc + (category.budgets.additionalAmounts[additionalBudget.name] || 0), 0);
  
      if (Math.abs(categoryAdditionalTotal - additionalBudget.amount) > epsilon && categoryAdditionalTotal !== 0 && additionalBudget.amount !== 0) {
        return { 
          valid: false, 
          error: `The overall ${additionalBudget.name} budget is $${formatNumber(additionalBudget.amount)}, but the categories ${additionalBudget.name} budgets add up to $${formatNumber(categoryAdditionalTotal)}.` 
        };
      }
    }
  
    if (Math.abs(scholarshipsTotal - overallScholarships) > epsilon && scholarshipsTotal !== 0 && overallScholarships !== 0) {
      return { 
        valid: false, 
        error: `The overall ${showScholarshipDollars ? 'scholarship dollars' : 'scholarships'} is ${formatNumber(overallScholarships, true)}, but the categories add up to ${formatNumber(scholarshipsTotal, true)} ${showScholarshipDollars ? 'scholarship dollars' : 'scholarships'}.` 
      };
    }
  
    if (rosterSpotsTotal !== overallRosterSpots && rosterSpotsTotal !== 0 && overallRosterSpots !== 0) {
      return { 
        valid: false, 
        error: `The overall roster spots is ${overallRosterSpots}, but the categories add up to ${rosterSpotsTotal} roster spots.` 
      };
    }
  
    const categoryNames = new Set<string>();
  
    for (const category of categories) {
      if (categoryNames.has(category.name)) {
        return { valid: false, error: `Duplicate category name found: ${category.name}.` };
      }
      categoryNames.add(category.name);
  
      // Check main budget totals for positions
      const positionsMainTotal = (positions[category.name] || [])
        .reduce((acc, position) => acc + position.amount, 0);
    

      if (Math.abs(positionsMainTotal - category.amount) > epsilon && positionsMainTotal !== 0 && category.amount !== 0) {
        return { 
          valid: false, 
          error: `The ${category.name} main budget is $${formatNumber(category.amount)}, but its positions main budgets add up to $${formatNumber(positionsMainTotal)}.` 
        };
      }
  
      // Check additional budget totals for positions
      for (const additionalBudget of additionalBudgets) {
        const positionsAdditionalTotal = (positions[category.name] || [])
          .reduce((acc, position) => acc + (position.budgets.additionalAmounts[additionalBudget.name] || 0), 0);
        
        const categoryAdditionalAmount = category.budgets.additionalAmounts[additionalBudget.name] || 0;
        
        if (Math.abs(positionsAdditionalTotal - categoryAdditionalAmount) > epsilon && positionsAdditionalTotal !== 0 && categoryAdditionalAmount !== 0) {
          return { 
            valid: false, 
            error: `The ${category.name} ${additionalBudget.name} budget is $${formatNumber(categoryAdditionalAmount)}, but its positions ${additionalBudget.name} budgets add up to $${formatNumber(positionsAdditionalTotal)}.` 
          };
        }
      }
  
      // Check scholarships and roster spots
      const positionsScholarshipsTotal = (positions[category.name] || [])
        .reduce((acc, position) => acc + position.scholarships, 0);
      const positionsRosterSpotsTotal = (positions[category.name] || [])
        .reduce((acc, position) => acc + position.roster_spots, 0);
  
      if ((positionsScholarshipsTotal !== category.scholarships && positionsScholarshipsTotal !== 0 && category.scholarships !== 0) ||
          (positionsRosterSpotsTotal !== category.roster_spots && positionsRosterSpotsTotal !== 0 && category.roster_spots !== 0)) {
        return { 
          valid: false, 
          error: `The ${category.name} has ${category.scholarships.toLocaleString()} scholarships and ${category.roster_spots} roster spots, but its positions add up to ${positionsScholarshipsTotal.toLocaleString()} scholarships and ${positionsRosterSpotsTotal} roster spots.` 
        };
      }
  
      const positionNames = new Set<string>();
  
      for (const position of positions[category.name] || []) {
        if (positionNames.has(position.name)) {
          return { valid: false, error: `Duplicate position name found in category "${category.name}": ${position.name}.` };
        }
        positionNames.add(position.name);
  
        // Check main budget totals for slots
        const slotsMainTotal = (slots[category.name]?.[position.name] || [])
          .reduce((acc, slot) => acc + slot.amount, 0);
  
        if (Math.abs(slotsMainTotal - position.amount) > epsilon && slotsMainTotal !== 0 && position.amount !== 0) {
          return { 
            valid: false, 
            error: `The ${position.name} main budget is $${formatNumber(position.amount)}, but its slots main budgets add up to $${formatNumber(slotsMainTotal)}.` 
          };
        }
  
        // Check additional budget totals for slots
        for (const additionalBudget of additionalBudgets) {
          const slotsAdditionalTotal = (slots[category.name]?.[position.name] || [])
            .reduce((acc, slot) => acc + (slot.budgets.additionalAmounts[additionalBudget.name] || 0), 0);
            
          const positionAdditionalAmount = position.budgets.additionalAmounts[additionalBudget.name] || 0;
            
          if (Math.abs(slotsAdditionalTotal - positionAdditionalAmount) > epsilon && slotsAdditionalTotal !== 0 && positionAdditionalAmount !== 0) {
            return { 
              valid: false, 
              error: `The ${position.name} ${additionalBudget.name} budget is $${formatNumber(positionAdditionalAmount)}, but its slots ${additionalBudget.name} budgets add up to $${formatNumber(slotsAdditionalTotal)}.` 
            };
          }
        }
      }
    }
  
    return { valid: true };
  };

  const formatNumber = (value: number | string, isScholarship: boolean = false, isPercentage: boolean = false): string => {
    if (value === '' || isNaN(Number(value))) return '0';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isScholarship) {
      return numValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
    else if (isPercentage) {
      return numValue.toFixed(2);
    } else {
      return Math.round(numValue).toLocaleString();
    }
  };

  const parseNumber = (value: string): number => {
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  // Add new helper function near the top of the component
  const calculatePercentage = (amount: number, total: number): number => {
    const result = total === 0 ? 0 : (amount / total) * 100;
    return result;
  };

  // Add new handler for percentage input
  const handlePercentageInput = (
    value: string,
    totalAmount: number,
    setter: (value: number) => void,
    inputId: string
  ) => {
    
    const input = inputRefs.current[inputId];
    if (!input) {
      return;
    }

    const cursorPosition = input.selectionStart || 0;
    const oldValue = input.value;
    
    const cleanValue = value
      .replace(/[^\d.]/g, '')
      .replace(/(\..*)\./g, '$1');
    
    const endsWithDecimal = cleanValue.endsWith('.');
    const percentage = cleanValue === '' ? 0 : 
                      cleanValue === '.' ? 0 : 
                      parseFloat(cleanValue);

    // Calculate the new amount based on the percentage
    const newAmount = (percentage / 100) * totalAmount;    
    setter(newAmount);

    const formattedValue = cleanValue === '' ? '' : 
                          endsWithDecimal ? percentage + '.' :
                          percentage.toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 2
                          });

    setTimeout(() => {
      input.value = formattedValue;
      const newCursorPosition = cursorPosition + (formattedValue.length - oldValue.length);
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const handleUndoClick = () => {
    setShowUndoWarning(true);
    // Ensure the warning box is scrolled into view
    setTimeout(() => {
      const warningBox = document.querySelector(`.${styles.warningBox}`) as HTMLElement;
      if (warningBox) {
        warningBox.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    }, 0);
  };

  const calculateTotalBudget = () => {
    return [overallBudget, ...additionalBudgets.map(b => b.amount)].reduce((sum, budget) => sum + budget, 0);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Add 1 to account for the base budget column
    const columnsToAdd = additionalBudgets.length === 0 ? 2 : 6 + ((additionalBudgets.length - 1) * 2);
    root.style.setProperty('--num-budget-columns', `${columnsToAdd}`);
  }, [additionalBudgets.length]);

  const handleCategoryNameChange = (index: number, newName: string) => {
    const newCategories = [...categories];
    newCategories[index].name = newName;
    setCategories(newCategories);
  };

  const calculateTotalForCategory = (budgets: BudgetAmount): number => {
    return calculateTotalForBudget(budgets);
  };

  const calculateTotalForPosition = (budgets: BudgetAmount): number => {
    return budgets.mainAmount + Object.values(budgets.additionalAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  const calculateTotalForSlot = (budgets: BudgetAmount): number => {
    return calculateTotalForBudget(budgets);
  };

  if (showFilterWarning) {
    return (
      <FilterWarning 
        onProceed={() => setShowFilterWarning(false)}
        onGoBack={() => {
          selectOption('Positional Ranking');
        }}
      />
    );
  }

  return (
    <div ref={containerRef} className={styles.budgetContainer}>
      <div className={styles.gridContainer}>
        {/* Header Row */}
        <div className={styles.gridRow}>
          <div className={styles.categoryLabel}></div>
          <div className={styles.headerCell}>
            {additionalBudgets.length > 0 ? 'Main Budget $' : 'Budget $'}
          </div>
          <div className={styles.headerCell}>
            {additionalBudgets.length > 0 ? 'Main %' : 'Budget %'}
          </div>
          {additionalBudgets.map((budget, index) => (
            <React.Fragment key={`budget-header-${index}`}>
              <div className={styles.headerCell}>{budget.name} $</div>
              <div className={styles.headerCell}>{budget.name} %</div>
            </React.Fragment>
          ))}
          {additionalBudgets.length > 0 && (
            <>
              <div className={styles.headerCell}>Total $</div>
              <div className={styles.headerCell}>Total %</div>
            </>
          )}
          <div className={styles.headerCell}>
            {showScholarshipDollars ? 'Scholarship $' : 'Scholarships'}
          </div>
          <div className={styles.headerCell}>
            Roster Spots
            <FaPlus 
              className={styles.addBudgetIcon} 
              onClick={() => setShowAddBudgetWarning(true)}
              title="Add Budget Pool"
            />
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>

        {/* Overall Row */}
        <div className={`${styles.gridRow} ${styles.overallRow}`}>
          <div className={styles.categoryLabel}>Overall</div>
          <DollarInput
            ref={(el) => { inputRefs.current['overallBudget'] = el; }}
            value={overallBudget}
            onChange={(value) => setOverallBudget(value)}
            name="overallBudget"
          />
          <div className={styles.percentageInput}>
            <input
              ref={(el) => { inputRefs.current['overallBudgetPercentage'] = el; }}
              type="text"
              value={formatNumber(100, false, true)}
              disabled
            />
            <span>%</span>
          </div>
          {additionalBudgets.map((budget, index) => (
            <React.Fragment key={`budget-overall-${index}`}>
            <DollarInput
              ref={(el) => { inputRefs.current[`additionalBudget-${index}`] = el; }}
              value={budget.amount}
              onChange={(value) => {
                const newBudgets = [...additionalBudgets];
                newBudgets[index].amount = value;
                setAdditionalBudgets(newBudgets);
              }}
              name={`additionalBudget-${index}`}
            />
              <div className={styles.percentageInput}>
                <input
                  ref={(el) => { inputRefs.current[`additionalBudgetPercentage-${index}`] = el; }}
                  type="text"
                  value={formatNumber(100, false, true)}
                  disabled
                />
                <span>%</span>
              </div>
            </React.Fragment>
          ))}
          {additionalBudgets.length > 0 && (
            <>
              <DollarInput
                value={calculateTotalBudget()}
                onChange={() => {}}
                disabled={true}
                className={styles.totalBudget}
              />
              <div className={styles.percentageInput}>
                <input
                  type="text"
                  value={formatNumber(100, false, true)}
                  disabled
                />
                <span>%</span>
              </div>
            </>
          )}
          <div className={styles.scholarshipsInput}>
            <input
              ref={(el) => { inputRefs.current['overallScholarships'] = el; }}
              type="text"
              value={formatNumber(overallScholarships, true)}
              onChange={(e) => handleScholarshipInput(e.target.value, setOverallScholarships, 'overallScholarships')}
              placeholder={showScholarshipDollars ? "Scholarship $" : "Scholarships"}
            />
          </div>
          <div className={styles.rosterSpotsInput}>
            <input
              ref={(el) => { inputRefs.current['overallRosterSpots'] = el; }}
              type="text"
              value={formatNumber(overallRosterSpots)}
              onChange={(e) => handleRosterSpotInput(e.target.value, setOverallRosterSpots, 'overallRosterSpots')}
              placeholder="Roster Spots"
            />
          </div>
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>

        {/* Create Category Button when no categories exist */}
        {categories.length === 0 && (
          <div className={styles.createButtonContainer}>
            <button 
              onClick={addCategoryField}
              className={`${styles.createButton} ${styles.categoryButton}`}
            >
              Create Your First Category
            </button>
          </div>
        )}

        {/* Categories */}
        {categories.map((category, categoryIndex) => (
          <React.Fragment key={`category-${categoryIndex}`}>
            {/* Category Row */}
            <div className={`${styles.gridRow}`}>
              <div className={styles.categoryLabel}>
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => handleCategoryNameChange(categoryIndex, e.target.value)}
                  className={styles.labelInput}
                />
              </div>
              <DollarInput
                ref={(el) => { inputRefs.current[`category-${categoryIndex}-amount`] = el; }}
                value={category.budgets.mainAmount}
                onChange={(value) => handleCategoryChange(categoryIndex, 'amount', value.toString())}
                name={`category-${categoryIndex}-amount`}
              />
              <div className={styles.percentageInput}>
                <input
                  ref={(el) => { inputRefs.current[`category-${categoryIndex}-percentage`] = el; }}
                  type="text"
                  value={formatNumber(calculatePercentage(category.budgets.mainAmount, overallBudget), false, true)}
                  onChange={(e) => handleCategoryChange(categoryIndex, 'percentage', e.target.value)}
                />
                <span>%</span>
              </div>
              {additionalBudgets.map((budget, budgetIndex) => (
                <React.Fragment key={`category-${categoryIndex}-budget-${budgetIndex}`}>
                  <DollarInput
                    ref={(el) => { inputRefs.current[`category-${categoryIndex}-${budget.name}-amount`] = el; }}
                    value={category.budgets.additionalAmounts[budget.name] || 0}
                    onChange={(value) => handleCategoryChange(categoryIndex, `${budget.name}-amount`, value.toString())}
                    name={`category-${categoryIndex}-${budget.name}-amount`}
                  />
                  <div className={styles.percentageInput}>
                    <input
                      ref={(el) => { inputRefs.current[`category-${categoryIndex}-${budget.name}-percentage`] = el; }}
                      type="text"
                      value={formatNumber(calculatePercentage(
                        category.budgets.additionalAmounts[budget.name] || 0,
                        budget.amount
                      ), false, true)}
                      onChange={(e) => handleCategoryChange(categoryIndex, `${budget.name}-percentage`, e.target.value)}
                    />
                    <span>%</span>
                  </div>
                </React.Fragment>
              ))}
              {additionalBudgets.length > 0 && (
                <>
                  <DollarInput
                    value={calculateTotalForCategory(category.budgets)}
                    onChange={() => {}}
                    disabled={true}
                    className={styles.totalBudget}
                  />
                  <div className={styles.percentageInput}>
                    <input
                      type="text"
                      value={formatNumber(calculatePercentage(
                        calculateTotalForCategory(category.budgets),
                        calculateTotalBudget()
                      ), false, true)}
                      disabled
                    />
                    <span>%</span>
                  </div>
                </>
              )}
              <div className={styles.scholarshipsInput}>
                <input
                  ref={(el) => { inputRefs.current[`category-${categoryIndex}-scholarships`] = el; }}
                  type="text"
                  value={formatNumber(category.scholarships, true)}
                  onChange={(e) => handleCategoryChange(categoryIndex, 'scholarships', e.target.value)}
                  placeholder={showScholarshipDollars ? "Scholarship $" : "Scholarships"}
                />
              </div>
              <div className={styles.rosterSpotsInput}>
                <input
                  ref={(el) => { inputRefs.current[`category-${categoryIndex}-roster_spots`] = el; }}
                  type="text"
                  value={formatNumber(category.roster_spots)}
                  onChange={(e) => handleCategoryChange(categoryIndex, 'roster_spots', e.target.value)}
                />
              </div>
              <div>
                <button 
                  onClick={() => removeCategory(categoryIndex)}
                  className={`${styles.iconButton} ${styles.red}`}
                >
                  <FaTrash />
                </button>
              </div>
              {categoryIndex > 0 && (
                <div>
                  <button 
                    onClick={() => moveCategory(categoryIndex, 'up')}
                    className={`${styles.iconButton} ${styles.neutral}`}
                  >
                    <FaArrowUp />
                  </button>
                </div>
              )}
              {categoryIndex < categories.length - 1 && (
                <div>
                  <button 
                    onClick={() => moveCategory(categoryIndex, 'down')}
                    className={`${styles.iconButton} ${styles.neutral}`}
                  >
                    <FaArrowDown />
                  </button>
                </div>
              )}
              {categoryIndex === categories.length - 1 && (
                <div>
                  <button 
                    onClick={addCategoryField}
                    className={`${styles.iconButton} ${styles.green}`}
                  >
                    <FaPlus />
                  </button>
                </div>
              )}
              {[...Array(4 - (
                1 + // Remove button
                (categoryIndex > 0 ? 1 : 0) + // Up button
                (categoryIndex < categories.length - 1 ? 1 : 0) + // Down button
                (categoryIndex === categories.length - 1 ? 1 : 0) // Add button
              ))].map((_, i) => <div key={i}></div>)}
            </div>

            {/* Create Position Button when no positions exist for this category */}
            {(!positions[category.name] || positions[category.name].length === 0) && (
              <div className={styles.createButtonContainer}>
                <button 
                  onClick={() => addPositionField(category.name)}
                  className={`${styles.createButton} ${styles.positionButton}`}
                >
                  Create Your First Position in {category.name}
                </button>
              </div>
            )}

            {/* Positions */}
            {positions[category.name]?.map((position, positionIndex) => (
              <React.Fragment key={`position-${categoryIndex}-${positionIndex}`}>
                <div className={`${styles.gridRow}`}>
                  <div className={styles.positionLabel}>
                    <input
                      type="text"
                      value={position.name}
                      onClick={() => handlePositionNameClick(category.name, positionIndex)}
                      onChange={(e) => handlePositionNameChange(category.name, positionIndex, e.target.value)}
                      className={styles.labelInput}
                    />
                  </div>
                  <DollarInput
                    ref={(el) => { inputRefs.current[`position-${category.name}-${positionIndex}-amount`] = el; }}
                    value={position.amount}
                    onChange={(value) => handlePositionChange(category.name, positionIndex, 'amount', value.toString())}
                    name={`position-${category.name}-${positionIndex}-amount`}
                  />
                  <div className={styles.percentageInput}>
                    <input
                      ref={(el) => { inputRefs.current[`position-${category.name}-${positionIndex}-percentage`] = el; }}
                      type="text"
                      value={formatNumber(calculatePercentage(
                        position.amount,
                        categories.find(c => c.name === category.name)?.budgets.mainAmount || 0
                      ), false, true)}
                      onChange={(e) => handlePositionChange(category.name, positionIndex, 'percentage', e.target.value)}
                    />
                    <span>%</span>
                  </div>
                  {additionalBudgets.map((budget, budgetIndex) => (
                    <React.Fragment key={`position-${categoryIndex}-${positionIndex}-budget-${budgetIndex}`}>
                      <DollarInput
                        ref={(el) => { inputRefs.current[`position-${category.name}-${positionIndex}-${budget.name}-amount`] = el; }}
                        value={position.budgets.additionalAmounts[budget.name] || 0}
                        onChange={(value) => handlePositionChange(category.name, positionIndex, `${budget.name}-amount`, value.toString())}
                        name={`position-${category.name}-${positionIndex}-${budget.name}-amount`}
                      />
                      <div className={styles.percentageInput}>
                        <input
                          ref={(el) => { inputRefs.current[`position-${category.name}-${positionIndex}-${budget.name}-percentage`] = el; }}
                          type="text"
                          value={formatNumber(calculatePercentage(
                            position.budgets.additionalAmounts[budget.name] || 0,
                            categories.find(c => c.name === category.name)?.budgets.additionalAmounts[budget.name] || 0
                          ), false, true)}
                          onChange={(e) => handlePositionChange(category.name, positionIndex, `${budget.name}-percentage`, e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </React.Fragment>
                  ))}
                  {additionalBudgets.length > 0 && (
                    <>
                      <DollarInput
                        value={calculateTotalForPosition(position.budgets)}
                        onChange={() => {}}
                        disabled={true}
                        className={styles.totalBudget}
                      />
                      <div className={styles.percentageInput}>
                        <input
                          type="text"
                          value={formatNumber(calculatePercentage(
                            calculateTotalForPosition(position.budgets),
                            calculateTotalForCategory(category.budgets)
                          ), false, true)}
                          disabled
                        />
                        <span>%</span>
                      </div>
                    </>
                  )}
                  <div className={styles.scholarshipsInput}>
                    <input
                      ref={(el) => { inputRefs.current[`position-${category.name}-${positionIndex}-scholarships`] = el; }}
                      type="text"
                      value={formatNumber(position.scholarships, true)}
                      onChange={(e) => handlePositionChange(category.name, positionIndex, 'scholarships', e.target.value)}
                      placeholder={showScholarshipDollars ? "Scholarship $" : "Scholarships"}
                    />
                  </div>
                  <div className={styles.rosterSpotsInput}>
                    <input
                      ref={(el) => { inputRefs.current[`position-${category.name}-${positionIndex}-roster_spots`] = el; }}
                      type="text"
                      value={formatNumber(position.roster_spots)}
                      onChange={(e) => handlePositionChange(category.name, positionIndex, 'roster_spots', e.target.value)}
                    />
                  </div>
                  <div className={styles.actionButtons}>
                    <button 
                      onClick={() => removePosition(category.name, positionIndex)}
                      className={`${styles.iconButton} ${styles.red}`}
                    >
                      <FaTrash />
                    </button>
                    {positionIndex > 0 && (
                      <button 
                        onClick={() => movePosition(category.name, positionIndex, 'up')}
                        className={`${styles.iconButton} ${styles.neutral}`}
                      >
                        <FaArrowUp />
                      </button>
                    )}
                    {positionIndex < positions[category.name].length - 1 && (
                      <button 
                        onClick={() => movePosition(category.name, positionIndex, 'down')}
                        className={`${styles.iconButton} ${styles.neutral}`}
                      >
                        <FaArrowDown />
                      </button>
                    )}
                    <button 
                      onClick={() => addPositionField(category.name)}
                      className={`${styles.iconButton} ${styles.green}`}
                    >
                      <FaPlus />
                    </button>
                    {(!slots[category.name]?.[position.name] || slots[category.name][position.name].length === 0) && (
                      <button 
                        onClick={() => addSlotField(category.name, position.name)}
                        className={`${styles.iconButton} ${styles.createSlotButton}`}
                      >
                        + Slot
                      </button>
                    )}
                  </div>
                </div>

                {/* Slots */}
                {slots[category.name]?.[position.name]?.map((slot, slotIndex) => (
                  <div className={`${styles.gridRow}`} key={`slot-${categoryIndex}-${positionIndex}-${slotIndex}`}>
                    <div className={styles.slotLabel}>{slot.name}</div>
                      <DollarInput
                        ref={(el) => { inputRefs.current[`slot-${category.name}-${position.name}-${slotIndex}-amount`] = el; }}
                        value={slot.amount}
                        onChange={(value) => handleSlotChange(category.name, position.name, slotIndex, 'amount', value.toString())}
                        name={`slot-${category.name}-${position.name}-${slotIndex}-amount`}
                      />
                    <div className={styles.percentageInput}>
                      <input
                        ref={(el) => { inputRefs.current[`slot-${category.name}-${position.name}-${slotIndex}-percentage`] = el; }}
                        type="text"
                        value={formatNumber(calculatePercentage(
                          slot.amount,
                          positions[category.name]?.find(p => p.name === position.name)?.amount || 0
                        ), false, true)}
                        onChange={(e) => handleSlotChange(category.name, position.name, slotIndex, 'percentage', e.target.value)}
                      />
                      <span>%</span>
                    </div>
                    {additionalBudgets.map((budget, budgetIndex) => (
                      <React.Fragment key={`slot-${categoryIndex}-${positionIndex}-${slotIndex}-budget-${budgetIndex}`}>
                          <DollarInput
                            ref={(el) => { inputRefs.current[`slot-${category.name}-${position.name}-${slotIndex}-${budget.name}-amount`] = el; }}
                            value={slot.budgets.additionalAmounts[budget.name] || 0}
                            onChange={(value) => handleSlotChange(category.name, position.name, slotIndex, `${budget.name}-amount`, value.toString())}
                            name={`slot-${category.name}-${position.name}-${slotIndex}-${budget.name}-amount`}
                          />
                        <div className={styles.percentageInput}>
                          <input
                            ref={(el) => { inputRefs.current[`slot-${category.name}-${position.name}-${slotIndex}-${budget.name}-percentage`] = el; }}
                            type="text"
                            value={formatNumber(calculatePercentage(
                              slot.budgets.additionalAmounts[budget.name] || 0,
                              positions[category.name]?.find(p => p.name === position.name)?.budgets.additionalAmounts[budget.name] || 0
                            ), false, true)}
                            onChange={(e) => handleSlotChange(category.name, position.name, slotIndex, `${budget.name}-percentage`, e.target.value)}
                          />
                          <span>%</span>
                        </div>
                      </React.Fragment>
                    ))}
                    {additionalBudgets.length > 0 && (
                      <>
                        <DollarInput
                          value={calculateTotalForBudget(slot.budgets)}
                          onChange={() => {}}
                          disabled={true}
                          className={styles.totalBudget}
                        />
                        <div className={styles.percentageInput}>
                          <input
                            type="text"
                            value={formatNumber(calculatePercentage(
                              calculateTotalForBudget(slot.budgets),
                              calculateTotalForBudget(positions[category.name]?.find(p => p.name === position.name)?.budgets || { mainAmount: 0, additionalAmounts: {} })
                            ), false, true)}
                            disabled
                          />
                          <span>%</span>
                        </div>
                      </>
                    )}
                    <div></div> {/* Empty scholarship cell */}
                    <div></div> {/* Empty roster spots cell */}
                    <div>
                      <button 
                        onClick={() => removeSlot(category.name, position.name, slotIndex)}
                        className={`${styles.iconButton} ${styles.red}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    {slotIndex === slots[category.name][position.name].length - 1 && (
                      <div>
                        <button 
                          onClick={() => addSlotField(category.name, position.name)}
                          className={`${styles.iconButton} ${styles.green}`}
                        >
                          <FaPlus />
                        </button>
                      </div>
                    )}
                    {[...Array(4 - (
                      1 + // Remove button
                      (slotIndex === slots[category.name][position.name].length - 1 ? 1 : 0) // Add button
                    ))].map((_, i) => <div key={i}></div>)}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>
      <div className={styles.buttonContainer}>
        <button 
          onClick={handleSave} 
          className={saving ? styles.savingButton : styles.saveButton}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button 
          onClick={handleUndoClick}
          className={styles.undoButton}
        >
          Undo Changes
        </button>
      </div>

      {showUndoWarning && (
        <div className={styles.warningOverlay}>
          <div className={styles.warningBox}>
            <h3>Warning</h3>
            <p>Are you sure you want to undo all changes? This action cannot be reversed.</p>
            <div className={styles.warningButtons}>
              <button 
                onClick={async () => {
                  setAdditionalBudgets([]); // Reset additional budgets
                  await loadBudgetData(team); // Reload data from database
                  setShowUndoWarning(false);
                }}
                className={styles.confirmButton}
              >
                Yes, Undo Changes
              </button>
              <button 
                onClick={() => setShowUndoWarning(false)}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddBudgetWarning && (
        <div className={styles.warningOverlay}>
          <div className={styles.warningBox}>
            <h3>Advanced Feature Warning</h3>
            <p>Adding an additional budget pool is an advanced feature that allows you to allocate money from multiple sources. Are you sure you want to proceed?</p>
            <div className={styles.budgetNameInput}>
              <label>Budget Name:</label>
              <input
                type="text"
                value={newBudgetName}
                onChange={(e) => setNewBudgetName(e.target.value)}
                placeholder="Enter budget name"
              />
            </div>
            <div className={styles.warningButtons}>
              <button 
                onClick={() => {
                  if (newBudgetName.trim()) {
                    setAdditionalBudgets([...additionalBudgets, { name: newBudgetName, amount: 0 }]);
                    setNewBudgetName('');
                    setShowAddBudgetWarning(false);
                  }
                }}
                className={styles.confirmButton}
                disabled={!newBudgetName.trim()}
              >
                Yes, Add Budget Pool
              </button>
              <button 
                onClick={() => {
                  setNewBudgetName('');
                  setShowAddBudgetWarning(false);
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteWarning.isOpen && (
        <div className={styles.warningOverlay}>
          <div className={styles.warningBox}>
            <h3>Warning</h3>
            <p>
              {deleteWarning.type === 'category' 
                ? `Deleting the category "${deleteWarning.categoryName}" will hide all players and positions connected to it.`
                : `Deleting the position "${deleteWarning.positionName}" will hide all players assigned to it.`}
            </p>
            <p>Please reassign any connected players before proceeding.</p>
            <div className={styles.warningButtons}>
              <button 
                onClick={() => {
                  if (deleteWarning.type === 'category') {
                    confirmRemoveCategory(deleteWarning.index);
                  } else if (deleteWarning.categoryName) {
                    confirmRemovePosition(deleteWarning.categoryName, deleteWarning.index);
                  }
                }}
                className={styles.confirmButton}
              >
                Yes, Delete {deleteWarning.type === 'category' ? 'Category' : 'Position'}
              </button>
              <button 
                onClick={() => setDeleteWarning({ type: 'category', index: -1, isOpen: false })}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {positionRenameWarning.isOpen && (
        <div className={styles.warningOverlay}>
          <div className={styles.warningBox}>
            <h3>Warning</h3>
            <p>
              Changing the position name will affect all players assigned to this position.
            </p>
            <p>Please ensure all player assignments are updated accordingly.</p>
            <div className={styles.warningButtons}>
              <button 
                onClick={() => confirmPositionNameChange(
                  positionRenameWarning.categoryName,
                  positionRenameWarning.index,
                  positionRenameWarning.newName
                )}
                className={styles.confirmButton}
              >
                Yes, Change Position Name
              </button>
              <button 
                onClick={() => {
                  // Reset the input to the original name
                  const newPositions = { ...positions };
                  const originalName = positionRenameWarning.positionName;
                  newPositions[positionRenameWarning.categoryName][positionRenameWarning.index].name = originalName;
                  setPositions(newPositions);
                  setPositionRenameWarning({
                    categoryName: '',
                    positionName: '',
                    index: -1,
                    newName: '',
                    isOpen: false
                  });
                }}
                className={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;