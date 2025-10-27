import React from 'react';
import { useDrop } from 'react-dnd/dist/hooks';
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { DepthChartSubPosition, DepthChartAssignmentWithAthlete } from '@/types/depthChart';
import { ATHLETE_DRAG_TYPE } from './DraggableAthleteCard';
import DraggableAthleteCard from './DraggableAthleteCard';

interface AthleteDropItem {
  assignmentId: string;
  athleteId: string;
  currentSubPositionId: string;
  currentRanking: number;
}

interface DepthChartDropZoneProps {
  subPosition: DepthChartSubPosition;
  assignments: DepthChartAssignmentWithAthlete[];
  onDrop: (item: AthleteDropItem, subPositionId: string) => void;
  onMoveUp: (assignmentId: string) => void;
  onMoveDown: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  onAddAthlete: (subPositionId: string) => void;
  onDeleteSubPosition?: (subPositionId: string) => void;
  onAthleteDrop?: (draggedAthlete: AthleteDropItem, targetAthlete: AthleteDropItem) => void;
  onAthleteInsert?: (draggedAthlete: AthleteDropItem, insertPosition: number) => void;
  onCreateTie?: (draggedAthlete: AthleteDropItem, targetAthlete: AthleteDropItem) => void;
  isDropping?: boolean;
}

