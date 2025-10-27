import { FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { Player } from "../../types/Player";
import { calculateTeamSummary, calculateCategorySummary } from "../../utils/summaryBoxUtils";
import { SummaryRow } from './SummaryRow';
import summaryStyles from '../../styles/SummaryBox.module.css';
import styles from './KanbanBoard.module.css';
import { useState } from 'react';
import { formatCompensation, calculatePercentage, useShowScholarshipDollars } from '../../utils/utils';
import { useEffectiveCompAccess } from '../../utils/compAccessUtils';

interface BoardSummariesProps {
  showSummaries: boolean;
  setShowSummaries: (show: boolean) => void;
  tasks: Player[];
  budgetData: any[];
  selectedYear: number;
  activeFilters: { [key: string]: string[] };
  categories: string[];
  columns: { [key: string]: Player[] };
  positionOrder: string[];
  totalActualCompensation: number;
  totalBudgetedCompensation: number;
  deadMoney: Player[];
  children?: React.ReactNode;
}

const getAdditionalFields = (budgetData: any[]): string[] => {
  if (!budgetData || budgetData.length === 0) return [];
  
  const standardFields = [
    'amount', 'category', 'id', 'order', 'position', 
    'roster_spots', 'scenario', 'scholarships', 'slot', 
    'team', 'year', 'scholarships_dollars'
  ];
  
  const overallBudget = budgetData.find(item => item.category === 'overall');
  if (!overallBudget) return [];
  
  // Filter out standard fields from the overall budget
  return Object.keys(overallBudget).filter(key => !standardFields.includes(key));
};

const BoardSummaries: React.FC<BoardSummariesProps> = ({
  showSummaries,
  setShowSummaries,
  tasks,
  budgetData,
  selectedYear,
  activeFilters,
  categories,
  columns,
  positionOrder,
  totalActualCompensation,
  totalBudgetedCompensation,
  deadMoney,
  children
}) => {
  const additionalFields = getAdditionalFields(budgetData);
  const [showSubBudgets, setShowSubBudgets] = useState(false);
  const { effectiveCompAccess } = useEffectiveCompAccess();
  const showScholarshipDollars = useShowScholarshipDollars();

  // Modified SummaryRow for the total row that includes the expand/collapse button
  const TotalSummaryRow = ({ label, actual, target, isCompensation, totalActualCompensation, totalTeamBudgetedComp, isTotal, showPercentages }: { 
    label: string;
    actual: number;
    target: number;
    isCompensation: boolean;
    totalActualCompensation: number;
    totalTeamBudgetedComp?: number;
    isTotal?: boolean;
    showPercentages?: boolean;
  }) => {
    const diff = Math.round((actual - target) * 100) / 100;
    const diffPrefix = diff < 0 ? '-' : '+';
    const absDiff = Math.abs(diff);
    
    const compColor = isCompensation
      ? (absDiff < 1000 ? summaryStyles.black : (diff < 0 ? summaryStyles.green : summaryStyles.red))
      : '';
      
    // Format compensation values using the same formatter as the rest of the app
    const formatValue = (value: number, isCompensation: boolean) => {
      if (isCompensation) {
        return formatCompensation(value);
      }
      return value.toString();
    };

    // Only render if it's not compensation or if effectiveCompAccess is true
    if (isCompensation && !effectiveCompAccess) return null;

    return (
      <div className={summaryStyles.summaryRow}>
        <span className={summaryStyles.label}>{label}</span>
        <span className={summaryStyles.actual}>
          {formatValue(actual, isCompensation)}
          {isCompensation && totalActualCompensation && showPercentages &&
            <div className={summaryStyles.percentage}>
              {calculatePercentage(actual, totalActualCompensation)}%
            </div>
          }
        </span>
        <span className={summaryStyles.target}>
          {formatValue(target, isCompensation)}
          {isCompensation && totalTeamBudgetedComp && showPercentages &&
            <div className={summaryStyles.percentage}>
              {calculatePercentage(target, totalTeamBudgetedComp)}%
            </div>
          }
        </span>
        <span className={`${summaryStyles.diff} ${isCompensation ? compColor : ''}`}>
          <div className={summaryStyles.diffContainer}>
            <span className={`${isCompensation ? compColor : ''}`}>{`${diffPrefix}${formatValue(absDiff, isCompensation)}`}</span>
          </div>
          {isCompensation && showPercentages && (
            <div className={`${summaryStyles.percentage} ${compColor}`}>
              {calculatePercentage(absDiff, target)}%
            </div>
          )}
        </span>
        <span className={summaryStyles.caret}>
          {additionalFields.length > 0 && effectiveCompAccess && isCompensation && (
            <button 
              className={summaryStyles.expandCollapseButtonInline}
              onClick={() => setShowSubBudgets(!showSubBudgets)}
              aria-label={showSubBudgets ? "Collapse budget details" : "Expand budget details"}
            >
              {showSubBudgets ? <FaChevronUp /> : <FaChevronDown />}
            </button>
          )}
        </span>
      </div>
    );
  };

  const renderSummaryRows = (summary: any) => {
    const hasAdditionalFields = additionalFields.length > 0;
    
    // Main is just the base compensation
    const actualMain = summary.actual.compensation;
    const targetMain = summary.target.compensation;
    
    // Calculate total including all additional fields
    const actualTotal = hasAdditionalFields 
      ? (actualMain + additionalFields.reduce((sum, field) => sum + (summary.actual[field] || 0), 0))
      : actualMain;
    
    const targetTotal = hasAdditionalFields 
      ? (targetMain + additionalFields.reduce((sum, field) => sum + (summary.target[field] || 0), 0))
      : targetMain;

    // Scholarships: use dollars if flag is on, else count
    let actualScholarships, targetScholarships;
    if (showScholarshipDollars) {
      // Sum scholarship_dollars_total for actual
      actualScholarships = Array.isArray(summary.actual.players)
        ? summary.actual.players.reduce((sum: number, p: any) => sum + (p.scholarship_dollars_total || 0), 0)
        : (summary.actual.scholarship_dollars_total || 0);
      // Use scholarships_dollars for target
      targetScholarships = summary.target.scholarships_dollars || 0;
    } else {
      actualScholarships = summary.actual.scholarships;
      targetScholarships = summary.target.scholarships;
    }

    return (
      <>
        <SummaryRow 
          label="Players"
          actual={summary.actual.roster_spots}
          target={summary.target.roster_spots}
          isCompensation={false}
          totalActualCompensation={totalActualCompensation}
        />
        <SummaryRow 
          label={showScholarshipDollars ? "Schol. $" : "Schol."}
          actual={actualScholarships}
          target={targetScholarships}
          isCompensation={false}
          scholAsDollar={showScholarshipDollars}
          totalActualCompensation={totalActualCompensation}
        />
        
        {/* Only show compensation data if effectiveCompAccess is true */}
        {effectiveCompAccess && (
          <>
            {/* Total compensation with the expand/collapse button */}
            <TotalSummaryRow 
              label={hasAdditionalFields ? "Total" : "Comp"}
              actual={actualTotal}
              target={targetTotal}
              isCompensation={true}
              totalActualCompensation={totalActualCompensation}
              totalTeamBudgetedComp={totalBudgetedCompensation}
              isTotal={hasAdditionalFields}
              showPercentages={true}
            />
            
            {/* Show detailed budget items only when expanded */}
            {showSubBudgets && hasAdditionalFields && (
              <div className={summaryStyles.detailedBudget}>
                <SummaryRow 
                  label="Main"
                  actual={actualMain}
                  target={targetMain}
                  isCompensation={true}
                  totalActualCompensation={totalActualCompensation}
                  totalTeamBudgetedComp={totalBudgetedCompensation}
                  showPercentages={false}
                />
                {additionalFields.map(field => (
                  <SummaryRow 
                    key={field}
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    actual={summary.actual[field] || 0}
                    target={summary.target[field] || 0}
                    isCompensation={true}
                    totalActualCompensation={totalActualCompensation}
                    totalTeamBudgetedComp={totalBudgetedCompensation}
                    showPercentages={false}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div className={`${summaryStyles.leftSidebar} ${showSummaries ? '' : summaryStyles.collapsed}`}>
      <button 
        className={summaryStyles.toggleSummariesButton} 
        onClick={() => setShowSummaries(!showSummaries)}
        aria-label={showSummaries ? "Hide summaries" : "Show summaries"}
      >
        {showSummaries ? <FaChevronLeft /> : <FaChevronRight />}
      </button>
      <div className={summaryStyles.summariesContainer} style={{ paddingTop: '0' }}>
        <div className={styles.addPlayerButtonContainer}>
          {children}
        </div>
        {/* Team Summary Header */}
        <div className={summaryStyles.teamSummary}>
          <div className={summaryStyles.summaryContent}>
            <div className={summaryStyles.summaryHeader}>
              <span className={summaryStyles.position}>Team</span>
              <span className={summaryStyles.actual}>Actual</span>
              <span className={summaryStyles.target}>Budget</span>
              <span className={summaryStyles.diff}>Diff</span>
              <span className={summaryStyles.caret}></span>
            </div>
            {(() => {
              const summary = calculateTeamSummary(tasks, budgetData, selectedYear, activeFilters, deadMoney);
              return renderSummaryRows(summary);
            })()}
          </div>
        </div>

        {/* Category Summaries */}
        {categories.map((category) => (
          <div key={category} className={summaryStyles.categorySummary}>
            <div className={summaryStyles.summaryContent}>
              <div className={summaryStyles.summaryHeader}>
                <span className={summaryStyles.position}>{category}</span>
                <span className={summaryStyles.actual}>Actual</span>
                <span className={summaryStyles.target}>Budget</span>
                <span className={summaryStyles.diff}>Diff</span>
                <span className={summaryStyles.caret}></span>
              </div>
              {(() => {
                const summary = calculateCategorySummary(tasks, budgetData, category, selectedYear, activeFilters, positionOrder, deadMoney);
                return renderSummaryRows(summary);
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoardSummaries; 