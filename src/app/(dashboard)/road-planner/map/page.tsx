"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  DirectionsRenderer,
  Libraries,
  InfoWindow,
  OverlayView,
  OverlayViewF,
} from "@react-google-maps/api";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { School } from "../types";
import { supabase } from "@/lib/supabaseClient";
import { useUser, useCustomer } from "@/contexts/CustomerContext";
import { formatPhoneNumber } from "@/utils/utils";
import { getPackageIdsBySport, fetchHighSchoolAthletes, fetchJourneys, saveJourney, deleteJourney, JourneyDB, fetchExistingPackagesForCustomer } from "@/lib/queries";
import { convertSchoolId } from "@/utils/printUtils";
import { SavedJourneys, SavedJourney } from "@/app/(dashboard)/_components/journeys/SavedJourneys";
import { convertHighSchoolIdToSchoolId, fetchSchoolDataFromHighSchoolId, fetchSchoolDataFromSchoolId } from "../utils/schoolDataUtils";
import SchoolCard from "../components/SchoolCard";
import HighSchoolPrintComponent, { HighSchoolPrintComponentRef } from "@/components/HighSchoolPrintComponent";
import { Button, Input, Select, Popover, Modal, message } from "antd";

// Helper function to determine score color
function getScoreColor(score: number | undefined | null): string {
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
}

interface RouteInfo {
  totalDistance: string;
  totalTime: string;
  legs: {
    duration: string;
    distance: string;
  }[];
}

function SortableItem({
  location,
  index,
  routeInfo,
  totalLocations,
  onRemove,
  userDetails,
  hasFootballPackage,
  dataSource,
}: {
  location: School;
  index: number;
  routeInfo?: RouteInfo;
  totalLocations: number;
  onRemove: (index: number) => void;
  userDetails?: any;
  hasFootballPackage?: boolean;
  dataSource?: 'high_schools' | 'hs_athletes' | null;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: index });
  const [athletes, setAthletes] = useState<any[]>([]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Fetch athletes for this school
  useEffect(() => {
    const fetchAthletes = async () => {
      if (!hasFootballPackage || !userDetails?.customer_id) return;
      
      // Skip fetching athletes if this location already has athlete data (it's an athlete card)
      const hasAthleteData = location.raw_data && (location.raw_data as any).athlete_name;
      if (hasAthleteData) return;
      
      try {
        // For mixed data, check each location individually
        // For hs_athletes mode, school_id is already the high school's school_id (no conversion needed)
        // For high_schools, use school_id directly if available, otherwise convert from high_school_id
        let schoolId: string | undefined = location.school_id;
        
        // Only try conversion if we don't have school_id and this is not an athlete card
        // Check location individually rather than relying on dataSource parameter
        if (!schoolId && !hasAthleteData) {
          if (location.high_school_id) {
            schoolId = (await convertHighSchoolIdToSchoolId(location.high_school_id)) || undefined;
          } else if (location.raw_data?.high_school_id) {
            schoolId = (await convertHighSchoolIdToSchoolId(location.raw_data.high_school_id)) || undefined;
          }
        }
        
        if (schoolId) {
          const result = await fetchHighSchoolAthletes(
            schoolId,
            'fb',
            userDetails.customer_id,
            { page: 1, limit: 100 }
          );
          
          if (result.data) {
            // Sort by athletic projection first, then grad_year (same as Popover)
            const projectionOrder = [
              'FBS P4 - Top half',
              'FBS P4',
              'FBS G5 - Top half',
              'FBS G5',
              'FCS - Full Scholarship',
              'FCS',
              'D2 - Top half',
              'D2',
              'D3 - Top half',
              'D3',
              'D3 Walk-on'
            ];
            
            const sortedAthletes = result.data.sort((a: any, b: any) => {
              // First sort by athletic projection
              const indexA = projectionOrder.indexOf(a.athleticProjection || '');
              const indexB = projectionOrder.indexOf(b.athleticProjection || '');
              
              if (indexA !== -1 && indexB !== -1) {
                if (indexA !== indexB) {
                  return indexA - indexB;
                }
              } else if (indexA !== -1) {
                return -1;
              } else if (indexB !== -1) {
                return 1;
              } else if (a.athleticProjection && b.athleticProjection) {
                const cmp = a.athleticProjection.localeCompare(b.athleticProjection);
                if (cmp !== 0) return cmp;
              }
              
              // Then sort by grad_year
              const yearA = parseInt(a.gradYear) || 0;
              const yearB = parseInt(b.gradYear) || 0;
              return yearA - yearB;
            });
            
            // Limit to 4 athletes
            setAthletes(sortedAthletes.slice(0, 4));
          }
        }
      } catch (error) {
        console.error('Error fetching athletes for SortableItem:', error);
      }
    };

      fetchAthletes();
    }, [location.school_id, location.high_school_id, location.raw_data?.high_school_id, location.raw_data, hasFootballPackage, userDetails?.customer_id, dataSource]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="cursor-move"
      {...attributes}
      {...listeners}
    >
      <SchoolCard
        school={location}
        hasFootballPackage={hasFootballPackage}
        index={index}
        showDeleteButton={true}
        onDelete={() => onRemove(index)}
        showAthletes={true}
        athletes={athletes}
        routeInfo={routeInfo}
        totalLocations={totalLocations}
        dataSource={dataSource}
      />
    </div>
  );
}


