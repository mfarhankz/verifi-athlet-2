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
    // Get current assignments at this position
    const { data: currentAssignments, error: currentError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month)
      .order('ranking', { ascending: true });

    if (currentError) {
      console.error('Error fetching current assignments:', currentError);
    }

    // Check if assignment already exists
    const { data: existingAssignment, error: checkError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [ASSIGN ATHLETE] Error checking existing assignment:', checkError);
      throw checkError;
    }

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
    console.error('❌ [ASSIGN ATHLETE] Error assigning athlete to depth chart:', error);
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
    console.error('❌ [REMOVE ATHLETE] Error removing athlete from depth chart:', error);
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
    console.log(`🔄 [MOVE RANKING] Starting ${direction} move for assignment ID: ${assignmentId}`);
    
    // Get the current assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('id', assignmentId)
      .single();

    if (assignmentError) throw assignmentError;

    console.log(`📍 [MOVE RANKING] Current assignment:`, {
      assignmentId: assignment.id,
      athleteId: assignment.athlete_id,
      subPositionId: assignment.sub_position_id,
      currentRanking: assignment.ranking,
      year: assignment.year,
      scenario: assignment.scenario,
      month: assignment.month
    });

    // Get all assignments for this position
    const { data: allAssignments, error: allAssignmentsError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('sub_position_id', assignment.sub_position_id)
      .eq('customer_id', assignment.customer_id)
      .eq('year', assignment.year)
      .eq('scenario', assignment.scenario)
      .eq('month', assignment.month)
      .order('ranking', { ascending: true });

    if (allAssignmentsError) throw allAssignmentsError;

    console.log(`📖 [MOVE RANKING] Read from database:`, 
      allAssignments?.map((a: any) => ({
        assignmentId: a.id,
        athleteId: a.athlete_id,
        ranking: a.ranking,
        subPositionId: a.sub_position_id
      })) || []
    );

    if (!allAssignments || allAssignments.length === 0) {
      console.log(`⚠️ [MOVE RANKING] No assignments found for position ${assignment.sub_position_id}`);
      return;
    }

    console.log(`👥 [MOVE RANKING] All players at position BEFORE move:`, 
      allAssignments.map((a: any, index: number) => ({
        ranking: a.ranking,
        athleteId: a.athlete_id,
        assignmentId: a.id,
        position: index + 1
      }))
    );

    // Find the current athlete's index in the sorted list
    const currentIndex = allAssignments.findIndex((a: any) => a.id === assignmentId);
    if (currentIndex === -1) {
      console.log(`❌ [MOVE RANKING] Assignment not found in position list`);
      return;
    }

    // Calculate new index
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Check bounds
    if (newIndex < 0 || newIndex >= allAssignments.length) {
      console.log(`⚠️ [MOVE RANKING] Cannot move ${direction} - at boundary (current: ${currentIndex}, new: ${newIndex})`);
      return;
    }

    console.log(`🎯 [MOVE RANKING] Moving from position ${currentIndex + 1} to position ${newIndex + 1}`);

    // Create new array with swapped positions
    const newAssignments = [...allAssignments];
    [newAssignments[currentIndex], newAssignments[newIndex]] = [newAssignments[newIndex], newAssignments[currentIndex]];

    console.log(`👥 [MOVE RANKING] All players at position AFTER move:`, 
      newAssignments.map((a: any, index: number) => ({
        newRanking: index + 1,
        athleteId: a.athlete_id,
        assignmentId: a.id,
        oldRanking: a.ranking
      }))
    );

    // Update all rankings sequentially (1, 2, 3, 4, 5...)
    const updatePromises = newAssignments.map((assignment: any, index: number) => {
      const newRanking = index + 1;
      console.log(`💾 [MOVE RANKING] Writing to database:`, {
        assignmentId: assignment.id,
        athleteId: assignment.athlete_id,
        oldRanking: assignment.ranking,
        newRanking: newRanking,
        position: index + 1
      });
      
      return supabase
        .from('depth_chart_assignments')
        .update({ ranking: newRanking })
        .eq('id', assignment.id);
    });

    await Promise.all(updatePromises);
    
    console.log(`✅ [MOVE RANKING] Successfully updated all rankings for position ${assignment.sub_position_id}`);
      
  } catch (error) {
    console.error('❌ [MOVE RANKING] Error moving athlete ranking:', error);
    throw error;
  }
}


