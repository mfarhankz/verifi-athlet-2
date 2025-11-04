"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input, Button } from "antd";
import { 
  SearchOutlined, 
  PlusOutlined
} from "@ant-design/icons";
import "./ChooseBoardDropdown.css";

interface SettingsDropdownProps {
  /** Whether the dropdown is visible */
  isVisible: boolean;
  /** Callback to close the dropdown */
  onClose: () => void;
  /** Callback when an item is selected */
  onSelect: (itemName: string) => void;
  /** Callback when a new item is created */
  onNewItem?: (itemName: string) => void;
  /** Whether to show the create new item input */
  allowCreate?: boolean;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Placeholder text for new item input */
  newItemPlaceholder?: string;
  /** List of items to display */
  items: Array<{ id: string; name: string }>;
  /** Trigger element (button) to anchor the dropdown to */
  trigger: React.ReactNode;
  /** Position relative to trigger */
  placement?: 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
}

export default function SettingsDropdown({
  isVisible,
  onClose,
  onSelect,
  onNewItem,
  allowCreate = true,
  searchPlaceholder = "Search...",
  newItemPlaceholder = "Name this setting",
  items = [],
  trigger,
  placement = 'bottomLeft'
}: SettingsDropdownProps) {
  const [searchValue, setSearchValue] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [filteredItems, setFilteredItems] = useState(items);
  const [creatingItem, setCreatingItem] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter items based on search
  useEffect(() => {
    if (searchValue.trim() === "") {
      setFilteredItems(items);
    } else {
      const filtered = items.filter(item =>
        item.name.toLowerCase().includes(searchValue.toLowerCase())
      );
      setFilteredItems(filtered);
    }
  }, [searchValue, items]);

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

  const handleSelectItem = (itemName: string) => {
    onSelect(itemName);
    onClose();
    setSearchValue("");
  };

  const handleCreateItem = () => {
    if (!newItemName.trim()) return;
    
    // Check if item name already exists
    const itemExists = items.some(
      item => item.name.toLowerCase() === newItemName.trim().toLowerCase()
    );

    if (itemExists) {
      handleSelectItem(newItemName.trim());
      return;
    }

    setCreatingItem(true);
    
    // Call onNewItem if provided, otherwise just select it
    if (onNewItem) {
      onNewItem(newItemName.trim());
      setNewItemName("");
      setCreatingItem(false);
    } else {
      // TODO: PM will implement actual save/create logic
      setTimeout(() => {
        handleSelectItem(newItemName.trim());
        setNewItemName("");
        setCreatingItem(false);
      }, 100);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (!isVisible) return null;

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
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                prefix={<SearchOutlined className="search-icon" />}
                className="search-input"
                size="large"
              />
            </div>

            {/* Items list */}
            <div className="choose-board-list">
              {filteredItems.length === 0 ? (
                <div className="no-boards">
                  {searchValue ? "No items found" : "No saved items yet"}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="board-item"
                    onClick={() => handleSelectItem(item.name)}
                  >
                    <span className="board-name">{item.name}</span>
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      className="add-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectItem(item.name);
                      }}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Create new item input */}
            {allowCreate && (
              <div className="choose-board-create">
                <Input
                  placeholder={newItemPlaceholder}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, handleCreateItem)}
                  size="large"
                  className="new-board-input"
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  className="create-button"
                  onClick={handleCreateItem}
                  loading={creatingItem}
                  disabled={!newItemName.trim()}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

