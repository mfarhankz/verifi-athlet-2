import React, { useRef, useEffect, useMemo } from 'react';
import styles from "./PlayerCard.module.css";
import { useEffectiveCompAccess, CompDisplayMode } from '../../utils/compAccessUtils';
import walkOnIcon from '../../../public/walk-on.png'; 
import scholarshipIcon from '../../../public/scholarship.png';
import injuryIcon from '../../../public/injury2.png'; 
import { Player } from '../../types/Player'; // Adjust the import path as needed
import { BsCurrencyDollar } from 'react-icons/bs';  // or any other icon you prefer
import { BsStars } from 'react-icons/bs';
import Image from 'next/image';
import { IoIosArrowUp, IoIosArrowDown } from 'react-icons/io';
import pffIcon from '../../../public/pff.png';
import { useColorConfig } from '@/contexts/ColorConfigContext';
import { TEST_ATHLETE_ID } from '@/utils/utils';
import { useUserData } from '@/hooks/useUserData';

interface PlayerCardProps {
    player: Player & {
        [key: string]: any; // Allow for other comp_ properties
    };
    selectedYear: number;
    onClick: (id: string) => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isDraggable?: boolean;
    context: 'kanban' | 'yearView';
    selectedScenario?: string;
    showScholarshipDollars: boolean;
}

