import React from 'react';
import { useDrop } from 'react-dnd';
import { SUB_POSITION_DRAG_TYPE } from './DraggableSubPosition';

interface FieldDropZoneProps {
  onMoveSubPosition: (subPositionId: string, x: number, y: number) => void;
  children: React.ReactNode;
}

const FieldDropZone: React.FC<FieldDropZoneProps> = ({ onMoveSubPosition, children }) => {
  const [, drop] = useDrop({
    accept: SUB_POSITION_DRAG_TYPE,
    drop: (item: any, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      // Get the drop zone element
      const dropZone = document.querySelector('[data-field-drop-zone="true"]');
      if (!dropZone) return;

      const rect = dropZone.getBoundingClientRect();
      
      // Check if there's any scaling/transform on the container
      const container = dropZone.parentElement;
      const containerStyle = container ? window.getComputedStyle(container) : null;
      
      console.log('📍 DROP CALCULATION - Input data:', {
        item,
        clientOffset,
        dropZoneRect: rect,
        itemOffsets: { x: item.offsetX, y: item.offsetY },
        containerInfo: {
          transform: containerStyle?.transform,
          scale: containerStyle?.scale,
          zoom: containerStyle?.zoom
        }
      });
      
      // Account for any scaling on the container
      let scaleX = 1, scaleY = 1;
      const transformMatch = containerStyle?.transform?.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
      if (transformMatch) {
        scaleX = parseFloat(transformMatch[1]);
        scaleY = parseFloat(transformMatch[2] || transformMatch[1]);
      }
      
      // Calculate position - the mouse position relative to the drop zone
      // Account for scaling if present
      const rawX = clientOffset.x - rect.left;
      const rawY = clientOffset.y - rect.top;
      const newX = Math.max(0, rawX / scaleX);
      const newY = Math.max(0, rawY / scaleY);
      
      onMoveSubPosition(item.id, newX, newY);
    },
  });

  return (
    <div 
      ref={drop as any}
      data-field-drop-zone="true"
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      {children}
    </div>
  );
};

export default FieldDropZone;