/**
 * Recalculate rankings for a specific sub-position to ensure they are sequential (1, 2, 3, 4, 5...)
 */
export async function recalculateRankingsForPosition(
  subPositionId: string,
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1
): Promise<void> {
  try {
    // Get all assignments for this position
    const { data: assignments, error } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month)
      .order('ranking', { ascending: true });

    if (error) throw error;

    if (!assignments || assignments.length === 0) {
      return;
    }

    // Update all rankings sequentially starting from 1
    const updatePromises = assignments.map((assignment: any, index: number) => {
      const newRanking = index + 1;
      return supabase
        .from('depth_chart_assignments')
        .update({ ranking: newRanking })
        .eq('id', assignment.id);
    });

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('❌ [RECALCULATE RANKINGS] Error recalculating rankings for position:', error);
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
 * Create a tie by assigning the same ranking to two athletes
 */
export async function createTie(
  draggedAthleteId: string,
  targetAthleteId: string,
  subPositionId: string,
  customerId: string,
  year: number,
  scenario: string = '',
  month: number = 1
): Promise<void> {
  try {
    // Get the target athlete's current ranking
    const { data: targetAssignment, error: targetError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('athlete_id', targetAthleteId)
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month)
      .single();

    if (targetError) throw targetError;

    // Get the dragged athlete's current assignment
    const { data: draggedAssignment, error: draggedError } = await supabase
      .from('depth_chart_assignments')
      .select('*')
      .eq('athlete_id', draggedAthleteId)
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month)
      .single();

    if (draggedError) throw draggedError;

    // Update the dragged athlete to have the same ranking as the target
    const { error: updateError } = await supabase
      .from('depth_chart_assignments')
      .update({ ranking: targetAssignment.ranking })
      .eq('athlete_id', draggedAthleteId)
      .eq('sub_position_id', subPositionId)
      .eq('customer_id', customerId)
      .eq('year', year)
      .eq('scenario', scenario)
      .eq('month', month);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('❌ [CREATE TIE] Error creating tie:', error);
    throw error;
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

/**
 * Intelligent positioning utilities for depth chart sub-positions
 */

interface SubPosition {
  id: string;
  x_coord: number;
  y_coord: number;
  name: string;
}

interface IntelligentPositionResult {
  x: number;
  y: number;
  snapped: boolean;
  aligned: boolean;
  snapType?: 'horizontal' | 'vertical' | 'both';
}

/**
 * Calculate intelligent position with snapping and alignment
 */
export function calculateIntelligentPosition(
  draggedPosition: { x: number; y: number },
  existingPositions: SubPosition[],
  draggedPositionId: string,
  snapThreshold: number = 25, // Increased threshold for better snapping detection
  gapSize: number = 5
): IntelligentPositionResult {
  // Filter out the dragged position from existing positions
  const otherPositions = existingPositions.filter(pos => pos.id !== draggedPositionId);
  
  if (otherPositions.length === 0) {
    return {
      x: draggedPosition.x,
      y: draggedPosition.y,
      snapped: false,
      aligned: false
    };
  }

  let finalX = draggedPosition.x;
  let finalY = draggedPosition.y;
  let snapped = false;
  let aligned = false;
  let snapType: 'horizontal' | 'vertical' | 'both' | undefined;

  console.log('🔍 SNAPPING ANALYSIS - Starting analysis:', {
    draggedPosition,
    otherPositions: otherPositions.map(pos => ({
      id: pos.id,
      name: pos.name,
      x: pos.x_coord,
      y: pos.y_coord
    })),
    snapThreshold
  });

  // Find the closest position for potential snapping/alignment
  let closestPosition: SubPosition | null = null;
  let closestDistance = Infinity;

  for (const pos of otherPositions) {
    // Convert center coordinates to top-left coordinates
    // Cards are positioned with transform: translate(-50%, -50%) so center is at x_coord, y_coord
    const posTopLeftX = pos.x_coord - 120; // Half of card width (240px / 2)
    const posTopLeftY = pos.y_coord - 50;  // Half of minimum card height (100px / 2)
    const draggedTopLeftX = draggedPosition.x - 120; // Convert dragged position to top-left
    const draggedTopLeftY = draggedPosition.y - 50;
    
    // Calculate deltas using top-left coordinates
    const deltaX = Math.abs(draggedTopLeftX - posTopLeftX);
    const deltaY = Math.abs(draggedTopLeftY - posTopLeftY);
    
    // For snapping, we want to check if cards are close enough to snap
    // If deltaX is less than card width, cards are horizontally close
    // If deltaY is less than card height, cards are vertically close
    const cardWidth = 240;
    const cardHeight = 100;
    
    // Use raw deltas for distance calculation (top-left to top-left distance)
    const distance = Math.sqrt(
      Math.pow(deltaX, 2) + 
      Math.pow(deltaY, 2)
    );
    
    console.log(`🔍 SNAPPING ANALYSIS - Distance to ${pos.name}:`, {
      position: { 
        center: { x: pos.x_coord, y: pos.y_coord },
        topLeft: { x: posTopLeftX, y: posTopLeftY }
      },
      draggedPosition: {
        center: draggedPosition,
        topLeft: { x: draggedTopLeftX, y: draggedTopLeftY }
      },
      distance,
      deltaX,
      deltaY,
      cardWidth,
      cardHeight
    });
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPosition = pos;
    }
  }

  console.log('🔍 SNAPPING ANALYSIS - Closest position:', {
    closestPosition: closestPosition ? {
      id: closestPosition.id,
      name: closestPosition.name,
      x: closestPosition.x_coord,
      y: closestPosition.y_coord
    } : null,
    closestDistance,
    withinThreshold: closestDistance <= snapThreshold
  });

  if (closestPosition && closestDistance <= snapThreshold) {
    // Convert to top-left coordinates for consistent calculations
    const posTopLeftX = closestPosition.x_coord - 120;
    const posTopLeftY = closestPosition.y_coord - 50;
    const draggedTopLeftX = draggedPosition.x - 120;
    const draggedTopLeftY = draggedPosition.y - 50;
    
    const deltaX = Math.abs(draggedTopLeftX - posTopLeftX);
    const deltaY = Math.abs(draggedTopLeftY - posTopLeftY);
    
    // Card dimensions
    const cardWidth = 240;
    const cardHeight = 100;
    
    // For snapping, we check if cards are close enough to snap
    // Cards are close horizontally if deltaX is within card width + gap
    // Cards are close vertically if deltaY is within card height + gap
    const horizontalSnapDistance = cardWidth + gapSize; // 240 + 5 = 245px
    const verticalSnapDistance = cardHeight + gapSize;   // 100 + 5 = 105px

    console.log('🔍 SNAPPING ANALYSIS - Checking alignment with card dimensions:', {
      deltaX,
      deltaY,
      cardWidth,
      cardHeight,
      horizontalSnapDistance,
      verticalSnapDistance,
      snapThreshold,
      horizontalCandidate: deltaY <= snapThreshold && deltaX <= horizontalSnapDistance,
      verticalCandidate: deltaX <= snapThreshold && deltaY <= verticalSnapDistance
    });

    // Check for horizontal alignment (similar Y coordinates and close enough X)
    if (deltaY <= snapThreshold && deltaX <= horizontalSnapDistance) {
      // Snap horizontally with gap using top-left coordinates
      if (draggedTopLeftX < posTopLeftX) {
        // Position to the left
        finalX = posTopLeftX - gapSize - 120; // Convert back to center coordinates
      } else {
        // Position to the right
        finalX = posTopLeftX + cardWidth + gapSize + 120; // Convert back to center coordinates
      }
      finalY = closestPosition.y_coord; // Align vertically (keep center Y)
      snapped = true;
      aligned = true;
      snapType = 'horizontal';
      
      console.log('✅ HORIZONTAL SNAP - Applied:', {
        originalPosition: draggedPosition,
        snappedPosition: { x: finalX, y: finalY },
        referencePosition: { x: closestPosition.x_coord, y: closestPosition.y_coord },
        cardWidth,
        gapSize
      });
    }
    // Check for vertical alignment (similar X coordinates and close enough Y)
    else if (deltaX <= snapThreshold && deltaY <= verticalSnapDistance) {
      // Snap vertically with gap using top-left coordinates
      if (draggedTopLeftY < posTopLeftY) {
        // Position above
        finalY = posTopLeftY - gapSize + 50; // Convert back to center coordinates
      } else {
        // Position below
        finalY = posTopLeftY + cardHeight + gapSize + 50; // Convert back to center coordinates
      }
      finalX = closestPosition.x_coord; // Align horizontally (keep center X)
      snapped = true;
      aligned = true;
      snapType = 'vertical';
      
      console.log('✅ VERTICAL SNAP - Applied:', {
        originalPosition: draggedPosition,
        snappedPosition: { x: finalX, y: finalY },
        referencePosition: { x: closestPosition.x_coord, y: closestPosition.y_coord },
        cardHeight,
        gapSize
      });
    }
    // Check for diagonal snapping (close to both X and Y considering card dimensions)
    else if (deltaX <= horizontalSnapDistance && deltaY <= verticalSnapDistance) {
      // Snap to a diagonal position with gap using top-left coordinates
      const angle = Math.atan2(
        draggedTopLeftY - posTopLeftY,
        draggedTopLeftX - posTopLeftX
      );
      
      const snapDistance = Math.max(cardWidth, cardHeight) + gapSize; // Use the larger dimension
      const snappedTopLeftX = posTopLeftX + Math.cos(angle) * snapDistance;
      const snappedTopLeftY = posTopLeftY + Math.sin(angle) * snapDistance;
      
      // Convert back to center coordinates
      finalX = snappedTopLeftX + 120;
      finalY = snappedTopLeftY + 50;
      snapped = true;
      aligned = true;
      snapType = 'both';
      
      console.log('✅ DIAGONAL SNAP - Applied:', {
        originalPosition: draggedPosition,
        snappedPosition: { x: finalX, y: finalY },
        referencePosition: { x: closestPosition.x_coord, y: closestPosition.y_coord },
        angle,
        snapDistance,
        cardWidth,
        cardHeight
      });
    }
  } else {
    console.log('❌ NO FULL SNAP - Checking for partial alignment...');
    
    // Fallback: Check for partial alignment (horizontal OR vertical only)
    // Use a larger threshold for partial alignment
    const partialAlignmentThreshold = 20; // Larger threshold for partial alignment
    
    for (const pos of otherPositions) {
      // Convert to top-left coordinates for consistent calculations
      const posTopLeftX = pos.x_coord - 120;
      const posTopLeftY = pos.y_coord - 50;
      const draggedTopLeftX = draggedPosition.x - 120;
      const draggedTopLeftY = draggedPosition.y - 50;
      
      const deltaX = Math.abs(draggedTopLeftX - posTopLeftX);
      const deltaY = Math.abs(draggedTopLeftY - posTopLeftY);
      
      // Card dimensions for partial alignment
      const cardWidth = 240;
      const cardHeight = 100;
      
      console.log(`🔍 PARTIAL ALIGNMENT CHECK - ${pos.name}:`, {
        deltaX,
        deltaY,
        partialAlignmentThreshold,
        horizontalCandidate: Math.abs(deltaY) <= partialAlignmentThreshold,
        verticalCandidate: Math.abs(deltaX) <= partialAlignmentThreshold
      });
      
      // Check for horizontal alignment only (similar Y coordinates)
      if (Math.abs(deltaY) <= partialAlignmentThreshold && Math.abs(deltaX) > 10) {
        // For partial horizontal snap: keep X position, align Y position
        finalX = draggedPosition.x; // Keep the original X position
        finalY = pos.y_coord; // Align vertically with reference card
        snapped = true;
        aligned = true;
        snapType = 'horizontal';
        
        console.log('✅ PARTIAL HORIZONTAL SNAP - Applied:', {
          originalPosition: draggedPosition,
          snappedPosition: { x: finalX, y: finalY },
          referencePosition: { x: pos.x_coord, y: pos.y_coord },
          deltaX,
          deltaY,
          note: 'Kept X position, aligned Y position'
        });
        break; // Found a match, stop looking
      }
      // Check for vertical alignment only (similar X coordinates)
      else if (Math.abs(deltaX) <= partialAlignmentThreshold && Math.abs(deltaY) > 10) {
        // For partial vertical snap: keep Y position, align X position
        finalX = pos.x_coord; // Align horizontally with reference card
        finalY = draggedPosition.y; // Keep the original Y position
        snapped = true;
        aligned = true;
        snapType = 'vertical';
        
        console.log('✅ PARTIAL VERTICAL SNAP - Applied:', {
          originalPosition: draggedPosition,
          snappedPosition: { x: finalX, y: finalY },
          referencePosition: { x: pos.x_coord, y: pos.y_coord },
          deltaX,
          deltaY,
          note: 'Kept Y position, aligned X position'
        });
        break; // Found a match, stop looking
      }
    }
    
    if (!snapped) {
      console.log('❌ NO PARTIAL SNAP - No suitable alignment found');
    }
  }

  // Ensure position is within bounds (0 to 2500 for X, 0 to 800 for Y)
  finalX = Math.min(2380, finalX); // Only limit maximum X
  finalY = Math.min(750, finalY);  // Only limit maximum Y

  const result = {
    x: Math.round(finalX),
    y: Math.round(finalY),
    snapped,
    aligned,
    snapType
  };

  console.log('🎯 FINAL RESULT:', result);
  return result;
}

/**
 * Check if a position would overlap with existing positions
 */
export function checkPositionOverlap(
  position: { x: number; y: number },
  existingPositions: SubPosition[],
  excludeId?: string
): boolean {
  const positionWidth = 240;
  const positionHeight = 100;
  const margin = 5; // Minimum gap between positions

  return existingPositions.some(pos => {
    if (excludeId && pos.id === excludeId) return false;
    
    const overlapX = Math.abs(position.x - pos.x_coord) < (positionWidth + margin);
    const overlapY = Math.abs(position.y - pos.y_coord) < (positionHeight + margin);
    
    return overlapX && overlapY;
  });
}

/**
 * Find the best non-overlapping position near the target
 */
export function findBestNonOverlappingPosition(
  targetPosition: { x: number; y: number },
  existingPositions: SubPosition[],
  excludeId?: string
): { x: number; y: number } {
  const positionWidth = 240;
  const positionHeight = 100;
  const gap = 5;
  
  // Try positions in a spiral pattern around the target
  const offsets = [
    { x: 0, y: 0 }, // Original position
    { x: positionWidth + gap, y: 0 }, // Right
    { x: -(positionWidth + gap), y: 0 }, // Left
    { x: 0, y: positionHeight + gap }, // Below
    { x: 0, y: -(positionHeight + gap) }, // Above
    { x: positionWidth + gap, y: positionHeight + gap }, // Bottom right
    { x: -(positionWidth + gap), y: positionHeight + gap }, // Bottom left
    { x: positionWidth + gap, y: -(positionHeight + gap) }, // Top right
    { x: -(positionWidth + gap), y: -(positionHeight + gap) }, // Top left
  ];

  for (const offset of offsets) {
    const testPosition = {
      x: targetPosition.x + offset.x,
      y: targetPosition.y + offset.y
    };

    // Check bounds
    if (testPosition.x < 120 || testPosition.x > 2380 || 
        testPosition.y < 50 || testPosition.y > 750) {
      continue;
    }

    // Check for overlap
    if (!checkPositionOverlap(testPosition, existingPositions, excludeId)) {
      return testPosition;
    }
  }

  // If no good position found, return the original (will be handled by bounds checking)
  return targetPosition;
}


