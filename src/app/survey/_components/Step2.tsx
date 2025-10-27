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
    // data_type_id: 25 - Eligibility remaining
    '25': surveyData['25'] || '',
    // data_type_id: 251 - Are you on scholarship?
    '251': surveyData['251'] || '',
    // data_type_id: 570 - Are you a grad transfer?
    '570': surveyData['570'] || '',
    // data_type_id: 28 - When are you looking to transfer?
    '28': surveyData['28'] || '',
    // data_type_id: 32 - What is important in next school
    '32': surveyData['32'] || '',
    // data_type_id: 34 - Open to walking on
    '34': surveyData['34'] || '',
    // data_type_id: 8 - List any colleges you have attended prior to your current college
    '8': surveyData['8'] || '',
    // data_type_id: 35 - GPA
    '35': surveyData['35'] || '',
    // data_type_id: 10 - Major
    '10': surveyData['10'] || '',
    // data_type_id: 36 - How important is major
    '36': surveyData['36'] || '',
    // data_type_id: 687 - Have you or your family served in the military?
    '687': surveyData['687'] || '',
    // data_type_id: 686 - Are you currently eligible for a Pell Grant?
    '686': surveyData['686'] || '',
    // data_type_id: 693 - HS GPA
    '693': surveyData['693'] || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpaWarning, setGpaWarning] = useState(false);
  const [hsGpaWarning, setHsGpaWarning] = useState(false);

  const handleChange = (dataTypeId: string, value: string) => {
    setFormData(prev => ({ ...prev, [dataTypeId]: value }));
  };

  const handleGPAChange = (dataTypeId: string, value: string) => {
    // Check if non-numerical characters were entered
    const hasNonNumeric = /[^0-9.]/.test(value);
    
    // Only allow numbers and decimal point
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;
    
    setFormData(prev => ({ ...prev, [dataTypeId]: finalValue }));
    
    // Show warning if non-numerical input was attempted
    if (hasNonNumeric) {
      if (dataTypeId === '35') {
        setGpaWarning(true);
        setTimeout(() => setGpaWarning(false), 2000); // Hide after 2 seconds
      } else if (dataTypeId === '693') {
        setHsGpaWarning(true);
        setTimeout(() => setHsGpaWarning(false), 2000); // Hide after 2 seconds
      }
    }
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
      <div className="flex flex-col gap-5 max-w-3xl mx-auto">
        <Flex vertical className="w-full">
        {/* Eligibility remaining */}
        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            Eligibility remaining (in years)?
          </Typography.Title>
          <Select
            className="w-full"
            value={formData['25']}
            onChange={(value) => handleChange('25', value)}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
              { value: "5", label: "5" },
            ]}
          />
        </Flex>

        {/* Are you on scholarship? */}
        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            Are you on scholarship?
          </Typography.Title>
          <Select
            className="w-full"
            value={formData['251']}
            onChange={(value) => handleChange('251', value)}
            options={[
              { value: "Yes", label: "Yes" },
              {
                value: "Partial (50% or more)",
                label: "Partial (50% or more)",
              },
              {
                value: "Partial (less than 50%)",
                label: "Partial (less than 50%)",
              },
              { value: "None", label: "None" },
            ]}
          />
        </Flex>

        {/* Are you a grad transfer? */}
        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            Are you a grad transfer?
          </Typography.Title>
          <Select
            className="w-full"
            value={formData['570']}
            onChange={(value) => handleChange('570', value)}
            options={[
              { value: "TRUE", label: "Yes" },
              { value: "FALSE", label: "No" },
            ]}
          />
        </Flex>

        {/* When are you looking to transfer? */}
        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>
            When are you looking to transfer?
          </Typography.Title>
          <Select
            className="w-full"
            value={formData['28']}
            onChange={(value) => handleChange('28', value)}
            options={[
              {
                value: "I want to transfer and play immediately",
                label: "I want to transfer and play immediately",
              },
              {
                value:
                  "I want to transfer asap but for the right situation I would wait to play",
                label:
                  "I want to transfer asap but for the right situation I would wait to play",
              },
              {
                value:
                  "I'm waiting until the end of the school year and then will want to transfer",
                label:
                  "I'm waiting until the end of the school year and then will want to transfer",
              },
              {
                value:
                  "I'm waiting until I graduate and then will want to transfer",
                label:
                  "I'm waiting until I graduate and then will want to transfer",
              },
            ]}
          />
        </Flex>

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
          <Typography.Title level={4}>
            List any colleges you have attended prior to your current college
          </Typography.Title>
          <TextArea
            rows={4}
            value={formData['8']}
            onChange={(e) => handleChange('8', e.target.value)}
            placeholder="List any colleges you have attended prior to your current college..."
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



        
        </Flex>
        <Flex vertical className="w-full">




        <Flex vertical className="mb-5 survey-textarea">
          <Typography.Title level={4}>GPA</Typography.Title>
          <Input
            value={formData['35']}
            onChange={(e) => handleGPAChange('35', e.target.value)}
            placeholder="Enter your GPA (numbers only)..."
          />
          {gpaWarning && (
            <div style={{ fontSize: '12px', marginTop: '4px', color: 'red' }}>
              Numerical values only
            </div>
          )}
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

        {/* Questions only visible for sport_id 21 */}
        {athlete?.sport_id === 21 && (
          <>
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Have you or your family served in the military?</Typography.Title>
              <Select
                className="w-full"
                value={formData['687']}
                onChange={(value) => handleChange('687', value)}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" }
                ]}
                placeholder="Select an option..."
              />
            </Flex>

            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>Are you currently eligible for a Pell Grant?</Typography.Title>
              <Select
                className="w-full"
                value={formData['686']}
                onChange={(value) => handleChange('686', value)}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" }
                ]}
                placeholder="Select an option..."
              />
            </Flex>

            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>HS GPA</Typography.Title>
              <Input
                value={formData['693']}
                onChange={(e) => handleGPAChange('693', e.target.value)}
                placeholder="Enter your high school GPA..."
              />
              {hsGpaWarning && (
                <div style={{ fontSize: '12px', marginTop: '4px', color: 'red' }}>
                  Numerical values only
                </div>
              )}
            </Flex>
          </>
        )}
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
