import React from 'react';
import { useDrop } from 'react-dnd';
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { DepthChartSubPosition, DepthChartAssignmentWithAthlete } from '@/types/depthChart';
import { ATHLETE_DRAG_TYPE } from './DraggableAthleteCard';
import DraggableAthleteCard from './DraggableAthleteCard';

interface DepthChartDropZoneProps {
  subPosition: DepthChartSubPosition;
  assignments: DepthChartAssignmentWithAthlete[];
  onDrop: (item: any, subPositionId: string) => void;
  onMoveUp: (assignmentId: string) => void;
  onMoveDown: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  onAddAthlete: (subPositionId: string) => void;
  onDeleteSubPosition?: (subPositionId: string) => void;
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
  isDropping = false
}) => {

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ATHLETE_DRAG_TYPE,
    drop: (item) => onDrop(item, subPosition.id),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [subPosition.id, onDrop]);

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

  return (
    <div 
      className="absolute"
      style={{
        left: `${subPosition.x_coord}px`,
        top: `${subPosition.y_coord}px`,
        transform: 'translate(-50%, -50%)',
        minWidth: '200px',
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
        ref={drop as any}
        className={`
          ${assignments.length > 0 ? 'min-h-32 p-3' : 'min-h-8 p-2'} bg-white border-2 border-dashed rounded-b-lg
          transition-all duration-200
          ${isOver && canDrop
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
          <div className="space-y-2">
            {groupedAssignments.map((group, groupIndex) => (
              <div key={`group-${groupIndex}`}>
                {group.length === 1 ? (
                  // Single athlete
                  <DraggableAthleteCard
                    assignment={group[0]}
                    index={groupIndex}
                    totalAthletes={sortedAssignments.length}
                    onMoveUp={() => onMoveUp(group[0].id)}
                    onMoveDown={() => onMoveDown(group[0].id)}
                    onRemove={() => onRemove(group[0].id)}
                  />
                ) : (
                  // Tied athletes - display side by side
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 font-medium">
                      Tied for {group[0].ranking === 1 ? '1st' : 
                               group[0].ranking === 2 ? '2nd' : 
                               group[0].ranking === 3 ? '3rd' : 
                               `${group[0].ranking}th`}:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {group.map((assignment, athleteIndex) => (
                        <DraggableAthleteCard
                          key={assignment.id}
                          assignment={assignment}
                          index={groupIndex}
                          totalAthletes={sortedAssignments.length}
                          onMoveUp={() => onMoveUp(assignment.id)}
                          onMoveDown={() => onMoveDown(assignment.id)}
                          onRemove={() => onRemove(assignment.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
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

        {/* Drop indicator when hovering */}
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
