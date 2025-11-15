"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Select, InputNumber, Input, DatePicker, Checkbox, Radio, Slider, Flex, Button, Tooltip } from 'antd';
import { FilterField } from './FilterConfig';
import TimeInput from '../TimeInput';
import { fetchInternationalOptions, fetchCountiesWithStateAbbrev, checkCoachHasActiveAreas, fetchCampSources, fetchCampYearsBySource, fetchCampDisplayNames } from '@/lib/queries';
import { fetchUsersForCustomer } from '@/utils/utils';
import { useCustomer } from '@/contexts/CustomerContext';
import { geocodeLocation, getLocationSuggestions } from '@/utils/geocoding';
import { useDebounce } from '@/hooks/useDebounce';
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

    case 'camp':
      return <CampFilterField value={value} onChange={handleChange} disabled={disabled} />;

    case 'offer-count':
      return <OfferCountField value={value} onChange={handleChange} disabled={disabled} />;

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

// ============================================================================
// OFFER COUNT FIELD COMPONENT
// ============================================================================

interface OfferCountFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function OfferCountField({ value, onChange, disabled }: OfferCountFieldProps) {
  const categoryOptions = [
    { value: 'All', label: 'All' },
    { value: 'P4', label: 'P4' },
    { value: 'G5', label: 'G5' },
    { value: 'FCS', label: 'FCS' },
    { value: 'D2', label: 'D2' },
    { value: 'NAIA', label: 'NAIA' },
    { value: 'D3', label: 'D3' },
    { value: 'JUCO', label: 'JUCO' },
    { value: 'Other', label: 'Other' }
  ];

  const comparisonOptions = [
    { value: 'min', label: 'Min' },
    { value: 'max', label: 'Max' },
    { value: 'between', label: 'Between' }
  ];

  const handleCategoryChange = (category: string) => {
    onChange({
      category,
      comparison: value?.comparison,
      value: value?.value,
      minValue: value?.minValue,
      maxValue: value?.maxValue
    });
  };

  const handleComparisonChange = (comparison: string) => {
    onChange({
      category: value?.category || 'All',
      comparison,
      value: comparison === 'between' ? undefined : value?.value,
      minValue: comparison === 'between' ? value?.minValue : undefined,
      maxValue: comparison === 'between' ? value?.maxValue : undefined
    });
  };

  const handleValueChange = (newValue: number | null) => {
    onChange({
      category: value?.category || 'All',
      comparison: value?.comparison || 'min',
      value: newValue || undefined,
      minValue: undefined,
      maxValue: undefined
    });
  };

  const handleMinValueChange = (minValue: number | null) => {
    onChange({
      category: value?.category || 'All',
      comparison: value?.comparison || 'between',
      value: undefined,
      minValue: minValue || undefined,
      maxValue: value?.maxValue
    });
  };

  const handleMaxValueChange = (maxValue: number | null) => {
    onChange({
      category: value?.category || 'All',
      comparison: value?.comparison || 'between',
      value: undefined,
      minValue: value?.minValue,
      maxValue: maxValue || undefined
    });
  };

  return (
    <Flex vertical gap={8}>
      <Select
        placeholder="Select offer category"
        value={value?.category}
        onChange={handleCategoryChange}
        options={categoryOptions}
        disabled={disabled}
        style={{ width: '100%' }}
        allowClear
      />
      
      {value?.category && (
        <div style={{ 
          border: '1px solid #d9d9d9', 
          borderRadius: '6px', 
          padding: '12px',
          backgroundColor: '#fafafa'
        }}>
          <Flex vertical gap={8}>
            <Select
              placeholder="Select comparison type"
              value={value?.comparison}
              onChange={handleComparisonChange}
              options={comparisonOptions}
              disabled={disabled}
              style={{ width: '100%' }}
              allowClear
            />
            
            {value?.comparison && (
              <>
                {value.comparison === 'between' ? (
                  <Flex gap={8}>
                    <InputNumber
                      placeholder="Min"
                      value={value?.minValue}
                      onChange={handleMinValueChange}
                      disabled={disabled}
                      min={0}
                      style={{ flex: 1 }}
                    />
                    <InputNumber
                      placeholder="Max"
                      value={value?.maxValue}
                      onChange={handleMaxValueChange}
                      disabled={disabled}
                      min={0}
                      style={{ flex: 1 }}
                    />
                  </Flex>
                ) : (
                  <InputNumber
                    placeholder={value.comparison === 'min' ? 'Enter minimum value' : 'Enter maximum value'}
                    value={value?.value}
                    onChange={handleValueChange}
                    disabled={disabled}
                    min={0}
                    style={{ width: '100%' }}
                  />
                )}
              </>
            )}
          </Flex>
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
      }      )}
    </div>
  );
}

