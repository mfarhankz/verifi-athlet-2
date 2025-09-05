"use client";

import { Flex, Typography, Button, Select } from "antd";
import Image from "next/image";
import { useState } from "react";
import type { AthleteData } from "@/types/database";
import ProgressPieChart from "./ProgressPieChart";

interface Step4Props {
  athlete: AthleteData;
  surveyData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
}

export default function Step4({
  athlete,
  surveyData,
  onComplete,
  onBack,
}: Step4Props) {
  const [formData, setFormData] = useState({
    // data_type_id: 40 - Playing time
    "40": surveyData["40"] || "",
    // data_type_id: 41 - Want a higher level
    "41": surveyData["41"] || "",
    // data_type_id: 42 - Coaches
    "42": surveyData["42"] || "",
    // data_type_id: 46 - Better academics
    "46": surveyData["46"] || "",
    // data_type_id: 43 - Ineligible – academics
    "43": surveyData["43"] || "",
    // data_type_id: 44 - Ineligible – discipline
    "44": surveyData["44"] || "",
    // data_type_id: 45 - Ineligible – other
    "45": surveyData["45"] || "",
    // data_type_id: 47 - Major
    "47": surveyData["47"] || "",
    // data_type_id: 48 - Closer to home
    "48": surveyData["48"] || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (dataTypeId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [dataTypeId]: value }));
  };

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log(
        "Form submission already in progress, ignoring duplicate click"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      onComplete(formData);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert("Error proceeding to next step. Please try again.");
      setIsSubmitting(false); // Reset on error
    }
  };

  const reasonOptions = [
    { value: "Not a Reason", label: "Not a Reason" },
    { value: "Major Reason", label: "Major Reason" },
    { value: "Minor Reason", label: "Minor Reason" },
  ];

  return (
    <Flex vertical className="servey-box">
      <Flex className="survey-head justify-between items-center mb-5">
        <Typography.Title level={3} className="italic">
          Survey
        </Typography.Title>
        <Flex className="items-center">
          <Flex vertical className="items-end mr-3">
            <Typography.Title level={5} className="margin-0">
              4 out of 5
            </Typography.Title>
            <Typography.Text>Completed 80%</Typography.Text>
          </Flex>
          <ProgressPieChart currentStep={4} totalSteps={5} size={32} />
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
            Reasons for Leaving
          </Typography.Title>
          <Typography.Text>
            Please indicate how important each factor is in your decision to
            transfer
          </Typography.Text>
        </Flex>
      </Flex>

      <div className="flex flex-col lg:flex-row gap-5">
        <Flex vertical className="w-full">
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Playing time</Typography.Title>
            <Select
              className="w-full"
              value={formData["40"]}
              onChange={(value) => handleChange("40", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Want a higher level</Typography.Title>
            <Select
              className="w-full"
              value={formData["41"]}
              onChange={(value) => handleChange("41", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Coaches</Typography.Title>
            <Select
              className="w-full"
              value={formData["42"]}
              onChange={(value) => handleChange("42", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Better academics</Typography.Title>
            <Select
              className="w-full"
              value={formData["46"]}
              onChange={(value) => handleChange("46", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>
        </Flex>
        <Flex vertical className="w-full">
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Ineligible – academics
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["43"]}
              onChange={(value) => handleChange("43", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Ineligible – discipline
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["44"]}
              onChange={(value) => handleChange("44", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Ineligible – other</Typography.Title>
            <Select
              className="w-full"
              value={formData["45"]}
              onChange={(value) => handleChange("45", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Major</Typography.Title>
            <Select
              className="w-full"
              value={formData["47"]}
              onChange={(value) => handleChange("47", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Closer to home</Typography.Title>
            <Select
              className="w-full"
              value={formData["48"]}
              onChange={(value) => handleChange("48", value)}
              options={reasonOptions}
              placeholder="Select importance level..."
            />
          </Flex>
        </Flex>
      </div>

      <Flex justify="space-between">
        <Button
          onClick={onBack}
          className="back-servey"
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="next-servey save-continue-green"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save and Continue"}
        </Button>
      </Flex>
    </Flex>
  );
}
