"use client";

import { Flex, Typography, Button, Input, Select } from "antd";
import TextArea from "antd/es/input/TextArea";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { AthleteData } from "@/types/database";
import ProgressPieChart from "./ProgressPieChart";
import { fetchHighSchools, fetchSchoolsByDivision } from "@/utils/schoolUtils";
import { supabase } from "@/lib/supabaseClient";

interface Step3Props {
  athlete: AthleteData;
  surveyData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function Step3({ athlete, surveyData, onComplete, onBack }: Step3Props) {
  const [formData, setFormData] = useState({
    // data_type_id: 78 - Most comfortable position/best events
    '78': surveyData['78'] || '',
    // data_type_id: 33 - Games coach should watch
    '33': surveyData['33'] || '',
    // data_type_id: 16 - Sport-specific question (bat/throw, dominant foot, shooting arm, dominant hand, swing)
    '16': surveyData['16'] || '',
    // data_type_id: 234 - Summer league ball
    '234': surveyData['234'] || '',
    // data_type_id: 17 - Home course (Golf only)
    '17': surveyData['17'] || '',
    // data_type_id: 230 - Perfect Game Profile link
    '230': surveyData['230'] || '',
    // data_type_id: 231 - Prep Baseball Report Profile link
    '231': surveyData['231'] || '',
    // data_type_id: 634 - Track Wrestling Profile (Wrestling only)
    '634': surveyData['634'] || '',
    // data_type_id: 635 - WrestleStat Link (Wrestling only)
    '635': surveyData['635'] || '',
    // data_type_id: 38 - Additional link to highlight tape (or best game)
    '38': surveyData['38'] || '',
    // data_type_id: 15 - Club Team
    '15': surveyData['15'] || '',
    // data_type_id: 79 - Club Coach Contact Info
    '79': surveyData['79'] || '',
    // data_type_id: 39 - List any honors you've received
    '39': surveyData['39'] || '',
    // data_type_id: 29 - Who will be helping you with your decision?
    '29': surveyData['29'] || '',
    // data_type_id: 30 - Contact Info for anyone helping with your decision
    '30': surveyData['30'] || '',
    // data_type_id: 246 - Home address - Street
    '246': surveyData['246'] || '',
    // data_type_id: 247 - Home address - City
    '247': surveyData['247'] || '',
    // data_type_id: 24 - Home address - State
    '24': surveyData['24'] || '',
    // data_type_id: 248 - Home address - Zip
    '248': surveyData['248'] || '',
    // data_type_id: 7 - High schools (multiple selection)
    '7': surveyData['7'] || '',
    // data_type_id: 696 - HS Head Coach Name
    '696': surveyData['696'] || '',
    // data_type_id: 255 - HS Head Coach Email
    '255': surveyData['255'] || '',
    // data_type_id: 256 - HS Head Coach Cell
    '256': surveyData['256'] || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highSchools, setHighSchools] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const handleChange = (dataTypeId: string, value: string) => {
    setFormData(prev => ({ ...prev, [dataTypeId]: value }));
  };

  // Fetch high schools and states on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch states from school_fact table where data_type_id = 24
        const { data: stateData, error: stateError } = await supabase
          .from('school_fact')
          .select('value')
          .eq('data_type_id', 24)
          .order('value');

        if (stateError) {
          console.error('Error fetching states:', stateError);
        } else {
          const uniqueStates = [...new Set(stateData?.map((item: { value: string }) => item.value) || [])];
          setStates(uniqueStates.map(state => ({ value: state, label: state })));
        }

        // Fetch high schools
        const highSchoolData = await fetchHighSchools();
        setHighSchools(highSchoolData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch high schools when state changes
  useEffect(() => {
    const fetchHighSchoolsByState = async () => {
      if (!selectedState) {
        const highSchoolData = await fetchHighSchools();
        setHighSchools(highSchoolData || []);
        return;
      }

      try {
        // Get school IDs that match the state using data_type_id 24
        const { data: stateData, error: stateError } = await supabase
          .from("school_fact")
          .select("school_id")
          .eq("data_type_id", 24)
          .eq("value", selectedState);

        if (stateError) {
          console.error('Error fetching schools by state:', stateError);
          setHighSchools([]);
          return;
        }

        if (!stateData || stateData.length === 0) {
          setHighSchools([]);
          return;
        }

        const stateSchoolIds = stateData.map((item: { school_id: string }) => item.school_id);

        // Fetch high schools that are in the selected state
        const { data: schoolData, error: schoolError } = await supabase
          .from("school")
          .select("id, name")
          .in("id", stateSchoolIds)
          .order("name");

        if (schoolError) {
          console.error('Error fetching high schools:', schoolError);
          setHighSchools([]);
        } else {
          setHighSchools(schoolData || []);
        }
      } catch (error) {
        console.error('Error fetching high schools by state:', error);
        setHighSchools([]);
      }
    };

    fetchHighSchoolsByState();
  }, [selectedState]);

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Form submission already in progress, ignoring duplicate click');
      return;
    }

    setIsSubmitting(true);
    
    try {
      onComplete(formData);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error proceeding to next step. Please try again.');
      setIsSubmitting(false); // Reset on error
    }
  };

  return (
    <Flex vertical className="servey-box">
      <Flex className="survey-head justify-between items-center mb-5">
        <Typography.Title level={3} className="italic">
          Survey
        </Typography.Title>
        <Flex className="items-center">
          <Flex vertical className="items-end mr-3">
            <Typography.Title level={5} className="margin-0">
              3 out of 5
            </Typography.Title>
            <Typography.Text>Completed 60%</Typography.Text>
          </Flex>
                     <ProgressPieChart currentStep={3} totalSteps={5} size={32} />
        </Flex>
      </Flex>
      <Flex
        vertical
        justify="center"
        align="center"
        className="py-4 px-5 mb-5 survey-banner"
      >
        <Image
          className="mb-2"
          src={"/paper.svg"}
          alt={""}
          height={52}
          width={52}
        />
        <Flex vertical justify="center" align="center" className="text-center">
          <Typography.Title level={4} className="italic margin-0">
            Helpful Information
          </Typography.Title>
          <Typography.Text>
          Questions right from the coaches 
          </Typography.Text>
        </Flex>
      </Flex>
       <div className="flex flex-col gap-5 max-w-3xl mx-auto">
         <Flex vertical className="w-full">
           {/* Position/Events question - Only visible for specific sports */}
           {[1, 2, 3, 4, 5, 6, 7, 12, 13, 16, 17, 18, 19].includes(athlete?.sport_id ?? -1) && (
             <Flex vertical className="mb-5 survey-textarea">
               <Typography.Title level={4}>
                 {[16, 17, 18, 19].includes(athlete?.sport_id ?? -1) 
                   ? "What are your best events (include stats)?" 
                   : "What position are you most comfortable playing?"
                 }
               </Typography.Title>
               <Input
                 value={formData['78']}
                 onChange={(e) => handleChange('78', e.target.value)}
                 placeholder={
                   [16, 17, 18, 19].includes(athlete?.sport_id ?? -1)
                     ? "Enter your best events and stats..."
                     : "Enter your most comfortable position..."
                 }
               />
             </Flex>
           )}



           {/* High School questions - Only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <>
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>High School State</Typography.Title>
                <Select
                  className="w-full"
                  value={selectedState}
                  onChange={(value) => setSelectedState(value)}
                  options={states}
                  placeholder="Select a state to filter high schools..."
                  allowClear
                />
              </Flex>

              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>High Schools</Typography.Title>
                {loading ? (
                  <div>Loading high schools...</div>
                ) : (
                  <Select
                    className="w-full"
                    mode="multiple"
                    value={
                      formData['7']
                        ? formData['7'].split(', ').filter((v: string) => v.trim() !== '')
                        : []
                    }
                    onChange={(value) => handleChange('7', value.join(', '))}
                    options={highSchools.map((school) => ({
                      value: school.name,
                      label: school.name,
                    }))}
                    placeholder="Select high schools..."
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '')
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    maxTagCount="responsive"
                    maxTagPlaceholder={(omittedValues) =>
                      `+${omittedValues.length} more`
                    }
                  />
                )}
              </Flex>

              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>HS Head Coach Name</Typography.Title>
                <Input
                  value={formData['696']}
                  onChange={(e) => handleChange('696', e.target.value)}
                  placeholder="Enter high school head coach name..."
                />
              </Flex>

              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>HS Head Coach Email</Typography.Title>
                <Input
                  value={formData['255']}
                  onChange={(e) => handleChange('255', e.target.value)}
                  placeholder="Enter high school head coach email..."
                />
              </Flex>

              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>HS Head Coach Cell</Typography.Title>
                <Input
                  value={formData['256']}
                  onChange={(e) => handleChange('256', e.target.value)}
                  placeholder="Enter high school head coach cell phone..."
                />
              </Flex>
            </>
          )}

        </Flex>
        <Flex vertical className="w-full">
       

        {/* Additional highlight tape link - visible to all sports except baseball (sport_id 6) */}
        {athlete?.sport_id !== 6 && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Additional link to highlight tape (HS highlight or best game)</Typography.Title>
            <Input
              value={formData['38']}
              onChange={(e) => handleChange('38', e.target.value)}
              placeholder="Enter additional link to your highlight tape or best game..."
            />
          </Flex>
        )}

        {/* Club Team / AAU Team - visible for specific sports */}
        {[1, 2, 3, 4, 5, 6, 7, 12, 13, 18, 19].includes(athlete?.sport_id ?? -1) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              {[1, 2].includes(athlete?.sport_id ?? -1) ? 'AAU Team' : 'Club Team'}
            </Typography.Title>
            <Input
              value={formData['15']}
              onChange={(e) => handleChange('15', e.target.value)}
              placeholder={`Enter your ${[1, 2].includes(athlete?.sport_id ?? -1) ? 'AAU' : 'club'} team name...`}
            />
          </Flex>
        )}

