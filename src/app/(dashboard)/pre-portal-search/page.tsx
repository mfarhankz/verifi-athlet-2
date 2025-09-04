"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
} from "antd";
import type { TableProps } from "antd";
import type { TableColumnsType } from "antd";
import Image from "next/image";
import Link from "next/link";
import ImageWithAverage from "../_components/ImageWithAverage";
import TableView from "../_components/TableView";
import Filters from "../_components/Filters";
import { fetchAthleteData, fetchSportColumnConfig } from "@/lib/queries";
import { AthleteData, Comment, SportStatConfig } from "@/types/database";
import { useSearch } from '../_components/SearchContext';
import { FilterState } from "@/types/filters";
import { supabase } from "@/lib/supabaseClient";
import { fetchCustomerRatings, type CustomerRating } from "@/utils/utils";
import { useCustomer, useUser } from "@/contexts/CustomerContext";
import AddAlert from "../_components/AddAlert";
import { StarFilled } from '@ant-design/icons';
import { useZoom } from '@/contexts/ZoomContext';
import InfoIcon from '@/components/InfoIcon';
import { getColumnTooltip } from '@/utils/columnTooltips';

const boxStyle: React.CSSProperties = {
  width: "100%",
  padding: "20px 0 20px 20px",
  flexDirection: "column",
};
const headerBox: React.CSSProperties = {
  padding: " 0 20px 0 0",
  marginBottom: "10px",
};

const { Title } = Typography;

