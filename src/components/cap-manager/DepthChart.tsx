import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd/dist/core';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button, Spin, message, Modal, Input } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { 
  fetchFormations, 
  fetchSubPositions, 
  addFormation, 
  updateFormation, 
  softDeleteFormation,
  addSubPosition,
  updateSubPosition,
  softDeleteSubPosition
} from '@/utils/utils';
import FormationDropdown from '../depth-chart/FormationDropdown';
import { 
  getDepthChartSummary,
  assignAthleteToDepthChart,
  removeAthleteFromDepthChart,
  moveAthleteRanking,
  recalculateRankingsForPosition,
  createTie
} from '@/utils/depthChartUtils';
import { DepthChartFormation, DepthChartSubPosition } from '@/types/depthChart';
import { AthleteData } from '@/types/database';
import { useUserData } from '@/hooks/useUserData';
import { useZoom } from '@/contexts/ZoomContext';
import { supabase } from '@/lib/supabaseClient';
import AthleteSelector from '../depth-chart/AthleteSelector';
import DraggableSubPosition from '../depth-chart/DraggableSubPosition';
import FieldDropZone from '../depth-chart/FieldDropZone';
import CustomDragLayer from '../depth-chart/CustomDragLayer';
import styles from './DepthChart.module.css';

interface DepthChartProps {
  selectedYear?: number;
  selectedMonth?: number;
  selectedScenario?: string;
  activeFilters?: { [key: string]: string[] | string };
  zoom?: number;
}

interface SubPositionWithAssignments {
  id: string;
  name: string;
  x_coord: number;
  y_coord: number;
  assignments: any[];
  depth_chart_formation_id?: string;
  created_at?: string;
  ended_at?: string | null;
}

