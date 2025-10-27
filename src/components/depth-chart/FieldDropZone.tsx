import React from 'react';
import { useDrop } from 'react-dnd/dist/hooks';
import { SUB_POSITION_DRAG_TYPE } from './DraggableSubPosition';
import { calculateIntelligentPosition, findBestNonOverlappingPosition } from '@/utils/depthChartUtils';

interface SubPosition {
  id: string;
  x_coord: number;
  y_coord: number;
  name: string;
}

interface FieldDropZoneProps {
  onMoveSubPosition: (subPositionId: string, x: number, y: number) => void;
  existingPositions: SubPosition[];
  children: React.ReactNode;
}

const FieldDropZone: React.FC<FieldDropZoneProps> = ({ onMoveSubPosition, existingPositions, children }) => {
  const [, drop] = useDrop({
    accept: SUB_POSITION_DRAG_TYPE,
    drop: (item: any, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get the drop zone element
      const dropZone = document.querySelector('[data-field-drop-zone="true"]');
      if (!dropZone) return;

      const rect = dropZone.getBoundingClientRect();
      
      // Check if there's any scaling/transform on the depth chart container
      const depthChartContainer = document.querySelector('.depth-chart-container');
      const containerStyle = depthChartContainer ? window.getComputedStyle(depthChartContainer) : null;
      
      // Account for any scaling on the container
      let scaleX = 1, scaleY = 1;
      const transformMatch = containerStyle?.transform?.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
      if (transformMatch) {
        scaleX = parseFloat(transformMatch[1]);
        scaleY = parseFloat(transformMatch[2] || transformMatch[1]);
      }
      
      // Mouse position directly becomes the top-left position
      const rawX = (clientOffset.x - rect.left) / scaleX;
      const rawY = (clientOffset.y - rect.top) / scaleY;

      // Store position as top-left coordinates, allowing negative values
      const rawPosition = {
        x: rawX,
        y: rawY
      };
      
      // Calculate intelligent position with snapping and alignment
      const intelligentResult = calculateIntelligentPosition(
        rawPosition,
        existingPositions,
        item.id,
        50, // snap threshold (increased for better detection)
        5   // gap size
      );

      // Use the intelligent position result directly (no overlap prevention)
      const finalPosition = { x: intelligentResult.x, y: intelligentResult.y };
      
      onMoveSubPosition(item.id, finalPosition.x, finalPosition.y);
    },
  });

  return (
    <div 
      ref={drop as any}
      data-field-drop-zone="true"
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'absolute',
        top: 0,
        left: 0
      }}
    >
      {children}
    </div>
  );
};

export default FieldDropZone;
