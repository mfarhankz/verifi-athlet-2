import React, { useState, useRef, useEffect } from 'react';
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, DragOverlay } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import styles from './DepthChart.module.css';
import { fetchUserDetails, fetchSubPositions, addSubPosition as addSubPositionToDB, updateSubPosition, softDeleteSubPosition, fetchFormations, addFormation, updateFormation, softDeleteFormation } from '@/utils/utils';
import { DepthChartSubPosition, DepthChartFormation } from '@/types/depthChart';
import { useZoom } from '@/contexts/ZoomContext';

interface Player {
  id: string;
  name: string;
  position: string;
  rank: number;
  subPosition: string;
  image?: string;
}

interface DepthChartProps {
  selectedYear?: number;
  selectedMonth?: string;
  selectedScenario?: string;
  activeFilters?: { [key: string]: string[] | string };
}

// Draggable SubPosition Header Component
const DraggableSubPositionHeader: React.FC<{
  subPosition: DepthChartSubPosition;
  onPositionChange: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}> = ({ subPosition, onPositionChange, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ 
    id: subPosition.id
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    position: 'absolute' as const,
    left: subPosition.x_coord,
    top: subPosition.y_coord,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        isDragging
          ? `${styles.subPositionHeader} ${styles.subPositionHeaderDragging}`
          : styles.subPositionHeader
      }
    >
      <span className={styles.positionName}>{subPosition.name}</span>
    </div>
  );
};

