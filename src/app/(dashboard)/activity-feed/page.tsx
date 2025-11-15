"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Table, Typography, Space, Input, message, Tooltip, Modal } from "antd";
import { SearchOutlined, ExportOutlined, FilterOutlined } from "@ant-design/icons";
import { ActivityFeedFilters } from "./_components/ActivityFeedFilters";
import type { ActivityEvent, ActivityFeedFilterState } from "./types";
import { fetchActivityFeedEvents } from "../../../lib/activityFeedService";
import { fetchUserDetails, fetchUsersForCustomer } from "../../../utils/utils";
import { mapActivityFeedFilters } from "../_components/filters/GenericFilterConfig";
import { useRouter, useSearchParams } from "next/navigation";
import HSAthleteProfileContent from "../_components/HSAthleteProfileContent";
import AthleteProfileContent from "../_components/AthleteProfileContent";
import AlertModal from "../_components/AlertModal";
import CSVExport from "../_components/CSVExport";
import { convertActivityFeedFilterToFilterString } from "../../../utils/activityFeedFilterConverter";

const { Paragraph } = Typography;


export default function ActivityFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [searchText, setSearchText] = useState("");
  const [savedFilters, setSavedFilters] = useState<ActivityFeedFilterState[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<any>(null);
  const currentFiltersRef = useRef(currentFilters);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modal state for player profile
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);
  const [selectedDataSource, setSelectedDataSource] = useState<'transfer_portal' | 'hs_athletes' | null>(null);

  // Alert modal state
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<Array<{ id: string; name_first: string; name_last: string }>>([]);
  const [alertLoading, setAlertLoading] = useState(false);

  // Keep ref in sync with state
  useEffect(() => {
    currentFiltersRef.current = currentFilters;
  }, [currentFilters]);

  // Handle URL player parameter
  useEffect(() => {
    const playerId = searchParams?.get('player');
    const dataSource = searchParams?.get('dataSource') as 'transfer_portal' | 'hs_athletes' | null;
    
    if (playerId && playerId !== selectedPlayerId) {
      setSelectedPlayerId(playerId);
      setSelectedDataSource(dataSource || 'hs_athletes');
      setIsPlayerModalVisible(true);
    } else if (!playerId && isPlayerModalVisible) {
      setIsPlayerModalVisible(false);
      setSelectedPlayerId(null);
      setSelectedDataSource(null);
    }
  }, [searchParams, selectedPlayerId, isPlayerModalVisible]);

  // Handle modal close
  const handleClosePlayerModal = () => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.delete('player');
    params.delete('dataSource');
    params.delete('use_main_tp_page_id');
    const newUrl = params.toString() ? `/activity-feed?${params.toString()}` : '/activity-feed';
    router.push(newUrl);
  };

  // Load initial data and customer information
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userDetailsData = await fetchUserDetails();
        setUserDetails(userDetailsData);
        
        if (userDetailsData?.customer_id) {
          setCustomerId(userDetailsData.customer_id);
          const result = await fetchActivityFeedEvents(userDetailsData.customer_id, searchText);
          setEvents(result.data);
          setHasMore(result.hasMore);
          setTotalCount(result.totalCount);
          setCurrentPage(1);
          
          // Check if user has no access (empty array could mean no access or no data)
          if (result.data.length === 0) {
            // We'll show a message in the UI instead of an error
            console.log('No activity feed access or no data available');
          }
        } else {
          message.error('No customer found. Please contact support.');
        }
      } catch (error) {
        console.error('Error loading activity feed data:', error);
        message.error('Failed to load activity feed data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Search effect - triggers database query when search text changes
  useEffect(() => {
    if (!customerId) return;
    
    // Don't search if searchText is empty and no filters are applied
    if (!searchText && !currentFiltersRef.current) return;
    
    // console.log('Search effect triggered:', { searchText, currentFilters });
    
    const performSearch = async () => {
      try {
        setLoading(true);
        // Clear events immediately when starting a new search/filter change
        setEvents([]);
        setCurrentPage(1);
        setHasMore(true);
        
        // Map filters if they exist
        let filterParams = undefined;
        if (currentFiltersRef.current) {
          filterParams = mapActivityFeedFilters({
            eventType: currentFiltersRef.current.eventParameters?.eventType,
            eventDate: currentFiltersRef.current.eventParameters?.eventDate ? {
              startDate: currentFiltersRef.current.eventParameters.eventDate[0],
              endDate: currentFiltersRef.current.eventParameters.eventDate[1]
            } : undefined,
            grad_year: currentFiltersRef.current.athleteInfo?.graduationYear,
            position: currentFiltersRef.current.athleteInfo?.position,
            height: currentFiltersRef.current.athleteInfo?.height,
            weight: currentFiltersRef.current.athleteInfo?.weight,
            athletic_projection: currentFiltersRef.current.athleteInfo?.athleticProjection,
            athleteLocation: currentFiltersRef.current.athleteInfo?.athleteLocation,
            location: currentFiltersRef.current.schoolInfo?.location?.[0],
            conference: currentFiltersRef.current.schoolInfo?.conference,
            level: currentFiltersRef.current.schoolInfo?.level,
            school: currentFiltersRef.current.schoolInfo?.school,
          });
        }
        
        const result = await fetchActivityFeedEvents(
          customerId, 
          searchText, 
          filterParams,
          1, // Reset to page 1 on search
          25
        );
        setEvents(result.data);
        setHasMore(result.hasMore);
        setTotalCount(result.totalCount);
        setCurrentPage(1);
      } catch (error) {
        console.error('Error searching events:', error);
        message.error('Failed to search events');
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(performSearch, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchText, customerId, currentFilters]);


  // Load more events for infinite scroll
  const loadMoreEvents = useCallback(async () => {
    if (!customerId || loadingMore || !hasMore) return;
    
    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;
      
      // Map filters if they exist
      let filterParams = undefined;
      if (currentFiltersRef.current) {
        filterParams = mapActivityFeedFilters({
          eventType: currentFiltersRef.current.eventParameters?.eventType,
          eventDate: currentFiltersRef.current.eventParameters?.eventDate ? {
            startDate: currentFiltersRef.current.eventParameters.eventDate[0],
            endDate: currentFiltersRef.current.eventParameters.eventDate[1]
          } : undefined,
          grad_year: currentFiltersRef.current.athleteInfo?.graduationYear,
          position: currentFiltersRef.current.athleteInfo?.position,
          height: currentFiltersRef.current.athleteInfo?.height,
          weight: currentFiltersRef.current.athleteInfo?.weight,
          athletic_projection: currentFiltersRef.current.athleteInfo?.athleticProjection,
          athleteLocation: currentFiltersRef.current.athleteInfo?.athleteLocation,
          location: currentFiltersRef.current.schoolInfo?.location?.[0],
          conference: currentFiltersRef.current.schoolInfo?.conference,
          level: currentFiltersRef.current.schoolInfo?.level,
          school: currentFiltersRef.current.schoolInfo?.school,
        });
      }
      
      const result = await fetchActivityFeedEvents(
        customerId,
        searchText,
        filterParams,
        nextPage,
        25
      );
      
      setEvents(prevEvents => [...prevEvents, ...result.data]);
      setHasMore(result.hasMore);
      setCurrentPage(nextPage);
    } catch (error) {
      console.error('Error loading more events:', error);
      message.error('Failed to load more events');
    } finally {
      setLoadingMore(false);
    }
  }, [customerId, loadingMore, hasMore, currentPage, searchText]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) {
        return;
      }

      const tableContainer = document.querySelector('.ant-table-body');
      
      if (!tableContainer) {
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = tableContainer;
      
      if (scrollHeight - scrollTop - clientHeight < 100) {
        loadMoreEvents();
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
  }, [loadingMore, hasMore, loadMoreEvents]);

  // Apply filters from the filter drawer
  const handleApplyFilters = async (filters: ActivityFeedFilterState) => {
    if (!customerId) return;
    
    // console.log('Applying filters:', filters);
    
    try {
      // Clear events immediately and reset pagination when filters are applied
      setEvents([]);
      setCurrentPage(1);
      setHasMore(true);
      setCurrentFilters(filters);
      setFilterDrawerVisible(false);
      message.success('Filters applied successfully');
    } catch (error) {
      console.error('Error applying filters:', error);
      message.error('Failed to apply filters');
    }
  };

  // Clear all filters
  const handleClearFilters = async () => {
    if (!customerId) return;
    
    try {
      setLoading(true);
      setCurrentFilters(null);
      
      const result = await fetchActivityFeedEvents(customerId, searchText, undefined, 1, 25);
      setEvents(result.data);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setCurrentPage(1);
      message.success('Filters cleared successfully');
    } catch (error) {
      console.error('Error clearing filters:', error);
      message.error('Failed to clear filters');
    } finally {
      setLoading(false);
    }
  };

  // Check if any filters are actually applied
  const hasActiveFilters = (filters: ActivityFeedFilterState | null): boolean => {
    if (!filters) return false;
    
    // Check event parameters
    if (filters.eventParameters?.eventType && filters.eventParameters.eventType.length > 0) return true;
    if (filters.eventParameters?.eventDate && filters.eventParameters.eventDate.length > 0) return true;
    
    // Check school info
    if (filters.schoolInfo?.location && filters.schoolInfo.location.length > 0) return true;
    if (filters.schoolInfo?.conference && filters.schoolInfo.conference.length > 0) return true;
    if (filters.schoolInfo?.level && filters.schoolInfo.level.length > 0) return true;
    if (filters.schoolInfo?.school && filters.schoolInfo.school.length > 0) return true;
    
    // Check athlete info
    if (filters.athleteInfo?.graduationYear && filters.athleteInfo.graduationYear.length > 0) return true;
    if (filters.athleteInfo?.graduationLocation && filters.athleteInfo.graduationLocation.length > 0) return true;
    if (filters.athleteInfo?.position && filters.athleteInfo.position.length > 0) return true;
    if (filters.athleteInfo?.athleticProjection && filters.athleteInfo.athleticProjection.length > 0) return true;
    
    // Check height
    if (filters.athleteInfo?.height) {
      const { comparison, value, minValue, maxValue } = filters.athleteInfo.height;
      if (comparison && (value !== undefined || minValue !== undefined || maxValue !== undefined)) return true;
    }
    
    // Check weight
    if (filters.athleteInfo?.weight) {
      const { comparison, value, minValue, maxValue } = filters.athleteInfo.weight;
      if (comparison && (value !== undefined || minValue !== undefined || maxValue !== undefined)) return true;
    }
    
    // Check athlete location
    if (filters.athleteInfo?.athleteLocation) {
      const { type, values, radius, recruitingArea } = filters.athleteInfo.athleteLocation;
      if (type && ((values && values.length > 0) || radius || recruitingArea)) return true;
    }
    
    return false;
  };

  // Handle creating offer alert from current filter
  const handleCreateOfferAlert = async () => {
    if (!currentFilters || !hasActiveFilters(currentFilters)) {
      message.warning("Please apply filters first before creating an alert");
      return;
    }

    if (!customerId) {
      message.error("No customer found");
      return;
    }

    setAlertLoading(true);
    try {
      // Fetch team users
      const users = await fetchUsersForCustomer(customerId);
      setTeamUsers(users);
      
      // Open the alert modal
      setIsAlertModalOpen(true);
    } catch (error) {
      console.error('Error preparing offer alert:', error);
      message.error('Failed to prepare offer alert');
    } finally {
      setAlertLoading(false);
    }
  };

  // Handle saving the offer alert
  const handleAlertSave = () => {
    setIsAlertModalOpen(false);
    message.success("Offer alert created successfully");
  };

  // Helper function to parse height from formatted string (e.g., "6'2\"" -> "6'2\"")
  const parseHeight = (heightStr: string): string => {
    if (!heightStr || heightStr.trim() === '') return '';
    return heightStr.trim();
  };

  // Helper function to parse weight from formatted string (e.g., "200lbs" -> "200")
  const parseWeight = (weightStr: string): string => {
    if (!weightStr || weightStr.trim() === '') return '';
    const match = weightStr.trim().match(/^(\d+)/);
    return match ? match[1] : '';
  };

  // Fetch data function for CSV export
  const fetchExportData = async (page: number, pageSize: number) => {
    if (!customerId) {
      throw new Error('No customer found');
    }

    // Map filters if they exist
    let filterParams = undefined;
    if (currentFiltersRef.current) {
      filterParams = mapActivityFeedFilters({
        eventType: currentFiltersRef.current.eventParameters?.eventType,
        eventDate: currentFiltersRef.current.eventParameters?.eventDate ? {
          startDate: currentFiltersRef.current.eventParameters.eventDate[0],
          endDate: currentFiltersRef.current.eventParameters.eventDate[1]
        } : undefined,
        grad_year: currentFiltersRef.current.athleteInfo?.graduationYear,
        position: currentFiltersRef.current.athleteInfo?.position,
        height: currentFiltersRef.current.athleteInfo?.height,
        weight: currentFiltersRef.current.athleteInfo?.weight,
        athletic_projection: currentFiltersRef.current.athleteInfo?.athleticProjection,
        athleteLocation: currentFiltersRef.current.athleteInfo?.athleteLocation,
        location: currentFiltersRef.current.schoolInfo?.location?.[0],
        conference: currentFiltersRef.current.schoolInfo?.conference,
        level: currentFiltersRef.current.schoolInfo?.level,
        school: currentFiltersRef.current.schoolInfo?.school,
      });
    }

    return await fetchActivityFeedEvents(
      customerId,
      searchText,
      filterParams,
      page,
      pageSize
    );
  };

  // Transform row function for CSV export
  const transformExportRow = (event: ActivityEvent) => {
    const height = parseHeight(event.athlete?.height || '');
    const weight = parseWeight(event.athlete?.weight || '');
    
    return [
      event.athlete?.name || '',
      height,
      weight,
      event.highSchool?.name || '',
      event.highSchool?.location || '',
      event.graduation || '',
      event.college?.name || '',
      event.eventDate || '',
      event.type || '',
      event.source || '',
      event.offerCounts?.totalOffers || 0,
      event.offerCounts?.p4 || 0,
      event.offerCounts?.g5 || 0,
      event.offerCounts?.fcs || 0,
      event.offerCounts?.d2Naia || 0,
      event.offerCounts?.d3 || 0
    ];
  };

  // Handle row click to open athlete profile
  const handleRowClick = (record: ActivityEvent) => {
    if (!record.athleteId) {
      message.warning('Athlete ID not available');
      return;
    }

    // Determine dataSource based on school type
    const dataSource = record.highSchool?.schoolType === "University/College" 
      ? 'transfer_portal' 
      : 'hs_athletes';

    // Update URL params to open modal without navigating away
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('player', record.athleteId);
    params.set('dataSource', dataSource);
    
    // Stay on activity-feed route and just update query params
    router.push(`/activity-feed?${params.toString()}`);
  };

  // Table columns
  const columns = [
    {
      title: "Athlete",
      dataIndex: "athlete",
      key: "athlete",
      render: (athlete: ActivityEvent['athlete'], record: ActivityEvent) => (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src={athlete.image} 
            alt={athlete.name}
            style={{ width: 40, height: 40, borderRadius: "50%" }}
          />
          <div>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowClick(record);
                }}
                style={{ 
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                {athlete.name}
              </span>
              {record.highSchool?.schoolType === "University/College" && (
                <span style={{ 
                  color: "rgb(223, 130, 47)", 
                  fontSize: "10px", 
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}>
                  TRANSFER
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {athlete.position} | {athlete.height} | {athlete.weight}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Current School",
      dataIndex: "highSchool",
      key: "highSchool",
      render: (school: ActivityEvent['highSchool']) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {school.name?.replace(/\s*\([^)]*\)$/, '') || school.name}
          </div>
          {school.location && (
            <div style={{ fontSize: 12, color: "#666" }}>{school.location}</div>
          )}
        </div>
      ),
    },
    {
      title: "Grad Year",
      dataIndex: "graduation",
      key: "graduation",
    },
    {
      title: "Recruiting College",
      dataIndex: "college",
      key: "college",
      render: (college: ActivityEvent['college']) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img 
            src={college.logo} 
            alt={college.name}
            style={{ 
              width: 24, 
              height: 24, 
              objectFit: 'contain',
              borderRadius: "50%"
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span>{college.name}</span>
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "eventDate",
      key: "eventDate",
      render: (date: string) => {
        if (!date) return '';
        const eventDate = new Date(date);
        const month = (eventDate.getMonth() + 1).toString().padStart(2, '0');
        const day = eventDate.getDate().toString().padStart(2, '0');
        const year = eventDate.getFullYear().toString().slice(-2);
        return `${month}/${day}/${year}`;
      },
    },
    {
      title: "Activity",
      dataIndex: "type",
      key: "type",
      render: (type: string, record: ActivityEvent) => {
        // Format type for display
        const formatType = (type: string) => {
          const typeStr = type.toLowerCase();
          const typeMap: Record<string, string> = {
            'offer': 'Offer',
            'commit': 'Commit',
            'decommit': 'De-Commit',
            'de-commit': 'De-Commit',
            'de_commit': 'De-Commit',
            'visit': 'Visit',
            'official_visit': 'Official Visit',
            'unofficial_visit': 'Unofficial Visit',
            'camp': 'Camp',
            'coach note': 'Coach Note',
            'coach call': 'Coach Call',
            'coach message': 'Coach Message',
            'coach multiple visit': 'Coach Multiple Visit',
            'coach visit': 'Coach Visit',
          };
          
          return typeMap[typeStr] || type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        };

        // Get icon for the activity type
        const getTypeIcon = (type: string) => {
          const typeStr = type.toLowerCase();
          const iconMap: Record<string, { icon: string; color: string }> = {
            'offer': { icon: 'icon-check-2', color: '#52c41a' },
            'commit': { icon: 'icon-check', color: '#52c41a' },
            'decommit': { icon: 'icon-ban', color: '#ff4d4f' },
            'de-commit': { icon: 'icon-ban', color: '#ff4d4f' },
            'de_commit': { icon: 'icon-ban', color: '#ff4d4f' },
            'official_visit': { icon: 'icon-check-2', color: '#52c41a' },
            'unofficial_visit': { icon: 'icon-location', color: '#8c8c8c' },
            'visit': { icon: 'icon-location', color: '#8c8c8c' },
            'camp': { icon: 'icon-tent', color: '#8c8c8c' },
            'coach note': { icon: 'icon-file', color: '#1890ff' },
            'coach call': { icon: 'icon-call', color: '#1890ff' },
            'coach message': { icon: 'icon-message', color: '#1890ff' },
            'coach multiple visit': { icon: 'icon-location', color: '#8c8c8c' },
            'coach visit': { icon: 'icon-location', color: '#8c8c8c' },
          };
          
          return iconMap[typeStr] || null;
        };

        const formattedType = formatType(type);
        const typeIcon = getTypeIcon(type);
        const recordIcon = record.typeIcon;

        return (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{formattedType}</span>
            {/* Use typeIcon from record if available, otherwise use computed icon */}
            {recordIcon === "checkmark" && (
              <i className="icon-check-2" style={{ color: "#52c41a", fontSize: "16px" }}></i>
            )}
            {recordIcon === "solid-check" && (
              <i className="icon-check" style={{ color: "#52c41a", fontSize: "16px", fontWeight: "bold" }}></i>
            )}
            {recordIcon === "cross" && (
              <i className="icon-ban" style={{ color: "#ff4d4f", fontSize: "16px" }}></i>
            )}
            {recordIcon === "visit" && (
              <i className="icon-location" style={{ color: "#8c8c8c", fontSize: "16px" }}></i>
            )}
            {recordIcon === "camp" && (
              <i className="icon-tent" style={{ color: "#8c8c8c", fontSize: "16px" }}></i>
            )}
            {/* Fallback to computed icon if record.typeIcon is not set */}
            {!recordIcon && typeIcon && (
              <i className={typeIcon.icon} style={{ color: typeIcon.color, fontSize: "16px" }}></i>
            )}
          </div>
        );
      },
    },
    {
      title: "Source",
      dataIndex: "source",
      key: "source",
      render: (source: string) => {
        if (!source) return <span style={{ fontSize: 12, color: "#d9d9d9" }}>Unknown</span>;
        
        const sourceLower = source.toLowerCase();
        
        if (sourceLower.includes('247sports.com')) {
          const href = source.startsWith('http') ? source : `https://${source}`;
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: 12, 
                color: "#1890ff",
                textDecoration: "none"
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              247
            </a>
          );
        }
        
        if (sourceLower.includes('on3.com')) {
          const href = source.startsWith('http') ? source : `https://${source}`;
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: 12, 
                color: "#1890ff",
                textDecoration: "none"
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              ON3
            </a>
          );
        }
        
        if (sourceLower.includes('twitter.com') || sourceLower.includes('x.com/')) {
          const href = source.startsWith('http') ? source : `https://${source}`;
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: 12, 
                color: "#1890ff",
                textDecoration: "none"
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              Twitter
            </a>
          );
        }
        
        if (sourceLower.includes('rivals.com')) {
          const href = source.startsWith('http') ? source : `https://${source}`;
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: 12, 
                color: "#1890ff",
                textDecoration: "none"
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              Rivals
            </a>
          );
        }
        
        if (sourceLower.includes('espn.com')) {
          const href = source.startsWith('http') ? source : `https://${source}`;
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                fontSize: 12, 
                color: "#1890ff",
                textDecoration: "none"
              }}
              onClick={(e) => e.stopPropagation()}
              onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              ESPN
            </a>
          );
        }
        
        // Handle "tp" source as "Matriculated"
        if (sourceLower === 'tp') {
          return (
            <span style={{ 
              fontSize: 12, 
              color: "#666",
              fontWeight: 500
            }}>
              Matriculated
            </span>
          );
        }
        
        return (
          <span style={{ 
            fontSize: 12, 
            color: "#666",
            textTransform: "capitalize"
          }}>
            {source}
          </span>
        );
      },
    },
    {
      title: "Tot Off",
      dataIndex: "offerCounts",
      key: "totalOffers",
      render: (offerCounts: ActivityEvent['offerCounts']) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>
          {offerCounts.totalOffers}
        </span>
      ),
    },
    {
      title: "P4",
      dataIndex: "offerCounts",
      key: "p4",
      render: (offerCounts: ActivityEvent['offerCounts']) => (
        <span style={{ color: offerCounts.p4 > 0 ? "#52c41a" : "#d9d9d9" }}>
          {offerCounts.p4}
        </span>
      ),
    },
    {
      title: "G5",
      dataIndex: "offerCounts",
      key: "g5",
      render: (offerCounts: ActivityEvent['offerCounts']) => (
        <span style={{ color: offerCounts.g5 > 0 ? "#52c41a" : "#d9d9d9" }}>
          {offerCounts.g5}
        </span>
      ),
    },
    {
      title: "FCS",
      dataIndex: "offerCounts",
      key: "fcs",
      render: (offerCounts: ActivityEvent['offerCounts']) => (
        <span style={{ color: offerCounts.fcs > 0 ? "#52c41a" : "#d9d9d9" }}>
          {offerCounts.fcs}
        </span>
      ),
    },
    {
      title: (
        <div style={{ fontSize: '11px', lineHeight: '1.2', textAlign: 'center' }}>
          <div>D2 &</div>
          <div>NAIA</div>
        </div>
      ),
      dataIndex: "offerCounts",
      key: "d2Naia",
      render: (offerCounts: ActivityEvent['offerCounts']) => (
        <span style={{ color: offerCounts.d2Naia > 0 ? "#52c41a" : "#d9d9d9" }}>
          {offerCounts.d2Naia}
        </span>
      ),
    },
    {
      title: "D3",
      dataIndex: "offerCounts",
      key: "d3",
      render: (offerCounts: ActivityEvent['offerCounts']) => (
        <span style={{ color: offerCounts.d3 > 0 ? "#52c41a" : "#d9d9d9" }}>
          {offerCounts.d3}
        </span>
      ),
    },
  ];

  return (
    <div style={{ padding: "20px" }}>
      {/* Header Section */}
      <div style={{ marginBottom: "24px", textAlign: "left" }}>
        <Paragraph style={{ marginBottom: "12px", fontSize: 14, color: "#666" }}>
          {loading ? 'Loading...' : 
           events.length === 0 ? 'No activity feed access with your current package' : 
           `Showing ${events.length} of ${totalCount} records`}
        </Paragraph>
        
        <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "24px" }}>
          <Input
            placeholder="Search here..."
            prefix={<SearchOutlined />}
            style={{ maxWidth: "400px" }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div style={{ marginLeft: "auto", display: "flex", gap: "12px" }}>
            {currentFilters && hasActiveFilters(currentFilters) && (
              <Button
                type="primary"
                size="large"
                className="alert-gradient-btn"
                onClick={handleCreateOfferAlert}
                loading={alertLoading}
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
                <img src="/bell.svg"></img> Set Up Offer Alert
              </Button>
            )}
            <CSVExport<ActivityEvent>
              fetchData={fetchExportData}
              transformRow={transformExportRow}
              headers={['Name', 'Height', 'Weight', 'High School', 'Location', 'Grad Year', 'Recruiting College', 'Date', 'Type', 'Source', 'Tot Off', 'P4', 'G5', 'FCS', 'D2/NAIA', 'D3']}
              filename="activity_feed"
              maxRows={500}
              disabled={!customerId}
              userId={userDetails?.id}
              customerId={customerId || undefined}
              tableName="activity-feed"
              filterDetails={currentFiltersRef.current}
            />
            <ActivityFeedFilters
              visible={filterDrawerVisible}
              onClose={() => setFilterDrawerVisible(false)}
              onApply={handleApplyFilters}
              savedFilters={savedFilters}
              onSaveFilter={(filter) => {
                setSavedFilters([...savedFilters, filter]);
              }}
            />
          </div>
        </div>
      </div>

      {/* Timeline of Events Table */}
      <div>
        <Table
          dataSource={events}
          columns={columns}
          loading={loading}
          pagination={false}
          scroll={{ 
            x: "max-content", 
            y: "calc(100vh - 300px)" 
          }}
          rowClassName={(record, index) => 
            index % 2 === 0 ? "activity-feed-row-even" : "activity-feed-row-odd"
          }
        />
        
        {/* Loading indicator for infinite scroll */}
        {loadingMore && (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
            Loading more events...
          </div>
        )}
        
        {/* No more data message */}
        {!hasMore && events.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#666' }}>
            No more records to load
          </div>
        )}
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
            {selectedDataSource === 'hs_athletes' ? (
              <HSAthleteProfileContent
                athleteId={selectedPlayerId}
                onAddToBoard={() => {}}
                isInModal={true}
                dataSource={'hs_athletes'}
                onClose={handleClosePlayerModal}
              />
            ) : (
              <AthleteProfileContent
                athleteId={selectedPlayerId}
                onAddToBoard={() => {}}
                isInModal={true}
                dataSource={selectedDataSource || 'transfer_portal'}
              />
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

      {/* Offer Alert Modal */}
      <AlertModal
        open={isAlertModalOpen}
        onCancel={() => setIsAlertModalOpen(false)}
        onSave={handleAlertSave}
        initialValues={{
          filter: currentFilters ? convertActivityFeedFilterToFilterString(currentFilters) : "",
        }}
        teamUsers={teamUsers}
        loading={alertLoading}
        mode="add"
        alertType="offer_alert"
      />

    </div>
  );
}

