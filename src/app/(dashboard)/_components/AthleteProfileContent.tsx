"use client";

import { useState, useEffect } from "react";
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
import TwitterEmbed from "./TwitterEmbed";
import { supabase } from "@/lib/supabaseClient";
import { fetchCustomerRatings, type CustomerRating } from "@/utils/utils";
import {
  useUser,
  useCustomer,
  useUserSafely,
} from "@/contexts/CustomerContext";
import { StarFilled, CopyOutlined } from "@ant-design/icons";
import { useZoom } from "@/contexts/ZoomContext";

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
}

export default function AthleteProfileContent({ 
  athleteId, 
  mainTpPageId,
  onAddToBoard,
  isInModal = false 
}: AthleteProfileContentProps) {
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
  const [isLoadingRecruitingBoard, setIsLoadingRecruitingBoard] = useState(false);
  const { activeCustomerId } = useCustomer();
  const { userDetails } = useUserSafely();
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const { zoom } = useZoom();
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

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
    if (actualAthleteId) {
      const loadAthleteData = async () => {
        try {
          const { fetchAthleteById } = await import("@/lib/queries");
          const data = await fetchAthleteById(actualAthleteId, userDetails?.packages);
          if (data) {
            console.log("Athlete data:", data);
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
  }, [actualAthleteId, userDetails?.packages]);

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
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from("recruiting_board")
        .select("athlete_id");

      if (error) {
        return;
      }

      const athleteIds = data.map(
        (item: { athlete_id: string }) => item.athlete_id
      );
      setRecruitingBoardAthletes(athleteIds);
    } catch (error) {
    } finally {
      setIsLoadingRecruitingBoard(false);
    }
  };

  // Call this function when the component mounts and when the session changes
  useEffect(() => {
    if (session?.user?.id) {
      fetchRecruitingBoardAthletes();
    }
  }, [session]);

  const handleAddToRecruitingBoard = async () => {
    if (onAddToBoard) {
      onAddToBoard();
      return;
    }

    if (!athlete) {
      alert("No athlete selected.");
      return;
    }

    setIsAddingToRecruitingBoard(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        alert("You must be logged in to add athletes to the recruiting board.");
        return;
      }

      const userId = session.user.id;

      if (!userDetails) {
        console.error("No user details found for user ID:", userId);
        alert(
          "No user details found. Please make sure your account is properly set up."
        );
        return;
      }

      const { data: insertData, error: insertError } = await supabase
        .from("recruiting_board")
        .insert({
          athlete_id: athlete.id,
          user_id: userId,
          customer_id: userDetails.customer_id,
          position: athlete?.primary_position || "Unassigned",
        })
        .select();

      if (insertError) {
        console.error("Error adding athlete to recruiting board:", insertError);
        alert(
          `Error adding athlete to recruiting board: ${
            insertError.message || "Unknown error"
          }`
        );
        return;
      }

      alert("Successfully added athlete to your recruiting board.");
      setRecruitingBoardAthletes((prev) => [...prev, athlete.id]);
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

  const handleRatingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRatingModalOpen(true);
  };

  const handleCopyAthleteId = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (actualAthleteId) {
      try {
        await navigator.clipboard.writeText(actualAthleteId);
        // You could add a toast notification here if desired
        console.log('Athlete ID copied to clipboard:', actualAthleteId);
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

  return (
    <div className="w-full h-full overflow-auto">
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
                      <li>
                        <i className="icon-profile-2user"></i>{" "}
                        {!athlete ? (
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        ) : (
                          `${athlete?.primary_position || "-- na --"}${
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
                          }`
                        )}
                      </li>
                      <li>
                        <i className="icon-calendar-1"></i>{" "}
                        {!athlete ? (
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        ) : (
                          athlete?.year || "-- na --"
                        )}
                      </li>
                      <li>
                        <i className="icon-receipt-item"></i>{" "}
                        {!athlete ? (
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        ) : athlete?.height_feet ? (
                          `${athlete.height_feet}'${athlete.height_inch}"${
                            athlete.weight ? `, ${athlete.weight} lbs` : ""
                          }`
                        ) : (
                          "-- na --"
                        )}
                      </li>
                      <li>
                        <i className="icon-location"></i>{" "}
                        {!athlete ? (
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        ) : (
                          [athlete?.hometown, athlete?.hometown_state]
                            .filter(Boolean)
                            .join(", ") || "-- na --"
                        )}
                      </li>
                      <li>
                        <i className="icon-teacher"></i>{" "}
                        {!athlete ? (
                          <Skeleton.Input
                            active
                            size="small"
                            style={{ width: 100 }}
                          />
                        ) : (
                          athlete?.high_name || "-- na --"
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="card">
                  <h4 className="mb-4 !text-[22px]">Profile Links</h4>
                  <div className="flex flex-col gap-1">
                    {athlete?.roster_link && (
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
                    {athlete?.hs_highlight && (
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
                    {athlete?.highlight && (
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
                    {athlete?.tfrrs_link && (
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
                  </div>
                </div>
                
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
                        <span>{athlete?.first_name} {athlete?.last_name}</span>
                        <h1>@{athlete?.twitter}</h1>
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
                            {!athlete ? (
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
                            )}
                          </Flex>
                          <Flex>
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddToRecruitingBoard();
                              }}
                              disabled={recruitingBoardAthletes.includes(athlete?.id || "")}
                            >
                              <i className="icon-user text-white text-[16px]"></i>{" "}
                              Add to Board
                            </Button>
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
                              {formatDate(athlete?.initiated_date) !== "-- na --" && (
                                <div>
                                  <h6>Entered Portal On</h6>
                                  <h5>{formatDate(athlete?.initiated_date)}</h5>
                                </div>
                              )}

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
                                    : "-- na --"}
                                </h5>
                              </div>

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
                                  {athlete?.details_tp_page?.[0]?.is_receiving_athletic_aid
                                    ? "Yes"
                                    : athlete?.details_tp_page?.[0]?.is_receiving_athletic_aid
                                    ? "No"
                                    : "-- na --"}
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
                                      Yes - {athlete?.details_tp_page?.[0]?.previous_name || "-- na --"}
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
                              <span>Goals</span>
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
                              <span>GS</span>
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
                              <span>GP</span>
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
                              <span>PTS</span>
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
                <PlayerInformation athlete={athlete} />
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