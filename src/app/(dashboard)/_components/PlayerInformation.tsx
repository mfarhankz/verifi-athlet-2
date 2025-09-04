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
} from "antd";
import Image from "next/image";
import type { TableColumnsType } from "antd";
import CommentBox from "./CommentBox";
import { AthleteData } from "@/types/database";
import type { GameLog } from "@/types/database";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/CustomerContext";
import type { SportStatConfig } from "@/types/database";
import type { StatCategory } from "@/types/database";
import { formatStatDecimal } from "@/utils/utils";
import { fetchSportColumnConfig } from "@/lib/queries";
import { calculateFormula, hasValidDependencies } from "@/utils/formulaCalculator";

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

const Bio = ({ athlete }: { athlete: AthleteData | null }) => {
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
        <div>
          <h4>Contact Information</h4>
          <div className="grid grid-cols-2 p-5 gap-5">
            {isAvailable(athlete?.cell_phone) &&
              athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div>
                  <h6>Cell Phone</h6>
                  <h5>{athlete?.cell_phone}</h5>
                </div>
              )}
            <div>
              <h6>OK to Contact</h6>
              <h5 className="flex">
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
              </h5>
            </div>
            {isAvailable(athlete?.details_tp_page?.[0]?.email) &&
              athlete?.details_tp_page?.[0]?.ok_to_contact && (
                <div>
                  <h6>Email Address</h6>
                  <h5>
                    <a href={`mailto:${athlete?.details_tp_page?.[0]?.email}`}>
                      {athlete?.details_tp_page?.[0]?.email}
                    </a>
                  </h5>
                </div>
              )}
            {isAvailable(athlete?.birthday) && (
              <div>
                <h6>Date of Birth</h6>
                <h5>{athlete?.birthday}</h5>
              </div>
            )}
            {isAvailable(athlete?.pref_contact) && (
              <div className="col-span-2">
                <h6>Preferred Contact Way</h6>
                <h5>{athlete?.pref_contact}</h5>
              </div>
            )}
            {isAvailable(athlete?.help_decision) && (
              <div>
                <h6>Helping with Decision</h6>
                <h5>{athlete?.help_decision}</h5>
              </div>
            )}
            {isAvailable(athlete?.contact_info) && (
              <div>
                <h6>Contact Info</h6>
                <h5>{athlete?.contact_info}</h5>
              </div>
            )}
            {isAvailable(athlete?.eligibility_remaining) && (
            <div>
              <h6>Eligibility Remaining</h6>
              <h5>{athlete?.eligibility_remaining}</h5>
            </div>
            )}
            {isAvailable(athlete?.club) && (
            <div>
              <h6>Club Team</h6>
              <h5 className="flex mb-0">
                {athlete?.club}
              </h5>
            </div>
            )}
            {isAvailable(athlete?.game_eval) && (
            <div>
              <h6>What games should a coach watch when evaluating you?</h6>
              <h5 className="flex mb-0">
                {athlete?.game_eval}
              </h5>
            </div>
            )}
            {isAvailable(athlete?.summer_league) && (
            <div>
              <h6>Summer League</h6>
              <h5 className="flex mb-0">
                {athlete?.summer_league}
              </h5>
            </div>
            )}
            {address && (
              <div className="col-span-2">
                <h6>Address</h6>
                <h5 style={{ whiteSpace: "pre-line" }}>{address}</h5>
              </div>
            )}
          </div>
        </div>
        <div>
          <h4>Academic Details</h4>
          <div className="grid grid-cols-2 p-5 gap-5">
            {isAvailable(athlete?.gpa) && (
              <div className="col-span-2">
                <h6>GPA</h6>
                <h5>{athlete?.gpa}</h5>
              </div>
            )}
            {isAvailable(athlete?.major) && (
              <div>
                <h6>Major</h6>
                <h5>{athlete?.major}</h5>
              </div>
            )}
            {isAvailable(athlete?.generic_survey?.[0]?.major_importance) && (
              <div>
                <h6>Major Importance</h6>
                <h5>{athlete?.generic_survey?.[0]?.major_importance}</h5>
              </div>
            )}
          </div>
        </div>
      </div>

      <h4>College Roster Bio</h4>
      <div className="px-3">
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
      </div>
    </div>
  );
};

