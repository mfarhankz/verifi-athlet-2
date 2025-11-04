"use client";

import React, { useState, useEffect } from 'react';
import { Select, InputNumber, Input, DatePicker, Checkbox, Radio, Slider, Flex, Button, Tooltip } from 'antd';
import { FilterField } from './FilterConfig';
import TimeInput from '../TimeInput';
import { fetchInternationalOptions, fetchCountiesWithStateAbbrev, checkCoachHasActiveAreas } from '@/lib/queries';
import { fetchUsersForCustomer } from '@/utils/utils';
import { useCustomer } from '@/contexts/CustomerContext';
import { geocodeLocation, getLocationSuggestions } from '@/utils/geocoding';
import dayjs from 'dayjs';

// ============================================================================
// FILTER FIELD RENDERER
// ============================================================================
// Renders different types of filter fields based on configuration
// Handles all the complex field types from the original Filters.tsx
// ============================================================================

interface FilterFieldRendererProps {
  field: FilterField;
  value: any;
  onChange: (key: string, value: any) => void;
}

// ============================================================================
// DYNAMIC SELECT FIELD COMPONENT
// ============================================================================

interface DynamicSelectFieldProps {
  field: FilterField;
  value: any;
  onChange: (value: any) => void;
}

function DynamicSelectField({ field, value, onChange }: DynamicSelectFieldProps) {
  const [options, setOptions] = useState<{ value: string | number | boolean; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadOptions = async () => {
      if (field.fetchOptions) {
        setLoading(true);
        try {
          const fetchedOptions = await field.fetchOptions();
          setOptions(fetchedOptions);
        } catch (error) {
          console.error(`Error fetching options for ${field.key}:`, error);
          setOptions(field.options || []);
        } finally {
          setLoading(false);
        }
      } else {
        setOptions(field.options || []);
      }
    };

    loadOptions();
  }, [field.fetchOptions, field.options, field.key]);

  if (field.type === 'multiselect') {
    return (
      <Select
        mode={field.mode === 'range' ? undefined : (field.mode || 'multiple')}
        placeholder={field.placeholder}
        value={value}
        onChange={onChange}
        options={options}
        disabled={field.disabled}
        loading={loading}
        style={{ width: '100%' }}
        showSearch={field.showSearch}
        filterOption={field.filterOption}
      />
    );
  }

  return (
    <Select
      placeholder={field.placeholder}
      value={value}
      onChange={onChange}
      options={options}
      disabled={field.disabled}
      loading={loading}
      style={{ width: '100%' }}
      showSearch={field.showSearch}
      filterOption={field.filterOption}
    />
  );
}

// ============================================================================
// MIN-MAX RANGE FIELD COMPONENT
// ============================================================================

interface MinMaxRangeFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  field: FilterField;
}

