"use client";

import React from 'react';
import { Skeleton } from 'antd';
import type { AthleteData } from '@/types/database';

interface AthleteHonorsProps {
  athlete: AthleteData | null;
}

// Define the honor priority order
const HONOR_PRIORITY = {
  'All American': 1,
  'All Conference': 2,
  'All Region': 3,
  'Rookie All Conference': 4,
  // Default priority for any other honors
  'default': 5
};

const getHonorPriority = (award: string): number => {
  // Check for exact matches first
  if (HONOR_PRIORITY[award as keyof typeof HONOR_PRIORITY]) {
    return HONOR_PRIORITY[award as keyof typeof HONOR_PRIORITY];
  }
  
  // Check for partial matches (case insensitive)
  const lowerAward = award.toLowerCase();
  
  if (lowerAward.includes('all american')) {
    return HONOR_PRIORITY['All American'];
  } else if (lowerAward.includes('all conference')) {
    return HONOR_PRIORITY['All Conference'];
  } else if (lowerAward.includes('all region')) {
    return HONOR_PRIORITY['All Region'];
  } else if (lowerAward.includes('rookie all conference')) {
    return HONOR_PRIORITY['Rookie All Conference'];
  }
  
  return HONOR_PRIORITY.default;
};

const formatTeam = (team: string): string => {
  const teamNumber = parseInt(team);
  
  if (isNaN(teamNumber)) {
    return team; // Return as-is if it's not a number
  }
  
  switch (teamNumber) {
    case 1:
      return '1st Team';
    case 2:
      return '2nd Team';
    case 3:
      return '3rd Team';
    case 4:
      return '4th Team';
    default:
      return `${teamNumber}th Team`; // For 5th, 6th, etc.
  }
};

const getHonorIcon = (award: string) => {
  const lowerAward = award.toLowerCase();
  
  if (lowerAward.includes('all american')) {
    return <span style={{ marginRight: '6px', fontSize: '16px' }}>🏆</span>; // Gold trophy emoji
  } else if (lowerAward.includes('all conference')) {
    return <span style={{ marginRight: '6px', fontSize: '16px' }}>🥈</span>; // Silver medal emoji
  } else if (lowerAward.includes('all region')) {
    return <span style={{ marginRight: '6px', fontSize: '16px' }}>🥉</span>; // Bronze medal emoji
  }
  
  return null; // No icon for other awards
};

const groupAndSortHonors = (honors: Array<{ id: string; team: string; award: string; award_year: string }>) => {
  // Group honors by award type
  const groupedHonors: { [key: string]: Array<{ team: string; award_year: string }> } = {};
  
  honors.forEach(honor => {
    if (!groupedHonors[honor.award]) {
      groupedHonors[honor.award] = [];
    }
    groupedHonors[honor.award].push({
      team: honor.team,
      award_year: honor.award_year
    });
  });
  
  // Sort years within each group (most recent first)
  Object.keys(groupedHonors).forEach(award => {
    groupedHonors[award].sort((a, b) => parseInt(b.award_year) - parseInt(a.award_year));
  });
  
  // Convert to array and sort by honor priority
  const sortedGroups = Object.entries(groupedHonors).sort(([awardA], [awardB]) => {
    const priorityA = getHonorPriority(awardA);
    const priorityB = getHonorPriority(awardB);
    return priorityA - priorityB;
  });
  
  return sortedGroups;
};

export default function AthleteHonors({ athlete }: AthleteHonorsProps) {
  if (!athlete) {
    return (
      <div className="card">
        <h4 className="mb-4 !text-[22px]">
          <Skeleton.Input active size="small" style={{ width: 100 }} />
        </h4>
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center py-1">
              <Skeleton.Input active size="small" style={{ width: 180 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const honors = athlete.athlete_honor;
  
  if (!honors || !honors.length) {
    return null; // Don't render the component if there are no honors
  }

  const groupedHonors = groupAndSortHonors([...honors]);

  return (
    <div className="card">
      <h4 className="mb-4 !text-[22px]">Athletic Honors</h4>
      <div className="flex flex-col gap-1">
        {groupedHonors.map(([award, yearEntries]) => (
          <div 
            key={award} 
            className="flex flex-col py-2 text-[14px] border-b border-gray-100 last:border-b-0"
          >
            <div className="font-semibold text-gray-800 flex items-center">
              {getHonorIcon(award)}
              {award}
            </div>
            <div className="text-gray-600 text-[12px]" style={{ marginLeft: '22px' }}>
              {yearEntries.map((entry, index) => (
                <div key={index}>
                  {formatTeam(entry.team)} • {entry.award_year}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
