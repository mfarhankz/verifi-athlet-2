"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { School } from "./types";
import { useUser, useCustomer } from "@/contexts/CustomerContext";
import { useZoom } from "@/contexts/ZoomContext";
import { getPackageIdsBySport, fetchExistingPackagesForCustomer } from "@/lib/queries";
import { Button } from "antd";
import { fetchSchoolDataFromSchoolId } from "./utils/schoolDataUtils";
import SchoolCard from "./components/SchoolCard";

// Define a constant for the SELECT statement
const SELECT_FIELDS = `
  school, 
  address_street1, 
  address_street2, 
  address_city, 
  address_state, 
  address_zip,
  county,
  state,
  head_coach_first,
  head_coach_last,
  private_public,
  league_classification,
  score_college_player,
  score_d1_producing,
  score_team_quality,
  score_income,
  score_academics,
  recruiting_coaches,
  head_coach_email,
  head_coach_cell,
  head_coach_work_phone,
  head_coach_home_phone,
  coach_twitter_handle,
  visit_info,
  best_phone,
  coach_best_contact,
  school_phone,
  ad_name_first,
  ad_name_last,
  ad_email,
  2024_record,
  high_school_id
`;

export default function RoadPlannerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [selectedSchoolsData, setSelectedSchoolsData] = useState<
    Map<string, School>
  >(new Map());
  const [highSchools, setHighSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountyStates, setSelectedCountyStates] = useState<string[]>(
    []
  );
  const [countyStateSearchQuery, setCountyStateSearchQuery] = useState("");
  const [uniqueCountyStates, setUniqueCountyStates] = useState<
    { county: string; state: string }[]
  >([]);
  const [loadingCountyStates, setLoadingCountyStates] = useState(false);
  const [scoreFilters, setScoreFilters] = useState({
    college_player: { min: 0, max: 10, enabled: false },
    d1_producing: { min: 0, max: 10, enabled: false },
    team_quality: { min: 0, max: 10, enabled: false },
    income: { min: 0, max: 10, enabled: false },
    academics: { min: 0, max: 10, enabled: false },
  });
  const [allHighSchools, setAllHighSchools] = useState<School[]>([]);
  const router = useRouter();

  // New state for recruiting coaches filter
  const [userSchool, setUserSchool] = useState<string | null>(null);
  const [coachesFromUserSchool, setCoachesFromUserSchool] = useState<
    { name: string; schoolName: string }[]
  >([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [coachSearchQuery, setCoachSearchQuery] = useState("");
  const userDetails = useUser();
  const { activeCustomerId } = useCustomer();
  const { zoom } = useZoom();
  const [hasFootballPackage, setHasFootballPackage] = useState(false);

  // Check if the active customer has a football package
  useEffect(() => {
    const checkFootballPackage = async () => {
      if (!activeCustomerId) {
        setHasFootballPackage(false);
        return;
      }

      try {
        // Fetch packages for the active customer
        const customerPackages = await fetchExistingPackagesForCustomer(activeCustomerId);
        const customerPackageIds = customerPackages.map((pkg: any) => Number(pkg.customer_package_id));
        
        // Get football package IDs
        const footballPackageIds = getPackageIdsBySport("fb");
        
        // Check if any of the customer's packages are football packages
        const hasFootball = footballPackageIds.some((id) =>
          customerPackageIds.includes(id)
        );
        
        setHasFootballPackage(hasFootball);
      } catch (error) {
        console.error("Error checking football package:", error);
        setHasFootballPackage(false);
      }
    };

    checkFootballPackage();
  }, [activeCustomerId]);


  // Derived state
  const filteredAddresses = highSchools;

  // Load initial data only once on component mount
  useEffect(() => {
    async function fetchInitialHighSchools() {
      try {
        setLoading(true);

        // First, get the total count
        const countQuery = await supabase
          .from("vw_high_school")
          .select("school_id", { count: "exact", head: true });

        if (countQuery.error) {
          console.error("Error counting schools:", countQuery.error);
          throw countQuery.error;
        }

        setTotalCount(countQuery.count);

        // Limit to first 100 records initially - fetch school_id and school_name
        const { data, error } = await supabase
          .from("vw_high_school")
          .select("school_id, school_name")
          .limit(100);

        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          setHighSchools([]);
          setLoading(false);
          return;
        }

        // Fetch full data for each school using fetchSchoolDataFromSchoolId
        const formattedDataPromises = data.map(async (school: Record<string, any>) => {
          const fullSchoolData = await fetchSchoolDataFromSchoolId(school.school_id);
          if (fullSchoolData) {
            return fullSchoolData;
          }
          // Fallback if fetch fails - return minimal data
          return {
            school: school.school_name || "Unknown School",
            address: "",
            raw_data: {
              address_street1: "",
              address_city: "",
              address_state: "",
              address_zip: "",
              high_school_id: "",
            },
          };
        });

        const formattedData = await Promise.all(formattedDataPromises);

        setHighSchools(formattedData);
        setAllHighSchools(formattedData);

        // Load any previously selected addresses from localStorage
        // This ensures selections are maintained when returning from the map page
        try {
          const savedAddresses = localStorage.getItem("selectedAddresses");
          const savedSchoolData = localStorage.getItem("schoolData");

          if (savedAddresses) {
            const parsedAddresses = JSON.parse(savedAddresses);
            setSelectedAddresses(parsedAddresses);

            // If we have school data, initialize the map with it
            if (savedSchoolData) {
              const parsedSchoolData = JSON.parse(savedSchoolData);
              const newMap = new Map();

              parsedSchoolData.forEach((school: School) => {
                if (school.address) {
                  newMap.set(school.address, school);
                }
              });

              setSelectedSchoolsData(newMap);
            }
          }
        } catch (localStorageError) {
          console.error(
            "Error loading saved selections from localStorage:",
            localStorageError
          );
        }
      } catch (err: unknown) {
        console.error("Error fetching high schools:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load high schools: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    fetchInitialHighSchools();
    fetchCountyStates();
    fetchUserData();
  }, []);

  // Separate useEffect to sync the selectedSchoolsData whenever highSchools or selectedAddresses change
  useEffect(() => {
    // Only run after initial loading is complete
    if (!loading && highSchools.length > 0 && selectedAddresses.length > 0) {
      // Create a new map with existing selected data
      const updatedMap = new Map(selectedSchoolsData);

      // Check for any newly available schools that match selected addresses but aren't in the map
      highSchools.forEach((school: School) => {
        if (
          selectedAddresses.includes(school.address) &&
          !updatedMap.has(school.address)
        ) {
          updatedMap.set(school.address, school);
        }
      });

      // Also check allHighSchools for any matches
      allHighSchools.forEach((school: School) => {
        if (
          selectedAddresses.includes(school.address) &&
          !updatedMap.has(school.address)
        ) {
          updatedMap.set(school.address, school);
        }
      });

      // Only update state if the map has changed
      if (updatedMap.size !== selectedSchoolsData.size) {
        setSelectedSchoolsData(updatedMap);
      }
    }
  }, [highSchools, selectedAddresses, allHighSchools, loading]); // Removed selectedSchoolsData from dependencies to prevent infinite loop

  // Separate useEffect to handle search and filter changes
  useEffect(() => {
    // Skip initial render and only run if we have search or filters active
    if (
      !searchQuery &&
      selectedCountyStates.length === 0 &&
      Object.values(scoreFilters).every((f) => !f.enabled) &&
      selectedCoaches.length === 0
    ) {
      return;
    }

    async function fetchHighSchools() {
      try {
        setLoading(true);

        // First, if county/state filters are selected, get the matching school_ids from school_fact
        let filteredSchoolIds: string[] | null = null;
        
        if (selectedCountyStates.length > 0) {
          // Get county names and state abbreviations from selected filters
          const countyStatePairs = selectedCountyStates.map((cs) => {
            const [county, state] = cs.split("|");
            return { county, state };
          });

          // Get county IDs for the selected counties
          const countyNames = [...new Set(countyStatePairs.map(p => p.county))];
          const { data: countiesData } = await supabase
            .from('county')
            .select('id, name, state(id, abbrev)')
            .in('name', countyNames);

          if (countiesData && countiesData.length > 0) {
            // Build a map of county name + state abbrev to county ID
            const countyMap = new Map<string, number>();
            countiesData.forEach((county: any) => {
              if (county?.name && county?.state?.abbrev) {
                const key = `${county.name}|${county.state.abbrev}`;
                if (selectedCountyStates.includes(key)) {
                  countyMap.set(key, county.id);
                }
              }
            });

            // Get school_ids that have matching county_ids
            const countyIds = Array.from(countyMap.values());
            if (countyIds.length > 0) {
              const { data: countyFacts } = await supabase
                .from('school_fact')
                .select('school_id')
                .eq('data_type_id', 966) // county_id
                .in('value', countyIds.map(id => id.toString()))
                .is('inactive', null);

              if (countyFacts && countyFacts.length > 0) {
                const schoolIdSet = new Set<string>();
                (countyFacts as { school_id: string }[]).forEach((f) => {
                  if (f.school_id) {
                    schoolIdSet.add(f.school_id);
                  }
                });
                filteredSchoolIds = Array.from(schoolIdSet);
              }
            }
          }

          // If no schools found with county filter, return empty
          if (!filteredSchoolIds || filteredSchoolIds.length === 0) {
            setHighSchools([]);
            setMatchingCount(0);
            setLoading(false);
            return;
          }
        }

        // Build query with any active filters - use vw_high_school
        let query = supabase.from("vw_high_school").select("school_id, school_name");

        // Create a parallel query for getting the total count
        let countQuery = supabase
          .from("vw_high_school")
          .select("school_id", { count: "exact", head: true });

        // Apply county/state filter at database level if we have filtered school IDs
        if (filteredSchoolIds && filteredSchoolIds.length > 0) {
          query = query.in('school_id', filteredSchoolIds);
          countQuery = countQuery.in('school_id', filteredSchoolIds);
        }

        // Add search query if present
        if (searchQuery.length >= 2) {
          // Search by school name
          query = query.ilike('school_name', `%${searchQuery}%`);
          countQuery = countQuery.ilike('school_name', `%${searchQuery}%`);
        }

        // Score filters and coach filters will be applied after fetching full data
        // TODO: Implement proper filtering using school_fact data_type_id lookups

        // Get the total count of matches first
        const countResponse = await countQuery;

        if (countResponse.error) {
          console.error("Error getting count:", countResponse.error);
        } else {
          setMatchingCount(countResponse.count);
        }

        // Limit to 100 records for the actual data
        const { data, error } = await query.limit(100);

        if (error) {
          console.error("Supabase query error:", error);
          throw error;
        }

        if (!data || data.length === 0) {
          setHighSchools([]);
          setLoading(false);
          return;
        }

        // Fetch full data for each school using fetchSchoolDataFromSchoolId
        const formattedDataPromises = data.map(async (school: Record<string, any>) => {
          return await fetchSchoolDataFromSchoolId(school.school_id);
        });

        const formattedData: (School | null)[] = await Promise.all(formattedDataPromises);
        
        // Filter out null values
        let filteredData: School[] = formattedData.filter((school: School | null): school is School => school !== null);

        // Apply client-side filters for score filters and coach filters
        // County/state filter is already applied at database level

        if (scoreFilters.college_player.enabled) {
          filteredData = filteredData.filter((school: School) => {
            const score = school.score_college_player;
            return score !== undefined && 
                   score >= scoreFilters.college_player.min && 
                   score <= scoreFilters.college_player.max;
          });
        }

        if (scoreFilters.d1_producing.enabled) {
          filteredData = filteredData.filter((school: School) => {
            const score = school.score_d1_producing;
            return score !== undefined && 
                   score >= scoreFilters.d1_producing.min && 
                   score <= scoreFilters.d1_producing.max;
          });
        }

        if (scoreFilters.team_quality.enabled) {
          filteredData = filteredData.filter((school: School) => {
            const score = school.score_team_quality;
            return score !== undefined && 
                   score >= scoreFilters.team_quality.min && 
                   score <= scoreFilters.team_quality.max;
          });
        }

        if (scoreFilters.income.enabled) {
          filteredData = filteredData.filter((school: School) => {
            const score = school.score_income;
            return score !== undefined && 
                   score >= scoreFilters.income.min && 
                   score <= scoreFilters.income.max;
          });
        }

        if (scoreFilters.academics.enabled) {
          filteredData = filteredData.filter((school: School) => {
            const score = school.score_academics;
            return score !== undefined && 
                   score >= scoreFilters.academics.min && 
                   score <= scoreFilters.academics.max;
          });
        }

        // Limit to 100 after filtering
        filteredData = filteredData.slice(0, 100);

        setHighSchools(filteredData);
        // Don't update allHighSchools here as we only want the initial load for that
      } catch (err: unknown) {
        console.error("Error fetching high schools:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(`Failed to load high schools: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }

    // Add debounce for search query
    const delayDebounceFn = setTimeout(() => {
      fetchHighSchools();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [
    selectedCountyStates,
    scoreFilters,
    searchQuery,
    selectedCoaches,
    userSchool,
  ]);

  const fetchCountyStates = async () => {
    try {
      setLoadingCountyStates(true);

      // Fetch all unique county_id values from school_fact
      // Counties have a state relationship, so we'll get state info from that
      const { data: countyFacts, error: countyError } = await supabase
        .from('school_fact')
        .select('value')
        .eq('data_type_id', 966) // county_id
        .is('inactive', null)
        .not('value', 'is', null);

      if (countyError) {
        console.error("Error fetching county facts:", countyError);
        return;
      }

      // Get unique county IDs
      const countyIds = [...new Set((countyFacts || []).map((f: any) => parseInt(f.value)).filter((id: any) => !isNaN(id)))];

      if (countyIds.length === 0) {
        setUniqueCountyStates([]);
        return;
      }

      // Fetch county names with their state information
      // The county table has a state relationship, so we get state abbrev from there
      const { data: countiesData, error: countiesError } = await supabase
        .from('county')
        .select('id, name, state(id, abbrev)')
        .in('id', countyIds);

      if (countiesError) {
        console.error("Error fetching counties:", countiesError);
        return;
      }

      // Build unique county/state pairs from counties (counties already have state info)
      const countyStateSet = new Set<string>();
      const uniquePairs: { county: string; state: string }[] = [];

      (countiesData || []).forEach((county: any) => {
        if (county?.name && county?.state?.abbrev) {
          const key = `${county.name}|${county.state.abbrev}`;
          if (!countyStateSet.has(key)) {
            countyStateSet.add(key);
            uniquePairs.push({
              county: county.name,
              state: county.state.abbrev,
            });
          }
        }
      });

      uniquePairs.sort((a, b) => {
        if (a.county === b.county) {
          return a.state.localeCompare(b.state);
        }
        return a.county.localeCompare(b.county);
      });

      setUniqueCountyStates(uniquePairs);
    } catch (err) {
      console.error("Error fetching county/state combinations:", err);
    } finally {
      setLoadingCountyStates(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoadingUserData(true);

      if (!userDetails) {
        console.error("No user details found");
        setLoadingUserData(false);
        return;
      }

      if (!userDetails.customer_id) {
        setLoadingUserData(false);
        return;
      }

      // Get user's college from the customers table
      const { data: customerData, error: customerError } = await supabase
        .from("customer")
        .select(
          `
          id,
          school_id,
          school:school_id (
            id,
            name
          )
        `
        )
        .eq("id", userDetails.customer_id);

      if (customerError) {
        console.error("Error fetching customer data:", customerError);
        setLoadingUserData(false);
        return;
      }

      if (customerData && customerData.length > 0) {
        const school = customerData[0].school as unknown as {
          id: string;
          name: string;
        } | null;
        if (school?.name) {
          setUserSchool(school.name);

          // Now that we have the user's school, let's search for the coaches
          await extractCoachesFromUserSchool(school.name);
        }
      }
    } catch (err) {
      console.error("Error fetching user school:", err);
    } finally {
      setLoadingUserData(false);
    }
  };

  // Function to extract coaches from the recruiting_coaches field for the user's school
  const extractCoachesFromUserSchool = async (schoolName: string) => {
    try {
      // Query vw_high_school to get school_ids, then check school_fact for recruiting_coaches
      // Note: recruiting_coaches might be in a different data_type_id
      // For now, we'll fetch from vw_high_school if it has the field, otherwise skip
      const { data, error } = await supabase
        .from("vw_high_school")
        .select("school_id, recruiting_coaches")
        .not("recruiting_coaches", "is", null)
        .limit(1000);

      if (error) {
        console.error("Error fetching recruiting coaches:", error);
        return;
      }

      // Process each school's recruiting_coaches field
      const coachList: { name: string; schoolName: string }[] = [];

      data.forEach((row: any) => {
        if (row.recruiting_coaches) {
          // Split the recruiting coaches string by commas
          const coachEntries = row.recruiting_coaches
            .split(",")
            .map((entry: string) => entry.trim());

          // Find entries that match the user's school
          coachEntries.forEach((entry: string) => {
            if (entry.includes(schoolName)) {
              // Extract the coach name (after the school name)
              const parts = entry.split(schoolName);
              if (parts.length > 1) {
                const coachName = parts[1].trim();
                // Only add if not already in the list
                if (
                  coachName &&
                  !coachList.some(
                    (c) => c.name === coachName && c.schoolName === schoolName
                  )
                ) {
                  coachList.push({ name: coachName, schoolName });
                }
              }
            }
          });
        }
      });

      setCoachesFromUserSchool(coachList);
    } catch (err) {
      console.error("Error extracting coaches:", err);
    }
  };

  const handleCheckboxChange = (address: string, school: School) => {
    setSelectedAddresses((prev) => {
      let newAddresses: string[];
      let newSelectedSchools: Map<string, School>;
      
      if (prev.includes(address)) {
        newSelectedSchools = new Map(selectedSchoolsData);
        newSelectedSchools.delete(address);
        setSelectedSchoolsData(newSelectedSchools);
        newAddresses = prev.filter((a) => a !== address);
      } else {
        newSelectedSchools = new Map(selectedSchoolsData);
        newSelectedSchools.set(address, school);
        setSelectedSchoolsData(newSelectedSchools);
        newAddresses = [...prev, address];
      }
      
      // Save to localStorage immediately
      try {
        localStorage.setItem("selectedAddresses", JSON.stringify(newAddresses));
        const selectedSchoolData = Array.from(newSelectedSchools.values()).map(
          (s) => ({
            school: s.school,
            address: s.address,
            county: s.county,
            state: s.state,
            head_coach_first: s.head_coach_first,
            head_coach_last: s.head_coach_last,
            private_public: s.private_public,
            league_classification: s.league_classification,
            score_college_player: s.score_college_player,
            score_d1_producing: s.score_d1_producing,
            score_team_quality: s.score_team_quality,
            score_income: s.score_income,
            score_academics: s.score_academics,
            head_coach_email: s.head_coach_email,
            head_coach_cell: s.head_coach_cell,
            head_coach_work_phone: s.head_coach_work_phone,
            head_coach_home_phone: s.head_coach_home_phone,
            coach_twitter_handle: s.coach_twitter_handle,
            visit_info: s.visit_info,
            best_phone: s.best_phone,
            coach_best_contact: s.coach_best_contact,
            school_phone: s.school_phone,
            ad_name_first: s.ad_name_first,
            ad_name_last: s.ad_name_last,
            ad_email: s.ad_email,
            record_2024: s.record_2024,
            record_2025: s.record_2025,
            school_id: s.school_id,
            high_school_id: s.high_school_id,
            raw_data: s.raw_data,
          })
        );
        localStorage.setItem("schoolData", JSON.stringify(selectedSchoolData));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
      
      return newAddresses;
    });
  };

  const handleToggleCountyState = (value: string) => {
    setSelectedCountyStates((prev) =>
      prev.includes(value)
        ? prev.filter((cs) => cs !== value)
        : [...prev, value]
    );
  };

  const handleToggleCoach = (coachName: string) => {
    setSelectedCoaches((prev) =>
      prev.includes(coachName)
        ? prev.filter((c) => c !== coachName)
        : [...prev, coachName]
    );
  };

  const handleScoreFilterChange = (
    type: keyof typeof scoreFilters,
    field: "min" | "max" | "enabled",
    value: number | boolean
  ) => {
    setScoreFilters((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const resetFilters = () => {
    setSelectedCountyStates([]);
    setSelectedCoaches([]);
    setScoreFilters({
      college_player: { enabled: false, min: 0, max: 10 },
      d1_producing: { enabled: false, min: 0, max: 10 },
      team_quality: { enabled: false, min: 0, max: 10 },
      income: { enabled: false, min: 0, max: 10 },
      academics: { enabled: false, min: 0, max: 10 },
    });
  };

  const clearAllSelections = () => {
    setSelectedAddresses([]);
    setSelectedSchoolsData(new Map());
    // Clear localStorage as well
    try {
      localStorage.removeItem("selectedAddresses");
      localStorage.removeItem("schoolData");
    } catch (error) {
      console.error("Error clearing localStorage:", error);
    }
  };

  const getScoreColor = (score: number | undefined | null): string => {
    if (score === undefined || score === null) {
      return "transparent";
    }
    if (score >= 9) {
      return "rgba(0, 255, 0, 0.5)";
    }
    if (score >= 7) {
      return "rgba(173, 255, 47, 0.5)"; // Faded Yellow-Green
    }
    if (score >= 5) {
      return "rgba(255, 255, 0, 0.5)"; // Faded Yellow
    }
    if (score >= 3) {
      return "rgba(255, 140, 0, 0.5)"; // Faded Orange
    }
    return "rgba(255, 0, 0, 0.5)"; // Faded Red
  };

  const handleSubmit = () => {
    localStorage.setItem(
      "selectedAddresses",
      JSON.stringify(selectedAddresses)
    );

    // Convert the map values to an array for localStorage - include all fields
    const selectedSchoolData = Array.from(selectedSchoolsData.values()).map(
      (school) => {
        return {
          school: school.school,
          address: school.address,
          county: school.county,
          state: school.state,
          head_coach_first: school.head_coach_first,
          head_coach_last: school.head_coach_last,
          private_public: school.private_public,
          league_classification: school.league_classification,
          score_college_player: school.score_college_player,
          score_d1_producing: school.score_d1_producing,
          score_team_quality: school.score_team_quality,
          score_income: school.score_income,
          score_academics: school.score_academics,
          head_coach_email: school.head_coach_email,
          head_coach_cell: school.head_coach_cell,
          head_coach_work_phone: school.head_coach_work_phone,
          head_coach_home_phone: school.head_coach_home_phone,
          coach_twitter_handle: school.coach_twitter_handle,
          visit_info: school.visit_info,
          best_phone: school.best_phone,
          coach_best_contact: school.coach_best_contact,
          school_phone: school.school_phone,
          ad_name_first: school.ad_name_first,
          ad_name_last: school.ad_name_last,
          ad_email: school.ad_email,
          record_2024: school.record_2024,
          record_2025: school.record_2025,
          school_id: school.school_id,
          high_school_id: school.high_school_id,
          raw_data: school.raw_data,
        };
      }
    );

    // Store the data directly - no need to check for missing schools
    console.log("Selected addresses:", selectedAddresses);
    console.log("Selected school data:", selectedSchoolData);

    localStorage.setItem("schoolData", JSON.stringify(selectedSchoolData));
    router.push("/road-planner/map");
  };

  const filteredCountyStates = countyStateSearchQuery
    ? uniqueCountyStates.filter(
        (pair) =>
          pair.county
            .toLowerCase()
            .includes(countyStateSearchQuery.toLowerCase()) ||
          pair.state
            .toLowerCase()
            .includes(countyStateSearchQuery.toLowerCase())
      )
    : uniqueCountyStates;

  return (
    <div className="w-full h-full">
      <div
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
          paddingBottom: zoom > 100 ? "2rem" : "0",
          paddingRight: zoom > 100 ? "5%" : "0",
          minHeight: zoom > 100 ? `${zoom}vh` : "auto",
          width: zoom > 100 ? `${Math.max(zoom, 120)}%` : "100%",
          marginBottom: zoom > 100 ? "4rem" : "0",
        }}
      >
        <div className="flex flex-col h-[calc(100vh-100px)]">
          {/* Fixed header section - make it more compact */}
          <div className="p-4 pb-3 border-b border-gray-200 bg-white">
            <div className="mb-2">
              <input
                type="text"
                placeholder="Search schools, coaches, counties, states..."
                className="w-full p-2 border rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {totalCount && (
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery.length < 2 &&
                  !selectedCountyStates.length &&
                  Object.values(scoreFilters).every((f) => !f.enabled) &&
                  !selectedCoaches.length
                    ? `Showing ${Math.min(
                        highSchools.length,
                        100
                      )} of ${totalCount} schools`
                    : highSchools.length === 100
                    ? `Showing the first 100 matching schools (from ${
                        matchingCount !== null ? `${matchingCount}/` : ""
                      }${totalCount} total)`
                    : `Showing ${highSchools.length} matching schools (from ${
                        matchingCount !== null ? `${matchingCount}/` : ""
                      }${totalCount} total)`}
                </p>
              )}
            </div>

            <div className="mb-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
                  />
                </svg>
                {showFilters ? "Hide Filters" : "Show Filters"}
                {selectedCountyStates.length > 0 ||
                Object.values(scoreFilters).some((f) => f.enabled) ||
                selectedCoaches.length > 0 ? (
                  <span className="bg-blue-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 ml-1">
                    {selectedCountyStates.length +
                      Object.values(scoreFilters).filter((f) => f.enabled)
                        .length +
                      selectedCoaches.length}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {/* Main content container with relative positioning */}
          <div className="flex-1 overflow-hidden flex flex-col relative">
            {/* Scrollable content area with padding at bottom for the fixed bar */}
            <div className="flex-1 overflow-y-auto pb-28">
              {showFilters && (
                <div className="mb-4 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        County & State
                      </label>
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search counties or states..."
                            value={countyStateSearchQuery}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>
                            ) => setCountyStateSearchQuery(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                          {countyStateSearchQuery && (
                            <button
                              onClick={() => {
                                setCountyStateSearchQuery("");
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.5}
                                stroke="currentColor"
                                className="w-5 h-5"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>

                        {loadingCountyStates ? (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                          </div>
                        ) : (
                          <div className="max-h-60 overflow-y-auto border rounded-lg bg-white">
                            {filteredCountyStates.length === 0 ? (
                              <div className="p-2 text-sm text-gray-500 text-center">
                                No counties or states match your search
                              </div>
                            ) : (
                              filteredCountyStates.map(
                                (
                                  pair: { county: string; state: string },
                                  idx: number
                                ) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
                                      selectedCountyStates.includes(
                                        `${pair.county}|${pair.state}`
                                      )
                                        ? "bg-blue-50"
                                        : ""
                                    }`}
                                    onClick={() =>
                                      handleToggleCountyState(
                                        `${pair.county}|${pair.state}`
                                      )
                                    }
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedCountyStates.includes(
                                        `${pair.county}|${pair.state}`
                                      )}
                                      onChange={() => {}}
                                      className="mr-2 h-4 w-4"
                                    />
                                    <span>
                                      {pair.county}, {pair.state}
                                    </span>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        )}

                        {selectedCountyStates.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedCountyStates.map((cs, idx) => {
                              const [county, state] = cs.split("|");
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded"
                                >
                                  {county}, {state}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleCountyState(cs);
                                    }}
                                    className="ml-1 text-blue-500 hover:text-blue-700"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="w-3 h-3"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Recruiting Coaches Filter */}
                      {userSchool && (
                        <div className="mt-5">
                          <label className="block text-sm font-medium mb-1">
                            Recruiting Coaches from {userSchool}
                          </label>
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Search coaches..."
                                value={coachSearchQuery}
                                onChange={(e) =>
                                  setCoachSearchQuery(e.target.value)
                                }
                                className="w-full p-2 border rounded-lg"
                              />
                              {coachSearchQuery && (
                                <button
                                  onClick={() => setCoachSearchQuery("")}
                                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={1.5}
                                    stroke="currentColor"
                                    className="w-5 h-5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>

                            {loadingUserData ? (
                              <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                              </div>
                            ) : (
                              <div className="max-h-60 overflow-y-auto border rounded-lg bg-white">
                                {coachesFromUserSchool.length === 0 ? (
                                  <div className="p-2 text-sm text-gray-500 text-center">
                                    {loadingUserData
                                      ? "Loading coaches..."
                                      : "No recruiting coaches found for your school"}
                                  </div>
                                ) : (
                                  coachesFromUserSchool
                                    .filter(
                                      (coach) =>
                                        !coachSearchQuery ||
                                        coach.name
                                          .toLowerCase()
                                          .includes(
                                            coachSearchQuery.toLowerCase()
                                          )
                                    )
                                    .map((coach, idx) => (
                                      <div
                                        key={idx}
                                        className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
                                          selectedCoaches.includes(coach.name)
                                            ? "bg-blue-50"
                                            : ""
                                        }`}
                                        onClick={() =>
                                          handleToggleCoach(coach.name)
                                        }
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedCoaches.includes(
                                            coach.name
                                          )}
                                          onChange={() => {}}
                                          className="mr-2 h-4 w-4"
                                        />
                                        <span>{coach.name}</span>
                                      </div>
                                    ))
                                )}
                              </div>
                            )}

                            {selectedCoaches.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {selectedCoaches.map((coach, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded"
                                  >
                                    {coach}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleCoach(coach);
                                      }}
                                      className="ml-1 text-green-500 hover:text-green-700"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-3 h-3"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M6 18L18 6M6 6l12 12"
                                        />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h3 className="font-medium mb-2">Score Filters</h3>
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                College Players
                              </label>
                              <input
                                type="checkbox"
                                checked={scoreFilters.college_player.enabled}
                                onChange={(e) =>
                                  handleScoreFilterChange(
                                    "college_player",
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                            </div>
                            {scoreFilters.college_player.enabled && (
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.college_player.min}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "college_player",
                                      "min",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.college_player.min}
                                </span>
                                <span className="text-xs">to</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.college_player.max}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "college_player",
                                      "max",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.college_player.max}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                D1 Producing
                              </label>
                              <input
                                type="checkbox"
                                checked={scoreFilters.d1_producing.enabled}
                                onChange={(e) =>
                                  handleScoreFilterChange(
                                    "d1_producing",
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                            </div>
                            {scoreFilters.d1_producing.enabled && (
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.d1_producing.min}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "d1_producing",
                                      "min",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.d1_producing.min}
                                </span>
                                <span className="text-xs">to</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.d1_producing.max}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "d1_producing",
                                      "max",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.d1_producing.max}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                Team Quality
                              </label>
                              <input
                                type="checkbox"
                                checked={scoreFilters.team_quality.enabled}
                                onChange={(e) =>
                                  handleScoreFilterChange(
                                    "team_quality",
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                            </div>
                            {scoreFilters.team_quality.enabled && (
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.team_quality.min}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "team_quality",
                                      "min",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.team_quality.min}
                                </span>
                                <span className="text-xs">to</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.team_quality.max}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "team_quality",
                                      "max",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.team_quality.max}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                Income
                              </label>
                              <input
                                type="checkbox"
                                checked={scoreFilters.income.enabled}
                                onChange={(e) =>
                                  handleScoreFilterChange(
                                    "income",
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                            </div>
                            {scoreFilters.income.enabled && (
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.income.min}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "income",
                                      "min",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.income.min}
                                </span>
                                <span className="text-xs">to</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.income.max}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "income",
                                      "max",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.income.max}
                                </span>
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                Academics
                              </label>
                              <input
                                type="checkbox"
                                checked={scoreFilters.academics.enabled}
                                onChange={(e) =>
                                  handleScoreFilterChange(
                                    "academics",
                                    "enabled",
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4"
                              />
                            </div>
                            {scoreFilters.academics.enabled && (
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.academics.min}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "academics",
                                      "min",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.academics.min}
                                </span>
                                <span className="text-xs">to</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={scoreFilters.academics.max}
                                  onChange={(e) =>
                                    handleScoreFilterChange(
                                      "academics",
                                      "max",
                                      parseInt(e.target.value)
                                    )
                                  }
                                  className="w-1/2"
                                />
                                <span className="text-xs">
                                  {scoreFilters.academics.max}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={resetFilters}
                      className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
                    >
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}

              {error && (
                <div
                  className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
                  role="alert"
                >
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && (
                <div className="map-schools-container">
                  {filteredAddresses.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {searchQuery.length < 2 &&
                      Object.values(scoreFilters).every((f) => !f.enabled) &&
                      !selectedCountyStates.length &&
                      !selectedCoaches.length
                        ? "Start typing to search for schools or use filters"
                        : "No schools found matching your criteria."}
                    </div>
                  ) : (
                    filteredAddresses.map((item, index) => (
                      <div key={index} className="ml-9">
                        <SchoolCard
                          school={item}
                          hasFootballPackage={hasFootballPackage}
                          showCheckbox={true}
                          isChecked={selectedAddresses.includes(item.address)}
                          onCheckboxChange={(checked) => {
                            if (checked) {
                              handleCheckboxChange(item.address, item);
                            } else {
                              handleCheckboxChange(item.address, item);
                            }
                          }}
                          onClick={() => handleCheckboxChange(item.address, item)}
                        />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Bottom selection area - fixed to bottom of the relative container */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md px-4 pt-3 pb-3 z-20">
              <div className="flex flex-row justify-between items-center max-w-full">
                <div className="flex-1 flex flex-col items-start overflow-hidden">
                  <h4>Road Map</h4>
                  <div className="flex-1 flex flex-wrap gap-2 min-h-[36px] overflow-x-auto">
                    {selectedAddresses.length === 0 ? (
                      <span className="text-gray-400 italic">
                        No schools selected
                      </span>
                    ) : (
                      Array.from(selectedSchoolsData.values()).map(
                        (school, index) => (
                          <div key={index} className="">
                            {/* <span className="truncate max-w-[180px]">
                              {school.school}
                            </span> */}
                            {/* <button
                              onClick={() =>
                                handleCheckboxChange(school.address, school)
                              }
                              className="ml-2 text-blue-500 hover:text-blue-700"
                              title="Remove from selection"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="w-4 h-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button> */}

                            <div
                              className="flex items-center justify-start border-[4px] border-solid border-[#1C1D4D] rounded-full bg-gray-500 pr-3 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative group"
                              style={{ minWidth: "max-content" }}
                            >
                              <div className="flex items-center justify-center relative left-[-3px] top-[0] border-[4px] border-solid border-[#1C1D4D] rounded-full w-[40px] h-[40px] overflow-hidden">
                                <img
                                  src="/blank-hs.svg"
                                  alt="School"
                                  className="w-full h-full object-contain p-1"
                                />
                              </div>
                              <h6 className="flex flex-col text-white items-start justify-start mb-0 !text-[12px] !font-semibold !leading-1">
                                <span className="block w-full">
                                  {school.school}
                                </span>
                                {/* <span className="text-white !text-[10px] bg-[#1C1D4D] rounded-full px-2 !text-sm !leading-1">
                                  4.5
                                </span> */}
                              </h6>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCheckboxChange(school.address, school);
                                }}
                                className="ml-2 flex items-center justify-center w-7 h-7 rounded-full bg-white/30 hover:bg-red-500/50 transition-colors flex-shrink-0 border border-white/50"
                                title="Remove from road plan"
                                aria-label="Remove school from road plan"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  className="w-5 h-5"
                                  style={{ fill: 'white', stroke: 'white', strokeWidth: 0 }}
                                >
                                  <path
                                    d="M6 18L18 6M6 6l12 12"
                                    stroke="white"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                  />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end mr-10">
                  <Button
                    type="primary"
                    onClick={handleSubmit}
                    disabled={selectedAddresses.length === 0}
                  >
                    Map{" "}
                    {selectedAddresses.length > 0 &&
                      `(${selectedAddresses.length})`}
                  </Button>

                  {selectedAddresses.length > 0 && (
                    <Button type="link" className="text-[16px] italic underline !text-[#126DB8] font-medium" onClick={clearAllSelections}>
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="map-schools-container">
        <div className="card-list flex justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="school-icon">
                <img src="/svgicons/school-icon.svg" alt="X Feed" height={89} />
              </div>
              <div className="flex flex-col text-left mt-1">
                <h4 className="mb-1">Virginia Beach HS
                  <span className='bg-[#c8ff24]'>Public</span>
                </h4>
                <p className="mb-0">
                  1272 Mill Dam Road, Virginia Beach, VA, 23445 <br />
                  Virginia Beach, Virginia - (202) 684 7943
                </p>
              </div>
            </div>
            <div className="flex gap-2 mx-3 mb-3">
              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Liam James</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>

              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Moxen Galin</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>

              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Richard Mark</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>

              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Alex James</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 p-2">
            
            <div className="flex flex-col text-left w-[650px]">
              <div className="flex gap-2 mb-2 justify-end">
                <div className='text-lg font-medium bg-[#126DB8] text-white px-2'>Division 5A</div>
                <div className='text-lg font-medium border border-solid border-[#ccc] px-2'>1W - 9L</div>
                <div className='border border-solid border-[#ccc] px-2 flex items-center justify-center'>
                <img src="/svgicons/delete-03.svg" alt="X Feed" height={20} />
                </div>
              </div>
              <div className="flex justify-between gap-2">
               <div>
                <span className='bg-[#FFD000] text-lg italic font-bold leading-5'>
                Coach
                </span>
                <h6 className='mb-0 !text-lg leading-3'>George Alex</h6>
               </div>
               <div className='text-right'>
               <span className='bg-[#FFD000] text-lg italic font-bold leading-5'>
               AD
                </span>
                <h6 className='mb-0 !text-lg leading-3'>Stephen Butler</h6>
                <p className='mb-0 leading-5'>Shbutler@vbschools.com <br /> 
                School (757) 648 5300
                </p>
               </div>
              </div>
              <div className='flex gap-2'>
                <ul className='co-title bg-[#eaf8ed]'>
                  <li>
                    <h6>06</h6>
                    <p>College</p>
                  </li>
                  <li>
                    <h6>04</h6>
                    <p>D1</p>
                  </li>
                  <li>
                    <h6>05</h6>
                    <p>Team</p>
                  </li>
                  <li>
                    <h6>09</h6>
                    <p>Income</p>
                  </li>
                  <li>
                    <h6>06</h6>
                    <p>Acad</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
