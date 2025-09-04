"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from './EndingSeasonModal.module.css';
import ReactDOM from 'react-dom';
import { CompensationDetailsTable, YearlyData, MONTH_ORDER } from '../../utils/CompensationDetailsTable';
import { supabase } from '../../lib/supabaseClient';
import { fetchAdjustedPlayers } from '../../utils/utils';
import { CompensationDetailsTableRef } from '../../utils/CompensationDetailsTable';

interface MonthlyCompensationDetail {
  month: string;
  amount: number;
  scholarshipPerc: number;
  onRoster: boolean;
}

interface EndingSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEndingSeason?: number;
  currentCompensation?: number;
  currentScholarshipPerc?: number;
  startYear: number;
  eligibilityYears: number;
  athleteId: string;
  selectedScenario: string;
  targetScenario: string;
  team: string;
  selectedYear: number;
  onDataChange?: (
    yearlyData: Record<number, YearlyData>,
    monthlyDetails: Record<number, MonthlyCompensationDetail[]>,
    expandedYears: number[]
  ) => void;
}

interface LastMonthSettings {
  year: number;
  month: string;
}

export const EndingSeasonModal: React.FC<EndingSeasonModalProps> = ({
  isOpen,
  onClose,
  currentEndingSeason,
  athleteId,
  selectedScenario,
  targetScenario,
  team,
  selectedYear,
  onDataChange
}) => {
  const [includeDeadMoney, setIncludeDeadMoney] = useState(false);
  const [endingSeason, setEndingSeason] = useState<number>(currentEndingSeason || 0);
  const [lastMonth, setLastMonth] = useState<LastMonthSettings>({ year: 0, month: 'Jan' });
  const [yearlyData, setYearlyData] = useState<Record<number, YearlyData>>({});
  const [monthlyDetails, setMonthlyDetails] = useState<Record<number, MonthlyCompensationDetail[]>>({});
  const [updatedMonthlyDetails, setUpdatedMonthlyDetails] = useState<Record<number, MonthlyCompensationDetail[]>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedYears, setExpandedYears] = useState<number[]>([]);

  const tableRef = useRef<CompensationDetailsTableRef>(null);

  // useEffect(() => {
  //   console.log('tableRef updated:', {
  //     exists: !!tableRef.current,
  //     methods: tableRef.current ? Object.keys(tableRef.current) : [],
  //     ref: tableRef.current
  //   });
  // }, [tableRef.current]);

  const applyLastMonth = () => {
    if (!tableRef.current) {
      console.log('Table ref not ready');
      return;
    }

    const { year, month } = lastMonth;
    const monthIndex = MONTH_ORDER.indexOf(month);
    
   

    const updatedYearlyData = { ...yearlyData };
    const updatedMonthlyDetails = { ...monthlyDetails };

    Object.keys(yearlyData).forEach(yearStr => {
      const currentYear = parseInt(yearStr);

      if (currentYear > year) {
        updatedYearlyData[currentYear] = {
          ...yearlyData[currentYear],
          compensation: 0,
          scholarshipPerc: 0,
          onRoster: false
        };
      } else if (currentYear === year) {
        const activeMonths = monthlyDetails[currentYear].filter(
          monthData => MONTH_ORDER.indexOf(monthData.month) <= monthIndex
        );
        const totalCompensation = activeMonths.reduce((sum, month) => sum + (month.amount || 0), 0);
        const maxScholarship = Math.max(...activeMonths.map(month => month.scholarshipPerc || 0));
        
        updatedYearlyData[currentYear] = {
          ...yearlyData[currentYear],
          compensation: totalCompensation,
          scholarshipPerc: maxScholarship,
          onRoster: false
        };
      }

      // Update monthly details
      updatedMonthlyDetails[currentYear] = MONTH_ORDER.map(monthName => {
        const isAfterCutoff = currentYear > year || 
          (currentYear === year && MONTH_ORDER.indexOf(monthName) > monthIndex);
        

        return {
          month: monthName,
          amount: isAfterCutoff ? 0 : (monthlyDetails[currentYear]?.find(m => m.month === monthName)?.amount || 0),
          scholarshipPerc: isAfterCutoff ? 0 : (monthlyDetails[currentYear]?.find(m => m.month === monthName)?.scholarshipPerc || 0),
          onRoster: !isAfterCutoff
        };
      });
    });

    // Update visual state through refs
    Object.keys(updatedYearlyData).forEach(yearStr => {
      const currentYear = parseInt(yearStr);
      const data = updatedYearlyData[currentYear];
      tableRef.current!.handleYearlyDataChange(currentYear, 'compensation', data.compensation);
      tableRef.current!.handleYearlyDataChange(currentYear, 'scholarshipPerc', data.scholarshipPerc);
      tableRef.current!.handleYearlyRosterChange(currentYear, data.onRoster);
    });

   
    // Update states
    setYearlyData(updatedYearlyData);
    setUpdatedMonthlyDetails(updatedMonthlyDetails);
    setHasChanges(true);
  };

  const handleSave = async () => {
    let dataToSave = yearlyData;
    let monthlyDetailsToSave = updatedMonthlyDetails;
    const { players } = await fetchAdjustedPlayers(
      team,
      selectedYear,
      selectedScenario,
      {}, // No filters needed
      'Jan', // Use Jan by default for ending season modal
      athleteId
    );
    const athlete_data = players[0];
    if (!includeDeadMoney) {
      // Update data for non-dead money scenario
      const updatedYearlyData: Record<number, YearlyData> = {};
      Object.keys(yearlyData).forEach(yearStr => {
        const year = parseInt(yearStr);
        updatedYearlyData[year] = {
          ...yearlyData[year],
          compensation: year > endingSeason ? 0 : yearlyData[year].compensation,
          scholarshipPerc: year > endingSeason ? 0 : yearlyData[year].scholarshipPerc,
          onRoster: year <= endingSeason,
          ending_season: endingSeason
        };
      });

      const updatedMonthlyDetails: Record<number, MonthlyCompensationDetail[]> = {};
      Object.keys(monthlyDetails).forEach(yearStr => {
        const year = parseInt(yearStr);
        updatedMonthlyDetails[year] = monthlyDetails[year].map(month => ({
          ...month,
          amount: year > endingSeason ? 0 : month.amount,
          scholarshipPerc: year > endingSeason ? 0 : month.scholarshipPerc,
          onRoster: year <= endingSeason
        }));
      });

      dataToSave = updatedYearlyData;
      monthlyDetailsToSave = updatedMonthlyDetails;
    }
    const overrideEntries = Object.entries(dataToSave).flatMap(([year, data]) => {
      const yearInt = parseInt(year);

      
      // Create yearly entries only if values have changed
      const yearlyEntries = [];

      // Check if scholarship percentage has changed
      if (data.scholarshipPerc !== athlete_data.scholarship_perc) {

        yearlyEntries.push({
          category: 'scholarship_perc',
          value: data.scholarshipPerc?.toString() || '',
          athlete_id: athleteId,
          scenario: targetScenario || '',
          month: '00',
          season_override: yearInt
        });
      }

      // Only include hide status if it has changed
      const originalHideValue = athlete_data.hide ? 1 : 0;
      const newHideValue = data.onRoster ? 0 : 1;
      if (originalHideValue !== newHideValue) {

        yearlyEntries.push({
          category: 'hide',
          value: newHideValue.toString(),
          athlete_id: athleteId,
          scenario: targetScenario || '',
          month: '00',
          season_override: yearInt
        });
      }

      // Create monthly entries for scholarship percentage changes
      const monthlyEntries = (monthlyDetails[yearInt] || [])
        .filter(monthData => {
          // Compare against athlete_data's base scholarship percentage
          const originalValue = athlete_data.scholarship_perc || 0;
          const newValue = monthData.scholarshipPerc || 0;

          return originalValue !== newValue;
        })
        .map(monthData => {
          return {
            category: 'scholarship_perc',
            value: (monthData.scholarshipPerc || 0).toString(),
            athlete_id: athleteId,
            scenario: targetScenario || '',
            month: monthData.month,
            season_override: yearInt
          };
        });



      return [...yearlyEntries, ...monthlyEntries];
    });

    // Update athletes_override_category table
    const { error: overrideError } = await supabase
      .from('athletes_override_category')
      .upsert(overrideEntries, {
        onConflict: ['athlete_id', 'category', 'scenario', 'month', 'season_override'],
        ignoreDuplicates: false
      });

    if (overrideError) {
      console.error('Error updating athletes_override_category:', overrideError);
      return;
    }

    // Update compensation table
    const compensationUpserts = Object.entries(dataToSave).flatMap(([year, data]) => {
      const yearUpsert = {
        athlete_id: athleteId,
        year: parseInt(year),
        month: '00',
        amount: data.compensation,
        scenario: targetScenario || ''
      };

      const monthlyUpserts = (monthlyDetails[parseInt(year)] || []).map(monthDetail => ({
        athlete_id: athleteId,
        year: parseInt(year),
        month: monthDetail.month,
        amount: monthDetail.amount,
        scenario: targetScenario || ''
      }));

      return [yearUpsert, ...monthlyUpserts];
    });

    if (compensationUpserts.length > 0) {
      const { error: detailsError } = await supabase
        .from('compensation')
        .upsert(compensationUpserts, {
          onConflict: ['athlete_id', 'year', 'month', 'scenario']
        });

      if (detailsError) {
        console.error('Error updating compensation details:', detailsError);
        return;
      }
    }

    // Call onDataChange callback and close modal
    onClose();
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        
        <h3>Early Removal Settings</h3>
        
        <div className={styles.modalSection}>
          <label>
            <input
              type="checkbox"
              checked={includeDeadMoney}
              onChange={(e) => setIncludeDeadMoney(e.target.checked)}
            />
            Include Dead Money
          </label>
        </div>

        {!includeDeadMoney && (
          <div className={styles.modalSection}>
            <label>Last Season on Roster:</label>
            <input
              type="number"
              value={endingSeason || ''}
              onChange={(e) => setEndingSeason(parseInt(e.target.value) || 0)}
              placeholder="Enter year"
            />
          </div>
        )}

        {includeDeadMoney && (
          <>
            <div className={styles.modalSection}>
              <label>Last Active Month:</label>
              <select 
                value={lastMonth.year}
                onChange={(e) => setLastMonth(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              >
                {Object.keys(yearlyData).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={lastMonth.month}
                onChange={(e) => setLastMonth(prev => ({ ...prev, month: e.target.value }))}
              >
                {MONTH_ORDER.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <button onClick={applyLastMonth}>Apply Last Month</button>
            </div>

            <CompensationDetailsTable
              ref={tableRef}
              athleteId={athleteId}
              selectedScenario={selectedScenario}
              onDataChange={(yearlyData, monthlyDetails, expandedYears) => {
                setYearlyData(yearlyData);
                setMonthlyDetails(monthlyDetails);
                setExpandedYears(expandedYears);
                setHasChanges(true);
              }}
            />
          </>
        )}

        <div className={styles.modalButtons}>
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} className={styles.saveButton}>Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
}; 