function MinMaxRangeField({ value, onChange, disabled, field }: MinMaxRangeFieldProps) {
  // Helper function to check if defaultValue is a transfer_odds type
  const isTransferOddsDefault = (defaultValue: any): defaultValue is { comparison: string; value?: number; minValue?: number; maxValue?: number } => {
    return defaultValue && typeof defaultValue === 'object' && 'comparison' in defaultValue;
  };

  const [comparison, setComparison] = useState(value?.comparison || '');
  const [minValue, setMinValue] = useState(value?.minValue || undefined);
  const [maxValue, setMaxValue] = useState(value?.maxValue || undefined);
  const [singleValue, setSingleValue] = useState(value?.value || undefined);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize with default value on first render if field has a default
  useEffect(() => {
    if (!hasInitialized && !value && isTransferOddsDefault(field.defaultValue)) {
      const defaultValue = field.defaultValue;
      setComparison(defaultValue.comparison || '');
      setSingleValue(defaultValue.value || undefined);
      setMinValue(defaultValue.minValue || undefined);
      setMaxValue(defaultValue.maxValue || undefined);
      setHasInitialized(true);
      
      // Call onChange to register the default value
      onChange({
        comparison: defaultValue.comparison,
        value: defaultValue.value,
        minValue: defaultValue.minValue,
        maxValue: defaultValue.maxValue
      });
    }
  }, [hasInitialized, value, field.defaultValue, onChange]);

  // Sync internal state with value prop when it changes externally
  useEffect(() => {
    if (value) {
      setComparison(value.comparison || '');
      setMinValue(value.minValue);
      setMaxValue(value.maxValue);
      setSingleValue(value.value);
      setHasInitialized(true);
    } else if (value === null || value === undefined) {
      // Reset when value is explicitly cleared
      setComparison('');
      setMinValue(undefined);
      setMaxValue(undefined);
      setSingleValue(undefined);
      setHasInitialized(false);
    }
  }, [value]);

  const comparisonOptions = [
    { value: 'min', label: 'At Least' },
    { value: 'max', label: 'At Most' },
    { value: 'between', label: 'Between' }
  ];

  const handleComparisonChange = (newComparison: string) => {
    setComparison(newComparison);
    onChange({
      comparison: newComparison,
      value: newComparison === 'between' ? undefined : singleValue,
      minValue: newComparison === 'between' ? minValue : undefined,
      maxValue: newComparison === 'between' ? maxValue : undefined
    });
  };

  const handleSingleValueChange = (newValue: number | null) => {
    setSingleValue(newValue);
    onChange({
      comparison,
      value: newValue,
      minValue: undefined,
      maxValue: undefined
    });
  };

  const handleMinValueChange = (newValue: number | null) => {
    setMinValue(newValue);
    onChange({
      comparison,
      value: undefined,
      minValue: newValue,
      maxValue
    });
  };

  const handleMaxValueChange = (newValue: number | null) => {
    setMaxValue(newValue);
    onChange({
      comparison,
      value: undefined,
      minValue,
      maxValue: newValue
    });
  };

  return (
    <Flex vertical gap={8}>
      <Select
        placeholder="Select comparison type"
        value={comparison}
        onChange={handleComparisonChange}
        options={comparisonOptions}
        disabled={disabled}
        style={{ width: '100%' }}
        allowClear
      />
      
      {comparison && (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '12px',
          backgroundColor: '#fafafa'
        }}>
          {comparison === 'between' ? (
            <Flex gap={8}>
              <InputNumber
                placeholder="Enter minimum value"
                value={minValue}
                onChange={handleMinValueChange}
                disabled={disabled}
                min={field.min}
                max={field.max}
                step={field.step}
                style={{ width: '50%' }}
              />
              <InputNumber
                placeholder="Enter maximum value"
                value={maxValue}
                onChange={handleMaxValueChange}
                disabled={disabled}
                min={field.min}
                max={field.max}
                step={field.step}
                style={{ width: '50%' }}
              />
            </Flex>
          ) : (
            <InputNumber
              placeholder={comparison === 'min' ? 'Enter minimum value' : 'Enter maximum value'}
              value={singleValue}
              onChange={handleSingleValueChange}
              disabled={disabled}
              min={field.min}
              max={field.max}
              step={field.step}
              style={{ width: '100%' }}
            />
          )}
        </div>
      )}
    </Flex>
  );
}

