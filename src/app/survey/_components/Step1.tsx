"use client";

import { Button, Flex, Input, Radio, Select, Typography, Checkbox } from "antd";
import TextArea from "antd/es/input/TextArea";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { AthleteData } from "@/types/database";
import { supabase } from "@/lib/supabaseClient";
import { fetchPositionsBySportId } from "@/lib/queries";
import { fetchSchoolsByMultipleDivisions } from "@/utils/schoolUtils";
import ProgressPieChart from "./ProgressPieChart";

interface Step1Props {
  athlete: AthleteData;
  surveyData: any;
  onComplete: (data: any) => void;
}

export default function Step1({ athlete, surveyData, onComplete }: Step1Props) {
  const [formData, setFormData] = useState({
    // Basic Information
    1: surveyData[1] || "", // What year in school are you?
    2: surveyData[2] || "", // Primary Position
    3: surveyData[3] || "", // Secondary Position
    26: surveyData[26] || "", // Preferred contact method
    571: surveyData[571] || "", // Email
    27: surveyData[27] || "", // Cell
    364: surveyData[364] || "", // International Phone Number
    14: surveyData[14] || "", // Instagram
    37: surveyData[37] || "", // Link to highlight tape (or best game)
    31: surveyData[31] || "", // In a few words tell us why you are transferring
    13: surveyData[13] || "", // Twitter
    688: surveyData[688] || "", // Agent Contact Information
    committed_school: surveyData.committed_school || "", // Committed to Transfer to (special handling)
    // data_type_id: 70 - Consent checkbox
    "70": surveyData["70"] || "TRUE",
  });

  const [positions, setPositions] = useState<{ name: string; order: number }[]>(
    []
  );
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update formData when surveyData changes
  useEffect(() => {
    setFormData((prevData) => {
      const newData = {
        // Basic Information
        1: surveyData[1] || "", // What year in school are you?
        2: surveyData[2] || "", // Primary Position
        3: surveyData[3] || "", // Secondary Position
        26: surveyData[26] || "", // Preferred contact method
        571: surveyData[571] || "", // Email
        27: surveyData[27] || "", // Cell
        364: surveyData[364] || "", // International Phone Number
        14: surveyData[14] || "", // Instagram
        37: surveyData[37] || "", // Link to highlight tape (or best game)
        31: surveyData[31] || "", // In a few words tell us why you are transferring
        13: surveyData[13] || "", // Twitter
        688: surveyData[688] || "", // Agent Contact Information
        committed_school: surveyData.committed_school || "", // Committed to Transfer to (special handling)
        // data_type_id: 70 - Consent checkbox
        "70": surveyData["70"] || "TRUE",
      };

      return newData;
    });
  }, [surveyData]);

  // Fetch positions and schools on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch positions for the athlete's sport
        if (athlete.sport_id) {
          try {
            const positionData = await fetchPositionsBySportId(
              athlete.sport_id.toString()
            );
            setPositions(positionData || []);
          } catch (error) {
            console.error("Error fetching positions:", error);
          }
        } else {
          console.warn("No sport_id found for athlete:", athlete);
        }

        // Fetch schools filtered by division (D1, D2, D3, NAIA)
        try {
          const schoolData = await fetchSchoolsByMultipleDivisions(['D1', 'D2', 'D3', 'NAIA']);
          setSchools(schoolData || []);
        } catch (error) {
          console.error("Error fetching schools by division:", error);
          setSchools([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [athlete.sport_id]);

  const handleChange = (field: string, value: string | string[]) => {
    // Handle multi-select fields that should be stored as comma-separated values
    if (field === "26" || field === "29") {
      // Preferred contact method and Who will be helping
      const finalValue = Array.isArray(value) ? value.join(", ") : value;
      setFormData((prev) => ({ ...prev, [field]: finalValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value as string }));
    }
  };

  const handleConsentChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, "70": checked ? "TRUE" : "FALSE" }));
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
      // Store committed school data in formData for later processing
      // We'll handle the offer table insertion in the final submission
      onComplete(formData);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert("Error proceeding to next step. Please try again.");
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
              1 out of 5
            </Typography.Title>
            <Typography.Text>Completed 20%</Typography.Text>
          </Flex>
          <ProgressPieChart currentStep={1} totalSteps={5} size={32} />
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
          The Most Important Information
          </Typography.Title>
          <Typography.Text>
          Here&apos;s what coaches most want to know about you
          </Typography.Text>
        </Flex>
      </Flex>

      {/* Consent Checkbox */}
      <Flex
        vertical
        className="survey-textarea"
        style={{ marginBottom: "10px" }}
      >
        <Checkbox
          checked={formData["70"] === "TRUE"}
          onChange={(e) => handleConsentChange(e.target.checked)}
        >
          By filling out this survey you consent to share your profile with all
          universities and colleges
        </Checkbox>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        {loading ? (
          <div className="text-center py-8">
            <p>Loading form data...</p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 max-w-3xl mx-auto">
            <Flex vertical className="w-full">
              {/* What year in school are you? */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>
                  What year in school are you?
                </Typography.Title>
                <Select
                  className="w-full"
                  value={formData[1]}
                  onChange={(value) => handleChange("1", value)}
                  options={[
                    { value: "FR", label: "FR" },
                    { value: "RFR", label: "RFR" },
                    { value: "SO", label: "SO" },
                    { value: "RSO", label: "RSO" },
                    { value: "JR", label: "JR" },
                    { value: "RJR", label: "RJR" },
                    { value: "SR", label: "SR" },
                    { value: "RSR", label: "RSR" },
                    { value: "SR+", label: "SR+" },
                  ]}
                />
              </Flex>



              {/* Primary Position */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>Primary Position</Typography.Title>
                <Select
                  className="w-full"
                  value={formData[2]}
                  onChange={(value) => handleChange("2", value)}
                  options={positions.map((pos) => ({
                    value: pos.name,
                    label: pos.name,
                  }))}
                  placeholder={
                    positions.length === 0
                      ? "Loading positions..."
                      : "Select position"
                  }
                />
                {positions.length === 0 && (
                  <Typography.Text type="secondary" className="text-sm">
                    No positions found for sport_id: {athlete.sport_id}
                  </Typography.Text>
                )}
              </Flex>

              {/* Secondary Position */}
              {/* <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>
                  Secondary Position (if applicable)
                </Typography.Title>
                <Select
                  className="w-full"
                  value={formData[3]}
                  onChange={(value) => handleChange("3", value)}
                  options={positions.map((pos) => ({
                    value: pos.name,
                    label: pos.name,
                  }))}
                  placeholder={
                    positions.length === 0
                      ? "Loading positions..."
                      : "Select position"
                  }
                />
              </Flex> */}


              {/* Preferred contact method */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>
                  Preferred contact method?
                </Typography.Title>
                <Select
                  className="w-full"
                  mode="multiple"
                  value={
                    formData[26]
                      ? formData[26]
                          .split(", ")
                          .filter((v: string) => v.trim() !== "")
                      : []
                  }
                  onChange={(value) => handleChange("26", value)}
                  placeholder="Select one or more contact methods"
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
                          maxWidth: "90px",
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
                    { value: "Text", label: "Text" },
                    { value: "Call", label: "Call" },
                    { value: "Email", label: "Email" },
                    { value: "Twitter", label: "Twitter" },
                    { value: "Instagram", label: "Instagram" },
                  ]}
                />
              </Flex>

              {/* Email */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>Email</Typography.Title>
                <Input
                  value={formData[571]}
                  onChange={(e) => handleChange("571", e.target.value)}
                />
              </Flex>
              {/* Cell */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>Cell</Typography.Title>
                <Input
                  value={formData[27]}
                  onChange={(e) => handleChange("27", e.target.value)}
                />
              </Flex>

              {(athlete.sport_id === 3 || athlete.sport_id === 4) && (
                <Flex vertical className="mb-5 survey-textarea">
                  <Typography.Title level={4}>
                    International Phone Number
                  </Typography.Title>
                  <Input
                    value={formData[364]}
                    onChange={(e) => handleChange("364", e.target.value)}
                  />
                </Flex>
              )}

              {/* Twitter */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>X / Twitter</Typography.Title>
                <Input
                  value={formData[13]}
                  onChange={(e) => handleChange("13", e.target.value)}
                />
              </Flex>

               {/* Instagram */}
               <Flex vertical className="mb-5 survey-textarea">
                 <Typography.Title level={4}>Instagram</Typography.Title>
                 <Input
                   value={formData[14]}
                   onChange={(e) => handleChange("14", e.target.value)}
                 />
               </Flex>

               {/* Link to highlight tape (or best game) */}
               <Flex vertical className="mb-5 survey-textarea">
                 <Typography.Title level={4}>Link to game film or highlight tape</Typography.Title>
                 <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
                   The #1 thing a coach wants, next to cell phone, is film on you
                 </Typography.Text>
                 <Input
                   value={formData[37]}
                   onChange={(e) => handleChange("37", e.target.value)}
                   placeholder="Enter link to your highlight tape or best game..."
                 />
               </Flex>

               {/* In a few words tell us why you are transferring */}
               <Flex vertical className="mb-5 survey-textarea">
                 <Typography.Title level={4}>In a few words tell us why you are transferring</Typography.Title>
                 <TextArea 
                   rows={3} 
                   value={formData[31]}
                   onChange={(e) => handleChange("31", e.target.value)}
                   placeholder="Please explain your reason for transferring..."
                 />
               </Flex>
            </Flex>

            <Flex vertical className="w-full">
              

             

   




              {/* Agent Contact Information - Only visible for sport_id 21 */}
              {athlete.sport_id === 21 && (
                <Flex vertical className="mb-5 survey-textarea">
                  <Typography.Title level={4}>
                    Agent Contact Information
                  </Typography.Title>
                  <Input
                    value={formData[688]}
                    onChange={(e) => handleChange("688", e.target.value)}
                  />
                </Flex>
              )}



              {/* Committed to Transfer to */}
              <Flex vertical className="mb-5 survey-textarea">
                <Typography.Title level={4}>
                  Committed to Transfer to ... 
                </Typography.Title>
                <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
                 If you have committed to transfer already, enter the school here.
                 </Typography.Text>
                {loading ? (
                  <div>Loading schools...</div>
                ) : (
                  <Select
                    className="w-full"
                    value={formData.committed_school}
                    onChange={(value) =>
                      handleChange("committed_school", value)
                    }
                    showSearch
                    placeholder="Search for a school..."
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={schools.map((school) => ({
                      value: school.id.toString(),
                      label: school.name,
                    }))}
                  />
                )}
              </Flex>
            </Flex>
          </div>
        )}
      </Flex>
      <Button
        onClick={handleSubmit}
        className="next-servey save-continue-green"
        loading={isSubmitting}
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save and Continue"}
      </Button>
    </Flex>
  );
}
