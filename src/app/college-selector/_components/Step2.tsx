"use client";

import { Flex, Typography, Button, Input, Select } from "antd";
import Image from "next/image";
import { useState } from "react";
import ProgressPieChart from "../../survey/_components/ProgressPieChart";

interface Step2Data {
  [key: number]: string | undefined;
}

interface Step2Props {
  surveyData: Step2Data;
  onComplete: (data: Step2Data) => void;
  onBack: () => void;
}

export default function Step2({ surveyData, onComplete, onBack }: Step2Props) {
  const [formData, setFormData] = useState<Step2Data>({
    // Academic Information questions (using data_type_id as keys)
    1015: surveyData[1015] || "", // High school graduation year
    35: surveyData[35] || "", // Unweighted GPA
    1132: surveyData[1132] || "", // Academic stretch preference
    1024: surveyData[1024] || "", // SAT score
    1025: surveyData[1025] || "", // ACT score
    10: surveyData[10] || "", // Desired college major
    1133: surveyData[1133] || "", // Major Category
    36: surveyData[36] || "", // Major importance
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: number, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Validate required fields
    if (!formData[1015]) {
      alert('Please enter your high school graduation year.');
      return;
    }

    if (!formData[35]) {
      alert('Please enter your unweighted GPA.');
      return;
    }

    // Validate GPA is between 0 and 4
    const gpa = parseFloat(formData[35]);
    if (isNaN(gpa) || gpa < 0 || gpa > 4) {
      alert('Please enter a valid GPA between 0 and 4.0');
      return;
    }

    if (!formData[1132]) {
      alert('Please select how much you want to stretch yourself academically.');
      return;
    }

    if (!formData[1133]) {
      alert('Please select your desired college major.');
      return;
    }

    if (!formData[36]) {
      alert('Please select how important it is that the school offers your desired major.');
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
            Academic Profile
          </Typography.Title>
          <Typography.Text>
            Tell us about your academic achievements
          </Typography.Text>
        </Flex>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {/* Question 1: High School Graduation Year */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What year will you graduate high school? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Input
              value={formData[1015]}
              onChange={(e) => handleChange(1015, e.target.value)}
              placeholder="Enter graduation year (e.g., 2025)"
            />
          </Flex>

          {/* Question 2: Unweighted GPA */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your unweighted GPA (4.0 scale)? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              Enter a number between 0 and 4.0 (e.g., 3.75)
            </Typography.Text>
            <Input
              type="number"
              min="0"
              max="4"
              step="0.01"
              value={formData[35]}
              onChange={(e) => handleChange(35, e.target.value)}
              placeholder="Enter your GPA"
            />
          </Flex>

          {/* Question 3: Academic Stretch Preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              How much do you want to stretch yourself academically? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1132]}
              onChange={(value) => handleChange(1132, value)}
              placeholder="Select your preference"
              options={[
                { value: "I want to go to the best school I can get into", label: "I want to go to the best school I can get into" },
                { value: "I want to stretch myself a little", label: "I want to stretch myself a little" },
                { value: "I want to go to a school that is at my academic ability level", label: "I want to go to a school that is at my academic ability level" },
                { value: "I want to go to a school that will be easy for me", label: "I want to go to a school that will be easy for me" },
              ]}
            />
          </Flex>

          {/* Question 4: SAT Score */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your best SAT score?
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              If you have not taken the SAT but have taken the PSAT, you can use your PSAT but add a 0 to your PSAT [116 becomes 1160], leave blank if you have not taken either
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1024]}
              onChange={(value) => handleChange(1024, value)}
              placeholder="Select your SAT score"
              showSearch
              allowClear
              options={Array.from({ length: 121 }, (_, i) => {
                const score = 400 + (i * 10);
                return { value: score.toString(), label: score.toString() };
              })}
            />
          </Flex>

          {/* Question 5: ACT Score */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your best ACT score?
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              If you have not taken the ACT but have taken the PreACT you can use that score, leave blank if you have not taken either
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1025]}
              onChange={(value) => handleChange(1025, value)}
              placeholder="Select your ACT score"
              showSearch
              allowClear
              options={Array.from({ length: 36 }, (_, i) => {
                const score = i + 1;
                return { value: score.toString(), label: score.toString() };
              })}
            />
          </Flex>

          {/* Question 6: Desired College Major */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your desired college major? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1133]}
              onChange={(value) => handleChange(1133, value)}
              placeholder="Select your desired major"
              options={[
                { value: "Business", label: "Business" },
                { value: "Engineering/Architecture", label: "Engineering/Architecture" },
                { value: "Other/Don't Know", label: "Other/Don't Know" },
              ]}
            />
          </Flex>

          {/* Question 7: Specific Major */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Write in any specific major you want to study in the box below
            </Typography.Title>
            <Input
              value={formData[10]}
              onChange={(e) => handleChange(10, e.target.value)}
              placeholder="Enter specific major (e.g., Computer Science, Mechanical Engineering)"
            />
          </Flex>

          {/* Question 8: Major Importance */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              How important is it that the school offers your desired major? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[36]}
              onChange={(value) => handleChange(36, value)}
              placeholder="Select importance level"
              options={[
                { value: "They must have it", label: "They must have it" },
                { value: "Very important", label: "Very important" },
                { value: "Somewhat important", label: "Somewhat important" },
                { value: "Not important", label: "Not important" },
              ]}
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
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </Flex>
    </Flex>
  );
}

