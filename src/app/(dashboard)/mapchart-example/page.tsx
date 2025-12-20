"use client";

import { useState, useRef } from "react";
import MapChart from "@/components/MapChart";
import InteractiveUSMap, { InteractiveUSMapRef } from "@/components/InteractiveUSMap";
import {
  Card,
  Space,
  Input,
  Button,
  Divider,
  Typography,
  Tabs,
  Collapse,
  Checkbox,
} from "antd";
import { 
  CloseOutlined, 
  SearchOutlined, 
  UpOutlined, 
  DownOutlined, 
  CaretRightOutlined, 
  CaretDownOutlined 
} from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Example page demonstrating how to use the MapChart component
 *
 * To use MapChart in your app:
 * 1. Create a map on mapchart.net
 * 2. Download the map as an image
 * 3. Upload it to your public folder or use an external URL
 * 4. Use the MapChart component with the image URL
 */
export default function MapChartExamplePage() {
  const [customMapUrl, setCustomMapUrl] = useState("");
  const [displayUrl, setDisplayUrl] = useState("");

  const handleLoadMap = () => {
    if (customMapUrl.trim()) {
      setDisplayUrl(customMapUrl.trim());
    }
  };

  const [selectedStatesData, setSelectedStatesData] = useState<any[]>([]);
  const [selectedCountiesData, setSelectedCountiesData] = useState<any[]>([]);
  const [allCountiesByState, setAllCountiesByState] = useState<Map<string, any[]>>(new Map());
  const [entireStateSelected, setEntireStateSelected] = useState<Set<string>>(new Set());
  const mapRef = useRef<InteractiveUSMapRef>(null);
  
  // UI state for the right panel
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [countiesToShow, setCountiesToShow] = useState<Map<string, number>>(new Map());
  const [statesToShow, setStatesToShow] = useState(10);
  // Mock coach assignments - in real app, this would come from API
  const [coachAssignments, setCoachAssignments] = useState<Map<string, string>>(new Map());

  const handleStateSelect = (states: any[], allCounties: any[]) => {
    // Create a set of currently selected state names for quick lookup
    const selectedStateNames = new Set(states.map(s => s.name.trim()));
    
    setSelectedStatesData(states);
    
    // Completely rebuild the counties map - don't merge with old data
    const newCountiesMap = new Map<string, any[]>();
    
    // Only process counties that belong to currently selected states
    allCounties.forEach((county) => {
      if (county && county.state) {
        const stateName = county.state.trim();
        // Only add counties from currently selected states
        if (selectedStateNames.has(stateName)) {
          if (!newCountiesMap.has(stateName)) {
            newCountiesMap.set(stateName, []);
          }
          newCountiesMap.get(stateName)!.push(county);
        }
      }
    });
    
    // Set the new map (this completely replaces the old one)
    setAllCountiesByState(newCountiesMap);
    
    // Auto-expand first state if none are expanded
    if (states.length > 0 && expandedStates.size === 0) {
      setExpandedStates(new Set([states[0].name.trim()]));
    }
    
    console.log("Selected States:", states);
    console.log("All Counties from selected states:", allCounties);
    console.log("New Counties Map:", Array.from(newCountiesMap.entries()));
  };

  const handleCountySelect = (counties: any[]) => {
    // Filter counties to only include those from currently selected states
    const selectedStateNames = new Set(selectedStatesData.map(s => s.name.trim()));
    const filteredCounties = counties.filter(county => 
      county && county.state && selectedStateNames.has(county.state.trim())
    );
    setSelectedCountiesData(filteredCounties);
    // Don't automatically update checkbox state - only user clicks should control it
  };

  const handleSelectEntireState = (stateName: string, stateId: string, checked: boolean) => {
    const normalizedStateName = stateName.trim();
    
    if (!mapRef.current) {
      return;
    }
    
    // Always call the map method - it handles the toggle logic internally
    // The method checks if all are selected and toggles accordingly
    mapRef.current.selectAllCountiesForState(normalizedStateName, stateId);
    
    // Update checkbox state based on user action
    if (checked) {
      setEntireStateSelected(new Set([...entireStateSelected, normalizedStateName]));
    } else {
      const newEntireStateSelected = new Set(entireStateSelected);
      newEntireStateSelected.delete(normalizedStateName);
      setEntireStateSelected(newEntireStateSelected);
    }
  };

  const handleRemoveCounty = (countyId: string) => {
    if (!mapRef.current) {
      return;
    }
    mapRef.current.deselectCounty(countyId);
  };

  // Toggle state expansion
  const toggleStateExpansion = (stateName: string) => {
    const newExpanded = new Set(expandedStates);
    if (newExpanded.has(stateName)) {
      newExpanded.delete(stateName);
    } else {
      newExpanded.add(stateName);
    }
    setExpandedStates(newExpanded);
  };

  // Get counties to display for a state (with pagination)
  const getCountiesToDisplay = (stateName: string, allCounties: any[]) => {
    const limit = countiesToShow.get(stateName) || 10;
    return allCounties.slice(0, limit);
  };

  // Show more counties for a state
  const showMoreCounties = (stateName: string, totalCount: number) => {
    const current = countiesToShow.get(stateName) || 10;
    setCountiesToShow(new Map(countiesToShow.set(stateName, Math.min(current + 10, totalCount))));
  };

  // Handle coach assignment
  const handleAssignCoach = (countyId: string, countyName: string) => {
    // In real app, this would open a modal to select a coach
    // For now, we'll use mock data
    const mockCoaches = ["Joe Smith", "Alex D'cock", "John Doe"];
    const randomCoach = mockCoaches[Math.floor(Math.random() * mockCoaches.length)];
    setCoachAssignments(new Map(coachAssignments.set(countyId, randomCoach)));
  };

  // Handle delete all assignments for a state
  const handleDeleteAllAssignments = (stateName: string, counties: any[]) => {
    const newAssignments = new Map(coachAssignments);
    counties.forEach(county => {
      newAssignments.delete(county.id);
    });
    setCoachAssignments(newAssignments);
  };

  // Get coach count for a state
  const getCoachCountForState = (counties: any[]) => {
    const uniqueCoaches = new Set<string>();
    counties.forEach(county => {
      const coach = coachAssignments.get(county.id);
      if (coach) {
        uniqueCoaches.add(coach);
      }
    });
    return uniqueCoaches.size;
  };

  // Filter states and counties based on search
  const filteredStatesData = selectedStatesData.filter(state => {
    if (!searchQuery) return true;
    const stateName = state.name.toLowerCase();
    const counties = allCountiesByState.get(state.name.trim()) || [];
    const countyMatches = counties.some(county => 
      county.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return stateName.includes(searchQuery.toLowerCase()) || countyMatches;
  });

  return (
    <div
      style={{
        padding: "0",
        maxWidth: "100%",
        margin: "0 auto",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Interactive US Map */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <InteractiveUSMap
          ref={mapRef}
          onStateSelect={handleStateSelect}
          onCountySelect={handleCountySelect}
          height="calc(90vh - 20px)"
          title="Assign Coaches"
        />

        {/* Display selected data */}
        {(selectedStatesData.length > 0 || selectedCountiesData.length > 0) && (
          <div
            style={{
              textAlign: "left",
              display: "block",
              backgroundColor: "#fff",
              padding: "16px",
              marginTop: "16px",
            }}
          >
            {(() => {
              // Group selected counties by state
              const countiesByState = new Map<
                string,
                typeof selectedCountiesData
              >();
              selectedCountiesData.forEach((county) => {
                if (county && county.state) {
                  const stateName = county.state.trim();
                  if (!countiesByState.has(stateName)) {
                    countiesByState.set(stateName, []);
                  }
                  countiesByState.get(stateName)!.push(county);
                }
              });

              return (
                <div>
                  {selectedStatesData.map((state) => {
                    const stateName = state.name.trim();
                    const countiesForState =
                      countiesByState.get(stateName) || [];

                    return (
                      <div key={state.id} className="state-county-list-item">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "10px",
                            
                          }}
                        >
                          <h4 className="!text-[40px] font-bold !mb-0 leading-[40px]">
                            {state.name}
                          </h4>
                           <Checkbox
                             checked={entireStateSelected.has(stateName)}
                             onChange={(e) => handleSelectEntireState(stateName, state.id, e.target.checked)}
                           >
                             <h6 className="!text-[16px] italic leading-[16px] !mb-0 !mt-1">
                               Select Entire State
                             </h6>
                           </Checkbox>
                        </div>
                        {countiesForState.length > 0 ? (
                          <div className="flex gap-1 flex-wrap mb-0">
                            {countiesForState.map((county, index) => (
                              <h6 
                                key={index} 
                                className="county-list-item"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  paddingRight: "4px",
                                }}
                              >
                                {county.name}
                                <CloseOutlined
                                  onClick={() => handleRemoveCounty(county.id)}
                                  style={{
                                    cursor: "pointer",
                                    fontSize: "12px",
                                    marginLeft: "4px",
                                    backgroundColor: "#fff",
                                    padding: "2px 4px",
                                    borderRadius: "50px",
                                    color: "#1c1d4d",
                                    width: "20px",
                                    height: "20px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                />
                              </h6>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary">No counties selected</Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <div className="w-[340px] ml-3">
        <div
          style={{
            marginBottom: "24px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "US States & County",
                children: (
                  <div>
                    {/* Search Bar */}
                    <Input
                      placeholder="Search..."
                      prefix={<SearchOutlined />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ marginBottom: "16px" }}
                    />

                    {/* States List */}
                    {filteredStatesData.length > 0 ? (
                      <div>
                        {filteredStatesData.slice(0, statesToShow).map((state) => {
                          const stateName = state.name.trim();
                          // Get only SELECTED counties from this state (counties that were clicked)
                          const selectedCountiesForState = selectedCountiesData.filter(
                            (county) => county && county.state && county.state.trim() === stateName
                          );
                          const isExpanded = expandedStates.has(stateName);
                          const countiesToDisplay = isExpanded ? getCountiesToDisplay(stateName, selectedCountiesForState) : [];
                          const coachCount = getCoachCountForState(selectedCountiesForState);
                          const hasMoreCounties = countiesToDisplay.length < selectedCountiesForState.length;

                          return (
                            <div
                              key={state.id}
                              style={{
                                borderBottom: "1px solid #f0f0f0",
                                paddingBottom: "16px",
                                marginBottom: "16px",
                              }}
                            >
                              {/* State Header */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  cursor: "pointer",
                                  marginBottom: "8px",
                                }}
                                onClick={() => toggleStateExpansion(stateName)}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {isExpanded ? (
                                    <CaretDownOutlined style={{ fontSize: "12px", color: "#1c1d4d" }} />
                                  ) : (
                                    <CaretRightOutlined style={{ fontSize: "12px", color: "#1c1d4d" }} />
                                  )}
                                  <Text strong style={{ fontSize: "16px", color: "#1c1d4d" }}>
                                    {state.name}
                                  </Text>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                  <Text type="secondary" style={{ fontSize: "14px" }}>
                                    {selectedCountiesForState.length} Counties
                                  </Text>
                                  {coachCount > 0 && (
                                    <>
                                      <Text type="secondary" style={{ fontSize: "14px" }}>
                                        {coachCount} Coaches
                                      </Text>
                                      <Button
                                        type="link"
                                        danger
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteAllAssignments(stateName, selectedCountiesForState);
                                        }}
                                        style={{ padding: 0, fontSize: "12px", textDecoration: "underline" }}
                                      >
                                        Delete all assignments
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Counties List */}
                              {isExpanded && (
                                <div style={{ marginLeft: "20px", marginTop: "8px" }}>
                                  {countiesToDisplay.length > 0 ? (
                                    <>
                                      {countiesToDisplay.map((county, index) => {
                                        const assignedCoach = coachAssignments.get(county.id);
                                        const isUnassigned = !assignedCoach;
                                        
                                        return (
                                          <div
                                            key={county.id}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              padding: "8px 0",
                                              backgroundColor: isUnassigned ? "#f6ffed" : "transparent",
                                              borderBottom: index < countiesToDisplay.length - 1 ? "1px solid #f0f0f0" : "none",
                                            }}
                                          >
                                            <Text style={{ fontSize: "14px", color: "#1c1d4d" }}>
                                              {county.name}
                                            </Text>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                              {assignedCoach ? (
                                                <>
                                                  <Text style={{ fontSize: "14px", color: "#1c1d4d" }}>
                                                    {assignedCoach}
                                                  </Text>
                                                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                                    <UpOutlined style={{ fontSize: "10px", color: "#1c1d4d", cursor: "pointer" }} />
                                                    <DownOutlined style={{ fontSize: "10px", color: "#1c1d4d", cursor: "pointer" }} />
                                                  </div>
                                                </>
                                              ) : (
                                                <Button
                                                  type="link"
                                                  size="small"
                                                  onClick={() => handleAssignCoach(county.id, county.name)}
                                                  style={{ padding: 0, fontSize: "12px", textDecoration: "underline" }}
                                                >
                                                  Assign
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                      {hasMoreCounties && (
                                        <Button
                                          type="link"
                                          size="small"
                                          onClick={() => showMoreCounties(stateName, selectedCountiesForState.length)}
                                          style={{ 
                                            marginTop: "8px", 
                                            padding: 0, 
                                            fontSize: "12px",
                                            textDecoration: "underline",
                                            color: "#1890ff"
                                          }}
                                        >
                                          Show more counties...
                                        </Button>
                                      )}
                                    </>
                                  ) : (
                                    <Text type="secondary" style={{ fontSize: "14px" }}>
                                      No counties selected
                                    </Text>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {filteredStatesData.length > statesToShow && (
                          <Button
                            type="link"
                            size="small"
                            onClick={() => setStatesToShow(statesToShow + 10)}
                            style={{ 
                              marginTop: "8px", 
                              padding: 0, 
                              fontSize: "12px",
                              textDecoration: "underline",
                              color: "#1890ff"
                            }}
                          >
                            Show more states
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Text type="secondary">No states selected. Select states on the map to view counties.</Text>
                    )}
                  </div>
                ),
              },
              {
                key: "2",
                label: "Coaches",
                children: (
                  <Collapse
                    items={[
                      {
                        key: "1",
                        label: "Coach List",
                        children: (
                          <div>
                            <Text>List of coaches will be displayed here.</Text>
                          </div>
                        ),
                      },
                      {
                        key: "2",
                        label: "Coach Details",
                        children: (
                          <div>
                            <Text>
                              Detailed coach information will be shown here.
                            </Text>
                          </div>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
