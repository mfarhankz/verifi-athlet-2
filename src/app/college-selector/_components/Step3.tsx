"use client";

import { Flex, Typography, Button, Select, Input } from "antd";
import Image from "next/image";
import { useState } from "react";
import ProgressPieChart from "../../survey/_components/ProgressPieChart";

interface Step3Data {
  [key: number]: string | undefined;
}

interface Step3Props {
  surveyData: Step3Data;
  onComplete: (data: Step3Data) => void;
  onBack: () => void;
}

export default function Step3({ surveyData, onComplete, onBack }: Step3Props) {
  const [formData, setFormData] = useState<Step3Data>({
    // Football Information questions (using data_type_id as keys)
    77: surveyData[77] || "", // Coaching staff strictness preference
    1134: surveyData[1134] || "", // D3 vs prep school/juco preference
    366: surveyData[366] || "", // NIL deal importance
    365: surveyData[365] || "", // Expected NIL deal value per year
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: number, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    // First 3 questions are required (77, 1134, 366)
    // Last question (365) is optional
    return formData[77] && formData[1134] && formData[366];
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!isFormValid()) {
      alert('Please answer all required questions before continuing.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      onComplete(formData);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error proceeding to next step. Please try again.');
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
            Football Information
          </Typography.Title>
          <Typography.Text>
            Tell us about your football preferences
          </Typography.Text>
        </Flex>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {/* Question 1: Coaching Staff Strictness Preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Stricter coaches have specific rules and expect all members of the team to follow them all of the time or be punished and/or removed from the team. Lenient coaches give players more room to make decisions for themselves and give players that break the rules smaller punishments and more chances before being removed from the team. What type of coaching staff would you prefer? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[77]}
              onChange={(value) => handleChange(77, value)}
              placeholder="Select your coaching preference"
              options={[
                { value: "Very Strict", label: "Very Strict" },
                { value: "Strict", label: "Strict" },
                { value: "Average", label: "Average" },
                { value: "Lenient", label: "Lenient" },
                { value: "Very Lenient", label: "Very Lenient" },
              ]}
            />
          </Flex>

          {/* Question 2: D3 vs Prep School/Juco Preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              If you do not get any scholarship offers would you prefer to go to a D3 school and start your college football experience right away or go to a prep school or juco and try again for a scholarship? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1134]}
              onChange={(value) => handleChange(1134, value)}
              placeholder="Select your preference"
              options={[
                { value: "I prefer going to a D3 school way more than going to a prep school/juco", label: "I prefer going to a D3 school way more than going to a prep school/juco" },
                { value: "I prefer going to a D3 school more than going to a prep school/juco", label: "I prefer going to a D3 school more than going to a prep school/juco" },
                { value: "I prefer going to a D3 school a little more than going to a prep school/juco", label: "I prefer going to a D3 school a little more than going to a prep school/juco" },
                { value: "I prefer going to a D3 school the same as going to a prep school/juco", label: "I prefer going to a D3 school the same as going to a prep school/juco" },
                { value: "I prefer going to a prep school/juco a little more than going to a D3 school", label: "I prefer going to a prep school/juco a little more than going to a D3 school" },
                { value: "I prefer going to a prep school/juco more than going to a D3 school", label: "I prefer going to a prep school/juco more than going to a D3 school" },
                { value: "I prefer going to a prep school/juco way more than going to a D3 school", label: "I prefer going to a prep school/juco way more than going to a D3 school" },
              ]}
            />
          </Flex>

          {/* Question 3: NIL Deal Importance */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              How important is an NIL deal in your college decision? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[366]}
              onChange={(value) => handleChange(366, value)}
              placeholder="Select importance level"
              options={[
                { value: "Very Important", label: "Very Important" },
                { value: "Somewhat Important", label: "Somewhat Important" },
                { value: "Not Important", label: "Not Important" },
              ]}
            />
          </Flex>

          {/* Question 4: Expected NIL Deal Value */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              How much money are you expecting your NIL deal to be worth per year?
            </Typography.Title>
            <Input
              className="w-full"
              value={formData[365]}
              onChange={(e) => handleChange(365, e.target.value)}
              placeholder="Enter expected NIL deal value per year"
            />
          </Flex>
        </div>
      </Flex>

      <Flex gap="small" style={{ marginTop: "20px" }}>
        <Button
          onClick={onBack}
          className="next-servey"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="next-servey save-continue-green"
          loading={isSubmitting}
          disabled={isSubmitting || !isFormValid()}
          style={{ flex: 1 }}
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </Flex>
    </Flex>
  );
}

