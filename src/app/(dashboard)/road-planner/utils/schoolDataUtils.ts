import { supabase } from "@/lib/supabaseClient";
import { fetchSchoolFacts, fetchCoachInfo } from "@/lib/queries";
import { School } from "../types";

// Helper function to convert high_school_id to school_id
export async function convertHighSchoolIdToSchoolId(highSchoolId: string): Promise<string | null> {
  try {
    const { data: conversionData, error: conversionError } = await supabase
      .from('zz_hs_id_knack_supabase_convert')
      .select('school_id')
      .eq('high_school_id', highSchoolId)
      .single();

    if (conversionError || !conversionData) {
      console.error("Error converting high_school_id to school_id:", conversionError);
      return null;
    }

    return conversionData.school_id;
  } catch (error) {
    console.error("Error in convertHighSchoolIdToSchoolId:", error);
    return null;
  }
}

// Unified function to fetch school data from school_id
export async function fetchSchoolDataFromSchoolId(schoolId: string): Promise<School | null> {
  try {
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
    
    // Extract coach phone numbers from coach facts
    const coachHomePhone = coachInfo?.facts?.find((fact: any) => fact.data_type_id === 968)?.value;
    const coachCellPhone = coachInfo?.facts?.find((fact: any) => fact.data_type_id === 27)?.value;
    const coachOfficePhone = coachInfo?.facts?.find((fact: any) => fact.data_type_id === 967)?.value;

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

    // Get high_school_id from zz_hs_id_knack_supabase_convert table
    let highSchoolId = '';
    try {
      const { data: convertData, error: convertError } = await supabase
        .from('zz_hs_id_knack_supabase_convert')
        .select('high_school_id')
        .eq('school_id', schoolId)
        .single();
      
      if (!convertError && convertData) {
        highSchoolId = convertData.high_school_id;
      }
    } catch (error) {
      console.error("Error fetching high_school_id:", error);
    }

    // Build School object
    const school: School = {
      school: schoolData.name,
      address: address,
      county: countyName,
      state: stateAbbrev || addressStateRaw,
      head_coach_first: coachInfo?.firstName,
      head_coach_last: coachInfo?.lastName,
      private_public: getFactValue(928), // private_public
      league_classification: getFactValue(119) || getFactValueByName('league_classification'), // division
      score_college_player: getFactValue(956) ? parseFloat(getFactValue(956)!) : undefined, // college_player_producing
      score_d1_producing: getFactValue(957) ? parseFloat(getFactValue(957)!) : undefined, // d1_player_producing
      score_team_quality: getFactValue(958) ? parseFloat(getFactValue(958)!) : undefined, // team_quality
      score_income: getFactValue(959) ? parseFloat(getFactValue(959)!) : undefined, // athlete_income
      score_academics: getFactValue(960) ? parseFloat(getFactValue(960)!) : undefined, // academics
      head_coach_email: coachInfo?.email || getFactValue(255), // hc_email from school_fact or coach_fact
      head_coach_cell: coachCellPhone || coachInfo?.phone || getFactValue(256), // cell phone from coach_fact (27) or fallback
      head_coach_work_phone: coachOfficePhone, // office phone from coach_fact (967)
      head_coach_home_phone: coachHomePhone, // home phone from coach_fact (968)
      coach_twitter_handle: coachInfo?.twitterHandle || getFactValue(13), // twitter handle
      visit_info: getFactValue(926), // visit_info
      best_phone: coachInfo?.best_phone,
      coach_best_contact: undefined, // Can be added if data_type_id is known
      school_phone: getFactValue(257) || getFactValueByName('school_phone'), // school_phone from school_fact
      ad_name_first: getFactValueByName('ad_name_first'), // AD first name from school_fact
      ad_name_last: getFactValueByName('ad_name_last'), // AD last name from school_fact
      ad_email: getFactValueByName('ad_email'), // AD email from school_fact
      record_2024: getFactValueByName('fb_2024_record') || getFactValue(2024), // 2024_record from school_fact
      record_2025: getFactValueByName('fb_2025_record'), // 2025_record from school_fact
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
      },
      high_school_id: highSchoolId,
      school_id: schoolId,
    };

    return school;
  } catch (error) {
    console.error("Error fetching school data from tables:", error);
    return null;
  }
}

// Helper function to fetch school data from high_school_id (converts first, then fetches)
export async function fetchSchoolDataFromHighSchoolId(highSchoolId: string): Promise<School | null> {
  try {
    // Convert high_school_id to school_id
    const schoolId = await convertHighSchoolIdToSchoolId(highSchoolId);
    if (!schoolId) {
      console.error("Could not convert high_school_id to school_id");
      return null;
    }

    // Fetch using the unified function
    const school = await fetchSchoolDataFromSchoolId(schoolId);
    
    // Ensure high_school_id is set
    if (school) {
      school.high_school_id = highSchoolId;
    }
    
    return school;
  } catch (error) {
    console.error("Error fetching school data from high_school_id:", error);
    return null;
  }
}

