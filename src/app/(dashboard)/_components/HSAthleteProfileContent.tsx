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
import PlayerInformation from "./PlayerInformation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchCustomerRatings, type CustomerRating } from "@/utils/utils";
import { convertCountyIdsToNames, getDefaultBoardForAdding, getPackageIdsByType } from "@/lib/queries";
import { hasPackageAccess } from "@/utils/navigationUtils";
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
import ProgressBar from "@/components/ProgressBar";
import { useRouter, useSearchParams } from "next/navigation";

const formatDate = (dateInput: string | Date | null | undefined) => {
  if (!dateInput) return "-- na --";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
};

// Helper functions for formatting athlete data
const formatHeight = (feet: number | null | undefined, inches: number | null | undefined) => {
  if (!feet && !inches) return "";
  const feetValue = feet || 0;
  const inchesValue = inches || 0;
  return `${feetValue}'${inchesValue}"`;
};

const formatWeight = (weight: number | null | undefined) => {
  if (!weight) return "";
  return `${weight}lb`;
};

const formatHeightWeight = (athlete: AthleteData | null) => {
  if (!athlete) return "";
  const height = formatHeight(athlete.height_feet, athlete.height_inch);
  const weight = formatWeight(athlete.weight);
  return `${height} / ${weight}`;
};

const formatGraduationYear = (athlete: AthleteData | null) => {
  if (!athlete?.grad_year) return "";
  return athlete.grad_year;
};

const formatBirthdayAndAge = (athlete: AthleteData | null) => {
  if (!athlete?.birthday) return "";
  
  try {
    const birthday = new Date(athlete.birthday);
    const today = new Date();
    const age = today.getFullYear() - birthday.getFullYear();
    const monthDiff = today.getMonth() - birthday.getMonth();
    
    // Adjust age if birthday hasn't occurred this year
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthday.getDate()) 
      ? age - 1 
      : age;
    
    const formattedBirthday = birthday.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    
    return `${formattedBirthday} (${actualAge})`;
  } catch (error) {
    console.error("Error formatting birthday:", error);
    return "";
  }
};

const formatGPA = (athlete: AthleteData | null) => {
  if (!athlete?.gpa) return "";
  return athlete.gpa.toString();
};

const formatPosition = (athlete: AthleteData | null) => {
  if (!athlete?.primary_position) return "";
  return athlete.primary_position;
};

const formatPhoneNumber = (phone: string | null | undefined) => {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (xxx) xxx-xxxx if we have 10 digits
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Return original if not 10 digits
  return phone;
};

// Helper: fetch school_fact entries for one or many schools and return raw rows ordered by newest first
function fetchSchoolFactsByIds(
  schoolIds: string[],
  dataTypeIds: number[]
): Promise<{ school_id: string; data_type_id: number; value: string; created_at?: string }[] | null> {
  return (async () => {
    try {
      if (!schoolIds.length || !dataTypeIds.length) return [] as any[];
      const { data, error } = await supabase
        .from('school_fact')
        .select('school_id, data_type_id, value, created_at')
        .in('school_id', schoolIds)
        .in('data_type_id', dataTypeIds)
        .or('inactive.is.null,inactive.eq.false')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching school facts:', error);
        return null;
      }
      return data as any[];
    } catch (err) {
      console.error('Unexpected error fetching school facts:', err);
      return null;
    }
  })();
}

// Function to fetch school data
const fetchSchoolData = async (athleteId: string) => {
  try {
    // First, get the school information from athlete_with_school
    const { data: athleteSchoolData, error: athleteSchoolError } = await supabase
      .from('athlete_with_school')
      .select('school_name, school_id')
      .eq('id', athleteId)
      .single();

    if (athleteSchoolError) {
      console.error('Error fetching athlete school data:', athleteSchoolError);
      return null;
    }

    if (!athleteSchoolData) {
      return null;
    }

    // Get school facts from school_fact table (latest by data_type_id)
    const schoolFacts = await fetchSchoolFactsByIds(
      [athleteSchoolData.school_id],
      [23, 247, 253, 966]
    );
    if (schoolFacts === null) return null;
    const latestByType = new Map<number, string>();
    schoolFacts.forEach((row: any) => {
      const dt = Number(row?.data_type_id);
      if (!latestByType.has(dt)) {
        latestByType.set(dt, row?.value ?? null);
      }
    });

    // Process the school facts
    const logoLink = schoolFacts?.find((fact: any) => fact.data_type_id === 23)?.value || '';
    const addressCity = schoolFacts?.find((fact: any) => fact.data_type_id === 247)?.value || '';
    const schoolState = schoolFacts?.find((fact: any) => fact.data_type_id === 253)?.value || '';
    const countyId = schoolFacts?.find((fact: any) => fact.data_type_id === 966)?.value;

    // Convert county_id to county name (state) format
    let countyName = '';
    if (countyId) {
      try {
        const countyNames = await convertCountyIdsToNames([parseInt(countyId)]);
        const fullCountyName = countyNames[0] || '';
        // Remove " (xx)" suffix from county name
        countyName = fullCountyName.replace(/\s*\([^)]+\)$/, '');
      } catch (error) {
        console.error('Error converting county ID to name:', error);
      }
    }

    return {
      school_name: athleteSchoolData.school_name.replace(/\s*\([^)]+\)$/, ''),
      school_id: athleteSchoolData.school_id,
      logo_link: logoLink,
      address_city: addressCity,
      school_state: schoolState,
      county_name: countyName
    };
  } catch (error) {
    console.error('Error in fetchSchoolData:', error);
    return null;
  }
};

