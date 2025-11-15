"use client";

import type { AthleteData } from "@/types/database";
import {
  Button,
  Dropdown,
  Flex,
  MenuProps,
  Progress,
  Skeleton,
  Tooltip,
  Input,
  Modal,
  Select,
} from "antd";
import Image from "next/image";
import PlayerList from "./PlayerList";
import PlayerInformation from "./PlayerInformation";
import Link from "next/link";
import ImageWithAverage from "./ImageWithAverage";
import AchievementList from "./AchievementList";
import AthleteHonors from "./AthleteHonors";
import TwitterEmbed from "./TwitterEmbed";
import SchoolInfo from "./SchoolInfo";
import { supabase } from "@/lib/supabaseClient";
import { getDefaultBoardForAdding, getPackageIdsByType } from "@/lib/queries";
import { hasPackageAccess } from "@/utils/navigationUtils";
import { fetchCustomerRatings, type CustomerRating } from "@/utils/utils";
import {
  useUser,
  useCustomer,
  useUserSafely,
} from "@/contexts/CustomerContext";
import { StarFilled, CopyOutlined, DownOutlined } from "@ant-design/icons";
import { useZoom } from "@/contexts/ZoomContext";
import { useState, useEffect } from 'react';
import MobileAthleteProfileContent from './MobileAthleteProfileContent';
import ChooseBoardDropdown from './ChooseBoardDropdown';
import ChooseBoardDropdownWithStatus from './ChooseBoardDropdownWithStatus';
import SuccessPopover from './SuccessPopover';
import HSAthleteProfileContent from './HSAthleteProfileContent';

const formatDate = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "-- na --";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

const RATING_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C", "D"];

interface AthleteProfileContentProps {
  athleteId?: string;
  mainTpPageId?: string;
  onAddToBoard?: () => void;
  isInModal?: boolean;
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null;
}

