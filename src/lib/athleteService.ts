import { supabase } from './supabaseClient';

// Data type ID mappings for athlete_fact table
const DATA_TYPE_IDS = {
  // Basic info
  email: 571,
  cellPhone: 27,
  year: 1015,
  position: 2,
  highlightTape: 37,
  twitterHandle: 13,
  heightFeet: 4, // Height in feet
  heightInches: 5, // Height in inches (including fractions)
  weight: 6, // Weight
  gpa: 35,
  sat: 1024,
  act: 1025,
  parentName: 1021, // Parent name as single string
  parentEmail: 1022,
  parentPhone: 1023,
};

export interface AddAthleteData {
  firstName: string;
  lastName: string;
  email?: string;
  cellPhone?: string;
  year: string;
  position?: string;
  highlightTape?: string;
  twitterHandle?: string;
  feet?: number;
  inches?: number;
  eighths?: number;
  weight?: number;
  gpa?: number;
  sat?: number;
  act?: number;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

export interface AddAthleteResult {
  success: boolean;
  athleteId?: string;
  error?: string;
}

export async function addAthleteToDatabase(
  athleteData: AddAthleteData,
  schoolId: string
): Promise<AddAthleteResult> {
  try {
    // Step 1: Insert into athlete table
    const { data: athleteResult, error: athleteError } = await supabase
      .from('athlete')
      .insert({
        sport_id: 21, // Football sport ID
        first_name: athleteData.firstName,
        last_name: athleteData.lastName,
        knack_id: 'manual_college_coach'
      })
      .select('id')
      .single();

    if (athleteError) {
      console.error('Error inserting athlete:', athleteError);
      return { success: false, error: `Failed to create athlete: ${athleteError.message}` };
    }

    const athleteId = athleteResult.id;

    // Step 2: Insert into athlete_school table
    const { error: athleteSchoolError } = await supabase
      .from('athlete_school')
      .insert({
        athlete_id: athleteId,
        school_id: schoolId,
        start_date: new Date().toISOString()
      });

    if (athleteSchoolError) {
      console.error('Error inserting athlete_school:', athleteSchoolError);
      return { success: false, error: `Failed to link athlete to school: ${athleteSchoolError.message}` };
    }

    // Step 3: Insert into athlete_fact table for each field with data
    const athleteFacts: Array<{
      athlete_id: string;
      data_type_id: number;
      value: string;
      source: string;
    }> = [];

    // Helper function to add fact if value exists
    const addFact = (dataTypeId: number, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        athleteFacts.push({
          athlete_id: athleteId,
          data_type_id: dataTypeId,
          value: value.toString(),
          source: 'manual_college_coach'
        });
      }
    };

    // Add all the athlete facts
    addFact(DATA_TYPE_IDS.email, athleteData.email);
    addFact(DATA_TYPE_IDS.cellPhone, athleteData.cellPhone);
    addFact(DATA_TYPE_IDS.year, athleteData.year);
    addFact(DATA_TYPE_IDS.position, athleteData.position);
    addFact(DATA_TYPE_IDS.highlightTape, athleteData.highlightTape);
    addFact(DATA_TYPE_IDS.twitterHandle, athleteData.twitterHandle);
    
    // Handle height - store feet and inches separately
    if (athleteData.feet !== undefined) {
      addFact(DATA_TYPE_IDS.heightFeet, athleteData.feet);
    }
    
    if (athleteData.inches !== undefined || athleteData.eighths !== undefined) {
      const inches = athleteData.inches || 0;
      const eighths = athleteData.eighths || 0;
      const totalInches = inches + (eighths / 8);
      addFact(DATA_TYPE_IDS.heightInches, totalInches);
    }
    
    addFact(DATA_TYPE_IDS.weight, athleteData.weight);
    addFact(DATA_TYPE_IDS.gpa, athleteData.gpa);
    addFact(DATA_TYPE_IDS.sat, athleteData.sat);
    addFact(DATA_TYPE_IDS.act, athleteData.act);
    addFact(DATA_TYPE_IDS.parentName, athleteData.parentName);
    addFact(DATA_TYPE_IDS.parentEmail, athleteData.parentEmail);
    addFact(DATA_TYPE_IDS.parentPhone, athleteData.parentPhone);

    // Insert all athlete facts if any exist
    if (athleteFacts.length > 0) {
      const { error: factsError } = await supabase
        .from('athlete_fact')
        .insert(athleteFacts);

      if (factsError) {
        console.error('Error inserting athlete_fact:', factsError);
        return { success: false, error: `Failed to save athlete details: ${factsError.message}` };
      }
    }

    // Step 4: Trigger materialized view refresh for faster data availability
    await triggerMaterializedViewRefresh();

    return { success: true, athleteId };

  } catch (error) {
    console.error('Unexpected error adding athlete:', error);
    return { success: false, error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

/**
 * Trigger immediate refresh of the materialized view
 * This helps ensure the athlete appears in the materialized view sooner
 */
async function triggerMaterializedViewRefresh(): Promise<void> {
  try {
    // Call the refresh function that triggers the materialized view refresh
    const { error } = await supabase.rpc('trigger_refresh_now');
    
    if (error) {
      console.error('Error triggering materialized view refresh:', error);
      // Don't throw error - this is not critical for the main operation
    } else {
      console.log('Successfully triggered materialized view refresh');
    }
  } catch (error) {
    console.error('Error in triggerMaterializedViewRefresh:', error);
    // Don't throw error - this is not critical for the main operation
  }
}
