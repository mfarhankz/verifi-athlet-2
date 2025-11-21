import React from "react";
import { School } from "../types";
import { formatPhoneNumber } from "@/utils/utils";

interface SchoolCardProps {
  school: School;
  hasFootballPackage?: boolean;
  index?: number;
  showCheckbox?: boolean;
  isChecked?: boolean;
  onCheckboxChange?: (checked: boolean) => void;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  showAthletes?: boolean;
  athletes?: any[];
  routeInfo?: {
    totalDistance: string;
    totalTime: string;
    legs: {
      duration: string;
      distance: string;
    }[];
  };
  totalLocations?: number;
  className?: string;
  onClick?: () => void;
  dataSource?: 'high_schools' | 'hs_athletes' | null;
}

export default function SchoolCard({
  school,
  hasFootballPackage = false,
  index,
  showCheckbox = false,
  isChecked = false,
  onCheckboxChange,
  showDeleteButton = false,
  onDelete,
  showAthletes = false,
  athletes = [],
  routeInfo,
  totalLocations,
  className = "",
  onClick,
  dataSource,
}: SchoolCardProps) {
  // Determine which record to show based on current date
  const getRecordToShow = (): string | undefined => {
    if (!hasFootballPackage) return undefined;

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12 (Jan-Dec)

    // September (9) through December (12): show current year record
    // January (1) through August (8): show last year record
    if (currentMonth >= 9) {
      // Sep-Dec: show current year (e.g., 2025)
      return school.record_2025;
    } else {
      // Jan-Aug: show last year (e.g., 2024)
      return school.record_2024;
    }
  };

  console.log("athletes:", athletes);

  const recordToShow = getRecordToShow();

  // Determine if this is an athlete card by checking raw_data for athlete information
  // This allows mixed data sources (both high schools and athletes in the same route)
  // Each location is checked individually based on its raw_data, not the global dataSource
  const hasAthleteData = school.raw_data && (school.raw_data as any).athlete_name;
  
  // Show first card-list for schools, hide for athletes
  // Only show school card if it doesn't have athlete data
  const showSchoolCard = !hasAthleteData;
  // Show last card-list for athletes, hide for schools
  // Show athlete card if it has athlete data (regardless of dataSource parameter)
  const showAthleteCard = hasAthleteData;

  return (
    <>
      {showSchoolCard && (
      <div
        key={`school-${dataSource || 'default'}-${index || 0}`}
        className={`card-list flex justify-between !mb-5 relative ${
          onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""
        } ${className}`}
        onClick={onClick}
      >
        <div className="flex flex-col gap-2">
          {showCheckbox && (
            <div className="absolute top-0 bottom-0 left-[-30px] m-auto flex items-center justify-center">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  e.stopPropagation();
                  onCheckboxChange?.(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="relative top-[-5px] w-4 h-4"
              />
            </div>
          )}
          <div>
            <div className="flex gap-2">
              <div className="school-icon relative">
                {school.isCustomAddress ? (
                  <img
                    src="/svgicons/location-05.svg"
                    alt="Location"
                    height={89}
                  />
                ) : (
                  <img
                    src="/svgicons/school-icon.svg"
                    alt="School"
                    height={89}
                  />
                )}
                {index !== undefined && (
                  <span className="absolute top-0 left-0 font-semibold text-lg bg-[#1C1D4D] text-white w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="flex flex-col text-left mt-1">
                <h4 className="mb-1">
                  {school.school}
                  {school.private_public && (
                    <span
                      style={{
                        backgroundColor:
                          school.private_public.toLowerCase() === "public"
                            ? "#c8ff24"
                            : "#88FBFF",
                      }}
                    >
                      {school.private_public}
                    </span>
                  )}
                </h4>
                <div className="mb-0">
                  {school.address} <br />
                  {(school.county || school.state) && (
                    <span>
                      {school.county && <span>{school.county}</span>}
                      {school.county && school.state && <span> | </span>}
                      {school.state && <span>{school.state}</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {showAthletes &&
              hasFootballPackage &&
              !school.isCustomAddress &&
              athletes.length > 0 && (
                <div className="flex gap-2 mx-3 mb-3">
                  {athletes.map((athlete: any, athleteIndex: number) => (
                    <div
                      key={athleteIndex}
                      className="flex flex-col text-left mt-1 border border-[#d2d2db] border-solid px-2 py-1"
                    >
                      <h6 className="mb-1">{athlete.name || "-"}</h6>
                      <p className="mb-0 !leading-5">
                        {athlete.athleticProjection || "-"} <br />
                        {athlete.gradYear || "-"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
        <div className="flex gap-2 p-2">
          <div className="flex flex-col text-left w-[650px]">
            <div className="flex gap-2 mb-2 justify-end">
              {school.league_classification && (
                <div className="text-lg font-medium bg-[#126DB8] text-white px-2">
                  {school.league_classification}
                </div>
              )}
              {recordToShow && hasFootballPackage && (
                <div className="text-lg font-medium border border-solid border-[#ccc] px-2">
                  {recordToShow}
                </div>
              )}
              {school.coach_twitter_handle && hasFootballPackage && (
                <div className="text-lg bg-[#000] text-white px-2">
                  {school.coach_twitter_handle.startsWith("@")
                    ? school.coach_twitter_handle
                    : `@${school.coach_twitter_handle}`}
                </div>
              )}
              {showDeleteButton && (
                <div
                  className="border border-solid border-[#ccc] px-2 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    pointerEvents: "auto",
                    zIndex: 10,
                    position: "relative",
                  }}
                >
                  <img src="/svgicons/delete-03.svg" alt="Delete" height={20} />
                </div>
              )}
            </div>
            {!school.isCustomAddress &&
              ((hasFootballPackage &&
                (school.head_coach_first ||
                  school.head_coach_last ||
                  school.head_coach_email ||
                  school.head_coach_cell ||
                  school.head_coach_work_phone ||
                  school.head_coach_home_phone)) ||
                school.ad_name_first ||
                school.ad_name_last ||
                school.ad_email ||
                school.school_phone) && (
                <div className="flex justify-between gap-2">
                  {/* Coach info - only show if hasFootballPackage */}
                  {hasFootballPackage &&
                    (school.head_coach_first ||
                      school.head_coach_last ||
                      school.head_coach_email ||
                      school.head_coach_cell ||
                      school.head_coach_work_phone ||
                      school.head_coach_home_phone) && (
                      <div>
                        <span className="bg-[#FFD000] text-lg italic font-bold leading-5">
                          Coach
                        </span>
                        <h6 className="mb-0 !text-lg leading-3">
                          {(school.head_coach_first ||
                            school.head_coach_last) && (
                            <>
                              {school.head_coach_first} {school.head_coach_last}
                            </>
                          )}
                        </h6>
                        <div className="mb-0 leading-5">
                          {school.head_coach_email && (
                            <>{school.head_coach_email}</>
                          )}
                          {school.head_coach_cell && (
                            <>
                              <br />
                              Cell {formatPhoneNumber(school.head_coach_cell)}
                            </>
                          )}
                          {!school.head_coach_cell &&
                            school.head_coach_work_phone && (
                              <>
                                <br />
                                Office{" "}
                                {formatPhoneNumber(
                                  school.head_coach_work_phone
                                )}
                              </>
                            )}
                          {!school.head_coach_cell &&
                            !school.head_coach_work_phone &&
                            school.head_coach_home_phone && (
                              <>
                                <br />
                                Home{" "}
                                {formatPhoneNumber(
                                  school.head_coach_home_phone
                                )}
                              </>
                            )}
                        </div>
                      </div>
                    )}
                  {/* AD info - always show if available */}
                  {(school.ad_name_first ||
                    school.ad_name_last ||
                    school.ad_email ||
                    school.school_phone) && (
                    <div className="text-right">
                      <span className="bg-[#FFD000] text-lg italic font-bold leading-5">
                        AD
                      </span>
                      {(school.ad_name_first || school.ad_name_last) && (
                        <h6 className="mb-0 !text-lg leading-3">
                          {school.ad_name_first} {school.ad_name_last}
                        </h6>
                      )}
                      <p className="mb-0 leading-5">
                        {school.ad_email && (
                          <>
                            {school.ad_email}
                            <br />
                          </>
                        )}

                        {school.school_phone && (
                          <>School {school.school_phone}</>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
            <div className="flex gap-2">
              {(school.score_college_player !== undefined ||
                school.score_d1_producing !== undefined ||
                school.score_team_quality !== undefined ||
                school.score_income !== undefined ||
                school.score_academics !== undefined) && (
                <ul className="co-title bg-[#eaf8ed]">
                  <li>
                    {school.score_college_player !== undefined && (
                      <>
                        <h6>{school.score_college_player}</h6>
                        <p>College</p>
                      </>
                    )}
                  </li>
                  <li>
                    {school.score_d1_producing !== undefined && (
                      <>
                        <h6>{school.score_d1_producing}</h6>
                        <p>D1</p>
                      </>
                    )}
                  </li>
                  <li>
                    {school.score_team_quality !== undefined && (
                      <>
                        <h6>{school.score_team_quality}</h6>
                        <p>Team</p>
                      </>
                    )}
                  </li>
                  <li>
                    {school.score_income !== undefined && (
                      <>
                        <h6>{school.score_income}</h6>
                        <p>Income</p>
                      </>
                    )}
                  </li>
                  <li>
                    {school.score_academics !== undefined && (
                      <>
                        <h6>{school.score_academics}</h6>
                        <p>Acad</p>
                      </>
                    )}
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
        {routeInfo && index !== undefined && index < routeInfo.legs.length && (
          <div className="absolute right-0 left-0 bottom-[-60px] m-auto flex flex-col items-center justify-center" style={{ zIndex: 10 }}>
            <div className="relative flex items-center">
              <span className="mile-car-left"></span>
              <div className="bg-[#1C1D4D] text-white pl-3 pr-10 py-0.5 !text-lg font-medium italic m-0">
                {index < (totalLocations || 0) - 1 && (
                  <div className="relative">
                    <span>
                      Next Stop {routeInfo.legs[index].duration} (
                      {routeInfo.legs[index].distance})
                    </span>
                    <span className="mile-flage-small"></span>
                    <span className="mile-line-bottom"></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {showAthleteCard && (() => {
        // Get athlete data from raw_data
        const athleteData = (school.raw_data || {}) as any;
        const athleteName = athleteData.athlete_name || school.school || "Unknown Athlete";
        const athleteImage = athleteData.athlete_image_url || "/blank-user.svg";
        const athletePosition = athleteData.athlete_position || "";
        const athleteProjection = athleteData.athlete_athletic_projection || "";
        const athleteGradYear = athleteData.athlete_grad_year || "";
        const athleteCellPhone = athleteData.athlete_cell_phone || "";
        const athleteTwitter = athleteData.athlete_twitter || "";
        
        return (
          <div 
            key={`athlete-${dataSource || 'default'}-${index || 0}`}
            className="card-list flex justify-between relative"
          >
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <img
                  src={athleteImage}
                  alt={athleteName}
                  height={207}
                  width={207}
                  className="object-cover rounded"
                />
                <div>
                  <div className="flex flex-col text-left mt-1">
                    <h4 className="mb-1">
                      {athleteName}
                      {athleteProjection && (
                        <span className="bg-[#FF7525] text-white leading-3 ml-2 px-2">
                          {athleteProjection}
                        </span>
                      )}
                    </h4>
                    {(athleteCellPhone || athleteTwitter) && (
                      <p className="mb-0 !text-lg font-medium italic">
                        {athleteCellPhone && formatPhoneNumber(athleteCellPhone)}
                        {athleteCellPhone && athleteTwitter && " / "}
                        {athleteTwitter && `@${athleteTwitter.replace('@', '')}`}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col text-left mt-1">
                    <h5 className="mb-1 !text-lg !font-semibold">
                      {school.school}
                      {school.private_public && (
                        <span className="bg-[#c8ff24] !text-sm !font-semibold ml-1 px-1">
                          {school.private_public}
                        </span>
                      )}
                    </h5>
                    <p className="mb-0">
                      {school.address} <br />
                      {school.county && school.state && `${school.county}, ${school.state}`}
                      {school.school_phone && ` - ${formatPhoneNumber(school.school_phone)}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 p-2">
              <div className="flex flex-col text-left w-[650px]">
                <div className="flex gap-2 mb-2 justify-end">
                  {school.league_classification && (
                    <div className="text-lg font-medium bg-[#126DB8] text-white px-2">
                      {school.league_classification}
                    </div>
                  )}
                  {recordToShow && (
                    <div className="text-lg font-medium border border-solid border-[#ccc] px-2">
                      {recordToShow}
                    </div>
                  )}
                  {showDeleteButton && (
                    <div
                      className="border border-solid border-[#ccc] px-2 flex items-center justify-center cursor-pointer hover:bg-gray-100"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete?.();
                      }}
                    >
                      <img src="/svgicons/delete-03.svg" alt="Delete" height={20} />
                    </div>
                  )}
                </div>
                {!school.isCustomAddress && (
                  <div className="flex justify-between gap-2">
                    {(school.head_coach_first || school.head_coach_last || school.head_coach_email || school.head_coach_cell || school.head_coach_work_phone || school.head_coach_home_phone) && (
                      <div>
                        <span className="bg-[#FFD000] text-lg italic font-bold leading-5">
                          Coach
                        </span>
                        {(school.head_coach_first || school.head_coach_last) && (
                          <h6 className="mb-0 !text-lg leading-3">
                            {school.head_coach_first} {school.head_coach_last}
                          </h6>
                        )}
                        <div className="mb-0 leading-5">
                          {school.head_coach_email && <>{school.head_coach_email}</>}
                          {school.head_coach_cell && (
                            <>
                              <br />
                              Cell {formatPhoneNumber(school.head_coach_cell)}
                            </>
                          )}
                          {!school.head_coach_cell && school.head_coach_work_phone && (
                            <>
                              <br />
                              Office {formatPhoneNumber(school.head_coach_work_phone)}
                            </>
                          )}
                          {!school.head_coach_cell && !school.head_coach_work_phone && school.head_coach_home_phone && (
                            <>
                              <br />
                              Home {formatPhoneNumber(school.head_coach_home_phone)}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {(school.ad_name_first || school.ad_name_last || school.ad_email || school.school_phone) && (
                      <div className="text-right">
                        <span className="bg-[#FFD000] text-lg italic font-bold leading-5">
                          AD
                        </span>
                        {(school.ad_name_first || school.ad_name_last) && (
                          <h6 className="mb-0 !text-lg leading-3">
                            {school.ad_name_first} {school.ad_name_last}
                          </h6>
                        )}
                        <p className="mb-0 leading-5">
                          {school.ad_email && (
                            <>
                              {school.ad_email}
                              <br />
                            </>
                          )}
                          {school.school_phone && (
                            <>School {formatPhoneNumber(school.school_phone)}</>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {(school.score_college_player !== undefined ||
                  school.score_d1_producing !== undefined ||
                  school.score_team_quality !== undefined ||
                  school.score_income !== undefined ||
                  school.score_academics !== undefined) && (
                  <div className="flex gap-2">
                    <ul className="co-title bg-[#eaf8ed]">
                      {school.score_college_player !== undefined && (
                        <li>
                          <h6>{school.score_college_player}</h6>
                          <p>College</p>
                        </li>
                      )}
                      {school.score_d1_producing !== undefined && (
                        <li>
                          <h6>{school.score_d1_producing}</h6>
                          <p>D1</p>
                        </li>
                      )}
                      {school.score_team_quality !== undefined && (
                        <li>
                          <h6>{school.score_team_quality}</h6>
                          <p>Team</p>
                        </li>
                      )}
                      {school.score_income !== undefined && (
                        <li>
                          <h6>{school.score_income}</h6>
                          <p>Income</p>
                        </li>
                      )}
                      {school.score_academics !== undefined && (
                        <li>
                          <h6>{school.score_academics}</h6>
                          <p>Acad</p>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {routeInfo && index !== undefined && index < routeInfo.legs.length && (
              <div className="absolute right-0 left-0 bottom-[-60px] m-auto flex flex-col items-center justify-center" style={{ zIndex: 100 }}>
                <div className="relative flex items-center">
                  <span className="mile-car-left"></span>
                  <div className="bg-[#1C1D4D] text-white pl-3 pr-10 py-0.5 !text-lg font-medium italic m-0">
                    {index < (totalLocations || 0) - 1 && (
                      <div className="relative">
                        <span>
                          Next Stop {routeInfo.legs[index].duration} (
                          {routeInfo.legs[index].distance})
                        </span>
                        <span className="mile-flage-small"></span>
                        <span className="mile-line-bottom"></span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
