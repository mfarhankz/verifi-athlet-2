import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd/dist/hooks';
import { Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { isValidImageUrl } from '@/utils/imageUtils';
import { DepthChartAssignmentWithAthlete } from '@/types/depthChart';
import Image from 'next/image';

interface AthleteDropItem {
  assignmentId: string;
  athleteId: string;
  currentSubPositionId: string;
  currentRanking: number;
}

interface DraggableAthleteCardProps {
  assignment: DepthChartAssignmentWithAthlete;
  index: number;
  totalAthletes: number;
  onRemove?: () => void;
  onAthleteDrop?: (draggedAthlete: AthleteDropItem, targetAthlete: AthleteDropItem) => void;
  onCreateTie?: (draggedAthlete: AthleteDropItem, targetAthlete: AthleteDropItem) => void;
  isDragEnabled?: boolean;
  showControls?: boolean;
  isTied?: boolean;
  tiedCount?: number;
}

export const ATHLETE_DRAG_TYPE = 'athlete-assignment';

const DraggableAthleteCard: React.FC<DraggableAthleteCardProps> = ({
  assignment,
  index,
  totalAthletes,
  onRemove,
  onAthleteDrop,
  onCreateTie,
  isDragEnabled = true,
  showControls = true,
  isTied = false,
  tiedCount = 1
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag<AthleteDropItem, void, { isDragging: boolean }>(() => ({
    type: ATHLETE_DRAG_TYPE,
    item: () => {
      const dragItem = {
        assignmentId: assignment.id,
        athleteId: assignment.athlete_id,
        currentSubPositionId: assignment.sub_position_id,
        currentRanking: assignment.ranking
      };
      
      console.log(`🚀 [ATHLETE CARD DRAG] Starting drag:`, dragItem);
      return dragItem;
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isDragEnabled
  }), [assignment, isDragEnabled]);

  // Add drop functionality for athlete-to-athlete drops
  const [{ isOver, canDrop, draggedItem }, drop] = useDrop<AthleteDropItem, void, { isOver: boolean; canDrop: boolean; draggedItem: AthleteDropItem | null }>(() => ({
    accept: ATHLETE_DRAG_TYPE,
    drop: (draggedItem: AthleteDropItem) => {
      console.log(`🎯 [ATHLETE CARD DROP] Drop event triggered:`, {
        draggedItem: {
          assignmentId: draggedItem.assignmentId,
          athleteId: draggedItem.athleteId,
          currentSubPositionId: draggedItem.currentSubPositionId,
          currentRanking: draggedItem.currentRanking
        },
        targetAssignment: {
          assignmentId: assignment.id,
          athleteId: assignment.athlete_id,
          subPositionId: assignment.sub_position_id,
          ranking: assignment.ranking
        }
      });

      // Only allow drops from the same position
      if (draggedItem.currentSubPositionId === assignment.sub_position_id && 
          draggedItem.assignmentId !== assignment.id) {
        console.log(`✅ [ATHLETE CARD DROP] Valid drop - creating tie`);
        
        const targetItem: AthleteDropItem = {
          assignmentId: assignment.id,
          athleteId: assignment.athlete_id,
          currentSubPositionId: assignment.sub_position_id,
          currentRanking: assignment.ranking
        };
        
        // Always create a tie when dropping one athlete onto another within the same position
        onCreateTie?.(draggedItem, targetItem);
      } else {
        console.log(`❌ [ATHLETE CARD DROP] Invalid drop:`, {
          samePosition: draggedItem.currentSubPositionId === assignment.sub_position_id,
          sameAthlete: draggedItem.assignmentId === assignment.id
        });
      }
    },
    canDrop: (draggedItem: AthleteDropItem) => {
      // Can drop if it's from the same position and not the same athlete
      const canDrop = draggedItem.currentSubPositionId === assignment.sub_position_id && 
                      draggedItem.assignmentId !== assignment.id;
      
      
      return canDrop;
    },
    collect: (monitor: any) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem(),
    }),
  }), [assignment, onCreateTie]);

  // Apply drag and drop refs
  useEffect(() => {
    if (ref.current) {
      drag(drop(ref));
    }
  }, [drag, drop]);

  const getRankingText = (ranking: number) => {
    if (ranking === 1) return '1st';
    if (ranking === 2) return '2nd';
    if (ranking === 3) return '3rd';
    return `${ranking}th`;
  };

  const athlete = assignment.athlete;

  return (
    <div
      ref={ref}
      className={`
        bg-white border rounded-lg pb-3 pt-2 shadow-sm transition-all duration-200 relative
        ${isTied ? 'w-1/2' : 'w-full'}
        ${isDragEnabled ? 'cursor-move' : ''}
        ${isDragging ? 'opacity-50 rotate-3 scale-95' : 'hover:shadow-md'}
        ${assignment.ranking === 1 ? 'border-l-4 border-l-blue-500' : ''}
        ${isOver && canDrop ? 'border-2 border-green-400 bg-green-50' : ''}
        ${isOver && !canDrop && draggedItem?.assignmentId !== assignment.id ? 'border-2 border-red-400 bg-red-50' : ''}
        ${isTied ? 'hover:w-full z-10' : ''}
      `}
    >
      {/* Controls - Absolute positioned in top right */}
      {showControls && (
          <div className="absolute top-0 right-0 flex items-center space-x-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className="w-4 h-4 !min-h-0 !border-0 !p-0 flex items-center justify-center hover:bg-gray-100 text-gray-400 hover:text-red-500"
            title="Remove from depth chart"
          >
            <DeleteOutlined style={{ fontSize: '12px', lineHeight: '12px' }} />
          </button>
        </div>
      )}
      
      <div className={`flex items-center ${isTied ? 'space-x-2' : 'space-x-3'} px-2 mt-3`}>
        <div className={`flex items-center ${isTied ? 'space-x-2' : 'space-x-3'} flex-1`}>
          {/* Athlete Image */}
          <div className={`${isTied ? 'w-10 h-10' : 'w-14 h-14'} rounded-full overflow-hidden bg-gray-200`}>
            {isValidImageUrl(athlete.image_url) ? (
              <Image
                src={athlete.image_url as string}
                alt={`${athlete.first_name} ${athlete.last_name}`}
                width={isTied ? 40 : 56}
                height={isTied ? 40 : 56}
                className="w-full h-full object-cover"
                onError={() => {
                  // If image fails to load, it will show initials
                  const imgElement = document.getElementById(`athlete-img-${athlete.id}`);
                  if (imgElement) {
                    imgElement.style.display = 'none';
                  }
                }}
                id={`athlete-img-${athlete.id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                {athlete.first_name?.charAt(0)}{athlete.last_name?.charAt(0)}
              </div>
            )}
          </div>

          {/* Athlete Info */}
          <div className="flex-1 min-w-0">
            {isTied ? (
              // Stacked names for tied players
              <div className="text-center">
                <div className="font-semibold text-xs truncate">
                  {athlete.first_name}
                </div>
                <div className="font-semibold text-xs truncate">
                  {athlete.last_name}
                </div>
              </div>
            ) : (
              // Single line for regular players
              <div className={`font-semibold text-sm truncate text-center`}>
                {athlete.first_name} {athlete.last_name}
              </div>
            )}
            <div className={`flex items-center justify-center gap-1.5 ${isTied ? 'text-[10px]' : 'text-xs'} text-gray-500`}>
              <span>{athlete.primary_position}</span>
              {/* Ranking Badge */}
              <div className={`
                ${isTied ? 'w-3 h-3 text-[8px]' : 'w-4 h-4 text-[10px]'} rounded-full flex items-center justify-center font-bold
                ${assignment.ranking === 1 
                  ? 'bg-blue-100 text-blue-800' 
                  : assignment.ranking === 2 
                    ? 'bg-green-100 text-green-800'
                    : assignment.ranking === 3
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600'
                }
              `}>
                {assignment.ranking}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Drop indicator when hovering */}
      {isOver && canDrop && (
        <div className="absolute inset-0 bg-green-100 border-2 border-green-400 border-dashed rounded-lg flex items-center justify-center">
          <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
            Drop to tie
          </div>
        </div>
      )}

    </div>
  );
};

export default DraggableAthleteCard;


