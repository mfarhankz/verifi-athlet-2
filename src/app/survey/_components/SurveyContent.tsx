"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Flex, Button, Typography } from "antd";
import Image from "next/image";
import { fetchAthleteById } from "@/lib/queries";
import type { AthleteData } from "@/types/database";
import { supabase } from "@/lib/supabaseClient";


const { Text } = Typography;

import ServeyStart from "./SurveyStart";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";

interface SurveyContentProps {
  athleteId: string;
}

export default function SurveyContent({ athleteId }: SurveyContentProps) {
  const searchParams = useSearchParams();
  const [athlete, setAthlete] = useState<AthleteData | null>(null);
  const [loading, setLoading] = useState(true);
  // Check for step parameter in URL for testing purposes
  const stepParam = searchParams?.get('step');
  const initialStep = stepParam && !isNaN(Number(stepParam)) && Number(stepParam) >= 1 && Number(stepParam) <= 5 
    ? Number(stepParam) 
    : 1;
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [surveyData, setSurveyData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepChangeKey, setStepChangeKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch athlete data when component mounts
  useEffect(() => {
    const loadAthleteData = async () => {
      try {
        setLoading(true);
        const data = await fetchAthleteById(athleteId);
        if (data) {
          setAthlete(data);
          
          // Fetch existing data from athlete_fact table for survey fields
          const { data: existingFacts, error: factsError } = await supabase
            .from('athlete_fact')
            .select('data_type_id, value, created_at')
            .eq('athlete_id', athleteId)
            .in('data_type_id', [1, 2, 3, 8, 10, 13, 14, 15, 16, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 77, 78, 79, 230, 231, 234, 246, 247, 248, 251, 570, 571])
            .order('created_at', { ascending: false });

          if (factsError) {
            console.error('Error fetching athlete facts:', factsError);
          }

          if (existingFacts && existingFacts.length > 0) {
            // Convert array of facts to object for easier use in forms
            // Since we ordered by created_at DESC, the first occurrence of each data_type_id will be the most recent
            const factsObject = existingFacts.reduce((acc: any, fact: { data_type_id: number; value: string }) => {
              // Only set the value if we haven't seen this data_type_id before (most recent first)
              if (!(fact.data_type_id in acc)) {
                acc[fact.data_type_id] = fact.value;
              }
              return acc;
            }, {} as any);



            // Check for existing committed school in offer table
            const { data: existingOffers, error: offerError } = await supabase
              .from('offer')
              .select('school_id, created_at')
              .eq('athlete_id', athleteId)
              .eq('source', 'survey')
              .order('created_at', { ascending: false });

            if (!offerError && existingOffers && existingOffers.length > 0) {
              // Use the first offer (most recent one)
              factsObject.committed_school = existingOffers[0].school_id.toString();
            }

            setSurveyData(factsObject);
          }
        } else {
          console.error('No athlete data returned for ID:', athleteId);
        }
      } catch (error) {
        console.error('Error fetching athlete:', error);
      } finally {
        setLoading(false);
      }
    };

    if (athleteId) {
      loadAthleteData();
    }
  }, [athleteId]);

  // Visual feedback when currentStep changes (when user advances to next step)
  useEffect(() => {
    console.log('Current step changed to:', currentStep);
    
    // Force a re-render and add visual feedback
    setStepChangeKey(prev => prev + 1);
    
    // Add a brief visual feedback to indicate step change
    if (typeof window !== 'undefined') {
      // Try multiple approaches for visual feedback
      
      // 1. Simple alert to confirm step change (temporary for testing)
      console.log('STEP CHANGED - VISUAL FEEDBACK SHOULD HAPPEN NOW');
      
      // 2. Try to scroll to top
      window.scrollTo(0, 0);
      
      // 3. Try to add a class to body for visual feedback
      document.body.classList.add('step-changed');
      setTimeout(() => {
        document.body.classList.remove('step-changed');
      }, 500);
      
      // 4. Try to flash the container if it exists
      if (containerRef.current) {
        console.log('Container found, trying to highlight');
        containerRef.current.style.transition = 'background-color 0.3s ease';
        containerRef.current.style.backgroundColor = '#ffeb3b'; // Bright yellow for visibility
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.style.backgroundColor = '';
            console.log('Highlight removed');
          }
        }, 500);
      } else {
        console.log('Container ref not found');
      }
    }
  }, [currentStep]);

  // Function to save individual survey section to the database
  const saveSurveySection = async (sectionData: any, sectionNumber: number) => {
    try {
      console.log(`Saving section ${sectionNumber} data:`, sectionData);
      
      // Handle the special case for committed school (only in section 1)
      if (sectionNumber === 1 && sectionData.committed_school) {
        console.log('Checking for existing offer entry for school:', sectionData.committed_school);
        
        // First check if an offer already exists for this athlete and school
        const { data: existingOffer, error: checkError } = await supabase
          .from('offer')
          .select('id')
          .eq('athlete_id', athleteId)
          .eq('school_id', sectionData.committed_school)
          .eq('source', 'survey')
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error checking for existing offer:', checkError);
        }

        // Only insert if no existing offer found
        if (!existingOffer) {
          console.log('Creating new offer entry for school:', sectionData.committed_school);
          const { error: offerError } = await supabase
            .from('offer')
            .insert({
              athlete_id: athleteId,
              school_id: sectionData.committed_school,
              created_at: new Date().toISOString(),
              source: 'survey'
            });

          if (offerError) {
            console.error('Error creating offer entry:', offerError);
          } else {
            console.log('Offer entry created successfully');
          }
        } else {
          console.log('Offer entry already exists for this athlete and school');
        }
      }

      // Remove committed_school from data before saving to athlete_fact
      const { committed_school, ...dataToSave } = sectionData;
      console.log('Data to save to athlete_fact:', dataToSave);

      // Convert the data object to array of athlete_fact entries, filtering out empty values
      const factEntries = Object.entries(dataToSave)
        .filter(([dataTypeId, value]) => value && value.toString().trim() !== '')
        .map(([dataTypeId, value]) => ({
          athlete_id: athleteId,
          data_type_id: parseInt(dataTypeId),
          value: value as string,
          source: 'survey',
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        }));

      console.log('Fact entries to insert:', factEntries);

      // Insert new entries (not updating existing ones)
      const result = await supabase
        .from('athlete_fact')
        .insert(factEntries);

      if (result.error) {
        console.error('Error saving survey section data:', result.error);
        return false;
      }

      console.log(`Section ${sectionNumber} data saved successfully`);
      return true;
    } catch (error) {
      console.error('Error in saveSurveySection:', error);
      return false;
    }
  };

  // Function to save survey data to the database
  const saveSurveyData = async (data: any) => {
    try {
      console.log('Saving survey data:', data);
      
      // Handle the special case for committed school
      if (data.committed_school) {
        console.log('Checking for existing offer entry for school:', data.committed_school);
        
        // First check if an offer already exists for this athlete and school
        const { data: existingOffer, error: checkError } = await supabase
          .from('offer')
          .select('id')
          .eq('athlete_id', athleteId)
          .eq('school_id', data.committed_school)
          .eq('source', 'survey')
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error checking for existing offer:', checkError);
        }

        // Only insert if no existing offer found
        if (!existingOffer) {
          console.log('Creating new offer entry for school:', data.committed_school);
          const { error: offerError } = await supabase
            .from('offer')
            .insert({
              athlete_id: athleteId,
              school_id: data.committed_school,
              created_at: new Date().toISOString(),
              source: 'survey'
            });

          if (offerError) {
            console.error('Error creating offer entry:', offerError);
          } else {
            console.log('Offer entry created successfully');
          }
        } else {
          console.log('Offer entry already exists for this athlete and school');
        }
      }

      // Remove committed_school from data before saving to athlete_fact
      const { committed_school, ...dataToSave } = data;
      console.log('Data to save to athlete_fact:', dataToSave);

      // Convert the data object to array of athlete_fact entries, filtering out empty values
      const factEntries = Object.entries(dataToSave)
        .filter(([dataTypeId, value]) => value && value.toString().trim() !== '')
        .map(([dataTypeId, value]) => ({
          athlete_id: athleteId,
          data_type_id: parseInt(dataTypeId),
          value: value as string,
          source: 'survey',
          date: new Date().toISOString(),
          created_at: new Date().toISOString()
        }));

      console.log('Fact entries to insert:', factEntries);

      // Insert new entries (not updating existing ones)
      const result = await supabase
        .from('athlete_fact')
        .insert(factEntries);

      if (result.error) {
        console.error('Error saving survey data:', result.error);
        return false;
      }

      console.log('Survey data saved successfully');
      return true;
    } catch (error) {
      console.error('Error in saveSurveyData:', error);
      return false;
    }
  };

  // Function to handle survey step completion
  const handleStepComplete = async (stepData: any) => {
    const updatedData = { ...surveyData, ...stepData };
    setSurveyData(updatedData);

    // Only advance to next step, don't save to database yet
    setCurrentStep(prev => prev + 1);
  };

  // Function to handle survey step completion with saving
  const handleStepCompleteAndSave = async (stepData: any, sectionNumber: number) => {
    try {
      // Save the current section to database
      const saveSuccess = await saveSurveySection(stepData, sectionNumber);
      
      if (saveSuccess) {
        // Update local state and advance to next step
        const updatedData = { ...surveyData, ...stepData };
        setSurveyData(updatedData);
        setCurrentStep(prev => prev + 1);
      } else {
        alert('Error saving section data. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleStepCompleteAndSave:', error);
      alert('Error saving section data. Please try again.');
    }
  };

  // Function to handle final survey submission (only saves section 5)
  const handleFinalSubmit = async (finalStepData: any) => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Survey submission already in progress, ignoring duplicate call');
      return;
    }

    console.log('Final step data:', finalStepData);
    
    setIsSubmitting(true);
    
    try {
      // Only save the final step data (section 5)
      const success = await saveSurveySection(finalStepData, 5);
      if (success) {
        alert('Survey completed successfully!');
        // Optionally redirect or show completion message
      } else {
        alert('Error saving survey data. Please try again.');
      }
    } catch (error) {
      console.error('Error in handleFinalSubmit:', error);
      alert('Error saving survey data. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-container mobile-survey">
        <Flex vertical className="gap-3">
          <div className="card">
            <Flex vertical className="w-[100%] m-auto">
              <Flex align="center" justify="center">
                <Image src={"/logo.svg"} alt={"logo"} height={31} width={192} />
              </Flex>
              <div className="text-center py-8">
                <p>Loading athlete data...</p>
              </div>
            </Flex>
          </div>
        </Flex>
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="main-container mobile-survey">
        <Flex vertical className="gap-3">
          <div className="card">
            <Flex vertical className="w-[100%] m-auto">
              <Flex align="center" justify="center">
                <Image src={"/logo.svg"} alt={"logo"} height={31} width={192} />
              </Flex>
              <div className="text-center py-8">
                <p>Athlete not found or you don&apos;t have permission to view this survey.</p>
              </div>
            </Flex>
          </div>
        </Flex>
      </div>
    );
  }

  return (
    <div className="main-container mobile-survey" ref={containerRef} key={stepChangeKey}>
      <Flex vertical className="gap-3">
        <div className="card">
          <Flex vertical className="w-[100%] m-auto">
            <Flex align="center" justify="center">
              <Image src={"/logo.svg"} alt={"logo"} height={31} width={192} />
            </Flex>
            
            {/* Show athlete info at the top */}
            <div className="text-center mb-4 p-4 bg-gray-50 rounded">
              <h3 className="text-lg font-semibold">
                {athlete.first_name} {athlete.last_name}
              </h3>
              <p className="text-gray-600">
                {athlete.primary_position} • {athlete.school?.name || 'No school'}
              </p>
              
              {/* Development Helper - Only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Dev Mode:</strong> Jump to any step for testing
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {[1, 2, 3, 4, 5].map(step => (
                      <button
                        key={step}
                        onClick={() => setCurrentStep(step)}
                        className={`px-3 py-1 text-xs rounded ${
                          currentStep === step 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        Step {step}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {currentStep === 1 && (
              <>
                <ServeyStart />
                <Step1 
                  athlete={athlete}
                  surveyData={surveyData}
                  onComplete={(data) => handleStepCompleteAndSave(data, 1)}
                />
              </>
            )}
            
            {currentStep === 2 && (
              <Step2 
                athlete={athlete}
                surveyData={surveyData}
                onComplete={(data) => handleStepCompleteAndSave(data, 2)}
                onBack={() => setCurrentStep(1)}
              />
            )}
            
            {currentStep === 3 && (
              <Step3 
                athlete={athlete}
                surveyData={surveyData}
                onComplete={(data) => handleStepCompleteAndSave(data, 3)}
                onBack={() => setCurrentStep(2)}
              />
            )}
            
            {currentStep === 4 && (
              <Step4 
                athlete={athlete}
                surveyData={surveyData}
                onComplete={(data) => handleStepCompleteAndSave(data, 4)}
                onBack={() => setCurrentStep(3)}
              />
            )}
            
            {currentStep === 5 && (
              <Step5 
                athlete={athlete}
                surveyData={surveyData}
                onComplete={handleFinalSubmit}
                onBack={() => setCurrentStep(4)}
                isSubmitting={isSubmitting}
              />
            )}
          </Flex>
        </div>
      </Flex>
    </div>
  );
} 