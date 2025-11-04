import { supabase } from '@/lib/supabaseClient';

export interface PrintRequestData {
  school_ids: string[];
  coach_name: string;
  coach_email: string;
  requesting_college: string;
  min_print_level?: string | null;
  min_grad_year?: string | null;
  cover_page?: string | null;
}

export interface UserDetails {
  customer_id: string;
  name_first?: string;
  name_last?: string;
}

/**
 * Gets the requesting college name for a given user
 * @param userDetails - User details object containing customer_id
 * @returns Promise<string> - The college name
 */
export async function getRequestingCollege(userDetails: UserDetails): Promise<string> {
  // Special case for Penn State team IDs
  const pennStateTeamIds = [
    '1ca60546-8f5b-4188-9639-2a914af86bc9',
    '658fd68a-bbf6-4e9d-a844-f69e93a1c07e',
    '852fa0c1-2134-488d-b72c-747ae75dadb5',
    'ad6cd81d-a795-468a-b7ef-ba693876ef9d',
    'f42ca035-d7b8-4ad2-b4bb-b6d49c906901'
  ];
  
  if (userDetails.customer_id && pennStateTeamIds.includes(userDetails.customer_id)) {
    return "Penn State University";
  }

  try {
    // Query the customers table
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
      console.error("Error fetching customer data:", customerError);
      throw new Error("Error retrieving your college information. Please try again.");
    }
    
    if (customerData && customerData.length > 0) {
      const school = customerData[0].school as unknown as { id: string; name: string } | null;
      return school?.name || "Unknown College";
    }
    
    return "Unknown College";
  } catch (error) {
    console.error("Exception during customer data fetch:", error);
    throw new Error("Error retrieving your college information. Please try again.");
  }
}

/**
 * Gets the coach name from user details
 * @param userDetails - User details object
 * @returns string - Formatted coach name
 */
export function getCoachName(userDetails: UserDetails): string {
  return `${userDetails.name_first || ''} ${userDetails.name_last || ''}`.trim() || "Unknown Coach";
}

/**
 * Converts a school ID using the conversion table
 * @param schoolId - The school ID to convert
 * @returns Promise<string> - The converted high_school_id
 */
export async function convertSchoolId(schoolId: string): Promise<string> {
  const { data: conversionData, error: conversionError } = await supabase
    .from('zz_hs_id_knack_supabase_convert')
    .select('high_school_id')
    .eq('school_id', schoolId)
    .single();

  if (conversionError || !conversionData) {
    console.error("Error converting school ID:", conversionError);
    throw new Error("Error converting school ID. Please try again.");
  }

  return conversionData.high_school_id;
}

/**
 * Prepares print request data with common fields
 * @param schoolIds - Array of school IDs to print
 * @param userDetails - User details object
 * @param coachEmail - Coach's email address
 * @param options - Optional parameters for the request
 * @returns Promise<PrintRequestData> - Complete request data
 */
export async function preparePrintRequestData(
  schoolIds: string[],
  userDetails: UserDetails,
  coachEmail: string,
  options: {
    min_print_level?: string | null;
    min_grad_year?: string | null;
    cover_page?: string | null;
  } = {}
): Promise<PrintRequestData> {
  const requestingCollege = await getRequestingCollege(userDetails);
  const coachName = getCoachName(userDetails);

  return {
    school_ids: schoolIds,
    coach_name: coachName,
    coach_email: coachEmail,
    requesting_college: requestingCollege,
    min_print_level: options.min_print_level || null,
    min_grad_year: options.min_grad_year || null,
    cover_page: options.cover_page || null
  };
}

/**
 * Sends a print request to the cloud function
 * @param requestData - The prepared request data
 * @returns Promise<any> - The response from the cloud function
 */
export async function sendPrintRequest(requestData: PrintRequestData): Promise<any> {
  const response = await fetch("https://us-south1-verified-312021.cloudfunctions.net/hs_athlete_pdf_printout", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestData),
  });

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.status}`);
  }

  return response.json();
}
