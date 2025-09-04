import React from 'react';
import { useDragLayer } from 'react-dnd';
import { SUB_POSITION_DRAG_TYPE } from './DraggableSubPosition';

const CustomDragLayer: React.FC = () => {
  const {
    isDragging,
    item,
    clientOffset,
  } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    isDragging: monitor.isDragging(),
    clientOffset: monitor.getClientOffset(),
  }));

  if (!isDragging || !clientOffset) {
    return null;
  }

  // Get the field container to match its scaling and positioning
  const fieldContainer = document.querySelector('[data-field-drop-zone="true"]')?.parentElement;
  const fieldDropZone = document.querySelector('[data-field-drop-zone="true"]');
  const containerStyle = fieldContainer ? window.getComputedStyle(fieldContainer) : null;
  const dropZoneRect = fieldDropZone ? fieldDropZone.getBoundingClientRect() : null;
  
  // Parse the scale from the container's transform
  let scaleX = 1, scaleY = 1;
  const transformMatch = containerStyle?.transform?.match(/scale\(([^,)]+)(?:,\s*([^)]+))?\)/);
  if (transformMatch) {
    scaleX = parseFloat(transformMatch[1]);
    scaleY = parseFloat(transformMatch[2] || transformMatch[1]);
  }

  // Calculate position accounting for field container scaling and position
  let adjustedX = clientOffset.x - (item?.offsetX || 100);
  let adjustedY = clientOffset.y - (item?.offsetY || 60);
  
  // If we have the drop zone bounds, we can be more precise
  if (dropZoneRect) {
    // Position relative to the scaled container
    const relativeX = (clientOffset.x - dropZoneRect.left) / scaleX;
    const relativeY = (clientOffset.y - dropZoneRect.top) / scaleY;
    
    // Convert back to screen coordinates for the preview
    adjustedX = dropZoneRect.left + (relativeX * scaleX) - (item?.offsetX || 100);
    adjustedY = dropZoneRect.top + (relativeY * scaleY) - (item?.offsetY || 60);
  }

  const renderDragPreview = () => {
    switch (item.type) {
      case SUB_POSITION_DRAG_TYPE:
        return (
          <div style={{ width: '200px', opacity: 0.9 }}>
            {/* Sub-position label - matches the original exactly */}
            <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg text-sm font-medium flex items-center justify-between">
              <div className="flex items-center">
                {item.name || 'Position'}
                {item.hasAssignments && (
                  <span className="ml-2 bg-white bg-opacity-20 px-2 py-1 rounded text-xs">
                    {item.assignmentCount}
                  </span>
                )}
              </div>
            </div>

            {/* Drop zone area - matches the original */}
            <div className="min-h-32 bg-white border-2 border-dashed border-gray-300 rounded-b-lg p-3">
              {item.hasAssignments ? (
                /* Show placeholder for athletes */
                <div className="space-y-2">
                  {Array.from({ length: Math.min(item.assignmentCount, 3) }).map((_, i) => (
                    <div key={i} className="bg-gray-100 border border-gray-200 rounded p-2 text-xs text-gray-500">
                      Athlete {i + 1}
                    </div>
                  ))}
                  {item.assignmentCount > 3 && (
                    <div className="text-xs text-gray-400 text-center">
                      +{item.assignmentCount - 3} more
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state - matches the original */
                <div className="text-center text-gray-400 py-6">
                  <svg className="w-6 h-6 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    Drop an athlete here or
                  </div>
                  <div className="mt-2 text-blue-600 text-sm font-medium flex items-center justify-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Athlete
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 100,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          transform: `translate(${adjustedX}px, ${adjustedY}px)`,
        }}
      >
        {renderDragPreview()}
      </div>
    </div>
  );
};

export default CustomDragLayer;
