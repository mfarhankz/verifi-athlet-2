import React, { useRef } from 'react';
import { useDrag } from 'react-dnd/dist/hooks';
import { DepthChartSubPosition, DepthChartAssignmentWithAthlete } from '@/types/depthChart';
import DepthChartDropZone from './DepthChartDropZone';

interface AthleteDropItem {
  assignmentId: string;
  athleteId: string;
  currentSubPositionId: string;
  currentRanking: number;
}

export const SUB_POSITION_DRAG_TYPE = 'SUB_POSITION' as const;

type DragItem = {
  id: string;
  type: typeof SUB_POSITION_DRAG_TYPE;
  currentX: number;
  currentY: number;
  name: string;
  assignmentCount: number;
  hasAssignments: boolean;
  offsetX: number;
  offsetY: number;
}

interface DraggableSubPositionProps {
  subPosition: DepthChartSubPosition;
  assignments: DepthChartAssignmentWithAthlete[];
  onDrop: (item: AthleteDropItem, subPositionId: string) => void;
  onMoveUp: (assignmentId: string) => void;
  onMoveDown: (assignmentId: string) => void;
  onRemove: (assignmentId: string) => void;
  onAddAthlete: (subPositionId: string) => void;
  onDeleteSubPosition?: (subPositionId: string) => void;
  onMoveSubPosition: (subPositionId: string, x: number, y: number) => void;
  onAthleteDrop?: (draggedAthlete: AthleteDropItem, targetAthlete: AthleteDropItem) => void;
  onAthleteInsert?: (draggedAthlete: AthleteDropItem, insertPosition: number) => void;
  onCreateTie?: (draggedAthlete: AthleteDropItem, targetAthlete: AthleteDropItem) => void;
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
  onAthleteDrop,
  onAthleteInsert,
  onCreateTie,
  isDropping = false
}: DraggableSubPositionProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Set up drag for the sub-position
  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: SUB_POSITION_DRAG_TYPE,
    item: (monitor): DragItem => {
      // Get the actual element dimensions and position
      const element = ref.current;
      const rect = element?.getBoundingClientRect();
      
      // Get the initial client offset when drag started
      const initialClientOffset = monitor.getInitialClientOffset();
      const initialSourceClientOffset = monitor.getInitialSourceClientOffset();
      
      // Set offsets to 0 so the mouse position directly corresponds to top-left
      const offsetX = 0;
      const offsetY = 0;
      
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
      return dragItem;
    },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item: DragItem | undefined, monitor: any) => {
      const dropResult = monitor.getDropResult();
      if (!dropResult) return;

      // Handle the drop result if needed
      const { x, y } = dropResult as { x: number; y: number };
      if (typeof x === 'number' && typeof y === 'number') {
        onMoveSubPosition(subPosition.id, x, y);
      }
    },
  });


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
        onAthleteDrop={onAthleteDrop}
        onAthleteInsert={onAthleteInsert}
        onCreateTie={onCreateTie}
        isDropping={isDropping}
      />
    </div>
  );
};

export default DraggableSubPosition;