const Videos = ({ athlete }: { athlete: AthleteData | null }) => {
  // Helper function to check if a value is available
  const achievements = [
    { title: "DRILLS", time: "4:50", dec: "Rivals - Miami 1/3/2024" },
    { title: "1 on 1", time: "2:10", dec: "NXGN - Atlanta 03/06/2025" },
    { title: "1 on 1", time: "5:30", dec: "Atlanta - Miami 1/3/2024" },
    { title: "1 on 1", time: "5:25", dec: "Atlanta - Miami 1/3/2024" },
    { title: "1 on 1", time: "2:10", dec: "NXGN - Atlanta 03/06/2025" },
    { title: "1 on 1", time: "5:30", dec: "Atlanta - Miami 1/3/2024" },
    { title: "1 on 1", time: "5:25", dec: "Atlanta - Miami 1/3/2024" },
  ];

  const [checked, setChecked] = useState([false, false, false]);
  const toggle = (idx: number) => {
    setChecked((prev) => prev.map((val, i) => (i === idx ? !val : val)));
  };

  const [checked1, setChecked1] = useState(false); // for first instance
  const [checked2, setChecked2] = useState(false);
  const [checked3, setChecked3] = useState(false);

  return (
    <div className="bio">
      <iframe
        width="100%"
        height="617px"
        className="border-0"
        src="https://www.youtube.com/embed/smnuRhNtT2E?si=eIdF-geNCZ6Mwak-"
      ></iframe>

      <div className="flex items-center overflow-auto">
        {achievements.map((ach, idx) => (
          <div key={idx} className="bg-[#f5f5f5] py-2 px-3 mr-1 min-w-[220px]">
            <h6 className="flex items-center justify-between text-primary !text-[22px] !font-[700] !opacity-100 !mb-2">
              {ach.title}{" "}
              <span className="opacity-60 !text-[16px] !font-[400]">
                {ach.time}
              </span>
            </h6>
            <p className="mb-0">{ach.dec}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 mt-2 gap-1 border-solid border-[#e5e5e5] border-width-[1px] p-2 ">
        <div></div>
        {["All / Combine", "Drills", "1 on 1"].map((label, idx) => (
          <div
            key={idx}
            className="!text-[24px] !font-[600] flex items-center justify-center"
          >
            <div
              className="cursor-pointer flex items-center justify-center"
              onClick={() => toggle(idx)}
            >
              <div
                className={`checkbox-ui mr-2${checked[idx] ? " checked" : ""}`}
              ></div>
              {label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 mt-1 gap-1">
        <div className="flex items-center border-t-0 border-l-0 border-r-0 border-solid border-[#f5f5f5] border-width-[1px]">
          <div
            className="flex cursor-pointer"
            onClick={() => setChecked1((prev) => !prev)}
          >
            <div
              className={`checkbox-ui mt-[7px] mr-[7px]${
                checked1 ? " checked" : ""
              }`}
            ></div>
            <h6 className="!text-[16px] !font-[500] !opacity-100 !leading-[30px] !mb-0">
              <span className="block w-full">Rivals - Miami</span>
              <span className="block w-full">1/3/2024</span>
            </h6>
          </div>
        </div>
        <button className="select-btn">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">1</i> Selected
          </span>
        </button>
        <button className="select-btn selected">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">4</i> Selected
          </span>
        </button>
        <button className="select-btn selected">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">1</i> Selected
          </span>
        </button>
      </div>
      <div className="grid grid-cols-4 mt-1 gap-1">
        <div className="flex items-center border-t-0 border-l-0 border-r-0 border-solid border-[#f5f5f5] border-width-[1px]">
          <div
            className="flex cursor-pointer"
            onClick={() => setChecked2((prev) => !prev)}
          >
            <div
              className={`checkbox-ui mt-[7px] mr-[7px]${
                checked2 ? " checked" : ""
              }`}
            ></div>

            <h6 className="!text-[16px] !font-[500] !opacity-100 !leading-[30px] !mb-0">
              <span className="block w-full">Rivals - Miami</span>
              <span className="block w-full">1/3/2024</span>
            </h6>
          </div>
        </div>
        <button className="select-btn">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">1</i> Selected
          </span>
        </button>
        <button className="select-btn">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">1</i> Selected
          </span>
        </button>
        <button className="select-btn selected">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">2</i> Selected
          </span>
        </button>
      </div>
      <div className="grid grid-cols-4 mt-1 gap-1">
        <div className="flex items-center border-t-0 border-l-0 border-r-0 border-solid border-[#f5f5f5] border-width-[1px]">
          <div
            className="flex cursor-pointer"
            onClick={() => setChecked3((prev) => !prev)}
          >
            <div
              className={`checkbox-ui mt-[7px] mr-[7px]${
                checked3 ? " checked" : ""
              }`}
            ></div>
            <h6 className="!text-[16px] !font-[500] !opacity-100 !leading-[30px] !mb-0">
              <span className="block w-full">Rivals - Miami</span>
              <span className="block w-full">1/3/2024</span>
            </h6>
          </div>
        </div>
        <button className="select-btn">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">1</i> Selected
          </span>
        </button>
        <button className="select-btn">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">1</i> Selected
          </span>
        </button>
        <button className="select-btn selected">
          <span className="first">Select</span>
          <span className="second">
            <i className="number-ss mr-2">3</i> Selected
          </span>
        </button>
      </div>
      <div className="flex items-center">
        <a
          href="javascript:void(0)"
          className="text-primary underline mt-3 mb-5 !text-[18px] !font-[500] !opacity-100 !leading-[30px]"
        >
          Download Complete Playlist 1.4GB
        </a>
      </div>
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
          configData = await fetchSportColumnConfig(sportId, true); // Get all stats, not just those with search_column_display
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
        const { data: statsData, error: statsError } = await supabase
          .from("stat")
          .select("*")
          .eq("athlete_id", athlete.id)
          .gt("season", 2000)
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
        const baseColumns = [
          {
            title: "Season",
            dataIndex: "season",
            key: "season",
            fixed: "left" as const,
            width: 80,
          },
          {
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
                      width={38}
                      height={23}
                      className="mr-2"
                    />
                  )} */}
                  <span>{displayName}</span>
                </div>
              );
            },
          },
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
            case 99: // GS
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

          // Check if there are any meaningful stats in this category (excluding GP and GS)
          const hasMeaningfulStats = categoryData.some((seasonData) => {
            // Check regular stats
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

            return hasRegularStats || hasCalculatedStats;
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
      ? Object.values(athlete.generic_survey[0]).some(
          (value) => value !== null && value !== "Not specified" && value !== ""
        )
      : false,
  });

  // Check if any survey questions are answered
  const hasSurveyData =
    athlete?.generic_survey?.[0] &&
    Object.values(athlete.generic_survey[0]).some(
      (value) => value !== null && value !== "Not specified" && value !== ""
    );

  if (!hasSurveyData) {
    return null;
  }

  // --- Subcategorize leaving reasons ---
  const leavingEntries = Object.entries(
    athlete?.generic_survey?.[0] || {}
  ).filter(
    ([key, value]) =>
      key.startsWith("leaving_") &&
      value !== null &&
      value !== "Not specified" &&
      value !== ""
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
    athlete?.generic_survey?.[0] &&
    Object.entries(athlete.generic_survey[0]).some(
      ([key, value]) =>
        !key.startsWith("leaving_") &&
        value !== null &&
        value !== "Not specified" &&
        value !== "" &&
        key !== "cell" &&
        key !== "pref_contact" &&
        key !== "help_decision" &&
        key !== "gpa" &&
        key !== "major_importance" &&
        key !== "highlight" &&
        key !== "hs_highlight"
    );

  // If there's no leaving data and no looking for data, return null
  if (leavingEntries.length === 0 && !hasLookingForData) {
    return null;
  }

  return (
    <div>
      {leavingEntries.length > 0 && (
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

      {hasLookingForData && (
        <div>
          <h4>What they are looking for?</h4>
          {athlete?.generic_survey?.[0]?.important && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right text-2xl mr-2"></i>
              <div>
                <h6>
                  What is important to you as you look for your next school?
                </h6>
                <p>{athlete.generic_survey[0].important}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.walk_on_t25 && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Are you open to walking on at a top program?</h6>
                <p>{athlete.generic_survey[0].walk_on_t25}</p>
              </div>
            </div>
          )}
          {athlete?.msoc_survey?.[0]?.best_pos && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred position</h6>
                <p>{athlete.msoc_survey[0].best_pos}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.ideal_division && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Ideal division</h6>
                <p>{athlete.generic_survey[0].ideal_division}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.full_scholarship_only && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Full scholarship only</h6>
                <p>
                  {String(
                    athlete.generic_survey[0].full_scholarship_only
                  ).toLowerCase() === "true"
                    ? "Yes"
                    : "No"}
                </p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.distance_from_home && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Distance from home</h6>
                <p>{athlete.generic_survey[0].distance_from_home}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.ideal_campus_size && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Ideal campus size</h6>
                <p>{athlete.generic_survey[0].ideal_campus_size}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.campus_location_type && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Campus location type</h6>
                <p>{athlete.generic_survey[0].campus_location_type}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.cost_vs_acad_rep && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Cost vs academic reputation</h6>
                <p>{athlete.generic_survey[0].cost_vs_acad_rep}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.winning_vs_location && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Winning vs location</h6>
                <p>{athlete.generic_survey[0].winning_vs_location}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.playing_vs_championship && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Playing time vs championship</h6>
                <p>{athlete.generic_survey[0].playing_vs_championship}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.cost_vs_campus_type && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Cost vs campus type</h6>
                <p>{athlete.generic_survey[0].cost_vs_campus_type}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.playing_vs_size && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Playing time vs size</h6>
                <p>{athlete.generic_survey[0].playing_vs_size}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.winning_vs_academics && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Winning vs academics</h6>
                <p>{athlete.generic_survey[0].winning_vs_academics}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.championship_vs_location && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Championship vs location</h6>
                <p>{athlete.generic_survey[0].championship_vs_location}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.party_vs_academics && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Party vs academics</h6>
                <p>{athlete.generic_survey[0].party_vs_academics}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.party_vs_winning && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Party vs winning</h6>
                <p>{athlete.generic_survey[0].party_vs_winning}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.type_of_staff_preferred && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Type of staff discipline preferred</h6>
                <p>{athlete.generic_survey[0].type_of_staff_preferred}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.male_to_female && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Male to female</h6>
                <p>{athlete.generic_survey[0].male_to_female}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.hbcu && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>HBCU</h6>
                <p>{athlete.generic_survey[0].hbcu}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.faith_based_name && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Faith-based names</h6>
                <p>{athlete.generic_survey[0].faith_based_name}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.pref_d1_name && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred D1 name</h6>
                <p>{athlete.generic_survey[0].pref_d1_name}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.pref_d2_name && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred D2 name</h6>
                <p>{athlete.generic_survey[0].pref_d2_name}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.pref_d3_name && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred D3 name</h6>
                <p>{athlete.generic_survey[0].pref_d3_name}</p>
              </div>
            </div>
          )}
          {athlete?.generic_survey?.[0]?.pref_naia_name && (
            <div className="flex items-start survey mb-5">
              <i className="icon-arrow-right mr-2"></i>
              <div>
                <h6>Preferred NAIA name</h6>
                <p>{athlete.generic_survey[0].pref_naia_name}</p>
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

const items = (athlete: AthleteData | null): TabsProps["items"] => {
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
        return (
          value.trim() !== "" &&
          value !== "Not specified" &&
          value !== "null" &&
          value !== "undefined"
        );
      }

      // Handle other values
      return value !== null && value !== undefined;
    });

  // More precise disabled logic
  const surveyDisabled = !hasSurveyData || !hasValidSurveyResponses;

  // Comment out or remove the Survey Tab State logging
  // console.log('Survey Tab State:', { hasSurveyData, hasValidSurveyResponses, disabled, surveyDataKeys, surveyDataValues });

  return [
    {
      key: "1",
      label: "Bio",
      children: <Bio athlete={athlete} />,
    },
    // {
    //   key: "2",
    //   label: "Videos",
    //   children: <Videos athlete={athlete} />,
    // },
    {
      key: "3",
      label: "Stats",
      children: <Stats athlete={athlete} />,
      // disabled: !athlete?.stats_msoc_players?.length && !athlete?.stats_msoc_goalies?.length,
      // className: (!athlete?.stats_msoc_players?.length && !athlete?.stats_msoc_goalies?.length) ? 'disabled-tab' : '',
    },
    {
      key: "4",
      label: "Game Log",
      children: <GameLog athlete={athlete} />,
      disabled: !athlete?.game_logs?.length,
      className: !athlete?.game_logs?.length ? "disabled-tab" : "",
    },
    {
      key: "5",
      label: "Survey",
      children: <Survey athlete={athlete} />,
      disabled: surveyDisabled,
      className: surveyDisabled ? "disabled-tab" : "",
    },
    {
      key: "6",
      label: "Notes",
      children: <Notes athlete={athlete} />,
    },
  ];
};

export default function PlayerInformation({
  athlete,
}: {
  athlete: AthleteData | null;
}) {
  return (
    <>
      <style jsx global>{`
        .ant-tabs-tab-disabled .ant-tabs-tab-btn {
          color: #999 !important;
        }
      `}</style>
      <Tabs
        defaultActiveKey="1"
        items={items(athlete)}
        onChange={onChange}
        className="player-information"
      />
    </>
  );
}
