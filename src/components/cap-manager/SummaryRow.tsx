import React from 'react';
import summaryStyles from '../../styles/SummaryBox.module.css';
import { useEffectiveCompAccess } from '../../utils/compAccessUtils';
import { formatCompensation, calculatePercentage, getDiffColor } from '../../utils/utils';

interface SummaryRowProps {
  label: string;
  actual: number;
  target: number;
  isCompensation: boolean;
  showPercentages?: boolean;
  totalActualCompensation: number;
  totalTeamBudgetedComp?: number;
  isTotal?: boolean;
  scholAsDollar?: boolean;
}

export const SummaryRow: React.FC<SummaryRowProps> = ({
  label,
  actual,
  target,
  isCompensation,
  showPercentages = false,
  totalActualCompensation,
  totalTeamBudgetedComp,
  isTotal,
  scholAsDollar = false,
}) => {
  const { effectiveCompAccess } = useEffectiveCompAccess();
  
  if (isCompensation && !effectiveCompAccess) return null;

  const formatValue = (value: number, isCompensation: boolean, scholAsDollar: boolean) => {
    const safeValue = (value == null || isNaN(value)) ? 0 : value;
    if (isCompensation || scholAsDollar) {
      return formatCompensation(safeValue);
    }
    return safeValue.toLocaleString();
  };

  const diff = Math.round((actual - target) * 100) / 100;
  const isScholarship = label === 'Schol.' || label === 'Schol. $';
  const isRosterSpot = label === 'Players';
  const diffColor = getDiffColor(actual, target, isScholarship || isRosterSpot);
  const diffPrefix = diff === 0 ? '' : ((isScholarship || isRosterSpot) ? (diff < 0 ? '' : '+') : (diff < 0 ? '-' : '+'));
  const absDiff = Math.abs(diff);

  const compColor = isCompensation
    ? (absDiff < 1000 ? summaryStyles.black : (diff < 0 ? summaryStyles.green : summaryStyles.red))
    : '';

  return (
    <div className={summaryStyles.summaryRow}>
      <span className={summaryStyles.label}>{label}</span>
      <span className={summaryStyles.actual}>
        {formatValue(actual, isCompensation, scholAsDollar)}
        {isCompensation && totalActualCompensation && showPercentages &&
          <div className={summaryStyles.percentage}>
            {calculatePercentage(actual, totalActualCompensation)}%
          </div>
        }
      </span>
      <span className={summaryStyles.target}>
        {formatValue(target, isCompensation, scholAsDollar)}
        {isCompensation && totalTeamBudgetedComp && showPercentages &&
          <div className={summaryStyles.percentage}>
            {calculatePercentage(target, totalTeamBudgetedComp)}%
          </div>
        }
      </span>
      <span className={`${summaryStyles.diff} ${isCompensation ? compColor : diffColor}`}>
        {`${diffPrefix}${formatValue(absDiff, isCompensation, scholAsDollar)}`}
        {isCompensation && showPercentages && (
          <div className={`${summaryStyles.percentage} ${compColor}`}>
            {calculatePercentage(absDiff, target)}%
          </div>
        )}
      </span>
      <span className={summaryStyles.caret}></span>
    </div>
  );
}; 