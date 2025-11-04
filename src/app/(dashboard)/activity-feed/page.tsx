"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Table, Typography, Space, Input, message, Tooltip } from "antd";
import { SearchOutlined, ExportOutlined, FilterOutlined } from "@ant-design/icons";
import { ActivityFeedFilters } from "./_components/ActivityFeedFilters";
import type { ActivityEvent, ActivityFeedFilterState } from "./types";
import { fetchActivityFeedEvents } from "../../../lib/activityFeedService";
import { fetchUserDetails } from "../../../utils/utils";
import { mapActivityFeedFilters } from "../_components/filters/GenericFilterConfig";
import { useRouter, useSearchParams } from "next/navigation";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Keep ref in sync with state
  useEffect(() => {
    currentFiltersRef.current = currentFilters;
  }, [currentFilters]);

  // Load initial data and customer information
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const userDetails = await fetchUserDetails();
        
        if (userDetails?.customer_id) {
          setCustomerId(userDetails.customer_id);
          const result = await fetchActivityFeedEvents(userDetails.customer_id, searchText);
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

  // Export current filtered events to CSV
  const handleExport = () => {
    try {
      if (events.length === 0) {
        message.warning('No data to export');
        return;
      }

      // Convert events to CSV format
      const headers = ['Athlete Name', 'Height', 'Weight', 'High School', 'Location', 'Grad Year', 'Recruiting College', 'Event Date', 'Event Type', 'Source', 'Tot Off', 'P4', 'G5', 'FCS', 'D2/NAIA', 'D3'];
      const csvData = events.map(event => [
        event.athlete.name,
        event.athlete.height,
        event.athlete.weight,
        event.highSchool.name,
        event.highSchool.location,
        event.graduation,
        event.college.name,
        event.eventDate,
        event.type,
        event.source,
        event.offerCounts.totalOffers,
        event.offerCounts.p4,
        event.offerCounts.g5,
        event.offerCounts.fcs,
        event.offerCounts.d2Naia,
        event.offerCounts.d3
      ]);

      // Create CSV content
      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_feed_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      message.error('Failed to export data');
    }
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

    // Navigate to the appropriate route with the athlete ID and dataSource
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('player', record.athleteId);
    params.set('dataSource', dataSource);
    
    // Route based on dataSource
    const baseRoute = dataSource === 'transfer_portal' ? '/transfers' : '/hs-athlete';
    router.push(`${baseRoute}?${params.toString()}`);
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
      render: (type: string, record: ActivityEvent) => (
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span>{type.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}</span>
          {record.typeIcon === "checkmark" && (
            <i className="icon-check-2" style={{ color: "#52c41a", fontSize: "16px" }}></i>
          )}
          {record.typeIcon === "solid-check" && (
            <i className="icon-check" style={{ color: "#52c41a", fontSize: "16px", fontWeight: "bold" }}></i>
          )}
          {record.typeIcon === "cross" && (
            <i className="icon-ban" style={{ color: "#ff4d4f", fontSize: "16px" }}></i>
          )}
          {record.typeIcon === "visit" && (
            <i className="icon-location" style={{ color: "#8c8c8c", fontSize: "16px" }}></i>
          )}
          {record.typeIcon === "camp" && (
            <i className="icon-tent" style={{ color: "#8c8c8c", fontSize: "16px" }}></i>
          )}
        </div>
      ),
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
            <Tooltip title="Coming Soon">
              <Button 
                icon={<ExportOutlined />}
                disabled
                style={{ 
                  opacity: 0.5,
                  cursor: 'not-allowed'
                }}
              >
                Export
              </Button>
            </Tooltip>
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

    </div>
  );
}

