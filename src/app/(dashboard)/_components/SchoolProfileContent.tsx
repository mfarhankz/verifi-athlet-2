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
  Table,
  Input,
  Select,
} from "antd";
import { StarFilled } from "@ant-design/icons";
import Image from "next/image";
import { Flex } from "antd";
import { fetchSchoolWithFacts, fetchHighSchoolAthletes, fetchAthleteRatings, fetchSchoolFacts, fetchCoachInfo } from "@/lib/queries";
import { fetchUserDetails } from "@/utils/utils";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@/contexts/CustomerContext";
import { preparePrintRequestData, sendPrintRequest, convertSchoolId } from "@/utils/printUtils";
import AddPlayerModal from "./AddPlayerModal";
import EditSchoolModal from "./EditSchoolModal";
import { useRouter, useSearchParams } from "next/navigation";
import HSAthleteProfileContent from "./HSAthleteProfileContent";
import AthleteProfileContent from "./AthleteProfileContent";
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [schoolName, setSchoolName] = useState<string>('ABERNATHY HS');
  const userDetails = useUser();
  const [prospectsData, setProspectsData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [athleteRatings, setAthleteRatings] = useState<Record<string, { name: string; color: string }>>({});
  const [schoolFacts, setSchoolFacts] = useState<any[]>([]);
  const [coachInfo, setCoachInfo] = useState<any>(null);
  const [isAddPlayerModalVisible, setIsAddPlayerModalVisible] = useState<boolean>(false);
  const [isEditSchoolModalVisible, setIsEditSchoolModalVisible] = useState<boolean>(false);
  const [recentlyAddedAthletes, setRecentlyAddedAthletes] = useState<any[]>([]);
  const [tableFilters, setTableFilters] = useState<Record<string, any>>({});
  const [tableSorting, setTableSorting] = useState<{ field: string; order: 'ascend' | 'descend' | null }>({ field: 'gradYear', order: 'ascend' });
  const [currentFilters, setCurrentFilters] = useState<Record<string, any>>({});
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Modal state for athlete profile
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [isAthleteModalVisible, setIsAthleteModalVisible] = useState<boolean>(false);
  const [selectedAthleteDataSource, setSelectedAthleteDataSource] = useState<'transfer_portal' | 'hs_athletes'>('hs_athletes');

  // Column configuration for the prospects table
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: any, b: any) => {
        // Extract last name for sorting
        const getLastName = (fullName: string) => {
          const nameParts = fullName.trim().split(' ');
          return nameParts[nameParts.length - 1] || '';
        };
        const lastNameA = getLastName(a.name);
        const lastNameB = getLastName(b.name);
        return lastNameA.localeCompare(lastNameB);
      },
      render: (text: string, record: any) => {
        const handleAthleteClick = () => {
          if (record.athlete_id) {
            if (isInModal) {
              // When in modal, open athlete profile modal instead of navigating
              setSelectedAthleteId(record.athlete_id);
              setSelectedAthleteDataSource('hs_athletes');
              setIsAthleteModalVisible(true);
            } else {
              // When not in modal, navigate normally
              router.push(`/hs-athlete?player=${record.athlete_id}&dataSource=hs_athletes`);
            }
          }
        };

        return (
          <div 
            className="flex items-center justify-start gap-2 cursor-pointer hover:opacity-80"
            onClick={handleAthleteClick}
          >
            <Flex
              className="user-image extra-small"
              style={{ width: "48px", margin: 0 }}
            >
              <Flex className="gray-scale">
                <Image
                  src={record.image_url || "/blank-user.svg"}
                  alt={record.name}
                  width={48}
                  height={48}
                />
                {record.score > 0 && <span className="yellow">{record.score}</span>}
              </Flex>
            </Flex>
            <div className="pro-detail ml-1">
              <h4 className="flex mb-0">
                {record.name}
                {record.isRecentlyAdded && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    New
                  </span>
                )}
                {athleteRatings[record.athlete_id] && (
                  <small className="flex ml-2 items-center justify-center">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center mr-1"
                      style={{
                        backgroundColor: athleteRatings[record.athlete_id].color,
                      }}
                    >
                      <StarFilled style={{ color: '#fff', fontSize: 12 }} />
                    </div>
                    <span className="text-sm text-gray-600">
                      {athleteRatings[record.athlete_id].name.substring(0, 4)}
                    </span>
                  </small>
                )}
              </h4>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Grad Year',
      dataIndex: 'gradYear',
      key: 'gradYear',
      filteredValue: currentFilters.gradYear || null,
      sorter: (a: any, b: any) => {
        const yearA = parseInt(a.gradYear) || 0;
        const yearB = parseInt(b.gradYear) || 0;
        return yearA - yearB;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        // Get unique grad years from the data
        const uniqueYears = [...new Set(prospectsData
          .map(record => record.gradYear)
          .filter(year => year && year !== 0 && year !== '0' && year !== '')
          .sort((a, b) => parseInt(a) - parseInt(b))
        )];
        
        return (
          <div style={{ padding: 8 }}>
            <Select
              mode="multiple"
              placeholder="Select grad years"
              value={selectedKeys}
              onChange={(value) => setSelectedKeys(value)}
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              allowClear
            >
              {uniqueYears.map(year => (
                <Select.Option key={year} value={year}>
                  {year}
                </Select.Option>
              ))}
            </Select>
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                size="small"
                style={{ width: 90 }}
              >
                Filter
              </Button>
              <Button
                onClick={() => {
                  clearFilters();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        );
      },
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        return value.includes(record.gradYear);
      },
      render: (text: any, record: any) => {
        // Show blank if gradYear is 0, null, undefined, or empty
        if (!record.gradYear || record.gradYear === 0 || record.gradYear === '0' || record.gradYear === '') {
          return <span className="text-gray-400">-</span>;
        }
        return record.gradYear;
      },
    },
    {
      title: 'Athletic Projection',
      dataIndex: 'athleticProjection',
      key: 'athleticProjection',
      filteredValue: currentFilters.athleticProjection || null,
      sorter: (a: any, b: any) => {
        const projectionOrder = [
          'FBS P4 - Top half',
          'FBS P4',
          'FBS G5 - Top half',
          'FBS G5',
          'FCS - Full Scholarship',
          'FCS',
          'D2 - Top half',
          'D2',
          'D3 - Top half',
          'D3',
          'D3 Walk-on'
        ];
        
        const indexA = projectionOrder.indexOf(a.athleticProjection);
        const indexB = projectionOrder.indexOf(b.athleticProjection);
        
        // If both are in the order array, sort by their position
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // If only one is in the order array, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // If neither is in the order array, sort alphabetically
        return a.athleticProjection.localeCompare(b.athleticProjection);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        // Get unique athletic projections from the data and sort them in the correct order
        const projectionOrder = [
          'FBS P4 - Top half',
          'FBS P4',
          'FBS G5 - Top half',
          'FBS G5',
          'FCS - Full Scholarship',
          'FCS',
          'D2 - Top half',
          'D2',
          'D3 - Top half',
          'D3',
          'D3 Walk-on'
        ];
        
        const uniqueProjections = [...new Set(prospectsData
          .map(record => record.athleticProjection)
          .filter(proj => proj && proj !== 0 && proj !== '0' && proj !== '')
        )].sort((a, b) => {
          const indexA = projectionOrder.indexOf(a);
          const indexB = projectionOrder.indexOf(b);
          // If both are in the order array, sort by their position
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only one is in the order array, prioritize it
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          // If neither is in the order array, sort alphabetically
          return a.localeCompare(b);
        });
        
        return (
          <div style={{ padding: 8 }}>
            <Select
              mode="multiple"
              placeholder="Select projections"
              value={selectedKeys}
              onChange={(value) => setSelectedKeys(value || [])}
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              allowClear
            >
              {uniqueProjections.map(proj => (
                <Select.Option key={proj} value={proj}>
                  {proj}
                </Select.Option>
              ))}
            </Select>
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                size="small"
                style={{ width: 90 }}
              >
                Filter
              </Button>
              <Button
                onClick={() => {
                  clearFilters();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        );
      },
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        
        // Handle both string and array cases
        const selectedValues = Array.isArray(value) ? value : [value];
        const isMatch = selectedValues.includes(record.athleticProjection);
        
        return isMatch;
      },
      render: (text: any, record: any) => {
        // Show blank if athleticProjection is 0, null, undefined, or empty
        if (!record.athleticProjection || record.athleticProjection === 0 || record.athleticProjection === '0') {
          return <span className="text-gray-400">-</span>;
        }
        return record.athleticProjection;
      },
    },
    {
      title: 'Best Offer',
      dataIndex: 'bestOffer',
      key: 'bestOffer',
      filteredValue: currentFilters.bestOffer || null,
      sorter: (a: any, b: any) => {
        const offerOrder = [
          'P4',
          'G5',
          'FCS',
          'D2/NAIA',
          'D3',
          'None'
        ];
        
        const indexA = offerOrder.indexOf(a.bestOffer);
        const indexB = offerOrder.indexOf(b.bestOffer);
        
        // If both are in the order array, sort by their position
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        // If only one is in the order array, prioritize it
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        // If neither is in the order array, sort alphabetically
        return a.bestOffer.localeCompare(b.bestOffer);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        // Get unique best offers from the data and sort them in the correct order
        const offerOrder = [
          'P4',
          'G5',
          'FCS',
          'D2/NAIA',
          'D3',
          'None'
        ];
        
        const uniqueOffers = [...new Set(prospectsData
          .map(record => record.bestOffer)
          .filter(offer => offer && offer !== '')
        )].sort((a, b) => {
          const indexA = offerOrder.indexOf(a);
          const indexB = offerOrder.indexOf(b);
          // If both are in the order array, sort by their position
          if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
          }
          // If only one is in the order array, prioritize it
          if (indexA !== -1) return -1;
          if (indexB !== -1) return 1;
          // If neither is in the order array, sort alphabetically
          return a.localeCompare(b);
        });
        
        return (
          <div style={{ padding: 8 }}>
            <Select
              mode="multiple"
              placeholder="Select offers"
              value={selectedKeys}
              onChange={(value) => setSelectedKeys(value)}
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              allowClear
            >
              <Select.Option key="None" value="None">
                None
              </Select.Option>
              {uniqueOffers.map(offer => (
                <Select.Option key={offer} value={offer}>
                  {offer}
                </Select.Option>
              ))}
            </Select>
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                size="small"
                style={{ width: 90 }}
              >
                Filter
              </Button>
              <Button
                onClick={() => {
                  clearFilters();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        );
      },
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        return value.includes(record.bestOffer);
      },
    },
    {
      title: 'GPA',
      dataIndex: 'gpa',
      key: 'gpa',
      filteredValue: currentFilters.gpa || null,
      sorter: (a: any, b: any) => {
        const gpaA = parseFloat(a.gpa) || 0;
        const gpaB = parseFloat(b.gpa) || 0;
        return gpaA - gpaB;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            type="number"
            step="0.1"
            min="0"
            max="4"
            placeholder="Minimum GPA"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              Filter
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        
        // Handle both string and array cases
        const selectedValues = Array.isArray(value) ? value : [value];
        const minGpa = parseFloat(selectedValues[0]);
        const recordGpa = parseFloat(record.gpa);
        return !isNaN(recordGpa) && recordGpa >= minGpa;
      },
      render: (text: any, record: any) => {
        // Show blank if GPA is 0, null, undefined, or empty
        if (!record.gpa || record.gpa === 0 || record.gpa === '0' || record.gpa === '') {
          return <span className="text-gray-400">-</span>;
        }
        return record.gpa;
      },
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      filteredValue: currentFilters.position || null,
      sorter: (a: any, b: any) => a.position.localeCompare(b.position),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        // Get unique positions from the data
        const uniquePositions = [...new Set(prospectsData
          .map(record => record.position)
          .filter(pos => pos && pos !== '')
          .sort()
        )];
        
        return (
          <div style={{ padding: 8 }}>
            <Select
              mode="multiple"
              placeholder="Select positions"
              value={selectedKeys}
              onChange={(value) => setSelectedKeys(value)}
              style={{ width: 200, marginBottom: 8, display: 'block' }}
              allowClear
            >
              {uniquePositions.map(position => (
                <Select.Option key={position} value={position}>
                  {position}
                </Select.Option>
              ))}
            </Select>
            <Space>
              <Button
                type="primary"
                onClick={() => confirm()}
                size="small"
                style={{ width: 90 }}
              >
                Filter
              </Button>
              <Button
                onClick={() => {
                  clearFilters();
                  confirm();
                }}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        );
      },
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        
        // If the record has no position (blank), don't show it when filtering by specific positions
        if (!record.position || record.position === '') {
          return false;
        }
        
        return value.includes(record.position);
      },
      render: (text: any, record: any) => {
        // Show blank if position is empty
        if (!record.position || record.position === '') {
          return <span className="text-gray-400">-</span>;
        }
        return record.position;
      },
    },
    {
      title: 'Height',
      dataIndex: 'height',
      key: 'height',
      filteredValue: currentFilters.height || null,
      sorter: (a: any, b: any) => {
        // Convert height to inches for proper sorting
        const getHeightInInches = (height: string) => {
          if (!height) return 0;
          // Handle both formats: "6'2\"" and "6' 2\"" (with optional space)
          const match = height.match(/(\d+)'\s*(\d+)"/);
          if (match) {
            return parseInt(match[1]) * 12 + parseInt(match[2]);
          }
          return 0;
        };
        return getHeightInInches(a.height) - getHeightInInches(b.height);
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        let feetValue = '';
        let inchesValue = '';
        
        const handleFilter = () => {
          if (feetValue || inchesValue) {
            const minHeightInches = (parseInt(feetValue) || 0) * 12 + (parseInt(inchesValue) || 0);
            setSelectedKeys([minHeightInches]);
          } else {
            setSelectedKeys([]);
          }
          confirm();
        };
        
        const handleReset = () => {
          feetValue = '';
          inchesValue = '';
          clearFilters();
          confirm();
        };
        
        return (
          <div style={{ padding: 8 }}>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 4, fontSize: '12px' }}>Minimum Height</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  type="number"
                  min="0"
                  max="8"
                  placeholder="Feet"
                  defaultValue={feetValue}
                  onChange={(e) => { feetValue = e.target.value; }}
                  style={{ width: 60 }}
                />
                <span style={{ fontSize: '12px' }}>ft</span>
                <Input
                  type="number"
                  min="0"
                  max="11"
                  placeholder="Inches"
                  defaultValue={inchesValue}
                  onChange={(e) => { inchesValue = e.target.value; }}
                  style={{ width: 60 }}
                />
                <span style={{ fontSize: '12px' }}>in</span>
              </div>
            </div>
            <Space>
              <Button
                type="primary"
                onClick={handleFilter}
                size="small"
                style={{ width: 90 }}
              >
                Filter
              </Button>
              <Button
                onClick={handleReset}
                size="small"
                style={{ width: 90 }}
              >
                Reset
              </Button>
            </Space>
          </div>
        );
      },
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        
        // Handle both string and array cases
        const selectedValues = Array.isArray(value) ? value : [value];
        const minHeightInches = selectedValues[0];
        const getHeightInInches = (height: string) => {
          if (!height) return 0;
          // Handle both formats: "6'2\"" and "6' 2\"" (with optional space)
          const match = height.match(/(\d+)'\s*(\d+)"/);
          if (match) {
            return parseInt(match[1]) * 12 + parseInt(match[2]);
          }
          return 0;
        };
        const recordHeightInches = getHeightInInches(record.height);
        const isMatch = recordHeightInches >= minHeightInches;
        
        
        return isMatch;
      },
      render: (text: any, record: any) => {
        // Show blank if height is empty
        if (!record.height || record.height === '') {
          return <span className="text-gray-400">-</span>;
        }
        return record.height;
      },
    },
    {
      title: 'Weight',
      dataIndex: 'weight',
      key: 'weight',
      filteredValue: currentFilters.weight || null,
      sorter: (a: any, b: any) => {
        const weightA = parseInt(a.weight) || 0;
        const weightB = parseInt(b.weight) || 0;
        return weightA - weightB;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Input
            type="number"
            min="0"
            max="500"
            placeholder="Minimum Weight (lbs)"
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              Filter
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value: any, record: any) => {
        if (!value || value.length === 0) return true;
        
        // Handle both string and array cases
        const selectedValues = Array.isArray(value) ? value : [value];
        const minWeight = parseInt(selectedValues[0]);
        const recordWeight = parseInt(record.weight);
        
        
        return !isNaN(recordWeight) && recordWeight >= minWeight;
      },
      render: (text: any, record: any) => {
        // Show blank if weight is 0, null, undefined, or empty
        if (!record.weight || record.weight === 0 || record.weight === '0' || record.weight === '') {
          return <span className="text-gray-400">-</span>;
        }
        return record.weight;
      },
    },
    {
      title: 'Highlight',
      dataIndex: 'highlight',
      key: 'highlight',
      filteredValue: currentFilters.highlight || null,
      sorter: (a: any, b: any) => {
        const hasHighlightA = a.highlight ? 1 : 0;
        const hasHighlightB = b.highlight ? 1 : 0;
        return hasHighlightA - hasHighlightB;
      },
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
        <div style={{ padding: 8 }}>
          <Select
            placeholder="Filter by highlight"
            value={selectedKeys[0]}
            onChange={(value) => setSelectedKeys(value ? [value] : [])}
            style={{ width: 188, marginBottom: 8, display: 'block' }}
            allowClear
          >
            <Select.Option value="has_highlight">Has Highlight</Select.Option>
            <Select.Option value="no_highlight">No Highlight</Select.Option>
          </Select>
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              size="small"
              style={{ width: 90 }}
            >
              Search
            </Button>
            <Button
              onClick={() => {
                clearFilters();
                confirm();
              }}
              size="small"
              style={{ width: 90 }}
            >
              Reset
            </Button>
          </Space>
        </div>
      ),
      onFilter: (value: any, record: any) => {
        if (value === 'has_highlight') return !!record.highlight;
        if (value === 'no_highlight') return !record.highlight;
        return true;
      },
      render: (text: string, record: any) => (
        record.highlight ? (
          <a 
            href={record.highlight.startsWith('http') ? record.highlight : `https://www.${record.highlight}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 text-sm font-medium hover:text-blue-700 hover:underline"
          >
            Link
          </a>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        )
      ),
    },
  ];

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
          limit: 50
        }
      );
        // Combine main data with recently added athletes
        const allProspectsData = [...(prospectsResult.data || []), ...recentlyAddedAthletes];
        
        // Transform data to convert "No Offer" to "None"
        const transformedData = allProspectsData.map(athlete => ({
          ...athlete,
          bestOffer: athlete.bestOffer === 'No Offer' ? 'None' : athlete.bestOffer
        }));
        
        console.log('Main prospects data:', prospectsResult.data?.length || 0);
        console.log('Recently added athletes:', recentlyAddedAthletes.length);
        console.log('Combined data length:', allProspectsData.length);
        console.log('All prospects data:', transformedData);
        setProspectsData(transformedData);
      
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

  useEffect(() => {
    fetchData();
  }, [schoolId]);


  // Modal handlers
  const handleOpenAddPlayerModal = () => {
    setIsAddPlayerModalVisible(true);
  };

  const handleCloseAddPlayerModal = () => {
    setIsAddPlayerModalVisible(false);
  };

  const handleOpenEditSchoolModal = () => {
    setIsEditSchoolModalVisible(true);
  };

  const handleCloseEditSchoolModal = () => {
    setIsEditSchoolModalVisible(false);
  };

  const handleSchoolDataSaved = () => {
    // Refresh the data after saving
    fetchData();
  };

  const handlePrint = async () => {
    if (!schoolId) {
      alert("Unable to print: Missing school ID.");
      return;
    }

    setIsPrinting(true);

    try {
      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("You must be logged in to print. Please log in and try again.");
        setIsPrinting(false);
        return;
      }

      // Fetch user details to get customer ID
      const userDetails = await fetchUserDetails();
      if (!userDetails?.customer_id) {
        alert("Unable to print: Missing user details. Please try refreshing the page.");
        setIsPrinting(false);
        return;
      }

      // Convert school ID using the conversion table
      let convertedSchoolId;
      try {
        convertedSchoolId = await convertSchoolId(schoolId);
      } catch (conversionError) {
        alert("Error converting school ID. Please try again.");
        setIsPrinting(false);
        return;
      }

      // Get email from the authentication session
      const coachEmail = session.user.email || "";

      // Prepare the request data (without cover_page)
      const requestData = await preparePrintRequestData(
        [convertedSchoolId],
        userDetails,
        coachEmail,
        {
          min_print_level: null, // You can add filtering options later if needed
          min_grad_year: null
        }
      );

      // Send request to the cloud function
      await sendPrintRequest(requestData);

      // Show success message
      alert("Print request submitted successfully! You'll receive the PDF via email shortly.");

    } catch (error) {
      console.error("Error with print request:", error);
      alert("An error occurred while processing your print request. Please try again.");
    } finally {
      setIsPrinting(false);
    }
  };

  // Function to transform submitted athlete data into table format
  const transformSubmittedAthleteData = (playerData: any) => {
    // Calculate height from feet, inches, and eighths
    let height = '';
    if (playerData.feet && playerData.inches) {
      const totalInches = (playerData.feet * 12) + playerData.inches + (playerData.eighths || 0) / 8;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.floor(totalInches % 12);
      height = `${feet}'${inches}"`;
    }

    return {
      key: playerData.athleteId,
      athlete_id: playerData.athleteId,
      name: `${playerData.firstName} ${playerData.lastName}`,
      gradYear: playerData.year || '',
      athleticProjection: '-', // Will be calculated by materialized view
      bestOffer: 'None',
      gpa: playerData.gpa?.toString() || '',
      position: playerData.position || '',
      height: height,
      weight: playerData.weight?.toString() || '',
      highlight: playerData.highlightTape || '',
      score: 0,
      initials: `${playerData.firstName?.[0] || ''}${playerData.lastName?.[0] || ''}`,
      isRecentlyAdded: true // Flag to show it's recently added
    };
  };

  const handleAddPlayer = async (playerData: any) => {
    console.log('Adding player:', playerData);
    
    // Transform the submitted data and add to recently added athletes
    const transformedAthlete = transformSubmittedAthleteData(playerData);
    console.log('Transformed athlete data:', transformedAthlete);
    
    setRecentlyAddedAthletes(prev => {
      const newList = [...prev, transformedAthlete];
      console.log('Updated recently added athletes list:', newList);
      return newList;
    });
    
    // Clean up after 2 minutes (when materialized view should be refreshed)
    setTimeout(() => {
      setRecentlyAddedAthletes(prev => {
        const newList = prev.filter(athlete => athlete.athlete_id !== playerData.athleteId);
        console.log('Removed athlete from recently added list:', playerData.athleteId);
        return newList;
      });
    }, 2 * 60 * 1000); // 2 minutes
    
    // Refresh the main data
    await fetchData();
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
                <span>State: {schoolFacts.find(fact => fact.data_type_id === 253)?.value || 'N/A'} </span> <span>/</span>{" "}
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
              onClick={handleOpenEditSchoolModal}
              title="Edit School Information"
            />
            <div className="vertical-border"></div>
            <Button
              icon={
                isPrinting ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  <i className="icon-printer text-2xl flex items-center justify-center"></i>
                )
              }
              type="text"
              onClick={handlePrint}
              disabled={isPrinting}
              title={isPrinting ? "Generating PDF..." : "Print School Report"}
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
                    const homePhone = coachInfo?.facts?.find((fact: any) => fact.data_type_id === 968)?.value;
                    const cellPhone = coachInfo?.facts?.find((fact: any) => fact.data_type_id === 27)?.value;
                    const officePhone = coachInfo?.facts?.find((fact: any) => fact.data_type_id === 967)?.value;
                    
                    return (
                      <>
                        {homePhone && (
                          <div>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'home_phone' ? 'font-bold' : ''}`}>
                              Home {coachInfo?.best_phone === 'home_phone' ? '(Best)' : ''}
                            </p>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'home_phone' ? 'font-bold' : ''}`}>
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
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'cell_phone' ? 'font-bold' : ''}`}>
                              Cell {coachInfo?.best_phone === 'cell_phone' ? '(Best)' : ''}
                            </p>
                            <p className={`text-sm text-gray-800 mb-0 ${coachInfo?.best_phone === 'cell_phone' ? 'font-bold' : 'font-semibold'}`}>
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
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'office_phone' ? 'font-bold' : ''}`}>
                              Office {coachInfo?.best_phone === 'office_phone' ? '(Best)' : ''}
                            </p>
                            <p className={`text-sm text-black mb-0 ${coachInfo?.best_phone === 'office_phone' ? 'font-bold' : ''}`}>
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
                
                {/* Visit Info Section */}
                {(() => {
                  const visitInfo = schoolFacts.find(fact => fact.data_type_id === 926)?.value;
                  return visitInfo ? (
                    <div className="mt-4">
                      <p className="text-sm text-gray-800 mb-0">
                        <strong>Visit Info:</strong> {visitInfo}
                      </p>
                    </div>
                  ) : null;
                })()}
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
                        if (!maxPrepsLink) return '';
                        const formattedLink = maxPrepsLink.startsWith('http://') || maxPrepsLink.startsWith('https://') 
                          ? maxPrepsLink 
                          : `https://${maxPrepsLink}`;
                        return (
                          <p className="text-size">
                            <a href={formattedLink} target="_blank" rel="noopener noreferrer" className="text-[#126DB8] !font-medium cursor-pointer">
                              Link
                            </a>
                          </p>
                        );
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

          <Button 
            type="primary" 
            size="large" 
            className="bg-primary"
            onClick={handleOpenAddPlayerModal}
          >
            <i className="icon-user text-white"></i>
            Add Athlete
          </Button>
        </Flex>


        <div className="prospects-table-container">
        <Table
          columns={columns}
          dataSource={prospectsData}
          rowKey="key"
          loading={loading}
          pagination={{
            pageSize: 50,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} prospects`,
          }}
          scroll={{ x: 1000 }}
          className="prospects-table"
          rowClassName={(record) => 
            record.isRecentlyAdded ? 'bg-blue-50 border-l-4 border-blue-400' : ''
          }
          sortDirections={['ascend', 'descend']}
          onChange={(pagination, filters, sorter) => {
            console.log('Table onChange - filters:', filters);
            setTableFilters(filters);
            setCurrentFilters(filters);
            setTableSorting({
              field: Array.isArray(sorter) ? (sorter[0]?.field as string) || '' : (sorter?.field as string) || '',
              order: Array.isArray(sorter) ? (sorter[0]?.order as 'ascend' | 'descend' | null) || null : (sorter?.order as 'ascend' | 'descend' | null) || null
            });
          }}
            locale={{
              emptyText: error ? (
                <div className="flex flex-col items-center py-8 text-gray-500">
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
              ) : (
                <div className="flex flex-col items-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p className="text-lg font-medium">No prospects found</p>
                    <p className="text-sm">This school may not have any prospects in the current database.</p>
                  </div>
              )
            }}
          />
                            </div>
      </div>
  );

  // Handle athlete modal close
  const handleCloseAthleteModal = () => {
    setIsAthleteModalVisible(false);
    setSelectedAthleteId(null);
  };

  // Handle closing the modal/page
  const handleClose = () => {
    if (isInModal) {
      // When in a modal, try to go back
      router.back();
    } else {
      // When not in a modal, navigate back to high schools list
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('schoolId');
      params.delete('dataSource');
      
      const queryString = params.toString();
      if (queryString) {
        router.push(`/high-schools?${queryString}`);
      } else {
        // Default: go back in history, or navigate to a safe route
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push('/high-schools');
        }
      }
    }
  };

  // If in modal, return just the content
  if (isInModal) {
    return (
      <>
        {content}
        <AddPlayerModal
          isVisible={isAddPlayerModalVisible}
          onClose={handleCloseAddPlayerModal}
          schoolName={schoolName}
          schoolId={schoolId}
          onAddPlayer={handleAddPlayer}
        />
        <EditSchoolModal
          isVisible={isEditSchoolModalVisible}
          onClose={handleCloseEditSchoolModal}
          schoolName={schoolName}
          schoolId={schoolId}
          onSave={handleSchoolDataSaved}
        />
        
        {/* Athlete Profile Modal */}
        <Modal
          title={null}
          open={isAthleteModalVisible}
          onCancel={handleCloseAthleteModal}
          footer={null}
          width="95vw"
          style={{ top: 20 }}
          className="new-modal-ui"
          styles={{ 
            body: {
              height: 'calc(100vh - 100px)',
              overflow: 'hidden'
            }
          }}
          destroyOnHidden={true}
          closable={true}
          maskClosable={true}
        >
          {selectedAthleteId ? (
            <div style={{ height: '100%', overflow: 'auto' }}>
              {selectedAthleteDataSource === 'hs_athletes' ? (
                <HSAthleteProfileContent
                  athleteId={selectedAthleteId}
                  onAddToBoard={() => {}}
                  isInModal={true}
                  dataSource={'hs_athletes'}
                  onClose={handleCloseAthleteModal}
                />
              ) : (
                <AthleteProfileContent
                  athleteId={selectedAthleteId}
                  onAddToBoard={() => {}}
                  isInModal={true}
                  dataSource={selectedAthleteDataSource}
                  onClose={handleCloseAthleteModal}
                />
              )}
            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '50vh' 
            }}>
              <div>Player not found</div>
            </div>
          )}
        </Modal>
      </>
    );
  }

  // If not in modal, wrap in modal for standalone page
  return (
    <>
      <style jsx>{`
        .prospects-table-container {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .prospects-table .ant-table-thead > tr > th {
          background: #f8f9fa;
          border-bottom: 2px solid #e9ecef;
          font-weight: 600;
          color: #495057;
          padding: 12px 16px;
        }
        
        .prospects-table .ant-table-tbody > tr > td {
          padding: 12px 16px;
          border-bottom: 1px solid #e9ecef;
        }
        
        .prospects-table .ant-table-tbody > tr:hover > td {
          background: #f8f9fa;
        }
        
        .prospects-table .ant-table-filter-trigger {
          color: #6c757d;
        }
        
        .prospects-table .ant-table-filter-trigger:hover {
          color: #495057;
        }
        
        .prospects-table .ant-table-sort-icon {
          color: #6c757d;
        }
        
        .prospects-table .ant-table-sort-icon:hover {
          color: #495057;
        }
        
        /* Active filter styles */
        .prospects-table .ant-table-thead > tr > th.ant-table-column-has-filters.ant-table-column-sort {
          background: #e6f7ff !important;
          border-bottom: 2px solid #1890ff !important;
        }
        
        .prospects-table .ant-table-thead > tr > th.ant-table-column-has-filters {
          background: #e6f7ff !important;
          border-bottom: 2px solid #1890ff !important;
        }
        
        .prospects-table .ant-table-filter-trigger.ant-table-filter-trigger-active {
          color: #1890ff !important;
          background: #1890ff !important;
          border-radius: 4px !important;
          padding: 2px 4px !important;
        }
        
        .prospects-table .ant-table-filter-trigger.ant-table-filter-trigger-active .anticon {
          color: white !important;
          font-size: 14px !important;
        }
        
        .prospects-table .ant-table-filter-trigger.ant-table-filter-trigger-active:hover {
          background: #40a9ff !important;
        }
      `}</style>
      <Modal
        open={true}
        onCancel={handleClose}
        width={"90%"}
        centered
        footer={null}
        className="new-modal"
      >
        <button className="close" onClick={handleClose}></button>
        {content}
      </Modal>
      <AddPlayerModal
        isVisible={isAddPlayerModalVisible}
        onClose={handleCloseAddPlayerModal}
        schoolName={schoolName}
        schoolId={schoolId}
        onAddPlayer={handleAddPlayer}
      />
      <EditSchoolModal
        isVisible={isEditSchoolModalVisible}
        onClose={handleCloseEditSchoolModal}
        schoolName={schoolName}
        schoolId={schoolId}
        onSave={handleSchoolDataSaved}
      />
    </>
  );
}