const DepthChartDropZone: React.FC<DepthChartDropZoneProps> = ({
  subPosition,
  assignments,
  onDrop,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddAthlete,
  onDeleteSubPosition,
  onAthleteDrop,
  onAthleteInsert,
  onCreateTie,
  isDropping = false
}) => {

  const [{ isOver, canDrop, draggedItem }, drop] = useDrop<AthleteDropItem, void, { isOver: boolean; canDrop: boolean; draggedItem: AthleteDropItem | null }>(() => ({
    accept: ATHLETE_DRAG_TYPE,
    drop: (item: AthleteDropItem) => {
      // Only drop to sub-position if it's from a different position
      if (item.currentSubPositionId !== subPosition.id) {
        console.log('🎯 [ATHLETE DROP] Dropping athlete onto position:', {
          athlete: {
            id: item.athleteId,
            assignmentId: item.assignmentId,
            fromPosition: item.currentSubPositionId,
            currentRanking: item.currentRanking
          },
          targetPosition: {
            id: subPosition.id,
            name: subPosition.name,
            currentAthletes: assignments.length,
            newRanking: assignments.length + 1
          }
        });
        onDrop(item, subPosition.id);
      }
    },
    canDrop: (item: AthleteDropItem) => {
      // Only allow drops from different positions
      return item.currentSubPositionId !== subPosition.id;
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem(),
    }),
  }), [subPosition.id, onDrop]);

  // Monitor if any athlete is being dragged from this position
  const [{ isDraggingFromThisPosition }] = useDrop<AthleteDropItem, void, { isDraggingFromThisPosition: boolean }>(() => ({
    accept: ATHLETE_DRAG_TYPE,
    collect: (monitor: any) => ({
      isDraggingFromThisPosition: monitor.getItem()?.currentSubPositionId === subPosition.id,
    }),
  }), [subPosition.id]);


  const sortedAssignments = [...assignments].sort((a, b) => a.ranking - b.ranking);

  // Group tied athletes (same ranking)
  const groupedAssignments: DepthChartAssignmentWithAthlete[][] = [];
  let currentGroup: DepthChartAssignmentWithAthlete[] = [];
  let currentRanking = -1;

  sortedAssignments.forEach(assignment => {
    if (assignment.ranking !== currentRanking) {
      if (currentGroup.length > 0) {
        groupedAssignments.push(currentGroup);
      }
      currentGroup = [assignment];
      currentRanking = assignment.ranking;
    } else {
      currentGroup.push(assignment);
    }
  });

  if (currentGroup.length > 0) {
    groupedAssignments.push(currentGroup);
  }

  // Component for insertion drop zones
  const InsertionDropZone: React.FC<{ insertPosition: number }> = ({ insertPosition }) => {
    const [{ isOver, canDrop }, drop] = useDrop<AthleteDropItem, void, { isOver: boolean; canDrop: boolean }>(() => ({
      accept: ATHLETE_DRAG_TYPE,
      drop: (draggedItem: AthleteDropItem) => {
        // Only allow drops from the same position
        if (draggedItem.currentSubPositionId === subPosition.id) {
          onAthleteInsert?.(draggedItem, insertPosition);
        }
      },
      canDrop: (draggedItem: AthleteDropItem) => {
        // Can drop if it's from the same position
        return draggedItem.currentSubPositionId === subPosition.id;
      },
      collect: (monitor: any) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }), [subPosition.id, onAthleteInsert, insertPosition]);

    return (
      <div
        ref={drop as unknown as React.RefObject<HTMLDivElement>}
        className={`
          mx-2 my-1 rounded transition-all duration-200 relative z-10
          ${isOver && canDrop 
            ? 'h-3 bg-green-400 border-2 border-green-500 shadow-lg' 
            : isDraggingFromThisPosition
              ? 'h-3 bg-gray-100 border border-gray-300 hover:bg-gray-200 hover:border-gray-400'
              : 'h-0 bg-transparent border border-transparent'
          }
        `}
      >
        {isOver && canDrop && (
          <div className="h-full bg-green-400 rounded flex items-center justify-center shadow-lg">
            <div className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium shadow-md">
              Insert here
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="absolute"
      style={{
        left: `${subPosition.x_coord}px`,
        top: `${subPosition.y_coord}px`,
        width: '240px',
        zIndex: 10
      }}
    >
      {/* Sub-position label */}
      <div className={`
        bg-blue-600 text-white px-3 py-2 rounded-t-lg text-sm font-medium flex items-center justify-between
        ${isOver && canDrop ? 'bg-green-600' : ''}
        ${isOver && !canDrop ? 'bg-red-600' : ''}
      `}>
        <div className="flex items-center">
          {subPosition.name}
          {assignments.length > 0 && (
            <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
              {assignments.length}
            </span>
          )}
        </div>
        
        {onDeleteSubPosition && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteSubPosition(subPosition.id);
            }}
            className="ml-2 p-1 hover:bg-white hover:bg-opacity-20 rounded"
            title="Delete Position"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        )}
      </div>

      {/* Drop zone for athletes */}
      <div
        ref={isDraggingFromThisPosition ? null : drop as unknown as React.RefObject<HTMLDivElement>}
        className={`
          ${assignments.length > 0 ? 'min-h-32' : 'min-h-8'} bg-white border-2 border-dashed rounded-b-lg
          transition-all duration-200
          ${isDraggingFromThisPosition 
            ? 'border-gray-300' // No special styling when dragging within same position
            : isOver && canDrop
              ? 'border-green-400 bg-green-50' 
              : isOver && !canDrop
                ? 'border-red-400 bg-red-50'
                : 'border-gray-300'
          }
          ${isDropping ? 'animate-pulse' : ''}
        `}
      >
        {/* Athletes list */}
        {groupedAssignments.length > 0 ? (
          <div className="w-full">
            {/* Insertion zone at the top */}
            <InsertionDropZone insertPosition={1} />
            
            {groupedAssignments.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`}>
                {group.length === 1 ? (
                  // Single athlete
                  <DraggableAthleteCard
                    assignment={group[0]}
                    index={groupIndex}
                    totalAthletes={sortedAssignments.length}
                    onRemove={() => onRemove(group[0].id)}
                    onAthleteDrop={onAthleteDrop}
                    onCreateTie={onCreateTie}
                  />
                ) : (
                  // Tied athletes - display side by side
                  <div className="flex gap-1">
                    {group.map((assignment, athleteIndex) => (
                      <DraggableAthleteCard
                        key={assignment.id}
                        assignment={assignment}
                        index={groupIndex}
                        totalAthletes={sortedAssignments.length}
                        onRemove={() => onRemove(assignment.id)}
                        onAthleteDrop={onAthleteDrop}
                        onCreateTie={onCreateTie}
                        isTied={true}
                        tiedCount={group.length}
                      />
                    ))}
                  </div>
                )}
                
                {/* Insertion zone after each group */}
                <InsertionDropZone insertPosition={group[0].ranking + 1} />
              </div>
            ))}
          </div>
        ) : (
          // Empty state
          <div className="text-center text-gray-400 flex items-center justify-center gap-2">
            <UserAddOutlined className="text-lg" />
            <div className="text-sm">
              Drop an athlete here
            </div>
          </div>
        )}

        {/* Drop indicator when hovering - only show for cross-position drops */}
        {isOver && canDrop && (
          <div className="absolute inset-0 bg-green-100 border-2 border-green-400 border-dashed rounded-b-lg flex items-center justify-center">
            <div className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium">
              Drop here to assign
            </div>
          </div>
        )}

        {isOver && !canDrop && (
          <div className="absolute inset-0 bg-red-100 border-2 border-red-400 border-dashed rounded-b-lg flex items-center justify-center">
            <div className="bg-red-600 text-white px-3 py-1 rounded text-sm font-medium">
              Cannot drop here
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default DepthChartDropZone;