export default function MapPage() {
  const searchParams = useSearchParams();
  const dataSource = searchParams?.get('dataSource') as 'high_schools' | 'hs_athletes' | null;
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [storedSchoolData, setStoredSchoolData] = useState<School[]>([]);
  const [locations, setLocations] = useState<School[]>([]);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [schoolAthletes, setSchoolAthletes] = useState<{ [key: number]: any[] }>({});
  const mapContentRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const printComponentRef = useRef<HighSchoolPrintComponentRef>(null);
  const router = useRouter();
  const userDetails = useUser();
  const { activeCustomerId } = useCustomer();
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [minAthleticLevel, setMinAthleticLevel] = useState('D3');
  const [minGradYear, setMinGradYear] = useState('2025');
  const [isPrinting, setIsPrinting] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [addressLabel, setAddressLabel] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const addressInputRef = useRef<any>(null);
  const [savedJourneys, setSavedJourneys] = useState<SavedJourney[]>([]);
  const [journeyName, setJourneyName] = useState('');
  const [isLoadingJourneys, setIsLoadingJourneys] = useState(false);
  const savedJourneysContainerRef = useRef<HTMLDivElement>(null);
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Add this useEffect to track when the map is fully loaded
  useEffect(() => {
    if (isLoaded && !loadError) {
      setIsMapLoaded(true);
    }
  }, [isLoaded, loadError]);

  // Load saved journeys
  useEffect(() => {
    const loadSavedJourneys = async () => {
      if (!activeCustomerId) return;
      
      setIsLoadingJourneys(true);
      try {
        const dbJourneys = await fetchJourneys(activeCustomerId);
        const convertedJourneys: SavedJourney[] = dbJourneys.map((journey: JourneyDB) => ({
          id: journey.id,
          name: journey.name,
          journeyDetails: journey.journey_details,
          createdAt: journey.created_at
        }));
        setSavedJourneys(convertedJourneys);
      } catch (error) {
        console.error('Error loading saved journeys:', error);
      } finally {
        setIsLoadingJourneys(false);
      }
    };

    loadSavedJourneys();
  }, [activeCustomerId]);

  // Handle saving a journey
  const handleSaveJourney = async () => {
    if (!journeyName.trim()) {
      message.warning('Please enter a journey name');
      return;
    }

    if (!activeCustomerId || !userDetails?.id) {
      message.error('Unable to save journey: missing customer or user information');
      return;
    }

    if (locations.length === 0) {
      message.warning('Please add at least one location to save a journey');
      return;
    }

    try {
      // Store all data needed to recreate the journey
      const journeyDetails = {
        locations: locations.map(loc => ({
          ...loc,
          position: loc.position ? {
            lat: loc.position.lat,
            lng: loc.position.lng
          } : undefined
        })),
        routeInfo: routeInfo ? {
          totalDistance: routeInfo.totalDistance,
          totalTime: routeInfo.totalTime,
          legs: routeInfo.legs
        } : null,
        storedSchoolData: storedSchoolData
      };

      const dbJourney = await saveJourney(
        activeCustomerId,
        userDetails.id,
        journeyName.trim(),
        journeyDetails
      );

      const newJourney: SavedJourney = {
        id: dbJourney.id,
        name: dbJourney.name,
        journeyDetails: dbJourney.journey_details,
        createdAt: dbJourney.created_at
      };

      setSavedJourneys(prev => [newJourney, ...prev]);
      setJourneyName('');
      message.success('Journey saved successfully');
    } catch (error) {
      console.error('Error saving journey:', error);
      message.error('Failed to save journey');
    }
  };

  // Handle deleting a journey
  const handleDeleteJourney = async (journeyId: string | number) => {
    if (typeof journeyId !== 'number') {
      message.error('Invalid journey ID');
      return;
    }

    try {
      await deleteJourney(journeyId);
      setSavedJourneys(prev => prev.filter(j => j.id !== journeyId));
      message.success('Journey deleted successfully');
    } catch (error) {
      console.error('Error deleting journey:', error);
      message.error('Failed to delete journey');
    }
  };

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.places) return;

    const initializeAutocomplete = () => {
      if (autocompleteRef.current) return; // Already initialized

      // Try to find the input element by ID or class
      const inputId = 'address-autocomplete-input';
      let inputElement: HTMLInputElement | null = null;

      // First try to get from ref
      if (addressInputRef.current) {
        const refElement = addressInputRef.current.input || 
                          addressInputRef.current.nativeElement || 
                          addressInputRef.current;
        if (refElement && refElement instanceof HTMLInputElement) {
          inputElement = refElement;
        } else if (refElement && typeof refElement === 'object' && 'focus' in refElement) {
          // Try to find the actual input inside
          const actualInput = (refElement as any).querySelector?.('input') || 
                            document.querySelector(`input[value="${addressInput}"]`);
          if (actualInput instanceof HTMLInputElement) {
            inputElement = actualInput;
          }
        }
      }

      // If still not found, try to find by ID
      if (!inputElement) {
        inputElement = document.getElementById(inputId) as HTMLInputElement;
      }

      // If still not found, try to find by searching for the input near our component
      if (!inputElement) {
        const inputs = document.querySelectorAll('input[placeholder="Enter Address"]');
        if (inputs.length > 0) {
          inputElement = inputs[inputs.length - 1] as HTMLInputElement;
        }
      }

      if (inputElement && inputElement instanceof HTMLInputElement) {

        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputElement,
          {
            fields: ['formatted_address', 'geometry', 'place_id', 'name']
          }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            // Use establishment name if available, otherwise use formatted address
            const defaultLabel = place.name || place.formatted_address;
            setAddressInput(place.formatted_address);
            setSelectedAddress(place.formatted_address);
            setAddressLabel(defaultLabel);
            // Open the modal when an address is selected
            setAddressModalVisible(true);
          }
        });
      }
    };

    // Try immediately
    initializeAutocomplete();

    // Also try after a short delay in case the input isn't rendered yet
    const timeoutId = setTimeout(initializeAutocomplete, 100);

    return () => {
      clearTimeout(timeoutId);
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, loadError]);

  const geocodeAddress = async (
    address: string,
    schoolName: string = ""
  ): Promise<School | null> => {
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
          const schoolInfo = storedSchoolData.find(
            (item) => item.address === address
          );
          school = schoolInfo?.school || "Unknown School";
        }

        // Debug log removed(`Geocoding ${address}, school: ${school}`);

        // Find the corresponding school info for all additional data
        const schoolInfo = storedSchoolData.find(
          (item) => item.address === address
        );

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
          record_2025: schoolInfo?.record_2025,
          raw_data: schoolInfo?.raw_data,
        };
      }
      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  };

  const updateRouteInfo = (result: google.maps.DirectionsResult) => {
    const legs = result.routes[0].legs;
    const totalTimeSeconds = legs.reduce(
      (sum, leg) => sum + (leg.duration?.value || 0),
      0
    );
    const totalDistanceMeters = legs.reduce(
      (sum, leg) => sum + (leg.distance?.value || 0),
      0
    );

    setRouteInfo({
      totalTime: formatDuration(totalTimeSeconds),
      totalDistance: formatDistance(totalDistanceMeters),
      legs: legs.map((leg) => ({
        duration: leg.duration?.text || "",
        distance: leg.distance?.text || "",
      })),
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

  const calculateRoute = useCallback(
    async (locs: School[]) => {
      if (
        !locs.length ||
        !isLoaded ||
        !isMapLoaded ||
        !window.google ||
        !window.google.maps
      )
        return;

      try {
        const directionsService = new window.google.maps.DirectionsService();

        if (locs.length >= 2) {
          const origin = locs[0].position || { lat: 0, lng: 0 };
          const destination = locs[locs.length - 1].position || {
            lat: 0,
            lng: 0,
          };
          const waypoints = locs.slice(1, -1).map((loc) => ({
            location: new window.google.maps.LatLng(
              loc.position?.lat || 0,
              loc.position?.lng || 0
            ),
            stopover: true,
          }));

          const result = await directionsService.route({
            origin: new window.google.maps.LatLng(origin.lat, origin.lng),
            destination: new window.google.maps.LatLng(
              destination.lat,
              destination.lng
            ),
            waypoints: waypoints,
            optimizeWaypoints: false,
            travelMode: window.google.maps.TravelMode.DRIVING,
          });

          setDirections(result);
          updateRouteInfo(result);
        }
      } catch (error) {
        console.error("Error calculating route:", error);
      }
    },
    [isLoaded, isMapLoaded]
  );

  // Handle loading a journey
  const handleLoadJourney = useCallback((journeyDetails: Record<string, any>) => {
    try {
      if (journeyDetails.locations && Array.isArray(journeyDetails.locations)) {
        // Restore locations
        const restoredLocations = journeyDetails.locations.map((loc: any) => ({
          ...loc,
          position: loc.position ? {
            lat: loc.position.lat,
            lng: loc.position.lng
          } : undefined
        }));
        setLocations(restoredLocations);

        // Restore stored school data if available
        if (journeyDetails.storedSchoolData) {
          setStoredSchoolData(journeyDetails.storedSchoolData);
        }

        // Restore route info if available
        if (journeyDetails.routeInfo) {
          setRouteInfo(journeyDetails.routeInfo);
        }

        // Recalculate route if we have locations with positions
        if (restoredLocations.length > 1 && restoredLocations.every(loc => loc.position)) {
          calculateRoute(restoredLocations);
        }

        message.success('Journey loaded successfully');
      }
    } catch (error) {
      console.error('Error loading journey:', error);
      message.error('Failed to load journey');
    }
  }, [calculateRoute]);

  const optimizeRoute = async () => {
    if (
      locations.length < 2 ||
      !isLoaded ||
      !isMapLoaded ||
      !window.google ||
      !window.google.maps
    )
      return;
    setIsOptimizing(true);

    try {
      const directionsService = new window.google.maps.DirectionsService();

      const allWaypoints = locations.slice(1).map((loc) => ({
        location: new window.google.maps.LatLng(
          loc.position?.lat || 0,
          loc.position?.lng || 0
        ),
        stopover: true,
      }));

      const result = await directionsService.route({
        origin: new window.google.maps.LatLng(
          locations[0].position?.lat || 0,
          locations[0].position?.lng || 0
        ),
        destination: new window.google.maps.LatLng(
          locations[0].position?.lat || 0,
          locations[0].position?.lng || 0
        ),
        waypoints: allWaypoints,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });

      if (result.routes[0].waypoint_order) {
        const waypointOrder = result.routes[0].waypoint_order;

        const optimizedLocations = [
          ...waypointOrder.map((index) => locations[index + 1]),
          locations[0],
        ];

        let shortestDistance = Number.MAX_VALUE;
        let bestRotation = 0;

        for (let i = 0; i < optimizedLocations.length; i++) {
          const rotated = [
            ...optimizedLocations.slice(i),
            ...optimizedLocations.slice(0, i),
          ];

          const routeResult = await directionsService.route({
            origin: new window.google.maps.LatLng(
              rotated[0].position?.lat || 0,
              rotated[0].position?.lng || 0
            ),
            destination: new window.google.maps.LatLng(
              rotated[rotated.length - 1].position?.lat || 0,
              rotated[rotated.length - 1].position?.lng || 0
            ),
            waypoints: rotated.slice(1, -1).map((loc) => ({
              location: new window.google.maps.LatLng(
                loc.position?.lat || 0,
                loc.position?.lng || 0
              ),
              stopover: true,
            })),
            optimizeWaypoints: false,
            travelMode: window.google.maps.TravelMode.DRIVING,
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
          ...optimizedLocations.slice(0, bestRotation),
        ];

        setLocations(finalOrder);
        setSelectedAddresses(finalOrder.map((loc) => loc.address));

        const finalRoute = await directionsService.route({
          origin: new window.google.maps.LatLng(
            finalOrder[0].position?.lat || 0,
            finalOrder[0].position?.lng || 0
          ),
          destination: new window.google.maps.LatLng(
            finalOrder[finalOrder.length - 1].position?.lat || 0,
            finalOrder[finalOrder.length - 1].position?.lng || 0
          ),
          waypoints: finalOrder.slice(1, -1).map((loc) => ({
            location: new window.google.maps.LatLng(
              loc.position?.lat || 0,
              loc.position?.lng || 0
            ),
            stopover: true,
          })),
          optimizeWaypoints: false,
          travelMode: window.google.maps.TravelMode.DRIVING,
        });

        setDirections(finalRoute);
      }
    } catch (error) {
      console.error("Error optimizing route:", error);
    }
    setIsOptimizing(false);
  };

  const reverseOrder = () => {
    const reversedLocations = [...locations].reverse();
    setLocations(reversedLocations);
    setSelectedAddresses(reversedLocations.map((loc) => loc.address));
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
      const newAddresses = newLocations.map((loc) => loc.address);
      setSelectedAddresses(newAddresses);

      calculateRoute(newLocations);
    }
  };

  const handleRemoveLocation = (index: number) => {
    const newLocations = [...locations];
    newLocations.splice(index, 1);
    setLocations(newLocations);

    // Update selected addresses
    const newAddresses = newLocations.map((loc) => loc.address);
    setSelectedAddresses(newAddresses);
    
    // Update localStorage
    localStorage.setItem("selectedAddresses", JSON.stringify(newAddresses));
    if (storedSchoolData.length > 0) {
      const updatedSchoolData = storedSchoolData.filter((_, i) => i !== index);
      localStorage.setItem("schoolData", JSON.stringify(updatedSchoolData));
      setStoredSchoolData(updatedSchoolData);
    }

    if (newLocations.length >= 2) {
      calculateRoute(newLocations);
    } else {
      setDirections(null);
      setRouteInfo(null);
    }
  };

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const addresses = localStorage.getItem("selectedAddresses");
        const schoolDataStr = localStorage.getItem("schoolData");

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
          console.error("Error parsing school data:", e);
        }

        setStoredSchoolData(schoolData);

        // Wait for state to update before proceeding
        await new Promise((resolve) => setTimeout(resolve, 0));

        const geocodedLocations = await Promise.all(
          parsedAddresses.map(async (address: string) => {
            // Find matching school info directly
            const schoolInfo = schoolData.find((s) => s.address === address);

            // Check if this is an athlete location (has athlete data in raw_data)
            const hasAthleteData = schoolInfo?.raw_data && (schoolInfo.raw_data as any).athlete_name;
            
            // Only fetch fresh school data if this is NOT an athlete location
            // Athlete locations should preserve their raw_data with athlete information
            let freshSchoolData: School | null = null;
            if (!hasAthleteData) {
              if (schoolInfo?.school_id) {
                // We have school_id, refresh data using the shared utility
                try {
                  freshSchoolData = await fetchSchoolDataFromSchoolId(schoolInfo.school_id);
                } catch (error) {
                  console.error("Error fetching fresh school data:", error);
                }
              } else if (schoolInfo?.high_school_id) {
                // Convert high_school_id to school_id and fetch
                try {
                  freshSchoolData = await fetchSchoolDataFromHighSchoolId(schoolInfo.high_school_id);
                } catch (error) {
                  console.error("Error fetching fresh school data:", error);
                }
              } else if (schoolInfo?.raw_data?.high_school_id) {
                // Last fallback: use raw_data.high_school_id
                try {
                  freshSchoolData = await fetchSchoolDataFromHighSchoolId(schoolInfo.raw_data.high_school_id);
                } catch (error) {
                  console.error("Error fetching fresh school data:", error);
                }
              }
            }

            // Use fresh data if available, otherwise fall back to stored data
            // Merge fresh data with stored data to preserve position and other map-specific fields
            // IMPORTANT: Preserve raw_data from schoolInfo if it exists (contains athlete data)
            const finalSchoolData = freshSchoolData ? {
              ...freshSchoolData,
              // Preserve position if it exists in stored data
              position: schoolInfo?.position || freshSchoolData.position,
              // Preserve raw_data from schoolInfo if it exists (for athlete data)
              raw_data: schoolInfo?.raw_data || freshSchoolData.raw_data,
            } : schoolInfo;

            // Get geocoded location with position data
            const geocodeResponse = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                address
              )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const geocodeData = await geocodeResponse.json();

            if (!geocodeData.results || !geocodeData.results[0]) {
              console.error("No geocode results for address:", address);
              return null;
            }

            // Combine the geocode position with all the school metadata from fresh data
            // Use freshSchoolData (from shared utility) which has all the latest fields
            // Spread finalSchoolData first (has all the latest data), then override with map-specific fields
            // IMPORTANT: Preserve raw_data from schoolInfo if it exists (contains athlete data)
            return {
              ...(finalSchoolData || schoolInfo || {}),
              address,
              position: geocodeData.results[0].geometry.location,
              // Ensure school name is set
              school: finalSchoolData?.school || schoolInfo?.school || "Unknown School",
              // Ensure county and state are preserved (from fresh data or stored data)
              county: finalSchoolData?.county || schoolInfo?.county,
              state: finalSchoolData?.state || schoolInfo?.state,
              // Ensure IDs are preserved
              school_id: finalSchoolData?.school_id || schoolInfo?.school_id,
              high_school_id: finalSchoolData?.high_school_id || finalSchoolData?.raw_data?.high_school_id || schoolInfo?.high_school_id || schoolInfo?.raw_data?.high_school_id,
              // CRITICAL: Preserve raw_data from schoolInfo (contains athlete data for athlete cards)
              raw_data: schoolInfo?.raw_data || finalSchoolData?.raw_data,
            };
          })
        );

        const validLocations = geocodedLocations.filter(
          (loc): loc is School => loc !== null
        );
        setLocations(validLocations);
        calculateRoute(validLocations);
      } catch (err) {
        console.error("Error loading addresses:", err);
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
      const addresses = locations.map((loc) => loc.address);
      localStorage.setItem("selectedAddresses", JSON.stringify(addresses));

      // Also update the school data to match the current order
      const schoolData = locations.map((loc) => ({
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
        record_2025: loc.record_2025,
        raw_data: storedSchoolData.find((s) => s.address === loc.address)
          ?.raw_data,
      }));

      localStorage.setItem("schoolData", JSON.stringify(schoolData));
    }
  }, [locations, storedSchoolData]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ height: 'calc(100vh - 64px)', margin: '-20px', padding: '0' }}>
      {/* Main content with scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full">
          {" "}
          {/* Added pb-20 for bottom padding */}
          {/* Controls section - moved from fixed header to scrollable content */}
          <div className="flex items-center justify-between bg-white p-4 mb-3" style={{ position: 'relative', zIndex: 100 }}>
            <Button type="link" onClick={() => router.back()} className="!text-[20px] !font-semibold !leading-1">
              <i className="icon-svg-left-arrow"></i>
              Map Route
            </Button>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="text"
                disabled={isOptimizing || locations.length < 2}
                onClick={optimizeRoute}
              >
                <i className="icon-svg-optimize"></i>
                {isOptimizing ? <>Optimizing...</> : <>Optimize Route</>}
              </Button>

              <Button
                type="text"
                disabled={locations.length < 2}
                onClick={reverseOrder}
              >
                <i className="icon-svg-route"></i>
                Reverse Route
              </Button>

              <Button 
                type="text" 
                onClick={() => setPrintModalVisible(true)}
                disabled={locations.length === 0 || !hasFootballPackage}
                className="relative"
              >
                <div className="flex items-center">
                  <i className="icon-svg-print"></i>
                  <span>Print PDF</span>
                </div>
                {isPrinting && (
                  <div className="absolute bottom-0 left-0 right-0 text-[8px] text-amber-600 italic leading-none text-center">
                    Last print still in process...
                  </div>
                )}
              </Button>
              <HighSchoolPrintComponent
                ref={printComponentRef}
                locations={locations}
                storedSchoolData={storedSchoolData}
                pdfContentRef={pdfContentRef}
                hasFootballPackage={hasFootballPackage}
                minAthleticLevel={minAthleticLevel}
                minGradYear={minGradYear}
                hideUI={true}
              />
              <Modal
                title="Print PDF Settings"
                open={printModalVisible}
                onOk={async () => {
                  if (printComponentRef.current) {
                    setIsPrinting(true);
                    setPrintModalVisible(false);
                    try {
                      await printComponentRef.current.handlePrint();
                    } finally {
                      setIsPrinting(false);
                    }
                  }
                }}
                onCancel={() => setPrintModalVisible(false)}
                okText="Print"
                cancelText="Cancel"
                okButtonProps={{
                  disabled: locations.length === 0
                }}
              >
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col">
                    <label htmlFor="modalMinAthleticLevel" className="text-sm font-medium text-gray-700 mb-2">
                      Min Athletic Level
                    </label>
                    <Select
                      id="modalMinAthleticLevel"
                      value={minAthleticLevel}
                      onChange={(value) => setMinAthleticLevel(value)}
                      className="w-full"
                    >
                      <Select.Option value="D3">D3</Select.Option>
                      <Select.Option value="D2">D2</Select.Option>
                      <Select.Option value="FCS">FCS</Select.Option>
                      <Select.Option value="G5">G5</Select.Option>
                      <Select.Option value="P4">P4</Select.Option>
                    </Select>
                  </div>
                  
                  <div className="flex flex-col">
                    <label htmlFor="modalMinGradYear" className="text-sm font-medium text-gray-700 mb-2">
                      Min Grad Year
                    </label>
                    <Select
                      id="modalMinGradYear"
                      value={minGradYear}
                      onChange={(value) => setMinGradYear(value)}
                      className="w-full"
                    >
                      <Select.Option value="2025">2025</Select.Option>
                      <Select.Option value="2026">2026</Select.Option>
                      <Select.Option value="2027">2027</Select.Option>
                      <Select.Option value="2028">2028</Select.Option>
                    </Select>
                  </div>
                </div>
              </Modal>
              <Input
                ref={addressInputRef}
                id="address-autocomplete-input"
                placeholder="Enter Address"
                className="custom-input"
                style={{ width: "180px" }}
                value={addressInput}
                onChange={(e) => {
                  setAddressInput(e.target.value);
                  // Clear selectedAddress when user types manually (not from autocomplete)
                  if (!e.target.value) {
                    setSelectedAddress('');
                    setAddressLabel('');
                  }
                }}
                onPressEnter={() => {
                  if (selectedAddress || addressInput) {
                    setAddressModalVisible(true);
                    setAddressLabel(selectedAddress || addressInput);
                  }
                }}
                suffix={
                  <i 
                    className="icon-svg-add-location cursor-pointer" 
                    onClick={() => {
                      if (selectedAddress || addressInput) {
                        setAddressModalVisible(true);
                        setAddressLabel(selectedAddress || addressInput);
                      }
                    }}
                  />
                }
              />
              <Modal
                title="Add Location"
                open={addressModalVisible}
                onOk={async () => {
                  if (!selectedAddress && !addressInput) {
                    return;
                  }
                  
                  const addressToAdd = selectedAddress || addressInput;
                  const label = addressLabel || addressToAdd;
                  
                  // Geocode the address
                  try {
                    const geocodeResponse = await fetch(
                      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                        addressToAdd
                      )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                    );
                    const geocodeData = await geocodeResponse.json();
                    
                    if (geocodeData.results && geocodeData.results[0]) {
                      const result = geocodeData.results[0];
                      const position = {
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng,
                      };
                      
                      // Create a new location object
                      const newLocation: School = {
                        school: label,
                        address: addressToAdd,
                        position: position,
                        county: '',
                        state: '',
                        isCustomAddress: true, // Mark as manually added address
                      };
                      
                      // Add to locations (at the bottom)
                      const newLocations = [...locations, newLocation];
                      setLocations(newLocations);
                      
                      // Update selected addresses
                      const newAddresses = [...selectedAddresses, addressToAdd];
                      setSelectedAddresses(newAddresses);
                      
                      // Update localStorage
                      localStorage.setItem("selectedAddresses", JSON.stringify(newAddresses));
                      
                      // Recalculate route if we have 2+ locations
                      if (newLocations.length >= 2) {
                        calculateRoute(newLocations);
                      }
                      
                      // Reset form
                      setAddressInput('');
                      setSelectedAddress('');
                      setAddressLabel('');
                      setAddressModalVisible(false);
                    } else {
                      alert('Could not find the address. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error geocoding address:', error);
                    alert('Error adding location. Please try again.');
                  }
                }}
                onCancel={() => {
                  setAddressModalVisible(false);
                  setAddressLabel('');
                }}
                okText="Add"
                cancelText="Cancel"
              >
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">
                      Address
                    </label>
                    <div className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                      {selectedAddress || addressInput}
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-2">
                      Label (optional)
                    </label>
                    <Input
                      placeholder="Enter a label for this location"
                      value={addressLabel}
                      onChange={(e) => setAddressLabel(e.target.value)}
                      onPressEnter={() => {
                        // Trigger the OK handler
                        const okButton = document.querySelector('.ant-modal-footer .ant-btn-primary') as HTMLButtonElement;
                        if (okButton) okButton.click();
                      }}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      Leave blank to use the address as the label
                    </div>
                  </div>
                </div>
              </Modal>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }} ref={savedJourneysContainerRef}>
                <SavedJourneys
                  onLoadJourney={handleLoadJourney}
                  onSaveJourney={(journey) => {
                    // This is handled by handleSaveJourney
                  }}
                  onDeleteJourney={handleDeleteJourney}
                  savedJourneys={savedJourneys}
                />
                <Input
                  placeholder="Name Journey"
                  className="custom-input"
                  style={{ width: "140px" }}
                  value={journeyName}
                  onChange={(e) => setJourneyName(e.target.value)}
                  onPressEnter={handleSaveJourney}
                />
                <Button 
                  type="primary" 
                  onClick={handleSaveJourney}
                  disabled={!journeyName.trim() || locations.length === 0}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
          {/* PDF content begins here - this is what we'll capture for the PDF */}
          <div ref={pdfContentRef}>
            {isLoading || !isLoaded || !isMapLoaded ? (
              <div className="text-center py-8">Loading map...</div>
            ) : (
              <div className="space-y-6 relative overflow-hidden">
                <div className="bg-white p-4 overflow-hidden relative">
                  <GoogleMap
                    mapContainerStyle={{
                      ...mapContainerStyle,
                      height: "545px",
                    }}
                    zoom={4}
                    center={center}
                    options={{
                      mapTypeControl: true,
                      streetViewControl: true,
                      mapTypeId: "roadmap",
                      fullscreenControl: true,
                      zoomControl: true,
                      gestureHandling: "greedy",
                    }}
                  >
                    {directions ? (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: "#1C1D4D",
                            strokeWeight: 4,
                            strokeOpacity: 1,
                          },
                        }}
                      />
                    ) : null}
                    {locations.map(
                      (location, index) =>
                        location.position && (
                          <Fragment key={`marker-${index}`}>
                            {/* Render different pins based on whether location has athlete data */}
                            {(() => {
                              // Check if this location has athlete data in raw_data
                              // This allows mixed data (both schools and athletes in the same route)
                              const hasAthleteData = location.raw_data && (location.raw_data as any).athlete_name;
                              // Use athlete pin only if location has athlete data (ignore dataSource for mixed routes)
                              const isAthletePin = hasAthleteData;
                              
                              return isAthletePin ? (
                              // Athlete pin
                              (() => {
                                const athleteData = (location.raw_data || {}) as any;
                                const projection = athleteData.athlete_athletic_projection || '';
                                
                                // Color mapping based on athletic projection
                                const projectionColorMap: Record<string, string> = {
                                  'FBS P4 - Top half': '#22C55E',
                                  'FBS P4': '#4ADE80',
                                  'FBS G5 - Top half': '#86EFAC',
                                  'FBS G5': '#BEF264',
                                  'FCS - Full Scholarship': '#FDE047',
                                  'FCS': '#FCD34D',
                                  'D2 - Top half': '#FBBF24',
                                  'D2': '#FB923C',
                                  'D3 - Top half': '#F87171',
                                  'D3': '#FCA5A5',
                                  'D3 Walk-on': '#9CA3AF',
                                };
                                
                                const backgroundColor = projection 
                                  ? (projectionColorMap[projection] || '#9CA3AF')
                                  : '#9CA3AF';
                                
                                const isGreenMarker = backgroundColor === '#22C55E' || backgroundColor === '#4ADE80' || backgroundColor === '#86EFAC';
                                const dotZIndex = isGreenMarker ? 1002 : 1000;
                                const iconZIndex = isGreenMarker ? 1003 : 1001;
                                
                                return (
                                  <OverlayViewF
                                    position={location.position}
                                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                    getPixelPositionOffset={(width, height) => ({
                                      x: -width / 2,
                                      y: -height / 2,
                                    })}
                                  >
                                    <Popover
                                      content={
                                        <div className="space-y-2 min-w-[400px]">
                                          <div className="mb-4">
                                            <h4 className="!text-[24px] font-semibold text-sm mb-3 flex items-center justify-between">
                                              {athleteData.athlete_name || location.school}
                                            </h4>
                                            <div className="text-[14px] text-gray-600 w-[190px] !leading-[20px]">
                                              {location.address} <br />
                                              {(location.county || location.state) && (
                                                <span>
                                                  {location.county && <span>{location.county}</span>}
                                                  {location.county && location.state && <span> | </span>}
                                                  {location.state && <span>{location.state}</span>}
                                                </span>
                                              )}
                                              {athleteData.athlete_cell_phone && (
                                                <>
                                                  <br />
                                                  <a href={`tel:${String(athleteData.athlete_cell_phone).replace(/\D/g, '')}`} className="text-[14px] text-blue-600">
                                                    {formatPhoneNumber(String(athleteData.athlete_cell_phone))}
                                                  </a>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      }
                                      title={null}
                                      trigger="click"
                                    >
                                      <div
                                        className="flex items-center justify-start gap-1 border-[4px] border-solid border-[#1C1D4D] rounded-full pr-2 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative"
                                        style={{ minWidth: "max-content", height: "32px", paddingRight: "8px", backgroundColor }}
                                      >
                                        {/* Dot behind the athlete icon */}
                                        <div 
                                          className="absolute flex items-center justify-center"
                                          style={{
                                            left: "-3px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            width: "28px",
                                            height: "28px",
                                            zIndex: dotZIndex,
                                          }}
                                        >
                                          <img
                                            src="/svgicons/map-dot.svg"
                                            alt=""
                                            style={{
                                              width: "28px",
                                              height: "28px",
                                            }}
                                          />
                                        </div>
                                        <div 
                                          className="flex items-center justify-center absolute border-[4px] border-solid border-[#1C1D4D] rounded-full overflow-hidden flex-shrink-0"
                                          style={{
                                            left: "-3px",
                                            top: "50%",
                                            transform: "translateY(-50%)",
                                            width: "26px",
                                            height: "26px",
                                            zIndex: iconZIndex,
                                              background:"#1c1d4d",
                                          }}
                                        >
                                          <img
                                            src={athleteData.athlete_image_url || "/blank-user.svg"}
                                            alt="Athlete"
                                            className="w-full h-full object-cover rounded-full"
                                          />
                                        </div>
                                        <h6 className="flex items-center mb-0 !text-[12px] !font-semibold !leading-[1] whitespace-nowrap" style={{ width: "130px", marginLeft: "26px" }}>
                                          <span className="truncate block">
                                            {athleteData.athlete_name || location.school}
                                          </span>
                                        </h6>
                                      </div>
                                    </Popover>
                                  </OverlayViewF>
                                );
                              })()
                            ) : (
                              // High school pin
                              <>
                                <MarkerF
                                  position={location.position}
                                  label={{
                                    text: `${index + 1}`,
                                    color: "#1C1D4D",
                                    fontWeight: "bold",
                                  }}
                                  icon={{
                                    url: "/svgicons/map-dot.svg",
                                    scaledSize:
                                      window.google && window.google.maps
                                        ? new window.google.maps.Size(28, 28)
                                        : undefined,
                                    anchor:
                                      window.google && window.google.maps
                                        ? new window.google.maps.Point(14, 14)
                                        : undefined,
                                  }}
                                  title={`${index + 1}. ${location.school}`}
                                />

                                {/* School label */}
                                <OverlayViewF
                                  position={location.position}
                                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                                  getPixelPositionOffset={(width, height) => ({
                                    x: -width / 2,
                                    y: -height - 30,
                                  })}
                                >
                                  <Popover
                                    content={
                                      <div className="space-y-2 min-w-[400px]">
                                        <div className="mb-4">
                                          <h4 className="!text-[24px] font-semibold text-sm mb-3 flex items-center justify-between">
                                            {location.school} 
                                          </h4>
                                          <div className="text-[14px] text-gray-600 w-[190px] !leading-[20px]">
                                            {location.address} <br />
                                            {(location.county ||
                                              location.state) && (
                                              <span>
                                                {location.county && (
                                                  <span>{location.county}</span>
                                                )}
                                                {location.county &&
                                                  location.state && <span> | </span>}
                                                {location.state && (
                                                  <span>{location.state}</span>
                                                )}
                                              </span>
                                            )}
                                            {location.ad_email && (
                                              <>
                                                <br />
                                                <a href={`mailto:${location.ad_email}`} className="text-[14px] text-blue-600">{location.ad_email}</a>
                                              </>
                                            )}
                                            {location.school_phone && (
                                              <>
                                                <br />
                                                <a href={`tel:${location.school_phone.replace(/\D/g, '')}`} className="text-[14px] text-blue-600">{formatPhoneNumber(location.school_phone)}</a>
                                              </>
                                            )}                                        
                                          </div>
                                        </div>

                                        {hasFootballPackage && (
                                          <div className="text-xs flex items-center justify-between gap-2 flex-wrap">
                                            {schoolAthletes[index] && schoolAthletes[index].length > 0 ? (
                                              schoolAthletes[index].map((athlete: any, athleteIndex: number) => (
                                                <div key={athleteIndex} className="text-xs flex items-center justify-start gap-2">
                                                  <img
                                                    src={athlete.image_url || "/blank-user.svg"}
                                                    alt={athlete.name || "Athlete"}
                                                    height={50}
                                                    width={50}
                                                    className="rounded-full object-cover"
                                                  />
                                                  <div>
                                                    <h6 className="!text-[14px] !font-semibold !leading-1 mb-0">
                                                      {athlete.name || '-'}
                                                    </h6>
                                                    <span className="!text-[14px] !leading-[16px] mb-0">
                                                      {athlete.athleticProjection || '-'} <br />
                                                      {athlete.gradYear || '-'}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))
                                            ) : schoolAthletes[index] !== undefined ? (
                                              <div className="text-gray-400 text-[12px]">No athletes found</div>
                                            ) : (
                                              <div className="text-gray-400 text-[12px]">Loading athletes...</div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    }
                                    title={null}
                                    trigger="click"
                                    open={popoverOpen[index]}
                                    onOpenChange={async (open) => {
                                      setPopoverOpen({
                                        ...popoverOpen,
                                        [index]: open,
                                      });
                                      
                                      // Fetch athletes when popover opens
                                      if (open && userDetails?.customer_id) {
                                        try {
                                          // Check if this is an athlete location - if so, skip fetching athletes
                                          const hasAthleteData = location.raw_data && (location.raw_data as any).athlete_name;
                                          if (hasAthleteData) return;
                                          
                                          // For mixed data, check each location individually
                                          // Use school_id directly if available, otherwise convert from high_school_id
                                          let schoolId: string | undefined = location.school_id;
                                          
                                          // Only try conversion if we don't have school_id and this is not an athlete location
                                          if (!schoolId && !hasAthleteData) {
                                            if (location.high_school_id) {
                                              schoolId = (await convertHighSchoolIdToSchoolId(location.high_school_id)) || undefined;
                                            } else if (location.raw_data?.high_school_id) {
                                              schoolId = (await convertHighSchoolIdToSchoolId(location.raw_data.high_school_id)) || undefined;
                                            }
                                          }
                                          
                                          if (schoolId) {
                                            const result = await fetchHighSchoolAthletes(
                                              schoolId,
                                              'fb',
                                              userDetails.customer_id,
                                              { page: 1, limit: 100 }
                                            );
                                            
                                            if (result.data) {
                                              // Sort by athletic projection first, then grad_year
                                              const projectionOrder = [
                                                'FBS P4 - Top half',
                                                'FBS P4',
                                                'FBS G5 - Top half',
                                                'FBS G5',
                                                'FCS - Full Scholarship',
                                                'FCS',
                                                'D2 - Top half',
                                                'D2',
                                                'D3 - Top half',
                                                'D3',
                                                'D3 Walk-on'
                                              ];
                                              
                                              const sortedAthletes = result.data.sort((a: any, b: any) => {
                                                // First sort by athletic projection
                                                const indexA = projectionOrder.indexOf(a.athleticProjection || '');
                                                const indexB = projectionOrder.indexOf(b.athleticProjection || '');
                                                
                                                if (indexA !== -1 && indexB !== -1) {
                                                  if (indexA !== indexB) {
                                                    return indexA - indexB;
                                                  }
                                                } else if (indexA !== -1) {
                                                  return -1;
                                                } else if (indexB !== -1) {
                                                  return 1;
                                                } else if (a.athleticProjection && b.athleticProjection) {
                                                  const cmp = a.athleticProjection.localeCompare(b.athleticProjection);
                                                  if (cmp !== 0) return cmp;
                                                }
                                                
                                                // Then sort by grad_year
                                                const yearA = parseInt(a.gradYear) || 0;
                                                const yearB = parseInt(b.gradYear) || 0;
                                                return yearA - yearB;
                                              });
                                              
                                              // Limit to 2-3 athletes that fit
                                              setSchoolAthletes({
                                                ...schoolAthletes,
                                                [index]: sortedAthletes.slice(0, 2)
                                              });
                                            }
                                          }
                                        } catch (error) {
                                          console.error('Error fetching athletes:', error);
                                        }
                                      }
                                    }}
                                  >
                                    {(() => {
                                      // Get D1 player producing score and determine color
                                      const d1Score = location.score_d1_producing;
                                      const score = d1Score !== null && d1Score !== undefined ? parseInt(String(d1Score)) : 0;
                                      
                                      const colorMap: Record<number, string> = {
                                        0: '#9CA3AF',
                                        1: '#FCA5A5',
                                        2: '#F87171',
                                        3: '#FB923C',
                                        4: '#FBBF24',
                                        5: '#FCD34D',
                                        6: '#FDE047',
                                        7: '#BEF264',
                                        8: '#86EFAC',
                                        9: '#4ADE80',
                                        10: '#22C55E',
                                      };
                                      
                                      const clampedScore = Math.max(0, Math.min(10, score));
                                      const backgroundColor = colorMap[clampedScore] || '#9CA3AF';
                                      
                                      return (
                                        <div
                                          className="flex items-center justify-start gap-1 border-[4px] border-solid border-[#1C1D4D] rounded-full pr-2 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity relative"
                                          style={{ minWidth: "max-content", height: "32px", paddingRight: "8px", backgroundColor }}
                                        >
                                          {/* Dot behind the school icon */}
                                          <div 
                                            className="absolute flex items-center justify-center"
                                            style={{
                                              left: "-3px",
                                              top: "50%",
                                              transform: "translateY(-50%)",
                                              width: "28px",
                                              height: "28px",
                                              zIndex: 1000,
                                            }}
                                          >
                                            <img
                                              src="/svgicons/map-dot.svg"
                                              alt=""
                                              style={{
                                                width: "28px",
                                                height: "28px",
                                              }}
                                            />
                                          </div>
                                          <div 
                                            className="flex items-center justify-center absolute border-[4px] border-solid border-[#1C1D4D] rounded-full overflow-hidden flex-shrink-0"
                                            style={{
                                              left: "-3px",
                                              top: "50%",
                                              transform: "translateY(-50%)",
                                              width: "26px",
                                              height: "26px",
                                              zIndex: 1001,
                                              background:"#1c1d4d",
                                            }}
                                          >
                                            <img
                                              src="/blank-hs.svg"
                                              alt="School"
                                              className="w-full h-full object-contain p-0.5"
                                            />
                                          </div>
                                          <h6 className="flex items-center mb-0 !text-[12px] !font-semibold !leading-[1] whitespace-nowrap" style={{ width: "130px", marginLeft: "26px" }}>
                                            <span className="truncate block">
                                              {location.school}
                                            </span>
                                          </h6>
                                        </div>
                                      );
                                    })()}
                                  </Popover>
                                </OverlayViewF>
                              </>
                            );
                            })()}
                          </Fragment>
                        )
                    )}
                  </GoogleMap>
                  {routeInfo && (
                    <div className="text-left p-1.5 bg-white/60 w-[180px] border-2 border-[#1C1D4D] border-solid absolute bottom-[20px] left-[20px] z-10">
                      <div className="text-base font-bold text-gray-700 flex items-center justify-center">
                        <img
                          src="/svgicons/big-flag.svg"
                          alt="X Feed"
                          height={50}
                          className="mr-1.5"
                        />
                        <div className="text-gray-600 mt-0.5 text-right">
                          <h5 className="font-semibold !text-[14px] italic mb-0.5">
                            Total Drive Time
                          </h5>
                          <h3 className="!text-[18px] font-bold italic mb-1">
                            {routeInfo.totalTime}
                          </h3>
                          <h6 className="font-semibold !text-[14px] italic flex items-center justify-end">
                            <img
                              src="/svgicons/mile-car.svg"
                              alt="X Feed"
                              height={16}
                              className="mr-1.5"
                            />
                            {routeInfo.totalDistance}
                          </h6>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <div 
                    className="map-schools-container !mt-[-50px]"
                    style={{ maxWidth: '1400px', width: '100%' }}
                  >
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={locations.map((_, index) => index)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="">
                        {locations.map((location, index) => (
                          <SortableItem
                            key={index}
                            location={location}
                            index={index}
                            routeInfo={routeInfo || undefined}
                            totalLocations={locations.length}
                            onRemove={handleRemoveLocation}
                            userDetails={userDetails}
                            hasFootballPackage={hasFootballPackage}
                            dataSource={dataSource}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  </div>
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
        /* Prevent double scrollbars - only for this page */
        /* Override dashboard layout Content overflow */
        .ant-layout-content {
          overflow: hidden !important;
        }
        body {
          overflow: hidden !important;
        }
        #__next {
          height: 100vh !important;
          overflow: hidden !important;
        }
        .map-schools-container .card-list {
          margin-bottom: 75px !important;
          overflow: visible !important;
        }
        .marker-number {
          font-weight: bold;
          font-size: 14px;
        }
        .mile-car-left {
          width: 40px;
          height: 25px;
          display: inline-block;
          background: url(/svgicons/mile-car.svg);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          flex-shrink: 0;
          margin-right: 8px;
          align-self: center;
        }
        .mile-flage-small {
          background: url(/svgicons/mile-flage.svg);
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          width: 35px;
          height: 40px;
          position: absolute;
          top: -20px;
          right: -35px;
          display: inline-block;
        }
        .mile-line-bottom {
          width: calc(100% + 60px);
          height: 2px;
          border-bottom: 2px dashed #d4d4d4;
          position: absolute;
          bottom: -8px;
          left: -30px;
          z-index: 1;
        }
        .school-label-text {
          background-color: white !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          border: 1px solid #ccc !important;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
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
        /* Google Places Autocomplete dropdown styles */
        .pac-container {
          z-index: 9999 !important;
          border-radius: 4px !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
          margin-top: 4px !important;
          overflow: visible !important;
          width: 400px !important;
          min-width: 400px !important;
        }
        .pac-item {
          padding: 8px 12px !important;
          cursor: pointer !important;
          border-top: 1px solid #e6e6e6 !important;
        }
        .pac-item:first-child {
          border-top: none !important;
        }
        .pac-item:hover {
          background-color: #f5f5f5 !important;
        }
        .pac-item-selected {
          background-color: #e6f7ff !important;
        }
      `}</style>
    </div>
  );
}

const mapContainerStyle = {
  width: "100%",
  height: "600px",
};

const center = {
  lat: 39.8283, // Center of US
  lng: -98.5795,
};

const libraries: Libraries = ["places"];
