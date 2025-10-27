"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "antd";
import { fetchJucoCoachInfo } from "@/lib/queries";
import type { AthleteData } from "@/types/database";
import { formatPhoneNumber } from "@/utils/utils";

interface SchoolInfoProps {
  athlete: AthleteData | null;
  dataSource?: 'transfer_portal' | 'all_athletes' | 'juco' | 'high_schools' | 'hs_athletes' | null;
}

interface CoachInfo {
  name?: string;
  email?: string;
  officePhone?: string;
  cellPhone?: string;
}

export default function SchoolInfo({ athlete, dataSource }: SchoolInfoProps) {
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Extract school_id and sport_id from athlete data
  // Use the same school_id that was used for school_region/school_division queries
  const schoolId = athlete?.current_school_id;
  const sportId = athlete?.sport_id;

  // Determine if we should show loading state
  // Show loading when dataSource is juco but athlete data is not yet available
  const shouldShowLoading = dataSource === 'juco' && (!athlete || loading);



  // Map sport_id to sport abbreviation (matching the mapping in queries.ts)
  const sportIdToAbbrev: Record<number, string> = {
    1: 'mbb',
    2: 'wbb',
    3: 'msoc',
    4: 'wsoc',
    5: 'wvol',
    6: 'bsb',
    7: 'sb',
    8: 'mcc',
    9: 'wcc',
    10: 'mglf',
    11: 'wglf',
    12: 'mlax',
    13: 'wlax',
    14: 'mten',
    15: 'wten',
    16: 'mtaf',
    17: 'wtaf',
    18: 'mswm',
    19: 'wswm',
    20: 'mwre',
    21: 'fb',
  };

  useEffect(() => {
    const loadCoachInfo = async () => {
      // Only fetch coach info for JUCO data source
      if (dataSource !== 'juco') {
        setCoachInfo(null);
        return;
      }

      // If athlete data is not available yet, don't try to fetch coach info
      if (!athlete || !schoolId || !sportId) {
        setCoachInfo(null);
        return;
      }

      const sportAbbrev = sportIdToAbbrev[sportId];
      if (!sportAbbrev) {
        setCoachInfo(null);
        return;
      }

      setLoading(true);
      try {
        const info = await fetchJucoCoachInfo(schoolId, sportAbbrev);
        setCoachInfo(info);
      } catch (error) {
        console.error('Error loading coach info:', error);
        setCoachInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadCoachInfo();
  }, [athlete, schoolId, sportId, dataSource]);

  // Don't render anything if not JUCO
  if (dataSource !== 'juco') {
    return null;
  }

  return (
    <div className="card">
      <h4 className="mb-4 !text-[22px]">School Info</h4>
      <div className="flex flex-col gap-3">
        {shouldShowLoading ? (
          <>
            {[...Array(4)].map((_, index) => (
              <div key={index} className="flex flex-col gap-1">
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 120, height: 16 }}
                />
                <Skeleton.Input
                  active
                  size="small"
                  style={{ width: 180, height: 20 }}
                />
              </div>
            ))}
          </>
        ) : coachInfo ? (
          <>
            {coachInfo?.name && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-600">Coach Name</span>
                <span className="text-[16px]">{coachInfo.name}</span>
              </div>
            )}
            {coachInfo?.email && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-600">Coach Email</span>
                <a 
                  href={`mailto:${coachInfo.email}`}
                  className="text-[16px] text-blue-600 hover:text-blue-800"
                >
                  {coachInfo.email}
                </a>
              </div>
            )}
            {coachInfo?.officePhone && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-600">Coach Office Phone</span>
                <a 
                  href={`tel:${coachInfo.officePhone}`}
                  className="text-[16px] text-blue-600 hover:text-blue-800"
                >
                  {coachInfo.officePhone}
                </a>
              </div>
            )}
            {coachInfo?.cellPhone && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray-600">Coach Cell Phone</span>
                <a 
                  href={`tel:${coachInfo.cellPhone}`}
                  className="text-[16px] text-blue-600 hover:text-blue-800"
                >
                  {formatPhoneNumber(coachInfo.cellPhone)}
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500">
            No coach information available for this school and sport.
          </div>
        )}
      </div>
    </div>
  );
}
