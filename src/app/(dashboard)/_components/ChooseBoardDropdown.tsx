"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input, Button } from "antd";
import { EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { 
  SearchOutlined, 
  PlusOutlined
} from "@ant-design/icons";
import { fetchRecruitingBoards, createRecruitingBoard, updateRecruitingBoardName, deleteRecruitingBoard, updateRecruitingBoardOrder } from "@/lib/queries";
import { RecruitingBoardBoard } from "@/types/database";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import "./ChooseBoardDropdown.css";
import "./ChooseBoardModal.css"; // Also import modal styles for backward compat

interface ChooseBoardDropdownProps {
  /** Whether the dropdown is visible */
  isVisible: boolean;
  /** Callback to close the dropdown */
  onClose: () => void;
  /** Callback when a board is selected - receives the board/position name */
  onSelect: (boardName: string) => void;
  /** Callback when a board is deleted - receives the board ID */
  onDelete?: (boardId: string, boardName: string) => void;
  /** Callback when a board is renamed - receives the board ID and new name */
  onRename?: (boardId: string, newName: string) => void;
  /** The customer ID to fetch boards for */
  customerId: string | null;
  /** Trigger element (button) to anchor the dropdown to */
  trigger: React.ReactNode;
  /** Position relative to trigger */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
  /** Current selected board ID */
  currentBoardId?: string | null;
  /** Simple mode: hide management features (add/edit/delete/drag) */
  simpleMode?: boolean;
}

// Using RecruitingBoardBoard from database types

// Sortable board item component
function SortableBoardItem({ 
  board, 
  onAddToBoard,
  onDelete,
  onRename,
  isSelected,
  simpleMode = false
}: { 
  board: RecruitingBoardBoard; 
  onAddToBoard: (boardId: string, name: string) => void;
  onDelete?: (boardId: string, boardName: string) => void;
  onRename?: (boardId: string, newName: string) => void;
  isSelected?: boolean;
  simpleMode?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(board.name);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id, disabled: simpleMode });

  const style = simpleMode ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={simpleMode ? undefined : setNodeRef}
      style={style}
      className={`board-item ${isSelected ? 'board-item-selected' : ''} ${simpleMode ? 'simple-mode' : ''}`}
      onClick={(e) => {
        // Only select board if clicking on the row itself, not on buttons
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('board-name')) {
          onAddToBoard(board.id, board.name);
        }
      }}
    >
      {isEditing && !simpleMode ? (
        <Input
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => {
            if (onRename && editValue.trim() && editValue !== board.name) {
              onRename(board.id, editValue.trim());
            }
            setIsEditing(false);
          }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              if (onRename && editValue.trim() && editValue !== board.name) {
                onRename(board.id, editValue.trim());
              }
              setIsEditing(false);
            } else if (e.key === 'Escape') {
              setEditValue(board.name);
              setIsEditing(false);
            }
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          <span className="board-name">
            {board.name}
          </span>
          {onRename && !simpleMode && (
            <Button
              type="text"
              icon={<EditOutlined />}
              className="edit-button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            />
          )}
        </>
      )}
      
      {/* Delete button (trash can) - hide in simple mode */}
      {onDelete && !isEditing && !simpleMode ? (
        <Button
          type="text"
          icon={<DeleteOutlined />}
          className="delete-button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(board.id, board.name);
          }}
          danger
        />
      ) : null}
      
      {/* Drag handle on the right - hide in simple mode */}
      {!simpleMode && (
        <div 
          className="drag-handle"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <svg viewBox="0 0 20 20" width="12">
            <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function ChooseBoardDropdown({
  isVisible,
  onClose,
  onSelect,
  onDelete,
  onRename,
  customerId,
  trigger,
  placement = 'bottomLeft',
  currentBoardId,
  simpleMode = false
}: ChooseBoardDropdownProps) {
  const [boards, setBoards] = useState<RecruitingBoardBoard[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [newBoardName, setNewBoardName] = useState("");
  const [filteredBoards, setFilteredBoards] = useState<RecruitingBoardBoard[]>([]);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter boards based on search
  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredBoards(boards);
    } else {
      const filtered = boards.filter(board =>
        board.name.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredBoards(filtered);
    }
  }, [searchValue, boards]);

  // Fetch boards when dropdown opens
  useEffect(() => {
    if (isVisible && customerId) {
      loadBoards();
    }
  }, [isVisible, customerId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        dropdownRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isVisible, onClose]);

  const loadBoards = async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const boardsData = await fetchRecruitingBoards(customerId);
      setBoards(boardsData);
      setFilteredBoards(boardsData);
    } catch (error) {
      console.error("Error loading boards:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToBoard = (boardId: string, boardName: string) => {
    onSelect(boardName);
    onClose();
    setSearchValue("");
    setNewBoardName("");
  };

  const handleCreateBoard = async () => {
    if (!customerId || !newBoardName.trim()) return;

    // Check if board name already exists
    const boardExists = boards.some(
      board => board.name.toLowerCase() === newBoardName.trim().toLowerCase()
    );

    if (boardExists) {
      const existingBoard = boards.find(b => b.name.toLowerCase() === newBoardName.trim().toLowerCase());
      if (existingBoard) {
        onSelect(newBoardName.trim());
        onClose();
        setNewBoardName("");
      }
      return;
    }

    setCreatingBoard(true);
    try {
      await createRecruitingBoard(customerId, newBoardName.trim());
      await loadBoards();
      onSelect(newBoardName.trim());
      onClose();
      setNewBoardName("");
    } catch (error) {
      console.error("Error creating board:", error);
      alert("Failed to create board. Please try again.");
    } finally {
      setCreatingBoard(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredBoards.findIndex(board => board.id === active.id);
      const newIndex = filteredBoards.findIndex(board => board.id === over?.id);

      const newBoards = arrayMove(filteredBoards, oldIndex, newIndex);
      setFilteredBoards(newBoards);
      setBoards(newBoards); // Update main boards list too

      if (customerId) {
        try {
          const updates = newBoards.map((board, index) => ({
            id: board.id,
            display_order: index + 1
          }));
          await updateRecruitingBoardOrder(updates);
        } catch (error) {
          console.error('Error updating board order:', error);
          // Revert on error
          await loadBoards();
        }
      }
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger element */}
      <div ref={triggerRef}>
        {trigger}
      </div>

      {/* Dropdown */}
      {isVisible && (
        <div 
          ref={dropdownRef}
          className={`choose-board-dropdown choose-board-dropdown-${placement}`}
        >
          <div className="choose-board-dropdown-content">
            {/* Search input */}
            <div className="choose-board-search">
              <Input
              placeholder="Board Name..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              prefix={<SearchOutlined className="search-icon" />}
              className="search-input"
              size="large"
              />
            </div>

            {/* Board list */}
            <div className="choose-board-list">
              {loading ? (
                <div className="loading-boards">Loading boards...</div>
              ) : filteredBoards.length === 0 ? (
                <div className="no-boards">
                  {searchValue ? "No boards found" : "No boards yet"}
                </div>
              ) : simpleMode ? (
                // Simple mode: no drag and drop, just a list
                filteredBoards.map((board) => (
                  <SortableBoardItem
                    key={board.id}
                    board={board}
                    onAddToBoard={handleAddToBoard}
                    isSelected={board.id === currentBoardId}
                    simpleMode={true}
                  />
                ))
              ) : (
                // Full mode: with drag and drop and management features
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredBoards.map(board => board.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredBoards.map((board) => (
                      <SortableBoardItem
                        key={board.id}
                        board={board}
                        onAddToBoard={handleAddToBoard}
                        isSelected={board.id === currentBoardId}
                        simpleMode={false}
                        onDelete={async (id, name) => {
                          if (window.confirm(`Are you sure you want to delete "${name}"?\n\nThis will soft-delete the board. All athletes and columns will be preserved but hidden.`)) {
                            try {
                              await deleteRecruitingBoard(id);
                              await loadBoards();
                              if (onDelete) {
                                onDelete(id, name);
                              }
                            } catch (error) {
                              console.error('Error deleting board:', error);
                              alert('Failed to delete board. Please try again.');
                            }
                          }
                        }}
                        onRename={async (id, newName) => {
                          try {
                            await updateRecruitingBoardName(id, newName);
                            await loadBoards();
                            if (onRename) {
                              onRename(id, newName);
                            }
                          } catch (error) {
                            console.error('Error renaming board:', error);
                            alert('Failed to rename board. Please try again.');
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Create new board input - hide in simple mode */}
            {!simpleMode && (
              <div className="choose-board-create">
              <Input
                placeholder="Start a New Board"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handleCreateBoard)}
                size="large"
                className="new-board-input"
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                className="create-button"
                onClick={handleCreateBoard}
                loading={creatingBoard}
                disabled={!newBoardName.trim()}
              />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

