"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from "react";
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
} from "antd";
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
import { fetchAthleteData, fetchSportColumnConfig, fetchSeasonData, fetchSchools, getUserPackagesForSport, fetchHighSchoolColumnConfig, fetchAthleteRatings, fetchRecruitingAreasForCoach, convertStateIdsToAbbrevs, convertCountyIdsToNames } from "@/lib/queries";
import { US_STATE_ABBREVIATIONS } from '@/utils/constants';
import { AthleteData, Comment, SportStatConfig, HighSchoolData } from "@/types/database";
import { useSearch } from '../_components/SearchContext';
import { FilterState } from "@/types/filters";
import { supabase } from "@/lib/supabaseClient";
import { fetchCustomerRatings, type CustomerRating, formatStatDecimal } from "@/utils/utils";
import { Alert } from 'antd';
import AddAlert from "../_components/AddAlert";
import { useCustomer, useUser } from '@/contexts/CustomerContext';
import UserDataProvider from '@/components/UserDataProvider';
import { StarFilled, DownOutlined } from '@ant-design/icons';
import { CommentService } from '@/lib/commentService';
import { useZoom } from '@/contexts/ZoomContext';
import InfoIcon from '@/components/InfoIcon';
import { getColumnTooltip } from '@/utils/columnTooltips';
import ChooseBoardDropdown from './ChooseBoardDropdown';
import ChooseBoardDropdownWithStatus from './ChooseBoardDropdownWithStatus';
import SuccessPopover from './SuccessPopover';
import { preparePrintRequestData, sendPrintRequest, convertSchoolId } from '@/utils/printUtils';
import { fetchUserDetails } from '@/utils/utils';

const boxStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  padding: "20px 0 20px 20px",
  flexDirection: "column",
  display: "flex",
};
const headerBox: React.CSSProperties = {
  padding: " 0 20px 0 0",
  marginBottom: "5px",
};

interface TableSearchContentProps {
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes';
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
    true_score: true
  },
  all_athletes: {
    date: false,
    athletic_aid: false,
    position: true,
    high_name: true,
    state: true,
    college_state: false,
    true_score: true
  },
  juco: {
    date: false,
    athletic_aid: false,
    position: true,
    high_name: true,
    state: false,
    college_state: true,
    true_score: true
  },
  high_schools: {
    date: false,
    athletic_aid: false,
    position: false,
    high_name: false,
    state: true,
    college_state: false,
    true_score: false
  },
  hs_athletes: {
    date: false,
    athletic_aid: false,
    position: true,
    high_name: true,
    state: false,
    college_state: false,
    true_score: true
  }
} as const;