export function renderFilterField(field: FilterField, value: any, onChange: (key: string, value: any) => void) {
  const { key, type, options = [], placeholder, min, max, step, mode, disabled, hidden, fetchOptions } = field;

  if (hidden) return null;

  const handleChange = (newValue: any) => {
    onChange(key, newValue);
  };

  // For fields with fetchOptions, we need to handle dynamic loading
  if (fetchOptions && (type === 'select' || type === 'multiselect')) {
    return <DynamicSelectField field={field} value={value} onChange={handleChange} />;
  }

  switch (type) {
    case 'text':
      return (
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        />
      );

    case 'number':
      return (
        <InputNumber
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      );

    case 'select':
      return (
        <Select
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          options={options}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      );

    case 'multiselect':
      return (
        <Select
          mode={mode === 'range' ? undefined : (mode || 'multiple')}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          options={options}
          disabled={disabled}
          style={{ width: '100%' }}
          showSearch={field.showSearch}
          filterOption={field.filterOption}
        />
      );

    case 'checkbox':
      // Special handling for show_archived field - disabled with "Coming Soon" tooltip
      if (field.key === 'show_archived') {
        return (
          <div style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px',
            backgroundColor: '#f5f5f5',
            opacity: 0.6
          }}>
            <Flex align="center" gap={8}>
              <Checkbox 
                disabled
                checked={false}
              />
              <span style={{ color: '#666' }}>Coming Soon</span>
            </Flex>
            <div style={{ 
              fontSize: '12px', 
              color: '#999', 
              marginTop: '4px' 
            }}>
              {placeholder}
            </div>
          </div>
        );
      }
      
      return (
        <Checkbox
          checked={value}
          onChange={(e) => handleChange(e.target.checked)}
          disabled={disabled}
        >
          {placeholder}
        </Checkbox>
      );

    case 'radio':
      return (
        <Radio.Group
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        >
          {options.map(option => (
            <Radio key={String(option.value)} value={option.value}>
              {option.label}
            </Radio>
          ))}
        </Radio.Group>
      );

    case 'date-range':
      return (
        <DatePicker.RangePicker
          value={value?.startDate && value?.endDate ? [dayjs(value.startDate), dayjs(value.endDate)] : null}
          onChange={(dates) => {
            if (dates && dates[0] && dates[1]) {
              handleChange({
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD')
              });
            } else {
              handleChange(null);
            }
          }}
          disabled={disabled}
          style={{ width: '100%' }}
        />
      );

    case 'slider':
      // Check if this is a high school score slider (1-10 range)
      const isHighSchoolScore = min === 1 && max === 10 && step === 1;
      
      // For high school score sliders, default to [1, 10] when no value is set
      // Also convert {minValue, maxValue} back to [min, max] for display
      let sliderValue;
      if (isHighSchoolScore) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          sliderValue = [1, 10]; // Default when no value
        } else if (value && typeof value === 'object' && value.minValue !== undefined && value.maxValue !== undefined) {
          sliderValue = [value.minValue, value.maxValue]; // Convert {minValue, maxValue} to [min, max]
        } else {
          sliderValue = value; // Use as-is for other cases
        }
      } else {
        sliderValue = value; // Use as-is for non-high school sliders
      }
      
      // Custom handler for sliders to convert [min, max] to {minValue, maxValue}
      const handleSliderChange = (newValue: number | number[]) => {
        if (Array.isArray(newValue) && newValue.length === 2) {
          // For high school score sliders, don't apply filter if handles are at extremes (1 and 10)
          if (isHighSchoolScore && newValue[0] === 1 && newValue[1] === 10) {
            handleChange(null); // Clear the filter
          } else {
            // Convert [min, max] array to {minValue, maxValue} object
            handleChange({
              minValue: newValue[0],
              maxValue: newValue[1]
            });
          }
        } else {
          // Handle single value sliders
          handleChange(newValue);
        }
      };
      
      return (
        <div style={{ padding: '0 8px' }}>
        <Slider
            range={isHighSchoolScore ? true : (mode === 'range')}
            value={sliderValue}
            onChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
            className={isHighSchoolScore ? "custom-slider-handles" : undefined}
            marks={isHighSchoolScore ? {
              1: '1',
              2: '2',
              3: '3',
              4: '4',
              5: '5',
              6: '6',
              7: '7',
              8: '8',
              9: '9',
              10: '10'
            } : undefined}
          />
        </div>
      );


    case 'time':
      return <TimeField value={value} onChange={handleChange} disabled={disabled} />;

    case 'location':
      return <LocationField value={value} onChange={handleChange} disabled={disabled} dataSource={field.dataSource} />;

    case 'stats':
      return <StatsField value={value} onChange={handleChange} disabled={disabled} field={field} />;

    case 'min-max-range':
      return <MinMaxRangeField value={value} onChange={handleChange} disabled={disabled} field={field} />;

    case 'height':
      return <HeightField value={value} onChange={handleChange} disabled={disabled} />;

    case 'weight':
      return <WeightField value={value} onChange={handleChange} disabled={disabled} />;

    default:
      return (
        <Input
          placeholder={placeholder || `Enter ${key}`}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        />
      );
  }
}

// ============================================================================
// SPECIALIZED FIELD COMPONENTS
// ============================================================================

interface HeightFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function HeightField({ value, onChange, disabled }: HeightFieldProps) {
  const comparisonOptions = [
    { value: 'min', label: 'At Least' },
    { value: 'max', label: 'At Most' },
    { value: 'between', label: 'Between' }
  ];

