"use client";

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { geoCentroid, geoPath, geoArea } from "d3-geo";
import { Card, Button, Select, message, Space, Typography, Tag, Checkbox, Collapse, Modal, Avatar, Divider } from "antd";
import { ReloadOutlined, CloseOutlined, EnvironmentOutlined, PlusOutlined, MinusOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

// TopoJSON URLs for US maps
const US_STATES_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";
const US_COUNTIES_URL =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

// State name to abbreviation mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  "Alabama": "AL",
  "Alaska": "AK",
  "Arizona": "AZ",
  "Arkansas": "AR",
  "California": "CA",
  "Colorado": "CO",
  "Connecticut": "CT",
  "Delaware": "DE",
  "Florida": "FL",
  "Georgia": "GA",
  "Hawaii": "HI",
  "Idaho": "ID",
  "Illinois": "IL",
  "Indiana": "IN",
  "Iowa": "IA",
  "Kansas": "KS",
  "Kentucky": "KY",
  "Louisiana": "LA",
  "Maine": "ME",
  "Maryland": "MD",
  "Massachusetts": "MA",
  "Michigan": "MI",
  "Minnesota": "MN",
  "Mississippi": "MS",
  "Missouri": "MO",
  "Montana": "MT",
  "Nebraska": "NE",
  "Nevada": "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  "Ohio": "OH",
  "Oklahoma": "OK",
  "Oregon": "OR",
  "Pennsylvania": "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  "Tennessee": "TN",
  "Texas": "TX",
  "Utah": "UT",
  "Vermont": "VT",
  "Virginia": "VA",
  "Washington": "WA",
  "West Virginia": "WV",
  "Wisconsin": "WI",
  "Wyoming": "WY",
  "District of Columbia": "DC",
};

// Function to get state abbreviation or return short name
const getStateLabel = (stateName: string): string => {
  return STATE_ABBREVIATIONS[stateName] || stateName;
};

// Function to get state abbreviation for reports
const getStateAbbreviation = (stateName: string): string => {
  return STATE_ABBREVIATIONS[stateName] || stateName.substring(0, 2).toUpperCase();
};

interface StateData {
  name: string;
  id: string;
  fips: string;
}

interface CountyData {
  name: string;
  id: string;
  state: string;
  fips: string;
}

interface InteractiveUSMapProps {
  /**
   * Callback function called when states are selected/deselected
   * @param selectedStates - Array of all selected states
   * @param allCounties - Array of all counties from selected states
   */
  onStateSelect?: (selectedStates: StateData[], allCounties: CountyData[]) => void;
  
  /**
   * Callback function called when counties are selected/deselected
   * @param selectedCounties - Array of all selected counties
   */
  onCountySelect?: (selectedCounties: CountyData[]) => void;
  
  /**
   * Enable multi-select mode (default: true)
   */
  multiSelect?: boolean;
  
  /**
   * Initial selected state (state FIPS code)
   */
  initialSelectedState?: string;
  
  /**
   * Show county boundaries
   */
  showCounties?: boolean;
  
  /**
   * Map height
   */
  height?: string | number;
  
  /**
   * Map width
   */
  width?: string | number;
  
  /**
   * Title for the map
   */
  title?: string;
  
  /**
   * Coach assignments - Map of county ID to { coach: string, color: string }
   */
  coachAssignments?: Map<string, { coach: string; color: string }>;
}

export interface InteractiveUSMapRef {
  selectAllCountiesForState: (stateName: string, stateId: string) => void;
  deselectCounty: (countyId: string) => void;
}

/**
 * Interactive US Map Component
 * 
 * Displays an interactive map of the United States with states and counties.
 * Users can click on states to see counties and get data about the selection.
 */