export default function AthleteProfileContent({ 
  athleteId, 
  mainTpPageId,
  onAddToBoard,
  isInModal = false,
  dataSource = null
}: AthleteProfileContentProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [actualAthleteId, setActualAthleteId] = useState<string | null>(null);
  const [rating, setRating] = useState<string | null>(null);
  const [ratingColor, setRatingColor] = useState<string | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedRatingId, setSelectedRatingId] = useState<number | null>(null);
  const [session, setSession] = useState<any>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [isAddingToRecruitingBoard, setIsAddingToRecruitingBoard] = useState(false);
  const [recruitingBoardAthletes, setRecruitingBoardAthletes] = useState<string[]>([]);
  const [boardsAthleteIsOn, setBoardsAthleteIsOn] = useState<string[]>([]); // Track which board IDs athlete is on
  const [isLoadingRecruitingBoard, setIsLoadingRecruitingBoard] = useState(false);
  const [isBoardModalVisible, setIsBoardModalVisible] = useState(false);
  const [availableBoards, setAvailableBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [selectedBoardName, setSelectedBoardName] = useState<string>('Main');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const { activeCustomerId } = useCustomer();
  const { userDetails } = useUserSafely();
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const { zoom } = useZoom();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  
  // Score tracker state
  const [isInScoreTracker, setIsInScoreTracker] = useState(false);
  const [isLoadingScoreTracker, setIsLoadingScoreTracker] = useState(false);
  const [isAddingToScoreTracker, setIsAddingToScoreTracker] = useState(false);

  // Set userTeamId when userDetails becomes available
  useEffect(() => {
    if (userDetails) {
      setUserTeamId(userDetails.customer_id);
    }
  }, [userDetails]);

  // Effect to resolve athlete ID from main_tp_page_id if needed
  useEffect(() => {
    const resolveAthleteId = async () => {
      if (mainTpPageId) {
        // If main_tp_page_id is provided, fetch the athlete_id
        const { getAthleteIdFromMainTpPageId } = await import('@/lib/queries');
        const resolvedAthleteId = await getAthleteIdFromMainTpPageId(mainTpPageId);
        if (resolvedAthleteId) {
          setActualAthleteId(resolvedAthleteId);
        } else {
          console.error('Could not resolve athlete_id from main_tp_page_id:', mainTpPageId);
        }
      } else if (athleteId) {
        // If athleteId is provided directly, use it
        setActualAthleteId(athleteId);
      }
    };

    resolveAthleteId();
  }, [athleteId, mainTpPageId]);

  useEffect(() => {
    if (actualAthleteId && userDetails?.packages) {
      const loadAthleteData = async () => {
        try {
          const { fetchAthleteById } = await import("@/lib/queries");
          const data = await fetchAthleteById(actualAthleteId, userDetails.packages, dataSource === 'high_schools' ? null : dataSource);
          if (data) {
            setAthlete(data);

            // Fetch the latest rating for this athlete
            const { data: ratingData, error: ratingError } = await supabase
              .from("athlete_rating")
              .select(
                `
                customer_rating_scale_id,
                created_at,
                customer_rating_scale:customer_rating_scale_id(name, color)
              `
              )
              .eq("athlete_id", actualAthleteId)
              .order("created_at", { ascending: false })
              .limit(1);

            if (ratingError) {
              console.error("Error fetching rating:", ratingError);
            } else if (ratingData && ratingData.length > 0) {
              const ratingScale = ratingData[0].customer_rating_scale as unknown as { name: string; color: string } | null;
              setRating(ratingScale?.name || null);
              setRatingColor(ratingScale?.color || null);
            }
          } else {
            console.error("No athlete data returned for ID:", actualAthleteId);
          }
        } catch (error) {
          console.error("Error fetching athlete:", error);
        }
      };

      loadAthleteData();
    }
  }, [actualAthleteId, userDetails?.packages, dataSource]);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      setSession(session);
    });
  }, []);

  // Check if user has admin access (customer_package_id = 3)
  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data, error } = await supabase
          .from('user_access_override')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('customer_package_id', 3)
          .is('access_end', null)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching user admin access:', error);
          setHasAdminAccess(false);
        } else {
          setHasAdminAccess(!!data);
        }
      }
    };

    checkAdminAccess();
  }, []);

  // Add this function to fetch athletes already in the user's recruiting board
  const fetchRecruitingBoardAthletes = async () => {
    if (!session?.user?.id || !userDetails?.customer_id) return;

    try {
      setIsLoadingRecruitingBoard(true);
      const { data, error } = await supabase
        .from("recruiting_board_athlete")
        .select("athlete_id, recruiting_board_board_id")
        .is('ended_at', null);

      if (error) {
        console.error("Error fetching recruiting board athletes:", error);
        return;
      }

      const athleteIds = data.map(
        (item: { athlete_id: string }) => item.athlete_id
      );
      setRecruitingBoardAthletes(athleteIds);
      
      // If we have the actual athlete ID, track which boards they're on
      if (actualAthleteId) {
        const boardIds = data
          .filter((item: { athlete_id: string; recruiting_board_board_id: string }) => 
            item.athlete_id === actualAthleteId
          )
          .map((item: { recruiting_board_board_id: string }) => 
            item.recruiting_board_board_id
          );
        setBoardsAthleteIsOn(boardIds);
      }
    } catch (error) {
      console.error("Error in fetchRecruitingBoardAthletes:", error);
    } finally {
      setIsLoadingRecruitingBoard(false);
    }
  };

  // Call this function when the component mounts and when the session changes
  useEffect(() => {
    if (session?.user?.id && userDetails?.customer_id) {
      fetchRecruitingBoardAthletes();
    }
  }, [session, userDetails, actualAthleteId]);

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
          const mainBoard = data.find((b: { id: string; name: string }) => b.name === 'Main') || data[0];
          setSelectedBoardId(mainBoard.id);
          setSelectedBoardName(mainBoard.name);
        }
      } catch (error) {
        console.error('Error in fetchBoards:', error);
      }
    };
    
    fetchBoards();
  }, [activeCustomerId]);

  // Check score tracker status when athlete and customer are available
  useEffect(() => {
    if (athlete?.id && activeCustomerId) {
      checkScoreTrackerStatus();
    }
  }, [athlete?.id, activeCustomerId]);

  // Add athlete to recruiting board (now uses selected board)
  const handleAddToRecruitingBoard = async (boardIdOverride?: string, boardNameOverride?: string) => {
    if (!athlete) {
      alert("No athlete selected.");
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
        // Get the default board (Main if exists, or single board if only one exists)
        boardId = await getDefaultBoardForAdding(activeCustomerId);
        
        // Create Main board if no boards exist
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

      // Always assign to Unassigned column
      const positionName = 'Unassigned';
      
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
          alert(`Error creating column: ${createColumnError.message}`);
          return;
        }

        columnId = newColumn.id;
      }

      // Get the current max rank for this column to assign unique rank
      const { data: maxRankData } = await supabase
        .from('recruiting_board_athlete')
        .select('rank')
        .eq('recruiting_board_board_id', boardId)
        .eq('recruiting_board_column_id', columnId)
        .is('ended_at', null)
        .order('rank', { ascending: false })
        .limit(1);

      const nextRank = (maxRankData?.[0]?.rank || 0) + 1;

      // Prepare the data for insertion
      const recruitingBoardEntry = {
        customer_id: activeCustomerId,
        recruiting_board_board_id: boardId,
        recruiting_board_column_id: columnId,
        athlete_id: athlete.id,
        user_id: userId,
        rank: nextRank, // Assign unique incremental rank
        source: dataSource === 'transfer_portal' ? 'portal' : 
                dataSource === 'juco' ? 'juco' : 
                dataSource === 'hs_athletes' ? 'high_school' :
                dataSource === 'all_athletes' ? 'pre-portal' : null,
        customer_position: athlete.primary_position || athlete.position || null
      };

      // Insert the data into the recruiting_board_athlete table
      const { data: insertData, error: insertError } = await supabase
        .from('recruiting_board_athlete')
        .insert(recruitingBoardEntry)
        .select();

      if (insertError) {
        console.error("Error adding athlete to recruiting board:", insertError);
        alert(`Error adding athlete to recruiting board: ${insertError.message || 'Unknown error'}`);
        return;
      }

      // If this is a pre-transfer athlete, add to player_tracking table (only for ultra, gold, or platinum packages)
      if (dataSource === 'all_athletes' || recruitingBoardEntry.source === 'pre-portal') {
        // Check if user has ultra, gold, or platinum packages
        const userPackageNumbers = (userDetails?.packages || []).map(pkg => parseInt(pkg, 10));
        const ultraPackageIds = getPackageIdsByType('ultra');
        const goldPackageIds = getPackageIdsByType('gold');
        const platinumPackageIds = getPackageIdsByType('platinum');
        const allowedPackageIds = [...ultraPackageIds, ...goldPackageIds, ...platinumPackageIds];
        
        const hasAllowedPackage = hasPackageAccess(userPackageNumbers, allowedPackageIds);
        
        if (hasAllowedPackage) {
          try {
            // Fetch text_alert_default from user_detail table
            const { data: userDetailData, error: userDetailError } = await supabase
              .from('user_detail')
              .select('text_alert_default')
              .eq('id', userId)
              .single();

            if (userDetailError) {
              console.error("Error fetching user detail for text_alert_default:", userDetailError);
              // Continue even if we can't get text_alert_default
            }

            // text_alert should be a boolean based on text_alert_default (default to false if not found)
            const textAlert = userDetailData?.text_alert_default ?? false;

            // Insert into player_tracking table
            const { error: trackingError } = await supabase
              .from('player_tracking')
              .insert({
                athlete_id: athlete.id,
                user_id: userId,
                customer_id: activeCustomerId,
                recipient: userId,
                text_alert: textAlert
              });

            if (trackingError) {
              console.error("Error adding athlete to player_tracking:", trackingError);
              // Don't fail the whole operation if player_tracking insert fails
            }
          } catch (trackingErr) {
            console.error("Error in player_tracking insert:", trackingErr);
            // Don't fail the whole operation if player_tracking insert fails
          }
        }
      }

      // Show success message with board name
      setSuccessMessage(`Player added to ${boardName}!`);
      setShowSuccessMessage(true);
      setRecruitingBoardAthletes(prev => [...prev, athlete.id]);
      if (boardId) {
        setBoardsAthleteIsOn(prev => [...prev, boardId]);
      }
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

  // Handle board selection
  const handleBoardSelected = async (boardId: string, boardName: string) => {
    setSelectedBoardId(boardId);
    setSelectedBoardName(boardName);
    setIsBoardModalVisible(false);
  };

  // Score tracker functions
  const checkScoreTrackerStatus = async () => {
    if (!athlete?.id || !activeCustomerId) return;

    try {
      setIsLoadingScoreTracker(true);
      const { data, error } = await supabase
        .from('score_tracker')
        .select('id')
        .eq('athlete_id', athlete.id)
        .eq('customer_id', activeCustomerId)
        .is('ended_at', null)
        .maybeSingle();

      if (error) {
        console.error('Error checking score tracker status:', error);
        return;
      }

      setIsInScoreTracker(!!data);
    } catch (error) {
      console.error('Error in checkScoreTrackerStatus:', error);
    } finally {
      setIsLoadingScoreTracker(false);
    }
  };

  const handleAddToScoreTracker = async () => {
    if (!athlete?.id || !activeCustomerId || !userDetails) {
      alert("You must be logged in to add athletes to the score tracker.");
      return;
    }

    setIsAddingToScoreTracker(true);
    
    try {
      const { data, error } = await supabase
        .from('score_tracker')
        .insert({
          athlete_id: athlete.id,
          customer_id: activeCustomerId,
          user_id: userDetails.id,
        })
        .select();

      if (error) {
        console.error('Error adding athlete to score tracker:', error);
        alert(`Error adding athlete to score tracker: ${error.message || 'Unknown error'}`);
        return;
      }

      // Update state
      setIsInScoreTracker(true);
      setSuccessMessage("Added to Score Tracker!");
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error in handleAddToScoreTracker:', error);
      if (error instanceof Error) {
        alert(`An unexpected error occurred: ${error.message}`);
      } else {
        alert("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsAddingToScoreTracker(false);
    }
  };

  const handleRatingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRatingModalOpen(true);
  };

  const handleCopyAthleteId = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (actualAthleteId) {
      try {
        await navigator.clipboard.writeText(actualAthleteId);
        // Successfully copied
      } catch (error) {
        console.error('Failed to copy athlete ID:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = actualAthleteId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    }
  };

  const handleRatingSubmit = async () => {
    if (!athlete?.id || !selectedRatingId) return;

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!userDetails) {
        console.error("No user details found");
        return;
      }

      const { error } = await supabase.from("athlete_rating").insert({
        athlete_id: athlete.id,
        customer_rating_scale_id: selectedRatingId,
        user_id: user?.id,
        customer_id: userDetails.customer_id,
      });

      if (error) throw error;

      const selectedRatingDetails = ratings.find(
        (r) => r.id === selectedRatingId?.toString()
      );
      if (selectedRatingDetails) {
        setRating(selectedRatingDetails.name);
        setRatingColor(selectedRatingDetails.color);
      }

      setIsRatingModalOpen(false);
      setSelectedRatingId(null);
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  // Add useEffect to fetch ratings when component mounts
  useEffect(() => {
    const loadRatings = async () => {
      if (activeCustomerId) {
        try {
          const data = await fetchCustomerRatings(activeCustomerId);
          setRatings(data);
        } catch (error) {
          console.error("Error loading ratings:", error);
        }
      }
    };
    loadRatings();
  }, [activeCustomerId]);

  // Use the new HS Athlete Profile for hs_athletes dataSource
  if (dataSource === 'hs_athletes') {
    return <HSAthleteProfileContent
      athleteId={athleteId}
      mainTpPageId={mainTpPageId}
      onAddToBoard={onAddToBoard}
      isInModal={isInModal}
      dataSource={dataSource}
    />;
  }

  return isMobile ? (
    <MobileAthleteProfileContent
      athleteId={athleteId}
      mainTpPageId={mainTpPageId}
      onAddToBoard={onAddToBoard}
      dataSource={dataSource}
    />
  ) : (
    <div className="w-full h-full">
      <div
        style={{
          transform: isInModal ? 'none' : `scale(${zoom / 100})`,
          transformOrigin: "top left",
          paddingBottom: (zoom > 100 && !isInModal) ? "2rem" : "0",
          paddingRight: (zoom > 100 && !isInModal) ? "5%" : "0",
          minHeight: (zoom > 100 && !isInModal) ? `${zoom}vh` : "auto",
          width: (zoom > 100 && !isInModal) ? `${Math.max(zoom, 120)}%` : "100%",
          marginBottom: (zoom > 100 && !isInModal) ? "4rem" : "0",
        }}
      >
        <Flex>
          <div className="main-container">
            <div className="grid grid-cols-[215px_minmax(0,1fr)] gap-2">
              <div className="flex flex-col gap-2">
                <div className="card p-0">
                  <div className="player-img">
                    {!athlete ? (
                      <Skeleton.Image
                        active
                        style={{ width: 200, height: 200 }}
                      />
                    ) : (
                      <ImageWithAverage
                        src={athlete?.image_url || "/plyer-b.png"}
                        alt="Survey Image"
                        height={200}
                        width={200}
                        average={athlete?.true_score || 0}
                      />
                    )}
                    <ul>
                      {/* Always show position and year */}
                      {!athlete ? (
                        <li>
                          <i className="icon-profile-2user"></i>{" "}
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        </li>
                      ) : (athlete?.primary_position || athlete?.secondary_position || athlete?.hand) && (
                        <li>
                          <i className="icon-profile-2user"></i>{" "}
                          {`${athlete?.primary_position || ""}${
                            athlete?.secondary_position
                              ? `, ${athlete.secondary_position}`
                              : ""
                          }${
                            athlete?.hand
                              ? ` (${
                                  athlete.hand.charAt(0).toUpperCase() +
                                  athlete.hand.slice(1).toLowerCase()
                                })`
                              : ""
                          }`}
                        </li>
                      )}
                      {!athlete ? (
                        <li>
                          <i className="icon-calendar-1"></i>{" "}
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        </li>
                      ) : athlete?.year && (
                        <li>
                          <i className="icon-calendar-1"></i>{" "}
                          {athlete.year}
                        </li>
                      )}
                      {/* Hide height/weight, address_city, and high school for JUCO */}
                      {dataSource !== 'juco' && (
                        <>
                          {!athlete ? (
                            <li>
                              <i className="icon-receipt-item"></i>{" "}
                              <Skeleton.Input
                                active
                                size="small"
                                style={{ width: 100 }}
                              />
                            </li>
                          ) : athlete?.height_feet && (
                            <li>
                              <i className="icon-receipt-item"></i>{" "}
                              {`${athlete.height_feet}'${athlete.height_inch}"${
                                athlete.weight ? `, ${athlete.weight} lbs` : ""
                              }`}
                            </li>
                          )}
                          {!athlete ? (
                            <li>
                              <i className="icon-location"></i>{" "}
                              <Skeleton.Input
                                active
                                size="small"
                                style={{ width: 100 }}
                              />
                            </li>
                          ) : (athlete?.address_city || athlete?.address_state) && (
                            <li>
                              <i className="icon-location"></i>{" "}
                              {[athlete.address_city, athlete.address_state]
                                .filter(Boolean)
                                .join(", ")}
                            </li>
                          )}
                          {!athlete ? (
                            <li>
                              <i className="icon-teacher"></i>{" "}
                              <Skeleton.Input
                                active
                                size="small"
                                style={{ width: 100 }}
                              />
                            </li>
                          ) : athlete?.high_name && (
                            <li>
                              <i className="icon-teacher"></i>{" "}
                              {athlete.high_name}
                            </li>
                          )}
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                
                {athlete && (athlete.roster_link || athlete.hs_highlight || athlete.highlight || 
                  athlete.tfrrs_link || athlete.wtn_link || athlete.utr_link || athlete.stats_link) && (
                  <div className="card">
                    <h4 className="mb-4 !text-[22px]">Profile Links</h4>
                    <div className="flex flex-col gap-1">
                      {athlete.roster_link && (
                        <a
                          href={athlete.roster_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          Roster Page
                        </a>
                      )}
                      {athlete.hs_highlight && (
                        <a
                          href={athlete.hs_highlight}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          HS Highlight Tape
                        </a>
                      )}
                      {athlete.highlight && (
                        <a
                          href={athlete.highlight}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          College Highlight Tape
                        </a>
                      )}
                      {athlete.tfrrs_link && (
                        <a
                          href={athlete.tfrrs_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          TFRRS Link
                        </a>
                      )}
                      {athlete.wtn_link && (
                        <a
                          href={athlete.wtn_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          WTN Link
                        </a>
                      )}
                      {athlete.utr_link && (
                        <a
                          href={athlete.utr_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          UTR Link
                        </a>
                      )}
                      {athlete.stats_link && (
                        <a
                          href={athlete.stats_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center py-1 text-[16px] hover:bg-[#f5f5f5]"
                        >
                          <Image
                            src="/link-01.svg"
                            alt="tw"
                            width={20}
                            height={20}
                            className="mr-1"
                          />
                          Stats Link
                        </a>
                      )}
                    </div>
                  </div>
                )}
                
                <SchoolInfo 
                  athlete={athlete}
                  dataSource={dataSource} 
                />
                
                <AthleteHonors athlete={athlete} />
                
                <AchievementList athlete={athlete} />
                
                {athlete?.twitter && (
                  <div className="card !p-0 !bg-black">
                    <div
                      className="gray-scale"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                      }}
                    >
                      <div className="xfeed">
                        <div className="">
                          <img src="/x-logo.svg" alt="X Feed" height={50} />
                        </div>
                        <span className="gray">Follow on X</span>
                        <h3>{athlete?.first_name} {athlete?.last_name}</h3>
                        <h6>@{athlete?.twitter}</h6>
                        <div className="white-skew-btn">
                          <a 
                            href={`https://x.com/${athlete.twitter}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                          >
                            <button>
                              Catch on X
                            </button>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="card-withou-pading gray-scale overflow-auto">
                <div className="grid grid-cols-[1fr_280px] gap-4 mb-4">
                  <div className="card">
                    <div className="flex w-100">
                      <div className="detail-box gray-scale">
                        <Flex justify="space-between" align="center">
                          <Flex>
                            {dataSource !== 'all_athletes' ? (
                              !athlete ? (
                                <Skeleton.Input
                                  active
                                  size="small"
                                  style={{ width: 100 }}
                                />
                              ) : (
                                <span
                                  className={`badge ${
                                    athlete?.main_tp_page?.[0]?.status?.toLowerCase() === "active"
                                      ? "status-active"
                                      : "status-inactive"
                                  }`}
                                  style={{
                                    backgroundColor:
                                      athlete?.main_tp_page?.[0]?.status?.toLowerCase() === "active"
                                        ? "#52c41a"
                                        : "#ff4d4f",
                                  }}
                                >
                                  <i
                                    className={`icon-${
                                      athlete?.main_tp_page?.[0]?.status?.toLowerCase() === "active"
                                        ? "check-2"
                                        : "close-circle"
                                    }`}
                                  ></i>
                                  {athlete?.main_tp_page?.[0]?.status}
                                </span>
                              )
                            ) : (
                              <div></div>
                            )}
                          </Flex>
                          <Flex vertical align="flex-end" gap={8}>
                            <SuccessPopover
                              trigger="bottom"
                              content={successMessage}
                              visible={showSuccessMessage}
                              onClose={() => setShowSuccessMessage(false)}
                            >
                              <Button
                                onClick={(e) => {
                                  e.preventDefault();
                                  // Check if athlete is on all boards
                                  const isOnAllBoards = boardsAthleteIsOn.length === availableBoards.length && availableBoards.length > 0;
                                  if (isOnAllBoards) return;
                                  
                                  // If multiple boards, show dropdown to select
                                  if (availableBoards.length > 1) {
                                    setIsBoardModalVisible(!isBoardModalVisible);
                                  } else {
                                    // If single board and not on it, add directly
                                    if (userDetails && activeCustomerId && boardsAthleteIsOn.length === 0) {
                                      handleAddToRecruitingBoard();
                                    }
                                  }
                                }}
                                type="primary"
                                disabled={boardsAthleteIsOn.length === availableBoards.length && availableBoards.length > 0 || isAddingToRecruitingBoard}
                                loading={isAddingToRecruitingBoard}
                                className={boardsAthleteIsOn.length === availableBoards.length && availableBoards.length > 0 ? 'cursor-not-allowed hover:cursor-not-allowed' : ''}
                              >
                                <i className={`icon-user text-[16px] ${boardsAthleteIsOn.length === availableBoards.length && availableBoards.length > 0 ? 'text-gray-400' : 'text-white'}`}></i>{" "}
                                {boardsAthleteIsOn.length === availableBoards.length && availableBoards.length > 0 
                                  ? 'On All Boards' 
                                  : boardsAthleteIsOn.length > 0 
                                    ? `On ${boardsAthleteIsOn.length} of ${availableBoards.length} Boards`
                                    : 'Add to Recruiting Board'}
                              </Button>
                            </SuccessPopover>
                            
                            {/* Board dropdown appears below button when multiple boards */}
                            {availableBoards.length > 1 && isBoardModalVisible && (
                              <div style={{ position: 'relative', width: '100%' }}>
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
                                  athleteId={actualAthleteId || undefined}
                                  placement="bottomRight"
                                  simpleMode={true}
                                />
                              </div>
                            )}
                          </Flex>
                        </Flex>
                        <h1>
                          {!athlete ? (
                            <Skeleton.Input
                              active
                              size="large"
                              style={{ width: 200 }}
                            />
                          ) : (
                            <>
                              {athlete?.first_name && athlete?.last_name
                                ? `${athlete.first_name} ${athlete.last_name}`
                                : "Loading..."}
                              <span className="rating">
                                {rating && (
                                  <div className="flex items-center">
                                    <div
                                      className="mr-2 flex items-center justify-center"
                                      style={{
                                        width: 18,
                                        height: 18,
                                        backgroundColor: ratingColor || "#000000",
                                      }}
                                    >
                                      <StarFilled
                                        style={{ color: "#fff", fontSize: 14 }}
                                      />
                                    </div>
                                    <span>{rating}</span>
                                  </div>
                                )}
                                <Link href="/" onClick={handleRatingClick}>
                                  <img src="/edit-pancil.svg"></img>
                                </Link>
                                {hasAdminAccess && (
                                  <Link href="/" onClick={handleCopyAthleteId} style={{ marginLeft: '8px' }}>
                                    <CopyOutlined style={{ fontSize: '16px', color: '#666' }} />
                                  </Link>
                                )}
                              </span>
                            </>
                          )}
                        </h1>
                        
                        <div className="arrow-bg">
                          <div className="arrow-gray">
                            <h5
                              className="name"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {!athlete ? (
                                <Skeleton.Input
                                  active
                                  size="small"
                                  style={{ width: 150 }}
                                />
                              ) : (
                                <>
                                  {athlete?.school_logo_url &&
                                    athlete.school_logo_url.trim() !== "" && (
                                      <Image
                                        src={athlete.school_logo_url}
                                        alt="Current school logo"
                                        width={20}
                                        height={20}
                                        style={{ objectFit: "contain" }}
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                      />
                                    )}
                                  {athlete?.school?.name || ""}
                                </>
                              )}
                            </h5>
                          </div>
                          <div className="ml-2">
                            <img src="/arrow-2.svg"></img>
                          </div>
                          <div
                            className="arrow-green"
                            style={{ marginLeft: "110px", padding: "8px 15px" }}
                          >
                            <h5
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              {!athlete ? (
                                <Skeleton.Input
                                  active
                                  size="small"
                                  style={{ width: 100 }}
                                />
                              ) : (
                                <>
                                  {athlete?.commit_school_logo_url &&
                                    athlete.commit_school_logo_url.trim() !== "" && (
                                      <Image
                                        src={athlete.commit_school_logo_url}
                                        alt="Commit school logo"
                                        width={20}
                                        height={20}
                                        style={{ objectFit: "contain" }}
                                        onError={(e) => {
                                          e.currentTarget.style.display = "none";
                                        }}
                                      />
                                    )}
                                  {athlete?.details_tp_page?.[0]?.commit_school_name || ""}
                                </>
                              )}
                            </h5>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-0 career-info mt-4">
                          {!athlete ? (
                            <>
                              {[...Array(6)].map((_, index) => (
                                <div key={index}>
                                  <h6>
                                    <Skeleton.Input
                                      active
                                      size="small"
                                      style={{ width: 120 }}
                                    />
                                  </h6>
                                  <h5>
                                    <Skeleton.Input
                                      active
                                      size="small"
                                      style={{ width: 150 }}
                                    />
                                  </h5>
                                </div>
                              ))}
                            </>
                          ) : (
                            <>
                              {dataSource !== 'all_athletes' && formatDate(athlete?.initiated_date) !== "-- na --" && (
                                <div>
                                  <h6>Entered Portal On</h6>
                                  <h5>{formatDate(athlete?.initiated_date)}</h5>
                                </div>
                              )}

                              {dataSource === 'juco' ? (
                                <>
                                  <div>
                                    <h6>School Region</h6>
                                    <h5>
                                      {athlete?.school_region || "-- na --"}
                                    </h5>
                                  </div>

                                  <div>
                                    <h6>School Division</h6>
                                    <h5>
                                      {athlete?.school_division || "-- na --"}
                                    </h5>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <h6>Coming From</h6>
                                    <h5>
                                      {athlete?.school &&
                                      [
                                        athlete.school.division,
                                        athlete.school.conference,
                                      ]
                                        .filter(Boolean)
                                        .join(" - ")
                                        ? [
                                            athlete.school.division,
                                            athlete.school.conference,
                                          ]
                                            .filter(Boolean)
                                            .join(" - ")
                                        : ""}
                                    </h5>
                                  </div>

                              {dataSource !== 'all_athletes' && (
                                <>
                                  {athlete?.details_tp_page?.[0]?.expected_grad_date && (
                                    <div>
                                      <h6>Grad Transfer</h6>
                                      <h5 className="flex">
                                        <Image
                                          className="mr-1"
                                          src="/tick.svg"
                                          alt="Tick"
                                          width={20}
                                          height={20}
                                        />
                                        Yes - {formatDate(athlete.details_tp_page[0].expected_grad_date)}
                                      </h5>
                                    </div>
                                  )}

                                  <div>
                                    <h6>Scholarship</h6>
                                    <h5>
                                      {(() => {
                                        // Prioritize athlete_fact scholarship value over details_tp_page
                                        const athleteFactScholarship = (athlete?.generic_survey?.[0] as any)?.scholarship_from_fact;
                                        const detailsTpPageScholarship = athlete?.details_tp_page?.[0]?.is_receiving_athletic_aid;
                                        
                                        // If athlete_fact has a value, use it directly without conversion
                                        if (athleteFactScholarship && athleteFactScholarship.trim() !== "") {
                                          return athleteFactScholarship;
                                        }
                                        
                                        // Otherwise, use the converted value from details_tp_page
                                        return detailsTpPageScholarship || "";
                                      })()}
                                    </h5>
                                  </div>

                                  <div>
                                    <h6>Multiple Transfer</h6>
                                    <h5 className="flex mb-0">
                                      {athlete?.details_tp_page?.[0]?.is_four_year_transfer ? (
                                        <>
                                          <Image
                                            className="mr-1"
                                            src={"/tick.svg"}
                                            alt={"Tick"}
                                            width={20}
                                            height={20}
                                          />
                                          Yes{athlete?.details_tp_page?.[0]?.previous_name ? ` - ${athlete.details_tp_page[0].previous_name}` : ""}
                                        </>
                                      ) : (
                                        "No"
                                      )}
                                    </h5>
                                  </div>
                                  
                                  <div>
                                    <h6>Designated Student Athlete</h6>
                                    <h5 className="flex mb-0">
                                      {(() => {
                                        const value = athlete?.main_tp_page?.[0]?.designated_student_athlete;
                                        if (value === "") return "No";
                                        if (value == null) return "";
                                        return value;
                                      })()}
                                    </h5>
                                  </div>
                                </>
                              )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="gray-scale">
                    <div className="grid grid-cols-1 gap-4 h-full">
                      <div className="card progress" style={{ position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(200, 200, 200, 0.7)",
                            zIndex: 1,
                            pointerEvents: "none",
                          }}
                        ></div>
                        <h5>Player Statistics</h5>
                        {!athlete ? (
                          <>
                            {[...Array(4)].map((_, index) => (
                              <div key={index} className="mt-2">
                                <div className="flex items-center justify-between">
                                  <Skeleton.Input
                                    active
                                    size="small"
                                    style={{ width: 50 }}
                                  />
                                  <Skeleton.Input
                                    active
                                    size="small"
                                    style={{ width: 100 }}
                                  />
                                </div>
                                <Skeleton.Input
                                  active
                                  size="small"
                                  style={{ width: "100%", height: 26 }}
                                />
                              </div>
                            ))}
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mt-2">
                              <span>Stat 1</span>
                              <span>25 <small>16TH</small></span>
                            </div>
                            <Progress
                              percent={0}
                              size={["100%", 26]}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="success"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span>Stat 2</span>
                              <span>6 <small>TIED - 21ST</small></span>
                            </div>
                            <Progress
                              percent={0}
                              size={["100%", 26]}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="error"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span>Stat 3</span>
                              <span>8 <small>TIED - 69TH</small></span>
                            </div>
                            <Progress
                              percent={0}
                              size={["100%", 26]}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="warning"
                            />
                            <div className="flex items-center justify-between mt-2">
                              <span>Stat 4</span>
                              <span>61.0 <small>11TH</small></span>
                            </div>
                            <Progress
                              percent={0}
                              size={["100%", 26]}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="success"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <PlayerInformation athlete={athlete} dataSource={dataSource} />
              </div>
            </div>
          </div>
        </Flex>
      </div>

      <Modal
        title="Rate Athlete"
        open={isRatingModalOpen}
        onOk={handleRatingSubmit}
        onCancel={() => setIsRatingModalOpen(false)}
      >
        <Select
          style={{ width: "100%" }}
          placeholder="Select a rating"
          value={selectedRatingId}
          onChange={(value) => setSelectedRatingId(value)}
          options={ratings.map((rating) => ({
            value: rating.id,
            label: (
              <div className="flex items-center">
                <div
                  className="mr-2 w-4 h-4"
                  style={{ backgroundColor: rating.color }}
                />
                <span>{rating.name}</span>
              </div>
            ),
          }))}
        />
      </Modal>

    </div>
  );
}