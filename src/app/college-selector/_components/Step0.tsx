"use client";

import { Button, Flex, Input, Select, Typography } from "antd";
import Image from "next/image";
import { useState, useEffect } from "react";
import ProgressPieChart from "../../survey/_components/ProgressPieChart";
import { fetchSchoolsByMultipleDivisions, School } from "@/utils/schoolUtils";
import { supabase } from "@/lib/supabaseClient";

interface Athlete {
  id: string;
  first_name: string;
  last_name: string;
}

interface Step0Data {
  athleteId?: string;
  athleteName?: string;
  highSchoolId?: string;
  highSchoolName?: string;
  email?: string;
  campPartners?: string;
}

interface Step0Props {
  surveyData: Step0Data;
  onComplete: (data: Step0Data) => void;
}

export default function Step0({ surveyData, onComplete }: Step0Props) {
  const [formData, setFormData] = useState({
    athleteId: surveyData.athleteId || "",
    athleteName: surveyData.athleteName || "",
    highSchoolId: surveyData.highSchoolId || "",
    highSchoolName: surveyData.highSchoolName || "",
    email: surveyData.email || "",
    campPartners: surveyData.campPartners || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highSchools, setHighSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [selectedAthleteData, setSelectedAthleteData] = useState<{ first_name: string; last_name: string } | null>(null);

  // Load high schools when component mounts
  useEffect(() => {
    const loadHighSchools = async () => {
      setLoadingSchools(true);
      try {
        const schools = await fetchSchoolsByMultipleDivisions(['HIGH_SCHOOL']);
        setHighSchools(schools);
      } catch (error) {
        console.error('Error loading high schools:', error);
        setHighSchools([]);
      } finally {
        setLoadingSchools(false);
      }
    };

    loadHighSchools();
  }, []);

  // Fetch athletes when high school changes
  useEffect(() => {
    const fetchAthletes = async () => {
      if (!formData.highSchoolId) {
        setAthletes([]);
        return;
      }

      setLoadingAthletes(true);
      try {
        console.log('Fetching athletes for school ID:', formData.highSchoolId);
        
        // Query the vw_pub_fb_hs_athlete view
        const { data: athleteData, error: athleteError } = await supabase
          .from("vw_pub_fb_hs_athlete")
          .select("athlete_id, first_name, last_name")
          .eq("school_id", formData.highSchoolId)
          .order("last_name")
          .order("first_name");

        console.log('Fetched athlete data from vw_pub_fb_hs_athlete:', athleteData);
        console.log('Athlete fetch error:', athleteError);

        if (athleteError) {
          console.error('Error fetching athlete details:', athleteError);
          setAthletes([]);
        } else {
          // Transform the data to match our Athlete interface
          const transformedAthletes = (athleteData || []).map((athlete: any) => ({
            id: athlete.athlete_id,
            first_name: athlete.first_name,
            last_name: athlete.last_name
          }));
          setAthletes(transformedAthletes);
        }
      } catch (error) {
        console.error('Error in fetchAthletes:', error);
        setAthletes([]);
      } finally {
        setLoadingAthletes(false);
      }
    };

    fetchAthletes();
  }, [formData.highSchoolId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle high school search
  const handleHighSchoolSearch = (value: string) => {
    setSearchValue(value);
  };

  // Handle high school selection
  const handleHighSchoolSelect = (value: string) => {
    const selectedSchool = highSchools.find(school => school.id === value);
    if (selectedSchool) {
      setFormData((prev) => ({
        ...prev,
        highSchoolId: selectedSchool.id,
        highSchoolName: selectedSchool.name,
        athleteId: '', // Clear athlete selection when school changes
        athleteName: '', // Clear athlete name when school changes
      }));
      setSelectedAthleteData(null); // Clear selected athlete data when school changes
    }
  };

  // Handle athlete selection
  const handleAthleteSelect = (value: string) => {
    const selectedAthlete = athletes.find(athlete => athlete.id === value);
    if (selectedAthlete) {
      setFormData((prev) => ({
        ...prev,
        athleteId: selectedAthlete.id,
        athleteName: `${selectedAthlete.first_name} ${selectedAthlete.last_name}`,
      }));
      setSelectedAthleteData({
        first_name: selectedAthlete.first_name,
        last_name: selectedAthlete.last_name,
      });
    }
  };

  // Filter schools based on search
  const filteredSchools = highSchools.filter(school =>
    school.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Validate required fields
    if (!formData.highSchoolId) {
      alert('Please select your high school.');
      return;
    }

    if (!formData.athleteId) {
      alert('Please select an athlete.');
      return;
    }

    if (!formData.email.trim()) {
      alert('Please enter your email address.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    if (!selectedAthleteData) {
      alert('Please select an athlete.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create auth user and athlete_user_detail record
      const response = await fetch('/api/create-athlete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          athleteId: formData.athleteId,
          firstName: selectedAthleteData.first_name,
          lastName: selectedAthleteData.last_name,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Log full error details for debugging
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          details: result.details,
          fullResponse: result
        });
        throw new Error(result.error || 'Failed to create user account');
      }

      console.log('User created successfully:', result.user);
      
      // Sign the user in immediately so they're authenticated for saving to athlete_fact
      // The RLS policy requires authenticated users with matching athlete_user_detail
      
      // Use password sign-in (most reliable method)
      // The API always returns temporaryPassword for password-based sign-in
      let authenticated = false;
      const email = result.email || formData.email.trim();
      const password = result.temporaryPassword;
      
      if (email && password) {
        console.log('Signing in user with temporary password...');
        try {
          // Wait a brief moment for the user to be fully created in the auth system
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
          });

          if (signInError) {
            console.error('Error signing in user with password:', signInError);
            // Check if it's a timing issue - user might not be fully created yet
            if (signInError.message?.includes('Invalid login credentials') || 
                signInError.message?.includes('Email not confirmed')) {
              // Wait a bit longer and try again
              console.log('Retrying sign-in after delay...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
              });
              
              if (retryError) {
                console.error('Retry sign-in also failed:', retryError);
                // Continue anyway - user account is created, they just won't be authenticated yet
              } else if (retryData.session) {
                console.log('✅ User signed in successfully on retry:', retryData.user.id);
                authenticated = true;
              }
            }
          } else if (signInData.session) {
            console.log('✅ User signed in successfully:', signInData.user.id);
            authenticated = true;
          }
        } catch (authError) {
          console.error('Error with password sign-in:', authError);
          // Continue anyway - user account is created
        }
      } else {
        console.warn('⚠️ No email or password provided for sign-in');
      }
      
      // Verify we have a session before proceeding
      if (!authenticated) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          console.log('✅ Session found after sign-in attempt');
          authenticated = true;
        } else {
          console.warn('⚠️ No active session after sign-in attempt. User will need to sign in manually.');
          // Show a warning but continue - the user can still try to complete the survey
          // The saveToAthleteFact function will check authentication and show an error if needed
        }
      }
      
      // Wait a moment for session to be fully established
      if (authenticated) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Save email and camp partners preference to athlete_fact
      // Check for active session before saving
      if (formData.athleteId) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            const now = new Date().toISOString();
            const factEntries: Array<{
              athlete_id: string;
              data_type_id: number;
              value: string;
              source: string;
              date: string;
              created_at: string;
            }> = [];

            // Save email (data_type_id 571)
            if (formData.email.trim()) {
              factEntries.push({
                athlete_id: formData.athleteId,
                data_type_id: 571,
                value: formData.email.trim(),
                source: 'college_selector',
                date: now,
                created_at: now
              });
            }

            // Save camp partners preference (data_type_id 1137) if yes
            if (formData.campPartners === 'yes') {
              factEntries.push({
                athlete_id: formData.athleteId,
                data_type_id: 1137,
                value: '1',
                source: 'college_selector',
                date: now,
                created_at: now
              });
            }

            if (factEntries.length > 0) {
              const { error: factError } = await supabase
                .from('athlete_fact')
                .insert(factEntries);

              if (factError) {
                console.error('Error saving to athlete_fact:', factError);
                // Don't block the flow if this fails, just log it
              } else {
                console.log('Successfully saved email and camp partners preference to athlete_fact');
              }
            }
          } else {
            console.warn('No active session - skipping athlete_fact save. User will need to sign in manually.');
          }
        } catch (factError) {
          console.error('Error in saving to athlete_fact:', factError);
          // Don't block the flow if this fails
        }
      }
      
      // Ensure athleteId is included in the data passed to next step
      const stepData = {
        ...formData,
        athleteId: formData.athleteId, // Explicitly include athleteId
      };
      
      // Proceed to next step
      onComplete(stepData);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert(error instanceof Error ? error.message : "Error creating account. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <Flex vertical className="servey-box">
      <Flex className="survey-head justify-between items-center mb-5">
        <Typography.Title level={3} className="italic">
          College Selector
        </Typography.Title>
        <Flex className="items-center">
          <Flex vertical className="items-end mr-3">
            <Typography.Title level={5} className="margin-0">
              0 out of 5
            </Typography.Title>
            <Typography.Text>Getting Started</Typography.Text>
          </Flex>
          <ProgressPieChart currentStep={0} totalSteps={5} size={32} />
        </Flex>
      </Flex>
      
      <Flex
        vertical
        justify="center"
        align="center"
        className="py-4 px-5 survey-banner"
        style={{ marginBottom: "20px" }}
      >
        <Image
          className="mr-7"
          src={"/paper.svg"}
          alt={""}
          height={52}
          width={52}
        />
        <Flex vertical justify="center" align="center" className="text-center">
          <Typography.Title level={4} className="italic margin-0">
            Athlete Information
          </Typography.Title>
          <Typography.Text>
            Tell us about yourself and your school
          </Typography.Text>
        </Flex>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {/* Question 1: High School Selection */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What high school do you attend? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              Start typing to search for your school
            </Typography.Text>
            <Select
              showSearch
              placeholder="Type to search for your high school"
              value={formData.highSchoolId}
              onSearch={handleHighSchoolSearch}
              onSelect={handleHighSchoolSelect}
              loading={loadingSchools}
              style={{ width: '100%' }}
              filterOption={false}
              notFoundContent={
                loadingSchools 
                  ? 'Loading schools...' 
                  : searchValue.length < 2 
                    ? 'Type at least 2 characters to search'
                    : 'No schools found matching your search'
              }
              options={filteredSchools.map(school => ({
                value: school.id,
                label: school.name,
                key: school.id
              }))}
              allowClear
              onClear={() => {
                setFormData((prev) => ({
                  ...prev,
                  highSchoolId: '',
                  highSchoolName: '',
                  athleteId: '',
                  athleteName: '',
                }));
                setSearchValue('');
                setSelectedAthleteData(null);
              }}
            />
            {formData.highSchoolName && (
              <Typography.Text type="secondary" className="text-xs mt-1">
                Selected: {formData.highSchoolName}
              </Typography.Text>
            )}
          </Flex>

          {/* Question 2: Athlete Selection */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Select an athlete: <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              {!formData.highSchoolId 
                ? "First select a high school above" 
                : "Choose an athlete from your school"
              }
            </Typography.Text>
            <Select
              className="w-full"
              placeholder={
                !formData.highSchoolId 
                  ? "First select a high school" 
                  : loadingAthletes 
                  ? "Loading athletes..." 
                  : "Select an athlete"
              }
              value={formData.athleteId}
              onChange={handleAthleteSelect}
              disabled={!formData.highSchoolId}
              loading={loadingAthletes}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={
                loadingAthletes 
                  ? "Loading..." 
                  : athletes.length === 0 && formData.highSchoolId
                  ? "No athletes found at this high school"
                  : "No athletes found"
              }
              options={athletes.map(athlete => ({
                value: athlete.id,
                label: `${athlete.last_name}, ${athlete.first_name}`,
              }))}
              allowClear
              onClear={() => {
                setFormData((prev) => ({
                  ...prev,
                  athleteId: '',
                  athleteName: '',
                }));
                setSelectedAthleteData(null);
              }}
            />
            {formData.highSchoolId && !loadingAthletes && athletes.length > 0 && (
              <Typography.Text type="secondary" className="text-xs mt-1">
                {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} found
              </Typography.Text>
            )}
            {formData.athleteName && (
              <Typography.Text type="secondary" className="text-xs mt-1">
                Selected: {formData.athleteName}
              </Typography.Text>
            )}
          </Flex>

          {/* Question 3: Email */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your email address? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Input
              className="w-full"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter your email address"
            />
          </Flex>

          {/* Question 4: Camp Partners */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Would you like to receive information about camps from our camp partners?
            </Typography.Title>
            <Select
              className="w-full"
              placeholder="Select yes or no"
              value={formData.campPartners}
              onChange={(value) => handleChange("campPartners", value)}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' }
              ]}
              allowClear
            />
          </Flex>
        </div>
      </Flex>

      <Button
        onClick={handleSubmit}
        className="next-servey save-continue-green"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Continue"}
      </Button>
    </Flex>
  );
}
