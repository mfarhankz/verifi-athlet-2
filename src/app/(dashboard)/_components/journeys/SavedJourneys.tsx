"use client";

import React, { useState } from 'react';
import { Button, Input, Popconfirm, message } from 'antd';
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons';

// ============================================================================
// SAVED JOURNEYS COMPONENT
// ============================================================================
// Handles saving, loading, and managing saved journey configurations
// Similar to SavedFilters but for road planner journeys
// ============================================================================

export interface SavedJourney {
  id: string | number;
  name: string;
  journeyDetails: Record<string, any>;
  createdAt: string;
}

interface SavedJourneysProps {
  onLoadJourney: (journeyDetails: Record<string, any>) => void;
  onSaveJourney: (journey: SavedJourney) => void;
  onDeleteJourney: (journeyId: string | number) => void;
  savedJourneys: SavedJourney[];
  className?: string;
}

export function SavedJourneys({
  onLoadJourney,
  onSaveJourney,
  onDeleteJourney,
  savedJourneys,
  className = ""
}: SavedJourneysProps) {
  const [journeyName, setJourneyName] = useState("");
  const [searchJourney, setSearchJourney] = useState("");
  const [showSavedJourneys, setShowSavedJourneys] = useState(false);

  // Handle saving current journey
  const handleSaveJourney = () => {
    if (!journeyName.trim()) {
      message.warning('Please enter a journey name');
      return;
    }

    // This will be called from parent with actual journey details
    // For now, just trigger the save callback
    message.warning('Please use the Save button next to the journey name input');
  };

  // Handle loading a saved journey
  const handleLoadJourney = (journey: SavedJourney) => {
    onLoadJourney(journey.journeyDetails);
    message.success(`Loaded journey: ${journey.name}`);
  };

  // Handle deleting a saved journey
  const handleDeleteJourney = (journeyId: string | number) => {
    onDeleteJourney(journeyId);
    message.success('Journey deleted successfully');
  };

  // Filter saved journeys based on search
  const filteredSavedJourneys = savedJourneys.filter(journey =>
    journey.name.toLowerCase().includes(searchJourney.toLowerCase())
  );

  return (
    <div className={`saved-journeys ${className}`} style={{ position: 'relative' }}>
      {/* Toggle button */}
      <Button
        type="text"
        icon={<SearchOutlined />}
        onClick={() => setShowSavedJourneys(!showSavedJourneys)}
        title={showSavedJourneys ? "Hide saved journeys" : "Show saved journeys"}
      />

      {/* Saved Journeys List */}
      {showSavedJourneys && (
        <div style={{ 
          border: '1px solid #f0f0f0',
          borderRadius: '6px',
          padding: '12px',
          backgroundColor: '#fafafa',
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 1000,
          marginTop: '8px',
          minWidth: '300px',
          maxHeight: '400px',
          overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          <Input
            placeholder="Search saved journeys"
            prefix={<SearchOutlined />}
            value={searchJourney}
            onChange={(e) => setSearchJourney(e.target.value)}
            style={{ marginBottom: "12px" }}
          />
          
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {filteredSavedJourneys.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#999', 
                padding: '20px',
                fontSize: '14px'
              }}>
                {searchJourney ? 'No journeys match your search' : 'No saved journeys yet'}
              </div>
            ) : (
              <div>
                {filteredSavedJourneys.map((journey) => (
                  <div
                    key={journey.id}
                    onClick={() => {
                      handleLoadJourney(journey);
                      setShowSavedJourneys(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      flex: 1,
                      minWidth: 0
                    }}>
                      <span style={{ 
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {journey.name}
                      </span>
                    </div>
                    <Popconfirm
                      title="Delete this journey?"
                      description="This journey will be removed and cannot be undone."
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteJourney(journey.id);
                      }}
                      onCancel={(e) => e?.stopPropagation()}
                      okText="Delete"
                      cancelText="Cancel"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        style={{ 
                          color: '#ff4d4f',
                          flexShrink: 0
                        }}
                      />
                    </Popconfirm>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

