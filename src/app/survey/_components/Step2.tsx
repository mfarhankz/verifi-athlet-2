"use client";

import { Flex, Typography, Button, Input, Select } from "antd";
import TextArea from "antd/es/input/TextArea";
import Image from "next/image";
import { useState } from "react";
import type { AthleteData } from "@/types/database";
import ProgressPieChart from "./ProgressPieChart";

interface Step2Props {
  athlete: AthleteData;
  surveyData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function Step2({ athlete, surveyData, onComplete, onBack }: Step2Props) {
  const [formData, setFormData] = useState({
    // data_type_id: 31 - Why transferring
    '31': surveyData['31'] || '',
    // data_type_id: 32 - What is important in next school
    '32': surveyData['32'] || '',
    // data_type_id: 78 - Most comfortable position
    '78': surveyData['78'] || '',
    // data_type_id: 33 - Games coach should watch
    '33': surveyData['33'] || '',
    // data_type_id: 234 - Summer league ball
    '234': surveyData['234'] || '',
    // data_type_id: 34 - Open to walking on
    '34': surveyData['34'] || '',
    // data_type_id: 35 - GPA
    '35': surveyData['35'] || '',
    // data_type_id: 10 - Major
    '10': surveyData['10'] || '',
    // data_type_id: 36 - How important is major
    '36': surveyData['36'] || ''
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
      const submissionData = { ...formData };
      // Omit summer league question (234) unless athlete is in sport 6
      if (athlete?.sport_id !== 6) {
        delete (submissionData as any)['234'];
      }
      // Omit most comfortable position/best events (78) unless athlete sport is in allowed list
      const allowedSportsForPositionOrEvents = new Set([1, 2, 3, 4, 5, 6, 7, 12, 13, 16, 17, 18, 19]);
      if (!allowedSportsForPositionOrEvents.has(athlete?.sport_id ?? -1)) {
        delete (submissionData as any)['78'];
      }
      onComplete(submissionData);
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
              2 out of 5
            </Typography.Title>
            <Typography.Text>Completed 40%</Typography.Text>
          </Flex>
                     <ProgressPieChart currentStep={2} totalSteps={5} size={32} />
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
            Transfer Details
          </Typography.Title>
          <Typography.Text>
            Tell us more about your transfer goals and preferences
          </Typography.Text>
        </Flex>
      </Flex>
      <div className="flex flex-col lg:flex-row gap-5">
        <Flex vertical className="w-full">
        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>In a few words tell us why you are transferring</Typography.Title>
          <TextArea 
            rows={3} 
            value={formData['31']}
            onChange={(e) => handleChange('31', e.target.value)}
            placeholder="Please explain your reason for transferring..."
          />
        </Flex>

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>What is important to you as you look for your next school?</Typography.Title>
          <TextArea 
            rows={3} 
            value={formData['32']}
            onChange={(e) => handleChange('32', e.target.value)}
            placeholder="What factors are most important to you..."
          />
        </Flex>

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

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>What games should a coach watch when evaluating you?</Typography.Title>
          <TextArea 
            rows={3} 
            value={formData['33']}
            onChange={(e) => handleChange('33', e.target.value)}
            placeholder="List specific games or situations..."
          />
        </Flex>

        
        </Flex>
        <Flex vertical className="w-full">
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
          <Typography.Title level={4}>Are you open to walking on at a top program?</Typography.Title>
          <Select
            className="w-full"
            value={formData['34']}
            onChange={(value) => handleChange('34', value)}
            options={[
              { value: "Yes", label: "Yes" },
              { value: "No", label: "No" },
              { value: "I would consider it for the right school", label: "I would consider it for the right school" }
            ]}
            placeholder="Select an option..."
          />
        </Flex>

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>GPA</Typography.Title>
          <Input
            value={formData['35']}
            onChange={(e) => handleChange('35', e.target.value)}
            placeholder="Enter your GPA..."
          />
        </Flex>

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>Major</Typography.Title>
          <Input
            value={formData['10']}
            onChange={(e) => handleChange('10', e.target.value)}
            placeholder="Enter your major..."
          />
        </Flex>

        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>How important is your major?</Typography.Title>
          <Select
            className="w-full"
            value={formData['36']}
            onChange={(value) => handleChange('36', value)}
            options={[
              { value: "Somewhat important", label: "Somewhat important" },
              { value: "They must have it", label: "They must have it" },
              { value: "Very important", label: "Very important" },
              { value: "Not important", label: "Not important" }
            ]}
            placeholder="Select importance level..."
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
