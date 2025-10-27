"use client";

import { useState, useEffect } from "react";
import { Button, Dropdown, Flex, MenuProps, Select, Switch, Typography, Modal } from "antd";
import Image from "next/image";
import Link from "next/link";
import ImageWithAverage from "../_components/ImageWithAverage";
import CommentBox from "../_components/CommentBox";
import { fetchAthleteById } from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { fetchCustomerRatings, type CustomerRating, fetchUsersForCustomer } from "@/utils/utils";
import { useCustomer } from '@/contexts/CustomerContext';
import { StarFilled } from '@ant-design/icons';
import type { AthleteData } from '@/types/database';

interface PlayerEditModalProps {
  athleteId?: string;
  athleteData?: any; // Recruiting board data
  onClose?: () => void; // Called after save or cancel
}

const formatDate = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return 'Not Available';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric'
  });
};

export default function PlayerEditModal({ athleteId, athleteData, onClose }: PlayerEditModalProps) {
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [rating, setRating] = useState<string | null>(null);
  const [ratingColor, setRatingColor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState<CustomerRating[]>([]);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedRatingId, setSelectedRatingId] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<Array<{ id: string; name_first: string; name_last: string }>>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [currentCoachId, setCurrentCoachId] = useState<string | null>(null);
  const [recruitingBoardPosition, setRecruitingBoardPosition] = useState<string | null>(null);
  const { activeCustomerId, userDetails } = useCustomer();

  // Form state for editing - including tier and source
  const [formData, setFormData] = useState({
    tier: '1',
    source: ''
  });

  const handleChange = (value: string, field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch athlete data from database
  useEffect(() => {
    const loadAthleteData = async () => {
      if (!athleteId) return;
      
      setLoading(true);
      try {
        const data = await fetchAthleteById(athleteId, userDetails?.packages);
        if (data) {
          setAthlete(data);
          
          // Fetch the latest rating for this athlete
          const { data: ratingData, error: ratingError } = await supabase
            .from('athlete_rating')
            .select(`
              customer_rating_scale_id,
              created_at,
              customer_rating_scale:customer_rating_scale_id(name, color)
            `)
            .eq('athlete_id', athleteId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (ratingError) {
            console.error('Error fetching rating:', ratingError);
          } else if (ratingData && ratingData.length > 0) {
            const ratingScale = ratingData[0].customer_rating_scale as unknown as { name: string; color: string } | null;
            setRating(ratingScale?.name || null);
            setRatingColor(ratingScale?.color || null);
            setSelectedRatingId(ratingData[0].customer_rating_scale_id?.toString() || null);
          }

          // Fetch current coach assignment and position from recruiting board
          const { data: recruitingBoardData, error: recruitingBoardError } = await supabase
            .from('recruiting_board')
            .select('user_id, athlete_tier, position, source')
            .eq('athlete_id', athleteId)
            .eq('customer_id', activeCustomerId)
            .single();

          if (!recruitingBoardError && recruitingBoardData) {
            setCurrentCoachId(recruitingBoardData.user_id);
            setSelectedCoachId(recruitingBoardData.user_id);
            setRecruitingBoardPosition(recruitingBoardData.position || null);
            // Initialize form data with athlete data including tier and source
            setFormData({
              tier: recruitingBoardData.athlete_tier || "", // Use stored tier or empty string for no tier
              source: recruitingBoardData.source || "" // Use stored source or empty string for no source
            });
          } else {
            setRecruitingBoardPosition(null);
            // Initialize form data with default values if no recruiting board entry found
            setFormData({
              tier: "", // Default to no tier
              source: "" // Default to no source
            });
          }
        }
      } catch (error) {
        console.error('Error fetching athlete:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAthleteData();
  }, [athleteId, activeCustomerId]);

  // Fetch customer ratings
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

  // Fetch coaches from the same school
  useEffect(() => {
    const loadCoaches = async () => {
      if (activeCustomerId) {
        try {
          const coachesData = await fetchUsersForCustomer(activeCustomerId);
          setCoaches(coachesData);
        } catch (error) {
          console.error('Error loading coaches:', error);
        }
      }
    };
    loadCoaches();
  }, [activeCustomerId]);

  // Handle rating submission
  const handleRatingSubmit = async () => {
    if (!athlete?.id || !selectedRatingId) return;

    try {
      // Get the current user's details
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const { error } = await supabase
        .from('athlete_rating')
        .insert({
          athlete_id: athlete.id,
          customer_rating_scale_id: selectedRatingId,
          user_id: user?.id,
          customer_id: activeCustomerId
        });

      if (error) throw error;

      // Find the selected rating details to update the display
      const selectedRatingDetails = ratings.find(r => r.id === selectedRatingId);
      if (selectedRatingDetails) {
        setRating(selectedRatingDetails.name);
        setRatingColor(selectedRatingDetails.color);
      }

      setIsRatingModalOpen(false);
    } catch (error) {
      console.error('Error submitting rating:', error);
    }
  };

  // Handle coach assignment change
  const handleCoachChange = (coachId: string) => {
    setSelectedCoachId(coachId);
  };

  // Handle rating dropdown change (no immediate save)
  const handleRatingChange = (ratingId: string) => {
    setSelectedRatingId(ratingId);
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!athleteId || !activeCustomerId) return;

    try {
      // Save rating if changed
      // Get the current rating ID from the database to compare
      const { data: currentRatingData } = await supabase
        .from('athlete_rating')
        .select('customer_rating_scale_id')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false })
        .limit(1);

      const currentRatingId = currentRatingData?.[0]?.customer_rating_scale_id?.toString();
      
      if (selectedRatingId && selectedRatingId !== currentRatingId) {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const { error: ratingError } = await supabase
          .from('athlete_rating')
          .insert({
            athlete_id: athleteId,
            customer_rating_scale_id: selectedRatingId,
            user_id: user?.id,
            customer_id: activeCustomerId
          });

        if (ratingError) throw ratingError;

        // Update the rating display
        const selectedRatingDetails = ratings.find(r => r.id === selectedRatingId);
        if (selectedRatingDetails) {
          setRating(selectedRatingDetails.name);
          setRatingColor(selectedRatingDetails.color);
        }
      }

      // Save coach assignment if changed
      if (selectedCoachId && selectedCoachId !== currentCoachId) {
        const { error: coachError } = await supabase
          .from('recruiting_board')
          .update({ user_id: selectedCoachId })
          .eq('athlete_id', athleteId)
          .eq('customer_id', activeCustomerId);

        if (coachError) throw coachError;
        setCurrentCoachId(selectedCoachId);
      }

      // Save tier and source if changed
      const tierValue = formData.tier === "" ? null : formData.tier;
      const sourceValue = formData.source === "" ? null : formData.source;
      const { error: updateError } = await supabase
        .from('recruiting_board')
        .update({ 
          athlete_tier: tierValue,
          source: sourceValue
        })
        .eq('athlete_id', athleteId)
        .eq('customer_id', activeCustomerId);

      if (updateError) throw updateError;

      // Show success message
      alert('Changes saved successfully!');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        athleteId,
        activeCustomerId,
        selectedRatingId,
        selectedCoachId,
        currentCoachId
      });
      alert('Error saving changes. Please try again.');
    }
  };

  const handleRatingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRatingModalOpen(true);
  };

  // Get athlete facts for additional details
  const getAthleteFact = (dataTypeId: number): string => {
    if (!athlete) return 'N/A';
    
    // This would need to be implemented based on your athlete_fact table structure
    // For now, returning placeholder values
    switch (dataTypeId) {
      case 7: return athlete.high_name || 'N/A'; // High school
      case 4: return athlete.height_feet ? 
        `${athlete.height_feet}'${athlete.height_inch}"` : 'N/A'; // Height
      case 6: return athlete.weight ? `${athlete.weight} lbs` : 'N/A'; // Weight
      case 24: return athlete.hometown_state || 'N/A'; // State
      default: return 'N/A';
    }
  };

  if (loading) {
    return (
      <div className="main-container">
        <div className="flex items-center justify-center h-[calc(100vh-155px)]">
          <div>Loading athlete data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <Flex vertical className="profile card">
        <div className="grid grid-cols-12 w-full mb-5 gap-4">
          <div className="col-span-4">
            <Flex vertical className="user-container">
              <ImageWithAverage
                src={athlete?.image_url || "/plyer-b.png"}
                alt="Survey Image"
                height={250}
                width={250}
                containerWidth="100%"
                average={athlete?.true_score || 0}
              />
              <Flex className="w-[100%]">
                <ul>
                  {/* Position as first item in the list, styled like the others */}
                  <li>
                    <i className="icon-user"></i> {recruitingBoardPosition || 'N/A'}
                  </li>
                  <li>
                    <i className="icon-teacher"></i> {getAthleteFact(7)}
                  </li>
                  <li>
                    <i className="icon-receipt-item"></i> {getAthleteFact(4)}, {getAthleteFact(6)}
                  </li>
                  <li>
                    <i className="icon-calendar-1"></i> {athlete?.year || 'N/A'}
                  </li>
                  <li>
                    <i className="icon-location"></i> {athlete?.hometown || 'N/A'}, {getAthleteFact(24)}
                  </li>
                </ul>
              </Flex>
            </Flex>
          </div>
          <div className="col-span-8">
            <Flex vertical>
              <Flex className="justify-between items-center">
                <Flex className="status">
                  <span className={`badge ${athlete?.main_tp_page?.[0]?.status?.toLowerCase() === 'active' ? 'status-active' : 'status-inactive'}`} style={{ backgroundColor: athlete?.main_tp_page?.[0]?.status?.toLowerCase() === 'active' ? '#52c41a' : '#ff4d4f' }}>
                    <i className={`icon-${athlete?.main_tp_page?.[0]?.status?.toLowerCase() === 'active' ? 'check-2' : 'close-circle'}`}></i>
                    {athlete?.main_tp_page?.[0]?.status || 'Unknown'}
                  </span>
                  {/* Hidden athlete ID - removed for cleaner UI */}
                  {/* <Typography.Text>ID {athlete?.id || 'N/A'}</Typography.Text> */}
                </Flex>
              </Flex>
              <Flex align="center" justify="space-between" className="mb-3">
              <Flex align="center">
                <Typography.Title
                  level={1}
                  className="uppercase italic primary mr-9"
                >
                  {athlete?.first_name && athlete?.last_name ? 
                    `${athlete.first_name} ${athlete.last_name}` : 
                    'Loading...'}
                </Typography.Title>
                <Typography.Text className="uppercase flex font-medium text-2xl gap-1">
                  {rating && ratingColor ? (
                    <div className="flex items-center">
                      <div
                        className="mr-1 flex items-center justify-center"
                        style={{
                          width: 22,
                          height: 22,
                          backgroundColor: ratingColor,
                        }}
                      >
                        <StarFilled style={{ color: '#fff', fontSize: 14 }} />
                      </div>
                      <span>{rating}</span>
                      {/* Hidden edit link - using dropdown instead */}
                      {/* <Link href="/" onClick={handleRatingClick} className="icon-edit-2 ml-2"></Link> */}
                    </div>
                  ) : (
                    <>
                      <Image
                        src={athlete?.true_score && athlete.true_score < 60 ? "/error-star.svg" : 
                             athlete?.true_score && athlete.true_score > 80 ? "/success-star.svg" : "/warning-star.svg"}
                        alt={""}
                        height={22}
                        width={22}
                      />
                      {athlete?.true_score || 'N/A'}
                      {/* Hidden edit link - using dropdown instead */}
                      {/* <Link href="/" onClick={handleRatingClick} className="icon-edit-2 ml-2"></Link> */}
                    </>
                  )}
                </Typography.Text>
              </Flex>
              <Flex>
                  <Button 
                    onClick={async () => {
                      if (athleteId) {
                        try {
                          const { getMainTpPageIdFromAthleteId } = await import('@/lib/queries');
                          const mainTpPageId = await getMainTpPageIdFromAthleteId(athleteId);
                          
                          if (mainTpPageId) {
                            // Use main_tp_page_id for the profile link
                            window.open(`/athlete-profile?main_tp_page_id=${mainTpPageId}`, '_blank', 'noopener,noreferrer');
                          } else {
                            // Fallback to athlete_id if main_tp_page_id not found
                            console.warn('No main_tp_page_id found for athlete, falling back to athlete_id');
                            window.open(`/athlete-profile?id=${athleteId}`, '_blank', 'noopener,noreferrer');
                          }
                        } catch (error) {
                          console.error('Error fetching main_tp_page_id:', error);
                          // Fallback to athlete_id on error
                          window.open(`/athlete-profile?id=${athleteId}`, '_blank', 'noopener,noreferrer');
                        }
                      }
                    }}
                  >
                    <Image src={"/arrow.svg"} alt={""} height={20} width={20} />
                    Profile
                  </Button>
                </Flex>
              </Flex>
              <div className="grid grid-cols-2 gap-5 selec-group">
                <Flex vertical>
                  <Typography.Text className="opacity-50 mb-1">
                    Rating
                  </Typography.Text>
                  <Select
                    placeholder="Select a rating"
                    value={selectedRatingId}
                    onChange={handleRatingChange}
                    options={ratings.map(rating => ({ 
                      value: rating.id,
                      label: (
                        <div className="flex items-center">
                          <div 
                            className="mr-2 w-4 h-4"
                            style={{ backgroundColor: rating.color }}
                          />
                          <span>{rating.name}</span>
                        </div>
                      )
                    }))}
                  />
                </Flex>
                <Flex vertical>
                  <Typography.Text className="opacity-50 mb-1">
                    Assigned Coach
                  </Typography.Text>
                  <Select
                    placeholder="Select a coach"
                    value={selectedCoachId}
                    onChange={handleCoachChange}
                    options={coaches.map(coach => ({ 
                      value: coach.id,
                      label: `${coach.name_first} ${coach.name_last}`
                    }))}
                  />
                </Flex>
                <Flex vertical>
                  <Typography.Text className="opacity-50 mb-1">
                    Tier
                  </Typography.Text>
                  <Select
                    value={formData.tier}
                    onChange={(value) => handleChange(value, 'tier')}
                    options={[
                      { value: "", label: "No Tier" },
                      { value: "1", label: "Tier 1" },
                      { value: "2", label: "Tier 2" },
                      { value: "3", label: "Tier 3" },
                    ]}
                  />
                </Flex>
                <Flex vertical>
                  <Typography.Text className="opacity-50 mb-1">
                    Source
                  </Typography.Text>
                  <Select
                    value={formData.source}
                    onChange={(value) => handleChange(value, 'source')}
                    options={[
                      { value: "", label: "No Source" },
                      { value: "juco", label: "JUCO" },
                      { value: "pre-portal", label: "Pre-Portal" },
                      { value: "portal", label: "Portal" },
                    ]}
                  />
                </Flex>
              </div>
            </Flex>
          </div>
          <div className="col-span-12 mt-4">
            <CommentBox rosterId={athleteId} />
          </div>
        </div>
        <Flex className="flex justify-center gap-2">
          <Button size="large" onClick={onClose}>Cancel</Button>
          <Button type="primary" size="large" onClick={handleSaveChanges}>
            Save Changes
          </Button>
        </Flex>
      </Flex>

      <Modal
        title="Rate Athlete"
        open={isRatingModalOpen}
        onOk={handleRatingSubmit}
        onCancel={() => setIsRatingModalOpen(false)}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Select a rating"
          value={selectedRatingId}
          onChange={handleRatingChange}
          options={ratings.map(rating => ({ 
            value: rating.id,
            label: (
              <div className="flex items-center">
                <div 
                  className="mr-2 w-4 h-4"
                  style={{ backgroundColor: rating.color }}
                />
                <span>{rating.name}</span>
              </div>
            )
          }))}
        />
      </Modal>
    </div>
  );
}
