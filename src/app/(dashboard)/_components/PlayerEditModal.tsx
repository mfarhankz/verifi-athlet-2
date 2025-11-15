"use client";

import { useState, useEffect } from "react";
import { Button, Dropdown, Flex, MenuProps, Select, Switch, Typography, Modal, Input, message, Tooltip } from "antd";
import Image from "next/image";
import Link from "next/link";
import ImageWithAverage from "../_components/ImageWithAverage";
import CommentBox from "../_components/CommentBox";
import { fetchAthleteById, getPackageIdsByType } from '@/lib/queries';
import { supabase } from '@/lib/supabaseClient';
import { fetchCustomerRatings, type CustomerRating, fetchUsersForCustomer } from "@/utils/utils";
import { useCustomer } from '@/contexts/CustomerContext';
import { StarFilled, InfoCircleOutlined } from '@ant-design/icons';
import type { AthleteData } from '@/types/database';
import { hasPackageAccess } from "@/utils/navigationUtils";

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

  // Player tracking state
  const [isEnterPortalNotificationOn, setIsEnterPortalNotificationOn] = useState(false);
  const [trackingAlertType, setTrackingAlertType] = useState<'email' | 'text' | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [hasTrackingAccess, setHasTrackingAccess] = useState(false);
  const [isPrePortalPlayer, setIsPrePortalPlayer] = useState(false);

  // Form state for editing - including tier, customer_position, and source
  const [formData, setFormData] = useState({
    tier: '1',
    customer_position: '',
    source: ''
  });

  const handleChange = (value: string, field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Update isPrePortalPlayer if source changes
    if (field === 'source') {
      setIsPrePortalPlayer(value === 'pre-portal');
    }
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
            .from('recruiting_board_athlete')
            .select(`
              user_id, 
              athlete_tier, 
              customer_position,
              source,
              recruiting_board_column_id,
              recruiting_board_column!recruiting_board_athlete_recruiting_board_column_id_fkey(name)
            `)
            .eq('athlete_id', athleteId)
            .is('ended_at', null)
            .single();

          if (!recruitingBoardError && recruitingBoardData) {
            setCurrentCoachId(recruitingBoardData.user_id);
            setSelectedCoachId(recruitingBoardData.user_id);
            setRecruitingBoardPosition(recruitingBoardData.recruiting_board_column?.name || null);
            // Check if this is a pre-portal player (source should be 'pre-portal')
            const isPrePortal = recruitingBoardData.source === 'pre-portal';
            setIsPrePortalPlayer(isPrePortal);
            // Initialize form data with athlete data including tier and source
            setFormData({
              tier: recruitingBoardData.athlete_tier || "", // Use stored tier or empty string for no tier
              customer_position: recruitingBoardData.customer_position || "", // Use stored customer_position or empty string
              source: recruitingBoardData.source || "" // Use stored source or empty string for no source
            });
          } else {
            // If no recruiting board data, check athleteData prop as fallback
            const sourceFromProp = athleteData?.source;
            const isPrePortal = sourceFromProp === 'pre-portal';
            setIsPrePortalPlayer(isPrePortal);
            setRecruitingBoardPosition(null);
            // Initialize form data with default values if no recruiting board entry found
            setFormData({
              tier: "", // Default to no tier
              customer_position: "", // Default to empty customer_position
              source: sourceFromProp || "" // Use source from prop if available
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
  }, [athleteId, activeCustomerId, athleteData]);

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

  // Check if user has gold/platinum/ultra packages
  useEffect(() => {
    if (userDetails?.packages) {
      const userPackageNumbers = (userDetails.packages || []).map((pkg: string | number) => parseInt(String(pkg), 10));
      const ultraPackageIds = getPackageIdsByType('ultra');
      const goldPackageIds = getPackageIdsByType('gold');
      const platinumPackageIds = getPackageIdsByType('platinum');
      const allowedPackageIds = [...ultraPackageIds, ...goldPackageIds, ...platinumPackageIds];
      
      const hasAccess = hasPackageAccess(userPackageNumbers, allowedPackageIds);
      setHasTrackingAccess(hasAccess);
    }
  }, [userDetails]);

  // Fetch player tracking status
  useEffect(() => {
    const loadTrackingStatus = async () => {
      if (!athleteId || !hasTrackingAccess || !isPrePortalPlayer) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        // Check player tracking status (Enter Portal Notification)
        const { data: trackingData } = await supabase
          .from('player_tracking')
          .select('text_alert')
          .eq('athlete_id', athleteId)
          .eq('user_id', session.user.id)
          .single();

        if (trackingData) {
          setIsEnterPortalNotificationOn(true);
          setTrackingAlertType(trackingData.text_alert ? 'text' : 'email');
        } else {
          setIsEnterPortalNotificationOn(false);
          setTrackingAlertType(null);
        }
      } catch (error) {
        console.error('Error loading tracking status:', error);
      }
    };

    loadTrackingStatus();
  }, [athleteId, hasTrackingAccess, isPrePortalPlayer]);

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

  // Handle Enter Portal Notification change
  const handleEnterPortalNotificationChange = (value: 'on' | 'off') => {
    const isOn = value === 'on';
    setIsEnterPortalNotificationOn(isOn);
    if (!isOn) {
      // If turning off, clear the alert type
      setTrackingAlertType(null);
    }
  };

  // Handle tracking alert type change
  const handleTrackingAlertTypeChange = async (value: 'email' | 'text' | null) => {
    if (value === 'text') {
      // Check if user has phone number
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: userDetailData } = await supabase
          .from('user_detail')
          .select('phone')
          .eq('id', user.id)
          .single();

        if (!userDetailData?.phone) {
          // Show modal to get phone number
          setIsPhoneModalOpen(true);
          // Store pending value to set after phone is entered
          return; // Don't update yet, wait for phone input
        }
      }
    }
    setTrackingAlertType(value);
  };

  // Handle phone number submission
  const handlePhoneSubmit = async () => {
    if (!phoneInput.trim()) {
      message.warning('Please enter a phone number');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User not authenticated');

      const { error: updateError } = await supabase
        .from('user_detail')
        .update({ phone: phoneInput.trim() })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setIsPhoneModalOpen(false);
      setPhoneInput('');
      setTrackingAlertType('text');
      message.success('Phone number saved successfully!');
    } catch (error) {
      console.error('Error updating phone number:', error);
      message.error('Error saving phone number. Please try again.');
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    if (!athleteId || !activeCustomerId) return;

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

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
          .from('recruiting_board_athlete')
          .update({ user_id: selectedCoachId })
          .eq('athlete_id', athleteId)
          .is('ended_at', null);

        if (coachError) throw coachError;
        setCurrentCoachId(selectedCoachId);
      }

      // Save tier, customer_position, and source if changed
      const tierValue = formData.tier === "" ? null : formData.tier;
      const customerPositionValue = formData.customer_position === "" ? null : formData.customer_position;
      const sourceValue = formData.source === "" ? null : formData.source;
      const { error: updateError } = await supabase
        .from('recruiting_board_athlete')
        .update({ 
          athlete_tier: tierValue,
          customer_position: customerPositionValue,
          source: sourceValue
        })
        .eq('athlete_id', athleteId)
        .is('ended_at', null);

      if (updateError) throw updateError;

      // Save player tracking if user has access and athlete is pre-portal
      if (hasTrackingAccess && isPrePortalPlayer && user?.id) {
        // Handle player tracking (Enter Portal Notification)
        const { data: currentTracking } = await supabase
          .from('player_tracking')
          .select('id, text_alert')
          .eq('athlete_id', athleteId)
          .eq('user_id', user.id)
          .single();

        if (isEnterPortalNotificationOn && trackingAlertType && !currentTracking) {
          // Create new tracking entry
          const { error: trackingError } = await supabase
            .from('player_tracking')
            .insert({
              athlete_id: athleteId,
              user_id: user.id,
              customer_id: activeCustomerId,
              recipient: user.id,
              text_alert: trackingAlertType === 'text'
            });

          if (trackingError) {
            console.error('Error creating player tracking:', trackingError);
          }
        } else if (isEnterPortalNotificationOn && trackingAlertType && currentTracking) {
          // Update existing tracking entry
          const { error: trackingError } = await supabase
            .from('player_tracking')
            .update({ text_alert: trackingAlertType === 'text' })
            .eq('id', currentTracking.id);

          if (trackingError) {
            console.error('Error updating player tracking:', trackingError);
          }
        } else if (!isEnterPortalNotificationOn && currentTracking) {
          // Remove tracking when Enter Portal Notification is turned off
          const { error: trackingError } = await supabase
            .from('player_tracking')
            .delete()
            .eq('id', currentTracking.id);

          if (trackingError) {
            console.error('Error removing player tracking:', trackingError);
          }
        }
      }

      // Show success message
      message.success('Changes saved successfully!', 3);
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
      message.error('Error saving changes. Please try again.');
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
                <Flex vertical>
                  <Typography.Text className="opacity-50 mb-1">
                    Position
                  </Typography.Text>
                  <Input
                    placeholder="Enter position (e.g. QB, RB, WR)"
                    value={formData.customer_position || ''}
                    onChange={(e) => handleChange(e.target.value, 'customer_position')}
                  />
                </Flex>
                {hasTrackingAccess && isPrePortalPlayer && (
                  <>
                    <Flex vertical>
                      <Typography.Text className="opacity-50 mb-1">
                        Enter Portal Notification
                      </Typography.Text>
                      <Select
                        value={isEnterPortalNotificationOn ? 'on' : 'off'}
                        onChange={handleEnterPortalNotificationChange}
                        options={[
                          { value: "on", label: "On" },
                          { value: "off", label: "Off" },
                        ]}
                      />
                    </Flex>
                    {isEnterPortalNotificationOn && (
                      <Flex vertical>
                        <Flex align="center" gap={4} className="mb-1">
                          <Typography.Text className="opacity-50">
                            Alert Type
                          </Typography.Text>
                          <Tooltip title="Change your default option by contacting us with the chat button below">
                            <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'help' }} />
                          </Tooltip>
                        </Flex>
                        <Select
                          value={trackingAlertType}
                          onChange={handleTrackingAlertTypeChange}
                          placeholder="Select alert type"
                          options={[
                            { value: "email", label: "Email" },
                            { value: "text", label: "Email and Text" },
                          ]}
                        />
                      </Flex>
                    )}
                  </>
                )}
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

      <Modal
        title="Phone Number Required"
        open={isPhoneModalOpen}
        onOk={handlePhoneSubmit}
        onCancel={() => {
          setIsPhoneModalOpen(false);
          setPhoneInput('');
        }}
      >
        <Typography.Text className="mb-2 block">
          To enable text alerts, please provide your phone number (numbers only):
        </Typography.Text>
        <Input
          placeholder="Enter phone number e.g. 5551234567"
          value={phoneInput}
          onChange={(e) => setPhoneInput(e.target.value)}
          onPressEnter={handlePhoneSubmit}
        />
      </Modal>
    </div>
  );
}
