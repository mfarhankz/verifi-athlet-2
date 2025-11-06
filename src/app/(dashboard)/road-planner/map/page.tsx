"use client";

import { useEffect, useState, useCallback, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
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
import { useUser } from "@/contexts/CustomerContext";
import { formatPhoneNumber } from "@/utils/utils";
import { getPackageIdsBySport } from "@/lib/queries";
import HighSchoolPrintComponent from "@/components/HighSchoolPrintComponent";
import { Button, Input, Select, Popover } from "antd";

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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div className="card-list flex justify-between relative" style={style}>
        <div
          ref={setNodeRef}
          className="cursor-move flex flex-1 justify-between"
          {...attributes}
          {...listeners}
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <div className="school-icon">
                <img src="/svgicons/school-icon.svg" alt="X Feed" height={89} />
              </div>
              <div className="flex flex-col text-left mt-1">
                <h4 className="mb-1">
                  {location.school}
                  {location.private_public && (
                    <span
                      style={{
                        backgroundColor:
                          location.private_public.toLowerCase() === "public"
                            ? "#c8ff24"
                            : "#88FBFF",
                      }}
                    >
                      {location.private_public}
                    </span>
                  )}
                </h4>
                <div className="mb-0">
                  {location.address} <br />
                  {(location.county || location.state) && (
                    <div>
                      {location.county && <span>{location.county}</span>}
                      {location.county && location.state && <span>, </span>}
                      {location.state && <span>{location.state}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mx-3 mb-3">
              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Liam James</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>

              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Moxen Galin</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>

              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Richard Mark</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>

              <div className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1">
                <h6 className="mb-1">Alex James</h6>
                <p className="mb-0 !leading-5">
                  D3 <br />
                  2025
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 p-2">
            <div className="flex flex-col text-left w-[650px]">
              <div className="flex gap-2 mb-2 justify-end">
                {location.league_classification && (
                  <div className="text-lg font-medium bg-[#126DB8] text-white px-2">
                    {location.league_classification}
                  </div>
                )}
                {location.record_2024 && hasFootballPackage && (
                  <div className="text-lg font-medium border border-solid border-[#ccc] px-2">
                    {location.record_2024}
                  </div>
                )}
                <div className="text-lg bg-[#000] px-2">
                  <img src="/x-logo.svg" alt="X Feed" height={24} />
                  <span className="gradient-text ml-2">@virginiabeach</span>
                </div>
                <div
                  className="border border-solid border-[#ccc] px-2 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRemove(index);
                  }}
                >
                  <img src="/svgicons/delete-03.svg" alt="X Feed" height={20} />
                </div>
              </div>
              <div className="flex justify-between gap-2">
                <div>
                  <span className="bg-[#FFD000] text-lg italic font-bold leading-5">
                    Coach
                  </span>
                  <h6 className="mb-0 !text-lg leading-3">
                    {(location.head_coach_first || location.head_coach_last) &&
                      hasFootballPackage && (
                        <>
                          {location.head_coach_first} {location.head_coach_last}
                        </>
                      )}
                  </h6>
                  <p className="mb-0 leading-5">
                    {location.head_coach_email} <br />
                    {location.head_coach_cell && (
                      <>
                        Cell {formatPhoneNumber(location.head_coach_cell)}{" "}
                        {(location.coach_best_contact === "cell" ||
                          location.best_phone === "Cell") &&
                          hasFootballPackage && (
                            <span className="text-blue-600 font-medium">
                              (best)
                            </span>
                          )}
                        {(location.head_coach_work_phone ||
                          location.head_coach_home_phone ||
                          location.coach_twitter_handle) &&
                          ", "}
                      </>
                    )}
                    {location.head_coach_work_phone && (
                      <>
                        Work {formatPhoneNumber(location.head_coach_work_phone)}{" "}
                        {(location.coach_best_contact === "work" ||
                          location.best_phone === "Office") &&
                          hasFootballPackage && (
                            <span className="text-blue-600 font-medium">
                              (best)
                            </span>
                          )}
                        {(location.head_coach_home_phone ||
                          location.coach_twitter_handle) &&
                          ", "}
                      </>
                    )}
                    {location.head_coach_home_phone && (
                      <>
                        Home {formatPhoneNumber(location.head_coach_home_phone)}{" "}
                        {(location.coach_best_contact === "home" ||
                          location.best_phone === "Home") &&
                          hasFootballPackage && (
                            <span className="text-blue-600 font-medium">
                              (best)
                            </span>
                          )}
                        {location.coach_twitter_handle && ", "}
                      </>
                    )}
                    {location.coach_twitter_handle && (
                      <>Twitter {location.coach_twitter_handle}</>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-[#FFD000] text-lg italic font-bold leading-5">
                    AD
                  </span>
                  <h6 className="mb-0 !text-lg leading-3">
                    {location.ad_name_first} {location.ad_name_last}
                  </h6>
                  <p className="mb-0 leading-5">
                    {location.ad_email && <>{location.ad_email}</>}
                    <br />
                    {location.school_phone && (
                      <>School {location.school_phone}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(location.score_college_player !== undefined ||
                  location.score_d1_producing !== undefined ||
                  location.score_team_quality !== undefined ||
                  location.score_income !== undefined ||
                  location.score_academics !== undefined) && (
                  <ul className="co-title bg-[#eaf8ed]">
                    <li>
                      {location.score_college_player !== undefined && (
                        <>
                          <h6>{location.score_college_player}</h6>
                          <p>College</p>
                        </>
                      )}
                    </li>
                    <li>
                      {location.score_d1_producing !== undefined && (
                        <>
                          <h6>{location.score_d1_producing}</h6>
                          <p>D1</p>
                        </>
                      )}
                    </li>
                    <li>
                      {location.score_team_quality !== undefined && (
                        <>
                          <h6>{location.score_team_quality}</h6>
                          <p>Team</p>
                        </>
                      )}
                    </li>
                    <li>
                      {location.score_income !== undefined && (
                        <>
                          <h6>{location.score_income}</h6>
                          <p>Income</p>
                        </>
                      )}
                    </li>
                    <li>
                      {location.score_academics !== undefined && (
                        <>
                          <h6>{location.score_academics}</h6>
                          <p>Acad</p>
                        </>
                      )}
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 left-0 bottom-[-92px] m-auto flex flex-col items-center justify-center">
          <span className="font-semibold text-lg bg-[#1C1D4D] text-white w-8 h-8 flex items-center justify-center">
            {index + 1}
          </span>
          {routeInfo && index < routeInfo.legs.length && (
            <div className="bg-[#1C1D4D]  text-white pl-3 pr-10 py-1 !text-lg font-medium italic mt-10">
              {index < totalLocations - 1 && (
                <div className="relative">
                  <span className="mile-flage"></span>
                  <span className="mile-car"></span>
                  Next Stop {routeInfo.legs[index].duration} (
                  {routeInfo.legs[index].distance})
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {/* <div
      style={style}
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
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div>
                <div className="flex items-center flex-wrap mb-1">
                  <div className="font-semibold text-lg mr-2">{location.school}</div>
                  {location.record_2024 && hasFootballPackage && (
                    <div className="text-gray-700 bg-blue-100 px-2 py-0.5 rounded text-xs mr-1">
                      {location.record_2024}
                    </div>
                  )}
                  {location.league_classification && (
                    <div className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {location.league_classification}
                    </div>
                  )}
                  {location.private_public && (
                    <div 
                      className="text-gray-700 px-2 py-0.5 rounded text-xs mr-1"
                      style={{
                        backgroundColor: location.private_public.toLowerCase() === 'public' ? '#c8ff24' : '#88FBFF'
                      }}
                    >
                      {location.private_public}
                </div>
                  )}
                
                </div>
                
                <div className="text-gray-600 text-sm mb-1">{location.address}</div>
                
                {(location.county || location.state) && (
                  <div className="text-sm font-semibold">
                    {location.county && <span>{location.county}</span>}
                    {location.county && location.state && <span> | </span>}
                    {location.state && <span>{location.state}</span>}
                  </div>
                )}
              </div>
              
              <div className="text-sm">
                {(location.head_coach_first || location.head_coach_last) && hasFootballPackage && (
                  <div className="font-medium text-gray-800 mb-1">
                    Coach: {location.head_coach_first} {location.head_coach_last}
                  </div>
                )}
                {location.head_coach_email && hasFootballPackage && (
                  <div className="text-gray-600">
                    Email: {location.head_coach_email}
                  </div>
                )}
                {location.head_coach_cell && hasFootballPackage && (
                  <div className="text-gray-600">
                    Cell: {formatPhoneNumber(location.head_coach_cell)} {(location.coach_best_contact === 'cell' || location.best_phone === 'Cell') && hasFootballPackage && <span className="text-blue-600 font-medium">(best)</span>}
                  </div>
                )}
                {location.head_coach_work_phone && hasFootballPackage && (
                  <div className="text-gray-600">
                    Work: {formatPhoneNumber(location.head_coach_work_phone)} {(location.coach_best_contact === 'work' || location.best_phone === 'Office') && hasFootballPackage && <span className="text-blue-600 font-medium">(best)</span>}
                  </div>
                )}
                {location.head_coach_home_phone && hasFootballPackage && (
                  <div className="text-gray-600">
                    Home: {formatPhoneNumber(location.head_coach_home_phone)} {(location.coach_best_contact === 'home' || location.best_phone === 'Home') && hasFootballPackage && <span className="text-blue-600 font-medium">(best)</span>}
                  </div>
                )}
                {location.coach_twitter_handle && hasFootballPackage && (
                  <div className="text-gray-600">
                    Twitter: {location.coach_twitter_handle}
                  </div>
                )}
                {location.coach_best_contact && location.coach_best_contact !== 'cell' && 
                 location.coach_best_contact !== 'work' && location.coach_best_contact !== 'home' && 
                 hasFootballPackage && (
                  <div className="text-gray-600">
                    Best Contact: {location.coach_best_contact}
                  </div>
                )}
              </div>
              
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
            
            {location.visit_info && (
              <div className="text-sm text-gray-700 border-t border-b py-1 mb-2">
                <span className="font-medium">Visit Info:</span> {location.visit_info}
              </div>
            )}
            
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
    </div> */}
    </>
  );
}

export default function MapPage() {
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
  const mapContentRef = useRef<HTMLDivElement>(null);
  const pdfContentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const userDetails = useUser();

  // Check if user has any football package to determine if coach info should be shown
  const footballPackageIds = getPackageIdsBySport("fb");
  const userPackageNumbers = (userDetails?.packages || []).map((pkg: any) =>
    Number(pkg)
  );
  const hasFootballPackage = footballPackageIds.some((id) =>
    userPackageNumbers.includes(id)
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
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

            // Combine the geocode position with all the school metadata
            return {
              address,
              school: schoolInfo?.school || "Unknown School",
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
              raw_data: schoolInfo?.raw_data,
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
        raw_data: storedSchoolData.find((s) => s.address === loc.address)
          ?.raw_data,
      }));

      localStorage.setItem("schoolData", JSON.stringify(schoolData));
    }
  }, [locations, storedSchoolData]);

  return (
    <div className="flex flex-col h-screen">
      {/* Main content with scrolling */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full">
          {" "}
          {/* Added pb-20 for bottom padding */}
          {/* Controls section - moved from fixed header to scrollable content */}
          <div className="flex items-center justify-between bg-white p-4 mb-3">
            <Button type="link" onClick={() => router.push("/road-planner")}>
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

              <Button type="text" onClick={() => true}>
                <i className="icon-svg-print"></i>
                Print PDF
              </Button>
              {/* <HighSchoolPrintComponent
                locations={locations}
                storedSchoolData={storedSchoolData}
                pdfContentRef={pdfContentRef}
                hasFootballPackage={hasFootballPackage}
              /> */}
              <Input
                placeholder="Enter Address"
                className="custom-input"
                style={{ width: "180px" }}
                suffix={<i className="icon-svg-add-location" />}
              />

              <Select
                placeholder="Saved Journeys"
                className="custom-select mt-[-10px]"
                style={{ width: "160px" }}
                options={[
                  { value: "Call", label: "Call" },
                  { value: "Text", label: "Text" },
                  { value: "Email", label: "Email" },
                ]}
              />

              <Input
                placeholder="Name Journey"
                className="custom-input"
                style={{ width: "140px" }}
              />

              <Button type="primary" onClick={() => true}>
                Save
              </Button>
            </div>
          </div>
          {/* PDF content begins here - this is what we'll capture for the PDF */}
          <div ref={pdfContentRef}>
            {isLoading || !isLoaded || !isMapLoaded ? (
              <div className="text-center py-8">Loading map...</div>
            ) : (
              <div className="space-y-6 relative">
                <div className="bg-white p-4 overflow-hidden">
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
                                  <div className="space-y-2 min-w-[350px]">
                                    <div className="mb-4">
                                      <h4 className="!text-[24px] font-semibold text-sm mb-3 flex items-center justify-between">
                                        {location.school} <span className="!text-[16px]"> <i className="icon-svg-location1"></i> 0.3 Miles</span>
                                      </h4>
                                      <p className="text-[14px] text-gray-600 w-[190px] !leading-[20px]">
                                        {location.address} <br />
                                        {(location.county ||
                                          location.state) && (
                                          <div>
                                            {location.county && (
                                              <span>{location.county}</span>
                                            )}
                                            {location.county &&
                                              location.state && <span>, </span>}
                                            {location.state && (
                                              <span>{location.state}</span>
                                            )}
                                          </div>
                                        )}
                                        <a href="javascript:void(0)" className="text-[14px] text-blue-600">{location.ad_email}</a>
                                        <br />
                                        <a href="javascript:void(0)" className="text-[14px] text-blue-600">{location.school_phone}</a>                                        
                                      </p>
                                    </div>

                                    <div className="text-xs flex items-center justify-between">
                                      <div>
                                        {location.head_coach_first &&
                                          hasFootballPackage && (
                                            <div className="text-xs flex items-center justify-start gap-2">
                                              <img
                                                src="/svgicons/plyer1.png"
                                                alt="X Feed"
                                                height={50}
                                              />
                                              <div>
                                              <h6 className="!text-[14px] !font-semibold !leading-1 mb-0">Liam James</h6>
                                              <span className="!text-[14px] !leading-[16px] mb-0">
                                                D2 <br />
                                                2024
                                              </span>
                                            </div>
                                            </div>
                                          )}
                                      </div>
                                      <div>
                                        {location.school_phone && (
                                          <div className="text-xs flex items-center justify-start gap-2">
                                            <img
                                              src="/svgicons/plyer1.png"
                                              alt="X Feed"
                                              height={50}
                                            />
                                            <div>
                                              <h6 className="!text-[14px] !font-semibold !leading-1 mb-0">Liam James</h6>
                                              <span className="!text-[14px] !leading-[16px] mb-0">
                                                D2 <br />
                                                2024
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                }
                                title={null}
                                trigger="click"
                                open={popoverOpen[index]}
                                onOpenChange={(open) => {
                                  setPopoverOpen({
                                    ...popoverOpen,
                                    [index]: open,
                                  });
                                }}
                              >
                                <div
                                  className="flex items-center justify-start gap-1 border-[4px] border-solid border-[#1C1D4D] rounded-full bg-[#FF7525] pr-3 !text-base italic font-medium text-[#fff] cursor-pointer hover:opacity-90 transition-opacity"
                                  style={{ minWidth: "max-content" }}
                                >
                                  <div className="flex items-center justify-center relative left-[-3px] top-[0] border-[4px] border-solid border-[#1C1D4D] rounded-full">
                                    <img
                                      src="/svgicons/map-img.png"
                                      alt="X Feed"
                                      height={32}
                                    />
                                  </div>
                                  <h6 className="flex flex-col text-white items-start justify-start mb-0 !text-[12px] !font-semibold !leading-1 w-[65px]">
                                    <span className="truncate block w-full">
                                      {location.school}
                                    </span>
                                    <span className="text-white !text-[10px] bg-[#1C1D4D] rounded-full px-2 !text-sm !leading-1">
                                      4.5
                                    </span>
                                  </h6>
                                </div>
                              </Popover>
                            </OverlayViewF>
                          </Fragment>
                        )
                    )}
                  </GoogleMap>
                </div>

                {routeInfo && (
                  <div className="text-left p-2 bg-white/60 w-[290px] border-2 border-[#1C1D4D] border-solid absolute top-[370px] left-[31px] z-10">
                    <div className="text-2xl font-bold text-gray-700 flex items-center justify-center">
                      <img
                        src="/svgicons/big-flag.svg"
                        alt="X Feed"
                        height={85}
                        className="mr-2"
                      />
                      <div className="text-gray-600 mt-1 text-right">
                        <h5 className="font-semibold !text-[22px] italic mb-1">
                          Total Drive Time
                        </h5>
                        <h3 className="!text-[30px] font-bold italic mb-2">
                          {routeInfo.totalTime}
                        </h3>
                        <h6 className="font-semibold !text-[22px] italic flex items-center justify-end">
                          <img
                            src="/svgicons/mile-car.svg"
                            alt="X Feed"
                            height={20}
                            className="mr-2"
                          />
                          {routeInfo.totalDistance}
                        </h6>
                      </div>
                    </div>
                  </div>
                )}

                <div className="map-schools-container mx-8 !mt-[-50px]">
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
                            userDetails={userDetails}
                            hasFootballPackage={hasFootballPackage}
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
