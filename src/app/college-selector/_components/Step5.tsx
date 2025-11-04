"use client";

import { Flex, Typography, Button, Select } from "antd";
import Image from "next/image";
import { useState } from "react";
import ProgressPieChart from "../../survey/_components/ProgressPieChart";

interface Step5Data {
  [key: number]: string | undefined;
}

interface Step5Props {
  surveyData: Step5Data;
  onComplete: (data: Step5Data) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export default function Step5({ surveyData, onComplete, onBack, isSubmitting }: Step5Props) {
  const [formData, setFormData] = useState<Step5Data>({
    // Preference Information questions (using data_type_id as keys)
    682: surveyData[682] || "", // Recent winning vs. winning tradition
    54: surveyData[54] || "", // Cost vs. academic reputation
    55: surveyData[55] || "", // Winning tradition vs. location
    56: surveyData[56] || "", // Personal impact vs. national championship
    62: surveyData[62] || "", // Party/social culture vs. winning tradition
    680: surveyData[680] || "", // National championship vs. highest level
    57: surveyData[57] || "", // Cost vs. campus type
    679: surveyData[679] || "", // Facilities vs. national championship
    58: surveyData[58] || "", // Personal impact vs. school size
    61: surveyData[61] || "", // Party/social culture vs. academic reputation
    59: surveyData[59] || "", // Winning tradition vs. academic reputation
    60: surveyData[60] || "", // National championship vs. location
    681: surveyData[681] || "", // NFL talent vs. facilities
  } as Step5Data);

  const handleChange = (field: number, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    const requiredKeys = [682, 54, 55, 56, 62, 680, 57, 679, 58, 61, 59, 60, 681];
    return requiredKeys.every((k) => !!formData[k]);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    if (!isFormValid()) {
      alert('Please answer all questions before submitting.');
      return;
    }
    
    try {
      onComplete(formData);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error submitting survey. Please try again.');
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
              5 out of 5
            </Typography.Title>
            <Typography.Text>Completed 100%</Typography.Text>
          </Flex>
          <ProgressPieChart currentStep={5} totalSteps={5} size={32} />
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
            Preference Information
          </Typography.Title>
          <Typography.Text>
            Please choose the response that best describes your personal preference
          </Typography.Text>
        </Flex>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {/* Question 1: Recent winning vs. winning tradition (682) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              The football program&apos;s recent winning and competitiveness vs. the football program&apos;s winning tradition
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[682]}
              onChange={(value) => handleChange(682, value)}
              placeholder="Select your preference"
              options={[
                { value: "Recent winning is way more important than winning tradition", label: "Recent winning is way more important than winning tradition" },
                { value: "Recent winning is more important than winning tradition", label: "Recent winning is more important than winning tradition" },
                { value: "Recent winning is a little more important than winning tradition", label: "Recent winning is a little more important than winning tradition" },
                { value: "Recent winning and winning tradition are equally important", label: "Recent winning and winning tradition are equally important" },
                { value: "Winning tradition is a little more important than recent winning", label: "Winning tradition is a little more important than recent winning" },
                { value: "Winning tradition is more important than recent winning", label: "Winning tradition is more important than recent winning" },
                { value: "Winning tradition is way more important than recent winning", label: "Winning tradition is way more important than recent winning" },
              ]}
            />
          </Flex>

          {/* Question 2: Cost vs. academic reputation (54) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What the school costs vs. the school&apos;s academic reputation
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[54]}
              onChange={(value) => handleChange(54, value)}
              placeholder="Select your preference"
              options={[
                { value: "Cost is way more important than academic reputation", label: "Cost is way more important than academic reputation" },
                { value: "Cost is more important than academic reputation", label: "Cost is more important than academic reputation" },
                { value: "Cost is a little more important than academic reputation", label: "Cost is a little more important than academic reputation" },
                { value: "Cost and academic reputation are equally important", label: "Cost and academic reputation are equally important" },
                { value: "Academic reputation is a little more important than cost", label: "Academic reputation is a little more important than cost" },
                { value: "Academic reputation is more important than cost", label: "Academic reputation is more important than cost" },
                { value: "Academic reputation is way more important than cost", label: "Academic reputation is way more important than cost" },
              ]}
            />
          </Flex>

          {/* Question 3: Winning tradition vs. location (55) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              The football program&apos;s winning tradition vs. the school&apos;s location
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[55]}
              onChange={(value) => handleChange(55, value)}
              placeholder="Select your preference"
              options={[
                { value: "Winning tradition is way more important than location", label: "Winning tradition is way more important than location" },
                { value: "Winning tradition is more important than location", label: "Winning tradition is more important than location" },
                { value: "Winning tradition is a little more important than location", label: "Winning tradition is a little more important than location" },
                { value: "Winning tradition and location are equally important", label: "Winning tradition and location are equally important" },
                { value: "Location is a little more important than winning tradition", label: "Location is a little more important than winning tradition" },
                { value: "Location is more important than winning tradition", label: "Location is more important than winning tradition" },
                { value: "Location is way more important than winning tradition", label: "Location is way more important than winning tradition" },
              ]}
            />
          </Flex>

          {/* Question 4: Personal impact vs. national championship (56) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              The odds that you will play right away and be an impactful player vs. the chance to compete for a national championship <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[56]}
              onChange={(value) => handleChange(56, value)}
              placeholder="Select your preference"
              options={[
                { value: "Personal impact is way more important than team competing for the national championship", label: "Personal impact is way more important than team competing for the national championship" },
                { value: "Personal impact is more important than team competing for the national championship", label: "Personal impact is more important than team competing for the national championship" },
                { value: "Personal impact is a little more important than team competing for the national championship", label: "Personal impact is a little more important than team competing for the national championship" },
                { value: "Personal impact and the team competing for the national championship are equally important", label: "Personal impact and the team competing for the national championship are equally important" },
                { value: "Team competing for the national championship is a little more important than impact", label: "Team competing for the national championship is a little more important than impact" },
                { value: "Team competing for the national championship is more important than impact", label: "Team competing for the national championship is more important than impact" },
                { value: "Team competing for the national championship is way more important than impact", label: "Team competing for the national championship is way more important than impact" },
              ]}
            />
          </Flex>

          {/* Question 5: Party/social culture vs. winning tradition (62) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Campus fun Party/Social culture vs. football winning tradition <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[62]}
              onChange={(value) => handleChange(62, value)}
              placeholder="Select your preference"
              options={[
                { value: "Party/social culture is way more important than winning tradition", label: "Party/social culture is way more important than winning tradition" },
                { value: "Party/social culture is more important than winning tradition", label: "Party/social culture is more important than winning tradition" },
                { value: "Party/social culture is a little more important than winning tradition", label: "Party/social culture is a little more important than winning tradition" },
                { value: "Party/social culture and winning tradition are equally important", label: "Party/social culture and winning tradition are equally important" },
                { value: "Winning tradition is a little more important than party/social culture", label: "Winning tradition is a little more important than party/social culture" },
                { value: "Winning tradition is more important than party/social culture", label: "Winning tradition is more important than party/social culture" },
                { value: "Winning tradition is way more important than party/social culture", label: "Winning tradition is way more important than party/social culture" },
              ]}
            />
          </Flex>

          {/* Question 6: National championship vs. highest level (680) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Team&apos;s chance to compete for a national championship vs. playing at the highest possible level
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[680]}
              onChange={(value) => handleChange(680, value)}
              placeholder="Select your preference"
              options={[
                { value: "Team's chance to compete for a national championship is way more important than playing at the highest level", label: "Team's chance to compete for a national championship is way more important than playing at the highest level" },
                { value: "Team's chance to compete for a national championship is more important than playing at the highest level", label: "Team's chance to compete for a national championship is more important than playing at the highest level" },
                { value: "Team's chance to compete for a national championship is a little more important than playing at the highest level", label: "Team's chance to compete for a national championship is a little more important than playing at the highest level" },
                { value: "Team's chance to compete for a national championship and playing at the highest level are equally important", label: "Team's chance to compete for a national championship and playing at the highest level are equally important" },
                { value: "Playing at the highest level is a little more important than team's chance to compete for a national championship", label: "Playing at the highest level is a little more important than team's chance to compete for a national championship" },
                { value: "Playing at the highest level is more important than team's chance to compete for a national championship", label: "Playing at the highest level is more important than team's chance to compete for a national championship" },
                { value: "Playing at the highest level is way more important than team's chance to compete for a national championship", label: "Playing at the highest level is way more important than team's chance to compete for a national championship" },
              ]}
            />
          </Flex>

          {/* Question 7: Cost vs. campus type (57) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What the school costs vs. the school&apos;s campus type (city, suburb, rural, etc.)
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[57]}
              onChange={(value) => handleChange(57, value)}
              placeholder="Select your preference"
              options={[
                { value: "Cost is way more important than campus type", label: "Cost is way more important than campus type" },
                { value: "Cost is more important than campus type", label: "Cost is more important than campus type" },
                { value: "Cost is a little more important than campus type", label: "Cost is a little more important than campus type" },
                { value: "Cost and campus type are equally important", label: "Cost and campus type are equally important" },
                { value: "Campus type is a little more important than cost", label: "Campus type is a little more important than cost" },
                { value: "Campus type is more important than cost", label: "Campus type is more important than cost" },
                { value: "Campus type is way more important than cost", label: "Campus type is way more important than cost" },
              ]}
            />
          </Flex>

          {/* Question 8: Facilities vs. national championship (679) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Quality of the team&apos;s facilities vs. competing for a national championship
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[679]}
              onChange={(value) => handleChange(679, value)}
              placeholder="Select your preference"
              options={[
                { value: "Facilities are way more important than team competing for the national championship", label: "Facilities are way more important than team competing for the national championship" },
                { value: "Facilities are more important than team competing for the national championship", label: "Facilities are more important than team competing for the national championship" },
                { value: "Facilities are a little more important than team competing for the national championship", label: "Facilities are a little more important than team competing for the national championship" },
                { value: "Facilities and the team competing for the national championship are equally important", label: "Facilities and the team competing for the national championship are equally important" },
                { value: "Team competing for the national championship is a little more important than facilities", label: "Team competing for the national championship is a little more important than facilities" },
                { value: "Team competing for the national championship is more important than facilities", label: "Team competing for the national championship is more important than facilities" },
                { value: "Team competing for the national championship is way more important than facilities", label: "Team competing for the national championship is way more important than facilities" },
              ]}
            />
          </Flex>

          {/* Question 9: Personal impact vs. school size (58) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              The odds that you will play right away and be an impactful player vs. the size of the school (lots of students / few students) <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[58]}
              onChange={(value) => handleChange(58, value)}
              placeholder="Select your preference"
              options={[
                { value: "Personal impact on team is way more important than school size", label: "Personal impact on team is way more important than school size" },
                { value: "Personal impact on team is more important than school size", label: "Personal impact on team is more important than school size" },
                { value: "Personal impact on team is a little more important than school size", label: "Personal impact on team is a little more important than school size" },
                { value: "Personal impact on team and school size are equally important", label: "Personal impact on team and school size are equally important" },
                { value: "School size is a little more important than personal impact on team", label: "School size is a little more important than personal impact on team" },
                { value: "School size is more important than personal impact on team", label: "School size is more important than personal impact on team" },
                { value: "School size is way more important than personal impact on team", label: "School size is way more important than personal impact on team" },
              ]}
            />
          </Flex>

          {/* Question 10: Party/social culture vs. academic reputation (61) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Campus fun Party/Social culture vs. academic reputation <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[61]}
              onChange={(value) => handleChange(61, value)}
              placeholder="Select your preference"
              options={[
                { value: "Party/social culture is way more important than academic reputation", label: "Party/social culture is way more important than academic reputation" },
                { value: "Party/social culture is more important than academic reputation", label: "Party/social culture is more important than academic reputation" },
                { value: "Party/social culture is a little more important than academic reputation", label: "Party/social culture is a little more important than academic reputation" },
                { value: "Party/social culture and academic reputation are equally important", label: "Party/social culture and academic reputation are equally important" },
                { value: "Academic reputation is a little more important than party/social culture", label: "Academic reputation is a little more important than party/social culture" },
                { value: "Academic reputation is more important than party/social culture", label: "Academic reputation is more important than party/social culture" },
                { value: "Academic reputation is way more important than party/social culture", label: "Academic reputation is way more important than party/social culture" },
              ]}
            />
          </Flex>

          {/* Question 11: Winning tradition vs. academic reputation (59) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              The football program&apos;s winning tradition vs. the school&apos;s academic reputation
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[59]}
              onChange={(value) => handleChange(59, value)}
              placeholder="Select your preference"
              options={[
                { value: "Winning tradition is way more important than academic reputation", label: "Winning tradition is way more important than academic reputation" },
                { value: "Winning tradition is more important than academic reputation", label: "Winning tradition is more important than academic reputation" },
                { value: "Winning tradition is a little more important than academic reputation", label: "Winning tradition is a little more important than academic reputation" },
                { value: "Winning tradition and academic reputation are equally important", label: "Winning tradition and academic reputation are equally important" },
                { value: "Academic reputation is a little more important than winning tradition", label: "Academic reputation is a little more important than winning tradition" },
                { value: "Academic reputation is more important than winning tradition", label: "Academic reputation is more important than winning tradition" },
                { value: "Academic reputation is way more important than winning tradition", label: "Academic reputation is way more important than winning tradition" },
              ]}
            />
          </Flex>

          {/* Question 12: National championship vs. location (60) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Team&apos;s chance to compete for a national championship vs. the school&apos;s location
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[60]}
              onChange={(value) => handleChange(60, value)}
              placeholder="Select your preference"
              options={[
                { value: "Team's chance to compete for a national championship is way more important than location", label: "Team's chance to compete for a national championship is way more important than location" },
                { value: "Team's chance to compete for a national championship is more important than location", label: "Team's chance to compete for a national championship is more important than location" },
                { value: "Team's chance to compete for a national championship is a little more important than location", label: "Team's chance to compete for a national championship is a little more important than location" },
                { value: "Team's chance to compete for a national championship and location are equally important", label: "Team's chance to compete for a national championship and location are equally important" },
                { value: "Location is a little more important than team's chance to compete for a national championship", label: "Location is a little more important than team's chance to compete for a national championship" },
                { value: "Location is more important than team's chance to compete for a national championship", label: "Location is more important than team's chance to compete for a national championship" },
                { value: "Location is way more important than team's chance to compete for a national championship", label: "Location is way more important than team's chance to compete for a national championship" },
              ]}
            />
          </Flex>

          {/* Question 13: NFL talent vs. facilities (681) */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Team&apos;s history producing NFL talent vs. the quality of the team&apos;s facilities
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[681]}
              onChange={(value) => handleChange(681, value)}
              placeholder="Select your preference"
              options={[
                { value: "Producing NFL talent is way more important than facilities", label: "Producing NFL talent is way more important than facilities" },
                { value: "Producing NFL talent is more important than facilities", label: "Producing NFL talent is more important than facilities" },
                { value: "Producing NFL talent is a little more important than facilities", label: "Producing NFL talent is a little more important than facilities" },
                { value: "Producing NFL talent and facilities are equally important", label: "Producing NFL talent and facilities are equally important" },
                { value: "Facilities are a little more important than producing NFL talent", label: "Facilities are a little more important than producing NFL talent" },
                { value: "Facilities are more important than producing NFL talent", label: "Facilities are more important than producing NFL talent" },
                { value: "Facilities are way more important than producing NFL talent", label: "Facilities are way more important than producing NFL talent" },
              ]}
            />
          </Flex>
        </div>
      </Flex>

      <Flex gap="small" style={{ marginTop: "20px" }}>
        <Button
          onClick={onBack}
          className="next-servey"
          disabled={isSubmitting}
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
          {isSubmitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </Flex>
    </Flex>
  );
}

