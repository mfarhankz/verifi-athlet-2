'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { School } from './types';
import { useUser } from "@/contexts/CustomerContext";
import { useZoom } from '@/contexts/ZoomContext';
import { getPackageIdsBySport, fetchSchoolFacts, fetchCoachInfo } from '@/lib/queries';
import { convertSchoolId } from '@/utils/printUtils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [selectedSchoolsData, setSelectedSchoolsData] = useState<Map<string, School>>(new Map());
  const [highSchools, setHighSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCountyStates, setSelectedCountyStates] = useState<string[]>([]);
  const [countyStateSearchQuery, setCountyStateSearchQuery] = useState('');
  const [uniqueCountyStates, setUniqueCountyStates] = useState<{county: string, state: string}[]>([]);
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
  const [coachesFromUserSchool, setCoachesFromUserSchool] = useState<{name: string, schoolName: string}[]>([]);
  const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(true);
  const [coachSearchQuery, setCoachSearchQuery] = useState('');
  const userDetails = useUser();
  const { zoom } = useZoom();
  
  // Check if user has any football package to determine if coach info should be shown
  const footballPackageIds = getPackageIdsBySport('fb');
  const userPackageNumbers = (userDetails?.packages || []).map((pkg: any) => Number(pkg));
  const hasFootballPackage = footballPackageIds.some(id => userPackageNumbers.includes(id));

  // Derived state
  const filteredAddresses = highSchools;

  // Load initial data only once on component mount
  useEffect(() => {
    async function fetchInitialHighSchools() {
      try {
        setLoading(true);
        
        // First, get the total count
        const countQuery = await supabase
          .from('high_schools')
          .select('high_school_id', { count: 'exact', head: true });
        
        if (countQuery.error) {
          console.error('Error counting schools:', countQuery.error);
          throw countQuery.error;
        }
        
        setTotalCount(countQuery.count);
        
        // Limit to first 100 records initially
        const { data, error } = await supabase
          .from('high_schools')
          .select(SELECT_FIELDS)
          .limit(100);

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          setHighSchools([]);
          setLoading(false);
          return;
        }

        const formattedData = data.map((school: Record<string, any>) => {
          // Format the address string from individual fields
          const addressParts = [
            school.address_street1,
            school.address_street2,
            school.address_city,
            school.address_state,
            school.address_zip
          ].filter(Boolean); // Remove any undefined/null/empty values
          
          const address = addressParts.join(', ');
          
          return {
            school: school.school,
            address,
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
            record_2024: school['2024_record'],
            raw_data: {
              address_street1: school.address_street1,
              address_street2: school.address_street2,
              address_city: school.address_city,
              address_state: school.address_state,
              address_zip: school.address_zip,
              high_school_id: school.high_school_id
            }
          };
        });

        setHighSchools(formattedData);
        setAllHighSchools(formattedData);
        
        // Load any previously selected addresses from localStorage
        // This ensures selections are maintained when returning from the map page
        try {
          const savedAddresses = localStorage.getItem('selectedAddresses');
          const savedSchoolData = localStorage.getItem('schoolData');
          
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
          console.error('Error loading saved selections from localStorage:', localStorageError);
        }
      } catch (err: unknown) {
        console.error('Error fetching high schools:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
        if (selectedAddresses.includes(school.address) && !updatedMap.has(school.address)) {
          updatedMap.set(school.address, school);
        }
      });
      
      // Also check allHighSchools for any matches
      allHighSchools.forEach((school: School) => {
        if (selectedAddresses.includes(school.address) && !updatedMap.has(school.address)) {
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
    if (!searchQuery && selectedCountyStates.length === 0 && 
        Object.values(scoreFilters).every(f => !f.enabled) &&
        selectedCoaches.length === 0) {
      return;
    }
    
    async function fetchHighSchools() {
      try {
        setLoading(true);
        
        // Build query with any active filters
        let query = supabase
          .from('high_schools')
          .select(SELECT_FIELDS);
        
        // Create a parallel query for getting the total count
        let countQuery = supabase
          .from('high_schools')
          .select('high_school_id', { count: 'exact', head: true });
        
        // Add search query if present
        if (searchQuery.length >= 2) {
          // First search by school name
          const searchFilter = `school.ilike.%${searchQuery}%,` +
            `address_city.ilike.%${searchQuery}%,` +
            `county.ilike.%${searchQuery}%,` + 
            `state.ilike.%${searchQuery}%,` +
            `head_coach_first.ilike.%${searchQuery}%,` +
            `head_coach_last.ilike.%${searchQuery}%`;
          
          query = query.or(searchFilter);
          countQuery = countQuery.or(searchFilter);
        }
        
        // Apply county/state filters
        if (selectedCountyStates.length > 0) {
          // Create a list of individual filters for each county/state pair
          const countyStateFilters = selectedCountyStates.map(cs => {
            const [county, state] = cs.split('|');
            return `and(county.eq."${county}",state.eq."${state}")`;
          });
          
          // Join with 'or' to match any of the selected county/state pairs
          const countyStateFilter = countyStateFilters.join(',');
          query = query.or(countyStateFilter);
          countQuery = countQuery.or(countyStateFilter);
        }
        
        // Apply score filters
        if (scoreFilters.college_player.enabled) {
          query = query
            .gte('score_college_player', scoreFilters.college_player.min)
            .lte('score_college_player', scoreFilters.college_player.max);
          countQuery = countQuery
            .gte('score_college_player', scoreFilters.college_player.min)
            .lte('score_college_player', scoreFilters.college_player.max);
        }
        
        if (scoreFilters.d1_producing.enabled) {
          query = query
            .gte('score_d1_producing', scoreFilters.d1_producing.min)
            .lte('score_d1_producing', scoreFilters.d1_producing.max);
          countQuery = countQuery
            .gte('score_d1_producing', scoreFilters.d1_producing.min)
            .lte('score_d1_producing', scoreFilters.d1_producing.max);
        }
        
        if (scoreFilters.team_quality.enabled) {
          query = query
            .gte('score_team_quality', scoreFilters.team_quality.min)
            .lte('score_team_quality', scoreFilters.team_quality.max);
          countQuery = countQuery
            .gte('score_team_quality', scoreFilters.team_quality.min)
            .lte('score_team_quality', scoreFilters.team_quality.max);
        }
        
        if (scoreFilters.income.enabled) {
          query = query
            .gte('score_income', scoreFilters.income.min)
            .lte('score_income', scoreFilters.income.max);
          countQuery = countQuery
            .gte('score_income', scoreFilters.income.min)
            .lte('score_income', scoreFilters.income.max);
        }
        
        if (scoreFilters.academics.enabled) {
          query = query
            .gte('score_academics', scoreFilters.academics.min)
            .lte('score_academics', scoreFilters.academics.max);
          countQuery = countQuery
            .gte('score_academics', scoreFilters.academics.min)
            .lte('score_academics', scoreFilters.academics.max);
        }
        
        // Apply recruiting coaches filter
        if (selectedCoaches.length > 0 && userSchool) {
          // Create a filter for each selected coach
          const coachFilters = selectedCoaches.map(coach => {
            return `recruiting_coaches.ilike.%${userSchool} ${coach}%`;
          });
          
          // Join with 'or' to match any of the selected coaches
          const coachFilter = coachFilters.join(',');
          query = query.or(coachFilter);
          countQuery = countQuery.or(coachFilter);
        }
        
        // Get the total count of matches first
        const countResponse = await countQuery;
        
        if (countResponse.error) {
          console.error('Error getting count:', countResponse.error);
        } else {
          setMatchingCount(countResponse.count);
        }
        
        // Limit to 100 records for the actual data
        const { data, error } = await query.limit(100);

        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          setHighSchools([]);
          setLoading(false);
          return;
        }

        const formattedData = data.map((school: Record<string, any>) => {
          const addressParts = [
            school.address_street1,
            school.address_street2,
            school.address_city,
            school.address_state,
            school.address_zip
          ].filter(Boolean);
          
          const address = addressParts.join(', ');
          
          return {
            school: school.school,
            address,
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
            recruiting_coaches: school.recruiting_coaches,
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
            record_2024: school['2024_record'],
            raw_data: {
              address_street1: school.address_street1,
              address_street2: school.address_street2,
              address_city: school.address_city,
              address_state: school.address_state,
              address_zip: school.address_zip,
              high_school_id: school.high_school_id
            }
          };
        });

        setHighSchools(formattedData);
        // Don't update allHighSchools here as we only want the initial load for that
      } catch (err: unknown) {
        console.error('Error fetching high schools:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
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
  }, [selectedCountyStates, scoreFilters, searchQuery, selectedCoaches, userSchool]);

  const fetchCountyStates = async () => {
    try {
      setLoadingCountyStates(true);
      
      const { data, error } = await supabase
        .from('high_schools')
        .select('county, state')
        .not('county', 'is', null)
        .not('state', 'is', null);
      
      if (error) {
        console.error('Error fetching county/state data:', error);
        return;
      }
      
      const countyStateSet = new Set<string>();
      const uniquePairs: {county: string, state: string}[] = [];
      
      data.forEach((item: {county: string, state: string}) => {
        if (item.county && item.state) {
          const key = `${item.county}|${item.state}`;
          if (!countyStateSet.has(key)) {
            countyStateSet.add(key);
            uniquePairs.push({
              county: item.county,
              state: item.state
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
      console.error('Error fetching county/state combinations:', err);
    } finally {
      setLoadingCountyStates(false);
    }
  };

  const fetchUserData = async () => {
    try {
      setLoadingUserData(true);
      
      if (!userDetails) {
        console.error('No user details found');
        setLoadingUserData(false);
        return;
      }
      
      if (!userDetails.customer_id) {
        setLoadingUserData(false);
        return;
      }
      
      // Get user's college from the customers table
      const { data: customerData, error: customerError } = await supabase
        .from('customer')
        .select(`
          id,
          school_id,
          school:school_id (
            id,
            name
          )
        `)
        .eq('id', userDetails.customer_id);
      
      if (customerError) {
        console.error('Error fetching customer data:', customerError);
        setLoadingUserData(false);
        return;
      }
      
      if (customerData && customerData.length > 0) {
        const school = customerData[0].school as unknown as { id: string; name: string } | null;
        if (school?.name) {
          setUserSchool(school.name);
          
          // Now that we have the user's school, let's search for the coaches
          await extractCoachesFromUserSchool(school.name);
        }
      }
    } catch (err) {
      console.error('Error fetching user school:', err);
    } finally {
      setLoadingUserData(false);
    }
  };
  
  // Function to extract coaches from the recruiting_coaches field for the user's school
  const extractCoachesFromUserSchool = async (schoolName: string) => {
    try {
      // Query all high schools to find recruiting_coaches that contain the user's school
      const { data, error } = await supabase
        .from('high_schools')
        .select('recruiting_coaches')
        .not('recruiting_coaches', 'is', null);
      
      if (error) {
        console.error('Error fetching recruiting coaches:', error);
        return;
      }
      
      // Process each school's recruiting_coaches field
      const coachList: {name: string, schoolName: string}[] = [];
      
      data.forEach((row: any) => {
        if (row.recruiting_coaches) {
          // Split the recruiting coaches string by commas
          const coachEntries = row.recruiting_coaches.split(',').map((entry: string) => entry.trim());
          
          // Find entries that match the user's school
          coachEntries.forEach((entry: string) => {
            if (entry.includes(schoolName)) {
              // Extract the coach name (after the school name)
              const parts = entry.split(schoolName);
              if (parts.length > 1) {
                const coachName = parts[1].trim();
                // Only add if not already in the list
                if (coachName && !coachList.some(c => c.name === coachName && c.schoolName === schoolName)) {
                  coachList.push({ name: coachName, schoolName });
                }
              }
            }
          });
        }
      });
      
      setCoachesFromUserSchool(coachList);
    } catch (err) {
      console.error('Error extracting coaches:', err);
    }
  };

  // Helper function to fetch school data from proper tables (same as new page)
  const fetchSchoolDataFromTables = async (highSchoolId: string): Promise<School | null> => {
    try {
      // Convert high_school_id to school_id
      const schoolId = await convertSchoolId(highSchoolId);
      if (!schoolId) {
        console.error("Could not convert high_school_id to school_id");
        return null;
      }

      // Fetch school name
      const { data: schoolData, error: schoolError } = await supabase
        .from('school')
        .select('name')
        .eq('id', schoolId)
        .single();

      if (schoolError || !schoolData) {
        console.error("Error fetching school:", schoolError);
        return null;
      }

      // Fetch school facts
      const schoolFacts = await fetchSchoolFacts(schoolId);
      if (!schoolFacts) {
        return null;
      }

      // Get latest fact for each data type by both ID and name
      const factsMapById = new Map<number, { value: string; created_at: string }>();
      const factsMapByName = new Map<string, { value: string; created_at: string }>();
      
      schoolFacts.forEach((fact: any) => {
        const dataTypeId = fact.data_type_id;
        const dataTypeName = fact.data_type?.name;
        const existingById = factsMapById.get(dataTypeId);
        const existingByName = dataTypeName ? factsMapByName.get(dataTypeName) : null;
        
        if (!existingById || 
            new Date(fact.created_at) > new Date(existingById.created_at)) {
          factsMapById.set(dataTypeId, { value: fact.value, created_at: fact.created_at });
        }
        
        if (dataTypeName && (!existingByName || 
            new Date(fact.created_at) > new Date(existingByName.created_at))) {
          factsMapByName.set(dataTypeName, { value: fact.value, created_at: fact.created_at });
        }
      });

      const getFactValue = (dataTypeId: number): string | undefined => {
        return factsMapById.get(dataTypeId)?.value;
      };
      
      const getFactValueByName = (dataTypeName: string): string | undefined => {
        return factsMapByName.get(dataTypeName)?.value;
      };

      // Fetch coach info
      const coachInfo = await fetchCoachInfo(schoolId);

      // Get state abbreviation from state_id fact if available
      let stateAbbrev: string | undefined;
      const stateIdFact = schoolFacts.find((fact: any) => fact.data_type?.name === 'state_id');
      if (stateIdFact?.state?.abbrev) {
        stateAbbrev = stateIdFact.state.abbrev;
      }

      // Convert county_id to county name if needed, and get state from county if state not found
      let countyName: string | undefined;
      const countyId = getFactValue(966); // county_id
      if (countyId) {
        try {
          const { data: countyData, error: countyError } = await supabase
            .from('county')
            .select('name, state(id, abbrev)')
            .eq('id', parseInt(countyId))
            .single();
          
          if (!countyError && countyData) {
            countyName = countyData.name;
            // Use county's state abbrev if we don't have one yet
            if (!stateAbbrev && countyData.state?.abbrev) {
              stateAbbrev = countyData.state.abbrev;
            }
          }
        } catch (error) {
          console.error("Error fetching county:", error);
        }
      }

      // Build address from school facts
      const addressStreet = getFactValueByName('address_street') || getFactValueByName('address_street1');
      const addressCity = getFactValue(247) || getFactValueByName('address_city'); // address_city
      const addressStateRaw = getFactValue(253) || getFactValueByName('school_state') || getFactValueByName('address_state'); // school_state
      // Use abbreviation if available, otherwise use raw value (might already be abbrev)
      const addressState = stateAbbrev || addressStateRaw;
      const addressZip = getFactValueByName('address_zip') || getFactValueByName('address_zipcode');
      
      const addressParts = [addressStreet, addressCity, addressState, addressZip].filter(Boolean);
      const address = addressParts.join(', ');

      // Build School object
      const school: School = {
        school: schoolData.name,
        address: address,
        county: countyName,
        state: stateAbbrev || addressStateRaw,
        head_coach_first: coachInfo?.firstName,
        head_coach_last: coachInfo?.lastName,
        private_public: getFactValue(928), // private_public
        league_classification: getFactValue(119), // division
        score_college_player: getFactValue(956) ? parseFloat(getFactValue(956)!) : undefined, // college_player_producing
        score_d1_producing: getFactValue(957) ? parseFloat(getFactValue(957)!) : undefined, // d1_player_producing
        score_team_quality: getFactValue(958) ? parseFloat(getFactValue(958)!) : undefined, // team_quality
        score_income: getFactValue(959) ? parseFloat(getFactValue(959)!) : undefined, // athlete_income
        score_academics: getFactValue(960) ? parseFloat(getFactValue(960)!) : undefined, // academics
        head_coach_email: coachInfo?.email || getFactValue(255), // hc_email from school_fact or coach_fact
        head_coach_cell: coachInfo?.phone || getFactValue(256), // hc_number from school_fact or coach_fact
        head_coach_work_phone: undefined, // Can be added if data_type_id is known
        head_coach_home_phone: undefined, // Can be added if data_type_id is known
        coach_twitter_handle: coachInfo?.twitterHandle || getFactValue(13), // twitter handle
        visit_info: getFactValue(926), // visit_info
        best_phone: coachInfo?.best_phone,
        coach_best_contact: undefined, // Can be added if data_type_id is known
        school_phone: getFactValue(257), // school_phone (if data_type_id exists)
        ad_name_first: undefined, // AD info would need separate lookup
        ad_name_last: undefined,
        ad_email: undefined,
        record_2024: getFactValue(2024), // 2024_record (if data_type_id exists)
        address_street1: addressStreet,
        address_city: addressCity,
        address_state: stateAbbrev || addressStateRaw,
        address_zip: addressZip,
        raw_data: {
          address_street1: addressStreet || '',
          address_city: addressCity || '',
          address_state: stateAbbrev || addressStateRaw || '',
          address_zip: addressZip || '',
          high_school_id: highSchoolId,
        }
      };

      return school;
    } catch (error) {
      console.error("Error fetching school data from tables:", error);
      return null;
    }
  };

  const handleCheckboxChange = (address: string, school: School) => {
    setSelectedAddresses(prev => {
      if (prev.includes(address)) {
        const newSelectedSchools = new Map(selectedSchoolsData);
        newSelectedSchools.delete(address);
        setSelectedSchoolsData(newSelectedSchools);
        return prev.filter(a => a !== address);
      } else {
        const newSelectedSchools = new Map(selectedSchoolsData);
        newSelectedSchools.set(address, school);
        setSelectedSchoolsData(newSelectedSchools);
        return [...prev, address];
      }
    });
  };

  const handleToggleCountyState = (value: string) => {
    setSelectedCountyStates(prev => 
      prev.includes(value) 
        ? prev.filter(cs => cs !== value) 
        : [...prev, value]
    );
  };

  const handleToggleCoach = (coachName: string) => {
    setSelectedCoaches(prev => 
      prev.includes(coachName) 
        ? prev.filter(c => c !== coachName) 
        : [...prev, coachName]
    );
  };

  const handleScoreFilterChange = (type: keyof typeof scoreFilters, field: 'min' | 'max' | 'enabled', value: number | boolean) => {
    setScoreFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
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
      academics: { enabled: false, min: 0, max: 10 }
    });
  };

  const clearAllSelections = () => {
    setSelectedAddresses([]);
    setSelectedSchoolsData(new Map());
  };

  const getScoreColor = (score: number | undefined | null): string => {
    if (score === undefined || score === null) {return 'transparent'}
    if (score >= 9) {return 'rgba(0, 255, 0, 0.5)'}
    if (score >= 7) {
      return 'rgba(173, 255, 47, 0.5)'; // Faded Yellow-Green
    }
    if (score >= 5) {
      return 'rgba(255, 255, 0, 0.5)'; // Faded Yellow
    }
    if (score >= 3) {
      return 'rgba(255, 140, 0, 0.5)'; // Faded Orange
    }
    return 'rgba(255, 0, 0, 0.5)'; // Faded Red
  };

  const handleSubmit = () => {
    localStorage.setItem('selectedAddresses', JSON.stringify(selectedAddresses));
    
    // Convert the map values to an array for localStorage
    const selectedSchoolData = Array.from(selectedSchoolsData.values()).map(school => {
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
        raw_data: school.raw_data
      };
    });
    
    // Store the data directly - no need to check for missing schools
    console.log('Selected addresses:', selectedAddresses);
    console.log('Selected school data:', selectedSchoolData);
    
    localStorage.setItem('schoolData', JSON.stringify(selectedSchoolData));
    router.push('/road-planner/map');
  };

  const filteredCountyStates = countyStateSearchQuery
    ? uniqueCountyStates.filter(pair => 
        pair.county.toLowerCase().includes(countyStateSearchQuery.toLowerCase()) ||
        pair.state.toLowerCase().includes(countyStateSearchQuery.toLowerCase())
      )
    : uniqueCountyStates;

  return (
    <div className="w-full h-full">
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
              {(searchQuery.length < 2 && !selectedCountyStates.length && Object.values(scoreFilters).every(f => !f.enabled) && !selectedCoaches.length)
                ? `Showing ${Math.min(highSchools.length, 100)} of ${totalCount} schools` 
                : highSchools.length === 100
                  ? `Showing the first 100 matching schools (from ${matchingCount !== null ? `${matchingCount}/` : ''}${totalCount} total)`
                  : `Showing ${highSchools.length} matching schools (from ${matchingCount !== null ? `${matchingCount}/` : ''}${totalCount} total)`}
            </p>
          )}
        </div>
        
        <div className="mb-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {(selectedCountyStates.length > 0 || Object.values(scoreFilters).some(f => f.enabled) || selectedCoaches.length > 0) ? (
              <span className="bg-blue-500 text-white text-xs font-semibold rounded-full px-2 py-0.5 ml-1">
                {selectedCountyStates.length + Object.values(scoreFilters).filter(f => f.enabled).length + selectedCoaches.length}
              </span>
            ) : null}
          </button>
        </div>
      </div>
      
      {/* Main content container with relative positioning */}
      <div className="flex-1 overflow-hidden flex flex-col relative">
        {/* Scrollable content area with padding at bottom for the fixed bar */}
        <div className="flex-1 overflow-y-auto p-4 pb-28">
          {showFilters && (
            <div className="mb-4 p-4 border rounded-lg bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">County & State</label>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search counties or states..."
                        value={countyStateSearchQuery}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCountyStateSearchQuery(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                      {countyStateSearchQuery && (
                        <button
                          onClick={() => {
                            setCountyStateSearchQuery("");
                          }}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                          filteredCountyStates.map((pair: {county: string, state: string}, idx: number) => (
                            <div 
                              key={idx} 
                              className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
                                selectedCountyStates.includes(`${pair.county}|${pair.state}`) ? 'bg-blue-50' : ''
                              }`}
                              onClick={() => handleToggleCountyState(`${pair.county}|${pair.state}`)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedCountyStates.includes(`${pair.county}|${pair.state}`)}
                                onChange={() => {}}
                                className="mr-2 h-4 w-4"
                              />
                              <span>{pair.county}, {pair.state}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    
                    {selectedCountyStates.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedCountyStates.map((cs, idx) => {
                          const [county, state] = cs.split('|');
                          return (
                            <div key={idx} className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                              {county}, {state}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleCountyState(cs);
                                }}
                                className="ml-1 text-blue-500 hover:text-blue-700"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                      <label className="block text-sm font-medium mb-1">Recruiting Coaches from {userSchool}</label>
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search coaches..."
                            value={coachSearchQuery}
                            onChange={(e) => setCoachSearchQuery(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                          />
                          {coachSearchQuery && (
                            <button
                              onClick={() => setCoachSearchQuery('')}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                                {loadingUserData ? 'Loading coaches...' : 'No recruiting coaches found for your school'}
                              </div>
                            ) : (
                              coachesFromUserSchool
                                .filter(coach => 
                                  !coachSearchQuery || 
                                  coach.name.toLowerCase().includes(coachSearchQuery.toLowerCase())
                                )
                                .map((coach, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer ${
                                      selectedCoaches.includes(coach.name) ? 'bg-blue-50' : ''
                                    }`}
                                    onClick={() => handleToggleCoach(coach.name)}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedCoaches.includes(coach.name)}
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
                              <div key={idx} className="flex items-center bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">
                                {coach}
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleCoach(coach);
                                  }}
                                  className="ml-1 text-green-500 hover:text-green-700"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                          <label className="text-sm font-medium">College Players</label>
                          <input 
                            type="checkbox" 
                            checked={scoreFilters.college_player.enabled}
                            onChange={(e) => handleScoreFilterChange('college_player', 'enabled', e.target.checked)}
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
                              onChange={(e) => handleScoreFilterChange('college_player', 'min', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.college_player.min}</span>
                            <span className="text-xs">to</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              value={scoreFilters.college_player.max}
                              onChange={(e) => handleScoreFilterChange('college_player', 'max', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.college_player.max}</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">D1 Producing</label>
                          <input 
                            type="checkbox" 
                            checked={scoreFilters.d1_producing.enabled}
                            onChange={(e) => handleScoreFilterChange('d1_producing', 'enabled', e.target.checked)}
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
                              onChange={(e) => handleScoreFilterChange('d1_producing', 'min', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.d1_producing.min}</span>
                            <span className="text-xs">to</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              value={scoreFilters.d1_producing.max}
                              onChange={(e) => handleScoreFilterChange('d1_producing', 'max', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.d1_producing.max}</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Team Quality</label>
                          <input 
                            type="checkbox" 
                            checked={scoreFilters.team_quality.enabled}
                            onChange={(e) => handleScoreFilterChange('team_quality', 'enabled', e.target.checked)}
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
                              onChange={(e) => handleScoreFilterChange('team_quality', 'min', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.team_quality.min}</span>
                            <span className="text-xs">to</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              value={scoreFilters.team_quality.max}
                              onChange={(e) => handleScoreFilterChange('team_quality', 'max', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.team_quality.max}</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Income</label>
                          <input 
                            type="checkbox" 
                            checked={scoreFilters.income.enabled}
                            onChange={(e) => handleScoreFilterChange('income', 'enabled', e.target.checked)}
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
                              onChange={(e) => handleScoreFilterChange('income', 'min', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.income.min}</span>
                            <span className="text-xs">to</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              value={scoreFilters.income.max}
                              onChange={(e) => handleScoreFilterChange('income', 'max', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.income.max}</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">Academics</label>
                          <input 
                            type="checkbox" 
                            checked={scoreFilters.academics.enabled}
                            onChange={(e) => handleScoreFilterChange('academics', 'enabled', e.target.checked)}
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
                              onChange={(e) => handleScoreFilterChange('academics', 'min', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.academics.min}</span>
                            <span className="text-xs">to</span>
                            <input 
                              type="range" 
                              min="0" 
                              max="10" 
                              value={scoreFilters.academics.max}
                              onChange={(e) => handleScoreFilterChange('academics', 'max', parseInt(e.target.value))}
                              className="w-1/2"
                            />
                            <span className="text-xs">{scoreFilters.academics.max}</span>
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
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && (
          <div className="mb-4 overflow-y-auto border rounded-lg">
              {filteredAddresses.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchQuery.length < 2 && Object.values(scoreFilters).every(f => !f.enabled) && !selectedCountyStates.length && !selectedCoaches.length
                    ? "Start typing to search for schools or use filters" 
                    : "No schools found matching your criteria."}
                </div>
              ) : (
                filteredAddresses.map((item, index) => (
              <div
                key={index}
                className="flex items-start p-3 bg-gray-50 hover:bg-white border-b last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedAddresses.includes(item.address)}
                  onChange={() => handleCheckboxChange(item.address, item)}
                  className="mr-3 h-4 w-4 mt-1"
                />
                <div className="flex-grow">
                  <div className="flex justify-between">
                    <div className="flex items-center">
                      <div className="font-semibold text-lg mr-2">{item.school}</div>
                      {item.private_public && (
                        <div className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                          {item.private_public}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-700 text-lg">
                      {item.county && <span>{item.county} | </span>}
                      {item.state}
                    </div>
                  </div>
                  <div className="text-gray-600 mb-1 text-left">{item.address}</div>
                  {(item.head_coach_first || item.head_coach_last) && hasFootballPackage && (
                    <div className="text-gray-700 text-left">
                      <span className="font-medium">Coach:</span> {item.head_coach_first} {item.head_coach_last}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.league_classification && (
                      <div className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {item.league_classification}
                      </div>
                    )}
                  </div>
                  {(item.score_college_player !== undefined || 
                    item.score_d1_producing !== undefined || 
                    item.score_team_quality !== undefined || 
                    item.score_income !== undefined ||
                    item.score_academics !== undefined) && (
                    <div className="mt-2 grid grid-cols-5 gap-1 border-t pt-2">
                      {item.score_college_player !== undefined && (
                        <div className="text-center" style={{ backgroundColor: getScoreColor(item.score_college_player) }}>
                          <div className="text-xs text-gray-700 font-medium">College</div>
                          <div className="font-bold text-black">{item.score_college_player}</div>
                        </div>
                      )}
                      {item.score_d1_producing !== undefined && (
                        <div className="text-center" style={{ backgroundColor: getScoreColor(item.score_d1_producing) }}>
                          <div className="text-xs text-gray-700 font-medium">D1</div>
                          <div className="font-bold text-black">{item.score_d1_producing}</div>
                        </div>
                      )}
                      {item.score_team_quality !== undefined && (
                        <div className="text-center" style={{ backgroundColor: getScoreColor(item.score_team_quality) }}>
                          <div className="text-xs text-gray-700 font-medium">Team</div>
                          <div className="font-bold text-black">{item.score_team_quality}</div>
                        </div>
                      )}
                      {item.score_income !== undefined && (
                        <div className="text-center" style={{ backgroundColor: getScoreColor(item.score_income) }}>
                          <div className="text-xs text-gray-700 font-medium">Income</div>
                          <div className="font-bold text-black">{item.score_income}</div>
                        </div>
                      )}
                      {item.score_academics !== undefined && (
                        <div className="text-center" style={{ backgroundColor: getScoreColor(item.score_academics) }}>
                          <div className="text-xs text-gray-700 font-medium">Acad</div>
                          <div className="font-bold text-black">{item.score_academics}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          </div>
          )}
        </div>

        {/* Bottom selection area - fixed to bottom of the relative container */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-md px-4 pt-3 pb-3 z-20">
          <div className="flex flex-row justify-between items-center max-w-full">
            <div className="flex-1 flex items-center overflow-hidden">
              <div className="flex-1 flex flex-wrap gap-2 min-h-[36px] overflow-x-auto pr-2 pb-2">
                {selectedAddresses.length === 0 ? (
                  <span className="text-gray-400 italic">No schools selected</span>
                ) : (
                  Array.from(selectedSchoolsData.values()).map((school, index) => (
                    <div 
                      key={index} 
                      className="flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full mb-1"
                    >
                      <span className="truncate max-w-[180px]">{school.school}</span>
                      <button 
                        onClick={() => handleCheckboxChange(school.address, school)}
                        className="ml-2 text-blue-500 hover:text-blue-700"
                        title="Remove from selection"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
                {selectedAddresses.length > 0 && (
                  <button 
                    onClick={clearAllSelections}
                    className="px-3 py-1 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium whitespace-nowrap mb-1"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            <div className="ml-4 flex-shrink-0">
              <button
                onClick={handleSubmit}
                disabled={selectedAddresses.length === 0}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed font-medium text-base whitespace-nowrap"
              >
                Map It {selectedAddresses.length > 0 && `(${selectedAddresses.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
} 