export function TableSearchContent({ 
  dataSource = 'transfer_portal', 
  baseRoute = '/transfers' 
}: TableSearchContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [selectedPlyer, setSelectedPlyer] = useState<AthleteData | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { searchQuery, setSearchQuery } = useSearch();
  const [localSearchInput, setLocalSearchInput] = useState<string>(searchQuery || '');
  const debouncedSearchQuery = useDebounce(localSearchInput, 500); // 500ms delay
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const debouncedFilters = useDebounce(activeFilters, 300); // 300ms delay for filters
  const [comment, setcomment] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [athleteCommentCounts, setAthleteCommentCounts] = useState<Record<string, number>>({});
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteData[]>([]);
  const [isAddingToRecruitingBoard, setIsAddingToRecruitingBoard] = useState(false);
  const [isBoardModalVisible, setIsBoardModalVisible] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBoardName, setSelectedBoardName] = useState<string>('Main');
  
  // High school selection state
  const [selectedHighSchools, setSelectedHighSchools] = useState<HighSchoolData[]>([]);
  const [isPrintingHighSchools, setIsPrintingHighSchools] = useState(false);
  const [recruitingBoardAthletes, setRecruitingBoardAthletes] = useState<string[]>([]);
  const [athletesOnAllBoards, setAthletesOnAllBoards] = useState<string[]>([]); // Athletes that are on ALL boards
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoadingRecruitingBoard, setIsLoadingRecruitingBoard] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); // Track selected row keys
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayedData, setDisplayedData] = useState<AthleteData[]>([]);
  const [extensionInactive, setExtensionInactive] = useState(false);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceTimer, setMaintenanceTimer] = useState(120); // 2 minutes in seconds

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
    if (dataSource !== 'transfer_portal') {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chrome_extension_user_history')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        return;
      }

      if (data && data.length > 0) {
        const lastActivity = new Date(data[0].timestamp);
        const now = new Date();
        const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
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
    const playerId = searchParams?.get('player');
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
    const schoolId = searchParams?.get('school');
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
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('player');
    params.delete('use_main_tp_page_id'); // Clean up the flag parameter
    params.delete('dataSource'); // Clean up the dataSource parameter
    const newUrl = params.toString() ? `${baseRoute}?${params.toString()}` : baseRoute;
    router.push(newUrl);
  };

  // Handle school modal close
  const handleCloseSchoolModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('school');
    params.delete('dataSource'); // Clean up the dataSource parameter
    const newUrl = params.toString() ? `${baseRoute}?${params.toString()}` : baseRoute;
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
  const [athleteRatings, setAthleteRatings] = useState<Record<string, { name: string; color: string }>>({});
  const [dynamicColumns, setDynamicColumns] = useState<SportStatConfig[]>([]); // For table display (with search_column_display)
  const [filterColumns, setFilterColumns] = useState<SportStatConfig[]>([]); // For filter options (all stats)
  const [sportId, setSportId] = useState<string | null>(null);
  const [tableScrollHeight, setTableScrollHeight] = useState<string>("calc(100vh - 200px)");
  
  // Add cache for data to prevent redundant fetches
  const [dataCache, setDataCache] = useState<Record<string, { data: AthleteData[]; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Add state for tracking total records and filtered records
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [filteredRecords, setFilteredRecords] = useState<number>(0);
  const [seasonData, setSeasonData] = useState<number | null>(null);
  // High school dynamic column configuration (from hs_table_config)
  const [hsColumns, setHsColumns] = useState<{ dataIndex: string; display_name: string; search_column_display: number; data_type_id: number }[]>([]);
  
  // Add sorting state with default values
  // For pre-portal and juco, start with null so pre_portal_default_search from DB is used
  // For transfer_portal, default to date descending
  // For high_schools, default to school name ascending
  // For hs_athletes, default to last_name ascending (alphabetical)
  const [sortField, setSortField] = useState<string | null>(
    dataSource === 'high_schools' ? null : // Let database handle default sort for high schools
    dataSource === 'hs_athletes' ? 'last_name' : // Default to last_name for hs_athletes
    (dataSource === 'all_athletes' || dataSource === 'juco') ? null : 'date'
  );
  const [sortOrder, setSortOrder] = useState<'ascend' | 'descend' | null>(
    dataSource === 'high_schools' ? null : // Let database handle default sort for high schools
    dataSource === 'hs_athletes' ? 'ascend' : // Default to ascending for hs_athletes (alphabetical)
    (dataSource === 'all_athletes' || dataSource === 'juco') ? null : 'descend'
  );
  
  // Define columns that should start with ascending order on first click
  const ascendingFirstColumns = ['position', 'high_name', 'state', 'era', 'fip', 'bb_per9', 'whip', 'school'];
  
  // Add ref to track which athletes we've already fetched comment counts for
  const fetchedCommentCountsRef = useRef<Set<string>>(new Set());
  
  // Add ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Add ref to track previous search query to prevent loops
  const prevSearchQueryRef = useRef<string>(searchQuery);
  
  // Add ref to track maintenance timer
  const maintenanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get the active customer and sport abbreviation from context
  const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
  const activeSport = activeSportAbbrev || ''; // fallback to blank if not found
  
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
    window.addEventListener('resize', updateScrollHeight);
    return () => window.removeEventListener('resize', updateScrollHeight);
  }, [zoom]);

  const columns = useMemo((): TableColumnsType<any> => {
    const columnConfig = DATA_SOURCE_COLUMN_CONFIG[dataSource];
    
    // High school specific columns
    if (dataSource === 'high_schools') {
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
              const params = new URLSearchParams(searchParams?.toString() || '');
              params.set('school', record.id);
              params.set('dataSource', 'high_schools');
              
              const newUrl = params.toString() ? `${baseRoute}?${params.toString()}` : baseRoute;
              router.push(newUrl);
            };

            return (
              <div 
                className="profile-list"
                onClick={handleSchoolClick}
              style={{ 
                cursor: 'pointer',
                whiteSpace: 'nowrap' // Prevent text wrapping but allow natural width
              }}
              >
                <div className="pro-detail">
                <h4 className="flex items-center mb-0.5" style={{ whiteSpace: 'nowrap' }}>
                  {text || record.school || 'No School Name'}
                  </h4>
                </div>
              </div>
            );
          },
      };

      // Dynamic HS columns from hs_table_config (only if hsColumns is loaded)
      const dynamicColumns = hsColumns.length > 0 ? hsColumns.map((col) => {
        const baseColumn = {
          title: col.display_name,
          dataIndex: col.dataIndex,
          key: col.dataIndex,
          minWidth: Math.max(120, (col.display_name?.length || 8) * 12), // Use minWidth instead of fixed width
          ellipsis: false, // Don't cut off text unnecessarily
          sorter: true,
          render: (text: string) => {
            if (!text) return text;
            return (
              <div style={{ whiteSpace: 'nowrap' }}>
                {text}
              </div>
            );
          }
        };

        // Special formatting for contact information
        if (col.display_name?.toLowerCase().includes('email') || 
            col.dataIndex?.toLowerCase().includes('email')) {
          // Email link formatting
          return {
            ...baseColumn,
            render: (text: string, record: any) => {
              if (!text) return text;
              
              return (
                <a 
                  href={`mailto:${text}`}
                  style={{ 
                    color: '#1890ff', 
                    textDecoration: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {text}
                </a>
              );
            }
          };
        } else if (col.display_name?.toLowerCase().includes('phone') || 
                   col.display_name?.toLowerCase().includes('cell') ||
                   col.display_name?.toLowerCase().includes('home') ||
                   col.display_name?.toLowerCase().includes('office') ||
                   col.dataIndex?.toLowerCase().includes('phone') ||
                   col.dataIndex?.toLowerCase().includes('cell')) {
          // Phone link formatting
          return {
            ...baseColumn,
            render: (text: string, record: any) => {
              if (!text) return text;
              
              // Format phone number to (xxx) xxx-xxxx
              const formatPhoneNumber = (phone: string) => {
                // Remove all non-digit characters
                const digits = phone.replace(/\D/g, '');
                
                // If it's a 10-digit number, format as (xxx) xxx-xxxx
                if (digits.length === 10) {
                  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
                }
                
                // If it's an 11-digit number starting with 1, format as (xxx) xxx-xxxx
                if (digits.length === 11 && digits.startsWith('1')) {
                  return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
                }
                
                // Return original if it doesn't match expected format
                return phone;
              };

              const formattedPhone = formatPhoneNumber(text);
              
              return (
                <a 
                  href={`tel:${text.replace(/\D/g, '')}`}
                  style={{ 
                    color: '#1890ff', 
                    textDecoration: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {formattedPhone}
                </a>
              );
            }
          };
        }

        return baseColumn;
      }) : [];

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
          style: isOnBoard ? { backgroundColor: '#d4edda' } : {},
        };
      },
      render: (record: AthleteData) => {
        const handlePlayerClick = async (e: React.MouseEvent) => {
          e.stopPropagation();
          
          // Get the main_tp_page_id for this athlete
          try {
            const { getMainTpPageIdFromAthleteId } = await import('@/lib/queries');
            const mainTpPageId = await getMainTpPageIdFromAthleteId(record.id);
            
            if (mainTpPageId) {
              // Use main_tp_page_id instead of athlete_id
              const params = new URLSearchParams(searchParams?.toString() || '');
              params.set('player', mainTpPageId);
              params.set('use_main_tp_page_id', 'true'); // Flag to indicate we're using main_tp_page_id
              params.set('dataSource', dataSource); // Pass the data source
              router.push(`${baseRoute}?${params.toString()}`);
            } else {
              // Fallback to athlete_id if main_tp_page_id not found
              const params = new URLSearchParams(searchParams?.toString() || '');
              params.set('player', record.id);
              params.set('dataSource', dataSource); // Pass the data source
              router.push(`${baseRoute}?${params.toString()}`);
            }
          } catch (error) {
            // Fallback to athlete_id on error
            const params = new URLSearchParams(searchParams?.toString() || '');
            params.set('player', record.id);
            params.set('dataSource', dataSource); // Pass the data source
            router.push(`${baseRoute}?${params.toString()}`);
          }
        };

        return (
          <div 
            className="profile-list"
            onClick={handlePlayerClick}
            style={{ cursor: 'pointer' }}
          >
            <ImageWithAverage
              src={record.image_url || "/blank-user.svg"}
              alt={record.athlete_name || ''}
              size="small"
              height={126}
              width={126}
              average={record.true_score || 0}
            />
            <div className="pro-detail">
              <h4 className="flex items-center mb-0.5">
                {record.athlete_name}
                {record.highlight && record.highlight.trim() !== '' && (
                  <div className="ml-2 flex items-center">
                    <Tooltip title={record.highlight} placement="top">
                      <span 
                        style={{ fontSize: '14px', cursor: 'pointer', fontStyle: 'normal' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(record.highlight, '_blank');
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
                      <StarFilled style={{ color: '#fff', fontSize: 12 }} />
                    </div>
                    <span className="text-sm text-gray-600">{athleteRatings[record.id].name.substring(0, 4)}</span>
                  </div>
                )}
              </h4>
              <div 
                className="name"
                style={{
                  backgroundColor: record.commit_school_name && record.commit_school_name.trim() !== '' ? '#00bcd430' : 'transparent',
                  padding: record.commit_school_name && record.commit_school_name.trim() !== '' ? '1px 1px 0px 5px' : '0',
                  borderRadius: record.commit_school_name && record.commit_school_name.trim() !== '' ? '0px' : '0',
                  border: record.commit_school_name && record.commit_school_name.trim() !== '' ? '' : 'none',
                  margin: '0'
                }}
              >
                  {record.year && (
                  <span className="year-display inline mr-1">{record.year} / </span>
                )}
                    {record.division && (
                <div className="text-base inline mr-1">
                  {record.division} / 
                </div>
              )}
                <p style={{ margin: '0' }} className="inline">
                  {/* <img src="/b.svg" height={16} className="mr-1"></img> */}
                  {/* <img src="/b.svg" height={16} className="mr-1"/> */}
                  {/* Display commit school name if available */}
                  {record.commit_school_name && record.commit_school_name.trim() !== '' ? (
                    <>
                      {/* Current school logo and name */}
                      {record.school_logo_url && record.school_logo_url.trim() !== '' && (
                        <Image
                        className="mr-1"
                          src={record.school_logo_url}
                          alt="Current school logo"
                          width={20}
                          height={20}
                          style={{ objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span style={{ color: '#888' }}>{record.name_name}</span>
                      
                      {/* Arrow */}
                      <span className="text-gray-900"> → </span>
                      
                      {/* Commit school logo and name */}
                      {record.commit_school_logo_url && record.commit_school_logo_url.trim() !== '' && (
                        <Image
                         className="mr-1"
                          src={record.commit_school_logo_url}
                          alt="Commit school logo"
                          width={20}
                          height={20}
                          style={{ objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="text-gray-900">{record.commit_school_name}</span>
                      {record.commit_date && (
                        <span className="text-gray-600 ml-1">({new Date(record.commit_date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })})</span>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Single school logo and name */}
                      {record.school_logo_url && record.school_logo_url.trim() !== '' && (
                        <Image
                          src={record.school_logo_url}
                          alt="School logo"
                          width={20}
                          height={20}
                          style={{ objectFit: 'contain' }}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
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
        const userPackageNumbers = (userDetails?.packages || []).map((pkg: string | number) => Number(pkg));
        const sportPackages = getUserPackagesForSport(sportAbbrev, userPackageNumbers);
        hasNaiaPackage = sportPackages.some(pkg => pkg.is_naia);
        
      }
      
      // Status column shows for non-NAIA teams (regardless of sport)
      const shouldShowStatusColumn = dataSource === 'all_athletes' && !hasNaiaPackage;
      
      
      return shouldShowStatusColumn ? [{
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        sorter: true,
        render: (value: any, record: any) => {
          if (value === null || value === undefined || value === '') {
            return null;
          }
          return value;
        },
      }] : [];
    })(),
    // Conditionally include Transfer Odds column
    // Only show on pre-portal (all_athletes) view
    // For football: show if they DON'T have the football-specific NAIA package
    // For other sports: show if they DO have the sport-specific NAIA package
    ...(() => {
      const isFootball = activeSportAbbrev?.toLowerCase() === 'fb';
      const sportAbbrev = activeSportAbbrev?.toLowerCase();
      
      // Check if user has a NAIA package for this sport
      let hasNaiaPackage = false;
      if (sportAbbrev) {
        const userPackageNumbers = (userDetails?.packages || []).map((pkg: string | number) => Number(pkg));
        const sportPackages = getUserPackagesForSport(sportAbbrev, userPackageNumbers);
        hasNaiaPackage = sportPackages.some(pkg => pkg.is_naia);
      }
      
      const shouldShowColumn = dataSource === 'all_athletes' && (isFootball ? !hasNaiaPackage : hasNaiaPackage);
      
      
      return shouldShowColumn ? [{
        title: "Transfer %",
        dataIndex: "transfer_odds",
        key: "transfer_odds",
        width: 120,
        sorter: true,
        render: (value: any) => {
          if (value === null || value === undefined || value === '') {
            return null;
          }
          // Convert to percentage with 1 decimal place
          const percentage = (Number(value)).toFixed(1);
          return `${percentage}%`;
        },
      }] : [];
    })(),
    // Conditionally include Date column based on configuration
    ...(columnConfig.date ? [{
      title: "Date",
      dataIndex: "date",
      key: "date",
      sorter: true,
      defaultSortOrder: 'descend' as const,
      render: (value: string) => {
        if (!value) return null;
        try {
          // For date-only values, append time to avoid timezone issues
          const date = new Date(value + 'T12:00:00');
          return date.toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: '2-digit'
          });
        } catch (error) {
          return value; // Return original value if parsing fails
        }
      },
    }] : []),
    // Conditionally include $ column based on configuration
    ...(columnConfig.athletic_aid ? [{
      title: "$",
      key: "athletic_aid",
      width: 60,
      sorter: true,
      dataIndex: "athletic_aid",
    }] : []),
    // Conditionally include Pos column based on configuration
    ...(columnConfig.position ? [{
      title: "Pos",
      dataIndex: "position",
      key: "position",
      width: 70,
      sorter: true,
    }] : []),
    // Conditionally include State column based on configuration
    ...(columnConfig.state ? [{
      title: "State",
      dataIndex: "state",
      key: "state",
      width: 80,
      sorter: true,
    }] : []),
    // Conditionally include Called State column based on configuration (juco only)
    ...(columnConfig.college_state ? [{
      title: "State",
      dataIndex: "school_state",
      key: "school_state",
      width: 100,
      sorter: true,
    }] : []),
    // Dynamic columns based on sport_stat_config
    ...(dynamicColumns.length > 0 
      ? dynamicColumns.map((col) => {
          const tooltip = getColumnTooltip(col.display_name);
          return {
            title: () => (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'flex-start',
                width: '100%'
              }}>
                {tooltip && <InfoIcon tooltip={tooltip} style={{ marginRight: '4px', marginLeft: '0' }} />}
                <span>{col.display_name}</span>
              </div>
            ),
            dataIndex: col.sanitized_column_name || col.data_type_name?.toLowerCase().replace(/\s+/g, '_') || col.display_name.toLowerCase().replace(/\s+/g, '_'),
            key: col.sanitized_column_name || col.data_type_name?.toLowerCase().replace(/\s+/g, '_') || col.display_name.toLowerCase().replace(/\s+/g, '_'),
            width: Math.max(70, (col.display_name.length + (tooltip ? 5 : 3)) * 11), // Extra space for columns with info icons
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
                const isFootball = String(activeCustomer?.sport_id) === '21';
                if (isFootball) {
                  // Handle text "true" value
                  if (value === 'true' || value === true || value === 1 || value === '1') {
                    return 'Y';
                  }
                  return null;
                }
                return null;
              }
              
              // Special handling for Twitter (data_type_id 13)
              if (col.data_type_id === 13) {
                if (value && value.trim() !== '') {
                  // Remove @ symbol if present and create clickable link
                  const twitterHandle = value.replace('@', '');
                  return (
                    <a 
                      href={`https://x.com/${twitterHandle}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#1DA1F2', textDecoration: 'none' }}
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
                const highSchoolValue = record.high_school || record.high_name || value;
                if (highSchoolValue && highSchoolValue.trim() !== '') {
                  return highSchoolValue;
                }
                return null;
              }
              
              // Default handling for other stats
              if (value === null || value === undefined || value === '') {
                return null;
              }
              return formatStatDecimal(value, col.decimal_places, col.is_percentage, col.convert_negative_to_zero);
            },
          };
        })
      : []
    ),
    {
      title: "",
      key: "operation",
      fixed: "right",
      width: 60,
      render: (_, record) => (
        <div className="flex flex-col items-center justify-center action-icons">
          {/* hamburger menu */}
          <Link href="" className="icon-menu-1" style={{ display: 'none' }}></Link>
          {/* message icon */}
          <Link
            href=""
            className={`icon-message ${athleteCommentCounts[record.id] > 0 ? 'has-comment' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              handleChat(record);
            }}
          >
          </Link>
        </div>
      ),
    },
  ];
  }, [dynamicColumns, athleteRatings, athleteCommentCounts, dataSource, userDetails, activeSportAbbrev, hsColumns]);

  // Function to fetch high school data
  const fetchHighSchoolData = async (options: {
    page?: number;
    limit?: number;
    search?: string;
    selectColumns?: string[];
    filters?: FilterState;
    sortField?: string | null;
    sortOrder?: 'ascend' | 'descend' | null;
  } = {}) => {
    const { page = 1, limit = 25, search = '', selectColumns = [], filters = {}, sortField = null, sortOrder = null } = options;
    
      try {
       // Helper function to get sanitized column name from data_type table
       const getColumnName = async (dataTypeId: number): Promise<string | null> => {
         try {
           const { data, error } = await supabase
             .from('data_type')
             .select('name')
             .eq('id', dataTypeId)
             .single();
           
           if (error || !data) {
             return null;
           }
           
           // Sanitize the column name for SQL
           return String(data.name)
             .toLowerCase()
             .replace(/[^a-z0-9]/g, '_')
             .replace(/_+/g, '_')
             .replace(/^_|_$/g, '');
         } catch (e) {
           return null;
         }
       };
 
       // Fetch column names for all data_type_ids that have filters
       const dataTypeIds = [24, 991, 961, 928, 956, 957, 958, 959, 960];
       const columnNamesPromises = dataTypeIds.map(id => getColumnName(id));
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
      if (filters.hsState && filters.hsState.length > 0 && dataTypeColumnMap[24]) filterColumns.add(dataTypeColumnMap[24]);
      if (filters.hsCounty && filters.hsCounty.length > 0 && dataTypeColumnMap[991]) filterColumns.add(dataTypeColumnMap[991]);
      if (filters.hsReligiousAffiliation && filters.hsReligiousAffiliation.length > 0 && dataTypeColumnMap[961]) filterColumns.add(dataTypeColumnMap[961]);
      if (filters.hsSchoolType && filters.hsSchoolType.length > 0 && dataTypeColumnMap[928]) filterColumns.add(dataTypeColumnMap[928]);
      if ((filters.hsProspectsScore?.minValue !== undefined || filters.hsProspectsScore?.maxValue !== undefined) && dataTypeColumnMap[956]) filterColumns.add(dataTypeColumnMap[956]);
      if ((filters.hsD1ProspectsScore?.minValue !== undefined || filters.hsD1ProspectsScore?.maxValue !== undefined) && dataTypeColumnMap[957]) filterColumns.add(dataTypeColumnMap[957]);
      if ((filters.hsTeamQualityScore?.minValue !== undefined || filters.hsTeamQualityScore?.maxValue !== undefined) && dataTypeColumnMap[958]) filterColumns.add(dataTypeColumnMap[958]);
      if ((filters.hsAthleteIncomeScore?.minValue !== undefined || filters.hsAthleteIncomeScore?.maxValue !== undefined) && dataTypeColumnMap[959]) filterColumns.add(dataTypeColumnMap[959]);
      if ((filters.hsAcademicsScore?.minValue !== undefined || filters.hsAcademicsScore?.maxValue !== undefined) && dataTypeColumnMap[960]) filterColumns.add(dataTypeColumnMap[960]);
      
      // Add data type 24 field for unified location filter
      if (filters.location && filters.location.values && filters.location.values.length > 0) {
        if ((filters.location.type === 'school_state' || filters.location.type === 'international') && dataTypeColumnMap[24]) {
          filterColumns.add(dataTypeColumnMap[24]);
        }
      }
      
      // Add latitude/longitude fields for radius filter
      if (filters.location && filters.location.type === 'radius') {
        filterColumns.add('address_latitude');
        filterColumns.add('address_longitude');
      }
      
      // Add fields for recruiting area filter
      if (filters.location && filters.location.type === 'recruiting_area') {
        filterColumns.add('address_state');
        filterColumns.add('hs_county');
        filterColumns.add('school_id');
      }
      
      const baseSelect = ['school_id', 'school_name', ...selectColumns, ...Array.from(filterColumns)];
      // Remove duplicates
      const uniqueSelect = [...new Set(baseSelect)];
      
      let query = supabase
        .from('vw_high_school')
        .select(uniqueSelect.join(','), { count: 'exact' });

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
        if (type === 'radius') {
          const radiusData = filters.location.radius;
          
          if (radiusData?.center && radiusData?.distance) {
            try {
              // Geocode the center location to get coordinates
              const { geocodeLocation, getBoundingBox } = await import('@/utils/geocoding');
              const centerLocation = await geocodeLocation(radiusData.center);
              
              if (centerLocation) {
                // Get bounding box coordinates for the radius
                const boundingBox = getBoundingBox(centerLocation.lat, centerLocation.lng, radiusData.distance);
                
                // Add latitude/longitude range filters to the query
                query = query
                  .gte('address_latitude', boundingBox.minLat)
                  .lte('address_latitude', boundingBox.maxLat)
                  .gte('address_longitude', boundingBox.minLng)
                  .lte('address_longitude', boundingBox.maxLng);
              }
            } catch (error) {
              console.error('Error setting up radius bounding box:', error);
              // If geocoding fails, don't apply any location filters
            }
          }
        }
        // Handle recruiting area filter (doesn't use values array)
        else if (type === 'recruiting_area') {
          const recruitingAreaData = filters.location.recruitingArea;
          
          if (recruitingAreaData?.coachId) {
            try {
              const recruitingAreas = await fetchRecruitingAreasForCoach(recruitingAreaData.coachId);
              
              const orConditions = [];
              
              // Add state conditions (convert state IDs to abbreviations and search address_state)
              if (recruitingAreas.stateIds.length > 0) {
                const stateAbbrevs = await convertStateIdsToAbbrevs(recruitingAreas.stateIds);
                if (stateAbbrevs.length > 0) {
                  orConditions.push(`address_state.in.(${stateAbbrevs.map(s => `"${s}"`).join(',')})`);
                }
              }
              
              // Add county conditions (convert county IDs to county names)
              if (recruitingAreas.countyIds.length > 0) {
                const countyNames = await convertCountyIdsToNames(recruitingAreas.countyIds);
                if (countyNames.length > 0) {
                  orConditions.push(`hs_county.in.(${countyNames.map(c => `"${c}"`).join(',')})`);
                }
              }
              
              // Add school conditions
              if (recruitingAreas.schoolIds.length > 0) {
                orConditions.push(`school_id.in.(${recruitingAreas.schoolIds.join(',')})`);
              }
              
              // Apply OR conditions if any exist
              if (orConditions.length > 0) {
                query = query.or(orConditions.join(','));
              } 
            } catch (error) {
              console.error('❌ Error applying recruiting area filter:', error);
            }
          }
        }
        // Handle other location filters that use values array
        else if (filters.location.values && filters.location.values.length > 0) {
          if (filters.location.type === 'school_state' && dataTypeColumnMap[24]) {
            query = query.in(dataTypeColumnMap[24], filters.location.values);
          } else if (filters.location.type === 'county' && dataTypeColumnMap[991]) {
            query = query.in(dataTypeColumnMap[991], filters.location.values);
          } else if (filters.location.type === 'international' && dataTypeColumnMap[24]) {
            // Handle international filter for high schools
            if (filters.location.values.includes('ALL_INTERNATIONAL')) {
              // Filter out US states - show all international schools
              query = query.not(dataTypeColumnMap[24], 'in', `(${US_STATE_ABBREVIATIONS.map(state => `"${state}"`).join(',')})`);
              query = query.not(dataTypeColumnMap[24], 'is', null);
              query = query.not(dataTypeColumnMap[24], 'eq', '');
            } else {
              // Filter by specific international locations
              query = query.in(dataTypeColumnMap[24], filters.location.values);
            }
          }
        }
      }

      // Legacy filter support (for backward compatibility)
      // State filter (data_type_id 24 - address_state)
      if (filters.hsState && filters.hsState.length > 0 && dataTypeColumnMap[24]) {
        query = query.in(dataTypeColumnMap[24], filters.hsState);
      }

      // County filter (data_type_id 991)
      if (filters.hsCounty && filters.hsCounty.length > 0 && dataTypeColumnMap[991]) {
        query = query.in(dataTypeColumnMap[991], filters.hsCounty);
      }

      // Religious Affiliation filter (data_type_id 961)
      if (filters.hsReligiousAffiliation && filters.hsReligiousAffiliation.length > 0 && dataTypeColumnMap[961]) {
        query = query.in(dataTypeColumnMap[961], filters.hsReligiousAffiliation);
      }

      // School Type filter - HS/JUCO selection
      if (filters.hsSchoolType && filters.hsSchoolType.length > 0) {
        query = query.in('school_type', filters.hsSchoolType);
      }

      // Prospects Score filter (data_type_id 956) - min/max range
      if (filters.hsProspectsScore && dataTypeColumnMap[956]) {
        const { minValue, maxValue } = filters.hsProspectsScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[956], 'gte', String(minValue))
                      .filter(dataTypeColumnMap[956], 'lte', String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[956], 'gte', String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[956], 'lte', String(maxValue));
        }
      }

      // D1 Prospects Score filter (data_type_id 957) - min/max range
      if (filters.hsD1ProspectsScore && dataTypeColumnMap[957]) {
        const { minValue, maxValue } = filters.hsD1ProspectsScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[957], 'gte', String(minValue))
                      .filter(dataTypeColumnMap[957], 'lte', String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[957], 'gte', String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[957], 'lte', String(maxValue));
        }
      }

      // Team Quality Score filter (data_type_id 958) - min/max range
      if (filters.hsTeamQualityScore && dataTypeColumnMap[958]) {
        const { minValue, maxValue } = filters.hsTeamQualityScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[958], 'gte', String(minValue))
                      .filter(dataTypeColumnMap[958], 'lte', String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[958], 'gte', String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[958], 'lte', String(maxValue));
        }
      }

      // Athlete Income Score filter (data_type_id 959) - min/max range
      if (filters.hsAthleteIncomeScore && dataTypeColumnMap[959]) {
        const { minValue, maxValue } = filters.hsAthleteIncomeScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[959], 'gte', String(minValue))
                      .filter(dataTypeColumnMap[959], 'lte', String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[959], 'gte', String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[959], 'lte', String(maxValue));
        }
      }

      // Academics Score filter (data_type_id 960) - min/max range
      if (filters.hsAcademicsScore && dataTypeColumnMap[960]) {
        const { minValue, maxValue } = filters.hsAcademicsScore;
        if (minValue !== undefined && maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[960], 'gte', String(minValue))
                      .filter(dataTypeColumnMap[960], 'lte', String(maxValue));
        } else if (minValue !== undefined) {
          query = query.filter(dataTypeColumnMap[960], 'gte', String(minValue));
        } else if (maxValue !== undefined) {
          query = query.filter(dataTypeColumnMap[960], 'lte', String(maxValue));
        }
      }

      // Add sorting if provided
      if (sortField && sortOrder) {
        let dbColumnName = sortField;
        
        // Map frontend column names to database column names
        if (sortField === 'school' || sortField === 'school_name') {
          dbColumnName = 'school_name';
        }
        
        // Apply sorting
        if (sortOrder === 'ascend') {
          query = query.order(dbColumnName, { ascending: true });
        } else if (sortOrder === 'descend') {
          query = query.order(dbColumnName, { ascending: false });
        }
      } else {
        // Default sort by state first, then by school name ascending
        query = query.order('hs_state', { ascending: true }).order('school_name', { ascending: true });
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
        const cleanSchoolName = school.school_name?.replace(/\s*\([^)]+\)$/, '') || school.school_name;
        const cleanCountyName = school.hs_county?.replace(/\s*\([^)]+\)$/, '') || school.hs_county;
        
        return {
          ...school,
          id: school.school_id,
          school: cleanSchoolName,
          hs_county: cleanCountyName
        };
      });

      // Debug: Check the first few records to see the state values
       

      return {
        data: formattedData,
        totalCount: count || 0,
        hasMore: formattedData.length === limit
      };
    } catch (error) {
      throw error;
    }
  };

  // Unified data loading function
  const loadAthleteData = useCallback(async (options: {
    isInitialLoad?: boolean;
    isLoadMore?: boolean;
    isFiltered?: boolean;
    page?: number;
    filters?: FilterState;
    search?: string;
    sortField?: string | null;
    sortOrder?: 'ascend' | 'descend' | null;
  } = {}) => {
    const {
      isInitialLoad = false,
      isLoadMore = false,
      isFiltered = false,
      page: targetPage = 1,
      filters = {},
      search = '',
      sortField: targetSortField = null,
      sortOrder: targetSortOrder = null
    } = options;

    // Prevent multiple simultaneous data loads
    if (loading) {
      return;
    }
    
    // For high schools, we don't need customer/sport data
    if (dataSource === 'high_schools') {
      try {
        setLoading(true);
        
        // Load column configuration first if not already loaded
        let currentColumns = hsColumns;
        if (hsColumns.length === 0) {
          const configs = await fetchHighSchoolColumnConfig();
          let cols = configs.map(cfg => ({
            dataIndex: cfg.sanitized_column_name,
            display_name: cfg.display_name,
            search_column_display: cfg.search_column_display,
            data_type_id: cfg.data_type_id
          }));
          // Strong client-side filter as a safety net
          cols = cols.filter(c => Number(c.search_column_display) > 0);
          cols.sort((a, b) => a.search_column_display - b.search_column_display);
          setHsColumns(cols);
          currentColumns = cols; // Use the local variable instead of state
        }
        
        const highSchoolData = await fetchHighSchoolData({
          page: targetPage,
          limit: ITEMS_PER_PAGE,
          search: search,
          selectColumns: currentColumns.map(c => c.dataIndex),
          filters: filters,
          sortField: targetSortField,
          sortOrder: targetSortOrder
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
        setError('Failed to load high school data');
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
        
        if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
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
      const shouldFetchColumns = !sportId || 
        sportId !== activeCustomer.sport_id || 
        dynamicColumns.length === 0 || 
        filterColumns.length === 0;
        
      if (shouldFetchColumns) {

        setSportId(activeCustomer.sport_id);
        try {
          // Fetch columns for table display (with search_column_display filter)
          const displayColumns = await fetchSportColumnConfig(activeCustomer.sport_id, false, true, dataSource);
          setDynamicColumns(displayColumns);
          currentDynamicColumns = displayColumns;
          
          // Fetch columns for filters (all stats)
          const allColumns = await fetchSportColumnConfig(activeCustomer.sport_id, true);
          setFilterColumns(allColumns);
          currentFilterColumns = allColumns;

        } catch (error) {
          setDynamicColumns([]);
          setFilterColumns([]);
          currentDynamicColumns = [];
          currentFilterColumns = [];
        }
        
        // Fetch season data for the header
        try {
          const season = await fetchSeasonData(Number(activeCustomer.sport_id), dataSource);
          setSeasonData(season);
        } catch (error) {
          setSeasonData(null);
        }
      } else {

      }
      
      // Create display columns list based on the configuration
      const columnConfig = DATA_SOURCE_COLUMN_CONFIG[dataSource];
      // Determine if transfer_odds should be included
      // Only show on pre-portal (all_athletes) view
      // For football: show if they DON'T have the football-specific NAIA package
      // For other sports: show if they DO have the sport-specific NAIA package
      const isFootball = activeSportAbbrev?.toLowerCase() === 'fb';
      const sportAbbrev = activeSportAbbrev?.toLowerCase();
      
      // Check if user has a NAIA package for this sport
      let hasNaiaPackage = false;
      if (sportAbbrev) {
        const userPackageNumbers = (userDetails?.packages || []).map((pkg: string | number) => Number(pkg));
        const sportPackages = getUserPackagesForSport(sportAbbrev, userPackageNumbers);
        hasNaiaPackage = sportPackages.some(pkg => pkg.is_naia);
      }
      
      const shouldIncludeTransferOdds = dataSource === 'all_athletes' && (isFootball ? !hasNaiaPackage : hasNaiaPackage);
      
      const displayColumns = [
        // Conditionally include columns based on configuration
        // Include transfer_odds based on sport and package (only on pre-portal)
        ...(shouldIncludeTransferOdds ? ['transfer_odds'] : []),
        ...(columnConfig.date ? ['date'] : []),
        ...(columnConfig.athletic_aid ? ['athletic_aid'] : []),
        ...(columnConfig.position ? ['position'] : []),
        ...(columnConfig.high_name ? ['high_name'] : []),
        ...(columnConfig.state ? ['state'] : []),
        ...(columnConfig.college_state ? ['school_state'] : []),
        ...(columnConfig.true_score ? ['true_score'] : []),
        // Add dynamic stat columns
        ...(currentDynamicColumns.length > 0 
          ? currentDynamicColumns.map(col => col.sanitized_column_name || col.data_type_name?.toLowerCase().replace(/\s+/g, '_') || col.display_name.toLowerCase().replace(/\s+/g, '_'))
          : []
        )
      ];
      
      // Get user's school_id from active customer
      const userSchoolId = activeCustomer?.school_id;
      // Prepare fetch parameters
      const fetchParams = {
        page: targetPage,
        limit: ITEMS_PER_PAGE,
        sportId: activeCustomer.sport_id,
        dataSource: dataSource, // Use the dataSource prop
        displayColumns,
        sportAbbrev: activeSportAbbrev || undefined,
        userPackages: userDetails?.packages || [],
        dynamicColumns: currentFilterColumns, // Use filter columns for filtering
        userSchoolId, // Pass user's school_id to filter out their own school
        ...(isFiltered && { filters, search }),
        ...(targetSortField && targetSortOrder && { 
          sortField: targetSortField, 
          sortOrder: targetSortOrder 
        })
      };
      
      const athleteData = await fetchAthleteData(activeSport, fetchParams);
      

      
      let finalData: AthleteData[];
      
      if (isLoadMore) {
        // For load more, merge with existing data
        // Handle null IDs by using a combination of id and athlete_name for uniqueness
        const existingAthletesMap = new Map();
        displayedData.forEach((athlete, index) => {
          const uniqueKey = athlete.id || `null_${athlete.athlete_name}_${index}`;
          existingAthletesMap.set(uniqueKey, athlete);
        });
        
        athleteData.data.forEach((athlete, index) => {
          const uniqueKey = athlete.id || `null_${athlete.athlete_name}_${index}`;
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
          const uniqueKey = athlete.id || `null_${athlete.athlete_name}_${index}`;
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
        setDataCache(prev => ({
          ...prev,
          [cacheKey]: { data: finalData, timestamp: Date.now() }
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
        .map(athlete => athlete.id)
        .filter(id => id != null && id !== 'null' && id !== '');
      if (athleteIds.length > 0 && activeCustomerId) {
        try {
          const ratingsMap = await fetchAthleteRatings(athleteIds, activeCustomerId);
          
          if (isLoadMore) {
            setAthleteRatings(prev => ({ ...prev, ...ratingsMap }));
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
          const commentCounts = await CommentService.getCommentCounts(athleteIds);
          const newCommentCounts = { ...athleteCommentCounts, ...commentCounts };
          setAthleteCommentCounts(newCommentCounts);
        } catch (error) {
          // Error handled silently
        }
      }
      
      } catch (err) {
        
        // Check if we're in maintenance mode
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (errorMessage.startsWith('MAINTENANCE_MODE:')) {
          if (!isMaintenanceMode) {
            startMaintenanceTimer();
            Modal.error({
              title: 'System Update in Progress',
              content: (
                <div>
                  <p><strong>We are currently making improvements to our data system.</strong></p>
                  <p>The page will automatically refresh in {Math.floor(maintenanceTimer / 60)}:{(maintenanceTimer % 60).toString().padStart(2, '0')}.</p>
                  <Progress percent={Math.round((maintenanceTimer / 120) * 100)} status="active" />
                  <p>Thank you for your patience!</p>
                </div>
              ),
              okText: 'Got it',
              maskClosable: false,
              centered: true,
              width: 500,
              style: { zIndex: 9999 }
            });
          }
          // Don't set error state in maintenance mode
        } else {
          // For other errors, set the general error message
          setError('Failed to load data');
        }
      } finally {
        setLoading(false);
      }
  }, [
    loading, 
    activeCustomer, 
    activeCustomerId, 
    activeSport, 
    sportId, 
    dataCache,
    activeSportAbbrev,
    userDetails?.packages
  ]); // Removed displayedData and athleteCommentCounts from dependencies to prevent infinite loop

  // Initial data load
  useEffect(() => {
    if (!isMaintenanceMode) {
      loadAthleteData({ 
        isInitialLoad: true,
        sortField,
        sortOrder
      });
    }
  }, [activeCustomer, activeCustomerId, activeSport, sortField, sortOrder, isMaintenanceMode]);

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
    if (searchQuery !== prevSearchQueryRef.current && searchQuery !== localSearchInput) {
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
      isFiltered: Object.keys(activeFilters).length > 0 || searchQuery.trim() !== '',
      filters: activeFilters,
      search: searchQuery
    });
  }, [loading, hasMore, page, sortField, sortOrder, activeFilters, searchQuery]); // Added activeFilters and searchQuery to dependencies

  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) {
        return;
      }

      const tableContainer = document.querySelector('.ant-table-body');
      const tableWrapper = document.querySelector('.ant-table-wrapper');
      const tableContent = document.querySelector('.ant-table-content');
      
      if (!tableContainer) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = tableContainer;
      const scrollInfo = {
        scrollTop,
        scrollHeight,
        clientHeight,
        scrollBottom: scrollHeight - scrollTop - clientHeight,
        threshold: 100
      };
      
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreData();
      }
    };

    const tableContainer = document.querySelector('.ant-table-body');
    
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loading, hasMore, data, page, loadMoreData]);

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
    
    // Always run the query when filters or search change, even if filters are empty
    loadAthleteData({ 
      isFiltered: true, 
      filters: debouncedFilters, 
      search: searchQuery,
      sortField,
      sortOrder
    });
  }, [debouncedFilters, searchQuery, sortField, sortOrder]); // Use debounced filters and simplified dependencies

  const rowSelection: TableProps<AthleteData>["rowSelection"] = {
    selectedRowKeys: selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[], selectedRows: AthleteData[]) => {
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
    onChange: (selectedRowKeys: React.Key[], selectedRows: HighSchoolData[]) => {
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
      const athlete = displayedData.find(a => a.id === athleteId);
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
      setAthleteCommentCounts(prev => ({
        ...prev,
        [athleteId]: commentData.length
      }));
    } catch (error) {
      setcomment([]);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedPlyer || !newComment.trim() || isSubmitting || !userTeamId || !userDetails) return;
    
    const athleteId = selectedPlyer.id;
    if (!athleteId) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        await CommentService.updateComment(editingComment.id, userDetails.id, newComment);
      } else {
        // Create new comment
        await CommentService.createComment({
          content: newComment,
          athlete_id: athleteId,
          user_id: userDetails.id,
          customer_id: userTeamId
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
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      if (!userDetails) return;
      await CommentService.deleteComment(commentId, userDetails.id);
      
      // Refresh comment
      await fetchcomment(selectedPlyer?.id || '');
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
      const athleteIds = displayedData.map(athlete => athlete.id).filter(Boolean);
      
      if (athleteIds.length === 0) return;
      
      // Fetch comment counts using the service
      const commentCounts = await CommentService.getCommentCounts(athleteIds);
      
      // Update the ref to track which athletes we've fetched counts for
      athleteIds.forEach(id => fetchedCommentCountsRef.current.add(id));
      
      setAthleteCommentCounts(commentCounts);
    } catch (error) {
      console.error('Error fetching comment counts:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
    
  };
  
  // Update the useEffect to use displayedData instead of data
  useEffect(() => {
    if (displayedData.length > 0 && userTeamId) {
      // Only fetch comment counts if we don't already have them for these athletes
      const athletesWithoutCommentCounts = displayedData.filter(athlete => 
        !fetchedCommentCountsRef.current.has(athlete.id)
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
        .from('recruiting_board_board')
        .select('id')
        .eq('customer_id', activeCustomerId)
        .is('recruiting_board_column_id', null)
        .is('ended_at', null);
      
      if (boardsError || !boardsData || boardsData.length === 0) {
        return;
      }
      
      const totalBoardCount = boardsData.length;
      const boardIds = boardsData.map((b: { id: string }) => b.id);
      
      // Get all athletes on any board for row highlighting
      const { data, error } = await supabase
        .from('recruiting_board_athlete')
        .select('athlete_id, recruiting_board_board_id')
        .in('recruiting_board_board_id', boardIds)
        .is('ended_at', null);
        
      if (error) {
        return;
      }
      
      // Extract unique athlete IDs for row highlighting
      type AthleteBoardData = { athlete_id: string; recruiting_board_board_id: string };
      const athleteIds: string[] = [...new Set(((data || []) as AthleteBoardData[]).map((item: AthleteBoardData) => item.athlete_id))];
      setRecruitingBoardAthletes(athleteIds);
      
      // Calculate which athletes are on ALL boards
      const athleteBoardCount = new Map<string, Set<string>>();
      data.forEach((item: { athlete_id: string; recruiting_board_board_id: string }) => {
        if (!athleteBoardCount.has(item.athlete_id)) {
          athleteBoardCount.set(item.athlete_id, new Set());
        }
        athleteBoardCount.get(item.athlete_id)!.add(item.recruiting_board_board_id);
      });
      
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
          .from('recruiting_board_board')
          .select('id, name')
          .eq('customer_id', activeCustomerId)
          .is('recruiting_board_column_id', null)
          .is('ended_at', null)
          .order('display_order');
        
        if (error) {
          console.error('Error fetching boards:', error);
          return;
        }
        
        setAvailableBoards(data || []);
        
        // Set default board (Main or first available)
        if (data && data.length > 0) {
          const mainBoard = data.find((b: any) => b.name === 'Main') || data[0];
          setSelectedBoardId(mainBoard.id);
          setSelectedBoardName(mainBoard.name);
        }
      } catch (error) {
        console.error('Error in fetchBoards:', error);
      }
    };
    
    fetchBoards();
  }, [activeCustomerId]);

  // Add athletes to recruiting board (now uses selected board)
  const handleAddToRecruitingBoard = async (boardIdOverride?: string, boardNameOverride?: string) => {
    if (selectedAthletes.length === 0) {
      alert("Please select at least one athlete to add to the recruiting board.");
      return;
    }

    if (!userDetails) {
      alert("You must be logged in to add athletes to the recruiting board.");
      return;
    }
    if (!activeCustomerId) {
      alert("No active customer ID found. Please make sure your account is properly set up.");
      return;
    }

    setIsAddingToRecruitingBoard(true);
    
    try {
      const userId = userDetails.id;

      // Use the override if provided, otherwise fall back to selected board ID
      let boardId = boardIdOverride || selectedBoardId;
      const boardName = boardNameOverride || selectedBoardName;
      
      if (!boardId) {
        // Get or create the Main board as fallback
        const { data: boardData, error: boardError } = await supabase
          .from('recruiting_board_board')
          .select('id')
          .eq('customer_id', activeCustomerId)
          .eq('name', 'Main')
          .is('recruiting_board_column_id', null)
          .is('ended_at', null)
          .single();

        if (boardError && boardError.code !== 'PGRST116') {
          alert(`Error finding recruiting board: ${boardError.message}`);
          return;
        }

        boardId = boardData?.id;
        
        // Create Main board if it doesn't exist
        if (!boardId) {
          const { data: newBoard, error: createError } = await supabase
            .from('recruiting_board_board')
            .insert({
              customer_id: activeCustomerId,
              name: 'Main',
              recruiting_board_column_id: null,
              display_order: 1
            })
            .select('id')
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
      const positionName = 'Unassigned';
      
      // Get or create the column
      const { data: columnData, error: columnError } = await supabase
        .from('recruiting_board_column')
        .select('id')
        .eq('customer_id', activeCustomerId)
        .eq('recruiting_board_board_id', boardId)
        .eq('name', positionName)
        .is('ended_at', null)
        .single();

      let columnId = columnData?.id;

      // Create column if it doesn't exist
      if (!columnId && (columnError?.code === 'PGRST116' || !columnData)) {
        // Get the max display order
        const { data: maxOrderData } = await supabase
          .from('recruiting_board_column')
          .select('display_order')
          .eq('customer_id', activeCustomerId)
          .eq('recruiting_board_board_id', boardId)
          .is('ended_at', null)
          .order('display_order', { ascending: false })
          .limit(1);

        const nextOrder = (maxOrderData?.[0]?.display_order || 0) + 1;

        const { data: newColumn, error: createColumnError } = await supabase
          .from('recruiting_board_column')
          .insert({
            customer_id: activeCustomerId,
            recruiting_board_board_id: boardId,
            name: positionName,
            display_order: nextOrder
          })
          .select('id')
          .single();

        if (createColumnError) {
          alert(`Error creating Unassigned column: ${createColumnError.message}`);
          return;
        }

        columnId = newColumn.id;
      }

      // Check which selected athletes are already on this board
      const selectedAthleteIds = selectedAthletes.map(a => a.id);
      const { data: existingOnBoard, error: checkError } = await supabase
        .from('recruiting_board_athlete')
        .select('athlete_id')
        .eq('recruiting_board_board_id', boardId)
        .in('athlete_id', selectedAthleteIds)
        .is('ended_at', null);

      if (checkError) {
        console.error('Error checking existing athletes on board:', checkError);
        // Continue anyway - we'll attempt to add all
      }

      // Filter out athletes already on this board
      const existingAthleteIds = new Set(existingOnBoard?.map((item: { athlete_id: string }) => item.athlete_id) || []);
      const athletesToAdd = selectedAthletes.filter(athlete => !existingAthleteIds.has(athlete.id));

      if (athletesToAdd.length === 0) {
        alert(`All selected athletes are already on ${selectedBoardName}.`);
        setIsAddingToRecruitingBoard(false);
        return;
      }

      // Get the current max rank for this column to assign unique ranks
      const { data: maxRankData } = await supabase
        .from('recruiting_board_athlete')
        .select('rank')
        .eq('recruiting_board_board_id', boardId)
        .eq('recruiting_board_column_id', columnId)
        .is('ended_at', null)
        .order('rank', { ascending: false })
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
          source: dataSource === 'transfer_portal' ? 'portal' : 
                  dataSource === 'juco' ? 'juco' : 
                  dataSource === 'hs_athletes' ? 'high_school' :
                  dataSource === 'all_athletes' ? 'pre-portal' : null
        });
      }

      // Insert the data into the recruiting_board_athlete table
      const { data: insertData, error: insertError } = await supabase
        .from('recruiting_board_athlete')
        .insert(recruitingBoardEntries)
        .select();
        
      if (insertError) {
        alert(`Error adding athletes to recruiting board: ${insertError.message || 'Unknown error'}`);
        return;
      }

      // Show success message with accurate count
      const totalSelected = selectedAthletes.length;
      const addedCount = athletesToAdd.length;
      const alreadyOnBoardCount = totalSelected - addedCount;
      
      let message = '';
      if (alreadyOnBoardCount === 0) {
        message = `${addedCount} player${addedCount > 1 ? 's' : ''} added to ${boardName}!`;
      } else {
        message = `Added ${addedCount} of ${totalSelected} selected athlete${totalSelected > 1 ? 's' : ''} to ${boardName} (${alreadyOnBoardCount} already on board)`;
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
  const handlePrintHighSchools = async () => {
    if (selectedHighSchools.length === 0) {
      alert("Please select at least one high school to print.");
      return;
    }

    setIsPrintingHighSchools(true);

    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("You must be logged in to print. Please log in and try again.");
        setIsPrintingHighSchools(false);
        return;
      }

      // Fetch user details to get customer ID
      const userDetails = await fetchUserDetails();
      if (!userDetails?.customer_id) {
        alert("Unable to print: Missing user details. Please try refreshing the page.");
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
          console.error(`Error converting school ID ${school.id}:`, conversionError);
          alert(`Error converting school ID for ${school.school}. Please try again.`);
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
          min_grad_year: null
        }
      );

      // Send request to the cloud function
      await sendPrintRequest(requestData);

      // Show success message
      alert(`Print request submitted successfully for ${selectedHighSchools.length} school(s)! You'll receive the PDF via email shortly.`);

    } catch (error) {
      console.error("Error with print request:", error);
      alert("An error occurred while processing your print request. Please try again.");
    } finally {
      setIsPrintingHighSchools(false);
    }
  };

  // Updated handler to use local search input with debouncing
  const handleSearch = (value: string) => {
    setLocalSearchInput(value);  // Update local input state, debouncing will handle the actual search
  };

  // --- DEBUG: Log in visibility handler and forcibly set loading states to false ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setLoading(false);
        setIsLoadingRecruitingBoard(false);
        setTableKey((k) => k + 1);
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 50);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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
        .from('data_type')
        .select('name')
        .eq('id', dataTypeId)
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
      const { comparison, feet, inches, minFeet, minInches, maxFeet, maxInches } = activeFilters.height;
      if (comparison === 'between' && minFeet !== undefined && maxFeet !== undefined) {
        const minTotalInches = (minFeet * 12) + (minInches || 0);
        const maxTotalInches = (maxFeet * 12) + (maxInches || 0);
        filterLabels.push(`height_total_inches Min: ${minTotalInches}, Max: ${maxTotalInches}`);
      } else if (comparison === 'min' && feet !== undefined) {
        const totalInches = (feet * 12) + (inches || 0);
        filterLabels.push(`height_total_inches Min: ${totalInches}`);
      } else if (comparison === 'max' && feet !== undefined) {
        const totalInches = (feet * 12) + (inches || 0);
        filterLabels.push(`height_total_inches Max: ${totalInches}`);
      } 
    }

    // Handle static filters with async data_type lookups
    if (activeFilters.position?.length) {
      filterLabels.push(`Position: ${activeFilters.position.join(", ")}`);
    }
    if (activeFilters.divisions?.length) filterLabels.push(`Division: ${activeFilters.divisions.join(", ")}`);
    if (activeFilters.states?.length) {
      const stateName = await getDataTypeName(24);
      filterLabels.push(`Home State: ${activeFilters.states.join(", ")}`);
    }
    if (activeFilters.schools?.length) {
      // Fetch school names from IDs
      try {
        const allSchools = await fetchSchools();
        const selectedSchools = allSchools.filter(school => activeFilters.schools!.includes(school.id));
        const schoolNames = selectedSchools.map(school => school.name).join(", ");
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
      const internationalLabels = activeFilters.international.map(item => 
        item === 'ALL_INTERNATIONAL' ? 'All International' : item
      );
      filterLabels.push(`International: ${internationalLabels.join(", ")}`);
    }
    
    // Handle unified location filter
    if (activeFilters.location) {
      const { type, values, radius, recruitingArea } = activeFilters.location;
      
      switch (type) {
        case 'hometown_state':
          filterLabels.push(`Hometown State: ${values?.join(', ') || 'None'}`);
          break;
        case 'international':
          const internationalLabels = values?.map((item: string) => 
            item === 'ALL_INTERNATIONAL' ? 'All International' : item
          );
          filterLabels.push(`International: ${internationalLabels?.join(', ') || 'None'}`);
          break;
        case 'county':
          filterLabels.push(`School County: ${values?.join(', ') || 'None'}`);
          break;
        case 'school_state':
          filterLabels.push(`School State: ${values?.join(', ') || 'None'}`);
          break;
        case 'radius':
          filterLabels.push(`Radius: ${radius?.center || 'No center'} (${radius?.distance || 0} miles)`);
          break;
        case 'recruiting_area':
          filterLabels.push(`Recruiting Area: ${recruitingArea?.coachId ? 'Coach Selected' : 'No Coach'}`);
          break;
        default:
          filterLabels.push(`Location: ${values?.join(', ') || 'None'}`);
      }
    }
    if (activeFilters.years?.length) {
      const yearName = await getDataTypeName(1);
      filterLabels.push(`${yearName}: ${activeFilters.years.join(", ")}`);
    }
    if (activeFilters.athleticAid?.length) filterLabels.push(`Athletic Aid: ${activeFilters.athleticAid.join(", ")}`);
    if (activeFilters.status?.length) filterLabels.push(`Status: ${activeFilters.status.join(", ")}`);
    if (activeFilters.dateRange?.startDate || activeFilters.dateRange?.endDate) {
      filterLabels.push(`Date Entered: ${activeFilters.dateRange.startDate || ''} - ${activeFilters.dateRange.endDate || ''}`);
    }
    if (activeFilters.gamesPlayed) filterLabels.push(`GP: ${activeFilters.gamesPlayed.comparison} ${activeFilters.gamesPlayed.value}`);
    if (activeFilters.survey_completed !== undefined) {
      // Handle both array format (from multiple select) and boolean format
      if (Array.isArray(activeFilters.survey_completed)) {
        if (activeFilters.survey_completed.includes(true) && activeFilters.survey_completed.includes(false)) {
          filterLabels.push('Survey Completed: Yes, No');
        } else if (activeFilters.survey_completed.includes(true)) {
          filterLabels.push('Survey Completed: Yes');
        } else if (activeFilters.survey_completed.includes(false)) {
          filterLabels.push('Survey Completed: No');
        }
      } else {
        // Handle direct boolean values
        if (activeFilters.survey_completed === true) {
          filterLabels.push('Survey Completed: Yes');
        } else if (activeFilters.survey_completed === false) {
          filterLabels.push('Survey Completed: No');
        }
      }
    }
    if (activeFilters.gradStudent !== undefined) {
      // Handle array format for grad student filter
      if (Array.isArray(activeFilters.gradStudent)) {
        if (activeFilters.gradStudent.includes(true) && activeFilters.gradStudent.includes(false)) {
          filterLabels.push('Grad Student: Yes, No');
        } else if (activeFilters.gradStudent.includes(true)) {
          filterLabels.push('Grad Student: Yes');
        } else if (activeFilters.gradStudent.includes(false)) {
          filterLabels.push('Grad Student: No');
        }
      }
    }
    if (activeFilters.honors?.length) {
      filterLabels.push(`Honors: ${activeFilters.honors.join(", ")}`);
    }
    
    // Handle dynamic stat filters
    for (const key of Object.keys(activeFilters)) {
      if (key.startsWith('stat_')) {
        const dataTypeId = key.replace('stat_', '');
        // Try to find the column in both dynamicColumns and filterColumns
        const column = dynamicColumns.find(col => col.data_type_id.toString() === dataTypeId) || 
                      filterColumns.find(col => col.data_type_id.toString() === dataTypeId);
        const filterValue = activeFilters[key];
        if (filterValue && typeof filterValue === 'object' && 'comparison' in filterValue && 'value' in filterValue) {
          // Use display_name or data_type_name from sport_stat_config
          let columnName = column?.display_name || column?.data_type_name;
          
          // If we still don't have a name, use the dataTypeId as fallback
          if (!columnName) {
            columnName = `Stat ${dataTypeId}`;
          }
          
          // For baseball (sport_id 6), add stat category prefix (capitalize first letter, then add hyphen)
          // Exclude position-agnostic stats like GP (Games Played)
          const isBaseball = Number(column?.sport_id) === 6;
          const isPositionAgnostic = column?.display_name === 'GP' || column?.display_name === 'GS' || 
                                          column?.data_type_id === 98 || column?.data_type_id === 83;
          if (isBaseball && column?.stat_category && !isPositionAgnostic) {
            const categoryPrefix = column.stat_category.charAt(0).toUpperCase() + column.stat_category.slice(1);
            columnName = `${categoryPrefix} - ${columnName}`;
          }
          
          const comparisonLabel = filterValue.comparison === 'greater' ? 'Min' : 
                                filterValue.comparison === 'less' ? 'Max' : 
                                filterValue.comparison;
          filterLabels.push(`${columnName} ${comparisonLabel}: ${filterValue.value}`);
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
  const sortDataByHeight = (data: AthleteData[], order: 'ascend' | 'descend') => {
    return [...data].sort((a, b) => {
      // Convert height to total inches for comparison
      const getHeightInInches = (athlete: AthleteData) => {
        const feet = athlete.height_feet || 0;
        const inches = athlete.height_inch || 0;
        return feet * 12 + inches;
      };
      
      const heightA = getHeightInInches(a);
      const heightB = getHeightInInches(b);
      
      if (order === 'ascend') {
        return heightA - heightB;
      } else {
        return heightB - heightA;
      }
    });
  };


  // Handle table sorting
  const handleTableChange: TableProps<AthleteData>['onChange'] = (pagination, filters, sorter) => {
    
    // Handle sorting
    if (Array.isArray(sorter)) {
      // Multiple sorters (not used in this case)
      const firstSorter = sorter[0];
      if (firstSorter) {
        setSortField(firstSorter.field as string);
        setSortOrder(firstSorter.order as 'ascend' | 'descend' | null);
      } else {
        // If no sorter provided, use default based on data source
        if (dataSource === 'hs_athletes') {
          setSortField('last_name');
          setSortOrder('ascend');
        } else {
          setSortField('date');
          setSortOrder('descend');
        }
      }
    } else {
      // Single sorter
      if (sorter && sorter.field) {
        const fieldName = sorter.field as string;
        
        // Height sorting is now handled in SQL, so we can use the normal field name
        setSortField(fieldName);
        setSortOrder(sorter.order as 'ascend' | 'descend' | null);
      } else {
        // If no sorter provided, use default based on data source
        if (dataSource === 'hs_athletes') {
          setSortField('last_name');
          setSortOrder('ascend');
        } else {
          setSortField('date');
          setSortOrder('descend');
        }
      }
    }
  };



  return (
    <div className="w-full h-full" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div 
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          paddingBottom: zoom > 100 ? '2rem' : '0',
          paddingRight: zoom > 100 ? '5%' : '0',
          width: zoom < 100 ? `${100 / (zoom / 100)}%` : '100%',
          height: zoom < 100 ? `${100 / (zoom / 100)}%` : '100%',
          minHeight: zoom > 100 ? `${zoom}vh` : '100%',
          marginBottom: zoom > 100 ? '4rem' : '0',
          overflow: 'visible',
          flex: '1 1 auto'
        }}
      >
        <Flex style={boxStyle}>
          <Flex style={headerBox} justify="space-between" align="center">
      
              <Typography.Text type="secondary" style={{fontSize: 14 }}>
                Showing {filteredRecords} of {totalRecords} records
                {isAnyFilterActive && ` (filtered)`}
              </Typography.Text>
            <Space>
              <div className="selectbox-ui" style={{ display: "flex", alignItems: "center" }}>
                {isAnyFilterActive && dataSource === 'transfer_portal' && (
                  <AddAlert
                    trigger={
                      <Button
                        type="primary"
                        size="large"
                        className="alert-gradient-btn"
                        style={{
                          marginRight: 5,
                          fontWeight: 500,
                          background: "linear-gradient(90deg, #6affab 0%, #c8ff24 111.68%)",
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
                <Filters 
                  onApplyFilters={applyFilters} 
                  onResetFilters={resetFilters} 
                  dynamicColumns={dynamicColumns}
                  filterColumns={filterColumns}
                  dataSource={dataSource}
                />
              </div>
                  
              {/* <div className="selectbox-ui">
                <TableView />
              </div> */}
            </Space>
          </Flex>
          <div className="mb-3 search-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Space>
              <Input.Search
                style={{ width: 300 }}
                placeholder="Search here..."
                allowClear
                value={localSearchInput}
                onChange={(e) => handleSearch(e.target.value)}
                onSearch={handleSearch}
              />
              {dataSource !== 'high_schools' && (
                <div style={{ position: 'relative' }}>
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
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 1000 }}>
                      <ChooseBoardDropdownWithStatus
                        isVisible={isBoardModalVisible}
                        onClose={() => setIsBoardModalVisible(false)}
                        onSelect={(boardId, boardName) => {
                          handleBoardSelected(boardId, boardName);
                          setIsBoardModalVisible(false);
                          // Automatically add after selection, passing board info directly
                          handleAddToRecruitingBoard(boardId, boardName);
                        }}
                        customerId={activeCustomerId || ''}
                        athleteIds={selectedAthletes.map(a => a.id)}
                        placement="bottomRight"
                        simpleMode={true}
                      />
                    </div>
                  )}
                </div>
              )}
              {dataSource === 'high_schools' && (
                <Button 
                  onClick={handlePrintHighSchools} 
                  type="primary"
                  loading={isPrintingHighSchools}
                  disabled={selectedHighSchools.length === 0}
                  icon={<i className="icon-printer"></i>}
                >
                  Print School Packets ({selectedHighSchools.length})
                </Button>
              )}
            </Space>
            {seasonData && dataSource !== 'hs_athletes' && (
              <div style={{ 
                fontSize: '12px',
                fontStyle: 'italic',
                color: '#666'
              }}>
                Stats on Display from the {seasonData} season
              </div>
            )}
          </div>
          {isMaintenanceMode && (
            <Alert
              message={
                <div>
                  <strong>System Update in Progress</strong>
                  <br />
                  We are currently making improvements to our data system. 
                  The page will automatically refresh in {Math.floor(maintenanceTimer / 60)}:{(maintenanceTimer % 60).toString().padStart(2, '0')}.
                  <br />
                  <Progress 
                    percent={Math.round((maintenanceTimer / 120) * 100)} 
                    status="active" 
                    size="small"
                    style={{ marginTop: '8px' }}
                  />
                </div>
              }
              type="error"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
          {dataSource === 'transfer_portal' && 
           extensionInactive && 
           activeSportAbbrev && 
           (() => {
             const userPackageNumbers = (userDetails?.packages || []).map(Number);
             const sportPackages = getUserPackagesForSport(activeSportAbbrev, userPackageNumbers);
             const hasNaiaPackage = sportPackages.some(pkg => pkg.is_naia);
             return !hasNaiaPackage;
           })() && (
            <Alert
              message={<>
                The extension hasn&apos;t been run in over 30 minutes - {' '}
                <a 
                  href="https://docs.google.com/document/d/1B4OmmZXafm3JNwZvOoqel0ekB1tHCSYfj_5owlWRGHs/edit?tab=t.0#heading=h.1qe0m1s9sb5l"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Please click here to run it and stay up to date
                </a>
              </>}
              type="warning"
              showIcon
              style={{ marginBottom: '16px' }}
            />
          )}
          <div style={{ 
            flex: '1 1 auto', 
            overflow: 'hidden', 
            minHeight: 0, 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 180px)' // Ensure container doesn't exceed viewport
          }}>
            <Table<any>
              key={tableKey}
              rowKey="id"
              rowSelection={dataSource === 'high_schools' ? { type: 'checkbox', ...highSchoolRowSelection } : { type: selectionType, ...rowSelection }}
              columns={columns}
              dataSource={displayedData}
              loading={loading || isLoadingRecruitingBoard}
              pagination={false}
              bordered
              style={{ 
                width: "100%", 
                height: "100%",
                flex: '1 1 auto'
              }}
              scroll={{ 
                x: "max-content", 
                y: extensionInactive ? "calc(100vh - 330px)" : "calc(100vh - 280px)" // Adjust height when alert is shown
              }}
              onChange={handleTableChange}
              onRow={(record) => {
                const isOnBoard = recruitingBoardAthletes.includes(record.id);
                return {
                  style: isOnBoard ? {
                    backgroundColor: '#d4edda',
                  } : {},
                };
              }}
            />
          </div>
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
                {editingComment ? 'Update' : 'Save'}
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
                    backgroundColor: athleteCommentCounts[selectedPlyer?.id ?? ""] > 0 ? "#4CAF50" : "#F5F5F5",
                    color: athleteCommentCounts[selectedPlyer?.id ?? ""] > 0 ? "#fff" : "#000"
                  }}
                >
                  <Typography.Text strong>
                    {comment.user_detail?.name_first} {comment.user_detail?.name_last}
                  </Typography.Text>
                </div>
                <Typography.Paragraph className="flex-1">{comment.content}</Typography.Paragraph>
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
        styles={{ 
          body: {
            padding: 0,
            height: 'calc(100vh - 100px)',
            overflow: 'hidden'
          }
        }}
        destroyOnHidden={true}
        closable={true}
        maskClosable={true}
      >
        {selectedPlayerId ? (
          <div style={{ height: '100%', overflow: 'auto' }}>
            {searchParams?.get('dataSource') === 'hs_athletes' ? (
              // Use HS-specific profile content when browsing HS athletes
              searchParams?.get('use_main_tp_page_id') === 'true' ? (
                <HSAthleteProfileContent
                  mainTpPageId={selectedPlayerId}
                  onAddToBoard={handleModalAddToRecruitingBoard}
                  isInModal={true}
                  dataSource={'hs_athletes'}
                />
              ) : (
                <HSAthleteProfileContent
                  athleteId={selectedPlayerId}
                  onAddToBoard={handleModalAddToRecruitingBoard}
                  isInModal={true}
                  dataSource={'hs_athletes'}
                />
              )
            ) : (
              searchParams?.get('use_main_tp_page_id') === 'true' ? (
                <AthleteProfileContent
                  mainTpPageId={selectedPlayerId}
                  onAddToBoard={handleModalAddToRecruitingBoard}
                  isInModal={true}
                  dataSource={searchParams?.get('dataSource') as 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null}
                />
              ) : (
                <AthleteProfileContent
                  athleteId={selectedPlayerId}
                  onAddToBoard={handleModalAddToRecruitingBoard}
                  isInModal={true}
                  dataSource={searchParams?.get('dataSource') as 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null}
                />
              )
            )}
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh' 
          }}>
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
      >
        <button className="close" onClick={handleCloseSchoolModal}></button>
        {selectedSchoolId ? (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <SchoolProfileContent 
              schoolId={selectedSchoolId} 
              isInModal={true}
              dataSource={searchParams?.get('dataSource') || undefined}
            />
          </div>
        ) : (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh' 
          }}>
            <div>School not found</div>
          </div>
        )}
      </Modal>

    </div>
  );
}
