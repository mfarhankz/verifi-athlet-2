"use client";

import type { TabsProps } from "antd";
import {
  Flex,
  Table,
  Tabs,
  Input,
  Button,
  Divider,
  Space,
  Typography,
  Skeleton,
  Select,
  Switch,
  Rate,
} from "antd";
import Image from "next/image";
import type { TableColumnsType } from "antd";
import CommentBox from "./CommentBox";
import VideoComponent from "./VideoComponent";
import { AthleteData } from "@/types/database";
import type { GameLog } from "@/types/database";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/CustomerContext";
import type { SportStatConfig } from "@/types/database";
import type { StatCategory } from "@/types/database";
import { formatStatDecimal, formatPhoneNumber } from "@/utils/utils";
import { fetchSportColumnConfig } from "@/lib/queries";
import { calculateFormula, hasValidDependencies } from "@/utils/formulaCalculator";
import { Tooltip } from "antd";
import ProgressBar from "@/components/ProgressBar";

// Mock data interfaces and data for HS profiles
interface RawMeasureables {
  key: string;
  date: string;
  source: string;
  measure: string;
  value: string;
  score: number;
  link: string;
}

const rawMeasureablesColumns = [
  {
    title: "Date",
    dataIndex: "date",
    key: "date",
  },
  {
    title: "Source",
    dataIndex: "source",
    key: "source",
  },
  {
    title: "Measure",
    dataIndex: "measure",
    key: "measure",
  },
  {
    title: "Value",
    dataIndex: "value",
    key: "value",
  },
  {
    title: "Score",
    dataIndex: "score",
    key: "score",
  },
  {
    title: "Link",
    dataIndex: "link",
    key: "link",
    render: (_: unknown, record: RawMeasureables) => (
      <a href={record.link} className="flex items-center">
        View Link
      </a>
    ),
  },
];

const rawMeasureables: RawMeasureables[] = [
  {
    key: "1",
    date: "5/2/2025",
    source: "GPS",
    measure: "Max Speed",
    value: "35.2 km/h",
    score: 92,
    link: "http://localhost:3000/qais-hs-profile",
  },
  {
    key: "2",
    date: "2/3/2025",
    source: "Coach",
    measure: "Vertical Jump",
    value: "32.5 in",
    score: 85,
    link: "http://localhost:3000/qais-hs-profile",
  },
  {
    key: "3",
    date: "5/4/2025",
    source: "Catapult",
    measure: "Resting HR",
    value: "5560",
    score: 88,
    link: "http://localhost:3000/qais-hs-profile",
  },
  {
    key: "4",
    date: "3/6/2025",
    source: "Strength Coach",
    measure: "10m Sprint Time",
    value: "5560",
    score: 82,
    link: "http://localhost:3000/qais-hs-profile",
  },
  {
    key: "5",
    date: "6/7/2025",
    source: "VBT Device",
    measure: "Back Squat 1RM",
    value: "2.85 m",
    score: 78,
    link: "http://localhost:3000/qais-hs-profile",
  },
  {
    key: "6",
    date: "6/7/2025",
    source: "Coach",
    measure: "Standing Broad Jump",
    value: "7.5 hours",
    score: 34,
    link: "http://localhost:3000/qais-hs-profile",
  },
  {
    key: "7",
    date: "6/7/2025",
    source: "Wearable",
    measure: "Sleep Duration",
    value: "5560",
    score: 36,
    link: "http://localhost:3000/qais-hs-profile",
  },
];

interface AthleteComment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  athlete_id: string;
  user_detail_id: string;
  customer_id: string;
  user_detail?: {
    id: string;
    name_first: string;
    name_last: string;
  };
}

const onChange = (key: string) => {
  console.log(key);
};

// Helper function to check if a value is valid and meaningful
const isValidValue = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  
  // Convert to string for consistent checking
  const stringValue = String(value).trim();
  
  // Filter out common invalid values
  const invalidValues = [
    "", 
    "not specified", 
    "not available", 
    "undefined", 
    "null", 
    "n/a", 
    "na"
  ];
  
  return !invalidValues.includes(stringValue.toLowerCase());
};

// Helper function to check if there are actual leaving reasons to display
const hasActualLeavingContent = (athlete: AthleteData | null): boolean => {
  if (!athlete?.generic_survey?.[0]) return false;
  
  const leavingEntries = Object.entries(athlete.generic_survey[0]).filter(
    ([key, value]) => key.startsWith("leaving_") && isValidValue(value)
  );
  
  const inTheirOwnWordsEntry = leavingEntries.find(([key]) => key === "leaving_other");
  const filteredLeavingEntries = leavingEntries.filter(([key]) => key !== "leaving_other");
  
  const majorReasons: Array<{ key: string; label: string; value: string }> = [];
  const minorReasons: Array<{ key: string; label: string; value: string }> = [];
  const otherReasons: Array<{ key: string; label: string; value: string }> = [];
  
  filteredLeavingEntries.forEach(([key, value]) => {
    const val = String(value);
    if (/not a reason/i.test(val)) {
      return; // Skip Not a Reason entries
    } else if (/major reason/i.test(val)) {
      majorReasons.push({ key, label: key.replace("leaving_", "").replace(/_/g, " "), value: val });
    } else if (/minor reason/i.test(val)) {
      minorReasons.push({ key, label: key.replace("leaving_", "").replace(/_/g, " "), value: val });
    } else {
      otherReasons.push({ key, label: key.replace("leaving_", "").replace(/_/g, " "), value: val });
    }
  });
  
  return !!inTheirOwnWordsEntry || majorReasons.length > 0 || minorReasons.length > 0 || otherReasons.length > 0;
};

// Helper function to check if there are actual "What they are looking for?" fields with valid data
const hasActualLookingForContent = (athlete: AthleteData | null): boolean => {
  if (!athlete?.generic_survey?.[0]) return false;
  
  return isValidValue(athlete.generic_survey[0].important) ||
    isValidValue(athlete.generic_survey[0].nil_importance) ||
    isValidValue(athlete.generic_survey[0].nil_amount) ||
    isValidValue(athlete.generic_survey[0].walk_on_t25) ||
    isValidValue(athlete.msoc_survey?.[0]?.best_pos) ||
    isValidValue(athlete.when_transfer) ||
    isValidValue(athlete.generic_survey[0].ideal_division) ||
    isValidValue(athlete.generic_survey[0].full_scholarship_only) ||
    isValidValue(athlete.generic_survey[0].distance_from_home) ||
    isValidValue(athlete.generic_survey[0].ideal_campus_size) ||
    isValidValue(athlete.generic_survey[0].campus_location_type) ||
    isValidValue(athlete.generic_survey[0].cost_vs_acad_rep) ||
    isValidValue(athlete.generic_survey[0].winning_vs_location) ||
    isValidValue(athlete.generic_survey[0].playing_vs_championship) ||
    isValidValue(athlete.generic_survey[0].cost_vs_campus_type) ||
    isValidValue(athlete.generic_survey[0].playing_vs_size) ||
    isValidValue(athlete.generic_survey[0].winning_vs_academics) ||
    isValidValue(athlete.generic_survey[0].facilities_vs_championship) ||
    isValidValue(athlete.generic_survey[0].nfl_vs_facilities) ||
    isValidValue(athlete.generic_survey[0].championship_vs_level) ||
    isValidValue(athlete.generic_survey[0].recent_vs_winning) ||
    isValidValue(athlete.generic_survey[0].championship_vs_location) ||
    isValidValue(athlete.generic_survey[0].party_vs_academics) ||
    isValidValue(athlete.generic_survey[0].party_vs_winning) ||
    isValidValue(athlete.generic_survey[0].type_of_staff_preferred) ||
    isValidValue(athlete.generic_survey[0].male_to_female) ||
    isValidValue(athlete.generic_survey[0].hbcu) ||
    isValidValue(athlete.generic_survey[0].military_school_yesno) ||
    isValidValue(athlete.generic_survey[0].pell_eligible) ||
    isValidValue(athlete.generic_survey[0].faith_based_name) ||
    isValidValue(athlete.generic_survey[0].pref_d1_name) ||
    isValidValue(athlete.generic_survey[0].pref_d2_name) ||
    isValidValue(athlete.generic_survey[0].pref_d3_name) ||
    isValidValue(athlete.generic_survey[0].pref_naia_name);
};

// Configuration for different data sources
type DataSource = 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes';

interface DataSourceConfig {
  tabs: {
    bio: boolean;
    videos: boolean;
    stats: boolean;
    gameLog: boolean;
    survey: boolean;
    notes: boolean;
  };
  bioFields: {
    contactInfo: boolean;
    academicDetails: boolean;
    collegeRosterBio: boolean;
    transferInfo: boolean;
  };
}

const DATA_SOURCE_CONFIGS: Record<DataSource, DataSourceConfig> = {
  transfer_portal: {
    tabs: {
      bio: true,
      videos: false, // Currently commented out anyway
      stats: true,
      gameLog: true,
      survey: true,
      notes: true,
    },
    bioFields: {
      contactInfo: true,
      academicDetails: true,
      collegeRosterBio: true,
      transferInfo: true,
    },
  },
  all_athletes: {
    tabs: {
      bio: true,
      videos: false,
      stats: true,
      gameLog: true,
      survey: false, // Hide survey for general athletes
      notes: true,
    },
    bioFields: {
      contactInfo: false, // Hide contact information for all_athletes
      academicDetails: false, // Hide academic details for all_athletes
      collegeRosterBio: true,
      transferInfo: false, // Hide transfer-specific info
    },
  },
  juco: {
    tabs: {
      bio: false, // Hide bio tab for JUCO
      videos: false,
      stats: true,
      gameLog: false, // JUCO might not have game logs
      survey: false, // Hide survey for JUCO
      notes: true,
    },
    bioFields: {
      contactInfo: true,
      academicDetails: true,
      collegeRosterBio: true,
      transferInfo: false, // JUCO athletes aren't transfers
    },
  },
  high_schools: {
    tabs: {
      bio: false, // Hide bio tab for high schools
      videos: false,
      stats: false,
      gameLog: false,
      survey: false,
      notes: false,
    },
    bioFields: {
      contactInfo: false,
      academicDetails: false,
      collegeRosterBio: false,
      transferInfo: false,
    },
  },
  hs_athletes: {
    tabs: {
      bio: true,
      videos: true, // Enable videos for hs_athletes
      stats: true,
      gameLog: true,
      survey: false, // Hide survey for hs_athletes
      notes: true,
    },
    bioFields: {
      contactInfo: true,
      academicDetails: true,
      collegeRosterBio: true,
      transferInfo: false, // Hide transfer-specific info for hs_athletes
    },
  },
};

// Default config when no dataSource is provided
const DEFAULT_CONFIG: DataSourceConfig = DATA_SOURCE_CONFIGS.transfer_portal;

interface DataType {
  key: string;
  season: string;
  team: string;
  gp: number;
  cmp: number;
  att: number;
  cmp2: number;
  yds: number;
  avg: number;
  td: number;
  int: number;
  lng: number;
  sack: number;
  rtg: number;
  qbr: number | string;
}

const dataSource: DataType[] = [
  {
    key: "1",
    season: "2018",
    team: "KC",
    gp: 1374,
    cmp: 6065,
    att: 6690,
    cmp2: 5948,
    yds: 3536,
    avg: 8811,
    td: 1784,
    int: 9261,
    lng: 8829,
    sack: 6025,
    rtg: 5028,
    qbr: 4600,
  },
  {
    key: "2",
    season: "2019",
    team: "KC",
    gp: 8013,
    cmp: 5560,
    att: 3933,
    cmp2: 1577,
    yds: 8861,
    avg: 5560,
    td: 8861,
    int: 8861,
    lng: 6025,
    sack: 5045,
    rtg: 9359,
    qbr: 5626,
  },
  {
    key: "3",
    season: "2020",
    team: "KC",
    gp: 6065,
    cmp: 1784,
    att: 4600,
    cmp2: 6690,
    yds: 9151,
    avg: 9151,
    td: 9261,
    int: 6065,
    lng: 1439,
    sack: 5028,
    rtg: 4600,
    qbr: 4846,
  },
  {
    key: "4",
    season: "2021",
    team: "KC",
    gp: 1148,
    cmp: 4152,
    att: 9151,
    cmp2: 5028,
    yds: 8829,
    avg: 4846,
    td: 9261,
    int: 1439,
    lng: 4349,
    sack: 9151,
    rtg: 6025,
    qbr: 8013,
  },
  {
    key: "5",
    season: "2022",
    team: "KC",
    gp: 7791,
    cmp: 8013,
    att: 4152,
    cmp2: 8829,
    yds: 9462,
    avg: 5045,
    td: 4846,
    int: 4846,
    lng: 8811,
    sack: 6025,
    rtg: 9374,
    qbr: 3933,
  },
  {
    key: "6",
    season: "2023",
    team: "KC",
    gp: 8811,
    cmp: 4349,
    att: 1577,
    cmp2: 9151,
    yds: 9374,
    avg: 1374,
    td: 6690,
    int: 7791,
    lng: 1577,
    sack: 8861,
    rtg: 6065,
    qbr: 2798,
  },
  {
    key: "7",
    season: "2024",
    team: "KC",
    gp: 9374,
    cmp: 1577,
    att: 5948,
    cmp2: 4600,
    yds: 8861,
    avg: 1374,
    td: 1439,
    int: 1148,
    lng: 5948,
    sack: 8861,
    rtg: 2798,
    qbr: 9151,
  },
  {
    key: "8",
    season: "Career",
    team: "",
    gp: 7791,
    cmp: 8013,
    att: 4152,
    cmp2: 8829,
    yds: 9462,
    avg: 5045,
    td: 4846,
    int: 4846,
    lng: 8811,
    sack: 6025,
    rtg: 9374,
    qbr: "-",
  },
];

const columns: TableColumnsType<DataType> = [
  {
    title: "Season",
    dataIndex: "season",
    key: "season",
  },
  {
    title: " Team",
    dataIndex: "team",
    key: "team",
    render: (_, record) => (
      <div className="flex">
        {/* {record.team && (
          <Image
            src="/kisspng.svg"
            alt={record.team}
            width={38}
            height={23}
            className="mr-2"
          />
        )} */}
        {record.team}
      </div>
    ),
  },
  {
    title: "GP",
    dataIndex: "gp",
    key: "gp",
  },
  {
    title: "CMP",
    dataIndex: "cmp",
    key: "cmp",
  },
  {
    title: "ATT",
    dataIndex: "att",
    key: "att",
  },
  {
    title: "CMP",
    dataIndex: "cmp2",
    key: "cmp2",
  },
  {
    title: "YDS",
    dataIndex: "yds",
    key: "yds",
  },
  {
    title: "AVG",
    dataIndex: "avg",
    key: "avg",
  },
  {
    title: "TD",
    dataIndex: "td",
    key: "td",
  },
  {
    title: "INT",
    dataIndex: "int",
    key: "int",
  },
  {
    title: "LNG",
    dataIndex: "lng",
    key: "lng",
  },
  {
    title: "SACK",
    dataIndex: "sack",
    key: "sack",
  },
  {
    title: "RTG",
    dataIndex: "rtg",
    key: "rtg",
  },
  {
    title: "QBR",
    dataIndex: "qbr",
    key: "qbr",
  },
];