// Droppable Trash Can Component
const DroppableTrashCan: React.FC<{
  isOver: boolean;
  onDelete: (id: string) => void;
  zoom: number;
  onAddSubPosition: () => void;
  formations: DepthChartFormation[];
  selectedFormationId: string | null;
  onFormationChange: (formationId: string) => void;
  onAddFormation: () => void;
  onDeleteFormation: (formationId: string) => void;
  onMoveFormation: (formationId: string, direction: 'up' | 'down') => void;
  onCopyFormation: (formationId: string) => void;
  isDropdownOpen: boolean;
  onToggleDropdown: () => void;
}> = ({ 
  isOver, 
  onDelete, 
  zoom, 
  onAddSubPosition, 
  formations, 
  selectedFormationId, 
  onFormationChange, 
  onAddFormation, 
  onDeleteFormation,
  onMoveFormation,
  onCopyFormation,
  isDropdownOpen,
  onToggleDropdown
}) => {
  const { setNodeRef, isOver: isOverCurrent } = useDroppable({
    id: 'trash-can',
  });

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      display: 'flex',
      gap: '10px',
      alignItems: 'center',
    }}>
      <FormationDropdown
        formations={formations}
        selectedFormationId={selectedFormationId}
        onFormationChange={onFormationChange}
        onAddFormation={onAddFormation}
        onDeleteFormation={onDeleteFormation}
        onMoveFormation={onMoveFormation}
        onCopyFormation={onCopyFormation}
        isOpen={isDropdownOpen}
        onToggle={onToggleDropdown}
      />
      
      <button
        onClick={onAddSubPosition}
        style={{
          padding: '8px 16px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#0056b3';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#007bff';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        + Position
      </button>
      
      <div 
        ref={setNodeRef}
        className={`trash-can ${isOver || isOverCurrent ? 'active' : ''}`}
        style={{
          width: '60px',
          height: '60px',
          transform: (isOver || isOverCurrent) ? 'scale(1.1)' : 'scale(1)',
          backgroundColor: (isOver || isOverCurrent) ? '#dc3545' : '#6c757d',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: (isOver || isOverCurrent) ? '0 4px 12px rgba(220, 53, 69, 0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <svg 
          width="24" 
          height="24" 
          viewBox="0 0 24 24" 
          fill="white"
          style={{ transition: 'all 0.2s ease' }}
        >
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </div>
    </div>
  );
};

// Custom Formation Dropdown Component
const FormationDropdown: React.FC<{
  formations: DepthChartFormation[];
  selectedFormationId: string | null;
  onFormationChange: (formationId: string) => void;
  onAddFormation: () => void;
  onDeleteFormation: (formationId: string) => void;
  onMoveFormation: (formationId: string, direction: 'up' | 'down') => void;
  onCopyFormation: (formationId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}> = ({ 
  formations, 
  selectedFormationId, 
  onFormationChange, 
  onAddFormation, 
  onDeleteFormation, 
  onMoveFormation,
  onCopyFormation,
  isOpen,
  onToggle
}) => {
  const selectedFormation = formations.find(f => f.id === selectedFormationId);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: '6px',
          fontSize: '14px',
          backgroundColor: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '200px',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007bff';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#ddd';
        }}
      >
        <span>{selectedFormation?.name || 'Select Formation'}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '300px',
          overflowY: 'auto',
          marginTop: '4px',
        }}>
          {formations.map((formation, index) => (
            <div
              key={formation.id}
              style={{
                padding: '12px',
                borderBottom: index < formations.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                backgroundColor: formation.id === selectedFormationId ? '#f8f9fa' : 'white',
                transition: 'background-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (formation.id !== selectedFormationId) {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                }
              }}
              onMouseLeave={(e) => {
                if (formation.id !== selectedFormationId) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
              onClick={() => {
                onFormationChange(formation.id);
                onToggle();
              }}
            >
              <span style={{ 
                fontWeight: formation.id === selectedFormationId ? '600' : '400',
                color: formation.id === selectedFormationId ? '#007bff' : '#333'
              }}>
                {formation.name}
              </span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveFormation(formation.id, 'up');
                  }}
                  disabled={index === 0}
                  style={{
                    padding: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    borderRadius: '3px',
                    opacity: index === 0 ? 0.3 : 1,
                  }}
                  title="Move Up"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#666">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveFormation(formation.id, 'down');
                  }}
                  disabled={index === formations.length - 1}
                  style={{
                    padding: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: index === formations.length - 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '3px',
                    opacity: index === formations.length - 1 ? 0.3 : 1,
                  }}
                  title="Move Down"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#666">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopyFormation(formation.id);
                  }}
                  style={{
                    padding: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    borderRadius: '3px',
                  }}
                  title="Copy Formation"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#17a2b8">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (formations.length > 1) {
                      if (confirm(`Are you sure you want to delete "${formation.name}"? This action cannot be undone.`)) {
                        onDeleteFormation(formation.id);
                      }
                    }
                  }}
                  disabled={formations.length <= 1}
                  style={{
                    padding: '4px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: formations.length <= 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '3px',
                    opacity: formations.length <= 1 ? 0.3 : 1,
                  }}
                  title="Delete Formation"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#dc3545">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
          
          {/* Add Formation Option */}
          <div
            style={{
              padding: '12px',
              borderTop: '2px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              backgroundColor: '#f8f9fa',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e9ecef';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f8f9fa';
            }}
            onClick={() => {
              onAddFormation();
              onToggle();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#28a745">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span style={{ color: '#28a745', fontWeight: '500' }}>Add New Formation</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Player Card Component
const PlayerCard: React.FC<{
  player: Player;
  onRankChange: (playerId: string, newRank: number) => void;
  onSubPositionChange: (playerId: string, newSubPosition: string) => void;
  availableSubPositions: DepthChartSubPosition[];
}> = ({ player, onRankChange, onSubPositionChange, availableSubPositions }) => {
  return (
    <div className="player-card">
      <div className="player-image">
        <img 
          src={player.image || '/player-icon.svg'} 
          alt={player.name}
          onError={(e) => {
            e.currentTarget.src = '/player-icon.svg';
          }}
        />
      </div>
      <div className="player-info">
        <div className="player-name">{player.name}</div>
        <div className="player-position">{player.position}</div>
      </div>
      <div className="player-controls">
        <select
          value={player.rank}
          onChange={(e) => onRankChange(player.id, parseInt(e.target.value))}
          className="rank-select"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map(rank => (
            <option key={rank} value={rank}>{rank}</option>
          ))}
        </select>
        <select
          value={player.subPosition}
          onChange={(e) => onSubPositionChange(player.id, e.target.value)}
          className="sub-position-select"
        >
          <option value="">Select Sub-Position</option>
          {availableSubPositions.map(subPos => (
            <option key={subPos.id} value={subPos.id}>{subPos.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const DepthChart: React.FC<DepthChartProps> = ({
  selectedYear = 2025,
  selectedMonth = 'Jan',
  selectedScenario = '',
  activeFilters = {}
}) => {
  const [subPositions, setSubPositions] = useState<DepthChartSubPosition[]>([]);
  const [formations, setFormations] = useState<DepthChartFormation[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([
    { id: '1', name: 'John Smith', position: 'QB', rank: 1, subPosition: 'QB', image: '/player1.png' },
    { id: '2', name: 'Mike Johnson', position: 'RB', rank: 1, subPosition: 'RB', image: '/player2.png' },
    { id: '3', name: 'Tom Wilson', position: 'QB', rank: 2, subPosition: 'QB', image: '/player3.png' },
  ]);
  const [newSubPositionName, setNewSubPositionName] = useState('');
  const [isAddingSubPosition, setIsAddingSubPosition] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { zoom } = useZoom();



  useEffect(() => {
    async function getCustomerId() {
      const userDetails = await fetchUserDetails();
      if (userDetails?.customer_id) {
        setCustomerId(userDetails.customer_id);
      }
    }
    getCustomerId();
  }, []);

  useEffect(() => {
    if (!customerId) return;
    fetchFormations(customerId)
      .then((formations) => {
        setFormations(formations);
        if (formations.length > 0 && !selectedFormationId) {
          setSelectedFormationId(formations[0].id);
        }
      })
      .catch((e) => console.error('Failed to fetch formations', e));
  }, [customerId, selectedFormationId]);

  useEffect(() => {
    if (!selectedFormationId) return;
    fetchSubPositions(selectedFormationId)
      .then(setSubPositions)
      .catch((e) => console.error('Failed to fetch sub-positions', e));
  }, [selectedFormationId]);

  // Update player assignments when sub-positions change
  useEffect(() => {
    setPlayers(prevPlayers => 
      prevPlayers.map(player => ({
        ...player,
        subPosition: subPositions.find(sp => sp.id === player.subPosition) ? player.subPosition : ''
      }))
    );
  }, [subPositions]);

  // Add sub-position (calls Supabase, uses returned UUID)
  const addSubPosition = async () => {
    if (!newSubPositionName.trim() || !selectedFormationId) return;
    try {
      const newSub = await addSubPositionToDB({
        depth_chart_formation_id: selectedFormationId!,
        name: newSubPositionName.trim(),
        x_coord: 100,
        y_coord: 100,
      });
      setSubPositions(prev => [...prev, newSub]);
      setNewSubPositionName('');
      setIsAddingSubPosition(false);
    } catch (e) {
      // Optionally: show error
      console.error('Failed to add sub-position', e);
    }
  };

  // Update position in DB on drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event;
    
    const activeSubPosition = subPositions.find(sp => sp.id === active.id);
    if (!activeSubPosition) return;

    // Check if dropped on trash can
    if (over && over.id === 'trash-can') {
      console.log('Dropped on trash can, deleting:', active.id.toString());
      deleteSubPosition(active.id.toString());
      return;
    }

    // Calculate new position based on drag delta
    const newX = activeSubPosition.x_coord + delta.x;
    const newY = activeSubPosition.y_coord + delta.y;

    // Apply smart locking (snap to grid)
    const gridSize = 20;
    const snappedX = Math.round(newX / gridSize) * gridSize;
    const snappedY = Math.round(newY / gridSize) * gridSize;

    // Ensure position stays within bounds (accounting for zoom)
    const zoomFactor = zoom / 100;
    
    // Get the actual workspace dimensions
    const workspaceElement = containerRef.current;
    const containerWidth = workspaceElement ? workspaceElement.clientWidth : 1200;
    const containerHeight = workspaceElement ? workspaceElement.clientHeight : 800;
    
    // Get height from multiple sources to ensure we have a valid value
    let actualHeight = containerHeight;
    if (actualHeight <= 0 && workspaceElement) {
      // Use scrollHeight as it represents the full content area
      const scrollHeight = workspaceElement.scrollHeight;
      if (scrollHeight > 0) {
        actualHeight = scrollHeight;
      } else {
        // Try computed style height
        const computedStyle = window.getComputedStyle(workspaceElement);
        const computedHeight = parseFloat(computedStyle.height);
        
        if (computedHeight > 0) {
          actualHeight = computedHeight;
        } else {
          // Try offset height
          const offsetHeight = workspaceElement.offsetHeight;
          if (offsetHeight > 0) {
            actualHeight = offsetHeight;
          } else {
            // Fallback to parent height or default
            const parentHeight = workspaceElement.parentElement?.clientHeight || 800;
            actualHeight = Math.max(parentHeight, 800);
          }
        }
      }
    }
    

    
    // When zoomed out, the workspace is larger, so we need to allow more space
    const workspaceScale = zoom < 100 ? (100 / zoom) : 1;
    const maxX = (containerWidth * workspaceScale) - 120;
    const maxY = (actualHeight * workspaceScale) - 60;
    
    const clampedX = Math.max(0, Math.min(snappedX, maxX));
    const clampedY = Math.max(0, Math.min(snappedY, maxY));
    


    setSubPositions(prev => 
      prev.map(sp => 
        sp.id === active.id 
          ? { ...sp, x_coord: clampedX, y_coord: clampedY }
          : sp
      )
    );

    // Persist to Supabase
    try {
      await updateSubPosition(active.id.toString(), { x_coord: clampedX, y_coord: clampedY });
    } catch (e) {
      // Optionally: show an error or revert state
      console.error('Failed to update position in Supabase', e);
    }
  };

  const deleteSubPosition = async (id: string) => {
    // Soft delete in Supabase
    try {
      await softDeleteSubPosition(id);
    } catch (e) {
      console.error('Failed to soft delete sub-position', e);
    }
    // Remove from local state
    setSubPositions(prev => prev.filter(sp => sp.id !== id));
    // Remove players from this sub-position
    setPlayers(prev => 
      prev.map(player => 
        player.subPosition === id ? { ...player, subPosition: '' } : player
      )
    );
  };

  const handleFormationChange = (formationId: string) => {
    setSelectedFormationId(formationId);
  };

  const handleAddFormation = async () => {
    const formationName = prompt('Enter formation name:');
    if (!formationName || !customerId) return;
    
    try {
      const newFormation = await addFormation({
        name: formationName,
        order: formations.length,
        customer_id: customerId,
      });
      setFormations(prev => [...prev, newFormation]);
      setSelectedFormationId(newFormation.id);
    } catch (e) {
      console.error('Failed to add formation', e);
    }
  };

  const handleDeleteFormation = async (formationId: string) => {
    if (!formationId || formations.length <= 1) return;
    
    try {
      await softDeleteFormation(formationId);
      setFormations(prev => prev.filter(f => f.id !== formationId));
      if (formationId === selectedFormationId) {
        const remainingFormations = formations.filter(f => f.id !== formationId);
        if (remainingFormations.length > 0) {
          setSelectedFormationId(remainingFormations[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to delete formation', e);
    }
  };

  const handleMoveFormation = async (formationId: string, direction: 'up' | 'down') => {
    const currentIndex = formations.findIndex(f => f.id === formationId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= formations.length) return;

    // Create new array with reordered formations
    const newFormations = [...formations];
    const [movedFormation] = newFormations.splice(currentIndex, 1);
    newFormations.splice(newIndex, 0, movedFormation);

    // Update order values
    const updatedFormations = newFormations.map((formation, index) => ({
      ...formation,
      order: index
    }));

    setFormations(updatedFormations);

    // Update in database
    try {
      await updateFormation(formationId, { order: newIndex });
      const otherFormationId = newFormations[newIndex === currentIndex + 1 ? currentIndex : newIndex].id;
      await updateFormation(otherFormationId, { order: currentIndex });
    } catch (e) {
      console.error('Failed to update formation order', e);
    }
  };

  const handleCopyFormation = async (formationId: string) => {
    const formationToCopy = formations.find(f => f.id === formationId);
    if (!formationToCopy || !customerId) return;

    const newName = prompt(`Enter a name for the copied formation (copying "${formationToCopy.name}"):`);
    if (!newName || !newName.trim()) return;

    try {
      // Create new formation
      const newFormation = await addFormation({
        name: newName.trim(),
        order: formations.length,
        customer_id: customerId,
      });

      // Copy sub-positions from the original formation
      const originalSubPositions = await fetchSubPositions(formationId);
      
      for (const subPosition of originalSubPositions) {
        await addSubPositionToDB({
          depth_chart_formation_id: newFormation.id,
          name: subPosition.name,
          x_coord: subPosition.x_coord,
          y_coord: subPosition.y_coord,
        });
      }

      // Add to local state and select it
      setFormations(prev => [...prev, newFormation]);
      setSelectedFormationId(newFormation.id);
      
      // Refresh sub-positions for the new formation
      const newSubPositions = await fetchSubPositions(newFormation.id);
      setSubPositions(newSubPositions);
      
    } catch (e) {
      console.error('Failed to copy formation', e);
      alert('Failed to copy formation. Please try again.');
    }
  };

  const handlePlayerRankChange = (playerId: string, newRank: number) => {
    setPlayers(prev => 
      prev.map(player => 
        player.id === playerId ? { ...player, rank: newRank } : player
      )
    );
  };

  const handlePlayerSubPositionChange = (playerId: string, newSubPosition: string) => {
    setPlayers(prev => 
      prev.map(player => 
        player.id === playerId ? { ...player, subPosition: newSubPosition } : player
      )
    );
  };

  // Group players by sub-position and rank
  const groupedPlayers = subPositions.map(subPosition => {
    const subPositionPlayers = players.filter(p => p.subPosition === subPosition.id);
    const groupedByRank = subPositionPlayers.reduce((acc, player) => {
      if (!acc[player.rank]) acc[player.rank] = [];
      acc[player.rank].push(player);
      return acc;
    }, {} as Record<number, Player[]>);

    return {
      id: subPosition.id,
      name: subPosition.name,
      x_coord: subPosition.x_coord,
      y_coord: subPosition.y_coord,
      players: groupedByRank
    };
  });

  return (
    <div className="depth-chart-container">

      {isAddingSubPosition && (
        <div className="add-sub-position-modal">
          <div className="modal-content">
            <h3>Add New Sub-Position</h3>
            <input
              type="text"
              value={newSubPositionName}
              onChange={(e) => setNewSubPositionName(e.target.value)}
              placeholder="Enter sub-position name (e.g., QB, RB)"
              onKeyPress={(e) => e.key === 'Enter' && addSubPosition()}
            />
            <div className="modal-actions">
              <button onClick={addSubPosition}>Add</button>
              <button onClick={() => {
                setIsAddingSubPosition(false);
                setNewSubPositionName('');
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div 
        className="depth-chart-workspace" 
        ref={containerRef}
        style={{ 
          paddingBottom: zoom > 100 ? '2rem' : '0',
          paddingRight: zoom > 100 ? '5%' : '0',
          width: zoom < 100 ? `${100 / (zoom / 100)}%` : '100%',
          height: zoom < 100 ? `${100 / (zoom / 100)}%` : '100%',
          minHeight: zoom > 100 ? `${zoom}vh` : '100%', 
          marginBottom: zoom > 100 ? '4rem' : '0'
        }}
      >
        <DndContext onDragEnd={handleDragEnd}>
          {subPositions.map(subPosition => (
            <DraggableSubPositionHeader
              key={subPosition.id}
              subPosition={subPosition}
              onPositionChange={(id, x, y) => {
                setSubPositions(prev => 
                  prev.map(sp => sp.id === id ? { ...sp, x_coord: x, y_coord: y } : sp)
                );
              }}
              onDelete={deleteSubPosition}
            />
          ))}
          
          {/* Droppable Trash Can */}
          <DroppableTrashCan 
            isOver={false}
            onDelete={deleteSubPosition}
            zoom={zoom}
            onAddSubPosition={() => setIsAddingSubPosition(true)}
            formations={formations}
            selectedFormationId={selectedFormationId}
            onFormationChange={handleFormationChange}
            onAddFormation={handleAddFormation}
            onDeleteFormation={handleDeleteFormation}
            onMoveFormation={handleMoveFormation}
            onCopyFormation={handleCopyFormation}
            isDropdownOpen={isDropdownOpen}
            onToggleDropdown={() => setIsDropdownOpen(!isDropdownOpen)}
          />
        </DndContext>

        {/* Render players under each sub-position */}
        {groupedPlayers.map(subPosition => (
          <div
            key={subPosition.id}
            className="sub-position-section"
            style={{
              position: 'absolute',
              left: subPosition.x_coord,
              top: subPosition.y_coord + 60, // Below the header
            }}
          >
            {Object.entries(subPosition.players)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([rank, playersInRank]) => (
                <div key={rank} className="rank-group">
                  <div className="rank-label">Rank {rank}</div>
                  <div className="players-row">
                    {playersInRank.map(player => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        onRankChange={handlePlayerRankChange}
                        onSubPositionChange={handlePlayerSubPositionChange}
                        availableSubPositions={subPositions}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      <style jsx>{`
        .depth-chart-container {
          padding: 2rem;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: visible;
          box-sizing: border-box;
          width: 100%;
          min-height: 100%;
          align-items: stretch;
        }



        .depth-chart-workspace {
          flex: 1 1 auto;
          flex-grow: 1;
          flex-shrink: 1;
          flex-basis: auto;
          position: relative;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          overflow: visible;
          height: 100%;
          width: 100%;
          box-sizing: border-box;
          min-height: 800px;
          min-width: 100%;
          display: flex;
          flex-direction: column;
          align-self: stretch;
        }

        .sub-position-section {
          min-width: 300px;
        }

        .rank-group {
          margin-bottom: 1rem;
        }

        .rank-label {
          font-weight: bold;
          color: #666;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }

        .players-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .player-card {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 200px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .player-image img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .player-info {
          flex: 1;
        }

        .player-name {
          font-weight: bold;
          font-size: 0.9rem;
        }

        .player-position {
          font-size: 0.8rem;
          color: #666;
        }

        .player-controls {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .rank-select, .sub-position-select {
          padding: 0.25rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        .add-sub-position-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 2rem;
          border-radius: 8px;
          min-width: 300px;
        }

        .modal-content h3 {
          margin-top: 0;
          margin-bottom: 1rem;
        }

        .modal-content input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          margin-bottom: 1rem;
        }

        .modal-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .modal-actions button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .modal-actions button:first-child {
          background: #007bff;
          color: white;
        }

        .modal-actions button:last-child {
          background: #6c757d;
          color: white;
        }
      `}</style>
    </div>
  );
};

export default DepthChart; 