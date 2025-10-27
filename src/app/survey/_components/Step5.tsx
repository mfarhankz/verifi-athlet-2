"use client";

import { Flex, Typography, Button, Select, Input } from "antd";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { AthleteData } from "@/types/database";
import { fetchSchoolsBySingleDivision } from "@/utils/schoolUtils";
import ProgressPieChart from "./ProgressPieChart";

interface Step5Props {
  athlete: AthleteData;
  surveyData: any;
  onComplete: (data: any) => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

export default function Step5({
  athlete,
  surveyData,
  onComplete,
  onBack,
  isSubmitting = false,
}: Step5Props) {
  const [formData, setFormData] = useState({
    // data_type_id: 49 - Ideal Division
    "49": surveyData["49"] || "",
    // data_type_id: 50 - Looking for full scholarship only
    "50": surveyData["50"] || "",
    // data_type_id: 51 - Distance from home
    "51": surveyData["51"] || "",
    // data_type_id: 52 - Ideal campus size
    "52": surveyData["52"] || "",
    // data_type_id: 53 - Campus location type
    "53": surveyData["53"] || "",
    // data_type_id: 54 - Cost vs academic reputation
    "54": surveyData["54"] || "",
    // data_type_id: 55 - Winning vs location
    "55": surveyData["55"] || "",
    // data_type_id: 56 - Playing time vs winning a championship
    "56": surveyData["56"] || "",
    // data_type_id: 57 - Cost vs campus type
    "57": surveyData["57"] || "",
    // data_type_id: 58 - Playing time vs size
    "58": surveyData["58"] || "",
    // data_type_id: 59 - Winning vs academics
    "59": surveyData["59"] || "",
    // data_type_id: 60 - Winning a championship vs location
    "60": surveyData["60"] || "",
    // data_type_id: 61 - Party vs academics
    "61": surveyData["61"] || "",
    // data_type_id: 62 - Party vs winning
    "62": surveyData["62"] || "",
    // data_type_id: 77 - Type of discipline from staff preferred
    "77": surveyData["77"] || "",
    // data_type_id: 63 - Male to female
    "63": surveyData["63"] || "",
    // data_type_id: 64 - HBCU
    "64": surveyData["64"] || "",
    // data_type_id: 65 - Faith-based school
    "65": surveyData["65"] || "",
    // data_type_id: 66 - Preferred D1 school
    "66": surveyData["66"] || "",
    // data_type_id: 67 - Preferred D2 school
    "67": surveyData["67"] || "",
    // data_type_id: 68 - Preferred D3 school
    "68": surveyData["68"] || "",
    // data_type_id: 69 - Preferred NAIA school
    "69": surveyData["69"] || "",
    // data_type_id: 366 - How important is an NIL deal
    "366": surveyData["366"] || "",
    // data_type_id: 365 - How much money are you expecting your NIL deal to be worth per year
    "365": surveyData["365"] || "",
    // data_type_id: 682 - Recent team winning vs winning tradition
    "682": surveyData["682"] || "",
    // data_type_id: 681 - Produce NFL players vs facilities
    "681": surveyData["681"] || "",
    // data_type_id: 679 - Facilities vs winning a championship
    "679": surveyData["679"] || "",
    // data_type_id: 680 - Winning a championship vs highest level
    "680": surveyData["680"] || "",
    // data_type_id: 72 - Open to military schools
    "72": surveyData["72"] || "",
  });

  const [d1Schools, setD1Schools] = useState<any[]>([]);
  const [d2Schools, setD2Schools] = useState<any[]>([]);
  const [d3Schools, setD3Schools] = useState<any[]>([]);
  const [naiaSchools, setNaiaSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch schools on component mount
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        // Fetch schools by division using the new utility
        const [d1Data, d2Data, d3Data, naiaData] = await Promise.all([
          fetchSchoolsBySingleDivision('D1'),
          fetchSchoolsBySingleDivision('D2'),
          fetchSchoolsBySingleDivision('D3'),
          fetchSchoolsBySingleDivision('NAIA')
        ]);

        setD1Schools(d1Data);
        setD2Schools(d2Data);
        setD3Schools(d3Data);
        setNaiaSchools(naiaData);
      } catch (error) {
        console.error("Error fetching schools:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  const handleChange = (dataTypeId: string, value: string | string[]) => {
    // Handle multi-select fields that should be stored as comma-separated values
    if (dataTypeId === "49") {
      // Ideal Division
      const finalValue = Array.isArray(value) ? value.join(", ") : value;
      setFormData((prev) => ({ ...prev, [dataTypeId]: finalValue }));
    } else {
      setFormData((prev) => ({ ...prev, [dataTypeId]: value as string }));
    }
  };

  const handleSubmit = () => {
    onComplete(formData);
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
            Your Preferences
          </Typography.Title>
          <Typography.Text>
            Help us understand your preferences for your next school
          </Typography.Text>
        </Flex>
      </Flex>

      <div className="flex flex-col gap-5 max-w-3xl mx-auto">
        <Flex vertical className="w-full">
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Ideal Division</Typography.Title>
            <Select
              className="w-full"
              mode="multiple"
              value={
                formData["49"]
                  ? formData["49"]
                      .split(", ")
                      .filter((v: string) => v.trim() !== "")
                  : []
              }
              onChange={(value) => handleChange("49", value)}
              placeholder="Select one or more ideal divisions"
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
                      maxWidth: "140px",
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
                { value: "D1 High Major", label: "D1 High Major" },
                { value: "D1 Mid Major", label: "D1 Mid Major" },
                { value: "D1 Low Major", label: "D1 Low Major" },
                { value: "D2/NAIA", label: "D2/NAIA" },
                { value: "D3", label: "D3" },
                { value: "JUCO", label: "JUCO" },
              ]}
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Looking for full scholarship only
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["50"]}
              onChange={(value) => handleChange("50", value)}
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              placeholder="Select Yes or No..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Distance from home</Typography.Title>
            <Select
              className="w-full"
              value={formData["51"]}
              onChange={(value) => handleChange("51", value)}
              options={[
                {
                  value: "Distance is not a factor",
                  label: "Distance is not a factor",
                },
                {
                  value: "As close as possible",
                  label: "As close as possible",
                },
                {
                  value: "Within a 1 hour drive",
                  label: "Within a 1 hour drive",
                },
                {
                  value: "Within a 3 hour drive",
                  label: "Within a 3 hour drive",
                },
                {
                  value: "Within an 8 hour drive",
                  label: "Within an 8 hour drive",
                },
              ]}
              placeholder="Select distance preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Ideal campus size</Typography.Title>
            <Select
              className="w-full"
              value={formData["52"]}
              onChange={(value) => handleChange("52", value)}
              options={[
                {
                  value: "Pretty Big: 10,000-20,000",
                  label: "Pretty Big: 10,000-20,000",
                },
                { value: "Very Big: 20,000+", label: "Very Big: 20,000+" },
                {
                  value: "Large Medium: 5,000-10,000",
                  label: "Large Medium: 5,000-10,000",
                },
                {
                  value: "Small Medium: 2,000-5,000",
                  label: "Small Medium: 2,000-5,000",
                },
                { value: "Small: 1,000-2,000", label: "Small: 1,000-2,000" },
                {
                  value: "Very Small: Under 1,000",
                  label: "Very Small: Under 1,000",
                },
              ]}
              placeholder="Select campus size preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Campus location type</Typography.Title>
            <Select
              className="w-full"
              value={formData["53"]}
              onChange={(value) => handleChange("53", value)}
              options={[
                { value: "Midsize City", label: "Midsize City" },
                { value: "Large City", label: "Large City" },
                { value: "Small City", label: "Small City" },
                {
                  value: "Large Suburb (just outside a large city)",
                  label: "Large Suburb (just outside a large city)",
                },
                {
                  value: "Midsize Suburb (just outside a midsize city)",
                  label: "Midsize Suburb (just outside a midsize city)",
                },
                {
                  value: "Small Suburb (just outside a small city)",
                  label: "Small Suburb (just outside a small city)",
                },
                {
                  value:
                    "Fringe Town (small town within a short drive to a city)",
                  label:
                    "Fringe Town (small town within a short drive to a city)",
                },
                {
                  value:
                    "Distant Town (small town about an hours drive to a city)",
                  label:
                    "Distant Town (small town about an hours drive to a city)",
                },
                {
                  value: "Remote Town (small town far from a city)",
                  label: "Remote Town (small town far from a city)",
                },
                {
                  value:
                    "Fringe Rural (rural area within a short drive to a city)",
                  label:
                    "Fringe Rural (rural area within a short drive to a city)",
                },
                {
                  value:
                    "Distant Rural (rural area about an hours drive to a city)",
                  label:
                    "Distant Rural (rural area about an hours drive to a city)",
                },
                {
                  value: "Remote Rural (rural area far from a city)",
                  label: "Remote Rural (rural area far from a city)",
                },
              ]}
              placeholder="Select campus location type..."
            />
          </Flex>

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                How important is an NIL deal in your college decision?
              </Typography.Title>
              <Select
                className="w-full"
                value={formData["366"]}
                onChange={(value) => handleChange("366", value)}
                options={[
                  { value: "Very Important", label: "Very Important" },
                  { value: "Somewhat Important", label: "Somewhat Important" },
                  { value: "Not Important", label: "Not Important" }
                ]}
                placeholder="Select importance level..."
              />
            </Flex>
          )}

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                How much money are you expecting your NIL deal to be worth per year?
              </Typography.Title>
              <Input
                value={formData["365"]}
                onChange={(e) => handleChange("365", e.target.value)}
                placeholder="Enter expected NIL deal amount..."
              />
            </Flex>
          )}

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                Recent team winning vs winning tradition
              </Typography.Title>
              <Select
                className="w-full"
                value={formData["682"]}
                onChange={(value) => handleChange("682", value)}
                options={[
                  {
                    value: "Recent winning is way more important than winning tradition",
                    label: "Recent winning is way more important than winning tradition"
                  },
                  {
                    value: "Recent winning is more important than winning tradition",
                    label: "Recent winning is more important than winning tradition"
                  },
                  {
                    value: "Recent winning is a little more important than winning tradition",
                    label: "Recent winning is a little more important than winning tradition"
                  },
                  {
                    value: "Recent winning and winning tradition are equally important",
                    label: "Recent winning and winning tradition are equally important"
                  },
                  {
                    value: "Winning tradition is a little more important than recent winning",
                    label: "Winning tradition is a little more important than recent winning"
                  },
                  {
                    value: "Winning tradition is more important than recent winning",
                    label: "Winning tradition is more important than recent winning"
                  },
                  {
                    value: "Winning tradition is way more important than recent winning",
                    label: "Winning tradition is way more important than recent winning"
                  }
                ]}
                placeholder="Select preference..."
              />
            </Flex>
          )}

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Cost vs academic reputation
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["54"]}
              onChange={(value) => handleChange("54", value)}
              options={[
                {
                  value: "Academic reputation is more important than cost",
                  label: "Academic reputation is more important than cost",
                },
                {
                  value: "Cost and academic reputation are equally important",
                  label: "Cost and academic reputation are equally important",
                },
                {
                  value: "Cost is way more important than academic reputation",
                  label: "Cost is way more important than academic reputation",
                },
                {
                  value: "Cost is more important than academic reputation",
                  label: "Cost is more important than academic reputation",
                },
                {
                  value:
                    "Cost is a little more important than academic reputation",
                  label:
                    "Cost is a little more important than academic reputation",
                },
                {
                  value:
                    "Academic reputation is a little more important than cost",
                  label:
                    "Academic reputation is a little more important than cost",
                },
                {
                  value: "Academic reputation is way more important than cost",
                  label: "Academic reputation is way more important than cost",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Winning vs location</Typography.Title>
            <Select
              className="w-full"
              value={formData["55"]}
              onChange={(value) => handleChange("55", value)}
              options={[
                {
                  value: "Winning tradition and location are equally important",
                  label: "Winning tradition and location are equally important",
                },
                {
                  value:
                    "Winning tradition is way more important than location",
                  label:
                    "Winning tradition is way more important than location",
                },
                {
                  value: "Winning tradition is more important than location",
                  label: "Winning tradition is more important than location",
                },
                {
                  value:
                    "Winning tradition is a little more important than location",
                  label:
                    "Winning tradition is a little more important than location",
                },
                {
                  value:
                    "Location is a little more important than winning tradition",
                  label:
                    "Location is a little more important than winning tradition",
                },
                {
                  value: "Location is more important than winning tradition",
                  label: "Location is more important than winning tradition",
                },
                {
                  value:
                    "Location is way more important than winning tradition",
                  label:
                    "Location is way more important than winning tradition",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Playing time vs winning a championship
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["56"]}
              onChange={(value) => handleChange("56", value)}
              options={[
                {
                  value:
                    "Personal impact is a little more important than team competing for the national championship",
                  label:
                    "Personal impact is a little more important than team competing for the national championship",
                },
                {
                  value:
                    "Personal impact and the team competing for the national championship are equally important",
                  label:
                    "Personal impact and the team competing for the national championship are equally important",
                },
                {
                  value:
                    "Personal impact is way more important than team competing for the national championship",
                  label:
                    "Personal impact is way more important than team competing for the national championship",
                },
                {
                  value:
                    "Personal impact is more important than team competing for the national championship",
                  label:
                    "Personal impact is more important than team competing for the national championship",
                },
                {
                  value:
                    "Team competing for the national championship is a little more important than impact",
                  label:
                    "Team competing for the national championship is a little more important than impact",
                },
                {
                  value:
                    "Team competing for the national championship is more important than impact",
                  label:
                    "Team competing for the national championship is more important than impact",
                },
                {
                  value:
                    "Team competing for the national championship is way more important than impact",
                  label:
                    "Team competing for the national championship is way more important than impact",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Cost vs campus type</Typography.Title>
            <Select
              className="w-full"
              value={formData["57"]}
              onChange={(value) => handleChange("57", value)}
              options={[
                {
                  value: "Cost and campus type are equally important",
                  label: "Cost and campus type are equally important",
                },
                {
                  value: "Campus type is a little more important than cost",
                  label: "Campus type is a little more important than cost",
                },
                {
                  value: "Cost is way more important than campus type",
                  label: "Cost is way more important than campus type",
                },
                {
                  value: "Cost is more important than campus type",
                  label: "Cost is more important than campus type",
                },
                {
                  value: "Cost is a little more important than campus type",
                  label: "Cost is a little more important than campus type",
                },
                {
                  value: "Campus type is more important than cost",
                  label: "Campus type is more important than cost",
                },
                {
                  value: "Campus type is way more important than cost",
                  label: "Campus type is way more important than cost",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Playing time vs size</Typography.Title>
            <Select
              className="w-full"
              value={formData["58"]}
              onChange={(value) => handleChange("58", value)}
              options={[
                {
                  value:
                    "Personal impact on team is way more important than school size",
                  label:
                    "Personal impact on team is way more important than school size",
                },
                {
                  value:
                    "Personal impact on team is more important than school size",
                  label:
                    "Personal impact on team is more important than school size",
                },
                {
                  value:
                    "Personal impact on team is a little more important than school size",
                  label:
                    "Personal impact on team is a little more important than school size",
                },
                {
                  value:
                    "Personal impact on team and school size are equally important",
                  label:
                    "Personal impact on team and school size are equally important",
                },
                {
                  value:
                    "School size is a little more important than personal impact on team",
                  label:
                    "School size is a little more important than personal impact on team",
                },
                {
                  value:
                    "School size is more important than personal impact on team",
                  label:
                    "School size is more important than personal impact on team",
                },
                {
                  value:
                    "School size is way more important than personal impact on team",
                  label:
                    "School size is way more important than personal impact on team",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                Produce NFL players vs facilities
              </Typography.Title>
              <Select
                className="w-full"
                value={formData["681"]}
                onChange={(value) => handleChange("681", value)}
                options={[
                  {
                    value: "Producing NFL talent is way more important than facilities",
                    label: "Producing NFL talent is way more important than facilities"
                  },
                  {
                    value: "Producing NFL talent is more important than facilities",
                    label: "Producing NFL talent is more important than facilities"
                  },
                  {
                    value: "Producing NFL talent is a little more important than facilities",
                    label: "Producing NFL talent is a little more important than facilities"
                  },
                  {
                    value: "Producing NFL talent and facilities are equally important",
                    label: "Producing NFL talent and facilities are equally important"
                  },
                  {
                    value: "Facilities are a little more important than producing NFL talent",
                    label: "Facilities are a little more important than producing NFL talent"
                  },
                  {
                    value: "Facilities are more important than producing NFL talent",
                    label: "Facilities are more important than producing NFL talent"
                  },
                  {
                    value: "Facilities are way more important than producing NFL talent",
                    label: "Facilities are way more important than producing NFL talent"
                  }
                ]}
                placeholder="Select preference..."
              />
            </Flex>
          )}

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Winning vs academics</Typography.Title>
            <Select
              className="w-full"
              value={formData["59"]}
              onChange={(value) => handleChange("59", value)}
              options={[
                {
                  value:
                    "Winning tradition and academic reputation are equally important",
                  label:
                    "Winning tradition and academic reputation are equally important",
                },
                {
                  value:
                    "Winning tradition is way more important than academic reputation",
                  label:
                    "Winning tradition is way more important than academic reputation",
                },
                {
                  value:
                    "Winning tradition is more important than academic reputation",
                  label:
                    "Winning tradition is more important than academic reputation",
                },
                {
                  value:
                    "Winning tradition is a little more important than academic reputation",
                  label:
                    "Winning tradition is a little more important than academic reputation",
                },
                {
                  value:
                    "Academic reputation is a little more important than winning tradition",
                  label:
                    "Academic reputation is a little more important than winning tradition",
                },
                {
                  value:
                    "Academic reputation is more important than winning tradition",
                  label:
                    "Academic reputation is more important than winning tradition",
                },
                {
                  value:
                    "Academic reputation is way more important than winning tradition",
                  label:
                    "Academic reputation is way more important than winning tradition",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                Facilities vs winning a championship
              </Typography.Title>
              <Select
                className="w-full"
                value={formData["679"]}
                onChange={(value) => handleChange("679", value)}
                options={[
                  {
                    value: "Facilities are way more important than team competing for the national championship",
                    label: "Facilities are way more important than team competing for the national championship"
                  },
                  {
                    value: "Facilities are more important than team competing for the national championship",
                    label: "Facilities are more important than team competing for the national championship"
                  },
                  {
                    value: "Facilities are a little more important than team competing for the national championship",
                    label: "Facilities are a little more important than team competing for the national championship"
                  },
                  {
                    value: "Facilities and the team competing for the national championship are equally important",
                    label: "Facilities and the team competing for the national championship are equally important"
                  },
                  {
                    value: "Team competing for the national championship is a little more important than facilities",
                    label: "Team competing for the national championship is a little more important than facilities"
                  },
                  {
                    value: "Team competing for the national championship is more important than facilities",
                    label: "Team competing for the national championship is more important than facilities"
                  },
                  {
                    value: "Team competing for the national championship is way more important than facilities",
                    label: "Team competing for the national championship is way more important than facilities"
                  }
                ]}
                placeholder="Select preference..."
              />
            </Flex>
          )}
        </Flex>
        <Flex vertical className="lg:w-[424px]">
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Winning a championship vs location
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["60"]}
              onChange={(value) => handleChange("60", value)}
              options={[
                {
                  value:
                    "Team's chance to compete for a national championship is way more important than location",
                  label:
                    "Team's chance to compete for a national championship is way more important than location",
                },
                {
                  value:
                    "Team's chance to compete for a national championship is more important than location",
                  label:
                    "Team's chance to compete for a national championship is more important than location",
                },
                {
                  value:
                    "Team's chance to compete for a national championship is a little more important than location",
                  label:
                    "Team's chance to compete for a national championship is a little more important than location",
                },
                {
                  value:
                    "Team's chance to compete for a national championship and location are equally important",
                  label:
                    "Team's chance to compete for a national championship and location are equally important",
                },
                {
                  value:
                    "Location is a little more important than team's chance to compete for a national championship",
                  label:
                    "Location is a little more important than team's chance to compete for a national championship",
                },
                {
                  value:
                    "Location is more important than team's chance to compete for a national championship",
                  label:
                    "Location is more important than team's chance to compete for a national championship",
                },
                {
                  value:
                    "Location is way more important than team's chance to compete for a national championship",
                  label:
                    "Location is way more important than team's chance to compete for a national championship",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Party vs academics</Typography.Title>
            <Select
              className="w-full"
              value={formData["61"]}
              onChange={(value) => handleChange("61", value)}
              options={[
                {
                  value:
                    "Academic reputation is more important than party/social culture",
                  label:
                    "Academic reputation is more important than party/social culture",
                },
                {
                  value:
                    "Party/social culture is way more important than academic reputation",
                  label:
                    "Party/social culture is way more important than academic reputation",
                },
                {
                  value:
                    "Party/social culture is more important than academic reputation",
                  label:
                    "Party/social culture is more important than academic reputation",
                },
                {
                  value:
                    "Party/social culture is a little more important than academic reputation",
                  label:
                    "Party/social culture is a little more important than academic reputation",
                },
                {
                  value:
                    "Party/social culture and academic reputation are equally important",
                  label:
                    "Party/social culture and academic reputation are equally important",
                },
                {
                  value:
                    "Academic reputation is a little more important than party/social culture",
                  label:
                    "Academic reputation is a little more important than party/social culture",
                },
                {
                  value:
                    "Academic reputation is way more important than party/social culture",
                  label:
                    "Academic reputation is way more important than party/social culture",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Party vs winning</Typography.Title>
            <Select
              className="w-full"
              value={formData["62"]}
              onChange={(value) => handleChange("62", value)}
              options={[
                {
                  value:
                    "Winning tradition is more important than party/social culture",
                  label:
                    "Winning tradition is more important than party/social culture",
                },
                {
                  value:
                    "Winning tradition is way more important than party/social culture",
                  label:
                    "Winning tradition is way more important than party/social culture",
                },
                {
                  value:
                    "Party/social culture is way more important than winning tradition",
                  label:
                    "Party/social culture is way more important than winning tradition",
                },
                {
                  value:
                    "Party/social culture is more important than winning tradition",
                  label:
                    "Party/social culture is more important than winning tradition",
                },
                {
                  value:
                    "Party/social culture is a little more important than winning tradition",
                  label:
                    "Party/social culture is a little more important than winning tradition",
                },
                {
                  value:
                    "Party/social culture and winning tradition are equally important",
                  label:
                    "Party/social culture and winning tradition are equally important",
                },
                {
                  value:
                    "Winning tradition is a little more important than party/social culture",
                  label:
                    "Winning tradition is a little more important than party/social culture",
                },
              ]}
              placeholder="Select preference..."
            />
          </Flex>

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                Winning a championship vs highest level
              </Typography.Title>
              <Select
                className="w-full"
                value={formData["680"]}
                onChange={(value) => handleChange("680", value)}
                options={[
                  {
                    value: "Team's chance to compete for a national championship is way more important than playing at the highest level",
                    label: "Team's chance to compete for a national championship is way more important than playing at the highest level"
                  },
                  {
                    value: "Team's chance to compete for a national championship is more important than playing at the highest level",
                    label: "Team's chance to compete for a national championship is more important than playing at the highest level"
                  },
                  {
                    value: "Team's chance to compete for a national championship is a little more important than playing at the highest level",
                    label: "Team's chance to compete for a national championship is a little more important than playing at the highest level"
                  },
                  {
                    value: "Team's chance to compete for a national championship and playing at the highest level are equally important",
                    label: "Team's chance to compete for a national championship and playing at the highest level are equally important"
                  },
                  {
                    value: "Playing at the highest level is a little more important than team's chance to compete for a national championship",
                    label: "Playing at the highest level is a little more important than team's chance to compete for a national championship"
                  },
                  {
                    value: "Playing at the highest level is more important than team's chance to compete for a national championship",
                    label: "Playing at the highest level is more important than team's chance to compete for a national championship"
                  },
                  {
                    value: "Playing at the highest level is way more important than team's chance to compete for a national championship",
                    label: "Playing at the highest level is way more important than team's chance to compete for a national championship"
                  }
                ]}
                placeholder="Select preference..."
              />
            </Flex>
          )}

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Type of discipline from staff preferred
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["77"]}
              onChange={(value) => handleChange("77", value)}
              options={[
                { value: "Strict", label: "Strict" },
                { value: "Very Strict", label: "Very Strict" },
                { value: "Average", label: "Average" },
                { value: "Lenient", label: "Lenient" },
                { value: "Very Lenient", label: "Very Lenient" },
              ]}
              placeholder="Select discipline preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Male to female</Typography.Title>
            <Select
              className="w-full"
              value={formData["63"]}
              onChange={(value) => handleChange("63", value)}
              options={[
                { value: "It doesn't matter", label: "It doesn't matter" },
                {
                  value: "A little higher ratio of females than males",
                  label: "A little higher ratio of females than males",
                },
                { value: "More than 60% male", label: "More than 60% male" },
                {
                  value: "A little more males than females",
                  label: "A little more males than females",
                },
                {
                  value: "The same ratio of males to females",
                  label: "The same ratio of males to females",
                },
                {
                  value: "More than 60% female",
                  label: "More than 60% female",
                },
              ]}
              placeholder="Select gender ratio preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              HBCU (Historically Black Colleges and Universities)
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["64"]}
              onChange={(value) => handleChange("64", value)}
              options={[
                {
                  value: "I have no preference to attend or not attend an HBCU",
                  label: "I have no preference to attend or not attend an HBCU",
                },
                {
                  value: "I strongly prefer attending an HBCU",
                  label: "I strongly prefer attending an HBCU",
                },
                {
                  value: "I prefer attending an HBCU",
                  label: "I prefer attending an HBCU",
                },
                {
                  value: "I prefer not to attend an HBCU",
                  label: "I prefer not to attend an HBCU",
                },
                {
                  value: "I strongly prefer not to attend an HBCU",
                  label: "I strongly prefer not to attend an HBCU",
                },
              ]}
              placeholder="Select HBCU preference..."
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>Faith-based school</Typography.Title>
            <Select
              className="w-full"
              value={formData["65"]}
              onChange={(value) => handleChange("65", value)}
              options={[
                {
                  value:
                    "I have no preference to attend or not attend a faith-based school",
                  label:
                    "I have no preference to attend or not attend a faith-based school",
                },
                {
                  value: "I strongly prefer attending a faith-based school",
                  label: "I strongly prefer attending a faith-based school",
                },
                {
                  value: "I prefer attending a faith-based school",
                  label: "I prefer attending a faith-based school",
                },
                {
                  value: "I prefer not to attend a faith-based school",
                  label: "I prefer not to attend a faith-based school",
                },
                {
                  value: "I strongly prefer not to attend a faith-based school",
                  label: "I strongly prefer not to attend a faith-based school",
                },
              ]}
              placeholder="Select faith-based school preference..."
            />
          </Flex>

          {/* Questions only visible for sport_id 21 */}
          {athlete?.sport_id === 21 && (
            <Flex vertical className="mb-5 survey-textarea">
              <Typography.Title level={4}>
                Open to military schools
              </Typography.Title>
              <Select
                className="w-full"
                value={formData["72"]}
                onChange={(value) => handleChange("72", value)}
                options={[
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" }
                ]}
                placeholder="Select Yes or No..."
              />
            </Flex>
          )}

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you have a preferred D1 school? If so list here:
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["66"]}
              onChange={(value) => handleChange("66", value)}
              showSearch
              placeholder="Search for a D1 school..."
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={d1Schools.map((school) => ({
                value: school.name,
                label: school.name,
              }))}
              loading={loading}
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you have a preferred D2 school? If so list here:
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["67"]}
              onChange={(value) => handleChange("67", value)}
              showSearch
              placeholder="Search for a D2 school..."
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={d2Schools.map((school) => ({
                value: school.name,
                label: school.name,
              }))}
              loading={loading}
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you have a preferred D3 school? If so list here:
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["68"]}
              onChange={(value) => handleChange("68", value)}
              showSearch
              placeholder="Search for a D3 school..."
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={d3Schools.map((school) => ({
                value: school.name,
                label: school.name,
              }))}
              loading={loading}
            />
          </Flex>

          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you have a preferred NAIA school? If so list here:
            </Typography.Title>
            <Select
              className="w-full"
              value={formData["69"]}
              onChange={(value) => handleChange("69", value)}
              showSearch
              placeholder="Search for a NAIA school..."
              filterOption={(input, option) =>
                (option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={naiaSchools.map((school) => ({
                value: school.name,
                label: school.name,
              }))}
              loading={loading}
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
          className="next-servey"
          type="primary"
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Survey"}
        </Button>
      </Flex>
    </Flex>
  );
}