interface AthleteSchool {
  id: string;
  athlete_id: string;
  school_id: string;
  start_date: string;
  end_date: string | null;
  school: {
    id: string;
    name: string;
  };
}

const Bio = ({ athlete, config }: { athlete: AthleteData | null; config: DataSourceConfig }) => {
  // Helper function to check if a value is available
  const isAvailable = (value: any) => {
    return (
      value &&
      value !== "Not Available" &&
      value !== "Not specified" &&
      value !== ""
    );
  };

  // Helper function to get address
  const getAddress = () => {
    const street = athlete?.hometown_street;
    const city = athlete?.hometown;
    const state = athlete?.hometown_state;
    const zip = athlete?.hometown_zip;

    if (!street && !city && !state && !zip) {
      return null;
    }

    // Format zip code to remove decimals
    const formatZip = (zipCode: string | undefined) => {
      if (!zipCode) return "";
      // Remove any non-digit characters and take only the first 5 digits
      const cleanZip = zipCode.replace(/\D/g, "").substring(0, 5);
      return cleanZip;
    };

    const formattedZip = formatZip(zip);

    // Build city, state, zip line without comma between state and zip
    let cityStateZipString = "";
    if (city && state && formattedZip) {
      cityStateZipString = `${city}, ${state} ${formattedZip}`;
    } else if (city && state) {
      cityStateZipString = `${city}, ${state}`;
    } else if (city && formattedZip) {
      cityStateZipString = `${city} ${formattedZip}`;
    } else if (state && formattedZip) {
      cityStateZipString = `${state} ${formattedZip}`;
    } else if (city) {
      cityStateZipString = city;
    } else if (state) {
      cityStateZipString = state;
    } else if (formattedZip) {
      cityStateZipString = formattedZip;
    }

    if (street) {
      return cityStateZipString ? `${street}\n${cityStateZipString}` : street;
    }

    return cityStateZipString;
  };

  const address = getAddress();

  return (
    <div className="bio">
      {/* <h4>Player Links</h4>
      <div className="flex pt-5 pb-6 gap-10">
      </div> */}
      <div className="grid grid-cols-2 gap-5">
        {config.bioFields.contactInfo && (
        <div>
          <h4>Contact Information</h4>
          <div className="grid grid-cols-2 p-5 gap-5">
            {!athlete ? (
              <div>
                <h6>Cell Phone</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.cell_phone) &&
              athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div>
                  <h6>Cell Phone</h6>
                  <h5>{formatPhoneNumber(athlete?.cell_phone)}</h5>
                </div>
              )
            )}
            <div>
              <h6>OK to Contact</h6>
              <h5 className="flex">
                {!athlete ? (
                  <Skeleton.Input
                    active
                    size="small"
                    style={{ width: 60 }}
                  />
                ) : (
                  <>
                    {athlete?.details_tp_page?.[0]?.ok_to_contact ? (
                      <Image
                        className="mr-1"
                        src={"/tick.svg"}
                        alt={"Tick"}
                        width={20}
                        height={20}
                        style={{ width: "auto" }}
                      />
                    ) : (
                      <div
                        className="mr-1 flex items-center justify-center bg-red-500 text-white rounded"
                        style={{ width: "20px", height: "20px", fontSize: "12px" }}
                      >
                        ✕
                      </div>
                    )}
                    {athlete?.details_tp_page?.[0]?.ok_to_contact ? "Yes" : "No"}
                  </>
                )}
              </h5>
            </div>
            {!athlete ? (
              <div>
                <h6>Email Address</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 160 }}
                />
              </div>
            ) : (
              (() => {
                // Prioritize athlete_fact email value over details_tp_page
                const athleteFactEmail = (athlete?.generic_survey?.[0] as any)?.email;
                const detailsTpPageEmail = athlete?.details_tp_page?.[0]?.email;
                const okToContact = athlete?.details_tp_page?.[0]?.ok_to_contact;
                
                // If athlete_fact has a value, use it directly
                if (athleteFactEmail && athleteFactEmail.trim() !== "") {
                  return (
                    <div>
                      <h6>Email Address</h6>
                      <h5>
                        <a href={`mailto:${athleteFactEmail}`}>
                          {athleteFactEmail}
                        </a>
                      </h5>
                    </div>
                  );
                }
                
                // Otherwise, use the value from details_tp_page if available and ok_to_contact is true
                if (isAvailable(detailsTpPageEmail) && okToContact) {
                  return (
                    <div>
                      <h6>Email Address</h6>
                      <h5>
                        <a href={`mailto:${detailsTpPageEmail}`}>
                          {detailsTpPageEmail}
                        </a>
                      </h5>
                    </div>
                  );
                }
                
                return null;
              })()
            )}
            {!athlete ? (
              <div>
                <h6>Date of Birth</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 100 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.birthday) && (
                <div>
                  <h6>Date of Birth</h6>
                  <h5>{athlete?.birthday}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div className="col-span-2">
                <h6>Preferred Contact Way</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 140 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.pref_contact) &&
              athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div className="col-span-2">
                  <h6>Preferred Contact Way</h6>
                  <h5>{athlete?.pref_contact}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Helping with Decision</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.help_decision) &&
              athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div>
                  <h6>Helping with Decision</h6>
                  <h5>{athlete?.help_decision}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Contact Info</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.contact_info) &&
              athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div>
                  <h6>Contact Info</h6>
                  <h5>{athlete?.contact_info}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Eligibility Remaining</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 80 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.eligibility_remaining) && (
                <div>
                  <h6>Eligibility Remaining</h6>
                  <h5>{athlete?.eligibility_remaining}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Club Team</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.club) && (
                <div>
                  <h6>Club Team</h6>
                  <h5 className="flex mb-0">
                    {athlete?.club}
                  </h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>What games should a coach watch when evaluating you?</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 180 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.game_eval) && (
                <div>
                  <h6>What games should a coach watch when evaluating you?</h6>
                  <h5 className="flex mb-0">
                    {athlete?.game_eval}
                  </h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Summer League</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.summer_league) && (
                <div>
                  <h6>Summer League</h6>
                  <h5 className="flex mb-0">
                    {athlete?.summer_league}
                  </h5>
                </div>
              )
            )}
            {!athlete ? (
              <div className="col-span-2">
                <h6>Address</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 200 }}
                />
              </div>
            ) : (
              address && athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div className="col-span-2">
                  <h6>Address</h6>
                  <h5 style={{ whiteSpace: "pre-line" }}>{address}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div className="col-span-2">
                <h6>Comments</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 240 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.details_tp_page?.[0]?.comments) && (
                <div className="col-span-2">
                  <h6>Comments</h6>
                  <h5 style={{ whiteSpace: "pre-line" }}>{athlete?.details_tp_page?.[0]?.comments}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Agent Contact Info</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.generic_survey?.[0]?.agent) && (
                <div>
                  <h6>Agent Contact Info</h6>
                  <h5>{athlete?.generic_survey?.[0]?.agent}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>HS Head Coach</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.generic_survey?.[0]?.hc_name) && (
                <div>
                  <h6>HS Head Coach</h6>
                  <h5>{athlete?.generic_survey?.[0]?.hc_name}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>HS Head Coach Email</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 160 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.generic_survey?.[0]?.hc_email) && (
                <div>
                  <h6>HS Head Coach Email</h6>
                  <h5>
                    <a href={`mailto:${athlete?.generic_survey?.[0]?.hc_email}`}>
                      {athlete?.generic_survey?.[0]?.hc_email}
                    </a>
                  </h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>HS HC Cell</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.generic_survey?.[0]?.hc_number) && (
                <div>
                  <h6>HS HC Cell</h6>
                  <h5>{formatPhoneNumber(athlete?.generic_survey?.[0]?.hc_number)}</h5>
                </div>
              )
            )}
          </div>
        </div>
        )}
        {config.bioFields.academicDetails && (
        <div>
          <h4>Academic Details</h4>
          <div className="grid grid-cols-2 p-5 gap-5">
            {!athlete ? (
              <div className="col-span-2">
                <h6>GPA</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 80 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.gpa) && (
                <div className="col-span-2">
                  <h6>GPA</h6>
                  <h5>{athlete?.gpa}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>HS GPA</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 80 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.generic_survey?.[0]?.hs_gpa) && (
                <div>
                  <h6>HS GPA</h6>
                  <h5>{athlete?.generic_survey?.[0]?.hs_gpa}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Major</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.major) && (
                <div>
                  <h6>Major</h6>
                  <h5>{athlete?.major}</h5>
                </div>
              )
            )}
            {!athlete ? (
              <div>
                <h6>Major Importance</h6>
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 100 }}
                />
              </div>
            ) : (
              isAvailable(athlete?.generic_survey?.[0]?.major_importance) && (
                <div>
                  <h6>Major Importance</h6>
                  <h5>{athlete?.generic_survey?.[0]?.major_importance}</h5>
                </div>
              )
            )}
          </div>
        </div>
        )}
      </div>

      {config.bioFields.collegeRosterBio && (
      <>
      <h4>College Roster Bio</h4>
      <div className="px-3">
        {!athlete ? (
          <>
            <div className="my-3">
              <Skeleton.Input
                active
                size="small"
                style={{ width: "100%", height: 60 }}
              />
            </div>
            <Skeleton.Input
              active
              size="small"
              style={{ width: 180 }}
            />
          </>
        ) : (
          <>
            <p className="my-3">{athlete?.bio || "No bio available."}</p>
            {athlete?.roster_link && (
              <a
                className="text-base font-semibold"
                href={athlete.roster_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                View full roster profile...
              </a>
            )}
          </>
        )}
      </div>
      </>
      )}
    </div>
  );
};


