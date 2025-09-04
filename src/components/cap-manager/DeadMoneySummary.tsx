import React, { useState } from 'react';
import { Player } from '../../types/Player';
import { formatCompensation } from '../../utils/utils';
import styles from './DeadMoneySummary.module.css';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface DeadMoneySummaryProps {
  deadMoneyPlayers: Player[];
  onPlayerClick: (player: Player) => void;
}

const DeadMoneySummary: React.FC<DeadMoneySummaryProps> = ({ 
  deadMoneyPlayers,
  onPlayerClick 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleToggleTooltip = () => {
    setShowTooltip(prevState => !prevState);
  };

  if (!deadMoneyPlayers || deadMoneyPlayers.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyContent}>No Dead Money</div>
      </div>
    );
  }

  const totalComp = deadMoneyPlayers.reduce((sum, player) => {
    const baseComp = player.compensation || 0;
    const additionalComp = Object.entries(player)
      .filter(([key]) => key.startsWith('comp_'))
      .reduce((compSum, [_, value]) => compSum + (value as number || 0), 0);
    return sum + baseComp + additionalComp;
  }, 0);

  const totalScholarship = deadMoneyPlayers.reduce(
    (sum, player) => sum + (player.scholarship_perc || 0), 0
  ).toFixed(2);

  return (
    <div className={styles.deadMoneySummary} onClick={handleToggleTooltip}>
      <div className={styles.content}>
        <div className={styles.leftSection}>
          <div className={styles.header}>Dead Money</div>
          <div>Players: {deadMoneyPlayers.length}</div>
        </div>
        <div className={styles.rightSection}>
          <div className={styles.compText}>Comp: {formatCompensation(totalComp)}</div>
          <div>Schol: {totalScholarship}</div>
        </div>
      </div>
      
      <div className={styles.toggleIcon}>
        {showTooltip ? 
          <FaChevronUp style={{ color: '#ffffff' }} /> : 
          <FaChevronDown style={{ color: '#ffffff' }} />
        }
      </div>
      
      {showTooltip && (
        <div className={styles.tooltip}>
          {deadMoneyPlayers.map((player) => {
            const totalComp = (player.compensation || 0) + 
              Object.entries(player)
                .filter(([key]) => key.startsWith('comp_'))
                .reduce((sum, [_, value]) => sum + (value as number || 0), 0);
            
            return (
              <div 
                key={player.id} 
                className={styles.tooltipRow}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent closing the tooltip
                  onPlayerClick(player);
                }}
                style={{ cursor: 'pointer' }}
              >
                <span className={styles.playerName}>
                  {player.name__first} {player.name__last}
                </span>
                <span className={styles.playerComp}>
                  {formatCompensation(totalComp)}
                </span>
                <span className={styles.playerSchol}>
                  {(player.scholarship_perc || 0).toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeadMoneySummary; 