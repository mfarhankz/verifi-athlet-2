'use client';

import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, MarkerF, DirectionsRenderer, Libraries, InfoWindow, OverlayView, OverlayViewF } from '@react-google-maps/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { School } from '../types';
import { supabase } from '@/lib/supabaseClient';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useUser } from "@/contexts/CustomerContext";

// Helper function to determine score color
function getScoreColor(score: number | undefined | null): string {
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
}

interface RouteInfo {
  totalDistance: string;
  totalTime: string;
  legs: {
    duration: string;
    distance: string;
  }[];
}

function SortableItem({ location, index, routeInfo, totalLocations, onRemove }: { 
  location: School; 
  index: number;
  routeInfo?: RouteInfo;
  totalLocations: number;
  onRemove: (index: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      style={style}
      className="p-3 border rounded-lg bg-white hover:bg-gray-50 relative group"
    >
      <div className="flex items-start">
        <div
          ref={setNodeRef}
          className="flex-grow flex items-start cursor-move"
          {...attributes}
          {...listeners}
        >
          <span className="mr-3 font-semibold text-lg mt-1">{index + 1}.</span>
          <div className="flex-grow">
            {/* Top row - school, badges, and contact info in a 3-column layout */}
            <div className="grid grid-cols-3 gap-4 mb-2">
              {/* First column - School info */}
              <div>
                <div className="flex items-center flex-wrap mb-1">
                  <div className="font-semibold text-lg mr-2">{location.school}</div>
                  {location.record_2024 && (
                    <div className="text-gray-700 bg-blue-100 px-2 py-0.5 rounded text-xs mr-1">
                      {location.record_2024}
                    </div>
                  )}
                  {location.private_public && (
                    <div className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs mr-1">
                      {location.private_public}
                    </div>
                  )}
                  {location.league_classification && (
                    <div className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {location.league_classification}
                    </div>
                  )}
                </div>
                
                {/* Address */}
                <div className="text-gray-600 text-sm mb-1">{location.address}</div>
                
                {/* County and state with pipe separator */}
                {(location.county || location.state) && (
                  <div className="text-sm font-semibold">
                    {location.county && <span>{location.county}</span>}
                    {location.county && location.state && <span> | </span>}
                    {location.state && <span>{location.state}</span>}
                  </div>
                )}
              </div>
              
              {/* Second column - Coach information */}
              <div className="text-sm">
                {(location.head_coach_first || location.head_coach_last) && (
                  <div className="font-medium text-gray-800 mb-1">
                    Coach: {location.head_coach_first} {location.head_coach_last}
                  </div>
                )}
                {location.head_coach_email && (
                  <div className="text-gray-600">
                    Email: {location.head_coach_email}
                  </div>
                )}
                {location.head_coach_cell && (
                  <div className="text-gray-600">
                    Cell: {location.head_coach_cell} {(location.coach_best_contact === 'cell' || location.best_phone === 'Cell') && <span className="text-blue-600 font-medium">(best)</span>}
                  </div>
                )}
                {location.head_coach_work_phone && (
                  <div className="text-gray-600">
                    Work: {location.head_coach_work_phone} {(location.coach_best_contact === 'work' || location.best_phone === 'Office') && <span className="text-blue-600 font-medium">(best)</span>}
                  </div>
                )}
                {location.head_coach_home_phone && (
                  <div className="text-gray-600">
                    Home: {location.head_coach_home_phone} {(location.coach_best_contact === 'home' || location.best_phone === 'Home') && <span className="text-blue-600 font-medium">(best)</span>}
                  </div>
                )}
                {location.coach_twitter_handle && (
                  <div className="text-gray-600">
                    Twitter: {location.coach_twitter_handle}
                  </div>
                )}
                {location.coach_best_contact && location.coach_best_contact !== 'cell' && 
                 location.coach_best_contact !== 'work' && location.coach_best_contact !== 'home' && (
                  <div className="text-gray-600">
                    Best Contact: {location.coach_best_contact}
                  </div>
                )}
              </div>
              
              {/* Third column - AD and school information */}
              <div className="text-sm">
                {(location.ad_name_first || location.ad_name_last) && (
                  <div className="font-medium text-gray-800 mb-1">
                    AD: {location.ad_name_first} {location.ad_name_last}
                  </div>
                )}
                {location.ad_email && (
                  <div className="text-gray-600">
                    Email: {location.ad_email}
                  </div>
                )}
                {location.school_phone && (
                  <div className="text-gray-600">
                    School: {location.school_phone}
                  </div>
                )}
              </div>
            </div>
            
            {/* Visit info row that spans all columns */}
            {location.visit_info && (
              <div className="text-sm text-gray-700 border-t border-b py-1 mb-2">
                <span className="font-medium">Visit Info:</span> {location.visit_info}
              </div>
            )}
            
            {/* Score display with same styling as page.tsx */}
            {(location.score_college_player !== undefined || 
              location.score_d1_producing !== undefined || 
              location.score_team_quality !== undefined || 
              location.score_income !== undefined ||
              location.score_academics !== undefined) && (
              <div className="mt-2 grid grid-cols-5 gap-1">
                {location.score_college_player !== undefined && (
                  <div className="text-center" style={{ backgroundColor: getScoreColor(location.score_college_player) }}>
                    <div className="text-xs text-gray-700 font-medium">College</div>
                    <div className="font-bold text-black">{location.score_college_player}</div>
                  </div>
                )}
                
                {location.score_d1_producing !== undefined && (
                  <div className="text-center" style={{ backgroundColor: getScoreColor(location.score_d1_producing) }}>
                    <div className="text-xs text-gray-700 font-medium">D1</div>
                    <div className="font-bold text-black">{location.score_d1_producing}</div>
                  </div>
                )}
                
                {location.score_team_quality !== undefined && (
                  <div className="text-center" style={{ backgroundColor: getScoreColor(location.score_team_quality) }}>
                    <div className="text-xs text-gray-700 font-medium">Team</div>
                    <div className="font-bold text-black">{location.score_team_quality}</div>
                  </div>
                )}
                
                {location.score_income !== undefined && (
                  <div className="text-center" style={{ backgroundColor: getScoreColor(location.score_income) }}>
                    <div className="text-xs text-gray-700 font-medium">Income</div>
                    <div className="font-bold text-black">{location.score_income}</div>
                  </div>
                )}
                
                {location.score_academics !== undefined && (
                  <div className="text-center" style={{ backgroundColor: getScoreColor(location.score_academics) }}>
                    <div className="text-xs text-gray-700 font-medium">Acad</div>
                    <div className="font-bold text-black">{location.score_academics}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(index);
          }}
          type="button"
          className="ml-2 p-2 rounded-lg transition-colors duration-200 flex items-center justify-center"
          title="Remove stop"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {routeInfo && index < routeInfo.legs.length && (
        <div className="mt-2 text-sm text-gray-500 border-t pt-2">
          {index < totalLocations - 1 && (
            <div>Next stop: {routeInfo.legs[index].duration} ({routeInfo.legs[index].distance})</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [storedSchoolData, setStoredSchoolData] = useState<School[]>([]);
  const [locations, setLocations] = useState<School[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [minAthleticLevel, setMinAthleticLevel] = useState('D3');
  const [minGradYear, setMinGradYear] = useState('2025');
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapContentRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const userDetails = useUser();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Add this useEffect to track when the map is fully loaded
  useEffect(() => {
    if (isLoaded && !loadError) {
      setIsMapLoaded(true);
    }
  }, [isLoaded, loadError]);

  const geocodeAddress = async (address: string, schoolName: string = ''): Promise<School | null> => {
    if (!isLoaded) return null;
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        // If schoolName is provided via parameter, use it directly
        // otherwise try to find from storedSchoolData state
        let school = schoolName;
        if (!school) {
          const schoolInfo = storedSchoolData.find(item => item.address === address);
          school = schoolInfo?.school || 'Unknown School';
        }
        
        console.log(`Geocoding ${address}, school: ${school}`);
        
        // Find the corresponding school info for all additional data
        const schoolInfo = storedSchoolData.find(item => item.address === address);
        
        return {
          address,
          school,
          position: data.results[0].geometry.location,
          // Include additional fields from the school info
          county: schoolInfo?.county,
          state: schoolInfo?.state,
          head_coach_first: schoolInfo?.head_coach_first,
          head_coach_last: schoolInfo?.head_coach_last,
          private_public: schoolInfo?.private_public,
          league_classification: schoolInfo?.league_classification,
          score_college_player: schoolInfo?.score_college_player,
          score_d1_producing: schoolInfo?.score_d1_producing,
          score_team_quality: schoolInfo?.score_team_quality,
          score_income: schoolInfo?.score_income,
          score_academics: schoolInfo?.score_academics,
          head_coach_email: schoolInfo?.head_coach_email,
          head_coach_cell: schoolInfo?.head_coach_cell,
          head_coach_work_phone: schoolInfo?.head_coach_work_phone,
          head_coach_home_phone: schoolInfo?.head_coach_home_phone,
          coach_twitter_handle: schoolInfo?.coach_twitter_handle,
          visit_info: schoolInfo?.visit_info,
          best_phone: schoolInfo?.best_phone,
          coach_best_contact: schoolInfo?.coach_best_contact,
          school_phone: schoolInfo?.school_phone,
          ad_name_first: schoolInfo?.ad_name_first,
          ad_name_last: schoolInfo?.ad_name_last,
          ad_email: schoolInfo?.ad_email,
          record_2024: schoolInfo?.record_2024,
          raw_data: schoolInfo?.raw_data
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  const updateRouteInfo = (result: google.maps.DirectionsResult) => {
    const legs = result.routes[0].legs;
    const totalTimeSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0);
    const totalDistanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0);

    setRouteInfo({
      totalTime: formatDuration(totalTimeSeconds),
      totalDistance: formatDistance(totalDistanceMeters),
      legs: legs.map(leg => ({
        duration: leg.duration?.text || '',
        distance: leg.distance?.text || ''
      }))
    });
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number): string => {
    const miles = meters / 1609.34;
    return `${Math.round(miles)} mi`;
  };

  const calculateRoute = useCallback(async (locs: School[]) => {
    if (!locs.length || !isLoaded || !isMapLoaded || !window.google || !window.google.maps) return;

    try {
      const directionsService = new window.google.maps.DirectionsService();

      if (locs.length >= 2) {
        const origin = locs[0].position || { lat: 0, lng: 0 };
        const destination = locs[locs.length - 1].position || { lat: 0, lng: 0 };
        const waypoints = locs.slice(1, -1).map(loc => ({
          location: new window.google.maps.LatLng(loc.position?.lat || 0, loc.position?.lng || 0),
          stopover: true
        }));

        const result = await directionsService.route({
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          waypoints: waypoints,
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING
        });

        setDirections(result);
        updateRouteInfo(result);
      }
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  }, [isLoaded, isMapLoaded]);

  const optimizeRoute = async () => {
    if (locations.length < 2 || !isLoaded || !isMapLoaded || !window.google || !window.google.maps) return;
    setIsOptimizing(true);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const allWaypoints = locations.slice(1).map(loc => ({
        location: new window.google.maps.LatLng(loc.position?.lat || 0, loc.position?.lng || 0),
        stopover: true
      }));

      const result = await directionsService.route({
        origin: new window.google.maps.LatLng(locations[0].position?.lat || 0, locations[0].position?.lng || 0),
        destination: new window.google.maps.LatLng(locations[0].position?.lat || 0, locations[0].position?.lng || 0),
        waypoints: allWaypoints,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING
      });

      if (result.routes[0].waypoint_order) {
        const waypointOrder = result.routes[0].waypoint_order;
        
        const optimizedLocations = [
          ...waypointOrder.map(index => locations[index + 1]),
          locations[0]
        ];

        let shortestDistance = Number.MAX_VALUE;
        let bestRotation = 0;
        
        for (let i = 0; i < optimizedLocations.length; i++) {
          const rotated = [
            ...optimizedLocations.slice(i),
            ...optimizedLocations.slice(0, i)
          ];

          const routeResult = await directionsService.route({
            origin: new window.google.maps.LatLng(rotated[0].position?.lat || 0, rotated[0].position?.lng || 0),
            destination: new window.google.maps.LatLng(rotated[rotated.length - 1].position?.lat || 0, rotated[rotated.length - 1].position?.lng || 0),
            waypoints: rotated.slice(1, -1).map(loc => ({
              location: new window.google.maps.LatLng(loc.position?.lat || 0, loc.position?.lng || 0),
              stopover: true
            })),
            optimizeWaypoints: false,
            travelMode: window.google.maps.TravelMode.DRIVING
          });

          const totalDistance = routeResult.routes[0].legs.reduce(
            (sum, leg) => sum + (leg.distance?.value || 0),
            0
          );

          if (totalDistance < shortestDistance) {
            shortestDistance = totalDistance;
            bestRotation = i;
          }
        }

        const finalOrder = [
          ...optimizedLocations.slice(bestRotation),
          ...optimizedLocations.slice(0, bestRotation)
        ];

        setLocations(finalOrder);
        setSelectedAddresses(finalOrder.map(loc => loc.address));

        const finalRoute = await directionsService.route({
          origin: new window.google.maps.LatLng(finalOrder[0].position?.lat || 0, finalOrder[0].position?.lng || 0),
          destination: new window.google.maps.LatLng(finalOrder[finalOrder.length - 1].position?.lat || 0, finalOrder[finalOrder.length - 1].position?.lng || 0),
          waypoints: finalOrder.slice(1, -1).map(loc => ({
            location: new window.google.maps.LatLng(loc.position?.lat || 0, loc.position?.lng || 0),
            stopover: true
          })),
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING
        });

        setDirections(finalRoute);
      }
    } catch (error) {
      console.error('Error optimizing route:', error);
    }
    setIsOptimizing(false);
  };

  const reverseOrder = () => {
    const reversedLocations = [...locations].reverse();
    setLocations(reversedLocations);
    setSelectedAddresses(reversedLocations.map(loc => loc.address));
    calculateRoute(reversedLocations);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = Number(active.id);
      const newIndex = Number(over.id);

      const newLocations = arrayMove(locations, oldIndex, newIndex);
      setLocations(newLocations);
      
      // Update selected addresses but maintain the association with schools
      const newAddresses = newLocations.map(loc => loc.address);
      setSelectedAddresses(newAddresses);
      
      calculateRoute(newLocations);
    }
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = [...locations];
    newLocations.splice(index, 1);
    setLocations(newLocations);
    
    // Update selected addresses
    const newAddresses = newLocations.map(loc => loc.address);
    setSelectedAddresses(newAddresses);
    
    if (newLocations.length >= 2) {
      calculateRoute(newLocations);
    } else {
      setDirections(null);
      setRouteInfo(null);
    }
  };

  const handlePrint = async () => {
    if (locations.length === 0) {
      alert("Please select at least one school to print.");
      return;
    }

    setIsPrinting(true);
    let lastCreatedPdfBlob: Blob | null = null;
    let lastPdfFilename: string = '';

    try {
      // Extract high school IDs from the stored school data
      const highschoolIds = locations.map(location => {
        // Look for high_school_id in raw_data
        const schoolInfo = storedSchoolData.find(s => s.address === location.address);
        // Try to get high_school_id from the raw_data
        return schoolInfo?.raw_data?.high_school_id || '';
      }).filter(id => id !== '');

      if (highschoolIds.length === 0) {
        console.error("Could not find high_school_id in data:", storedSchoolData);
        alert("Could not find high_school_ids for the selected schools. This might be due to missing data.");
        setIsPrinting(false);
        return;
      }

      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("You must be logged in to print. Please log in and try again.");
        setIsPrinting(false);
        return;
      }
      
      if (!userDetails) {
        console.error("Error fetching user details");
        alert("Error retrieving your user details. Please try again.");
        setIsPrinting(false);
        return;
      }
      
      // Get college information from customers table
      let requestingCollege = "Unknown College"; // Default value
      
      // Special case for Penn State team IDs
      const pennStateTeamIds = [
        '1ca60546-8f5b-4188-9639-2a914af86bc9',
        '658fd68a-bbf6-4e9d-a844-f69e93a1c07e',
        '852fa0c1-2134-488d-b72c-747ae75dadb5',
        'ad6cd81d-a795-468a-b7ef-ba693876ef9d',
        'f42ca035-d7b8-4ad2-b4bb-b6d49c906901' // Including your test customer_id as well
      ];
      
      if (userDetails.customer_id && pennStateTeamIds.includes(userDetails.customer_id)) {
        requestingCollege = "Penn State University";
        console.log("Using Penn State override for customer_id:", userDetails.customer_id);
      } else {
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
            alert("Error retrieving your college information. Please try again.");
            setIsPrinting(false);
            return;
          }
          
          if (customerData && customerData.length > 0) {
            const school = customerData[0].school as unknown as { id: string; name: string } | null;
            requestingCollege = school?.name || requestingCollege;
          }
        } catch (dbError) {
          console.error("Exception during customer data fetch:", dbError);
          alert("Error retrieving your college information. Please try again.");
          setIsPrinting(false);
          return;
        }
      }
      
      // Combine first and last name for coach_name
      const coachName = `${userDetails.name_first || ''} ${userDetails.name_last || ''}`.trim() || "Unknown Coach";
      
      // Get email from the authentication session
      const coachEmail = session.user.email || "";
      
      // Create the filename with the required format outside of the try block
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      
      // Define the filename here so it's in scope for the entire function
      const coverPageFileName = `${year}-${month}-${day}${userDetails.name_first || ''}${userDetails.name_last || ''}${randomDigits}.pdf`;
      lastPdfFilename = coverPageFileName;
      console.log('Generated filename:', coverPageFileName);
      
      // Create PDF of the map content
      try {
        // First, create a PDF of the current content
        if (!pdfContentRef.current) {
          console.error('PDF content container not found');
          setIsPrinting(false);
          return;
        }

        try {
          // Delay to ensure the map is fully rendered with all markers
          console.log('Waiting for map to render fully...');
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Capture the content container with improved settings for map bubbles
          console.log('Capturing content with html2canvas...');
          const canvas = await html2canvas(pdfContentRef.current, {
            scale: 1.5, // Maintain good quality
            useCORS: true,
            allowTaint: true,
            logging: true,
            onclone: (clonedDoc: Document) => {
              // Enhanced styles to make the map markers and labels visible in the PDF
              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                /* Make sure all Google Maps elements are visible */
                .gm-style img { visibility: visible !important; }
                
                /* Ensure school labels are visible and properly styled */
                .school-label-text { 
                  visibility: visible !important;
                  opacity: 1 !important;
                  background-color: white !important;
                  padding: 4px 8px !important;
                  border-radius: 4px !important;
                  border: 1px solid #ccc !important;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                  z-index: 1000 !important;
                  font-weight: bold !important;
                  display: block !important;
                  text-align: center !important;
                }
                
                /* Hide the "Stop Order" heading in the PDF */
                h2.text-xl.font-semibold.mb-4:contains("Stop Order") { display: none !important; }
                .stop-order-heading { display: none !important; }
                .print-hide { display: none !important; }
                
                /* Make sure the map container doesn't crop labels */
                .gm-style { overflow: visible !important; }
              `;
              clonedDoc.head.appendChild(style);
              
              // Force visibility of all Google Maps elements
              const allMapElements = clonedDoc.querySelectorAll('.gm-style *');
              allMapElements.forEach((el: Element) => {
                if (el instanceof HTMLElement) {
                  if (el.classList.contains('school-label-text')) {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.zIndex = '1000';
                    el.style.display = 'block';
                  }
                }
              });
            }
          });
          
          console.log('Creating PDF document...');
          // Create PDF with portrait orientation
          const pdf = new jsPDF({
            orientation: 'portrait', // Change to portrait
            unit: 'mm',
            format: 'letter', // Use letter size (8.5 x 11 inches)
            compress: true // Enable compression
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate aspect ratio to maintain proportions
          const canvasRatio = canvas.height / canvas.width;
          const pageRatio = pdfHeight / pdfWidth;
          
          let imgWidth = pdfWidth;
          let imgHeight = pdfWidth * canvasRatio;
          
          // If the image is taller than the page, scale it down to fit
          if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = pdfHeight / canvasRatio;
          }
          
          // Center the image on the page
          const xOffset = (pdfWidth - imgWidth) / 2;
          const yOffset = (pdfHeight - imgHeight) / 2;
          
          // Add metadata to the PDF
          pdf.setProperties({
            title: `${requestingCollege} - Recruiting Route Map`,
            subject: `Map of recruiting stops for ${coachName}`,
            author: coachName,
            keywords: 'recruiting, map, athletics',
            creator: 'Verified Athletics App'
          });
          
          // Add the captured image to the PDF with proper sizing
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          
          console.log('Converting PDF to blob...');
          const pdfBlob = pdf.output('blob');
          const blobSizeKB = Math.round(pdfBlob.size / 1024);
          console.log('PDF blob size:', blobSizeKB, 'KB');
          
          // Store the PDF blob for later use
          lastCreatedPdfBlob = pdfBlob;
          // Also store in state for UI
          setPdfBlob(pdfBlob);
          setPdfFilename(coverPageFileName);
          
          // Check if file size is likely too large for a direct upload
          const isFileTooLarge = blobSizeKB > 9000; // Cloud Functions have a 10MB limit
          
          if (isFileTooLarge) {
            console.log('File size exceeds recommended limit. Attempting to reduce size...');
            
            // Try to create a smaller version of the PDF
            const smallerCanvas = await html2canvas(pdfContentRef.current, {
              scale: 1.0, // Further reduce scale
              useCORS: true,
              allowTaint: true,
              onclone: (clonedDoc: Document) => {
                // Enhanced styles to make the map markers and labels visible in the PDF
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                  /* Make sure all Google Maps elements are visible */
                  .gm-style img { visibility: visible !important; }
                  
                  /* Ensure school labels are visible and properly styled */
                  .school-label-text { 
                    visibility: visible !important;
                    opacity: 1 !important;
                    background-color: white !important;
                    padding: 4px 8px !important;
                    border-radius: 4px !important;
                    border: 1px solid #ccc !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                    z-index: 1000 !important;
                    font-weight: bold !important;
                    display: block !important;
                    text-align: center !important;
                  }
                  
                  /* Hide the "Stop Order" heading in the PDF */
                  h2.text-xl.font-semibold.mb-4:contains("Stop Order") { display: none !important; }
                  .stop-order-heading { display: none !important; }
                  .print-hide { display: none !important; }
                  
                  /* Make sure the map container doesn't crop labels */
                  .gm-style { overflow: visible !important; }
                `;
                clonedDoc.head.appendChild(style);
                
                // Force visibility of all Google Maps elements
                const allMapElements = clonedDoc.querySelectorAll('.gm-style *');
                allMapElements.forEach((el: Element) => {
                  if (el instanceof HTMLElement) {
                    if (el.classList.contains('school-label-text')) {
                      el.style.visibility = 'visible';
                      el.style.opacity = '1';
                      el.style.zIndex = '1000';
                      el.style.display = 'block';
                    }
                  }
                });
              }
            });
            
            const smallerPdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'letter',
              compress: true
            });
            
            // Calculate aspect ratio to maintain proportions for smaller PDF
            const smallerCanvasRatio = smallerCanvas.height / smallerCanvas.width;
            const smallerPdfWidth = smallerPdf.internal.pageSize.getWidth();
            const smallerPdfHeight = smallerPdf.internal.pageSize.getHeight();
            
            let smallerImgWidth = smallerPdfWidth;
            let smallerImgHeight = smallerPdfWidth * smallerCanvasRatio;
            
            // If the image is taller than the page, scale it down to fit
            if (smallerImgHeight > smallerPdfHeight) {
              smallerImgHeight = smallerPdfHeight;
              smallerImgWidth = smallerPdfHeight / smallerCanvasRatio;
            }
            
            // Center the image on the page
            const smallerXOffset = (smallerPdfWidth - smallerImgWidth) / 2;
            const smallerYOffset = (smallerPdfHeight - smallerImgHeight) / 2;
            
            // Use even higher compression
            const smallerImgData = smallerCanvas.toDataURL('image/jpeg', 0.5);
            smallerPdf.addImage(smallerImgData, 'JPEG', smallerXOffset, smallerYOffset, smallerImgWidth, smallerImgHeight);
            
            const smallerPdfBlob = smallerPdf.output('blob');
            const smallerSizeKB = Math.round(smallerPdfBlob.size / 1024);
            console.log('Reduced PDF size to:', smallerSizeKB, 'KB');
            
            // Store the smaller PDF blob for later use if it's better
            if (smallerSizeKB < blobSizeKB * 0.7) {
              console.log('Using smaller PDF version');
              lastCreatedPdfBlob = smallerPdfBlob;
              // Also update state
              setPdfBlob(smallerPdfBlob);
              await uploadPdfToStorage(smallerPdfBlob, coverPageFileName, requestingCollege);
            } else {
              // Still try with the original but warn user
              console.log('Could not significantly reduce PDF size. Will attempt upload anyway.');
              await uploadPdfToStorage(pdfBlob, coverPageFileName, requestingCollege);
            }
          } else {
            // File size is acceptable
            await uploadPdfToStorage(pdfBlob, coverPageFileName, requestingCollege);
          }
        } catch (pdfCreationError) {
          console.error('Error creating PDF:', pdfCreationError);
          alert('Error creating PDF. Please try again.');
          setIsPrinting(false);
          return;
        }

        // After all PDF upload attempts are complete, send the data to the cloud function
        // Continue with the existing cloud function call
        const postData = JSON.stringify({
          school_ids: highschoolIds,
          coach_name: coachName,
          coach_email: coachEmail,
          requesting_college: requestingCollege,
          min_print_level: minAthleticLevel,
          min_grad_year: minGradYear,
          cover_page: coverPageFileName 
        });

        console.log("Sending to Cloud Function:", postData);

        // Show success message immediately after submitting request
        alert("Print request submitted successfully! You'll receive the PDF shortly.");

        // Using fetch API for the second call
        fetch("https://us-south1-verified-312021.cloudfunctions.net/hs_athlete_pdf_printout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: postData,
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log("Print request completed:", data);
        })
        .catch(error => {
          console.error("Error with cloud function:", error);
          alert("An error occurred while processing your print request.");
        })
        .finally(() => {
          setIsPrinting(false);
        });
      } catch (outerError) {
        console.error('Error in PDF creation process:', outerError);
        alert('Error preparing content for PDF. Please try again.');
        setIsPrinting(false);
        return;
      }
    } catch (error) {
      console.error("Print error:", error);
      alert("An error occurred while processing your print request.");
      setIsPrinting(false);
    }
  };

  // Helper function to upload PDF to storage
  async function uploadPdfToStorage(
    pdfBlob: Blob, 
    coverPageFileName: string, 
    requestingCollege: string
  ): Promise<void> {
    console.log('Uploading PDF to Google Cloud Storage bucket: excel-to-pdf-output-bucket...');
    
    // Create a local download URL for the PDF blob immediately
    const localDownloadUrl = URL.createObjectURL(pdfBlob);
    
    try {
      // First try the standard upload to Google Cloud Storage
      const pdfUrl = await uploadToGoogleCloudStorage(pdfBlob, coverPageFileName);
      
      console.log('PDF uploaded successfully to Google Cloud Storage bucket:', pdfUrl);
      
      // No need to show confirmation dialog, the user now has a download button in the UI
    } catch (uploadError: unknown) {
      console.error('Error uploading PDF to Google Cloud Storage:', uploadError);
      
      // Log the error but don't show confirmation dialog since there's a download button in the UI
      const errorMessage = uploadError instanceof Error ? uploadError.message : 'Unknown error';
      console.log(`Error saving PDF to Google Cloud Storage: ${errorMessage}. The PDF is still available for download via the Download Cover button.`);
      throw uploadError;
    } finally {
      // Only revoke the URL after the user has had a chance to download it
      setTimeout(() => {
        URL.revokeObjectURL(localDownloadUrl);
      }, 5000); // Give 5 seconds for download to potentially complete
    }
  }

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const addresses = localStorage.getItem('selectedAddresses');
        const schoolDataStr = localStorage.getItem('schoolData');
        
        if (!addresses || !isLoaded || !window.google || !window.google.maps) {
          setIsLoading(false);
          return;
        }
        
        const parsedAddresses = JSON.parse(addresses);
        setSelectedAddresses(parsedAddresses);
        
        // Try to load school data from localStorage
        let schoolData: School[] = [];
        try {
          if (schoolDataStr) {
            schoolData = JSON.parse(schoolDataStr);
          }
        } catch (e) {
          console.error('Error parsing school data:', e);
        }
        
        setStoredSchoolData(schoolData);
        
        // Wait for state to update before proceeding
        await new Promise(resolve => setTimeout(resolve, 0));

        const geocodedLocations = await Promise.all(
          parsedAddresses.map(async (address: string) => {
            // Find matching school info directly
            const schoolInfo = schoolData.find(s => s.address === address);
            
            // Get geocoded location with position data
            const geocodeResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                address
              )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const geocodeData = await geocodeResponse.json();
            
            if (!geocodeData.results || !geocodeData.results[0]) {
              console.error('No geocode results for address:', address);
              return null;
            }
            
            // Combine the geocode position with all the school metadata
            return {
              address,
              school: schoolInfo?.school || 'Unknown School',
              position: geocodeData.results[0].geometry.location,
              // Include additional fields from the school info
              county: schoolInfo?.county,
              state: schoolInfo?.state,
              head_coach_first: schoolInfo?.head_coach_first,
              head_coach_last: schoolInfo?.head_coach_last,
              private_public: schoolInfo?.private_public,
              league_classification: schoolInfo?.league_classification,
              score_college_player: schoolInfo?.score_college_player,
              score_d1_producing: schoolInfo?.score_d1_producing,
              score_team_quality: schoolInfo?.score_team_quality,
              score_income: schoolInfo?.score_income,
              score_academics: schoolInfo?.score_academics,
              head_coach_email: schoolInfo?.head_coach_email,
              head_coach_cell: schoolInfo?.head_coach_cell,
              head_coach_work_phone: schoolInfo?.head_coach_work_phone,
              head_coach_home_phone: schoolInfo?.head_coach_home_phone,
              coach_twitter_handle: schoolInfo?.coach_twitter_handle,
              visit_info: schoolInfo?.visit_info,
              best_phone: schoolInfo?.best_phone,
              coach_best_contact: schoolInfo?.coach_best_contact,
              school_phone: schoolInfo?.school_phone,
              ad_name_first: schoolInfo?.ad_name_first,
              ad_name_last: schoolInfo?.ad_name_last,
              ad_email: schoolInfo?.ad_email,
              record_2024: schoolInfo?.record_2024,
              raw_data: schoolInfo?.raw_data
            };
          })
        );

        const validLocations = geocodedLocations.filter((loc): loc is School => loc !== null);
        setLocations(validLocations);
        calculateRoute(validLocations);
      } catch (err) {
        console.error('Error loading addresses:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded && isMapLoaded) {
      loadAddresses();
    }
  }, [calculateRoute, isLoaded, isMapLoaded]);

  // Update localStorage when locations change
  useEffect(() => {
    if (locations.length > 0) {
      // Update the selected addresses in localStorage
      const addresses = locations.map(loc => loc.address);
      localStorage.setItem('selectedAddresses', JSON.stringify(addresses));
      
      // Also update the school data to match the current order
      const schoolData = locations.map(loc => ({
        school: loc.school,
        address: loc.address,
        county: loc.county,
        state: loc.state,
        head_coach_first: loc.head_coach_first,
        head_coach_last: loc.head_coach_last,
        private_public: loc.private_public,
        league_classification: loc.league_classification,
        score_college_player: loc.score_college_player,
        score_d1_producing: loc.score_d1_producing,
        score_team_quality: loc.score_team_quality,
        score_income: loc.score_income,
        score_academics: loc.score_academics,
        head_coach_email: loc.head_coach_email,
        head_coach_cell: loc.head_coach_cell,
        head_coach_work_phone: loc.head_coach_work_phone,
        head_coach_home_phone: loc.head_coach_home_phone,
        coach_twitter_handle: loc.coach_twitter_handle,
        visit_info: loc.visit_info,
        best_phone: loc.best_phone,
        coach_best_contact: loc.coach_best_contact,
        school_phone: loc.school_phone,
        ad_name_first: loc.ad_name_first,
        ad_name_last: loc.ad_name_last,
        ad_email: loc.ad_email,
        record_2024: loc.record_2024,
        raw_data: storedSchoolData.find(s => s.address === loc.address)?.raw_data
      }));
      
      localStorage.setItem('schoolData', JSON.stringify(schoolData));
    }
  }, [locations, storedSchoolData]);

  return (
    <div className="flex flex-col h-screen">
      {/* Main content with scrolling */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 pb-20"> {/* Added pb-20 for bottom padding */}
          {/* Controls section - moved from fixed header to scrollable content */}
          <div className="mb-6 top-0 z-10 pt-2 pb-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-4 items-start justify-between">
              {/* Print group with filters in matching color scheme */}
              <div className="flex items-center flex-wrap gap-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <button
                  onClick={handlePrint}
                  disabled={isPrinting || locations.length === 0}
                  className="px-5 py-2 bg-amber-500 text-white font-semibold rounded-md shadow hover:bg-amber-600 transition duration-200 disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isPrinting ? (
                    <>
                      <span className="animate-spin inline-block">⟳</span>
                      <span className="!text-white">Creating PDF...</span>
                    </>
                  ) : (
                    <>
                      <span>🖨️</span>
                      <span className="!text-white">Print PDF</span>
                    </>
                  )}
                </button>
                
                {/* Add download button that's visible when PDF blob is available */}
                {pdfBlob && (
                  <button
                    onClick={() => {
                      try {
                        if (pdfBlob && pdfFilename) {
                          console.log('Downloading cover page PDF...');
                          const url = URL.createObjectURL(pdfBlob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = pdfFilename;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          
                          // Clean up the URL after a short delay to ensure the download starts
                          setTimeout(() => {
                            URL.revokeObjectURL(url);
                            console.log('Download link cleaned up');
                          }, 5000);
                        } else {
                          console.error('PDF blob or filename is missing');
                        }
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        alert('There was an error downloading the PDF. Please try again.');
                      }
                    }}
                    className="px-5 py-2 bg-blue-500 text-white font-semibold rounded-md shadow hover:bg-blue-600 transition duration-200 flex items-center gap-2"
                  >
                    <span>⬇️</span>
                    <span className="!text-white">Download Cover</span>
                  </button>
                )}
                
                <div className="flex flex-col">
                  <label htmlFor="minAthleticLevel" className="text-xs font-medium text-amber-800 mb-1">Min Athletic Level</label>
                  <select 
                    id="minAthleticLevel"
                    value={minAthleticLevel} 
                    onChange={(e) => setMinAthleticLevel(e.target.value)}
                    className="border border-amber-300 rounded-md px-2 py-1 bg-white text-amber-800 text-sm h-9 w-36"
                  >
                    <option value="D3">D3</option>
                    <option value="D2">D2</option>
                    <option value="FCS">FCS</option>
                    <option value="G5">G5</option>
                    <option value="P4">P4</option>
                  </select>
                </div>
                
                <div className="flex flex-col">
                  <label htmlFor="minGradYear" className="text-xs font-medium text-amber-800 mb-1">Min Grad Year</label>
                  <select 
                    id="minGradYear"
                    value={minGradYear} 
                    onChange={(e) => setMinGradYear(e.target.value)}
                    className="border border-amber-300 rounded-md px-2 py-1 bg-white text-amber-800 text-sm h-9 w-36"
                  >
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                    <option value="2028">2028</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 items-center">
                <button
                  disabled={isOptimizing || locations.length < 2}
                  onClick={optimizeRoute}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-600 flex items-center gap-2"
                >
                  {isOptimizing ? (
                    <>
                      <span className="animate-spin inline-block">⟳</span>
                      <span className="!text-white">Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <span>⟲</span>
                      <span className="!text-white">Optimize Route</span>
                    </>
                  )}
                </button>
                <button
                  disabled={locations.length < 2}
                  onClick={reverseOrder}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 flex items-center gap-2"
                >
                  <span>↔</span>
                  <span className="!text-white">Reverse Order</span>
                </button>
                <button
                  onClick={() => router.push('/road-planner')}
                  className="px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 border border-gray-200"
                >
                  Back to Search
                </button>
              </div>
            </div>
          </div>
          
          {/* PDF content begins here - this is what we'll capture for the PDF */}
          <div ref={pdfContentRef}>
            {isLoading || !isLoaded || !isMapLoaded ? (
              <div className="text-center py-8">Loading map...</div>
            ) : (
              <div className="space-y-6">
                <div className="border rounded-lg overflow-hidden">
                  <GoogleMap
                    mapContainerStyle={{ ...mapContainerStyle, height: '500px' }}
                    zoom={4}
                    center={center}
                    options={{
                      mapTypeControl: true,
                      streetViewControl: true,
                      mapTypeId: 'roadmap',
                      fullscreenControl: true,
                      zoomControl: true,
                      gestureHandling: 'greedy'
                    }}
                  >
                    {directions ? (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: '#1E40AF',
                            strokeWeight: 5,
                            strokeOpacity: 0.7
                          }
                        }}
                      />
                    ) : null}
                    {locations.map((location, index) => (
                      location.position && (
                        <Fragment key={`marker-${index}`}>
                          <MarkerF
                            position={location.position}
                            label={{
                              text: `${index + 1}`,
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                            icon={{
                              path: window.google.maps.SymbolPath.CIRCLE,
                              scale: 14,
                              fillColor: '#1E40AF',
                              fillOpacity: 1,
                              strokeColor: 'white',
                              strokeWeight: 2
                            }}
                            title={`${index + 1}. ${location.school}`}
                          />
                          
                          {/* School label */}
                          <OverlayViewF
                            position={location.position}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            getPixelPositionOffset={(width, height) => ({
                              x: -width / 2,
                              y: -height - 30
                            })}
                          >
                            <div 
                              className="school-label-text bg-white px-2 py-1 rounded shadow-md text-sm font-medium mb-1"
                              style={{ minWidth: 'max-content' }}
                            >
                              {location.school}
                            </div>
                          </OverlayViewF>
                        </Fragment>
                      )
                    ))}
                  </GoogleMap>
                </div>

                {routeInfo && (
                  <div className="text-center p-4 bg-gray-50 rounded-lg border">
                    <div className="text-2xl font-bold text-gray-700">
                      Total Drive Time: {routeInfo.totalTime}
                    </div>
                    <div className="text-gray-600 mt-1">
                      Total Distance: {routeInfo.totalDistance}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={locations.map((_, index) => index)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {locations.map((location, index) => (
                          <SortableItem
                            key={index}
                            location={location}
                            index={index}
                            routeInfo={routeInfo || undefined}
                            totalLocations={locations.length}
                            onRemove={handleRemoveLocation}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            )}

            {locations.length === 0 && !isLoading && (
              <div className="text-center text-gray-500 mt-8">
                <div className="mx-auto h-10 w-10 mb-2 text-3xl">📍</div>
                <p className="text-lg font-medium">No stops added yet</p>
                <p className="mt-2">Return to selection to add schools.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .marker-number {
          font-weight: bold;
          font-size: 14px;
        }
        .school-label-text {
          background-color: white !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          border: 1px solid #ccc !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
          margin-top: 0 !important; 
          white-space: nowrap !important;
          z-index: 100 !important;
          font-size: 12px !important;
          line-height: 1.2 !important;
          min-width: 40px !important;
          text-align: center !important;
          max-width: 250px !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          transform: translateY(-50%) !important;
        }
        /* InfoWindow styles */
        .gm-style .gm-style-iw {
          padding: 0 !important;
          max-height: none !important;
        }
        .gm-style .gm-style-iw-c {
          padding: 0 !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        .gm-style .gm-style-iw-d {
          overflow: visible !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }
        .gm-style .gm-style-iw-tc {
          display: none !important;
        }
        .gm-style button.gm-ui-hover-effect {
          position: static !important;
          display: inline-flex !important;
          margin-left: 4px !important;
          margin-right: 0 !important;
          top: auto !important;
          right: auto !important;
          width: 10px !important;
          height: 10px !important;
          margin-top: 4px !important;
          padding: 0 !important;
          border: 1px solid #666 !important;
          border-radius: 2px !important;
          align-items: center !important;
          justify-content: center !important;
          background-color: rgba(255, 255, 255, 0.9) !important;
          transform: none !important;
        }
        .gm-style .gm-style-iw button img {
          width: 8px !important;
          height: 8px !important;
          margin: 0 !important;
          opacity: 0.8 !important;
        }
        .gm-style .gm-style-iw button:hover {
          background-color: white !important;
          border-color: #333 !important;
        }
        .gm-style .gm-style-iw button:hover img {
          opacity: 1 !important;
        }
        /* Trash can styles */
        button svg {
          fill: #ef4444 !important;
          width: 24px !important;
          height: 24px !important;
        }
        button:hover svg {
          fill: #b91c1c !important;
        }
        button[title="Remove stop"] {
          background-color: #fee2e2 !important;
        }
        button[title="Remove stop"]:hover {
          background-color: #fecaca !important;
        }
      `}</style>
    </div>
  );
}

const mapContainerStyle = {
  width: '100%',
  height: '600px'
};

const center = {
  lat: 39.8283, // Center of US
  lng: -98.5795
};

const libraries: Libraries = ['places'];

// Function to upload file to Google Cloud Storage
async function uploadToGoogleCloudStorage(file: Blob, coverPageFileName: string): Promise<string> {
  try {
    // For development, check if we should bypass cloud upload
    const isDevMode = process.env.NODE_ENV === 'development';
    const shouldBypassCloudUpload = false; // Changed to always try the cloud function even in development
    
    if (shouldBypassCloudUpload) {
      console.log('Development mode: Bypassing cloud upload, returning direct download URL');
      const downloadUrl = URL.createObjectURL(file);
      return downloadUrl;
    }
    
    // Always create a local copy of the PDF as a backup
    const localDownloadUrl = URL.createObjectURL(file);
    console.log('Created local backup URL:', localDownloadUrl);
    
    // Create a download link that users can click if cloud storage fails
    try {
      const backupLink = document.createElement('a');
      backupLink.href = localDownloadUrl;
      backupLink.download = coverPageFileName;
      backupLink.style.display = 'none';
      document.body.appendChild(backupLink);
      console.log('Created backup download link for emergency use');
      
      // We'll keep this link in the DOM for emergency use
      // but hidden from view
      setTimeout(() => {
        backupLink.style.display = 'none';
      }, 100);
    } catch (backupError) {
      console.warn('Error creating backup link:', backupError);
    }
    
    // Convert Blob to File
    const pdfFile = new File([file], coverPageFileName, { type: 'application/pdf' });
    console.log(`Preparing to upload file: ${coverPageFileName}, size: ${Math.round(file.size/1024)}KB`);
    
    // Create FormData to send the file
    const formData = new FormData();
    formData.append('file', pdfFile);
    formData.append('bucket', 'excel-to-pdf-output-bucket');
    // Add the proper folder path for cover pages
    formData.append('folder', 'cover_pages');
    
    // Try direct cloud function upload first instead of API route
    // This is more reliable as it avoids double-handling the file
    try {
      console.log('Attempting direct upload with JSON payload...');
      
      // Use the production URL even in development mode since localhost isn't running
      const cloudFunctionUrl = 'https://us-central1-verified-312021.cloudfunctions.net/uploadPDF';
      
      // Convert the file to a base64 string
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      console.log(`File converted to base64 (${Math.round(base64Data.length/1024)}KB encoded size)`);
      
      // Create JSON payload - include the "cover_pages/" prefix in the destination
      const payload = {
        filename: coverPageFileName,
        contentType: 'application/pdf',
        destination: `cover_pages/${coverPageFileName}`, // Add folder prefix to the destination
        bucket: 'excel-to-pdf-output-bucket',
        base64Data: base64Data
      };
      
      console.log('Upload destination path:', payload.destination);
      
      // Use the cloud function that accepts JSON payload
      console.log(`Sending request to cloud function at ${cloudFunctionUrl}...`);
      const directResponse = await fetch(cloudFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Don't use no-cors as it makes debugging harder
        mode: 'cors'
      });
      
      if (!directResponse.ok) {
        const errorText = await directResponse.text();
        console.error(`Failed to upload directly to Google Cloud Storage: ${directResponse.status} ${directResponse.statusText}`);
        console.error('Response body:', errorText);
        throw new Error(`Failed to upload directly to Google Cloud Storage: ${directResponse.status} ${directResponse.statusText} - ${errorText}`);
      }
      
      let directData;
      try {
        directData = await directResponse.json();
        console.log('Direct upload response:', directData);
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        console.log('Raw response:', await directResponse.text());
        throw new Error('Failed to parse response from cloud function');
      }
      
      // Return the public URL
      const fileUrl = `https://storage.googleapis.com/excel-to-pdf-output-bucket/cover_pages/${coverPageFileName}`;
      
      // Add verification step for the file
      try {
        console.log(`Verifying file exists at: ${fileUrl}`);
        // Wait a moment for cloud storage to process
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait longer - 3 seconds
        
        // Use a no-cors request to avoid CORS errors
        // Note: This will always return an "opaque" response that we can't read directly,
        // but the request itself will either succeed or fail
        const verifyResponse = await fetch(fileUrl, { 
          method: 'HEAD',
          mode: 'no-cors'
        });
        
        // Since we're using no-cors, we can't check the status directly
        // But we can assume the file exists if we didn't get an exception
        console.log('Verification request completed without errors - assuming file exists');
        
        // Create a direct download link for the user
        if (typeof window !== 'undefined') {
          try {
            // Attempt to create a temporary element to test if the URL is accessible via anchor
            const testLink = document.createElement('a');
            testLink.href = fileUrl;
            testLink.target = '_blank';
            testLink.style.display = 'none';
            testLink.textContent = 'Test Link';
            document.body.appendChild(testLink);
            console.log('Created test link for GCS file');
            
            // Clean up after a short delay
            setTimeout(() => {
              if (testLink && testLink.parentNode) {
                document.body.removeChild(testLink);
              }
            }, 5000);
          } catch (linkError) {
            console.warn('Error creating test link:', linkError);
          }
        }
        
        return fileUrl;
      } catch (verifyError) {
        console.warn('Error verifying file in bucket:', verifyError);
        // Return the local URL instead
        console.log('Falling back to local URL due to verification error');
        return localDownloadUrl;
      }
    } catch (directUploadError) {
      console.error('Direct cloud function upload failed:', directUploadError);
      
      // Now try the API route as a fallback
      try {
        console.log('Attempting to upload via Next.js API route as fallback...');
        const response = await fetch('/api/uploadToGCS', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Upload response from Next.js API:', data);
          
          if (data.url) {
            // Verify the file exists in the bucket by making a HEAD request
            try {
              console.log(`Verifying file exists at: ${data.url}`);
              // Wait a moment for cloud storage to process
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait longer - 3 seconds
              const verifyResponse = await fetch(data.url, { method: 'HEAD' });
              if (verifyResponse.ok) {
                console.log('Verification successful: File exists in bucket');
                return data.url;
              } else {
                console.warn(`Verification failed: File might not exist in bucket (status: ${verifyResponse.status})`);
                // Return the local URL instead
                return localDownloadUrl;
              }
            } catch (verifyError) {
              console.warn('Error verifying file in bucket:', verifyError);
              // Return the local URL instead
              return localDownloadUrl;
            }
          }
        }
        
        // If we get here, the API route failed
        console.warn('API route failed to return a valid URL');
        return localDownloadUrl;
      } catch (apiError) {
        console.error('All upload attempts failed:', apiError);
        return localDownloadUrl;
      }
    }
  } catch (error) {
    console.error('All upload attempts to Google Cloud Storage failed:', error);
    // Create a local fallback URL
    const objectUrl = URL.createObjectURL(file);
    return objectUrl;
  }
} 