const Stats = ({ athlete }: { athlete: AthleteData | null }) => {
  const [statConfigs, setStatConfigs] = useState<SportStatConfig[]>([]);
  const [statCategories, setStatCategories] = useState<StatCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [athleteSchools, setAthleteSchools] = useState<AthleteSchool[]>([]);
  const [sportId, setSportId] = useState<string | null>(null);

  // Separate useEffect for fetching athlete schools
  useEffect(() => {
    const fetchAthleteSchools = async () => {
      if (!athlete?.id) return;

      try {
        const { data: athleteSchoolData, error: athleteSchoolError } =
          await supabase
            .from("athlete_school")
            .select(
              `
            *,
            school (
              id,
              name
            )
          `
            )
            .eq("athlete_id", athlete.id);

        if (athleteSchoolError) {
          console.error(
            "Error fetching athlete school data:",
            athleteSchoolError
          );
        } else {
          // Ensure we have valid school data
          const validSchools = (athleteSchoolData || []).filter(
            (school: AthleteSchool) =>
              school && school.school && school.school.name && school.start_date
          );
          setAthleteSchools(validSchools);
        }
      } catch (error) {
        console.error("Error in fetchAthleteSchools:", error);
      }
    };

    fetchAthleteSchools();
  }, [athlete?.id]);

  useEffect(() => {
    const fetchStatConfigs = async () => {
      if (!athlete?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Get sport_id directly from athlete table
        const { data: athleteData, error: athleteError } = await supabase
          .from("athlete")
          .select("sport_id")
          .eq("id", athlete.id)
          .single();

        if (athleteError) {
          console.error("Error fetching athlete data:", athleteError);
          setIsLoading(false);
          return;
        }

        if (!athleteData?.sport_id) {
          setIsLoading(false);
          return;
        }

        const sportId = athleteData.sport_id;
        setSportId(sportId);

        // Get stat configs for the sport using fetchSportColumnConfig
        let configData;
        try {
          configData = await fetchSportColumnConfig(sportId, true, false); // Get all stats without deduplication for proper category display
        } catch (configError) {
          console.error("Error fetching stat configs:", configError);
          throw configError;
        }

        if (!configData || configData.length === 0) {
          setIsLoading(false);
          return;
        }



        setStatConfigs(configData);




        // Get stats for the athlete
        // For track and field, golf, tennis, and swimming sports, don't filter by season
        // mtaf: 16, wtaf: 17, mglf: 10, wglf: 11, mten: 14, wten: 15, mswm: 18, wswm: 19
        const isTrackAndField = sportId === 16 || sportId === 17 || sportId === 10 || sportId === 11 || sportId === 14 || sportId === 15 || sportId === 18 || sportId === 19;
        
        let query = supabase
          .from("stat")
          .select("*")
          .eq("athlete_id", athlete.id);
        
        // Only apply season filter for sports not in the bypass list
        if (!isTrackAndField) {
          query = query.gt("season", 2000);
        }
        
        const { data: statsData, error: statsError } = await query
          .order("season", { ascending: false });

        if (statsError) {
          console.error("Error fetching stats:", statsError);
          throw statsError;
        }

        if (!statsData || statsData.length === 0) {
          setIsLoading(false);
          return;
        }

        // Group stats by category and create tables
        const categories = new Map<string, StatCategory>();

        // Process stats data
        const statsBySeason = new Map<string, any>();

        statsData.forEach(
          (stat: {
            season: number;
            name?: string;
            data_type_id: number;
            value: any;
          }) => {


            const seasonKey = `${stat.season}-${stat.name || "Unknown"}`;
            if (!statsBySeason.has(seasonKey)) {
              statsBySeason.set(seasonKey, {
                season: stat.season,
                name: stat.name || "Unknown",
              });
            }
            const seasonData = statsBySeason.get(seasonKey)!;
            seasonData[`stat_${stat.data_type_id}`] = stat.value;
          }
        );


        // Define the constant base columns that will always be first
        // For track and field, golf, tennis, and swimming sports, hide the season and team columns
        const baseColumns = [
          // Only include season column for sports not in the bypass list
          ...(isTrackAndField ? [] : [{
            title: "Season",
            dataIndex: "season",
            key: "season",
            fixed: "left" as const,
            width: 80,
          }]),
          // Only include team column for sports not in the bypass list
          ...(isTrackAndField ? [] : [{
            title: "Team",
            dataIndex: "name",
            key: "name",
            fixed: "left" as const,
            width: 180,
            render: (text: string, record: any) => {
              // Find the school for this season
              const schoolForSeason = athleteSchools.find((school) => {
                if (!school.start_date) return false;

                const startDate = new Date(school.start_date);
                const endDate = school.end_date
                  ? new Date(school.end_date)
                  : new Date();
                const seasonYear = parseInt(record.season);

                // For career stats, use the most recent school
                if (record.season === "Career") {
                  return school === athleteSchools[0];
                }

                const isInRange =
                  seasonYear >= startDate.getFullYear() &&
                  seasonYear <= endDate.getFullYear();

                return isInRange;
              });

              // Get the display name, prioritizing the school name from athleteSchools
              const displayName =
                schoolForSeason?.school?.name || text || "Unknown";

              // Only show the team logo if we have a valid school name
              return (
                <div className="flex items-center">
                  {/* {schoolForSeason?.school?.name && (
                    <Image
                      src="/kisspng.svg"
                      alt={displayName}
                      width={24}
                      height={24}
                      className="mr-0"
                    />
                  )} */}
                  <span>{displayName}</span>
                </div>
              );
            },
          }]),
        ];

        // Filter configData to only include configurations with valid display_order numbers
        const validConfigData = configData.filter((config: SportStatConfig) => {
          const isValid = config.display_order !== null && 
                 config.display_order !== undefined && 
                 !isNaN(config.display_order) && 
                 typeof config.display_order === 'number';
          

          
          return isValid;
        });

        // Sort valid configurations by display_order
        const sortedConfigData = validConfigData.sort((a, b) => a.display_order - b.display_order);



        // Process each stat config
        sortedConfigData.forEach((config: SportStatConfig) => {
          if (!categories.has(config.stat_category)) {
            categories.set(config.stat_category, {
              name: config.stat_category,
              columns: [...baseColumns],
              data: [],
            });
          }

          const category = categories.get(config.stat_category)!;



          // Set appropriate width based on the stat type
          let columnWidth = 80; // default width

          // Adjust width based on the stat type
          switch (config.data_type_id) {
            case 84: // Minutes Played
              columnWidth = 100;
              break;
            case 85: // Goals Against
            case 86: // Goals Against Average
            case 87: // Saves
            case 88: // Save Percentage
              columnWidth = 90;
              break;
            case 98: // GP
            case 83: // GS
              columnWidth = 60;
              break;
            case 100: // Goals
            case 101: // Assists
            case 102: // Points
            case 103: // Shot Attempts
            case 104: // Fouls
              columnWidth = 80;
              break;
          }



          // Handle calculated columns differently
          if (config.is_calculated && config.formula) {
            category.columns.push({
              title: config.display_name,
              dataIndex: `formula_${config.data_type_id}`,
              key: `formula_${config.data_type_id}`,
              width: columnWidth,
              align: "center" as const,
                             render: (value: any, record: any) => {
                 const calculatedValue = calculateFormula(config.formula!, record);
                 return formatStatDecimal(calculatedValue, config.decimal_places, config.is_percentage, config.convert_negative_to_zero);
               },
            });
          } else {
            category.columns.push({
              title: config.display_name,
              dataIndex: `stat_${config.data_type_id}`,
              key: `stat_${config.data_type_id}`,
              width: columnWidth,
              align: "center" as const,
              render: (value: any) =>
                formatStatDecimal(value, config.decimal_places, config.is_percentage, config.convert_negative_to_zero),
            });
          }
        });

        // Add data to categories and check for meaningful stats
        categories.forEach((category: StatCategory) => {
          const categoryData = Array.from(statsBySeason.values());

          // Check if there are any meaningful stats in this category
          const hasMeaningfulStats = categoryData.some((seasonData) => {
            // Check regular stats (excluding GP and GS for now)
            const hasRegularStats = Object.entries(seasonData).some(([key, value]) => {
              // Skip season, name, GP (98), and GS (83) stats
              if (
                key === "season" ||
                key === "name" ||
                key === "stat_98" ||
                key === "stat_83" 
              ) {
                return false;
              }
              // Check if this stat belongs to the current category
              const statTypeId = parseInt(key.replace("stat_", ""));
              const statConfig = configData.find(
                (config: SportStatConfig) =>
                  config.data_type_id === statTypeId &&
                  config.stat_category === category.name
              );
              return statConfig && value !== null && value !== undefined;
            });

            // Check calculated stats
            const hasCalculatedStats = configData.some((config: SportStatConfig) => {
              if (config.is_calculated && config.formula && config.stat_category === category.name) {
                return hasValidDependencies(config.formula, seasonData);
              }
              return false;
            });

            // Check if GP or GS have data and belong to this category (position-aware)
            const hasGpGsStats = Object.entries(seasonData).some(([key, value]) => {
              if (key === "stat_98" || key === "stat_83") {
                const statTypeId = parseInt(key.replace("stat_", ""));
                const statConfig = configData.find(
                  (config: SportStatConfig) =>
                    config.data_type_id === statTypeId &&
                    config.stat_category === category.name
                );
                
                // Position-specific logic for GP/GS
                if (statConfig && value !== null && value !== undefined) {
                  const isGoalie = athlete?.primary_position === "GK";
                  
                  // If player is a goalie, only count GP/GS as meaningful in goalie category
                  if (isGoalie) {
                    return category.name === 'goalie';
                  } else {
                    // If player is not a goalie, only count GP/GS as meaningful in field category
                    return category.name === 'field';
                  }
                }
              }
              return false;
            });

            return hasRegularStats || hasCalculatedStats || hasGpGsStats;
          });




          if (hasMeaningfulStats) {
            category.data = categoryData;
          } else {
            category.data = [];
          }
        });

        // Filter out categories with no meaningful stats
        const meaningfulCategories = Array.from(categories.values()).filter(
          (category: StatCategory) => category.data && category.data.length > 0
        );



        // Capitalize first letter of category names and sort in desired order
        const processedCategories = meaningfulCategories.map((category) => ({
          ...category,
          name:
            typeof category.name === "string" && category.name.length > 0
              ? category.name.charAt(0).toUpperCase() +
                category.name.slice(1).toLowerCase()
              : "",
        }));

        // Define the desired order for baseball categories
        const categoryOrder = ["Hitting", "Pitching", "Fielding"];

        // Sort categories based on the defined order, with any undefined categories at the end
        const sortedCategories = processedCategories.sort((a, b) => {
          const aIndex = categoryOrder.indexOf(a.name);
          const bIndex = categoryOrder.indexOf(b.name);

          // If both categories are in the order list, sort by their position
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          // If only one is in the order list, prioritize it
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          // If neither is in the order list, maintain original order
          return 0;
        });

        setStatCategories(sortedCategories);
      } catch (error) {
        console.error("Error in fetchStatConfigs:", {
          error,
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatConfigs();
  }, [athlete?.id, athleteSchools]); // Add athleteSchools to dependencies

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  if (statCategories.length === 0) {
    return <div>No statistics available.</div>;
  }

  return (
    <div>
      {statCategories.map((category, index) => {
        return (
          <div key={category.name} className="mb-10">
            {sportId && String(sportId) !== "3" && <h4>{category.name}</h4>}
            <div className="overflow-x-auto">
              <Table
                dataSource={category.data}
                columns={category.columns}
                pagination={false}
                rowKey={(record) =>
                  `${athlete?.id}-${record.season}-${record.name}`
                }
                scroll={{ x: "max-content" }}
              />
            </div>
            {index < statCategories.length - 1 && <div className="h-4" />}
          </div>
        );
      })}
    </div>
  );
};

const GameLog = ({ athlete }: { athlete: AthleteData | null }) => {
  const gameLogs = athlete?.game_logs || [];
  const isGoalie = athlete?.primary_position === "GK";

  const gameLogColumns = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
    },
    {
      title: "Opponent",
      dataIndex: "opponent",
      key: "opponent",
    },
    {
      title: "Season",
      dataIndex: "season",
      key: "season",
    },
    ...(isGoalie
      ? [
          {
            title: "GA",
            dataIndex: "ga",
            key: "ga",
          },
          {
            title: "Saves",
            dataIndex: "saves",
            key: "saves",
          },
          {
            title: "SV %",
            dataIndex: "sv_pct",
            key: "sv_pct",
            render: (value: number) => `${value}%`,
          },
          {
            title: "G Min",
            dataIndex: "g_min_played",
            key: "g_min_played",
          },
        ]
      : [
          {
            title: "Goals",
            dataIndex: "goals",
            key: "goals",
          },
          {
            title: "Assists",
            dataIndex: "assists",
            key: "assists",
          },
          {
            title: "Points",
            dataIndex: "points",
            key: "points",
          },
          {
            title: "ShAtt",
            dataIndex: "sh_att",
            key: "sh_att",
          },
          {
            title: "Fouls",
            dataIndex: "fouls",
            key: "fouls",
          },
        ]),
  ];

  return (
    <div>
      <div className="mb-10">
        <h4>Game Log</h4>
        <Table
          dataSource={gameLogs}
          columns={gameLogColumns}
          pagination={false}
        />
      </div>
    </div>
  );
};

const Survey = ({ athlete }: { athlete: AthleteData | null }) => {

  // Add debug logging
  console.log("Survey Data:", {
    hasSurvey: !!athlete?.generic_survey?.[0],
    surveyData: athlete?.generic_survey?.[0],
    allValues: athlete?.generic_survey?.[0]
      ? Object.values(athlete.generic_survey[0])
      : [],
    hasAnyValue: athlete?.generic_survey?.[0]
      ? Object.values(athlete.generic_survey[0]).some(isValidValue)
      : false,
  });

  // Check if any survey questions are answered
  const hasSurveyData =
    athlete?.generic_survey?.[0] &&
    Object.values(athlete.generic_survey[0]).some(isValidValue);

  if (!hasSurveyData) {
    return null;
  }

  // --- Subcategorize leaving reasons ---
  const leavingEntries = Object.entries(
    athlete?.generic_survey?.[0] || {}
  ).filter(
    ([key, value]) =>
      key.startsWith("leaving_") && isValidValue(value)
  );

  // Extract 'leaving_other' if present
  const inTheirOwnWordsEntry = leavingEntries.find(
    ([key]) => key === "leaving_other"
  );
  const filteredLeavingEntries = leavingEntries.filter(
    ([key]) => key !== "leaving_other"
  );

  const majorReasons: Array<{ key: string; label: string; value: string }> = [];
  const minorReasons: Array<{ key: string; label: string; value: string }> = [];
  // Not a Reason entries will be ignored and not rendered
  const otherReasons: Array<{ key: string; label: string; value: string }> = [];

  // Helper to prettify the label
  const prettifyLabel = (key: string) => {
    switch (key) {
      case "leaving_other":
        return "In their own words";
      case "leaving_playing_time":
        return "Playing Time";
      case "leaving_higher_level":
        return "Desire a higher level";
      case "leaving_coaches":
        return "Coaches";
      case "leaving_eligible_academic":
        return "Ineligible - academics";
      case "leaving_eligible_discipline":
        return "Ineligible - discipline";
      case "leaving_eligible_other":
        return "Ineligible - other";
      case "leaving_better_academics":
        return "Want better academics";
      case "leaving_major":
        return "Major";
      case "leaving_home":
        return "Closer to home";
      default:
        return key
          .replace("leaving_", "")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  filteredLeavingEntries.forEach(([key, value]) => {
    const val = String(value);
    if (/not a reason/i.test(val)) {
      // Skip Not a Reason entries entirely
      return;
    } else if (/major reason/i.test(val)) {
      majorReasons.push({ key, label: prettifyLabel(key), value: val });
    } else if (/minor reason/i.test(val)) {
      minorReasons.push({ key, label: prettifyLabel(key), value: val });
    } else {
      otherReasons.push({ key, label: prettifyLabel(key), value: val });
    }
  });

  // Check if there are any "What they are looking for?" answers
  const hasLookingForData =
    (athlete?.generic_survey?.[0] &&
    Object.entries(athlete.generic_survey[0]).some(
      ([key, value]) =>
        !key.startsWith("leaving_") &&
        isValidValue(value) &&
        key !== "cell" &&
        key !== "pref_contact" &&
        key !== "help_decision" &&
        key !== "gpa" &&
        key !== "major_importance" &&
        key !== "highlight" &&
        key !== "hs_highlight"
    )) ||
    isValidValue(athlete?.when_transfer) ||
    isValidValue(athlete?.msoc_survey?.[0]?.best_pos);

  // Use shared helper functions
  const hasActualLookingForContentValue = hasActualLookingForContent(athlete);
  const hasActualLeavingContentValue = hasActualLeavingContent(athlete);

  // If there's no leaving data and no looking for data, return null
  if (leavingEntries.length === 0 && !hasLookingForData) {
    return null;
  }

  return (
    <div>
      {hasActualLeavingContentValue && (
        <div>
          <h4>Why they are leaving?</h4>
          {/* In their own words always at the top */}
          {inTheirOwnWordsEntry && (
            <div
              className="flex items-start survey mb-5"
              key={inTheirOwnWordsEntry[0]}
            >
              <i className="icon-arrow-right text-2xl mr-2"></i>
              <div>
                <h6>In their own words</h6>
                <p>{inTheirOwnWordsEntry[1]}</p>
              </div>
            </div>
          )}
          {majorReasons.length > 0 && (
            <div className="mb-5">
              <h5 className="font-semibold mb-2">Major Reason</h5>
              {majorReasons.map(({ key, label }) => (
                <div className="flex items-start survey mb-2" key={key}>
                  <i className="icon-arrow-right mr-2"></i>
                  <div>
                    <h6>{label}</h6>
                  </div>
                </div>
              ))}
            </div>
          )}
          {minorReasons.length > 0 && (
            <div className="mb-5">
              <h5 className="font-semibold mb-2">Minor Reason</h5>
              {minorReasons.map(({ key, label }) => (
                <div className="flex items-start survey mb-2" key={key}>
                  <i className="icon-arrow-right mr-2"></i>
                  <div>
                    <h6>{label}</h6>
                  </div>
                </div>
              ))}
            </div>
          )}
          {otherReasons.length > 0 && (
            <div className="mb-5">
              {otherReasons.map(({ key, label, value }) => (
                <div className="flex items-start survey mb-2" key={key}>
                  <i className="icon-arrow-right mr-2"></i>
                  <div>
                    <h6>{label}</h6>
                    <p>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasActualLookingForContentValue && (
        <div>
          <h4>What they are looking for?</h4>
          {isValidValue(athlete?.generic_survey?.[0]?.important) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right text-2xl mr-2"></i>
              <div>
                <h6>
                  What is important to you as you look for your next school?
                </h6>
                <p>{athlete?.generic_survey?.[0]?.important}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.nil_importance) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>NIL Importance</h6>
                <p>{athlete?.generic_survey?.[0]?.nil_importance}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.nil_amount) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>NIL expected amount</h6>
                <p>{athlete?.generic_survey?.[0]?.nil_amount}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.walk_on_t25) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Are you open to walking on at a top program?</h6>
                <p>{athlete?.generic_survey?.[0]?.walk_on_t25}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.msoc_survey?.[0]?.best_pos) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred position</h6>
                <p>{athlete?.msoc_survey?.[0]?.best_pos}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.when_transfer) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>When are you looking to transfer?</h6>
                <p>{athlete?.when_transfer}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.ideal_division) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Ideal division</h6>
                <p>{athlete?.generic_survey?.[0]?.ideal_division}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.full_scholarship_only) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Full scholarship only</h6>
                <p>
                  {String(
                    athlete?.generic_survey?.[0]?.full_scholarship_only
                  ).toLowerCase() === "true"
                    ? "Yes"
                    : "No"}
                </p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.distance_from_home) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Distance from home</h6>
                <p>{athlete?.generic_survey?.[0]?.distance_from_home}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.ideal_campus_size) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Ideal campus size</h6>
                <p>{athlete?.generic_survey?.[0]?.ideal_campus_size}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.campus_location_type) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Campus location type</h6>
                <p>{athlete?.generic_survey?.[0]?.campus_location_type}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.cost_vs_acad_rep) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Cost vs academic reputation</h6>
                <p>{athlete?.generic_survey?.[0]?.cost_vs_acad_rep}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.winning_vs_location) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Winning vs location</h6>
                <p>{athlete?.generic_survey?.[0]?.winning_vs_location}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.playing_vs_championship) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Playing time vs championship</h6>
                <p>{athlete?.generic_survey?.[0]?.playing_vs_championship}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.cost_vs_campus_type) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Cost vs campus type</h6>
                <p>{athlete?.generic_survey?.[0]?.cost_vs_campus_type}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.playing_vs_size) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Playing time vs size</h6>
                <p>{athlete?.generic_survey?.[0]?.playing_vs_size}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.winning_vs_academics) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Winning vs academics</h6>
                <p>{athlete?.generic_survey?.[0]?.winning_vs_academics}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.facilities_vs_championship) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Facilities vs championship</h6>
                <p>{athlete?.generic_survey?.[0]?.facilities_vs_championship}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.nfl_vs_facilities) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Produce NFL players vs facilities</h6>
                <p>{athlete?.generic_survey?.[0]?.nfl_vs_facilities}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.championship_vs_level) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Championship vs highest level</h6>
                <p>{athlete?.generic_survey?.[0]?.championship_vs_level}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.recent_vs_winning) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Recent winning vs winning tradition</h6>
                <p>{athlete?.generic_survey?.[0]?.recent_vs_winning}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.championship_vs_location) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Championship vs location</h6>
                <p>{athlete?.generic_survey?.[0]?.championship_vs_location}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.party_vs_academics) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Party vs academics</h6>
                <p>{athlete?.generic_survey?.[0]?.party_vs_academics}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.party_vs_winning) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Party vs winning</h6>
                <p>{athlete?.generic_survey?.[0]?.party_vs_winning}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.type_of_staff_preferred) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Type of staff discipline preferred</h6>
                <p>{athlete?.generic_survey?.[0]?.type_of_staff_preferred}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.male_to_female) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Male to female</h6>
                <p>{athlete?.generic_survey?.[0]?.male_to_female}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.hbcu) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>HBCU</h6>
                <p>{athlete?.generic_survey?.[0]?.hbcu}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.military_school_yesno) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Would Consider Military School</h6>
                <p>{athlete?.generic_survey?.[0]?.military_school_yesno}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.pell_eligible) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Pell eligible?</h6>
                <p>{athlete?.generic_survey?.[0]?.pell_eligible}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.faith_based_name) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Faith-based names</h6>
                <p>{athlete?.generic_survey?.[0]?.faith_based_name}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.pref_d1_name) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred D1 name</h6>
                <p>{athlete?.generic_survey?.[0]?.pref_d1_name}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.pref_d2_name) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred D2 name</h6>
                <p>{athlete?.generic_survey?.[0]?.pref_d2_name}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.pref_d3_name) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred D3 name</h6>
                <p>{athlete?.generic_survey?.[0]?.pref_d3_name}</p>
              </div>
            </div>
          )}
          {isValidValue(athlete?.generic_survey?.[0]?.pref_naia_name) && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred NAIA name</h6>
                <p>{athlete?.generic_survey?.[0]?.pref_naia_name}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Notes = ({ athlete }: { athlete: AthleteData | null }) => {
  const [commentList, setCommentList] = useState<AthleteComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<AthleteComment | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userDetails = useUser();

  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        // Get current session
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.user?.id && userDetails) {
          setUserTeamId(userDetails.customer_id);
        } else if (currentSession?.user?.id && !userDetails) {
          console.error("No team ID found for user");
        }
      } catch (error) {
        console.error("Error initializing session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event: string, currentSession: any) => {
        setSession(currentSession);

        if (currentSession?.user?.id && userDetails) {
          setUserTeamId(userDetails.customer_id);
        } else if (currentSession?.user?.id && !userDetails) {
          console.error("No team ID found for user");
        } else {
          setUserTeamId(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [userDetails]);

  const fetchCommentList = async (athleteId: string) => {
    if (!athleteId) {
      console.error("No athlete ID provided");
      return;
    }

    try {
      console.log("Fetching comments for athlete:", athleteId);
      const { data: commentData, error: commentError } = await supabase
        .from("comment")
        .select(
          `
          *,
          user_detail!inner (
            id,
            name_first,
            name_last
          )
        `
        )
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });

      if (commentError) {
        console.error("Supabase error fetching comments:", commentError);
        throw commentError;
      }

      console.log("Fetched comment data:", commentData);
      setCommentList(commentData || []);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error fetching comments:", {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
      } else {
        console.error("An unknown error occurred while fetching comments:", {
          error,
          type: typeof error,
        });
      }
      setCommentList([]);
    }
  };

  const handleSaveComment = async () => {
    if (!athlete?.id || !newComment.trim() || isSubmitting) {
      return;
    }

    if (!session?.user?.id) {
      console.error("No user session found");
      return;
    }

    if (!userTeamId) {
      console.error("No team ID found for user");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingComment) {
        // Update existing comment
        const { error } = await supabase
          .from("comment")
          .update({
            content: newComment,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingComment.id)
          .eq("user_id", session.user.id);

        if (error) {
          console.error("Error updating comment:", error);
          throw error;
        }
      } else {
        // Create new comment
        const { error } = await supabase.from("comment").insert({
          content: newComment,
          athlete_id: athlete.id,
          user_id: session.user.id,
          customer_id: userTeamId,
        });

        if (error) {
          console.error("Error creating comment:", error);
          throw error;
        }
      }

      // Refresh comments
      await fetchCommentList(athlete.id);
      setNewComment("");
      setEditingComment(null);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error in handleSaveComment:", error.message);
      } else {
        console.error("An unknown error occurred while saving comment:", error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = (comment: AthleteComment) => {
    setEditingComment(comment);
    setNewComment(comment.content);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    if (!session?.user?.id) {
      console.error("No user session found");
      return;
    }

    try {
      const { error } = await supabase
        .from("comment")
        .delete()
        .eq("id", commentId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      // Refresh comments
      if (athlete?.id) {
        await fetchCommentList(athlete.id);
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  useEffect(() => {
    if (athlete?.id) {
      fetchCommentList(athlete.id);
    }
  }, [athlete?.id]);

  if (isLoading) {
    return (
      <Flex vertical>
        <h4>Notes</h4>
        <div>Loading...</div>
      </Flex>
    );
  }

  return (
    <Flex vertical>
      <h4>Notes</h4>
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
              disabled={!newComment.trim() || !session?.user?.id}
            >
              {editingComment ? "Update" : "Save"}
            </Button>
          </Flex>
        </Flex>

        <Divider />

        {commentList.map((comment) => (
          <Flex vertical key={comment.id} className="comment-item">
            <Flex gap={16} align="flex-start">
              <div className="bg-[#F5F5F5] px-3 py-1 rounded-md">
                <Typography.Text strong>
                  {comment.user_detail?.name_first}{" "}
                  {comment.user_detail?.name_last}
                </Typography.Text>
              </div>
              <Typography.Paragraph className="flex-1">
                {comment.content}
              </Typography.Paragraph>
            </Flex>
            <Flex justify="space-between" align="center">
              <Typography.Text type="secondary">
                {new Date(comment.created_at).toLocaleString()}
              </Typography.Text>
              {comment.user_id === session?.user?.id && (
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
    </Flex>
  );
};

// Date Range Filter Component
const DateRangeFilter = ({ 
  dateRange, 
  setDateRange, 
  confirm, 
  clearFilters 
}: { 
  dateRange: [string, string]; 
  setDateRange: (range: [string, string]) => void; 
  confirm: () => void; 
  clearFilters: () => void; 
}) => {
  const [localStartDate, setLocalStartDate] = useState(dateRange[0]);
  const [localEndDate, setLocalEndDate] = useState(dateRange[1]);
  
  return (
    <div style={{ padding: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <Input
          type="date"
          placeholder="Start Date"
          value={localStartDate}
          onChange={(e) => setLocalStartDate(e.target.value)}
          style={{ width: 200, marginBottom: 4, display: 'block' }}
        />
        <Input
          type="date"
          placeholder="End Date"
          value={localEndDate}
          onChange={(e) => setLocalEndDate(e.target.value)}
          style={{ width: 200, display: 'block' }}
        />
      </div>
      <Space>
        <Button
          type="primary"
          onClick={() => {
            setDateRange([localStartDate, localEndDate]);
            confirm();
          }}
          size="small"
          style={{ width: 90 }}
        >
          Filter
        </Button>
        <Button
          onClick={() => {
            setLocalStartDate('');
            setLocalEndDate('');
            setDateRange(['', '']);
            clearFilters();
          }}
          size="small"
          style={{ width: 90 }}
        >
          Reset
        </Button>
      </Space>
    </div>
  );
};

// Dynamic Activity for HS profiles using offers table
const Activity = ({ athlete, events }: { athlete: AthleteData | null; events?: any[] }) => {
  // State for date range filter (only affects the table, not the offers logo section)
  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);
  
  // All events - unfiltered (used for offers logo section)
  const allEventsRaw = events || [];
  
  // Build offers from ALL events (not filtered by date) for the logo section
  const offers = allEventsRaw.filter((e: any) => (e?.type || '').toString().toLowerCase() === 'offer');
  
  // Apply date filter manually ONLY for the table
  const filteredEventsForTable = useMemo(() => {
    const [startDate, endDate] = dateRange;
    
    // If both dates are empty, show all
    if (!startDate && !endDate) {
      return allEventsRaw;
    }
    
    return allEventsRaw.filter((record: any) => {
      const recordDateStr = record.offer_date || record.created_at;
      if (!recordDateStr) return false;
      
      // Parse the record date
      const recordDate = new Date(recordDateStr);
      recordDate.setHours(0, 0, 0, 0);
      
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return recordDate >= start && recordDate <= end;
      } else if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        return recordDate >= start;
      } else if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return recordDate <= end;
      }
      
      return true;
    });
  }, [allEventsRaw, dateRange]);

  // Deduplicate by school_id while preserving first occurrence data
  const offerSchools = Array.from(
    offers.reduce((map: Map<string, { schoolId: string; name: string; logo: string | null; rank: number | null; date: string | null }>, e: any) => {
      const sid = e?.school_id;
      if (!sid || map.has(sid)) return map;
      map.set(sid, {
        schoolId: sid,
        name: e?.school_name || 'Unknown School',
        logo: e?.school_logo_url || null,
        rank: e?.school_rank || null,
        date: e?.offer_date || e?.created_at || null,
      });
      return map;
    }, new Map()).values()
  ).sort((a: any, b: any) => {
    // Sort by rank (low to high), null ranks go to the end
    if (a.rank === null && b.rank === null) return 0;
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  });

  // Format date for display
  const formatEventDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Format type for display
  const formatType = (type: string | null | undefined) => {
    if (!type) return 'Unknown';
    const typeStr = type.toString().toLowerCase();
    
    // Map types to display names
    const typeMap: Record<string, string> = {
      'offer': 'Offer',
      'commit': 'Commit',
      'decommit': 'Decommit',
      'de-commit': 'Decommit',
      'de_commit': 'Decommit',
      'visit': 'Visit',
      'official_visit': 'Official Visit',
      'unofficial_visit': 'Unofficial Visit',
    };
    
    return typeMap[typeStr] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get action verb for the type
  const getActionText = (type: string | null | undefined, athleteName: string | null | undefined, schoolName: string | null | undefined) => {
    if (!type) return '';
    const typeStr = type.toString().toLowerCase();
    const name = athleteName || 'Athlete';
    const school = schoolName || 'Unknown School';
    
    const actionMap: Record<string, string> = {
      'offer': `${name} received an offer from ${school}`,
      'commit': `${name} committed to ${school}`,
      'decommit': `${name} decommitted from ${school}`,
      'de-commit': `${name} decommitted from ${school}`,
      'de_commit': `${name} decommitted from ${school}`,
      'visit': `${name} visited ${school}`,
      'official_visit': `${name} officially visited ${school}`,
      'unofficial_visit': `${name} unofficially visited ${school}`,
    };
    
    return actionMap[typeStr] || `${name} ${typeStr} ${school}`;
  };

  // Get icon for the activity type
  const getTypeIcon = (type: string | null | undefined) => {
    if (!type) return null;
    const typeStr = type.toString().toLowerCase();
    
    const iconMap: Record<string, { icon: string; color: string; style?: any }> = {
      'offer': { icon: 'icon-check-2', color: '#52c41a' },
      'commit': { icon: 'icon-check', color: '#52c41a', style: { fontWeight: 'bold' } },
      'decommit': { icon: 'icon-ban', color: '#ff4d4f' },
      'de-commit': { icon: 'icon-ban', color: '#ff4d4f' },
      'de_commit': { icon: 'icon-ban', color: '#ff4d4f' },
      'official_visit': { icon: 'icon-check-2', color: '#52c41a' },
      'unofficial_visit': { icon: 'icon-location', color: '#8c8c8c' },
      'visit': { icon: 'icon-location', color: '#8c8c8c' },
      'camp': { icon: 'icon-tent', color: '#8c8c8c' },
    };
    
    return iconMap[typeStr] || null;
  };

  // Get athlete's full name
  const athleteName = athlete?.name_first && athlete?.name_last 
    ? `${athlete.name_first} ${athlete.name_last}` 
    : 'Athlete';

  return (
    <div className="activity">
      <h4>Offers{offerSchools.length ? ` (${offerSchools.length})` : ''}</h4>
      <div className="">
        <div className="flex flex-wrap gap-3">
          {offerSchools.map((s: any) => {
            const tooltipTitle = s.date 
              ? <>{s.name}<br />{formatEventDate(s.date)}</>
              : s.name;
            
            return (
              <Tooltip key={s.schoolId as string} title={tooltipTitle} placement="top">
                <div className="group cursor-pointer relative card">
                  <Image
                    src={s.logo || '/blank-hs.svg'}
                    alt={s.name as string}
                    width={95}
                    height={95}
                    className="w-16 h-16 object-contain rounded-lg border border-gray-200 p-1 transition-transform group-hover:scale-110"
                  />
                </div>
              </Tooltip>
            );
          })}
        </div>
        </div>
      
      {/* Added legacy activity visualization above All Activity */}
      {false && (
      <div className="flex flex-col gap-3 mt-5">
        <h3 className="!text-xl font-semibold text-gray-900 mb-4">Activity</h3>
        <div className="w-full bg-white -lg border border-gray-200">
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-gray-200">
            <div className="text-[#1C1D4D] font-medium" style={{ paddingLeft: '70px' }}>12/10/2024</div>
            <div className="text-[#1C1D4D] font-medium">Today</div>
          </div>

          {/* Timeline Rows */}
          <div className="flex flex-col gap-2 mb-6">
            {/* Row 1: Black B logo - Orange bar */}
            <div className="flex items-center">
              <div className="flex items-center gap-2 flex-shrink-0 card !p-1 !pr-2 h-[40px]">
                <div className="w-8 h-8 bg-black flex items-center justify-center ">
                  <span className="text-yellow-500 font-bold text-sm">B</span>
                </div>
                <span className="text-[#1C1D4D] font-semibold text-xl">5</span>
              </div>
              <div className="flex-1 relative h-[40px] bg-slate-100 border border-gray-200 ">
                <div className="absolute h-full bg-orange-500 " style={{ left: '25%', width: '70px' }}></div>
              </div>
            </div>

            {/* Row 2: UCF Gold Shield - Light Blue bar */}
            <div className="flex items-center">
              <div className="flex items-center gap-2 flex-shrink-0 card !p-1 !pr-2 h-[40px]">
                <div className="w-8 h-8 bg-yellow-500 flex items-center justify-center ">
                  <span className="text-white font-bold text-xs">UCF</span>
                </div>
                <span className="text-[#1C1D4D] font-semibold text-xl">2</span>
              </div>
              <div className="flex-1 relative h-[40px] bg-slate-100 border border-gray-200 ">
                <div className="absolute h-full bg-blue-300 " style={{ left: '75%', width: '70px' }}></div>
              </div>
            </div>

            {/* Row 3: New Mexico Red Eagle - Green bar */}
            <div className="flex items-center">
              <div className="flex items-center gap-2 flex-shrink-0 card !p-1 !pr-2 h-[40px]">
                <div className="w-8 h-8 bg-red-600 flex items-center justify-center  overflow-hidden">
                  <img src="/red-eagle.png" alt="New Mexico" className="w-full h-full object-cover" />
                </div>
                <span className="text-[#1C1D4D] font-semibold text-xl">1</span>
              </div>
              <div className="flex-1 relative h-[40px] bg-slate-100 border border-gray-200 ">
                <div className="absolute h-full bg-green-500 " style={{ left: '50%', width: '70px' }}></div>
              </div>
            </div>

            {/* Row 4: Orange Hawk - Green and Dark Blue bars */}
            <div className="flex items-center">
              <div className="flex items-center gap-2 flex-shrink-0 card !p-1 !pr-2 h-[40px]">
                <div className="w-8 h-8 bg-orange-500 flex items-center justify-center  overflow-hidden">
                  <img src="/tm.png" alt="Team" className="w-full h-full object-cover" />
                </div>
                <span className="text-[#1C1D4D] font-semibold text-xl">2</span>
              </div>
              <div className="flex-1 relative h-[40px] bg-slate-100 border border-gray-200 ">
                <div className="absolute h-full bg-green-500 " style={{ left: '25%', width: '70px' }}></div>
                <div className="absolute h-full bg-[#1C1D4D] " style={{ left: '75%', width: '70px' }}></div>
              </div>
            </div>

            {/* Row 5: West Georgia Blue Wolf - Dark Blue bar */}
            <div className="flex items-center">
              <div className="flex items-center gap-2 flex-shrink-0 card !p-1 !pr-2 h-[40px]">
                <div className="w-8 h-8 bg-blue-600 flex items-center justify-center  overflow-hidden">
                  <img src="/red-wolf.png" alt="West Georgia" className="w-full h-full object-cover" />
                </div>
                <span className="text-[#1C1D4D] font-semibold text-xl">3</span>
              </div>
              <div className="flex-1 relative h-[40px] bg-slate-100 border border-gray-200 ">
                <div className="absolute h-full bg-[#1C1D4D] " style={{ left: '33%', width: '70px' }}></div>
              </div>
            </div>

            {/* Row 6: Red Cardinal - Dark Blue bar */}
            <div className="flex items-center">
              <div className="flex items-center gap-2 flex-shrink-0 card !p-1 !pr-2 h-[40px]">
                <div className="w-8 h-8 bg-red-600 flex items-center justify-center  overflow-hidden">
                  <img src="/yt.png" alt="Cardinal" className="w-full h-full object-cover" />
                </div>
                <span className="text-[#1C1D4D] font-semibold text-xl">2</span>
              </div>
              <div className="flex-1 relative h-[40px] bg-slate-100 border border-gray-200 ">
                <div className="absolute h-full bg-[#1C1D4D] " style={{ left: '50%', width: '70px' }}></div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 "></div>
              <span className="text-sm text-gray-700">Offer</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 "></div>
              <span className="text-sm text-gray-700">Commit</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#1C1D4D] "></div>
              <span className="text-sm text-gray-700">Camp</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-300 "></div>
              <span className="text-sm text-gray-700">Visit</span>
            </div>
          </div>
        </div>
      </div>
      )}

      <div className=" mt-5">
        <h4>All Activity</h4>
        {allEventsRaw.length === 0 ? (
          <p className="text-gray-500 italic">No activity recorded</p>
        ) : (
          <Table
            dataSource={filteredEventsForTable.map((event: any, index: number) => ({
              ...event,
              key: event.id || index,
            }))}
            columns={[
              {
                title: "College",
                dataIndex: "school_name",
                key: "school_name",
                filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
                  // Get unique school names from ALL data (not filtered by date)
                  const uniqueSchools = [...new Set(allEventsRaw
                    .map(event => event.school_name)
                    .filter(name => name && name !== 'Unknown School')
                  )].sort();
                  
                  return (
                    <div style={{ padding: 8 }}>
                      <Select
                        mode="multiple"
                        placeholder="Select colleges"
                        value={selectedKeys}
                        onChange={(value) => setSelectedKeys(value || [])}
                        style={{ width: 200, marginBottom: 8, display: 'block' }}
                        allowClear
                      >
                        {uniqueSchools.map(school => (
                          <Select.Option key={school} value={school}>
                            {school}
                          </Select.Option>
                        ))}
                      </Select>
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => confirm()}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Filter
                        </Button>
                        <Button
                          onClick={() => {
                            clearFilters();
                            confirm();
                          }}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Reset
                        </Button>
                      </Space>
        </div>
                  );
                },
                onFilter: (value: any, record: any) => {
                  if (!value || value.length === 0) return true;
                  const selectedValues = Array.isArray(value) ? value : [value];
                  return selectedValues.includes(record.school_name);
                },
                render: (_: any, record: any) => (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {record.school_logo_url && (
                      <img
                        src={record.school_logo_url}
                        alt={record.school_name || 'School Logo'}
                        style={{
                          width: 24,
                          height: 24,
                          objectFit: 'contain',
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {record.school_name || 'Unknown School'}
        </div>
                      <div style={{ fontSize: 12, color: "#666" }}>
                        {getActionText(record.type, athleteName, record.school_name)}
        </div>
        </div>
      </div>
                ),
              },
              {
                title: "Event Date",
                dataIndex: "offer_date",
                key: "offer_date",
                filterDropdown: ({ confirm, clearFilters }: any) => (
                  <DateRangeFilter 
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    confirm={confirm}
                    clearFilters={clearFilters}
                  />
                ),
                render: (_: any, record: any) => formatEventDate(record.offer_date || record.created_at),
              },
              {
                title: "Activity",
                dataIndex: "type",
                key: "type",
                filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
                  // Get unique activity types from ALL data (not filtered by date)
                  const uniqueTypes = [...new Set(allEventsRaw
                    .map(event => formatType(event.type))
                    .filter(type => type && type !== 'Unknown')
                  )].sort();
                  
                  return (
                    <div style={{ padding: 8 }}>
                      <Select
                        mode="multiple"
                        placeholder="Select activities"
                        value={selectedKeys}
                        onChange={(value) => setSelectedKeys(value || [])}
                        style={{ width: 200, marginBottom: 8, display: 'block' }}
                        allowClear
                      >
                        {uniqueTypes.map(type => (
                          <Select.Option key={type} value={type}>
                            {type}
                          </Select.Option>
                        ))}
                      </Select>
                      <Space>
                        <Button
                          type="primary"
                          onClick={() => confirm()}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Filter
                        </Button>
                        <Button
                          onClick={() => {
                            clearFilters();
                            confirm();
                          }}
                          size="small"
                          style={{ width: 90 }}
                        >
                          Reset
                        </Button>
                      </Space>
              </div>
                  );
                },
                onFilter: (value: any, record: any) => {
                  if (!value || value.length === 0) return true;
                  const selectedValues = Array.isArray(value) ? value : [value];
                  const recordType = formatType(record.type);
                  return selectedValues.includes(recordType);
                },
                render: (type: any) => {
                  const typeIcon = getTypeIcon(type);
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{formatType(type)}</span>
                      {typeIcon && (
                        <i
                          className={typeIcon.icon}
                          style={{
                            color: typeIcon.color,
                            fontSize: '16px',
                            ...(typeIcon.style || {})
                          }}
                        ></i>
                      )}
              </div>
                  );
                },
              },
            ]}
            pagination={false}
            scroll={{ x: "max-content" }}
          />
        )}
    </div>
  </div>
);
};

const HSBio = ({ 
  athlete, 
  bioData,
  coachData,
  schoolName
}: { 
  athlete: AthleteData | null;
  bioData?: {
    desiredMajor: string | null;
    predictedGPA: string | null;
    sat: string | null;
    act: string | null;
    parentName: string | null;
    parentEmail: string | null;
    parentPhone: string | null;
    momOccupation: string | null;
    momEducationLevel: string | null;
    momAlmaMater: string | null;
    dadOccupation: string | null;
    dadEducationLevel: string | null;
    dadAlmaMater: string | null;
  };
  coachData?: {
    name: string | null;
    cell: string | null;
    office: string | null;
    email: string | null;
  } | null;
  schoolName?: string | null;
}) => {
  // Get data from props
  const desiredMajor = bioData?.desiredMajor || null;
  const predictedGPA = bioData?.predictedGPA || null;
  const sat = bioData?.sat || null;
  const act = bioData?.act || null;
  const parentName = bioData?.parentName || null;
  const parentEmail = bioData?.parentEmail || null;
  const parentPhone = bioData?.parentPhone || null;
  const momOccupation = bioData?.momOccupation || null;
  const momEducationLevel = bioData?.momEducationLevel || null;
  const momAlmaMater = bioData?.momAlmaMater || null;
  const dadOccupation = bioData?.dadOccupation || null;
  const dadEducationLevel = bioData?.dadEducationLevel || null;
  const dadAlmaMater = bioData?.dadAlmaMater || null;
  
  // Get GPA from athlete object (source != hs_coach, survey, or verified)
  const gpaRaw = athlete?.gpa || null;
  // Round GPA to nearest .01
  const gpa = gpaRaw ? Math.round(parseFloat(gpaRaw.toString()) * 100) / 100 : null;

  // Format SAT/ACT display
  const satActDisplay = [sat, act].filter(Boolean).join('/') || '—';

  // Format parent info displays
  const formatParentInfo = (occupation: string | null, education: string | null, almaMater: string | null) => {
    const parts = [];
    if (occupation) parts.push(`Job: ${occupation}`);
    if (education && almaMater) {
      parts.push(`${education} from ${almaMater}`);
    } else if (education) {
      parts.push(`Educ Level: ${education}`);
    } else if (almaMater) {
      parts.push(almaMater);
    }
    return parts.join(' - ');
  };

  const momInfo = formatParentInfo(momOccupation, momEducationLevel, momAlmaMater);
  const dadInfo = formatParentInfo(dadOccupation, dadEducationLevel, dadAlmaMater);

  // Check if we have any parent data to display
  const hasParentData = parentName || parentEmail || parentPhone || momInfo || dadInfo;

  // Format phone number to (xxx) xxx-xxxx
  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return null;
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Format as (xxx) xxx-xxxx
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    // If it's not 10 digits, return as is
    return phone;
  };

  return (
    <div className="bio">
      <h4>Academic Info</h4>
      <div className="grid grid-cols-3 mb-11 font-semibold italic">
        <div>
          Desired Major <div className="font-normal">{desiredMajor || '—'}</div>
        </div>
        <div>
          GPA{' '}
          <div className="font-normal">
            {gpa ? `GPA ${gpa}` : '—'}
            {predictedGPA && ` - ${predictedGPA}`}
          </div>
        </div>
        <div>
          SAT/ACT <div className="font-normal">{satActDisplay}</div>
        </div>
      </div>
      {hasParentData && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <h4>Parent Contact Info</h4>
            {parentName && (
              <div className="mb-2">
                <strong>Name:</strong> {parentName}
              </div>
            )}
            {parentEmail && (
              <div className="mb-2">
                <strong>Email:</strong>{" "}
                <a href={`mailto:${parentEmail}`} className="text-blue-500 hover:underline">
                  {parentEmail}
                </a>
              </div>
            )}
            {parentPhone && (
              <div className="mb-4">
                <strong>Phone:</strong>{" "}
                <a href={`tel:${parentPhone}`} className="text-blue-500 hover:underline">
                  {formatPhoneNumber(parentPhone)}
                </a>
              </div>
            )}
            {(momInfo || dadInfo) && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                {momInfo && (
                  <div>
                    <h5>Mom&apos;s Information</h5>
                    <p>{momInfo}</p>
                  </div>
                )}
                {dadInfo && (
                  <div>
                    <h5>Dad&apos;s Information</h5>
                    <p>{dadInfo}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {coachData && (coachData.name || coachData.cell || coachData.office || coachData.email) && (
        <div className="grid grid-cols-12 gap-4 mt-8">
          <div className="col-span-6">
            <h4>Coach Contact Info</h4>
            <div>
              <p>
                {coachData.name && (
                  <>
                    {coachData.name} <br />
                  </>
                )}
                {schoolName && (
                  <>
                    {schoolName} <br />
                  </>
                )}
                {coachData.cell && (
                  <>
                    Cell:{" "}
                    <a href={`tel:${coachData.cell}`} className="text-blue-500 hover:underline">
                      {formatPhoneNumber(coachData.cell)}
                    </a>{" "}
                    <br />
                  </>
                )}
                {coachData.office && (
                  <>
                    Office:{" "}
                    <a href={`tel:${coachData.office}`} className="text-blue-500 hover:underline">
                      {formatPhoneNumber(coachData.office)}
                    </a>{" "}
                    <br />
                  </>
                )}
                {coachData.email && (
                  <>
                    Email:{" "}
                    <a href={`mailto:${coachData.email}`} className="text-blue-500 hover:underline">
                      {coachData.email}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Metrics = ({ projectionText }: { projectionText?: string | null }) => (
  <div>
    <div className="container mx-auto">
      <div className="grid grid-cols-2 gap-3">
        <div className="card px-4">
          <div className="">
            <div className="flex-1 px-2">
              <h3 className="italic !text-2xl">Athletic Projection</h3>
              <div className=" mr-5 flex items-center justify-center  border-black p-5">
                <div className="">
                  <h5 className="m-0 italic text-center">Current Projection</h5>
              <h4 className="italic text-[22px] text-center">{projectionText || '—'}</h4>
              <Tooltip title="Coming Soon" placement="top">
                <div className="opacity-30 w-60 mx-auto">
                    <ProgressBar
                      value={83}
                      height={55}
                      color="#2BB650"
                      label=""
                      labelSize="14"
                      labelWeight={400}
                    />
                </div>
              </Tooltip>
              </div>
            </div>
              <Tooltip title="Coming Soon" placement="top">
                <div className="opacity-30 flex  justify-center gap-4 bg-[#f3f8fb]">
                  <div className="flex-1 p-3 ">
                  <h3 className="px-2 italic !text-2xl">Athletic Testing</h3>
                  <div className="flex flex-col gap-1">
                    <ProgressBar
                      value={85}
                      height={30}
                      color="#126DB8"
                      label="100 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#f3f8fb"
                      average={10.9}
                    />
                    <ProgressBar
                      value={50}
                      height={30}
                      color="#126DB8"
                      label="200 M"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#f3f8fb"
                      average={22.2}
                    />
                    <ProgressBar
                      value={67}
                      height={30}
                      color="#126DB8"
                      label="40"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#f3f8fb"
                      average={4.7}
                    />
                    <ProgressBar
                      value={54}
                      height={30}
                      color="#126DB8"
                      label="BJ"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#f3f8fb"
                      average={9.5}
                    />
                    <ProgressBar
                      value={96}
                      height={30}
                      color="#126DB8"
                      label="VJ"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#f3f8fb"
                      average={34}
                      showScale={true}
                    />
                  </div>
                  <div className="flex justify-center items-center mb-2">
                    <div className="flex items-center gap-2 w-fit mt-3 border border-solid border-[#126DB8] bg-[#fff]">
                      <span className="text-xl bg-[#126DB8] text-white px-2 font-[500]">74</span> 
                      <span className="text-[14px] pr-2">Average Athletic Testing Score</span>
                    </div>
                  </div>
                  
                  </div>
                </div>
              </Tooltip>
              <Tooltip title="Coming Soon" placement="top">
                <div className="opacity-30 flex mt-3 p-3  justify-center gap-4 bg-[#fff8f4]">
                  <div className="flex-1 px-2">
                  <h3 className="italic !text-2xl">Recruiting Services</h3>
                  <div className="flex flex-col gap-1">
                    <ProgressBar
                      value={89}
                      height={30}
                      color="#FF7525"
                      label="247"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#fff8f4"
                      average={78}
                    />
                    <ProgressBar
                      value={53}
                      height={30}
                      color="#FF7525"
                      label="ESPN"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#fff8f4"
                      average={80}
                    />
                    <ProgressBar
                      value={68}
                      height={30}
                      color="#FF7525"
                      label="On3"
                      labelSize="12"
                      labelWeight={400}
                      labelWidth={110}
                      backgroundColor="#fff8f4"
                      average={85}
                      showScale={true}
                    />
                  </div>
                  <div className="flex justify-center items-center mb-2">
                    <div className="flex items-center gap-2 w-fit mt-3 border border-solid border-[#FF7525] bg-[#fff]">
                      <span className="text-xl bg-[#FF7525] text-white px-2 font-[500]">74</span> 
                      <span className="text-[14px] pr-2">Average Recruiting Service Score</span>
                    </div>
                  </div>
                  </div>
                </div>
              </Tooltip>
              <Tooltip title="Coming Soon" placement="top">
                <div className="opacity-30 flex-1 mt-5 px-2">
                  <div className="flex flex-col gap-1 p-3 ">
                  <ProgressBar
                    value={13}
                    height={30}
                    color="#C00E1E"
                    label="HS Coach"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                  />
                  <ProgressBar
                    value={20}
                    height={30}
                    color="#2BB650"
                    label="Data Scraping"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                  />
                  <ProgressBar
                    value={12}
                    height={30}
                    color="#2BB650"
                    label="Offers"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                  />
                  <ProgressBar
                    value={32}
                    height={30}
                    color="#FF7525"
                    label="Honors"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                  />
                  <ProgressBar
                    value={18}
                    height={30}
                    color="#C00E1E"
                    label="Scouts"
                    labelSize="12"
                    labelWeight={400}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                    showScale={true}
                  />
                </div>
              </div>
              </Tooltip>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Tooltip title="Coming Soon" placement="top">
            <div className="opacity-30">
              <div className="card bg-[#fff8f4]">
                <div className="flex  justify-center gap-4">
                  <div className="flex-1 px-2">
                    <div className="flex gap-2 items-center justify-between">
                      <h3 className="italic !text-2xl">Athlete Ranker</h3>
                      <div className="flex gap-2 items-center">
                        <span className=" italic text-xl">Overall Score</span>
                        <span className="mt-1 text-xl font-bold !bg-[#2BB650] text-white italic w-10 h-10 flex items-center justify-center">
                          85
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <ProgressBar
                    value={47}
                    height={30}
                    color="#2BB650"
                    label="Recuirtabilty"
                    labelSize={"12"}
                    labelWeight={500}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                  />
                  <ProgressBar
                    value={55}
                    height={30}
                    color="#2BB650"
                    label="Stickiness"
                    labelSize={"12"}
                    labelWeight={500}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                  />
                  <ProgressBar
                    value={84}
                    height={30}
                    color="#2BB650"
                    label="Athletics Impact"
                    labelSize={"12"}
                    labelWeight={500}
                    labelWidth={110}
                    backgroundColor="#ffffff"
                    showScale={true}
                  />
                </div>
              </div>
            </div>
          </Tooltip>

            <Tooltip title="Coming Soon" placement="top">
            <div className="card opacity-50">
            <h3 className="italic !text-2xl mb-1 mt-1">
              Commitment Predictions
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              These commitment predictions will update but are frozen when the
              athlete commits
            </p>

            <div className="grid grid-cols-4 gap-3">

              <div className="col-span-3 flex flex-col items-start justify-between bg-[#ebf8f2] p-4">
                <img src="/angry-bird.png" alt="Louisville" className="mb-2" />
                <h2 className="text-3xl !mb-0 font-bold text-gray-800">
                  33.3%
                </h2>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  University of Louisville
                </p>
              </div>

              <div className="col-span-1 flex flex-col items-start justify-between bg-[#fff1e9] p-4 ">
                <img src="/uni.png" alt="Other" className="mb-2" />
                <h2 className="text-2xl !m-0 font-bold text-gray-800">28.7%</h2>
                <p className="!text-lg !m-0 !font-semibold text-gray-700">
                  Other
                </p>
              </div>

              <div className="col-span-2 flex flex-col items-start justify-between bg-[#f3ebfe] p-4 ">
                <img src="/uk.png" alt="Kentucky" className="mb-2" />
                <h3 className="text-2xl !m-0 font-bold text-gray-800">28.7%</h3>
                <p className="!text-sm !font-semibold italic text-gray-700">
                  University of Kentucky
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#fff6cc] p-4 ">
                <img src="/v.png" alt="West Virginia" className="mb-2" />
                <h3 className="text-xl !m-0 font-bold text-gray-800">4.0%</h3>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  West Virginia University
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#fff6cc] p-4 ">
                <img src="./tm.png" alt="Florida State" className="mb-2" />
                <h3 className="text-xl !m-0 font-bold text-gray-800">4.0%</h3>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Florida State University
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#e7f0f8] p-4 ">
                <img src="yt.png" alt="Virginia Tech" className="mb-2" />
                <h5 className="text-lg !m-0 font-bold text-gray-800">2.9%</h5>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Virginia Tech
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#e7f0f8] p-4 ">
                <img
                  src="/red-wolf.png"
                  alt="Arkansas State"
                  className="mb-2"
                />
                <h5 className="text-lg !m-0 font-bold text-gray-800">2.0%</h5>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Arkansas State University
                </p>
              </div>

              <div className="flex flex-col items-start justify-between bg-[#e7f0f8] p-4 ">
                <img
                  src="/red-eagle.png"
                  alt="Boston College"
                  className="mb-2"
                />
                <h5 className="text-lg !m-0 font-bold text-gray-800">2.0%</h5>
                <p className="!text-lg !font-semibold italic text-gray-700">
                  Boston College
                </p>
              </div>
            </div>
            </div>
            </Tooltip>

            {/* Moved from qais-hs-profile/page.tsx (337-537) */}
            {false && (
            <div>
            <div className="mt-5 flex gap-4">
              <div className="card p-0 w-96">
                <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                  Raw Measureables
                </h3>
                <div className="p-3">
                  <p className="p-0 m-0 leading-5">
                    Our proprietary web scrape helps predict athletic
                    potential in athletes with very little other
                    information. This score often serves as a starting point
                    until we know more about an athlete
                  </p>
                </div>
              </div>

              <div className="card p-0 w-96">
                <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                  HS Scouts
                </h3>
                <div className="p-3">
                  <table className="w-full new-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Score</th>
                        <th>Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Quick info here</td>
                        <td>50</td>
                        <td>5.11”</td>
                      </tr>
                      <tr>
                        <td>Additional info here</td>
                        <td>49</td>
                        <td>5.10”</td>
                      </tr>
                      <tr>
                        <td>Go Information</td>
                        <td>63</td>
                        <td>5.9”</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card p-0 w-96">
                <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                  Scouts
                </h3>
                <div className="p-3">
                  <table className="w-full new-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Score</th>
                        <th>Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Quick info here</td>
                        <td>50</td>
                        <td>5.11”</td>
                      </tr>
                      <tr>
                        <td>Additional info here</td>
                        <td>49</td>
                        <td>5.10”</td>
                      </tr>
                      <tr>
                        <td>Go Information</td>
                        <td>63</td>
                        <td>5.9”</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-5">
              <div className="card p-0 w-96">
                <div className="flex items-center justify-end bg-[#f6f6f8] p-2">
                  <h3 className="!text-lg font-[500] text-gray-900 !mb-0 mr-4">
                    View as
                  </h3>
                  <span className="text-sm">Height</span>
                  <Switch
                    defaultChecked
                    className="mx-3 !min-h-[23px]"
                    onChange={() => {}}
                  />
                  <span className="text-sm">Source</span>
                </div>
                <div className="p-3">
                  <img
                    src="/chart2.png"
                    alt="Georgia Tech Logo"
                    className="w-full mb-4"
                  />
                  <table className="w-full new-table">
                    <thead>
                      <tr>
                        <th>Source</th>
                        <th>Score</th>
                        <th>Height</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Quick info here</td>
                        <td>50</td>
                        <td>5.11”</td>
                      </tr>
                      <tr>
                        <td>Additional info here</td>
                        <td>49</td>
                        <td>5.10”</td>
                      </tr>
                      <tr>
                        <td>Go Information</td>
                        <td>63</td>
                        <td>5.9”</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="card p-0 w-96">
                  <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                    Offers
                  </h3>
                  <div className="p-3">
                    <div className="flex items-center gap-2">
                      <img
                        src="/pl1.png"
                        alt="Georgia Tech Logo"
                        className="w-12 h-12 mt-1"
                      />
                      <div>
                        <h5 className="!font-[400] text-lg m-0 text-gray-900">
                          University of New Jersey
                        </h5>
                        <span className="!font-[600]">$394,039</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src="/pl1.png"
                        alt="Georgia Tech Logo"
                        className="w-12 h-12 mt-1"
                      />
                      <div>
                        <h5 className="!font-[400] text-lg m-0 text-gray-900">
                          University of New Jersey
                        </h5>
                        <span className="!font-[600]">$394,039</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <img
                        src="/a.png"
                        alt="Georgia Tech Logo"
                        className="w-12 h-12 mt-1"
                      />
                      <div>
                        <h5 className="!font-[400] text-lg m-0 text-gray-900">
                          University of New Jersey
                        </h5>
                        <span className="!font-[600]">$394,039</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="card p-0 w-96">
                  <h3 className="!text-lg font-[500] text-gray-900 mb-4 bg-[#f6f6f8] p-2 !m-0">
                    Recruiting Services
                  </h3>
                  <div className="p-3 flex justify-between">
                    <div>
                      <h6 className="!text-[16px]">Player Rating</h6>
                      <h2 className="!text-5xl !font-bold italic !mb-1">4.5</h2>
                      <Rate allowHalf defaultValue={4.5} className="bg-none" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <h5 className="flex flex-col items-center !text-[22px] mb-0"><span className="text-[16px] !font-normal">TN</span> 37</h5>
                      <h5 className="flex flex-col items-center !text-[22px] mb-0"><span className="text-[16px] !font-normal">Edge</span> 111</h5>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
            )}
        </div>
        </div>
      </div>
    </div>
);

const RawMeasureables = ({ athlete }: { athlete: AthleteData | null }) => {
  const [measurablesData, setMeasurablesData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[string, string]>(['', '']);

  useEffect(() => {
    const fetchMeasurables = async () => {
      if (!athlete?.id) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const allMeasurables: any[] = [];

        // Fetch all data_type names for mapping
        const allDataTypeIds: number[] = [];

        // 1. Fetch from athlete_track
        const { data: athleteTrackData, error: trackError } = await supabase
          .from('athlete_track')
          .select('value, data_type_id, date, source, grade')
          .eq('athlete_id', athlete.id)
          .or('inactive.is.null,inactive.eq.false')
          .order('date', { ascending: false });

        if (trackError) {
          console.error('Error fetching athlete_track:', trackError);
        }

        // Collect data_type_ids from athlete_track
        if (athleteTrackData) {
          athleteTrackData.forEach((track: any) => {
            if (track.data_type_id && !allDataTypeIds.includes(track.data_type_id)) {
              allDataTypeIds.push(track.data_type_id);
            }
          });
        }

        // Fetch needed athlete_fact entries in a single query (video links and AI tape analysis)
        const athleteFactIds = [964, 1061, 1052, 1053, 1054, 1055];
        const { data: combinedFacts, error: combinedFactsError } = await supabase
          .from('athlete_fact')
          .select('data_type_id, value, created_at')
          .eq('athlete_id', athlete.id)
          .in('data_type_id', athleteFactIds)
          .or('inactive.is.null,inactive.eq.false')
          .order('created_at', { ascending: false });

        if (combinedFactsError) {
          console.error('Error fetching athlete_fact entries:', combinedFactsError);
        }

        // Prioritize 1061 over 964 for video link
        const videoLink = combinedFacts?.find((f: any) => f.data_type_id === 1061)?.value ||
                          combinedFacts?.find((f: any) => f.data_type_id === 964)?.value ||
                          null;

        // 2. Fetch from camp_result via camp_attendance
        const { data: campAttendanceData, error: attendanceError } = await supabase
          .from('camp_attendance')
          .select('id, event_id')
          .eq('athlete_id', athlete.id);

        if (attendanceError) {
          console.error('Error fetching camp_attendance:', attendanceError);
        }

        if (campAttendanceData && campAttendanceData.length > 0) {
          const attendanceIds = campAttendanceData.map((a: any) => a.id);
          const eventIds = [...new Set(campAttendanceData.map((a: any) => a.event_id))];

          // Fetch camp results
          const { data: campResults, error: resultsError } = await supabase
            .from('camp_result')
            .select('camp_attendance_id, data_type_id, value, created_at')
            .in('camp_attendance_id', attendanceIds);

          if (resultsError) {
            console.error('Error fetching camp_result:', resultsError);
          }

          // Collect data_type_ids from camp_result
          if (campResults) {
            campResults.forEach((result: any) => {
              if (result.data_type_id && !allDataTypeIds.includes(result.data_type_id)) {
                allDataTypeIds.push(result.data_type_id);
              }
            });
          }

          // Fetch camp events
          const { data: campEvents, error: eventsError } = await supabase
            .from('camp_event')
            .select('id, source, start_date')
            .in('id', eventIds);

          if (eventsError) {
            console.error('Error fetching camp_event:', eventsError);
          }

          // Create a map of event_id to event data
          const eventMap = new Map();
          campEvents?.forEach((event: any) => {
            eventMap.set(event.id, event);
          });

          // Create a map of attendance_id to event_id
          const attendanceToEventMap = new Map();
          campAttendanceData.forEach((attendance: any) => {
            attendanceToEventMap.set(attendance.id, attendance.event_id);
          });
        }

        // 3. Use AI Tape Analysis facts from combinedFacts
        const athleteFactData = (combinedFacts || []).filter((f: any) => [1052, 1053, 1054, 1055].includes(f.data_type_id));

        // Helper function to format measure names
        const formatMeasureName = (name: string) => {
          return name
            .replace(/_/g, ' ') // Replace underscores with spaces
            .split(' ')
            .map(word => {
              if (word.length === 2) {
                // Two-letter words: capitalize both letters
                return word.toUpperCase();
              } else {
                // Other words: capitalize first letter, lowercase rest
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
              }
            })
            .join(' ');
        };

        // Fetch data_type names for all collected data_type_ids
        const dataTypeNameMap: { [key: number]: string } = {
          1052: 'Top Speed',
          1053: 'Average Speed',
          1054: 'Acceleration',
          1055: 'Deceleration'
        };

        if (allDataTypeIds.length > 0) {
          const { data: dataTypes, error: dataTypeError } = await supabase
            .from('data_type')
            .select('id, name')
            .in('id', allDataTypeIds);

          if (dataTypeError) {
            console.error('Error fetching data_types:', dataTypeError);
          }

          if (dataTypes) {
            dataTypes.forEach((dt: any) => {
              dataTypeNameMap[dt.id] = formatMeasureName(dt.name);
            });
          }
        }

        // Process athlete_track data
        if (athleteTrackData) {
          athleteTrackData.forEach((track: any) => {
            // Determine source based on link
            let source = track.source || '—';
            if (videoLink) {
              if (videoLink.toLowerCase().includes('milesplit')) {
                source = 'Milesplit';
              } else if (videoLink.toLowerCase().includes('athletic.net')) {
                source = 'Athletic.net';
              } else {
                source = 'Track';
              }
            } else if (source === '—') {
              source = 'Track';
            }

            allMeasurables.push({
              date: track.date,
              source: source,
              measure: dataTypeNameMap[track.data_type_id] || `DT_${track.data_type_id}`,
              data_type_id: track.data_type_id,
              value: track.value,
              score: '—',
              link: videoLink,
              grade: track.grade
            });
          });
        }

        // Process camp results
        if (campAttendanceData && campAttendanceData.length > 0) {
          const attendanceIds = campAttendanceData.map((a: any) => a.id);
          
          const { data: campResults } = await supabase
            .from('camp_result')
            .select('camp_attendance_id, data_type_id, value, created_at')
            .in('camp_attendance_id', attendanceIds);

          const eventIds = [...new Set(campAttendanceData.map((a: any) => a.event_id))];
          const { data: campEvents } = await supabase
            .from('camp_event')
            .select('id, source, start_date')
            .in('id', eventIds);

          const eventMap = new Map();
          campEvents?.forEach((event: any) => {
            eventMap.set(event.id, event);
          });

          const attendanceToEventMap = new Map();
          campAttendanceData.forEach((attendance: any) => {
            attendanceToEventMap.set(attendance.id, attendance.event_id);
          });

          if (campResults) {
            campResults.forEach((result: any) => {
              const eventId = attendanceToEventMap.get(result.camp_attendance_id);
              const event = eventMap.get(eventId);

              allMeasurables.push({
                date: event?.start_date || result.created_at,
                source: event?.source || 'Camp',
                measure: dataTypeNameMap[result.data_type_id] || `DT_${result.data_type_id}`,
                data_type_id: result.data_type_id,
                value: result.value,
                score: '—',
                link: '—',
                grade: null
              });
            });
          }
        }

        // Process athlete_fact data
        if (athleteFactData) {
          athleteFactData.forEach((fact: any) => {
            allMeasurables.push({
              date: fact.created_at,
              source: 'AI Tape Analysis',
              measure: dataTypeNameMap[fact.data_type_id] || `DT_${fact.data_type_id}`,
              data_type_id: fact.data_type_id,
              value: fact.value,
              score: '—',
              link: '—',
              grade: null
            });
          });
        }

        // Sort by date descending
        allMeasurables.sort((a, b) => {
          const dateA = new Date(a.date || 0).getTime();
          const dateB = new Date(b.date || 0).getTime();
          return dateB - dateA;
        });

        setMeasurablesData(allMeasurables);
      } catch (err) {
        console.error('Unexpected error fetching measurables:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeasurables();
  }, [athlete?.id]);

  // Format date for display (x/x/xx format)
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear().toString().slice(-2);
      return `${month}/${day}/${year}`;
    } catch {
      return '—';
    }
  };

  // Date range filter component
  const DateRangeFilter = ({ 
    dateRange, 
    setDateRange, 
    confirm, 
    clearFilters 
  }: { 
    dateRange: [string, string]; 
    setDateRange: (range: [string, string]) => void; 
    confirm: () => void; 
    clearFilters: () => void; 
  }) => {
    const [localStartDate, setLocalStartDate] = useState(dateRange[0]);
    const [localEndDate, setLocalEndDate] = useState(dateRange[1]);
    
    return (
      <div style={{ padding: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <Input
            type="date"
            placeholder="Start Date"
            value={localStartDate}
            onChange={(e) => setLocalStartDate(e.target.value)}
            style={{ width: 200, marginBottom: 4, display: 'block' }}
          />
          <Input
            type="date"
            placeholder="End Date"
            value={localEndDate}
            onChange={(e) => setLocalEndDate(e.target.value)}
            style={{ width: 200, display: 'block' }}
          />
        </div>
        <Space>
          <Button
            type="primary"
            onClick={() => {
              setDateRange([localStartDate, localEndDate]);
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Filter
          </Button>
          <Button
            onClick={() => {
              setLocalStartDate('');
              setLocalEndDate('');
              setDateRange(['', '']);
              clearFilters();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    );
  };

  // Apply date range filter only (other filters handled by Ant Design)
  const dateFilteredData = useMemo(() => {
    if (!dateRange[0] && !dateRange[1]) {
      return measurablesData;
    }

    return measurablesData.filter((record) => {
      if (!record.date) return true;
      
      const recordDate = new Date(record.date);
      const startDate = dateRange[0] ? new Date(dateRange[0]) : null;
      const endDate = dateRange[1] ? new Date(dateRange[1]) : null;

      if (startDate && recordDate < startDate) return false;
      if (endDate && recordDate > endDate) return false;
      
      return true;
    });
  }, [measurablesData, dateRange]);

  // Get unique values for filters
  const uniqueSources = [...new Set(measurablesData.map(item => item.source))].filter(Boolean);
  const uniqueMeasures = [...new Set(measurablesData.map(item => item.measure))].filter(Boolean);
  const uniqueScores = [...new Set(measurablesData.map(item => item.score))].filter(Boolean);

  console.log('Unique sources:', uniqueSources);
  console.log('Unique measures:', uniqueMeasures);
  console.log('Sample data:', measurablesData.slice(0, 3));

  // Table columns
  const measurablesColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => formatDate(date),
      sorter: (a: any, b: any) => {
        const dateA = new Date(a.date || 0).getTime();
        const dateB = new Date(b.date || 0).getTime();
        return dateA - dateB;
      },
      filterDropdown: ({ confirm, clearFilters }: any) => (
        <DateRangeFilter
          dateRange={dateRange}
          setDateRange={setDateRange}
          confirm={confirm}
          clearFilters={clearFilters}
        />
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      sorter: (a: any, b: any) => (a.source || '').localeCompare(b.source || ''),

      onFilter: (value: any, record: any) => {
        return record.source === value;
      },
      filterSearch: true,
    },
    {
      title: 'Measure',
      dataIndex: 'measure',
      key: 'measure',
      sorter: (a: any, b: any) => (a.measure || '').localeCompare(b.measure || ''),
      filters: uniqueMeasures.map(measure => ({ text: measure, value: measure })),
      onFilter: (value: any, record: any) => {

        return record.measure === value;
      },
      filterSearch: true,
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
      sorter: (a: any, b: any) => {
        const valA = parseFloat(a.value) || 0;
        const valB = parseFloat(b.value) || 0;
        return valA - valB;
      },
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      sorter: (a: any, b: any) => (a.score || '').localeCompare(b.score || ''),
      filters: uniqueScores.map(score => ({ text: score, value: score })),
      onFilter: (value: any, record: any) => record.score === value,
    },
    {
      title: 'Link',
      dataIndex: 'link',
      key: 'link',
      render: (link: string | null) => {
        if (!link || link === '—') return '—';
        if (link.startsWith('http')) {
          return (
            <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              View
            </a>
          );
        }
        return link;
      },
    },
  ];

  if (isLoading) {
    return (
      <div>
        <h4>Raw Measureables</h4>
        <Skeleton active />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-10">
        <h4>Raw Measureables</h4>
        <Table
          dataSource={dateFilteredData.map((item, index) => ({ ...item, key: index }))}
          columns={measurablesColumns}
          pagination={false}
        />
      </div>
    </div>
  );
};

const HSSurvey = ({ athleteFacts }: { athleteFacts?: { data_type_id: number; value: string; source?: string }[] }) => (
  <div>
    <div>
      <h4>Schools Athlete is Interested In</h4>
      <div className="text-[#1C1D4D] text-sm">

          <div className="relative">

            <div className="flex items-start space-x-4 opacity-50">
            <Tooltip title="Coming Soon" placement="top">
              <div className="card">
                <Image src="/tm.png" alt="abc" width={79} height={73} />
              </div>
              <div>
                <h5 className="mb-0 mt-1 !text-[22px] !font-[500]">
                  Florida State University
                </h5>
                <p className="italic font-[500] mt-2 mb-2">Walk On: Yes</p>
              </div>
              </Tooltip>
            </div>

          </div>

      </div>
    </div>
    <div>
      {(() => {
        const byType = (id: number, src?: string) =>
          athleteFacts?.find((f: any) => f?.data_type_id === id && (!src || f?.source === src))?.value || null;

        const athleticInfo = byType(114) as string | null;

        // Coach-provided values (filter source === 'hs_coach')
        const coachWeight = byType(6, 'hs_coach');
        const coachHeightFeet = byType(4, 'hs_coach');
        const coachHeightInch = byType(5, 'hs_coach');
        const coachHeight = coachHeightFeet || coachHeightInch
          ? `${coachHeightFeet ?? '0'}'${coachHeightInch ?? '0'}"`
          : null;
        const coachGpa = (byType(693, 'hs_coach') || byType(35, 'hs_coach')) as string | null;

        const items: { label: string; value: string }[] = [];
        if (athleticInfo) items.push({ label: 'Athletic Info', value: athleticInfo });
        if (coachWeight) items.push({ label: 'Coach Weight', value: `${coachWeight} lbs.` });
        if (coachHeight) items.push({ label: 'Coach Height', value: coachHeight });
        if (coachGpa) items.push({ label: 'Coach GPA', value: `${coachGpa}` });

        if (items.length === 0) return null;

        return (
          <div>
            <h4>High School Coach Data</h4>
            <div className="mb-4">
              <p className=" mb-6">
                The data below has been provided by the high school coach and has not
                been confirmed by Verified Athletics
              </p>
              <div className="grid grid-cols-4 gap-4">
                {items.map((item, idx) => (
                  <div key={idx} className="font-semibold italic">
                    <div>{item.label}</div>
                    <div className="mt-1 font-normal not-italic">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    <div>
      {(() => {
        const get = (id: number) => (athleteFacts || []).find((f: any) => f?.data_type_id === id && (f?.source || '').toString().toLowerCase() === 'college_selector')?.value || null;

        // Campus Information (Step 1)
        const campusItems: { q: string; a: string }[] = [];
        const seasonsPref = get(1117);
        if (seasonsPref) campusItems.push({ q: 'Do you prefer your campus location to have all four seasons or be warm year round?', a: seasonsPref });
        const city = get(1118);
        const state = get(1119);
        const idealLocation = [city, state].filter(Boolean).join(', ');
        if (idealLocation) campusItems.push({ q: 'What is the ideal location for you to go to school? (At least enter a state or enter None)', a: idealLocation });
        const distance = get(51);
        if (distance) campusItems.push({ q: 'Within what distance do you want to be from your ideal location?', a: distance });
        const campusSize = get(52);
        if (campusSize) campusItems.push({ q: 'What is your ideal campus size (# indicates full-time undergrads)?', a: campusSize });
        const military = get(72);
        if (military) campusItems.push({ q: 'Do you want to include military schools? (Army, Navy, Air Force, Virginia Military Institute, Coast Guard Academy, Merchant Marine Academy)', a: military });
        const hbcu = get(64);
        if (hbcu) campusItems.push({ q: 'Do you prefer to attend an HBCU (Historically Black College and University)?', a: hbcu });
        const genderRatio = get(63);
        if (genderRatio) campusItems.push({ q: 'What is your preferred male to female ratio?', a: genderRatio });
        const locationType = get(53);
        if (locationType) campusItems.push({ q: 'What is your ideal campus location type?', a: locationType });
        const nearMountains = get(1123);
        if (nearMountains) campusItems.push({ q: 'Do you prefer your campus location to be near the mountains?', a: nearMountains });
        const nearOcean = get(1124);
        if (nearOcean) campusItems.push({ q: 'Do you prefer your campus location to be near the ocean?', a: nearOcean });
        const northeast = get(1125);
        if (northeast) campusItems.push({ q: 'Do you prefer your campus location to be in the Northeast?', a: northeast });
        const southeast = get(1126);
        if (southeast) campusItems.push({ q: 'Do you prefer your campus location to be in the Southeast?', a: southeast });
        const midwest = get(1127);
        if (midwest) campusItems.push({ q: 'Do you prefer your campus location to be in the Midwest?', a: midwest });
        const mountainRegion = get(1128);
        if (mountainRegion) campusItems.push({ q: 'Do you prefer your campus location to be in the Mountain region?', a: mountainRegion });
        const southwest = get(1129);
        if (southwest) campusItems.push({ q: 'Do you prefer your campus location to be in the Southwest?', a: southwest });
        const westCoast = get(1130);
        if (westCoast) campusItems.push({ q: 'Do you prefer your campus location to be on the West Coast?', a: westCoast });

        // Academic Profile (Step 2)
        const academicItems: { q: string; a: string }[] = [];
        const gradYear = get(1015);
        if (gradYear) academicItems.push({ q: 'What year will you graduate high school?', a: gradYear });
        const unweightedGpa = get(35);
        if (unweightedGpa) academicItems.push({ q: 'What is your unweighted GPA (4.0 scale)?', a: unweightedGpa });
        const stretch = get(1132);
        if (stretch) academicItems.push({ q: 'How much do you want to stretch yourself academically?', a: stretch });
        const sat = get(1024);
        if (sat) academicItems.push({ q: 'What is your best SAT score?', a: sat });
        const act = get(1025);
        if (act) academicItems.push({ q: 'What is your best ACT score?', a: act });
        const desiredMajor = get(10);
        if (desiredMajor) academicItems.push({ q: 'What is your desired college major?', a: desiredMajor });
        const specificMajor = get(1133);
        if (specificMajor) academicItems.push({ q: 'Specific major you want to study', a: specificMajor });
        const majorImportance = get(36);
        if (majorImportance) academicItems.push({ q: 'How important is it that the school offers your desired major?', a: majorImportance });

        // Football Information (Step 3)
        const footballItems: { q: string; a: string }[] = [];
        const coachStrict = get(77);
        if (coachStrict) footballItems.push({ q: 'What type of coaching staff would you prefer?', a: coachStrict });
        const d3vsJuco = get(1134);
        if (d3vsJuco) footballItems.push({ q: 'If you do not get any scholarship offers would you prefer to go to a D3 school and start right away or go to a prep school/juco and try again for a scholarship?', a: d3vsJuco });
        const nilImportance = get(366);
        if (nilImportance) footballItems.push({ q: 'How important is an NIL deal in your college decision?', a: nilImportance });
        const nilValue = get(365);
        if (nilValue) footballItems.push({ q: 'How much money are you expecting your NIL deal to be worth per year?', a: nilValue });

        // Preference Information (Step 5)
        const preferenceItems: { q: string; a: string }[] = [];
        const qMap: { id: number; q: string }[] = [
          { id: 682, q: "The football program's recent winning and competitiveness vs. the football program's winning tradition" },
          { id: 54, q: "What the school costs vs. the school's academic reputation" },
          { id: 55, q: "The football program's winning tradition vs. the school's location" },
          { id: 56, q: 'The odds that you will play right away and be an impactful player vs. the chance to compete for a national championship' },
          { id: 62, q: 'Campus fun Party/Social culture vs. football winning tradition' },
          { id: 680, q: "Team's chance to compete for a national championship vs. playing at the highest possible level" },
          { id: 57, q: "What the school costs vs. the school's campus type (city, suburb, rural, etc.)" },
          { id: 679, q: "Quality of the team's facilities vs. competing for a national championship" },
          { id: 58, q: 'The odds that you will play right away and be an impactful player vs. the size of the school' },
          { id: 61, q: 'Campus fun Party/Social culture vs. academic reputation' },
          { id: 59, q: "The football program's winning tradition vs. the school's academic reputation" },
          { id: 60, q: "Team's chance to compete for a national championship vs. the school's location" },
          { id: 681, q: "Team's history producing NFL talent vs. the quality of the team's facilities" },
        ];
        qMap.forEach(({ id, q }) => {
          const a = get(id);
          if (a) preferenceItems.push({ q, a });
        });

        // Financial Considerations (Step 4)
        const financialItems: { q: string; a: string }[] = [];
        const financialAidNeeded = (athleteFacts || []).find((f: any) => f?.data_type_id === 'financialAidNeeded')?.value || null; // placeholder if needed later
        const budgetRange = (athleteFacts || []).find((f: any) => f?.data_type_id === 'budgetRange')?.value || null; // placeholder if needed later
        const scholarshipInterest = (athleteFacts || []).find((f: any) => f?.data_type_id === 'scholarshipInterest')?.value || null; // placeholder if needed later
        const workStudyInterest = (athleteFacts || []).find((f: any) => f?.data_type_id === 'workStudyInterest')?.value || null; // placeholder if needed later
        const financialConsiderations = (athleteFacts || []).find((f: any) => f?.data_type_id === 'financialConsiderations')?.value || null; // placeholder if needed later
        // Currently Step 4 isn't persisted to athlete_fact numeric IDs in CollegeSelector — leaving placeholders in case added later
        // If later mapped to data_type_ids, switch to get(<id>) calls and push into financialItems

        const renderSection = (title: string, items: { q: string; a: string }[]) => {
          if (!items.length) return null;
          return (
            <>
              <h4>{title}</h4>
              {items.map((it, idx) => (
                <div key={`${title}-${idx}`} className="flex items-center survey mb-5">
                  <i className="icon-arrow-right mr-2"></i>
                  <div>
                    <h6>{it.q}</h6>
                    <p className="m-0">{it.a}</p>
                  </div>
                </div>
              ))}
            </>
          );
        };

        return (
          <>
            {renderSection('Campus Information', campusItems)}
            {renderSection('Academic Profile', academicItems)}
            {renderSection('Football Information', footballItems)}
            {renderSection('Financial Considerations', financialItems)}
            {renderSection('Preference Information', preferenceItems)}
          </>
        );
      })()}
    </div>
  </div>
);

const items = (
  athlete: AthleteData | null,
  config: DataSourceConfig,
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null,
  useMockData?: boolean,
  activityEvents?: any[],
  bioData?: {
    desiredMajor: string | null;
    predictedGPA: string | null;
    sat: string | null;
    act: string | null;
    parentName: string | null;
    parentEmail: string | null;
    parentPhone: string | null;
    momOccupation: string | null;
    momEducationLevel: string | null;
    momAlmaMater: string | null;
    dadOccupation: string | null;
    dadEducationLevel: string | null;
    dadAlmaMater: string | null;
  },
  coachData?: {
    name: string | null;
    cell: string | null;
    office: string | null;
    email: string | null;
  } | null,
  schoolName?: string | null,
  athleteFacts?: { data_type_id: number; value: string; source?: string }[]
): TabsProps["items"] => {
  // Add more detailed logging for survey data
  const surveyData = athlete?.generic_survey?.[0];
  const hasSurveyData = !!surveyData;

  // Check if there are any meaningful survey responses (excluding highlight links)
  const hasValidSurveyResponses =
    hasSurveyData &&
    Object.entries(surveyData).some(([key, value]) => {
      // Skip highlight links and empty values
      if (key === "hs_highlight" || key === "highlight") return false;

      // Handle boolean values
      if (typeof value === "boolean") return true;

      // Handle string values
      if (typeof value === "string") {
        const stringValue = value.trim();
        const invalidValues = [
          "", 
          "not specified", 
          "not available", 
          "undefined", 
          "null", 
          "n/a", 
          "na"
        ];
        return !invalidValues.includes(stringValue.toLowerCase());
      }

      // Handle other values
      return value !== null && value !== undefined;
    });

  // More precise disabled logic - disable if no survey data OR no actual content for either section
  const surveyDisabled = !hasSurveyData || !hasValidSurveyResponses || (!hasActualLeavingContent(athlete) && !hasActualLookingForContent(athlete));

  // Comment out or remove the Survey Tab State logging
  // console.log('Survey Tab State:', { hasSurveyData, hasValidSurveyResponses, disabled, surveyDataKeys, surveyDataValues });

  const tabs = [];

  // Handle mock data mode
  if (useMockData) {
    // Check if athlete has videos
    const hasVideos = athlete?.athlete_videos && athlete.athlete_videos.length > 0;
    
    tabs.push(
      {
        key: "1",
        label: "Activity",
        children: <Activity athlete={athlete} events={activityEvents} />,
      },
      {
        key: "2",
        label: "Videos",
        children: <VideoComponent athlete={athlete} />,
        disabled: !hasVideos,
        className: !hasVideos ? "disabled-tab" : "",
      },
      {
        key: "3",
        label: "Bio",
        children: <HSBio athlete={athlete} bioData={bioData} coachData={coachData} schoolName={schoolName} />,
      },
      {
        key: "4",
        label: "Metrics",
        children: <Metrics projectionText={(athleteFacts || []).find((f: any) => f?.data_type_id === 1026)?.value || '—'} />,
      },
      {
        key: "5",
        label: "Raw Measurables",
        children: <RawMeasureables athlete={athlete} />,
      },
      {
        key: "6",
        label: "Survey",
        children: <HSSurvey athleteFacts={athleteFacts} />,
      },
      {
        key: "7",
        label: "Notes",
        children: <Notes athlete={athlete} />,
      }
    );
  } else {
    // Real data mode
    if (config.tabs.bio) {
      tabs.push({
        key: "1",
        label: "Bio",
        children: <Bio athlete={athlete} config={config} />,
      });
    }

    if (config.tabs.videos) {
      tabs.push({
        key: "2",
        label: "Videos",
        children: <VideoComponent athlete={athlete} />,
      });
    }

    if (config.tabs.stats) {
      tabs.push({
        key: "3",
        label: "Stats",
        children: <Stats athlete={athlete} />,
      });
    }

    // For JUCO data source, add Notes tab right after Stats
    if (dataSource === 'juco' && config.tabs.notes) {
      tabs.push({
        key: "6",
        label: "Notes",
        children: <Notes athlete={athlete} />,
      });
    }

    if (config.tabs.gameLog) {
      tabs.push({
        key: "4",
        label: "Game Log",
        children: <GameLog athlete={athlete} />,
        disabled: !athlete?.game_logs?.length,
        className: !athlete?.game_logs?.length ? "disabled-tab" : "",
      });
    }

    if (config.tabs.survey) {
      tabs.push({
        key: "5",
        label: "Survey",
        children: <Survey athlete={athlete} />,
        disabled: surveyDisabled,
        className: surveyDisabled ? "disabled-tab" : "",
      });
    }

    // For non-JUCO data sources, add Notes tab at the end
    if (dataSource !== 'juco' && config.tabs.notes) {
      tabs.push({
        key: "6",
        label: "Notes",
        children: <Notes athlete={athlete} />,
      });
    }
  }

  return tabs;
};

export default function PlayerInformation({
  athlete,
  dataSource = null,
  useMockData = false,
  activityEvents,
  bioData,
  coachData,
  schoolName,
  athleteFacts,
}: {
  athlete: AthleteData | null;
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null;
  useMockData?: boolean;
  activityEvents?: any[];
  bioData?: {
    desiredMajor: string | null;
    predictedGPA: string | null;
    sat: string | null;
    act: string | null;
    parentName: string | null;
    parentEmail: string | null;
    parentPhone: string | null;
    momOccupation: string | null;
    momEducationLevel: string | null;
    momAlmaMater: string | null;
    dadOccupation: string | null;
    dadEducationLevel: string | null;
    dadAlmaMater: string | null;
  };
  coachData?: {
    name: string | null;
    cell: string | null;
    office: string | null;
    email: string | null;
  } | null;
  schoolName?: string | null;
  athleteFacts?: { data_type_id: number; value: string; source?: string }[];
}) {
  // Get the appropriate configuration for the data source
  const config = dataSource && DATA_SOURCE_CONFIGS[dataSource] ? DATA_SOURCE_CONFIGS[dataSource] : DEFAULT_CONFIG;
  return (
    <>
      <style jsx global>{`
        .ant-tabs-tab-disabled .ant-tabs-tab-btn {
          color: #999 !important;
        }
        .player-information.juco-tabs .ant-tabs-nav {
          width: auto !important;
        }
        .player-information.juco-tabs .ant-tabs-nav-list {
          width: auto !important;
          flex: none !important;
        }
        .player-information.juco-tabs .ant-tabs-tab {
          flex: none !important;
          width: auto !important;
        }
      `}</style>
      <Tabs
        defaultActiveKey="1"
        items={items(athlete, config, dataSource, useMockData, activityEvents, bioData, coachData, schoolName, athleteFacts)}
        onChange={onChange}
        className={`player-information ${dataSource === 'juco' ? 'juco-tabs' : ''}`}
      />
    </>
  );
}