// Function to inject custom CSS for side colors
const injectCustomSideColor = (tier: number, color: string) => {
  // Create a unique class name
  const className = `custom-tier-${tier}-${color.replace('#', '')}`;
  
  // Only inject CSS on the client side
  if (typeof window !== 'undefined') {
    // Check if style already exists
    if (!document.getElementById(className)) {
      const style = document.createElement('style');
      style.id = className;
      style.innerHTML = `
        .${className}::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 10px;
          z-index: 1;
          background-color: ${color};
          ${color === '#ffffff' || color === 'white' ? 'border-right: 1px solid #ccc;' : ''}
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  return className;
};

const PlayerCard: React.FC<PlayerCardProps> = ({ player, selectedYear, onClick, onMoveUp, onMoveDown, isDraggable, context, selectedScenario, showScholarshipDollars }) => {
  const { effectiveCompAccess, compDisplayMode } = useEffectiveCompAccess();
  const { getBackgroundColor, getSideColor, colorConfig } = useColorConfig();
  const { activeCustomerId } = useUserData();
  
  // Check if this user should have white text
  const shouldUseWhiteText = activeCustomerId === '52e230ae-5dd7-48ef-9611-dc01d3f8fd95';
  
  // Check if this is our test player
  const isTestPlayer = player.athlete_id === TEST_ATHLETE_ID;
  const isRecruit = player.starting_season > selectedYear;
  const isCommitted = player.is_committed === 1;
  const isInjured = player.is_injured === 1;
  const nameRef = useRef<HTMLHeadingElement>(null);
  const displayPosition = isRecruit ? player.description?.replace(/\d+$/, '') : player.description;

  useEffect(() => {
    const nameElement = nameRef.current;
    if (nameElement) {
      const fullName = `${player.name__first} ${player.name__last}`;
      const nameLength = fullName.length;
      const fontSize = Math.max(0.8, 1.3 - (nameLength - 16) * 0.05);
      nameElement.style.setProperty('--font-size', `${fontSize}em`);
    }
  }, [player.name__first, player.name__last]);

  // Get background color based on eligibility
  const getCardClassName = () => {
    // Debug logging for test player
    if (isTestPlayer) {
      console.log('TEST_PLAYER: Getting card class name');
      console.log('TEST_PLAYER: isRecruit =', isRecruit);
      console.log('TEST_PLAYER: colorConfig =', colorConfig);
    }
    
    // If we're in recruit mode, return the recruit classes
    if (isRecruit) {
      if (!player.year.includes('FR')) {
        // Player won't be a freshman in their starting season
        return isCommitted ? styles.committedTransferRecruit : styles.transferRecruit;
      } else {
        // Player will be a freshman in their starting season
        return isCommitted ? styles.committedRecruit : styles.recruit;
      }
    }

    // If using custom colors through the color config, don't use class-based styling
    const categoryValue = player[colorConfig.backgroundCategory];
    if (categoryValue !== undefined && getBackgroundColor(colorConfig.backgroundCategory, categoryValue)) {
      if (isTestPlayer) {
        console.log('TEST_PLAYER: Using custom color via config, returning empty class');
      }
      return '';
    }

    // Fall back to default classes for the context
    if (context === 'yearView') {
      const className = styles[player.year.replace(/^(T|R)/, '')] || '';
      if (isTestPlayer) {
        console.log('TEST_PLAYER: Using yearView class:', className);
      }
      return className;
    }
    
    const eligClass = styles[`elig-${player.eligRemaining}`];
    if (isTestPlayer) {
      console.log('TEST_PLAYER: Using eligibility class:', eligClass);
    }
    return eligClass;
  };

  // Get inline styles for the card
  const getCardStyle = useMemo(() => {
    const style: React.CSSProperties = {};

    // Apply white text color for specific customer
    if (shouldUseWhiteText) {
      style.color = 'white';
    }

    if (isRecruit) {
      // For recruits, no custom background color
      return style;
    }

    // Get the appropriate category value based on the configuration
    let categoryValue: string | number | undefined;
    
    if (colorConfig.backgroundCategory === 'compensation') {
      // Parse compensationDisplay to a number (remove $ and commas, handle K/M)
      if (player.compensationDisplay) {
        let display = player.compensationDisplay.trim();
        let multiplier = 1;

        if (/k$/i.test(display)) {
          multiplier = 1000;
          display = display.replace(/k$/i, '');
        } else if (/m$/i.test(display)) {
          multiplier = 1000000;
          display = display.replace(/m$/i, '');
        }

        // Remove all non-numeric characters except . and -
        const numericValue = Number(
          display.replace(/[^0-9.-]+/g, '')
        ) * multiplier;

        categoryValue = isNaN(numericValue) ? undefined : numericValue;
      } else {
        categoryValue = undefined;
      }
    } else if (colorConfig.backgroundCategory === 'eligibility_remaining') {
      categoryValue = player.elig_remaining;
    } else if (colorConfig.backgroundCategory === 'year') {
      categoryValue = player.year.replace(/^(T|R)/, '');
    } else {
      categoryValue = player[colorConfig.backgroundCategory];
    }

    // If we have a value, try to get a matching color
    if (categoryValue !== undefined) {
      const customColor = getBackgroundColor(colorConfig.backgroundCategory, categoryValue);
      if (customColor) {
        style.backgroundColor = customColor;
        
        // Debug logging for test player
        if (isTestPlayer) {
          console.log('TEST_PLAYER: Background Color Calculation');
          console.log('TEST_PLAYER: Category =', colorConfig.backgroundCategory);
          console.log('TEST_PLAYER: Category Value =', categoryValue);
          console.log('TEST_PLAYER: Applied Color =', customColor);
          console.log('TEST_PLAYER: Color Rules =', colorConfig.backgroundRules);
        }
      } else if (isTestPlayer) {
        console.log('TEST_PLAYER: No matching background color found for', categoryValue);
      }
    } else if (isTestPlayer) {
      console.log('TEST_PLAYER: No category value found for', colorConfig.backgroundCategory);
    }

    return style;
  }, [player, colorConfig, getBackgroundColor, isRecruit, isTestPlayer, shouldUseWhiteText]);

  const displayYear = isRecruit ? `${player.starting_season}` : player.year;

  const isNeutral = Math.abs(player.budgetDifference || 0) < 500;
  const compensationClass = isNeutral ? styles.neutral : ((player.budgetDifference || 0) >= 0 ? styles.positive : styles.negative);
  const budgetDifferenceDisplay = isNeutral ? '$0' : `$${((player.budgetDifference || 0) >= 0 ? '+' : '')}${((player.budgetDifference || 0) / 1000).toFixed(0)}K`;

  // Get tier class for side color
  const getTierClassName = () => {
    if (colorConfig.sideCategory === 'tier') {
      const categoryValue = player.tier;
      // Ensure tier is defined before proceeding
      if (categoryValue !== undefined) {
        const customColor = getSideColor(colorConfig.sideCategory, categoryValue);
        
        if (customColor) {
          // Create a dynamically injected CSS class for the custom color
          const customClassName = injectCustomSideColor(Number(categoryValue), customColor);
          
          if (isTestPlayer) {
            console.log('TEST_PLAYER: Using custom injected side color:', customColor);
            console.log('TEST_PLAYER: Custom class name:', customClassName);
          }
          
          return customClassName;
        }
      }
      
      // Fall back to default tier classes if no custom color
      const tierClass = (() => {
        switch (player.tier) {
          case 1: return styles.tierOne;
          case 2: return styles.tierTwo;
          case 3: return styles.tierThree;
          case 4: return styles.tierFour;
          case 5: return styles.tierFive;
          case 6: return styles.tierSix;
          default: return '';
        }
      })();
      
      if (isTestPlayer) {
        console.log('TEST_PLAYER: Using default tier class for side color:', tierClass);
        console.log('TEST_PLAYER: Player tier =', player.tier);
      }
      
      return tierClass;
    }
    
    // For non-tier side categories, create a custom class
    const categoryValue = player[colorConfig.sideCategory];
    if (categoryValue !== undefined) {
      const customColor = getSideColor(colorConfig.sideCategory, categoryValue);
      if (customColor) {
        // Use 999 as a placeholder for non-tier categories
        const customClassName = injectCustomSideColor(999, customColor);
        
        if (isTestPlayer) {
          console.log('TEST_PLAYER: Using custom injected side color for non-tier:', customColor);
          console.log('TEST_PLAYER: Custom class name:', customClassName);
        }
        
        return customClassName;
      }
    }
    
    return '';
  };

  // Log all player data for test player
  if (isTestPlayer) {
    console.log('TEST_PLAYER: Full Player Data', player);
    console.log('TEST_PLAYER: Found test player!', {
      id: player.id,
      athlete_id: player.athlete_id,
      TEST_ATHLETE_ID
    });
  }

  const additionalCompItems = Object.entries(player)
    .filter(([key, value]) => key.startsWith('comp_') && value > 0);

  const allCompItems = [
    ['Base Compensation', `$${player.compensation.toLocaleString()}`],
    ...additionalCompItems.map(([key, value]) => [
      key.replace('comp_', '').split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      `$${value.toLocaleString()}`
    ])
  ];

  const hasScenarioCompensation = player.base_compensation !== undefined && player.base_compensation !== player.compensation;
  const hasScenarioScholarship = player.base_scholarship_perc !== undefined && player.base_scholarship_perc !== player.scholarship_perc;

  const formatDollars = (amount?: number) =>
    typeof amount === "number"
      ? `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : "--";

  // Render the one-line version of the card
  if (compDisplayMode === 'oneLine') {
    return (
      <div
        className={`${styles.playerCard} ${styles.oneLineCard} ${context === 'yearView' ? styles.yearView : ''} ${getCardClassName()} ${getTierClassName()}`}
        onClick={() => onClick(player.id)}
        draggable={isDraggable || false}
        data-testid="player-card"
        style={getCardStyle}
      >
        <h4 ref={nameRef} className={styles.playerName} title={`${player.name__first} ${player.name__last}`} style={shouldUseWhiteText ? { color: 'white' } : {}}>
          {`${player.name__first} ${player.name__last}`}
          {isInjured && <span className={styles.injuryIcon}><Image src={injuryIcon.src} alt="Injured" className={styles.iconImage} width={16} height={16} /></span>}
        </h4>
      </div>
    );
  }

  return (
    <div
      className={`${styles.playerCard} ${context === 'yearView' ? styles.yearView : ''} ${getCardClassName()} ${!effectiveCompAccess ? styles.noCompAccess : ''} ${getTierClassName()}`}
      onClick={() => onClick(player.id)}
      draggable={isDraggable || false}
      data-testid="player-card"
      style={getCardStyle}
    >
      <div className={styles.header}>
        <h4 ref={nameRef} className={styles.playerName} title={`${player.name__first} ${player.name__last}`} style={shouldUseWhiteText ? { color: 'white' } : {}}>
          {effectiveCompAccess ? (
            <>
              {`${player.name__first} ${player.name__last}`}
              {isInjured && <span className={styles.injuryIcon}><Image src={injuryIcon.src} alt="Injured" className={styles.iconImage} width={16} height={16} /></span>}
              {player.pff_link && (
                <span className={styles.pffSection}>
                  <a 
                    href={player.pff_link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    onClick={(e) => e.stopPropagation()}
                    className={styles.pffLink}
                  >
                    <Image src={pffIcon.src} alt="PFF Profile" className={styles.iconImage} width={16} height={16} />
                  </a></span>)}
                  {player.player_tag && <span className={styles.playerTag} style={shouldUseWhiteText ? { color: 'white' } : {}}>{player.player_tag}</span>}
            </>
          ) : (
            <>
              <div style={shouldUseWhiteText ? { color: 'white' } : {}}>{player.name__first}</div>
              <div className={styles.lastNameRow} style={shouldUseWhiteText ? { color: 'white' } : {}}>
                {player.name__last}
                {isInjured && <span className={styles.injuryIcon}><Image src={injuryIcon.src} alt="Injured" className={styles.iconImage} width={16} height={16} /></span>}
                {player.pff_link && (
                  <span className={styles.pffSection}>
                    <a 
                      href={player.pff_link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      onClick={(e) => e.stopPropagation()}
                      className={styles.pffLink}
                    >
                      <Image src={pffIcon.src} alt="PFF Profile" className={styles.iconImage} width={16} height={16} />
                    </a>
                  </span>
                )}
                {player.player_tag && <span className={styles.playerTag} style={shouldUseWhiteText ? { color: 'white' } : {}}>{player.player_tag}</span>}
              </div>
            </>
          )}
        </h4>
        <div className={styles.playerInfo} style={shouldUseWhiteText ? { color: 'white' } : {}}>
          <span style={shouldUseWhiteText ? { color: 'white' } : {}}>{displayPosition} | {displayYear} | </span>
          {showScholarshipDollars ? (
            <span className={styles.scholarshipDollars} style={shouldUseWhiteText ? { color: 'white' } : {}}>
              {formatDollars(player.scholarship_dollars_total)}
            </span>
          ) : player.scholarship_perc === 0 ? (
            <span className={styles.walkOn} style={shouldUseWhiteText ? { color: 'white' } : {}}>
              <Image src={walkOnIcon.src} alt="Walk-on" className={styles.iconImage} width={16} height={16} />
              {hasScenarioScholarship && (
                <span 
                  className={styles.scenarioIndicator} 
                  title={`Modified by scenario: ${selectedScenario}`}
                  style={shouldUseWhiteText ? { color: 'white' } : {}}
                >
                  <BsStars size={12} />
                </span>
              )}
            </span>
          ) : player.scholarship_perc === 1 ? (
            <span className={styles.fullScholarship} style={shouldUseWhiteText ? { color: 'white' } : {}}>
              <Image src={scholarshipIcon.src} alt="Full Scholarship" className={styles.iconImage} width={16} height={16} />
              {hasScenarioScholarship && (
                <span 
                  className={styles.scenarioIndicator} 
                  title={`Modified by scenario: ${selectedScenario}`}
                  style={shouldUseWhiteText ? { color: 'white' } : {}}
                >
                  <BsStars size={12} />
                </span>
              )}
            </span>
          ) : player.scholarship_perc !== 1 && (
            <span style={shouldUseWhiteText ? { color: 'white' } : {}}>
              {(player.scholarship_perc * 100).toFixed(0)}% Schol.
              {hasScenarioScholarship && (
                <span 
                  className={styles.scenarioIndicator} 
                  title={`Modified by scenario: ${selectedScenario}`}
                  style={shouldUseWhiteText ? { color: 'white' } : {}}
                >
                  <BsStars size={12} />
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <div className={styles.details}>
        {effectiveCompAccess && (
          <div className={styles.compensation}>
            <p className={styles.amount}>
              <span className={`${styles.compensationAmount} ${compensationClass}`}>
                {player.compensationDisplay}
                {hasScenarioCompensation && (
                  <span 
                    className={styles.scenarioIndicator} 
                    title={`Modified by scenario: ${selectedScenario}`}
                    style={shouldUseWhiteText ? { color: 'white' } : {}}
                  >
                    <BsStars size={12} />
                  </span>
                )}
                {additionalCompItems.length > 0 && (
                  <span 
                    className={styles.compInfoIcon} 
                    title={allCompItems
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\n')}
                    style={shouldUseWhiteText ? { color: 'white' } : {}}
                  >
                    <BsCurrencyDollar size={14} />
                  </span>
                )}
              </span>
              {!isRecruit && (
                <span className={`${styles.budgetDifference} ${compensationClass}`}>
                  {budgetDifferenceDisplay}
                </span>
              )}
            </p>
            <p className={styles.percentages} style={shouldUseWhiteText ? { color: 'white' } : {}}>
              {player.teamPercentage ? player.teamPercentage.toFixed(1) : "0.0"}% | {player.positionPercentage ? player.positionPercentage.toFixed(0) : "0"}%
            </p>
          </div>
        )}
      </div>
      <div className={`${styles.playerImageContainer} ${!effectiveCompAccess ? styles.largeImage : ''}`}>
        {player.image_url && (
          <Image src={player.image_url} alt={`${player.name__first} ${player.name__last}`} className={styles.playerImage} width={100} height={100} priority />
        )}
      </div>
      <div className={styles.rankButtons}>
        <button 
          className={styles.rankButton} 
          onClick={(e) => {
            e.stopPropagation();
            onMoveUp?.();
          }}
        >
          <IoIosArrowUp />
        </button>
        <button 
          className={styles.rankButton} 
          onClick={(e) => {
            e.stopPropagation();
            onMoveDown?.();
          }}
        >
          <IoIosArrowDown />
        </button>
      </div>
    </div>
  );
};

export default PlayerCard;