        {/* Club Coach / AAU Coach Contact Info - visible for specific sports */}
        {[1, 2, 3, 4, 5, 6, 7, 12, 13, 18, 19].includes(athlete?.sport_id ?? -1) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              {[1, 2].includes(athlete?.sport_id ?? -1) ? 'AAU Coach Contact Info' : 'Club Coach Contact Info'}
            </Typography.Title>
            <Input
              value={formData['79']}
              onChange={(e) => handleChange('79', e.target.value)}
              placeholder={`Enter your ${[1, 2].includes(athlete?.sport_id ?? -1) ? 'AAU' : 'club'} coach's contact information...`}
            />
          </Flex>
        )}

          {/* Sport-specific questions */}
         {/* Baseball/Softball - sport_id 6,7 */}
         {(athlete?.sport_id === 6 || athlete?.sport_id === 7) && (
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>What do you bat/throw?</Typography.Title>
             <Select
               className="w-full"
               value={formData['16']}
               onChange={(value) => handleChange('16', value)}
               options={[
                 { value: "R/R", label: "R/R" },
                 { value: "R/L", label: "R/L" },
                 { value: "L/L", label: "L/L" },
                 { value: "L/R", label: "L/R" },
                 { value: "S/R", label: "S/R" },
                 { value: "S/L", label: "S/L" },
                 { value: "S/S", label: "S/S" }
               ]}
               placeholder="Select your bat/throw combination..."
             />
           </Flex>
         )}

         {/* Summer league ball - Only visible for baseball (sport_id 6) */}
         {athlete?.sport_id === 6 && (
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>Are you playing summer league ball? If so, where?</Typography.Title>
             <TextArea 
               rows={2} 
               value={formData['234']}
               onChange={(e) => handleChange('234', e.target.value)}
               placeholder="Enter summer league details or 'No' if not playing..."
             />
           </Flex>
         )}
        
        <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>What games should a coach watch when evaluating you?</Typography.Title>
             <TextArea 
               rows={3} 
               value={formData['33']}
               onChange={(e) => handleChange('33', e.target.value)}
               placeholder="List specific games or situations..."
             />
           </Flex>

        {/* Baseball-specific profile links - sport_id 6 only (baseball, not softball) */}
        {athlete?.sport_id === 6 && (
          <>
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Perfect Game Profile link</Typography.Title>
              <Input
                value={formData['230']}
                onChange={(e) => handleChange('230', e.target.value)}
                placeholder="Enter your Perfect Game profile URL..."
              />
            </Flex>

            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Prep Baseball Report Profile link</Typography.Title>
              <Input
                value={formData['231']}
                onChange={(e) => handleChange('231', e.target.value)}
                placeholder="Enter your Prep Baseball Report profile URL..."
              />
            </Flex>
          </>
        )}

        {/* Volleyball/Lacrosse - sport_id 5,12,13 */}
        {(athlete?.sport_id === 5 || athlete?.sport_id === 12 || athlete?.sport_id === 13) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Dominant hand?</Typography.Title>
            <Select
              className="w-full"
              value={formData['16']}
              onChange={(value) => handleChange('16', value)}
              options={[
                { value: "Right", label: "Right" },
                { value: "Left", label: "Left" }
              ]}
              placeholder="Select your dominant hand..."
            />
          </Flex>
        )}

                {/* Soccer - sport_id 3,4 */}
                {(athlete?.sport_id === 3 || athlete?.sport_id === 4) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Which is your dominant foot?</Typography.Title>
            <Select
              className="w-full"
              value={formData['16']}
              onChange={(value) => handleChange('16', value)}
              options={[
                { value: "Right", label: "Right" },
                { value: "Left", label: "Left" },
                { value: "Both", label: "Both" }
              ]}
              placeholder="Select your dominant foot..."
            />
          </Flex>
        )}

        {/* Basketball - sport_id 1,2 */}
        {(athlete?.sport_id === 1 || athlete?.sport_id === 2) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Shooting arm?</Typography.Title>
            <Select
              className="w-full"
              value={formData['16']}
              onChange={(value) => handleChange('16', value)}
              options={[
                { value: "Right", label: "Right" },
                { value: "Left", label: "Left" }
              ]}
              placeholder="Select your shooting arm..."
            />
          </Flex>
        )}
        
           {/* Wrestling-specific profile links - sport_id 20 only */}
        {athlete?.sport_id === 20 && (
          <>
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Track Wrestling Profile</Typography.Title>
              <Input
                value={formData['634']}
                onChange={(e) => handleChange('634', e.target.value)}
                placeholder="Enter your Track Wrestling profile URL..."
              />
            </Flex>

            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>WrestleStat Link</Typography.Title>
              <Input
                value={formData['635']}
                onChange={(e) => handleChange('635', e.target.value)}
                placeholder="Enter your WrestleStat profile URL..."
              />
            </Flex>
          </>
        )}


        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>List any honors you&apos;ve received</Typography.Title>
          <TextArea
            rows={3}
            value={formData['39']}
            onChange={(e) => handleChange('39', e.target.value)}
            placeholder="List any awards, honors, or recognitions you've received..."
          />
        </Flex>

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            Who will be helping you with your decision?
          </Typography.Title>
          <Select
            className="w-full"
            mode="multiple"
            value={
              formData['29']
                ? formData['29']
                    .split(", ")
                    .filter((v: string) => v.trim() !== "")
                : []
            }
            onChange={(value) => handleChange('29', value.join(', '))}
            placeholder="Select one or more people"
            style={{
              minHeight: "32px",
              maxHeight: "80px",
              overflow: "auto",
            }}
            maxTagCount="responsive"
            maxTagPlaceholder={(omittedValues) =>
              `+${omittedValues.length} more`
            }
            tagRender={(props) => {
              const { label, onClose } = props;
              return (
                <span
                  style={{
                    display: "inline-block",
                    backgroundColor: "#f0f0f0",
                    border: "1px solid #d9d9d9",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    margin: "1px",
                    fontSize: "11px",
                    maxWidth: "110px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: "20px",
                    height: "22px",
                  }}
                >
                  {label}
                  <span
                    onClick={onClose}
                    style={{
                      marginLeft: "4px",
                      cursor: "pointer",
                      color: "#999",
                      fontSize: "12px",
                    }}
                  >
                    ×
                  </span>
                </span>
              );
            }}
            options={[
              { value: "Parent", label: "Parent" },
              { value: "Coach", label: "Coach" },
              { value: "Family Friend", label: "Family Friend" },
              { value: "Other", label: "Other" },
              { value: "Just Me", label: "Just Me" },
            ]}
          />
        </Flex>

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            Contact Info for anyone helping with your decision
          </Typography.Title>
          <Input
            value={formData['30']}
            onChange={(e) => handleChange('30', e.target.value)}
            placeholder="Enter contact information for anyone helping with your decision..."
          />
        </Flex>

        {/* Home address */}
        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            Home address (parents)
          </Typography.Title>
          <Input
            placeholder="Street"
            value={formData['246']}
            onChange={(e) => handleChange('246', e.target.value)}
            className="mb-2"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="City"
              value={formData['247']}
              onChange={(e) => handleChange('247', e.target.value)}
            />
            <Input
              placeholder="State"
              value={formData['24']}
              onChange={(e) => handleChange('24', e.target.value)}
            />
            <Input
              placeholder="Zip"
              value={formData['248']}
              onChange={(e) => handleChange('248', e.target.value)}
            />
          </div>
        </Flex>
        </Flex>
        

        
      </div>
      <Flex justify="space-between">
        <Button onClick={onBack} className="back-servey" disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="next-servey save-continue-green"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save and Continue'}
        </Button>
      </Flex>
    </Flex>
  );
}