export default function PrePortalSearch() {
  const [selectionType] = useState<"checkbox" | "radio">("checkbox");
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);
  const [selectedPlyer, setSelectedPlyer] = useState<AthleteData | null>(null);
  const [value, setValue] = useState("");
  const [data, setData] = useState<AthleteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { searchQuery, setSearchQuery } = useSearch();
  const [filteredData, setFilteredData] = useState<AthleteData[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [session, setSession] = useState<any>(null);
  const [comment, setcomment] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [athleteCommentCounts, setAthleteCommentCounts] = useState<Record<string, number>>({});
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<AthleteData[]>([]);
  const [isAddingToRecruitingBoard, setIsAddingToRecruitingBoard] = useState(false);
  const [recruitingBoardAthletes, setRecruitingBoardAthletes] = useState<string[]>([]);
  const [isLoadingRecruitingBoard, setIsLoadingRecruitingBoard] = useState(false);
  const [tableKey, setTableKey] = useState(0);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [teamUsers, setTeamUsers] = useState<
    Array<{ id: string; email: string; name_first: string; name_last: string }>
  >([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [displayedData, setDisplayedData] = useState<AthleteData[]>([]);
  const ITEMS_PER_PAGE = 25;
  const { activeCustomerId, customers, activeSportAbbrev } = useCustomer();
  const userDetails = useUser();
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const [athleteRatings, setAthleteRatings] = useState<Record<string, { name: string; color: string }>>({});
  const [dynamicColumns, setDynamicColumns] = useState<SportStatConfig[]>([]); // For table display (with search_column_display)
  const [filterColumns, setFilterColumns] = useState<SportStatConfig[]>([]); // For filter options (all stats)
  const [sportId, setSportId] = useState<string | null>(null);
  
  // Add cache for data to prevent redundant fetches
  const [dataCache, setDataCache] = useState<Record<string, { data: AthleteData[]; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  // Add ref to track which athletes we've already fetched comment counts for
  const fetchedCommentCountsRef = useRef<Set<string>>(new Set());

  // Get the active customer and use the active sport abbreviation from context
  const activeCustomer = customers.find((c: any) => c.customer_id === activeCustomerId);
  const activeSport = activeSportAbbrev || ''; // fallback to blank if not found
  
  // Get zoom functionality
  const { zoom } = useZoom();

  const columns: TableColumnsType<AthleteData> = useMemo(() => [
    {
      title: "Name",
      key: "name",
      fixed: "left",
      render: (_, record) => (
        <Link 
          href="#"
          className="profile-list"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
              const { getMainTpPageIdFromAthleteId } = await import('@/lib/queries');
              const mainTpPageId = await getMainTpPageIdFromAthleteId(record.id);
              
              if (mainTpPageId) {
                // Use main_tp_page_id for the profile link
                window.location.href = `/athlete-profile?main_tp_page_id=${mainTpPageId}`;
              } else {
                // Fallback to athlete_id if main_tp_page_id not found
                console.warn('No main_tp_page_id found for athlete, falling back to athlete_id');
                window.location.href = `/athlete-profile?id=${record.id}`;
              }
            } catch (error) {
              console.error('Error fetching main_tp_page_id:', error);
              // Fallback to athlete_id on error
              window.location.href = `/athlete-profile?id=${record.id}`;
            }
          }}
        >
          <ImageWithAverage
            src={record.image_url || "/blank-user.svg"}
            alt={record.athlete_name || ''}
            size="small"
            height={100}
            width={100}
            average={record.true_score || 0}
          />
          <div className="pro-detail">
            <h4 className="flex items-center mb-0.5">
              {record.athlete_name}
              {record.year && (
                <span className="ml-1">({record.year})</span>
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
            {record.division && (
              <div className="text-base mb-0.5">
                {record.division}
              </div>
            )}
            <div className="name">
              <p>{record.name_name}</p>
            </div>
          </div>
        </Link>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      sorter: true,
    },
    {
      title: "$",
      key: "athletic_aid",
      width: 60,
      dataIndex: "athletic_aid",
    },
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      width: 80,
      sorter: true,
    },
    {
      title: "High School",
      dataIndex: "high_name",
      key: "high_name",
      sorter: true,
    },
    {
      title: "State",
      dataIndex: "state",
      key: "state",
      width: 70,
      sorter: true,
    },
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
            dataIndex: `stat_${col.data_type_id}`,
            key: `stat_${col.data_type_id}`,
            width: Math.max(90, (col.display_name.length + 6) * 11), // Increased width to accommodate info icon + title + sorting arrows
            render: (value: any) => value || 0,
          };
        })
      : [
          // Fallback columns for soccer (default)
          {
            title: "GP",
            dataIndex: "gp",
            key: "gp",
            width: 70,
          },
          {
            title: "GS",
            dataIndex: "gs",
            key: "gs",
            width: 70,
          },
          {
            title: "Goals",
            dataIndex: "goals",
            key: "goals",
            width: 70,
          },
          {
            title: "Ast",
            dataIndex: "ast",
            key: "ast",
            width: 70,
          },
        ]
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
  ], [dynamicColumns, athleteRatings, athleteCommentCounts]);

  useEffect(() => {
    async function loadData() {
      // Prevent multiple simultaneous data loads
      if (loading) {
        return;
      }
      
      // Only proceed if we have the necessary data
      if (!activeCustomer?.sport_id || !activeCustomerId) {
        return;
      }
      
      // Check cache first
      const cacheKey = `pre_portal_${activeCustomer.sport_id}_${activeCustomerId}`;
      const cachedData = dataCache[cacheKey];
      const now = Date.now();
      
      if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
        setData(cachedData.data);
        setDisplayedData(cachedData.data);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Set sportId and fetch dynamic columns if not already set
        if (!sportId || sportId !== activeCustomer.sport_id) {
          setSportId(activeCustomer.sport_id);
          try {
            // Fetch columns for table display (with search_column_display filter)
            const displayColumns = await fetchSportColumnConfig(activeCustomer.sport_id, false);
            setDynamicColumns(displayColumns);
            
            // Fetch columns for filters (all stats)
            const allColumns = await fetchSportColumnConfig(activeCustomer.sport_id, true);
            setFilterColumns(allColumns);
          } catch (error) {
            console.error('Error fetching sport column config:', error);
            setDynamicColumns([]);
            setFilterColumns([]);
          }
        }
        
        // Create display columns list based on the table columns
        const displayColumns = [
          'date',
          'athletic_aid',
          'position',
          'high_name',
          'state',
          'true_score',
          // Add dynamic stat columns
          ...(dynamicColumns.length > 0 
            ? dynamicColumns.map(col => `stat_${col.data_type_id}`)
            : ['gp'] // Fallback columns
          )
        ];

        const athleteData = await fetchAthleteData(activeSport, {
          page: 1,
          limit: ITEMS_PER_PAGE,
          sportId: activeCustomer.sport_id,
          dataSource: 'all_athletes',
          displayColumns,
          sportAbbrev: activeSportAbbrev || undefined, // Pass the sport abbreviation from context
          userPackages: userDetails?.packages || [], // Pass user packages
        });
        
        // Use Map to ensure unique athletes by ID
        const uniqueAthletesMap = new Map();
        athleteData.data.forEach((athlete: AthleteData) => {
          if (!uniqueAthletesMap.has(athlete.id)) {
            uniqueAthletesMap.set(athlete.id, athlete);
          }
        });
        const uniqueData = Array.from(uniqueAthletesMap.values());
        
        setData(uniqueData);
        setDisplayedData(uniqueData);
        setHasMore(athleteData.hasMore);
        
        // Cache the data
        setDataCache(prev => ({
          ...prev,
          [cacheKey]: { data: uniqueData, timestamp: now }
        }));
        
        // Fetch ratings for the loaded athletes
        if (uniqueData.length > 0 && activeCustomerId) {
          try {
            const { data: ratingData, error } = await supabase
              .from('athlete_rating')
              .select(`
                athlete_id,
                customer_rating_scale_id,
                customer_rating_scale:customer_rating_scale_id(name, color)
              `)
              .in('athlete_id', uniqueData.map((athlete: AthleteData) => athlete.id));

            if (error) {
              console.error('Error fetching athlete ratings:', error);
            } else {
              const ratingsMap: Record<string, { name: string; color: string }> = {};
              ratingData?.forEach((rating: any) => {
                const ratingScale = rating.customer_rating_scale as unknown as { name: string; color: string } | null;
                if (ratingScale) {
                  ratingsMap[rating.athlete_id] = {
                    name: ratingScale.name,
                    color: ratingScale.color
                  };
                }
              });
              setAthleteRatings(ratingsMap);
            }
          } catch (error) {
            console.error('Error in fetchAthleteRatings:', error);
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in initial data load:', err);
        setError('Failed to load data');
        setLoading(false);
      }
    }
    loadData();
  }, [activeCustomer, activeCustomerId, activeSport]); // Simplified dependencies

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      
      if (session?.user?.id && userDetails) {
        setUserTeamId(userDetails.customer_id);
      }
    };

    getSession();

    supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session);
      if (session?.user?.id && userDetails) {
        setUserTeamId(userDetails.customer_id);
      }
    });
  }, [userDetails]);

  const loadMoreData = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      // Create display columns list based on the table columns
      const displayColumns = [
        'date',
        'division', 
        'year',
        'athletic_aid',
        'position',
        'high_name',
        'state',
        'true_score',
        // Add dynamic stat columns
        ...(dynamicColumns.length > 0 
          ? dynamicColumns.map(col => `stat_${col.data_type_id}`)
          : ['gp'] // Fallback columns
        )
      ];

      const athleteData = await fetchAthleteData(activeSport, {
        page: nextPage,
        limit: ITEMS_PER_PAGE,
        sportId: sportId || undefined,
        dataSource: 'all_athletes',
        displayColumns,
        sportAbbrev: activeSportAbbrev || undefined, // Pass the sport abbreviation from context
        userPackages: userDetails?.packages || [], // Pass user packages
      });
      
      // Create a Map of existing athletes
      const existingAthletesMap = new Map(displayedData.map((athlete: AthleteData) => [athlete.id, athlete]));
      
      // Add only new athletes that don't exist in the current display
      athleteData.data.forEach((athlete: AthleteData) => {
        if (!existingAthletesMap.has(athlete.id)) {
          existingAthletesMap.set(athlete.id, athlete);
        }
      });
      
      const updatedData = Array.from(existingAthletesMap.values());
      
      setDisplayedData(updatedData);
      setPage(nextPage);
      setHasMore(athleteData.hasMore);

      // Fetch ratings for the newly loaded athletes
      const newAthleteIds = athleteData.data.map((athlete: AthleteData) => athlete.id);
      if (newAthleteIds.length > 0) {
        if (newAthleteIds.length > 0 && activeCustomerId) {
          try {
            const { data: ratingData, error } = await supabase
              .from('athlete_rating')
              .select(`
                athlete_id,
                customer_rating_scale_id,
                customer_rating_scale:customer_rating_scale_id(name, color)
              `)
              .in('athlete_id', newAthleteIds);

            if (error) {
              console.error('Error fetching athlete ratings:', error);
            } else {
              const ratingsMap: Record<string, { name: string; color: string }> = {};
              ratingData?.forEach((rating: any) => {
                const ratingScale = rating.customer_rating_scale as unknown as { name: string; color: string } | null;
                if (ratingScale) {
                  ratingsMap[rating.athlete_id] = {
                    name: ratingScale.name,
                    color: ratingScale.color
                  };
                }
              });
              setAthleteRatings(prev => ({ ...prev, ...ratingsMap }));
            }
          } catch (error) {
            console.error('Error in fetchAthleteRatings:', error);
          }
        }
      }

      // Fetch comment counts for the newly loaded athletes
      if (newAthleteIds.length > 0) {
        const { data: commentData, error: commentError } = await supabase
          .from('comment')
          .select('athlete_id')
          .in('athlete_id', newAthleteIds);
        
        if (!commentError && commentData) {
          const newCommentCounts = { ...athleteCommentCounts };
          commentData.forEach((comment: { athlete_id: string }) => {
            if (comment.athlete_id) {
              newCommentCounts[comment.athlete_id] = (newCommentCounts[comment.athlete_id] || 0) + 1;
            }
          });
          setAthleteCommentCounts(newCommentCounts);
        }
      }
    } catch (err) {
      console.error('Error in loadMoreData:', err);
      setError('Failed to load more data');
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, displayedData, athleteCommentCounts, activeCustomerId, sportId]);

  useEffect(() => {
    const handleScroll = () => {
      if (loading || !hasMore) return;

      const tableContainer = document.querySelector('.ant-table-body');
      if (!tableContainer) return;

      const { scrollTop, scrollHeight, clientHeight } = tableContainer;
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

  useEffect(() => {
    if (!data) return;
    
    const applyFilters = async () => {
      if (loading) return;
      
      if (!activeCustomer?.sport_id || !activeCustomerId) {
        return;
      }
      
      if (Object.keys(activeFilters).length === 0 && !searchQuery) {
        return;
      }
      
      setLoading(true);
      try {
        setPage(1);
        
        // Create display columns list based on the table columns
        const displayColumns = [
          'date',
          'division', 
          'year',
          'athletic_aid',
          'position',
          'high_name',
          'state',
          'true_score',
          // Add dynamic stat columns
          ...(dynamicColumns.length > 0 
            ? dynamicColumns.map(col => `stat_${col.data_type_id}`)
            : ['gp'] // Fallback columns
          )
        ];

        const filteredAthleteData = await fetchAthleteData(activeSport, {
          page: 1,
          limit: ITEMS_PER_PAGE,
          filters: activeFilters,
          search: searchQuery,
          sportId: activeCustomer.sport_id,
          dataSource: 'all_athletes',
          displayColumns,
          sportAbbrev: activeSportAbbrev || undefined, // Pass the sport abbreviation from context
          userPackages: userDetails?.packages || [], // Pass user packages
          dynamicColumns: filterColumns, // Use filter columns for filtering
        });
        
        setDisplayedData(filteredAthleteData.data);
        setHasMore(filteredAthleteData.hasMore);
      } catch (err) {
        console.error('Error applying filters:', err);
        setError('Failed to apply filters');
      } finally {
        setLoading(false);
      }
    };

    applyFilters();
  }, [activeFilters, searchQuery, activeSport, activeCustomer, activeCustomerId]);

  const getRowKey = (record: AthleteData) => {
    return record.id;
  };

  const rowSelection: TableProps<AthleteData>["rowSelection"] = {
    onChange: (selectedRowKeys: React.Key[], selectedRows: AthleteData[]) => {
      console.log(
        `selectedRowKeys: ${selectedRowKeys}`,
        "selectedRows: ",
        selectedRows
      );
      setSelectedAthletes(selectedRows);
    },
    getCheckboxProps: (record: AthleteData) => ({
      disabled: recruitingBoardAthletes.includes(record.id),
      name: record.athlete_name,
    }),
  };

  const handleCancel = () => {
    setIsProfileVisible(false);
    setIsChatVisible(false);
  };

  const handlePlyarProfile = (record: AthleteData) => {
    setSelectedPlyer(record);
    setIsProfileVisible(true);
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
        console.error('No athlete found:', athleteId);
        return;
      }

      if (!userTeamId) {
        console.error('No user team ID found');
        return;
      }

      const { data: commentData, error: commentError } = await supabase
        .from('comment')
        .select(`
          *,
          user_detail (
            id,
            name_first,
            name_last
          )
        `)
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });
      
      if (commentError) throw commentError;
      setcomment(commentData || []);
      
      if (commentData) {
        setAthleteCommentCounts(prev => ({
          ...prev,
          [athleteId]: commentData.length
        }));
      }
    } catch (error) {
      console.error('Error fetching comment:', error);
      setcomment([]);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedPlyer || !newComment.trim() || isSubmitting || !userTeamId) return;
    
    const athleteId = selectedPlyer.id;
    if (!athleteId) {
      console.error('No athlete ID found');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingComment) {
        const { data: updatedComment, error } = await supabase
          .from('comment')
          .update({
            content: newComment,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingComment.id)
          .eq('user_id', session.user.id)
          .select();
        
        if (error) throw error;
      } else {
        const { data: insertedComment, error } = await supabase
          .from('comment')
          .insert({
            content: newComment,
            athlete_id: athleteId,
            user_id: session.user.id,
            customer_id: userTeamId
          })
          .select();
        
        if (error) throw error;
      }

      await fetchcomment(selectedPlyer.id);
      setNewComment("");
      setEditingComment(null);
    } catch (error) {
      console.error('Error saving comment:', error);
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
      const { error } = await supabase
        .from('comment')
        .delete()
        .eq('id', commentId)
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      await fetchcomment(selectedPlyer?.id || '');
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const fetchAllCommentCounts = async () => {
    try {
      if (!userTeamId) {
        console.error('No user team ID found');
        return;
      }
      
      const athleteIds = displayedData.map(athlete => athlete.id).filter(Boolean);
      
      if (athleteIds.length === 0) return;
      
      const { data: commentData, error: commentError } = await supabase
        .from('comment')
        .select('athlete_id')
        .in('athlete_id', athleteIds);
      
      if (commentError) {
        console.error('Supabase error fetching comments:', {
          message: commentError.message,
          details: commentError.details,
          hint: commentError.hint,
          code: commentError.code
        });
        throw commentError;
      }
      
      if (!commentData) return;
      
      const commentCounts: Record<string, number> = {};
      commentData.forEach((comment: { athlete_id: string }) => {
        if (comment.athlete_id) {
          commentCounts[comment.athlete_id] = (commentCounts[comment.athlete_id] || 0) + 1;
        }
      });
      
      athleteIds.forEach(id => fetchedCommentCountsRef.current.add(id));
      
      setAthleteCommentCounts(commentCounts);
    } catch (error) {
      console.error('Error fetching comment counts:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  };
  
  useEffect(() => {
    if (displayedData.length > 0 && userTeamId) {
      const athletesWithoutCommentCounts = displayedData.filter(athlete => 
        !fetchedCommentCountsRef.current.has(athlete.id)
      );
      
      if (athletesWithoutCommentCounts.length > 0) {
        fetchAllCommentCounts();
      }
    }
  }, [displayedData, userTeamId]);

  const fetchRecruitingBoardAthletes = async () => {
    if (!session?.user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('recruiting_board')
        .select('athlete_id');
        
      if (error) {
        console.error('Error fetching recruiting board:', error);
        return;
      }
      
      const athleteIds = data.map((item: { athlete_id: string }) => item.athlete_id);
      setRecruitingBoardAthletes(athleteIds);
    } catch (error) {
      console.error('Error in fetchRecruitingBoardAthletes:', error);
    } finally {
      setIsLoadingRecruitingBoard(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id && recruitingBoardAthletes.length === 0) {
      fetchRecruitingBoardAthletes();
    }
  }, [session, recruitingBoardAthletes.length]);
  
  useEffect(() => {
    fetchedCommentCountsRef.current.clear();
  }, [userTeamId]);

  const handleAddToRecruitingBoard = async () => {
    if (selectedAthletes.length === 0) {
      alert("Please select at least one athlete to add to the recruiting board.");
      return;
    }

    setIsAddingToRecruitingBoard(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("You must be logged in to add athletes to the recruiting board.");
        return;
      }
      
      const userId = session.user.id;
      console.log("Current user ID:", userId);
      
      if (!userDetails) {
        console.error("No user details found for user ID:", userId);
        alert("No user details found. Please make sure your account is properly set up.");
        return;
      }
      
      console.log("User details retrieved:", userDetails);
      
      const recruitingBoardEntries = selectedAthletes.map(athlete => ({
        athlete_id: athlete.id,
        user_id: userId,
        customer_id: userDetails.customer_id,
        position: athlete.position || 'Unassigned' // Add position from athlete data
      }));
      
      console.log("Preparing to insert entries:", recruitingBoardEntries);
      
      const { data: insertData, error: insertError } = await supabase
        .from('recruiting_board')
        .insert(recruitingBoardEntries)
        .select();
        
      if (insertError) {
        console.error("Error adding athletes to recruiting board:", insertError);
        console.error("Error details:", JSON.stringify(insertError, null, 2));
        alert(`Error adding athletes to recruiting board: ${insertError.message || 'Unknown error'}`);
        return;
      }
      
      console.log("Successfully inserted entries:", insertData);
      alert(`Successfully added ${selectedAthletes.length} athlete(s) to your recruiting board.`);
      
      const newAthleteIds = selectedAthletes.map(athlete => athlete.id);
      setRecruitingBoardAthletes(prev => [...prev, ...newAthleteIds]);
      
      setSelectedAthletes([]);
      
    } catch (error) {
      console.error("Error in handleAddToRecruitingBoard:", error);
      if (error instanceof Error) {
        alert(`An unexpected error occurred: ${error.message}`);
      } else {
        alert("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsAddingToRecruitingBoard(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

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
        console.error('Error fetching data_type name:', error);
        return `data_type_${dataTypeId}`;
      }
      
      return data?.name || `data_type_${dataTypeId}`;
    } catch (error) {
      console.error('Error in getDataTypeName:', error);
      return `data_type_${dataTypeId}`;
    }
  };

  const renderActiveFilters = async () => {
    const filterLabels: string[] = [];
    
    // Handle static filters with async data_type lookups
    if (activeFilters.years?.length) {
      const yearName = await getDataTypeName(1);
      filterLabels.push(`${yearName}: ${activeFilters.years.join(", ")}`);
    }
    if (activeFilters.states?.length) {
      const stateName = await getDataTypeName(24);
      filterLabels.push(`${stateName}: ${activeFilters.states.join(", ")}`);
    }
    if (activeFilters.divisions?.length) filterLabels.push(`Div: ${activeFilters.divisions.join(", ")}`);
    if (activeFilters.athleticAid?.length) filterLabels.push(`Athletic Aid: ${activeFilters.athleticAid.join(", ")}`);
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
    
    Object.keys(activeFilters).forEach(key => {
      if (key.startsWith('stat_')) {
        const dataTypeId = key.replace('stat_', '');
        const column = dynamicColumns.find(col => col.data_type_id.toString() === dataTypeId);
        const filterValue = activeFilters[key];
        if (filterValue && typeof filterValue === 'object' && 'comparison' in filterValue && 'value' in filterValue) {
          filterLabels.push(`${column?.data_type_name || key}: ${filterValue.comparison} ${filterValue.value}`);
        }
      }
    });
    
    return filterLabels.length ? filterLabels.join(" | ") : "No filters set";
  };

  useEffect(() => {
    const loadRatings = async () => {
      if (activeCustomerId) {
        try {
          const data = await fetchCustomerRatings(activeCustomerId);
          setRatings(data);
        } catch (error) {
          console.error('Error loading ratings:', error);
        }
      }
    };
    loadRatings();
  }, [activeCustomerId]);

  const fetchAthleteRatings = async (athleteIds: string[]) => {
    if (!athleteIds.length || !activeCustomerId) return;

    try {
      const { data: ratingData, error } = await supabase
        .from('athlete_rating')
        .select(`
          athlete_id,
          customer_rating_scale_id,
          customer_rating_scale:customer_rating_scale_id(name, color)
        `)
        .in('athlete_id', athleteIds);

      if (error) {
        console.error('Error fetching athlete ratings:', error);
        return;
      }

      const ratingsMap: Record<string, { name: string; color: string }> = {};
      ratingData?.forEach((rating: any) => {
        const ratingScale = rating.customer_rating_scale as unknown as { name: string; color: string } | null;
        if (ratingScale) {
          ratingsMap[rating.athlete_id] = {
            name: ratingScale.name,
            color: ratingScale.color
          };
        }
      });

      setAthleteRatings(prev => ({ ...prev, ...ratingsMap }));
    } catch (error) {
      console.error('Error in fetchAthleteRatings:', error);
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <div 
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
          paddingBottom: zoom > 100 ? '2rem' : '0',
          paddingRight: zoom > 100 ? '5%' : '0',
          minHeight: zoom > 100 ? `${zoom}vh` : 'auto',
          width: zoom > 100 ? `${Math.max(zoom, 120)}%` : '100%',
          marginBottom: zoom > 100 ? '4rem' : '0'
        }}
      >
        <Flex style={boxStyle}>
          <Flex style={headerBox} justify="space-between" align="center">
            <Input.Search
              style={{ width: 300 }}
              placeholder="Search here..."
              allowClear
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onSearch={handleSearch}
            />
            <Space>
              <div className="selectbox-ui" style={{ display: "flex", alignItems: "center" }}>
                {isAnyFilterActive && (
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
                        Set Up Email Alert
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
                />
              </div>
              <div className="selectbox-ui">
                <TableView />
              </div>
              <Button 
                onClick={handleAddToRecruitingBoard} 
                type="primary"
                loading={isAddingToRecruitingBoard}
                disabled={selectedAthletes.length === 0}
              >
                Add to Recruiting Board ({selectedAthletes.length})
              </Button>
            </Space>
          </Flex>
          <Table<AthleteData>
            key={tableKey}
            rowKey="id"
            rowSelection={{ type: selectionType, ...rowSelection }}
            columns={columns}
            dataSource={displayedData}
            loading={loading || isLoadingRecruitingBoard}
            pagination={false}
            bordered
            style={{ width: "100%" }}
            scroll={{ x: "max-content", y: "calc(100vh - 180px)" }}
            onRow={(record) => ({
              style: {
                backgroundColor: recruitingBoardAthletes.includes(record.id) ? '#f0f9f0' : undefined,
              },
              className: recruitingBoardAthletes.includes(record.id) ? 'recruiting-board-row' : '',
            })}
          />
      <Modal
        open={isProfileVisible}
        onCancel={handleCancel}
        className="profile-modal"
        width={442}
        footer={null}
        centered
      >
        {selectedPlyer && (
          <Flex vertical gap={16}>
            <Image
              src={selectedPlyer.image_url || "/blank-user.svg"}
              alt={selectedPlyer.athlete_name || ''}
              width={221}
              height={140}
              style={{ objectFit: 'cover', margin: '-24px -24px 0' }}
            />

            <Flex vertical gap={12} style={{ padding: '0 12px' }}>
              <Flex justify="space-between" className="main-heading">
                <h2 className="uppercase">{selectedPlyer.athlete_name}</h2>
              </Flex>

              <h4 className="flex items-center gap-2">
                <Image
                  src="/b.svg"
                  alt={selectedPlyer.name_name || ''}
                  width={18}
                  height={18}
                />
                <span>{selectedPlyer.name_name}</span>
              </h4>

              <Flex className="player-cost" justify="space-between" align="center">
                <h5 className="cut-ui">
                  <small className="flex items-center gap-2">
                    <Image
                      src="/player-icon.svg"
                      alt="Player"
                      width={18}
                      height={18}
                    />
                    PLAYER
                  </small>
                  DIVISION
                  <span style={{ marginLeft: '8px' }}>{selectedPlyer.division}</span>
                </h5>
                <Typography.Paragraph className="price">
                  <small>Athletic Aid</small>
                  <span>{selectedPlyer.athletic_aid === 'Yes' ? 'Yes' : 'No'}</span>
                </Typography.Paragraph>
              </Flex>

              <Flex className="list" gap={16} wrap="wrap">
                <h4>
                  <small>Year</small>
                  {selectedPlyer.year}
                </h4>
                <h4>
                  <small>High name</small>
                  {selectedPlyer.high_name}
                </h4>
                <h4>
                  <small>GP</small>
                  {selectedPlyer.gp}
                </h4>
                <h4>
                  <small>GS</small>
                  {selectedPlyer.gs}
                </h4>
                <h4>
                  <small>Goals</small>
                  {selectedPlyer.goals}
                </h4>
                <h4>
                  <small>Ast</small>
                  {selectedPlyer.ast}
                </h4>
                <h4>
                  <small>GK Min</small>
                  {selectedPlyer.gk_min}
                </h4>
              </Flex>
            </Flex>
          </Flex>
        )}
      </Modal>

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
                <div className="bg-[#F5F5F5] px-3 py-1 rounded-md">
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
                {comment.user_id === session.user.id && (
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
    </div>
  );
}
