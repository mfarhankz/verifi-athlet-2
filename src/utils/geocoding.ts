// Geocoding and distance calculation utilities for radius search

export interface Location {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formatted_address: string;
  place_id: string;
}

// Haversine formula to calculate distance between two points in miles
export function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Google Geocoding API integration
export async function geocodeLocation(address: string): Promise<GeocodingResult | null> {
  try {
    // Check if we have Google Maps API key
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return null;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status, data.error_message);
      return null;
    }

    const result = data.results[0];
    return {
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id
    };
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

// Simple location suggestions using Geocoding API
export async function getLocationSuggestions(input: string): Promise<GeocodingResult[]> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return [];
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${apiKey}`;

    // Use Geocoding API for suggestions (simpler approach)
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      console.error('Geocoding API failed:', data.status, data.error_message);
      return [];
    }

    // Return up to 5 suggestions
    return data.results.slice(0, 5).map((result: any) => ({
      lat: result.geometry.location.lat,
      lng: result.geometry.location.lng,
      formatted_address: result.formatted_address,
      place_id: result.place_id
    }));
  } catch (error) {
    console.error('Error getting location suggestions:', error);
    return [];
  }
}

// Validate if coordinates are within radius
export function isWithinRadius(
  centerLat: number,
  centerLng: number,
  targetLat: number,
  targetLng: number,
  radiusMiles: number
): boolean {
  const distance = calculateDistance(centerLat, centerLng, targetLat, targetLng);
  return distance <= radiusMiles;
}

// Get bounding box coordinates for a radius search
export function getBoundingBox(
  centerLat: number,
  centerLng: number,
  radiusMiles: number
): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  // Earth's radius in miles
  const earthRadius = 3959;
  
  // Convert radius to degrees
  const latDelta = radiusMiles / earthRadius * (180 / Math.PI);
  const lngDelta = radiusMiles / (earthRadius * Math.cos(centerLat * Math.PI / 180)) * (180 / Math.PI);
  
  return {
    minLat: centerLat - latDelta,
    maxLat: centerLat + latDelta,
    minLng: centerLng - lngDelta,
    maxLng: centerLng + lngDelta
  };
}