interface CampFilterFieldProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

interface CampSelection {
  source: string;
  year: number;
  display_name: string;
}

function CampFilterField({ value, onChange, disabled }: CampFilterFieldProps) {
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [displayNames, setDisplayNames] = useState<Array<{ display_name: string; source: string; year: number }>>([]);
  const [selectedSelections, setSelectedSelections] = useState<CampSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingDisplayNames, setLoadingDisplayNames] = useState(false);
  // Cache all data for consolidation
  const [allCampData, setAllCampData] = useState<Map<string, Map<number, string[]>>>(new Map());
  
  // Debounce selections to log consolidated format after user stops selecting
  const debouncedSelections = useDebounce(selectedSelections, 500);

  // Initialize selected selections from value prop (only on mount or when value is cleared)
  // Don't reset from consolidated format - we maintain full selections internally
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    // Only initialize from value prop if:
    // 1. Not yet initialized (first mount)
    // 2. Value is empty/cleared
    // 3. Value is in full format (has display_name) - not consolidated
    if (!isInitialized) {
      if (value && Array.isArray(value) && value.length > 0) {
        // Check if value is in full format (has display_name) or consolidated format
        const hasFullFormat = value.some((v: any) => v.display_name !== undefined);
        if (hasFullFormat) {
          setSelectedSelections(value as CampSelection[]);
        }
        // If consolidated format, we'll expand it when allCampData is ready
      } else {
        setSelectedSelections([]);
      }
      setIsInitialized(true);
    } else if (!value || (Array.isArray(value) && value.length === 0)) {
      // Value was cleared - reset selections
      setSelectedSelections([]);
    }
    // Don't reset from consolidated format - we maintain full selections internally
  }, [value, isInitialized]);

  // Load sources and cache all data on mount
  useEffect(() => {
    const loadSources = async () => {
      setLoading(true);
      try {
        const sourcesData = await fetchCampSources();
        setSources(sourcesData);
        
        // Cache all data for consolidation
        const dataCache = new Map<string, Map<number, string[]>>();
        for (const source of sourcesData) {
          const yearsData = await fetchCampYearsBySource(source);
          const yearMap = new Map<number, string[]>();
          for (const year of yearsData) {
            const displayNamesData = await fetchCampDisplayNames(source, year);
            yearMap.set(year, displayNamesData.map(d => d.display_name));
          }
          dataCache.set(source, yearMap);
        }
        setAllCampData(dataCache);
        
        // If we have a consolidated value prop, expand it to full selections
        if (value && Array.isArray(value) && value.length > 0) {
          const hasFullFormat = value.some((v: any) => v.display_name !== undefined);
          if (!hasFullFormat) {
            // Value is in consolidated format - expand it
            const expandedSelections: CampSelection[] = [];
            for (const item of value) {
              if (item.source && !item.year && !item.display_name) {
                // Source only - expand to all years and display names
                const yearMap = dataCache.get(item.source);
                if (yearMap) {
                  yearMap.forEach((displayNames, year) => {
                    displayNames.forEach(displayName => {
                      expandedSelections.push({
                        source: item.source,
                        year: year,
                        display_name: displayName
                      });
                    });
                  });
                }
              } else if (item.source && item.year && !item.display_name) {
                // Source + year - expand to all display names for that year
                const yearMap = dataCache.get(item.source);
                const displayNames = yearMap?.get(item.year) || [];
                displayNames.forEach(displayName => {
                  expandedSelections.push({
                    source: item.source,
                    year: item.year,
                    display_name: displayName
                  });
                });
              } else if (item.source && item.year && item.display_name) {
                // Full format - use as is
                expandedSelections.push({
                  source: item.source,
                  year: item.year,
                  display_name: item.display_name
                });
              }
            }
            if (expandedSelections.length > 0) {
              setSelectedSelections(expandedSelections);
            }
          }
        }
      } catch (error) {
        console.error('Error loading camp sources:', error);
        setSources([]);
      } finally {
        setLoading(false);
      }
    };

    loadSources();
  }, [value]);

  // Load years when source is selected
  useEffect(() => {
    if (selectedSource) {
      const loadYears = async () => {
        setLoadingYears(true);
        try {
          const yearsData = await fetchCampYearsBySource(selectedSource);
          setYears(yearsData);
        } catch (error) {
          console.error('Error loading camp years:', error);
          setYears([]);
        } finally {
          setLoadingYears(false);
        }
      };

      loadYears();
    } else {
      setYears([]);
      setSelectedYear(null);
      setDisplayNames([]);
    }
  }, [selectedSource]);

  // Load display names when year is selected
  useEffect(() => {
    if (selectedSource && selectedYear) {
      const loadDisplayNames = async () => {
        setLoadingDisplayNames(true);
        try {
          const displayNamesData = await fetchCampDisplayNames(selectedSource, selectedYear);
          setDisplayNames(displayNamesData);
        } catch (error) {
          console.error('Error loading camp display names:', error);
          setDisplayNames([]);
        } finally {
          setLoadingDisplayNames(false);
        }
      };

      loadDisplayNames();
    } else {
      setDisplayNames([]);
    }
  }, [selectedSource, selectedYear]);

  // Consolidate selections: if a source is fully selected, just return the source
  // If a year is fully selected, return source + year (not individual display names)
  // This must be defined before handlers that use it
  const consolidateSelections = useCallback((selections: CampSelection[]): Array<{ source: string; year?: number; display_name?: string }> => {
    const consolidated: Array<{ source: string; year?: number; display_name?: string }> = [];
    const sourcesList = Array.from(new Set(selections.map(s => s.source)));
    
    for (const source of sourcesList) {
      const sourceSelections = selections.filter(s => s.source === source);
      const yearMap = allCampData.get(source);
      
      if (!yearMap) continue;
      
      // Count total possible selections for this source
      let totalPossible = 0;
      yearMap.forEach((displayNames) => {
        totalPossible += displayNames.length;
      });
      
      // Check if source is fully selected
      if (sourceSelections.length === totalPossible && totalPossible > 0) {
        // Source is fully selected - just add the source
        consolidated.push({ source });
      } else {
        // Source is partially selected - check each year
        const years = Array.from(new Set(sourceSelections.map(s => s.year)));
        for (const year of years) {
          const yearSelections = selections.filter(s => s.source === source && s.year === year);
          const displayNamesForYear = yearMap.get(year) || [];
          const uniqueSelected = new Set(yearSelections.map(s => s.display_name));
          
          // Check if year is fully selected
          if (uniqueSelected.size === displayNamesForYear.length && displayNamesForYear.length > 0) {
            // Year is fully selected - add source + year
            consolidated.push({ source, year });
          } else {
            // Year is partially selected - add individual display names
            for (const displayName of uniqueSelected) {
              consolidated.push({ source, year, display_name: displayName });
            }
          }
        }
      }
    }
    
    return consolidated;
  }, [allCampData]);

  const handleSourceExpand = async (source: string) => {
    if (selectedSource === source) {
      // Collapse - just close the expansion
      setSelectedSource(null);
      setSelectedYear(null);
    } else {
      // Expand - show years for this source
      setSelectedSource(source);
      setSelectedYear(null);
      
      // Load years for this source
      const yearsData = await fetchCampYearsBySource(source);
      setYears(yearsData);
    }
  };

  const handleSourceSelect = async (source: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expansion
    
    // Check if source is already fully selected (all items selected)
    const existingSelections = selectedSelections.filter(s => s.source === source);
    const yearsData = await fetchCampYearsBySource(source);
    
    // Count total possible selections for this source (using unique display names)
    let totalPossible = 0;
    const allPossibleSelections: CampSelection[] = [];
    const seenDisplayNames = new Set<string>();
    
    for (const year of yearsData) {
      const displayNamesData = await fetchCampDisplayNames(source, year);
      const uniqueDisplayNames = new Set(displayNamesData.map(d => d.display_name));
      totalPossible += uniqueDisplayNames.size;
      
      // Add each unique display name once
      for (const displayName of uniqueDisplayNames) {
        const key = `${source}-${year}-${displayName}`;
        if (!seenDisplayNames.has(key)) {
          seenDisplayNames.add(key);
          allPossibleSelections.push({
            source: source,
            year: year,
            display_name: displayName
          });
        }
      }
    }
    
    // Check if fully selected by comparing unique selections
    const uniqueExistingSelections = new Set(
      existingSelections.map(s => `${s.source}-${s.year}-${s.display_name}`)
    );
    const uniqueAllPossible = new Set(
      allPossibleSelections.map(s => `${s.source}-${s.year}-${s.display_name}`)
    );
    const isFullySelected = uniqueExistingSelections.size === uniqueAllPossible.size && uniqueAllPossible.size > 0;
    
    if (isFullySelected) {
      // Deselect source - remove all selections for this source
      const newSelections = selectedSelections.filter(s => s.source !== source);
      setSelectedSelections(newSelections);
      // Pass consolidated format
      const consolidated = consolidateSelections(newSelections);
      onChange(consolidated);
    } else {
      // Select source - select all years and display names for this source
      // Remove existing selections for this source and add all new ones
      const filteredSelections = selectedSelections.filter(s => s.source !== source);
      const newSelections = [...filteredSelections, ...allPossibleSelections];
      
      console.log('Selecting source:', source);
      console.log('All possible selections count:', allPossibleSelections.length);
      console.log('New selections count:', newSelections.length);
      console.log('New selections for this source:', newSelections.filter(s => s.source === source).length);
      
      setSelectedSelections(newSelections);
      // Pass consolidated format
      const consolidated = consolidateSelections(newSelections);
      console.log('Consolidated:', consolidated);
      onChange(consolidated);
    }
  };

  const handleYearExpand = async (year: number) => {
    if (!selectedSource) return;
    
    if (selectedYear === year) {
      // Collapse - just close the expansion
      setSelectedYear(null);
    } else {
      // Expand - show display names for this year
      setSelectedYear(year);
      
      // Load display names for this year
      const displayNamesData = await fetchCampDisplayNames(selectedSource, year);
      setDisplayNames(displayNamesData);
    }
  };

  const handleYearSelect = async (year: number, e: React.MouseEvent) => {
    if (!selectedSource) return;
    e.stopPropagation(); // Prevent expansion
    
    // Load display names for this year to check if fully selected
    const displayNamesData = await fetchCampDisplayNames(selectedSource, year);
    
    const existingSelections = selectedSelections.filter(
      s => s.source === selectedSource && s.year === year
    );
    // Check if fully selected by comparing unique display names
    const uniqueSelected = new Set(existingSelections.map(s => s.display_name));
    const uniqueDisplayNames = new Set(displayNamesData.map(d => d.display_name));
    const isFullySelected = uniqueSelected.size === uniqueDisplayNames.size && uniqueDisplayNames.size > 0;
    
    if (isFullySelected) {
      // Deselect year - remove all selections for this year
      const newSelections = selectedSelections.filter(
        s => !(s.source === selectedSource && s.year === year)
      );
      setSelectedSelections(newSelections);
      // Pass consolidated format
      const consolidated = consolidateSelections(newSelections);
      onChange(consolidated);
    } else {
      // Select year - select all display names for this year
      // Get unique display names to avoid duplicates
      const uniqueDisplayNames = Array.from(new Set(displayNamesData.map(d => d.display_name)));
      const yearSelections: CampSelection[] = uniqueDisplayNames.map(displayName => ({
        source: selectedSource,
        year: year,
        display_name: displayName
      }));
      
      // Remove existing selections for this year and add all new ones
      const filteredSelections = selectedSelections.filter(
        s => !(s.source === selectedSource && s.year === year)
      );
      const newSelections = [...filteredSelections, ...yearSelections];
      setSelectedSelections(newSelections);
      // Pass consolidated format
      const consolidated = consolidateSelections(newSelections);
      onChange(consolidated);
    }
  };

  const handleDisplayNameToggle = (displayName: string) => {
    if (!selectedSource || !selectedYear) return;

    const selection: CampSelection = {
      source: selectedSource,
      year: selectedYear,
      display_name: displayName
    };

    const isSelected = selectedSelections.some(
      s => s.source === selection.source && 
           s.year === selection.year && 
           s.display_name === selection.display_name
    );

    let newSelections: CampSelection[];
    if (isSelected) {
      // Deselect this display name
      newSelections = selectedSelections.filter(
        s => !(s.source === selection.source && 
               s.year === selection.year && 
               s.display_name === selection.display_name)
      );
      
      // Check if all display names for this year are deselected
      const remainingForYear = newSelections.filter(
        s => s.source === selectedSource && s.year === selectedYear
      );
      
      // If no display names remain for this year, deselect the year
      if (remainingForYear.length === 0 && selectedYear === selection.year) {
        setSelectedYear(null);
      }
      
      // Check if all years for this source are deselected
      const remainingForSource = newSelections.filter(
        s => s.source === selectedSource
      );
      
      // If no years remain for this source, deselect the source
      if (remainingForSource.length === 0 && selectedSource === selection.source) {
        setSelectedSource(null);
        setSelectedYear(null);
      }
    } else {
      // Select this display name
      newSelections = [...selectedSelections, selection];
    }

    setSelectedSelections(newSelections);
    // Pass consolidated format
    const consolidated = consolidateSelections(newSelections);
    onChange(consolidated);
  };

  const isDisplayNameSelected = (displayName: string): boolean => {
    if (!selectedSource || !selectedYear) return false;
    return selectedSelections.some(
      s => s.source === selectedSource && 
           s.year === selectedYear && 
           s.display_name === displayName
    );
  };

  // Get selection state for a source: 'none' | 'partial' | 'full'
  const getSourceSelectionState = (source: string): 'none' | 'partial' | 'full' => {
    const sourceSelections = selectedSelections.filter(s => s.source === source);
    if (sourceSelections.length === 0) return 'none';
    
    const yearMap = allCampData.get(source);
    if (!yearMap) {
      // If data not in cache yet, check if we have selections (partial)
      return sourceSelections.length > 0 ? 'partial' : 'none';
    }
    
    // Count unique possible selections
    let totalPossible = 0;
    yearMap.forEach((displayNames) => {
      totalPossible += displayNames.length;
    });
    
    // Count unique selected items
    const uniqueSelected = new Set(
      sourceSelections.map(s => `${s.source}-${s.year}-${s.display_name}`)
    );
    
    const isFull = uniqueSelected.size === totalPossible && totalPossible > 0;
    
    // Debug logging for College Camp
    if (source === 'College Camp') {
      console.log('getSourceSelectionState for College Camp:', {
        sourceSelectionsCount: sourceSelections.length,
        uniqueSelectedSize: uniqueSelected.size,
        totalPossible,
        isFull,
        yearMapSize: yearMap.size,
        sampleSelections: Array.from(uniqueSelected).slice(0, 3),
        sampleYearMap: Array.from(yearMap.entries()).slice(0, 2)
      });
    }
    
    if (isFull) {
      return 'full';
    }
    return 'partial';
  };

  const isSourceSelected = (source: string): boolean => {
    return getSourceSelectionState(source) !== 'none';
  };

  // Get selection state for a year: 'none' | 'partial' | 'full'
  const getYearSelectionState = (year: number, source: string): 'none' | 'partial' | 'full' => {
    const yearSelections = selectedSelections.filter(
      s => s.source === source && s.year === year
    );
    if (yearSelections.length === 0) return 'none';
    
    const yearMap = allCampData.get(source);
    const displayNames = yearMap?.get(year) || [];
    const uniqueSelected = new Set(yearSelections.map(s => s.display_name));
    
    if (uniqueSelected.size === displayNames.length && displayNames.length > 0) {
      return 'full';
    }
    return 'partial';
  };

  const isYearSelected = (year: number): boolean => {
    if (!selectedSource) return false;
    return getYearSelectionState(year, selectedSource) !== 'none';
  };

  // Log consolidated selections after user stops selecting (debounced)
  useEffect(() => {
    // Only log if we have data loaded and selections have changed
    if (allCampData.size > 0) {
      const consolidated = consolidateSelections(debouncedSelections);
      console.log('Camp Filter - Consolidated Selections:', consolidated);
    }
  }, [debouncedSelections, allCampData, consolidateSelections]);

  return (
    <div style={{ 
      display: 'flex',
      flexDirection: 'column',
      gap: '0',
      width: '100%'
    }}>
      {/* Top row - Sources and Years side by side */}
      <div style={{
        display: 'flex',
        gap: '0',
        border: '1px solid #d9d9d9',
        borderRadius: selectedSource && selectedYear ? '6px 6px 0 0' : '6px',
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}>
        {/* Layer 1 - Sources */}
        <div style={{
          width: '150px',
          backgroundColor: '#fff',
          color: '#000',
          padding: '12px 0',
          overflowY: 'auto',
          maxHeight: '400px',
          flexShrink: 0
        }}>
          {loading ? (
            <div style={{ padding: '12px', color: '#999' }}>Loading...</div>
          ) : (
            sources.map(source => (
              <div
                key={source}
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: selectedSource === source ? '#f0f0f0' : 'transparent',
                  opacity: disabled ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!disabled && selectedSource !== source) {
                    e.currentTarget.style.backgroundColor = '#fafafa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedSource !== source) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div 
                  onClick={(e) => !disabled && handleSourceSelect(source, e)}
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '1px solid #d9d9d9',
                    backgroundColor: getSourceSelectionState(source) === 'full' ? '#1890ff' : 'transparent',
                    borderRadius: '2px',
                    flexShrink: 0,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    position: 'relative'
                  }} 
                >
                  {/* Indeterminate indicator for partial selection */}
                  {getSourceSelectionState(source) === 'partial' && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '8px',
                      height: '2px',
                      backgroundColor: '#1890ff',
                      borderRadius: '1px'
                    }} />
                  )}
                </div>
                <span 
                  onClick={() => !disabled && handleSourceExpand(source)}
                  style={{ flex: 1, fontSize: '13px', color: '#000', cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                  {source}
                </span>
                <span 
                  onClick={() => !disabled && handleSourceExpand(source)}
                  style={{ color: '#999', fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer' }}
                >
                  &gt;
                </span>
              </div>
            ))
          )}
        </div>

        {/* Layer 2 - Years */}
        {selectedSource && (
          <div style={{
            width: '150px',
            backgroundColor: '#fff',
            color: '#000',
            padding: '12px 0',
            overflowY: 'auto',
            maxHeight: '400px',
            borderLeft: '1px solid #d9d9d9',
            flexShrink: 0
          }}>
            {loadingYears ? (
              <div style={{ padding: '12px', color: '#999' }}>Loading...</div>
            ) : (
              years.map(year => (
                <div
                  key={year}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: selectedYear === year ? '#f0f0f0' : 'transparent',
                    opacity: disabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && selectedYear !== year) {
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedYear !== year) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div 
                    onClick={(e) => !disabled && handleYearSelect(year, e)}
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '1px solid #d9d9d9',
                      backgroundColor: getYearSelectionState(year, selectedSource) === 'full' ? '#1890ff' : 'transparent',
                      borderRadius: '2px',
                      flexShrink: 0,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      position: 'relative'
                    }} 
                  >
                    {/* Indeterminate indicator for partial selection */}
                    {getYearSelectionState(year, selectedSource) === 'partial' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '2px',
                        backgroundColor: '#1890ff',
                        borderRadius: '1px'
                      }} />
                    )}
                  </div>
                  <span 
                    onClick={() => !disabled && handleYearExpand(year)}
                    style={{ flex: 1, fontSize: '13px', color: '#000', cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    {year}
                  </span>
                  <span 
                    onClick={() => !disabled && handleYearExpand(year)}
                    style={{ color: '#999', fontSize: '12px', cursor: disabled ? 'not-allowed' : 'pointer' }}
                  >
                    &gt;
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Layer 3 - Display Names (below) */}
      {selectedSource && selectedYear && (
        <div style={{
          width: '100%',
          backgroundColor: '#fff',
          color: '#000',
          padding: '12px 0',
          overflowY: 'auto',
          maxHeight: '400px',
          border: '1px solid #d9d9d9',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px'
        }}>
          {loadingDisplayNames ? (
            <div style={{ padding: '12px', color: '#999' }}>Loading...</div>
          ) : displayNames.length === 0 ? (
            <div style={{ padding: '12px', color: '#999' }}>No events found</div>
          ) : (
            displayNames.map((item, index) => {
              const isSelected = isDisplayNameSelected(item.display_name);
              return (
                <div
                  key={`${item.display_name}-${index}`}
                  onClick={() => !disabled && handleDisplayNameToggle(item.display_name)}
                  style={{
                    padding: '8px 12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: isSelected ? '#f0f0f0' : 'transparent',
                    opacity: disabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!disabled && !isSelected) {
                      e.currentTarget.style.backgroundColor = '#fafafa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '1px solid #d9d9d9',
                    backgroundColor: isSelected ? '#1890ff' : 'transparent',
                    borderRadius: '2px',
                    flexShrink: 0
                  }} />
                  <span style={{ flex: 1, fontSize: '13px', color: '#000' }}>{item.display_name}</span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
