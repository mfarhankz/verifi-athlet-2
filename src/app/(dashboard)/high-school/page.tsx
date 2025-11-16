"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  DirectionsRenderer,
  Libraries,
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
import { School } from "@/app/(dashboard)/road-planner/types";
import { useUser, useCustomer } from "@/contexts/CustomerContext";
import { formatPhoneNumber } from "@/utils/utils";
import {
  getPackageIdsBySport,
  fetchHighSchoolAthletes,
  fetchExistingPackagesForCustomer,
} from "@/lib/queries";
import {
  convertHighSchoolIdToSchoolId,
  fetchSchoolDataFromHighSchoolId,
  fetchSchoolDataFromSchoolId,
} from "@/app/(dashboard)/road-planner/utils/schoolDataUtils";
import SchoolCard from "@/app/(dashboard)/road-planner/components/SchoolCard";
import HighSchoolPrintComponent, {
  HighSchoolPrintComponentRef,
} from "@/components/HighSchoolPrintComponent";
import { Button, Select, Popover, Modal, message } from "antd";

// (removed unused helper)

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
}: {
  location: School;
  index: number;
  routeInfo?: RouteInfo;
  totalLocations: number;
  onRemove: (index: number) => void;
  userDetails?: any;
  hasFootballPackage?: boolean;
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

      try {
        // Use school_id directly if available, otherwise convert from high_school_id
        let schoolId: string | undefined = location.school_id;
        if (!schoolId && location.high_school_id) {
          schoolId =
            (await convertHighSchoolIdToSchoolId(location.high_school_id)) ||
            undefined;
        } else if (!schoolId && location.raw_data?.high_school_id) {
          schoolId =
            (await convertHighSchoolIdToSchoolId(
              location.raw_data.high_school_id
            )) || undefined;
        }

        if (schoolId) {
          const result = await fetchHighSchoolAthletes(
            schoolId,
            "fb",
            userDetails.customer_id,
            { page: 1, limit: 100 }
          );

          if (result.data) {
            // Sort by athletic projection first, then grad_year (same as Popover)
            const projectionOrder = [
              "FBS P4 - Top half",
              "FBS P4",
              "FBS G5 - Top half",
              "FBS G5",
              "FCS - Full Scholarship",
              "FCS",
              "D2 - Top half",
              "D2",
              "D3 - Top half",
              "D3",
              "D3 Walk-on",
            ];

            const sortedAthletes = result.data.sort((a: any, b: any) => {
              // First sort by athletic projection
              const indexA = projectionOrder.indexOf(
                a.athleticProjection || ""
              );
              const indexB = projectionOrder.indexOf(
                b.athleticProjection || ""
              );

              if (indexA !== -1 && indexB !== -1) {
                if (indexA !== indexB) {
                  return indexA - indexB;
                }
              } else if (indexA !== -1) {
                return -1;
              } else if (indexB !== -1) {
                return 1;
              } else if (a.athleticProjection && b.athleticProjection) {
                const cmp = a.athleticProjection.localeCompare(
                  b.athleticProjection
                );
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
        console.error("Error fetching athletes for SortableItem:", error);
      }
    };

    fetchAthletes();
  }, [
    location.school_id,
    location.high_school_id,
    location.raw_data?.high_school_id,
    hasFootballPackage,
    userDetails?.customer_id,
  ]);

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
      />
    </div>
  );
}

export default function HighSchoolPage() {
  const [selectedAddresses, setSelectedAddresses] = useState<string[]>([]);
  const [storedSchoolData, setStoredSchoolData] = useState<School[]>([]);
  const [locations, setLocations] = useState<School[]>([]);
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [schoolAthletes, setSchoolAthletes] = useState<{
    [key: number]: any[];
  }>({});
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const printComponentRef = useRef<HighSchoolPrintComponentRef>(null);
  const userDetails = useUser();
  const { activeCustomerId } = useCustomer();
  const [printModalVisible, setPrintModalVisible] = useState(false);
  const [minAthleticLevel, setMinAthleticLevel] = useState("D3");
  const [minGradYear, setMinGradYear] = useState("2025");
  const [isPrinting, setIsPrinting] = useState(false);
  const [hasFootballPackage, setHasFootballPackage] = useState(false);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");

  // Check if the active customer has a football package
  useEffect(() => {
    const checkFootballPackage = async () => {
      if (!activeCustomerId) {
        setHasFootballPackage(false);
        return;
      }

      try {
        // Fetch packages for the active customer
        const customerPackages = await fetchExistingPackagesForCustomer(
          activeCustomerId
        );
        const customerPackageIds = customerPackages.map((pkg: any) =>
          Number(pkg.customer_package_id)
        );

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

  // (removed unused journeys-related logic)

  // (removed unused address autocomplete and geocode helper)

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
  const handleLoadJourney = useCallback(
    (journeyDetails: Record<string, any>) => {
      try {
        if (
          journeyDetails.locations &&
          Array.isArray(journeyDetails.locations)
        ) {
          // Restore locations
          const restoredLocations = journeyDetails.locations.map(
            (loc: any) => ({
              ...loc,
              position: loc.position
                ? {
                    lat: loc.position.lat,
                    lng: loc.position.lng,
                  }
                : undefined,
            })
          );
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
          if (
            restoredLocations.length > 1 &&
            restoredLocations.every((loc) => loc.position)
          ) {
            calculateRoute(restoredLocations);
          }

          message.success("Journey loaded successfully");
        }
      } catch (error) {
        console.error("Error loading journey:", error);
        message.error("Failed to load journey");
      }
    },
    [calculateRoute]
  );

  // (removed unused optimize/reverse helpers)

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

            // Always refresh school data using the shared utility to ensure consistency
            let freshSchoolData: School | null = null;
            if (schoolInfo?.school_id) {
              // We have school_id, refresh data using the shared utility
              try {
                freshSchoolData = await fetchSchoolDataFromSchoolId(
                  schoolInfo.school_id
                );
              } catch (error) {
                console.error("Error fetching fresh school data:", error);
              }
            } else if (schoolInfo?.high_school_id) {
              // Convert high_school_id to school_id and fetch
              try {
                freshSchoolData = await fetchSchoolDataFromHighSchoolId(
                  schoolInfo.high_school_id
                );
              } catch (error) {
                console.error("Error fetching fresh school data:", error);
              }
            } else if (schoolInfo?.raw_data?.high_school_id) {
              // Last fallback: use raw_data.high_school_id
              try {
                freshSchoolData = await fetchSchoolDataFromHighSchoolId(
                  schoolInfo.raw_data.high_school_id
                );
              } catch (error) {
                console.error("Error fetching fresh school data:", error);
              }
            }

            // Use fresh data if available, otherwise fall back to stored data
            // Merge fresh data with stored data to preserve position and other map-specific fields
            const finalSchoolData = freshSchoolData
              ? {
                  ...freshSchoolData,
                  // Preserve position if it exists in stored data
                  position: schoolInfo?.position || freshSchoolData.position,
                }
              : schoolInfo;

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
            return {
              ...(finalSchoolData || schoolInfo || {}),
              address,
              position: geocodeData.results[0].geometry.location,
              // Ensure school name is set
              school:
                finalSchoolData?.school ||
                schoolInfo?.school ||
                "Unknown School",
              // Ensure county and state are preserved (from fresh data or stored data)
              county: finalSchoolData?.county || schoolInfo?.county,
              state: finalSchoolData?.state || schoolInfo?.state,
              // Ensure IDs are preserved
              school_id: finalSchoolData?.school_id || schoolInfo?.school_id,
              high_school_id:
                finalSchoolData?.high_school_id ||
                finalSchoolData?.raw_data?.high_school_id ||
                schoolInfo?.high_school_id ||
                schoolInfo?.raw_data?.high_school_id,
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
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ height: "calc(100vh - 64px)", margin: "-20px", padding: "0" }}
    >
      {/* Main content with scrolling */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full">
          {" "}
          {/* Added pb-20 for bottom padding */}
          {/* Controls section - moved from fixed header to scrollable content */}
          <div
            className="flex items-center justify-between bg-white p-4 mb-3"
            style={{ position: "relative", zIndex: 100 }}
          >
            <div className="flex items-center justify-end gap-2">
              <Button type="text" onClick={() => setViewMode("map")}>
                Map View
              </Button>

              <Button type="text" onClick={() => setViewMode("list")}>
                List View
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
                  disabled: locations.length === 0,
                }}
              >
                <div className="flex flex-col gap-4 py-4">
                  <div className="flex flex-col">
                    <label
                      htmlFor="modalMinAthleticLevel"
                      className="text-sm font-medium text-gray-700 mb-2"
                    >
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
                    <label
                      htmlFor="modalMinGradYear"
                      className="text-sm font-medium text-gray-700 mb-2"
                    >
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

              {/* removed unused Add Location modal */}
            </div>
          </div>
          {/* PDF content begins here - this is what we'll capture for the PDF */}
          <div ref={pdfContentRef}>
            {viewMode === "list" ? (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div className="map-schools-container">
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
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              </div>
            ) : isLoading || !isLoaded || !isMapLoaded ? (
              <div className="text-center py-8">Loading map...</div>
            ) : (
              <div className="space-y-6 relative overflow-hidden mx-3">
                <div className="bg-white p-4 overflow-hidden relative">
                  <GoogleMap
                    mapContainerStyle={{
                      ...mapContainerStyle,
                      height: "780px",
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
                                        {/* <span className="!text-[16px]"> <i className="icon-svg-location1"></i> 0.3 Miles</span> */}
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
                                              location.state && (
                                                <span> | </span>
                                              )}
                                            {location.state && (
                                              <span>{location.state}</span>
                                            )}
                                          </span>
                                        )}
                                        {location.ad_email && (
                                          <>
                                            <br />
                                            <a
                                              href={`mailto:${location.ad_email}`}
                                              className="text-[14px] text-blue-600"
                                            >
                                              {location.ad_email}
                                            </a>
                                          </>
                                        )}
                                        {location.school_phone && (
                                          <>
                                            <br />
                                            <a
                                              href={`tel:${location.school_phone.replace(
                                                /\D/g,
                                                ""
                                              )}`}
                                              className="text-[14px] text-blue-600"
                                            >
                                              {formatPhoneNumber(
                                                location.school_phone
                                              )}
                                            </a>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {hasFootballPackage && (
                                      <div className="text-xs flex items-center justify-between gap-2 flex-wrap">
                                        {schoolAthletes[index] &&
                                        schoolAthletes[index].length > 0 ? (
                                          schoolAthletes[index].map(
                                            (
                                              athlete: any,
                                              athleteIndex: number
                                            ) => (
                                              <div
                                                key={athleteIndex}
                                                className="text-xs flex items-center justify-start gap-2"
                                              >
                                                <img
                                                  src={
                                                    athlete.image_url ||
                                                    "/blank-user.svg"
                                                  }
                                                  alt={
                                                    athlete.name || "Athlete"
                                                  }
                                                  height={50}
                                                  width={50}
                                                  className="rounded-full object-cover"
                                                />
                                                <div>
                                                  <h6 className="!text-[14px] !font-semibold !leading-1 mb-0">
                                                    {athlete.name || "-"}
                                                  </h6>
                                                  <span className="!text-[14px] !leading-[16px] mb-0">
                                                    {athlete.athleticProjection ||
                                                      "-"}{" "}
                                                    <br />
                                                    {athlete.gradYear || "-"}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          )
                                        ) : schoolAthletes[index] !==
                                          undefined ? (
                                          <div className="text-gray-400 text-[12px]">
                                            No athletes found
                                          </div>
                                        ) : (
                                          <div className="text-gray-400 text-[12px]">
                                            Loading athletes...
                                          </div>
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
                                      // Use school_id directly if available, otherwise convert from high_school_id
                                      let schoolId: string | undefined =
                                        location.school_id;
                                      if (
                                        !schoolId &&
                                        location.high_school_id
                                      ) {
                                        schoolId =
                                          (await convertHighSchoolIdToSchoolId(
                                            location.high_school_id
                                          )) || undefined;
                                      } else if (
                                        !schoolId &&
                                        location.raw_data?.high_school_id
                                      ) {
                                        schoolId =
                                          (await convertHighSchoolIdToSchoolId(
                                            location.raw_data.high_school_id
                                          )) || undefined;
                                      }

                                      if (schoolId) {
                                        const result =
                                          await fetchHighSchoolAthletes(
                                            schoolId,
                                            "fb",
                                            userDetails.customer_id,
                                            { page: 1, limit: 100 }
                                          );

                                        if (result.data) {
                                          // Sort by athletic projection first, then grad_year
                                          const projectionOrder = [
                                            "FBS P4 - Top half",
                                            "FBS P4",
                                            "FBS G5 - Top half",
                                            "FBS G5",
                                            "FCS - Full Scholarship",
                                            "FCS",
                                            "D2 - Top half",
                                            "D2",
                                            "D3 - Top half",
                                            "D3",
                                            "D3 Walk-on",
                                          ];

                                          const sortedAthletes =
                                            result.data.sort(
                                              (a: any, b: any) => {
                                                // First sort by athletic projection
                                                const indexA =
                                                  projectionOrder.indexOf(
                                                    a.athleticProjection || ""
                                                  );
                                                const indexB =
                                                  projectionOrder.indexOf(
                                                    b.athleticProjection || ""
                                                  );

                                                if (
                                                  indexA !== -1 &&
                                                  indexB !== -1
                                                ) {
                                                  if (indexA !== indexB) {
                                                    return indexA - indexB;
                                                  }
                                                } else if (indexA !== -1) {
                                                  return -1;
                                                } else if (indexB !== -1) {
                                                  return 1;
                                                } else if (
                                                  a.athleticProjection &&
                                                  b.athleticProjection
                                                ) {
                                                  const cmp =
                                                    a.athleticProjection.localeCompare(
                                                      b.athleticProjection
                                                    );
                                                  if (cmp !== 0) return cmp;
                                                }

                                                // Then sort by grad_year
                                                const yearA =
                                                  parseInt(a.gradYear) || 0;
                                                const yearB =
                                                  parseInt(b.gradYear) || 0;
                                                return yearA - yearB;
                                              }
                                            );

                                          // Limit to 2-3 athletes that fit
                                          setSchoolAthletes({
                                            ...schoolAthletes,
                                            [index]: sortedAthletes.slice(0, 2),
                                          });
                                        }
                                      }
                                    } catch (error) {
                                      console.error(
                                        "Error fetching athletes:",
                                        error
                                      );
                                    }
                                  }
                                }}
                              >
                                <div
                                  className="flex items-center justify-start gap-1 border-[4px] border-solid border-[#1C1D4D] rounded-full bg-gray-500 pr-3 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{ minWidth: "max-content" }}
                                >
                                  <div className="flex items-center justify-center relative left-[-3px] top-[0] border-[4px] border-solid border-[#1C1D4D] rounded-full w-[40px] h-[40px] overflow-hidden">
                                    <img
                                      src="/blank-hs.svg"
                                      alt="School"
                                      className="w-full h-full object-contain p-1"
                                    />
                                  </div>
                                  <h6 className="flex flex-col text-white items-start justify-start mb-0 !text-[12px] !font-semibold !leading-1 w-[65px]">
                                    <span className="truncate block w-full">
                                      {location.school}
                                    </span>
                                    {/* <span className="text-white !text-[10px] bg-[#1C1D4D] rounded-full px-2 !text-sm !leading-1">
                                      4.5
                                    </span> */}
                                  </h6>
                                </div>
                              </Popover>
                            </OverlayViewF>
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
              </div>
            )}

            {viewMode !== "list" && locations.length === 0 && !isLoading && (
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
          top: -24px;
          right: -42px;
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
      {/* <TableSearchContent dataSource="high_schools" baseRoute="/high-school" /> */}
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
