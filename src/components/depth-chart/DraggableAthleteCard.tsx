import React, { useRef, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Button } from 'antd';
import { DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { DepthChartAssignmentWithAthlete } from '@/types/depthChart';
import Image from 'next/image';

interface DraggableAthleteCardProps {
  assignment: DepthChartAssignmentWithAthlete;
  index: number;
  totalAthletes: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  isDragEnabled?: boolean;
  showControls?: boolean;
}

export const ATHLETE_DRAG_TYPE = 'athlete-assignment';

const DraggableAthleteCard: React.FC<DraggableAthleteCardProps> = ({
  assignment,
  index,
  totalAthletes,
  onMoveUp,
  onMoveDown,
  onRemove,
  isDragEnabled = true,
  showControls = true
}) => {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ATHLETE_DRAG_TYPE,
    item: { 
      assignmentId: assignment.id,
      athleteId: assignment.athlete_id,
      currentSubPositionId: assignment.sub_position_id,
      currentRanking: assignment.ranking
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isDragEnabled
  }), [assignment, isDragEnabled]);

  // Apply drag ref when drag is enabled
  useEffect(() => {
    if (isDragEnabled) {
      drag(ref);
    }
  }, [drag, isDragEnabled]);

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
        bg-white border rounded-lg p-3 mb-2 shadow-sm transition-all duration-200
        ${isDragEnabled ? 'cursor-move' : ''}
        ${isDragging ? 'opacity-50 rotate-3 scale-95' : 'hover:shadow-md'}
        ${assignment.ranking === 1 ? 'border-l-4 border-l-blue-500' : ''}
      `}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Ranking Badge */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
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

          {/* Athlete Image */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
            {athlete.image_url ? (
              <Image
                src={athlete.image_url}
                alt={`${athlete.first_name} ${athlete.last_name}`}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                {athlete.first_name?.charAt(0)}{athlete.last_name?.charAt(0)}
              </div>
            )}
          </div>

          {/* Athlete Info */}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {athlete.first_name} {athlete.last_name}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {athlete.primary_position}
              {athlete.secondary_position && athlete.secondary_position !== athlete.primary_position && (
                <span>, {athlete.secondary_position}</span>
              )}
            </div>
            <div className="text-xs text-gray-400">
              {getRankingText(assignment.ranking)} string
            </div>
          </div>
        </div>

        {/* Controls */}
        {showControls && (
          <div className="flex items-center space-x-1 ml-2">
            {/* Move Up */}
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp?.();
              }}
              disabled={index === 0}
              className="text-gray-400 hover:text-blue-500"
              title="Move up in ranking"
            />

            {/* Move Down */}
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.();
              }}
              disabled={index === totalAthletes - 1}
              className="text-gray-400 hover:text-blue-500"
              title="Move down in ranking"
            />

            {/* Remove */}
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onRemove?.();
              }}
              className="text-gray-400 hover:text-red-500"
              title="Remove from depth chart"
            />
          </div>
        )}
      </div>


    </div>
  );
};

export default DraggableAthleteCard;
