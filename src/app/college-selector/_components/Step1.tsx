"use client";

import { Button, Flex, Input, Select, Typography } from "antd";
import Image from "next/image";
import { useState } from "react";
import ProgressPieChart from "../../survey/_components/ProgressPieChart";
import { getLocationSuggestions, GeocodingResult } from "@/utils/geocoding";

interface Step1Data {
  [key: number]: string | undefined;
}

interface Step1Props {
  surveyData: Step1Data;
  onComplete: (data: Step1Data) => void;
  onBack?: () => void;
}

export default function Step1({ surveyData, onComplete, onBack }: Step1Props) {
  const [formData, setFormData] = useState({
    // Campus Information questions (using data_type_id as keys)
    1117: surveyData[1117] || "", // Campus seasons preference
    1118: surveyData[1118] || "", // City
    1119: surveyData[1119] || "", // State
    1120: surveyData[1120] || "", // Longitude
    1121: surveyData[1121] || "", // Latitude
    51: surveyData[51] || "", // Distance from ideal location
    52: surveyData[52] || "", // Campus size
    63: surveyData[63] || "", // Male to female ratio
    72: surveyData[72] || "", // Military schools
    64: surveyData[64] || "", // HBCU preference
    1131: surveyData[1131] || "", // Race or ethnicity
    1122: surveyData[1122] || "", // Hearing loss/ASL
    687: surveyData[687] || "", // Military service
    65: surveyData[65] || "", // Faith-based school
    53: surveyData[53] || "", // Campus location type
    1123: surveyData[1123] || "", // Near mountains
    1124: surveyData[1124] || "", // Near ocean
    1125: surveyData[1125] || "", // Northeast preference
    1126: surveyData[1126] || "", // Southeast preference
    1127: surveyData[1127] || "", // Midwest preference
    1128: surveyData[1128] || "", // Mountain region preference
    1129: surveyData[1129] || "", // Southwest preference
    1130: surveyData[1130] || "", // West Coast preference
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<GeocodingResult[]>([]);
  const [geocodingLocation, setGeocodingLocation] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null);

  const handleChange = (field: number, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle location search with Google Maps API
  const handleLocationSearch = async (value: string) => {
    if (value.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    setGeocodingLocation(true);
    try {
      const suggestions = await getLocationSuggestions(value);
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching location suggestions:', error);
      setLocationSuggestions([]);
    } finally {
      setGeocodingLocation(false);
    }
  };

  // Handle location selection
  const handleLocationSelect = (value: string) => {
    const selected = locationSuggestions.find(s => s.formatted_address === value);
    if (selected) {
      setSelectedLocation(selected);
      
      // Parse city and state from formatted_address
      const parts = selected.formatted_address.split(', ');
      const city = parts[0] || '';
      const state = parts[1]?.split(' ')[0] || '';

      // Update form data with all location fields
      setFormData((prev) => ({
        ...prev,
        1118: city,  // City
        1119: state, // State
        1120: selected.lng.toString(), // Longitude
        1121: selected.lat.toString(), // Latitude
      }));
    }
  };


  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    // Validate required fields (excluding 1131, 1122, 687)
    const requiredFields: { key: number; message: string }[] = [
      { key: 1117, message: 'Please select your campus season preference.' },
      { key: 1118, message: 'Please select your ideal location (city).' },
      { key: 1119, message: 'Please select your ideal location (state).' },
      { key: 1120, message: 'Please select your ideal location (longitude).' },
      { key: 1121, message: 'Please select your ideal location (latitude).' },
      { key: 51, message: 'Please select your preferred distance from your ideal location.' },
      { key: 52, message: 'Please select your ideal campus size.' },
      { key: 63, message: 'Please select your preferred male to female ratio.' },
      { key: 72, message: 'Please select whether to include military schools.' },
      { key: 64, message: 'Please select your HBCU preference.' },
      // 1131 is optional (race or ethnicity)
      // 1122 is optional (hearing loss/ASL)
      { key: 65, message: 'Please select your faith-based school preference.' },
      { key: 53, message: 'Please select your ideal campus location type.' },
      { key: 1123, message: 'Please select your preference about being near the mountains.' },
      { key: 1124, message: 'Please select your preference about being near the ocean.' },
      { key: 1125, message: 'Please select your preference about being in the Northeast.' },
      { key: 1126, message: 'Please select your preference about being in the Southeast.' },
      { key: 1127, message: 'Please select your preference about being in the Midwest.' },
      { key: 1128, message: 'Please select your preference about being in the Mountain region.' },
      { key: 1129, message: 'Please select your preference about being in the Southwest.' },
      { key: 1130, message: 'Please select your preference about being on the West Coast.' },
      // 687 is optional (military service)
    ];
    for (const { key, message } of requiredFields) {
      if (!(formData as any)[key]) {
        alert(message);
        return;
      }
    }
    
    setIsSubmitting(true);
    try {
      onComplete(formData);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      alert("Error proceeding to next step. Please try again.");
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
            Campus Information
          </Typography.Title>
          <Typography.Text>
            Tell us about your campus preferences
          </Typography.Text>
        </Flex>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {/* Question 1: Campus Seasons Preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to have all four seasons or be warm year round? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1117]}
              onChange={(value) => handleChange(1117, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to have all four seasons", label: "Strong preference to have all four seasons" },
                { value: "Slight preference to have all four seasons", label: "Slight preference to have all four seasons" },
                { value: "No preference", label: "No preference" },
                { value: "Slight preference to be warm year round", label: "Slight preference to be warm year round" },
                { value: "Strong preference to be warm year round", label: "Strong preference to be warm year round" },
              ]}
            />
          </Flex>

          {/* Question 2: Ideal Location */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is the ideal location for you to go to school? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              Type to search for a city, state, or region (required)
            </Typography.Text>
            <Select
              showSearch
              placeholder="Enter city, state (e.g., Boston, MA or California)"
              value={selectedLocation ? selectedLocation.formatted_address : undefined}
              onSearch={handleLocationSearch}
              onSelect={handleLocationSelect}
              loading={geocodingLocation}
              style={{ width: '100%' }}
              filterOption={false}
              notFoundContent={locationSuggestions.length === 0 ? 'Type to search for a location' : null}
              options={locationSuggestions.map(suggestion => ({
                value: suggestion.formatted_address,
                label: suggestion.formatted_address,
                key: suggestion.place_id
              }))}
              allowClear
              onClear={() => {
                setSelectedLocation(null);
                setFormData((prev) => ({
                  ...prev,
                  1118: '',
                  1119: '',
                  1120: '',
                  1121: '',
                }));
              }}
            />
            {selectedLocation && (
              <Typography.Text type="secondary" className="text-xs mt-1">
                Selected: {formData[1118]}, {formData[1119]}
              </Typography.Text>
            )}
          </Flex>

          {/* Question 3: Distance from ideal location */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Within what distance do you want to be from your ideal location? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[51]}
              onChange={(value) => handleChange(51, value)}
              placeholder="Select distance preference"
              options={[
                { value: "As close as possible", label: "As close as possible" },
                { value: "Within a 1 hour drive", label: "Within a 1 hour drive" },
                { value: "Within a 3 hour drive", label: "Within a 3 hour drive" },
                { value: "Within an 8 hour drive", label: "Within an 8 hour drive" },
                { value: "Distance is not a factor", label: "Distance is not a factor" },
              ]}
            />
          </Flex>

          {/* Question 4: Campus size */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your ideal campus size (# indicates full-time undergrads)? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[52]}
              onChange={(value) => handleChange(52, value)}
              placeholder="Select campus size preference"
              options={[
                { value: "Very Big: 20,000+", label: "Very Big: 20,000+" },
                { value: "Pretty Big: 10,000-20,000", label: "Pretty Big: 10,000-20,000" },
                { value: "Large Medium: 5,000-10,000", label: "Large Medium: 5,000-10,000" },
                { value: "Small Medium: 2,000-5,000", label: "Small Medium: 2,000-5,000" },
                { value: "Small: Under 2,000", label: "Small: Under 2,000" },
              ]}
            />
          </Flex>

          {/* Question 5: Male to female ratio */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your preferred male to female ratio? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[63]}
              onChange={(value) => handleChange(63, value)}
              placeholder="Select gender ratio preference"
              options={[
                { value: "More than 60% male", label: "More than 60% male" },
                { value: "A little more males than females", label: "A little more males than females" },
                { value: "The same ratio of males to females", label: "The same ratio of males to females" },
                { value: "A little higher ratio of females than males", label: "A little higher ratio of females than males" },
                { value: "More than 60% female", label: "More than 60% female" },
                { value: "It doesn't matter", label: "It doesn't matter" },
              ]}
            />
          </Flex>

          {/* Question 6: Military schools */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you want to include military schools? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (Army, Navy, Air Force, Virginia Military Institute, Coast Guard Academy, Merchant Marine Academy)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[72]}
              onChange={(value) => handleChange(72, value)}
              placeholder="Select yes or no"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />
          </Flex>

          {/* Question 7: HBCU preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer to attend an HBCU (Historically Black College and University)? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[64]}
              onChange={(value) => handleChange(64, value)}
              placeholder="Select your preference"
              options={[
                { value: "I strongly prefer attending an HBCU", label: "I strongly prefer attending an HBCU" },
                { value: "I prefer attending an HBCU", label: "I prefer attending an HBCU" },
                { value: "I have no preference to attend or not attend an HBCU", label: "I have no preference to attend or not attend an HBCU" },
                { value: "I prefer not to attend an HBCU", label: "I prefer not to attend an HBCU" },
                { value: "I strongly prefer not to attend an HBCU", label: "I strongly prefer not to attend an HBCU" },
              ]}
            />
          </Flex>

          {/* Question 8: Race or ethnicity */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your race or ethnicity?
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1131]}
              onChange={(value) => handleChange(1131, value)}
              placeholder="Select your race or ethnicity"
              options={[
                { value: "White", label: "White" },
                { value: "Black or African American", label: "Black or African American" },
                { value: "Hispanic or Latino", label: "Hispanic or Latino" },
                { value: "Asian", label: "Asian" },
                { value: "Native Hawaiian or Other Pacific Islander", label: "Native Hawaiian or Other Pacific Islander" },
                { value: "American Indian or Alaska Native", label: "American Indian or Alaska Native" },
                { value: "Some Other Race", label: "Some Other Race" },
                { value: "Two or More Races", label: "Two or More Races" },
                { value: "Prefer Not to Say", label: "Prefer Not to Say" },
              ]}
            />
          </Flex>

          {/* Question 9: Hearing loss/ASL */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you have any hearing loss or taken any American Sign Language classes?
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1122]}
              onChange={(value) => handleChange(1122, value)}
              placeholder="Select yes or no"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />
          </Flex>

          {/* Question 10: Military service */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Have you or your family served in the military?
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[687]}
              onChange={(value) => handleChange(687, value)}
              placeholder="Select yes or no"
              options={[
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
            />
          </Flex>

          {/* Question 11: Faith-based school */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer a faith-based school? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[65]}
              onChange={(value) => handleChange(65, value)}
              placeholder="Select your preference"
              options={[
                { value: "I strongly prefer attending a faith-based school", label: "I strongly prefer attending a faith-based school" },
                { value: "I prefer attending a faith-based school", label: "I prefer attending a faith-based school" },
                { value: "I have no preference to attend or not attend a faith-based school", label: "I have no preference to attend or not attend a faith-based school" },
                { value: "I prefer not to attend a faith-based school", label: "I prefer not to attend a faith-based school" },
                { value: "I strongly prefer not to attend a faith-based school", label: "I strongly prefer not to attend a faith-based school" },
              ]}
            />
          </Flex>

          {/* Question 12: Campus location type */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What is your ideal campus location type? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[53]}
              onChange={(value) => handleChange(53, value)}
              placeholder="Select location type"
              options={[
                { value: "Large City", label: "Large City" },
                { value: "Midsize City", label: "Midsize City" },
                { value: "Small City", label: "Small City" },
                { value: "Large Suburb (just outside a large city)", label: "Large Suburb (just outside a large city)" },
                { value: "Midsize Suburb (just outside a midsize city)", label: "Midsize Suburb (just outside a midsize city)" },
                { value: "Small Suburb (just outside a small city)", label: "Small Suburb (just outside a small city)" },
                { value: "Fringe Town (small town within a short drive to a city)", label: "Fringe Town (small town within a short drive to a city)" },
                { value: "Rural", label: "Rural" },
              ]}
            />
          </Flex>

          {/* Question 13: Near mountains */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be near the mountains? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1123]}
              onChange={(value) => handleChange(1123, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be close to the mountains", label: "Strong preference to be close to the mountains" },
                { value: "Slight preference to be close to the mountains", label: "Slight preference to be close to the mountains" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be close to the mountains", label: "Prefer to not be close to the mountains" },
              ]}
            />
          </Flex>

          {/* Question 14: Near ocean */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be near the ocean? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Select
              className="w-full"
              value={formData[1124]}
              onChange={(value) => handleChange(1124, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be close to the ocean", label: "Strong preference to be close to the ocean" },
                { value: "Slight preference to be close to the ocean", label: "Slight preference to be close to the ocean" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer not to be close to the ocean", label: "Prefer not to be close to the ocean" },
              ]}
            />
          </Flex>

          {/* Map Image */}
          <Flex vertical className="mb-5" style={{ alignItems: 'center' }}>
            <Image
              src="/CS regions jpg 3.jpg"
              alt="College Selector Regions Map"
              width={800}
              height={600}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </Flex>

          {/* Question 15: Northeast preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be in the Northeast? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (MD, DC, DE, PA, NJ, NY, CT, MA, RI, NH, VT, ME)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1125]}
              onChange={(value) => handleChange(1125, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be in the Northeast", label: "Strong preference to be in the Northeast" },
                { value: "Slight preference to be in the Northeast", label: "Slight preference to be in the Northeast" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be in the Northeast", label: "Prefer to not be in the Northeast" },
              ]}
            />
          </Flex>

          {/* Question 16: Southeast preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be in the Southeast? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (FL, GA, AL, MS, LA, AR, TN, KY, SC, NC, VA, WV)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1126]}
              onChange={(value) => handleChange(1126, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be in the Southeast", label: "Strong preference to be in the Southeast" },
                { value: "Slight preference to be in the Southeast", label: "Slight preference to be in the Southeast" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be in the Southeast", label: "Prefer to not be in the Southeast" },
              ]}
            />
          </Flex>

          {/* Question 17: Midwest preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be in the Midwest? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (OH, MI, IN, IL, WI, MN, IA, MO, KS, NE, SD, ND)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1127]}
              onChange={(value) => handleChange(1127, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be in the Midwest", label: "Strong preference to be in the Midwest" },
                { value: "Slight preference to be in the Midwest", label: "Slight preference to be in the Midwest" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be in the Midwest", label: "Prefer to not be in the Midwest" },
              ]}
            />
          </Flex>

          {/* Question 18: Mountain region preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be in the Mountain region? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (CO, UT, WY, ID, MT)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1128]}
              onChange={(value) => handleChange(1128, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be in the Mountain region", label: "Strong preference to be in the Mountain region" },
                { value: "Slight preference to be in the Mountain region", label: "Slight preference to be in the Mountain region" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be in the Mountain region", label: "Prefer to not be in the Mountain region" },
              ]}
            />
          </Flex>

          {/* Question 19: Southwest preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be in the Southwest? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (TX, OK, NM, AZ)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1129]}
              onChange={(value) => handleChange(1129, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be in the Southwest", label: "Strong preference to be in the Southwest" },
                { value: "Slight preference to be in the Southwest", label: "Slight preference to be in the Southwest" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be in the Southwest", label: "Prefer to not be in the Southwest" },
              ]}
            />
          </Flex>

          {/* Question 20: West Coast preference */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              Do you prefer your campus location to be on the West Coast? <span style={{ color: 'red' }}>*</span>
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              (CA, OR, WA, NV, AK, HI)
            </Typography.Text>
            <Select
              className="w-full"
              value={formData[1130]}
              onChange={(value) => handleChange(1130, value)}
              placeholder="Select your preference"
              options={[
                { value: "Strong preference to be on the West Coast", label: "Strong preference to be on the West Coast" },
                { value: "Slight preference to be on the West Coast", label: "Slight preference to be on the West Coast" },
                { value: "No preference", label: "No preference" },
                { value: "Prefer to not be on the West Coast", label: "Prefer to not be on the West Coast" },
              ]}
            />
          </Flex>
        </div>
      </Flex>

      <Flex gap="middle" justify="space-between">
        {onBack && (
          <Button
            onClick={onBack}
            className="back-servey"
            disabled={isSubmitting}
          >
            Back
          </Button>
        )}
        <Button
          onClick={handleSubmit}
          className="next-servey save-continue-green"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </Flex>
    </Flex>
  );
}

