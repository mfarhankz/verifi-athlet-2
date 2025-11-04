"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import MultipleContainers from "@/app/dndkit/presets/Sortable/MultipleContainers";
import { Flex, Typography, Spin, Alert, message, Button, Space } from "antd";
import { DownOutlined } from "@ant-design/icons";
import { fetchRecruitingBoardData, fetchRecruitingBoardPositions, createRecruitingBoardPosition, endRecruitingBoardPosition, updateRecruitingBoardRanks, endRecruitingBoardAthlete, fetchRecruitingBoards, getOrCreateMainBoard, updateRecruitingBoardPositionOrder } from "@/lib/queries";
import { RecruitingBoardData, RecruitingBoardPosition, RecruitingBoardBoard } from "@/types/database";
import { fetchUserDetails } from "@/utils/utils";
import { useZoom } from "@/contexts/ZoomContext";
import { useCustomer } from "@/contexts/CustomerContext";
import ChooseBoardDropdown from "@/app/(dashboard)/_components/ChooseBoardDropdown";
import SettingsDropdown from "@/app/(dashboard)/_components/SettingsDropdown";
import Filters from "@/app/(dashboard)/_components/Filters";
import SubBoardModal from "@/app/(dashboard)/_components/SubBoardModal";
import { FilterState } from "@/types/filters";

