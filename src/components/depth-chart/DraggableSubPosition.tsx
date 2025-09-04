import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { DepthChartSubPosition, DepthChartAssignmentWithAthlete } from '@/types/depthChart';
import DepthChartDropZone from './DepthChartDropZone';

export const SUB_POSITION_DRAG_TYPE = 'SUB_POSITION';

interface DraggableSubPositionProps {
  subPosition: DepthChartSubPosition;
  assignments: DepthChartAssignmentWithAthlete[];
  onDrop: (item: any, subPositionId: string) => void;
  onMoveUp: (assignmentId: string) => void;
  onMoveDown: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  onAddAthlete: (subPositionId: string) => void;
  onDeleteSubPosition?: (subPositionId: string) => void;
  onMoveSubPosition: (subPositionId: string, x: number, y: number) => void;
  isDropping?: boolean;
}

const DraggableSubPosition: React.FC<DraggableSubPositionProps> = ({
  subPosition,
  assignments,
  onDrop,
  onMoveUp,
  onMoveDown,
  onRemove,
  onAddAthlete,
  onDeleteSubPosition,
  onMoveSubPosition,
  isDropping = false
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Set up drag for the sub-position
  const [{ isDragging }, drag, preview] = useDrag({
    type: SUB_POSITION_DRAG_TYPE,
    item: () => {
      // Use fixed offsets since we know the element structure
      // The element is 200px wide and uses translate(-50%, -50%)
      // So the center point is at 100px from left, ~60px from top
      const offsetX = 100; // Half of 200px width
      const offsetY = 60;  // Approximate center for the height
      
      console.log('🎯 DRAG START - Using fixed offsets:', {
        subPositionName: subPosition.name,
        subPositionCoords: { x: subPosition.x_coord, y: subPosition.y_coord },
        fixedOffsets: { offsetX, offsetY }
      });
      
      const dragItem = {
        id: subPosition.id,
        type: SUB_POSITION_DRAG_TYPE,
        currentX: subPosition.x_coord,
        currentY: subPosition.y_coord,
        name: subPosition.name,
        assignmentCount: assignments.length,
        hasAssignments: assignments.length > 0,
        offsetX,
        offsetY
      };
      
      console.log('📦 DRAG ITEM created:', dragItem);
      return dragItem;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Use empty image for preview to remove default ghost image
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  // Apply drag ref
  drag(ref);

  return (
    <div
      ref={ref}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      <DepthChartDropZone
        subPosition={subPosition}
        assignments={assignments}
        onDrop={onDrop}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onRemove={onRemove}
        onAddAthlete={onAddAthlete}
        onDeleteSubPosition={onDeleteSubPosition}
        isDropping={isDropping}
      />
    </div>
  );
};

export default DraggableSubPosition;
