"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
  Fragment,
} from "react";
import { useDebounce } from "@/hooks/useDebounce";
import {
  Flex,
  Table,
  Typography,
  Space,
  Modal,
  Input,
  Button,
  Divider,
  Select,
  Form,
  Skeleton,
  Progress,
  Tooltip,
  Dropdown,
  MenuProps,
  Popover,
} from "antd";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  Libraries,
  OverlayView,
  OverlayViewF,
} from "@react-google-maps/api";
import type { TableProps } from "antd";
import type { TableColumnsType } from "antd";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import ImageWithAverage from "../_components/ImageWithAverage";
import TableView from "../_components/TableView";
import Filters from "../_components/Filters";
import AthleteProfileContent from "../_components/AthleteProfileContent";
import HSAthleteProfileContent from "../_components/HSAthleteProfileContent";
import SchoolProfileContent from "../_components/SchoolProfileContent";
import {
  fetchAthleteData,
  fetchSportColumnConfig,
  fetchSeasonData,
  fetchSchools,
  getUserPackagesForSport,
  fetchHighSchoolColumnConfig,
  fetchAthleteRatings,
  fetchRecruitingAreasForCoach,
  fetchHighSchoolAthletes,
  convertStateIdsToAbbrevs,
  convertCountyIdsToNames,
  getDefaultBoardForAdding,
  getPackageIdsByType,
} from "@/lib/queries";
import { hasPackageAccess } from "@/utils/navigationUtils";
import { US_STATE_ABBREVIATIONS } from "@/utils/constants";
import {
  AthleteData,
  Comment,
  SportStatConfig,
  HighSchoolData,
} from "@/types/database";
import { useSearch } from "../_components/SearchContext";
import { FilterState } from "@/types/filters";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchCustomerRatings,
  type CustomerRating,
  formatStatDecimal,
  formatPhoneNumber,
} from "@/utils/utils";
import { Alert } from "antd";
import AddAlert from "../_components/AddAlert";
import { useCustomer, useUser } from "@/contexts/CustomerContext";
import UserDataProvider from "@/components/UserDataProvider";
import { StarFilled, DownOutlined } from "@ant-design/icons";
import { CommentService } from "@/lib/commentService";
import { useZoom } from "@/contexts/ZoomContext";
import InfoIcon from "@/components/InfoIcon";
import { getColumnTooltip } from "@/utils/columnTooltips";
import ChooseBoardDropdown from "./ChooseBoardDropdown";
import ChooseBoardDropdownWithStatus from "./ChooseBoardDropdownWithStatus";
import SuccessPopover from "./SuccessPopover";
import {
  preparePrintRequestData,
  sendPrintRequest,
  convertSchoolId,
} from "@/utils/printUtils";
import { fetchUserDetails } from "@/utils/utils";
import CSVExport from "./CSVExport";
import ProgressBar from "@/components/ProgressBar";

const boxStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  flexDirection: "column",
  display: "flex",
};
const headerBox: React.CSSProperties = {
  padding: " 0 20px 0 0",
  marginBottom: "5px",
};

interface TableSearchContentProps {
  dataSource?:
    | "transfer_portal"
    | "all_athletes"
    | "juco"
    | "high_schools"
    | "hs_athletes";
  baseRoute?: string;
}

// Configuration for which columns are visible for each data source
const DATA_SOURCE_COLUMN_CONFIG = {
  transfer_portal: {
    date: true,
    athletic_aid: true,
    position: true,
    high_name: true,
    state: true,
    college_state: false,
    true_score: true,
  },
  all_athletes: {
    date: false,
    athletic_aid: false,
    position: true,
    high_name: true,
    state: true,
    college_state: false,
    true_score: true,
  },
  juco: {
    date: false,
    athletic_aid: false,
    position: true,
    high_name: true,
    state: false,
    college_state: true,
    true_score: true,
  },
  high_schools: {
    date: false,
    athletic_aid: false,
    position: false,
    high_name: false,
    state: true,
    college_state: false,
    true_score: false,
  },
  hs_athletes: {
    date: false,
    athletic_aid: false,
    position: true,
    high_name: true,
    state: false,
    college_state: false,
    true_score: true,
  },
} as const;