  return (
    <Flex vertical gap={8}>
      <Select
        placeholder="Select comparison type"
        value={value?.comparison}
        onChange={(comparison) => onChange({ ...value, comparison })}
        options={comparisonOptions}
        disabled={disabled}
        style={{ width: '100%' }}
        allowClear
      />
      
      {value?.comparison && (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '12px',
          backgroundColor: '#fafafa'
        }}>
          {value.comparison === 'between' ? (
            <>
              <Flex gap={8} style={{ marginBottom: 8 }}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={4}
                  max={8}
                  placeholder="Min feet"
                  value={value?.minFeet}
                  onChange={(minFeet) => onChange({ ...value, minFeet })}
                  disabled={disabled}
                />
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  max={11}
                  placeholder="Min inches"
                  value={value?.minInches}
                  onChange={(minInches) => onChange({ ...value, minInches })}
                  disabled={disabled}
                />
              </Flex>
              <Flex gap={8}>
                <InputNumber
                  style={{ flex: 1 }}
                  min={4}
                  max={8}
                  placeholder="Max feet"
                  value={value?.maxFeet}
                  onChange={(maxFeet) => onChange({ ...value, maxFeet })}
                  disabled={disabled}
                />
                <InputNumber
                  style={{ flex: 1 }}
                  min={0}
                  max={11}
                  placeholder="Max inches"
                  value={value?.maxInches}
                  onChange={(maxInches) => onChange({ ...value, maxInches })}
                  disabled={disabled}
                />
              </Flex>
            </>
          ) : (
            <Flex gap={8}>
              <InputNumber
                style={{ flex: 1 }}
                min={4}
                max={8}
                placeholder="Feet"
                value={value?.feet}
                onChange={(feet) => onChange({ ...value, feet })}
                disabled={disabled}
              />
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                max={11}
                placeholder="Inches"
                value={value?.inches}
                onChange={(inches) => onChange({ ...value, inches })}
                disabled={disabled}
              />
            </Flex>
          )}
        </div>
      )}
    </Flex>
  );
}

interface WeightFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function WeightField({ value, onChange, disabled }: WeightFieldProps) {
  const comparisonOptions = [
    { value: 'min', label: 'At Least' },
    { value: 'max', label: 'At Most' },
    { value: 'between', label: 'Between' }
  ];

  return (
    <Flex vertical gap={8}>
      <Select
        placeholder="Select comparison type"
        value={value?.comparison}
        onChange={(comparison) => onChange({ ...value, comparison })}
        options={comparisonOptions}
        disabled={disabled}
        style={{ width: '100%' }}
        allowClear
      />
      
      {value?.comparison && (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '12px',
          backgroundColor: '#fafafa'
        }}>
          {value.comparison === 'between' ? (
            <Flex gap={8}>
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                placeholder="Enter minimum weight"
                value={value?.minValue}
                onChange={(minValue) => onChange({ ...value, minValue })}
                disabled={disabled}
              />
              <InputNumber
                style={{ flex: 1 }}
                min={0}
                placeholder="Enter maximum weight"
                value={value?.maxValue}
                onChange={(maxValue) => onChange({ ...value, maxValue })}
                disabled={disabled}
              />
            </Flex>
          ) : (
            <InputNumber
              min={0}
              placeholder={value.comparison === 'min' ? 'Enter minimum weight' : 'Enter maximum weight'}
              value={value?.value}
              onChange={(val) => onChange({ ...value, value: val })}
              disabled={disabled}
              style={{ width: '100%' }}
            />
          )}
        </div>
      )}
    </Flex>
  );
}

interface TimeFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function TimeField({ value, onChange, disabled }: TimeFieldProps) {
  const compareOptions = [
    { value: 'min', label: 'At least' },
    { value: 'max', label: 'At most' },
    { value: 'between', label: 'Between' }
  ];

  return (
    <Flex vertical gap={8}>
      <Select
        value={value?.comparison}
        placeholder="Select comparison"
        onChange={(comparison) => onChange({ ...value, comparison })}
        options={compareOptions}
        disabled={disabled}
        style={{ width: '100%' }}
      />
      {value?.comparison === 'between' ? (
        <Flex gap={8}>
          <TimeInput
            value={value?.minValue}
            onChange={(minValue) => onChange({ ...value, minValue })}
            placeholder="Min time"
          />
          <TimeInput
            value={value?.maxValue}
            onChange={(maxValue) => onChange({ ...value, maxValue })}
            placeholder="Max time"
          />
        </Flex>
      ) : (
        <TimeInput
          value={value?.value}
          onChange={(val) => onChange({ ...value, value: val })}
          placeholder="Time"
        />
      )}
    </Flex>
  );
}

interface LocationFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  dataSource?: string;
}

