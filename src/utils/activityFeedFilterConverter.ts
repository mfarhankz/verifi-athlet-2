import type { ActivityFeedFilterState } from "@/app/(dashboard)/activity-feed/types";

/**
 * Converts ActivityFeedFilterState to a filter string format compatible with alert filters
 * @param filterState The activity feed filter state to convert
 * @returns A filter string in the format "key: value | key2: value2"
 */
export function convertActivityFeedFilterToFilterString(
  filterState: ActivityFeedFilterState
): string {
  const filterParts: string[] = [];

  // Event Type
  if (filterState.eventParameters?.eventType && filterState.eventParameters.eventType.length > 0) {
    filterParts.push(`event_type: ${filterState.eventParameters.eventType.join(", ")}`);
  }

  // Note: We skip eventDate as it's time-sensitive and becomes outdated

  // Graduation Year
  if (filterState.athleteInfo?.graduationYear && filterState.athleteInfo.graduationYear.length > 0) {
    filterParts.push(`grad_year: ${filterState.athleteInfo.graduationYear.join(", ")}`);
  }

  // Position
  if (filterState.athleteInfo?.position && filterState.athleteInfo.position.length > 0) {
    filterParts.push(`primary_position: ${filterState.athleteInfo.position.join(", ")}`);
  }

  // Height
  if (filterState.athleteInfo?.height) {
    const { comparison, value, minValue, maxValue } = filterState.athleteInfo.height;
    if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
      filterParts.push(`height_total_inches Min: ${minValue}, Max: ${maxValue}`);
    } else if (comparison === 'min' && value !== undefined) {
      filterParts.push(`height_total_inches Min: ${value}`);
    } else if (comparison === 'max' && value !== undefined) {
      filterParts.push(`height_total_inches Max: ${value}`);
    }
  }

  // Weight
  if (filterState.athleteInfo?.weight) {
    const { comparison, value, minValue, maxValue } = filterState.athleteInfo.weight;
    if (comparison === 'between' && minValue !== undefined && maxValue !== undefined) {
      filterParts.push(`weight Min: ${minValue}, Max: ${maxValue}`);
    } else if (comparison === 'min' && value !== undefined) {
      filterParts.push(`weight Min: ${value}`);
    } else if (comparison === 'max' && value !== undefined) {
      filterParts.push(`weight Max: ${value}`);
    }
  }

  // Athletic Projection
  if (filterState.athleteInfo?.athleticProjection && filterState.athleteInfo.athleticProjection.length > 0) {
    filterParts.push(`athletic_projection: ${filterState.athleteInfo.athleticProjection.join(", ")}`);
  }

  // Athlete Location
  if (filterState.athleteInfo?.athleteLocation) {
    const { type, values } = filterState.athleteInfo.athleteLocation;
    if (values && values.length > 0) {
      if (type === 'hometown_state') {
        filterParts.push(`address_state: ${values.join(", ")}`);
      } else if (type === 'international') {
        filterParts.push(`international: true`);
      } else if (type === 'school_state') {
        filterParts.push(`school_state: ${values.join(", ")}`);
      } else if (type === 'county') {
        filterParts.push(`county: ${values.join(", ")}`);
      } else if (type === 'radius' && filterState.athleteInfo.athleteLocation.radius) {
        const { center, distance } = filterState.athleteInfo.athleteLocation.radius;
        filterParts.push(`radius: ${center} ${distance}mi`);
      } else if (type === 'recruiting_area' && filterState.athleteInfo.athleteLocation.recruitingArea) {
        const { stateIds, countyIds, schoolIds } = filterState.athleteInfo.athleteLocation.recruitingArea;
        if (stateIds && stateIds.length > 0) {
          filterParts.push(`recruiting_area_states: ${stateIds.join(", ")}`);
        }
        if (countyIds && countyIds.length > 0) {
          filterParts.push(`recruiting_area_counties: ${countyIds.join(", ")}`);
        }
        if (schoolIds && schoolIds.length > 0) {
          filterParts.push(`recruiting_area_schools: ${schoolIds.join(", ")}`);
        }
      }
    }
  }

  // School Location (for recruiting college)
  if (filterState.schoolInfo?.location && filterState.schoolInfo.location.length > 0) {
    // This is a complex location object, we'll handle it similar to athlete location
    // For now, we'll just add it as a generic location filter
    filterParts.push(`school_location: ${filterState.schoolInfo.location.join(", ")}`);
  }

  // Conference
  if (filterState.schoolInfo?.conference && filterState.schoolInfo.conference.length > 0) {
    filterParts.push(`conference: ${filterState.schoolInfo.conference.join(", ")}`);
  }

  // Level (Division)
  if (filterState.schoolInfo?.level && filterState.schoolInfo.level.length > 0) {
    filterParts.push(`division: ${filterState.schoolInfo.level.join(", ")}`);
  }

  // School (College)
  if (filterState.schoolInfo?.school && filterState.schoolInfo.school.length > 0) {
    filterParts.push(`college: ${filterState.schoolInfo.school.join(", ")}`);
  }

  // Join all parts with " | "
  return filterParts.join(" | ");
}

