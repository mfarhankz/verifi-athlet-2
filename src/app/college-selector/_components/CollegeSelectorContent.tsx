"use client";

import { useState, useRef } from "react";
import { Flex, Typography } from "antd";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const { Text } = Typography;

import Step0 from "./Step0";
import Step1 from "./Step1";
import Step2 from "./Step2";
import Step3 from "./Step3";
import Step4 from "./Step4";
import Step5 from "./Step5";


export default function CollegeSelectorContent() {
  const [currentStep, setCurrentStep] = useState(0);
  const [surveyData, setSurveyData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepChangeKey, setStepChangeKey] = useState(0);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [selectedAthleteName, setSelectedAthleteName] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);



  // Function to save data to athlete_fact table
  const saveToAthleteFact = async (stepData: any) => {
    // Get athleteId from stepData, surveyData, or selectedAthleteId state (in order of preference)
    const athleteIdToUse = stepData.athleteId || surveyData.athleteId || selectedAthleteId;
    
    if (!athleteIdToUse) {
      console.error('No athleteId available for saving to athlete_fact');
      return false;
    }

    try {
      // Check if user is authenticated before saving
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error checking session:', sessionError);
        return false;
      }
      
      if (!sessionData.session) {
        console.error('No active session - user is not authenticated');
        alert('Authentication required. Please refresh the page and try again.');
        return false;
      }
      
      console.log('✅ User authenticated:', sessionData.session.user.id);

      const now = new Date().toISOString();
      
      // Convert stepData object to array of athlete_fact entries
      const factEntries = Object.entries(stepData)
        .filter(([dataTypeId, value]) => {
          // Filter out empty values and non-numeric keys
          return value && 
                 value.toString().trim() !== '' && 
                 !isNaN(Number(dataTypeId));
        })
        .map(([dataTypeId, value]) => ({
          athlete_id: athleteIdToUse, // Use the resolved athleteId
          data_type_id: parseInt(dataTypeId),
          value: value as string,
          source: 'college_selector',
          date: now,
          created_at: now
        }));

      if (factEntries.length === 0) {
        console.log('No data to save for this step');
        return true; // Not an error, just no data
      }

      console.log('Saving to athlete_fact:', factEntries);

      const { error } = await supabase
        .from('athlete_fact')
        .insert(factEntries);

      if (error) {
        console.error('Error saving to athlete_fact:', error);
        
        // Check if it's an authentication error
        if (error.code === 'PGRST301' || error.message?.includes('JWT') || error.message?.includes('401')) {
          alert('Authentication error. Please refresh the page and try again.');
        } else {
          alert('Error saving data. Please try again.');
        }
        
        return false;
      }

      console.log('Successfully saved to athlete_fact');
      return true;
    } catch (error) {
      console.error('Error in saveToAthleteFact:', error);
      return false;
    }
  };

  // Function to handle Step0 completion (athlete selection)
  const handleStep0Complete = async (stepData: any) => {
    // For Step0, we don't save to athlete_fact yet, just store the data
    // Ensure athleteId is included in the surveyData so it's available to all subsequent steps
    const updatedData = { 
      ...surveyData, 
      ...stepData,
      athleteId: stepData.athleteId // Explicitly include athleteId
    };
    setSurveyData(updatedData);
    
    // Set the selected athlete info for display and state
    setSelectedAthleteId(stepData.athleteId);
    setSelectedAthleteName(stepData.athleteName);

    // Advance to next step
    setCurrentStep(1);
    
    // Scroll to top
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  // Function to handle survey step completion
  const handleStepComplete = async (stepData: any) => {
    // Ensure we have athleteId - use from stepData if available, otherwise from state
    const athleteIdToUse = stepData.athleteId || selectedAthleteId || surveyData.athleteId;
    
    if (!athleteIdToUse) {
      console.error('No athleteId available when saving step data');
      alert('Error: Athlete information is missing. Please go back to Step 0 and try again.');
      return;
    }

    // Save data to database using the athleteId
    const saved = await saveToAthleteFact(stepData);
    
    if (!saved) {
      alert('Error saving data. Please try again.');
      return;
    }

    // Include athleteId in updated surveyData so it's available to subsequent steps
    const updatedData = { ...surveyData, ...stepData, athleteId: athleteIdToUse };
    setSurveyData(updatedData);

    // Advance to next step
    setCurrentStep(prev => prev + 1);
    
    // Scroll to top
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  };

  // Function to handle final survey submission
  const handleFinalSubmit = async (finalStepData: any) => {
    // Prevent multiple submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Ensure we have athleteId - use from finalStepData if available, otherwise from state
      const athleteIdToUse = finalStepData.athleteId || surveyData.athleteId || selectedAthleteId;
      
      if (!athleteIdToUse) {
        alert('Error: Athlete information is missing. Please go back to Step 0 and try again.');
        setIsSubmitting(false);
        return;
      }

      // Save final step data to database
      const saved = await saveToAthleteFact(finalStepData);
      
      if (!saved) {
        alert('Error saving final step data. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const finalData = { 
        ...surveyData, 
        ...finalStepData, 
        athleteId: athleteIdToUse 
      };
      
      console.log('Final college selector data:', finalData);
      console.log('Selected athlete ID:', selectedAthleteId);
      
      alert(`College Selector submitted!\n\nYour info is now visible to college coaches. We're finalizing integration with our new system and will follow up soon with your account details and results.`);
      
      // Reset the form
      setSurveyData({});
      setCurrentStep(0);
      setSelectedAthleteId(null);
      setSelectedAthleteName("");
    } catch (error) {
      console.error('Error in handleFinalSubmit:', error);
      alert('Error submitting survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-container mobile-survey" ref={containerRef} key={stepChangeKey}>
      <Flex vertical className="gap-3">
        <div className="card">
          <Flex vertical className="w-[100%] m-auto">
            <Flex align="center" justify="center">
              <Image 
                src={"/wide logo spelled out.webp"} 
                alt={"Verified Athletics"} 
                width={300} 
                height={40} 
                style={{ width: "auto", maxWidth: "100%", height: "40px", marginBottom: "3px" }} 
              />
            </Flex>
            
            {/* Simple Athlete Display (Steps 1-5) */}
            {currentStep > 0 && selectedAthleteName && (
              <div className="text-center mb-4 p-4 bg-gray-50 rounded">
                <h3 className="text-lg font-semibold mb-2">
                  College Selector Survey
                </h3>
                <Typography.Text className="text-base">
                  <strong>Selected Athlete:</strong> {selectedAthleteName}
                </Typography.Text>
              </div>
            )}

            {/* Development Helper - Only show in development */}
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Dev Mode:</strong> Jump to any step for testing
                  </p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {[0, 1, 2, 3, 4, 5].map(step => (
                      <button
                        key={step}
                        onClick={() => setCurrentStep(step)}
                        className={`px-3 py-1 text-xs rounded ${
                          currentStep === step 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        }`}
                      >
                        {step === 0 ? 'Step 0 (Athlete)' : `Step ${step}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Survey Steps */}
            {currentStep === 0 && (
              <Step0 
                surveyData={surveyData}
                onComplete={handleStep0Complete}
              />
            )}
            
            {currentStep === 1 && (
              <Step1 
                surveyData={surveyData}
                onComplete={handleStepComplete}
                onBack={() => setCurrentStep(0)}
              />
            )}
            
            {currentStep === 2 && (
              <Step2 
                surveyData={surveyData}
                onComplete={handleStepComplete}
                onBack={() => setCurrentStep(1)}
              />
            )}
            
            {currentStep === 3 && (
              <Step3 
                surveyData={surveyData}
                onComplete={handleStepComplete}
                onBack={() => setCurrentStep(2)}
              />
            )}
            
            {currentStep === 4 && (
              <Step4 
                surveyData={surveyData}
                onComplete={handleStepComplete}
                onBack={() => setCurrentStep(3)}
              />
            )}
            
            {currentStep === 5 && (
              <Step5 
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

