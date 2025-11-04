"use client";

import React, { useState } from 'react';
import { Button, Input, List, Popconfirm, message, Tooltip } from 'antd';
import { HeartOutlined, HeartFilled, SearchOutlined, DeleteOutlined } from '@ant-design/icons';
import { FilterConfig } from './FilterConfig';

// ============================================================================
// SAVED FILTERS COMPONENT
// ============================================================================
// Handles saving, loading, and managing saved filter configurations
// Used across all filter components for consistent save functionality
// ============================================================================

export interface SavedFilter {
  id: string;
  name: string;
  config: Record<string, unknown>;
  createdAt: string;
  isActive?: boolean;
}

interface SavedFiltersProps {
  currentFilters: Record<string, unknown>;
  onLoadFilter: (filters: Record<string, unknown>) => void;
  onSaveFilter: (filter: SavedFilter) => void;
  onDeleteFilter: (filterId: string) => void;
  savedFilters: SavedFilter[];
  className?: string;
}

export function SavedFilters({
  currentFilters,
  onLoadFilter,
  onSaveFilter,
  onDeleteFilter,
  savedFilters,
  className = ""
}: SavedFiltersProps) {
  const [filterName, setFilterName] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [showSavedFilters, setShowSavedFilters] = useState(false);

  // Check if current filter configuration is already saved
  const isCurrentFilterSaved = (): boolean => {
    return savedFilters.some(filter => 
      JSON.stringify(filter.config) === JSON.stringify(currentFilters)
    );
  };

  // Handle saving current filter
  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      message.warning('Please enter a filter name');
      return;
    }

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName.trim(),
      config: { ...currentFilters },
      createdAt: new Date().toISOString(),
      isActive: false
    };

    onSaveFilter(newFilter);
    setFilterName("");
    message.success('Filter saved successfully');
  };

  // Handle loading a saved filter
  const handleLoadFilter = (filter: SavedFilter) => {
    onLoadFilter(filter.config);
    message.success(`Loaded filter: ${filter.name}`);
  };

  // Handle deleting a saved filter
  const handleDeleteFilter = (filterId: string) => {
    onDeleteFilter(filterId);
    message.success('Filter deleted successfully');
  };

  // Filter saved filters based on search
  const filteredSavedFilters = savedFilters.filter(filter =>
    filter.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className={`saved-filters ${className}`}>
      {/* Save Filter Input */}
      <Tooltip title="Coming Soon" placement="top">
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px",
          marginBottom: "12px",
          opacity: 0.5,
          pointerEvents: "none"
        }}>
          <Input
            placeholder="Name this filter"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            style={{ flex: 1 }}
            onPressEnter={handleSaveFilter}
            disabled
          />
          <Button
            type="text"
            icon={isCurrentFilterSaved() ? 
              <HeartFilled style={{ color: "#ff4d4f", fontSize: '16px' }} /> : 
              <HeartOutlined style={{ color: "#ff4d4f", fontSize: '16px' }} />
            }
            onClick={handleSaveFilter}
            disabled
            title="Coming Soon"
          />
          <Button
            type="text"
            icon={<SearchOutlined />}
            onClick={() => setShowSavedFilters(!showSavedFilters)}
            disabled
            title="Coming Soon"
          />
        </div>
      </Tooltip>

      {/* Original Save Filter Input - Commented Out */}
      {/* 
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "8px",
        marginBottom: "12px"
      }}>
        <Input
          placeholder="Name this filter"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
          style={{ flex: 1 }}
          onPressEnter={handleSaveFilter}
        />
        <Button
          type="text"
          icon={isCurrentFilterSaved() ? 
            <HeartFilled style={{ color: "#ff4d4f", fontSize: '16px' }} /> : 
            <HeartOutlined style={{ color: "#ff4d4f", fontSize: '16px' }} />
          }
          onClick={handleSaveFilter}
          disabled={isCurrentFilterSaved()}
          title={isCurrentFilterSaved() ? "Filter is already saved" : "Save filter"}
        />
        <Button
          type="text"
          icon={<SearchOutlined />}
          onClick={() => setShowSavedFilters(!showSavedFilters)}
          title={showSavedFilters ? "Hide saved filters" : "Show saved filters"}
        />
      </div>
      */}

      {/* Saved Filters List */}
      {showSavedFilters && (
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          padding: '12px',
          backgroundColor: '#fafafa'
        }}>
          <Input
            placeholder="Search saved filters"
            prefix={<SearchOutlined />}
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            style={{ marginBottom: "12px" }}
          />
          
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {filteredSavedFilters.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                padding: '20px',
                fontSize: '14px'
              }}>
                {searchFilter ? 'No filters match your search' : 'No saved filters yet'}
              </div>
            ) : (
              <List
                dataSource={filteredSavedFilters}
                renderItem={(filter) => (
                  <List.Item
                    style={{
                      padding: '8px 0',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer'
                    }}
                    actions={[
                      <Button
                        key="load"
                        type="text"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLoadFilter(filter);
                        }}
                        style={{ color: '#1890ff' }}
                      >
                        Load
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="Delete this filter?"
                        description="This action cannot be undone."
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDeleteFilter(filter.id);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Delete"
                        cancelText="Cancel"
                      >
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                          style={{ color: '#ff4d4f' }}
                        />
                      </Popconfirm>
                    ]}
                    onClick={() => handleLoadFilter(filter)}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px' 
                        }}>
                          <span style={{ fontWeight: 500 }}>{filter.name}</span>
                          {filter.isActive && (
                            <span style={{ 
                              fontSize: '10px', 
                              color: '#52c41a',
                              backgroundColor: '#f6ffed',
                              padding: '2px 6px',
                              borderRadius: '2px',
                              border: '1px solid #b7eb8f'
                            }}>
                              ACTIVE
                            </span>
                          )}
                        </div>
                      }
                      description={
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          Saved {new Date(filter.createdAt).toLocaleDateString()}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const saveFilterToStorage = (filter: SavedFilter): void => {
  try {
    const saved = getSavedFiltersFromStorage();
    const updated = [...saved, filter];
    localStorage.setItem('savedFilters', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving filter to storage:', error);
  }
};

export const getSavedFiltersFromStorage = (): SavedFilter[] => {
  try {
    const saved = localStorage.getItem('savedFilters');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Error loading filters from storage:', error);
    return [];
  }
};

export const deleteFilterFromStorage = (filterId: string): void => {
  try {
    const saved = getSavedFiltersFromStorage();
    const updated = saved.filter(f => f.id !== filterId);
    localStorage.setItem('savedFilters', JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting filter from storage:', error);
  }
};
