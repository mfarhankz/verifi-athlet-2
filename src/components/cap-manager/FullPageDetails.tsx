"use client";

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Player } from '../../types/Player';
import styles from './FullPageDetails.module.css';
import { fetchPositionOrder } from "../../utils/utils";
import { FaPlus, FaMinus } from 'react-icons/fa';
import Image from 'next/image';
import { DollarInput } from '../../utils/DollarInput';
import {MONTH_ORDER, CompensationDetailsTable, YearlyData, MonthlyCompensationDetail, CompensationDetailsTableRef } from '../../utils/CompensationDetailsTable';
import { fetchAdjustedPlayers } from '../../utils/utils';
import { CompDisplayMode } from '../../utils/compAccessUtils';
import { fetchBudgetData } from '../../utils/utils';
import { useShowScholarshipDollars } from '../../utils/utils';
import { CommentService } from '../../lib/commentService';
import { Comment } from '@/types/database';

interface FullPageDetailsProps {
  athleteId: string;
  team: string; 
  selectedYear: number;
  selectedScenario: string;
  targetScenario: string;
  effectiveCompAccess: boolean;
  compDisplayMode: CompDisplayMode;
}

type ScholarshipDetailKey = 'tuition' | 'fees' | 'room' | 'books' | 'meals' | 'cost_attendance';

