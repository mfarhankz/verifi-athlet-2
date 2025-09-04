import React, { useState, useRef, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
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
import FormationDropdown from './FormationDropdown';
import { 
  getDepthChartSummary,
  assignAthleteToDepthChart,
  removeAthleteFromDepthChart,
  moveAthleteRanking,

} from '@/utils/depthChartUtils';
import { DepthChartFormation, DepthChartSubPosition } from '@/types/depthChart';
import { AthleteData } from '@/types/database';
import { useUserData } from '@/hooks/useUserData';
import { useZoom } from '@/contexts/ZoomContext';
import AthleteSelector from './AthleteSelector';
import DraggableSubPosition from './DraggableSubPosition';
import FieldDropZone from './FieldDropZone';
import CustomDragLayer from './CustomDragLayer';
import styles from '../cap-manager/DepthChart.module.css';

interface EnhancedDepthChartProps {
  selectedYear?: number;
  selectedMonth?: number;
  selectedScenario?: string;
  activeFilters?: { [key: string]: string[] | string };
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

const EnhancedDepthChart: React.FC<EnhancedDepthChartProps> = ({
  selectedYear = 2025,
  selectedMonth = 1,
  selectedScenario = '',
  activeFilters = {}
}) => {
  const { activeCustomerId } = useUserData();
  const { zoom } = useZoom();
  
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
      // If the athlete is being moved from another position, remove the old assignment
      if (item.currentSubPositionId && item.currentSubPositionId !== subPositionId) {
        await removeAthleteFromDepthChart(
          item.athleteId,
          item.currentSubPositionId,
          activeCustomerId,
          selectedYear,
          selectedScenario,
          selectedMonth
        );
      }

      // Assign to new position (ranking will be automatically determined)
      await assignAthleteToDepthChart(
        item.athleteId,
        subPositionId,
        activeCustomerId,
        selectedYear,
        1, // Start at rank 1, will be pushed down by the database function
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
      
      message.success('Athlete assigned successfully');
      
      // Close AthleteSelector modal if it was used for drag and drop
      if (showAthleteSelector) {
        setShowAthleteSelector(false);
        setSelectedSubPositionId(null);
      }
    } catch (error) {
      console.error('Error assigning athlete:', error);
      message.error('Failed to assign athlete');
    }
  };

  const handleMoveUp = async (assignmentId: string) => {
    try {
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
    } catch (error) {
      console.error('Error moving athlete up:', error);
      message.error('Failed to move athlete up');
    }
  };

  const handleMoveDown = async (assignmentId: string) => {
    try {
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
    } catch (error) {
      console.error('Error moving athlete down:', error);
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
        await removeAthleteFromDepthChart(
          assignment.athlete_id,
          assignment.sub_position_id,
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
        
        message.success('Athlete removed from depth chart');
      }
    } catch (error) {
      console.error('Error removing athlete:', error);
      message.error('Failed to remove athlete');
    }
  };

  const handleAddAthlete = (subPositionId: string) => {
    setSelectedSubPositionId(subPositionId);
    setShowAthleteSelector(true);
  };

  const handleSelectAthlete = async (athlete: AthleteData) => {
    if (!selectedSubPositionId || !activeCustomerId) return;

    try {
      await assignAthleteToDepthChart(
        athlete.id,
        selectedSubPositionId,
        activeCustomerId,
        selectedYear,
        1, // Will be adjusted by database function
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



  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-full">
        <CustomDragLayer />
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
        <div className="flex-1 relative overflow-auto bg-gray-50">
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
              className="relative overflow-auto"
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                minHeight: '800px',
                minWidth: '2500px', // Wide enough for coordinates up to 2300px
                width: '2500px',
                height: '800px'
              }}
            >
              <FieldDropZone onMoveSubPosition={handleMoveSubPosition}>
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
                  />
                ))}
              </FieldDropZone>
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

export default EnhancedDepthChart;
