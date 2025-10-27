"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Typography,
  Space,
  Button,
  Progress,
  Card,
  Row,
  Col,
} from "antd";
import { StarFilled } from "@ant-design/icons";
import Image from "next/image";
import { Flex } from "antd";
import { fetchSchoolWithFacts, fetchHighSchoolAthletes, fetchAthleteRatings, fetchSchoolFacts, fetchCoachInfo } from "@/lib/queries";
import { fetchUserDetails } from "@/utils/utils";
import Filters from "./Filters";
import { FilterState } from "@/types/filters";
interface NewModalProps {
  isVisible: boolean;
  onClose: () => void;
}

interface SchoolProfileContentProps {
  schoolId: string;
  dataSource?: string;
  isInModal?: boolean;
}

const { Title, Text } = Typography;

export default function SchoolProfileContent({ schoolId, dataSource, isInModal = false }: SchoolProfileContentProps) {
  const [schoolName, setSchoolName] = useState<string>('ABERNATHY HS');
  const [prospectsData, setProspectsData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [athleteRatings, setAthleteRatings] = useState<Record<string, { name: string; color: string }>>({});
  const [activeFilters, setActiveFilters] = useState<FilterState>({});
  const [schoolFacts, setSchoolFacts] = useState<any[]>([]);
  const [coachInfo, setCoachInfo] = useState<any>(null);


  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      
      try {
        setLoading(true);
        setError(null); // Clear any previous errors
        
        // Fetch user details to get customer ID
        const userDetails = await fetchUserDetails();
        if (userDetails?.customer_id) {
          setCustomerId(userDetails.customer_id);
        }
        
        // Fetch school data
        const schoolData = await fetchSchoolWithFacts(schoolId);
        if (schoolData?.school?.name) {
          // Remove state abbreviation from school name (e.g., "ANNISTON HS (AL)" -> "ANNISTON HS")
          const cleanName = schoolData.school.name.replace(/\s*\([A-Z]{2}\)\s*$/, '').toUpperCase();
          setSchoolName(cleanName);
        }
        
        // Fetch prospects data
        const prospectsResult = await fetchHighSchoolAthletes(
          schoolId,
          'fb', // Default to football, could be made dynamic based on dataSource
          userDetails?.customer_id,
          {
            page: 1,
            limit: 50,
            sortField: 'athletic_projection',
            sortOrder: 'desc'
          }
        );
        setProspectsData(prospectsResult.data || []);
        
        // Fetch ratings for the loaded athletes
        const athleteIds = prospectsResult.data?.map(athlete => athlete.athlete_id).filter(id => id) || [];
        if (athleteIds.length > 0 && userDetails?.customer_id) {
          const ratings = await fetchAthleteRatings(athleteIds, userDetails.customer_id);
          setAthleteRatings(ratings);
        }
        
        // Fetch school facts data
        const factsData = await fetchSchoolFacts(schoolId);
        setSchoolFacts(factsData);
        
        // Fetch coach info data
        const coachData = await fetchCoachInfo(schoolId);
        setCoachInfo(coachData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load prospects data. Please try again later.');
        setProspectsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [schoolId]);

  // Filter functions
  const applyFilters = (filters: FilterState) => {
    setActiveFilters(filters);
    // Note: For now, we'll just store the filters. 
    // In a full implementation, you'd refetch data with these filters
  };

  const resetFilters = () => {
    setActiveFilters({});
  };

  // Loading state for prospects data
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading prospects data...</p>
        </div>
      </div>
    );
  }



  const content = (
    <div className="p-0 max-h-[80vh] gap-4 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Header Section */}
        <div className="flex justify-between items-center bg-white p-4 max-h-14">
          <div className="flex-1 flex items-center text-center gap-5">
            <Title
              level={2}
              className="m-0 italic text-blue-500 text-4xl font-extrabold drop-shadow-sm"
            >
              {schoolName}
            </Title>
            <Text type="secondary" className="leading-[25px] tracking-[0.16px]">
              <div className="gap-4 flex">
                <span>State: {schoolFacts.find(fact => fact.data_type?.name === 'state_id')?.state?.name || 'N/A'} </span> <span>/</span>{" "}
                <span>County: {schoolFacts.find(fact => fact.data_type?.name === 'county_id')?.county?.name || 'N/A'}</span>
              </div>
            </Text>
          </div>
          <Space>
            <Button
              icon={
                <i className="icon-edit-2 text-2xl flex items-center justify-center border-none"></i>
              }
              type="text"
              className="opacity-50 cursor-not-allowed"
              disabled
              title="Coming Soon"
            />
            <div className="vertical-border"></div>
            <Button
              icon={
                <i className="icon-printer text-2xl flex items-center justify-center"></i>
              }
              type="text"
              className="opacity-50 cursor-not-allowed"
              disabled
              title="Coming Soon"
            />
          </Space>
        </div>

        {/* Head Coach Section */}
        <div className="">
          <div className="flex gap-4">
            {/* Left Column - Head Coach Information + Social Box */}
            <div className="w-[60%] bg-white p-4 flex-shrink-0 flex">
              {/* Left: Head Coach Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className=" font-semibold text-gray-800  h3">
                    Head Coach - {coachInfo ? `${coachInfo.firstName} ${coachInfo.lastName}` : 'Unknown'}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {(() => {
                      const dateValue = schoolFacts.find(fact => fact.data_type?.name === 'hc_update_date')?.value;
                      if (!dateValue) return 'N/A';
                      
                      const date = new Date(dateValue);
                      const month = (date.getMonth() + 1).toString();
                      const day = date.getDate().toString();
                      const year = date.getFullYear().toString().slice(-2);
                      
                      return `${month}/${day}/${year}`;
                    })()}
                  </span>
                </div>
                <p className="paragraph-text mb-10">
                  {coachInfo?.email ? (
                    <a href={`mailto:${coachInfo.email}`}>
                      {coachInfo.email}
                    </a>
                  ) : ''}
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {(() => {
                    const homePhone = coachInfo?.facts?.find((fact: any) => fact.data_type?.name === 'home_phone')?.value || coachInfo?.phone;
                    const cellPhone = coachInfo?.facts?.find((fact: any) => fact.data_type?.name === 'cell_phone')?.value || coachInfo?.phone;
                    const officePhone = coachInfo?.facts?.find((fact: any) => fact.data_type?.name === 'office_phone')?.value;
                    
                    return (
                      <>
                        {homePhone && (
                          <div>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'Home' ? 'font-bold' : ''}`}>
                              Home {coachInfo?.best_phone === 'home_phone' ? '(Best)' : ''}
                            </p>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'Home' ? 'font-bold' : ''}`}>
                              {(() => {
                                const cleaned = homePhone.replace(/\D/g, '');
                                const formatted = cleaned.length === 10 ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}` : homePhone;
                                return (
                                  <a href={`tel:${cleaned}`}>
                                    {formatted}
                                  </a>
                                );
                              })()}
                            </p>
                          </div>
                        )}
                        {cellPhone && (
                          <div>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'Cell' ? 'font-bold' : ''}`}>
                              Cell {coachInfo?.best_phone === 'cell_phone' ? '(Best)' : ''}
                            </p>
                            <p className={`text-sm text-gray-800 mb-0 ${coachInfo?.best_phone === 'Cell' ? 'font-bold' : 'font-semibold'}`}>
                              {(() => {
                                const cleaned = cellPhone.replace(/\D/g, '');
                                const formatted = cleaned.length === 10 ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}` : cellPhone;
                                return (
                                  <a href={`tel:${cleaned}`}>
                                    {formatted}
                                  </a>
                                );
                              })()}
                            </p>
                          </div>
                        )}
                        {officePhone && (
                          <div>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'Office' ? 'font-bold' : ''}`}>
                              Office {coachInfo?.best_phone === 'office_phone' ? '(Best)' : ''}
                            </p>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'Office' ? 'font-bold' : ''}`}>
                              {(() => {
                                const cleaned = officePhone.replace(/\D/g, '');
                                const formatted = cleaned.length === 10 ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}` : officePhone;
                                return (
                                  <a href={`tel:${cleaned}`}>
                                    {formatted}
                                  </a>
                                );
                              })()}
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Right: Social Box */}
              {coachInfo?.twitterHandle && (
                <div className="text-center w-[134px] h-[149px] bg-black py-6 px-4 !mb-0 ">
                  <Image src="/twitter.png" alt="Twitter" width={48} height={48} className="w-12" />
                  <p className="text-[#C8FF24] mb-0 py-1 overflow-hidden text-ellipsis whitespace-nowrap" style={{ fontSize: 'clamp(0.6rem, 2vw, 1rem)' }}>
                    @{coachInfo.twitterHandle}
                  </p>
                  <a 
                    href={`https://x.com/${coachInfo.twitterHandle}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-transparent border-none cursor-pointer"
                  >
                    <Image src="/follow.svg" alt="Follow" width={95} height={24} />
                  </a>
                </div>
              )}
            </div>

            {/* Right Column - School Information */}
            <div className="flex-1 bg-white p-4">
              <p className="text-sm text-gray-800 mb-0">
                {(() => {
                  const street = schoolFacts.find(fact => fact.data_type?.name === 'address_street')?.value || '';
                  const street2 = schoolFacts.find(fact => fact.data_type?.name === 'address_street2')?.value || '';
                  const city = schoolFacts.find(fact => fact.data_type?.name === 'address_city')?.value || '';
                  const state = schoolFacts.find(fact => fact.data_type?.name === 'address_state')?.value || '';
                  const zip = schoolFacts.find(fact => fact.data_type?.name === 'address_zip')?.value || '';
                  
                  const addressParts = [street, street2, city, state, zip].filter(part => part && part.trim() !== '');
                  return addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
                })()}
              </p>
              <p className="text-sm text-gray-800 mb-0">
                {(() => {
                  const phoneValue = schoolFacts.find(fact => fact.data_type?.name === 'school_phone')?.value;
                  if (!phoneValue) return '';
                  
                  // Format phone number as (xxx) xxx-xxxx
                  const cleaned = phoneValue.replace(/\D/g, '');
                  const formatted = cleaned.length === 10 ? `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}` : phoneValue;
                  
                  return (
                    <a href={`tel:${cleaned}`} >
                      {formatted}
                    </a>
                  );
                })()}
              </p>
              <p className="text-sm text-gray-800 mb-8">
                AD&apos;s Name - {(() => {
                  const firstName = schoolFacts.find(fact => fact.data_type?.name === 'ad_name_first')?.value || '';
                  const lastName = schoolFacts.find(fact => fact.data_type?.name === 'ad_name_last')?.value || '';
                  const fullName = [firstName, lastName].filter(name => name.trim()).join(' ');
                  return fullName || 'Unknown';
                })()} -{" "}
                {(() => {
                  const email = schoolFacts.find(fact => fact.data_type?.name === 'ad_email')?.value;
                  return email ? (
                    <a href={`mailto:${email}`} className="text-blue-500">
                      {email}
                    </a>
                  ) : '';
                })()}
              </p>
              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const enrollmentSize = schoolFacts.find(fact => fact.data_type?.name === 'enrollment_size')?.value;
                  const affiliation = schoolFacts.find(fact => fact.data_type?.name === 'affiliation')?.value;
                  const schoolType = schoolFacts.find(fact => fact.data_type?.name === 'private_public')?.value;
                  
                  return (
                    <>
                      {enrollmentSize && (
                        <div>
                          <p className="mb-0 text-sm">Enrollment Size</p>
                          <p className="mb-0 text-sm">{enrollmentSize}</p>
                        </div>
                      )}
                      {affiliation && (
                        <div>
                          <p className="mb-0 text-sm">Religious Affiliation</p>
                          <p className="mb-0 text-sm">{affiliation}</p>
                        </div>
                      )}
                      {schoolType && (
                        <div>
                          <p className="mb-0 text-sm">School Type</p>
                          <p className="mb-0 text-sm">{schoolType}</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Score Cards */}

        <Card className="mb-6  !p-0 ">
          <Row gutter={24} align="top" className="py-6">
            {/* LEFT SIDE */}
            <Col span={8}>
              <div className="mx-5">
                {/* Row 1 → 3 columns */}
                <div className="grid grid-cols-3 ">
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      2025 Record
                    </p>
                    <p className="text-size">{schoolFacts.find(fact => fact.data_type?.name === 'fb_2025_record')?.value || ''}</p>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      2024 Record
                    </p>
                    <p className="text-size">{schoolFacts.find(fact => fact.data_type?.name === 'fb_2024_record')?.value || ''}</p>
                  </div>
                  <div>
                    <p className="text-gray-800 font-medium text-sm mb-0">
                      Schedule
                    </p>
                      {(() => {
                        const maxPrepsLink = schoolFacts.find(fact => fact.data_type?.name === 'max_preps_link')?.value;
                        return maxPrepsLink ? (
                          <p className="text-size">
                            <a href={maxPrepsLink} target="_blank" rel="noopener noreferrer" className="text-[#126DB8] !font-medium cursor-pointer">
                              Link
                            </a>
                          </p>
                        ) : '';
                      })()}
                  </div>
                </div>

                {/* Row 2 → 2 columns */}
                <div className="grid grid-cols-2 pt-4">
                  {(() => {
                    const conference = schoolFacts.find(fact => fact.data_type?.name === 'conference')?.value;
                    const leagueClassification = schoolFacts.find(fact => fact.data_type?.name === 'league_classification')?.value;
                    
                    return (
                      <>
                        {conference && (
                          <div>
                            <p className="text-gray-800 font-medium text-sm mb-0">
                              Conference
                            </p>
                            <p className="text-size">{conference}</p>
                          </div>
                        )}
                        {leagueClassification && (
                          <div className="ml-16">
                            <p className="text-gray-800 font-medium text-sm mb-0">
                              State Classification
                            </p>
                            <p className="text-size">{leagueClassification}</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </Col>

            {/* RIGHT SIDE */}
            <Col span={16} className="mt-6">
              <Row gutter={16} className="gap-7">
                {/* # of Prospects Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      # of Prospects Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        {schoolFacts.find(fact => fact.data_type?.name === 'college_player_producing')?.value || ''}
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        {(() => {
                          const score = parseInt(schoolFacts.find(fact => fact.data_type?.name === 'college_player_producing')?.value || '0');
                          const percent = score * 10;
                          const color = score >= 8 ? '#22C55E' : score >= 6 ? '#F97316' : score >= 4 ? '#EF4444' : '#DC2626';
                          const trailColor = score >= 8 ? '#DCFCE7' : score >= 6 ? '#FFEDD5' : score >= 4 ? '#FEE2E2' : '#FEE2E2';
                          return (
                            <Progress
                              percent={percent}
                              size={["100%", 40]}
                              strokeColor={color}
                              trailColor={trailColor}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="h-10"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Col>

                {/* # of D1 Prospects Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      # of D1 Prospects Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        {schoolFacts.find(fact => fact.data_type?.name === 'd1_player_producing')?.value || ''}
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        {(() => {
                          const score = parseInt(schoolFacts.find(fact => fact.data_type?.name === 'd1_player_producing')?.value || '0');
                          const percent = score * 10;
                          const color = score >= 8 ? '#22C55E' : score >= 6 ? '#F97316' : score >= 4 ? '#EF4444' : '#DC2626';
                          const trailColor = score >= 8 ? '#DCFCE7' : score >= 6 ? '#FFEDD5' : score >= 4 ? '#FEE2E2' : '#FEE2E2';
                          return (
                            <Progress
                              percent={percent}
                              size={["100%", 40]}
                              strokeColor={color}
                              trailColor={trailColor}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="h-10"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Team Quality Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      Team Quality Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        {schoolFacts.find(fact => fact.data_type?.name === 'team_quality')?.value || ''}
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        {(() => {
                          const score = parseInt(schoolFacts.find(fact => fact.data_type?.name === 'team_quality')?.value || '0');
                          const percent = score * 10;
                          const color = score >= 8 ? '#22C55E' : score >= 6 ? '#F97316' : score >= 4 ? '#EF4444' : '#DC2626';
                          const trailColor = score >= 8 ? '#DCFCE7' : score >= 6 ? '#FFEDD5' : score >= 4 ? '#FEE2E2' : '#FEE2E2';
                          return (
                            <Progress
                              percent={percent}
                              size={["100%", 40]}
                              strokeColor={color}
                              trailColor={trailColor}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="h-10"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Athlete Income Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      Athlete Income Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        {schoolFacts.find(fact => fact.data_type?.name === 'athlete_income')?.value || ''}
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        {(() => {
                          const score = parseInt(schoolFacts.find(fact => fact.data_type?.name === 'athlete_income')?.value || '0');
                          const percent = score * 10;
                          const color = score >= 8 ? '#22C55E' : score >= 6 ? '#F97316' : score >= 4 ? '#EF4444' : '#DC2626';
                          const trailColor = score >= 8 ? '#DCFCE7' : score >= 6 ? '#FFEDD5' : score >= 4 ? '#FEE2E2' : '#FEE2E2';
                          return (
                            <Progress
                              percent={percent}
                              size={["100%", 40]}
                              strokeColor={color}
                              trailColor={trailColor}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="h-10"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Col>

                {/* Academics Score */}
                <Col span={4}>
                  <div className="flex flex-col items-start">
                    <Text type="secondary" className="score-heading mb-1">
                      Academics Score
                    </Text>
                    <div className="flex items-center w-full">
                      <span className="bg-[#1C1D4D] text-white w-8 h-10 flex items-center justify-center font-bold score-number">
                        {schoolFacts.find(fact => fact.data_type?.name === 'academics')?.value || ''}
                      </span>
                      <div className="relative flex-1 h-10 clip-progress">
                        {(() => {
                          const score = parseInt(schoolFacts.find(fact => fact.data_type?.name === 'academics')?.value || '0');
                          const percent = score * 10;
                          const color = score >= 8 ? '#22C55E' : score >= 6 ? '#F97316' : score >= 4 ? '#EF4444' : '#DC2626';
                          const trailColor = score >= 8 ? '#DCFCE7' : score >= 6 ? '#FFEDD5' : score >= 4 ? '#FEE2E2' : '#FEE2E2';
                          return (
                            <Progress
                              percent={percent}
                              size={["100%", 40]}
                              strokeColor={color}
                              trailColor={trailColor}
                              strokeLinecap="butt"
                              showInfo={false}
                              className="h-10"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>

        {/* College Prospects */}

        <Flex justify="space-between" align="center">
          <Title level={2} className="page-heading">
            College Prospect
          </Title>

          <Space>
            <div 
              className="opacity-50 cursor-not-allowed relative group"
              title="Coming Soon"
            >
              <Filters 
                onApplyFilters={applyFilters}
                onResetFilters={resetFilters}
                dynamicColumns={[]}
                filterColumns={[]}
                dataSource="high_schools"
              />
            </div>
            <Button 
              type="primary" 
              size="large" 
              className="bg-primary opacity-50 cursor-not-allowed"
              disabled
              title="Coming Soon"
            >
              <i className="icon-user text-white"></i>
              Add Athlete
            </Button>
          </Space>
        </Flex>


        <table className="new-style-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Grad Year</th>
              <th>Athletic Projection</th>
              <th>Best Offer</th>
              <th>GPA</th>
              <th>Position</th>
              <th>Height</th>
              <th>Weight</th>
              <th>Highlight</th>
            </tr>
          </thead>
          <tbody>
            {error ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center">
                    <div className="text-red-500 text-4xl mb-2">⚠️</div>
                    <p className="text-lg font-medium text-gray-800 mb-2">Unable to Load Prospects</p>
                    <p className="text-sm text-gray-600 mb-4">{error}</p>
                    <button 
                      onClick={() => window.location.reload()} 
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </td>
              </tr>
            ) : prospectsData.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-lg font-medium">No prospects found</p>
                    <p className="text-sm">This school may not have any prospects in the current database.</p>
                  </div>
                </td>
              </tr>
            ) : (
              prospectsData.map((athlete, index) => (
              <tr key={athlete.key}>
                <td>
                  <div className="flex items-center justify-start gap-2">
                    <Flex
                      className="user-image extra-small"
                      style={{ width: "48px", margin: 0 }}
                    >
                      <Flex className="gray-scale">
                        <Image
                          src={athlete.image_url || "/blank-user.svg"}
                          alt={athlete.name}
                          width={48}
                          height={48}
                        />
                        {athlete.score > 0 && <span className="yellow">{athlete.score}</span>}
                      </Flex>
                    </Flex>
                    <div className="pro-detail ml-1">
                      <h4 className="flex mb-0">
                        {athlete.name}
                        {athleteRatings[athlete.athlete_id] && (
                          <small className="flex ml-2 items-center justify-center">
                            <div
                              className="w-4 h-4 rounded-full flex items-center justify-center mr-1"
                              style={{
                                backgroundColor: athleteRatings[athlete.athlete_id].color,
                              }}
                            >
                              <StarFilled style={{ color: '#fff', fontSize: 12 }} />
                            </div>
                            <span className="text-sm text-gray-600">
                              {athleteRatings[athlete.athlete_id].name.substring(0, 4)}
                            </span>
                          </small>
                        )}
                      </h4>
                    </div>
                  </div>
                </td>
                <td>{athlete.gradYear}</td>
                <td>{athlete.athleticProjection}</td>
                <td>{athlete.bestOffer}</td>
                <td>{athlete.gpa}</td>
                <td>{athlete.position}</td>
                <td>{athlete.height}</td>
                <td>{athlete.weight}</td>
                <td>
                  {athlete.highlight ? (
                    <a 
                      href={athlete.highlight.startsWith('http') ? athlete.highlight : `https://www.${athlete.highlight}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 text-sm font-medium hover:text-blue-700 hover:underline"
                    >
                      Link
                    </a>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
      </div>
  );

  // If in modal, return just the content
  if (isInModal) {
    return content;
  }

  // If not in modal, wrap in modal for standalone page
  return (
    <Modal
      open={true}
      onCancel={() => {}}
      width={"90%"}
      centered
      footer={null}
      className="new-modal"
    >
      <button className="close" onClick={() => {}}></button>
      {content}
    </Modal>
  );
}
