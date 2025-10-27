"use client";

import { useState, useEffect } from "react";
import type { AthleteData } from "@/types/database";
import {
  Button,
  Flex,
  Skeleton,
  Modal,
  Select,
  Divider,
} from "antd";
import PlayerInformation from "./PlayerInformation";
import Image from "next/image";
import Link from "next/link";
import { StarFilled, CopyOutlined } from "@ant-design/icons";
import { supabase } from "@/lib/supabaseClient";
import { fetchCustomerRatings, type CustomerRating } from "@/utils/utils";
import {
  useCustomer,
  useUserSafely,
} from "@/contexts/CustomerContext";

const formatDate = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "-- na --";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

interface MobileAthleteProfileContentProps {
  athleteId?: string;
  mainTpPageId?: string;
  onAddToBoard?: () => void;
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null;
}

export default function MobileAthleteProfileContent({
  athleteId,
  mainTpPageId,
  onAddToBoard,
  dataSource = null
}: MobileAthleteProfileContentProps) {
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [actualAthleteId, setActualAthleteId] = useState<string | null>(null);
  const [rating, setRating] = useState<string | null>(null);
  const [ratingColor, setRatingColor] = useState<string | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedRatingId, setSelectedRatingId] = useState<number | null>(null);
  const [session, setSession] = useState<any>(null);
  const [recruitingBoardAthletes, setRecruitingBoardAthletes] = useState<string[]>([]);
  const [isLoadingRecruitingBoard, setIsLoadingRecruitingBoard] = useState(false);
  const { activeCustomerId } = useCustomer();
  const { userDetails } = useUserSafely();
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Effect to resolve athlete ID from main_tp_page_id if needed
  useEffect(() => {
    const resolveAthleteId = async () => {
      if (mainTpPageId) {
        const { getAthleteIdFromMainTpPageId } = await import('@/lib/queries');
        const resolvedAthleteId = await getAthleteIdFromMainTpPageId(mainTpPageId);
        if (resolvedAthleteId) {
          setActualAthleteId(resolvedAthleteId);
        }
      } else if (athleteId) {
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

            if (!ratingError && ratingData && ratingData.length > 0) {
              const ratingScale = ratingData[0].customer_rating_scale as unknown as { name: string; color: string } | null;
              setRating(ratingScale?.name || null);
              setRatingColor(ratingScale?.color || null);
            }
          }
        } catch (error) {
          console.error("Error fetching athlete:", error);
        }
      };

      loadAthleteData();
    }
  }, [actualAthleteId, userDetails?.packages, dataSource]);

  // Fetch recruiting board athletes
  useEffect(() => {
    const fetchRecruitingBoardAthletes = async () => {
      if (!session?.user?.id || !userDetails?.customer_id) return;

      try {
        setIsLoadingRecruitingBoard(true);
        const { data, error } = await supabase
          .from("recruiting_board")
          .select("athlete_id")
          .eq("customer_id", userDetails.customer_id);

        if (!error && data) {
          const athleteIds = data.map((item: { athlete_id: string }) => item.athlete_id);
          setRecruitingBoardAthletes(athleteIds);
        }
      } catch (error) {
        console.error("Error fetching recruiting board athletes:", error);
      } finally {
        setIsLoadingRecruitingBoard(false);
      }
    };

    if (session?.user?.id && userDetails?.customer_id) {
      fetchRecruitingBoardAthletes();
    }
  }, [session, userDetails]);

  // Handle adding athlete to recruiting board
  const handleAddToRecruitingBoard = async () => {
    if (!athlete) return;

    try {
      if (!userDetails || !activeCustomerId) {
        alert("You must be logged in to add athletes to the recruiting board.");
        return;
      }

      const recruitingBoardEntry = {
        athlete_id: athlete.id,
        user_id: userDetails.id,
        customer_id: activeCustomerId,
        position: 'Unassigned',
        source: dataSource === 'transfer_portal' ? 'portal' : 
                dataSource === 'juco' ? 'juco' : 
                dataSource === 'all_athletes' ? 'pre-portal' : null
      };

      const { error: insertError } = await supabase
        .from('recruiting_board')
        .insert(recruitingBoardEntry);

      if (insertError) {
        alert(`Error adding athlete to recruiting board: ${insertError.message || 'Unknown error'}`);
        return;
      }

      alert(`Successfully added athlete to your recruiting board.`);
      setRecruitingBoardAthletes(prev => [...prev, athlete.id]);
    } catch (error) {
      console.error("Error adding to recruiting board:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  // Handle rating modal
  const handleRatingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRatingModalOpen(true);
  };

  const handleRatingSubmit = async () => {
    if (!athlete?.id || !selectedRatingId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !userDetails) return;

      const { error } = await supabase.from("athlete_rating").insert({
        athlete_id: athlete.id,
        customer_rating_scale_id: selectedRatingId,
        user_id: user.id,
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

  // Fetch ratings
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
    <div className="w-full min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white shadow-sm">
        <div className="px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {dataSource !== 'all_athletes' && athlete?.main_tp_page?.[0]?.status ? (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    athlete.main_tp_page[0].status.toLowerCase() === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {athlete.main_tp_page[0].status}
                </span>
              ) : (
                <div className="mr-2"></div>
              )}
              {rating && (
                <div className="flex items-center">
                  <div
                    className="w-5 h-5 flex items-center justify-center rounded"
                    style={{ backgroundColor: ratingColor || "#000000" }}
                  >
                    <StarFilled style={{ color: "#fff", fontSize: 12 }} />
                  </div>
                  <span className="ml-1 text-sm">{rating}</span>
                </div>
              )}
            </div>
            <Button
              onClick={handleAddToRecruitingBoard}
              type="primary"
              size="small"
              disabled={recruitingBoardAthletes.includes(athlete?.id || "")}
            >
              {recruitingBoardAthletes.includes(athlete?.id || "") 
                ? 'On Board' 
                : 'Add to Board'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4">
        {/* Profile Image and Basic Info */}
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="p-4">
            <div className="flex items-center">
              <div className="relative w-24 h-24 mr-4">
                {!athlete ? (
                  <Skeleton.Image active style={{ width: 96, height: 96 }} />
                ) : (
                  <Image
                    src={athlete?.image_url || "/plyer-b.png"}
                    alt={`${athlete?.first_name} ${athlete?.last_name}`}
                    width={96}
                    height={96}
                    className="rounded-lg object-cover"
                  />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {athlete ? `${athlete.first_name} ${athlete.last_name}` : <Skeleton.Input active />}
                </h1>
                <p className="text-gray-600">
                  {athlete?.primary_position}
                  {athlete?.secondary_position ? `, ${athlete.secondary_position}` : ""}
                  {athlete?.hand ? ` (${athlete.hand.charAt(0).toUpperCase() + athlete.hand.slice(1).toLowerCase()})` : ""}
                </p>
                <p className="text-gray-600">{athlete?.year}</p>
              </div>
            </div>
          </div>

          <Divider style={{ margin: '0.5rem 0' }} />

          {/* School Information */}
          <div className="p-4">
            <div className="flex flex-col">
              <div className="flex items-center mb-2">
                {athlete?.school_logo_url && (
                  <Image
                    src={athlete.school_logo_url}
                    alt="Current school"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                )}
                <span className="font-medium">{athlete?.school?.name}</span>
              </div>
              
              {athlete?.details_tp_page?.[0]?.commit_school_name && (
                <>
                  <div className="flex justify-center my-1">
                    <span className="text-gray-500 text-lg">↓</span>
                  </div>
                  <div className="flex items-center bg-blue-50 p-2 rounded">
                    {athlete?.commit_school_logo_url && (
                      <Image
                        src={athlete.commit_school_logo_url}
                        alt="Commit school"
                        width={20}
                        height={20}
                        className="mr-2"
                      />
                    )}
                    <span className="font-medium">{athlete.details_tp_page[0].commit_school_name}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Key Details */}
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-3">Key Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {dataSource !== 'all_athletes' && athlete?.initiated_date && (
                <div>
                  <p className="text-gray-500 text-sm">Portal Entry</p>
                  <p className="font-medium">{formatDate(athlete.initiated_date)}</p>
                </div>
              )}
              {athlete?.school?.division && (
                <div>
                  <p className="text-gray-500 text-sm">Division</p>
                  <p className="font-medium">{athlete.school.division}</p>
                </div>
              )}
              {athlete?.height_feet && (
                <div>
                  <p className="text-gray-500 text-sm">Height/Weight</p>
                  <p className="font-medium">
                    {`${athlete.height_feet}'${athlete.height_inch}"${
                      athlete.weight ? `, ${athlete.weight} lbs` : ""
                    }`}
                  </p>
                </div>
              )}
              {(athlete?.hometown || athlete?.hometown_state) && (
                <div>
                  <p className="text-gray-500 text-sm">Hometown</p>
                  <p className="font-medium">
                    {[athlete.hometown, athlete.hometown_state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Information Tabs */}
        <div className="bg-white rounded-lg shadow mb-4">
          <div className="px-0 py-2">
            <style jsx global>{`
              /* Mobile-specific styles */
              @media (max-width: 768px) {
                /* Hide disabled tabs completely */
                .player-information .ant-tabs-tab.ant-tabs-tab-disabled {
                  display: none !important;
                }
                .player-information .ant-tabs-nav {
                  margin-bottom: 8px !important;
                }
                .player-information .ant-tabs-tab {
                  padding: 8px 12px !important;
                  margin: 0 4px !important;
                  font-size: 14px !important;
                }
                /* Compact stats layout */
                .player-information .ant-table {
                  font-size: 11px !important;
                  line-height: 1.2 !important;
                  white-space: nowrap !important;
                }
                .player-information .ant-table-thead > tr > th {
                  padding: 4px !important;
                  font-size: 11px !important;
                  font-weight: 600 !important;
                  background: #fafafa !important;
                  text-align: center !important;
                  white-space: nowrap !important;
                }
                .player-information .ant-table-tbody > tr > td {
                  padding: 4px !important;
                  text-align: center !important;
                }
                /* Hide team column */
                .player-information .ant-table-cell:nth-child(2),
                .player-information .ant-table-thead > tr > th:nth-child(2) {
                  display: none !important;
                }
                /* Make table horizontally scrollable */
                .player-information .ant-table-content {
                  overflow-x: auto !important;
                  -webkit-overflow-scrolling: touch !important;
                }
                .player-information table {
                  width: auto !important;
                  min-width: 100% !important;
                }
                /* Style for Career row */
                .player-information .ant-table-row[data-row-key*="Career"] {
                  font-weight: 600 !important;
                  background: #fafafa !important;
                }
                /* Adjust column widths */
                .player-information .ant-table-cell {
                  min-width: 40px !important;
                }
                .player-information .ant-table-cell:first-child {
                  min-width: 50px !important;
                  position: sticky !important;
                  left: 0 !important;
                  background: white !important;
                  z-index: 1 !important;
                }
                /* Fix table scroll */
                .player-information .ant-table-body {
                  overflow: visible !important;
                }
                .player-information .ant-table-ping-left:not(.ant-table-has-fix-left) 
                .ant-table-container::before {
                  box-shadow: none !important;
                }
                .player-information .ant-table-cell {
                  background: white !important;
                }
                /* Bio styles */
                .player-information .bio .grid {
                  grid-template-columns: 1fr !important;
                }
                .player-information .bio h4 {
                  font-size: 18px !important;
                  margin-bottom: 12px !important;
                }
                .player-information .bio h6 {
                  font-size: 13px !important;
                }
                .player-information .bio h5 {
                  font-size: 14px !important;
                }
                /* Survey styles */
                .player-information .survey h4 {
                  font-size: 18px !important;
                  margin-bottom: 12px !important;
                }
                .player-information .survey h6 {
                  font-size: 13px !important;
                }
                .player-information .survey p {
                  font-size: 14px !important;
                }
                /* Add padding to the content */
                .player-information .ant-tabs-content {
                  padding: 0 12px !important;
                }
                /* Show all rows */
                .player-information .ant-table-row {
                  display: table-row !important;
                }
              }
            `}</style>
            <PlayerInformation 
              athlete={athlete} 
              dataSource={dataSource}
            />
          </div>
        </div>

        {/* Profile Links */}
        {athlete && (athlete.roster_link || athlete.highlight || athlete.stats_link) && (
          <div className="bg-white rounded-lg shadow mb-4">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3">Profile Links</h2>
              <div className="flex flex-col gap-2">
                {athlete.roster_link && (
                  <a
                    href={athlete.roster_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Roster Page
                  </a>
                )}
                {athlete.highlight && (
                  <a
                    href={athlete.highlight}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Highlight Tape
                  </a>
                )}
                {athlete.stats_link && (
                  <a
                    href={athlete.stats_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Stats
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
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