const RATING_OPTIONS = ["A+", "A", "A-", "B+", "B", "B-", "C", "D"];

interface HSAthleteProfileContentProps {
  athleteId?: string;
  mainTpPageId?: string;
  onAddToBoard?: () => void;
  isInModal?: boolean;
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null;
  onClose?: () => void;
}

export default function HSAthleteProfileContent({ 
  athleteId, 
  mainTpPageId,
  onAddToBoard,
  isInModal = false,
  dataSource = null,
  onClose
}: HSAthleteProfileContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [projectionText, setProjectionText] = useState<string | null>(null);
  const [highlightTapeUrl, setHighlightTapeUrl] = useState<string | null>(null);
  const [transcriptUrls, setTranscriptUrls] = useState<string[]>([]);
  const [satActUrls, setSatActUrls] = useState<string[]>([]);
  // HS/Academic facts
  const [factHSQualifier, setFactHSQualifier] = useState<string | null>(null); // 1109
  const [factYearText, setFactYearText] = useState<string | null>(null); // 1110
  const [factGradMonth, setFactGradMonth] = useState<string | null>(null); // 1111
  const [factGradYear, setFactGradYear] = useState<string | null>(null); // 1112
  const [factEligibility, setFactEligibility] = useState<string | null>(null); // 1113
  const [factPellEligible, setFactPellEligible] = useState<string | null>(null); // 1114
  const [factSchoolName, setFactSchoolName] = useState<string | null>(null); // 1115
  const [factAfterYearSuffix, setFactAfterYearSuffix] = useState<string | null>(null); // 1116
  // Bio facts
  const [factDesiredMajor, setFactDesiredMajor] = useState<string | null>(null); // 10
  const [factPredictedGPA, setFactPredictedGPA] = useState<string | null>(null); // 1035
  const [factSAT, setFactSAT] = useState<string | null>(null); // 1024
  const [factACT, setFactACT] = useState<string | null>(null); // 1025
  // Parent facts
  const [factParentName, setFactParentName] = useState<string | null>(null); // 1021
  const [factParentEmail, setFactParentEmail] = useState<string | null>(null); // 1022
  const [factParentPhone, setFactParentPhone] = useState<string | null>(null); // 1023
  const [factMomOccupation, setFactMomOccupation] = useState<string | null>(null); // 1029
  const [factMomEducationLevel, setFactMomEducationLevel] = useState<string | null>(null); // 1031
  const [factMomAlmaMater, setFactMomAlmaMater] = useState<string | null>(null); // 1050
  const [factDadOccupation, setFactDadOccupation] = useState<string | null>(null); // 1030
  const [factDadEducationLevel, setFactDadEducationLevel] = useState<string | null>(null); // 1032
  const [factDadAlmaMater, setFactDadAlmaMater] = useState<string | null>(null); // 1051
  // Coach data
  const [coachData, setCoachData] = useState<{
    name: string | null;
    cell: string | null;
    office: string | null;
    email: string | null;
  } | null>(null);
  const [schoolData, setSchoolData] = useState<{
    school_name: string;
    school_id: string;
    logo_link: string;
    address_city: string;
    school_state: string;
    county_name: string;
  } | null>(null);
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
  
  // Ensure URLs have protocol
  const normalizeUrl = (url: string): string => {
    if (!url) return url;
    return /^(https?:)?\/\//i.test(url) ? url : `https://${url}`;
  };

  // fetchSchoolFactsByIds is defined at module scope above for reuse

  // Offer/commit state
  const [commitInfo, setCommitInfo] = useState<{
    schoolName: string | null;
    schoolId: string | null;
    logoLink: string | null;
    date: string | null;
    isWalkOn: boolean;
    source?: string | null;
    sourceLabel?: string | null;
  } | null>(null);
  const [activityEvents, setActivityEvents] = useState<any[]>([]);
  // Facts for HSSurvey display (includes source for coach-provided data)
  const [hsSurveyFacts, setHsSurveyFacts] = useState<{ data_type_id: number; value: string; source?: string }[]>([]);
  
  // Score tracker state
  const [isInScoreTracker, setIsInScoreTracker] = useState(false);
  const [isLoadingScoreTracker, setIsLoadingScoreTracker] = useState(false);
  const [isAddingToScoreTracker, setIsAddingToScoreTracker] = useState(false);
  
  // Offer alert state
  const [isFollowingOffers, setIsFollowingOffers] = useState(false);
  const [isAddingOfferAlert, setIsAddingOfferAlert] = useState(false);

  // Handle closing the modal
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (!isInModal) {
      // Only navigate if not in a modal and no onClose provided
      // When in a modal, the parent modal handles closing
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('player');
      params.delete('use_main_tp_page_id');
      
      // Navigate to /hs-athlete with remaining params (if any)
      const queryString = params.toString();
      router.push(queryString ? `/hs-athlete?${queryString}` : '/hs-athlete');
    }
    // If isInModal is true and no onClose, do nothing - parent handles it
  };

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

            // Fetch school data for this athlete
            const schoolInfo = await fetchSchoolData(actualAthleteId);
            if (schoolInfo) {
              setSchoolData(schoolInfo);
            }

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

  // Projection text (athlete_fact #1026) will be loaded in the HS facts fetch below

  // Fetch HSSurvey facts (114, 4, 5, 6, 693, 35) including source
  useEffect(() => {
    const fetchHsSurveyFacts = async () => {
      if (!actualAthleteId) return;
      try {
        const ids = [
          // Coach/athletic info
          114, 4, 5, 6, 693, 35,
          // College Selector Step 1
          1117, 1118, 1119, 1120, 1121, 51, 52, 63, 72, 64, 1131, 1122, 687, 65, 53, 1123, 1124, 1125, 1126, 1127, 1128, 1129, 1130,
          // Step 2
          1015, 35, 1132, 1024, 1025, 10, 1133, 36,
          // Step 3
          77, 1134, 366, 365,
          // Projection text
          1026,
          // Step 5
          682, 54, 55, 56, 62, 680, 57, 679, 58, 61, 59, 60, 681
        ];
        const { data, error } = await supabase
          .from('athlete_fact')
          .select('data_type_id, value, source, created_at')
          .eq('athlete_id', actualAthleteId)
          .in('data_type_id', ids)
          .or('inactive.is.null,inactive.eq.false')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching HS Survey facts:', error);
          return;
        }
        // Keep all rows in created_at DESC order so downstream can pick the latest by source
        const rows = (data || []).map((row: any) => ({
          data_type_id: Number(row?.data_type_id),
          value: row?.value,
          source: row?.source
        }));
        setHsSurveyFacts(rows);
      } catch (err) {
        console.error('Unexpected error fetching HS Survey facts:', err);
      }
    };
    fetchHsSurveyFacts();
  }, [actualAthleteId]);

  // Fetch HS facts (1109-1116), Bio facts (10, 1024, 1025, 1035), and Parent facts (1021-1023, 1029-1032, 1050-1051)
  useEffect(() => {
    const fetchHSFacts = async () => {
      if (!actualAthleteId) return;
      try {
        const ids = [10, 1021, 1022, 1023, 1024, 1025, 1029, 1030, 1031, 1032, 1035, 1050, 1051, 1109, 1110, 1111, 1112, 1113, 1114, 1115, 1116, 1026];
        const { data, error } = await supabase
          .from('athlete_fact')
          .select('data_type_id, value, created_at')
          .eq('athlete_id', actualAthleteId)
          .in('data_type_id', ids)
          .or('inactive.is.null,inactive.eq.false')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching HS facts:', error);
          return;
        }
        const latestByType = new Map<number, string>();
        (data || []).forEach((row: any) => {
          const dt = Number(row?.data_type_id);
          if (!latestByType.has(dt)) {
            latestByType.set(dt, row?.value ?? null);
          }
        });
        // Bio facts
        setFactDesiredMajor(latestByType.get(10) ?? null);
        setFactSAT(latestByType.get(1024) ?? null);
        setFactACT(latestByType.get(1025) ?? null);
        setFactPredictedGPA(latestByType.get(1035) ?? null);
        // Projection text
        setProjectionText(latestByType.get(1026) ?? null);
        // Parent facts
        setFactParentName(latestByType.get(1021) ?? null);
        setFactParentEmail(latestByType.get(1022) ?? null);
        setFactParentPhone(latestByType.get(1023) ?? null);
        setFactMomOccupation(latestByType.get(1029) ?? null);
        setFactMomEducationLevel(latestByType.get(1031) ?? null);
        setFactMomAlmaMater(latestByType.get(1050) ?? null);
        setFactDadOccupation(latestByType.get(1030) ?? null);
        setFactDadEducationLevel(latestByType.get(1032) ?? null);
        setFactDadAlmaMater(latestByType.get(1051) ?? null);
        // JUCO facts
        setFactHSQualifier(latestByType.get(1109) ?? null);
        setFactYearText(latestByType.get(1110) ?? null);
        setFactGradMonth(latestByType.get(1111) ?? null);
        setFactGradYear(latestByType.get(1112) ?? null);
        setFactEligibility(latestByType.get(1113) ?? null);
        setFactPellEligible(latestByType.get(1114) ?? null);
        setFactSchoolName(latestByType.get(1115) ?? null);
        const raw1116 = latestByType.get(1116) ?? null;
        setFactAfterYearSuffix(raw1116 === '1' ? '4-2-4' : null);
      } catch (err) {
        console.error('Unexpected error fetching HS facts:', err);
      }
    };
    fetchHSFacts();
  }, [actualAthleteId]);

  // Fetch coach data
  useEffect(() => {
    const fetchCoachData = async () => {
      if (!schoolData?.school_id) return;
      
      try {
        // Get coach_id from coach_school table
        const { data: coachSchoolData, error: coachSchoolError } = await supabase
          .from('coach_school')
          .select('coach_id')
          .eq('school_id', schoolData.school_id)
          .limit(1)
          .single();

        if (coachSchoolError || !coachSchoolData?.coach_id) {
          console.error('Error fetching coach_school:', coachSchoolError);
          return;
        }

        const coachId = coachSchoolData.coach_id;

        // Get coach name from coach table
        const { data: coachInfo, error: coachError } = await supabase
          .from('coach')
          .select('first_name, last_name')
          .eq('id', coachId)
          .single();

        if (coachError) {
          console.error('Error fetching coach:', coachError);
          return;
        }

        // Get coach facts (cell: 27, office: 967, email: 571)
        const { data: coachFacts, error: coachFactsError } = await supabase
          .from('coach_fact')
          .select('data_type_id, value')
          .eq('coach_id', coachId)
          .in('data_type_id', [27, 571, 967])
          .or('inactive.is.null,inactive.eq.false');

        if (coachFactsError) {
          console.error('Error fetching coach_fact:', coachFactsError);
        }

        const cell = coachFacts?.find((f: any) => f.data_type_id === 27)?.value || null;
        const email = coachFacts?.find((f: any) => f.data_type_id === 571)?.value || null;
        const office = coachFacts?.find((f: any) => f.data_type_id === 967)?.value || null;

        const fullName = [coachInfo?.first_name, coachInfo?.last_name].filter(Boolean).join(' ');

        setCoachData({
          name: fullName || null,
          cell,
          office,
          email
        });
      } catch (err) {
        console.error('Unexpected error fetching coach data:', err);
      }
    };

    fetchCoachData();
  }, [schoolData?.school_id]);

  // Fetch offers and derive latest commit state
  useEffect(() => {
    const fetchOffers = async () => {
      if (!actualAthleteId) return;
      try {
        const { data: offers, error } = await supabase
          .from('offer')
          .select('id, type, athlete_id, school_id, walk_on, offer_date, created_at, source')
          .eq('athlete_id', actualAthleteId)
          .order('offer_date', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching offers:', error);
          return;
        }

        if (!offers || offers.length === 0) {
          setCommitInfo(null);
          setActivityEvents([]);
          return;
        }

        // Get all unique school IDs
        const schoolIds = [...new Set(offers.map((o: any) => o.school_id).filter(Boolean))];
        
        // Fetch all school names, logos, and ranks in batch
        const schoolDataMap = new Map();
        if (schoolIds.length > 0) {
          // Fetch school names
          const { data: schoolsData } = await supabase
            .from('school')
            .select('id, name')
            .in('id', schoolIds);
          
          if (schoolsData) {
            schoolsData.forEach((school: any) => {
              schoolDataMap.set(school.id, { name: school.name, logo: null, rank: null });
            });
          }
          
          // Fetch school logos (data_type_id 23) and ranks (data_type_id 914)
          const factsData = await fetchSchoolFactsByIds(schoolIds as string[], [23, 914]);
          if (factsData) {
            // Since results are ordered newest-first, set only once per (school, dtype)
            const seen = new Set<string>();
            factsData.forEach((fact: any) => {
              const key = `${fact.school_id}-${fact.data_type_id}`;
              if (seen.has(key)) return;
              seen.add(key);
              const existing = schoolDataMap.get(fact.school_id);
              if (existing) {
                if (fact.data_type_id === 23) {
                  existing.logo = fact.value;
                } else if (fact.data_type_id === 914) {
                  existing.rank = fact.value ? parseInt(fact.value, 10) : null;
                }
              }
            });
          }
        }

        // Enrich offers with school name, logo, and rank
        const enrichedOffers = offers.map((offer: any) => {
          const schoolData = schoolDataMap.get(offer.school_id);
          return {
            ...offer,
            school_name: schoolData?.name || 'Unknown School',
            school_logo_url: schoolData?.logo || null,
            school_rank: schoolData?.rank || null
          };
        });

        // Move Transfer Portal (source === 'tp') entries to the bottom, while keeping date ordering within groups
        const sortedOffers = [...enrichedOffers].sort((a: any, b: any) => {
          const aIsTp = (a?.source || '').toString().toLowerCase() === 'tp' ? 1 : 0;
          const bIsTp = (b?.source || '').toString().toLowerCase() === 'tp' ? 1 : 0;
          if (aIsTp !== bIsTp) return aIsTp - bIsTp; // non-tp (0) first, tp (1) last
          // Within same group, sort by offer_date desc then created_at desc
          const ad = a?.offer_date ? new Date(a.offer_date).getTime() : 0;
          const bd = b?.offer_date ? new Date(b.offer_date).getTime() : 0;
          if (bd !== ad) return bd - ad;
          const ac = a?.created_at ? new Date(a.created_at).getTime() : 0;
          const bc = b?.created_at ? new Date(b.created_at).getTime() : 0;
          return bc - ac;
        });
        
        // Store sorted offers for activity feed
        setActivityEvents(sortedOffers);
        

        // Find the most recent relevant entry (commit or de-commit)
        const relevant = sortedOffers.find((o: any) => {
          const t = (o?.type || '').toString().toLowerCase();
          return t === 'commit' || t === 'de-commit' || t === 'decommit' || t === 'de_commit';
        });

        if (!relevant) {
          setCommitInfo(null);
          return;
        }

        

        const relType = (relevant.type || '').toString().toLowerCase();
        // If top is de-commit, show nothing
        if (relType !== 'commit') {
          setCommitInfo(null);
          return;
        }

        const walkOnRaw = (relevant as any).walk_on;
        const walkOn: boolean = walkOnRaw === true || walkOnRaw === 1 || walkOnRaw === '1' || walkOnRaw === 'True' || walkOnRaw === 'true';
        const dateValue: string | null = relevant.offer_date || relevant.created_at || null;
        const sourceRaw: string = (relevant as any).source?.toString() || '';
        const srcLower = sourceRaw.toLowerCase();
        let sourceLabel: string | null = null;
        if (srcLower.includes('twitter') || srcLower.includes('x.com')) {
          sourceLabel = 'Twitter';
        } else if (srcLower === 'tp' || srcLower === 'transfer_portal' || srcLower === 'transfer portal') {
          sourceLabel = 'Transfer Portal';
        } else if (srcLower === 'hs' || srcLower === 'high_school' || srcLower === 'high school') {
          sourceLabel = 'High School';
        } else if (sourceRaw) {
          sourceLabel = sourceRaw.charAt(0).toUpperCase() + sourceRaw.slice(1);
        }

        // Use already fetched school name and logo from enriched data
        setCommitInfo({
          schoolName: relevant.school_name || null,
          schoolId: relevant.school_id || null,
          logoLink: relevant.school_logo_url || null,
          date: dateValue,
          isWalkOn: walkOn,
          source: sourceRaw || null,
          sourceLabel,
        });
      } catch (err) {
        console.error('Unexpected error fetching offers:', err);
      }
    };
    fetchOffers();
  }, [actualAthleteId]);

  // Fetch HS Highlight Tape URL from athlete_fact (data_type_id 38)
  useEffect(() => {
    const fetchHighlightTape = async () => {
      if (!actualAthleteId) return;
      try {
        const { data, error } = await supabase
          .from('athlete_fact')
          .select('value')
          .eq('athlete_id', actualAthleteId)
          .eq('data_type_id', 38)
          .or('inactive.is.null,inactive.eq.false')
          .order('created_at', { ascending: false })
          .limit(1);
        if (error) {
          console.error('Error fetching HS Highlight Tape (athlete_fact 38):', error);
          return;
        }
        setHighlightTapeUrl((data && data.length > 0) ? (data[0] as any).value : null);
      } catch (err) {
        console.error('Unexpected error fetching HS Highlight Tape:', err);
      }
    };
    fetchHighlightTape();
  }, [actualAthleteId]);

  // Fetch SAT/ACT URLs from athlete_fact (data_type_id 1028)
  useEffect(() => {
    const fetchSatAct = async () => {
      if (!actualAthleteId) return;
      try {
        const { data, error } = await supabase
          .from('athlete_fact')
          .select('value')
          .eq('athlete_id', actualAthleteId)
          .eq('data_type_id', 1028)
          .or('inactive.is.null,inactive.eq.false')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching SAT/ACT URLs (athlete_fact 1028):', error);
          return;
        }
        const urls = (data || [])
          .map((row: any) => row?.value)
          .filter((v: any) => typeof v === 'string' && v.length > 0);
        setSatActUrls(urls);
      } catch (err) {
        console.error('Unexpected error fetching SAT/ACT URLs:', err);
      }
    };
    fetchSatAct();
  }, [actualAthleteId]);

  // Fetch Transcript URLs from athlete_fact (data_type_id 685)
  useEffect(() => {
    const fetchTranscripts = async () => {
      if (!actualAthleteId) return;
      try {
        const { data, error } = await supabase
          .from('athlete_fact')
          .select('value')
          .eq('athlete_id', actualAthleteId)
          .eq('data_type_id', 685)
          .or('inactive.is.null,inactive.eq.false')
          .order('created_at', { ascending: false });
        if (error) {
          console.error('Error fetching transcript URLs (athlete_fact 685):', error);
          return;
        }
        const urls = (data || [])
          .map((row: any) => row?.value)
          .filter((v: any) => typeof v === 'string' && v.length > 0);
        setTranscriptUrls(urls);
      } catch (err) {
        console.error('Unexpected error fetching transcript URLs:', err);
      }
    };
    fetchTranscripts();
  }, [actualAthleteId]);

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

  // Check score tracker status when athlete and customer are available
  useEffect(() => {
    if (athlete?.id && activeCustomerId) {
      checkScoreTrackerStatus();
      checkOfferAlertStatus();
    }
  }, [athlete?.id, activeCustomerId]);

  // Check if user is already following offers for this athlete
  const checkOfferAlertStatus = async () => {
    if (!athlete?.id || !activeCustomerId) return;

    try {
      const { data, error } = await supabase
        .from('offer_alert')
        .select('id')
        .eq('customer_id', activeCustomerId)
        .eq('filter', `athlete_type: High School | athlete_id: ${athlete.id}`)
        .maybeSingle();

      if (error) {
        console.error('Error checking offer alert status:', error);
        return;
      }

      setIsFollowingOffers(!!data);
    } catch (error) {
      console.error('Error in checkOfferAlertStatus:', error);
    }
  };

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
          const mainBoard = data.find((b: { name: string }) => b.name === 'Main') || data[0];
          setSelectedBoardId(mainBoard.id);
          setSelectedBoardName(mainBoard.name);
        }
      } catch (error) {
        console.error('Error in fetchBoards:', error);
      }
    };
    
    fetchBoards();
  }, [activeCustomerId]);

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
          const { data: newBoard, error: createError} = await supabase
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
        source: 'high_school',
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
      if (dataSource === 'all_athletes') {
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

  // Handle following athlete offers
  const handleFollowOffers = async () => {
    if (!athlete?.id || !activeCustomerId || !userDetails) {
      alert("You must be logged in to follow athlete offers.");
      return;
    }

    setIsAddingOfferAlert(true);
    
    try {
      const { data, error } = await supabase
        .from('offer_alert')
        .insert({
          filter: `athlete_type: High School | athlete_id: ${athlete.id}`,
          rule: `${athlete.first_name} ${athlete.last_name} ${schoolData?.school_name || ''}`.trim(),
          alert_frequency: 'daily',
          recipient: 'entire_staff',
          user_id: userDetails.id,
          customer_id: activeCustomerId
        })
        .select();

      if (error) {
        console.error('Error adding offer alert:', error);
        alert(`Error following athlete offers: ${error.message || 'Unknown error'}`);
        return;
      }

      // Update state
      setIsFollowingOffers(true);
      setSuccessMessage("Now following athlete offers!");
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error in handleFollowOffers:', error);
      if (error instanceof Error) {
        alert(`An unexpected error occurred: ${error.message}`);
      } else {
        alert("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsAddingOfferAlert(false);
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

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === "0" && !isFollowingOffers) {
      // Follow Athlete Offers (only if not already following)
      handleFollowOffers();
    }
  };

  const items: MenuProps["items"] = [
    {
      label: isFollowingOffers ? (
        <span style={{ color: '#999', cursor: 'not-allowed' }}>Following Offers</span>
      ) : (
        <a href="#" onClick={(e) => e.preventDefault()}>Follow Athlete Offers</a>
      ),
      key: "0",
      disabled: isFollowingOffers,
    },
    {
      type: "divider",
    },
    {
      label: (
        <Tooltip title="Coming Soon">
          <span style={{ color: '#999', cursor: 'not-allowed' }}>Add to Front Rush</span>
        </Tooltip>
      ),
      key: "2",
      disabled: true,
    },
  ];

  // Extract the main content to reuse in both modal and non-modal cases
  const mainContent = (
    <>
      {!isInModal && (
        <button
          className="close"
          onClick={handleClose}
        ></button>
      )}

      <Flex>
        <div className={`main-container-ui ${isInModal ? 'no-scroll' : ''}`}>
          <div className="grid grid-cols-[215px_minmax(0,1fr)] gap-2">
              <div className="flex flex-col gap-2">
                <div className="card">
                  <div className="player-img">
                    {!athlete ? (
                      <Skeleton.Image
                        active
                        style={{ width: 200, height: 200 }}
                      />
                    ) : (
                      <Image 
                        src={athlete?.image_url || "/blank-user.svg"} 
                        alt={`${athlete?.first_name} ${athlete?.last_name}`} 
                        width={200} 
                        height={200} 
                      />
                    )}
                    <ul>
                      <li>
                        <i className="icon-svg-tape-measure"></i> {formatHeightWeight(athlete)}
                      </li>
                      <li>
                        <i className="icon-svg-calendar"></i> {formatGraduationYear(athlete)}
                      </li>
                      {athlete?.birthday && (
                        <li>
                          <i className="icon-svg-cake"></i> {formatBirthdayAndAge(athlete)}
                        </li>
                      )}
                      <li>
                        <i className="icon-svg-education"></i> {formatGPA(athlete)}
                      </li>
                      <li>
                        <i className="icon-svg-football"></i> {formatPosition(athlete)}
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <h4 className="mt-2 flex items-center">
                    <i className="icon-svg-link"></i> Player Links
                  </h4>
                  <ul className="link-list">
                    {highlightTapeUrl && (
                      <li>
                        <a href={normalizeUrl(highlightTapeUrl)} target="_blank" rel="noopener noreferrer">HS Highlight Tape</a>
                      </li>
                    )}
                  </ul>

                  {transcriptUrls.length > 0 && (
                    <>
                      <h5 className="flex items-center">
                        <i className="icon-svg-file"></i> Transcript
                      </h5>
                      <ul className="link-list">
                        {transcriptUrls.map((url, idx) => (
                          <li key={idx}>
                            <a href={normalizeUrl(url)} target="_blank" rel="noopener noreferrer">
                              {`Download Transcript ${idx + 1}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {satActUrls.length > 0 && (
                    <>
                      <h5 className="flex items-center">
                        <i className="icon-svg-file-validation"></i> SAT / ACT
                      </h5>
                      <ul className="link-list !mb-0">
                        {satActUrls.map((url, idx) => (
                          <li key={idx}>
                            <a href={normalizeUrl(url)} target="_blank" rel="noopener noreferrer">
                              {`Download SAT / ACT ${idx + 1}`}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>

                {athlete?.twitter && (
                  <div className="xfeed">
                    <div className="">
                      <img src="/x-logo.svg" alt="X Feed" height={50} />
                    </div>
                    <span className="gray">Follow on X</span>
                    <h3>
                      {!athlete ? (
                        <Skeleton.Input
                          active
                          size="small"
                          style={{ width: 100 }}
                        />
                      ) : (
                        athlete?.first_name && athlete?.last_name
                          ? `${athlete.first_name} ${athlete.last_name}`
                          : "Loading..."
                      )}
                    </h3>
                    <h6>@{athlete.twitter}</h6>
                    <div className="white-skew-btn">
                      <a
                        href={`https://x.com/${athlete.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <button>Catch on X</button>
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="card-withou-pading gray-scale overflow-auto">
                <div className="grid grid-cols-[1fr_550px] gap-4 mb-4">
                  <div className="card">
                    <div className="detail-box">
                      <div className="flex items-center justify-between">
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
                        <div className="ml-2 gap-1 flex">
                          {isInScoreTracker ? (
                            <Tooltip title="On Your Score Tracker" placement="top">
                              <div className="wave-badge"></div>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Add to Score Tracker" placement="top">
                              <button 
                                className="add-to-tracker-btn"
                                onClick={handleAddToScoreTracker}
                                disabled={isAddingToScoreTracker || isLoadingScoreTracker}
                              >
                                {isAddingToScoreTracker && (
                                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                                )}
                              </button>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit Coming Soon" placement="top">
                            <button 
                              className="icon-edit-2 flex align-center justify-center text-lg bg-gray-100 border border-solid border-[#d2d2db] w-[42px] opacity-50 cursor-not-allowed"
                              disabled
                            ></button>
                          </Tooltip>
                          <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={["click"]}>
                            <Button className="select-dropdown !border-[#d2d2db] !shadow-none w-[42px]">
                              <i className="icon-menu-1"></i>
                            </Button>
                          </Dropdown>
                        </div>
                      </div>
                      
                      {/* Add to Board Button - positioned on the right */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', marginBottom: '8px' }}>
                        <div style={{ position: 'relative' }}>
                          <SuccessPopover
                            trigger="top"
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
                                  : 'Add to Board'}
                            </Button>
                          </SuccessPopover>
                          
                          {/* Board dropdown appears below button when multiple boards */}
                          {availableBoards.length > 1 && isBoardModalVisible && (
                            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 1001, minWidth: '300px' }}>
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
                                placement="bottomLeft"
                                simpleMode={true}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="arrow-bg relative flex items-center justify-between">
                        <h5 className="school">
                          {schoolData?.logo_link && (
                            <Image
                              src={schoolData.logo_link}
                              alt="School Logo"
                              width={20}
                              height={24}
                            />
                          )}
                          {schoolData ? (
                            `${schoolData.school_name} (${schoolData.address_city}, ${schoolData.school_state} | ${schoolData.county_name})`
                          ) : (
                            "Loading school information..."
                          )}
                        </h5>

                        {athlete?.ncaa_id && (
                          <div className="absolute right-0 top-5 text-[16px] leading-[24px]">
                            <strong className="font-[500]">NCAA ID</strong> <br />{" "}
                            {athlete.ncaa_id}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex gap-10">
                          <h6 className="flex items-center !font-normal">
                            <i className="icon-call flex text-lg mr-1"></i>{" "}
                            {formatPhoneNumber(athlete?.cell_phone)}
                          </h6>
                          <h6 className="flex items-center !font-normal">
                            <i className="icon-sms flex text-lg mr-1"></i>{" "}
                            {athlete?.email ? (
                              <a href={`mailto:${athlete.email}`}>
                                {athlete.email}
                              </a>
                            ) : (
                              ""
                            )}
                          </h6>
                        </div>
                        <h6 className="flex items-start !font-normal">
                          <i className="icon-location flex text-lg mr-1 mt-1"></i>
                          <div>
                            {athlete?.address_street && (
                              <div>{athlete.address_street}</div>
                            )}
                            {athlete?.address_street2 && (
                              <div>{athlete.address_street2}</div>
                            )}
                            {athlete?.address_city && athlete?.address_state && athlete?.address_zip && (
                              <div>{athlete.address_city}, {athlete.address_state} {athlete.address_zip}</div>
                            )}
                          </div>
                        </h6>
                      </div>
                      <div className="mt-8 flex justify-center">
                        <Tooltip title="Coming Soon" placement="top">
                          <a
                            href="javascript:void(0)"
                            className="profile-btn opacity-20 grayscale cursor-not-allowed"
                            onClick={(e) => e.preventDefault()}
                          >
                            Request Athlete to Update Profile
                          </a>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                  <div className="card flex items-center justify-center gap-4">
                    <div className="flex-1 px-2">
                      <h4 className="mb-3 italic">Athletic Projection</h4>
                      <Tooltip title="Coming Soon" placement="top">
                        <div className="flex flex-col gap-1 opacity-20 grayscale cursor-not-allowed">
                          <ProgressBar
                            value={25}
                            height={20}
                            color="#FF7525"
                            label="Athletic Testing"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                          <ProgressBar
                            value={92}
                            height={20}
                            color="#2BB650"
                            label="Recruiting Services"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                          <ProgressBar
                            value={18}
                            height={20}
                            color="#C00E1E"
                            label="Offers"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                          <ProgressBar
                            value={29}
                            height={20}
                            color="#FF7525"
                            label="Scouts"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                          <ProgressBar
                            value={81}
                            height={20}
                            color="#2BB650"
                            label="Honors"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                          <ProgressBar
                            value={64}
                            height={20}
                            color="#2BB650"
                            label="HS Coach"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                          <ProgressBar
                            value={18}
                            height={20}
                            color="#C00E1E"
                            label="Data Scraping"
                            labelSize="12"
                            labelWeight={400}
                            labelWidth={110}
                          />
                        </div>
                      </Tooltip>
                    </div>

                    <div className="w-[150px] mr-5 flex items-center justify-center card border border-black p-5">
                      <div className="">
                        <h5 className="m-0 italic ">Current Projection</h5>
                        <h4 className="italic text-[22px] text-center">{projectionText || '—'}</h4>
                        <Tooltip title="Coming Soon" placement="top">
                          <div className="opacity-20 grayscale cursor-not-allowed">
                            <ProgressBar
                              value={85}
                              height={55}
                              color="#2BB650"
                              label=""
                              labelSize="14"
                              labelWeight={400}
                              labelWidth={110}
                            />
                          </div>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
                {commitInfo && commitInfo.schoolName && commitInfo.date && (
                  <div className="error">
                    {commitInfo.logoLink && (
                      <span className="inline-flex items-center mr-2 align-middle">
                        <img src={commitInfo.logoLink} alt="School Logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                      </span>
                    )}
                    {commitInfo.schoolName} Commit - {commitInfo.date ? formatDate(commitInfo.date) : ''}
                    {commitInfo.isWalkOn && (
                      <div className="check">
                        <i className="icon-svg-green-tick"></i> Walk ON{" "}
                      </div>
                    )}
                    {commitInfo.sourceLabel && (
                      <div className="check">
                        {(() => {
                          const raw = (commitInfo.source || '').toLowerCase();
                          const label = commitInfo.sourceLabel || '';
                          const isTwitter = raw.includes('twitter.com') || raw.includes('x.com');
                          const isESPN = raw.includes('espn.com');
                          const is247 = raw.includes('247sports.com');
                          const isOn3 = raw.includes('on3.com');
                          const isRivals = raw.includes('rivals.com');
                          const showLink = isTwitter || isESPN || is247 || isOn3 || isRivals;
                          const linkLabel = isTwitter ? 'Twitter' : isESPN ? 'ESPN' : is247 ? '247Sports' : isOn3 ? 'On3' : isRivals ? 'Rivals' : label;
                          return showLink && commitInfo.source ? (
                            <a href={normalizeUrl(commitInfo.source)} target="_blank" rel="noopener noreferrer">{linkLabel}</a>
                          ) : (
                            <span>{linkLabel}</span>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
                {(factSchoolName || factYearText || factGradMonth || factGradYear || factPellEligible || factEligibility || factHSQualifier || factAfterYearSuffix) && (
                <div className="info">
                  <div>
                    <span>JUCO Details:</span>
                    <h4>
                      {factSchoolName || (factYearText ? 'HS Grad' : '')}
                      {factYearText ? ` (${factYearText})` : ''}
                      {factAfterYearSuffix ? (
                        <span className="font-normal"> {factAfterYearSuffix}</span>
                      ) : ''}
                    </h4>
                  </div>
                  <div className="text-center">
                    <span>AA Grad Date</span>
                    <h6 className="min-h-[24px]">{[factGradMonth, factGradYear].filter(Boolean).join('-')}</h6>
                  </div>
                  <div className="text-center">
                    <span>Pell Eligible</span>
                    <h6 className="min-h-[24px]">{factPellEligible === '1' ? 'Yes' : factPellEligible === '0' ? 'No' : ''}</h6>
                  </div>
                  <div className="text-center">
                    <span>Eligibility</span>
                    <h6 className="min-h-[24px]">{factEligibility || ''}</h6>
                  </div>
                  <div className="text-center">
                    <span>HS Qualifier</span>
                    <h6 className="min-h-[24px]">{factHSQualifier || ''}</h6>
                  </div>
                </div>
                )}
                <div className="col-span-8 card-withou-pading gray-scale">
                  <PlayerInformation 
                    athlete={athlete} 
                    useMockData={true} 
                    activityEvents={activityEvents}
                    athleteFacts={hsSurveyFacts}
                    bioData={{
                      desiredMajor: factDesiredMajor,
                      predictedGPA: factPredictedGPA,
                      sat: factSAT,
                      act: factACT,
                      parentName: factParentName,
                      parentEmail: factParentEmail,
                      parentPhone: factParentPhone,
                      momOccupation: factMomOccupation,
                      momEducationLevel: factMomEducationLevel,
                      momAlmaMater: factMomAlmaMater,
                      dadOccupation: factDadOccupation,
                      dadEducationLevel: factDadEducationLevel,
                      dadAlmaMater: factDadAlmaMater
                    }}
                    coachData={coachData}
                    schoolName={schoolData?.school_name || null}
                  />
                </div>
              </div>
            </div>
          </div>
        </Flex>
    </>
  );

  return isMobile ? (
    <MobileAthleteProfileContent
      athleteId={athleteId}
      mainTpPageId={mainTpPageId}
      onAddToBoard={onAddToBoard}
      dataSource={dataSource}
    />
  ) : isInModal ? (
    // When in a modal, just return the content without wrapping in another modal
    <div className="w-full h-full">
      <button
        className="close"
        onClick={handleClose}
      ></button>
      {mainContent}
      
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
  ) : (
    // When not in a modal, wrap content in Modal
    <div>
      <Modal
        title={null}
        open={true}
        onCancel={handleClose}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        className="new-modal-ui"
        destroyOnHidden={true}
        closable={true}
        maskClosable={true}
      >
        {mainContent}
      </Modal>

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