export default function RecruitingBoard() {
  const [data, setData] = useState<RecruitingBoardData[]>([]);
  const [positions, setPositions] = useState<RecruitingBoardPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [renderChunkSize, setRenderChunkSize] = useState(50); // Start with 50 athletes
  const [visibleData, setVisibleData] = useState<RecruitingBoardData[]>([]);
  
  // Source filter toggles
  const [sourceFilters, setSourceFilters] = useState({
    portal: true,
    juco: true,
    prePortal: true,
    highSchool: true
  });

  // Modal states
  const [isChooseBoardModalVisible, setIsChooseBoardModalVisible] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({});
  
  // Card layout state
  const [savedLayouts, setSavedLayouts] = useState([
    { id: '1', name: 'Default Layout' }
  ]);
  const [isLayoutDropdownVisible, setIsLayoutDropdownVisible] = useState(false);

  // Board state - represents the actual board (recruiting_board_board)
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [currentBoardName, setCurrentBoardName] = useState<string>('Main');
  const [savedBoards, setSavedBoards] = useState<RecruitingBoardBoard[]>([]);

  // Sub-board modal state
  const [isSubBoardModalVisible, setIsSubBoardModalVisible] = useState(false);
  const [selectedColumnName, setSelectedColumnName] = useState<string>('');
  const [selectedColumnAthletes, setSelectedColumnAthletes] = useState<RecruitingBoardData[]>([]);

  const { zoom } = useZoom();
  const { activeCustomerId, customers, userDetails: contextUserDetails, isReady: contextReady } = useCustomer();

  // Analyze data to determine which source types exist
  const sourceAnalysis = useMemo(() => {
    const sources = {
      portal: 0,
      juco: 0,
      prePortal: 0,
      highSchool: 0,
      none: 0
    };

    data.forEach(athlete => {
      if (athlete.source === 'portal') {
        sources.portal++;
      } else if (athlete.source === 'juco') {
        sources.juco++;
      } else if (athlete.source === 'pre-portal') {
        sources.prePortal++;
      } else if (athlete.source === 'high_school') {
        sources.highSchool++;
      } else {
        sources.none++;
      }
    });

    const totalSourceTypes = [sources.portal, sources.juco, sources.prePortal, sources.highSchool].filter(count => count > 0).length;
    
    return {
      counts: sources,
      hasMultipleSourceTypes: totalSourceTypes > 1,
      availableSources: {
        portal: sources.portal > 0,
        juco: sources.juco > 0,
        prePortal: sources.prePortal > 0,
        highSchool: sources.highSchool > 0
      }
    };
  }, [data]);

  // Filter data based on source toggles and filterState
  const filteredData = useMemo(() => {
    // Helper function to parse height string (e.g., "6'2\"") to total inches
    const parseHeightToInches = (heightStr: string | undefined): number | null => {
      if (!heightStr) return null;
      // Handle format like "6'2\"" or "6' 2\""
      const match = heightStr.match(/(\d+)'\s*(\d+(?:\.\d+)?)"/);
      if (match) {
        const feet = parseInt(match[1]);
        const inches = parseFloat(match[2]);
        return feet * 12 + inches;
      }
      return null;
    };

    // Helper function to check if athlete matches filters
    const matchesFilters = (athlete: RecruitingBoardData, filters: FilterState): boolean => {
    // Columns filter (filter by recruiting board column/position column name) - top priority
    if (filters.columns && filters.columns.length > 0) {
      if (!athlete.position || !filters.columns.includes(athlete.position)) {
        return false;
      }
    }

    // Position filter (use primary_position - athlete's actual position)
    if (filters.position && filters.position.length > 0) {
      if (!athlete.primary_position || !filters.position.includes(athlete.primary_position)) {
        return false;
      }
    }

    // Year filter (yr field maps to year)
    if (filters.years && filters.years.length > 0) {
      const athleteYear = athlete.yr || '';
      if (!filters.years.includes(athleteYear)) {
        return false;
      }
    }

    // Division filter
    if (filters.divisions && filters.divisions.length > 0) {
      const athleteDiv = athlete.div || '';
      if (!filters.divisions.includes(athleteDiv)) {
        return false;
      }
    }

    // Height filter
    if (filters.height) {
      const athleteHeightInches = parseHeightToInches(athlete.ht);
      if (athleteHeightInches === null) {
        // If athlete has no height and filter requires it, exclude
        return false;
      }

      if (filters.height.comparison === 'min' && filters.height.feet !== undefined && filters.height.inches !== undefined) {
        const minInches = filters.height.feet * 12 + filters.height.inches;
        if (athleteHeightInches < minInches) {
          return false;
        }
      } else if (filters.height.comparison === 'max' && filters.height.feet !== undefined && filters.height.inches !== undefined) {
        const maxInches = filters.height.feet * 12 + filters.height.inches;
        if (athleteHeightInches > maxInches) {
          return false;
        }
      } else if (filters.height.comparison === 'between' && filters.height.minFeet !== undefined && filters.height.minInches !== undefined && filters.height.maxFeet !== undefined && filters.height.maxInches !== undefined) {
        const minInches = filters.height.minFeet * 12 + filters.height.minInches;
        const maxInches = filters.height.maxFeet * 12 + filters.height.maxInches;
        if (athleteHeightInches < minInches || athleteHeightInches > maxInches) {
          return false;
        }
      }
    }

    // Weight filter
    if (filters.weight) {
      const athleteWeight = typeof athlete.wt === 'number' ? athlete.wt : (typeof athlete.wt === 'string' ? parseFloat(athlete.wt) : null);
      if (athleteWeight === null || isNaN(athleteWeight)) {
        return false;
      }

      if (filters.weight.comparison === 'min' && filters.weight.value !== undefined) {
        if (athleteWeight < filters.weight.value) {
          return false;
        }
      } else if (filters.weight.comparison === 'max' && filters.weight.value !== undefined) {
        if (athleteWeight > filters.weight.value) {
          return false;
        }
      } else if (filters.weight.comparison === 'between' && filters.weight.minValue !== undefined && filters.weight.maxValue !== undefined) {
        if (athleteWeight < filters.weight.minValue || athleteWeight > filters.weight.maxValue) {
          return false;
        }
      }
    }

    // Location filter (hometown state, school state, etc.)
    if (filters.location) {
      if (filters.location.type === 'hometown_state' && filters.location.values && filters.location.values.length > 0) {
        const athleteState = athlete.st || '';
        if (!filters.location.values.includes(athleteState)) {
          return false;
        }
      } else if (filters.location.type === 'school_state' && filters.location.values && filters.location.values.length > 0) {
        // School state filtering - would need school_state field in RecruitingBoardData
        // For now, skip if not available
      } else if (filters.location.type === 'international' && filters.location.values && filters.location.values.length > 0) {
        // International filtering - check if athlete state is in international list
        const athleteState = athlete.st || '';
        if (!filters.location.values.includes(athleteState)) {
          return false;
        }
      }
      // Note: radius and recruiting_area filters would need additional data processing
    }

    // Legacy states filter
    if (filters.states && filters.states.length > 0) {
      const athleteState = athlete.st || '';
      if (!filters.states.includes(athleteState)) {
        return false;
      }
    }

    // Schools filter (by school_id)
    if (filters.schools && filters.schools.length > 0) {
      const athleteSchoolId = athlete.school_id || '';
      if (!athleteSchoolId || !filters.schools.includes(athleteSchoolId)) {
        return false;
      }
    }

    // Conference filter
    if (filters.conference && filters.conference.length > 0) {
      const athleteConference = athlete.conference || '';
      if (!athleteConference || !filters.conference.includes(athleteConference)) {
        return false;
      }
    }

    // Athletic aid filter
    if (filters.athleticAid && filters.athleticAid.length > 0) {
      const athleteAid = athlete.$ || '';
      // Map common values
      const aidValue = athleteAid.toLowerCase();
      if (!filters.athleticAid.some(aid => {
        const filterAid = aid.toLowerCase();
        if (filterAid === 'yes' || filterAid === 'true') {
          return aidValue === 'yes' || aidValue === 'true' || (aidValue !== 'none' && aidValue !== '');
        }
        if (filterAid === 'no' || filterAid === 'false' || filterAid === 'none') {
          return aidValue === 'no' || aidValue === 'false' || aidValue === 'none' || aidValue === '';
        }
        return aidValue.includes(filterAid);
      })) {
        return false;
      }
    }

    // Status filter
    if (filters.status && filters.status.length > 0) {
      const athleteStatus = athlete.status || '';
      // Handle null status
      const hasNullFilter = filters.status.includes('null');
      const nonNullStatuses = filters.status.filter(s => s !== 'null');
      
      if (hasNullFilter && nonNullStatuses.length > 0) {
        // If both null and other statuses selected, show if status is null or matches
        if (athleteStatus && !nonNullStatuses.includes(athleteStatus)) {
          return false;
        }
      } else if (hasNullFilter) {
        // Only null selected
        if (athleteStatus) {
          return false;
        }
      } else if (nonNullStatuses.length > 0) {
        // Only non-null statuses selected
        if (!athleteStatus || !nonNullStatuses.includes(athleteStatus)) {
          return false;
        }
      }
    }

    // Date range filter (using date field which is formatted initiated_date)
    if (filters.dateRange) {
      const athleteDateStr = athlete.date || '';
      if (athleteDateStr) {
        try {
          // Parse the formatted date (e.g., "12/25/2023")
          const athleteDate = new Date(athleteDateStr);
          const startDate = filters.dateRange.startDate ? new Date(filters.dateRange.startDate) : null;
          const endDate = filters.dateRange.endDate ? new Date(filters.dateRange.endDate) : null;

          if (startDate && athleteDate < startDate) {
            return false;
          }
          if (endDate && athleteDate > endDate) {
            return false;
          }
        } catch (e) {
          // If date parsing fails, exclude the athlete
          return false;
        }
      } else {
        // If athlete has no date and filter requires it, exclude
        return false;
      }
    }

    // Survey completed filter
    if (filters.survey_completed !== undefined) {
      if (Array.isArray(filters.survey_completed)) {
        const athleteSurveyCompleted = athlete.survey_completed === true;
        if (!filters.survey_completed.includes(athleteSurveyCompleted)) {
          return false;
        }
      } else if (typeof filters.survey_completed === 'boolean') {
        const athleteSurveyCompleted = athlete.survey_completed === true;
        if (athleteSurveyCompleted !== filters.survey_completed) {
          return false;
        }
      }
    }

    // Honors filter
    if (filters.honors && filters.honors.length > 0) {
      const athleteHonors = athlete.honors || '';
      if (!athleteHonors || !filters.honors.includes(athleteHonors)) {
        return false;
      }
    }

    // Designated Student Athlete (DSA) filter
    if (filters.designatedStudentAthlete && filters.designatedStudentAthlete.length > 0) {
      const athleteDSA = athlete.designated_student_athlete || '';
      // Map boolean values
      const isDSA = typeof athleteDSA === 'string' 
        ? (athleteDSA === 'true' || athleteDSA.toLowerCase().includes('yes'))
        : (athleteDSA === true);
      
      const hasYes = filters.designatedStudentAthlete.includes(true);
      const hasNo = filters.designatedStudentAthlete.includes(false);
      
      if (hasYes && hasNo) {
        // Both selected, show all
      } else if (hasYes && !isDSA) {
        return false;
      } else if (hasNo && isDSA) {
        return false;
      }
    }

    // Dynamic stat filters (e.g., stat_98, stat_99, etc.)
    Object.keys(filters).forEach(filterKey => {
      if (filterKey.startsWith('stat_')) {
        const statFilter = filters[filterKey];
        const statValue = athlete[filterKey];
        
        if (statFilter && typeof statFilter === 'object' && statValue !== undefined && statValue !== null) {
          const numValue = typeof statValue === 'number' ? statValue : parseFloat(statValue);
          
          if (isNaN(numValue)) {
            return false;
          }
          
          if (statFilter.comparison === 'min' && statFilter.value !== undefined) {
            if (numValue < statFilter.value) {
              return false;
            }
          } else if (statFilter.comparison === 'max' && statFilter.value !== undefined) {
            if (numValue > statFilter.value) {
              return false;
            }
          } else if (statFilter.comparison === 'between' && statFilter.minValue !== undefined && statFilter.maxValue !== undefined) {
            if (numValue < statFilter.minValue || numValue > statFilter.maxValue) {
              return false;
            }
          }
        }
      }
    });

      return true;
    };

    return data.filter(athlete => {
      // First check source filters
      let passesSourceFilter = true;
      if (athlete.source === 'portal') {
        passesSourceFilter = sourceFilters.portal;
      } else if (athlete.source === 'juco') {
        passesSourceFilter = sourceFilters.juco;
      } else if (athlete.source === 'pre-portal') {
        passesSourceFilter = sourceFilters.prePortal;
      } else if (athlete.source === 'high_school') {
        passesSourceFilter = sourceFilters.highSchool;
      }
      // For athletes with no source, show them by default

      if (!passesSourceFilter) {
        return false;
      }

      // Then check other filters
      return matchesFilters(athlete, filterState);
    });
  }, [data, sourceFilters, filterState]);

  // Load boards when customer is available
  const loadBoards = useCallback(async () => {
    if (!contextUserDetails?.customer_id) return;
    
    try {
      console.log('[loadBoards] Fetching boards for customer:', contextUserDetails.customer_id);
      const boards = await fetchRecruitingBoards(contextUserDetails.customer_id);
      console.log('[loadBoards] Found boards:', boards.length, boards);
      setSavedBoards(boards);
      
      // Set the Main board as current if not already set
      if (!currentBoardId && boards.length > 0) {
        const mainBoard = boards.find(b => b.name === 'Main') || boards[0];
        console.log('[loadBoards] Setting initial board:', mainBoard.name, mainBoard.id);
        setCurrentBoardId(mainBoard.id);
        setCurrentBoardName(mainBoard.name);
      }
    } catch (err) {
      console.error('[loadBoards] Error loading boards:', err);
    }
  }, [contextUserDetails, currentBoardId]);

  const loadData = useCallback(async (boardIdOverride?: string | null) => {
    // Don't proceed if CustomerContext is not ready
    if (!contextReady || !contextUserDetails) {
      console.log('[loadData] Context not ready:', { contextReady, hasUserDetails: !!contextUserDetails });
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (contextUserDetails?.customer_id) {
        setCustomerId(contextUserDetails.customer_id);
        
        // Use override if provided, otherwise use current state
        const boardIdToUse = boardIdOverride !== undefined ? boardIdOverride : currentBoardId;
        console.log('[loadData] Starting with currentBoardId:', currentBoardId, 'override:', boardIdOverride, 'using:', boardIdToUse);
        
        // Get or create the current board ID if not set
        let boardId = boardIdToUse;
        if (!boardId) {
          boardId = await getOrCreateMainBoard(contextUserDetails.customer_id);
          console.log('[loadData] Created/fetched Main board ID:', boardId);
          setCurrentBoardId(boardId);
        }
        
        console.log('[loadData] Using boardId for fetching:', boardId);
        
        // Get the active customer's sport ID
        const activeCustomer = customers?.find(c => c.customer_id === activeCustomerId);
        const activeSportId = activeCustomer?.sport_id;
        
        console.log('[loadData] Active sport ID:', activeSportId);
        
        // Make position and recruiting board data calls in parallel
        const [positionData, recruitingBoardData] = await Promise.all([
          fetchRecruitingBoardPositions(contextUserDetails.customer_id, boardId),
          fetchRecruitingBoardData(activeSportId, contextUserDetails, boardId)
        ]);
        
        console.log('[loadData] Fetched positions:', positionData.length, positionData);
        console.log('[loadData] Position names:', positionData.map(p => ({ id: p.id, name: p.name, display_order: p.display_order })));
        console.log('[loadData] Fetched athletes:', recruitingBoardData.length);
        
        // Sort positions: regular positions by display_order, then "Unassigned" always last
        const sortedPositions = [...positionData].sort((a, b) => {
          // If either is "Unassigned", it should be last
          if (a.name === 'Unassigned') return 1;
          if (b.name === 'Unassigned') return -1;
          // Otherwise sort by display_order
          return a.display_order - b.display_order;
        });
        
        console.log('[loadData] Sorted positions:', sortedPositions.map(p => ({ id: p.id, name: p.name, display_order: p.display_order })));
        
        setPositions(sortedPositions);
        setData(recruitingBoardData);
      }
      
    } catch (err) {
      console.error('[loadData] Error loading recruiting board data:', err);
      setError('Failed to load recruiting board data');
    } finally {
      setLoading(false);
    }
  }, [contextReady, contextUserDetails, customers, activeCustomerId, currentBoardId]);



  const handleRankUpdate = async (updates: { recruitingBoardId: string; rank: number; position?: string }[]) => {
    if (!customerId) return;
    
    try {
      await updateRecruitingBoardRanks(customerId, updates, currentBoardId);
      // Optionally reload data to reflect changes
      // loadData();
    } catch (err) {
      console.error('Error updating ranks:', err);
      message.error('Failed to update athlete ranks');
    }
  };

  const handlePositionDelete = useCallback(async (positionName: string) => {
    if (!customerId) return;
    
    try {
      // Optimistically update the UI by removing the position
      setPositions(prev => prev.filter(p => p.name !== positionName));
      
      // Move all athletes from this position to "Unassigned"
      setData(prev => prev.map(athlete => 
        athlete.position === positionName 
          ? { ...athlete, position: 'Unassigned' }
          : athlete
      ));
      
      await endRecruitingBoardPosition(customerId, positionName, currentBoardId);
      message.success('Position deleted successfully');
    } catch (err) {
      console.error('Error deleting position:', err);
      message.error('Failed to delete position');
      // Reload data on error to restore correct state
      loadData();
    }
  }, [customerId, currentBoardId, loadData]);

  const handlePositionCreate = useCallback(async (positionName: string) => {
    if (!customerId) return;
    
    try {
      const newPosition = await createRecruitingBoardPosition(customerId, positionName, currentBoardId);
      
      // Optimistically add the new position to the UI
      setPositions(prev => [...prev, {
        id: newPosition.id,
        name: newPosition.name,
        display_order: newPosition.display_order,
        customer_id: customerId,
        recruiting_board_board_id: currentBoardId || '',
        created_at: new Date().toISOString(),
        ended_at: null
      }]);
      
      message.success('Position created successfully');
    } catch (err) {
      console.error('Error creating position:', err);
      message.error('Failed to create position');
    }
  }, [customerId, currentBoardId]);

  const handleRemoveFromBoard = useCallback(async (recruitingBoardId: string, athleteName: string) => {
    try {
      // Optimistically remove the athlete from the UI
      setData(prev => prev.filter(athlete => athlete.id !== recruitingBoardId));
      
      await endRecruitingBoardAthlete(recruitingBoardId);
      message.success(`${athleteName} removed from recruiting board`);
    } catch (err) {
      console.error('Error removing athlete from board:', err);
      message.error('Failed to remove athlete from recruiting board');
      // Reload data on error to restore correct state
      loadData();
    }
  }, [loadData]);

  const handleColumnOrderUpdate = useCallback(async (columns: { id: string; display_order: number }[]) => {
    if (!customerId) {
      console.error('[handleColumnOrderUpdate] No customerId');
      return;
    }
    
    if (!columns || columns.length === 0) {
      console.warn('[handleColumnOrderUpdate] No columns to update');
      return;
    }
    
    try {
      console.log('[handleColumnOrderUpdate] Updating column order:', columns);
      
      // Optimistically update the positions order
      setPositions(prev => {
        const updated = [...prev];
        columns.forEach(({ id, display_order }) => {
          const index = updated.findIndex(p => p.id === id);
          if (index !== -1) {
            updated[index] = { ...updated[index], display_order };
          }
        });
        // Sort: regular positions by display_order, then "Unassigned" always last
        return updated.sort((a, b) => {
          // If either is "Unassigned", it should be last
          if (a.name === 'Unassigned') return 1;
          if (b.name === 'Unassigned') return -1;
          // Otherwise sort by display_order
          return a.display_order - b.display_order;
        });
      });
      
      await updateRecruitingBoardPositionOrder(customerId, columns);
      console.log('[handleColumnOrderUpdate] Successfully updated column order');
      // Success - no need to reload, optimistic update is already in place
    } catch (err) {
      console.error('[handleColumnOrderUpdate] Error updating column order:', err);
      message.error('Failed to update column order');
      // Only reload on error to restore correct state
      loadData();
    }
  }, [customerId, loadData]);

  const handleColumnDoubleClick = useCallback((columnName: string) => {
    // Filter athletes for this specific column
    const columnAthletes = data.filter(athlete => athlete.position === columnName);
    
    setSelectedColumnName(columnName);
    setSelectedColumnAthletes(columnAthletes);
    setIsSubBoardModalVisible(true);
  }, [data]);

  const handleRemoveAthleteFromSubBoard = useCallback(async (athleteId: string) => {
    try {
      await endRecruitingBoardAthlete(athleteId);
      // Refresh data after removal
      await loadData();
      message.success('Athlete removed from board');
    } catch (error) {
      console.error('Error removing athlete:', error);
      message.error('Failed to remove athlete');
    }
  }, [loadData]);

  const handleEditAthleteInSubBoard = useCallback(async (athleteId: string, updates: Partial<RecruitingBoardData>) => {
    try {
      // TODO: Implement athlete update functionality
      console.log('Updating athlete:', athleteId, updates);
      message.success('Athlete updated successfully');
    } catch (error) {
      console.error('Error updating athlete:', error);
      message.error('Failed to update athlete');
    }
  }, []);

  // Load boards first
  useEffect(() => {
    if (contextReady && contextUserDetails?.customer_id) {
      loadBoards();
    }
  }, [contextReady, contextUserDetails, loadBoards]);

  useEffect(() => {
    // Only load data when CustomerContext is ready
    if (contextReady) {
      loadData();
    }
  }, [loadData, contextReady]);

  // Progressive rendering effect for large datasets using filtered data
  useEffect(() => {
    if (filteredData.length > 50 && visibleData.length < filteredData.length) {
      const timer = setTimeout(() => {
        const nextChunkSize = Math.min(visibleData.length + 25, filteredData.length);
        const nextVisibleData = filteredData.slice(0, nextChunkSize);
        setVisibleData(nextVisibleData);
      }, 50); // Small delay to prevent blocking
      
      return () => clearTimeout(timer);
    } else if (filteredData.length <= 50) {
      setVisibleData(filteredData);
    }
  }, [filteredData]); // Removed visibleData from dependencies to prevent infinite loop

  // Reset visible data when filters change
  useEffect(() => {
    if (filteredData.length <= 50) {
      setVisibleData(filteredData);
    } else {
      setVisibleData(filteredData.slice(0, renderChunkSize));
    }
  }, [sourceFilters]);

  if (loading) {
    return (
      <div className="main-container">
        <div className="flex items-center justify-center h-[calc(100vh-155px)]">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-container">
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      </div>
    );
  }

  return (
    <div className="main-container">
      <Flex className="card mb-4 items-center justify-between">
        <Flex>
          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            className="flex items-center justify-center mr-6"
          >
            <span className="bg-[#7363BC] w-[20px] h-[20px] flex mr-2"></span>
            Tier 1
          </Typography.Paragraph>

          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            className="flex items-center justify-between mr-6"
          >
            <span className="bg-[#36C5F0] w-[20px] h-[20px] flex mr-2"></span>
            Tier 2
          </Typography.Paragraph>

          <Typography.Paragraph
            style={{ marginBottom: 0 }}
            className="flex items-center justify-center mr-6"
          >
            <span className="bg-[#FF24BA] w-[20px] h-[20px] flex mr-2"></span>
            Tier 3
          </Typography.Paragraph>

          {sourceAnalysis.availableSources.juco && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(135, 206, 250, 0.15)', border: '1px solid rgba(135, 206, 250, 0.5)' }}></span>
              JUCO
            </Typography.Paragraph>
          )}

          {sourceAnalysis.availableSources.prePortal && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(255, 165, 0, 0.15)', border: '1px solid rgba(255, 165, 0, 0.5)' }}></span>
              Pre-Portal
            </Typography.Paragraph>
          )}

          {sourceAnalysis.availableSources.portal && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(0, 0, 0, 0.2)' }}></span>
              Portal
            </Typography.Paragraph>
          )}

          {sourceAnalysis.availableSources.highSchool && (
            <Typography.Paragraph
              style={{ marginBottom: 0 }}
              className="flex items-center justify-center mr-6"
            >
              <span className="w-[20px] h-[20px] flex mr-2" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.5)' }}></span>
              High School
            </Typography.Paragraph>
          )}
        </Flex>

        {/* Right side: Buttons and Source Filter Toggles */}
        <Flex gap={8} align="center">
          {/* Action buttons */}
          <Space>
            <ChooseBoardDropdown
              isVisible={isChooseBoardModalVisible}
              onClose={() => setIsChooseBoardModalVisible(false)}
              currentBoardId={currentBoardId}
              onSelect={(boardName) => {
                console.log('[ChooseBoardDropdown] Selected board name:', boardName);
                // Find and set the selected board as current
                const selectedBoard = savedBoards.find(b => b.name === boardName);
                console.log('[ChooseBoardDropdown] Found board:', selectedBoard);
                if (selectedBoard) {
                  console.log('[ChooseBoardDropdown] Setting board ID:', selectedBoard.id, 'name:', selectedBoard.name);
                  setCurrentBoardId(selectedBoard.id);
                  setCurrentBoardName(selectedBoard.name);
                  // Reload data for the new board, passing the ID directly
                  loadData(selectedBoard.id);
                }
                setIsChooseBoardModalVisible(false);
              }}
              onDelete={async (boardId, boardName) => {
                // If deleting the current board, switch to Main
                if (currentBoardId === boardId) {
                  const mainBoard = savedBoards.find(b => b.name === 'Main' && b.id !== boardId);
                  if (mainBoard) {
                    setCurrentBoardId(mainBoard.id);
                    setCurrentBoardName(mainBoard.name);
                    loadData(mainBoard.id); // Pass board ID directly
                  } else {
                    // If no Main board exists, clear current board
                    setCurrentBoardId(null);
                    setCurrentBoardName('Main');
                  }
                }
                // Reload boards to update the list
                await loadBoards();
                message.success(`Board "${boardName}" deleted`);
              }}
              onRename={async (boardId, newName) => {
                // Update current board name if it was the one being renamed
                if (currentBoardId === boardId) {
                  setCurrentBoardName(newName);
                }
                // Reload boards to update the list
                await loadBoards();
                message.success(`Board renamed to "${newName}"`);
              }}
              customerId={customerId}
              placement="bottomRight"
              trigger={
                <Button 
                  icon={<DownOutlined />} 
                  onClick={() => setIsChooseBoardModalVisible(!isChooseBoardModalVisible)}
                >
                  {currentBoardName || 'Choose Board'}
                </Button>
              }
            />
            <div style={{ position: 'relative' }}>
              <SettingsDropdown
                trigger={
                  <Button
                    type="text"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                    onClick={() => setIsLayoutDropdownVisible(!isLayoutDropdownVisible)}
                  >
                    <i className="icon-setting-2" />
                    Card Layout
                  </Button>
                }
                isVisible={isLayoutDropdownVisible}
                onClose={() => setIsLayoutDropdownVisible(false)}
                onSelect={(layoutId) => {
                  console.log('Selected card layout:', layoutId);
                  const layout = savedLayouts.find(l => l.id === layoutId);
                  if (layout) {
                    message.info(`Loading card layout: ${layout.name}`);
                    // TODO: Load the selected card layout configuration
                  }
                  setIsLayoutDropdownVisible(false);
                }}
                items={savedLayouts}
                allowCreate={false}
                searchPlaceholder="Search saved layouts..."
                placement="bottomRight"
              />
            </div>
            <div className="selectbox-ui" style={{ display: "flex", alignItems: "center" }}>
              <Filters 
                onApplyFilters={(filters) => {
                  console.log('Applied filters:', filters);
                  setFilterState(filters);
                }} 
                onResetFilters={() => {
                  console.log('Reset filters');
                  setFilterState({});
                }}
                dataSource="recruiting_board"
              />
            </div>
          </Space>

          {/* Source Filter Toggles - only show if there are multiple source types */}
          {sourceAnalysis.hasMultipleSourceTypes && (
            <>
              {sourceAnalysis.availableSources.portal && (
                <Button
                  type={sourceFilters.portal ? "primary" : "default"}
                  onClick={() => setSourceFilters(prev => ({ ...prev, portal: !prev.portal }))}
                  style={{
                    fontSize: '11px',
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '12px',
                    border: sourceFilters.portal ? 'none' : '1px solid #d9d9d9',
                    backgroundColor: sourceFilters.portal ? '#1890ff' : '#fff',
                    color: sourceFilters.portal ? '#fff' : '#666'
                  }}
                >
                  Portal
                </Button>
              )}
            {sourceAnalysis.availableSources.juco && (
              <Button
                type={sourceFilters.juco ? "primary" : "default"}
                onClick={() => setSourceFilters(prev => ({ ...prev, juco: !prev.juco }))}
                style={{
                  fontSize: '11px',
                  height: '32px',
                  padding: '0 8px',
                  borderRadius: '12px',
                  border: sourceFilters.juco ? 'none' : '1px solid #d9d9d9',
                  backgroundColor: sourceFilters.juco ? '#1890ff' : '#fff',
                  color: sourceFilters.juco ? '#fff' : '#666'
                }}
              >
                JUCO
              </Button>
              )}
              {sourceAnalysis.availableSources.prePortal && (
                <Button
                  type={sourceFilters.prePortal ? "primary" : "default"}
                  onClick={() => setSourceFilters(prev => ({ ...prev, prePortal: !prev.prePortal }))}
                  style={{
                    fontSize: '11px',
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '12px',
                    border: sourceFilters.prePortal ? 'none' : '1px solid #d9d9d9',
                    backgroundColor: sourceFilters.prePortal ? '#1890ff' : '#fff',
                    color: sourceFilters.prePortal ? '#fff' : '#666'
                  }}
                >
                  Pre-Portal
                </Button>
              )}
              {sourceAnalysis.availableSources.highSchool && (
                <Button
                  type={sourceFilters.highSchool ? "primary" : "default"}
                  onClick={() => setSourceFilters(prev => ({ ...prev, highSchool: !prev.highSchool }))}
                  style={{
                    fontSize: '11px',
                    height: '32px',
                    padding: '0 8px',
                    borderRadius: '12px',
                    border: sourceFilters.highSchool ? 'none' : '1px solid #d9d9d9',
                    backgroundColor: sourceFilters.highSchool ? '#1890ff' : '#fff',
                    color: sourceFilters.highSchool ? '#fff' : '#666'
                  }}
                >
                  High School
                </Button>
              )}
            </>
          )}
        </Flex>
      </Flex>
      <div className="w-[100%] overflow-auto h-[calc(100vh-155px)]">
        <div 
          className="flex"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top left',
            paddingBottom: zoom > 100 ? '2rem' : '0',
            paddingRight: zoom > 100 ? '5%' : '0',
            minHeight: zoom > 100 ? `${zoom}vh` : 'auto',
            width: zoom > 100 ? `${Math.max(zoom, 120)}%` : '100%',
            marginBottom: zoom > 100 ? '4rem' : '0'
          }}
        >
          {visibleData.length > 0 ? (
            <div>
              <MultipleContainers 
                data={visibleData} 
                handle={true} 
                refreshCallback={loadData}
                positionConfig={positions}
                onRankUpdate={handleRankUpdate}
                onPositionDelete={handlePositionDelete}
                onPositionCreate={handlePositionCreate}
                onRemoveFromBoard={handleRemoveFromBoard}
                onColumnDoubleClick={handleColumnDoubleClick}
                onColumnOrderUpdate={handleColumnOrderUpdate}
              />
              {data.length > visibleData.length && (
                <div className="text-center p-4 text-gray-500">
                  Athletes hidden by filters... ({visibleData.length}/{data.length})
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Typography.Text type="secondary">
                No athletes in your recruiting board. Add athletes from the athlete profile or search page to get started.
              </Typography.Text>
            </div>
          )}
        </div>
      </div>

      {/* Card Layout Modal - TODO: Implement */}
      {/* <CardLayoutModal /> */}
      
      {/* Sub-Board Modal */}
      <SubBoardModal
        isVisible={isSubBoardModalVisible}
        onClose={() => setIsSubBoardModalVisible(false)}
        columnName={selectedColumnName}
        athletes={selectedColumnAthletes}
        onRemoveAthlete={handleRemoveAthleteFromSubBoard}
        onEditAthlete={handleEditAthleteInSubBoard}
      />
    </div>
  );
}
