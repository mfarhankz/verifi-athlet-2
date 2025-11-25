"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Card, Input, Table, Tag, Modal, Button, Typography, message, Result, Spin, Select, Tabs } from "antd";
import { AppstoreAddOutlined, CopyOutlined } from '@ant-design/icons';
import { supabase } from "@/lib/supabaseClient";
import { fetchDataOpsHsAthletes, fetchDataOpsHighSchools, fetchAllDataTypes, fetchAthleteDataTypes, fetchAthleteFactData, insertAthleteFact, updateAthleteBasicInfo, fetchAthleteSchoolHistory, searchSchools, updateAthleteSchoolRecord, transferAthlete, checkUserAthleteAccess, markAthleteFactInactive, fetchStates, fetchCountiesByStateId, insertSchool, insertSchoolFact, fetchSports, saveNewCoach, fetchCoachDataTypesInUse } from '@/lib/queries';
import { useRouter, useSearchParams } from 'next/navigation';

const { Text } = Typography;

function DataOpsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(searchParams?.get('tab') || 'athletes');
  
  // Athlete table state
  const [athleteData, setAthleteData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });
  const [sortConfig, setSortConfig] = useState<{ field: string | null; order: 'ascend' | 'descend' | null }>({
    field: 'athlete_last_name',
    order: 'ascend',
  });
  
  // High School table state
  const [highSchoolData, setHighSchoolData] = useState<any[]>([]);
  const [loadingHighSchoolData, setLoadingHighSchoolData] = useState(false);
  const [highSchoolSearchInput, setHighSchoolSearchInput] = useState<string>('');
  const [highSchoolPagination, setHighSchoolPagination] = useState({
    current: 1,
    pageSize: 25,
    total: 0,
  });
  const [highSchoolSortConfig, setHighSchoolSortConfig] = useState<{ field: string | null; order: 'ascend' | 'descend' | null }>({
    field: 'school_name',
    order: 'ascend',
  });

  // Athlete modal state
  const [selectedAthlete, setSelectedAthlete] = useState<any>(null);
  const [isAthleteModalVisible, setIsAthleteModalVisible] = useState(false);
  const [dataTypes, setDataTypes] = useState<any[]>([]);
  const [loadingDataTypes, setLoadingDataTypes] = useState(false);
  const [selectedField, setSelectedField] = useState<string>('');
  const [athleteFactData, setAthleteFactData] = useState<any>(null);
  const [loadingFactData, setLoadingFactData] = useState(false);
  const [newFactValue, setNewFactValue] = useState<string>('');
  const [savingFact, setSavingFact] = useState(false);
  const [markingInactive, setMarkingInactive] = useState(false);
  const [gpaSource, setGpaSource] = useState<string>('verified');

  // Athlete basic info editing states
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [editingFirstName, setEditingFirstName] = useState('');
  const [editingLastName, setEditingLastName] = useState('');
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);

  // School management states
  const [athleteSchoolHistory, setAthleteSchoolHistory] = useState<any[]>([]);
  const [loadingSchoolHistory, setLoadingSchoolHistory] = useState(false);
  const [schoolSearchResults, setSchoolSearchResults] = useState<any[]>([]);
  const [loadingSchoolSearch, setLoadingSchoolSearch] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [isEditingSchoolRecord, setIsEditingSchoolRecord] = useState(false);
  const [editingSchoolRecord, setEditingSchoolRecord] = useState<any>(null);
  const [isTransferringAthlete, setIsTransferringAthlete] = useState(false);
  const [transferDate, setTransferDate] = useState('');
  const [selectedTransferSchool, setSelectedTransferSchool] = useState<any>(null);
  const [savingSchoolChanges, setSavingSchoolChanges] = useState(false);

  // Add High School form state
  const [isAddSchoolModalVisible, setIsAddSchoolModalVisible] = useState(false);
  const [schoolName, setSchoolName] = useState('');
  const [selectedState, setSelectedState] = useState<number | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<number | null>(null);
  const [states, setStates] = useState<{ id: number; abbrev: string; name: string }[]>([]);
  const [counties, setCounties] = useState<{ id: number; name: string }[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [privatePublic, setPrivatePublic] = useState<string>('');
  const [athleticDirectorFirstName, setAthleticDirectorFirstName] = useState('');
  const [athleticDirectorLastName, setAthleticDirectorLastName] = useState('');
  const [athleticDirectorEmail, setAthleticDirectorEmail] = useState('');
  const [coachFirstName, setCoachFirstName] = useState('');
  const [coachLastName, setCoachLastName] = useState('');
  const [coachStartDate, setCoachStartDate] = useState('');
  const [coachFacts, setCoachFacts] = useState<{[key: string]: string}>({});
  const [coachDataTypes, setCoachDataTypes] = useState<any[]>([]);
  const [loadingCoachDataTypes, setLoadingCoachDataTypes] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);

  // Generalized debounced search hook
  const useDebouncedSearch = (searchInput: string, delay: number = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(searchInput);

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedValue(searchInput);
      }, delay);
      return () => clearTimeout(timer);
    }, [searchInput, delay]);

    return debouncedValue;
  };

  const debouncedSearch = useDebouncedSearch(searchInput);
  const debouncedHighSchoolSearch = useDebouncedSearch(highSchoolSearchInput);

  // Sync activeTab with URL parameter
  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam && (tabParam === 'athletes' || tabParam === 'highschools')) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Check access on mount
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const hasAccessResult = await checkUserAthleteAccess(session.user.id);
        setHasAccess(hasAccessResult);
      } catch (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoadingData(true);
      const result = await fetchDataOpsHsAthletes({
        page: pagination.current,
        limit: pagination.pageSize,
        search: debouncedSearch,
        sortField: sortConfig.field,
        sortOrder: sortConfig.order,
      });
      setAthleteData(result.data);
      setPagination(prev => ({ ...prev, total: result.totalCount || 0 }));
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch high school data
  const fetchHighSchoolData = async () => {
    try {
      setLoadingHighSchoolData(true);
      const result = await fetchDataOpsHighSchools({
        page: highSchoolPagination.current,
        limit: highSchoolPagination.pageSize,
        search: debouncedHighSchoolSearch,
        sortField: highSchoolSortConfig.field,
        sortOrder: highSchoolSortConfig.order,
      });
      setHighSchoolData(result.data);
      setHighSchoolPagination(prev => ({ ...prev, total: result.totalCount || 0 }));
    } catch (error) {
      console.error('Error fetching high school data:', error);
      message.error('Failed to load high school data');
    } finally {
      setLoadingHighSchoolData(false);
    }
  };

  useEffect(() => {
    if (hasAccess && activeTab === 'athletes') {
      fetchData();
    }
  }, [hasAccess, activeTab, pagination.current, pagination.pageSize, debouncedSearch, sortConfig]);

  useEffect(() => {
    if (hasAccess && activeTab === 'highschools') {
      fetchHighSchoolData();
    }
  }, [hasAccess, activeTab, highSchoolPagination.current, highSchoolPagination.pageSize, debouncedHighSchoolSearch, highSchoolSortConfig]);

  // Load states on mount
  useEffect(() => {
    const loadStates = async () => {
      try {
        setLoadingStates(true);
        const statesData = await fetchStates();
        setStates(statesData);
      } catch (error) {
        console.error('Error loading states:', error);
      } finally {
        setLoadingStates(false);
      }
    };
    loadStates();
  }, []);

  // Load counties when state changes
  useEffect(() => {
    const loadCounties = async () => {
      if (!selectedState) {
        setCounties([]);
        setSelectedCounty(null);
        return;
      }
      try {
        setLoadingCounties(true);
        const countiesData = await fetchCountiesByStateId(selectedState);
        setCounties(countiesData);
        setSelectedCounty(null); // Reset county selection when state changes
      } catch (error) {
        console.error('Error loading counties:', error);
      } finally {
        setLoadingCounties(false);
      }
    };
    loadCounties();
  }, [selectedState]);

  // Load coach data types when modal opens
  useEffect(() => {
    const loadCoachDataTypes = async () => {
      if (!isAddSchoolModalVisible) return;
      try {
        setLoadingCoachDataTypes(true);
        const dataTypes = await fetchCoachDataTypesInUse();
        setCoachDataTypes(dataTypes);
      } catch (error) {
        console.error('Error loading coach data types:', error);
      } finally {
        setLoadingCoachDataTypes(false);
      }
    };
    loadCoachDataTypes();
  }, [isAddSchoolModalVisible]);

  // Function to fetch all data types and mark which ones the athlete has
  const loadAthleteDataTypes = async (athleteId: string) => {
    try {
      setLoadingDataTypes(true);
      
      const allDataTypes = await fetchAllDataTypes();
      
      const initialDataTypes = allDataTypes?.map((dataType: any) => ({
        ...dataType,
        athleteHasIt: false
      })) || [];
      
      setDataTypes(initialDataTypes);
      setLoadingDataTypes(false);
      
      try {
        const athleteData = await fetchAthleteDataTypes(athleteId);
        const athleteDataTypeIds: number[] = (athleteData as unknown as { data_type_id: number }[])?.map((item: { data_type_id: number }) => item.data_type_id) || [];
        
        setDataTypes((prevDataTypes: any[]) => {
          return prevDataTypes.map((dataType: any) => ({
            ...dataType,
            athleteHasIt: athleteDataTypeIds.includes(dataType.id)
          }));
        });
      } catch (athleteError) {
        console.error('Error loading athlete data types:', athleteError);
      }
      
    } catch (error: any) {
      console.error('Error loading all data types:', error);
      message.error(`Error loading data types: ${error?.message || 'Failed to load data types'}`);
      setDataTypes([]);
      setLoadingDataTypes(false);
    }
  };

  // Function to save a new athlete fact
  const saveAthleteFact = async (athleteId: string, dataTypeName: string, value: string) => {
    try {
      setSavingFact(true);
      
      const dataType = dataTypes.find(dt => dt.name === dataTypeName);
      if (!dataType) {
        return;
      }
      
      // Use selected source for GPA, otherwise use default
      const source = dataTypeName?.toUpperCase() === 'GPA' ? gpaSource : undefined;
      
      await insertAthleteFact(athleteId, dataType.id, value, source);
      await loadAthleteFactData(athleteId, dataTypeName);
      setNewFactValue('');
      message.success('Fact saved successfully');
    } catch (error) {
      message.error('Failed to save fact');
    } finally {
      setSavingFact(false);
    }
  };

  // Function to mark athlete fact as inactive
  const handleMarkFactInactive = async () => {
    if (!athleteFactData || !selectedAthlete || !selectedField) {
      message.error('Missing required data to mark fact as inactive');
      return;
    }
    
    // Check if id exists - it should be present when selecting * from athlete_fact
    if (!athleteFactData.id) {
      message.error('Fact ID not found. Please refresh and try again.');
      return;
    }
    
    try {
      setMarkingInactive(true);
      // Convert id to string if it's a number
      const factId = String(athleteFactData.id);
      await markAthleteFactInactive(factId);
      message.success('Fact and all other facts with the same data type marked as inactive');
      // Clear the fact data since it's now inactive
      setAthleteFactData(null);
    } catch (error: any) {
      message.error(`Failed to mark fact as inactive: ${error?.message || 'Unknown error'}`);
    } finally {
      setMarkingInactive(false);
    }
  };

  // Function to save athlete basic info
  const saveAthleteBasicInfo = async () => {
    if (!selectedAthlete) return;
    
    try {
      setSavingBasicInfo(true);
      
      const updates: { first_name?: string; last_name?: string } = {};
      if (editingFirstName.trim()) {
        updates.first_name = editingFirstName.trim();
      }
      if (editingLastName.trim()) {
        updates.last_name = editingLastName.trim();
      }
      
      if (Object.keys(updates).length === 0) {
        return;
      }
      
      await updateAthleteBasicInfo(selectedAthlete.athlete_id, updates);
      
      setSelectedAthlete({
        ...selectedAthlete,
        athlete_first_name: updates.first_name || selectedAthlete.athlete_first_name,
        athlete_last_name: updates.last_name || selectedAthlete.athlete_last_name
      });
      
      setIsEditingBasicInfo(false);
      setEditingFirstName('');
      setEditingLastName('');
      
      await fetchData();
      message.success('Basic info updated successfully');
    } catch (error) {
      message.error('Failed to update basic info');
    } finally {
      setSavingBasicInfo(false);
    }
  };

  // Function to load athlete school history
  const loadAthleteSchoolHistory = async (athleteId: string) => {
    try {
      setLoadingSchoolHistory(true);
      const history = await fetchAthleteSchoolHistory(athleteId);
      setAthleteSchoolHistory(history);
    } catch (error) {
      console.error('Error loading school history:', error);
    } finally {
      setLoadingSchoolHistory(false);
    }
  };

  // Function to search schools
  const searchSchoolsForTransfer = async (query: string) => {
    if (!query.trim()) {
      setSchoolSearchResults([]);
      return;
    }
    
    try {
      setLoadingSchoolSearch(true);
      const schools = await searchSchools(query);
      setSchoolSearchResults(schools.data);
    } catch (error) {
      console.error('Error searching schools:', error);
    } finally {
      setLoadingSchoolSearch(false);
    }
  };

  // Function to save school record changes
  const saveSchoolRecordChanges = async () => {
    if (!editingSchoolRecord) return;
    
    try {
      setSavingSchoolChanges(true);
      
      const updates: { school_id?: string; start_date?: string; end_date?: string } = {};
      
      if (editingSchoolRecord.school_id !== editingSchoolRecord.originalSchoolId) {
        updates.school_id = editingSchoolRecord.school_id;
      }
      if (editingSchoolRecord.start_date !== editingSchoolRecord.originalStartDate) {
        updates.start_date = editingSchoolRecord.start_date;
      }
      if (editingSchoolRecord.end_date !== editingSchoolRecord.originalEndDate) {
        updates.end_date = editingSchoolRecord.end_date;
      }
      
      if (Object.keys(updates).length === 0) {
        return;
      }
      
      await updateAthleteSchoolRecord(editingSchoolRecord.id, updates);
      await loadAthleteSchoolHistory(selectedAthlete?.athlete_id);
      setIsEditingSchoolRecord(false);
      setEditingSchoolRecord(null);
      message.success('School record updated successfully');
    } catch (error) {
      message.error('Failed to update school record');
    } finally {
      setSavingSchoolChanges(false);
    }
  };

  // Function to transfer athlete
  const handleAthleteTransfer = async () => {
    if (!selectedAthlete || !selectedTransferSchool || !transferDate) return;
    
    try {
      setSavingSchoolChanges(true);
      
      await transferAthlete(selectedAthlete.athlete_id, selectedTransferSchool.id, transferDate);
      await loadAthleteSchoolHistory(selectedAthlete.athlete_id);
      
      setIsTransferringAthlete(false);
      setSelectedTransferSchool(null);
      setTransferDate('');
      setSchoolSearchQuery('');
      setSchoolSearchResults([]);
      message.success('Athlete transferred successfully');
    } catch (error) {
      message.error('Failed to transfer athlete');
    } finally {
      setSavingSchoolChanges(false);
    }
  };

  // Function to fetch athlete fact data
  const loadAthleteFactData = async (athleteId: string, dataTypeName: string) => {
    try {
      setLoadingFactData(true);
      
      const dataType = dataTypes.find(dt => dt.name === dataTypeName);
      
      if (!dataType) {
        return;
      }
      
      const data = await fetchAthleteFactData(athleteId, dataType.id, 1);
      
      if (!data || data.length === 0) {
        setAthleteFactData(null);
        return;
      }
      
      setAthleteFactData(data[0]);
    } catch (error) {
      console.error('Error loading athlete fact data:', error);
    } finally {
      setLoadingFactData(false);
    }
  };

  // Function to handle athlete row click
  const handleAthleteClick = (athlete: any) => {
    setSelectedAthlete(athlete);
    setSelectedField('');
    setAthleteFactData(null);
    setNewFactValue('');
    setGpaSource('verified'); // Reset to default
    setIsAthleteModalVisible(true);
    loadAthleteDataTypes(athlete.athlete_id);
  };

  // Table columns
  const columns = [
    {
      title: 'Athlete ID',
      dataIndex: 'athlete_id',
      key: 'athlete_id',
      width: 300,
      render: (id: string, record: any) => (
        <Text 
          code 
          style={{ cursor: 'pointer', color: '#1890ff' }}
          onClick={(e) => {
            e.stopPropagation();
            handleAthleteClick(record);
          }}
        >
          {id}
        </Text>
      ),
      sorter: true,
    },
    {
      title: 'First Name',
      dataIndex: 'athlete_first_name',
      key: 'athlete_first_name',
      sorter: true,
    },
    {
      title: 'Last Name',
      dataIndex: 'athlete_last_name',
      key: 'athlete_last_name',
      sorter: true,
      defaultSortOrder: 'ascend' as const,
    },
    {
      title: 'Grad Year',
      dataIndex: 'grad_year',
      key: 'grad_year',
      sorter: true,
    },
    {
      title: 'School',
      dataIndex: 'school_name',
      key: 'school_name',
      sorter: true,
    },
    {
      title: 'School ID',
      dataIndex: 'school_id',
      key: 'school_id',
      width: 300,
      render: (id: string) => id ? <Text code>{id}</Text> : '-',
      sorter: true,
    },
    {
      title: 'Email',
      dataIndex: 'athlete_email',
      key: 'athlete_email',
      sorter: true,
    },
    {
      title: 'Phone',
      dataIndex: 'athlete_cell',
      key: 'athlete_cell',
      sorter: true,
    },
    {
      title: 'hs_highlight',
      dataIndex: 'hs_highlight',
      key: 'hs_highlight',
      render: (link: string) => link ? (
        <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">
          {link.startsWith('http') ? link : `https://${link}`}
        </a>
      ) : '-',
    },
    {
      title: 'Address',
      dataIndex: 'athlete_address_street',
      key: 'athlete_address_street',
      render: (address: string) => address ? <Text ellipsis={{ tooltip: address }}>{address}</Text> : '-',
    },
    {
      title: 'City',
      dataIndex: 'athlete_address_city',
      key: 'athlete_address_city',
      sorter: true,
    },
    {
      title: 'Zip',
      dataIndex: 'athlete_address_zip',
      key: 'athlete_address_zip',
      sorter: true,
    },
    {
      title: 'Address State',
      dataIndex: 'address_state',
      key: 'address_state',
      sorter: true,
    },
    {
      title: 'Twitter',
      dataIndex: 'twitter',
      key: 'twitter',
      render: (twitter: string) => twitter ? (
        <a href={`https://twitter.com/${twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
          @{twitter.replace('@', '')}
        </a>
      ) : '-',
    },
    {
      title: 'Instagram',
      dataIndex: 'instagram',
      key: 'instagram',
      render: (instagram: string) => instagram ? (
        <a href={`https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
          @{instagram.replace('@', '')}
        </a>
      ) : '-',
    },
    {
      title: '247 Link',
      dataIndex: '_247_link',
      key: '_247_link',
      render: (link: string) => link ? (
        <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">
          {link.startsWith('http') ? link : `https://${link}`}
        </a>
      ) : '-',
    },
    {
      title: 'On3 Link',
      dataIndex: 'on3_link',
      key: 'on3_link',
      render: (link: string) => link ? (
        <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">
          {link.startsWith('http') ? link : `https://${link}`}
        </a>
      ) : '-',
    },
    {
      title: 'Bio',
      dataIndex: 'bio',
      key: 'bio',
      render: (bio: string) => bio ? <Text ellipsis={{ tooltip: bio }}>{bio}</Text> : '-',
    },
    {
      title: 'Award',
      dataIndex: 'award',
      key: 'award',
      sorter: true,
    },
    {
      title: 'Birthday',
      dataIndex: 'birthday',
      key: 'birthday',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: true,
    },
    {
      title: 'GPA',
      dataIndex: 'gpa',
      key: 'gpa',
      sorter: true,
    },
    {
      title: 'ACT',
      dataIndex: 'act',
      key: 'act',
      sorter: true,
    },
    {
      title: 'SAT',
      dataIndex: 'sat',
      key: 'sat',
      sorter: true,
    },
    {
      title: 'Transcript Link',
      dataIndex: 'transcript_link',
      key: 'transcript_link',
      render: (link: string) => link ? (
        <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">
          {link.startsWith('http') ? link : `https://${link}`}
        </a>
      ) : '-',
    },
    {
      title: 'Transcript Checked',
      dataIndex: 'transcript_checked',
      key: 'transcript_checked',
      render: (checked: boolean) => checked ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>,
      sorter: true,
    },
    {
      title: 'Height',
      key: 'height',
      render: (_: any, record: any) => {
        const feet = record.height_feet;
        const inches = record.height_inch;
        if (feet && inches) {
          return `${feet}'${inches}"`;
        }
        return '-';
      },
    },
    {
      title: 'Weight',
      dataIndex: 'weight',
      key: 'weight',
      sorter: true,
    },
    {
      title: 'Mile Split Link',
      dataIndex: 'mile_split_link',
      key: 'mile_split_link',
      render: (link: string) => link ? (
        <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer">
          {link.startsWith('http') ? link : `https://${link}`}
        </a>
      ) : '-',
    },
    {
      title: 'All Position',
      dataIndex: 'all_position',
      key: 'all_position',
      sorter: true,
    },
    {
      title: 'Zillow Address',
      dataIndex: 'zillow_address',
      key: 'zillow_address',
      render: (address: string) => address ? <Text ellipsis={{ tooltip: address }}>{address}</Text> : '-',
    },
    {
      title: 'Parent Name',
      dataIndex: 'parent_name',
      key: 'parent_name',
      sorter: true,
    },
    {
      title: 'Parent Email',
      dataIndex: 'parent_email',
      key: 'parent_email',
      sorter: true,
    },
    {
      title: 'Parent Phone',
      dataIndex: 'parent_phone',
      key: 'parent_phone',
      sorter: true,
    },
    {
      title: 'Captain?',
      dataIndex: 'captain',
      key: 'captain',
      render: (captain: boolean) => captain ? <Tag color="green">Yes</Tag> : <Tag color="default">No</Tag>,
      sorter: true,
    },
    {
      title: 'HS Coach Remove Reason',
      dataIndex: 'hs_coach_remove_reason',
      key: 'hs_coach_remove_reason',
      render: (reason: string) => reason ? <Text ellipsis={{ tooltip: reason }}>{reason}</Text> : '-',
    },
    {
      title: 'Athlete Original Source',
      dataIndex: 'athlete_original_source',
      key: 'athlete_original_source',
      sorter: true,
    },
    {
      title: 'Hide Athlete',
      dataIndex: 'hide_athlete',
      key: 'hide_athlete',
      render: (hide: boolean) => hide ? <Tag color="red">Hidden</Tag> : <Tag color="green">Visible</Tag>,
      sorter: true,
    },
    {
      title: 'HS Coach Rating',
      dataIndex: 'hs_coach_rating',
      key: 'hs_coach_rating',
      sorter: true,
    },
    {
      title: 'Added Date',
      dataIndex: 'added_date',
      key: 'added_date',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: true,
    },
    {
      title: 'Athletic Projection',
      dataIndex: 'athletic_projection',
      key: 'athletic_projection',
      sorter: true,
    },
    {
      title: 'hs_coach_hide',
      dataIndex: 'hs_coach_hide',
      key: 'hs_coach_hide',
      render: (hide: boolean) => hide ? <Tag color="red">Hidden</Tag> : <Tag color="green">Visible</Tag>,
    },
    {
      title: 'Major',
      dataIndex: 'major',
      key: 'major',
      sorter: true,
    },
    {
      title: 'Previous Schools',
      dataIndex: 'previous_schools',
      key: 'previous_schools',
    },
    {
      title: 'Last Major Change',
      dataIndex: 'last_major_change',
      key: 'last_major_change',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: true,
    },
  ];

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    });
    
    if (sorter.field) {
      setSortConfig({
        field: sorter.field,
        order: sorter.order,
      });
    } else {
      setSortConfig({ field: null, order: null });
    }
  };

  const handleHighSchoolTableChange = (pagination: any, filters: any, sorter: any) => {
    setHighSchoolPagination({
      current: pagination.current,
      pageSize: pagination.pageSize,
      total: pagination.total,
    });
    
    if (sorter.field) {
      setHighSchoolSortConfig({
        field: sorter.field,
        order: sorter.order,
      });
    } else {
      setHighSchoolSortConfig({ field: null, order: null });
    }
  };

  // Function to copy school_id to clipboard
  const copySchoolId = async (schoolId: string) => {
    try {
      await navigator.clipboard.writeText(schoolId);
      message.success('School ID copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      message.error('Failed to copy School ID');
    }
  };

  // Function to copy school name to clipboard
  const copySchoolName = async (schoolName: string) => {
    try {
      await navigator.clipboard.writeText(schoolName);
      message.success('School name copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
      message.error('Failed to copy school name');
    }
  };

  // Function to handle adding a new high school
  const handleAddHighSchool = async () => {
    if (!schoolName.trim()) {
      message.error('School name is required');
      return;
    }

    try {
      setSavingSchool(true);

      // 1. Insert school name into school table
      const schoolId = await insertSchool(schoolName.trim());

      // 2. Insert school state fact (data_type_id 253) - source: manual_admin
      if (selectedState) {
        const selectedStateData = states.find(s => s.id === selectedState);
        if (selectedStateData) {
          await insertSchoolFact(schoolId, 253, selectedStateData.abbrev);
        }
      }

      // 3. Insert school county fact (data_type_id 966) - store county ID, source: manual_admin
      if (selectedCounty) {
        await insertSchoolFact(schoolId, 966, selectedCounty.toString());
      }

      // 4. Insert private/public fact (data_type_id 928) - source: manual_admin
      if (privatePublic) {
        await insertSchoolFact(schoolId, 928, privatePublic);
      }

      // 5. Insert athletic director facts - all with source: manual_admin
      if (athleticDirectorFirstName.trim()) {
        await insertSchoolFact(schoolId, 932, athleticDirectorFirstName.trim());
      }
      if (athleticDirectorLastName.trim()) {
        await insertSchoolFact(schoolId, 933, athleticDirectorLastName.trim());
      }
      if (athleticDirectorEmail.trim()) {
        await insertSchoolFact(schoolId, 934, athleticDirectorEmail.trim());
      }

      // 6. Create coach if provided
      if (coachFirstName.trim() && coachLastName.trim() && coachStartDate) {
        const sports = await fetchSports();
        const footballSport = sports.find(sport => sport.name.toLowerCase().includes('football'));
        
        if (!footballSport) {
          message.warning('Football sport not found. School created but coach not added.');
        } else {
          await saveNewCoach(
            coachFirstName.trim(),
            coachLastName.trim(),
            schoolId,
            footballSport.id,
            coachStartDate,
            null, // No end date for new coach
            coachFacts,
            coachDataTypes.filter(dt => dt.name)
          );
        }
      }

      // Reset form
      setSchoolName('');
      setSelectedState(null);
      setSelectedCounty(null);
      setPrivatePublic('');
      setAthleticDirectorFirstName('');
      setAthleticDirectorLastName('');
      setAthleticDirectorEmail('');
      setCoachFirstName('');
      setCoachLastName('');
      setCoachStartDate('');
      setCoachFacts({});
      setIsAddSchoolModalVisible(false);

      // Refresh high school data
      await fetchHighSchoolData();
      message.success('High school added successfully');
    } catch (error: any) {
      console.error('Error adding high school:', error);
      message.error(`Failed to add high school: ${error?.message || 'Unknown error'}`);
    } finally {
      setSavingSchool(false);
    }
  };

  // High School table columns
  const highSchoolColumns = [
    {
      title: 'School ID',
      dataIndex: 'school_id',
      key: 'school_id',
      width: 300,
      render: (id: string) => id ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Text 
            code 
            style={{ cursor: 'pointer', color: '#1890ff' }}
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/data-ops/high-school-edit/${id}`);
            }}
          >
            {id}
          </Text>
          <CopyOutlined 
            onClick={(e) => {
              e.stopPropagation();
              copySchoolId(id);
            }}
            style={{ 
              fontSize: '12px', 
              cursor: 'pointer', 
              color: '#1890ff',
              marginLeft: 4
            }}
            title="Copy School ID"
          />
        </div>
      ) : '-',
      sorter: true,
    },
    {
      title: 'School Name',
      dataIndex: 'school_name',
      key: 'school_name',
      sorter: true,
      defaultSortOrder: 'ascend' as const,
      render: (name: string) => name ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Text>{name}</Text>
          <CopyOutlined 
            onClick={(e) => {
              e.stopPropagation();
              copySchoolName(name);
            }}
            style={{ 
              fontSize: '12px', 
              cursor: 'pointer', 
              color: '#1890ff',
              marginLeft: 4
            }}
            title="Copy School Name"
          />
        </div>
      ) : '-',
    },
    {
      title: 'City',
      dataIndex: 'address_city',
      key: 'address_city',
      sorter: true,
    },
    {
      title: 'School State',
      dataIndex: 'school_state',
      key: 'school_state',
      sorter: true,
    },
    {
      title: 'HS County',
      dataIndex: 'hs_county',
      key: 'hs_county',
      sorter: true,
    },
    {
      title: 'HS State',
      dataIndex: 'hs_state',
      key: 'hs_state',
      sorter: true,
    },
    {
      title: 'HC Name',
      dataIndex: 'hc_name',
      key: 'hc_name',
      sorter: true,
    },
    {
      title: 'HC Email',
      dataIndex: 'hc_email',
      key: 'hc_email',
      render: (email: string) => email ? <a href={`mailto:${email}`}>{email}</a> : '-',
      sorter: true,
    },
    {
      title: 'HC Number',
      dataIndex: 'hc_number',
      key: 'hc_number',
      render: (number: string) => number ? <a href={`tel:${number}`}>{number}</a> : '-',
      sorter: true,
    },
    {
      title: 'College Player Producing',
      dataIndex: 'college_player_producing',
      key: 'college_player_producing',
      sorter: true,
    },
    {
      title: 'D1 Player Producing',
      dataIndex: 'd1_player_producing',
      key: 'd1_player_producing',
      sorter: true,
    },
    {
      title: 'Academic Ranking',
      dataIndex: 'academic_ranking',
      key: 'academic_ranking',
      sorter: true,
    },
    {
      title: 'Private/Public',
      dataIndex: 'private_public',
      key: 'private_public',
      render: (value: string) => value ? <Tag color={value.toLowerCase() === 'private' ? 'blue' : 'green'}>{value}</Tag> : '-',
      sorter: true,
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{ padding: '40px' }}>
        <Result
          status="403"
          title="Access Denied"
          subTitle="You do not have permission to access the Data Ops page. This page is only available to admin packages 3 and 5."
          extra={
            <Button type="primary" onClick={() => router.push('/transfers')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <style dangerouslySetInnerHTML={{__html: `
        .ant-tabs-nav-list {
          justify-content: flex-start !important;
        }
      `}} />
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AppstoreAddOutlined style={{ marginRight: 8 }} />
            Data Ops
            <Tag color="blue" style={{ marginLeft: 8 }}>
              ADMIN
            </Tag>
          </div>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={{ marginBottom: 16 }}
          items={[
            {
              key: 'athletes',
              label: 'HS Athletes',
              children: (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Input
                      placeholder="Search by name, email, school, athlete ID, or comma-separated IDs"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      style={{ width: 400 }}
                      allowClear
                    />
                  </div>

                  <Table
                    dataSource={athleteData}
                    columns={columns}
                    rowKey="athlete_id"
                    loading={loadingData}
                    pagination={{
                      current: pagination.current,
                      pageSize: pagination.pageSize,
                      total: pagination.total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} athletes`,
                    }}
                    scroll={{ x: 'max-content' }}
                    onChange={handleTableChange}
                  />
                </div>
              ),
            },
            {
              key: 'highschools',
              label: 'High School',
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
                    <Input
                      placeholder="Search by school name, city, coach name, or school ID"
                      value={highSchoolSearchInput}
                      onChange={(e) => setHighSchoolSearchInput(e.target.value)}
                      style={{ width: 400 }}
                      allowClear
                    />
                    <Button
                      type="primary"
                      icon={<AppstoreAddOutlined />}
                      onClick={() => setIsAddSchoolModalVisible(true)}
                    >
                      Add New High School
                    </Button>
                  </div>

                  <Table
                    dataSource={highSchoolData}
                    columns={highSchoolColumns}
                    rowKey="school_id"
                    loading={loadingHighSchoolData}
                    pagination={{
                      current: highSchoolPagination.current,
                      pageSize: highSchoolPagination.pageSize,
                      total: highSchoolPagination.total,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} schools`,
                    }}
                    scroll={{ x: 'max-content' }}
                    onChange={handleHighSchoolTableChange}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Athlete Modal */}
      <Modal
        title={`Athlete ID: ${selectedAthlete?.athlete_id || ''}`}
        open={isAthleteModalVisible}
        onCancel={() => setIsAthleteModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#f0f8ff', border: '1px solid #91caff', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ℹ️ Changes are saved immediately but need to be processed by the system before they will impact what you see. This happens about 10 minutes after each hour.
          </Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Select Data Field:</Text>
        </div>
        <Select
          placeholder="Choose a data field to view"
          style={{ width: '100%', marginBottom: 16 }}
          loading={loadingDataTypes}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={[
            { 
              label: '✅ First Name', 
              value: 'first_name',
              style: { backgroundColor: '#f6ffed', fontWeight: 'bold' }
            },
            { 
              label: '✅ Last Name', 
              value: 'last_name',
              style: { backgroundColor: '#f6ffed', fontWeight: 'bold' }
            },
            { 
              label: '✅ School', 
              value: 'school_name',
              style: { backgroundColor: '#f6ffed', fontWeight: 'bold' }
            },
            ...dataTypes
              .sort((a, b) => {
                if (a.athleteHasIt && !b.athleteHasIt) return -1;
                if (!a.athleteHasIt && b.athleteHasIt) return 1;
                return a.name.localeCompare(b.name);
              })
              .map(dataType => ({
                label: dataType.athleteHasIt 
                  ? `✅ ${dataType.name}` 
                  : dataType.name,
                value: dataType.name,
                style: dataType.athleteHasIt 
                  ? { backgroundColor: '#f6ffed', fontWeight: 'bold' } 
                  : {}
              }))
          ]}
          value={selectedField}
          onChange={(value) => {
            setSelectedField(value);
            if (value === 'first_name' || value === 'last_name') {
              setAthleteFactData(null);
            } else if (value === 'school_name') {
              setAthleteFactData(null);
              loadAthleteSchoolHistory(selectedAthlete?.athlete_id);
            } else {
              if (dataTypes.length === 0) {
                console.warn('⚠️ Data types not loaded yet');
                return;
              }
              loadAthleteFactData(selectedAthlete?.athlete_id, value);
            }
          }}
        />
        
        {selectedField && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <Text strong>Selected Field: {selectedField}</Text>
            <div style={{ marginTop: 8 }}>
              {loadingFactData ? (
                <Text>Loading...</Text>
              ) : selectedField === 'first_name' ? (
                <div>
                  {isEditingBasicInfo ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        value={editingFirstName}
                        onChange={(e) => setEditingFirstName(e.target.value)}
                        placeholder="Enter first name"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        loading={savingBasicInfo}
                        onClick={saveAthleteBasicInfo}
                        disabled={!editingFirstName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsEditingBasicInfo(false);
                          setEditingFirstName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Text>{selectedAthlete?.athlete_first_name || 'N/A'}</Text>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsEditingBasicInfo(true);
                          setEditingFirstName(selectedAthlete?.athlete_first_name || '');
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              ) : selectedField === 'last_name' ? (
                <div>
                  {isEditingBasicInfo ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        value={editingLastName}
                        onChange={(e) => setEditingLastName(e.target.value)}
                        placeholder="Enter last name"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        loading={savingBasicInfo}
                        onClick={saveAthleteBasicInfo}
                        disabled={!editingLastName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsEditingBasicInfo(false);
                          setEditingLastName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Text>{selectedAthlete?.athlete_last_name || 'N/A'}</Text>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsEditingBasicInfo(true);
                          setEditingLastName(selectedAthlete?.athlete_last_name || '');
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              ) : selectedField === 'school_name' ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>School History</Text>
                    <div style={{ marginTop: 8 }}>
                      {loadingSchoolHistory ? (
                        <Text>Loading school history...</Text>
                      ) : athleteSchoolHistory.length > 0 ? (
                        <Table
                          dataSource={athleteSchoolHistory}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: 'School',
                              dataIndex: ['school', 'name'],
                              key: 'school_name',
                              render: (name: string) => <Text strong>{name}</Text>
                            },
                            {
                              title: 'Start Date',
                              dataIndex: 'start_date',
                              key: 'start_date',
                              render: (date: string) => new Date(date).toLocaleDateString()
                            },
                            {
                              title: 'End Date',
                              dataIndex: 'end_date',
                              key: 'end_date',
                              render: (date: string | null) => date ? new Date(date).toLocaleDateString() : <Tag color="green">Current</Tag>
                            },
                            {
                              title: 'Actions',
                              key: 'actions',
                              render: (_: any, record: any) => (
                                <Button
                                  size="small"
                                  onClick={() => {
                                    setEditingSchoolRecord({
                                      ...record,
                                      originalSchoolId: record.school_id,
                                      originalStartDate: record.start_date,
                                      originalEndDate: record.end_date,
                                      school_name: record.school?.name || ''
                                    });
                                    setSchoolSearchQuery(record.school?.name || '');
                                    setIsEditingSchoolRecord(true);
                                  }}
                                >
                                  Edit
                                </Button>
                              )
                            }
                          ]}
                        />
                      ) : (
                        <Text>No school history found</Text>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Transfer Athlete:</Text>
                    {!isTransferringAthlete ? (
                      <Button
                        type="primary"
                        onClick={() => setIsTransferringAthlete(true)}
                      >
                        Transfer to New School
                      </Button>
                    ) : (
                      <div>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>Transfer Date:</Text>
                          <Input
                            type="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>New School:</Text>
                          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <Input
                              placeholder="Search for school..."
                              value={schoolSearchQuery}
                              onChange={(e) => {
                                setSchoolSearchQuery(e.target.value);
                                searchSchoolsForTransfer(e.target.value);
                              }}
                              style={{ flex: 1 }}
                            />
                          </div>
                          {schoolSearchResults.length > 0 && (
                            <div style={{ marginTop: 4, maxHeight: 200, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                              {schoolSearchResults.map((school) => (
                                <div
                                  key={school.id}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedTransferSchool?.id === school.id ? '#e6f7ff' : 'transparent',
                                    borderBottom: '1px solid #f0f0f0'
                                  }}
                                  onClick={() => setSelectedTransferSchool(school)}
                                >
                                  {school.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            type="primary"
                            loading={savingSchoolChanges}
                            onClick={handleAthleteTransfer}
                            disabled={!transferDate || !selectedTransferSchool}
                          >
                            Transfer
                          </Button>
                          <Button
                            onClick={() => {
                              setIsTransferringAthlete(false);
                              setSelectedTransferSchool(null);
                              setTransferDate('');
                              setSchoolSearchQuery('');
                              setSchoolSearchResults([]);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : athleteFactData ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Text>Value: {athleteFactData.value || 'N/A'}</Text>
                  {athleteFactData.unit && <Text> | Unit: {athleteFactData.unit}</Text>}
                  {athleteFactData.notes && <Text> | Notes: {athleteFactData.notes}</Text>}
                  </div>
                  <Button
                    danger
                    size="small"
                    loading={markingInactive}
                    onClick={handleMarkFactInactive}
                    disabled={!athleteFactData?.id}
                    title={!athleteFactData?.id ? 'Fact ID not available' : 'Mark this fact as inactive'}
                  >
                    Make Inactive
                  </Button>
                </div>
              ) : (
                <Text>No data found for this field</Text>
              )}
            </div>
            
            {selectedField !== 'first_name' && selectedField !== 'last_name' && selectedField !== 'school_name' && (
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Add New Fact:</Text>
                {selectedField?.toUpperCase() === 'GPA' && (
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ display: 'block', marginBottom: 4 }}>Source:</Text>
                    <Select
                      value={gpaSource}
                      onChange={setGpaSource}
                      style={{ width: '100%' }}
                      options={[
                        { label: 'Verified', value: 'verified' },
                        { label: 'HS Coach', value: 'hs_coach' }
                      ]}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Enter value for this field"
                    value={newFactValue}
                    onChange={(e) => setNewFactValue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    loading={savingFact}
                    onClick={() => {
                      if (newFactValue.trim()) {
                        saveAthleteFact(selectedAthlete?.athlete_id, selectedField, newFactValue.trim());
                      }
                    }}
                    disabled={!newFactValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit School Record Modal */}
      <Modal
        title="Edit School Record"
        open={isEditingSchoolRecord}
        onCancel={() => {
          setIsEditingSchoolRecord(false);
          setEditingSchoolRecord(null);
        }}
        footer={null}
        width={500}
      >
        {editingSchoolRecord && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>School:</Text>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Input
                  placeholder="Search for school..."
                  value={schoolSearchQuery}
                  onChange={(e) => {
                    setSchoolSearchQuery(e.target.value);
                    searchSchoolsForTransfer(e.target.value);
                  }}
                  style={{ flex: 1 }}
                  onFocus={() => {
                    if (schoolSearchQuery) {
                      searchSchoolsForTransfer(schoolSearchQuery);
                    }
                  }}
                />
              </div>
              {schoolSearchResults.length > 0 && (
                <div style={{ marginTop: 4, maxHeight: 200, overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: 4 }}>
                  {schoolSearchResults.map((school) => (
                    <div
                      key={school.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor: editingSchoolRecord.school_id === school.id ? '#e6f7ff' : 'transparent',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onClick={() => setEditingSchoolRecord({
                        ...editingSchoolRecord,
                        school_id: school.id,
                        school: { id: school.id, name: school.name }
                      })}
                    >
                      {school.name}
                    </div>
                  ))}
                </div>
              )}
              {(editingSchoolRecord.school || (editingSchoolRecord.school_id && editingSchoolRecord.school_name)) && (
                <div style={{ marginTop: 8, padding: 8, backgroundColor: '#f0f8ff', borderRadius: 4 }}>
                  <Text strong>Selected: {editingSchoolRecord.school?.name || editingSchoolRecord.school_name}</Text>
                </div>
              )}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>Start Date:</Text>
              <Input
                type="date"
                value={editingSchoolRecord.start_date ? new Date(editingSchoolRecord.start_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditingSchoolRecord({
                  ...editingSchoolRecord,
                  start_date: e.target.value
                })}
                style={{ marginTop: 4 }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text strong>End Date:</Text>
              <Input
                type="date"
                value={editingSchoolRecord.end_date ? new Date(editingSchoolRecord.end_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setEditingSchoolRecord({
                  ...editingSchoolRecord,
                  end_date: e.target.value || null
                })}
                style={{ marginTop: 4 }}
              />
              <Text type="secondary" style={{ fontSize: '12px', marginTop: 4, display: 'block' }}>
                Leave empty for current school
              </Text>
            </div>
            
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                loading={savingSchoolChanges}
                onClick={saveSchoolRecordChanges}
              >
                Save Changes
              </Button>
              <Button
                onClick={() => {
                  setIsEditingSchoolRecord(false);
                  setEditingSchoolRecord(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add High School Modal */}
      <Modal
        title="Add New High School"
        open={isAddSchoolModalVisible}
        onCancel={() => {
          setIsAddSchoolModalVisible(false);
          // Reset form
          setSchoolName('');
          setSelectedState(null);
          setSelectedCounty(null);
          setPrivatePublic('');
          setAthleticDirectorFirstName('');
          setAthleticDirectorLastName('');
          setAthleticDirectorEmail('');
          setCoachFirstName('');
          setCoachLastName('');
          setCoachStartDate('');
          setCoachFacts({});
        }}
        footer={null}
        width={600}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* School Name */}
          <div>
            <Text strong>School Name *</Text>
            <Input
              placeholder="Enter school name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>

          {/* School State */}
          <div>
            <Text strong>School State</Text>
            <Select
              placeholder="Select state"
              style={{ width: '100%', marginTop: 4 }}
              loading={loadingStates}
              value={selectedState}
              onChange={(value) => setSelectedState(value)}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={states.map(state => ({
                label: `${state.abbrev} - ${state.name}`,
                value: state.id
              }))}
            />
          </div>

          {/* School County */}
          <div>
            <Text strong>School County</Text>
            <Select
              placeholder={selectedState ? "Select county" : "Select state first"}
              style={{ width: '100%', marginTop: 4 }}
              loading={loadingCounties}
              disabled={!selectedState}
              value={selectedCounty}
              onChange={(value) => setSelectedCounty(value)}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={counties.map(county => ({
                label: county.name,
                value: county.id
              }))}
            />
          </div>

          {/* Private/Public */}
          <div>
            <Text strong>Private/Public</Text>
            <Select
              placeholder="Select type"
              style={{ width: '100%', marginTop: 4 }}
              value={privatePublic}
              onChange={(value) => setPrivatePublic(value)}
              options={[
                { label: 'Public', value: 'Public' },
                { label: 'Private', value: 'Private' }
              ]}
            />
          </div>

          {/* Athletic Director Section */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Text strong style={{ fontSize: 16 }}>Athletic Director</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <Text strong>First Name</Text>
                <Input
                  placeholder="Enter first name"
                  value={athleticDirectorFirstName}
                  onChange={(e) => setAthleticDirectorFirstName(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>Last Name</Text>
                <Input
                  placeholder="Enter last name"
                  value={athleticDirectorLastName}
                  onChange={(e) => setAthleticDirectorLastName(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>Email</Text>
                <Input
                  placeholder="Enter email"
                  value={athleticDirectorEmail}
                  onChange={(e) => setAthleticDirectorEmail(e.target.value)}
                  style={{ marginTop: 4 }}
                  type="email"
                />
              </div>
            </div>
          </div>

          {/* Coach Section */}
          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
            <Text strong style={{ fontSize: 16 }}>Coach</Text>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <Text strong>First Name</Text>
                <Input
                  placeholder="Enter first name"
                  value={coachFirstName}
                  onChange={(e) => setCoachFirstName(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>Last Name</Text>
                <Input
                  placeholder="Enter last name"
                  value={coachLastName}
                  onChange={(e) => setCoachLastName(e.target.value)}
                  style={{ marginTop: 4 }}
                />
              </div>
              <div>
                <Text strong>Start Date *</Text>
                <Input
                  type="date"
                  value={coachStartDate}
                  onChange={(e) => setCoachStartDate(e.target.value)}
                  style={{ marginTop: 4 }}
                />
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 4 }}>
                  Required if adding a coach
                </Text>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button
              onClick={() => {
                setIsAddSchoolModalVisible(false);
                setSchoolName('');
                setSelectedState(null);
                setSelectedCounty(null);
                setPrivatePublic('');
                setAthleticDirectorFirstName('');
                setAthleticDirectorLastName('');
                setAthleticDirectorEmail('');
                setCoachFirstName('');
                setCoachLastName('');
                setCoachStartDate('');
                setCoachFacts({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              loading={savingSchool}
              onClick={handleAddHighSchool}
              disabled={!schoolName.trim()}
            >
              Add School
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function DataOpsPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    }>
      <DataOpsPageContent />
    </Suspense>
  );
}