const DepthChart: React.FC<DepthChartProps> = ({
  selectedYear = 2025,
  selectedMonth = 1,
  selectedScenario = '',
  activeFilters = {},
  zoom: propZoom
}) => {
  const { activeCustomerId } = useUserData();
  const { zoom: contextZoom } = useZoom();
  
  // Use prop zoom if provided, otherwise fall back to context zoom
  const zoom = propZoom ?? contextZoom;
  
  // State management
  const [formations, setFormations] = useState<DepthChartFormation[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(null);
  const [subPositionsWithAssignments, setSubPositionsWithAssignments] = useState<SubPositionWithAssignments[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAthleteSelector, setShowAthleteSelector] = useState(false);
  const [selectedSubPositionId, setSelectedSubPositionId] = useState<string | null>(null);
  
  // Formation dropdown state
  const [isFormationDropdownOpen, setIsFormationDropdownOpen] = useState(false);
  
  // Sub-position management state
  const [isAddingSubPosition, setIsAddingSubPosition] = useState(false);
  const [newSubPositionName, setNewSubPositionName] = useState('');
  const [showAddSubPositionModal, setShowAddSubPositionModal] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 🔍 FIND THE HTML5 DRAG SOURCE
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const element = e.target as HTMLElement;
      
      
      // Check if this element has draggable="true"
      if (element.draggable === true) {
        
        if (e.dataTransfer) {
          // Create invisible drag image
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, 1, 1);
            e.dataTransfer.setDragImage(canvas, 0, 0);
          }
        }
      }
    };

    document.addEventListener('dragstart', handleDragStart, true);
    return () => {
      document.removeEventListener('dragstart', handleDragStart, true);
    };
  }, []);

  // Fetch formations on mount
  useEffect(() => {
    if (!activeCustomerId) return;
    
    const loadFormations = async () => {
      try {
        const formationData = await fetchFormations(activeCustomerId);
        setFormations(formationData);
        if (formationData.length > 0 && !selectedFormationId) {
          setSelectedFormationId(formationData[0].id);
        }
      } catch (error) {
        console.error('Error loading formations:', error);
        message.error('Failed to load depth chart formations');
      }
    };

    loadFormations();
  }, [activeCustomerId]);

  // Load depth chart data when formation or filters change
  useEffect(() => {
    if (!selectedFormationId || !activeCustomerId) return;

    const loadDepthChartData = async () => {
      setLoading(true);
      
      try {
        const data = await getDepthChartSummary(
          selectedFormationId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
        
        setSubPositionsWithAssignments(data.subPositions);
      } catch (error) {
        console.error('Error loading depth chart data:', error);
        message.error('Failed to load depth chart data');
      } finally {
        setLoading(false);
      }
    };

    loadDepthChartData();
  }, [selectedFormationId, activeCustomerId, selectedYear, selectedScenario, selectedMonth]);

  const handleDrop = async (item: any, subPositionId: string) => {
    if (!activeCustomerId) return;

    try {
      // Drop operation starting

      const oldSubPositionId = item.currentSubPositionId;
      
      // If the athlete is being moved from another position, remove the old assignment
      if (oldSubPositionId && oldSubPositionId !== subPositionId) {
        // Moving between positions
        await removeAthleteFromDepthChart(
          item.athleteId,
          oldSubPositionId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
      }

      // Get current athletes at the new position to determine the highest ranking
      const currentAssignments = subPositionsWithAssignments
        .find(sp => sp.id === subPositionId)?.assignments || [];
      
      const highestRanking = currentAssignments.length > 0 
        ? Math.max(...currentAssignments.map(a => a.ranking)) + 1
        : 1;

      // Ranking calculation

      // Assign to new position with the highest ranking
      await assignAthleteToDepthChart(
        item.athleteId,
        subPositionId,
        activeCustomerId,
        selectedYear,
        highestRanking, // Add at the end (highest ranking)
        selectedScenario,
        selectedMonth
      );

      // Recalculate rankings for both positions to ensure they are sequential
      if (oldSubPositionId && oldSubPositionId !== subPositionId) {
        // Recalculating rankings for old position
        // Recalculate rankings for the old position (after removal)
        await recalculateRankingsForPosition(
          oldSubPositionId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
      }
      
      // Recalculating rankings for new position
      // Recalculate rankings for the new position (after addition)
      await recalculateRankingsForPosition(
        subPositionId,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );

      // Reload data
      const data = await getDepthChartSummary(
        selectedFormationId!,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );
      setSubPositionsWithAssignments(data.subPositions);
      
      // Drop operation completed
      message.success('Athlete assigned successfully');
      
      // Close AthleteSelector modal if it was used for drag and drop
      if (showAthleteSelector) {
        setShowAthleteSelector(false);
        setSelectedSubPositionId(null);
      }
    } catch (error) {
      console.error('❌ [DEPTH CHART DROP] Error assigning athlete:', error);
      message.error('Failed to assign athlete');
    }
  };

  const handleMoveUp = async (assignmentId: string) => {
    try {
      console.log(`⬆️ [DEPTH CHART MOVE UP] Starting move up for assignment: ${assignmentId}`);
      await moveAthleteRanking(assignmentId, 'up');
      
      // Reload data
      if (selectedFormationId && activeCustomerId) {
        const data = await getDepthChartSummary(
          selectedFormationId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
        setSubPositionsWithAssignments(data.subPositions);
      }
      console.log(`✅ [DEPTH CHART MOVE UP] Move up completed successfully`);
    } catch (error) {
      console.error('❌ [DEPTH CHART MOVE UP] Error moving athlete up:', error);
      message.error('Failed to move athlete up');
    }
  };

  const handleMoveDown = async (assignmentId: string) => {
    try {
      console.log(`⬇️ [DEPTH CHART MOVE DOWN] Starting move down for assignment: ${assignmentId}`);
      await moveAthleteRanking(assignmentId, 'down');
      
      // Reload data
      if (selectedFormationId && activeCustomerId) {
        const data = await getDepthChartSummary(
          selectedFormationId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
        setSubPositionsWithAssignments(data.subPositions);
      }
      console.log(`✅ [DEPTH CHART MOVE DOWN] Move down completed successfully`);
    } catch (error) {
      console.error('❌ [DEPTH CHART MOVE DOWN] Error moving athlete down:', error);
      message.error('Failed to move athlete down');
    }
  };

  const handleRemove = async (assignmentId: string) => {
    if (!activeCustomerId) return;

    try {
      const assignment = subPositionsWithAssignments
        .flatMap(sp => sp.assignments)
        .find(a => a.id === assignmentId);
      
      if (assignment) {
        console.log(`🗑️ [DEPTH CHART REMOVE] Starting removal:`, {
          assignmentId,
          athleteId: assignment.athlete_id,
          subPositionId: assignment.sub_position_id,
          currentRanking: assignment.ranking
        });

        const subPositionId = assignment.sub_position_id;
        
        await removeAthleteFromDepthChart(
          assignment.athlete_id,
          subPositionId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );

        console.log(`🔄 [DEPTH CHART REMOVE] Recalculating rankings after removal`);
        // Recalculate rankings for the position after removal
        await recalculateRankingsForPosition(
          subPositionId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );

        // Reload data
        const data = await getDepthChartSummary(
          selectedFormationId!,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
        setSubPositionsWithAssignments(data.subPositions);
        
        console.log(`✅ [DEPTH CHART REMOVE] Removal completed successfully`);
        message.success('Athlete removed from depth chart');
      }
    } catch (error) {
      console.error('❌ [DEPTH CHART REMOVE] Error removing athlete:', error);
      message.error('Failed to remove athlete');
    }
  };

  const handleAthleteDrop = async (draggedAthlete: any, targetAthlete: any) => {
    if (!activeCustomerId) return;

    try {
      console.log(`🎯 [ATHLETE DROP] Starting athlete-to-athlete drop:`, {
        draggedAthlete: {
          assignmentId: draggedAthlete.assignmentId,
          athleteId: draggedAthlete.athleteId,
          currentRanking: draggedAthlete.currentRanking
        },
        targetAthlete: {
          assignmentId: targetAthlete.assignmentId,
          athleteId: targetAthlete.athleteId,
          currentRanking: targetAthlete.currentRanking
        }
      });

      // Get all assignments for this position to understand the current order
      const currentAssignments = subPositionsWithAssignments
        .find(sp => sp.id === draggedAthlete.currentSubPositionId)?.assignments || [];
      
      const sortedAssignments = [...currentAssignments].sort((a, b) => a.ranking - b.ranking);
      
      console.log(`👥 [ATHLETE DROP] Current assignments before reorder:`, 
        sortedAssignments.map(a => ({
          assignmentId: a.id,
          athleteId: a.athlete_id,
          ranking: a.ranking
        }))
      );

      // Find the indices of the dragged and target athletes
      const draggedIndex = sortedAssignments.findIndex(a => a.id === draggedAthlete.assignmentId);
      const targetIndex = sortedAssignments.findIndex(a => a.id === targetAthlete.assignmentId);

      if (draggedIndex === -1 || targetIndex === -1) {
        console.log(`❌ [ATHLETE DROP] Could not find athletes in current assignments`);
        return;
      }

      console.log(`🔄 [ATHLETE DROP] Moving athlete from position ${draggedIndex + 1} to position ${targetIndex + 1}`);

      // Create new array with swapped positions
      const newAssignments = [...sortedAssignments];
      [newAssignments[draggedIndex], newAssignments[targetIndex]] = [newAssignments[targetIndex], newAssignments[draggedIndex]];

      console.log(`👥 [ATHLETE DROP] New order after swap:`, 
        newAssignments.map((a, index) => ({
          assignmentId: a.id,
          athleteId: a.athlete_id,
          oldRanking: a.ranking,
          newRanking: index + 1
        }))
      );

      // Update all rankings sequentially (1, 2, 3, 4, 5...)
      const updatePromises = newAssignments.map((assignment: any, index: number) => {
        const newRanking = index + 1;
        console.log(`💾 [ATHLETE DROP] Writing to database:`, {
          assignmentId: assignment.id,
          athleteId: assignment.athlete_id,
          oldRanking: assignment.ranking,
          newRanking: newRanking
        });
        
        return supabase
          .from('depth_chart_assignments')
          .update({ ranking: newRanking })
          .eq('id', assignment.id);
      });

      await Promise.all(updatePromises);

      // Reload data
      const data = await getDepthChartSummary(
        selectedFormationId!,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );
      setSubPositionsWithAssignments(data.subPositions);
      
      console.log(`✅ [ATHLETE DROP] Athlete reorder completed successfully`);
      message.success('Athlete ranking updated');
    } catch (error) {
      console.error('❌ [ATHLETE DROP] Error reordering athletes:', error);
      message.error('Failed to reorder athletes');
    }
  };

  const handleAthleteInsert = async (draggedAthlete: any, insertPosition: number) => {
    if (!activeCustomerId) return;

    try {
      console.log(`🎯 [ATHLETE INSERT] Starting athlete insertion:`, {
        draggedAthlete: {
          assignmentId: draggedAthlete.assignmentId,
          athleteId: draggedAthlete.athleteId,
          currentRanking: draggedAthlete.currentRanking
        },
        insertPosition
      });

      // Get all assignments for this position to understand the current order
      const currentAssignments = subPositionsWithAssignments
        .find(sp => sp.id === draggedAthlete.currentSubPositionId)?.assignments || [];
      
      const sortedAssignments = [...currentAssignments].sort((a, b) => a.ranking - b.ranking);
      
      console.log(`👥 [ATHLETE INSERT] Current assignments before insertion:`, 
        sortedAssignments.map(a => ({
          assignmentId: a.id,
          athleteId: a.athlete_id,
          ranking: a.ranking
        }))
      );

      // Find the dragged athlete
      const draggedIndex = sortedAssignments.findIndex(a => a.id === draggedAthlete.assignmentId);
      if (draggedIndex === -1) {
        console.log(`❌ [ATHLETE INSERT] Could not find dragged athlete in current assignments`);
        return;
      }

      // Remove the dragged athlete from its current position
      const draggedAthleteData = sortedAssignments[draggedIndex];
      const remainingAssignments = sortedAssignments.filter(a => a.id !== draggedAthlete.assignmentId);

      // Insert the athlete at the specified position
      const newAssignments = [...remainingAssignments];
      newAssignments.splice(insertPosition - 1, 0, draggedAthleteData);

      console.log(`👥 [ATHLETE INSERT] New order after insertion:`, 
        newAssignments.map((a, index) => ({
          assignmentId: a.id,
          athleteId: a.athlete_id,
          oldRanking: a.ranking,
          newRanking: index + 1
        }))
      );

      // Update all rankings sequentially (1, 2, 3, 4, 5...)
      const updatePromises = newAssignments.map((assignment: any, index: number) => {
        const newRanking = index + 1;
        console.log(`💾 [ATHLETE INSERT] Writing to database:`, {
          assignmentId: assignment.id,
          athleteId: assignment.athlete_id,
          oldRanking: assignment.ranking,
          newRanking: newRanking
        });
        
        return supabase
          .from('depth_chart_assignments')
          .update({ ranking: newRanking })
          .eq('id', assignment.id);
      });

      await Promise.all(updatePromises);

      // Reload data
      const data = await getDepthChartSummary(
        selectedFormationId!,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );
      setSubPositionsWithAssignments(data.subPositions);
      
      console.log(`✅ [ATHLETE INSERT] Athlete insertion completed successfully`);
      message.success('Athlete ranking updated');
    } catch (error) {
      console.error('❌ [ATHLETE INSERT] Error inserting athlete:', error);
      message.error('Failed to reorder athletes');
    }
  };

  const handleCreateTie = async (draggedAthlete: any, targetAthlete: any) => {
    if (!activeCustomerId) return;

    try {
      console.log(`🤝 [CREATE TIE] Starting tie creation:`, {
        draggedAthlete: {
          assignmentId: draggedAthlete.assignmentId,
          athleteId: draggedAthlete.athleteId,
          currentRanking: draggedAthlete.currentRanking
        },
        targetAthlete: {
          assignmentId: targetAthlete.assignmentId,
          athleteId: targetAthlete.athleteId,
          currentRanking: targetAthlete.currentRanking
        }
      });

      await createTie(
        draggedAthlete.athleteId,
        targetAthlete.athleteId,
        draggedAthlete.currentSubPositionId,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );

      // Reload data
      const data = await getDepthChartSummary(
        selectedFormationId!,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );
      setSubPositionsWithAssignments(data.subPositions);
      
      console.log(`✅ [CREATE TIE] Tie creation completed successfully`);
      message.success('Athletes tied successfully');
    } catch (error) {
      console.error('❌ [CREATE TIE] Error creating tie:', error);
      message.error('Failed to create tie');
    }
  };

  const handleAddAthlete = (subPositionId: string) => {
    setSelectedSubPositionId(subPositionId);
    setShowAthleteSelector(true);
  };

  const handleSelectAthlete = async (athlete: AthleteData) => {
    if (!selectedSubPositionId || !activeCustomerId) return;

    try {
      // Get current athletes at the position to determine the highest ranking
      const currentAssignments = subPositionsWithAssignments
        .find(sp => sp.id === selectedSubPositionId)?.assignments || [];
      
      const highestRanking = currentAssignments.length > 0 
        ? Math.max(...currentAssignments.map(a => a.ranking)) + 1
        : 1;

      await assignAthleteToDepthChart(
        athlete.id,
        selectedSubPositionId,
        activeCustomerId,
        selectedYear,
        highestRanking, // Add at the end (highest ranking)
        selectedScenario,
        selectedMonth
      );

      // Recalculate rankings for the position after adding new athlete
      await recalculateRankingsForPosition(
        selectedSubPositionId,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );

      // Reload data
      const data = await getDepthChartSummary(
        selectedFormationId!,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );
      setSubPositionsWithAssignments(data.subPositions);
      
      message.success(`${athlete.first_name} ${athlete.last_name} added to depth chart`);
    } catch (error) {
      console.error('Error adding athlete:', error);
      message.error('Failed to add athlete');
    }
  };

  // Formation management functions
  const handleFormationChange = (formationId: string) => {
    setSelectedFormationId(formationId);
  };

  const handleAddFormation = async () => {
    const formationName = prompt('Enter formation name:');
    if (!formationName || !activeCustomerId) return;
    
    try {
      const newFormation = await addFormation({
        name: formationName,
        order: formations.length,
        customer_id: activeCustomerId,
      });
      setFormations(prev => [...prev, newFormation]);
      setSelectedFormationId(newFormation.id);
      message.success('Formation added successfully');
    } catch (error) {
      console.error('Failed to add formation', error);
      message.error('Failed to add formation');
    }
  };

  const handleDeleteFormation = async (formationId: string) => {
    if (!formationId || formations.length <= 1) {
      message.warning('Cannot delete the last formation');
      return;
    }
    
    const formation = formations.find(f => f.id === formationId);
    if (!formation) return;

    const confirmed = window.confirm(`Are you sure you want to delete "${formation.name}"?`);
    if (!confirmed) return;
    
    try {
      await softDeleteFormation(formationId);
      setFormations(prev => prev.filter(f => f.id !== formationId));
      if (formationId === selectedFormationId) {
        const remainingFormations = formations.filter(f => f.id !== formationId);
        if (remainingFormations.length > 0) {
          setSelectedFormationId(remainingFormations[0].id);
        }
      }
      message.success('Formation deleted successfully');
    } catch (error) {
      console.error('Failed to delete formation', error);
      message.error('Failed to delete formation');
    }
  };

  const handleMoveFormation = async (formationId: string, direction: 'up' | 'down') => {
    const formationIndex = formations.findIndex(f => f.id === formationId);
    if (formationIndex === -1) return;

    const newIndex = direction === 'up' ? formationIndex - 1 : formationIndex + 1;
    if (newIndex < 0 || newIndex >= formations.length) return;

    try {
      // Update the order of both formations
      const formation = formations[formationIndex];
      const otherFormation = formations[newIndex];
      
      await updateFormation(formation.id, { order: otherFormation.order });
      await updateFormation(otherFormation.id, { order: formation.order });
      
      // Update local state
      const updatedFormations = [...formations];
      [updatedFormations[formationIndex], updatedFormations[newIndex]] = 
        [updatedFormations[newIndex], updatedFormations[formationIndex]];
      
      setFormations(updatedFormations);
      message.success('Formation order updated');
    } catch (error) {
      console.error('Failed to move formation', error);
      message.error('Failed to move formation');
    }
  };

  const handleCopyFormation = async (formationId: string) => {
    if (!activeCustomerId) return;
    
    const formation = formations.find(f => f.id === formationId);
    if (!formation) return;
    
    const newName = prompt('Enter name for copied formation:', `${formation.name} Copy`);
    if (!newName) return;

    try {
      // Create new formation
      const newFormation = await addFormation({
        name: newName,
        order: formations.length,
        customer_id: activeCustomerId,
      });

      // Copy sub-positions from the original formation
      const originalSubPositions = await fetchSubPositions(formationId);
      
      for (const subPosition of originalSubPositions) {
        await addSubPosition({
          depth_chart_formation_id: newFormation.id,
          name: subPosition.name,
          x_coord: subPosition.x_coord,
          y_coord: subPosition.y_coord,
        });
      }

      setFormations(prev => [...prev, newFormation]);
      setSelectedFormationId(newFormation.id);
      message.success('Formation copied successfully');
    } catch (error) {
      console.error('Failed to copy formation', error);
      message.error('Failed to copy formation');
    }
  };

  // Sub-position management functions
  const handleAddSubPosition = async () => {
    if (!newSubPositionName.trim() || !selectedFormationId || !activeCustomerId) return;
    
    try {
      const newSubPos = await addSubPosition({
        depth_chart_formation_id: selectedFormationId,
        name: newSubPositionName.trim(),
        x_coord: 100, // Default position
        y_coord: 100, // Default position
      });
      
      // Reload depth chart data to include new sub-position
      const data = await getDepthChartSummary(
        selectedFormationId,
        activeCustomerId,
        selectedYear,
        selectedScenario,
        selectedMonth
      );
      setSubPositionsWithAssignments(data.subPositions);
      
      setNewSubPositionName('');
      setShowAddSubPositionModal(false);
      message.success('Sub-position added successfully');
    } catch (error) {
      console.error('Failed to add sub-position', error);
      message.error('Failed to add sub-position');
    }
  };

  const handleDeleteSubPosition = async (subPositionId: string) => {
    const subPosition = subPositionsWithAssignments.find(sp => sp.id === subPositionId);
    if (!subPosition) return;
    
    const confirmed = window.confirm(`Are you sure you want to delete "${subPosition.name}" position?`);
    if (!confirmed) return;
    
    try {
      await softDeleteSubPosition(subPositionId);
      
      // Reload depth chart data
      if (selectedFormationId && activeCustomerId) {
        const data = await getDepthChartSummary(
          selectedFormationId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
        setSubPositionsWithAssignments(data.subPositions);
      }
      
      message.success('Sub-position deleted successfully');
    } catch (error) {
      console.error('Failed to delete sub-position', error);
      message.error('Failed to delete sub-position');
    }
  };

  const handleMoveSubPosition = async (subPositionId: string, x: number, y: number) => {
    const subPosition = subPositionsWithAssignments.find(sp => sp.id === subPositionId);
    
    console.log('💾 HANDLE MOVE SUB-POSITION - Final update:', {
      subPositionId,
      subPositionName: subPosition?.name,
      oldPosition: { x: subPosition?.x_coord, y: subPosition?.y_coord },
      newPosition: { x, y },
      rounded: { x: Math.round(x), y: Math.round(y) }
    });
    
    try {
      // Update in database
      await updateSubPosition(subPositionId, {
        x_coord: Math.round(x),
        y_coord: Math.round(y)
      });

      // Update local state
      setSubPositionsWithAssignments(prev =>
        prev.map(sp =>
          sp.id === subPositionId
            ? { ...sp, x_coord: Math.round(x), y_coord: Math.round(y) }
            : sp
        )
      );
      
      console.log('✅ POSITION UPDATED successfully');
    } catch (error) {
      console.error('Failed to move sub-position', error);
      message.error('Failed to move position');
    }
  };

  const selectedFormation = formations.find(f => f.id === selectedFormationId);

  // Calculate dynamic sizing for the droppable zone
  const calculateDropZoneSize = useCallback(() => {
    // Always ensure viewport coverage as minimum
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight - 200; // Account for header
    
    
    if (subPositionsWithAssignments.length === 0) {
      // Default size when no positions exist - always fill viewport
      // Account for zoom: if zoom is 50%, we need 2x the size to fill viewport after scaling
      const result = {
        width: viewportWidth / (zoom / 100),
        height: viewportHeight / (zoom / 100)
      };
      return result;
    }

    // Find the bounds of all sub-positions and their athletes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    subPositionsWithAssignments.forEach(subPosition => {
      // Account for sub-position bounds (240px width, variable height)
      const subPosLeft = subPosition.x_coord - 120; // Half width
      const subPosRight = subPosition.x_coord + 120;
      const subPosTop = subPosition.y_coord - 50; // Half height estimate
      const subPosBottom = subPosition.y_coord + 200; // Estimate for athletes below
      
      minX = Math.min(minX, subPosLeft);
      maxX = Math.max(maxX, subPosRight);
      minY = Math.min(minY, subPosTop);
      maxY = Math.max(maxY, subPosBottom);
    });

    // Add padding around the content
    const padding = 200;
    const contentWidth = maxX - minX + (padding * 2);
    const contentHeight = maxY - minY + (padding * 2);

    // Calculate the minimum size needed to fill viewport after zoom scaling
    const minWidthForViewport = viewportWidth / (zoom / 100);
    const minHeightForViewport = viewportHeight / (zoom / 100);

    // Return the larger of content size or zoom-adjusted viewport size
    const result = {
      width: Math.max(contentWidth, minWidthForViewport),
      height: Math.max(contentHeight, minHeightForViewport)
    };
    
    
    return result;
  }, [subPositionsWithAssignments, zoom]);

  const [dropZoneSize, setDropZoneSize] = useState(() => calculateDropZoneSize());

  // Recalculate drop zone size when sub-positions change, window resizes, or zoom changes
  useEffect(() => {
    const newSize = calculateDropZoneSize();
    setDropZoneSize(newSize);
  }, [calculateDropZoneSize, zoom]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newSize = calculateDropZoneSize();
      setDropZoneSize(newSize);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDropZoneSize, zoom]);


  return (
    <DndProvider 
      backend={HTML5Backend} 
      options={{ 
        enableMouseEvents: true,
        enableKeyboardEvents: true
      }}
      data-react-dnd-provider="depth-chart"
    >
      <div className="w-full h-full flex flex-col">
        {/* <CustomDragLayer /> */}
        <style jsx global>{`
          /* Hide the default HTML5 drag preview */
          .react-dnd-drag-preview {
            display: none !important;
          }
        `}</style>
        {/* Header Controls */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-bold text-gray-900">Depth Chart</h2>
              
              {/* Advanced Formation Dropdown */}
              <FormationDropdown
                formations={formations}
                selectedFormationId={selectedFormationId}
                onFormationChange={handleFormationChange}
                onAddFormation={handleAddFormation}
                onDeleteFormation={handleDeleteFormation}
                onMoveFormation={handleMoveFormation}
                onCopyFormation={handleCopyFormation}
                isOpen={isFormationDropdownOpen}
                onToggle={() => setIsFormationDropdownOpen(!isFormationDropdownOpen)}
              />
            </div>

                         <div className="flex items-center space-x-2">
               <Button
                 icon={<PlusOutlined />}
                 onClick={() => setShowAddSubPositionModal(true)}
                 disabled={!selectedFormationId}
               >
                 Add Position
               </Button>
               
               <Button
                 type="primary"
                 icon={<PlusOutlined />}
                 onClick={() => setShowAthleteSelector(true)}
               >
                 Add Athletes
               </Button>
          </div>
        </div>

          {selectedFormation && (
            <div className="mt-2 text-sm text-gray-600">
              Formation: <span className="font-medium">{selectedFormation.name}</span>
              {selectedScenario !== '' && (
                <span className="ml-2">Scenario: <span className="font-medium">{selectedScenario}</span></span>
              )}
              {selectedMonth !== 1 && (
                <span className="ml-2">Month: <span className="font-medium">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth - 1]}
                </span></span>
              )}
            </div>
          )}
        </div>

        {/* Depth Chart Canvas */}
        <div 
          className="flex-1 relative bg-gray-50" 
          style={{ 
            minHeight: 0,
            overflowX: "auto", 
            overflowY: "auto"
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <Spin size="large" />
            </div>
          ) : !selectedFormationId ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No Formation Selected</div>
                <div>Please select a formation to view the depth chart</div>
              </div>
            </div>
          ) : subPositionsWithAssignments.length === 0 ? (
            <div className="flex items-center justify-center h-96 text-gray-500">
              <div className="text-center">
                <div className="text-lg font-medium mb-2">No Positions Configured</div>
                <div>Add sub-positions to this formation to get started</div>
              </div>
            </div>
          ) : (
            <div 
              ref={containerRef}
              className="depth-chart-container"
              style={{ 
                position: 'relative',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                width: `${dropZoneSize.width}px`,
                height: `${dropZoneSize.height}px`
              }}
            >
              <div 
                className="relative"
                style={{ 
                  width: '100%',
                  height: '100%',
                  position: 'relative'
                }}
              >
                <FieldDropZone 
                  onMoveSubPosition={handleMoveSubPosition}
                  existingPositions={subPositionsWithAssignments.map(sp => ({
                    id: sp.id,
                    x_coord: sp.x_coord,
                    y_coord: sp.y_coord,
                    name: sp.name
                  }))}
                >
                  {/* Football Field Background */}
                  <div className="absolute inset-0 bg-green-600 opacity-10">
                    <div className="w-full h-full bg-gradient-to-r from-green-600 to-green-700 opacity-20"></div>
                  </div>

                  {/* Draggable Sub-position Drop Zones */}
                  {subPositionsWithAssignments.map(subPosition => (
                    <DraggableSubPosition
                      key={subPosition.id}
                      subPosition={subPosition as any}
                      assignments={subPosition.assignments}
                      onDrop={handleDrop}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onRemove={handleRemove}
                      onAddAthlete={handleAddAthlete}
                      onDeleteSubPosition={handleDeleteSubPosition}
                      onMoveSubPosition={handleMoveSubPosition}
                      onAthleteDrop={handleAthleteDrop}
                      onAthleteInsert={handleAthleteInsert}
                      onCreateTie={handleCreateTie}
                    />
                  ))}
                </FieldDropZone>
              </div>
            </div>
          )}
        </div>

        {/* Athlete Selector Modal */}
        <AthleteSelector
          year={selectedYear}
          scenario={selectedScenario}
          month={selectedMonth}
          isOpen={showAthleteSelector}
          onClose={() => {
            setShowAthleteSelector(false);
            setSelectedSubPositionId(null);
          }}
          onSelectAthlete={handleSelectAthlete}
            selectedFormationId={selectedFormationId}
          onAthleteAssigned={() => {
            // Reload depth chart data after assignment
            if (selectedFormationId && activeCustomerId) {
              const loadDepthChartData = async () => {
                const data = await getDepthChartSummary(
                  selectedFormationId,
                  activeCustomerId,
                  selectedYear,
                  selectedScenario,
                  selectedMonth
                );
                setSubPositionsWithAssignments(data.subPositions);
              };
              loadDepthChartData();
            }
          }}
        />

        {/* Add Sub-Position Modal */}
        <Modal
          title="Add New Position"
          open={showAddSubPositionModal}
          onOk={handleAddSubPosition}
          onCancel={() => {
            setShowAddSubPositionModal(false);
            setNewSubPositionName('');
          }}
          okText="Add Position"
          cancelText="Cancel"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position Name
              </label>
              <Input
                value={newSubPositionName}
                onChange={(e) => setNewSubPositionName(e.target.value)}
                placeholder="Enter position name (e.g., QB, RB, WR)"
                onPressEnter={handleAddSubPosition}
                autoFocus
              />
                  </div>
            <div className="text-sm text-gray-500">
              The position will be placed at a default location and can be repositioned by dragging.
                </div>
          </div>
        </Modal>
      </div>
    </DndProvider>
  );
};

export default DepthChart; 
