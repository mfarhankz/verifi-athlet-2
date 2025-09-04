import { supabase } from '@/lib/supabaseClient';
import { 
  DepthChartAssignment, 
  EffectiveDepthChartAssignment, 
  DepthChartAssignmentWithAthlete 
} from '@/types/depthChart';
import { AthleteData } from '@/types/database';

/**
 * Get effective depth chart assignments with inheritance logic
 * Data inheritance rules:
 * 1. Each year is isolated (no carry-over between years)
 * 2. January data carries forward to other months unless overridden
 * 3. Base scenario (empty string) data carries forward to other scenarios unless overridden
 */
export async function getEffectiveDepthChartAssignments(
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1,
  subPositionId?: string
): Promise<EffectiveDepthChartAssignment[]> {
  try {
    const { data, error } = await supabase
      .rpc('get_effective_depth_chart_assignments', {
        p_customer_id: customerId,
        p_year: year,
        p_scenario: scenario,
        p_month: month
      });

    if (error) {
      console.error('❌ [getEffectiveDepthChartAssignments] Database error:', error);
      throw error;
    }

    let assignments = data || [];
    
    // Filter by sub-position if specified
    if (subPositionId) {
      assignments = assignments.filter((a: any) => a.sub_position_id === subPositionId);
    }

    return assignments;
  } catch (error) {
    console.error('❌ [getEffectiveDepthChartAssignments] Error:', error);
    throw error;
  }
}

/**
 * Get depth chart assignments with athlete details
 */
export async function getDepthChartAssignmentsWithAthletes(
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1,
  subPositionId?: string
): Promise<DepthChartAssignmentWithAthlete[]> {
  try {
    const effectiveAssignments = await getEffectiveDepthChartAssignments(
      customerId, year, scenario, month, subPositionId
    );

    if (effectiveAssignments.length === 0) {
      return [];
    }

    const athleteIds = effectiveAssignments.map(a => a.athlete_id);

    const { data: athletes, error: athletesError } = await supabase
      .from('athletes')
      .select('id, name__first, name__last, image_url, position')
      .eq('customer_id', customerId)
      .in('id', athleteIds);

    if (athletesError) {
      throw athletesError;
    }

    // Create lookup map for athletes
    const athleteMap = new Map(athletes?.map((a: any) => [a.id, a]) || []);

    const assignmentsWithAthletes: DepthChartAssignmentWithAthlete[] = effectiveAssignments
      .map(assignment => {
        const athlete: any = athleteMap.get(assignment.athlete_id);
        
        if (!athlete) {
          return null;
        }

        return {
          ...assignment,
          athlete: {
            id: athlete.id || '',
            first_name: athlete.name__first || '',
            last_name: athlete.name__last || '',
            image_url: athlete.image_url,
            primary_position: athlete.position,
            secondary_position: ''
          }
        };
      })
      .filter(Boolean) as DepthChartAssignmentWithAthlete[];

    assignmentsWithAthletes.sort((a, b) => a.ranking - b.ranking);
    return assignmentsWithAthletes;
  } catch (error) {
    console.error('❌ [getDepthChartAssignmentsWithAthletes] Error:', error);
    throw error;
  }
}

/**
 * Assign an athlete to a depth chart position
 */