export function TableSearchContent({
  dataSource = "transfer_portal",
  baseRoute = "/transfers",
}: TableSearchContentProps) {
  const libraries: Libraries = ["places"];
  const { isLoaded: isMapApiLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const defaultMapCenter = { lat: 32.3441812, lng: -86.3384809 }; // Center of US
  const [mapCenter, setMapCenter] = useState(defaultMapCenter);
  const [mapZoom, setMapZoom] = useState(8);

  useEffect(() => {
    if (isMapApiLoaded && !mapLoadError) {
      setIsMapLoaded(true);
    }
  }, [isMapApiLoaded, mapLoadError]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [selectedPlyer, setSelectedPlyer] = useState<AthleteData | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { searchQuery, setSearchQuery } = useSearch();
  const [localSearchInput, setLocalSearchInput] = useState<string>(
    searchQuery || ""
  );
  const debouncedSearchQuery = useDebounce(localSearchInput, 500); // 500ms delay
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const debouncedFilters = useDebounce(activeFilters, 300); // 300ms delay for filters
  const [comment, setcomment] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [athleteCommentCounts, setAthleteCommentCounts] = useState<
    Record<string, number>
  >({});
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteData[]>([]);
  const [isAddingToRecruitingBoard, setIsAddingToRecruitingBoard] =
    useState(false);
  const [isBoardModalVisible, setIsBoardModalVisible] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBoardName, setSelectedBoardName] = useState<string>("Main");

  // High school selection state (for list view checkboxes - printing, etc.)
  const [selectedHighSchools, setSelectedHighSchools] = useState<
    HighSchoolData[]
  >([]);
  const [isPrintingHighSchools, setIsPrintingHighSchools] = useState(false);

  // Road map selection state (separate from list view checkboxes)
  // Initialize from localStorage to persist across data source changes
  const [roadMapSelectedHighSchools, setRoadMapSelectedHighSchools] = useState<
    HighSchoolData[]
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("roadMapSelectedHighSchools");
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.error(
          "Error loading roadMapSelectedHighSchools from localStorage:",
          error
        );
        return [];
      }
    }
    return [];
  });
  const [roadMapSelectedAthletes, setRoadMapSelectedAthletes] = useState<
    AthleteData[]
  >(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("roadMapSelectedAthletes");
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.error(
          "Error loading roadMapSelectedAthletes from localStorage:",
          error
        );
        return [];
      }
    }
    return [];
  });

  // Save selections to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "roadMapSelectedHighSchools",
        JSON.stringify(roadMapSelectedHighSchools)
      );
    } catch (error) {
      console.error(
        "Error saving roadMapSelectedHighSchools to localStorage:",
        error
      );
    }
  }, [roadMapSelectedHighSchools]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "roadMapSelectedAthletes",
        JSON.stringify(roadMapSelectedAthletes)
      );
    } catch (error) {
      console.error(
        "Error saving roadMapSelectedAthletes to localStorage:",
        error
      );
    }
  }, [roadMapSelectedAthletes]);
  const [recruitingBoardAthletes, setRecruitingBoardAthletes] = useState<
    string[]
  >([]);
  const [athletesOnAllBoards, setAthletesOnAllBoards] = useState<string[]>([]); // Athletes that are on ALL boards
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingRecruitingBoard, setIsLoadingRecruitingBoard] =
    useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // Track selected row keys
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayedData, setDisplayedData] = useState<AthleteData[]>([]);
  const [hsPopoverOpen, setHsPopoverOpen] = useState<Record<number, boolean>>(
    {}
  );
  const [hsAthletes, setHsAthletes] = useState<Record<number, any[]>>({});
  const [extensionInactive, setExtensionInactive] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceTimer, setMaintenanceTimer] = useState(120); // 2 minutes in seconds
  const [highSchoolViewMode, setHighSchoolViewMode] = useState<"map" | "list">(
    "list"
  );
  const [hsAthleteViewMode, setHsAthleteViewMode] = useState<"map" | "list">(
    "list"
  );

  // Function to handle maintenance mode countdown
  const startMaintenanceTimer = useCallback(() => {
    // Prevent multiple timers from running
    if (isMaintenanceMode || maintenanceTimerRef.current) {
      return;
    }

    setIsMaintenanceMode(true);
    setMaintenanceTimer(120); // 2 minutes = 120 seconds

    maintenanceTimerRef.current = setInterval(() => {
      setMaintenanceTimer((prev) => {
        if (prev <= 1) {
          if (maintenanceTimerRef.current) {
            clearInterval(maintenanceTimerRef.current);
            maintenanceTimerRef.current = null;
          }
          setIsMaintenanceMode(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000); // Update every 1000ms (1 second)
  }, [isMaintenanceMode]);

  // Function to check extension activity
  const checkExtensionActivity = useCallback(async () => {
    // Only check extension activity for transfer_portal dataSource
    if (dataSource !== "transfer_portal") {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("chrome_extension_user_history")
        .select("timestamp")
        .order("timestamp", { ascending: false })
        .limit(1);

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        const lastActivity = new Date(data[0].timestamp);
        const now = new Date();
        const diffInMinutes =
          (now.getTime() - lastActivity.getTime()) / (1000 * 60);
        setExtensionInactive(diffInMinutes > 30);
      } else {
        setExtensionInactive(true); // No activity records found
      }
    } catch (error) {
      // Error handled silently
    }
  }, [dataSource]);

  // Modal state for player profile
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);

  // Modal state for high school profile
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);
  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);

  // Handle URL player parameter
  useEffect(() => {
    const playerId = searchParams?.get("player");
    if (playerId && playerId !== selectedPlayerId) {
      setSelectedPlayerId(playerId);
      setIsPlayerModalVisible(true);
    } else if (!playerId && isPlayerModalVisible) {
      setIsPlayerModalVisible(false);
      setSelectedPlayerId(null);
    }
  }, [searchParams, selectedPlayerId, isPlayerModalVisible]);

  // Handle URL school parameter
  useEffect(() => {
    const schoolId = searchParams?.get("school");
    if (schoolId && schoolId !== selectedSchoolId) {
      setSelectedSchoolId(schoolId);
      setIsSchoolModalVisible(true);
    } else if (!schoolId && isSchoolModalVisible) {
      setIsSchoolModalVisible(false);
      setSelectedSchoolId(null);
    }
  }, [searchParams, selectedSchoolId, isSchoolModalVisible]);

  // Handle modal close
  const handleClosePlayerModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("player");
    params.delete("use_main_tp_page_id"); // Clean up the flag parameter
    params.delete("dataSource"); // Clean up the dataSource parameter
    const newUrl = params.toString()
      ? `${baseRoute}?${params.toString()}`
      : baseRoute;
    router.push(newUrl);
  };

  // Handle school modal close
  const handleCloseSchoolModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("school");
    params.delete("dataSource"); // Clean up the dataSource parameter
    const newUrl = params.toString()
      ? `${baseRoute}?${params.toString()}`
      : baseRoute;
    router.push(newUrl);
  };

  // Handle add to recruiting board from modal - this function will be passed to the component
  const handleModalAddToRecruitingBoard = async () => {
    // The AthleteProfileContent component will handle the actual recruitment board logic
    // This is just a placeholder that gets passed down
  };

  // Track data changes for debugging if needed
  useEffect(() => {
    // Track data changes for debugging if needed
  }, [displayedData.length, hasMore, loading, page]);
  const ITEMS_PER_PAGE = 25;
  const { activeCustomerId, customers, activeSportAbbrev } = useCustomer();
  const userDetails = useUser();
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const [athleteRatings, setAthleteRatings] = useState<
    Record<string, { name: string; color: string }>
  >({});
  const [dynamicColumns, setDynamicColumns] = useState<SportStatConfig[]>([]); // For table display (with search_column_display)
  const [filterColumns, setFilterColumns] = useState<SportStatConfig[]>([]); // For filter options (all stats)
  const [sportId, setSportId] = useState<string | null>(null);
  const [tableScrollHeight, setTableScrollHeight] = useState<string>(
    "calc(100vh - 200px)"
  );

  // Add cache for data to prevent redundant fetches
  const [dataCache, setDataCache] = useState<
    Record<string, { data: AthleteData[]; timestamp: number }>
  >({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Add state for tracking total records and filtered records
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [filteredRecords, setFilteredRecords] = useState<number>(0);
  const [seasonData, setSeasonData] = useState<number | null>(null);
  // High school dynamic column configuration (from hs_table_config)
  const [hsColumns, setHsColumns] = useState<
    {
      dataIndex: string;
      display_name: string;
      search_column_display: number;
      data_type_id: number;
    }[]
  >([]);

  // Add sorting state with default values
  // For pre-portal and juco, start with null so pre_portal_default_search from DB is used
  // For transfer_portal, default to date descending
  // For high_schools, default to school name ascending
  // For hs_athletes, default to last_name ascending (alphabetical)
  const [sortField, setSortField] = useState<string | null>(
    dataSource === "high_schools"
      ? null // Let database handle default sort for high schools
      : dataSource === "hs_athletes"
      ? "last_name" // Default to last_name for hs_athletes
      : dataSource === "all_athletes" || dataSource === "juco"
      ? null
      : "date"
  );
  const [sortOrder, setSortOrder] = useState<"ascend" | "descend" | null>(
    dataSource === "high_schools"
      ? null // Let database handle default sort for high schools
      : dataSource === "hs_athletes"
      ? "ascend" // Default to ascending for hs_athletes (alphabetical)
      : dataSource === "all_athletes" || dataSource === "juco"
      ? null
      : "descend"
  );

  // Define columns that should start with ascending order on first click
  const ascendingFirstColumns = [
    "position",
    "high_name",
    "state",
    "era",
    "fip",
    "bb_per9",
    "whip",
    "school",
  ];

  // Add ref to track which athletes we've already fetched comment counts for
  const fetchedCommentCountsRef = useRef<Set<string>>(new Set());

  // Add ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Add ref to track previous search query to prevent loops
  const prevSearchQueryRef = useRef<string>(searchQuery);

  // Add ref to track maintenance timer
  const maintenanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Add ref to access map instance for bounds fitting
  const mapRef = useRef<google.maps.Map | null>(null);

  // Add ref to track if scroll position has been restored
  const scrollPositionRestoredRef = useRef(false);

  // Add ref to track if map bounds have been fitted (to prevent center reset)
  const mapBoundsFittedRef = useRef(false);

  // Generate a unique key for storing scroll position based on dataSource and activeCustomerId
  const getScrollPositionKey = () => {
    return `table_scroll_${dataSource}_${activeCustomerId || "default"}`;
  };

  // Get the active customer and sport abbreviation from context
  const activeCustomer = customers.find(
    (c) => c.customer_id === activeCustomerId
  );
  const activeSport = activeSportAbbrev || ""; // fallback to blank if not found

  // Get zoom functionality
  const { zoom } = useZoom();

  // Update table scroll height based on zoom
  useEffect(() => {
    const updateScrollHeight = () => {
      // Use CSS calc that works with the scaled container
      // Since the container is scaled, we need the scroll height to be relative to the scaled size
      const baseVh = 78; // Approximately 78vh after accounting for headers
      const scaledVh = Math.floor(baseVh / (zoom / 100));
      const finalHeight = `${Math.min(scaledVh, 200)}vh`; // Cap at 200vh to prevent excessive height

      setTableScrollHeight(finalHeight);
    };

    updateScrollHeight();

    // Update on window resize
    window.addEventListener("resize", updateScrollHeight);
    return () => window.removeEventListener("resize", updateScrollHeight);
  }, [zoom]);

  const columns = useMemo((): TableColumnsType<any> => {
    const columnConfig = DATA_SOURCE_COLUMN_CONFIG[dataSource];

    // High school specific columns
    if (dataSource === "high_schools") {
      // Hardcoded School Name column - completely independent of dynamic columns
      const schoolNameColumn = {
        title: "School Name",
        key: "school_name",
        dataIndex: "school",
        fixed: "left" as const,
        sorter: true,
        minWidth: 200, // Set minimum width but allow expansion
        ellipsis: false, // Don't cut off names unnecessarily
        render: (text: string, record: HighSchoolData) => {
          const handleSchoolClick = (e: React.MouseEvent) => {
            e.stopPropagation();

            // Open high school modal
            const params = new URLSearchParams(searchParams?.toString() || "");
            params.set("school", record.id);
            params.set("dataSource", "high_schools");

            const newUrl = params.toString()
              ? `${baseRoute}?${params.toString()}`
              : baseRoute;
            router.push(newUrl);
          };

          return (
            <div
              className="profile-list"
              onClick={handleSchoolClick}
              style={{
                cursor: "pointer",
                whiteSpace: "nowrap", // Prevent text wrapping but allow natural width
              }}
            >
              <div className="pro-detail">
                <h4
                  className="flex items-center mb-0.5"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {text || record.school || "No School Name"}
                </h4>
              </div>
            </div>
          );
        },
      };

      // Dynamic HS columns from hs_table_config (only if hsColumns is loaded)
      const dynamicColumns =
        hsColumns.length > 0
          ? hsColumns.map((col) => {
              const baseColumn = {
                title: col.display_name,
                dataIndex: col.dataIndex,
                key: col.dataIndex,
                minWidth: Math.max(120, (col.display_name?.length || 8) * 12), // Use minWidth instead of fixed width
                ellipsis: false, // Don't cut off text unnecessarily
                sorter: true,
                render: (text: string) => {
                  if (!text) return text;
                  return <div style={{ whiteSpace: "nowrap" }}>{text}</div>;
                },
              };

              // Special formatting for contact information
              if (
                col.display_name?.toLowerCase().includes("email") ||
                col.dataIndex?.toLowerCase().includes("email")
              ) {
                // Email link formatting
                return {
                  ...baseColumn,
                  render: (text: string, record: any) => {
                    if (!text) return text;

                    return (
                      <a
                        href={`mailto:${text}`}
                        style={{
                          color: "#1890ff",
                          textDecoration: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {text}
                      </a>
                    );
                  },
                };
              } else if (
                col.display_name?.toLowerCase().includes("phone") ||
                col.display_name?.toLowerCase().includes("cell") ||
                col.display_name?.toLowerCase().includes("home") ||
                col.display_name?.toLowerCase().includes("office") ||
                col.dataIndex?.toLowerCase().includes("phone") ||
                col.dataIndex?.toLowerCase().includes("cell")
              ) {
                // Phone link formatting
                return {
                  ...baseColumn,
                  render: (text: string, record: any) => {
                    if (!text) return text;

                    // Format phone number to (xxx) xxx-xxxx
                    const formatPhoneNumber = (phone: string) => {
                      // Remove all non-digit characters
                      const digits = phone.replace(/\D/g, "");

                      // If it's a 10-digit number, format as (xxx) xxx-xxxx
                      if (digits.length === 10) {
                        return `(${digits.slice(0, 3)}) ${digits.slice(
                          3,
                          6
                        )}-${digits.slice(6)}`;
                      }

                      // If it's an 11-digit number starting with 1, format as (xxx) xxx-xxxx
                      if (digits.length === 11 && digits.startsWith("1")) {
                        return `(${digits.slice(1, 4)}) ${digits.slice(
                          4,
                          7
                        )}-${digits.slice(7)}`;
                      }

                      // Return original if it doesn't match expected format
                      return phone;
                    };

                    const formattedPhone = formatPhoneNumber(text);

                    return (
                      <a
                        href={`tel:${text.replace(/\D/g, "")}`}
                        style={{
                          color: "#1890ff",
                          textDecoration: "none",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formattedPhone}
                      </a>
                    );
                  },
                };
              }

              return baseColumn;
            })
          : [];

      const columnsArray = [schoolNameColumn, ...dynamicColumns];

      return columnsArray;
    }

    return [
      {
        title: "Name",
        key: "name",
        fixed: "left",
        onCell: (record: AthleteData) => {
          const isOnBoard = recruitingBoardAthletes.includes(record.id);
          return {
            style: isOnBoard ? { backgroundColor: "#d4edda" } : {},
          };
        },
        render: (record: AthleteData) => {
          const handlePlayerClick = async (e: React.MouseEvent) => {
            e.stopPropagation();

            // Get the main_tp_page_id for this athlete
            try {
              const { getMainTpPageIdFromAthleteId } = await import(
                "@/lib/queries"
              );
              const mainTpPageId = await getMainTpPageIdFromAthleteId(
                record.id
              );

              if (mainTpPageId) {
                // Use main_tp_page_id instead of athlete_id
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.set("player", mainTpPageId);
                params.set("use_main_tp_page_id", "true"); // Flag to indicate we're using main_tp_page_id
                params.set("dataSource", dataSource); // Pass the data source
                router.push(`${baseRoute}?${params.toString()}`);
              } else {
                // Fallback to athlete_id if main_tp_page_id not found
                const params = new URLSearchParams(
                  searchParams?.toString() || ""
                );
                params.set("player", record.id);
                params.set("dataSource", dataSource); // Pass the data source
                router.push(`${baseRoute}?${params.toString()}`);
              }
            } catch (error) {
              // Fallback to athlete_id on error
              const params = new URLSearchParams(
                searchParams?.toString() || ""
              );
              params.set("player", record.id);
              params.set("dataSource", dataSource); // Pass the data source
              router.push(`${baseRoute}?${params.toString()}`);
            }
          };

          return (
            <div
              className="profile-list"
              onClick={handlePlayerClick}
              style={{ cursor: "pointer" }}
            >
              <ImageWithAverage
                src={record.image_url || "/blank-user.svg"}
                alt={record.athlete_name || ""}
                size="small"
                height={126}
                width={126}
                average={record.true_score || 0}
              />
              <div className="pro-detail">
                <h4 className="flex items-center mb-0.5">
                  {record.athlete_name}
                  {(() => {
                    // Helper function to get honor icon emoji based on best_honor value
                    const getHonorIcon = (
                      bestHonor: string | null | undefined
                    ): string | null => {
                      if (!bestHonor) return null;
                      const lowerHonor = bestHonor.toLowerCase();

                      if (lowerHonor.includes("all american")) {
                        return "🏆"; // Gold trophy emoji
                      } else if (lowerHonor.includes("all conference")) {
                        return "🥈"; // Silver medal emoji
                      } else if (lowerHonor.includes("all region")) {
                        return "🥉"; // Bronze medal emoji
                      }

                      return null;
                    };

                    const honorIcon = getHonorIcon(record.best_honor);
                    return honorIcon ? (
                      <div className="ml-2 flex items-center">
                        <Tooltip title={record.best_honor} placement="top">
                          <span
                            style={{
                              fontSize: "16px",
                              cursor: "help",
                              fontStyle: "normal",
                            }}
                          >
                            {honorIcon}
                          </span>
                        </Tooltip>
                      </div>
                    ) : null;
                  })()}
                  {record.highlight && record.highlight.trim() !== "" && (
                    <div className="ml-2 flex items-center">
                      <Tooltip title={record.highlight} placement="top">
                        <span
                          style={{
                            fontSize: "14px",
                            cursor: "pointer",
                            fontStyle: "normal",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(record.highlight, "_blank");
                          }}
                          title="View highlight video"
                        >
                          🎥
                        </span>
                      </Tooltip>
                    </div>
                  )}
                  {athleteRatings[record.id] && (
                    <div className="ml-2 flex items-center">
                      <div
                        className="mr-1 flex items-center justify-center"
                        style={{
                          width: 16,
                          height: 16,
                          backgroundColor: athleteRatings[record.id].color,
                        }}
                      >
                        <StarFilled style={{ color: "#fff", fontSize: 12 }} />
                      </div>
                      <span className="text-sm text-gray-600">
                        {athleteRatings[record.id].name.substring(0, 4)}
                      </span>
                    </div>
                  )}
                </h4>
                <div
                  className="name"
                  style={{
                    backgroundColor:
                      record.commit_school_name &&
                      record.commit_school_name.trim() !== ""
                        ? "#00bcd430"
                        : "transparent",
                    padding:
                      record.commit_school_name &&
                      record.commit_school_name.trim() !== ""
                        ? "1px 1px 0px 5px"
                        : "0",
                    borderRadius:
                      record.commit_school_name &&
                      record.commit_school_name.trim() !== ""
                        ? "0px"
                        : "0",
                    border:
                      record.commit_school_name &&
                      record.commit_school_name.trim() !== ""
                        ? ""
                        : "none",
                    margin: "0",
                  }}
                >
                  {record.year && (
                    <span className="year-display inline mr-1">
                      {record.year} /{" "}
                    </span>
                  )}
                  {record.division && (
                    <div className="text-base inline mr-1">
                      {record.division} /
                    </div>
                  )}
                  <p style={{ margin: "0" }} className="inline">
                    {/* <img src="/b.svg" height={16} className="mr-1"></img> */}
                    {/* <img src="/b.svg" height={16} className="mr-1"/> */}
                    {/* Display commit school name if available */}
                    {record.commit_school_name &&
                    record.commit_school_name.trim() !== "" ? (
                      <>
                        {/* Current school logo and name */}
                        {record.school_logo_url &&
                          record.school_logo_url.trim() !== "" && (
                            <Image
                              className="mr-1"
                              src={record.school_logo_url}
                              alt="Current school logo"
                              width={20}
                              height={20}
                              style={{ objectFit: "contain" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        <span style={{ color: "#888" }}>
                          {record.name_name}
                        </span>

                        {/* Arrow */}
                        <span className="text-gray-900"> → </span>

                        {/* Commit school logo and name */}
                        {record.commit_school_logo_url &&
                          record.commit_school_logo_url.trim() !== "" && (
                            <Image
                              className="mr-1"
                              src={record.commit_school_logo_url}
                              alt="Commit school logo"
                              width={20}
                              height={20}
                              style={{ objectFit: "contain" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        <span className="text-gray-900">
                          {record.commit_school_name}
                        </span>
                        {record.commit_date && (
                          <span className="text-gray-600 ml-1">
                            (
                            {new Date(record.commit_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "numeric",
                                day: "numeric",
                                year: "2-digit",
                              }
                            )}
                            )
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Single school logo and name */}
                        {record.school_logo_url &&
                          record.school_logo_url.trim() !== "" && (
                            <Image
                              src={record.school_logo_url}
                              alt="School logo"
                              width={20}
                              height={20}
                              style={{ objectFit: "contain" }}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                        <span>{record.name_name}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        },
      },
      // Conditionally include Status column
      // Only show on pre-portal (all_athletes) view for non-NAIA teams
      ...(() => {
        const sportAbbrev = activeSportAbbrev?.toLowerCase();

        // Check if user has a NAIA package for this sport
        let hasNaiaPackage = false;
        if (sportAbbrev) {
          const userPackageNumbers = (userDetails?.packages || []).map(
            (pkg: string | number) => Number(pkg)
          );
          const sportPackages = getUserPackagesForSport(
            sportAbbrev,
            userPackageNumbers
          );
          hasNaiaPackage = sportPackages.some((pkg) => pkg.is_naia);
        }

        // Status column shows for non-NAIA teams (regardless of sport)
        const shouldShowStatusColumn =
          dataSource === "all_athletes" && !hasNaiaPackage;

        return shouldShowStatusColumn
          ? [
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                width: 120,
                sorter: true,
                render: (value: any, record: any) => {
                  if (value === null || value === undefined || value === "") {
                    return null;
                  }
                  return value;
                },
              },
            ]
          : [];
      })(),
      // Conditionally include Transfer Odds column
      // Only show on pre-portal (all_athletes) view
      // For football: show if they DON'T have the football-specific NAIA package
      // For other sports: show if they DO have the sport-specific NAIA package
      ...(() => {
        const isFootball = activeSportAbbrev?.toLowerCase() === "fb";
        const sportAbbrev = activeSportAbbrev?.toLowerCase();

        // Check if user has a NAIA package for this sport
        let hasNaiaPackage = false;
        if (sportAbbrev) {
          const userPackageNumbers = (userDetails?.packages || []).map(
            (pkg: string | number) => Number(pkg)
          );
          const sportPackages = getUserPackagesForSport(
            sportAbbrev,
            userPackageNumbers
          );
          hasNaiaPackage = sportPackages.some((pkg) => pkg.is_naia);
        }

        const shouldShowColumn =
          dataSource === "all_athletes" &&
          (isFootball ? !hasNaiaPackage : hasNaiaPackage);

        return shouldShowColumn
          ? [
              {
                title: () => (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                    }}
                  >
                    <InfoIcon
                      tooltip="Any athlete with a score above 80% is considered a target worth your consideration as our algorithm has identified them as someone who is actively interested in being recruited to a new school."
                      style={{ marginRight: "4px" }}
                    />
                    <span>Transfer %</span>
                  </div>
                ),
                dataIndex: "transfer_odds",
                key: "transfer_odds",
                width: 135,
                sorter: true,
                render: (value: any, record: any) => {
                  if (value === null || value === undefined || value === "") {
                    return null;
                  }
                  // Convert to percentage with 1 decimal place
                  const percentage = Number(value).toFixed(1);
                  const transferOddsValue = Number(value);

                  // Format date as month-year if transfer odds > 80%
                  let dateDisplay = null;
                  if (transferOddsValue > 80 && record?.date) {
                    try {
                      const date = new Date(record.date);
                      if (!isNaN(date.getTime())) {
                        const month = date.toLocaleDateString("en-US", {
                          month: "short",
                        });
                        const year = date.getFullYear();
                        dateDisplay = `${month}-${year}`;
                      }
                    } catch (error) {
                      // If date parsing fails, don't show date
                    }
                  }

                  return (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <span>{`${percentage}%`}</span>
                      {dateDisplay && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#666",
                            marginTop: "2px",
                          }}
                        >
                          {dateDisplay}
                        </span>
                      )}
                    </div>
                  );
                },
              },
            ]
          : [];
      })(),
      // Conditionally include Date column based on configuration
      ...(columnConfig.date
        ? [
            {
              title: "Date",
              dataIndex: "date",
              key: "date",
              sorter: true,
              defaultSortOrder: "descend" as const,
              render: (value: string) => {
                if (!value) return null;
                try {
                  // For date-only values, append time to avoid timezone issues
                  const date = new Date(value + "T12:00:00");
                  return date.toLocaleDateString("en-US", {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                  });
                } catch (error) {
                  return value; // Return original value if parsing fails
                }
              },
            },
          ]
        : []),
      // Conditionally include $ column based on configuration
      ...(columnConfig.athletic_aid
        ? [
            {
              title: "$",
              key: "athletic_aid",
              width: 60,
              sorter: true,
              dataIndex: "athletic_aid",
            },
          ]
        : []),
      // Conditionally include Pos column based on configuration
      ...(columnConfig.position
        ? [
            {
              title: "Pos",
              dataIndex: "position",
              key: "position",
              width: 70,
              sorter: true,
            },
          ]
        : []),
      // Conditionally include State column based on configuration
      ...(columnConfig.state
        ? [
            {
              title: "State",
              dataIndex: "state",
              key: "state",
              width: 80,
              sorter: true,
            },
          ]
        : []),
      // Conditionally include Called State column based on configuration (juco only)
      ...(columnConfig.college_state
        ? [
            {
              title: "State",
              dataIndex: "school_state",
              key: "school_state",
              width: 100,
              sorter: true,
            },
          ]
        : []),
      // Dynamic columns based on sport_stat_config
      ...(dynamicColumns.length > 0
        ? dynamicColumns.flatMap((col, index) => {
            const tooltip = getColumnTooltip(col.display_name, col.sport_id);
            const isOfferColumn = col.display_name?.toLowerCase() === "offer";
            const columnDef = {
              title: () => (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    width: "100%",
                  }}
                >
                  {tooltip && (
                    <InfoIcon
                      tooltip={tooltip}
                      style={{ marginRight: "4px", marginLeft: "0" }}
                    />
                  )}
                  <span>
                    {isOfferColumn && dataSource === "hs_athletes"
                      ? "Best Offer"
                      : col.display_name}
                  </span>
                </div>
              ),
              dataIndex:
                col.sanitized_column_name ||
                col.data_type_name?.toLowerCase().replace(/\s+/g, "_") ||
                col.display_name.toLowerCase().replace(/\s+/g, "_"),
              key:
                col.sanitized_column_name ||
                col.data_type_name?.toLowerCase().replace(/\s+/g, "_") ||
                col.display_name.toLowerCase().replace(/\s+/g, "_"),
              width: Math.max(
                70,
                (col.display_name.length + (tooltip ? 5 : 3)) * 11
              ), // Extra space for columns with info icons
              sorter: true,

              render: (value: any, record: any) => {
                // Special handling for height data (data_type_id 304)
                if (col.data_type_id === 304) {
                  const heightFeet = record.height_feet;
                  const heightInch = record.height_inch;
                  if (heightFeet && heightInch) {
                    return `${heightFeet}'${heightInch}"`;
                  } else if (heightFeet) {
                    return `${heightFeet}'0"`;
                  } else if (heightInch) {
                    return ``;
                  }
                  return null;
                }

                // Special handling for S column (data_type_id 250) for football (sport_id 21)
                if (col.data_type_id === 250) {
                  // Check if this is football sport - we can get sport_id from the active customer context
                  const isFootball = String(activeCustomer?.sport_id) === "21";
                  if (isFootball) {
                    // Handle text "true" value
                    if (
                      value === "true" ||
                      value === true ||
                      value === 1 ||
                      value === "1"
                    ) {
                      return "Y";
                    }
                    return null;
                  }
                  return null;
                }

                // Special handling for Twitter (data_type_id 13)
                if (col.data_type_id === 13) {
                  if (value && value.trim() !== "") {
                    // Remove @ symbol if present and create clickable link
                    const twitterHandle = value.replace("@", "");
                    return (
                      <a
                        href={`https://x.com/${twitterHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#1DA1F2", textDecoration: "none" }}
                      >
                        @{twitterHandle}
                      </a>
                    );
                  }
                  return null;
                }

                // Special handling for High School (data_type_id 7)
                if (col.data_type_id === 7) {
                  // The high school data is stored in the 'high_school' field of the record
                  const highSchoolValue =
                    record.high_school || record.high_name || value;
                  if (highSchoolValue && highSchoolValue.trim() !== "") {
                    return highSchoolValue;
                  }
                  return null;
                }

                // Special handling for GP column (data_type_id 98) - conditional green background
                if (col.data_type_id === 98) {
                  const sportId = activeCustomer?.sport_id
                    ? String(activeCustomer.sport_id)
                    : null;
                  const gp =
                    value !== null && value !== undefined
                      ? Number(value)
                      : null;
                  const gpPrev =
                    record.gp_prev !== null && record.gp_prev !== undefined
                      ? Number(record.gp_prev)
                      : null;

                  // Check conditions based on sport
                  let shouldHighlight = false;
                  if (sportId && gp !== null && gpPrev !== null) {
                    // MSOC (sport_id 3) / WSOC (sport_id 4): gp_prev > 10 AND gp < 5
                    if (
                      (sportId === "3" || sportId === "4") &&
                      gpPrev > 10 &&
                      gp < 5
                    ) {
                      shouldHighlight = true;
                    }
                    // MBB (sport_id 1) / WBB (sport_id 2): gp_prev > 12 AND gp < 6
                    else if (
                      (sportId === "1" || sportId === "2") &&
                      gpPrev > 12 &&
                      gp < 6
                    ) {
                      shouldHighlight = true;
                    }
                    // BSB (sport_id 6) / SB (sport_id 7): gp_prev > 15 AND gp < 8
                    else if (
                      (sportId === "6" || sportId === "7") &&
                      gpPrev > 15 &&
                      gp < 8
                    ) {
                      shouldHighlight = true;
                    }
                  }

                  const formattedValue = formatStatDecimal(
                    value,
                    col.decimal_places,
                    col.is_percentage,
                    col.convert_negative_to_zero
                  );

                  if (shouldHighlight) {
                    return (
                      <span
                        style={{
                          backgroundColor: "#52c41a",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          display: "inline-block",
                          fontWeight: "500",
                        }}
                      >
                        {formattedValue}
                      </span>
                    );
                  }

                  return formattedValue;
                }

                // Default handling for other stats
                if (value === null || value === undefined || value === "") {
                  return null;
                }
                return formatStatDecimal(
                  value,
                  col.decimal_places,
                  col.is_percentage,
                  col.convert_negative_to_zero
                );
              },
            };

            // If this is the Offer column and we're on hs_athletes, insert the # column right after it
            if (isOfferColumn && dataSource === "hs_athletes") {
              return [
                columnDef,
                {
                  title: "# Offer",
                  key: "offer_count",
                  dataIndex: "offer_count_all",
                  width: 100,
                  sorter: true,
                  render: (value: any, record: any) => {
                    const offerCountAll = record.offer_count_all || 0;
                    const offerCountP4 = record.offer_count_p4 || 0;
                    const offerCountG5 = record.offer_count_g5 || 0;
                    // Try to get FCS from offer_counts_by_group JSONB or from a direct field
                    const offerCountsByGroup =
                      record.offer_counts_by_group || {};
                    const offerCountFcs =
                      record.offer_count_fcs ||
                      offerCountsByGroup.FCS ||
                      offerCountsByGroup.fcs ||
                      0;
                    const offerCountD2 = record.offer_count_d2 || 0;
                    const offerCountD3 = record.offer_count_d3 || 0;
                    const offerCountNaia = record.offer_count_naia || 0;
                    const offerCountJuco = record.offer_count_juco || 0;
                    const offerCountOther = record.offer_count_other || 0;

                    // Build the breakdown text, only showing categories with counts > 0
                    const breakdownParts: string[] = [];
                    if (offerCountP4 > 0)
                      breakdownParts.push(`P4: ${offerCountP4}`);
                    if (offerCountG5 > 0)
                      breakdownParts.push(`G5: ${offerCountG5}`);
                    if (offerCountFcs > 0)
                      breakdownParts.push(`FCS: ${offerCountFcs}`);
                    if (offerCountD2 > 0)
                      breakdownParts.push(`D2: ${offerCountD2}`);
                    if (offerCountD3 > 0)
                      breakdownParts.push(`D3: ${offerCountD3}`);
                    if (offerCountNaia > 0)
                      breakdownParts.push(`NAIA: ${offerCountNaia}`);
                    if (offerCountJuco > 0)
                      breakdownParts.push(`JUCO: ${offerCountJuco}`);
                    if (offerCountOther > 0)
                      breakdownParts.push(`Other: ${offerCountOther}`);

                    // Split into chunks of 2 categories per line
                    const breakdownLines: string[] = [];
                    for (let i = 0; i < breakdownParts.length; i += 2) {
                      breakdownLines.push(
                        breakdownParts.slice(i, i + 2).join(" ")
                      );
                    }

                    return (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "18px",
                            fontWeight: "bold",
                            lineHeight: "1.2",
                          }}
                        >
                          {offerCountAll}
                        </div>
                        {breakdownLines.length > 0 && (
                          <div
                            style={{
                              fontSize: "10px",
                              color: "#666",
                              lineHeight: "1.2",
                              marginTop: "2px",
                              textAlign: "center",
                            }}
                          >
                            {breakdownLines.map((line, index) => (
                              <div key={index}>{line}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
              ];
            }

            return [columnDef];
          })
        : []),
      {
        title: "",
        key: "operation",
        fixed: "right",
        width: 60,
        render: (_, record) => (
          <div className="flex flex-col items-center justify-center action-icons">
            {/* hamburger menu */}
            <Link
              href=""
              className="icon-menu-1"
              style={{ display: "none" }}
            ></Link>
            {/* message icon */}
            <Link
              href=""
              className={`icon-message ${
                athleteCommentCounts[record.id] > 0 ? "has-comment" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                handleChat(record);
              }}
            ></Link>
          </div>
        ),
      },
    ];
  }, [
    dynamicColumns,
    athleteRatings,
    athleteCommentCounts,
    dataSource,
    userDetails,
    activeSportAbbrev,
    hsColumns,
  ]);

  // Function to fetch high school data
  const fetchHighSchoolData = async (
    options: {
      page?: number;
      limit?: number;
      search?: string;
      selectColumns?: string[];
      filters?: FilterState;
      sortField?: string | null;
      sortOrder?: "ascend" | "descend" | null;
    } = {}
  ) => {
    const {
      page = 1,
      limit = 25,
      search = "",
      selectColumns = [],
      filters = {},
      sortField = null,
      sortOrder = null,
    } = options;

    try {
      // Helper function to get sanitized column name from data_type table
      const getColumnName = async (
        dataTypeId: number
      ): Promise<string | null> => {
        try {
          const { data, error } = await supabase
            .from("data_type")
            .select("name")
            .eq("id", dataTypeId)
            .single();

          if (error || !data) {
            return null;
          }

          // Sanitize the column name for SQL
          return String(data.name)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_")
            .replace(/_+/g, "_")
            .replace(/^_|_$/g, "");
        } catch (e) {
          return null;
        }
      };

      // Fetch column names for all data_type_ids that have filters
      const dataTypeIds = [24, 991, 961, 928, 956, 957, 958, 959, 960];
      const columnNamesPromises = dataTypeIds.map((id) => getColumnName(id));
      const columnNames = await Promise.all(columnNamesPromises);

      // Map data_type_id to sanitized column names
      const dataTypeColumnMap: Record<number, string> = {};
      dataTypeIds.forEach((id, index) => {
        if (columnNames[index]) {
          dataTypeColumnMap[id] = columnNames[index]!;
        }
      });

      // Build columns to select based on filters
      const filterColumns = new Set<string>();
      if (
        filters.hsState &&
        filters.hsState.length > 0 &&
        dataTypeColumnMap[24]
      )
        filterColumns.add(dataTypeColumnMap[24]);
      if (
        filters.hsCounty &&
        filters.hsCounty.length > 0 &&
        dataTypeColumnMap[991]
      )
        filterColumns.add(dataTypeColumnMap[991]);
      if (
        filters.hsReligiousAffiliation &&
        filters.hsReligiousAffiliation.length > 0 &&
        dataTypeColumnMap[961]
      )
        filterColumns.add(dataTypeColumnMap[961]);
      if (
        filters.hsSchoolType &&
        filters.hsSchoolType.length > 0 &&
        dataTypeColumnMap[928]
      )
        filterColumns.add(dataTypeColumnMap[928]);
      if (
        (filters.hsProspectsScore?.minValue !== undefined ||
          filters.hsProspectsScore?.maxValue !== undefined) &&
        dataTypeColumnMap[956]
      )
        filterColumns.add(dataTypeColumnMap[956]);
      if (
        (filters.hsD1ProspectsScore?.minValue !== undefined ||
          filters.hsD1ProspectsScore?.maxValue !== undefined) &&
        dataTypeColumnMap[957]
      )
        filterColumns.add(dataTypeColumnMap[957]);
      if (
        (filters.hsTeamQualityScore?.minValue !== undefined ||
          filters.hsTeamQualityScore?.maxValue !== undefined) &&
        dataTypeColumnMap[958]
      )
        filterColumns.add(dataTypeColumnMap[958]);
      if (
        (filters.hsAthleteIncomeScore?.minValue !== undefined ||
          filters.hsAthleteIncomeScore?.maxValue !== undefined) &&
        dataTypeColumnMap[959]
      )
        filterColumns.add(dataTypeColumnMap[959]);
      if (
        (filters.hsAcademicsScore?.minValue !== undefined ||
          filters.hsAcademicsScore?.maxValue !== undefined) &&
        dataTypeColumnMap[960]
      )
        filterColumns.add(dataTypeColumnMap[960]);

      // Add data type 24 field for unified location filter
      if (
        filters.location &&
        filters.location.values &&
        filters.location.values.length > 0
      ) {
        if (
          filters.location.type === "school_state" ||
          filters.location.type === "international"
        ) {
          // For high schools, use school_state column directly
          filterColumns.add("school_state");
        }
      }

      // Add latitude/longitude fields for radius filter
      if (filters.location && filters.location.type === "radius") {
        filterColumns.add("address_latitude");
        filterColumns.add("address_longitude");
      }

      // Add fields for recruiting area filter
      if (filters.location && filters.location.type === "recruiting_area") {
        filterColumns.add("address_state");
        filterColumns.add("hs_county");
        filterColumns.add("school_id");
      }

      const baseSelect = [
        "school_id",
        "school_name",
        "address_latitude",
        "address_longitude",
        "school_state",
        "hs_county",
        "d1_player_producing", // Add D1 player producing score for map marker colors
        ...selectColumns,
        ...Array.from(filterColumns),
      ];
      // Remove duplicates
      const uniqueSelect = [...new Set(baseSelect)];

      let query = supabase
        .from("vw_high_school")
        .select(uniqueSelect.join(","), { count: "exact" });
      console.log("query checking...", query);

      // Add search filter if provided
      if (search && search.length >= 2) {
        // Search on school_name column
        query = query.or(`school_name.ilike.%${search}%`);
      }

      // Apply high school filters using the mapped column names
      // Handle unified location filter for high schools
      if (filters.location) {
        const { type } = filters.location;

        // Handle radius filter (doesn't use values array)
        if (type === "radius") {
          const radiusData = filters.location.radius;

          if (radiusData?.center && radiusData?.distance) {
            try {
              // Geocode the center location to get coordinates
              const { geocodeLocation, getBoundingBox } = await import(
                "@/utils/geocoding"
              );
              const centerLocation = await geocodeLocation(radiusData.center);

              if (centerLocation) {
                // Get bounding box coordinates for the radius
                const boundingBox = getBoundingBox(
                  centerLocation.lat,
                  centerLocation.lng,
                  radiusData.distance
                );

                // Add latitude/longitude range filters to the query
                query = query
                  .gte("address_latitude", boundingBox.minLat)
                  .lte("address_latitude", boundingBox.maxLat)
                  .gte("address_longitude", boundingBox.minLng)
                  .lte("address_longitude", boundingBox.maxLng);
              }
            } catch (error) {
              console.error("Error setting up radius bounding box:", error);
              // If geocoding fails, don't apply any location filters
            }
          }
        }
        // Handle recruiting area filter (doesn't use values array)
        else if (type === "recruiting_area") {
          const recruitingAreaData = filters.location.recruitingArea;

          if (recruitingAreaData?.coachId) {
            try {
              const recruitingAreas = await fetchRecruitingAreasForCoach(
                recruitingAreaData.coachId
              );

              const orConditions = [];

              // Add state conditions (convert state IDs to abbreviations and search address_state)
              if (recruitingAreas.stateIds.length > 0) {
                const stateAbbrevs = await convertStateIdsToAbbrevs(
                  recruitingAreas.stateIds
                );
                if (stateAbbrevs.length > 0) {
                  orConditions.push(
                    `address_state.in.(${stateAbbrevs
                      .map((s) => `"${s}"`)
                      .join(",")})`
                  );
                }
              }

              // Add county conditions (convert county IDs to county names)
              if (recruitingAreas.countyIds.length > 0) {
                const countyNames = await convertCountyIdsToNames(
                  recruitingAreas.countyIds
                );
                if (countyNames.length > 0) {
                  orConditions.push(
                    `hs_county.in.(${countyNames
                      .map((c) => `"${c}"`)
                      .join(",")})`
                  );
                }
              }

              // Add school conditions
              if (recruitingAreas.schoolIds.length > 0) {
                orConditions.push(
                  `school_id.in.(${recruitingAreas.schoolIds.join(",")})`
                );
              }

              // Apply OR conditions if any exist
              if (orConditions.length > 0) {
                query = query.or(orConditions.join(","));
              }
            } catch (error) {
              console.error("❌ Error applying recruiting area filter:", error);
            }
          }
        }
        // Handle other location filters that use values array
        else if (
          filters.location.values &&
          filters.location.values.length > 0
        ) {
          if (filters.location.type === "school_state") {
            // For high schools, use school_state column directly
            query = query.in("school_state", filters.location.values);
          } else if (
            filters.location.type === "county" &&
            dataTypeColumnMap[991]
          ) {
            query = query.in(dataTypeColumnMap[991], filters.location.values);
          } else if (filters.location.type === "international") {
            // Handle international filter for high schools - use school_state column
            if (filters.location.values.includes("ALL_INTERNATIONAL")) {
              // Filter out US states - show all international schools (anything not in US state list)
              query = query.not(
                "school_state",
                "in",
                `(${US_STATE_ABBREVIATIONS.map((state) => `"${state}"`).join(
                  ","
                )})`
              );
              query = query.not("school_state", "is", null);
              query = query.not("school_state", "eq", "");
            } else {
              // Filter by specific international locations in school_state
              query = query.in("school_state", filters.location.values);
            }
          }
        }
      }

      // Legacy filter support (for backward compatibility)
      // State filter (data_type_id 24 - address_state)
      if (
        filters.hsState &&
        filters.hsState.length > 0 &&
        dataTypeColumnMap[24]
      ) {
        query = query.in(dataTypeColumnMap[24], filters.hsState);
      }

      // County filter (data_type_id 991)
      if (
        filters.hsCounty &&
        filters.hsCounty.length > 0 &&
        dataTypeColumnMap[991]
      ) {
        query = query.in(dataTypeColumnMap[991], filters.hsCounty);
      }

      // Religious Affiliation filter (data_type_id 961)
      if (
        filters.hsReligiousAffiliation &&
        filters.hsReligiousAffiliation.length > 0 &&
        dataTypeColumnMap[961]
      ) {
        query = query.in(
          dataTypeColumnMap[961],
          filters.hsReligiousAffiliation
        );
      }

      // School Type filter - HS/JUCO selection
      if (filters.hsSchoolType && filters.hsSchoolType.length > 0) {
        query = query.in("school_type", filters.hsSchoolType);
      }

      // Prospects Score filter (data_type_id 956) - min/max range
      if (filters.hsProspectsScore && dataTypeColumnMap[956]) {
        const { minValue, maxValue } = filters.hsProspectsScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query
            .filter(dataTypeColumnMap[956], "gte", String(minValue))
            .filter(dataTypeColumnMap[956], "lte", String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[956], "gte", String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[956], "lte", String(maxValue));
        }
      }

      // D1 Prospects Score filter (data_type_id 957) - min/max range
      if (filters.hsD1ProspectsScore && dataTypeColumnMap[957]) {
        const { minValue, maxValue } = filters.hsD1ProspectsScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query
            .filter(dataTypeColumnMap[957], "gte", String(minValue))
            .filter(dataTypeColumnMap[957], "lte", String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[957], "gte", String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[957], "lte", String(maxValue));
        }
      }

      // Team Quality Score filter (data_type_id 958) - min/max range
      if (filters.hsTeamQualityScore && dataTypeColumnMap[958]) {
        const { minValue, maxValue } = filters.hsTeamQualityScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query
            .filter(dataTypeColumnMap[958], "gte", String(minValue))
            .filter(dataTypeColumnMap[958], "lte", String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[958], "gte", String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[958], "lte", String(maxValue));
        }
      }

      // Athlete Income Score filter (data_type_id 959) - min/max range
      if (filters.hsAthleteIncomeScore && dataTypeColumnMap[959]) {
        const { minValue, maxValue } = filters.hsAthleteIncomeScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query
            .filter(dataTypeColumnMap[959], "gte", String(minValue))
            .filter(dataTypeColumnMap[959], "lte", String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[959], "gte", String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[959], "lte", String(maxValue));
        }
      }

      // Academics Score filter (data_type_id 960) - min/max range
      if (filters.hsAcademicsScore && dataTypeColumnMap[960]) {
        const { minValue, maxValue } = filters.hsAcademicsScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query
            .filter(dataTypeColumnMap[960], "gte", String(minValue))
            .filter(dataTypeColumnMap[960], "lte", String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[960], "gte", String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[960], "lte", String(maxValue));
        }
      }

      // Add sorting if provided
      if (sortField && sortOrder) {
        let dbColumnName = sortField;

        // Map frontend column names to database column names
        if (sortField === "school" || sortField === "school_name") {
          dbColumnName = "school_name";
        }

        // Apply sorting
        if (sortOrder === "ascend") {
          query = query.order(dbColumnName, { ascending: true });
        } else if (sortOrder === "descend") {
          query = query.order(dbColumnName, { ascending: false });
        }
      } else {
        // Default sort by state first, then by school name ascending
        query = query
          .order("hs_state", { ascending: true })
          .order("school_name", { ascending: true });
      }

      // Add pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Format the data to match HighSchoolData interface
      const formattedData: any[] = (data || []).map((school: any) => {
        // Remove ' (state)' suffix from school name and county name
        const cleanSchoolName =
          school.school_name?.replace(/\s*\([^)]+\)$/, "") ||
          school.school_name;
        const cleanCountyName =
          school.hs_county?.replace(/\s*\([^)]+\)$/, "") || school.hs_county;

        return {
          ...school,
          id: school.school_id,
          school: cleanSchoolName,
          hs_county: cleanCountyName,
        };
      });

      // Debug: Check the first few records to see the state values

      return {
        data: formattedData,
        totalCount: count || 0,
        hasMore: formattedData.length === limit,
      };
    } catch (error) {
      throw error;
    }
  };

  // Unified data loading function
  const loadAthleteData = useCallback(
    async (
      options: {
        isInitialLoad?: boolean;
        isLoadMore?: boolean;
        isFiltered?: boolean;
        page?: number;
        filters?: FilterState;
        search?: string;
        sortField?: string | null;
        sortOrder?: "ascend" | "descend" | null;
      } = {}
    ) => {
      const {
        isInitialLoad = false,
        isLoadMore = false,
        isFiltered = false,
        page: targetPage = 1,
        filters = {},
        search = "",
        sortField: targetSortField = null,
        sortOrder: targetSortOrder = null,
      } = options;

      // Prevent multiple simultaneous data loads
      if (loading) {
        return;
      }

      // For high schools, we don't need customer/sport data
      if (dataSource === "high_schools") {
        try {
          setLoading(true);

          // Load column configuration first if not already loaded
          let currentColumns = hsColumns;
          if (hsColumns.length === 0) {
            const configs = await fetchHighSchoolColumnConfig();
            let cols = configs.map((cfg) => ({
              dataIndex: cfg.sanitized_column_name,
              display_name: cfg.display_name,
              search_column_display: cfg.search_column_display,
              data_type_id: cfg.data_type_id,
            }));
            // Strong client-side filter as a safety net
            cols = cols.filter((c) => Number(c.search_column_display) > 0);
            cols.sort(
              (a, b) => a.search_column_display - b.search_column_display
            );
            setHsColumns(cols);
            currentColumns = cols; // Use the local variable instead of state
          }

          // Use higher limit when map view is active
          const limit = highSchoolViewMode === "map" ? 100 : ITEMS_PER_PAGE;

          const highSchoolData = await fetchHighSchoolData({
            page: targetPage,
            limit: limit,
            search: search,
            selectColumns: currentColumns.map((c) => c.dataIndex),
            filters: filters,
            sortField: targetSortField,
            sortOrder: targetSortOrder,
          });

          let finalData: any[];

          if (isLoadMore) {
            // For load more, merge with existing data
            const existingData = displayedData as any[];
            finalData = [...existingData, ...highSchoolData.data];
          } else {
            finalData = highSchoolData.data;
          }

          // Update state based on operation type
          if (isInitialLoad) {
            setData(finalData);
            setDisplayedData(finalData);
          } else if (isLoadMore) {
            setDisplayedData(finalData);
            setPage(targetPage);
          } else {
            setDisplayedData(finalData);
            setPage(1);
          }

          setHasMore(highSchoolData.hasMore);
          setTotalRecords(highSchoolData.totalCount);
          setFilteredRecords(finalData.length);
        } catch (err) {
          setError("Failed to load high school data");
        } finally {
          setLoading(false);
        }
        return;
      }

      // Only proceed if we have the necessary data for athlete data sources
      if (!activeCustomer?.sport_id || !activeCustomerId) {
        return;
      }

      try {
        setLoading(true);

        // Handle initial load caching
        if (isInitialLoad) {
          const cacheKey = `initial_${activeCustomer.sport_id}_${activeCustomerId}`;
          const cachedData = dataCache[cacheKey];
          const now = Date.now();

          if (cachedData && now - cachedData.timestamp < CACHE_DURATION) {
            setData(cachedData.data);
            setDisplayedData(cachedData.data);
            setLoading(false);
            return;
          }
        }

        // Set sportId and fetch dynamic columns if not already set
        let currentDynamicColumns = dynamicColumns;
        let currentFilterColumns = filterColumns;

        // Only fetch columns if sport changed OR we don't have columns loaded yet
        const shouldFetchColumns =
          !sportId ||
          sportId !== activeCustomer.sport_id ||
          dynamicColumns.length === 0 ||
          filterColumns.length === 0;

        if (shouldFetchColumns) {
          setSportId(activeCustomer.sport_id);
          try {
            // Fetch columns for table display (with search_column_display filter)
            const displayColumns = await fetchSportColumnConfig(
              activeCustomer.sport_id,
              false,
              true,
              dataSource
            );
            setDynamicColumns(displayColumns);
            currentDynamicColumns = displayColumns;

            // Fetch columns for filters (all stats)
            const allColumns = await fetchSportColumnConfig(
              activeCustomer.sport_id,
              true
            );
            setFilterColumns(allColumns);
            currentFilterColumns = allColumns;
          } catch (error) {
            setDynamicColumns([]);
            setFilterColumns([]);
            currentDynamicColumns = [];
            currentFilterColumns = [];
          }
        }

        // Always fetch season data when sport_id is available (independent of column fetching)
        // This ensures seasonData is set even if columns were already loaded
        // Fetch if sport changed, if we haven't set sportId yet, or if this is an initial load
        const shouldFetchSeason =
          !sportId ||
          sportId !== activeCustomer.sport_id ||
          (isInitialLoad && seasonData === null);

        if (shouldFetchSeason) {
          try {
            const season = await fetchSeasonData(
              Number(activeCustomer.sport_id),
              dataSource
            );
            setSeasonData(season);
          } catch (error) {
            setSeasonData(null);
          }
        }

        // Create display columns list based on the configuration
        const columnConfig = DATA_SOURCE_COLUMN_CONFIG[dataSource];
        // Determine if transfer_odds should be included
        // Only show on pre-portal (all_athletes) view
        // For football: show if they DON'T have the football-specific NAIA package
        // For other sports: show if they DO have the sport-specific NAIA package
        const isFootball = activeSportAbbrev?.toLowerCase() === "fb";
        const sportAbbrev = activeSportAbbrev?.toLowerCase();

        // Check if user has a NAIA package for this sport
        let hasNaiaPackage = false;
        if (sportAbbrev) {
          const userPackageNumbers = (userDetails?.packages || []).map(
            (pkg: string | number) => Number(pkg)
          );
          const sportPackages = getUserPackagesForSport(
            sportAbbrev,
            userPackageNumbers
          );
          hasNaiaPackage = sportPackages.some((pkg) => pkg.is_naia);
        }

        const shouldIncludeTransferOdds =
          dataSource === "all_athletes" &&
          (isFootball ? !hasNaiaPackage : hasNaiaPackage);

        const displayColumns = [
          // Conditionally include columns based on configuration
          // Include transfer_odds based on sport and package (only on pre-portal)
          // Also include initiated_date when transfer_odds is shown (needed for date display)
          ...(shouldIncludeTransferOdds
            ? ["transfer_odds", "initiated_date"]
            : []),
          ...(columnConfig.date ? ["date"] : []),
          ...(columnConfig.athletic_aid ? ["athletic_aid"] : []),
          ...(columnConfig.position ? ["position"] : []),
          ...(columnConfig.high_name ? ["high_name"] : []),
          ...(columnConfig.state ? ["state"] : []),
          ...(columnConfig.college_state ? ["school_state"] : []),
          ...(columnConfig.true_score ? ["true_score"] : []),
          // Always include athletic_projection for hs_athletes map view (needed for marker colors)
          ...(dataSource === "hs_athletes" && hsAthleteViewMode === "map"
            ? ["athletic_projection"]
            : []),
          // Add dynamic stat columns
          ...(currentDynamicColumns.length > 0
            ? currentDynamicColumns.map(
                (col) =>
                  col.sanitized_column_name ||
                  col.data_type_name?.toLowerCase().replace(/\s+/g, "_") ||
                  col.display_name.toLowerCase().replace(/\s+/g, "_")
              )
            : []),
        ];

        // Get user's school_id from active customer
        const userSchoolId = activeCustomer?.school_id;

        // Use higher limit when map view is active for hs_athletes
        const limit =
          dataSource === "hs_athletes" && hsAthleteViewMode === "map"
            ? 100
            : ITEMS_PER_PAGE;

        // Prepare fetch parameters
        const fetchParams = {
          page: targetPage,
          limit: limit,
          sportId: activeCustomer.sport_id,
          dataSource: dataSource, // Use the dataSource prop
          displayColumns,
          sportAbbrev: activeSportAbbrev || undefined,
          userPackages: userDetails?.packages || [],
          dynamicColumns: currentFilterColumns, // Use filter columns for filtering
          userSchoolId, // Pass user's school_id to filter out their own school
          ...(isFiltered && { filters, search }),
          ...(targetSortField &&
            targetSortOrder && {
              sortField: targetSortField,
              sortOrder: targetSortOrder,
            }),
        };

        const athleteData = await fetchAthleteData(activeSport, fetchParams);

        let finalData: AthleteData[];

        if (isLoadMore) {
          // For load more, merge with existing data
          // Handle null IDs by using a combination of id and athlete_name for uniqueness
          const existingAthletesMap = new Map();
          displayedData.forEach((athlete, index) => {
            const uniqueKey =
              athlete.id || `null_${athlete.athlete_name}_${index}`;
            existingAthletesMap.set(uniqueKey, athlete);
          });

          athleteData.data.forEach((athlete, index) => {
            const uniqueKey =
              athlete.id || `null_${athlete.athlete_name}_${index}`;
            if (!existingAthletesMap.has(uniqueKey)) {
              existingAthletesMap.set(uniqueKey, athlete);
            }
          });
          finalData = Array.from(existingAthletesMap.values());
        } else {
          // For initial load or filtered data, ensure uniqueness
          // Handle null IDs by using a combination of id and athlete_name for uniqueness
          const uniqueAthletesMap = new Map();
          athleteData.data.forEach((athlete, index) => {
            // Create a unique key that handles null IDs
            const uniqueKey =
              athlete.id || `null_${athlete.athlete_name}_${index}`;
            if (!uniqueAthletesMap.has(uniqueKey)) {
              uniqueAthletesMap.set(uniqueKey, athlete);
            }
          });
          finalData = Array.from(uniqueAthletesMap.values());
        }

        // Update record counts
        if (isInitialLoad) {
          setTotalRecords(athleteData.totalCount || 0);
          setFilteredRecords(athleteData.data.length);
        } else if (isFiltered) {
          // For filtered data, update the total records to show how many match the filter
          setTotalRecords(athleteData.totalCount || 0);
          setFilteredRecords(athleteData.data.length);
        } else if (isLoadMore) {
          // For load more, update the filtered count to reflect the total displayed data
          setFilteredRecords(finalData.length);
        }

        // Height sorting is now handled in SQL, so no frontend sorting needed

        // Update state based on operation type
        if (isInitialLoad) {
          setData(finalData);
          setDisplayedData(finalData);

          // Cache the data for initial loads
          const cacheKey = `initial_${activeCustomer.sport_id}_${activeCustomerId}`;
          setDataCache((prev) => ({
            ...prev,
            [cacheKey]: { data: finalData, timestamp: Date.now() },
          }));
        } else if (isLoadMore) {
          setDisplayedData(finalData);
          setPage(targetPage);
        } else {
          // Filtered data
          setDisplayedData(finalData);
          setPage(1); // Reset to first page for filtered results
        }

        setHasMore(athleteData.hasMore);

        // Fetch ratings for the loaded athletes (filter out null/undefined IDs)
        const athleteIds = athleteData.data
          .map((athlete) => athlete.id)
          .filter((id) => id != null && id !== "null" && id !== "");
        if (athleteIds.length > 0 && activeCustomerId) {
          try {
            const ratingsMap = await fetchAthleteRatings(
              athleteIds,
              activeCustomerId
            );

            if (isLoadMore) {
              setAthleteRatings((prev) => ({ ...prev, ...ratingsMap }));
            } else {
              setAthleteRatings(ratingsMap);
            }
          } catch (error) {
            // Error handled silently
          }
        }

        // Fetch comment counts for newly loaded athletes (only for load more)
        if (isLoadMore && athleteIds.length > 0) {
          try {
            const commentCounts = await CommentService.getCommentCounts(
              athleteIds
            );
            const newCommentCounts = {
              ...athleteCommentCounts,
              ...commentCounts,
            };
            setAthleteCommentCounts(newCommentCounts);
          } catch (error) {
            // Error handled silently
          }
        }
      } catch (err) {
        // Check if we're in maintenance mode
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.startsWith("MAINTENANCE_MODE:")) {
          if (!isMaintenanceMode) {
            startMaintenanceTimer();
            Modal.error({
              title: "System Update in Progress",
              content: (
                <div>
                  <p>
                    <strong>
                      We are currently making improvements to our data system.
                    </strong>
                  </p>
                  <p>
                    The page will automatically refresh in{" "}
                    {Math.floor(maintenanceTimer / 60)}:
                    {(maintenanceTimer % 60).toString().padStart(2, "0")}.
                  </p>
                  <Progress
                    percent={Math.round((maintenanceTimer / 120) * 100)}
                    status="active"
                  />
                  <p>Thank you for your patience!</p>
                </div>
              ),
              okText: "Got it",
              maskClosable: false,
              centered: true,
              width: 500,
              style: { zIndex: 9999 },
            });
          }
          // Don't set error state in maintenance mode
        } else {
          // For other errors, set the general error message
          setError("Failed to load data");
        }
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      activeCustomer,
      activeCustomerId,
      activeSport,
      sportId,
      dataCache,
      activeSportAbbrev,
      userDetails?.packages,
      highSchoolViewMode,
      hsAthleteViewMode,
    ]
  ); // Removed displayedData and athleteCommentCounts from dependencies to prevent infinite loop

  // Initial data load
  useEffect(() => {
    if (!isMaintenanceMode) {
      loadAthleteData({
        isInitialLoad: true,
        sortField,
        sortOrder,
      });
    }
  }, [
    activeCustomer,
    activeCustomerId,
    activeSport,
    sortField,
    sortOrder,
    isMaintenanceMode,
  ]);

  // Reload data when switching to map view to fetch higher limits
  useEffect(() => {
    if (
      !isMaintenanceMode &&
      (highSchoolViewMode === "map" || hsAthleteViewMode === "map")
    ) {
      // Only reload if we have data already loaded (not initial load)
      if (displayedData.length > 0 || data.length > 0) {
        loadAthleteData({
          isFiltered:
            Object.keys(activeFilters).length > 0 || searchQuery.trim() !== "",
          filters: activeFilters,
          search: searchQuery,
          sortField,
          sortOrder,
        });
      }
    }
  }, [highSchoolViewMode, hsAthleteViewMode]);

  // Auto-retry after maintenance mode ends
  useEffect(() => {
    if (!isMaintenanceMode && maintenanceTimer === 0) {
      // Perform a full page refresh to ensure everything is properly reloaded
      window.location.reload();
    }
  }, [isMaintenanceMode, maintenanceTimer]);

  // Update search query when debounced value changes
  useEffect(() => {
    if (debouncedSearchQuery !== prevSearchQueryRef.current) {
      prevSearchQueryRef.current = debouncedSearchQuery;
      setSearchQuery(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, setSearchQuery]);

  // Sync local search input with external search query changes (only when searchQuery changes externally)
  useEffect(() => {
    if (
      searchQuery !== prevSearchQueryRef.current &&
      searchQuery !== localSearchInput
    ) {
      setLocalSearchInput(searchQuery);
    }
  }, [searchQuery, localSearchInput]); // Keep only necessary dependencies

  useEffect(() => {
    if (activeCustomerId) {
      setUserTeamId(activeCustomerId);
    }
  }, [activeCustomerId]);

  // Load more data function
  const loadMoreData = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    await loadAthleteData({
      isLoadMore: true,
      page: page + 1,
      sortField,
      sortOrder,
      // Preserve current filters and search when loading more data
      isFiltered:
        Object.keys(activeFilters).length > 0 || searchQuery.trim() !== "",
      filters: activeFilters,
      search: searchQuery,
    });
  }, [
    loading,
    hasMore,
    page,
    sortField,
    sortOrder,
    activeFilters,
    searchQuery,
    loadAthleteData,
  ]); // Added loadAthleteData to dependencies to prevent stale closures

  useEffect(() => {
    const handleScroll = () => {
      const tableContainer = document.querySelector(".ant-table-body");

      if (!tableContainer) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = tableContainer;

      // Save scroll position to sessionStorage
      try {
        const scrollKey = getScrollPositionKey();
        sessionStorage.setItem(scrollKey, String(scrollTop));
      } catch (error) {
        // Ignore storage errors (e.g., in private browsing mode)
      }

      // Handle load more functionality
      if (
        !loading &&
        hasMore &&
        scrollHeight - scrollTop - clientHeight < 100
      ) {
        loadMoreData();
      }
    };

    const tableContainer = document.querySelector(".ant-table-body");

    if (tableContainer) {
      tableContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener("scroll", handleScroll);
      }
    };
  }, [loading, hasMore, data, page, loadMoreData]);

  // Clustering function for high schools
  type Cluster = { lat: number; lng: number; count: number; schools: any[] };
  type ClusteringResult = { clusters: Cluster[]; unclustered: any[] };

  const clusterSchools = useCallback(
    (schools: any[], zoom: number): ClusteringResult => {
      // Only cluster when zoomed out (zoom < 11)
      if (zoom >= 11) {
        return { clusters: [], unclustered: schools };
      }

      const clusters: Array<{
        lat: number;
        lng: number;
        count: number;
        schools: any[];
      }> = [];
      const unclustered: any[] = [];
      const processed = new Set<number>();

      // Distance threshold in degrees (adjust based on zoom level)
      // Reduced thresholds to cluster less - only very close schools will cluster
      // Smaller threshold for higher zoom, larger for lower zoom
      const threshold = zoom < 6 ? 0.8 : zoom < 8 ? 0.4 : zoom < 10 ? 0.2 : 0.1;

      schools.forEach((school, index) => {
        if (processed.has(index)) return;

        const lat = (school as any).address_latitude as
          | number
          | null
          | undefined;
        const lng = (school as any).address_longitude as
          | number
          | null
          | undefined;

        if (!lat || !lng) {
          unclustered.push(school);
          return;
        }

        const nearby: any[] = [school];
        processed.add(index);

        // Find nearby schools
        schools.forEach((otherSchool, otherIndex) => {
          if (processed.has(otherIndex) || index === otherIndex) return;

          const otherLat = (otherSchool as any).address_latitude as
            | number
            | null
            | undefined;
          const otherLng = (otherSchool as any).address_longitude as
            | number
            | null
            | undefined;

          if (!otherLat || !otherLng) return;

          // Calculate distance in degrees
          const latDiff = Math.abs(lat - otherLat);
          const lngDiff = Math.abs(lng - otherLng);
          const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

          if (distance < threshold) {
            nearby.push(otherSchool);
            processed.add(otherIndex);
          }
        });

        if (nearby.length > 1) {
          // Create cluster
          const avgLat =
            nearby.reduce(
              (sum, s) => sum + ((s as any).address_latitude || 0),
              0
            ) / nearby.length;
          const avgLng =
            nearby.reduce(
              (sum, s) => sum + ((s as any).address_longitude || 0),
              0
            ) / nearby.length;
          clusters.push({
            lat: avgLat,
            lng: avgLng,
            count: nearby.length,
            schools: nearby,
          });
        } else {
          unclustered.push(school);
        }
      });

      return { clusters, unclustered };
    },
    []
  );

  // Compute clusters for high schools map
  const highSchoolClusters = useMemo(() => {
    if (dataSource !== "high_schools" || highSchoolViewMode !== "map") {
      return { clusters: [], unclustered: [] };
    }
    return clusterSchools(displayedData, mapZoom);
  }, [displayedData, mapZoom, dataSource, highSchoolViewMode, clusterSchools]);

  // Fit map bounds to show all schools when in map view
  useEffect(() => {
    if (!isMapLoaded || !isMapApiLoaded || !mapRef.current) {
      return;
    }

    const isHighSchoolMap =
      highSchoolViewMode === "map" && dataSource === "high_schools";
    const isHsAthleteMap =
      hsAthleteViewMode === "map" && dataSource === "hs_athletes";

    if (!isHighSchoolMap && !isHsAthleteMap) {
      // Reset ref when not in map view
      mapBoundsFittedRef.current = false;
      return;
    }

    const items = displayedData as any[];
    const validItems = items.filter((item) => {
      const lat = item.address_latitude as number | null | undefined;
      const lng = item.address_longitude as number | null | undefined;
      return lat != null && lng != null && !isNaN(lat) && !isNaN(lng);
    });

    if (validItems.length === 0) {
      return;
    }

    const bounds = new window.google.maps.LatLngBounds();
    validItems.forEach((item) => {
      const lat = item.address_latitude as number;
      const lng = item.address_longitude as number;
      bounds.extend(new window.google.maps.LatLng(lat, lng));
    });

    // Fit bounds with padding
    if (mapRef.current) {
      // Listen for idle event to update center after fitBounds completes
      const updateCenter = () => {
        if (mapRef.current) {
          const center = mapRef.current.getCenter();
          if (center) {
            setMapCenter({
              lat: center.lat(),
              lng: center.lng(),
            });
          }
        }
      };

      // Use addListenerOnce which automatically removes itself after firing
      window.google.maps.event.addListenerOnce(
        mapRef.current,
        "idle",
        updateCenter
      );

      mapRef.current.fitBounds(bounds, {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      });
      // Mark that bounds have been fitted to prevent center reset
      mapBoundsFittedRef.current = true;
    }
  }, [
    displayedData,
    isMapLoaded,
    isMapApiLoaded,
    highSchoolViewMode,
    hsAthleteViewMode,
    dataSource,
  ]);

  const applyFilters = (filters: FilterState) => {
    setActiveFilters(filters);
  };

  const resetFilters = () => {
    setActiveFilters({});
  };

  // Filter application with debouncing
  useEffect(() => {
    // Only run if we have initial data loaded and basic customer info
    if (!activeCustomer || !activeCustomerId) return;

    // Prevent multiple simultaneous filter applications
    if (loading) return;

    // Reset scroll restoration flag when filters/search change
    scrollPositionRestoredRef.current = false;

    // Always run the query when filters or search change, even if filters are empty
    loadAthleteData({
      isFiltered: true,
      filters: debouncedFilters,
      search: searchQuery,
      sortField,
      sortOrder,
    });
  }, [debouncedFilters, searchQuery, sortField, sortOrder]); // Use debounced filters and simplified dependencies

  const rowSelection: TableProps<AthleteData>["rowSelection"] = {
    selectedRowKeys: selectedRowKeys,
    onChange: (
      newSelectedRowKeys: React.Key[],
      selectedRows: AthleteData[]
    ) => {
      setSelectedRowKeys(newSelectedRowKeys);
      setSelectedAthletes(selectedRows);
    },
    getCheckboxProps: (record: AthleteData) => ({
      disabled: athletesOnAllBoards.includes(record.id),
      name: record.athlete_name,
    }),
  };

  // High school row selection
  const highSchoolRowSelection: TableProps<HighSchoolData>["rowSelection"] = {
    onChange: (
      selectedRowKeys: React.Key[],
      selectedRows: HighSchoolData[]
    ) => {
      setSelectedHighSchools(selectedRows);
    },
  };

  const handleCancel = () => {
    setIsChatVisible(false);
  };

  const handleChat = (record: AthleteData) => {
    setSelectedPlyer(record);
    setIsChatVisible(true);
    fetchcomment(record.id);
  };

  const fetchcomment = async (athleteId: string) => {
    try {
      const athlete = displayedData.find((a) => a.id === athleteId);
      if (!athlete) {
        return;
      }

      if (!userTeamId) {
        return;
      }

      // Fetch comments using the service
      const commentData = await CommentService.getCommentsForAthlete(athleteId);
      setcomment(commentData);

      // Update the comment count for this athlete
      setAthleteCommentCounts((prev) => ({
        ...prev,
        [athleteId]: commentData.length,
      }));
    } catch (error) {
      setcomment([]);
    }
  };

  const handleSaveComment = async () => {
    if (
      !selectedPlyer ||
      !newComment.trim() ||
      isSubmitting ||
      !userTeamId ||
      !userDetails
    )
      return;

    const athleteId = selectedPlyer.id;
    if (!athleteId) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        await CommentService.updateComment(
          editingComment.id,
          userDetails.id,
          newComment
        );
      } else {
        // Create new comment
        await CommentService.createComment({
          content: newComment,
          athlete_id: athleteId,
          user_id: userDetails.id,
          customer_id: userTeamId,
        });
      }

      // Refresh comment
      await fetchcomment(selectedPlyer.id);
      setNewComment("");
      setEditingComment(null);
    } catch (error) {
      // Error handled silently
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingComment(comment);
    setNewComment(comment.content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      if (!userDetails) return;
      await CommentService.deleteComment(commentId, userDetails.id);

      // Refresh comment
      await fetchcomment(selectedPlyer?.id || "");
    } catch (error) {
      // Error handled silently
    }
  };

  // Add a function to fetch comment counts for all athletes
  const fetchAllCommentCounts = async () => {
    try {
      if (!userTeamId) {
        return;
      }

      // Get all athlete IDs from the displayedData instead of data
      const athleteIds = displayedData
        .map((athlete) => athlete.id)
        .filter(Boolean);

      if (athleteIds.length === 0) return;

      // Fetch comment counts using the service
      const commentCounts = await CommentService.getCommentCounts(athleteIds);

      // Update the ref to track which athletes we've fetched counts for
      athleteIds.forEach((id) => fetchedCommentCountsRef.current.add(id));

      setAthleteCommentCounts(commentCounts);
    } catch (error) {
      console.error("Error fetching comment counts:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  // Update the useEffect to use displayedData instead of data
  useEffect(() => {
    if (displayedData.length > 0 && userTeamId) {
      // Only fetch comment counts if we don't already have them for these athletes
      const athletesWithoutCommentCounts = displayedData.filter(
        (athlete) => !fetchedCommentCountsRef.current.has(athlete.id)
      );

      if (athletesWithoutCommentCounts.length > 0) {
        fetchAllCommentCounts();
      }
    }
  }, [displayedData, userTeamId]); // Removed athleteCommentCounts from dependencies to prevent infinite loop

  // Add this function to fetch athletes already in the user's recruiting board
  const fetchRecruitingBoardAthletes = async () => {
    if (!userDetails?.id || !activeCustomerId) return;

    try {
      // Get all boards for this customer
      const { data: boardsData, error: boardsError } = await supabase
        .from("recruiting_board_board")
        .select("id")
        .eq("customer_id", activeCustomerId)
        .is("recruiting_board_column_id", null)
        .is("ended_at", null);

      if (boardsError || !boardsData || boardsData.length === 0) {
        return;
      }

      const totalBoardCount = boardsData.length;
      const boardIds = boardsData.map((b: { id: string }) => b.id);

      // Get all athletes on any board for row highlighting
      const { data, error } = await supabase
        .from("recruiting_board_athlete")
        .select("athlete_id, recruiting_board_board_id")
        .in("recruiting_board_board_id", boardIds)
        .is("ended_at", null);

      if (error) {
        return;
      }

      // Extract unique athlete IDs for row highlighting
      type AthleteBoardData = {
        athlete_id: string;
        recruiting_board_board_id: string;
      };
      const athleteIds: string[] = [
        ...new Set(
          ((data || []) as AthleteBoardData[]).map(
            (item: AthleteBoardData) => item.athlete_id
          )
        ),
      ];
      setRecruitingBoardAthletes(athleteIds);

      // Calculate which athletes are on ALL boards
      const athleteBoardCount = new Map<string, Set<string>>();
      data.forEach(
        (item: { athlete_id: string; recruiting_board_board_id: string }) => {
          if (!athleteBoardCount.has(item.athlete_id)) {
            athleteBoardCount.set(item.athlete_id, new Set());
          }
          athleteBoardCount
            .get(item.athlete_id)!
            .add(item.recruiting_board_board_id);
        }
      );

      const athletesOnAll = Array.from(athleteBoardCount.entries())
        .filter(([_, boards]) => boards.size === totalBoardCount)
        .map(([athleteId, _]) => athleteId);

      setAthletesOnAllBoards(athletesOnAll);
    } catch (error) {
      // Error handled silently
    } finally {
      setIsLoadingRecruitingBoard(false);
    }
  };

  // Call this function when the component mounts and when the session changes
  useEffect(() => {
    if (userDetails?.id && activeCustomerId) {
      fetchRecruitingBoardAthletes();
    }
  }, [userDetails?.id, activeCustomerId, availableBoards.length]);

  // Reset the comment counts ref when user changes
  useEffect(() => {
    fetchedCommentCountsRef.current.clear();
  }, [userTeamId]);

  // Fetch available boards when customer is available
  useEffect(() => {
    const fetchBoards = async () => {
      if (!activeCustomerId) return;

      try {
        const { data, error } = await supabase
          .from("recruiting_board_board")
          .select("id, name")
          .eq("customer_id", activeCustomerId)
          .is("recruiting_board_column_id", null)
          .is("ended_at", null)
          .order("display_order");

        if (error) {
          console.error("Error fetching boards:", error);
          return;
        }

        setAvailableBoards(data || []);

        // Set default board (Main or first available)
        if (data && data.length > 0) {
          const mainBoard = data.find((b: any) => b.name === "Main") || data[0];
          setSelectedBoardId(mainBoard.id);
          setSelectedBoardName(mainBoard.name);
        }
      } catch (error) {
        console.error("Error in fetchBoards:", error);
      }
    };

    fetchBoards();
  }, [activeCustomerId]);

  // Add athletes to recruiting board (now uses selected board)
  const handleAddToRecruitingBoard = async (
    boardIdOverride?: string,
    boardNameOverride?: string
  ) => {
    if (selectedAthletes.length === 0) {
      alert(
        "Please select at least one athlete to add to the recruiting board."
      );
      return;
    }

    if (!userDetails) {
      alert("You must be logged in to add athletes to the recruiting board.");
      return;
    }
    if (!activeCustomerId) {
      alert(
        "No active customer ID found. Please make sure your account is properly set up."
      );
      return;
    }

    setIsAddingToRecruitingBoard(true);

    try {
      const userId = userDetails.id;

      // Use the override if provided, otherwise fall back to selected board ID
      let boardId = boardIdOverride || selectedBoardId;
      const boardName = boardNameOverride || selectedBoardName;

      if (!boardId) {
        // Get the default board (Main if exists, or single board if only one exists)
        boardId = await getDefaultBoardForAdding(activeCustomerId);

        // Create Main board if no boards exist
        if (!boardId) {
          const { data: newBoard, error: createError } = await supabase
            .from("recruiting_board_board")
            .insert({
              customer_id: activeCustomerId,
              name: "Main",
              recruiting_board_column_id: null,
              display_order: 1,
            })
            .select("id")
            .single();

          if (createError) {
            alert(`Error creating recruiting board: ${createError.message}`);
            return;
          }

          boardId = newBoard.id;
        }
      }

      // For each athlete, find or create the appropriate column based on their position
      const recruitingBoardEntries = [];

      // Always assign to Unassigned column
      const positionName = "Unassigned";

      // Get or create the column
      const { data: columnData, error: columnError } = await supabase
        .from("recruiting_board_column")
        .select("id")
        .eq("customer_id", activeCustomerId)
        .eq("recruiting_board_board_id", boardId)
        .eq("name", positionName)
        .is("ended_at", null)
        .single();

      let columnId = columnData?.id;

      // Create column if it doesn't exist
      if (!columnId && (columnError?.code === "PGRST116" || !columnData)) {
        // Get the max display order
        const { data: maxOrderData } = await supabase
          .from("recruiting_board_column")
          .select("display_order")
          .eq("customer_id", activeCustomerId)
          .eq("recruiting_board_board_id", boardId)
          .is("ended_at", null)
          .order("display_order", { ascending: false })
          .limit(1);

        const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

        const { data: newColumn, error: createColumnError } = await supabase
          .from("recruiting_board_column")
          .insert({
            customer_id: activeCustomerId,
            recruiting_board_board_id: boardId,
            name: positionName,
            display_order: nextOrder,
          })
          .select("id")
          .single();

        if (createColumnError) {
          alert(
            `Error creating Unassigned column: ${createColumnError.message}`
          );
          return;
        }

        columnId = newColumn.id;
      }

      // Check which selected athletes are already on this board
      const selectedAthleteIds = selectedAthletes.map((a) => a.id);
      const { data: existingOnBoard, error: checkError } = await supabase
        .from("recruiting_board_athlete")
        .select("athlete_id")
        .eq("recruiting_board_board_id", boardId)
        .in("athlete_id", selectedAthleteIds)
        .is("ended_at", null);

      if (checkError) {
        console.error("Error checking existing athletes on board:", checkError);
        // Continue anyway - we'll attempt to add all
      }

      // Filter out athletes already on this board
      const existingAthleteIds = new Set(
        existingOnBoard?.map(
          (item: { athlete_id: string }) => item.athlete_id
        ) || []
      );
      const athletesToAdd = selectedAthletes.filter(
        (athlete) => !existingAthleteIds.has(athlete.id)
      );

      if (athletesToAdd.length === 0) {
        alert(`All selected athletes are already on ${selectedBoardName}.`);
        setIsAddingToRecruitingBoard(false);
        return;
      }

      // Get the current max rank for this column to assign unique ranks
      const { data: maxRankData } = await supabase
        .from("recruiting_board_athlete")
        .select("rank")
        .eq("recruiting_board_board_id", boardId)
        .eq("recruiting_board_column_id", columnId)
        .is("ended_at", null)
        .order("rank", { ascending: false })
        .limit(1);

      let nextRank = (maxRankData?.[0]?.rank || 0) + 1;

      // Create entries for athletes not already on the board
      for (const athlete of athletesToAdd) {
        recruitingBoardEntries.push({
          customer_id: activeCustomerId,
          recruiting_board_board_id: boardId,
          recruiting_board_column_id: columnId,
          athlete_id: athlete.id,
          user_id: userId,
          rank: nextRank++, // Assign unique incremental rank
          source:
            dataSource === "transfer_portal"
              ? "portal"
              : dataSource === "juco"
              ? "juco"
              : dataSource === "hs_athletes"
              ? "high_school"
              : dataSource === "all_athletes"
              ? "pre-portal"
              : null,
          customer_position:
            athlete.primary_position || athlete.position || null,
        });
      }

      // Insert the data into the recruiting_board_athlete table
      const { data: insertData, error: insertError } = await supabase
        .from("recruiting_board_athlete")
        .insert(recruitingBoardEntries)
        .select();

      if (insertError) {
        alert(
          `Error adding athletes to recruiting board: ${
            insertError.message || "Unknown error"
          }`
        );
        return;
      }

      // If any of the added athletes are pre-transfer athletes, add them to player_tracking table (only for ultra, gold, or platinum packages)
      if (dataSource === "all_athletes") {
        // Check if user has ultra, gold, or platinum packages
        const userPackageNumbers = (userDetails?.packages || []).map((pkg) =>
          parseInt(pkg, 10)
        );
        const ultraPackageIds = getPackageIdsByType("ultra");
        const goldPackageIds = getPackageIdsByType("gold");
        const platinumPackageIds = getPackageIdsByType("platinum");
        const allowedPackageIds = [
          ...ultraPackageIds,
          ...goldPackageIds,
          ...platinumPackageIds,
        ];

        const hasAllowedPackage = hasPackageAccess(
          userPackageNumbers,
          allowedPackageIds
        );

        if (hasAllowedPackage) {
          try {
            // Fetch text_alert_default from user_detail table
            const { data: userDetailData, error: userDetailError } =
              await supabase
                .from("user_detail")
                .select("text_alert_default")
                .eq("id", userId)
                .single();

            if (userDetailError) {
              console.error(
                "Error fetching user detail for text_alert_default:",
                userDetailError
              );
              // Continue even if we can't get text_alert_default
            }

            // text_alert should be a boolean based on text_alert_default (default to false if not found)
            const textAlert = userDetailData?.text_alert_default ?? false;

            // Insert into player_tracking table for each pre-transfer athlete
            const trackingEntries = athletesToAdd.map((athlete) => ({
              athlete_id: athlete.id,
              user_id: userId,
              customer_id: activeCustomerId,
              recipient: userId,
              text_alert: textAlert,
            }));

            const { error: trackingError } = await supabase
              .from("player_tracking")
              .insert(trackingEntries);

            if (trackingError) {
              console.error(
                "Error adding athletes to player_tracking:",
                trackingError
              );
              // Don't fail the whole operation if player_tracking insert fails
            }
          } catch (trackingErr) {
            console.error("Error in player_tracking insert:", trackingErr);
            // Don't fail the whole operation if player_tracking insert fails
          }
        }
      }

      // Show success message with accurate count
      const totalSelected = selectedAthletes.length;
      const addedCount = athletesToAdd.length;
      const alreadyOnBoardCount = totalSelected - addedCount;

      let message = "";
      if (alreadyOnBoardCount === 0) {
        message = `${addedCount} player${
          addedCount > 1 ? "s" : ""
        } added to ${boardName}!`;
      } else {
        message = `Added ${addedCount} of ${totalSelected} selected athlete${
          totalSelected > 1 ? "s" : ""
        } to ${boardName} (${alreadyOnBoardCount} already on board)`;
      }

      setSuccessMessage(message);
      setShowSuccessMessage(true);

      // Refetch to update both recruiting board athletes and athletes on all boards
      await fetchRecruitingBoardAthletes();

      setSelectedAthletes([]); // Clear selection after successful addition
      setSelectedRowKeys([]); // Clear row selection keys to uncheck checkboxes
    } catch (error) {
      if (error instanceof Error) {
        alert(`An unexpected error occurred: ${error.message}`);
      } else {
        alert("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsAddingToRecruitingBoard(false);
    }
  };

  // Handle board selection
  const handleBoardSelected = async (boardId: string, boardName: string) => {
    setSelectedBoardId(boardId);
    setSelectedBoardName(boardName);
    setIsBoardModalVisible(false);
  };

  // Handle printing selected high schools
  // Road map functions for high schools
  const handleRemoveSchool = (schoolId: string) => {
    setRoadMapSelectedHighSchools((prev) =>
      prev.filter((school) => String(school.id) !== schoolId)
    );
  };

  // Helper function to save high schools to localStorage
  const saveHighSchoolsToLocalStorage = () => {
    if (roadMapSelectedHighSchools.length === 0) return;

    // Convert roadMapSelectedHighSchools to the format expected by road planner
    const selectedAddresses: string[] = [];
    const selectedSchoolData: any[] = [];

    roadMapSelectedHighSchools.forEach((school) => {
      const schoolAny = school as any;
      // Create an address string from available data
      const addressParts: string[] = [];
      if (schoolAny.address_street1)
        addressParts.push(schoolAny.address_street1);
      if (schoolAny.address_city) addressParts.push(schoolAny.address_city);
      if (schoolAny.address_state) addressParts.push(schoolAny.address_state);
      if (schoolAny.address_zip) addressParts.push(schoolAny.address_zip);

      const address =
        addressParts.join(", ") ||
        `${school.school || ""}, ${schoolAny.school_state || ""}`;

      selectedAddresses.push(address);
      selectedSchoolData.push({
        school: school.school || "",
        address: address,
        county: schoolAny.hs_county || "",
        state: schoolAny.school_state || "",
        school_id: school.id,
        high_school_id: school.high_school_id || school.id,
        address_latitude: schoolAny.address_latitude,
        address_longitude: schoolAny.address_longitude,
        raw_data: {
          address_street1: schoolAny.address_street1 || "",
          address_city: schoolAny.address_city || "",
          address_state:
            schoolAny.address_state || schoolAny.school_state || "",
          address_zip: schoolAny.address_zip || "",
          high_school_id: String(school.high_school_id || school.id || ""),
        },
      });
    });

    // Save to localStorage
    try {
      localStorage.setItem(
        "selectedAddresses",
        JSON.stringify(selectedAddresses)
      );
      localStorage.setItem("schoolData", JSON.stringify(selectedSchoolData));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleSubmitToMap = () => {
    saveHighSchoolsToLocalStorage();
    // Navigate to road planner map
    router.push("/road-planner");
  };

  const clearAllSelections = () => {
    clearAllRoadPlanSelections();
  };

  // Road map functions for hs_athletes
  const handleRemoveAthlete = (athleteId: string) => {
    setRoadMapSelectedAthletes((prev) =>
      prev.filter((athlete) => String(athlete.id) !== athleteId)
    );
  };

  // Helper function to save athletes to localStorage
  const saveAthletesToLocalStorage = async () => {
    if (roadMapSelectedAthletes.length === 0) return;

    // Import the utility function to fetch school data
    const { fetchSchoolDataFromSchoolId } = await import(
      "@/app/(dashboard)/road-planner/utils/schoolDataUtils"
    );

    // Convert roadMapSelectedAthletes to the format expected by road planner
    const selectedAddresses: string[] = [];
    const selectedSchoolData: any[] = [];

    // Process each athlete to get their high school address
    for (const athlete of roadMapSelectedAthletes) {
      const athleteAny = athlete as any;

      // For hs_athletes, school_id is already the high school's school_id (no conversion needed)
      const schoolId = athlete.school_id || "";

      if (!schoolId) {
        console.warn("No school_id found for athlete:", athlete.athlete_name);
        continue;
      }

      // Fetch high school data to get the address
      let schoolData = null;
      try {
        schoolData = await fetchSchoolDataFromSchoolId(schoolId);
      } catch (error) {
        console.error("Error fetching school data for athlete:", error);
      }

      // Use high school address if available, otherwise fallback to athlete data
      let address = "";
      if (schoolData?.address) {
        address = schoolData.address;
      } else {
        // Fallback: try to construct address from athlete's high school fields
        const addressParts: string[] = [];
        if (athleteAny.hs_address_street1)
          addressParts.push(athleteAny.hs_address_street1);
        if (athleteAny.hs_address_city)
          addressParts.push(athleteAny.hs_address_city);
        if (athleteAny.school_state) addressParts.push(athleteAny.school_state);
        if (athleteAny.hs_address_zip)
          addressParts.push(athleteAny.hs_address_zip);

        address =
          addressParts.join(", ") ||
          `${athlete.high_name || ""}, ${athleteAny.school_state || ""}`;
      }

      selectedAddresses.push(address);

      // Merge athlete data with school data
      selectedSchoolData.push({
        school:
          schoolData?.school || athlete.high_name || athlete.athlete_name || "",
        address: address,
        county: schoolData?.county || athleteAny.hs_county || "",
        state:
          schoolData?.state ||
          athleteAny.school_state ||
          athlete.hometown_state ||
          "",
        school_id: schoolId,
        high_school_id: schoolId, // For compatibility, use school_id as high_school_id
        // Include all school data fields for the road planner
        ...(schoolData || {}),
        // Store athlete info in raw_data for the athlete card
        raw_data: {
          ...(schoolData?.raw_data || {}),
          high_school_id: String(schoolId),
          // Store athlete information for the athlete card
          athlete_id: athlete.id,
          athlete_name: athlete.athlete_name,
          athlete_image_url: athlete.image_url,
          athlete_position: athlete.position,
          athlete_athletic_projection:
            athleteAny.athleticProjection || athleteAny.athletic_projection,
          athlete_grad_year: athlete.gradYear || athleteAny.grad_year,
          athlete_cell_phone: athlete.cell_phone,
        },
      });
    }

    // Save to localStorage
    try {
      localStorage.setItem(
        "selectedAddresses",
        JSON.stringify(selectedAddresses)
      );
      localStorage.setItem("schoolData", JSON.stringify(selectedSchoolData));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  const handleSubmitAthletesToMap = async () => {
    await saveAthletesToLocalStorage();
    // Navigate to road planner map
    router.push("/road-planner/map?dataSource=hs_athletes");
  };

  const clearAllAthleteSelections = () => {
    setRoadMapSelectedAthletes([]);
    try {
      localStorage.removeItem("selectedAddresses");
      localStorage.removeItem("schoolData");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  };

  // Combined function to save both high schools and athletes to localStorage
  const saveCombinedToLocalStorage = async () => {
    const selectedAddresses: string[] = [];
    const selectedSchoolData: any[] = [];

    // Process high schools
    roadMapSelectedHighSchools.forEach((school) => {
      const schoolAny = school as any;
      const addressParts: string[] = [];
      if (schoolAny.address_street1)
        addressParts.push(schoolAny.address_street1);
      if (schoolAny.address_city) addressParts.push(schoolAny.address_city);
      if (schoolAny.address_state) addressParts.push(schoolAny.address_state);
      if (schoolAny.address_zip) addressParts.push(schoolAny.address_zip);

      const address =
        addressParts.join(", ") ||
        `${school.school || ""}, ${schoolAny.school_state || ""}`;

      selectedAddresses.push(address);
      selectedSchoolData.push({
        school: school.school || "",
        address: address,
        county: schoolAny.hs_county || "",
        state: schoolAny.school_state || "",
        school_id: school.id,
        high_school_id: school.high_school_id || school.id,
        address_latitude: schoolAny.address_latitude,
        address_longitude: schoolAny.address_longitude,
        raw_data: {
          address_street1: schoolAny.address_street1 || "",
          address_city: schoolAny.address_city || "",
          address_state:
            schoolAny.address_state || schoolAny.school_state || "",
          address_zip: schoolAny.address_zip || "",
          high_school_id: String(school.high_school_id || school.id || ""),
        },
      });
    });

    // Process athletes
    if (roadMapSelectedAthletes.length > 0) {
      const { fetchSchoolDataFromSchoolId } = await import(
        "@/app/(dashboard)/road-planner/utils/schoolDataUtils"
      );

      for (const athlete of roadMapSelectedAthletes) {
        const athleteAny = athlete as any;
        const schoolId = athlete.school_id || "";

        if (!schoolId) {
          console.warn("No school_id found for athlete:", athlete.athlete_name);
          continue;
        }

        let schoolData = null;
        try {
          schoolData = await fetchSchoolDataFromSchoolId(schoolId);
        } catch (error) {
          console.error("Error fetching school data for athlete:", error);
        }

        let address = "";
        if (schoolData?.address) {
          address = schoolData.address;
        } else {
          const addressParts: string[] = [];
          if (athleteAny.hs_address_street1)
            addressParts.push(athleteAny.hs_address_street1);
          if (athleteAny.hs_address_city)
            addressParts.push(athleteAny.hs_address_city);
          if (athleteAny.school_state)
            addressParts.push(athleteAny.school_state);
          if (athleteAny.hs_address_zip)
            addressParts.push(athleteAny.hs_address_zip);

          address =
            addressParts.join(", ") ||
            `${athlete.high_name || ""}, ${athleteAny.school_state || ""}`;
        }

        selectedAddresses.push(address);
        selectedSchoolData.push({
          school:
            schoolData?.school ||
            athlete.high_name ||
            athlete.athlete_name ||
            "",
          address: address,
          county: schoolData?.county || athleteAny.hs_county || "",
          state:
            schoolData?.state ||
            athleteAny.school_state ||
            athlete.hometown_state ||
            "",
          school_id: schoolId,
          high_school_id: schoolId,
          ...(schoolData || {}),
          raw_data: {
            ...(schoolData?.raw_data || {}),
            high_school_id: String(schoolId),
            athlete_id: athlete.id,
            athlete_name: athlete.athlete_name,
            athlete_image_url: athlete.image_url,
            athlete_position: athlete.position,
            athlete_athletic_projection:
              athleteAny.athleticProjection || athleteAny.athletic_projection,
            athlete_grad_year: athlete.gradYear || athleteAny.grad_year,
            athlete_cell_phone: athlete.cell_phone,
            athlete_twitter: athleteAny.twitter || athleteAny.twitter_handle,
          },
        });
      }
    }

    // Save to localStorage
    try {
      localStorage.setItem(
        "selectedAddresses",
        JSON.stringify(selectedAddresses)
      );
      localStorage.setItem("schoolData", JSON.stringify(selectedSchoolData));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  };

  // Combined clear function
  const clearAllRoadPlanSelections = () => {
    setRoadMapSelectedHighSchools([]);
    setRoadMapSelectedAthletes([]);
    try {
      localStorage.removeItem("selectedAddresses");
      localStorage.removeItem("schoolData");
      localStorage.removeItem("roadMapSelectedHighSchools");
      localStorage.removeItem("roadMapSelectedAthletes");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  };

  const handlePrintHighSchools = async () => {
    if (selectedHighSchools.length === 0) {
      alert("Please select at least one high school to print.");
      return;
    }

    setIsPrintingHighSchools(true);

    try {
      // Get the current user session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("You must be logged in to print. Please log in and try again.");
        setIsPrintingHighSchools(false);
        return;
      }

      // Fetch user details to get customer ID
      const userDetails = await fetchUserDetails();
      if (!userDetails?.customer_id) {
        alert(
          "Unable to print: Missing user details. Please try refreshing the page."
        );
        setIsPrintingHighSchools(false);
        return;
      }

      // Convert all school IDs
      const convertedSchoolIds = [];
      for (const school of selectedHighSchools) {
        try {
          const convertedId = await convertSchoolId(school.id);
          convertedSchoolIds.push(convertedId);
        } catch (conversionError) {
          console.error(
            `Error converting school ID ${school.id}:`,
            conversionError
          );
          alert(
            `Error converting school ID for ${school.school}. Please try again.`
          );
          setIsPrintingHighSchools(false);
          return;
        }
      }

      // Get email from the authentication session
      const coachEmail = session.user.email || "";

      // Prepare the request data (without cover_page)
      const requestData = await preparePrintRequestData(
        convertedSchoolIds,
        userDetails,
        coachEmail,
        {
          min_print_level: null,
          min_grad_year: null,
        }
      );

      // Send request to the cloud function
      await sendPrintRequest(requestData);

      // Show success message
      alert(
        `Print request submitted successfully for ${selectedHighSchools.length} school(s)! You'll receive the PDF via email shortly.`
      );
    } catch (error) {
      console.error("Error with print request:", error);
      alert(
        "An error occurred while processing your print request. Please try again."
      );
    } finally {
      setIsPrintingHighSchools(false);
    }
  };

  // Updated handler to use local search input with debouncing
  const handleSearch = (value: string) => {
    setLocalSearchInput(value); // Update local input state, debouncing will handle the actual search
  };

  // Restore scroll position when data is loaded or tab becomes visible
  useEffect(() => {
    if (!displayedData.length || loading) {
      return;
    }

    const restoreScrollPosition = () => {
      const tableContainer = document.querySelector(".ant-table-body");
      if (!tableContainer) {
        return;
      }

      try {
        const scrollKey = getScrollPositionKey();
        const savedScrollTop = sessionStorage.getItem(scrollKey);

        if (savedScrollTop && !scrollPositionRestoredRef.current) {
          const scrollTop = parseInt(savedScrollTop, 10);
          if (!isNaN(scrollTop) && scrollTop > 0) {
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
              tableContainer.scrollTop = scrollTop;
              scrollPositionRestoredRef.current = true;
            });
          }
        }
      } catch (error) {
        // Ignore storage errors
      }
    };

    // Small delay to ensure table is fully rendered
    const timeoutId = setTimeout(restoreScrollPosition, 100);

    return () => clearTimeout(timeoutId);
  }, [displayedData.length, loading, dataSource, activeCustomerId]);

  // --- DEBUG: Log in visibility handler and forcibly set loading states to false ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setLoading(false);
        setIsLoadingRecruitingBoard(false);
        setTableKey((k) => k + 1);

        // Reset scroll restoration flag when tab becomes visible
        scrollPositionRestoredRef.current = false;

        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));

          // Restore scroll position after a brief delay
          const tableContainer = document.querySelector(".ant-table-body");
          if (tableContainer) {
            try {
              const scrollKey = getScrollPositionKey();
              const savedScrollTop = sessionStorage.getItem(scrollKey);
              if (savedScrollTop) {
                const scrollTop = parseInt(savedScrollTop, 10);
                if (!isNaN(scrollTop) && scrollTop > 0) {
                  setTimeout(() => {
                    tableContainer.scrollTop = scrollTop;
                  }, 150);
                }
              }
            } catch (error) {
              // Ignore storage errors
            }
          }
        }, 50);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dataSource, activeCustomerId]);

  // Reset scroll restoration flag when dataSource changes
  useEffect(() => {
    scrollPositionRestoredRef.current = false;
  }, [dataSource, activeCustomerId]);

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      // Clean up maintenance timer
      if (maintenanceTimerRef.current) {
        clearInterval(maintenanceTimerRef.current);
        maintenanceTimerRef.current = null;
      }
    };
  }, []);

  // Load high school column configuration from hs_table_config
  // This is now handled within the data loading function to avoid two-step loading

  // Helper to check if any filter is active
  const isAnyFilterActive = Object.values(activeFilters).some(
    (val) =>
      (Array.isArray(val) && val.length > 0) ||
      (typeof val === "object" && val !== null && Object.keys(val).length > 0)
  );

  // Helper function to get data_type name for static filters
  const getDataTypeName = async (dataTypeId: number): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from("data_type")
        .select("name")
        .eq("id", dataTypeId)
        .single();

      if (error) {
        return `data_type_${dataTypeId}`;
      }

      return data?.name || `data_type_${dataTypeId}`;
    } catch (error) {
      return `data_type_${dataTypeId}`;
    }
  };

  // Helper to display active filters as a string
  const renderActiveFilters = async () => {
    const filterLabels: string[] = [];

    // Handle height filter
    if (activeFilters.height) {
      const {
        comparison,
        feet,
        inches,
        minFeet,
        minInches,
        maxFeet,
        maxInches,
      } = activeFilters.height;
      if (
        comparison === "between" &&
        minFeet !== undefined &&
        maxFeet !== undefined
      ) {
        const minTotalInches = minFeet * 12 + (minInches || 0);
        const maxTotalInches = maxFeet * 12 + (maxInches || 0);
        filterLabels.push(
          `height_total_inches Min: ${minTotalInches}, Max: ${maxTotalInches}`
        );
      } else if (comparison === "min" && feet !== undefined) {
        const totalInches = feet * 12 + (inches || 0);
        filterLabels.push(`height_total_inches Min: ${totalInches}`);
      } else if (comparison === "max" && feet !== undefined) {
        const totalInches = feet * 12 + (inches || 0);
        filterLabels.push(`height_total_inches Max: ${totalInches}`);
      }
    }

    // Handle static filters with async data_type lookups
    if (activeFilters.position?.length) {
      filterLabels.push(`Position: ${activeFilters.position.join(", ")}`);
    }
    if (activeFilters.divisions?.length)
      filterLabels.push(`Division: ${activeFilters.divisions.join(", ")}`);
    if (activeFilters.states?.length) {
      const stateName = await getDataTypeName(24);
      filterLabels.push(`Home State: ${activeFilters.states.join(", ")}`);
    }
    if (activeFilters.schools?.length) {
      // Fetch school names from IDs
      try {
        const allSchools = await fetchSchools();
        const selectedSchools = allSchools.filter((school) =>
          activeFilters.schools!.includes(school.id)
        );
        const schoolNames = selectedSchools
          .map((school) => school.name)
          .join(", ");
        filterLabels.push(`college: ${schoolNames}`);
      } catch (error) {
        filterLabels.push(`college: ${activeFilters.schools!.length} selected`);
      }
    }
    if (activeFilters.conference?.length) {
      filterLabels.push(`conference: ${activeFilters.conference.join(", ")}`);
    }
    if (activeFilters.international?.length) {
      // Handle "All International" selection specially
      const internationalLabels = activeFilters.international.map((item) =>
        item === "ALL_INTERNATIONAL" ? "All International" : item
      );
      filterLabels.push(`International: ${internationalLabels.join(", ")}`);
    }

    // Handle unified location filter
    if (activeFilters.location) {
      const { type, values, radius, recruitingArea } = activeFilters.location;

      switch (type) {
        case "hometown_state":
          filterLabels.push(`Hometown State: ${values?.join(", ") || "None"}`);
          break;
        case "international":
          const internationalLabels = values?.map((item: string) =>
            item === "ALL_INTERNATIONAL" ? "All International" : item
          );
          filterLabels.push(
            `International: ${internationalLabels?.join(", ") || "None"}`
          );
          break;
        case "county":
          filterLabels.push(`School County: ${values?.join(", ") || "None"}`);
          break;
        case "school_state":
          filterLabels.push(`School State: ${values?.join(", ") || "None"}`);
          break;
        case "radius":
          if (radius?.center && radius?.distance) {
            try {
              // Use coordinates if available, otherwise geocode the center
              let centerLat: number, centerLng: number;

              if (
                (radius as any).coordinates?.lat &&
                (radius as any).coordinates?.lng
              ) {
                centerLat = (radius as any).coordinates.lat;
                centerLng = (radius as any).coordinates.lng;
              } else {
                // Geocode the center location to get coordinates
                const { geocodeLocation } = await import("@/utils/geocoding");
                const centerLocation = await geocodeLocation(radius.center);

                if (centerLocation) {
                  centerLat = centerLocation.lat;
                  centerLng = centerLocation.lng;
                } else {
                  // Fallback to center string if geocoding fails
                  filterLabels.push(
                    `Radius: ${radius.center} (${radius.distance} miles)`
                  );
                  break;
                }
              }

              // Calculate bounding box using the same logic as database queries
              const { getBoundingBox } = await import("@/utils/geocoding");
              const boundingBox = getBoundingBox(
                centerLat,
                centerLng,
                radius.distance
              );

              // Format as Min/Max filters for address_latitude and address_longitude
              // Round to nearest 0.01 (2 decimal places)
              filterLabels.push(
                `address_latitude Min: ${
                  Math.round(boundingBox.minLat * 100) / 100
                }`
              );
              filterLabels.push(
                `address_latitude Max: ${
                  Math.round(boundingBox.maxLat * 100) / 100
                }`
              );
              filterLabels.push(
                `address_longitude Min: ${
                  Math.round(boundingBox.minLng * 100) / 100
                }`
              );
              filterLabels.push(
                `address_longitude Max: ${
                  Math.round(boundingBox.maxLng * 100) / 100
                }`
              );
            } catch (error) {
              console.error("Error formatting radius filter:", error);
              // Fallback to center string if there's an error
              filterLabels.push(
                `Radius: ${radius.center} (${radius.distance} miles)`
              );
            }
          } else {
            filterLabels.push(
              `Radius: ${radius?.center || "No center"} (${
                radius?.distance || 0
              } miles)`
            );
          }
          break;
        case "recruiting_area":
          filterLabels.push(
            `Recruiting Area: ${
              recruitingArea?.coachId ? "Coach Selected" : "No Coach"
            }`
          );
          break;
        default:
          filterLabels.push(`Location: ${values?.join(", ") || "None"}`);
      }
    }
    if (activeFilters.years?.length) {
      const yearName = await getDataTypeName(1);
      filterLabels.push(`${yearName}: ${activeFilters.years.join(", ")}`);
    }
    if (activeFilters.athleticAid?.length)
      filterLabels.push(
        `Athletic Aid: ${activeFilters.athleticAid.join(", ")}`
      );
    if (activeFilters.status?.length)
      filterLabels.push(`Status: ${activeFilters.status.join(", ")}`);
    if (
      activeFilters.dateRange?.startDate ||
      activeFilters.dateRange?.endDate
    ) {
      filterLabels.push(
        `Date Entered: ${activeFilters.dateRange.startDate || ""} - ${
          activeFilters.dateRange.endDate || ""
        }`
      );
    }
    if (activeFilters.gamesPlayed)
      filterLabels.push(
        `GP: ${activeFilters.gamesPlayed.comparison} ${activeFilters.gamesPlayed.value}`
      );
    if (activeFilters.survey_completed !== undefined) {
      // Handle both array format (from multiple select) and boolean format
      if (Array.isArray(activeFilters.survey_completed)) {
        if (
          activeFilters.survey_completed.includes(true) &&
          activeFilters.survey_completed.includes(false)
        ) {
          filterLabels.push("Survey Completed: Yes, No");
        } else if (activeFilters.survey_completed.includes(true)) {
          filterLabels.push("Survey Completed: Yes");
        } else if (activeFilters.survey_completed.includes(false)) {
          filterLabels.push("Survey Completed: No");
        }
      } else {
        // Handle direct boolean values
        if (activeFilters.survey_completed === true) {
          filterLabels.push("Survey Completed: Yes");
        } else if (activeFilters.survey_completed === false) {
          filterLabels.push("Survey Completed: No");
        }
      }
    }
    if (activeFilters.gradStudent !== undefined) {
      // Handle array format for grad student filter
      if (Array.isArray(activeFilters.gradStudent)) {
        if (
          activeFilters.gradStudent.includes(true) &&
          activeFilters.gradStudent.includes(false)
        ) {
          filterLabels.push("Grad Student: Yes, No");
        } else if (activeFilters.gradStudent.includes(true)) {
          filterLabels.push("Grad Student: Yes");
        } else if (activeFilters.gradStudent.includes(false)) {
          filterLabels.push("Grad Student: No");
        }
      }
    }
    if (activeFilters.honors?.length) {
      filterLabels.push(`Honors: ${activeFilters.honors.join(", ")}`);
    }

    // Handle dynamic stat filters
    for (const key of Object.keys(activeFilters)) {
      if (key.startsWith("stat_")) {
        const dataTypeId = key.replace("stat_", "");
        // Try to find the column in both dynamicColumns and filterColumns
        const column =
          dynamicColumns.find(
            (col) => col.data_type_id.toString() === dataTypeId
          ) ||
          filterColumns.find(
            (col) => col.data_type_id.toString() === dataTypeId
          );
        const filterValue = activeFilters[key];
        if (
          filterValue &&
          typeof filterValue === "object" &&
          "comparison" in filterValue &&
          "value" in filterValue
        ) {
          // Fetch the actual name from the data_type table instead of using display_name
          const dataTypeName = await getDataTypeName(Number(dataTypeId));
          let columnName = dataTypeName;

          // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
          // Exclude position-agnostic stats like GP (Games Played)
          const isBaseball = Number(column?.sport_id) === 6;
          const isPositionAgnostic =
            column?.display_name === "GP" ||
            column?.display_name === "GS" ||
            column?.data_type_id === 98 ||
            column?.data_type_id === 83;
          if (isBaseball && column?.stat_category && !isPositionAgnostic) {
            const categoryPrefix =
              column.stat_category.charAt(0).toUpperCase() +
              column.stat_category.slice(1);
            columnName = `${categoryPrefix} - ${columnName}`;
          }

          const comparisonLabel =
            filterValue.comparison === "greater"
              ? "Min"
              : filterValue.comparison === "less"
              ? "Max"
              : filterValue.comparison;
          filterLabels.push(
            `${columnName} ${comparisonLabel}: ${filterValue.value}`
          );
        }
      }
    }

    return filterLabels.length ? filterLabels.join(" | ") : "No filters set";
  };

  // Add useEffect to fetch ratings when component mounts
  useEffect(() => {
    const loadRatings = async () => {
      if (activeCustomerId) {
        try {
          const data = await fetchCustomerRatings(activeCustomerId);
          setRatings(data);
        } catch (error) {
          // Don't set ratings if there's an error - this is non-critical
        }
      }
    };
    loadRatings();
  }, [activeCustomerId, dataSource]);

  // Check extension activity periodically
  useEffect(() => {
    // Check immediately on mount
    checkExtensionActivity();

    // Then check every minute
    const interval = setInterval(checkExtensionActivity, 60000);

    return () => clearInterval(interval);
  }, [checkExtensionActivity]);

  // Function to sort data by height
  const sortDataByHeight = (
    data: AthleteData[],
    order: "ascend" | "descend"
  ) => {
    return [...data].sort((a, b) => {
      // Convert height to total inches for comparison
      const getHeightInInches = (athlete: AthleteData) => {
        const feet = athlete.height_feet || 0;
        const inches = athlete.height_inch || 0;
        return feet * 12 + inches;
      };

      const heightA = getHeightInInches(a);
      const heightB = getHeightInInches(b);

      if (order === "ascend") {
        return heightA - heightB;
      } else {
        return heightB - heightA;
      }
    });
  };

  // Handle table sorting
  const handleTableChange: TableProps<AthleteData>["onChange"] = (
    pagination,
    filters,
    sorter
  ) => {
    // Handle sorting
    if (Array.isArray(sorter)) {
      // Multiple sorters (not used in this case)
      const firstSorter = sorter[0];
      if (firstSorter) {
        setSortField(firstSorter.field as string);
        setSortOrder(firstSorter.order as "ascend" | "descend" | null);
      } else {
        // If no sorter provided, use default based on data source
        if (dataSource === "hs_athletes") {
          setSortField("last_name");
          setSortOrder("ascend");
        } else {
          setSortField("date");
          setSortOrder("descend");
        }
      }
    } else {
      // Single sorter
      if (sorter && sorter.field) {
        const fieldName = sorter.field as string;

        // Height sorting is now handled in SQL, so we can use the normal field name
        setSortField(fieldName);
        setSortOrder(sorter.order as "ascend" | "descend" | null);
      } else {
        // If no sorter provided, use default based on data source
        if (dataSource === "hs_athletes") {
          setSortField("last_name");
          setSortOrder("ascend");
        } else {
          setSortField("date");
          setSortOrder("descend");
        }
      }
    }
  };

  return (
    <div
      className="w-full h-full"
      style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      <div
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
          paddingBottom: zoom > 100 ? "2rem" : "0",
          paddingRight: zoom > 100 ? "5%" : "0",
          width: zoom < 100 ? `${100 / (zoom / 100)}%` : "100%",
          height: zoom < 100 ? `${100 / (zoom / 100)}%` : "100%",
          minHeight: zoom > 100 ? `${zoom}vh` : "100%",
          marginBottom: zoom > 100 ? "4rem" : "0",
          overflow: "visible",
          flex: "1 1 auto",
        }}
      >
        <Flex style={boxStyle}>
          <Flex style={headerBox} justify="space-between" align="center">
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>
              Showing {filteredRecords} of {totalRecords} records
              {isAnyFilterActive && ` (filtered)`}
            </Typography.Text>
          </Flex>
          <div
            className="mb-3 search-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
            }}
          >
            <Space>
              <Input.Search
                style={{ width: 300 }}
                placeholder="Search here..."
                allowClear
                value={localSearchInput}
                onChange={(e) => handleSearch(e.target.value)}
                onSearch={handleSearch}
              />
              {dataSource !== "high_schools" && (
                <div style={{ position: "relative" }}>
                  <SuccessPopover
                    trigger="top"
                    content={successMessage}
                    visible={showSuccessMessage}
                    onClose={() => setShowSuccessMessage(false)}
                  >
                    <Button
                      onClick={() => {
                        if (selectedAthletes.length === 0) return;

                        // If multiple boards, show dropdown to select
                        if (availableBoards.length > 1) {
                          setIsBoardModalVisible(!isBoardModalVisible);
                        } else {
                          // If single board, add directly
                          if (userDetails && activeCustomerId) {
                            handleAddToRecruitingBoard();
                          }
                        }
                      }}
                      type="primary"
                      loading={isAddingToRecruitingBoard}
                      disabled={selectedAthletes.length === 0}
                    >
                      Add to Recruiting Board ({selectedAthletes.length})
                    </Button>
                  </SuccessPopover>

                  {/* Board dropdown appears below button when multiple boards */}
                  {availableBoards.length > 1 && isBoardModalVisible && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "8px",
                        zIndex: 1000,
                      }}
                    >
                      <ChooseBoardDropdownWithStatus
                        isVisible={isBoardModalVisible}
                        onClose={() => setIsBoardModalVisible(false)}
                        onSelect={(boardId, boardName) => {
                          handleBoardSelected(boardId, boardName);
                          setIsBoardModalVisible(false);
                          // Automatically add after selection, passing board info directly
                          handleAddToRecruitingBoard(boardId, boardName);
                        }}
                        customerId={activeCustomerId || ""}
                        athleteIds={selectedAthletes.map((a) => a.id)}
                        placement="bottomRight"
                        simpleMode={true}
                      />
                    </div>
                  )}
                </div>
              )}
              {dataSource === "high_schools" && (
                <div className="flex gap-2">
                  <Button
                    onClick={handlePrintHighSchools}
                    type="primary"
                    loading={isPrintingHighSchools}
                    disabled={selectedHighSchools.length === 0}
                    icon={<i className="icon-printer"></i>}
                  >
                    Print School Packets ({selectedHighSchools.length})
                  </Button>

                  <Button
                    type={highSchoolViewMode === "map" ? "primary" : "text"}
                    onClick={() => setHighSchoolViewMode("map")}
                  >
                    Map View
                  </Button>

                  <Button
                    type={highSchoolViewMode === "list" ? "primary" : "text"}
                    onClick={() => setHighSchoolViewMode("list")}
                  >
                    List View
                  </Button>
                </div>
              )}
              {dataSource === "hs_athletes" && (
                <div className="flex gap-2">
                  <Button
                    type={hsAthleteViewMode === "map" ? "primary" : "text"}
                    onClick={() => setHsAthleteViewMode("map")}
                  >
                    Map View
                  </Button>

                  <Button
                    type={hsAthleteViewMode === "list" ? "primary" : "text"}
                    onClick={() => setHsAthleteViewMode("list")}
                  >
                    List View
                  </Button>
                </div>
              )}
            </Space>
            {(dataSource === "transfer_portal" ||
              dataSource === "all_athletes" ||
              dataSource === "juco" ||
              dataSource === "high_schools") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {seasonData && (
                  <div
                    style={{
                      fontSize: "12px",
                      fontStyle: "italic",
                      color: "#666",
                    }}
                  >
                    Stats on Display from the {seasonData} season
                  </div>
                )}
                <Button
                  onClick={loadMoreData}
                  disabled={loading || !hasMore}
                  loading={loading}
                  size="small"
                  type="default"
                >
                  Load More (
                  {(() => {
                    const currentDataSource = dataSource as
                      | "transfer_portal"
                      | "all_athletes"
                      | "juco"
                      | "high_schools"
                      | "hs_athletes"
                      | undefined;
                    const isMapView =
                      (currentDataSource === "high_schools" &&
                        highSchoolViewMode === "map") ||
                      (currentDataSource === "hs_athletes" &&
                        hsAthleteViewMode === "map");
                    return isMapView ? 100 : ITEMS_PER_PAGE;
                  })()}
                  )
                </Button>

                <Space>
                  <div
                    className="selectbox-ui"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    {isAnyFilterActive && dataSource === "transfer_portal" && (
                      <AddAlert
                        trigger={
                          <Button
                            type="primary"
                            size="large"
                            className="alert-gradient-btn"
                            style={{
                              marginRight: 5,
                              fontWeight: 500,
                              background:
                                "linear-gradient(90deg, #6affab 0%, #c8ff24 111.68%)",
                              border: "none",
                              fontFamily: '"Inter Tight", serif',
                              boxShadow: "0 2px 8px rgba(202, 255, 36, 0.15)",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            <img src="/bell.svg"></img> Set Up Email Alert
                          </Button>
                        }
                        renderActiveFilters={renderActiveFilters}
                      />
                    )}
                    {(() => {
                      const currentDataSource = dataSource as
                        | "transfer_portal"
                        | "all_athletes"
                        | "juco"
                        | "high_schools"
                        | "hs_athletes"
                        | undefined;
                      const isMapView =
                        (currentDataSource === "high_schools" &&
                          highSchoolViewMode === "map") ||
                        (currentDataSource === "hs_athletes" &&
                          hsAthleteViewMode === "map");
                      const shouldShowExport =
                        (currentDataSource === "transfer_portal" ||
                          currentDataSource === "all_athletes" ||
                          currentDataSource === "high_schools" ||
                          currentDataSource === "juco" ||
                          currentDataSource === "hs_athletes") &&
                        !isMapView;

                      return shouldShowExport ? (
                        <CSVExport<any>
                          fetchData={async (
                            page: number,
                            pageSize: number,
                            sortField?: string | null,
                            sortOrder?: "ascend" | "descend" | null
                          ) => {
                            // Preserve full dataSource type for use in props
                            const currentDataSource = dataSource as
                              | "transfer_portal"
                              | "all_athletes"
                              | "juco"
                              | "high_schools"
                              | "hs_athletes";

                            // Handle high schools separately
                            if (dataSource === "high_schools") {
                              let currentColumns = hsColumns;
                              if (hsColumns.length === 0) {
                                const configs =
                                  await fetchHighSchoolColumnConfig();
                                let cols = configs.map((cfg) => ({
                                  dataIndex: cfg.sanitized_column_name,
                                  display_name: cfg.display_name,
                                  search_column_display:
                                    cfg.search_column_display,
                                  data_type_id: cfg.data_type_id,
                                }));
                                cols = cols.filter(
                                  (c) => Number(c.search_column_display) > 0
                                );
                                cols.sort(
                                  (a, b) =>
                                    a.search_column_display -
                                    b.search_column_display
                                );
                                currentColumns = cols;
                              }

                              const highSchoolData = await fetchHighSchoolData({
                                page,
                                limit: pageSize,
                                search: localSearchInput,
                                selectColumns: currentColumns.map(
                                  (c) => c.dataIndex
                                ),
                                filters: activeFilters,
                                sortField: sortField ?? null,
                                sortOrder: sortOrder ?? null,
                              });

                              return {
                                data: highSchoolData.data,
                                hasMore: highSchoolData.hasMore || false,
                                totalCount: highSchoolData.totalCount || 0,
                              };
                            }

                            // Handle athlete data sources
                            if (
                              !activeCustomer?.sport_id ||
                              !activeCustomerId
                            ) {
                              throw new Error("No customer or sport found");
                            }

                            // Use current filters and search
                            // Additional columns for CSV export (only for hs_athletes)
                            const exportColumns =
                              (dataSource as "hs_athletes") === "hs_athletes"
                                ? [
                                    "hs_county",
                                    "school_state",
                                    "all_position",
                                    "athlete_cell",
                                    "hs_highlight",
                                    "parent_name",
                                    "parent_email",
                                    "parent_phone",
                                    "major",
                                    "athlete_address_street",
                                    "athlete_address_city",
                                    "address_state",
                                    "athlete_address_zip",
                                    "birthday",
                                    "hs_ncaa_id",
                                  ]
                                : undefined;

                            const fetchParams = {
                              page,
                              limit: pageSize,
                              sportId: activeCustomer.sport_id,
                              dataSource: dataSource,
                              displayColumns: [
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource].date
                                  ? ["date"]
                                  : []),
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource]
                                  .athletic_aid
                                  ? ["athletic_aid"]
                                  : []),
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource]
                                  .position
                                  ? ["position"]
                                  : []),
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource]
                                  .high_name
                                  ? ["high_name"]
                                  : []),
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource].state
                                  ? ["state"]
                                  : []),
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource]
                                  .college_state
                                  ? ["school_state"]
                                  : []),
                                ...(DATA_SOURCE_COLUMN_CONFIG[dataSource]
                                  .true_score
                                  ? ["true_score"]
                                  : []),
                                ...dynamicColumns.map(
                                  (col) =>
                                    col.sanitized_column_name ||
                                    col.data_type_name
                                      ?.toLowerCase()
                                      .replace(/\s+/g, "_") ||
                                    col.display_name
                                      .toLowerCase()
                                      .replace(/\s+/g, "_")
                                ),
                              ],
                              sportAbbrev: activeSportAbbrev || undefined,
                              userPackages: userDetails?.packages || [],
                              dynamicColumns: filterColumns,
                              userSchoolId: activeCustomer?.school_id,
                              ...(Object.keys(activeFilters).length > 0 && {
                                filters: activeFilters,
                                search: localSearchInput,
                              }),
                              ...(sortField &&
                                sortOrder && {
                                  sortField: sortField ?? null,
                                  sortOrder: sortOrder ?? null,
                                }),
                              ...(exportColumns && { exportColumns }),
                            };

                            const result = await fetchAthleteData(
                              activeSport,
                              fetchParams
                            );
                            return {
                              data: result.data,
                              hasMore: result.hasMore || false,
                              totalCount: result.totalCount || 0,
                            };
                          }}
                          transformRow={(item) => {
                            const row: (string | number)[] = [];

                            // Handle high schools
                            if (dataSource === "high_schools") {
                              // Add school name as first column
                              row.push(item.school || item.school_name || "");
                              // Then add all other columns
                              hsColumns.forEach((col) => {
                                const value =
                                  item[col.dataIndex as keyof typeof item];
                                if (value !== null && value !== undefined) {
                                  row.push(
                                    typeof value === "number"
                                      ? value
                                      : String(value)
                                  );
                                } else {
                                  row.push("");
                                }
                              });
                              return row;
                            }

                            // Handle athlete data sources
                            const athlete = item as AthleteData;
                            const currentDataSource = dataSource as
                              | "transfer_portal"
                              | "all_athletes"
                              | "juco"
                              | "hs_athletes";

                            // Separate Name column fields into individual columns
                            row.push(athlete.athlete_name || ""); // Name

                            // For hs_athletes, skip Year and Division
                            if (currentDataSource !== "hs_athletes") {
                              row.push(athlete.year || ""); // Year
                              row.push(athlete.division || ""); // Division
                            }

                            row.push(athlete.name_name || ""); // Current School
                            row.push(athlete.commit_school_name || ""); // Commit School
                            row.push(
                              athlete.commit_date
                                ? new Date(
                                    athlete.commit_date
                                  ).toLocaleDateString("en-US", {
                                    month: "numeric",
                                    day: "numeric",
                                    year: "2-digit",
                                  })
                                : ""
                            ); // Commit Date

                            const config =
                              DATA_SOURCE_COLUMN_CONFIG[currentDataSource];
                            if (config.date) row.push(athlete.date || "");
                            if (config.athletic_aid)
                              row.push(athlete.athletic_aid || "");
                            if (config.position)
                              row.push(athlete.position || "");

                            // For hs_athletes and juco, skip High School column
                            if (
                              currentDataSource !== "hs_athletes" &&
                              currentDataSource !== "juco" &&
                              config.high_name
                            ) {
                              row.push(athlete.high_name || ""); // High School
                            }

                            if (config.state) row.push(athlete.state || "");
                            if (config.college_state)
                              row.push(athlete.school_state || "");
                            // Removed true_score

                            // Add email for transfers and hs_athletes (not juco or pre-portal)
                            if (
                              (dataSource as
                                | "transfer_portal"
                                | "hs_athletes") === "transfer_portal" ||
                              (dataSource as "hs_athletes") === "hs_athletes"
                            ) {
                              // Check athlete_email first, then fall back to email
                              const email =
                                (athlete as any).athlete_email ||
                                (athlete as any).email ||
                                "";
                              row.push(email);
                            }

                            // Add dynamic columns
                            dynamicColumns.forEach((col) => {
                              // Skip high_name if it's in dynamic columns (duplicate)
                              const colName =
                                col.sanitized_column_name ||
                                col.data_type_name
                                  ?.toLowerCase()
                                  .replace(/\s+/g, "_") ||
                                col.display_name
                                  .toLowerCase()
                                  .replace(/\s+/g, "_");
                              if (
                                colName === "high_name" ||
                                colName === "high_school"
                              ) {
                                return; // Skip duplicate high school column
                              }

                              const isOfferColumn =
                                col.display_name?.toLowerCase() === "offer";

                              // Special handling for height (data_type_id 304)
                              if (col.data_type_id === 304) {
                                const heightFeet = athlete.height_feet;
                                const heightInch = athlete.height_inch;
                                if (heightFeet && heightInch) {
                                  row.push(`${heightFeet}'${heightInch}"`);
                                } else if (heightFeet) {
                                  row.push(`${heightFeet}'0"`);
                                } else {
                                  row.push("");
                                }
                                return;
                              }

                              const value =
                                athlete[colName as keyof AthleteData];
                              if (value !== null && value !== undefined) {
                                row.push(
                                  typeof value === "number"
                                    ? value
                                    : String(value)
                                );
                              } else {
                                row.push("");
                              }

                              // For hs_athletes, add Number of Offers after the Offer column
                              const currentDataSource = dataSource as
                                | "transfer_portal"
                                | "all_athletes"
                                | "juco"
                                | "hs_athletes";
                              if (
                                isOfferColumn &&
                                currentDataSource === "hs_athletes"
                              ) {
                                row.push(athlete.offer_count_all ?? 0); // Number of Offers
                              }
                            });

                            // Add additional CSV export columns for hs_athletes
                            if (
                              (dataSource as "hs_athletes") === "hs_athletes"
                            ) {
                              row.push((athlete as any).hs_county || "");
                              row.push((athlete as any).school_state || "");
                              row.push((athlete as any).all_position || "");
                              row.push((athlete as any).athlete_cell || "");
                              row.push((athlete as any).hs_highlight || "");
                              row.push((athlete as any).parent_name || "");
                              row.push((athlete as any).parent_email || "");
                              row.push((athlete as any).parent_phone || "");
                              row.push((athlete as any).major || "");
                              row.push(
                                (athlete as any).athlete_address_street || ""
                              );
                              row.push(
                                (athlete as any).athlete_address_city || ""
                              );
                              row.push((athlete as any).address_state || "");
                              row.push(
                                (athlete as any).athlete_address_zip || ""
                              );
                              row.push((athlete as any).birthday || "");
                              row.push((athlete as any).hs_ncaa_id || "");
                            }

                            return row;
                          }}
                          headers={
                            dataSource === "high_schools"
                              ? [
                                  "School Name",
                                  ...hsColumns.map(
                                    (col) => col.display_name || col.dataIndex
                                  ),
                                ]
                              : (() => {
                                  const currentDataSource = dataSource as
                                    | "transfer_portal"
                                    | "all_athletes"
                                    | "juco"
                                    | "hs_athletes";
                                  return [
                                    "Name", // Separated from Name column
                                    // For hs_athletes, skip Year and Division
                                    ...(currentDataSource !== "hs_athletes"
                                      ? ["Year", "Division"]
                                      : []),
                                    "Current School", // Separated from Name column
                                    "Commit School", // Separated from Name column
                                    "Commit Date", // Separated from Name column
                                    ...(DATA_SOURCE_COLUMN_CONFIG[
                                      currentDataSource
                                    ].date
                                      ? ["Date"]
                                      : []),
                                    ...(DATA_SOURCE_COLUMN_CONFIG[
                                      currentDataSource
                                    ].athletic_aid
                                      ? ["Athletic Aid"]
                                      : []),
                                    ...(DATA_SOURCE_COLUMN_CONFIG[
                                      currentDataSource
                                    ].position
                                      ? ["Position"]
                                      : []),
                                    // For hs_athletes and juco, skip High School column
                                    ...(currentDataSource !== "hs_athletes" &&
                                    currentDataSource !== "juco" &&
                                    DATA_SOURCE_COLUMN_CONFIG[currentDataSource]
                                      .high_name
                                      ? ["High School"]
                                      : []),
                                    ...(DATA_SOURCE_COLUMN_CONFIG[
                                      currentDataSource
                                    ].state
                                      ? ["State"]
                                      : []),
                                    ...(DATA_SOURCE_COLUMN_CONFIG[
                                      currentDataSource
                                    ].college_state
                                      ? ["College State"]
                                      : []),
                                    // Removed True Score
                                    // Add Email for transfers and hs_athletes (not juco or pre-portal)
                                    ...(currentDataSource ===
                                      "transfer_portal" ||
                                    currentDataSource === "hs_athletes"
                                      ? ["Email"]
                                      : []),
                                    ...dynamicColumns
                                      .filter((col) => {
                                        // Filter out duplicate high_name/high_school from dynamic columns
                                        const colName =
                                          col.sanitized_column_name ||
                                          col.data_type_name
                                            ?.toLowerCase()
                                            .replace(/\s+/g, "_") ||
                                          col.display_name
                                            .toLowerCase()
                                            .replace(/\s+/g, "_");
                                        return (
                                          colName !== "high_name" &&
                                          colName !== "high_school"
                                        );
                                      })
                                      .flatMap((col) => {
                                        const isOfferColumn =
                                          col.display_name?.toLowerCase() ===
                                          "offer";
                                        const displayName =
                                          col.display_name ||
                                          col.data_type_name ||
                                          col.sanitized_column_name ||
                                          "";

                                        // For hs_athletes, change "Offer" to "Best Offer" and add "Number of Offers" after it
                                        if (
                                          isOfferColumn &&
                                          currentDataSource === "hs_athletes"
                                        ) {
                                          return [
                                            "Best Offer",
                                            "Number of Offers",
                                          ];
                                        }
                                        return [displayName];
                                      }),
                                    // Add additional CSV export column headers for hs_athletes
                                    ...(currentDataSource === "hs_athletes"
                                      ? [
                                          "HS County",
                                          "School State",
                                          "All Position",
                                          "Athlete Cell",
                                          "HS Highlight",
                                          "Parent Name",
                                          "Parent Email",
                                          "Parent Phone",
                                          "Major",
                                          "Athlete Address Street",
                                          "Athlete Address City",
                                          "Address State",
                                          "Athlete Address Zip",
                                          "Birthday",
                                          "HS NCAA ID",
                                        ]
                                      : []),
                                  ];
                                })()
                          }
                          filename={(() => {
                            const ds = dataSource as
                              | "transfer_portal"
                              | "all_athletes"
                              | "juco"
                              | "high_schools"
                              | "hs_athletes";
                            return ds === "hs_athletes"
                              ? "hs-athletes"
                              : ds === "high_schools"
                              ? "high-schools"
                              : ds === "transfer_portal"
                              ? "transfers"
                              : ds === "all_athletes"
                              ? "pre-portal"
                              : ds === "juco"
                              ? "juco"
                              : "high-schools";
                          })()}
                          maxRows={(() => {
                            const ds = dataSource as
                              | "transfer_portal"
                              | "all_athletes"
                              | "juco"
                              | "high_schools"
                              | "hs_athletes";
                            return ds === "hs_athletes"
                              ? 1000
                              : ds === "high_schools"
                              ? 500
                              : ds === "transfer_portal"
                              ? 25
                              : ds === "all_athletes"
                              ? 25
                              : ds === "juco"
                              ? 25
                              : 25;
                          })()}
                          disabled={
                            dataSource === "high_schools"
                              ? false
                              : !activeCustomerId || !activeCustomer?.sport_id
                          }
                          userId={userDetails?.id}
                          customerId={activeCustomerId || undefined}
                          tableName={
                            dataSource === "high_schools"
                              ? "high-schools"
                              : dataSource === "transfer_portal"
                              ? "transfers"
                              : dataSource === "all_athletes"
                              ? "pre-portal"
                              : dataSource === "juco"
                              ? "juco"
                              : (dataSource as "hs_athletes") === "hs_athletes"
                              ? "hs-athletes"
                              : "unknown"
                          }
                          filterDetails={activeFilters}
                          buttonProps={{ style: { marginRight: "12px" } }}
                          emailColumnName={
                            dataSource === "high_schools"
                              ? (() => {
                                  const emailColumn = hsColumns.find(
                                    (col) =>
                                      col.display_name
                                        ?.toLowerCase()
                                        .includes("email") ||
                                      col.dataIndex
                                        ?.toLowerCase()
                                        .includes("email")
                                  );
                                  return emailColumn?.dataIndex;
                                })()
                              : undefined
                          }
                          sortField={sortField}
                          sortOrder={sortOrder}
                          userPackages={userDetails?.packages}
                        />
                      ) : null;
                    })()}
                    <Filters
                      onApplyFilters={applyFilters}
                      onResetFilters={resetFilters}
                      dynamicColumns={dynamicColumns}
                      filterColumns={filterColumns}
                      dataSource={dataSource}
                    />
                  </div>
                </Space>
              </div>
            )}
            {/* Show Filters for hs_athletes even in map view */}
            {dataSource === "hs_athletes" && hsAthleteViewMode === "map" && (
              <div style={{ marginTop: "16px" }}>
                <Filters
                  onApplyFilters={applyFilters}
                  onResetFilters={resetFilters}
                  dynamicColumns={dynamicColumns}
                  filterColumns={filterColumns}
                  dataSource={dataSource}
                />
              </div>
            )}
          </div>
          {isMaintenanceMode && (
            <Alert
              message={
                <div>
                  <strong>System Update in Progress</strong>
                  <br />
                  We are currently making improvements to our data system. The
                  page will automatically refresh in{" "}
                  {Math.floor(maintenanceTimer / 60)}:
                  {(maintenanceTimer % 60).toString().padStart(2, "0")}.
                  <br />
                  <Progress
                    percent={Math.round((maintenanceTimer / 120) * 100)}
                    status="active"
                    size="small"
                    style={{ marginTop: "8px" }}
                  />
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: "16px" }}
            />
          )}
          {dataSource === "transfer_portal" &&
            extensionInactive &&
            activeSportAbbrev &&
            (() => {
              const userPackageNumbers = (userDetails?.packages || []).map(
                Number
              );
              const sportPackages = getUserPackagesForSport(
                activeSportAbbrev,
                userPackageNumbers
              );
              const hasNaiaPackage = sportPackages.some((pkg) => pkg.is_naia);
              return !hasNaiaPackage;
            })() && (
              <Alert
                message={
                  <>
                    The extension hasn&apos;t been run in over 30 minutes -{" "}
                    <a
                      href="https://docs.google.com/document/d/1B4OmmZXafm3JNwZvOoqel0ekB1tHCSYfj_5owlWRGHs/edit?tab=t.0#heading=h.1qe0m1s9sb5l"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Please click here to run it and stay up to date
                    </a>
                  </>
                }
                type="warning"
                showIcon
                style={{ marginBottom: "16px" }}
              />
            )}
          {(dataSource !== "high_schools" || highSchoolViewMode === "list") &&
            (dataSource !== "hs_athletes" || hsAthleteViewMode === "list") && (
              <div
                style={{
                  flex: "1 1 auto",
                  overflow: "hidden",
                  minHeight: 0,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: "calc(100vh - 180px)", // Ensure container doesn't exceed viewport
                }}
              >
                <Table<any>
                  key={tableKey}
                  rowKey="id"
                  rowSelection={
                    dataSource === "high_schools"
                      ? { type: "checkbox", ...highSchoolRowSelection }
                      : { type: selectionType, ...rowSelection }
                  }
                  columns={columns}
                  dataSource={displayedData}
                  loading={loading || isLoadingRecruitingBoard}
                  pagination={false}
                  bordered
                  style={{
                    width: "100%",
                    height: "100%",
                    flex: "1 1 auto",
                  }}
                  scroll={{
                    x: "max-content",
                    y: extensionInactive
                      ? "calc(100vh - 330px)"
                      : "calc(100vh - 280px)", // Adjust height when alert is shown
                  }}
                  onChange={handleTableChange}
                  onRow={(record) => {
                    const isOnBoard = recruitingBoardAthletes.includes(
                      record.id
                    );
                    return {
                      style: isOnBoard
                        ? {
                            backgroundColor: "#d4edda",
                          }
                        : {},
                    };
                  }}
                />
              </div>
            )}
          {dataSource === "high_schools" && highSchoolViewMode === "map" && (
            <div
              className=""
              style={{ width: "100%", flex: "1 1 auto", minHeight: 0 }}
            >
              {!isMapLoaded ? (
                <div className="text-center py-4">Loading map...</div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    border: "1px solid #eee",
                  }}
                >
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    zoom={8}
                    center={mapCenter}
                    onLoad={(map) => {
                      mapRef.current = map;
                      // Get initial zoom
                      if (map) {
                        setMapZoom(map.getZoom() || 8);
                      }
                    }}
                    onZoomChanged={() => {
                      if (mapRef.current) {
                        setMapZoom(mapRef.current.getZoom() || 8);
                      }
                    }}
                    onUnmount={() => {
                      mapRef.current = null;
                    }}
                    options={{
                      mapTypeControl: true,
                      streetViewControl: true,
                      mapTypeId: "roadmap",
                      fullscreenControl: true,
                      zoomControl: true,
                      gestureHandling: "greedy",
                    }}
                  >
                    <>
                      {/* Render cluster markers */}
                      {highSchoolClusters.clusters.map(
                        (cluster: Cluster, clusterIndex: number) => {
                          // Calculate size based on number of schools (min 50px, max 120px)
                          // Scale from 2 schools (50px) to 50+ schools (120px)
                          const baseSize = 50;
                          const maxSize = 120;
                          const minCount = 2;
                          const maxCount = 50;
                          const count = Math.min(cluster.count, maxCount);
                          const size =
                            baseSize +
                            ((count - minCount) / (maxCount - minCount)) *
                              (maxSize - baseSize);

                          // Calculate text size proportionally
                          const textSize = Math.max(
                            14,
                            Math.min(24, size * 0.4)
                          );

                          return (
                            <OverlayViewF
                              key={`cluster-${clusterIndex}`}
                              position={{ lat: cluster.lat, lng: cluster.lng }}
                              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                              getPixelPositionOffset={(width, height) => ({
                                x: -width / 2,
                                y: -height / 2,
                              })}
                            >
                              <div
                                className="relative flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                                style={{
                                  width: `${size}px`,
                                  height: `${size}px`,
                                  zIndex: 2000, // Higher than individual markers (1001-1002)
                                }}
                              >
                                {/* Green dot SVG behind the count */}
                                <img
                                  src="/svgicons/map-dot.svg"
                                  alt=""
                                  style={{
                                    position: "absolute",
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    zIndex: 2000,
                                  }}
                                />
                                {/* Count text on top */}
                                <span
                                  className="text-primery font-bold relative"
                                  style={{
                                    zIndex: 2001,
                                    fontSize: `${textSize}px`,
                                  }}
                                >
                                  {cluster.count}
                                </span>
                              </div>
                            </OverlayViewF>
                          );
                        }
                      )}

                      {/* Render individual markers for unclustered schools */}
                      {highSchoolClusters.unclustered.map(
                        (hs: any, index: number) => {
                          const lat = (hs as any).address_latitude as
                            | number
                            | null
                            | undefined;
                          const lng = (hs as any).address_longitude as
                            | number
                            | null
                            | undefined;
                          if (!lat || !lng) return null;
                          const schoolId =
                            (hs as any).id ||
                            (hs as any).school_id ||
                            `school-${index}`;
                          return (
                            <Fragment key={`marker-${schoolId}-${index}`}>
                              <OverlayViewF
                                position={{ lat, lng }}
                                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                getPixelPositionOffset={(width, height) => ({
                                  x: -width / 2,
                                  y: -height / 2,
                                })}
                              >
                                <Popover
                                  content={
                                    <div className="space-y-2 min-w-[400px]">
                                      <div className="mb-4">
                                        <h4 className="!text-[24px] font-semibold text-sm mb-3 flex items-center justify-between">
                                          <span
                                            className="cursor-pointer hover:text-blue-600 hover:underline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              // Open school profile modal using URL params (same as table view)
                                              const schoolId = String(
                                                (hs as any).id ||
                                                  (hs as any).school_id
                                              );
                                              if (schoolId) {
                                                const params =
                                                  new URLSearchParams(
                                                    searchParams?.toString() ||
                                                      ""
                                                  );
                                                params.set("school", schoolId);
                                                params.set(
                                                  "dataSource",
                                                  "high_schools"
                                                );
                                                const newUrl = params.toString()
                                                  ? `${baseRoute}?${params.toString()}`
                                                  : baseRoute;
                                                router.push(newUrl);
                                              }
                                            }}
                                          >
                                            {(hs as any).school || ""}
                                          </span>

                                          <a
                                            href="#"
                                            className="text-[14px] text-blue-600 hover:underline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              // Add school to road map selection if not already selected
                                              const schoolId = String(
                                                (hs as any).id
                                              );
                                              const isAlreadySelected =
                                                roadMapSelectedHighSchools.some(
                                                  (selected) =>
                                                    String(selected.id) ===
                                                    schoolId
                                                );
                                              if (!isAlreadySelected) {
                                                setRoadMapSelectedHighSchools(
                                                  (prev) => [
                                                    ...prev,
                                                    hs as HighSchoolData,
                                                  ]
                                                );
                                              }
                                            }}
                                          >
                                            Add to Road Plan
                                          </a>
                                        </h4>
                                        <div className="text-[14px] text-gray-600 w-[190px] !leading-[20px]">
                                          {/* No address string available in HS view; show county/state */}
                                          {((hs as any).hs_county ||
                                            (hs as any).school_state) && (
                                            <span>
                                              {(hs as any).hs_county && (
                                                <span>
                                                  {(hs as any).hs_county}
                                                </span>
                                              )}
                                              {(hs as any).hs_county &&
                                                (hs as any).school_state && (
                                                  <span> | </span>
                                                )}
                                              {(hs as any).school_state && (
                                                <span>
                                                  {(hs as any).school_state}
                                                </span>
                                              )}
                                            </span>
                                          )}
                                          {(hs as any).ad_email && (
                                            <>
                                              <br />
                                              <a
                                                href={`mailto:${
                                                  (hs as any).ad_email
                                                }`}
                                                className="text-[14px] text-blue-600"
                                              >
                                                {(hs as any).ad_email}
                                              </a>
                                            </>
                                          )}
                                          {(hs as any).school_phone && (
                                            <>
                                              <br />
                                              <a
                                                href={`tel:${String(
                                                  (hs as any).school_phone
                                                ).replace(/\D/g, "")}`}
                                                className="text-[14px] text-blue-600"
                                              >
                                                {formatPhoneNumber(
                                                  String(
                                                    (hs as any).school_phone
                                                  )
                                                )}
                                              </a>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Athletes (if loaded) */}
                                      <div className="text-xs flex items-center justify-between gap-2 flex-wrap">
                                        {hsAthletes[index] &&
                                        hsAthletes[index].length > 0 ? (
                                          hsAthletes[index].map(
                                            (
                                              athlete: any,
                                              athleteIndex: number
                                            ) => (
                                              <div
                                                key={athleteIndex}
                                                className="text-xs flex items-center justify-start gap-2"
                                              >
                                                <img
                                                  src={
                                                    athlete.image_url ||
                                                    "/blank-user.svg"
                                                  }
                                                  alt={
                                                    athlete.name || "Athlete"
                                                  }
                                                  height={50}
                                                  width={50}
                                                  className="rounded-full object-cover"
                                                />
                                                <div>
                                                  <h6 className="!text-[14px] !font-semibold !leading-1 mb-0">
                                                    {athlete.name || "-"}
                                                  </h6>
                                                  <span className="!text-[14px] !leading-[16px] mb-0">
                                                    {athlete.athleticProjection ||
                                                      "-"}{" "}
                                                    <br />
                                                    {athlete.gradYear || "-"}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          )
                                        ) : hsAthletes[index] !== undefined ? (
                                          <div className="text-gray-400 text-[12px]">
                                            No athletes found
                                          </div>
                                        ) : (
                                          <div className="text-gray-400 text-[12px]">
                                            Loading athletes...
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  }
                                  title={null}
                                  trigger="click"
                                  open={!!hsPopoverOpen[index]}
                                  onOpenChange={async (open: boolean) => {
                                    setHsPopoverOpen({
                                      ...hsPopoverOpen,
                                      [index]: open,
                                    });
                                    if (open && activeCustomerId) {
                                      try {
                                        const schoolId = String((hs as any).id);
                                        if (schoolId) {
                                          const result =
                                            await fetchHighSchoolAthletes(
                                              schoolId,
                                              "fb",
                                              activeCustomerId,
                                              { page: 1, limit: 100 }
                                            );
                                          if (result.data) {
                                            const projectionOrder = [
                                              "FBS P4 - Top half",
                                              "FBS P4",
                                              "FBS G5 - Top half",
                                              "FBS G5",
                                              "FCS - Full Scholarship",
                                              "FCS",
                                              "D2 - Top half",
                                              "D2",
                                              "D3 - Top half",
                                              "D3",
                                              "D3 Walk-on",
                                            ];
                                            const sortedAthletes =
                                              result.data.sort(
                                                (a: any, b: any) => {
                                                  const indexA =
                                                    projectionOrder.indexOf(
                                                      a.athleticProjection || ""
                                                    );
                                                  const indexB =
                                                    projectionOrder.indexOf(
                                                      b.athleticProjection || ""
                                                    );
                                                  if (
                                                    indexA !== -1 &&
                                                    indexB !== -1
                                                  ) {
                                                    if (indexA !== indexB)
                                                      return indexA - indexB;
                                                  } else if (indexA !== -1) {
                                                    return -1;
                                                  } else if (indexB !== -1) {
                                                    return 1;
                                                  } else if (
                                                    a.athleticProjection &&
                                                    b.athleticProjection
                                                  ) {
                                                    const cmp =
                                                      a.athleticProjection.localeCompare(
                                                        b.athleticProjection
                                                      );
                                                    if (cmp !== 0) return cmp;
                                                  }
                                                  const yearA =
                                                    parseInt(a.gradYear) || 0;
                                                  const yearB =
                                                    parseInt(b.gradYear) || 0;
                                                  return yearA - yearB;
                                                }
                                              );
                                            setHsAthletes({
                                              ...hsAthletes,
                                              [index]: sortedAthletes.slice(
                                                0,
                                                2
                                              ),
                                            });
                                          }
                                        }
                                      } catch (e) {
                                        // ignore
                                      }
                                    }
                                  }}
                                >
                                  {(() => {
                                    // Get D1 player producing score and determine color (each score gets its own color)
                                    const d1Score = (hs as any)
                                      .d1_player_producing;
                                    const score =
                                      d1Score !== null && d1Score !== undefined
                                        ? parseInt(String(d1Score))
                                        : 0;

                                    // Color scale: 0/null = gray, then gradient from red to yellow to green
                                    // More drastic changes 0-5, subtle changes 5-10, darker colors
                                    const colorMap: Record<number, string> = {
                                      0: "#9CA3AF", // Gray for 0 and null
                                      1: "#FCA5A5", // Red (dramatic change)
                                      2: "#F87171", // Darker red (dramatic change)
                                      3: "#FB923C", // Orange-red (dramatic change)
                                      4: "#FBBF24", // Orange-yellow (dramatic change)
                                      5: "#FCD34D", // Yellow (transition point)
                                      6: "#FDE047", // Yellow (subtle change)
                                      7: "#BEF264", // Yellow-green (subtle change)
                                      8: "#86EFAC", // Light green (subtle change)
                                      9: "#4ADE80", // Green (subtle change)
                                      10: "#22C55E", // Darker green (subtle change)
                                    };

                                    // Clamp score to 0-10 range
                                    const clampedScore = Math.max(
                                      0,
                                      Math.min(10, score)
                                    );
                                    const backgroundColor =
                                      colorMap[clampedScore] || "#9CA3AF";

                                    return (
                                      <div
                                        className="flex items-center justify-start gap-1 border-[4px] border-solid border-[#1C1D4D] rounded-full pr-2 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative"
                                        style={{
                                          minWidth: "max-content",
                                          height: "32px",
                                          paddingRight: "8px",
                                          backgroundColor,
                                        }}
                                      >
                                        {/* Dot behind the school icon */}
                                        <div
                                          className="absolute flex items-center justify-center"
                                          style={{
                                            left: "-3px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            width: "28px",
                                            height: "28px",
                                            zIndex: 1000,
                                          }}
                                        >
                                          <img
                                            src="/svgicons/map-dot.svg"
                                            alt=""
                                            style={{
                                              width: "28px",
                                              height: "28px",
                                            }}
                                          />
                                        </div>
                                        <div
                                          className="flex items-center justify-center absolute border-[4px] border-solid border-[#1C1D4D] rounded-full overflow-hidden flex-shrink-0"
                                          style={{
                                            left: "-3px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            width: "24px",
                                            height: "24px",
                                            zIndex: 1001,
                                          }}
                                        >
                                          <img
                                            src="/blank-hs.svg"
                                            alt="School"
                                            className="w-full h-full object-contain p-0.5"
                                          />
                                        </div>
                                        <h6
                                          className="flex items-center text-white mb-0 !text-[12px] !font-semibold !leading-[1] whitespace-nowrap"
                                          style={{
                                            width: "130px",
                                            marginLeft: "26px",
                                          }}
                                        >
                                          <span className="truncate block">
                                            {(hs as any).school || ""}
                                          </span>
                                        </h6>
                                      </div>
                                    );
                                  })()}
                                </Popover>
                              </OverlayViewF>
                            </Fragment>
                          );
                        }
                      )}
                    </>
                  </GoogleMap>
                </div>
              )}
            </div>
          )}
          {dataSource === "hs_athletes" && hsAthleteViewMode === "map" && (
            <div
              className=""
              style={{ width: "100%", flex: "1 1 auto", minHeight: 0 }}
            >
              {!isMapLoaded ? (
                <div className="text-center py-4">Loading map...</div>
              ) : (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    border: "1px solid #eee",
                  }}
                >
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    zoom={4}
                    center={mapCenter}
                    onLoad={(map) => {
                      mapRef.current = map;
                    }}
                    onUnmount={() => {
                      mapRef.current = null;
                    }}
                    options={{
                      mapTypeControl: true,
                      streetViewControl: true,
                      mapTypeId: "roadmap",
                      fullscreenControl: true,
                      zoomControl: true,
                      gestureHandling: "greedy",
                    }}
                  >
                    {displayedData.map((athlete, index) => {
                      const lat = (athlete as any).address_latitude as
                        | number
                        | null
                        | undefined;
                      const lng = (athlete as any).address_longitude as
                        | number
                        | null
                        | undefined;
                      if (!lat || !lng) return null;
                      const athleteId = String(athlete.id || index);
                      return (
                        <Fragment key={`marker-${athleteId}-${index}`}>
                          <OverlayViewF
                            position={{ lat, lng }}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            getPixelPositionOffset={(width, height) => ({
                              x: -width / 2,
                              y: -height / 2,
                            })}
                          >
                            <Popover
                              content={
                                <div className="space-y-2 min-w-[400px] 4455">
                                  <div className="mb-4">
                                    <div className="flex items-start justify-start gap-2">
                                    <Flex
                                      className="user-image"
                                      style={{ width: "88px", margin: 0 }}
                                    >
                                      <Flex className="gray-scale">
                                        <Image
                                          src={"/blank-user.svg"}
                                          alt={"name"}
                                          width={88}
                                          height={88}
                                        />
                                        {1 > 0 && (
                                          <span className="yellow">{5.9}</span>
                                        )}
                                      </Flex>
                                    </Flex>
                                    <h4 className="!text-[24px] mt-2 font-semibold mb-3 flex items-center justify-between">
                                      <span
                                        className="cursor-pointer hover:text-blue-600 hover:underline"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          // Open HS athlete profile modal using URL params (same as table view)
                                          const athleteId = String(
                                            athlete.id || athlete.athlete_id
                                          );
                                          if (athleteId) {
                                            const params = new URLSearchParams(
                                              searchParams?.toString() || ""
                                            );
                                            params.set("player", athleteId);
                                            params.set(
                                              "dataSource",
                                              "hs_athletes"
                                            );
                                            const newUrl = params.toString()
                                              ? `${baseRoute}?${params.toString()}`
                                              : baseRoute;
                                            router.push(newUrl);
                                          }
                                        }}
                                      >
                                        {athlete.athlete_name || ""}
                                      </span>

                                      {/* <a
                                        href="#"
                                        className="text-[14px] text-blue-600 hover:underline"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          // Add athlete to road map selection if not already selected
                                          const isAlreadySelected =
                                            roadMapSelectedAthletes.some(
                                              (selected) =>
                                                selected.id === athlete.id
                                            );
                                          if (!isAlreadySelected) {
                                            setRoadMapSelectedAthletes(
                                              (prev) => [...prev, athlete]
                                            );
                                          }
                                        }}
                                      >
                                        Add to Road Plan
                                      </a> */}
                                    </h4>
                                    </div>
                                    <div className="text-[14px] text-gray-600 !leading-[20px] w-[100%]">
                                      {athlete.high_name && (
                                        <span>{athlete.high_name}</span>
                                      )}
                                      {athlete.hometown && (
                                        <>
                                          {athlete.high_name && <br />}
                                          <span>{athlete.hometown}</span>
                                        </>
                                      )}
                                      {athlete.hometown_state && (
                                        <>
                                          {athlete.hometown && <span>, </span>}
                                          <span>{athlete.hometown_state}</span>
                                        </>
                                      )}
                                      {athlete.cell_phone && (
                                        <>
                                          <br />
                                          <a
                                            href={`tel:${String(
                                              athlete.cell_phone
                                            ).replace(/\D/g, "")}`}
                                            className="text-[14px] text-blue-600"
                                          >
                                            {formatPhoneNumber(
                                              String(athlete.cell_phone)
                                            )}
                                          </a>
                                        </>
                                      )}
                                      <div className="w-[100%] flex flex-col items-center justify-between">
                                        <h6 className="flex flex-col items-center justify-between mb-3">
                                          <small className="!text-[18px] mt-2 font-normal">Current Projection</small>
                                          <span className="!text-[24px] mt-2 font-semibold">
                                            D3 - TOPHALF
                                          </span>
                                        </h6>
                                        <ProgressBar
                                          value={55}
                                          height={35}
                                          color="#2BB650"
                                          label=""
                                          labelSize="12"
                                          labelWeight={400}
                                          labelWidth={110}
                                          className="!w-[60%]"
                                        />

                                      </div>
                                      <div className="w-[95%] flex items-center justify-between mt-5 mx-auto">
                                        <Button
                                          type="primary"
                                          onClick={() => ""}
                                        >
                                          View Profile
                                        </Button>

                                        <Button
                                          type="text"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            // Add athlete to road map selection if not already selected
                                            const isAlreadySelected =
                                              roadMapSelectedAthletes.some(
                                                (selected) =>
                                                  selected.id === athlete.id
                                              );
                                            if (!isAlreadySelected) {
                                              setRoadMapSelectedAthletes(
                                                (prev) => [...prev, athlete]
                                              );
                                            }
                                          }}
                                        >
                                          + Road Map
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              }
                              title={null}
                              trigger="click"
                            >
                              {(() => {
                                // Get athletic projection and determine color
                                // Check both camelCase and snake_case field names
                                const projection =
                                  (athlete as any).athleticProjection ||
                                  ((athlete as any).athletic_projection as
                                    | string
                                    | null
                                    | undefined);

                                // Color mapping based on athletic projection (higher = greener)
                                // Map projections to colors: FBS P4 (best) = green, D3 Walk-on (lowest) = red
                                const projectionColorMap: Record<
                                  string,
                                  string
                                > = {
                                  "FBS P4 - Top half": "#22C55E", // Dark green (best)
                                  "FBS P4": "#4ADE80", // Green
                                  "FBS G5 - Top half": "#86EFAC", // Light green
                                  "FBS G5": "#BEF264", // Yellow-green
                                  "FCS - Full Scholarship": "#FDE047", // Yellow
                                  FCS: "#FCD34D", // Yellow
                                  "D2 - Top half": "#FBBF24", // Orange-yellow
                                  D2: "#FB923C", // Orange-red
                                  "D3 - Top half": "#F87171", // Darker red
                                  D3: "#FCA5A5", // Red
                                  "D3 Walk-on": "#9CA3AF", // Gray (lowest)
                                };

                                const backgroundColor = projection
                                  ? projectionColorMap[projection] || "#9CA3AF"
                                  : "#9CA3AF"; // Gray for null/undefined

                                // Higher z-index for green markers (best projections)
                                const isGreenMarker =
                                  backgroundColor === "#22C55E" ||
                                  backgroundColor === "#4ADE80" ||
                                  backgroundColor === "#86EFAC";
                                const dotZIndex = isGreenMarker ? 1002 : 1000;
                                const iconZIndex = isGreenMarker ? 1003 : 1001;

                                return (
                                  <div
                                    className="flex items-center justify-start gap-1 border-[4px] border-solid border-[#1C1D4D] rounded-full pr-2 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative"
                                    style={{
                                      minWidth: "max-content",
                                      height: "32px",
                                      paddingRight: "8px",
                                      backgroundColor,
                                    }}
                                  >
                                    {/* Dot behind the athlete icon */}
                                    <div
                                      className="absolute flex items-center justify-center"
                                      style={{
                                        left: "-3px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: "28px",
                                        height: "28px",
                                        zIndex: dotZIndex,
                                      }}
                                    >
                                      <img
                                        src="/svgicons/map-dot.svg"
                                        alt=""
                                        style={{
                                          width: "28px",
                                          height: "28px",
                                        }}
                                      />
                                    </div>
                                    <div
                                      className="flex items-center justify-center absolute border-[4px] border-solid border-[#1C1D4D] rounded-full overflow-hidden flex-shrink-0"
                                      style={{
                                        left: "-3px",
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        width: "24px",
                                        height: "24px",
                                        zIndex: iconZIndex,
                                      }}
                                    >
                                      <img
                                        src={
                                          athlete.image_url || "/blank-user.svg"
                                        }
                                        alt="Athlete"
                                        className="w-full h-full object-cover rounded-full"
                                      />
                                    </div>
                                    <h6
                                      className="flex items-center text-white mb-0 !text-[12px] !font-semibold !leading-[1] whitespace-nowrap"
                                      style={{
                                        width: "130px",
                                        marginLeft: "26px",
                                      }}
                                    >
                                      <span className="truncate block">
                                        {athlete.athlete_name || ""}
                                      </span>
                                    </h6>
                                  </div>
                                );
                              })()}
                            </Popover>
                          </OverlayViewF>
                        </Fragment>
                      );
                    })}
                  </GoogleMap>
                </div>
              )}
            </div>
          )}

          {/* Combined Road Plan Panel - shows when in map view for either data source */}
          {((dataSource === "high_schools" && highSchoolViewMode === "map") ||
            (dataSource === "hs_athletes" && hsAthleteViewMode === "map")) && (
            <div
              className="absolute bottom-[0] left-0 right-0 bg-white border-t border-gray-200 shadow-md px-4 pt-3 pb-3"
              style={{ zIndex: 1001 }}
            >
              <div className="flex flex-row justify-between items-center max-w-full">
                <div className="flex-1 flex flex-col items-start overflow-hidden">
                  <h4>Road Plan</h4>
                  <div className="flex-1 flex flex-wrap gap-2 min-h-[36px] overflow-x-auto">
                    {roadMapSelectedHighSchools.length === 0 &&
                    roadMapSelectedAthletes.length === 0 ? (
                      <span className="text-gray-400 italic">
                        No items selected
                      </span>
                    ) : (
                      <>
                        {/* High Schools */}
                        {roadMapSelectedHighSchools.map((school, index) => {
                          const schoolId = String((school as any).id || index);
                          return (
                            <div key={`hs-${schoolId}`} className="">
                              <div
                                className="flex items-center justify-start border-[4px] border-solid border-[#1C1D4D] rounded-full bg-gray-500 pr-3 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative group"
                                style={{ minWidth: "max-content" }}
                              >
                                <div className="flex items-center justify-center relative left-[-3px] top-[0] border-[4px] border-solid border-[#1C1D4D] rounded-full w-[40px] h-[40px] overflow-hidden">
                                  <img
                                    src="/blank-hs.svg"
                                    alt="School"
                                    className="w-full h-full object-contain p-1"
                                  />
                                </div>
                                <h6 className="flex flex-col text-white items-start justify-start mb-0 !text-[12px] !font-semibold !leading-1">
                                  <span className="block w-full truncate max-w-[150px]">
                                    {school.school || ""}
                                  </span>
                                </h6>
                                <a
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveSchool(schoolId);
                                  }}
                                  className="ml-2 flex items-center justify-center w-7 h-7 bg-none transition-colors flex-shrink-0"
                                  title="Remove from road plan"
                                  aria-label="Remove school from road plan"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="w-4 h-4"
                                    style={{
                                      fill: "white",
                                      stroke: "white",
                                      strokeWidth: 0,
                                    }}
                                  >
                                    <path
                                      d="M6 18L18 6M6 6l12 12"
                                      stroke="white"
                                      strokeWidth="3.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      fill="none"
                                    />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          );
                        })}
                        {/* Athletes */}
                        {roadMapSelectedAthletes.map((athlete, index) => {
                          const athleteId = String(athlete.id || index);
                          return (
                            <div key={`athlete-${athleteId}`} className="">
                              <div
                                className="flex items-center justify-start border-[4px] border-solid border-[#1C1D4D] rounded-full bg-gray-500 pr-3 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative group"
                                style={{ minWidth: "max-content" }}
                              >
                                <div className="flex items-center justify-center relative left-[-3px] top-[0] border-[4px] border-solid border-[#1C1D4D] rounded-full w-[40px] h-[40px] overflow-hidden">
                                  <img
                                    src={athlete.image_url || "/blank-user.svg"}
                                    alt="Athlete"
                                    className="w-full h-full object-cover rounded-full"
                                  />
                                </div>
                                <h6 className="flex flex-col text-white items-start justify-start mb-0 !text-[12px] !font-semibold !leading-1">
                                  <span className="block w-full truncate max-w-[150px]">
                                    {athlete.athlete_name || ""}
                                  </span>
                                </h6>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveAthlete(athleteId);
                                  }}
                                  className="ml-2 flex items-center justify-center w-7 h-7 rounded-full bg-white/30 hover:bg-red-500/50 transition-colors flex-shrink-0 border border-white/50"
                                  title="Remove from road plan"
                                  aria-label="Remove athlete from road plan"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5"
                                    style={{
                                      fill: "white",
                                      stroke: "white",
                                      strokeWidth: 0,
                                    }}
                                  >
                                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end mr-10">
                  <Button
                    type="primary"
                    onClick={async () => {
                      await saveCombinedToLocalStorage();
                      // Determine dataSource based on what's selected, default to high_schools if both or neither
                      const hasSchools = roadMapSelectedHighSchools.length > 0;
                      const hasAthletes = roadMapSelectedAthletes.length > 0;
                      const dataSourceParam =
                        hasAthletes && !hasSchools
                          ? "hs_athletes"
                          : "high_schools";
                      router.push(
                        `/road-planner/map?dataSource=${dataSourceParam}`
                      );
                    }}
                    disabled={
                      roadMapSelectedHighSchools.length === 0 &&
                      roadMapSelectedAthletes.length === 0
                    }
                  >
                    Map{" "}
                    {roadMapSelectedHighSchools.length +
                      roadMapSelectedAthletes.length >
                      0 &&
                      `(${
                        roadMapSelectedHighSchools.length +
                        roadMapSelectedAthletes.length
                      })`}
                  </Button>

                  {(roadMapSelectedHighSchools.length > 0 ||
                    roadMapSelectedAthletes.length > 0) && (
                    <Button
                      type="link"
                      className="text-[16px] italic underline !text-[#126DB8] font-medium"
                      onClick={clearAllRoadPlanSelections}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
          <Modal
            title={
              <Flex align="center" gap={8}>
                <i className="icon-message-text-1"></i>
                <span>comment</span>
              </Flex>
            }
            width={370}
            footer={null}
            open={isChatVisible}
            onCancel={() => {
              handleCancel();
              setNewComment("");
              setEditingComment(null);
            }}
            className="comment-modal"
            centered
          >
            <Flex vertical gap={16}>
              <Flex vertical gap={8}>
                <Input.TextArea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                />
                <Flex justify="flex-end" gap={8}>
                  {editingComment && (
                    <Button
                      type="text"
                      className="cancel"
                      onClick={() => {
                        setEditingComment(null);
                        setNewComment("");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="primary"
                    onClick={handleSaveComment}
                    loading={isSubmitting}
                    disabled={!newComment.trim()}
                  >
                    {editingComment ? "Update" : "Save"}
                  </Button>
                </Flex>
              </Flex>

              <Divider />

              {comment.map((comment) => (
                <Flex vertical key={comment.id} className="comment-item">
                  <Flex gap={16} align="flex-start">
                    <div
                      className="px-3 py-1 rounded-md"
                      style={{
                        backgroundColor:
                          athleteCommentCounts[selectedPlyer?.id ?? ""] > 0
                            ? "#4CAF50"
                            : "#F5F5F5",
                        color:
                          athleteCommentCounts[selectedPlyer?.id ?? ""] > 0
                            ? "#fff"
                            : "#000",
                      }}
                    >
                      <Typography.Text strong>
                        {comment.user_detail?.name_first}{" "}
                        {comment.user_detail?.name_last}
                      </Typography.Text>
                    </div>
                    <Typography.Paragraph className="flex-1">
                      {comment.content}
                    </Typography.Paragraph>
                  </Flex>
                  <Flex justify="space-between" align="center">
                    <Typography.Text type="secondary">
                      {new Date(comment.created_at).toLocaleString()}
                    </Typography.Text>
                    {comment.user_id === userDetails?.id && (
                      <Space>
                        <Button
                          type="text"
                          icon={<i className="icon-edit-2"></i>}
                          onClick={() => handleEditComment(comment)}
                        />
                        <Button
                          type="text"
                          icon={<i className="icon-trash"></i>}
                          onClick={() => handleDeleteComment(comment.id)}
                        />
                      </Space>
                    )}
                  </Flex>
                  <Divider />
                </Flex>
              ))}
            </Flex>
          </Modal>
        </Flex>
      </div>

      {/* Player Profile Modal */}
      <Modal
        title={null}
        open={isPlayerModalVisible}
        onCancel={handleClosePlayerModal}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        className="new-modal-ui"
        styles={{
          body: {
            height: "calc(100vh - 100px)",
            overflow: "hidden",
          },
        }}
        destroyOnHidden={true}
        closable={true}
        maskClosable={true}
        zIndex={10000}
      >
        {selectedPlayerId ? (
          <div style={{ height: "100%", overflow: "auto" }}>
            {searchParams?.get("dataSource") === "hs_athletes" ? (
              // Use HS-specific profile content when browsing HS athletes
              searchParams?.get("use_main_tp_page_id") === "true" ? (
                <HSAthleteProfileContent
                  mainTpPageId={selectedPlayerId}
                  onAddToBoard={handleModalAddToRecruitingBoard}
                  isInModal={true}
                  dataSource={"hs_athletes"}
                  onClose={handleClosePlayerModal}
                />
              ) : (
                <HSAthleteProfileContent
                  athleteId={selectedPlayerId}
                  onAddToBoard={handleModalAddToRecruitingBoard}
                  isInModal={true}
                  dataSource={"hs_athletes"}
                  onClose={handleClosePlayerModal}
                />
              )
            ) : searchParams?.get("use_main_tp_page_id") === "true" ? (
              <AthleteProfileContent
                mainTpPageId={selectedPlayerId}
                onAddToBoard={handleModalAddToRecruitingBoard}
                isInModal={true}
                dataSource={
                  searchParams?.get("dataSource") as
                    | "transfer_portal"
                    | "all_athletes"
                    | "juco"
                    | "high_schools"
                    | "hs_athletes"
                    | null
                }
                onClose={handleClosePlayerModal}
              />
            ) : (
              <AthleteProfileContent
                athleteId={selectedPlayerId}
                onAddToBoard={handleModalAddToRecruitingBoard}
                isInModal={true}
                dataSource={
                  searchParams?.get("dataSource") as
                    | "transfer_portal"
                    | "all_athletes"
                    | "juco"
                    | "high_schools"
                    | "hs_athletes"
                    | null
                }
                onClose={handleClosePlayerModal}
              />
            )}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
            }}
          >
            <div>Player not found</div>
          </div>
        )}
      </Modal>

      {/* High School Profile Modal */}
      <Modal
        title={null}
        open={isSchoolModalVisible}
        onCancel={handleCloseSchoolModal}
        footer={null}
        width="90%"
        centered
        className="new-modal"
        destroyOnHidden={true}
        closable={true}
        maskClosable={true}
        zIndex={10000}
      >
        <button className="close" onClick={handleCloseSchoolModal}></button>
        {selectedSchoolId ? (
          <div style={{ height: "100%", overflow: "auto" }}>
            <SchoolProfileContent
              schoolId={selectedSchoolId}
              isInModal={true}
              dataSource={searchParams?.get("dataSource") || undefined}
            />
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "50vh",
            }}
          >
            <div>School not found</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
