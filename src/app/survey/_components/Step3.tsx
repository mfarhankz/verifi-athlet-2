"use client";

import { Flex, Typography, Button, Input, Select } from "antd";
import TextArea from "antd/es/input/TextArea";
import Image from "next/image";
import { useState } from "react";
import type { AthleteData } from "@/types/database";
import ProgressPieChart from "./ProgressPieChart";

interface Step3Props {
  athlete: AthleteData;
  surveyData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function Step3({ athlete, surveyData, onComplete, onBack }: Step3Props) {
  const [formData, setFormData] = useState({
    // data_type_id: 16 - Sport-specific question (bat/throw, dominant foot, shooting arm, dominant hand, swing)
    '16': surveyData['16'] || '',
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
    // data_type_id: 37 - Link to highlight tape (or best game)
    '37': surveyData['37'] || '',
    // data_type_id: 38 - Additional link to highlight tape (or best game)
    '38': surveyData['38'] || '',
    // data_type_id: 15 - Club Team
    '15': surveyData['15'] || '',
    // data_type_id: 79 - Club Coach Contact Info
    '79': surveyData['79'] || '',
    // data_type_id: 39 - List any honors you've received
    '39': surveyData['39'] || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (dataTypeId: string, value: string) => {
    setFormData(prev => ({ ...prev, [dataTypeId]: value }));
  };

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
            Athletic Information
          </Typography.Title>
          <Typography.Text>
            Tell us about your background and achievements
          </Typography.Text>
        </Flex>
      </Flex>
      <div className="flex flex-col lg:flex-row gap-5">
        <Flex vertical className="w-full">
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

        {/* Golf - sport_id 10,11 */}
        {(athlete?.sport_id === 10 || athlete?.sport_id === 11) && (
          <>
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Swing?</Typography.Title>
              <Select
                className="w-full"
                value={formData['16']}
                onChange={(value) => handleChange('16', value)}
                options={[
                  { value: "Right", label: "Right" },
                  { value: "Left", label: "Left" }
                ]}
                placeholder="Select your swing preference..."
              />
            </Flex>

            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Home course</Typography.Title>
              <Input
                value={formData['17']}
                onChange={(e) => handleChange('17', e.target.value)}
                placeholder="Enter your home course name..."
              />
            </Flex>
          </>
        )}

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
        </Flex>
        <Flex vertical className="w-full">
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
          <Typography.Title level={4}>Link to highlight tape (or best game)</Typography.Title>
          <Input
            value={formData['37']}
            onChange={(e) => handleChange('37', e.target.value)}
            placeholder="Enter link to your highlight tape or best game..."
          />
        </Flex>

        {/* Additional highlight tape link - visible to all sports except baseball (sport_id 6) */}
        {athlete?.sport_id !== 6 && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Additional link to highlight tape (or best game)</Typography.Title>
            <Input
              value={formData['38']}
              onChange={(e) => handleChange('38', e.target.value)}
              placeholder="Enter additional link to your highlight tape or best game..."
            />
          </Flex>
        )}

        {/* Club Team / AAU Team - visible for specific sports */}
        {(athlete?.sport_id === 1 || athlete?.sport_id === 2 || athlete?.sport_id === 3 || 
          athlete?.sport_id === 4 || athlete?.sport_id === 5 || athlete?.sport_id === 6 || 
          athlete?.sport_id === 7 || athlete?.sport_id === 12 || athlete?.sport_id === 13 || 
          athlete?.sport_id === 18 || athlete?.sport_id === 19) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              {(athlete?.sport_id === 1 || athlete?.sport_id === 2) ? 'AAU Team' : 'Club Team'}
            </Typography.Title>
            <Input
              value={formData['15']}
              onChange={(e) => handleChange('15', e.target.value)}
              placeholder={`Enter your ${(athlete?.sport_id === 1 || athlete?.sport_id === 2) ? 'AAU' : 'club'} team name...`}
            />
          </Flex>
        )}

        {/* Club Coach / AAU Coach Contact Info - visible for specific sports */}
        {(athlete?.sport_id === 1 || athlete?.sport_id === 2 || athlete?.sport_id === 3 || 
          athlete?.sport_id === 4 || athlete?.sport_id === 5 || athlete?.sport_id === 6 || 
          athlete?.sport_id === 7 || athlete?.sport_id === 12 || athlete?.sport_id === 13 || 
          athlete?.sport_id === 18 || athlete?.sport_id === 19) && (
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              {(athlete?.sport_id === 1 || athlete?.sport_id === 2) ? 'AAU Coach Contact Info' : 'Club Coach Contact Info'}
            </Typography.Title>
            <Input
              value={formData['79']}
              onChange={(e) => handleChange('79', e.target.value)}
              placeholder={`Enter your ${(athlete?.sport_id === 1 || athlete?.sport_id === 2) ? 'AAU' : 'club'} coach's contact information...`}
            />
          </Flex>
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