export async function assignAthleteToDepthChart(
  athleteId: string,
  subPositionId: string,
  customerId: string,
  year: number,
  ranking: number = 1,
  scenario: string = '',
  month: number = 1
): Promise<DepthChartAssignment> {
  
  try {
    // Check if assignment already exists
    const { data: existingAssignment } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month)
      .single();

    if (existingAssignment) {
      // Update existing assignment
      const { data, error } = await supabase
        .from('depth_chart_assignments')
        .update({ ranking })
        .eq('id', existingAssignment.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new assignment
      const { data, error } = await supabase
        .from('depth_chart_assignments')
        .insert({
          athlete_id: athleteId,
          sub_position_id: subPositionId,
          customer_id: customerId,
          year,
          ranking,
          scenario,
          month
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error assigning athlete to depth chart:', error);
    throw error;
  }
}

/**
 * Remove an athlete from a depth chart position
 */
export async function removeAthleteFromDepthChart(
  athleteId: string,
  subPositionId: string,
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1
): Promise<void> {
  try {
    const { error } = await supabase
      .from('depth_chart_assignments')
      .delete()
      .eq('athlete_id', athleteId)
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing athlete from depth chart:', error);
    throw error;
  }
}

/**
 * Update the ranking of an athlete in a depth chart position
 */
export async function updateAthleteRanking(
  assignmentId: string,
  newRanking: number
): Promise<DepthChartAssignment> {
  try {
    const { data, error } = await supabase
      .from('depth_chart_assignments')
      .update({ ranking: newRanking })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating athlete ranking:', error);
    throw error;
  }
}

/**
 * Move an athlete up or down in the ranking
 */
export async function moveAthleteRanking(
  assignmentId: string,
  direction: 'up' | 'down'
): Promise<void> {
  try {
    // Get the current assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError) throw assignmentError;

    const currentRanking = assignment.ranking;
    const newRanking = direction === 'up' ? currentRanking - 1 : currentRanking + 1;

    if (newRanking < 1) return; // Can't move above rank 1

    // Check if the new ranking position is occupied
    const { data: conflictingAssignment } = await supabase
      .from('depth_chart_assignments')
      .select('id, ranking')
      .eq('sub_position_id', assignment.sub_position_id)
      .eq('customer_id', assignment.customer_id)
      .eq('year', assignment.year)
      .eq('scenario', assignment.scenario)
      .eq('month', assignment.month)
      .eq('ranking', newRanking)
      .single();

    if (conflictingAssignment) {
      // Swap rankings
      await supabase
        .from('depth_chart_assignments')
        .update({ ranking: currentRanking })
        .eq('id', conflictingAssignment.id);
    }

    // Update the main assignment
    await updateAthleteRanking(assignmentId, newRanking);
  } catch (error) {
    console.error('Error moving athlete ranking:', error);
    throw error;
  }
}

/**
 * Get athletes available for assignment (all athletes for the customer's year)
 */
export async function getAvailableAthletes(
  customerId: string,
  year: number,
  searchTerm?: string,
  positionFilter?: string
): Promise<AthleteData[]> {
  try {
    let query = supabase
      .from('athletes')
      .select('id, name__first, name__last, image_url, position')
      .eq('customer_id', customerId);

    // Add search filter
    if (searchTerm) {
      query = query.or(`name__first.ilike.%${searchTerm}%,name__last.ilike.%${searchTerm}%`);
    }

    // Add position filter
    if (positionFilter) {
      query = query.or(`position.ilike.%${positionFilter}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data?.map((athlete: any) => ({
      id: athlete.id,
      first_name: athlete.name__first,
      last_name: athlete.name__last,
      image_url: athlete.image_url,
      position: athlete.position
    } as AthleteData)) || [];
  } catch (error) {
    console.error('Error fetching available athletes:', error);
    throw error;
  }
}

/**
 * Check if an athlete is already assigned to any position in the depth chart
 */
export async function isAthleteAssigned(
  athleteId: string,
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1
): Promise<{ isAssigned: boolean; assignment?: DepthChartAssignmentWithAthlete }> {
  try {
    const assignments = await getDepthChartAssignmentsWithAthletes(
      customerId, year, scenario, month
    );

    const assignment = assignments.find(a => a.athlete_id === athleteId);
    
    return {
      isAssigned: !!assignment,
      assignment
    };
  } catch (error) {
    console.error('Error checking athlete assignment:', error);
    return { isAssigned: false };
  }
}

/**
 * Get depth chart summary for a formation
 */
export async function getDepthChartSummary(
  formationId: string,
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1
): Promise<{
  subPositions: Array<{
    id: string;
    name: string;
    x_coord: number;
    y_coord: number;
    assignments: DepthChartAssignmentWithAthlete[];
  }>;
}> {
  try {
    // Get sub-positions for the formation
    const { data: subPositions, error: subPositionsError } = await supabase
      .from('depth_chart_sub_position')
      .select('id, name, x_coord, y_coord')
      .eq('depth_chart_formation_id', formationId)
      .is('ended_at', null);

    if (subPositionsError) {
      throw subPositionsError;
    }

    // Get assignments for all sub-positions (even if empty)
    const subPositionsWithAssignments = await Promise.all(
      (subPositions || []).map(async (subPosition: any) => {
        const assignments = await getDepthChartAssignmentsWithAthletes(
          customerId, year, scenario, month, subPosition.id
        );

        return {
          ...subPosition,
          assignments: assignments || [] // Ensure we always have an array
        };
      })
    );

    return {
      subPositions: subPositionsWithAssignments
    };
  } catch (error) {
    console.error('❌ [getDepthChartSummary] Error:', error);
    throw error;
  }
}


