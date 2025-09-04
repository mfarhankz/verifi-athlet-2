import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './Details.module.css'; // Import the CSS module
import { supabase } from '../../lib/supabaseClient'; // Import Supabase client
import { Player } from '../../types/Player';
import Link from 'next/link'; // Import Link from Next.js
import { fetchPositionOrder, fetchBudgetData } from "../../utils/utils";
import { useEffectiveCompAccess, CompDisplayMode } from '../../utils/compAccessUtils';
import { removeImageBackground } from '../../utils/imageUtils';
import Image from 'next/image'; // Import Image from Next.js
import pffIcon from '../../../public/pff.png'; // Import the PFF icon
import Select from 'react-select'; // Import react-select
import { DollarInput } from '../../utils/DollarInput';
import { EndingSeasonModal } from './EndingSeasonModal';
import { useShowScholarshipDollars } from "@/utils/utils";

declare global {
  interface Window {
    effectiveCompAccess?: boolean;
  }
}

interface MonthlyCompensationDetail {
  month: string;
  amount: number;
}

interface DetailsProps {
  athlete: Player | null;
  onClose: () => void;
  fetchTasks: () => void;
  team: string;
  selectedYear: number;
  effectiveYear: number;
  selectedScenario: string;
  targetScenario: string;
}

const getAdditionalFields = (budgetData: any[]): string[] => {
  if (!budgetData || budgetData.length === 0) return [];
  
  const standardFields = [
    'amount', 'category', 'id', 'order', 'position', 
    'roster_spots', 'scenario', 'scholarships', 'slot', 
    'team', 'year', 'scholarships_dollars'
  ];
  
  // Find the overall budget item
  const overallBudget = budgetData.find(item => item.category === 'overall');
  if (!overallBudget) return [];
  
  // Filter out standard fields from the overall budget
  return Object.keys(overallBudget).filter(key => !standardFields.includes(key));
};

const emojiOptions = [
  { value: '🏈', label: '🏈' },
  { value: '🎯', label: '🎯' },
  { value: '🚀', label: '🚀' },
  { value: '👑', label: '👑' },
  { value: '🧠', label: '🧠' },
  { value: '💎', label: '💎' },
  { value: '🏆', label: '🏆' },
  { value: '🔥', label: '🔥' },
  { value: '🛠️', label: '🛠️' },
  { value: '🔴', label: '🔴' },
  { value: '🟠', label: '🟠' },
  { value: '🟡', label: '🟡' },
  { value: '🟢', label: '🟢' },
  { value: '🔵', label: '🔵' },
  { value: '🟣', label: '🟣' },
  { value: '🟤', label: '🟤' },
  { value: '⚫', label: '⚫' },
  { value: '⚪', label: '⚪' },
];