const FullPageDetails: React.FC<FullPageDetailsProps> = ({ athleteId, team, selectedYear, selectedScenario, targetScenario, effectiveCompAccess, compDisplayMode }) => {
  const [formData, setFormData] = useState<Player | null>(null);
  const [originalAthleteData, setOriginalAthleteData] = useState<Player | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [positions, setPositions] = useState<Array<{position: string, category: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCompensationDetails, setShowCompensationDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  const [expandedYears, setExpandedYears] = useState<number[]>([]);
  const [yearlyData, setYearlyData] = useState<Record<number, YearlyData>>({});
  const [monthlyDetails, setMonthlyDetails] = useState<Record<number, MonthlyCompensationDetail[]>>({});
  const compensationTableRef = useRef<CompensationDetailsTableRef>(null);
  const [additionalBudgets, setAdditionalBudgets] = useState<Array<{name: string, amount: number}>>([]);
  const [showScholarshipDetails, setShowScholarshipDetails] = useState(false);
  const [showScholarshipMismatchModal, setShowScholarshipMismatchModal] = useState(false);
  const [scholarshipInput, setScholarshipInput] = useState<number>(0);
  const [scholarshipDetails, setScholarshipDetails] = useState<Record<ScholarshipDetailKey, number>>({
    tuition: 0,
    fees: 0,
    room: 0,
    books: 0,
    meals: 0,
    cost_attendance: 0,
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showCommentHistory, setShowCommentHistory] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, any>[]>([]);
  const showScholarshipDollars = useShowScholarshipDollars();

  // No need to convert effectiveCompAccess from string to boolean anymore
  const hasCompAccess = effectiveCompAccess;

  useEffect(() => {
    const fetchAthleteData = async () => {
      setLoading(true);
  
      // First fetch the budget data to determine additional fields
      const budgetData = await fetchBudgetData(team, selectedYear, selectedScenario);
      
      if (!budgetData) {
        console.error('Error fetching budget data');
        setLoading(false);
        return;
      }

      // Debug log removed('Fetched budget data:', budgetData);

      // Get additional fields from budget data
      const standardFields = [
        'amount', 'category', 'id', 'order', 'position', 
        'roster_spots', 'scenario', 'scholarships', 'slot', 
        'team', 'year', 'scholarships_dollars'
      ];
      
      // Find the overall budget item to extract additional budget names
      const overallBudgetItem = budgetData.find(item => item.category === 'overall');
      if (!overallBudgetItem) {
        console.error('No overall budget item found');
        setLoading(false);
        return;
      }

      // Extract additional budget fields from budget data
      const additionalFields = Object.keys(overallBudgetItem)
        .filter(key => !standardFields.includes(key))
        .filter(key => overallBudgetItem[key] !== null && overallBudgetItem[key] !== undefined);

      // Debug log removed('Found additional budget fields:', additionalFields);

      // Now fetch the player data
      const { players } = await fetchAdjustedPlayers(
        team,
        selectedYear,
        selectedScenario,
        {},
        'Jan', // Default to January for details view
        athleteId
      );

      if (players.length === 0) {
        console.error('No player found');
        setLoading(false);
        return;
      }

      const player = players[0];
      // Debug log removed('Fetched player data:', player);

      // Create additional budget fields array using the fields found in budget data
      const additionalBudgetFields = additionalFields.map(fieldName => ({
        name: fieldName,
        amount: (player as any)[fieldName] || 0
      }));
      
      // Debug log removed('Additional budget fields with values:', additionalBudgetFields);
      setAdditionalBudgets(additionalBudgetFields);
      
      // Set form data with the player info
      setFormData(player);
      setOriginalAthleteData(player); // Store the original data
      setPreviewImage(player.image_url);
      if (showScholarshipDollars) {
        setScholarshipInput(player.scholarship_dollars_total || 0);
      } else {
        setScholarshipInput((player.scholarship_perc || 0) * 100);
      }

      // Initialize yearlyData with the current year's data
      const initialYearlyData: Record<number, YearlyData> = {
        [selectedYear]: {
          year: selectedYear,
          compensation: player.compensation || 0,
          scholarshipPerc: player.scholarship_perc || 0,
          onRoster: !player.hide,
          ending_season: player.ending_season,
          additionalBudgets: additionalBudgetFields.reduce((acc, budget) => {
            acc[budget.name] = budget.amount;
            return acc;
          }, {} as Record<string, number>)
        }
      };
      // Debug log removed('Initial yearly data:', initialYearlyData);
      setYearlyData(initialYearlyData);

      setScholarshipDetails({
        tuition: player.scholarship_dollars_tuition || 0,
        fees: player.scholarship_dollars_fees || 0,
        room: player.scholarship_dollars_room || 0,
        books: player.scholarship_dollars_books || 0,
        meals: player.scholarship_dollars_meals || 0,
        cost_attendance: player.scholarship_dollars_cost_attendance || 0,
      });

      setLoading(false);
    };
  
    fetchAthleteData();
  }, [athleteId, selectedScenario, selectedYear, team]);

  useEffect(() => {
    if (errorMessage) {
      setIsErrorVisible(true);
      const timer = setTimeout(() => {
        setIsErrorVisible(false);
      }, 5000);
  
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    const fetchPositions = async () => {
      if (team && selectedYear) {
        const positionOrderData = await fetchPositionOrder(team, selectedYear);
        setPositions(positionOrderData);
      }
    };
  
    fetchPositions();
  }, [team, selectedYear]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let updatedValue: any = value;
    
    if (type === 'checkbox') {
      updatedValue = (e.target as HTMLInputElement).checked;
    } else if (name === 'compensation') {
      updatedValue = value === '' ? undefined : parseInt(value);
    }

    setFormData((prevState) => ({
      ...prevState!,
      [name]: updatedValue,
    }));
    setHasChanges(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setFormData((prevState) => ({
        ...prevState!,
        image_url: URL.createObjectURL(selectedFile),
      }));
      setHasChanges(true);
    }
  };


  const getMonthlyDetails = (yearDetail: YearlyData, year: number): MonthlyCompensationDetail[] => {
    return MONTH_ORDER.map(month => {
      const monthlyOverride = overrides.find(co => co.season_override === year && co.month === month);
      const monthlyCompensation = overrides.find(c => c.year === year && c.month === month);
      const monthlyAthleteOverride = overrides.find(o => o.season_override === year && o.month === month);
      // // Debug log removed("monthlyAthleteOverride", monthlyCompensation);
      // // Debug log removed("monthlyOverride", monthlyOverride);
      return {
        year,
        month,
        amount: monthlyOverride?.amount ?? monthlyCompensation?.amount ?? Math.round(yearDetail.compensation / 12),
        onRoster: monthlyAthleteOverride ? !monthlyAthleteOverride.hide : yearDetail.onRoster,
        scholarshipPerc: monthlyAthleteOverride?.scholarship_perc ?? yearDetail.scholarshipPerc,
      };
    });
  };
  

  const handleRemoveImage = () => {
    setFormData((prevState) => ({
      ...prevState!,
      image_url: '',
    }));
    setPreviewImage(null);
    setHasChanges(true);
  };

  const handleSave = async (overrideScholarshipInput?: number, force = false) => {
    // Debug log removed("handleSave called", { overrideScholarshipInput, formData, showScholarshipDollars, force });
    if (!formData) {
      // Debug log removed("formData is null, aborting save");
      return;
    }

    if (showScholarshipDollars) {
      const sum = Object.values(scholarshipDetails).reduce((a, b) => a + b, 0);
      const inputToUse = overrideScholarshipInput !== undefined ? overrideScholarshipInput : scholarshipInput;
      // Debug log removed("Scholarship save check", { inputToUse, sum, scholarshipDetails });
      if (inputToUse !== sum && !force) {
        setShowScholarshipMismatchModal(true);
        // Debug log removed("Mismatch, showing modal");
        return;
      }

      // Save total
      const { data, error, status, statusText } = await supabase
        .from("athletes_additional_data")
        .upsert({
          athlete_id: formData.athlete_id,
          season: selectedYear,
          category_name: "scholarship_dollars_total",
          value: inputToUse,
        }, { onConflict: ['athlete_id', 'season', 'category_name'] });

      // Debug log removed("Upsert response:", { data, error, status, statusText });
      if (error) {
        console.error("Error saving scholarship total:", error);
      } else {
        // Debug log removed("Saved scholarship total");
      }

      // Save each detail
      for (const [key, category] of [
        ["tuition", "scholarship_dollars_tuition"],
        ["fees", "scholarship_dollars_fees"],
        ["room", "scholarship_dollars_room"],
        ["books", "scholarship_dollars_books"],
        ["meals", "scholarship_dollars_meals"],
        ["cost_attendance", "scholarship_dollars_cost_attendance"],
      ]) {
        const { error } = await supabase
          .from("athletes_additional_data")
          .upsert({
            athlete_id: formData.athlete_id,
            season: selectedYear,
            category_name: category,
            value: scholarshipDetails[key as ScholarshipDetailKey],
          }, { onConflict: ['athlete_id', 'season', 'category_name'] });
        if (error) {
          console.error(`Error saving ${category}:`, error);
        } else {
          // Debug log removed(`Saved ${category}`);
        }
      }
    } else {
      // Debug log removed("showScholarshipDollars is false, skipping scholarship save");
    }

    // Check validation and await the result
    if (compensationTableRef.current) {
      const isValid = await compensationTableRef.current.validateCompensationTotals();
      if (!isValid) {
        return;
      }
    }

    const image_url = formData.image_url;
    // Update the athletes table
    const { data: existingRecord, error: checkError } = await supabase
    .from('athletes')
    .select('id')
    .eq('id', athleteId)
    .eq('scenario', selectedScenario)
  
  if (checkError && checkError.code !== 'PGRST116') {
    console.error('Error checking existing record:', checkError);
    return;
  }
  
  let athleteError;
  
  if (existingRecord) {
    // If record exists, update it
    const { error } = await supabase
      .from('athletes')
      .update({
        name__first: formData.name__first,
        name__last: formData.name__last,
        image_url: image_url,
      })
      .eq('id', athleteId)
      .eq('scenario', selectedScenario);
    
    athleteError = error;
  } else {
    // If record doesn't exist, insert a new one
    const { error } = await supabase
      .from('athletes')
      .insert({
        id: athleteId,
        name__first: formData.name__first,
        name__last: formData.name__last,
        image_url: image_url,
        scenario: selectedScenario
      });
    
    athleteError = error;
  }
  
  if (athleteError) {
    console.error('Error updating/inserting athlete:', athleteError);
    return;
  }

    // Update the athletes_override table
    interface OverrideEntry {
      category: string;
      value: string;
      athlete_id: string;
      scenario: string;
      month: string;
      season_override: number;
    }

    const overrideEntries: OverrideEntry[] = [];

    // First, check form field changes
    const fieldsToCheck = {
      position: formData.position,
      elig_remaining: formData.elig_remaining,
      year: formData.year,
      redshirt_status: formData.redshirt_status,
      pos_rank: formData.pos_rank,
      commit: formData.commit,
      injury: formData.injury,
      ending_season: formData.ending_season
    };

    // Create override entries for changed fields
    Object.entries(fieldsToCheck).forEach(([field, newValue]) => {
      // Get the original value from the stored athlete data
      const originalValue = originalAthleteData ? originalAthleteData[field as keyof Player] : undefined;
      const hasChanged = newValue !== originalValue && newValue !== undefined;
      
      if (hasChanged) {
        const entry = {
          category: field,
          value: newValue?.toString() || '',
          athlete_id: athleteId,
          scenario: targetScenario || '',
          month: '00',
          season_override: selectedYear
        };
        overrideEntries.push(entry);
      }
    });

    // Then add yearly data changes
    Object.entries(yearlyData).forEach(([year, data]) => {
      const yearInt = parseInt(year);

      // Check scholarship percentage from yearly data
      if (data.scholarshipPerc !== originalAthleteData?.scholarship_perc) {
        overrideEntries.push({
          category: 'scholarship_perc',
          value: data.scholarshipPerc.toString(),
          athlete_id: athleteId,
          scenario: targetScenario || '',
          month: '00',
          season_override: yearInt
        });
      }

      // Add hide status if it has changed
      const originalHideValue = originalAthleteData?.hide ? 1 : 0;
      const newHideValue = data.onRoster ? 0 : 1;
      if (originalHideValue !== newHideValue) {
        overrideEntries.push({
          category: 'hide',
          value: newHideValue.toString(),
          athlete_id: athleteId,
          scenario: targetScenario || '',
          month: '00',
          season_override: yearInt
        });
      }

      // Add monthly entries for scholarship percentage changes
      const monthlyEntries = (monthlyDetails[yearInt] || [])
        .filter(monthData => {
          const originalValue = originalAthleteData?.scholarship_perc || 0;
          const newValue = monthData.scholarshipPerc || 0;
          return originalValue !== newValue;
        })
        .map(monthData => ({
          category: 'scholarship_perc',
          value: (monthData.scholarshipPerc || 0).toString(),
          athlete_id: athleteId,
          scenario: targetScenario || '',
          month: monthData.month,
          season_override: yearInt
        }));

      overrideEntries.push(...monthlyEntries);
    });

    // Update athletes_override_category table one entry at a time
    for (const entry of overrideEntries) {
      const { error: upsertError } = await supabase
        .from('athletes_override_category')
        .upsert([entry]);

      if (upsertError) {
        console.error('Error upserting entry:', entry);
        console.error('Error details:', upsertError);
        return;
      }
    }
  
       // Update the compensation table
       if (hasCompAccess) {

        // First, handle the main compensation
        const compensationUpserts = Object.entries(yearlyData).flatMap(([year, data]) => {
          const yearUpsert = {
            athlete_id: athleteId,
            year: parseInt(year),
            month: '00',
            amount: data.compensation,
            scenario: targetScenario || ''
          };

          const monthlyUpserts = expandedYears.includes(parseInt(year))
            ? (monthlyDetails[parseInt(year)] || []).map(monthDetail => ({
                athlete_id: athleteId,
                year: parseInt(year),
                month: monthDetail.month,
                amount: monthDetail.amount,
                scenario: targetScenario || ''
              }))
            : [];
          
          return [yearUpsert, ...monthlyUpserts];
        });

        if (compensationUpserts.length > 0) {
          
          try {
            // Perform the upsert
            const { error: detailsError } = await supabase
              .from('compensation')
              .upsert(compensationUpserts, { 
                onConflict: ['athlete_id', 'year', 'month', 'scenario'],
                returning: 'minimal' // Use minimal to improve performance
              });

            if (detailsError) {
              console.error('Error updating compensation details:', detailsError);
              setErrorMessage('Error saving compensation data. Please try again.');
              setIsErrorVisible(true);
              return;
            }
            
            // After upserting, query to get all compensation IDs for this athlete
            const { data: compensationIds, error: compensationIdsError } = await supabase
              .from('compensation')
              .select('id, year, month')
              .eq('athlete_id', athleteId);
              
            if (compensationIdsError) {
              console.error('Error fetching compensation IDs:', compensationIdsError);
              setErrorMessage('Error retrieving compensation records. Please try again.');
              setIsErrorVisible(true);
              return;
            }
            
            if (!compensationIds || compensationIds.length === 0) {
              console.error('No compensation records found for this athlete');
              setErrorMessage('No compensation records found. Please try again.');
              setIsErrorVisible(true);
              return;
            }
            
            
            // Create compensation_extra upserts for each year and budget
            const extraUpserts = [];
            
            // Handle yearly additional budgets
            for (const comp of compensationIds.filter((c: { month: string; year: number; id: number }) => c.month === '00')) {
              const year = comp.year;
              const yearData = yearlyData[year];
              
              // Check if we have additionalBudgets in yearlyData
              if (yearData && yearData.additionalBudgets) {
                for (const [budgetName, amount] of Object.entries(yearData.additionalBudgets)) {
                  extraUpserts.push({
                    compensation_id: comp.id,
                    budget_name: budgetName,
                    amount: amount
                  });
                }
              } else {
                // If no additionalBudgets in yearlyData, use the additionalBudgets from state
                for (const budget of additionalBudgets) {
                  extraUpserts.push({
                    compensation_id: comp.id,
                    budget_name: budget.name,
                    amount: budget.amount
                  });
                }
              }
            }
            
            // Handle monthly additional budgets
            for (const comp of compensationIds.filter((c: { month: string; year: number; id: number }) => c.month !== '00')) {
              const year = comp.year;
              const month = comp.month;
              
              if (monthlyDetails[year]) {
                const monthDetail = monthlyDetails[year].find(m => m.month === month);
                
                if (monthDetail && monthDetail.additionalBudgets) {
                  for (const [budgetName, amount] of Object.entries(monthDetail.additionalBudgets)) {
                    extraUpserts.push({
                      compensation_id: comp.id,
                      budget_name: budgetName,
                      amount: amount
                    });
                  }
                } else if (additionalBudgets.length > 0) {
                  // If no additionalBudgets in monthDetail, use the additionalBudgets from state divided by 12
                  for (const budget of additionalBudgets) {
                    extraUpserts.push({
                      compensation_id: comp.id,
                      budget_name: budget.name,
                      amount: budget.amount / 12
                    });
                  }
                }
              }
            }
          
            
            if (extraUpserts.length > 0) {
              const { error: extraError } = await supabase
                .from('compensation_extra')
                .upsert(extraUpserts, { 
                  onConflict: ['compensation_id', 'budget_name'],
                  ignoreDuplicates: false
                });
                
              if (extraError) {
                console.error('Error updating compensation_extra:', extraError);
                setErrorMessage('Error saving additional budget data. Please try again.');
                setIsErrorVisible(true);
                return;
              }
              
              // Debug log removed(`Successfully saved additional budget data`);
            } else {
              // Debug log removed('No extraUpserts to save');
            }
          } catch (error) {
            console.error('Unexpected error during compensation save:', error);
            setErrorMessage('An unexpected error occurred. Please try again.');
            setIsErrorVisible(true);
            return;
          }
        }
      }
  
    setHasChanges(false);
    setSuccessMessage("Changes saved successfully. Please refresh your main page to see the updates.");
    
    // Optionally, clear the message after a few seconds
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleArchive = async () => {
    if (!formData) return;

    const { id } = formData;
    const { data: athleteData, error: athleteError } = await supabase
      .from('athletes')
      .update({ hide: 1, scenario: selectedScenario })
      .eq('id', id);

    if (athleteError) {
      console.error('Error archiving athlete:', athleteError);
      return;
    }

    setSuccessMessage("Athlete archived successfully. Please refresh your main page to see the updates.");
    
    // Optionally, close the window after a delay
    setTimeout(() => window.close(), 3000);
  };

  const handleClose = () => {
    window.close();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !athleteId) return;

    try {
      const { data: userDetails } = await supabase.auth.getUser();
      if (!userDetails?.user?.id) {
        console.error('No user ID found');
        return;
      }

      await CommentService.createComment({
        content: newComment,
        athlete_id: athleteId,
        user_id: userDetails.user.id,
        customer_id: team
      });

      // Refresh comments
      const comments = await CommentService.getCommentsForAthlete(athleteId);
      setComments(comments);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { data: userDetails } = await supabase.auth.getUser();
      if (!userDetails?.user?.id) {
        console.error('No user ID found');
        return;
      }

      await CommentService.deleteComment(commentId, userDetails.user.id);
      
      // Refresh comments
      const comments = await CommentService.getCommentsForAthlete(athleteId);
      setComments(comments);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  useEffect(() => {
    if (formData && yearlyData) {
      const newMonthlyDetails: Record<number, MonthlyCompensationDetail[]> = {};
      Object.entries(yearlyData).forEach(([year, data]) => {
        newMonthlyDetails[parseInt(year)] = getMonthlyDetails(data, parseInt(year));
      });
      setMonthlyDetails(newMonthlyDetails);
    }
  }, [formData, yearlyData]);

  // Add a useEffect to update yearlyData when formData changes
  useEffect(() => {
    if (formData) {
      setYearlyData(prev => {
        // Create additionalBudgets object from the additionalBudgets array
        const additionalBudgetsObj = additionalBudgets.reduce((acc, budget) => {
          acc[budget.name] = budget.amount;
          return acc;
        }, {} as Record<string, number>);
        
        return {
          ...prev,
          [selectedYear]: {
            ...prev[selectedYear],
            year: selectedYear,
            scholarshipPerc: formData.scholarship_perc || 0,
            onRoster: !formData.hide,
            ending_season: formData.ending_season,
            additionalBudgets: additionalBudgetsObj
          }
        };
      });
    }
  }, [formData, selectedYear, additionalBudgets]);

  useEffect(() => {
    if (!formData) return;
    if (showScholarshipDollars) {
      setScholarshipInput(formData.scholarship_dollars_total || 0);
    } else {
      setScholarshipInput((formData.scholarship_perc || 0) * 100);
    }
  }, [showScholarshipDollars, formData]);

  useEffect(() => {
    if (!formData) return;
    setScholarshipDetails({
      tuition: formData.scholarship_dollars_tuition || 0,
      fees: formData.scholarship_dollars_fees || 0,
      room: formData.scholarship_dollars_room || 0,
      books: formData.scholarship_dollars_books || 0,
      meals: formData.scholarship_dollars_meals || 0,
      cost_attendance: formData.scholarship_dollars_cost_attendance || 0,
    });
  }, [formData]);

  // Fetch comments when athlete ID changes
  useEffect(() => {
    const fetchComments = async () => {
      if (!athleteId) return;
      try {
        const comments = await CommentService.getCommentsForAthlete(athleteId);
        setComments(comments);
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };
    fetchComments();
  }, [athleteId]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
      </div>
    );
  }

  if (!formData) {
    return <div className={styles.errorMessage}>Error loading athlete data</div>;
  }

  return (
    <div className={styles.fullPageDetails}>
      {successMessage && (
        <div className={styles.successMessage}>
          {successMessage}
        </div>
      )}
      <button className={styles.closeButton} onClick={handleClose}>
        &times;
      </button>
      <h3>{formData.name__first} {formData.name__last}</h3>
      <p className={styles.selectedYear}>{selectedYear}</p>
      <div className={styles.nameContainer}>
        <label>Name</label>
        <div className={styles.nameInputs}>
          <input
            type="text"
            name="name__first"
            value={formData.name__first || ''}
            onChange={handleChange}
            placeholder="First Name"
          />
          <input
            type="text"
            name="name__last"
            value={formData.name__last || ''}
            onChange={handleChange}
            placeholder="Last Name"
          />
        </div>
      </div>
      <div className={styles.imageUpload}>
        {previewImage && (
          <div className={styles.imageContainer}>
            <Image 
              src={previewImage} 
              alt="Player Image" 
              className={styles.image} 
              width={200}
              height={200}
            />
            <button type="button" onClick={handleRemoveImage} className={styles.removeButton}>
              Delete Image
            </button>
          </div>
        )}
        <input className={styles.fileInput} type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      <div>
        <label>Position</label>
        <select name="position" value={formData.position || ''} onChange={handleChange}>
          <option value="">Select a position</option>
          {positions.map(({ position, category }) => (
            <option key={position} value={position}>
              {`${position} (${category})`}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Eligibility Remaining</label>
        <select name="elig_remaining" value={formData.elig_remaining || ''} onChange={handleChange}>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
    
      <div>
        <label>Year</label>
        <select name="year" value={formData.year || ''} onChange={handleChange}>
          <option value="FR">FR</option>
          <option value="SO">SO</option>
          <option value="JR">JR</option>
          <option value="SR">SR</option>
          <option value="GR">GR</option>
        </select>
      </div>
      <div>
        <label>Redshirt Status</label>
        <select name="redshirt_status" value={formData.redshirt_status || ''} onChange={handleChange}>
          <option value="has">Has Not Used</option>
          <option value="used">Has Used</option>
        </select>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <label>Scholarship $</label>
        <button
          type="button"
          onClick={() => setShowScholarshipDetails(v => !v)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            fontSize: 16,
            color: showScholarshipDetails ? 'red' : 'green'
          }}
          aria-label={showScholarshipDetails ? "Hide details" : "Show details"}
        >
          {showScholarshipDetails ? <FaMinus /> : <FaPlus />}
        </button>
        <input
          type="number"
          value={scholarshipInput}
          min={0}
          step={100}
          onChange={e => {
            const value = Number(e.target.value);
            setScholarshipInput(value);
            setHasChanges(true);
          }}
          style={{ marginLeft: 8, width: 100 }}
        />
      </div>
      {showScholarshipDollars && showScholarshipDetails && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            { label: "Tuition", key: "tuition", category: "scholarship_dollars_tuition" },
            { label: "Fees", key: "fees", category: "scholarship_dollars_fees" },
            { label: "Room", key: "room", category: "scholarship_dollars_room" },
            { label: "Books", key: "books", category: "scholarship_dollars_books" },
            { label: "Meals", key: "meals", category: "scholarship_dollars_meals" },
            { label: "Cost of Attendance", key: "cost_attendance", category: "scholarship_dollars_cost_attendance" },
          ].map(item => (
            <div key={item.key} style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: 120, fontSize: 13 }}>{item.label}</label>
              <input
                type="number"
                value={scholarshipDetails[item.key as ScholarshipDetailKey]}
                min={0}
                step={100}
                onChange={e => {
                  const value = Number(e.target.value);
                  setScholarshipDetails(prev => ({
                    ...prev,
                    [item.key as ScholarshipDetailKey]: value,
                  }));
                  setHasChanges(true);
                }}
                style={{ width: 80, fontSize: 13, padding: '2px 4px' }}
              />
            </div>
          ))}
        </div>
      )}
      {hasCompAccess && (
        <>
            <div className={styles.compensationWrapper}>
              <label>{additionalBudgets && additionalBudgets.length > 0 ? "Main Budget" : "Compensation"}</label>
              <div className={styles.compensationContainer}>
                <button 
                  className={styles.compensationDetailButton}
                  onClick={() => setShowCompensationDetails(!showCompensationDetails)}
                  type="button"
                >
                  {showCompensationDetails ? <FaMinus color="red" /> : <FaPlus color="green" />}
                </button>
                <div className={styles.inputWrapper}>
                  <DollarInput
                    value={formData.compensation || 0}
                    onChange={(value) => {
                      handleChange({
                        target: {
                          name: 'compensation',
                          value: value,
                          type: 'number'
                        }
                      } as unknown as React.ChangeEvent<HTMLInputElement>);
                      setYearlyData(prevData => ({
                        ...prevData,
                        [selectedYear]: {
                          ...prevData[selectedYear],
                          compensation: value
                        }
                      }));
                    }}
                    name="compensation"
                    containerClassName={styles.inputWrapper}
                  />
                </div>
              </div>
            </div>
          
          {showCompensationDetails && (
            <CompensationDetailsTable
              ref={compensationTableRef}
              athleteId={athleteId}
              selectedScenario={selectedScenario}
              additionalBudgets={additionalBudgets}
              onDataChange={(yearlyData, monthlyDetails, expandedYears) => {
                setYearlyData(yearlyData);
                setMonthlyDetails(monthlyDetails);
                setExpandedYears(expandedYears);
                setHasChanges(true);
              }}
            />
          )}
        </>
      )}
      <div>
        <label>Comments</label>
        <div className={styles.commentsSection}>
          {/* Side by side layout for add comment and most recent comment */}
          <div className={styles.commentsRow}>
            {/* Add New Comment */}
            <div className={styles.addCommentSection}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className={styles.commentInput}
              />
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className={styles.addCommentButton}
              >
                Add Comment
              </button>
            </div>

            {/* Most Recent Comment */}
            {comments.length > 0 && (
              <div className={styles.mostRecentComment}>
                <div className={styles.commentItem}>
                  <div className={styles.commentHeader}>
                    <span className={styles.commentAuthor}>
                      {comments[0].user_detail.name_first} {comments[0].user_detail.name_last}
                    </span>
                    <span className={styles.commentDate}>
                      {new Date(comments[0].created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => handleDeleteComment(comments[0].id)}
                      className={styles.deleteCommentButton}
                    >
                      ×
                    </button>
                  </div>
                  <div className={styles.commentContent}>{comments[0].content}</div>
                </div>
              </div>
            )}
          </div>

          {/* Comment History Toggle */}
          {comments.length > 1 && (
            <div className={styles.commentHistorySection}>
              <button
                onClick={() => setShowCommentHistory(!showCommentHistory)}
                className={styles.commentHistoryToggle}
              >
                {showCommentHistory ? 'Hide History' : `Show History (${comments.length - 1} more)`}
              </button>
              
              {/* Comment History */}
              {showCommentHistory && (
                <div className={styles.commentHistory}>
                  {comments.slice(1).map((comment) => (
                    <div key={comment.id} className={styles.commentItem}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>
                          {comment.user_detail.name_first} {comment.user_detail.name_last}
                        </span>
                        <span className={styles.commentDate}>
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className={styles.deleteCommentButton}
                        >
                          ×
                        </button>
                      </div>
                      <div className={styles.commentContent}>{comment.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div>
        <label>Injured</label>
        <input
          type="checkbox"
          name="injury"
          checked={!!formData.injury}
          onChange={handleChange}
        />
      </div>
      <div className={styles.saveButtonContainer}>
        <button
          className={styles.saveButton}
          onClick={() => handleSave()}
          disabled={!hasChanges || loading}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      <button
        className={styles.archiveButton}
        onClick={handleArchive}
      >
        Archive
      </button>
      </div>
      <p className={styles.infoText}>
            Changes will apply to {selectedYear} and future years, not past years.
          </p>
      {errorMessage && (
      <div className={`${styles.errorMessageContainer} ${isErrorVisible ? styles.visible : styles.hidden}`}>
        <div className={styles.errorMessage}>
          {errorMessage}
        </div>
      </div>
    )}
      {showScholarshipMismatchModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: 24, borderRadius: 8, minWidth: 320, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ marginBottom: 8 }}>Scholarship Total Mismatch</h4>
            <p style={{ marginBottom: 16, textAlign: 'center' }}>
              The Scholarship $ total ({scholarshipInput}) does not match the sum of the categories ({Object.values(scholarshipDetails).reduce((a, b) => a + b, 0)}).
            </p>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              <button
                style={{ background: '#007bff', color: 'white', border: 'none', padding: 8, borderRadius: 4 }}
                onClick={async () => {
                  setShowScholarshipMismatchModal(false);
                  const sum = Object.values(scholarshipDetails).reduce((a, b) => a + b, 0);
                  await handleSave(sum);
                }}
              >
                Change total to match categories and save
              </button>
              <button
                style={{ background: '#28a745', color: 'white', border: 'none', padding: 8, borderRadius: 4 }}
                onClick={async () => {
                  setShowScholarshipMismatchModal(false);
                  await handleSave(undefined, true);
                }}
              >
                Save anyway
              </button>
              <button
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: 8, borderRadius: 4 }}
                onClick={() => setShowScholarshipMismatchModal(false)}
              >
                Go back and edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FullPageDetails;