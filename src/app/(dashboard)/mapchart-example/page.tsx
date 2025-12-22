"use client";

import { useState, useRef } from "react";
import MapChart from "@/components/MapChart";
import InteractiveUSMap, {
  InteractiveUSMapRef,
} from "@/components/InteractiveUSMap";
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
  Modal,
  Select,
  Radio,
  Avatar,
  Tag,
} from "antd";
import {
  CloseOutlined,
  SearchOutlined,
  UpOutlined,
  DownOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
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
  const [allCountiesByState, setAllCountiesByState] = useState<
    Map<string, any[]>
  >(new Map());
  const [entireStateSelected, setEntireStateSelected] = useState<Set<string>>(
    new Set()
  );
  const mapRef = useRef<InteractiveUSMapRef>(null);

  // UI state for the right panel
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [countiesToShow, setCountiesToShow] = useState<Map<string, number>>(
    new Map()
  );
  const [statesToShow, setStatesToShow] = useState(10);
  // Mock coach assignments - in real app, this would come from API
  // Map of county ID to { coach: string, color: string }
  const [coachAssignments, setCoachAssignments] = useState<
    Map<string, { coach: string; color: string }>
  >(new Map());

  // Modal state for coach assignment
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedCountyForAssignment, setSelectedCountyForAssignment] =
    useState<{ id: string; name: string; state: string } | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string>("");
  // Map of coach ID to selected color
  const [coachColors, setCoachColors] = useState<Map<string, string>>(
    new Map()
  );
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const [selectedCountiesInModal, setSelectedCountiesInModal] = useState<
    Array<{ id: string; name: string; state: string }>
  >([]);
  const [expandedCoachAreas, setExpandedCoachAreas] = useState<Set<string>>(
    new Set()
  );

  // High School Assignment Modal state
  const [isHighSchoolModalVisible, setIsHighSchoolModalVisible] =
    useState(false);
  const [selectedCoachForHighSchool, setSelectedCoachForHighSchool] = useState<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null>(null);
  const [highSchoolSearchQuery, setHighSchoolSearchQuery] = useState("");
  const [selectedStateFilter, setSelectedStateFilter] =
    useState<string>("All States");

  // Mock coaches list - in real app, this would come from API
  const mockCoaches = [
    {
      id: "1",
      name: "Cody Fisher",
      email: "crusader@yahoo.com",
      avatar: "/c1.svg",
      color: "Red",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "2",
      name: "Jenny Wilson",
      email: "jginspace@mac.com",
      avatar: "/c4.svg",
      color: "Blue",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "3",
      name: "Devon Lane",
      email: "fwitness@yahoo.ca",
      avatar: "/c3.svg",
      color: "Green",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "4",
      name: "Floyd Miles",
      email: "smallpaul@me.com",
      avatar: "/c1.svg",
      color: "Yellow",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "5",
      name: "Eleanor Pena",
      email: "plover@aol.com",
      avatar: "/c1.svg",
      color: "Purple",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "6",
      name: "Ronald Richards",
      email: "mccurley@yahoo.ca",
      avatar: "/c1.svg",
      color: "Red",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "7",
      name: "Brooklyn Simmons",
      email: "pkplex@optonline.net",
      avatar: null,
      color: "Blue",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "8",
      name: "Courtney Henry",
      email: "dieman@live.com",
      avatar: null,
      color: "Green",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "9",
      name: "Savannah Nguyen",
      email: "amichalo@msn.com",
      avatar: null,
      color: "Yellow",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "10",
      name: "Jeffrey Epstein",
      email: "jason_mark@hotmail.com",
      avatar: null,
      color: "Red",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "11",
      name: "Alex Rock",
      email: "alex.rock@example.com",
      avatar: null,
      color: "Blue",
      position: "Position",
      assignedAreas: [
        "AL, AR, CT, FL, GA (Appling, Atkinson, Bacon, Baker, Ben Hill, Berrien, Bibb, Bleckley, Brantley, Brooks, Bryan, Bulloch, Burke, Calhoun, Camden, Candler, Charlton, Chatham, Chattahoochee, Clay, Clinch, Coffee, Colquitt, Cook, Crawford, Crisp, Decatur, Dodge, Dooly, Dougherty, Early, Echols, Effingham, Emanuel, Evans, Glynn, Grady, Harris, Houston, Irwin, Jeff Davis, Jefferson)",
      ],
      positions: [] as string[],
    },
    {
      id: "12",
      name: "Mario Kingman",
      email: "mario.kingman@example.com",
      avatar: null,
      color: "Green",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
    {
      id: "13",
      name: "Guermeo Ammea",
      email: "guermeo.ammea@example.com",
      avatar: null,
      color: "Yellow",
      position: "Position",
      assignedAreas: [] as string[],
      positions: ["QB", "RB", "WR"],
    },
    {
      id: "14",
      name: "Alex Jason",
      email: "alex.jason@example.com",
      avatar: null,
      color: "Purple",
      position: "Position",
      assignedAreas: [] as string[],
      positions: [] as string[],
    },
  ];

  // Mock high schools data - in real app, this would come from API
  const mockHighSchools = [
    {
      id: "1",
      name: "Eagle River High School",
      state: "Arizona",
      assigned: true,
    },
    { id: "2", name: "Bartlett High School", state: "Arizona", assigned: true },
    { id: "3", name: "Dimond High School", state: "Arizona", assigned: true },
    { id: "4", name: "Chugiak High School", state: "Arizona", assigned: true },
    { id: "5", name: "Service High School", state: "New York", assigned: true },
    {
      id: "6",
      name: "South Anchorage High School",
      state: "New York",
      assigned: true,
    },
    {
      id: "7",
      name: "West Anchorage High School",
      state: "Arizona",
      assigned: true,
    },
    { id: "8", name: "Barrow High School", state: "Arizona", assigned: true },
    {
      id: "9",
      name: "Lathrop High School (Fairbanks)",
      state: "Washinton D.C",
      assigned: true,
    },
    {
      id: "10",
      name: "West Valley High School (Fairbanks area)",
      state: "Washinton D.C",
      assigned: true,
    },
    {
      id: "11",
      name: "Colony High School (Palmer)",
      state: "California",
      assigned: true,
    },
  ];

  // Handle opening high school assignment modal
  const handleOpenHighSchoolModal = (coach: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  }) => {
    setSelectedCoachForHighSchool(coach);
    setIsHighSchoolModalVisible(true);
    setHighSchoolSearchQuery("");
    setSelectedStateFilter("All States");
  };

  // Handle closing high school assignment modal
  const handleCloseHighSchoolModal = () => {
    setIsHighSchoolModalVisible(false);
    setSelectedCoachForHighSchool(null);
    setHighSchoolSearchQuery("");
    setSelectedStateFilter("All States");
  };

  // Get unique states from high schools
  const uniqueStates = Array.from(
    new Set(mockHighSchools.map((hs) => hs.state))
  ).sort();

  // Filter high schools based on search and state filter
  const filteredHighSchools = mockHighSchools.filter((hs) => {
    const matchesSearch =
      !highSchoolSearchQuery ||
      hs.name.toLowerCase().includes(highSchoolSearchQuery.toLowerCase());
    const matchesState =
      selectedStateFilter === "All States" || hs.state === selectedStateFilter;
    return matchesSearch && matchesState;
  });

  const handleStateSelect = (states: any[], allCounties: any[]) => {
    // Create a set of currently selected state names for quick lookup
    const selectedStateNames = new Set(states.map((s) => s.name.trim()));

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
    const selectedStateNames = new Set(
      selectedStatesData.map((s) => s.name.trim())
    );
    const filteredCounties = counties.filter(
      (county) =>
        county && county.state && selectedStateNames.has(county.state.trim())
    );
    setSelectedCountiesData(filteredCounties);
    // Don't automatically update checkbox state - only user clicks should control it
  };

  const handleSelectEntireState = (
    stateName: string,
    stateId: string,
    checked: boolean
  ) => {
    const normalizedStateName = stateName.trim();

    if (!mapRef.current) {
      return;
    }

    // Always call the map method - it handles the toggle logic internally
    // The method checks if all are selected and toggles accordingly
    mapRef.current.selectAllCountiesForState(normalizedStateName, stateId);

    // Update checkbox state based on user action
    if (checked) {
      setEntireStateSelected(
        new Set([...entireStateSelected, normalizedStateName])
      );
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
    setCountiesToShow(
      new Map(countiesToShow.set(stateName, Math.min(current + 10, totalCount)))
    );
  };

  // Handle coach assignment - open modal
  const handleAssignCoach = (countyId: string, countyName: string) => {
    // Get the county's state
    const county = selectedCountiesData.find((c) => c.id === countyId);
    const stateName = county?.state || "";

    // Check if county already has an assignment
    const existingAssignment = coachAssignments.get(countyId);

    // Initialize with the clicked county
    setSelectedCountiesInModal([
      { id: countyId, name: countyName, state: stateName },
    ]);
    setSelectedCountyForAssignment({
      id: countyId,
      name: countyName,
      state: stateName,
    });
    setSelectedCoach("");
    // Initialize coach colors map - set default "Red" for all coaches if not already set
    const newCoachColors = new Map<string, string>();
    mockCoaches.forEach((coach) => {
      // If county has existing assignment and coach matches, use that color
      if (existingAssignment && existingAssignment.coach === coach.name) {
        newCoachColors.set(coach.id, existingAssignment.color);
      } else {
        newCoachColors.set(coach.id, coachColors.get(coach.id) || "Red");
      }
    });
    setCoachColors(newCoachColors);
    setCoachSearchQuery("");
    setIsAssignModalVisible(true);
  };

  // Handle removing county from modal selection
  const handleRemoveCountyFromModal = (countyId: string) => {
    setSelectedCountiesInModal((prev) => prev.filter((c) => c.id !== countyId));
  };

  // Handle coach selection in modal
  const handleConfirmCoachAssignment = () => {
    if (selectedCountiesInModal.length > 0 && selectedCoach) {
      const coachName =
        mockCoaches.find((c) => c.id === selectedCoach)?.name || selectedCoach;
      // Get the color for the selected coach
      const selectedColorForCoach = coachColors.get(selectedCoach) || "Red";
      // Assign coach and color to all selected counties
      const newAssignments = new Map(coachAssignments);
      selectedCountiesInModal.forEach((county) => {
        newAssignments.set(county.id, {
          coach: coachName,
          color: selectedColorForCoach,
        });
      });
      setCoachAssignments(newAssignments);
      setIsAssignModalVisible(false);
      setSelectedCountyForAssignment(null);
      setSelectedCountiesInModal([]);
      setSelectedCoach("");
      setCoachSearchQuery("");
    }
  };

  // Handle modal cancel
  const handleCancelCoachAssignment = () => {
    setIsAssignModalVisible(false);
    setSelectedCountyForAssignment(null);
    setSelectedCountiesInModal([]);
    setSelectedCoach("");
    setCoachSearchQuery("");
  };

  // Get state abbreviation helper
  const getStateAbbreviation = (stateName: string): string => {
    const stateAbbrMap: Record<string, string> = {
      Alabama: "AL",
      Alaska: "AK",
      Arizona: "AZ",
      Arkansas: "AR",
      California: "CA",
      Colorado: "CO",
      Connecticut: "CT",
      Delaware: "DE",
      Florida: "FL",
      Georgia: "GA",
      Hawaii: "HI",
      Idaho: "ID",
      Illinois: "IL",
      Indiana: "IN",
      Iowa: "IA",
      Kansas: "KS",
      Kentucky: "KY",
      Louisiana: "LA",
      Maine: "ME",
      Maryland: "MD",
      Massachusetts: "MA",
      Michigan: "MI",
      Minnesota: "MN",
      Mississippi: "MS",
      Missouri: "MO",
      Montana: "MT",
      Nebraska: "NE",
      Nevada: "NV",
      "New Hampshire": "NH",
      "New Jersey": "NJ",
      "New Mexico": "NM",
      "New York": "NY",
      "North Carolina": "NC",
      "North Dakota": "ND",
      Ohio: "OH",
      Oklahoma: "OK",
      Oregon: "OR",
      Pennsylvania: "PA",
      "Rhode Island": "RI",
      "South Carolina": "SC",
      "South Dakota": "SD",
      Tennessee: "TN",
      Texas: "TX",
      Utah: "UT",
      Vermont: "VT",
      Virginia: "VA",
      Washington: "WA",
      "West Virginia": "WV",
      Wisconsin: "WI",
      Wyoming: "WY",
      "District of Columbia": "DC",
    };
    return stateAbbrMap[stateName] || stateName.substring(0, 2).toUpperCase();
  };

  // Filter coaches based on search
  const filteredCoaches = mockCoaches.filter(
    (coach) =>
      coach.name.toLowerCase().includes(coachSearchQuery.toLowerCase()) ||
      coach.email.toLowerCase().includes(coachSearchQuery.toLowerCase())
  );

  // Handle delete all assignments for a state
  const handleDeleteAllAssignments = (stateName: string, counties: any[]) => {
    const newAssignments = new Map(coachAssignments);
    counties.forEach((county) => {
      newAssignments.delete(county.id);
    });
    setCoachAssignments(newAssignments);
  };

  // Get coach count for a state
  const getCoachCountForState = (counties: any[]) => {
    const uniqueCoaches = new Set<string>();
    counties.forEach((county) => {
      const assignment = coachAssignments.get(county.id);
      if (assignment && assignment.coach) {
        uniqueCoaches.add(assignment.coach);
      }
    });
    return uniqueCoaches.size;
  };

  // Filter states and counties based on search
  const filteredStatesData = selectedStatesData.filter((state) => {
    if (!searchQuery) return true;
    const stateName = state.name.toLowerCase();
    const counties = allCountiesByState.get(state.name.trim()) || [];
    const countyMatches = counties.some((county) =>
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
          coachAssignments={coachAssignments}
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
                            onChange={(e) =>
                              handleSelectEntireState(
                                stateName,
                                state.id,
                                e.target.checked
                              )
                            }
                          >
                            <h6 className="!text-[16px] italic leading-[16px] !mb-0 !mt-1 !ml-0">
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
            background: "#fff",
          }}
        >
          <Tabs
            defaultActiveKey="1"
            className="map-chart-tabs"
            items={[
              {
                key: "1",
                label: "US States & County",
                children: (
                  <div>
                    {/* Search Bar */}
                    {/* <Input
                      placeholder="Search..."
                      prefix={<SearchOutlined />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ marginBottom: "16px" }}
                    /> */}
                    <Input.Search
                      style={{ width: 300, marginBottom: "10px" }}
                      className="search-input"
                      placeholder="Search..."
                      allowClear
                      value={""}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onSearch={() => ""}
                    />

                    {/* States List */}
                    {filteredStatesData.length > 0 ? (
                      <div>
                        {filteredStatesData
                          .slice(0, statesToShow)
                          .map((state) => {
                            const stateName = state.name.trim();
                            // Get only SELECTED counties from this state (counties that were clicked)
                            const selectedCountiesForState =
                              selectedCountiesData.filter(
                                (county) =>
                                  county &&
                                  county.state &&
                                  county.state.trim() === stateName
                              );
                            const isExpanded = expandedStates.has(stateName);
                            const countiesToDisplay = isExpanded
                              ? getCountiesToDisplay(
                                  stateName,
                                  selectedCountiesForState
                                )
                              : [];
                            const coachCount = getCoachCountForState(
                              selectedCountiesForState
                            );
                            const hasMoreCounties =
                              countiesToDisplay.length <
                              selectedCountiesForState.length;

                            return (
                              <div
                                key={state.id}
                                style={{
                                  borderBottom: "1px solid #f0f0f0",
                                }}
                              >
                                {/* State Header */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "start",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    padding: "8px 0",
                                  }}
                                  onClick={() =>
                                    toggleStateExpansion(stateName)
                                  }
                                >
                                  <div>
                                    <div>
                                      {isExpanded ? (
                                        // <CaretDownOutlined style={{ fontSize: "12px", color: "#1c1d4d" }} />
                                        <div className="flex gap-2 items-center">
                                          <i className="flex icon-arrow-down-1"></i>
                                          <Text className="text-xl italic font-semibold">
                                            {state.name}
                                          </Text>
                                        </div>
                                      ) : (
                                        // <CaretRightOutlined style={{ fontSize: "12px", color: "#1c1d4d" }} />
                                        <div className=" flex gap-2 items-center">
                                          <i className="flex icon-arrow-right-3"></i>
                                          <Text className="text-xl italic font-semibold">
                                            {state.name}
                                          </Text>
                                        </div>
                                      )}
                                      {/* <Text strong style={{ fontSize: "16px", color: "#1c1d4d" }}>
                                    {state.name}
                                    </Text> */}

                                      {isExpanded && (
                                        <Text className="ml-[20px] text-sm italic">
                                          {selectedCountiesForState.length}{" "}
                                          Counties
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                  {/* <Text type="secondary" style={{ fontSize: "14px" }}>
                                  {selectedCountiesForState.length} Counties
                                </Text> */}
                                  {/* <Text type="secondary" style={{ fontSize: "14px" }}>
                                  {selectedCountiesForState.length} Counties
                                </Text> */}
                                  {isExpanded && (
                                    <div className="block">
                                      {coachCount > 0 && (
                                        <div className="grid text-end mt-2">
                                          <Text
                                            type="secondary"
                                            // style={{ fontSize: "14px" }}
                                            className="text-base italic font-semibold"
                                          >
                                            {coachCount} Coaches
                                          </Text>
                                          <a
                                            href="#"
                                            className="text-[#C00E1E]"
                                            style={{
                                              padding: 0,
                                              fontSize: "14px",
                                              fontWeight: "600",
                                              fontStyle: "italic",
                                              textDecoration: "underline",
                                              border: "none !important",
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteAllAssignments(
                                                stateName,
                                                selectedCountiesForState
                                              );
                                            }}
                                          >
                                            Delete all assignments
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Counties List */}
                                {isExpanded && (
                                  <div
                                    style={{
                                      marginLeft: "0px",
                                      marginTop: "8px",
                                      textAlign: "left",
                                    }}
                                  >
                                    {countiesToDisplay.length > 0 ? (
                                      <>
                                        {countiesToDisplay.map(
                                          (county, index) => {
                                            const assignment =
                                              coachAssignments.get(county.id);
                                            const assignedCoach =
                                              assignment?.coach;
                                            const isUnassigned = !assignedCoach;

                                            return (
                                              <div
                                                key={county.id}
                                                style={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent:
                                                    "space-between",
                                                  padding: "8px 10px 8px 16px",
                                                  backgroundColor: isUnassigned
                                                    ? "#f6ffed"
                                                    : "transparent",
                                                  borderBottom:
                                                    index <
                                                    countiesToDisplay.length - 1
                                                      ? "1px solid #f0f0f0"
                                                      : "none",
                                                }}
                                              >
                                                <Text
                                                  style={{
                                                    fontSize: "16px",
                                                    fontStyle: "italic",
                                                    color: "#1c1d4d",
                                                  }}
                                                >
                                                  {county.name}
                                                </Text>
                                                <div
                                                  style={{
                                                    display: "flex",
                                                    alignItems: "start",
                                                    gap: "8px",
                                                  }}
                                                >
                                                  {assignedCoach ? (
                                                    <>
                                                      <Text
                                                        style={{
                                                          fontSize: "14px",
                                                          color: "#1c1d4d",
                                                        }}
                                                      >
                                                        {assignedCoach}
                                                      </Text>
                                                      <div
                                                        style={{
                                                          display: "flex",
                                                          flexDirection:
                                                            "column",
                                                          gap: "2px",
                                                        }}
                                                      >
                                                        <img
                                                          src="/svgicons/arrow-top-bottom.svg"
                                                          alt=""
                                                        />
                                                      </div>
                                                    </>
                                                  ) : (
                                                    <a
                                                      href="#"
                                                      onClick={() =>
                                                        handleAssignCoach(
                                                          county.id,
                                                          county.name
                                                        )
                                                      }
                                                      style={{
                                                        padding: 0,
                                                        fontSize: "14px",
                                                        textDecoration:
                                                          "underline",
                                                        fontWeight: "600",
                                                        fontStyle: "italic",
                                                        color: "#126DB8",
                                                      }}
                                                    >
                                                      Assign
                                                    </a>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          }
                                        )}
                                        {hasMoreCounties && (
                                          <a
                                            href="#"
                                            style={{
                                              padding: "8px 0",
                                              fontSize: "14px",
                                              fontWeight: "600",
                                              fontStyle: "italic",
                                              textDecoration: "underline",
                                              color: "#C00E1E !important",
                                              border: "none !important",
                                              textAlign: "left",
                                              marginLeft: "15px",
                                              display: "block",
                                            }}
                                            onClick={() =>
                                              showMoreCounties(
                                                stateName,
                                                selectedCountiesForState.length
                                              )
                                            }
                                          >
                                            Show more counties...
                                          </a>
                                        )}
                                      </>
                                    ) : (
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: "14px" }}
                                      >
                                        Show more counties...
                                      </Text>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {filteredStatesData.length > statesToShow && (
                          <a
                            href="#"
                            style={{
                              padding: "8px 0",
                              fontSize: "14px",
                              fontWeight: "600",
                              fontStyle: "italic",
                              textDecoration: "underline",
                              color: "#C00E1E !important",
                              border: "none !important",
                              textAlign: "left",
                              marginLeft: "15px",
                              display: "block",
                            }}
                            onClick={() => setStatesToShow(statesToShow + 10)}
                          >
                            Show more states
                          </a>
                        )}
                      </div>
                    ) : (
                      <Text type="secondary">
                        No states selected. Select states on the map to view
                        counties.
                      </Text>
                    )}
                  </div>
                ),
              },
              {
                key: "2",
                label: "Coaches",
                children: (
                  <div>
                    {/* Search Bar */}
                    {/* <Input
                      placeholder="Search..."
                      prefix={<SearchOutlined />}
                      value={coachSearchQuery}
                      onChange={(e) => setCoachSearchQuery(e.target.value)}
                      style={{ marginBottom: "16px" }}
                    /> */}
                    <Input.Search
                      style={{ width: 300 }}
                      className="search-input"
                      placeholder="Search..."
                      onChange={(e) => setCoachSearchQuery(e.target.value)}
                      allowClear
                      value={""}
                      onSearch={() => ""}
                    />

                    {/* Coaches List */}
                    <div style={{ maxHeight: "70vh", overflowY: "auto" }}>
                      {mockCoaches
                        .filter(
                          (coach) =>
                            coach.name
                              .toLowerCase()
                              .includes(coachSearchQuery.toLowerCase()) ||
                            coach.email
                              .toLowerCase()
                              .includes(coachSearchQuery.toLowerCase())
                        )
                        .map((coach, index, filteredList) => (
                          <div
                            key={coach.id}
                            onClick={() => handleOpenHighSchoolModal(coach)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "16px",
                              padding: "8px 0",
                              borderBottom:
                                index < filteredList.length - 1
                                  ? "1px solid #f0f0f0"
                                  : "none",
                              cursor: "pointer",
                            }}
                          >
                            {/* Profile Picture */}
                            <Avatar
                              className="rounded-none h-16 w-20"
                              src={coach.avatar}
                            >
                              {coach.name.charAt(0)}
                            </Avatar>

                            {/* Name and Email */}
                            <div className="w-full ">
                              <div>
                                <Text
                                  strong
                                  style={{
                                    display: "flex",
                                    fontSize: "16px",
                                    fontStyle: "italic",
                                    color: "#000",
                                  }}
                                >
                                  {coach.name}
                                </Text>
                                <a
                                  href="#"
                                  style={{
                                    display: "flex",
                                    fontSize: "14px",
                                    color: "#1890ff",
                                  }}
                                >
                                  {coach.email}
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <a
                      href="#"
                      style={{
                        padding: "8px 0",
                        fontSize: "14px",
                        fontWeight: "600",
                        fontStyle: "italic",
                        textDecoration: "underline",
                        color: "#C00E1E !important",
                        border: "none !important",
                        textAlign: "left",
                        marginLeft: "0px",
                        display: "block",
                        marginTop: "20px",
                      }}
                    >
                      Show more coaches
                    </a>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>

      {/* Coach Assignment Modal */}
      <Modal
        title={null}
        open={isAssignModalVisible}
        onCancel={handleCancelCoachAssignment}
        footer={null}
        width={900}
        style={{ top: 20 }}
        className="coach-assignment-modal"
      >
        <div
          style={{ display: "flex", flexDirection: "column", height: "80vh" }}
        >
          {/* Header */}
          <div
            style={{
              paddingBottom: "16px",
              borderBottom: "1px solid #f0f0f0",
            }}
          >
            <Typography.Title
              level={3}
              className="italic font-semibold !text-[22px]"
            >
              Assign Coach
            </Typography.Title>
          </div>

          <div
            className="grid grid-cols-3 mt-4 gap-3 mb-5"
            // style={{ display: "flex", gap: "16px", alignItems: "center" }}
          >
            <Select
              className="w-full col-span-1"
              placeholder="Select Counties"
              mode="multiple"
              value={selectedCountiesInModal.map((c) => c.id)}
              onChange={(values) => {
                // Add counties from selectedCountiesData
                const newCounties = values
                  .map((id) => {
                    const existing = selectedCountiesInModal.find(
                      (c) => c.id === id
                    );
                    if (existing) return existing;
                    const county = selectedCountiesData.find(
                      (c) => c.id === id
                    );
                    return county
                      ? {
                          id: county.id,
                          name: county.name,
                          state: county.state || "",
                        }
                      : null;
                  })
                  .filter(Boolean) as Array<{
                  id: string;
                  name: string;
                  state: string;
                }>;
                setSelectedCountiesInModal(newCounties);
              }}
              options={selectedCountiesData.map((county) => ({
                label: `${county.name} (${getStateAbbreviation(
                  county.state || ""
                )})`,
                value: county.id,
              }))}
            />

            <Input.Search
              className="w-full col-span-2 search-input !mt-0"
              placeholder="Search Coach..."
              allowClear
              value={""}
              onChange={(e) => setCoachSearchQuery(e.target.value)}
            />
          </div>

          {/* Main Content - Two Columns */}
          <div
            style={{
              display: "flex",
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Left Panel - Selected Counties */}
            <div
              style={{
                width: "300px",
                // borderRight: "1px solid #f0f0f0",
                paddingRight: "24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography.Title level={5} style={{ marginBottom: "16px" }}>
                Selected Counties
              </Typography.Title>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {selectedCountiesInModal.length > 0 ? (
                  <Space
                    direction="vertical"
                    style={{ width: "100%" }}
                    size="small"
                  >
                    {selectedCountiesInModal.map((county) => (
                      <Tag
                        key={county.id}
                        closable
                        onClose={() => handleRemoveCountyFromModal(county.id)}
                        style={{
                          padding: "8px 12px",
                          fontSize: "16px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                          margin: "0",
                          justifyContent: "space-between",
                          background: "rgba(18, 109, 184, 0.05)",
                          border: "none",
                          color: "#1C1D4D",
                          fontWeight: "500",
                          fontStyle: "italic",
                        }}
                      >
                        {county.name} ({getStateAbbreviation(county.state)})
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">No counties selected</Text>
                )}
              </div>
            </div>

            {/* Right Panel - Coach List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Radio.Group
                value={selectedCoach}
                onChange={(e) => setSelectedCoach(e.target.value)}
                style={{ width: "100%", border: "none" }}
              >
                <Space
                  direction="vertical"
                  style={{ width: "100%" }}
                  size="middle"
                >
                  {filteredCoaches.map((coach) => (
                    <div
                      key={coach.id}
                      style={{
                        padding: "10px",
                        borderBottom: "1px solid #f0f0f0",
                        backgroundColor:
                          selectedCoach === coach.id ? "#f0f7ff" : "#fff",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Radio value={coach.id} />
                        <Avatar
                          className="rounded-none h-[61px] w-[61px]"
                          style={{ backgroundColor: "#1890ff" }}
                        >
                          {coach.name.charAt(0)}
                        </Avatar>
                        <div style={{ flex: 1 }}>
                          <div>
                            <Text className="text-lg italic font-semibold">
                              {coach.name}
                            </Text>
                          </div>
                          <div>
                            <a
                              href="#"
                              type="secondary"
                              style={{ fontSize: "14px" }}
                            >
                              {coach.email}
                            </a>
                          </div>

                          {coach.positions && coach.positions.length > 0 && (
                            <div style={{ marginTop: "8px" }}>
                              <Text className="text-sm italic font-semibold">
                                Positions:{" "}
                                {coach.positions.map((pos, idx) => (
                                  <span key={idx}>
                                    {pos}{" "}
                                    <CloseOutlined
                                      style={{
                                        fontSize: "10px",
                                        margin: "0 4px",
                                      }}
                                    />
                                  </span>
                                ))}
                              </Text>
                            </div>
                          )}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            alignItems: "flex-end",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "6px",
                            }}
                          >
                            <Select
                              value={coachColors.get(coach.id) || "Red"}
                              onChange={(value) => {
                                const newCoachColors = new Map(coachColors);
                                newCoachColors.set(coach.id, value);
                                setCoachColors(newCoachColors);
                              }}
                              style={{ width: 100 }}
                              size="small"
                            >
                              <Select.Option value="Red">
                                <div className="flex items-center gap-2">
                                  <i
                                    className="w-[10px] h-[10px] flex"
                                    style={{ backgroundColor: "#FF0000" }}
                                  ></i>
                                  <span>Red</span>
                                </div>
                              </Select.Option>
                              <Select.Option value="Blue">
                                <div className="flex items-center gap-2">
                                  <i
                                    className="w-[10px] h-[10px] flex"
                                    style={{ backgroundColor: "#1890ff" }}
                                  ></i>
                                  <span>Blue</span>
                                </div>
                              </Select.Option>
                              <Select.Option value="Green">
                                <div className="flex items-center gap-2">
                                  <i
                                    className="w-[10px] h-[10px] flex"
                                    style={{ backgroundColor: "#52c41a" }}
                                  ></i>
                                  <span>Green</span>
                                </div>
                              </Select.Option>
                              <Select.Option value="Yellow">
                                <div className="flex items-center gap-2">
                                  <i
                                    className="w-[10px] h-[10px] flex"
                                    style={{ backgroundColor: "#FFD000" }}
                                  ></i>
                                  <span>Yellow</span>
                                </div>
                              </Select.Option>
                            </Select>
                            <Button size="small" type="default">
                              + HS
                            </Button>
                          </div>
                          <Select
                            value={coach.position}
                            className="w-full"
                            placeholder="Position"
                            options={[
                              { label: "Head Coach", value: "Head Coach" },
                              {
                                label: "Assistant Coach",
                                value: "Assistant Coach",
                              },
                              {
                                label: "Position Coach",
                                value: "Position Coach",
                              },
                            ]}
                          />
                        </div>
                      </div>

                      <div className="ml-[32px]">
                        {coach.assignedAreas &&
                          coach.assignedAreas.length > 0 && (
                            <div style={{ marginTop: "8px" }}>
                              <Text
                                type="secondary"
                                className="text-sm italic font-medium"
                              >
                                {expandedCoachAreas.has(coach.id)
                                  ? coach.assignedAreas[0]
                                  : coach.assignedAreas[0].length > 200
                                  ? coach.assignedAreas[0].substring(0, 200) +
                                    "..."
                                  : coach.assignedAreas[0]}
                              </Text>
                              {coach.assignedAreas[0].length > 200 && (
                                <Button
                                  type="link"
                                  size="small"
                                  className="text-sm italic font-medium !border-none !text-[#126DB8] !underline"
                                  onClick={() => {
                                    const newExpanded = new Set(
                                      expandedCoachAreas
                                    );
                                    if (newExpanded.has(coach.id)) {
                                      newExpanded.delete(coach.id);
                                    } else {
                                      newExpanded.add(coach.id);
                                    }
                                    setExpandedCoachAreas(newExpanded);
                                  }}
                                >
                                  {expandedCoachAreas.has(coach.id)
                                    ? "Show less"
                                    : "Show more"}
                                </Button>
                              )}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </Space>
              </Radio.Group>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px solid #f0f0f0",
            }}
          >
            <Button type="text" onClick={handleCancelCoachAssignment}>
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleConfirmCoachAssignment}
              disabled={!selectedCoach || selectedCountiesInModal.length === 0}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      {/* High School Assignment Modal */}
      <Modal
        open={isHighSchoolModalVisible}
        onCancel={handleCloseHighSchoolModal}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        {selectedCoachForHighSchool && (
          <div>
            {/* Header */}
            <Typography.Title
              level={4}
              className="italic font-semibold !text-[22px] mb-7"
            >
              Assign High School
            </Typography.Title>

            {/* Coach Profile Section */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <Avatar
                className="rounded-none border-none"
                size={64}
                src={selectedCoachForHighSchool.avatar}
              >
                {selectedCoachForHighSchool.name.charAt(0)}
              </Avatar>
              <div>
                <Text
                  strong
                  style={{
                    display: "block",
                    fontSize: "18px",
                    fontWeight: 700,
                    color: "#1C1D4D",
                  }}
                >
                  {selectedCoachForHighSchool.name}
                </Text>
                <a
                  href="#"
                  style={{
                    fontSize: "14px",
                    color: "#1890ff",
                  }}
                >
                  {selectedCoachForHighSchool.email}
                </a>
              </div>
            </div>

            {/* Search and Filter Section */}
            <div className="grid grid-cols-3 mt-4 gap-3 mb-5">
                <Input.Search
                  className="w-full col-span-2 search-input !mt-0"
                  placeholder="Search Coach..."
                  allowClear
                  value={""}
                  onChange={(e) => setHighSchoolSearchQuery(e.target.value)}
                />
                <Select
                  value={selectedStateFilter}
                  onChange={(value) => setSelectedStateFilter(value)}
                  className="col-span-1"
                >
                  <Select.Option value="All States">All States</Select.Option>
                  {uniqueStates.map((state) => (
                    <Select.Option key={state} value={state}>
                      {state}
                    </Select.Option>
                  ))}
                </Select>
              </div>

            {/* High School List */}
            <div
              style={{
                maxHeight: "600px",
                overflowY: "auto",
                marginBottom: "24px",
              }}
            >
              {/* Table Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 100px",
                  padding: "6px 0",
                  borderBottom: "2px solid #f0f0f0",
                  marginBottom: "8px",
                }}
              >
                <Text
                  strong
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1C1D4D",
                  }}
                >
                  School Name
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#1C1D4D",
                    textAlign: "center",
                  }}
                >
                  State
                </Text>
                <div></div>
              </div>

              {/* Table Rows */}
              {filteredHighSchools.map((school) => (
                <div
                  key={school.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 100px",
                    padding: "2px 0",
                    borderBottom: "1px solid #f0f0f0",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: "#1C1D4D",
                    }}
                  >
                    {school.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: "16px",
                      fontStyle: "italic",
                      color: "#1C1D4D",
                      textAlign: "center",
                    }}
                  >
                    {school.state}
                  </Text>
                  <div style={{ textAlign: "right" }}>
                    <Button
                      type="link"
                      className="text-sm italic font-medium !border-none !text-[#126DB8] !underline"
                      onClick={() => {
                        // Handle unassign logic here
                        console.log("Unassign", school.name);
                      }}
                    >
                      Unassign
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "16px",
              }}
            >
              <Button
                onClick={handleCloseHighSchoolModal}
                style={{
                  minWidth: "100px",
                  borderColor: "#d9d9d9",
                  color: "#1C1D4D",
                }}
              >
                Cancel
              </Button>
              <Button
                type="primary"
                style={{
                  minWidth: "100px",
                  backgroundColor: "#1C1D4D",
                  borderColor: "#1C1D4D",
                }}
                onClick={() => {
                  // Handle save logic here
                  console.log("Save high school assignments");
                  handleCloseHighSchoolModal();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