const Details: React.FC<DetailsProps> = ({ 
  athlete, 
  onClose, 
  fetchTasks, 
  team, 
  selectedYear,
  effectiveYear,
  selectedScenario,
  targetScenario 
}) => {
  const [formData, setFormData] = useState<Player | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { effectiveCompAccess, compDisplayMode } = useEffectiveCompAccess();
  const [positions, setPositions] = useState<Array<{ position: string, category: string }>>([]);
  const detailsRef = useRef<HTMLDivElement>(null);
  const nameSpanRef = useRef<HTMLSpanElement>(null);
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [showEndingSeason, setShowEndingSeason] = useState(false);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [additionalCompensations, setAdditionalCompensations] = useState<{ [key: string]: number }>({});
  const [totalCompensation, setTotalCompensation] = useState<number>(0);
  const [tempAdditionalCompensations, setTempAdditionalCompensations] = useState<{ [key: string]: number }>({});
  const [selectedEmojis, setSelectedEmojis] = useState<{ value: string; label: string }[]>([]);
  const [showEndingSeasonModal, setShowEndingSeasonModal] = useState(false);
  const [detailsPortal, setDetailsPortal] = useState<HTMLDivElement | null>(null);
  const showScholarshipDollars = useShowScholarshipDollars();
  const [scholarshipInput, setScholarshipInput] = useState<number>(0);

  useEffect(() => {
    if (athlete) {
      const cleanedAthlete = {
        ...athlete,
        year: /^[RT]/.test(athlete.year) ? athlete.year.substring(1) : athlete.year,
        athlete_id: athlete.athlete_id || athlete.id,
        injury: athlete.injury ? 1 : 0,
        ending_season: athlete.ending_season,
        pff_link: athlete.pff_link || '',
        player_tag: athlete.player_tag || ''
      };
      setFormData(cleanedAthlete);
      
      // Initialize selected emojis from player_tag
      if (athlete.player_tag) {
        const initialEmojis = [...athlete.player_tag].map(emoji => ({ value: emoji, label: emoji }));
        setSelectedEmojis(initialEmojis);
      } else {
        setSelectedEmojis([]);
      }

      setPreviewImage(athlete.image_url);
      setHasChanges(false);
      setShowEndingSeason(athlete.ending_season ? athlete.ending_season > 0 : false);
    }
  }, [athlete]);

  useEffect(() => {
    const fetchPositions = async () => {
      if (team && effectiveYear) {
        const positionOrderData = await fetchPositionOrder(team, effectiveYear);
        setPositions(positionOrderData);
      }
    };

    fetchPositions();
  }, [team, effectiveYear]);

  useEffect(() => {
    if (formData) {
      const mainComp = formData.compensation || 0;
      const additionalComp = Object.values(tempAdditionalCompensations).reduce((sum, value) => sum + (value || 0), 0);
      setTotalCompensation(mainComp + additionalComp);
    }
  }, [formData?.compensation, tempAdditionalCompensations]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let updatedValue: any = value;
    
    if (type === 'checkbox') {
      updatedValue = (e.target as HTMLInputElement).checked ? 1 : 0;
    } else if (name === 'compensation' || name.startsWith('additional-')) {
      updatedValue = parseFloat(value);
    }

    setFormData((prevState) => ({
      ...prevState!,
      [name]: updatedValue,
    }));
    setHasChanges(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setUploading(true);

      try {
        // Remove background
        const processedImageUrl = await removeImageBackground(selectedFile);
        
        if (processedImageUrl) {
          // Convert the processed image URL to a File object
          const response = await fetch(processedImageUrl);
          const blob = await response.blob();
          const processedFile = new File([blob], selectedFile.name, { type: 'image/png' });

          setFile(selectedFile);
          setProcessedFile(processedFile);
          setPreviewImage(processedImageUrl);
          setFormData((prevState) => {
            if (!prevState) return null;
            return {
              ...prevState,
              image_url: processedImageUrl,
            };
          });
          setHasChanges(true);
        } else {
          console.error('Failed to remove background from image');
        }
      } catch (error) {
        console.error('Error processing image:', error);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData((prevState) => {
      if (!prevState) return null;
      return {
        ...prevState,
        image_url: '',
      };
    });
    setFile(null);
    setPreviewImage(null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!formData || !formData.athlete_id) {
      console.error('No athlete data or invalid athlete ID');
      return;
    }

    // First, verify the athlete exists and user has permission
    const { data: athleteCheck, error: athleteCheckError } = await supabase
      .from('athletes')
      .select('id, customer_id')
      .eq('id', formData.athlete_id)
      .single();

    if (athleteCheckError) {
      console.error('Error checking athlete:', athleteCheckError);
      return;
    }

    let image_url = formData.image_url;

    if (processedFile) {
      setUploading(true);
      const randomHex = Math.random().toString(16).substring(2, 8);
      const fileNameParts = processedFile.name.split('.');
      const fileExtension = fileNameParts.pop();
      const baseFileName = fileNameParts.join('.');
      const uniqueFileName = `${baseFileName}-${randomHex}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('player_images')
        .upload(`public/${uniqueFileName}`, processedFile);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        setUploading(false);
        return;
      }

      const filePath = (uploadData as { path?: string; Key?: string })?.path || (uploadData as { path?: string; Key?: string })?.Key;
      if (!filePath) {
        console.error('File path is missing');
        setUploading(false);
        return;
      }

      const { data: publicUrlData, error: publicUrlError } = supabase.storage
        .from('player_images')
        .getPublicUrl(filePath);

      if (publicUrlError) {
        console.error('Error getting public URL:', publicUrlError);
        setUploading(false);
        return;
      }

      image_url = publicUrlData.publicUrl;
      setFormData((prevState) => ({
        ...(prevState as Player),
        image_url: image_url,
      }));
      setUploading(false);
    }

    const { compensation, month, starting_season, athlete_id, ending_season, tier, ...updateData } = formData;
    updateData.image_url = image_url;
    
    // Fields to check for changes and their corresponding values
    const fieldsToCheck = {
      position: updateData.position,
      elig_remaining: updateData.elig_remaining,
      year: updateData.year,
      redshirt_status: updateData.redshirt_status,
      scholarship_perc: updateData.scholarship_perc,
      pos_rank: updateData.pos_rank,
      commit: updateData.commit,
      injury: updateData.injury,
      ending_season: ending_season,
      tier: tier
    };

    // Create override entries for changed fields
    const overrideEntries = Object.entries(fieldsToCheck)
      .filter(([field, newValue]) => {
        const originalValue = athlete ? athlete[field as keyof Player] : undefined;
        
        // Special handling for year comparison - strip leading T or R
        if (field === 'year') {
          const cleanOriginal = originalValue?.toString().replace(/^[TR]/, '') || '';
          const cleanNew = newValue?.toString().replace(/^[TR]/, '') || '';
          return cleanOriginal !== cleanNew;
        }
        
        // Special handling for injury - don't update if going from null to 0
        if (field === 'injury' && originalValue === null && newValue === 0) {
          return false;
        }

        return newValue !== originalValue && newValue !== undefined;
      })
      .map(([field, value]) => ({
        category: field,
        value: value?.toString() || '',
        athlete_id: formData.athlete_id,
        scenario: targetScenario || '',
        month: '00',
        season_override: effectiveYear
      }));

 
    if (overrideEntries.length > 0) {
      
      const { error: overrideCategoryError } = await supabase
          .from('athletes_override_category')
        .upsert(overrideEntries, {
            onConflict: ['athlete_id', 'category', 'scenario', 'month', 'season_override'],
            ignoreDuplicates: false
        });

        if (overrideCategoryError) {
          console.error('Error updating athletes_override_category:', overrideCategoryError);
          return;
        }
      console.log("Successfully upserted overrides");
    }

    // Update the compensation tables
    if (effectiveCompAccess && (compensation !== null && compensation !== undefined)) {
      // First, update main compensation
      const { data: compensationData, error: compensationError } = await supabase
        .from('compensation')
        .upsert([
          {
            athlete_id: formData.athlete_id,
            year: effectiveYear,
            month: '00',
            amount: compensation,
            scenario: targetScenario || '',
          },
        ],{ 
          onConflict: 'athlete_id,year,month,scenario',
          ignoreDuplicates: false
        })
        .select();

      if (compensationError) {
        console.error('Error updating compensation:', compensationError);
        return;
      }
      // If we have additional compensations and the main compensation was saved successfully
      if (Object.keys(tempAdditionalCompensations).length > 0 && compensationData?.[0]?.id) {
        const compensationId = compensationData[0].id;
        
        // Use tempAdditionalCompensations for saving
        const extraCompensations = Object.entries(tempAdditionalCompensations).map(([fieldName, amount]) => ({
          compensation_id: compensationId,
          budget_name: fieldName,
          amount: amount
        }));

        // Update compensation_extra table
        const { error: extraCompError } = await supabase
          .from('compensation_extra')
          .upsert(extraCompensations, {
            onConflict: 'compensation_id,budget_name',
            ignoreDuplicates: false
          });

        if (extraCompError) {
          console.error('Error updating extra compensation:', extraCompError);
          return;
        }

        // Only update the main state after successful save
        setAdditionalCompensations(tempAdditionalCompensations);
      }
    }

    // Update the athlete's information in the athletes table
   
    const { data: athleteData, error: athleteError } = await supabase
      .from('athletes')
      .update({ 
        image_url: image_url, 
        notes: updateData.notes,
        name__first: formData.name__first,
        name__last: formData.name__last
      })
      .match({ id: formData.athlete_id });

    if (athleteError) {
      console.error('Error updating athlete:', athleteError);
      return;
    }

    // Upsert the pff_link into athletes_additional_data
    if (formData.pff_link) {
      const { error: pffLinkError } = await supabase
        .from('athletes_additional_data')
        .upsert([
          {
            athlete_id: formData.athlete_id,
            category_name: 'pff_link',
            value: formData.pff_link
          }
        ], {
          onConflict: ['athlete_id', 'category_name']
        });

      if (pffLinkError) {
        console.error('Error upserting PFF link:', pffLinkError);
        return;
      }
    }

    if (formData.player_tag !== undefined) {
      const { error: playerTagError } = await supabase
        .from('athletes_additional_data')
        .upsert([
          {
            athlete_id: formData.athlete_id,
            category_name: 'player_tag',
            value: formData.player_tag
          }
        ], {
          onConflict: ['athlete_id', 'category_name']
        });

      if (playerTagError) {
        console.error('Error upserting player tag:', playerTagError);
        return;
      }
    }

    if (showScholarshipDollars) {
      // Save to athletes_additional_data
      await supabase
        .from("athletes_additional_data")
        .upsert({
          athlete_id: formData.athlete_id,
          season: effectiveYear,
          category_name: "scholarship_dollars_total",
          value: scholarshipInput,
        }, { onConflict: ['athlete_id', 'season', 'category_name'] });
    } else {
      // Save to athletes table as before
      await supabase
        .from("athletes")
        .update({ scholarship_perc: scholarshipInput / 100 })
        .eq("id", formData.id);
    }

    setHasChanges(false);
    await fetchTasks(); // Refresh the Kanban board
    onClose(); // Close the details modal
  };

  const handleArchive = async () => {
    if (!formData) return;

    const { athlete_id: originalAthleteId, id } = formData;
    const athlete_id = originalAthleteId || id;
    const { data: athleteData, error: athleteError } = await supabase
      .from('athletes')
      .update({ hide: 1 })
      .eq('id', athlete_id)
      .eq('scenario', selectedScenario);

    if (athleteError) {
      console.error('Error archiving athlete:', athleteError);
      return;
    }

    await fetchTasks(); // Refresh the Kanban board
    onClose(); // Close the details modal
  };

  useEffect(() => {
    // Create a new div for our portal
    const portalDiv = document.createElement('div');
    portalDiv.id = 'details-portal-container';
    portalDiv.style.position = 'fixed';
    portalDiv.style.top = '0';
    portalDiv.style.left = '0';
    portalDiv.style.width = '100%';
    portalDiv.style.height = '100%';
    portalDiv.style.pointerEvents = 'auto';
    portalDiv.style.zIndex = '9999';
    document.body.appendChild(portalDiv);
    
    setDetailsPortal(portalDiv);
    
    return () => {
      document.body.removeChild(portalDiv);
    };
  }, []);

  useEffect(() => {
    // Add click outside listener
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is within a modal
      const isModalClick = (event.target as Element)?.closest(`[class*="modalOverlay"]`);
      if (isModalClick) {
        return; // Don't close the details if clicking within a modal
      }

      // Check if detailsRef exists and if the click was outside the details
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        // The click occurred outside the details component, close it
        onClose();
      }
    };

    // Add event listener to the document
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const unformatNumber = (str: string): string => {
    return str.replace(/,/g, '');
  };

  const handleEndingSeasonToggle = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setShowEndingSeason(!showEndingSeason);
    if (showEndingSeason) {
      setFormData(prevState => ({
        ...prevState!,
        ending_season: 0,
      }));
    }
    setHasChanges(true);
  };

  const showCommitCheckbox = formData?.starting_season && formData.starting_season > selectedYear;

  const handleAdditionalCompChange = (field: string, value: string) => {
    const unformattedValue = unformatNumber(value);
    const numValue = unformattedValue === '' ? 0 : parseFloat(unformattedValue);
    
    if (!isNaN(numValue)) {
      setTempAdditionalCompensations(prev => ({
        ...prev,
        [field]: numValue
      }));
      setHasChanges(true);
    }
  };

  useEffect(() => {
    if (!team) {
      console.log("No team provided");
      return;
    }
    if (!effectiveYear) {
      console.log("No effectiveYear provided");
      return;
    }
    // Changed condition to handle empty string scenario
    const scenarioValue = selectedScenario || 'default'; // Use 'default' if selectedScenario is empty

    const loadBudgetData = async () => {
      try {
        const data = await fetchBudgetData(team, effectiveYear, scenarioValue);
        if (data) {
          setBudgetData(data);
          const additionalFields = getAdditionalFields(data);
        }
      } catch (error) {
        console.error('Error fetching budget data:', error);
      }
    };

    loadBudgetData();
  }, [team, effectiveYear, selectedScenario]);

  // Log whenever budgetData changes
  useEffect(() => {
    // console.log("Budget Data Updated:", budgetData);
  }, [budgetData]);

  // When athlete data loads, initialize additional compensations
  useEffect(() => {
    if (athlete) {
      // Get all comp_* fields from the athlete
      const extraComps = Object.entries(athlete)
        .filter(([key]) => key.startsWith('comp_'))
        .reduce((acc, [key, value]) => ({
          ...acc,
          [key.replace('comp_', '')]: value || 0  // Remove 'comp_' prefix for display
        }), {});
      
      setAdditionalCompensations(extraComps);
      // Also initialize the temporary state with the same values
      setTempAdditionalCompensations(extraComps);
    }
  }, [athlete]);

  // Update formData when emojis change
  const handleEmojiChange = (selectedOptions: any) => {
    const newPlayerTag = selectedOptions ? selectedOptions.map((option: any) => option.value).join('') : '';
    setSelectedEmojis(selectedOptions || []);
    setFormData(prev => ({
      ...prev!,
      player_tag: newPlayerTag
    }));
    setHasChanges(true);
  };

  const handleEndingSeasonSave = (endingSeason: number, deadMoneyDetails: MonthlyCompensationDetail[] | null) => {
    handleChange({
      target: {
        name: 'ending_season',
        value: endingSeason.toString(),
        type: 'number'
      }
    } as React.ChangeEvent<HTMLInputElement>);
    
    // Store dead money details if needed
    if (deadMoneyDetails) {
      // You'll need to implement the logic to store these details
      // This might involve updating your state and database schema
    }
    
    setHasChanges(true);
  };

  // Add this function to adjust the name font size
  const adjustNameFontSize = () => {
    const nameSpan = nameSpanRef.current;
    if (!nameSpan || !formData) return;

    // First set to our starting font size of 0.8em to measure
    nameSpan.style.fontSize = '0.8em';
    
    // Force a reflow to ensure we get the proper width measurement
    void nameSpan.offsetWidth;
    
    // Get the container width 
    const containerWidth = nameSpan.parentElement?.clientWidth || 0;
    if (containerWidth === 0) return;
    
    // Reserve space for the edit button (smaller now) and some padding
    const availableWidth = containerWidth - 20;
    
    // If the text is wider than available space, adjust font size
    if (nameSpan.scrollWidth > availableWidth) {
      const ratio = availableWidth / nameSpan.scrollWidth;
      
      // Start from 0.8em and scale down if needed
      const baseFontSize = 0.8;
      const newFontSize = Math.max(0.3, baseFontSize * ratio);
      
      // Apply the new size directly in em units
      nameSpan.style.fontSize = `${newFontSize}em`;
      
      console.log('Adjusting font size:', {
        originalWidth: nameSpan.scrollWidth,
        availableWidth,
        ratio,
        baseFontSize,
        newFontSize: `${newFontSize}em`
      });
    }
  };

  // Call adjustNameFontSize whenever formData changes
  useEffect(() => {
    if (formData && !isEditingName) {
      // Use setTimeout to ensure the DOM has been updated
      setTimeout(adjustNameFontSize, 0);
    }
  }, [formData, isEditingName]);

  // Use useLayoutEffect to ensure font size is adjusted before paint
  useLayoutEffect(() => {
    if (formData && !isEditingName) {
      adjustNameFontSize();
    }
  }, [formData, isEditingName]);

  // Also adjust on window resize
  useEffect(() => {
    window.addEventListener('resize', adjustNameFontSize);
    return () => {
      window.removeEventListener('resize', adjustNameFontSize);
    };
  }, []);

  useEffect(() => {
    if (!formData) return;
    if (showScholarshipDollars) {
      setScholarshipInput(formData.scholarship_dollars_total ?? 0);
    } else {
      setScholarshipInput(
        formData.scholarship_perc !== undefined && formData.scholarship_perc !== null
          ? Math.round((formData.scholarship_perc || 0) * 100)
          : 0
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, showScholarshipDollars]);

  if (!detailsPortal) {
    return null; // Don't render until portal is ready
  }
  
  // Content to be rendered inside the portal
  const detailsContent = (
    <div 
      className={styles.details} 
      ref={detailsRef}
      id="details-panel"
      style={{
        position: 'fixed',
        top: '80px',
        right: '20px',
        zIndex: '1000',
        pointerEvents: 'auto',
        transformOrigin: 'top right',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        backgroundColor: 'white'
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* New close button implementation that's more visible and reliable */}
      <div 
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          width: '30px',
          height: '30px',
          background: '#f0f0f0',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          zIndex: 1010,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
        onClick={() => {
          onClose();
        }}
        aria-label="Close details"
      >
        <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>&times;</span>
      </div>
      {formData && (
        <>
          <Link
            href={`/full-details/${formData.athlete_id}?team=${encodeURIComponent(team)}&year=${effectiveYear}&scenario=${selectedScenario}&eCA=${effectiveCompAccess ? 'true' : 'false'}&cdm=${compDisplayMode}&targetScenario=${targetScenario}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.expandIcon}
          >
            ⤢
          </Link>
          {isEditingName ? (
            <div className={styles.nameFields}>
              <div>
                <input
                  type="text"
                  name="name__first"
                  value={formData.name__first || ''}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  type="text"
                  name="name__last"
                  value={formData.name__last || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          ) : (
            <h3 className={styles.name}>
              <span 
                ref={nameSpanRef} 
                style={{ fontSize: '0.8em' }}
              >
                {formData.name__first} {formData.name__last}
              </span>
              <button 
                className={styles.editNameButton} 
                onClick={() => setIsEditingName(true)}
                title="Edit name"
              >
                <small>✎</small>
              </button>
            </h3>
          )}
          <p className={styles.selectedYear}>{effectiveYear}</p>
          <div className={styles.imageSection}>
            <div className={styles.imageContainer}>
              {previewImage && (
                <img src={previewImage} alt="Player Image" className={styles.image} />
              )}
            </div>
            <div className={styles.imageControls}>
              {previewImage && (
                <button type="button" onClick={handleRemoveImage} className={styles.removeButton}>
                  Delete Image
                </button>
              )}
              <input className={styles.fileInput} type="file" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>
          <div>
            <label>Position</label>
            <select
              name="position"
              value={formData.position || ''}
              onChange={handleChange}
            >
              <option value="">Select a position</option>
              {positions.map((pos, index) => (
                <option key={index} value={pos.position}>
                  {pos.position} ({pos.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.eligibilityRemaining}>Eligibility Remaining</label>
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
          <div>
            <label>{showScholarshipDollars ? "Scholarship $" : "Scholarship %"}</label>
            <input
              type="number"
              value={scholarshipInput}
              min={0}
              step={showScholarshipDollars ? 100 : 1}
              onChange={e => {
                let value = Number(e.target.value);
                if (!showScholarshipDollars) {
                  value = Math.max(0, Math.min(100, value));
                }
                setScholarshipInput(value);
                setHasChanges(true);
              }}
            />
          </div>
          {effectiveCompAccess && (
            <>
              {getAdditionalFields(budgetData).length > 0 ? (
                // Show detailed compensation section when there are additional fields
                <div className={styles.compensationSection}>
                  <div className={styles.compensationField}>
                    <label className={styles.smallLabel}>Main Compensation</label>
                    <DollarInput
                      value={formData.compensation || 0}
                      onChange={(value) => {
                        setFormData(prevState => ({
                          ...prevState!,
                          compensation: value
                        }));
                        setHasChanges(true);
                      }}
                      name="compensation"
                      className={styles.smallCompensationInput}
                      containerClassName={styles.smallCompensationContainer}
                    />
                  </div>

                  {getAdditionalFields(budgetData).map(field => (
                    <div key={field} className={styles.compensationField}>
                      <label className={styles.smallLabel}>
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <div className={styles.smallCompensationContainer}>
                        <DollarInput
                          value={tempAdditionalCompensations[field] || 0}
                          onChange={(value) => handleAdditionalCompChange(field, value.toString())}
                          name={`additional-${field}`}
                          className={styles.smallCompensationInput}
                          containerClassName={styles.smallCompensationContainer}
                        />
                      </div>
                    </div>
                  ))}

                  <div className={styles.totalCompensation}>
                    <label className={styles.totalLabel}>Total</label>
                    <div className={styles.totalValue}>
                      ${formatNumber(totalCompensation)}
                    </div>
                  </div>
                </div>
              ) : (
                // Show original single compensation input when no additional fields
                <div>
                    <label>Compensation</label>
                  <DollarInput
                    value={formData.compensation || 0}
                    onChange={(value) => {
                      setFormData(prevState => ({
                        ...prevState!,
                        compensation: value
                      }));
                      setHasChanges(true);
                      }}
                      name="compensation"
                    />
                  </div>
              )}
            </>
          )}
          <div>
            <label>Tier</label>
            <select 
              name="tier" 
              value={formData.tier || 0} 
              onChange={handleChange}
            >
              <option value={0}>No Tier</option>
              <option value={1}>Tier 1</option>
              <option value={2}>Tier 2</option>
              <option value={3}>Tier 3</option>
              <option value={4}>Tier 4</option>
              <option value={5}>Tier 5</option>
              <option value={6}>Tier 6</option>
            </select>
          </div>
          {showCommitCheckbox && (
            <div className={styles.commitContainer}>
              <label>
                Committed
                <input
                  type="checkbox"
                  name="commit"
                  checked={formData?.commit === 1}
                  onChange={handleChange}
                />
              </label>
            </div>
          )}
          <div>
            <label>Notes</label>
            <textarea name="notes" value={formData.notes || ''} onChange={handleChange} />
          </div>
          <div className={styles.injuryContainer}>
            <label>
              Injured
              <input
                type="checkbox"
                name="injury"
                checked={formData?.injury === 1}
                onChange={handleChange}
              />
            </label>
          </div>
          <div className={styles.endingSeasonContainer}>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setShowEndingSeasonModal(true);
              }}
              className={styles.endingSeasonToggle}
            >
              {formData.ending_season ? 'Edit early removal' : 'Remove player before eligibility is up'}
            </a>

            <EndingSeasonModal
              isOpen={showEndingSeasonModal}
              onClose={() => setShowEndingSeasonModal(false)}
              athleteId={formData.athlete_id || ''}
              selectedScenario={selectedScenario}
              targetScenario={targetScenario}
              currentEndingSeason={formData.ending_season}
              currentCompensation={formData.compensation}
              currentScholarshipPerc={formData.scholarship_perc} 
              startYear={0}
              eligibilityYears={0}
              team={team}
              selectedYear={effectiveYear}
            />
          </div>
          <div className={styles.pffLinkSection}>
            <div className={styles.pffLinkDisplay}>
              <Image 
                src={pffIcon.src} 
                alt="PFF Link" 
                width={16} 
                height={16} 
              />
              <input
                type="text"
                name="pff_link"
                value={formData.pff_link || ''}
                onChange={handleChange}
                className={styles.pffLinkInput}
                placeholder="Enter PFF link"
              />
            </div>
            <Select
              isMulti
              options={emojiOptions}
              value={selectedEmojis}
              onChange={handleEmojiChange}
              className={styles.emojiSelect}
              placeholder="Select emojis..."
            />
          </div>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={!hasChanges || uploading}
          >
            {uploading ? 'Uploading...' : 'Save Changes'}
          </button>
          <button
            className={styles.archiveButton}
            onClick={handleArchive}
          >
            Archive
          </button>
          <p className={styles.infoText}>
            Changes will apply to {effectiveYear} and future years, not past years.
          </p>
        </>
      )}
    </div>
  );
  
  // Use ReactDOM.createPortal to render directly to body
  return ReactDOM.createPortal(detailsContent, detailsPortal);
};

export default Details;
