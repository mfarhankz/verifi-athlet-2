import React, { useState, useEffect } from "react";
import { Button, Flex, Input, Radio, Select, InputNumber, Drawer } from "antd";
import type { CollapseProps } from "antd";
import { Collapse } from "antd";
import { FilterState } from "@/types/filters";
import { SportStatConfig } from "@/types/database";
import { fetchPositionsBySportId, fetchInternationalOptions } from "@/lib/queries";
import { useCustomer } from '@/contexts/CustomerContext';
import { US_STATE_ABBREVIATIONS } from '@/utils/constants';

export interface FiltersProps {
  onApplyFilters: (filters: FilterState) => void;
  onResetFilters: () => void;
  dynamicColumns?: SportStatConfig[];
  filterColumns?: SportStatConfig[];
}

export default function Filters({ onApplyFilters, onResetFilters, dynamicColumns = [], filterColumns = [] }: FiltersProps) {
  const [filterState, setFilterState] = useState<FilterState>({});
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({});
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dropdownKey, setDropdownKey] = useState(0);
  const [locationDropdownKey, setLocationDropdownKey] = useState(0);
  const [positions, setPositions] = useState<{ name: string; order: number }[]>([]);
  const [internationalOptions, setInternationalOptions] = useState<string[]>([]);
  const [internationalLoading, setInternationalLoading] = useState(false);
  const { activeCustomerId, customers } = useCustomer();









  // Use shared US state abbreviations constant (includes DC)
  const states = US_STATE_ABBREVIATIONS;

  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Withdrawn', label: 'Withdrawn' },
    { value: 'Matriculated', label: 'Matriculated' },
    { value: 'Signed', label: 'Signed' }
  ];

  const compareOptions = [
    { value: 'greater', label: 'Min' },
    { value: 'less', label: 'Max' },
    { value: 'equal', label: 'Equal to' },
    { value: 'between', label: 'In between' }
  ];

  // Fetch positions when component mounts or sport changes
  useEffect(() => {
    const loadPositions = async () => {
      if (activeCustomerId) {
        try {
          // Get sport_id from the active customer
          const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
          if (activeCustomer?.sport_id) {
            const positionsData = await fetchPositionsBySportId(activeCustomer.sport_id);
            setPositions(positionsData);
          }
        } catch (error) {
          console.error('Error loading positions:', error);
          setPositions([]);
        }
      }
    };

    loadPositions();
  }, [activeCustomerId, customers]);

  // Fetch international options when component mounts or sport changes
  useEffect(() => {
    const loadInternationalOptions = async () => {
      if (activeCustomerId) {
        try {
          setInternationalLoading(true);
          // Get sport_id from the active customer
          const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
          if (activeCustomer?.sport_id) {
            const internationalData = await fetchInternationalOptions(activeCustomer.sport_id);
            setInternationalOptions(internationalData);
          }
        } catch (error) {
          console.error('Error loading international options:', error);
          setInternationalOptions([]);
        } finally {
          setInternationalLoading(false);
        }
      }
    };

    // Use setTimeout to prevent React state update during render
    const timeoutId = setTimeout(loadInternationalOptions, 0);
    
    return () => clearTimeout(timeoutId);
  }, [activeCustomerId, customers]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilterState(prev => {
      // Special handling for dateRange to set end date to today if not provided
      if (key === 'dateRange') {
        const today = new Date().toISOString().split('T')[0];
        return {
          ...prev,
          [key]: {
            ...value,
            endDate: value.endDate || today
          }
        };
      }
      return {
        ...prev,
        [key]: value
      };
    });
  };

  const handleRemoveFilter = (key: keyof FilterState) => {
    setFilterState(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
    
    setAppliedFilters(prev => {
      const newState = { ...prev };
      delete newState[key];
      onApplyFilters(newState);
      return newState;
    });
  };

  const getFilterLabel = (key: keyof FilterState): string => {
    const filtersToUse = appliedFilters;
    
    switch (key) {
      case 'years':
        return `Year: ${filtersToUse.years?.join(', ')}`;
      case 'divisions':
        return `Division: ${filtersToUse.divisions?.join(', ')}`;
      case 'states':
        return `Home State: ${filtersToUse.states?.join(', ')}`;
      case 'international':
        // Handle "All International" selection specially
        const internationalLabels = filtersToUse.international?.map(item => 
          item === 'ALL_INTERNATIONAL' ? 'All International' : item
        );
        return `International: ${internationalLabels?.join(', ')}`;
      case 'status':
        return `Status: ${filtersToUse.status?.join(', ')}`;
      case 'position':
        return `Position: ${filtersToUse.position?.join(', ')}`;
      case 'gamesPlayed':
        return `GP ${filtersToUse.gamesPlayed?.comparison} ${filtersToUse.gamesPlayed?.value}`;
      case 'gamesStarted':
        return `GS ${filtersToUse.gamesStarted?.comparison} ${filtersToUse.gamesStarted?.value}`;
      case 'goals':
        return `Goals ${filtersToUse.goals?.comparison} ${filtersToUse.goals?.value}`;
      case 'assists':
        return `Assists ${filtersToUse.assists?.comparison} ${filtersToUse.assists?.value}`;
      case 'goalkeeperMinutes':
        return `GK Min ${filtersToUse.goalkeeperMinutes?.comparison} ${filtersToUse.goalkeeperMinutes?.value}`;
      case 'athleticAid':
        return `Athletic Aid: ${filtersToUse.athleticAid?.join(', ')}`;
      case 'dateRange':
        return `Date Entered: ${filtersToUse.dateRange?.startDate} - ${filtersToUse.dateRange?.endDate}`;
      case 'survey_completed':
        // Handle both array format (from multiple select) and boolean format
        if (Array.isArray(filtersToUse.survey_completed)) {
          if (filtersToUse.survey_completed.includes(true) && filtersToUse.survey_completed.includes(false)) {
            return 'Survey Completed: Yes, No';
          } else if (filtersToUse.survey_completed.includes(true)) {
            return 'Survey Completed: Yes';
          } else if (filtersToUse.survey_completed.includes(false)) {
            return 'Survey Completed: No';
          }
        } else {
          // Handle direct boolean values
          if (filtersToUse.survey_completed === true) return 'Survey Completed: Yes';
          if (filtersToUse.survey_completed === false) return 'Survey Completed: No';
        }
        return '';
      case 'gradStudent':
        // Handle array format for grad student filter
        if (Array.isArray(filtersToUse.gradStudent)) {
          if (filtersToUse.gradStudent.includes(true) && filtersToUse.gradStudent.includes(false)) {
            return 'Grad Student: Yes, No';
          } else if (filtersToUse.gradStudent.includes(true)) {
            return 'Grad Student: Yes';
          } else if (filtersToUse.gradStudent.includes(false)) {
            return 'Grad Student: No';
          }
        }
        return '';
      default:
        // Handle dynamic stat filters
        if (key.toString().startsWith('stat_')) {
          const dataTypeId = key.toString().replace('stat_', '');
          const column = filterColumns.find(col => col.data_type_id.toString() === dataTypeId);
          const filterValue = filtersToUse[key];
          
          // Use display_name or data_type_name as fallback, or the key itself as last resort
          let columnName = column?.display_name || column?.data_type_name || `Stat ${dataTypeId}`;
          
          // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
          // Exclude position-agnostic stats like GP (Games Played)
          const isBaseball = Number(column?.sport_id) === 6;
          const isPositionAgnostic = column?.display_name === 'GP' || column?.display_name === 'GS' || 
                                          column?.data_type_id === 98 || column?.data_type_id === 83;
          if (isBaseball && column?.stat_category && !isPositionAgnostic) {
            const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
            columnName = `${categoryPrefix} - ${columnName}`;
          }
          
          if (filterValue && typeof filterValue === 'object' && 'comparison' in filterValue) {
            if (filterValue.comparison === 'between' && 'minValue' in filterValue && 'maxValue' in filterValue) {
              return `${columnName} between ${filterValue.minValue} - ${filterValue.maxValue}`;
            } else if ('value' in filterValue) {
              const comparisonLabel = filterValue.comparison === 'greater' ? 'Min' : 
                                    filterValue.comparison === 'less' ? 'Max' : 
                                    filterValue.comparison;
              return `${columnName} ${comparisonLabel} ${filterValue.value}`;
            }
          }
        }
        return '';
    }
  };

  const renderFilterBadges = () => {
    return Object.keys(appliedFilters).map((key) => (
      <div key={key} className="filter-badge">
        <span>{getFilterLabel(key as keyof FilterState)}</span>
        <i 
          className="icon-xmark-regular" 
          onClick={() => handleRemoveFilter(key as keyof FilterState)}
          style={{ cursor: 'pointer' }}
        ></i>
      </div>
    ));
  };

  const handleApplyFilters = () => {
    setAppliedFilters(filterState);
    onApplyFilters(filterState);
    setIsPanelOpen(false);
  };

  const handleReset = () => {
    setFilterState({});
    setAppliedFilters({});
    onResetFilters();
  };

  // Generate stats filter options for dropdown
  const generateStatsOptions = () => {
    return filterColumns.map((column) => ({
      value: column.data_type_id.toString(),
      label: column.data_type_name
    }));
  };

  // Handle stat selection change
  const handleStatSelectionChange = (selectedStatId: string) => {
    if (selectedStatId) {
      // Add the selected stat filter if it doesn't already exist
      if (!filterState[`stat_${selectedStatId}`]) {
        handleFilterChange(`stat_${selectedStatId}`, { comparison: 'greater', value: 0 });
      }
    }
    
    // Force the dropdown to reset by changing its key
    setDropdownKey(prev => prev + 1);
  };

  // Get all selected stats
  const getSelectedStats = () => {
    return Object.keys(filterState).filter(key => key.startsWith('stat_')).map(key => key.replace('stat_', ''));
  };

  // Get available stats (excluding already selected ones)
  const getAvailableStats = () => {
    const selectedStatIds = getSelectedStats();
    return filterColumns.filter(column => !selectedStatIds.includes(column.data_type_id.toString()));
  };

  // Get active keys for the collapse component
  const getActiveKeys = () => {
    const activeKeys: string[] = [];
    
    // Check which sections have active filters
    if (appliedFilters.position?.length) activeKeys.push("1");
    if (appliedFilters.divisions?.length) activeKeys.push("2");
    if (appliedFilters.states?.length || appliedFilters.international?.length) activeKeys.push("location");
    if (appliedFilters.years?.length) activeKeys.push("3");
    
    const activeStatKeys = Object.keys(appliedFilters).filter(key => key.startsWith('stat_'));
    if (activeStatKeys.length > 0) activeKeys.push("stats");
    
    if (appliedFilters.athleticAid?.length) {
      activeKeys.push("4");
    }
    if (appliedFilters.status?.length) {
      activeKeys.push("5");
    }
    if (appliedFilters.dateRange?.startDate || appliedFilters.dateRange?.endDate) {
      activeKeys.push("6");
    }
    if (appliedFilters.survey_completed !== undefined) {
      activeKeys.push("7");
    }
    if (appliedFilters.gradStudent !== undefined) {
      activeKeys.push("8");
    }
    
    return activeKeys;
  };

  // Remove a specific stat filter
  const removeStatFilter = (statId: string) => {
    const newFilterState = { ...filterState };
    delete newFilterState[`stat_${statId}`];
    setFilterState(newFilterState);
  };

  // Handle location filter selection (states or international)
  const handleLocationSelectionChange = (selectedType: string) => {
    if (selectedType) {
      // Add the selected location filter if it doesn't already exist
      if (selectedType === 'states' && !filterState.states) {
        handleFilterChange('states', []);
      } else if (selectedType === 'international' && !filterState.international) {
        handleFilterChange('international', []);
      }
    }
    
    // Force the dropdown to reset by changing its key
    setLocationDropdownKey(prev => prev + 1);
  };

  // Get available location filter types (excluding already selected ones)
  const getAvailableLocationTypes = () => {
    const availableTypes = [];
    if (filterState.states === undefined) {
      availableTypes.push({ value: 'states', label: 'Hometown State' });
    }
    if (filterState.international === undefined) {
      availableTypes.push({ value: 'international', label: 'International Location' });
    }
    return availableTypes;
  };

  // Remove a specific location filter
  const removeLocationFilter = (filterType: string) => {
    const newFilterState = { ...filterState };
    delete newFilterState[filterType];
    setFilterState(newFilterState);
  };

  const baseItems: CollapseProps["items"] = [
    {
      key: "1",
      label: <span>Position</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select positions"
            style={{ width: '100%' }}
            value={filterState.position}
            onChange={value => handleFilterChange('position', value)}
            options={positions.map(pos => ({ value: pos.name, label: pos.name }))}
          />
        </Flex>
      ),
    },
    {
      key: "2",
      label: <span>Division</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select divisions"
            style={{ width: '100%' }}
            value={filterState.divisions}
            onChange={value => handleFilterChange('divisions', value)}
            options={[
              { value: 'D1', label: 'D1' },
              { value: 'D2', label: 'D2' },
              { value: 'D3', label: 'D3' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "3",
      label: <span>Year</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select years"
            style={{ width: '100%' }}
            value={filterState.years}
            onChange={value => handleFilterChange('years', value)}
            options={[
              { value: 'FR', label: 'Freshman' },
              { value: 'SO', label: 'Sophomore' },
              { value: 'JR', label: 'Junior' },
              { value: 'SR', label: 'Senior' },
              { value: 'RFR', label: 'Redshirt Freshman' },
              { value: 'RSO', label: 'Redshirt Sophomore' },
              { value: 'RJR', label: 'Redshirt Junior' },
              { value: 'RSR', label: 'Redshirt Senior' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "4",
      label: <span>Athletic Aid</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select aid status"
            style={{ width: '100%' }}
            value={filterState.athleticAid}
            onChange={value => handleFilterChange('athleticAid', value)}
            options={[
              { value: 'Yes', label: 'Yes' },
              { value: 'Partial (50% or more)', label: 'Partial (50% or more)' },
              { value: 'Partial (less than 50%)', label: 'Partial (less than 50%)' },
              { value: 'None', label: 'None' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "5",
      label: <span>Status</span>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select status"
            style={{ width: '100%' }}
            value={filterState.status}
            onChange={value => handleFilterChange('status', value)}
            options={statusOptions}
          />
        </Flex>
      ),
    },
    {
      key: "6",
      label: <span>Date Entered</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Input 
            type="date" 
            placeholder="Start Date"
            value={filterState.dateRange?.startDate}
            onChange={e => handleFilterChange('dateRange', {
              ...filterState.dateRange,
              startDate: e.target.value
            })}
          />
          <Input 
            type="date" 
            placeholder="End Date"
            value={filterState.dateRange?.endDate || new Date().toISOString().split('T')[0]}
            onChange={e => handleFilterChange('dateRange', {
              ...filterState.dateRange,
              endDate: e.target.value
            })}
          />
        </Flex>
      ),
    },
    {
      key: "7",
      label: <h6>Survey Completed</h6>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select survey completion status"
            style={{ width: '100%' }}
            value={filterState.survey_completed}
            onChange={value => handleFilterChange('survey_completed', value)}
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' }
            ]}
          />
        </Flex>
      ),
    },
    {
      key: "8",
      label: <h6>Grad Student</h6>,
      children: (
        <Flex vertical className="mb-3">
          <Select
            mode="multiple"
            placeholder="Select grad student status"
            style={{ width: '100%' }}
            value={filterState.gradStudent}
            onChange={value => handleFilterChange('gradStudent', value)}
            options={[
              { value: true, label: 'Yes' },
              { value: false, label: 'No' }
            ]}
          />
        </Flex>
      ),
    },
  ];

  // Create items with Hometown Location and Stats
  const itemsWithStats: CollapseProps["items"] = [
    ...baseItems.slice(0, 3), // Position, Division, Year
    {
      key: "location",
      label: <span>Hometown Location</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            key={locationDropdownKey}
            placeholder="Add a location filter"
            style={{ width: '100%' }}
            value={undefined}
            onChange={handleLocationSelectionChange}
            options={getAvailableLocationTypes()}
            allowClear
          />
          
          {/* Hometown State Filter */}
          {filterState.states !== undefined && (
            <div style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              padding: '12px',
              backgroundColor: '#fafafa'
            }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
                <strong>Hometown State</strong>
                <Button 
                  type="text" 
                  size="small"
                  icon={<i className="icon-xmark-regular"></i>}
                  onClick={() => removeLocationFilter('states')}
                />
              </Flex>
              <Select
                mode="multiple"
                placeholder="Select states"
                style={{ width: '100%' }}
                value={filterState.states}
                onChange={value => handleFilterChange('states', value)}
                options={states.map(state => ({ value: state, label: state }))}
              />
            </div>
          )}

          {/* International Location Filter */}
          {filterState.international !== undefined && (
            <div style={{ 
              border: '1px solid #d9d9d9', 
              borderRadius: '6px', 
              padding: '12px',
              backgroundColor: '#fafafa'
            }}>
              <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
                <strong>International Location</strong>
                <Button 
                  type="text" 
                  size="small"
                  icon={<i className="icon-xmark-regular"></i>}
                  onClick={() => removeLocationFilter('international')}
                />
              </Flex>
              <Select
                mode="multiple"
                placeholder={internationalLoading ? "Loading international options..." : "Select countries/regions"}
                style={{ width: '100%' }}
                value={filterState.international}
                onChange={value => handleFilterChange('international', value)}
                loading={internationalLoading}
                options={[
                  { value: 'ALL_INTERNATIONAL', label: 'All International' },
                  ...internationalOptions.map(option => ({ value: option, label: option }))
                ]}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={internationalLoading ? "Loading..." : "No countries found"}
              />
            </div>
          )}
        </Flex>
      ),
    },
    {
      key: "stats",
      label: <span>Stats</span>,
      children: (
        <Flex vertical className="mb-3" gap={8}>
          <Select
            key={dropdownKey}
            placeholder="Add a stat to filter by"
            style={{ width: '100%' }}
            value={undefined}
            onChange={handleStatSelectionChange}
            options={getAvailableStats().map(column => {
              // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
              // Exclude position-agnostic stats like GP (Games Played)
              const isBaseball = Number(column.sport_id) === 6;
              const isPositionAgnostic = column.display_name === 'GP' || column.display_name === 'GS' || 
                                              column.data_type_id === 98 || column.data_type_id === 83;
              let label = column.display_name;
              
              if (isBaseball && column.stat_category && !isPositionAgnostic) {
                const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
                label = `${categoryPrefix} - ${column.display_name}`;
              }
              
              return {
                value: column.data_type_id.toString(),
                label: label
              };
            })}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
          
          {getSelectedStats().map(statId => {
            const column = filterColumns.find(col => col.data_type_id.toString() === statId);
            const statFilter = filterState[`stat_${statId}`];
            
            // Skip rendering if column is not found to prevent display issues
            if (!column) {
              return null;
            }
            
            return (
              <div key={`stat-filter-${statId}`} style={{ 
                border: '1px solid #d9d9d9', 
                borderRadius: '6px', 
                padding: '12px',
                backgroundColor: '#fafafa'
              }}>
                <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
                  <strong>{(() => {
                    // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
                    // Exclude position-agnostic stats like GP (Games Played)
                    const isBaseball = Number(column.sport_id) === 6;
                    const isPositionAgnostic = column.display_name === 'GP' || column.display_name === 'GS' || 
                                              column.data_type_id === 98 || column.data_type_id === 83;
                    
                    if (isBaseball && column.stat_category && !isPositionAgnostic) {
                      const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
                      return `${categoryPrefix} - ${column.display_name}`;
                    }
                    
                    return column.display_name;
                  })()}</strong>
                  <Button 
                    type="text" 
                    size="small"
                    icon={<i className="icon-xmark-regular"></i>}
                    onClick={() => removeStatFilter(statId)}
                  />
                </Flex>
                <Flex gap={8}>
                  <Select
                    value={statFilter?.comparison}
                    style={{ flex: 1 }}
                    options={compareOptions}
                    onChange={value => handleFilterChange(`stat_${statId}`, { 
                      ...statFilter,
                      comparison: value 
                    })}
                    key={`comparison-${statId}`}
                  />
                  {statFilter?.comparison === 'between' ? (
                    <>
                      <InputNumber 
                        style={{ flex: 1 }} 
                        min={0} 
                        placeholder="Min"
                        value={statFilter?.minValue}
                        onChange={value => handleFilterChange(`stat_${statId}`, { 
                          ...statFilter,
                          minValue: value || 0
                        })}
                        key={`min-${statId}`}
                      />
                      <InputNumber 
                        style={{ flex: 1 }} 
                        min={0} 
                        placeholder="Max"
                        value={statFilter?.maxValue}
                        onChange={value => handleFilterChange(`stat_${statId}`, { 
                          ...statFilter,
                          maxValue: value || 0
                        })}
                        key={`max-${statId}`}
                      />
                    </>
                  ) : (
                    <InputNumber 
                      style={{ flex: 1 }} 
                      min={0} 
                      placeholder="Value"
                      value={statFilter?.value}
                      onChange={value => handleFilterChange(`stat_${statId}`, { 
                        ...statFilter,
                        value: value || 0
                      })}
                      key={`value-${statId}`}
                    />
                  )}
                </Flex>
              </div>
            );
          })}
        </Flex>
      ),
    },
    // Athletic Aid (key: "4")
    {
      ...baseItems[3],
      key: "4"
    },
    // Status (key: "5") 
    {
      ...baseItems[4],
      key: "5"
    },
    // Date Entered (key: "6")
    {
      ...baseItems[5],
      key: "6"
    },
    // Survey Completed (key: "7")
    {
      ...baseItems[6],
      key: "7"
    },
    // Grad Student (key: "8")
    {
      ...baseItems[7],
      key: "8"
    }
  ].map(item => ({
    ...item,
    children: (
      <div style={{ padding: '0 12px' }}>
        {item.children}
      </div>
    )
  }));

  const panelContent = () => (
    <Flex vertical style={{ height: '100%', gap: '16px' }}>
      <Flex justify="space-between" align="center" style={{ padding: '16px 0', borderBottom: '1px solid rgba(18, 109, 184, 0.2)', background:'rgba(18, 109, 184, 0.1)', }}>
        <h4 style={{ margin: 0, paddingLeft: '16px' }}>Filters</h4>
        <Button 
          type="text" 
          icon={<i className="icon-xmark-regular"></i>}
          onClick={() => setIsPanelOpen(false)}
        />
      </Flex>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <Collapse
          defaultActiveKey={getActiveKeys()}
          ghost
          items={itemsWithStats}
          expandIcon={({ isActive }) =>
            isActive ? (
              <i className="icon-minus"></i>
            ) : (
              <i className="icon-add"></i>
            )
          }
          expandIconPosition="end"
          style={{ 
            backgroundColor: '#fff'
          }}
          key={`collapse-${Object.keys(appliedFilters).length}`}
        />
      </div>
      
      <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
        <Flex gap={8} justify="center">
          <Button size="large" onClick={handleReset} style={{ flex: 1 }}>
            Reset
          </Button>
          <Button type="primary" size="large" onClick={handleApplyFilters} style={{ flex: 1 }}>
            Apply Filters
          </Button>
        </Flex>
      </div>
    </Flex>
  );

  return (
    <>
      <Flex gap={8} align="center">
        <div className="flex gap-1">
          {renderFilterBadges()}
        </div>
        <Button 
          className="select-dropdown"
          onClick={() => setIsPanelOpen(true)}
        >
          <i className="icon-filter-1"></i> 
          Filters {Object.keys(appliedFilters).length > 0 && `(${Object.keys(appliedFilters).length})`}
        </Button>
      </Flex>

      <Drawer
        title={null}
        placement="right"
        onClose={() => setIsPanelOpen(false)}
        open={isPanelOpen}
        width={400}
        styles={{
          body: { padding: 0 },
          header: { display: 'none' }
        }}
        maskClosable={true}
        destroyOnClose={false}
      >
        {panelContent()}
      </Drawer>
    </>
  );
}