function LocationField({ value, onChange, disabled, dataSource }: LocationFieldProps) {
  const [locationType, setLocationType] = useState(value?.type || undefined);
  const [states, setStates] = useState<string[]>([]);
  const [internationalOptions, setInternationalOptions] = useState<string[]>([]);
  const [countiesWithState, setCountiesWithState] = useState<{ value: string; label: string }[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [internationalLoading, setInternationalLoading] = useState(false);
  const [countiesLoading, setCountiesLoading] = useState(false);
  const [coachesLoading, setCoachesLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  
  // Get customer context for sport_id
  const { activeCustomerId, customers } = useCustomer();

  // Sync selectedLocation with value prop
  useEffect(() => {
    if (value?.radius?.center && !selectedLocation) {
      // If we have a center value but no selectedLocation, create one
      setSelectedLocation({
        formatted_address: value.radius.center
      });
    } else if (!value?.radius?.center && selectedLocation) {
      // If we don't have a center value but have selectedLocation, clear it
      setSelectedLocation(null);
    }
  }, [value?.radius?.center]); // Removed selectedLocation from dependencies to prevent infinite loop

  // Handle reset - clear all internal state when value becomes null/undefined
  useEffect(() => {
    if (!value) {
      setSelectedLocation(null);
      setLocationType(undefined);
      setLocationSuggestions([]);
      setGeocodingLocation(false);
    }
  }, [value]);

  // Location type options - will be filtered based on data source
  const allLocationTypeOptions = [
    { value: 'hometown_state', label: 'Hometown State' },
    { value: 'international', label: 'International Location' },
    { value: 'county', label: 'School County' },
    { value: 'school_state', label: 'School State' },
    { value: 'radius', label: 'Radius' },
    { value: 'recruiting_area', label: 'Recruiting Area' }
  ];

  // Get available location options based on data source
  const getAvailableLocationOptions = () => {
    const hiddenOptions: string[] = [];
    
    switch (dataSource) {
      case 'high_schools':
        // Hide Hometown State for High School
        hiddenOptions.push('hometown_state');
        break;
      case 'transfer_portal':
        // Hide School County and Recruiting Area for Transfers
        hiddenOptions.push('county', 'recruiting_area');
        break;
      case 'juco':
        // Hide Hometown State, International Location, and Recruiting Area for JUCO
        hiddenOptions.push('hometown_state', 'international', 'recruiting_area');
        break;
      case 'all_athletes':
        // Hide School County and Recruiting Area for pre-portal search
        hiddenOptions.push('county', 'recruiting_area');
        break;
      case 'hs_athletes':
        // Hide Hometown State for high school athletes (they don't have hometown states yet)
        hiddenOptions.push('hometown_state');
        break;
      case 'activity_feed':
        // For activity feed, only show school state and radius
        hiddenOptions.push('hometown_state', 'international', 'county', 'recruiting_area');
        break;
      case 'activity_feed_athlete':
        // For activity feed athlete location, show county, school state, radius, and recruiting area
        hiddenOptions.push('hometown_state', 'international');
        break;
      default:
        // No hidden options for other data sources
        break;
    }
    
    const filteredOptions = allLocationTypeOptions.filter(option => !hiddenOptions.includes(option.value));
    return filteredOptions;
  };

  const locationTypeOptions = getAvailableLocationOptions();

  // Load states
  useEffect(() => {
    setStates(['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY']);
  }, []);

  // Load international options when component mounts or sport changes
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

  // Load counties with state abbreviations
  useEffect(() => {
    const loadCountiesWithState = async () => {
      try {
        setCountiesLoading(true);
        const countiesData = await fetchCountiesWithStateAbbrev();
        setCountiesWithState(countiesData);
      } catch (error) {
        console.error('Error loading counties with state info:', error);
        setCountiesWithState([]);
      } finally {
        setCountiesLoading(false);
      }
    };

    const timeoutId = setTimeout(loadCountiesWithState, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  // Load coaches for recruiting area filter
  useEffect(() => {
    const loadCoaches = async () => {
      if (!activeCustomerId) return;
      
      try {
        setCoachesLoading(true);
        const coachesData = await fetchUsersForCustomer(activeCustomerId);
        
        // Check which coaches have active recruiting areas
        const coachesWithAreaStatus = await Promise.all(
          coachesData.map(async (coach: any) => {
            const hasActiveAreas = await checkCoachHasActiveAreas(coach.id);
            return {
              ...coach,
              hasActiveAreas
            };
          })
        );
        
        // Remove duplicates based on coach ID
        const uniqueCoaches = coachesWithAreaStatus.filter((coach: any, index: number, self: any[]) => 
          index === self.findIndex((c: any) => c.id === coach.id)
        );
        
        // Sort coaches: those with active areas first, then those without
        const sortedCoaches = uniqueCoaches.sort((a: any, b: any) => {
          if (a.hasActiveAreas && !b.hasActiveAreas) return -1;
          if (!a.hasActiveAreas && b.hasActiveAreas) return 1;
          return 0;
        });
        
        setCoaches(sortedCoaches);
      } catch (error) {
        console.error('Error loading coaches:', error);
        setCoaches([]);
      } finally {
        setCoachesLoading(false);
      }
    };

    const timeoutId = setTimeout(loadCoaches, 0);
    return () => clearTimeout(timeoutId);
  }, [activeCustomerId]);

  const handleLocationTypeChange = (type: string) => {
    setLocationType(type);
    const newValue = {
      type,
      values: [],
      radius: type === 'radius' ? { center: '', distance: 25 } : undefined,
      recruitingArea: type === 'recruiting_area' ? { coachId: '', stateIds: [], countyIds: [], schoolIds: [] } : undefined
    };
    onChange(newValue);
  };

  const handleValuesChange = (values: string[]) => {
    onChange({
      ...value,
      values
    });
  };

  const handleRadiusChange = (field: string, newValue: any) => {
    onChange({
      ...value,
      type: 'radius',
      radius: {
        ...value?.radius,
        [field]: newValue
      }
    });
  };

  const handleRecruitingAreaChange = (field: string, newValue: any) => {
    const updatedValue = {
      ...value,
      recruitingArea: {
        ...value?.recruitingArea,
        [field]: newValue
      }
    };
    onChange(updatedValue);
  };

  // Handle location search for radius filter
  const handleLocationSearch = async (searchText: string) => {
    if (searchText.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const suggestions = await getLocationSuggestions(searchText);
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      setLocationSuggestions([]);
    }
  };

  // Handle location selection for radius filter
  const handleLocationSelect = async (selectedValue: string) => {
    try {
      setGeocodingLocation(true);
      
      // Find the full suggestion object from the selected value
      const location = locationSuggestions.find(suggestion => suggestion.formatted_address === selectedValue);
      
      if (location) {
        setSelectedLocation(location);
        setLocationSuggestions([]);
        
        console.log('Selected location object:', location);
        console.log('Selected value:', selectedValue);
        
        const geocodedLocation = await geocodeLocation(selectedValue);
      
      if (geocodedLocation) {
          const newValue = {
          ...value,
            type: 'radius',
          radius: {
            ...value?.radius,
              center: selectedValue,
            coordinates: {
              lat: geocodedLocation.lat,
              lng: geocodedLocation.lng
            }
          }
          };
          console.log('Location selected, updating filter:', newValue);
          onChange(newValue);
        }
      }
    } catch (error) {
      console.error('Error geocoding selected location:', error);
    } finally {
      setGeocodingLocation(false);
    }
  };

  return (
    <Flex vertical gap={8}>
      <Select
        placeholder="Select location type"
        value={locationType}
        onChange={handleLocationTypeChange}
        options={locationTypeOptions}
        disabled={disabled}
        style={{ width: '100%' }}
        allowClear
      />
      
      {locationType && (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '12px',
          backgroundColor: '#fafafa'
        }}>
          <Flex justify="space-between" align="center" style={{ marginBottom: '8px' }}>
            <strong>{locationTypeOptions.find(opt => opt.value === locationType)?.label}</strong>
            <Button 
              type="text" 
              size="small"
              onClick={() => {
              setLocationType(undefined);
                onChange(null);
              }}
            >
              ×
            </Button>
          </Flex>
          
          {/* Hometown State */}
          {locationType === 'hometown_state' && (
            <Select
              mode="multiple"
              placeholder="Select states"
              value={value?.values || []}
              onChange={handleValuesChange}
              options={states.map(state => ({ value: state, label: state }))}
              disabled={disabled}
              style={{ width: '100%' }}
            />
          )}
          
              {/* International */}
              {locationType === 'international' && (
                <Select
                  mode="multiple"
                  placeholder="Select countries/regions"
                  value={value?.values || []}
                  onChange={handleValuesChange}
                  options={[
                    { value: 'ALL_INTERNATIONAL', label: 'All International' },
                    ...internationalOptions.map(option => ({ value: option, label: option }))
                  ]}
                  disabled={disabled}
                  loading={internationalLoading}
                  style={{ width: '100%' }}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                />
              )}
          
          {/* County */}
          {locationType === 'county' && (
            <Select
              mode="multiple"
              placeholder="Select counties"
              value={value?.values || []}
              onChange={handleValuesChange}
              options={countiesWithState}
              disabled={disabled}
              loading={countiesLoading}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
          
          {/* School State */}
          {locationType === 'school_state' && (
            <Select
              mode="multiple"
              placeholder="Select school states"
              value={value?.values || []}
              onChange={handleValuesChange}
              options={states.map(state => ({ value: state, label: state }))}
              disabled={disabled}
              style={{ width: '100%' }}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          )}
          
              {/* Radius */}
              {locationType === 'radius' && (
                <Flex vertical gap={8}>
                  <Select
                    showSearch
                    placeholder="Enter city, state or coordinates"
                    value={selectedLocation ? selectedLocation.formatted_address : undefined}
                    onSearch={handleLocationSearch}
                    onSelect={handleLocationSelect}
                    disabled={disabled}
                    loading={geocodingLocation}
                    style={{ width: '100%' }}
                    filterOption={false}
                    notFoundContent={locationSuggestions.length === 0 ? 'No locations found' : null}
                    options={locationSuggestions.map(suggestion => ({
                      value: suggestion.formatted_address,
                      label: suggestion.formatted_address,
                      key: suggestion.place_id
                    }))}
                    onInputKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Allow manual entry
                        const inputValue = (e.target as HTMLInputElement).value;
                        if (inputValue) {
                          handleRadiusChange('center', inputValue);
                        }
                      }
                    }}
                    allowClear
                    onClear={() => {
                      setSelectedLocation(null);
                      onChange({
                        ...value,
                        type: 'radius',
                        radius: {
                          ...value?.radius,
                          center: '',
                          coordinates: null
                        }
                      });
                    }}
                  />
                  <InputNumber
                    placeholder="Distance in miles"
                    value={value?.radius?.distance || 25}
                    onChange={(val) => handleRadiusChange('distance', val)}
                    disabled={disabled}
                    min={1}
                    max={500}
                    style={{ width: '100%' }}
                  />
                </Flex>
              )}
          
              {/* Recruiting Area */}
              {locationType === 'recruiting_area' && (
                <Flex vertical gap={8}>
                  <Select
                    placeholder="Select coach"
                    value={value?.recruitingArea?.coachId || ''}
                    onChange={(coachId) => handleRecruitingAreaChange('coachId', coachId)}
                    options={coaches.map(coach => ({ 
                      value: coach.id, 
                      label: `${coach.name_first} ${coach.name_last}`,
                      disabled: !coach.hasActiveAreas
                    }))}
                    disabled={disabled}
                    loading={coachesLoading}
                    style={{ width: '100%' }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  />
                </Flex>
              )}
        </div>
      )}
    </Flex>
  );
}

interface StatsFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  field: FilterField;
}

function StatsField({ value, onChange, disabled, field }: StatsFieldProps) {
  const [selectedStats, setSelectedStats] = useState<Record<string, any>>({});
  const [dropdownKey, setDropdownKey] = useState(0);

  // Sync selectedStats with value prop
  useEffect(() => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      setSelectedStats(value);
    } else if (!value) {
      setSelectedStats({});
    }
  }, [value]);

  // Helper function to determine if a stat is time-based
  const isTimeBasedStat = (column: any) => {
    const timeBasedStats = [
      '100_m', '200_m', '400_m', '60_h', '110_h', '400_h', '6k_xc', '600_m', '800_m',
      '1500_m', 'mile', '3000_m', '5000_m', '8k_xc', '10k_xc', '3000_s', '5_mile_xc',
      '60_m', '1000_m', '4_mile_xc', '300_m', '55_m', '500_m', '100_h',
      '50_y_free', '50_l_free', '100_y_free', '100_l_free', '200_y_free', '200_l_free',
      '400_y_free', '400_l_free', '500_y_free', '800_l_free', '1000_y_free', '1500_l_free',
      '1650_y_free', '50_y_back', '50_l_back', '100_y_back', '100_l_back', '200_y_back',
      '200_l_back', '50_y_breast', '50_l_breast', '100_y_breast', '100_l_breast',
      '100_l_breast', '200_y_breast', '200_l_breast', '50_y_fly', '50_l_fly', '100_y_fly',
      '100_l_fly', '200_y_fly', '200_l_fly', '100_y_im', '100_l_im', '200_y_im', '200_l_im',
      '400_y_im', '400_l_im'
    ];
    const nameLower = (column.data_type_name || column.display_name || '').toLowerCase();
    return timeBasedStats.some(stat => nameLower.includes(stat));
  };

  // Get all selected stat IDs
  const getSelectedStats = () => {
    return Object.keys(selectedStats);
  };

  // Get available stats (excluding already selected ones)
  const getAvailableStats = () => {
    const selectedStatIds = getSelectedStats();
    return field.options?.filter(option => {
      return !selectedStatIds.includes(String(option.value));
    }) || [];
  };

  // Handle stat selection
  const handleStatSelectionChange = (selectedStatId: string | number | boolean) => {
    const statId = String(selectedStatId);
    
    if (statId) {
      const column = field.options?.find(opt => opt.value === statId);
      
      if (column) {
        const defaultComparison = isTimeBasedStat(column) ? 'less' : 'min';
        const newStat = { comparison: defaultComparison, value: 0 };
        
        setSelectedStats(prev => ({
          ...prev,
          [statId]: newStat
        }));
        
        // Update the parent with the new stat
        const newValue = { ...selectedStats, [statId]: newStat };
        onChange(newValue);
      }
    }
    
    // Force the dropdown to reset
    setDropdownKey(prev => prev + 1);
  };

  // Handle stat filter change
  const handleStatFilterChange = (statId: string, newFilter: any) => {
    const updatedStats = {
      ...selectedStats,
      [statId]: newFilter
    };
    
    setSelectedStats(updatedStats);
    onChange(updatedStats);
  };

  // Remove stat filter
  const removeStatFilter = (statId: string) => {
    const updatedStats = { ...selectedStats };
    delete updatedStats[statId];
    
    setSelectedStats(updatedStats);
    onChange(updatedStats);
  };

  // Comparison options
  const compareOptions = [
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'between', label: 'Between' }
  ];

  return (
    <div>
      {/* Add stat dropdown */}
    <Select
        key={dropdownKey}
        placeholder="Add a stat to filter by"
        style={{ width: '100%', marginBottom: '12px' }}
        value={undefined}
        onChange={handleStatSelectionChange}
        options={getAvailableStats()}
      disabled={disabled}
        allowClear
        showSearch
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
      />
      
      {/* Render selected stat filters */}
      {Object.keys(selectedStats).map(statId => {
        const statFilter = selectedStats[statId];
        const column = field.options?.find(opt => opt.value === statId);
        if (!column) return null;

        return (
          <div key={statId} style={{ 
            border: '1px solid #d9d9d9', 
            borderRadius: '6px', 
            padding: '12px', 
            marginBottom: '8px',
            backgroundColor: '#fafafa'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontWeight: 500 }}>{column.label}</span>
              <Button
                type="text"
                size="small"
                onClick={() => removeStatFilter(statId)}
                style={{ color: '#ff4d4f' }}
              >
                Remove
              </Button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <Select
                value={statFilter?.comparison}
                style={{ flex: 1 }}
                options={compareOptions}
                onChange={value => handleStatFilterChange(statId, { 
                  ...statFilter,
                  comparison: value 
                })}
                disabled={disabled}
              />
              
              {statFilter?.comparison === 'between' ? (
                <>
                  {isTimeBasedStat(column) ? (
                    <>
                      <Input
                        style={{ flex: 1 }}
                        placeholder="Min (mm:ss)"
                        value={statFilter?.minValue}
                        onChange={e => handleStatFilterChange(statId, {
                          ...statFilter,
                          minValue: e.target.value
                        })}
                        disabled={disabled}
                      />
                      <Input
                        style={{ flex: 1 }}
                        placeholder="Max (mm:ss)"
                        value={statFilter?.maxValue}
                        onChange={e => handleStatFilterChange(statId, {
                          ...statFilter,
                          maxValue: e.target.value
                        })}
                        disabled={disabled}
                      />
                    </>
                  ) : (
                    <>
                      <InputNumber 
                        style={{ flex: 1 }} 
                        min={0} 
                        placeholder="Min"
                        value={statFilter?.minValue}
                        onChange={value => handleStatFilterChange(statId, { 
                          ...statFilter,
                          minValue: value || 0
                        })}
                        disabled={disabled}
                      />
                      <InputNumber 
                        style={{ flex: 1 }} 
                        min={0} 
                        placeholder="Max"
                        value={statFilter?.maxValue}
                        onChange={value => handleStatFilterChange(statId, { 
                          ...statFilter,
                          maxValue: value || 0
                        })}
                        disabled={disabled}
                      />
                    </>
                  )}
                </>
              ) : (
                isTimeBasedStat(column) ? (
                  <Input
                    style={{ flex: 1 }}
                    placeholder="Value (mm:ss)"
                    value={statFilter?.value}
                    onChange={e => handleStatFilterChange(statId, {
                      ...statFilter,
                      value: e.target.value
                    })}
                    disabled={disabled}
                  />
                ) : (
                  <InputNumber 
                    style={{ flex: 1 }} 
                    min={0} 
                    placeholder="Value"
                    value={statFilter?.value}
                    onChange={value => handleStatFilterChange(statId, { 
                      ...statFilter,
                      value: value || 0
                    })}
                    disabled={disabled}
                  />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
