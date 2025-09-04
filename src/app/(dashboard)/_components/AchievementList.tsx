import React from 'react';
import Image from 'next/image';
import { Tooltip } from 'antd';
import { AthleteData } from '@/types/database';

interface AchievementListProps {
  athlete: AthleteData | null;
}

const AchievementList: React.FC<AchievementListProps> = ({ athlete }) => {
  // Add test data if no athlete honors are found
  const testHonors = [
    { id: '1', award: '1 - All American', award_year: '2023' },
    { id: '2', award: '2 - All Region', award_year: '2022' },
    { id: '3', award: '3 - All Conference', award_year: '2021' }
  ];
  
  // Use test data if no athlete honors are found
  // Set useTestData to false to use only real data
  const useTestData = false; // Disable test data to show only real awards
  const honorsToUse = useTestData && (!athlete?.athlete_honor || (athlete.athlete_honor?.length as number) === 0)
    ? testHonors 
    : athlete?.athlete_honor || [];
  
  if (!athlete) {
    return null;
  }

  if (!honorsToUse || honorsToUse.length === 0) {
    return null;
  }

  // Get the primary position from the roster data
  const primaryPosition = athlete.primary_position || 'Unknown';

  // Process awards to determine which icons to display
  const renderAwardItems = () => {
    const items: JSX.Element[] = [];
    
    // First, add cupA awards
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      if (awardType.includes('1 - All American') || awardType.includes('2 - All American') || awardType.includes('3 - All American')) {
        // Format the display text with position
        const displayText = `${awardYear}-${primaryPosition}`;
        
        // Determine which icon to use based on award type
        if (awardType.includes('1 - All American')) {
          items.push(
            <div key={`cupA-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupA.svg"
                  alt="All American First Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - First Team All American`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        } else if (awardType.includes('2 - All American')) {
          items.push(
            <div key={`cupA-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupA.svg"
                  alt="All American Second Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - Second Team All American`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        } else if (awardType.includes('3 - All American')) {
          items.push(
            <div key={`cupA-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupA.svg"
                  alt="All American Third Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - Third Team All American`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        }
      }
    });
    
    // Next, add cupR awards (All Region)
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      if (awardType.includes('1 - All Region') || awardType.includes('2 - All Region') || awardType.includes('3 - All Region')) {
        // Format the display text with position
        const displayText = `${awardYear}-${primaryPosition}`;
        
        // Determine which icon to use based on award type
        if (awardType.includes('1 - All Region')) {
          items.push(
            <div key={`cupR-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupR.svg"
                  alt="All Region First Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - First Team All Region`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        } else if (awardType.includes('2 - All Region')) {
          items.push(
            <div key={`cupR-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupR.svg"
                  alt="All Region Second Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - Second Team All Region`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        } else if (awardType.includes('3 - All Region')) {
          items.push(
            <div key={`cupR-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupR.svg"
                  alt="All Region Third Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - Third Team All Region`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        }
      }
    });
    
    // Next, add cupC awards
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      if (awardType.includes('1 - All Conference') || awardType.includes('2 - All Conference') || awardType.includes('3 - All Conference')) {
        // Format the display text with position
        const displayText = `${awardYear}-${primaryPosition}`;
        
        // Determine which icon to use based on award type
        if (awardType.includes('1 - All Conference')) {
          items.push(
            <div key={`cupC-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupC.svg"
                  alt="All Conference First Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - First Team All Conference`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        } else if (awardType.includes('2 - All Conference')) {
          items.push(
            <div key={`cupC-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupC.svg"
                  alt="All Conference Second Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - Second Team All Conference`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        } else if (awardType.includes('3 - All Conference')) {
          items.push(
            <div key={`cupC-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ marginRight: '10px' }}>
                <Image
                  src="/cupC.svg"
                  alt="All Conference Third Team"
                  width={36}
                  height={36}
                />
              </div>
              <Tooltip title={`${awardYear} - Third Team All Conference`}>
                <span style={{ fontSize: '14px' }}>{displayText}</span>
              </Tooltip>
            </div>
          );
        }
      }
    });
    
    // Now add medals grouped by team level
    
    // First Team medals (All American first, then All Conference, then All Region)
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      // First Team All American
      if (awardType.includes('1 - All American')) {
        items.push(
          <div key={`medal1-aa-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-1.svg"
                alt="First Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - First Team All American`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // First Team All Conference
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      if (awardType.includes('1 - All Conference')) {
        items.push(
          <div key={`medal1-ac-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-1.svg"
                alt="First Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - First Team All Conference`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // First Team All Region
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      if (awardType.includes('1 - All Region')) {
        items.push(
          <div key={`medal1-ar-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-1.svg"
                alt="First Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - First Team All Region`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // Second Team medals (All American first, then All Conference, then All Region)
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      // Second Team All American
      if (awardType.includes('2 - All American')) {
        items.push(
          <div key={`medal2-aa-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-2.svg"
                alt="Second Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - Second Team All American`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // Second Team All Conference
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      if (awardType.includes('2 - All Conference')) {
        items.push(
          <div key={`medal2-ac-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-2.svg"
                alt="Second Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - Second Team All Conference`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // Second Team All Region
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      if (awardType.includes('2 - All Region')) {
        items.push(
          <div key={`medal2-ar-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-2.svg"
                alt="Second Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - Second Team All Region`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // Third Team medals (All American first, then All Conference, then All Region)
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      // Third Team All American
      if (awardType.includes('3 - All American')) {
        items.push(
          <div key={`medal3-aa-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-3.svg"
                alt="Third Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - Third Team All American`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // Third Team All Conference
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      if (awardType.includes('3 - All Conference')) {
        items.push(
          <div key={`medal3-ac-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-3.svg"
                alt="Third Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - Third Team All Conference`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    // Third Team All Region
    honorsToUse.forEach((honor, index) => {
      const awardYear = honor.award_year;
      const awardType = honor.award;
      
      // Format the display text with position
      const displayText = `${awardYear}-${primaryPosition}`;
      
      if (awardType.includes('3 - All Region')) {
        items.push(
          <div key={`medal3-ar-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ marginRight: '10px' }}>
              <Image
                src="/madal-3.svg"
                alt="Third Team Medal"
                width={18}
                height={36}
                style={{ marginLeft: '9px' }}
              />
            </div>
            <Tooltip title={`${awardYear} - Third Team All Region`}>
              <span style={{ fontSize: '14px' }}>{displayText}</span>
            </Tooltip>
          </div>
        );
      }
    });
    
    return items;
  };

  return (
    <div className="achievement-list" style={{ margin: '10px' }}>
      <style jsx>{`
        .achievement-list {
          display: flex;
          flex-direction: column;
        }
        .achievement-list > div {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .achievement-list > div > div:first-child {
          display: flex;
          justify-content: center;
          width: 36px;
          margin-right: 10px;
        }
        .achievement-list > div > div:first-child > img {
          margin: 0 auto;
        }
      `}</style>
      {renderAwardItems()}
    </div>
  );
};

export default AchievementList; 