const InteractiveUSMap = forwardRef<InteractiveUSMapRef, InteractiveUSMapProps>(({
  onStateSelect,
  onCountySelect,
  initialSelectedState,
  showCounties = true,
  height = "calc(90vh - 20px)",
  width = "100%",
  title = "Interactive US Map",
  multiSelect = true,
  coachAssignments = new Map(),
}, ref) => {
  const [selectedStates, setSelectedStates] = useState<Set<string>>(
    initialSelectedState ? new Set([initialSelectedState]) : new Set()
  );
  const [selectedCounties, setSelectedCounties] = useState<Set<string>>(new Set());
  const [statesData, setStatesData] = useState<Map<string, StateData>>(new Map());
  const [countiesData, setCountiesData] = useState<Map<string, CountyData>>(new Map());
  const [allCountiesByState, setAllCountiesByState] = useState<Map<string, CountyData[]>>(new Map());
  const [stateGeographies, setStateGeographies] = useState<Map<string, { name: string; fips: string }>>(new Map());
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [hoveredCounty, setHoveredCounty] = useState<string | null>(null);
  const [hoveredSelectedState, setHoveredSelectedState] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [buttonPosition, setButtonPosition] = useState<{ x: number; y: number } | null>(null);
  const [showCountiesLayer, setShowCountiesLayer] = useState(showCounties !== false); // Use prop or default to true
  const [renderKey, setRenderKey] = useState(0); // Force re-render when counties change
  const stateGeoProcessed = useRef(false);
  const countiesProcessed = useRef(false);
  const stateGeographiesRef = useRef<Map<string, { name: string; fips: string }>>(new Map());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoveredStateIdRef = useRef<string | null>(null);
  const hoveredCountyIdRef = useRef<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
  const [position, setPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });
  const [targetPosition, setTargetPosition] = useState({ coordinates: [0, 0] as [number, number], zoom: 1 });
  const animationFrameRef = useRef<number | null>(null);
  
  // Smooth animation for zoom and pan
  useEffect(() => {
    // Check if we need to animate
    const needsAnimation = 
      Math.abs(position.zoom - targetPosition.zoom) > 0.01 ||
      Math.abs(position.coordinates[0] - targetPosition.coordinates[0]) > 0.01 ||
      Math.abs(position.coordinates[1] - targetPosition.coordinates[1]) > 0.01;
    
    if (!needsAnimation) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }
    
    const animate = () => {
      setPosition(prev => {
        const currentZoom = prev.zoom;
        const targetZoom = targetPosition.zoom;
        const currentCoords = prev.coordinates;
        const targetCoords = targetPosition.coordinates;
        
        const zoomDiff = Math.abs(targetZoom - currentZoom);
        const coordDiff = Math.abs(targetCoords[0] - currentCoords[0]) + Math.abs(targetCoords[1] - currentCoords[1]);
        
        // If close enough, snap to target
        if (zoomDiff < 0.01 && coordDiff < 0.01) {
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return targetPosition;
        }
        
        // Smooth interpolation (easing function)
        const easing = 0.15; // Adjust for speed (lower = slower, smoother)
        const newZoom = currentZoom + (targetZoom - currentZoom) * easing;
        const newCoords: [number, number] = [
          currentCoords[0] + (targetCoords[0] - currentCoords[0]) * easing,
          currentCoords[1] + (targetCoords[1] - currentCoords[1]) * easing
        ];
        
        animationFrameRef.current = requestAnimationFrame(animate);
        return { coordinates: newCoords, zoom: newZoom };
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetPosition]);
  
  // Update county state names when state geographies become available
  useEffect(() => {
    if (stateGeographies.size === 0 || countiesData.size === 0) return;
    
    // Update counties that have "Unknown" state or incorrect state names
    const updatedCountiesData = new Map(countiesData);
    let updated = false;
    
    countiesData.forEach((county, countyId) => {
      if (county.state === "Unknown" || !county.state) {
        const countyFips = county.fips;
        if (countyFips) {
          // Pad to 5 digits first, then take first 2 for state FIPS
          const countyFipsStr = String(countyFips).padStart(5, '0');
          const countyStateFips = countyFipsStr.substring(0, 2);
          const stateGeo = stateGeographies.get(countyStateFips);
          if (stateGeo) {
            updatedCountiesData.set(countyId, {
              ...county,
              state: stateGeo.name,
            });
            updated = true;
          }
        }
      }
    });
    
    if (updated) {
      setCountiesData(updatedCountiesData);
    }
  }, [stateGeographies, countiesData]);

  // Handle state click
  const handleStateClick = useCallback(
    (geo: any) => {
      // State ID can be the FIPS code or the state abbreviation
      const stateId = geo.properties?.state || geo.id;
      const stateName = geo.properties?.name || geo.properties?.NAME || "Unknown";
      // Try to get FIPS code - it might be in different properties
      const stateFips = geo.properties?.fips || geo.properties?.state || geo.id;

      const newStateData: StateData = {
        name: stateName,
        id: stateId,
        fips: stateFips,
      };

      // Toggle state selection
      const newSelectedStates = new Set(selectedStates);
      const newStatesData = new Map(statesData);
      
      if (newSelectedStates.has(stateId)) {
        // Deselect
        newSelectedStates.delete(stateId);
        newStatesData.delete(stateId);
        message.info(`Deselected: ${stateName}`);
        // Reset zoom when deselecting
        setTargetPosition({ coordinates: [0, 0], zoom: 1 });
      } else {
        // Select
        if (!multiSelect && newSelectedStates.size > 0) {
          // Single select mode - clear previous selection
          newSelectedStates.clear();
          newStatesData.clear();
        }
        newSelectedStates.add(stateId);
        newStatesData.set(stateId, newStateData);
        message.success(`Selected: ${stateName}`);
        
        // Zoom and center on the selected state
        try {
          const centroid = geoCentroid(geo.geometry);
          if (centroid && Array.isArray(centroid) && centroid.length === 2) {
            // Zoom to 2.5x and center on the state (with animation)
            setTargetPosition({ 
              coordinates: [centroid[0], centroid[1]], 
              zoom: 2.5 
            });
          }
        } catch (error) {
          console.error("Error calculating state centroid:", error);
        }
      }

      // If this state was deselected, clear its counties
      let updatedSelectedCounties = selectedCounties;
      let updatedCountiesData = countiesData;
      if (!newSelectedStates.has(stateId)) {
        updatedSelectedCounties = new Set(selectedCounties);
        updatedCountiesData = new Map(countiesData);
        updatedCountiesData.forEach((county, countyId) => {
          if (county.state === stateName) {
            updatedSelectedCounties.delete(countyId);
            updatedCountiesData.delete(countyId);
          }
        });
        setSelectedCounties(updatedSelectedCounties);
        setCountiesData(updatedCountiesData);
      }

      setSelectedStates(newSelectedStates);
      setStatesData(newStatesData);

      // Call the callback with all selected states
      if (onStateSelect) {
        const allSelectedStatesData = Array.from(newSelectedStates)
          .map(id => newStatesData.get(id))
          .filter(Boolean) as StateData[];
        
        // Only include counties from currently selected states
        const selectedStateNames = new Set(allSelectedStatesData.map(s => s.name.trim()));
        const allCounties = Array.from(updatedCountiesData.values()).filter(county => {
          if (!county || !county.state) return false;
          const countyStateName = county.state.trim();
          return selectedStateNames.has(countyStateName);
        });
        
        onStateSelect(allSelectedStatesData, allCounties);
      }
    },
    [onStateSelect, selectedStates, statesData, multiSelect, selectedCounties, countiesData]
  );

  // Handle county click
  const handleCountyClick = useCallback(
    (geo: any) => {
      const countyId = geo.id;
      const countyName = geo.properties?.name || geo.properties?.NAME || "Unknown";
      // County FIPS: 5 digits where first 2 are state FIPS (e.g., 04005 = Arizona state 04, county 005)
      const countyFips = geo.properties?.fips || geo.id;
      // Pad to 5 digits first, then take first 2 for state FIPS
      const countyFipsStr = countyFips ? String(countyFips).padStart(5, '0') : null;
      const countyStateFips = countyFipsStr ? countyFipsStr.substring(0, 2) : null;
      
      // Find the state by matching FIPS codes
      let stateData: StateData | undefined;
      let stateName = "Unknown";
      
      if (countyStateFips) {
        // First try to find from state geographies (most reliable)
        const stateGeo = stateGeographies.get(countyStateFips) || stateGeographiesRef.current.get(countyStateFips);
        if (stateGeo) {
          stateName = stateGeo.name;
          // Try to find state data if state is selected
          for (const [stateId, state] of Array.from(statesData.entries())) {
            if (state.name === stateGeo.name) {
              stateData = state;
              break;
            }
          }
        } else {
          // Fallback 1: try to find from allCountiesByState (counties already processed)
          for (const [stateNameKey, counties] of Array.from(allCountiesByState.entries())) {
            const county = counties.find(c => c.id === countyId);
            if (county) {
              stateName = county.state;
              break;
            }
          }
          
          // Fallback 2: try to find state by FIPS code from selected states
          if (stateName === "Unknown") {
            for (const [stateId, state] of Array.from(statesData.entries())) {
              const stateFipsStr = String(state.fips || stateId).padStart(2, '0');
              if (stateFipsStr === countyStateFips) {
                stateData = state;
                stateName = state.name;
                break;
              }
            }
          }
        }
      }

      const newCountyData: CountyData = {
        name: countyName,
        id: countyId,
        state: stateName,
        fips: countyFips,
      };

      // Toggle county selection
      const newSelectedCounties = new Set(selectedCounties);
      const newCountiesData = new Map(countiesData);
      
      if (newSelectedCounties.has(countyId)) {
        // Deselect
        newSelectedCounties.delete(countyId);
        newCountiesData.delete(countyId);
        message.info(`Deselected: ${countyName}, ${stateName}`);
      } else {
        // Select
        if (!multiSelect && newSelectedCounties.size > 0) {
          // Single select mode - clear previous selection
          newSelectedCounties.clear();
          newCountiesData.clear();
        }
        newSelectedCounties.add(countyId);
        newCountiesData.set(countyId, newCountyData);
        message.success(`Selected: ${countyName}, ${stateName}`);
      }

      setSelectedCounties(newSelectedCounties);
      setCountiesData(newCountiesData);
      setRenderKey(prev => prev + 1); // Force re-render to update state colors

      // Call the callback with all selected counties
      if (onCountySelect) {
        const allSelectedCountiesData = Array.from(newSelectedCounties)
          .map(id => newCountiesData.get(id))
          .filter(Boolean) as CountyData[];
        onCountySelect(allSelectedCountiesData);
      }
    },
    [onCountySelect, selectedCounties, countiesData, statesData, stateGeographies, allCountiesByState, multiSelect]
  );

  // Reset to states view
  const handleReset = () => {
    setSelectedStates(new Set());
    setSelectedCounties(new Set());
    setStatesData(new Map());
    setCountiesData(new Map());
    message.info("Cleared all selections");
    
    // Call callbacks with empty arrays
    if (onStateSelect) {
      onStateSelect([], []);
    }
    if (onCountySelect) {
      onCountySelect([]);
    }
  };

  // Select all counties for a state
  const handleSelectAllCountiesForState = useCallback(
    (stateName: string, stateId: string) => {
      const countiesForState = allCountiesByState.get(stateName) || [];
      const newSelectedCounties = new Set(selectedCounties);
      const newCountiesData = new Map(countiesData);
      
      // Check if all counties are already selected
      const allSelected = countiesForState.every((county: CountyData) => newSelectedCounties.has(county.id));
      
      if (allSelected) {
        // Deselect all counties for this state
        countiesForState.forEach((county: CountyData) => {
          newSelectedCounties.delete(county.id);
          newCountiesData.delete(county.id);
        });
        message.info(`Deselected all counties in ${stateName}`);
      } else {
        // Select all counties for this state
        countiesForState.forEach((county: CountyData) => {
          newSelectedCounties.add(county.id);
          newCountiesData.set(county.id, county);
        });
        message.success(`Selected all ${countiesForState.length} counties in ${stateName}`);
      }
      
      setSelectedCounties(newSelectedCounties);
      setCountiesData(newCountiesData);
      setRenderKey(prev => prev + 1); // Force re-render to update state colors
      
      // Call the callback
      if (onCountySelect) {
        const allSelectedCountiesData = Array.from(newSelectedCounties)
          .map(id => newCountiesData.get(id))
          .filter(Boolean) as CountyData[];
        onCountySelect(allSelectedCountiesData);
      }
    },
    [allCountiesByState, selectedCounties, countiesData, onCountySelect]
  );

  // Handle deselecting a specific county
  const handleDeselectCounty = useCallback(
    (countyId: string) => {
      const newSelectedCounties = new Set(selectedCounties);
      const newCountiesData = new Map(countiesData);
      
      if (newSelectedCounties.has(countyId)) {
        const county = newCountiesData.get(countyId);
        newSelectedCounties.delete(countyId);
        newCountiesData.delete(countyId);
        
        setSelectedCounties(newSelectedCounties);
        setCountiesData(newCountiesData);
        setRenderKey(prev => prev + 1); // Force re-render to update state colors
        
        // Call the callback
        if (onCountySelect) {
          const allSelectedCountiesData = Array.from(newSelectedCounties)
            .map(id => newCountiesData.get(id))
            .filter(Boolean) as CountyData[];
          onCountySelect(allSelectedCountiesData);
        }
        
        if (county) {
          message.info(`Deselected: ${county.name}, ${county.state}`);
        }
      }
    },
    [selectedCounties, countiesData, onCountySelect]
  );

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    selectAllCountiesForState: (stateName: string, stateId: string) => {
      handleSelectAllCountiesForState(stateName, stateId);
    },
    deselectCounty: (countyId: string) => {
      handleDeselectCounty(countyId);
    },
  }), [handleSelectAllCountiesForState, handleDeselectCounty]);

  // Remove a specific state
  const handleRemoveState = (stateId: string) => {
    const newSelectedStates = new Set(selectedStates);
    newSelectedStates.delete(stateId);
    const stateData = statesData.get(stateId);
    statesData.delete(stateId);
    
    // Remove counties from this state
    const newSelectedCounties = new Set(selectedCounties);
    countiesData.forEach((county, countyId) => {
      if (county.state === stateData?.name) {
        newSelectedCounties.delete(countyId);
        countiesData.delete(countyId);
      }
    });
    
    setSelectedStates(newSelectedStates);
    setSelectedCounties(newSelectedCounties);
    setStatesData(new Map(statesData));
    setCountiesData(new Map(countiesData));
    
    if (onStateSelect) {
      const allSelectedStatesData = Array.from(newSelectedStates)
        .map(id => statesData.get(id))
        .filter(Boolean) as StateData[];
      const allCounties = Array.from(countiesData.values());
      onStateSelect(allSelectedStatesData, allCounties);
    }
    
    message.info(`Removed: ${stateData?.name || stateId}`);
  };

  // Remove a specific county
  const handleRemoveCounty = (countyId: string) => {
    const newSelectedCounties = new Set(selectedCounties);
    const countyData = countiesData.get(countyId);
    newSelectedCounties.delete(countyId);
    countiesData.delete(countyId);
    
    setSelectedCounties(newSelectedCounties);
    setCountiesData(new Map(countiesData));
    setRenderKey(prev => prev + 1); // Force re-render to update state colors
    
    if (onCountySelect) {
      const allSelectedCountiesData = Array.from(newSelectedCounties)
        .map(id => countiesData.get(id))
        .filter(Boolean) as CountyData[];
      onCountySelect(allSelectedCountiesData);
    }
    
    message.info(`Removed: ${countyData?.name || countyId}`);
  };

  // Check if any county in a state is selected
  const hasSelectedCountiesInState = useCallback((stateName: string): boolean => {
    if (!stateName || stateName === "Unknown") return false;
    
    // Normalize state name for comparison (trim and lowercase)
    const normalizedStateName = stateName.trim().toLowerCase();
    
    // Check countiesData first - use case-insensitive matching
    for (const [countyId, county] of Array.from(countiesData.entries())) {
      if (selectedCounties.has(countyId)) {
        const normalizedCountyState = (county.state?.trim() || "").toLowerCase();
        if (normalizedCountyState === normalizedStateName) {
          return true;
        }
      }
    }
    
    // Also check allCountiesByState - try exact match first
    const countiesForState = allCountiesByState.get(stateName.trim()) || [];
    if (countiesForState.length > 0) {
      const hasSelected = countiesForState.some((county: CountyData) => selectedCounties.has(county.id));
      if (hasSelected) return true;
    }
    
    // Try case-insensitive matching with allCountiesByState keys
    for (const [stateKey, counties] of Array.from(allCountiesByState.entries())) {
      if (stateKey.trim().toLowerCase() === normalizedStateName) {
        return counties.some((county: CountyData) => selectedCounties.has(county.id));
      }
    }
    
    return false;
  }, [countiesData, selectedCounties, allCountiesByState]);

  // Get fill color for states (semi-transparent so counties are visible)
  const getStateFill = useCallback((geo: any, isHovered: boolean = false) => {
    const stateId = geo.properties?.state || geo.id;
    const stateName = geo.properties?.name || geo.properties?.NAME || "Unknown";
    
    // Check if any county in this state is selected
    if (hasSelectedCountiesInState(stateName)) {
      return isHovered ? "rgba(144, 238, 144, 0.9)" : "rgba(144, 238, 144, 0.7)"; // Light green when counties are selected (same as selected state)
    }
    
    if (selectedStates.has(stateId)) {
      return isHovered ? "rgba(144, 238, 144, 0.9)" : "rgba(144, 238, 144, 0.7)"; // Selected state - light green (very opaque)
    }
    if (isHovered) {
      return "rgba(144, 238, 144, 0.6)"; // Hovered state - lighter green (very visible)
    }
    return "rgba(176, 176, 191, 0.5)"; // Default - #b0b0bf (more visible)
  }, [hasSelectedCountiesInState, selectedStates]);

  // Get unique border color for each selected state
  const getStateBorderColor = useCallback((stateId: string): string => {
    if (!selectedStates.has(stateId)) {
      return "#ffffff"; // Default white border for unselected states
    }
    
    // Array of distinct colors for selected states
    const stateColors = [
      "#0958d9", // Blue
      "#cf1322", // Red
      "#389e0d", // Green
      "#d48806", // Orange
      "#722ed1", // Purple
      "#eb2f96", // Pink
      "#13c2c2", // Cyan
      "#fa8c16", // Orange-red
      "#2f54eb", // Indigo
      "#52c41a", // Light green
      "#faad14", // Gold
      "#f5222d", // Bright red
    ];
    
    // Get the index of this state in the selectedStates set
    const selectedStatesArray = Array.from(selectedStates);
    const stateIndex = selectedStatesArray.indexOf(stateId);
    
    // Use modulo to cycle through colors if more states than colors
    return stateColors[stateIndex % stateColors.length];
  }, [selectedStates]);

  // Color mapping function
  const getColorHex = (colorName: string): string => {
    const colorMap: Record<string, string> = {
      "Red": "#FF0000",
      "Blue": "#1890ff",
      "Green": "#52c41a",
      "Yellow": "#FFD000",
    };
    return colorMap[colorName] || "#b0b0bf";
  };

  // Convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Get fill color for counties
  const getCountyFill = (geo: any, isHovered: boolean = false) => {
    const countyId = geo.id;
    const county = countiesData.get(countyId);
    const countyStateName = county?.state || "";
    
    // Check if this county has an assigned color from coach assignment
    const assignment = coachAssignments.get(countyId);
    if (assignment && assignment.color) {
      const assignedColor = getColorHex(assignment.color);
      // Always use the assigned color, with full opacity when selected, slightly transparent when not
      if (selectedCounties.has(countyId)) {
        return isHovered ? assignedColor : assignedColor; // Full color when selected
      }
      // If not selected but has assignment, use a more transparent version
      return hexToRgba(assignedColor, isHovered ? 0.7 : 0.5);
    }
    
    // Check if this county's state has any selected counties
    const stateHasSelectedCounties = countyStateName ? hasSelectedCountiesInState(countyStateName) : false;
    
    if (selectedCounties.has(countyId)) {
      return isHovered ? "#73d13d" : "#52c41a"; // Selected county - green, lighter on hover
    }
    
    // If the state has selected counties, make unselected counties more transparent so state shows through
    if (stateHasSelectedCounties) {
      return isHovered ? "rgba(183, 235, 143, 0.3)" : "rgba(176, 176, 191, 0.2)"; // Very transparent so state green shows
    }
    
    return isHovered ? "#b7eb8f" : "#b0b0bf"; // Default - #b0b0bf, light green on hover
  };

  return (
    <Card
      title={
        <h4 className="italic font-semibold !text-[22px] mb-0">
          <i className="icon-svg-left-arrow"></i>
          {title}
        </h4>
      }
      extra={
        <Space>
          {/* <Button 
            type={showCountiesLayer ? "primary" : "default"}
            size="small"
            onClick={() => setShowCountiesLayer(!showCountiesLayer)}
          >
            {showCountiesLayer ? "Hide" : "Show"} Counties
          </Button> */}
          <Button icon={<i className="icon-printer" />} onClick={() => setIsPrintModalVisible(true)} size="small">
              Print
          </Button>

          {(selectedStates.size > 0 || selectedCounties.size > 0) && (
            <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
              Clear All
            </Button>
          )}
          
        </Space>
      }
      style={{ width, textAlign: "left" }}
      bodyStyle={{ padding: 0, height: typeof height === "number" ? `${height}px` : height }}
    >
      <div 
        ref={mapContainerRef}
        style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%", position: "relative" }}
      >
        {/* State Color Legend */}
        {selectedStates.size > 0 && (
          <div style={{
            position: "absolute",
            top: "16px",
            left: "16px",
            zIndex: 1000,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            padding: "12px",
            borderRadius: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            maxWidth: "250px",
            maxHeight: "400px",
            overflowY: "auto",
          }}>
            <Text strong style={{ fontSize: "14px", marginBottom: "8px", display: "block" }}>
              Selected States:
            </Text>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              {Array.from(selectedStates).map((stateId, index) => {
                const stateData = statesData.get(stateId);
                if (!stateData) return null;
                const borderColor = getStateBorderColor(stateId);
                return (
                  <div
                    key={stateId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "4px 0",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: borderColor,
                        border: "2px solid #fff",
                        borderRadius: "2px",
                        flexShrink: 0,
                      }}
                    />
                    <Text style={{ fontSize: "13px" }}>{stateData.name}</Text>
                  </div>
                );
              })}
            </Space>
          </div>
        )}

        {/* Zoom Controls */}
        <div style={{ 
          position: "absolute", 
          top: "16px", 
          right: "16px", 
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <Button
            icon={<PlusOutlined />}
            onClick={() => {
              const newZoom = Math.min(targetPosition.zoom * 1.5, 4);
              setTargetPosition({ ...targetPosition, zoom: newZoom });
            }}
            size="small"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          />
          <Button
            icon={<MinusOutlined />}
            onClick={() => {
              const newZoom = Math.max(targetPosition.zoom / 1.5, 0.5);
              setTargetPosition({ ...targetPosition, zoom: newZoom });
            }}
            size="small"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          />
        </div>

        {/* Hover-select action for selected state */}
        {hoveredSelectedState && buttonPosition && mapContainerRef.current && (() => {
          const rect = mapContainerRef.current!.getBoundingClientRect();
          const buttonWidth = 250; // Approximate button width
          const buttonHeight = 40; // Approximate button height
          let left = buttonPosition.x + 10;
          let top = buttonPosition.y - buttonHeight - 10;
          
          // Keep button within bounds
          if (left + buttonWidth > rect.width) {
            left = buttonPosition.x - buttonWidth - 10;
          }
          if (left < 0) {
            left = 10;
          }
          if (top < 0) {
            top = buttonPosition.y + 10;
          }
          if (top + buttonHeight > rect.height) {
            top = rect.height - buttonHeight - 10;
          }
          
          return (
            <div
              style={{
                position: "absolute",
                left: `${left}px`,
                top: `${top}px`,
                zIndex: 1001,
                display: "flex",
                gap: "8px",
                pointerEvents: "auto",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                padding: "8px",
                borderRadius: "4px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
            <Button
              type="primary"
              size="small"
              style={{
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                pointerEvents: "auto",
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectAllCountiesForState(
                  hoveredSelectedState.name.trim(),
                  hoveredSelectedState.id
                );
              }}
            >
              Select all counties in {hoveredSelectedState.name}
            </Button>
          </div>
          );
        })()}
        
        <ComposableMap
          projection="geoAlbersUsa"
          projectionConfig={{
            scale: 1000,
            center: [0, 0],
          }}
          style={{ width: "100%", height: "100%" }}
        >
          <defs>
            <linearGradient id="stateGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6AFFAB" />
              <stop offset="97.61%" stopColor="#C8FF24" />
            </linearGradient>
            <linearGradient id="stateGradientHover" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6AFFAB" stopOpacity="0.9" />
              <stop offset="97.61%" stopColor="#C8FF24" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={(newPosition: any) => {
              setPosition(newPosition);
              setTargetPosition(newPosition);
            }}
          >
            <g>
            {/* Render states first (below counties) - fill area allows clicks to pass through to counties */}
            <Geographies geography={US_STATES_URL}>
              {({ geographies, projection }: { geographies: any[]; projection?: any }) => {
                // Store state geographies for county matching (only once)
                if (!stateGeoProcessed.current && geographies.length > 0) {
                  stateGeoProcessed.current = true;
                  const stateGeoMap = new Map<string, { name: string; fips: string }>();
                  geographies.forEach((geo: any) => {
                    const stateId = geo.properties?.state || geo.id;
                    const stateName = geo.properties?.name || geo.properties?.NAME || "Unknown";
                    const stateFips = geo.properties?.fips || geo.properties?.state || geo.id;
                    stateGeoMap.set(String(stateFips).padStart(2, '0'), { name: stateName, fips: String(stateFips) });
                  });
                  stateGeographiesRef.current = stateGeoMap;
                  // Use requestAnimationFrame to defer setState outside of render
                  requestAnimationFrame(() => {
                    setStateGeographies(new Map(stateGeoMap));
                  });
                }
                
                return geographies.map((geo: any) => {
                  const stateId = geo.properties?.state || geo.id;
                  const stateName = geo.properties?.name || geo.properties?.NAME || "Unknown";
                  const isSelected = selectedStates.has(stateId);
                  const hasCountiesSelected = hasSelectedCountiesInState(stateName);
                  const isHovered = hoveredState === stateId;
                  
                  // Debug: Log state name and hasCountiesSelected for debugging
                  if (selectedCounties.size > 0 && stateName !== "Unknown") {
                    // Check what counties are selected for this state
                    const selectedCountiesForThisState = Array.from(selectedCounties).filter(countyId => {
                      const county = countiesData.get(countyId);
                      return county && county.state === stateName;
                    });
                    if (selectedCountiesForThisState.length > 0 && !hasCountiesSelected) {
                      console.log(`State ${stateName}: hasCountiesSelected=${hasCountiesSelected}, but found ${selectedCountiesForThisState.length} selected counties`);
                      console.log(`Selected counties for ${stateName}:`, selectedCountiesForThisState.map(id => {
                        const c = countiesData.get(id);
                        return c ? `${c.name} (state: ${c.state})` : id;
                      }));
                    }
                  }
                  
                  // Directly calculate fill color - prioritize counties selected
                  let fillColor: string;
                  if (hasCountiesSelected) {
                    fillColor = isHovered ? "url(#stateGradientHover)" : "url(#stateGradient)";
                  } else if (isSelected) {
                    fillColor = isHovered ? "url(#stateGradientHover)" : "url(#stateGradient)";
                  } else if (isHovered) {
                    fillColor = "rgba(144, 238, 144, 0.6)";
                  } else {
                    fillColor = "rgba(176, 176, 191, 0.5)";
                  }
                  
                  // Calculate centroid for label positioning
                  let centroid: [number, number] | null = null;
                  let stateArea: number = 0;
                  try {
                    // geoCentroid expects a GeoJSON geometry object
                    const geometry = geo.geometry || geo;
                    if (geometry && geometry.type) {
                      const centroidResult = geoCentroid(geometry);
                      // Ensure it's a valid array with 2 numbers
                      if (centroidResult && 
                          Array.isArray(centroidResult) && 
                          centroidResult.length === 2 && 
                          typeof centroidResult[0] === 'number' && 
                          typeof centroidResult[1] === 'number' &&
                          !isNaN(centroidResult[0]) &&
                          !isNaN(centroidResult[1])) {
                        centroid = [centroidResult[0], centroidResult[1]];
                      }
                      
                      // Calculate state area for font size scaling
                      try {
                        stateArea = geoArea(geometry);
                      } catch (areaError) {
                        // If area calculation fails, use default
                        stateArea = 0;
                      }
                    }
                  } catch (error) {
                    // If centroid calculation fails, skip label for this state
                    // Silently skip - not all geographies may have valid geometries
                  }
                  
                  // Calculate font size based on state area
                  // Area values from geoArea are typically very small (0-1 range)
                  // We'll scale them to a reasonable font size range (8px to 20px)
                  const minArea = 0.0001; // Smallest states
                  const maxArea = 0.1; // Largest states (like Texas, California)
                  const minFontSize = 8;
                  const maxFontSize = 20;
                  
                  let fontSize = 12; // Default
                  if (stateArea > 0) {
                    // Normalize area to 0-1 range
                    const normalizedArea = Math.min(Math.max((stateArea - minArea) / (maxArea - minArea), 0), 1);
                    // Scale to font size range
                    fontSize = minFontSize + (normalizedArea * (maxFontSize - minFontSize));
                  }
                  
                  // Get unique border color for this state if selected
                  const borderColor = isSelected ? getStateBorderColor(stateId) : (hasCountiesSelected ? "#389e0d" : "#ffffff");
                  const borderWidth = isSelected ? 4 : (hasCountiesSelected ? 3 : 2);
                  
                  // Use a wrapper to ensure fill is applied
                  return (
                    <g key={`state-${stateId}-${renderKey}`}>
                      <Geography
                        key={`${geo.rsmKey}-${renderKey}-${selectedCounties.size}-${hasCountiesSelected}-${stateName}`}
                        geography={geo}
                        fill={fillColor}
                        stroke={borderColor}
                        strokeWidth={borderWidth}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        style={{
                          default: {
                            outline: "none",
                            cursor: "pointer",
                            fill: fillColor,
                            stroke: borderColor,
                            strokeWidth: borderWidth,
                            strokeLinejoin: "round",
                            strokeLinecap: "round",
                          },
                          hover: {
                            outline: "none",
                            fill: hasCountiesSelected || isSelected 
                              ? "url(#stateGradientHover)" 
                              : "rgba(144, 238, 144, 0.6)",
                            cursor: "pointer",
                            stroke: borderColor,
                            strokeWidth: isSelected ? 5 : (hasCountiesSelected ? 4 : 2),
                            strokeLinejoin: "round",
                            strokeLinecap: "round",
                          },
                          pressed: {
                            outline: "none",
                            fill: hasCountiesSelected || isSelected 
                              ? "url(#stateGradientHover)" 
                              : "rgba(144, 238, 144, 0.6)",
                            stroke: borderColor,
                            strokeWidth: isSelected ? 5 : (hasCountiesSelected ? 4 : 2),
                            strokeLinejoin: "round",
                            strokeLinecap: "round",
                          },
                        }}
                        onMouseEnter={(e: any) => {
                          setHoveredState(stateId);
                          hoveredStateIdRef.current = stateId;
                          // Clear any pending timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          if (selectedStates.has(stateId)) {
                            setHoveredSelectedState({ id: stateId, name: stateName });
                            // Set initial button position
                            if (mapContainerRef.current) {
                              const rect = mapContainerRef.current.getBoundingClientRect();
                              setButtonPosition({
                                x: e.clientX - rect.left,
                                y: e.clientY - rect.top,
                              });
                            }
                          } else {
                            setHoveredSelectedState(null);
                            setButtonPosition(null);
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredState(null);
                          const currentStateId = hoveredStateIdRef.current;
                          hoveredStateIdRef.current = null;
                          // Clear hover timeout if exists
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          // Delay clearing to allow county hover to set it first
                          hoverTimeoutRef.current = setTimeout(() => {
                            // Only clear if we're still not hovering over this state or its counties
                            if (hoveredStateIdRef.current !== currentStateId && hoveredCountyIdRef.current === null) {
                              setHoveredSelectedState((prev) => {
                                if (prev && prev.id === currentStateId) {
                                  return null;
                                }
                                return prev;
                              });
                              setButtonPosition(null);
                            }
                          }, 100);
                        }}
                        onClick={() => {
                          handleStateClick(geo);
                        }}
                      />
                      {/* State name label - hide when counties are shown for this state */}
                      {centroid && Array.isArray(centroid) && centroid.length === 2 && 
                       typeof centroid[0] === 'number' && typeof centroid[1] === 'number' &&
                       !isNaN(centroid[0]) && !isNaN(centroid[1]) && projection &&
                       !(showCountiesLayer && isSelected) && (() => {
                        try {
                          const projected = projection([centroid[0], centroid[1]]);
                          if (projected && Array.isArray(projected) && projected.length === 2 &&
                              typeof projected[0] === 'number' && typeof projected[1] === 'number') {
                            return (
                              <text
                                key={`label-${stateId}`}
                                x={projected[0]}
                                y={projected[1]}
                                textAnchor="middle"
                                style={{
                                  fontFamily: "Inter Tight",
                                  fontSize: `${fontSize}px`,
                                  fontStyle: "normal",
                                  fontWeight: "600",
                                  fill: "#333333",
                                  pointerEvents: "none",
                                  userSelect: "none",
                                }}
                              >
                                {getStateLabel(stateName)}
                              </text>
                            );
                          }
                        } catch (error) {
                          // If projection fails, skip label
                        }
                        return null;
                      })()}
                    </g>
                  );
                });
              }}
            </Geographies>
            
            {/* Render counties on top (so they receive clicks first) */}
            {showCountiesLayer && (
              <Geographies geography={US_COUNTIES_URL}>
                {({ geographies }: { geographies: any[] }) => {
                  // Process counties by state only once
                  if (!countiesProcessed.current && stateGeographies.size > 0 && geographies.length > 0) {
                    countiesProcessed.current = true;
                    const countiesByStateNameMap = new Map<string, CountyData[]>();
                    
                    geographies.forEach((geo: any) => {
                      const countyId = geo.id;
                      const countyName = geo.properties?.name || geo.properties?.NAME || "Unknown";
                      const countyFips = geo.properties?.fips || geo.id;
                      // Pad to 5 digits first, then take first 2 for state FIPS
                      const countyFipsStr = countyFips ? String(countyFips).padStart(5, '0') : null;
                      const countyStateFips = countyFipsStr ? countyFipsStr.substring(0, 2) : null;
                      
                      if (countyStateFips) {
                        // Find state name from state geographies
                        const stateGeo = stateGeographies.get(countyStateFips);
                        if (stateGeo) {
                          const countyData: CountyData = {
                            name: countyName,
                            id: countyId,
                            state: stateGeo.name,
                            fips: countyFips,
                          };
                          
                          if (!countiesByStateNameMap.has(stateGeo.name)) {
                            countiesByStateNameMap.set(stateGeo.name, []);
                          }
                          countiesByStateNameMap.get(stateGeo.name)!.push(countyData);
                        }
                      }
                    });
                    
                    if (countiesByStateNameMap.size > 0) {
                      setAllCountiesByState(countiesByStateNameMap);
                    }
                  }
                  
                  return geographies.map((geo: any) => {
                    const countyId = geo.id;
                    const countyName = geo.properties?.name || geo.properties?.NAME || "Unknown";
                    // County FIPS codes: 5 digits where first 2 are state FIPS
                    const countyFips = geo.properties?.fips || geo.id;
                    const countyFipsStr = countyFips ? String(countyFips).padStart(5, '0') : null;
                    const countyStateFips = countyFipsStr ? countyFipsStr.substring(0, 2) : null;
                    const isSelected = selectedCounties.has(countyId);
                    const isHovered = hoveredCounty === countyId;
                    
                    // Get state name for this county
                    let countyStateName = "";
                    const county = countiesData.get(countyId);
                    if (county) {
                      countyStateName = county.state;
                    } else if (countyStateFips) {
                      // Find state name from state geographies (check both state and ref)
                      const stateGeo = stateGeographies.get(countyStateFips) || stateGeographiesRef.current.get(countyStateFips);
                      if (stateGeo) {
                        countyStateName = stateGeo.name;
                      }
                    }
                    
                    // Hide all counties until at least one state is selected
                    if (selectedStates.size === 0) {
                      return null; // Don't render any counties if no states are selected
                    }
                    
                    // Only show counties from selected states
                    // Check if this county's state is selected
                    let countyStateIsSelected = false;
                    
                    // Check by FIPS code first (most reliable)
                    if (countyStateFips) {
                      for (const [stateId, stateData] of Array.from(statesData.entries())) {
                        if (selectedStates.has(stateId)) {
                          const stateFipsStr = String(stateData.fips || stateId).padStart(2, '0');
                          if (stateFipsStr === countyStateFips) {
                            countyStateIsSelected = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    // Also check by state name as fallback
                    if (!countyStateIsSelected && countyStateName) {
                      for (const [stateId, stateData] of Array.from(statesData.entries())) {
                        if (selectedStates.has(stateId) && stateData.name === countyStateName) {
                          countyStateIsSelected = true;
                          break;
                        }
                      }
                    }
                    
                    // If county's state is not selected, don't render it
                    if (!countyStateIsSelected) {
                      return null; // Don't render this county
                    }
                    
                    // Use getCountyFill to get the correct color (includes assigned colors from coach assignments)
                    const countyFill = getCountyFill(geo, false); // Default state
                    const countyFillHover = getCountyFill(geo, true); // Hover state
                    
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={countyFill}
                        stroke="#ffffff"
                        strokeWidth={1}
                        style={{
                          default: {
                            outline: "none",
                            cursor: "pointer",
                            fill: countyFill,
                            stroke: isSelected ? "#ffffff" : "#ffffff",
                            strokeWidth: 1,
                          },
                          hover: {
                            outline: "none",
                            fill: countyFillHover,
                            cursor: "pointer",
                            stroke: "#ffffff",
                            strokeWidth: 1,
                          },
                          pressed: {
                            outline: "none",
                            fill: countyFillHover,
                            stroke: "#ffffff",
                            strokeWidth: 1,
                          },
                        }}
                        onMouseEnter={(e: any) => {
                          setHoveredCounty(countyId);
                          hoveredCountyIdRef.current = countyId;
                          // Clear any pending timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                            hoverTimeoutRef.current = null;
                          }
                          // If this county's state is selected, show the "Select all counties" button
                          if (countyStateName) {
                            for (const [stateId, stateData] of Array.from(statesData.entries())) {
                              if (selectedStates.has(stateId) && stateData.name === countyStateName) {
                                hoveredStateIdRef.current = stateId;
                                setHoveredSelectedState({ id: stateId, name: countyStateName });
                                // Set initial button position
                                if (mapContainerRef.current) {
                                  const rect = mapContainerRef.current.getBoundingClientRect();
                                  setButtonPosition({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                  });
                                }
                                break;
                              }
                            }
                          }
                        }}
                        onMouseLeave={() => {
                          setHoveredCounty(null);
                          hoveredCountyIdRef.current = null;
                          const currentStateId = hoveredStateIdRef.current;
                          // Clear hover timeout if exists
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                          // Delay clearing to allow moving to another county or back to state
                          hoverTimeoutRef.current = setTimeout(() => {
                            // Only clear if we're still not hovering over this state or its counties
                            if (hoveredStateIdRef.current !== currentStateId && hoveredCountyIdRef.current === null) {
                              setHoveredSelectedState((prev) => {
                                if (prev && prev.id === currentStateId) {
                                  return null;
                                }
                                return prev;
                              });
                              setButtonPosition(null);
                            }
                          }, 100);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCountyClick(geo);
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            )}
            
            {/* State border overlay - renders on top of counties to ensure full border visibility */}
            {selectedStates.size > 0 && (
              <Geographies geography={US_STATES_URL}>
                {({ geographies }: { geographies: any[] }) => {
                  return geographies.map((geo: any) => {
                    const stateId = geo.properties?.state || geo.id;
                    if (!selectedStates.has(stateId)) {
                      return null;
                    }
                    
                    const borderColor = getStateBorderColor(stateId);
                    return (
                      <Geography
                        key={`border-${stateId}`}
                        geography={geo}
                        fill="none"
                        stroke={borderColor}
                        strokeWidth={2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        style={{
                          default: {
                            outline: "none",
                            pointerEvents: "none",
                            fill: "none",
                            stroke: borderColor,
                            strokeWidth: 2,
                            strokeLinejoin: "round",
                            strokeLinecap: "round",
                          },
                        }}
                      />
                    );
                  });
                }}
              </Geographies>
            )}
            </g>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* Display selected data */}
      {(selectedStates.size > 0 || selectedCounties.size > 0) && (
        <div>
          {(() => {
            // Group selected counties by state (normalize state names for matching)
            const countiesByState = new Map<string, CountyData[]>();
            Array.from(selectedCounties).forEach((countyId) => {
              const county = countiesData.get(countyId);
              if (county && county.state) {
                const normalizedStateName = county.state.trim();
                if (!countiesByState.has(normalizedStateName)) {
                  countiesByState.set(normalizedStateName, []);
                }
                countiesByState.get(normalizedStateName)!.push(county);
              }
            });
            
            // Get selected states in order
            const selectedStatesList = Array.from(selectedStates)
              .map((stateId) => statesData.get(stateId))
              .filter(Boolean) as StateData[];
            
            return (
              <div>
                {selectedStatesList.map((state) => {
                  const normalizedStateName = state.name.trim();
                  const countiesForState = countiesByState.get(normalizedStateName) || [];
                  
                  return (
                    <div></div>
                    // <div key={state.id} style={{ marginBottom: "20px" }}>
                    //   <Text strong style={{ display: "block", marginBottom: "8px", fontSize: "16px" }}>
                    //     {state.name}
                    //   </Text>
                    //   {countiesForState.length > 0 ? (
                    //     <div style={{ marginLeft: "16px" }}>
                    //       {countiesForState.map((county) => (
                    //         <div key={county.id} style={{ marginBottom: "4px" }}>
                    //           <Text>{county.name}</Text>
                    //         </div>
                    //       ))}
                    //     </div>
                    //   ) : (
                    //     <Text type="secondary" style={{ marginLeft: "16px", fontSize: "12px" }}>
                    //       No counties selected
                    //     </Text>
                    //   )}
                    // </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Print Report Modal */}
      <Modal
        title={null}
        open={isPrintModalVisible}
        onCancel={() => setIsPrintModalVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <div>
          <Title level={4} className="italic font-semibold !text-[26px] mb-7">Print States and Coaches Report</Title>
        </div>

        <div className="flex justify-center items-center my-10">
          <img src="/usa-map-2.svg" alt="USA Map" style={{ width: "80%", height: "auto" }} />
        </div>

        <div>
          {/* States with more than one coach - Table */}
          <div style={{  overflow: "hidden" }}>
            {/* Table Header */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid #f0f0f0"
            }}>
              <div style={{ padding: "12px 16px" }}>
                <Text strong style={{ fontStyle: "italic", color: "#1C1D4D", fontSize: "16px" }}>
                  States with more than one coach
                </Text>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <Text strong style={{ fontStyle: "italic", color: "#1C1D4D", fontSize: "16px" }}>
                  Coches
                </Text>
              </div>
            </div>
            {/* Table Rows */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid #f0f0f0"
            }}>
              <div style={{ padding: "12px 16px" }}>
                <Text style={{ color: "#1C1D4D" }}>Texas</Text>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <Text style={{ color: "#1C1D4D" }}>Jason Mark, Alex Robin</Text>
              </div>
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr",
              borderBottom: "1px solid #f0f0f0"
            }}>
              <div style={{ padding: "12px 16px" }}>
                <Text style={{ color: "#1C1D4D" }}>New Mexico</Text>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <Text style={{ color: "#1C1D4D" }}>Mario Lucas, Alex Robin</Text>
              </div>
            </div>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr"
            }}>
              <div style={{ padding: "12px 16px" }}>
                <Text style={{ color: "#1C1D4D" }}>New York</Text>
              </div>
              <div style={{ padding: "12px 16px" }}>
                <Text style={{ color: "#1C1D4D" }}>Qais Ali, Waqas Ali</Text>
              </div>
            </div>
          </div>
        </div>

        <div>
          {/* List of all Coaches */}
          <Title level={4} style={{ marginBottom: "24px", fontSize: "20px", fontWeight: 700, color: "#1C1D4D", marginTop: "20px" }}>
            List of all Coaches
          </Title>
          
          {/* Coach Profile - Jeffrey Epstein */}
          <div style={{ marginBottom: "32px" }}>
            {/* Coach Header */}
            <div>
              
              <div className="flex items-center gap-4 mb-4">
                <Avatar size={80} src="/c1.svg" className="rounded-none border-none">
                  J
                </Avatar>
                <Title 
                  level={4} 
                  className="!text-[24px] font-bold text-[#1C1D4D] !mb-0"
                >
                  Jeffrey Epstein
                </Title>
              </div>
            
              {/* Full States */}
              <div style={{ 
                  marginBottom: "16px", 
                  padding: "12px 16px", 
                  backgroundColor: "#f6ffed", 
                  borderRadius: "4px" 
                }}>
                  <Text strong style={{ fontSize: "16px", fontStyle: "italic" }}>Full States: </Text>
                  <span>Colorado (CO), Utah (UI), Wyoming (WY)</span>
                </div>
                
                {/* Partial States */}
                <div>
                  <Text strong style={{ fontSize: "16px", fontStyle: "italic", marginBottom: "8px", display: "block" }}>
                    Partial States:
                  </Text>
                  
                  {/* New York (NY) - Partial State */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <EnvironmentOutlined style={{ color: "#ff4d4f", fontSize: "16px" }} />
                      <Text strong style={{ fontSize: "16px" }}>
                        New York (NY) - Partial State
                      </Text>
                    </div>
                    <div style={{ marginLeft: "24px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>Counties: </Text>
                        <Text style={{ fontSize: "14px" }}>Columbia, Dutchess, Essex, Greene, Lewis, Livingston,</Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>High Schools: </Text>
                        <Text style={{ fontSize: "14px" }}>Eagle River, Bartlett, Dimond, Chugiak, Service, South Anchorage, West Anchorage, Barrow HS</Text>
                      </div>
                    </div>
                  </div>
                  
                  {/* Washington D.C - Partial State */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <EnvironmentOutlined style={{ color: "#ff4d4f", fontSize: "16px" }} />
                      <Text strong style={{ fontSize: "16px" }}>
                        Washington D.C - Partial State
                      </Text>
                    </div>
                    <div style={{ marginLeft: "24px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>Counties: </Text>
                        <Text style={{ fontSize: "14px" }}>Columbia, Dutchess, Essex, Greene, Lewis, Livingston,</Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>High Schools: </Text>
                        <Text style={{ fontSize: "14px" }}>Eagle River, Bartlett, Dimond, Chugiak, Service, South Anchorage, West Anchorage, Barrow HS</Text>
                      </div>
                    </div>
                  </div>
                  
                  {/* California (CA) - Partial State */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <EnvironmentOutlined style={{ color: "#ff4d4f", fontSize: "16px" }} />
                      <Text strong style={{ fontSize: "16px" }}>
                        California (CA) - Partial State
                      </Text>
                    </div>
                    <div style={{ marginLeft: "24px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>Counties: </Text>
                        <Text style={{ fontSize: "14px" }}>Columbia, Dutchess, Essex, Greene, Lewis, Livingston,</Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>High Schools: </Text>
                        <Text style={{ fontSize: "14px" }}>Eagle River, Bartlett, Dimond, Chugiak, Service, South Anchorage, West Anchorage, Barrow HS</Text>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        <div>
          {/* Coach Profile - Mario Kingman */}
          <div style={{ marginBottom: "32px" }}>
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Avatar size={80} src="/c4.svg" className="rounded-none border-none">
                  M
                </Avatar>
                <Title 
                  level={4} 
                  className="!text-[24px] font-bold text-[#1C1D4D] !mb-0"
                >
                  Mario Kingman
                </Title>
              </div>
            
              {/* Full States */}
              <div style={{ 
                  marginBottom: "16px", 
                  padding: "12px 16px", 
                  backgroundColor: "#f6ffed", 
                  borderRadius: "4px" 
                }}>
                  <Text strong style={{ fontSize: "16px", fontStyle: "italic" }}>Full States: </Text>
                  <span>Colorado (CO), Utah (UI), Wyoming (WY)</span>
                </div>
                
                {/* Partial States */}
                <div>
                  <Text strong style={{ fontSize: "16px", fontStyle: "italic", marginBottom: "8px", display: "block" }}>
                    Partial States:
                  </Text>
                  
                  {/* New York (NY) - Partial State */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <EnvironmentOutlined style={{ color: "#ff4d4f", fontSize: "16px" }} />
                      <Text strong style={{ fontSize: "16px" }}>
                        New York (NY) - Partial State
                      </Text>
                    </div>
                    <div style={{ marginLeft: "24px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>Counties: </Text>
                        <Text style={{ fontSize: "14px" }}>Columbia, Dutchess, Essex, Greene, Lewis, Livingston,</Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>High Schools: </Text>
                        <Text style={{ fontSize: "14px" }}>Eagle River, Bartlett, Dimond, Chugiak, Service, South Anchorage, West Anchorage, Barrow HS</Text>
                      </div>
                    </div>
                  </div>
                  
                  {/* Washington D.C - Partial State */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <EnvironmentOutlined style={{ color: "#ff4d4f", fontSize: "16px" }} />
                      <Text strong style={{ fontSize: "16px" }}>
                        Washington D.C - Partial State
                      </Text>
                    </div>
                    <div style={{ marginLeft: "24px" }}>
                      <div style={{ marginBottom: "4px" }}>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>Counties: </Text>
                        <Text style={{ fontSize: "14px" }}>Columbia, Dutchess, Essex, Greene, Lewis, Livingston,</Text>
                      </div>
                      <div>
                        <Text strong style={{ fontSize: "14px", fontStyle: "italic" }}>High Schools: </Text>
                        <Text style={{ fontSize: "14px" }}>Eagle River, Bartlett, Dimond, Chugiak, Service, South Anchorage, West Anchorage, Barrow HS</Text>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center items-center my-10">
          <img src="/map22.svg" alt="USA Map" style={{ width: "80%", height: "auto" }} />
        </div>

        <div>
          {/* Coaches with Counties */}
          <Title level={4} style={{ marginBottom: "24px", fontSize: "20px", fontWeight: 700, fontStyle: "italic", color: "#1C1D4D" }}>
            Coaches with Counties
          </Title>
          
          {/* Coach List */}
          <div>
            {/* Jason Mark */}
            <div style={{ display: "flex", gap: "16px", paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <Avatar size={64} src="/c1.svg" style={{ flexShrink: 0, borderRadius: 0 }}>
                J
              </Avatar>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, marginBottom: "8px", fontSize: "20px", fontWeight: 700, fontStyle: "italic", color: "#1C1D4D" }}>
                  Jason Mark
                </Title>
                <Text style={{ fontSize: "14px", color: "#000" }}>
                  Anderson, Andrews, Angelina, Aransas, Archer, Armstrong, Atascosa, Austin, Bailey, Bandera, Bastrop, Baylor, Bee, Bell, Bexar, Blanco
                </Text>
              </div>
            </div>
            
            {/* Alex D'cook */}
            <div style={{ display: "flex", gap: "16px", paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <Avatar size={64} src="/c3.svg" style={{ flexShrink: 0, borderRadius: 0 }}>
                A
              </Avatar>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, marginBottom: "8px", fontSize: "20px", fontWeight: 700, fontStyle: "italic", color: "#1C1D4D" }}>
                  Alex D'cook
                </Title>
                <Text style={{ fontSize: "14px", color: "#000" }}>
                  Anderson, Andrews, Angelina, Aransas, Archer, Armstrong, Atascosa, Austin, Bailey, Bandera, Bastrop, Baylor, Bee, Bell, Bexar, Blanco
                </Text>
              </div>
            </div>
            
            {/* Jeffrey Epstien */}
            <div style={{ display: "flex", gap: "16px", paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <Avatar size={64} src="/c1.svg" style={{ flexShrink: 0, borderRadius: 0 }}>
                J
              </Avatar>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, marginBottom: "8px", fontSize: "20px", fontWeight: 700, fontStyle: "italic", color: "#1C1D4D" }}>
                  Jeffrey Epstien
                </Title>
                <Text style={{ fontSize: "14px", color: "#000" }}>
                  Anderson, Andrews, Angelina, Aransas, Archer, Armstrong, Atascosa, Austin, Bailey, Bandera, Bastrop, Baylor, Bee, Bell, Bexar, Blanco
                </Text>
              </div>
            </div>
            
            {/* Mario Kingman */}
            <div style={{ display: "flex", gap: "16px", paddingBottom: "16px", marginBottom: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <Avatar size={64} src="/c4.svg" style={{ flexShrink: 0, borderRadius: 0 }}>
                M
              </Avatar>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, marginBottom: "8px", fontSize: "20px", fontWeight: 700, fontStyle: "italic", color: "#1C1D4D" }}>
                  Mario Kingman
                </Title>
                <Text style={{ fontSize: "14px", color: "#000" }}>
                  Anderson, Andrews, Angelina, Aransas, Archer, Armstrong, Atascosa, Austin, Bailey, Bandera, Bastrop, Baylor, Bee, Bell, Bexar, Blanco
                </Text>
              </div>
            </div>
            
            {/* Michael Ale */}
            <div style={{ display: "flex", gap: "16px", paddingBottom: "16px", marginBottom: "16px" }}>
              <Avatar size={64} src="/c1.svg" style={{ flexShrink: 0, borderRadius: 0 }}>
                M
              </Avatar>
              <div style={{ flex: 1 }}>
                <Title level={4} style={{ margin: 0, marginBottom: "8px", fontSize: "20px", fontWeight: 700, fontStyle: "italic", color: "#1C1D4D" }}>
                  Michael Ale
                </Title>
                <Text style={{ fontSize: "14px", color: "#000" }}>
                  Anderson, Andrews, Angelina, Aransas, Archer, Armstrong, Atascosa, Austin, Bailey, Bandera, Bastrop, Baylor, Bee, Bell, Bexar, Blanco
                </Text>
              </div>
            </div>
          </div>
        </div>

      </Modal>
    </Card>
  );
});

InteractiveUSMap.displayName = "InteractiveUSMap";

export default InteractiveUSMap;

