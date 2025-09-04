import React, { useMemo } from 'react';
import { Card, Typography } from 'antd';
import { useColorConfig } from '@/contexts/ColorConfigContext';
import styles from '@/components/cap-manager/PlayerCard.module.css';

const { Title, Text } = Typography;

interface ConfigPreviewProps {
  backgroundCategory: string;
  sideCategory: string;
  backgroundRules: any[];
  sideRules: any[];
}

// Define a sample player type with index signature to allow dynamic property access
interface SamplePlayer {
  id: number;
  name__first: string;
  name__last: string;
  year: string;
  description: string;
  tier: number;
  elig_remaining: number;
  eligRemaining: number;
  position: string;
  redshirt_status: string;
  [key: string]: string | number | boolean | undefined; // Index signature for dynamic access
}

const ConfigPreview: React.FC<ConfigPreviewProps> = ({
  backgroundCategory,
  sideCategory,
  backgroundRules,
  sideRules
}) => {
  const { getBackgroundColor, getSideColor } = useColorConfig();

  // Sample player data for preview
  const samplePlayers = useMemo(() => {
    const createSamplePlayer = (id: number, name: string, year: string, position: string, 
                              tier: number, eligibility: number): SamplePlayer => ({
      id,
      name__first: name.split(' ')[0],
      name__last: name.split(' ').slice(1).join(' '),
      year,
      description: position,
      tier,
      elig_remaining: eligibility,
      eligRemaining: eligibility,
      // Add other sample properties that might be used in color rules
      position,
      redshirt_status: id % 2 === 0 ? "Has Used" : "Has Not Used",
    });

    return [
      createSamplePlayer(1, "John Smith", "FR", "QB", 2, 4),
      createSamplePlayer(2, "Michael Johnson", "SO", "RB", 1, 3),
      createSamplePlayer(3, "David Williams", "JR", "WR", 3, 2),
      createSamplePlayer(4, "Robert Jones", "SR", "TE", 4, 1),
      createSamplePlayer(5, "James Brown", "GR", "OL", 5, 5),
    ];
  }, []);

  // Get style for card based on background category
  const getCardStyle = (player: SamplePlayer) => {
    const style: React.CSSProperties = {};
    
    let categoryValue;
    if (backgroundCategory === 'eligibility_remaining') {
      categoryValue = player.elig_remaining;
    } else if (backgroundCategory === 'year') {
      categoryValue = player.year.replace(/^(T|R)/, '');
    } else {
      categoryValue = player[backgroundCategory];
    }

    if (categoryValue !== undefined) {
      const customColor = getBackgroundColor(backgroundCategory, categoryValue);
      if (customColor) {
        style.backgroundColor = customColor;
      }
    }

    return style;
  };

  // Get style for side color
  const getSideColorStyle = (player: SamplePlayer) => {
    const style: React.CSSProperties = {};
    
    let categoryValue;
    if (sideCategory === 'tier') {
      categoryValue = player.tier;
    } else {
      categoryValue = player[sideCategory];
    }

    if (categoryValue !== undefined) {
      const customColor = getSideColor(sideCategory, categoryValue);
      if (customColor) {
        style.backgroundColor = customColor;
      }
    }

    return style;
  };

  // Get tier class for side color (if using default tier)
  const getTierClassName = (player: SamplePlayer) => {
    if (sideCategory === 'tier') {
      switch (player.tier) {
        case 1: return styles.tierOne;
        case 2: return styles.tierTwo;
        case 3: return styles.tierThree;
        case 4: return styles.tierFour;
        case 5: return styles.tierFive;
        case 6: return styles.tierSix;
        default: return '';
      }
    }
    return '';
  };

  return (
    <Card title="Color Configuration Preview" style={{ marginTop: 16 }}>
      <div className="mb-4">
        <Title level={5}>Background Color: {backgroundCategory}</Title>
        <Title level={5}>Side Color: {sideCategory}</Title>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {samplePlayers.map(player => (
          <div 
            key={player.id}
            className={`${styles.playerCard} ${getTierClassName(player)}`}
            style={getCardStyle(player)}
          >
            {/* Apply the side color manually for custom configurations */}
            {sideCategory !== 'tier' && (
              <div 
                className="absolute left-0 top-0 bottom-0 w-[10px] z-[1]" 
                style={getSideColorStyle(player)}
              />
            )}
            <div className={styles.header}>
              <h4 className={styles.playerName} title={`${player.name__first} ${player.name__last}`}>
                {`${player.name__first} ${player.name__last}`}
              </h4>
              <div className={styles.playerInfo}>
                <span>{player.description} | {player.year}</span>
              </div>
            </div>
            <div className="mt-2">
              <Text type="secondary">
                {backgroundCategory === 'eligibility_remaining' ? `Eligibility: ${player.elig_remaining}` : 
                 backgroundCategory === 'year' ? `Year: ${player.year}` : 
                 `${backgroundCategory}: ${String(player[backgroundCategory])}`}
              </Text>
              <br />
              <Text type="secondary">
                {sideCategory === 'tier' ? `Tier: ${player.tier}` : 
                 `${sideCategory}: ${String(player[sideCategory])}`}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ConfigPreview; 