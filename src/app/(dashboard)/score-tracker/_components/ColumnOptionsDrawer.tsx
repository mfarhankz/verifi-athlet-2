"use client";

import { useState, useEffect } from "react";
import { Drawer, Button, Input, Space, Typography, Divider, Flex, DatePicker } from "antd";
import { CloseOutlined, SettingOutlined, SearchOutlined, HeartOutlined, HeartFilled, EditOutlined, DeleteOutlined, PlusOutlined, MinusOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnConfig } from "../types";

const { Text } = Typography;

// ============================================================================
// TODO: DATABASE INTEGRATION
// ============================================================================
// This component handles column configuration and freeze functionality
//
// 1. Save column configuration to database
// 2. Implement drag-and-drop for column reordering
// 3. Save column freeze settings
// 4. Load saved column configurations
//
// Database tables:
//   - column_preferences: Store column configurations
//   - saved_views: Store complete view configurations
//
// ============================================================================

interface ColumnOptionsDrawerProps {
  visible: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onUpdateColumns: (columns: ColumnConfig[]) => void;
  showSavedFilters?: boolean;
  freezeMarkerIndex?: number;
  onUpdateFreezeMarker?: (index: number) => void;
}

export function ColumnOptionsDrawer({
  visible,
  onClose,
  columns,
  onUpdateColumns,
  showSavedFilters = false,
  freezeMarkerIndex: initialFreezeIndex = 6,
  onUpdateFreezeMarker,
}: ColumnOptionsDrawerProps) {
  // All available columns matching Week/Player View - DEFINE FIRST
  // These should match exactly what's displayed in the table
  const allColumns: ColumnConfig[] = [
    { key: 'surprise', displayName: 'Surprise', visible: true, order: 0, frozen: false, iconOnly: true },
    { key: 'recruitingCoach', displayName: 'RC', visible: true, order: 1, frozen: false },
    { key: 'name', displayName: 'Player', visible: true, order: 2, frozen: false },
    { key: 'year', displayName: 'Year', visible: true, order: 3, frozen: false },
    { key: 'position', displayName: 'Pos.', visible: true, order: 4, frozen: false },
    { key: 'rating', displayName: 'Rating', visible: true, order: 5, frozen: false },
    { key: 'highSchool', displayName: 'Highschool', visible: true, order: 6, frozen: true },
    { key: 'opponent', displayName: 'Opponent', visible: true, order: 7, frozen: false },
    { key: 'result', displayName: 'Results', visible: true, order: 8, frozen: false },
    { key: 'statsGameSummary', displayName: 'Stats/Game Summary', visible: true, order: 9, frozen: false },
    { key: 'gameDate', displayName: 'Game Date', visible: true, order: 10, frozen: false },
    { key: 'source', displayName: 'Source', visible: true, order: 11, frozen: false },
    { key: 'winLoss', displayName: 'W/L', visible: true, order: 12, frozen: false },
    { key: 'nextWeekOpponent', displayName: 'Next Week Opponent', visible: true, order: 13, frozen: false },
    { key: 'nextWeekHomeAway', displayName: 'Next Week H/A', visible: true, order: 14, frozen: false },
    { key: 'nextWeekDate', displayName: 'Next Week Date', visible: true, order: 15, frozen: false },
    { key: 'dateRange', displayName: 'Date Range', visible: false, order: 16, frozen: false },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [viewName, setViewName] = useState("");
  const [localShowSavedFilters, setLocalShowSavedFilters] = useState(true);
  const [savedSettings, setSavedSettings] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [freezeMarkerIndex, setFreezeMarkerIndex] = useState<number>(initialFreezeIndex);
  
  // Initialize with all columns visible by default
  // Merge incoming columns with allColumns to ensure displayName is always present
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(() => {
    if (columns.length > 0) {
      // Map columns to include displayName from allColumns
      return columns.map(col => {
        const fullCol = allColumns.find(ac => ac.key === col.key);
        return fullCol ? { ...fullCol, ...col } : col;
      });
    }
    return allColumns.filter(col => col.visible);
  });
  
  const handleToggleColumn = (columnKey: string) => {
    const updatedColumns = localColumns.map(col => 
      col.key === columnKey 
        ? { ...col, visible: !col.visible }
        : col
    );
    setLocalColumns(updatedColumns);
  };

  const handleSetFreeze = () => {
    // TODO: Implement column freeze logic
    console.log("Setting column freeze");
  };

  const handleReset = () => {
    // Reset to default column order
    const defaultColumns = allColumns.map((col, index) => ({
      ...col,
      order: index,
      frozen: col.key !== 'dateRange' && index <= 6, // Default: freeze up to highSchool
    }));
    setLocalColumns(defaultColumns);
    setFreezeMarkerIndex(6); // Reset freeze marker to after highSchool
    if (onUpdateFreezeMarker) {
      onUpdateFreezeMarker(6);
    }
  };

  const handleSave = () => {
    // ============================================================================
    // TODO: DATABASE INTEGRATION
    // ============================================================================
    // Save configuration to database
    // Save the column order and freeze point
    //
    // Example:
    // const { error } = await supabase
    //   .from('column_preferences')
    //   .upsert({
    //     user_id: currentUser.id,
    //     column_config: JSON.stringify(columnsWithFreeze),
    //     freeze_position: freezeMarkerIndex,
    //     updated_at: new Date().toISOString()
    //   });
    // ============================================================================
    
    // Set frozen flag based on position relative to freeze marker
    const columnsWithFreeze = localColumns.map((col, index) => ({
      ...col,
      visible: col.visible ?? true,
      frozen: index <= freezeMarkerIndex,
      order: index,
    }));
    
    onUpdateColumns(columnsWithFreeze);
    onClose();
  };

  const handleLoadSetting = (setting: any) => {
    // TODO: Load saved column configuration from database
    // Parse the column_config JSON and apply it to localColumns
    console.log("Load setting:", setting);
  };

  const handleEditSetting = (setting: any) => {
    // TODO: Edit saved column configuration
    console.log("Edit setting:", setting);
  };

  const handleDeleteSetting = async (settingId: string) => {
    // ============================================================================
    // TODO: DATABASE INTEGRATION
    // ============================================================================
    // Delete saved column setting from Supabase
    //
    // Example:
    // const { error } = await supabase
    //   .from('saved_column_settings')
    //   .delete()
    //   .eq('id', settingId)
    //   .eq('user_id', currentUser.id);
    //
    // For now, remove from local state:
    // ============================================================================
    setSavedSettings(savedSettings.filter(s => s.id !== settingId));
  };

  const handleSaveFilter = async () => {
    if (!viewName.trim()) {
      return;
    }

    // ============================================================================
    // TODO: DATABASE INTEGRATION
    // ============================================================================
    // Save column configuration to Supabase
    //
    // Example:
    // const { data, error } = await supabase
    //   .from('saved_column_settings')
    //   .insert({
    //     user_id: currentUser.id,
    //     name: viewName.trim(),
    //     column_config: JSON.stringify(localColumns),
    //     created_at: new Date().toISOString()
    //   })
    //   .select()
    //   .single();
    //
    // if (data) {
    //   setSavedSettings([data, ...savedSettings]);
    // }
    //
    // For now, add to local state:
    // ============================================================================
    const newSetting = {
      id: Date.now().toString(),
      name: viewName.trim(),
      icon: null,
      columnConfig: localColumns,
      createdAt: new Date().toISOString(),
    };
    
    setSavedSettings([newSetting, ...savedSettings]);
    setViewName(""); // Clear the input after saving
  };

  // ============================================================================
  // TODO: DATABASE INTEGRATION - Load saved column settings on mount
  // ============================================================================
  // useEffect(() => {
  //   const loadSavedSettings = async () => {
  //     const { data, error } = await supabase
  //       .from('saved_column_settings')
  //       .select('*')
  //       .eq('user_id', currentUser.id)
  //       .order('created_at', { ascending: false });
  //     
  //     if (data) {
  //       setSavedSettings(data);
  //     }
  //   };
  //   loadSavedSettings();
  // }, []);
  //
  // For now, using mock data:
  // ============================================================================
  useEffect(() => {
    // Mock saved settings - TODO: Replace with database query
    setSavedSettings([
      { id: '1', name: 'Organic Data Table', icon: 'icon-mail' },
      { id: '2', name: 'Sport Info Data Table', icon: null },
      { id: '3', name: 'Default Data Table', icon: null },
    ]);
  }, []);

  // Get columns in their sorted order from localColumns
  const sortedColumns = [...localColumns].sort((a, b) => a.order - b.order);
  
  // Build the final array with freeze marker inserted at the right position
  const columnsWithFreeze: any[] = [];
  for (let i = 0; i <= sortedColumns.length; i++) {
    if (i === freezeMarkerIndex + 1) {
      // Insert freeze marker here
      columnsWithFreeze.push({ key: 'freeze_marker', displayName: 'Column Freeze', visible: true, order: freezeMarkerIndex + 1, isFreezeMarker: true });
    }
    if (i < sortedColumns.length) {
      // Add the actual column
      columnsWithFreeze.push(sortedColumns[i]);
    }
  }

  // Apply search filter if needed
  const filteredColumns = searchQuery
    ? columnsWithFreeze.filter(col =>
        col.key === 'freeze_marker' || col.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : columnsWithFreeze;

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (!active || !over || active.id === over.id) return;

    // Get list of all items (including freeze marker)
    const allItems = filteredColumns;
    const oldIndex = allItems.findIndex(c => c.key === active.id);
    const newIndex = allItems.findIndex(c => c.key === over.id);

    // If we're moving the freeze marker
    if (active.id === 'freeze_marker') {
      // Move the freeze marker
      const moved = arrayMove(allItems, oldIndex, newIndex);
      // Find where freeze marker ended up
      const newFreezeIndex = moved.findIndex(c => c.key === 'freeze_marker');
      // Get the index before it (the column it's now after)
      const newIndexValue = newFreezeIndex - 1;
      setFreezeMarkerIndex(newIndexValue);
      if (onUpdateFreezeMarker) {
        onUpdateFreezeMarker(newIndexValue);
      }
    }
    // If we're moving a regular column
    else {
      // Temporarily remove freeze marker from indices
      const withoutFreeze = allItems.filter(c => c.key !== 'freeze_marker');
      const freezeIndexInList = allItems.findIndex(c => c.key === 'freeze_marker');
      
      // Adjust indices for freeze marker
      const oldIndexInWithoutFreeze = oldIndex > freezeIndexInList ? oldIndex - 1 : oldIndex;
      const newIndexInWithoutFreeze = newIndex > freezeIndexInList ? newIndex - 1 : newIndex;
      
      // Move the item
      const moved = arrayMove(withoutFreeze, oldIndexInWithoutFreeze, newIndexInWithoutFreeze);
      
      // Map back to actual column configs (not just display names)
      const updatedColumns = moved.map((col, index) => {
        const originalCol = localColumns.find(c => c.key === col.key) || col;
        return {
          ...originalCol,
          order: index,
        };
      });
      
      setLocalColumns(updatedColumns);
    }
  };

  return (
    <Drawer
      title={null}
      placement="right"
      onClose={onClose}
      open={visible}
      width={420}
      styles={{
        body: { padding: 0 },
        header: { display: 'none' }
      }}
      maskClosable={true}
      destroyOnClose={false}
    >
      <Flex vertical style={{ height: '100%', position: 'relative' }}>
        <Flex justify="space-between" align="center" style={{ padding: '16px', borderBottom: '1px solid rgba(18, 109, 184, 0.2)', background:'rgba(18, 109, 184, 0.1)' }}>
          <h4 style={{ margin: 0 }}>Table Column Options</h4>
          <Button 
            type="text" 
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </Flex>
        
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', paddingBottom: '400px' }}>
          <Text type="secondary" style={{ display: "block", marginBottom: "16px" }}>
            Add or remove columns, To change the column order, drag and drop fields
          </Text>

          {/* Search Input */}
          <Input
            placeholder="Search Columns..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ marginBottom: "16px" }}
          />

          {/* All columns - Draggable */}
          <SortableContext items={filteredColumns.map(col => col.key)} strategy={verticalListSortingStrategy}>
            {filteredColumns.map((column) => {
              const isVisible = localColumns.find(c => c.key === column.key)?.visible ?? column.visible;
              const isDateRange = column.key === 'dateRange';
              const isFreezeMarker = column.key === 'freeze_marker';
              
              return (
                <SortableColumnItem
                  key={column.key}
                  column={column}
                  onToggle={handleToggleColumn}
                  isVisible={isVisible}
                  isDateRange={isDateRange}
                  isFreezeMarker={isFreezeMarker}
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              );
            })}
          </SortableContext>

        {/* Sticky Footer Section */}
        <div style={{ 
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          borderTop: '1px solid #f0f0f0',
          boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10,
        }}>
          {/* Save View Input */}
          <div style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Input
                placeholder="Name these column settings (optional)"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                style={{ flex: 1 }}
              />
              <Button
                type="text"
                icon={<HeartOutlined style={{ fontSize: '16px' }} />}
                onClick={() => handleSaveFilter()}
                disabled={!viewName.trim()}
                style={{ color: "#ff4d4f" }}
                title={viewName.trim() ? "Save filter" : "Enter a name to save"}
              />
              <span 
                onClick={() => setLocalShowSavedFilters(!localShowSavedFilters)}
                style={{ cursor: 'pointer', fontSize: '18px' }}
                title={localShowSavedFilters ? "Hide saved settings" : "Show saved settings"}
              >
                <i className={localShowSavedFilters ? "icon-minus" : "icon-add"}></i>
              </span>
            </div>
            
            {/* Saved Settings List */}
            {localShowSavedFilters && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {/* TODO: DATABASE INTEGRATION - Load saved column settings from Supabase */}
                  {/* 
                    Example query to load saved column settings:
                    const { data, error } = await supabase
                      .from('saved_column_settings')
                      .select('*')
                      .eq('user_id', currentUser.id)
                      .order('created_at', { ascending: false });
                    
                    For now, using mock data:
                  */}
                  {savedSettings.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: "12px", display: "block", padding: "8px" }}>
                      No saved column settings
                    </Text>
                  ) : (
                    savedSettings.map((setting) => (
                      <div
                        key={setting.id}
                        style={{
                          padding: "8px",
                          marginBottom: "4px",
                          backgroundColor: "#f5f5f5",
                          borderRadius: "4px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}
                        onClick={() => handleLoadSetting(setting)}
                      >
                        <Space>
                          {setting.icon && <i className={setting.icon} style={{ fontSize: '16px' }}></i>}
                          <Text>{setting.name}</Text>
                        </Space>
                        <Space>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined style={{ fontSize: '16px' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditSetting(setting);
                            }}
                          />
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined style={{ fontSize: '16px' }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSetting(setting.id);
                            }}
                          />
                        </Space>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer Buttons */}
          <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Flex gap={8} justify="center">
              <Button size="large" onClick={handleReset} style={{ flex: 1 }}>
                Reset
              </Button>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleSave}
                style={{ flex: 1 }}
              >
                Save Changes
              </Button>
            </Flex>
          </div>
        </div>
        </div>
        </DndContext>
      </Flex>
    </Drawer>
  );
}

// Individual draggable column item component
function SortableColumnItem({ 
  column, 
  onToggle,
  isVisible,
  isDateRange = false,
  isFreezeMarker = false,
  dateRange = null,
  onDateRangeChange
}: { 
  column: ColumnConfig; 
  onToggle: (key: string) => void;
  isVisible: boolean;
  isDateRange?: boolean;
  isFreezeMarker?: boolean;
  dateRange?: [Dayjs | null, Dayjs | null] | null;
  onDateRangeChange?: (dates: [Dayjs | null, Dayjs | null] | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          padding: "8px 12px",
          marginBottom: "4px",
          backgroundColor: isFreezeMarker ? "#f5f5f5" : "#f5f5f5",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: isFreezeMarker ? "2px solid #1890ff" : undefined
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }} {...attributes} {...listeners}>
          {/* Drag handle - 2x3 grid of dots */}
          <div style={{ cursor: 'grab', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2px', padding: '4px' }}>
            <div style={{ width: '3px', height: '3px', backgroundColor: isFreezeMarker ? '#1890ff' : '#999', borderRadius: '50%' }} />
            <div style={{ width: '3px', height: '3px', backgroundColor: isFreezeMarker ? '#1890ff' : '#999', borderRadius: '50%' }} />
            <div style={{ width: '3px', height: '3px', backgroundColor: isFreezeMarker ? '#1890ff' : '#999', borderRadius: '50%' }} />
            <div style={{ width: '3px', height: '3px', backgroundColor: isFreezeMarker ? '#1890ff' : '#999', borderRadius: '50%' }} />
            <div style={{ width: '3px', height: '3px', backgroundColor: isFreezeMarker ? '#1890ff' : '#999', borderRadius: '50%' }} />
            <div style={{ width: '3px', height: '3px', backgroundColor: isFreezeMarker ? '#1890ff' : '#999', borderRadius: '50%' }} />
          </div>
          {isFreezeMarker ? (
            <Typography.Text strong style={{ cursor: 'grab', color: '#1890ff' }}>
              Column Freeze
            </Typography.Text>
          ) : column.iconOnly ? (
            // Icon-only column (like Surprise)
            <i className="icon-star" style={{ color: '#000', fontSize: '16px' }}></i>
          ) : (
            <Text style={{ cursor: 'grab' }}>{column.displayName}</Text>
          )}
        </div>
        {isDateRange ? (
          <DatePicker.RangePicker
            size="small"
            value={dateRange}
            onChange={(dates) => onDateRangeChange && onDateRangeChange(dates)}
            style={{ width: 150 }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <Button
            type="text"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(column.key);
            }}
          >
            {isVisible ? (
              <MinusOutlined style={{ color: "#ff4d4f", fontSize: '16px' }} />
            ) : (
              <PlusOutlined style={{ color: "#52c41a", fontSize: '16px' }} />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
