"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, Select, Input, Table, Tag, Modal, Button, Typography, message } from "antd";

const { Text } = Typography;
import { AppstoreAddOutlined, TeamOutlined } from '@ant-design/icons';
import { fetchAllDataTypes, fetchAthleteDataTypes, fetchAthleteFactData, insertAthleteFact, searchAthletes, fetchAthletesFromSportView, updateAthleteBasicInfo, fetchAthleteSchoolHistory, searchSchools, updateAthleteSchoolRecord, transferAthlete, fetchSchoolDataTypesInUse, fetchSchoolDataTypes, fetchSchoolFactData, insertSchoolFact, updateSchoolBasicInfo, fetchCustomerDataTypesInUse, fetchCustomerDataTypes, fetchCustomerFactData, insertCustomerFact, updateCustomerBasicInfo, searchCustomers, fetchSports, searchCoaches, fetchCoachDataTypes, fetchCoachFactData, insertCoachFact, updateCoachBasicInfo, fetchCoachSchoolHistory, updateCoachSchoolRecord, fetchCoachDataTypesInUse, endCoachSchoolRecord, transferCoach, saveNewCoach } from '@/lib/queries';

interface EditViewDataTabProps {
  selectedDataType: string;
  setSelectedDataType: (value: string) => void;
  hasAthleteAccess: boolean;
  allSports: any[];
  onAthleteUpdate?: () => void;
}

export default function EditViewDataTab({ selectedDataType, setSelectedDataType, hasAthleteAccess, allSports, onAthleteUpdate }: EditViewDataTabProps) {
  // Edit/View Data tab state
  const [athleteData, setAthleteData] = useState<any[]>([]);
  const [loadingAthleteData, setLoadingAthleteData] = useState(false);
  const [athleteSearchInput, setAthleteSearchInput] = useState<string>('');
  const [athletePagination, setAthletePagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [selectedAthleteSearchSport, setSelectedAthleteSearchSport] = useState<number | undefined>(undefined);
  
  // HS Athlete states
  const [hsAthleteData, setHsAthleteData] = useState<any[]>([]);
  const [loadingHsAthleteData, setLoadingHsAthleteData] = useState(false);
  const [hsAthletePagination, setHsAthletePagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [selectedHsAthleteSearchSport, setSelectedHsAthleteSearchSport] = useState<number | undefined>(undefined);
  
  // JUCO Athlete states
  const [jucoAthleteData, setJucoAthleteData] = useState<any[]>([]);
  const [loadingJucoAthleteData, setLoadingJucoAthleteData] = useState(false);
  const [jucoAthletePagination, setJucoAthletePagination] = useState({ current: 1, pageSize: 25, total: 0 });
  const [selectedJucoAthleteSearchSport, setSelectedJucoAthleteSearchSport] = useState<number | undefined>(undefined);
  
  // All Athletes states
  const [allAthletes, setAllAthletes] = useState<any[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(false);
  const [selectedAthleteSport, setSelectedAthleteSport] = useState<any>(null);
  
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

  // School data states
  const [schoolData, setSchoolData] = useState<any[]>([]);
  const [loadingSchoolData, setLoadingSchoolData] = useState(false);
  const [schoolSearchInput, setSchoolSearchInput] = useState<string>('');
  const [schoolPagination, setSchoolPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  // School modal state
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [isSchoolModalVisible, setIsSchoolModalVisible] = useState(false);
  const [schoolDataTypes, setSchoolDataTypes] = useState<any[]>([]);
  const [loadingSchoolDataTypes, setLoadingSchoolDataTypes] = useState(false);
  const [selectedSchoolField, setSelectedSchoolField] = useState<string>('');
  const [schoolFactData, setSchoolFactData] = useState<any>(null);
  const [loadingSchoolFactData, setLoadingSchoolFactData] = useState(false);
  const [newSchoolFactValue, setNewSchoolFactValue] = useState<string>('');
  const [savingSchoolFact, setSavingSchoolFact] = useState(false);
  
  // School basic info editing states
  const [isEditingSchoolBasicInfo, setIsEditingSchoolBasicInfo] = useState(false);
  const [editingSchoolName, setEditingSchoolName] = useState('');
  const [savingSchoolBasicInfo, setSavingSchoolBasicInfo] = useState(false);

  // Customer data states
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [loadingCustomerData, setLoadingCustomerData] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState<string>('');
  const [customerPagination, setCustomerPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [sports, setSports] = useState<any[]>([]);
  const [selectedCustomerSport, setSelectedCustomerSport] = useState<string | undefined>(undefined);

  // Customer modal state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [customerDataTypes, setCustomerDataTypes] = useState<any[]>([]);
  const [loadingCustomerDataTypes, setLoadingCustomerDataTypes] = useState(false);
  const [selectedCustomerField, setSelectedCustomerField] = useState<string>('');
  const [customerFactData, setCustomerFactData] = useState<any>(null);
  const [loadingCustomerFactData, setLoadingCustomerFactData] = useState(false);
  const [newCustomerFactValue, setNewCustomerFactValue] = useState<string>('');
  const [savingCustomerFact, setSavingCustomerFact] = useState(false);
  
  // Coach data states
  const [coachData, setCoachData] = useState<any[]>([]);
  const [loadingCoachData, setLoadingCoachData] = useState(false);
  const [coachSearchInput, setCoachSearchInput] = useState<string>('');
  const [coachPagination, setCoachPagination] = useState({ current: 1, pageSize: 50, total: 0 });
  const [selectedCoachSport, setSelectedCoachSport] = useState<string | undefined>(undefined);

  // Coach modal state
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [isCoachModalVisible, setIsCoachModalVisible] = useState(false);
  const [coachDataTypes, setCoachDataTypes] = useState<any[]>([]);
  const [loadingCoachDataTypes, setLoadingCoachDataTypes] = useState(false);
  const [selectedCoachField, setSelectedCoachField] = useState<string>('');
  const [coachFactData, setCoachFactData] = useState<any>(null);
  const [loadingCoachFactData, setLoadingCoachFactData] = useState(false);
  const [newCoachFactValue, setNewCoachFactValue] = useState<string>('');
  const [savingCoachFact, setSavingCoachFact] = useState(false);

  // Coach school action modal state
  const [isCoachSchoolActionVisible, setIsCoachSchoolActionVisible] = useState(false);
  const [coachSchoolActionMode, setCoachSchoolActionMode] = useState<'end'|'transfer'|'edit'|null>(null);
  const [coachSchoolEditingRecord, setCoachSchoolEditingRecord] = useState<any>(null);
  const [coachSchoolEndDate, setCoachSchoolEndDate] = useState<string>('');
  const [coachSchoolStartDate, setCoachSchoolStartDate] = useState<string>('');
  const [coachSchoolTransferDate, setCoachSchoolTransferDate] = useState<string>('');
  const [coachSchoolNewSchoolQuery, setCoachSchoolNewSchoolQuery] = useState<string>('');
  const [coachSchoolNewSchoolOptions, setCoachSchoolNewSchoolOptions] = useState<any[]>([]);
  const [coachSchoolSelectedSchool, setCoachSchoolSelectedSchool] = useState<any>(null);
  const [loadingCoachSchoolOptions, setLoadingCoachSchoolOptions] = useState(false);
  const [sportOptions, setSportOptions] = useState<any[]>([]);
  const [loadingSportOptions, setLoadingSportOptions] = useState(false);
  const [selectedTransferSport, setSelectedTransferSport] = useState<any>(null);
  const [selectedEditSport, setSelectedEditSport] = useState<any>(null);
  const [isAddCoachModalVisible, setIsAddCoachModalVisible] = useState(false);
  const [newCoachFirstName, setNewCoachFirstName] = useState('');
  const [newCoachLastName, setNewCoachLastName] = useState('');
  const [newCoachSchool, setNewCoachSchool] = useState<any>(null);
  const [newCoachSchoolQuery, setNewCoachSchoolQuery] = useState('');
  const [newCoachSchoolOptions, setNewCoachSchoolOptions] = useState<any[]>([]);
  const [newCoachSport, setNewCoachSport] = useState<any>(null);
  const [newCoachStartDate, setNewCoachStartDate] = useState('');
  const [newCoachEndDate, setNewCoachEndDate] = useState('');
  const [newCoachFacts, setNewCoachFacts] = useState<{[key: string]: string}>({});
  const [newCoachSelectedFactType, setNewCoachSelectedFactType] = useState<number | null>(null);
  const [newCoachSelectedFactName, setNewCoachSelectedFactName] = useState<string>('');
  const [newCoachFactInputValue, setNewCoachFactInputValue] = useState<string>('');
  const [savingNewCoach, setSavingNewCoach] = useState(false);


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

  // Debounce the search inputs
  const debouncedAthleteSearch = useDebouncedSearch(athleteSearchInput);
  const debouncedSchoolSearch = useDebouncedSearch(schoolSearchInput);
  const debouncedCustomerSearch = useDebouncedSearch(customerSearchInput);
  const debouncedCoachSearch = useDebouncedSearch(coachSearchInput);

  // Trigger school search when edit modal opens with preloaded school
  useEffect(() => {
    if (isEditingSchoolRecord && editingSchoolRecord && schoolSearchQuery) {
      searchSchoolsForTransfer(schoolSearchQuery);
    }
  }, [isEditingSchoolRecord, editingSchoolRecord, schoolSearchQuery]);

  // Debug school modal state
  useEffect(() => {
  }, [isSchoolModalVisible, selectedSchool]);

  // Load sports when customer data type is selected
  useEffect(() => {
    if (selectedDataType === 'customer') {
      loadSports();
    }
  }, [selectedDataType]);


  // Function to fetch all data types and mark which ones the athlete has
  const loadAthleteDataTypes = async (athleteId: string) => {
    try {
      setLoadingDataTypes(true);
      
      // Step 1: Load all data types immediately (fast, small table)
      const allDataTypes = await fetchAllDataTypes();
      
      // Set all data types immediately
      const initialDataTypes = allDataTypes?.map((dataType: any) => ({
        ...dataType,
        athleteHasIt: false // Will be updated after fetching athlete data
      })) || [];
      
      setDataTypes(initialDataTypes);
      setLoadingDataTypes(false); // Show data types immediately
      
      // Step 2: Fetch athlete's data types (fast, specific to athlete)
      try {
        const athleteData = await fetchAthleteDataTypes(athleteId);
        const athleteDataTypeIds: number[] = (athleteData as unknown as { data_type_id: number }[])?.map((item: { data_type_id: number }) => item.data_type_id) || [];
        
        // Update with athlete data immediately
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
      const errorMessage = error?.message || error?.error_description || 'Failed to load data types';
      message.error(`Error loading data types: ${errorMessage}`);
      setDataTypes([]);
      setLoadingDataTypes(false);
    }
  };

  // Function to save a new athlete fact
  const saveAthleteFact = async (athleteId: string, dataTypeName: string, value: string) => {
    try {
      setSavingFact(true);
      
      // Find the data type ID for the selected field
      const dataType = dataTypes.find(dt => dt.name === dataTypeName);
      if (!dataType) {
        return;
      }
      
      // Insert new athlete fact
      const data = await insertAthleteFact(athleteId, dataType.id, value);
      
      // Refresh the athlete fact data to show the new entry
      await loadAthleteFactData(athleteId, dataTypeName);
      
      // Clear the input
      setNewFactValue('');
      
    } catch (error) {
    } finally {
      setSavingFact(false);
    }
  };

  // Function to save athlete basic info (first name, last name)
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
      
      // Update the selected athlete object with new values
      setSelectedAthlete({
        ...selectedAthlete,
        athlete_first_name: updates.first_name || selectedAthlete.athlete_first_name,
        athlete_last_name: updates.last_name || selectedAthlete.athlete_last_name
      });
      
      // Exit editing mode
      setIsEditingBasicInfo(false);
      setEditingFirstName('');
      setEditingLastName('');
      
      // Refresh data
      if (onAthleteUpdate) {
        onAthleteUpdate();
      }
      
      
    } catch (error) {
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
      const result = await searchSchools(query);
      setSchoolSearchResults(result.data);
    } catch (error) {
    } finally {
      setLoadingSchoolSearch(false);
    }
  };

  // Function to fetch school data for the school data type
  const fetchSchoolData = async (page: number = 1) => {
    if (selectedDataType !== 'school') return;
    
    try {
      setLoadingSchoolData(true);
      const result = await searchSchools(debouncedSchoolSearch, 50, page);
      setSchoolData(result.data);
      setSchoolPagination(prev => ({ ...prev, current: page, total: result.total }));
    } catch (error) {
    } finally {
      setLoadingSchoolData(false);
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
      
      // Refresh school history
      await loadAthleteSchoolHistory(selectedAthlete?.athlete_id);
      
      // Exit editing mode
      setIsEditingSchoolRecord(false);
      setEditingSchoolRecord(null);
      
      
    } catch (error) {
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
      
      // Refresh school history
      await loadAthleteSchoolHistory(selectedAthlete.athlete_id);
      
      // Reset transfer form
      setIsTransferringAthlete(false);
      setSelectedTransferSchool(null);
      setTransferDate('');
      setSchoolSearchQuery('');
      setSchoolSearchResults([]);
      
      
    } catch (error) {
    } finally {
      setSavingSchoolChanges(false);
    }
  };

  // Function to fetch athlete fact data
  const loadAthleteFactData = async (athleteId: string, dataTypeName: string) => {
    try {
      
      setLoadingFactData(true);
      
      // Find the data_type_id for the selected field
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
    } finally {
      setLoadingFactData(false);
    }
  };

  // Function to fetch athlete data with table type parameter
  const fetchAthleteDataByType = async (dataType: string, tableType: 'college' | 'hs' | 'juco', page: number = 1) => {
    if (selectedDataType !== dataType) return;
    
    try {
      // Set appropriate loading state
      if (dataType === 'athlete') {
        setLoadingAthleteData(true);
      } else if (dataType === 'hs_athlete') {
        setLoadingHsAthleteData(true);
      } else if (dataType === 'juco_athlete') {
        setLoadingJucoAthleteData(true);
      }
      
      // Get the selected sport for this data type
      const selectedSport = dataType === 'athlete' ? selectedAthleteSearchSport :
                           dataType === 'hs_athlete' ? selectedHsAthleteSearchSport :
                           selectedJucoAthleteSearchSport;
      
      const result = await searchAthletes(debouncedAthleteSearch, 25, tableType, page, selectedSport);

      // Map sport_id to sport name for display
      const sportIdToName: Record<number, string> = {
        '1': 'Men\'s Basketball',
        '2': 'Women\'s Basketball', 
        '3': 'Men\'s Soccer',
        '4': 'Women\'s Soccer',
        '5': 'Women\'s Volleyball',
        '6': 'Baseball',
        '7': 'Softball',
        '8': 'Men\'s Cross Country',
        '9': 'Women\'s Cross Country',
        '10': 'Men\'s Golf',
        '11': 'Women\'s Golf',
        '12': 'Men\'s Lacrosse',
        '13': 'Women\'s Lacrosse',
        '14': 'Men\'s Tennis',
        '15': 'Women\'s Tennis',
        '16': 'Men\'s Track & Field',
        '17': 'Women\'s Track & Field',
        '18': 'Men\'s Swimming',
        '19': 'Women\'s Swimming',
        '20': 'Men\'s Wrestling',
        '21': 'Football'
      };

      // Map sport_id to sport name
      const dataWithSportNames = (result.data || []).map((athlete: any) => ({
        ...athlete,
        sport_name: sportIdToName[athlete.sport_id as keyof typeof sportIdToName] || `Sport ID: ${athlete.sport_id}`
      }));

      // Set appropriate data state and pagination
      if (dataType === 'athlete') {
        setAthleteData(dataWithSportNames);
        setAthletePagination(prev => ({ ...prev, current: page, total: result.total }));
      } else if (dataType === 'hs_athlete') {
        setHsAthleteData(dataWithSportNames);
        setHsAthletePagination(prev => ({ ...prev, current: page, total: result.total }));
      } else if (dataType === 'juco_athlete') {
        setJucoAthleteData(dataWithSportNames);
        setJucoAthletePagination(prev => ({ ...prev, current: page, total: result.total }));
      }
    } catch (error) {
    } finally {
      // Set appropriate loading state to false
      if (dataType === 'athlete') {
        setLoadingAthleteData(false);
      } else if (dataType === 'hs_athlete') {
        setLoadingHsAthleteData(false);
      } else if (dataType === 'juco_athlete') {
        setLoadingJucoAthleteData(false);
      }
    }
  };

  // Legacy functions for backward compatibility
  const fetchAthleteData = async (page: number = 1) => {
    return fetchAthleteDataByType('athlete', 'college', page);
  };

  const fetchHsAthleteData = async (page: number = 1) => {
    return fetchAthleteDataByType('hs_athlete', 'hs', page);
  };

  const fetchJucoAthleteData = async (page: number = 1) => {
    return fetchAthleteDataByType('juco_athlete', 'juco', page);
  };

  // Function to load school data types and mark which ones the school has
  const loadSchoolDataTypes = async (schoolId: string) => {
    try {
      setLoadingSchoolDataTypes(true);
      
      // Get data types from the view that shows only data types in use
      const dataTypes = await fetchSchoolDataTypesInUse();
      
      // Now fetch data types that this specific school has
      const schoolData = await fetchSchoolDataTypes(schoolId);
      
      // Extract school's data type IDs
      const schoolDataTypeIds: number[] = (schoolData as unknown as { data_type_id: number }[])?.map((item: { data_type_id: number }) => item.data_type_id) || [];
      
      // Mark which data types the school has
      const dataTypesWithStatus = dataTypes?.map((dataType: any) => ({
        ...dataType,
        schoolHasIt: schoolDataTypeIds.includes(dataType.id)
      })) || [];
      
      setSchoolDataTypes(dataTypesWithStatus);
    } catch (error) {
    } finally {
      setLoadingSchoolDataTypes(false);
    }
  };

  // Function to save a new school fact
  const saveSchoolFact = async (schoolId: string, dataTypeName: string, value: string) => {
    try {
      setSavingSchoolFact(true);
      
      // Find the data type ID for the selected field
      const dataType = schoolDataTypes.find(dt => dt.name === dataTypeName);
      if (!dataType) {
        return;
      }
      
      
      // Insert new school fact
      const data = await insertSchoolFact(schoolId, dataType.id, value);
      
      // Refresh the school fact data to show the new entry
      await loadSchoolFactData(schoolId, dataTypeName);
      
      // Clear the input
      setNewSchoolFactValue('');
      
    } catch (error) {
    } finally {
      setSavingSchoolFact(false);
    }
  };

  // Function to save school basic info (name)
  const saveSchoolBasicInfo = async () => {
    if (!selectedSchool) return;
    
    try {
      setSavingSchoolBasicInfo(true);
      
      const updates: { name?: string } = {};
      if (editingSchoolName.trim()) {
        updates.name = editingSchoolName.trim();
      }
      
      if (Object.keys(updates).length === 0) {
        return;
      }
      
      await updateSchoolBasicInfo(selectedSchool.id, updates);
      
      // Update the selected school object with new values
      setSelectedSchool({
        ...selectedSchool,
        name: updates.name || selectedSchool.name
      });
      
      // Exit editing mode
      setIsEditingSchoolBasicInfo(false);
      setEditingSchoolName('');
      
      
    } catch (error) {
    } finally {
      setSavingSchoolBasicInfo(false);
    }
  };

  // Function to fetch school fact data
  const loadSchoolFactData = async (schoolId: string, dataTypeName: string) => {
    try {     
      setLoadingSchoolFactData(true);
      
      // Find the data_type_id for the selected field
      const dataType = schoolDataTypes.find(dt => dt.name === dataTypeName);
      
      if (!dataType) {
        return;
      }
           
      const data = await fetchSchoolFactData(schoolId, dataType.id, 1);
      
      if (!data || data.length === 0) {
        console.log('ℹ️ No data found for this school and data type');
        setSchoolFactData(null);
        return;
      }
      
      setSchoolFactData(data[0]);
    } catch (error) {
      console.error('❌ Error in loadSchoolFactData:', error);
    } finally {
      setLoadingSchoolFactData(false);
    }
  };

  // Function to load customer data types and mark which ones the customer has
  const loadCustomerDataTypes = async (customerId: string) => {
    try {
      setLoadingCustomerDataTypes(true);
      
      // Get data types from the view that shows only data types in use
      const dataTypes = await fetchCustomerDataTypesInUse();
      
      // Now fetch data types that this specific customer has
      const customerData = await fetchCustomerDataTypes(customerId);
      
      // Extract customer's data type IDs
      const customerDataTypeIds: number[] = customerData?.map((item: any) => item.data_type_id) || [];
      
      // Mark which data types the customer has
      const dataTypesWithStatus = dataTypes?.map((dataType: any) => ({
        ...dataType,
        customerHasIt: customerDataTypeIds.includes(dataType.id)
      })) || [];
      
      setCustomerDataTypes(dataTypesWithStatus);
    } catch (error) {
      console.error('❌ Error in loadCustomerDataTypes:', error);
    } finally {
      setLoadingCustomerDataTypes(false);
    }
  };

  // Function to save a new customer fact
  const saveCustomerFact = async (customerId: string, dataTypeName: string, value: string) => {
    try {
      setSavingCustomerFact(true);
      
      // Find the data type ID for the selected field
      const dataType = customerDataTypes.find(dt => dt.name === dataTypeName);
      if (!dataType) {
        return;
      }
      
      
      // Insert new customer fact
      const data = await insertCustomerFact(customerId, dataType.id, value);
      
      // Refresh the customer fact data to show the new entry
      await loadCustomerFactData(customerId, dataTypeName);
      
      // Clear the input
      setNewCustomerFactValue('');
      
    } catch (error) {
      console.error('❌ Error in saveCustomerFact:', error);
    } finally {
      setSavingCustomerFact(false);
    }
  };


  // Function to fetch customer fact data
  const loadCustomerFactData = async (customerId: string, dataTypeName: string) => {
    try {
     
      setLoadingCustomerFactData(true);
      
      // Find the data_type_id for the selected field
      const dataType = customerDataTypes.find(dt => dt.name === dataTypeName);
      
      if (!dataType) {
        return;
      }
      
      
      const data = await fetchCustomerFactData(customerId, dataType.id, 1);
      
      if (!data || data.length === 0) {
        console.log('ℹ️ No data found for this customer and data type');
        setCustomerFactData(null);
        return;
      }
      
      setCustomerFactData(data[0]);
    } catch (error) {
      console.error('❌ Error in loadCustomerFactData:', error);
    } finally {
      setLoadingCustomerFactData(false);
    }
  };

  // Function to handle athlete row click
  const handleAthleteClick = (athlete: any) => {
    setSelectedAthlete(athlete);
    setSelectedField('');
    setAthleteFactData(null);
    setNewFactValue('');
    setIsAthleteModalVisible(true);
    // Fetch data types that are actually used by this athlete
    loadAthleteDataTypes(athlete.athlete_id);
  };

  // Function to handle school row click
  const handleSchoolClick = (school: any) => {

    setSelectedSchool(school);
    setSelectedSchoolField('');
    setSchoolFactData(null);
    setNewSchoolFactValue('');
    setIsSchoolModalVisible(true);

    // Fetch data types that are actually used by this school
    loadSchoolDataTypes(school.id);
  };

  // Function to handle customer row click
  const handleCustomerClick = (customer: any) => {

    setSelectedCustomer(customer);
    setSelectedCustomerField('');
    setCustomerFactData(null);
    setNewCustomerFactValue('');
    setIsCustomerModalVisible(true);

    // Fetch data types that are actually used by this customer
    loadCustomerDataTypes(customer.id);
  };

  // Function to fetch customer data for the customer data type
  const fetchCustomerData = async (page: number = 1) => {
    if (selectedDataType !== 'customer') return;
    
    try {
      setLoadingCustomerData(true);
      const result = await searchCustomers(debouncedCustomerSearch, 50, selectedCustomerSport, page);
      setCustomerData(result.data);
      setCustomerPagination(prev => ({ ...prev, current: page, total: result.total }));
    } catch (error) {
      console.error('Error in fetchCustomerData:', error);
    } finally {
      setLoadingCustomerData(false);
    }
  };

  // Function to fetch coach data for the coach data type
  const fetchCoachData = async (page: number = 1) => {
    if (selectedDataType !== 'coach') return;
    try {
      setLoadingCoachData(true);
      const result = await searchCoaches(debouncedCoachSearch, 50, selectedCoachSport, page);
      setCoachData(result.data);
      setCoachPagination(prev => ({ ...prev, current: page, total: result.total }));
    } catch (error) {
      console.error('Error in fetchCoachData:', error);
    } finally {
      setLoadingCoachData(false);
    }
  };

  // Handle coach row click
  const handleCoachClick = (coach: any) => {
    setSelectedCoach(coach);
    setSelectedCoachField('');
    setCoachFactData(null);
    setNewCoachFactValue('');
    setIsCoachModalVisible(true);
    loadCoachDataTypes(coach.id);
  };

  // Load coach data types
  const loadCoachDataTypes = async (coachId: string) => {
    try {
      setLoadingCoachDataTypes(true);
      // Fetch coach data types in use view (coach_fact)
      const allTypes = await fetchCoachDataTypesInUse();
      const coachTypesRows = await fetchCoachDataTypes(coachId);
      const coachTypeIds: number[] = coachTypesRows?.map((r: any) => r.data_type_id) || [];
      const labeled = (allTypes || []).map((dt: any) => ({
        ...dt,
        coachHasIt: coachTypeIds.includes(dt.id)
      }));
      setCoachDataTypes(labeled);
    } catch (error) {
      console.error('Error loading coach data types:', error);
    } finally {
      setLoadingCoachDataTypes(false);
    }
  };

  // Load sport options
  const loadSportOptions = async () => {
    try {

      setLoadingSportOptions(true);
      const sports = await fetchSports();

      setSportOptions(sports);

    } catch (error) {
      console.error('Error loading sport options:', error);
    } finally {
      setLoadingSportOptions(false);
    }
  };

  // Load sport options on component mount
  useEffect(() => {
    loadSportOptions();
  }, []);

  // Save new coach
  const handleSaveNewCoach = async () => {
    if (!newCoachFirstName.trim() || !newCoachLastName.trim() || !newCoachSchool || !newCoachSport || !newCoachStartDate) {
      return;
    }

    try {
      setSavingNewCoach(true);
      
      await saveNewCoach(
        newCoachFirstName.trim(),
        newCoachLastName.trim(),
        newCoachSchool.id,
        newCoachSport.id,
        newCoachStartDate,
        newCoachEndDate || null,
        newCoachFacts,
        coachDataTypes
      );

      // Reset form
      setNewCoachFirstName('');
      setNewCoachLastName('');
      setNewCoachSchool(null);
      setNewCoachSchoolQuery('');
      setNewCoachSchoolOptions([]);
      setNewCoachSport(null);
      setNewCoachStartDate('');
      setNewCoachEndDate('');
      setNewCoachFacts({});
      setNewCoachSelectedFactType(null);
      setNewCoachSelectedFactName('');
      setNewCoachFactInputValue('');
      setIsAddCoachModalVisible(false);

      // Refresh coach data
      await fetchCoachData();
    } catch (error) {
      console.error('Error saving new coach:', error);
    } finally {
      setSavingNewCoach(false);
    }
  };


  // Function to fetch coach fact data
  const loadCoachFactData = async (coachId: string, dataTypeOrObj: any) => {
    try {
      setLoadingCoachFactData(true);
      
      // Special handling for school field - load coach school history
      if (dataTypeOrObj === 'school') {

        const history = await fetchCoachSchoolHistory(coachId);

        setCoachFactData({ history });
        return;
      }
      
      // Resolve data type id for regular fact data
      let dataTypeId: number | undefined = undefined;
      if (typeof dataTypeOrObj === 'string') {
        const dt = coachDataTypes.find((d: any) => d.name === dataTypeOrObj);
        dataTypeId = dt?.id;
      } else if (typeof dataTypeOrObj === 'object') {
        dataTypeId = dataTypeOrObj.id || dataTypeOrObj.data_type_id;
      }
      if (!dataTypeId) {
        console.warn('Coach data type not found for', dataTypeOrObj);
        setCoachFactData(null);
        return;
      }
      const data = await fetchCoachFactData(coachId, dataTypeId, 1);
      setCoachFactData(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error in loadCoachFactData:', error);
    } finally {
      setLoadingCoachFactData(false);
    }
  };


  // Function to load sports for customer filtering
  const loadSports = async () => {
    try {
      const data = await fetchSports();
      setSports(data);
    } catch (error) {
      console.error('Error loading sports:', error);
    }
  };

  // Load athletes data for the selected sport
  const loadAthletes = async () => {
    if (!selectedAthleteSport) {
      setAllAthletes([]);
      return;
    }

    try {
      setLoadingAthletes(true);
      
      const viewName = `vw_athletes_wide_${selectedAthleteSport.abbrev}`;

      const athletesData = await fetchAthletesFromSportView(selectedAthleteSport.abbrev);
      setAllAthletes(athletesData);
    } catch (error) {
      console.error('Error loading athletes:', error);
      setAllAthletes([]);
    } finally {
      setLoadingAthletes(false);
    }
  };

  // Effect to fetch data when data type is selected and search changes
  useEffect(() => {
    // Reset pagination to page 1 when search changes
    if (selectedDataType === 'athlete') {
      setAthletePagination(prev => ({ ...prev, current: 1 }));
      fetchAthleteData(1);
    } else if (selectedDataType === 'hs_athlete') {
      setHsAthletePagination(prev => ({ ...prev, current: 1 }));
      fetchHsAthleteData(1);
    } else if (selectedDataType === 'juco_athlete') {
      setJucoAthletePagination(prev => ({ ...prev, current: 1 }));
      fetchJucoAthleteData(1);
    } else if (selectedDataType === 'school') {
      setSchoolPagination(prev => ({ ...prev, current: 1 }));
      fetchSchoolData(1);
    } else if (selectedDataType === 'customer') {
      setCustomerPagination(prev => ({ ...prev, current: 1 }));
      fetchCustomerData(1);
    } else if (selectedDataType === 'coach') {
      setCoachPagination(prev => ({ ...prev, current: 1 }));
      fetchCoachData(1);
    } else {
      // Reset data when switching away from data types
      setAthleteData([]);
      setHsAthleteData([]);
      setJucoAthleteData([]);
      setSchoolData([]);
      setCustomerData([]);
      setCoachData([]);
      setAthleteSearchInput('');
      setSchoolSearchInput('');
      setCustomerSearchInput('');
      setCoachSearchInput('');
      // Reset pagination
      setAthletePagination({ current: 1, pageSize: 25, total: 0 });
      setHsAthletePagination({ current: 1, pageSize: 25, total: 0 });
      setJucoAthletePagination({ current: 1, pageSize: 25, total: 0 });
      setSchoolPagination({ current: 1, pageSize: 50, total: 0 });
      setCustomerPagination({ current: 1, pageSize: 50, total: 0 });
      setCoachPagination({ current: 1, pageSize: 50, total: 0 });
      // Reset sport filters
      setSelectedAthleteSearchSport(undefined);
      setSelectedHsAthleteSearchSport(undefined);
      setSelectedJucoAthleteSearchSport(undefined);
    }
  }, [selectedDataType, debouncedAthleteSearch, debouncedSchoolSearch, debouncedCustomerSearch, debouncedCoachSearch, selectedCustomerSport, selectedCoachSport, selectedAthleteSearchSport, selectedHsAthleteSearchSport, selectedJucoAthleteSearchSport]);

  // Load athletes when sport changes
  useEffect(() => {
    if (selectedAthleteSport) {
      loadAthletes();
    }
  }, [selectedAthleteSport]);

  // Filter athletes based on search query
  const filteredAthletes = useMemo(() => {
    if (!debouncedAthleteSearch) {
      return allAthletes;
    }
    
    const query = debouncedAthleteSearch.toLowerCase();
    return allAthletes.filter(athlete => {
      const firstName = athlete.athlete_first_name?.toLowerCase() || '';
      const lastName = athlete.athlete_last_name?.toLowerCase() || '';
      const fullName = `${firstName} ${lastName}`.toLowerCase();
      const schoolName = athlete.school_name?.toLowerCase() || '';
      const schoolState = athlete.school_state?.toLowerCase() || '';
      
      return firstName.includes(query) ||
             lastName.includes(query) ||
             fullName.includes(query) ||
             schoolName.includes(query) ||
             schoolState.includes(query);
    });
  }, [allAthletes, debouncedAthleteSearch]);

  // Athletes table columns
  const athleteColumns = [
    {
      title: 'Athlete Name',
      dataIndex: 'athlete_name',
      key: 'athlete_name',
      render: (_: any, record: any) => {
        const fullName = `${record.athlete_first_name || ''} ${record.athlete_last_name || ''}`.trim();
        const rosterLink = record.roster_link;
        
        if (rosterLink && rosterLink.trim() !== '') {
          const href = rosterLink.startsWith('http') ? rosterLink : `https://${rosterLink}`;
          
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: '#1890ff', 
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              {fullName}
            </a>
          );
        } else {
          return (
            <span style={{ color: '#666' }}>
              {fullName}
            </span>
          );
        }
      },
      sorter: (a: any, b: any) => {
        const aName = `${a.athlete_first_name || ''} ${a.athlete_last_name || ''}`.trim();
        const bName = `${b.athlete_first_name || ''} ${b.athlete_last_name || ''}`.trim();
        return aName.localeCompare(bName);
      },
    },
    {
      title: 'Athlete ID',
      dataIndex: 'athlete_id',
      key: 'athlete_id',
      width: 200,
      render: (athleteId: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
            {athleteId}
          </span>
        </div>
      ),
      sorter: (a: any, b: any) => a.athlete_id.localeCompare(b.athlete_id),
    },
    {
      title: 'School State',
      dataIndex: 'school_state',
      key: 'school_state',
      width: 120,
      sorter: (a: any, b: any) => (a.school_state || '').localeCompare(b.school_state || ''),
    },
    {
      title: 'Athlete College',
      dataIndex: 'school_name',
      key: 'school_name',
      sorter: (a: any, b: any) => (a.school_name || '').localeCompare(b.school_name || ''),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Text strong>Data Type:</Text>
        <Select
          style={{ width: 200 }}
          placeholder="Select data type"
          value={selectedDataType}
          onChange={setSelectedDataType}
          options={[
            { value: 'athlete', label: 'College Athlete' },
            { value: 'hs_athlete', label: 'HS Athlete' },
            { value: 'juco_athlete', label: 'JUCO Athlete' },
            { value: 'school', label: 'School' },
            { value: 'coach', label: 'Coach' },
            { value: 'customer', label: 'Customer' }
          ]}
        />
      </div>

      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <AppstoreAddOutlined style={{ marginRight: 8 }} />
              {selectedDataType ? `${selectedDataType.charAt(0).toUpperCase() + selectedDataType.slice(1)} Data` : 'Edit/View Data'}
              {selectedDataType && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {selectedDataType.toUpperCase()}
                </Tag>
              )}
            </div>
          </div>
        }
      >
        {(selectedDataType === 'athlete' || selectedDataType === 'hs_athlete' || selectedDataType === 'juco_athlete') ? (
          <div>
            {/* Search Athletes Section */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Search {selectedDataType === 'athlete' ? 'College' : selectedDataType === 'hs_athlete' ? 'HS' : 'JUCO'} Athletes:
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Text strong>Search:</Text>
                <Input
                  placeholder="Search by name, school, or athlete ID"
                  value={athleteSearchInput}
                  onChange={(e) => setAthleteSearchInput(e.target.value)}
                  style={{ width: 400 }}
                  allowClear
                />
                <Text strong>Sport Filter:</Text>
                <Select
                  placeholder="All Sports"
                  value={
                    selectedDataType === 'athlete' ? selectedAthleteSearchSport :
                    selectedDataType === 'hs_athlete' ? selectedHsAthleteSearchSport :
                    selectedJucoAthleteSearchSport
                  }
                  onChange={(value) => {
                    if (selectedDataType === 'athlete') {
                      setSelectedAthleteSearchSport(value);
                    } else if (selectedDataType === 'hs_athlete') {
                      setSelectedHsAthleteSearchSport(value);
                    } else if (selectedDataType === 'juco_athlete') {
                      setSelectedJucoAthleteSearchSport(value);
                    }
                  }}
                  allowClear
                  style={{ width: 200 }}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={[
                    { value: undefined, label: 'All Sports' },
                    ...allSports.map(sport => ({
                      value: sport.id,
                      label: `${sport.name} (${sport.abbrev.toUpperCase()})`
                    }))
                  ]}
                />
              </div>
              
              <Table
                dataSource={
                  selectedDataType === 'athlete' ? athleteData :
                  selectedDataType === 'hs_athlete' ? hsAthleteData :
                  jucoAthleteData
                }
                loading={
                  selectedDataType === 'athlete' ? loadingAthleteData :
                  selectedDataType === 'hs_athlete' ? loadingHsAthleteData :
                  loadingJucoAthleteData
                }
                rowKey="athlete_id"
                pagination={{
                  current: selectedDataType === 'athlete' ? athletePagination.current :
                           selectedDataType === 'hs_athlete' ? hsAthletePagination.current :
                           jucoAthletePagination.current,
                  pageSize: selectedDataType === 'athlete' ? athletePagination.pageSize :
                           selectedDataType === 'hs_athlete' ? hsAthletePagination.pageSize :
                           jucoAthletePagination.pageSize,
                  total: selectedDataType === 'athlete' ? athletePagination.total :
                         selectedDataType === 'hs_athlete' ? hsAthletePagination.total :
                         jucoAthletePagination.total,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} athletes`,
                  onChange: (page) => {
                    if (selectedDataType === 'athlete') {
                      fetchAthleteData(page);
                    } else if (selectedDataType === 'hs_athlete') {
                      fetchHsAthleteData(page);
                    } else if (selectedDataType === 'juco_athlete') {
                      fetchJucoAthleteData(page);
                    }
                  }
                }}
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                  onClick: () => handleAthleteClick(record),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                   {
                     title: 'ID',
                     dataIndex: 'athlete_id',
                     key: 'athlete_id',
                     width: 300,
                     render: (id: string) => (
                       <Text code>{id}</Text>
                     ),
                   },
                    {
                      title: 'First Name',
                      dataIndex: 'athlete_first_name',
                      key: 'athlete_first_name',
                      sorter: (a: any, b: any) => (a.athlete_first_name || '').localeCompare(b.athlete_first_name || ''),
                    },
                    {
                      title: 'Last Name',
                      dataIndex: 'athlete_last_name',
                      key: 'athlete_last_name',
                      sorter: (a: any, b: any) => (a.athlete_last_name || '').localeCompare(b.athlete_last_name || ''),
                    },
                  {
                    title: 'School',
                    dataIndex: 'school_name',
                    key: 'school_name',
                    sorter: (a: any, b: any) => (a.school_name || '').localeCompare(b.school_name || ''),
                  },
                   {
                     title: 'Sport',
                     dataIndex: 'sport_name',
                     key: 'sport_name',
                     render: (sportName: string) => (
                       <Tag color="green">
                         {sportName}
                       </Tag>
                     ),
                     sorter: (a: any, b: any) => (a.sport_name || '').localeCompare(b.sport_name || ''),
                   },
                ]}
              />
            </div>

            {/* All Athletes Section - Only show if user has access and for College Athletes */}
            {hasAthleteAccess && selectedDataType === 'athlete' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Text strong>Sport:</Text>
                  <Select
                    style={{ width: 200 }}
                    placeholder="Select a sport"
                    value={selectedAthleteSport?.id}
                    onChange={(value) => {
                      const sport = allSports.find(s => s.id === value);
                      setSelectedAthleteSport(sport || null);
                    }}
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={allSports.map(sport => ({
                      value: sport.id,
                      label: `${sport.name} (${sport.abbrev.toUpperCase()})`
                    }))}
                  />
                </div>
                
                <Card 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <TeamOutlined style={{ marginRight: 8 }} />
                        {selectedAthleteSport ? `${selectedAthleteSport.name} Athletes` : 'All Athletes'}
                        {selectedAthleteSport && (
                          <Tag color="purple" style={{ marginLeft: 8 }}>
                            {selectedAthleteSport.abbrev.toUpperCase()}
                          </Tag>
                        )}
                      </div>
                      <Input.Search
                        style={{ width: 300 }}
                        placeholder="Search by name, school, or state..."
                        allowClear
                        value={athleteSearchInput}
                        onChange={(e) => setAthleteSearchInput(e.target.value)}
                        onSearch={(value) => setAthleteSearchInput(value)}
                      />
                    </div>
                  }
                >
                  <Table
                    columns={athleteColumns}
                    dataSource={filteredAthletes}
                    rowKey="athlete_id"
                    loading={loadingAthletes}
                    pagination={{
                      pageSize: 20,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} athletes`,
                    }}
                    scroll={{ x: 'max-content' }}
                    locale={{
                      emptyText: selectedAthleteSport 
                        ? `No athletes found for ${selectedAthleteSport.name}`
                        : 'Select a sport from the dropdown to view athletes'
                    }}
                  />
                </Card>
              </div>
            )}
            
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
                      // Move athlete's data types to the top
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

                    // Handle basic fields from athlete record
                    setAthleteFactData(null);
                  } else if (value === 'school_name') {

                    // Load school history when school field is selected
                    setAthleteFactData(null);
                    loadAthleteSchoolHistory(selectedAthlete?.athlete_id);
                  } else {

                    // Check if data types are loaded before fetching athlete fact data
                    if (dataTypes.length === 0) {
                      console.warn('⚠️ Data types not loaded yet');
                      return;
                    }

                    // Fetch athlete fact data for data type fields
                    loadAthleteFactData(selectedAthlete?.athlete_id, value);
                  }
                }}
              />
              
              {/* Display selected field data */}
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
                                    render: (_, record: any) => (
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
                                          // Preload the current school in search
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
                        
                        {/* Transfer Athlete Section */}
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
                      <div>
                        <Text>Value: {athleteFactData.value || 'N/A'}</Text>
                        {athleteFactData.unit && <Text> | Unit: {athleteFactData.unit}</Text>}
                        {athleteFactData.notes && <Text> | Notes: {athleteFactData.notes}</Text>}
                      </div>
                    ) : (
                      <Text>No data found for this field</Text>
                    )}
                  </div>
                  
                  {/* Add new fact section for data type fields */}
                  {selectedField !== 'first_name' && selectedField !== 'last_name' && selectedField !== 'school_name' && (
                    <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                      <Text strong style={{ display: 'block', marginBottom: 8 }}>Add New Fact:</Text>
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
                          // Trigger search when focused if there's a query
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
          </div>
        ) : selectedDataType === 'school' ? (
          <div>
            {/* Search Schools Section */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Search Schools:</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Text strong>Search:</Text>
                <Input
                  placeholder="Search by school name"
                  value={schoolSearchInput}
                  onChange={(e) => setSchoolSearchInput(e.target.value)}
                  style={{ width: 400 }}
                  allowClear
                />
              </div>
              
              <Table
                dataSource={schoolData}
                loading={loadingSchoolData}
                rowKey="id"
                pagination={{
                  current: schoolPagination.current,
                  pageSize: schoolPagination.pageSize,
                  total: schoolPagination.total,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} schools`,
                  onChange: (page) => fetchSchoolData(page)
                }}
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                  onClick: () => handleSchoolClick(record),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                  {
                    title: 'ID',
                    dataIndex: 'id',
                    key: 'id',
                    width: 300,
                    render: (id: string) => (
                      <Text code>{id}</Text>
                    ),
                  },
                  {
                    title: 'School Name',
                    dataIndex: 'name',
                    key: 'name',
                    sorter: (a: any, b: any) => (a.name || '').localeCompare(b.name || ''),
                  },
                ]}
              />
            </div>
          </div>
        ) : selectedDataType === 'coach' ? (
          <div>
            {/* Search Coaches Section */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Search Coaches:</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Text strong>Search:</Text>
                <Input
                  placeholder="Search by school name"
                  value={coachSearchInput}
                  onChange={(e) => setCoachSearchInput(e.target.value)}
                  style={{ width: 400 }}
                  allowClear
                />
                <Text strong>Sport Filter:</Text>
                <Select
                  placeholder="All Sports"
                  value={selectedCoachSport}
                  onChange={setSelectedCoachSport}
                  allowClear
                  style={{ width: 200 }}
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={[
                    { value: undefined, label: 'All Sports' },
                    ...sports.map(sport => ({
                      value: sport.name,
                      label: sport.name
                    }))
                  ]}
                />
                <Button 
                  type="primary" 
                  icon={<AppstoreAddOutlined />}
                  onClick={() => setIsAddCoachModalVisible(true)}
                >
                  Add Coach
                </Button>
              </div>
              
              <Table
                dataSource={coachData}
                loading={loadingCoachData}
                rowKey="id"
                pagination={{
                  current: coachPagination.current,
                  pageSize: coachPagination.pageSize,
                  total: coachPagination.total,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} coaches`,
                  onChange: (page) => fetchCoachData(page)
                }}
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                  onClick: () => handleCoachClick(record),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                  {
                    title: 'ID',
                    dataIndex: 'id',
                    key: 'id',
                    width: 300,
                    render: (id: string) => (
                      <Text code>{id}</Text>
                    ),
                  },
                  {
                    title: 'Coach Name',
                    key: 'coach_name',
                    render: (_: any, record: any) => {
                      const fullName = `${record.first_name || ''} ${record.last_name || ''}`.trim();
                      return fullName || 'N/A';
                    },
                    sorter: (a: any, b: any) => {
                      const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
                      const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim();
                      return aName.localeCompare(bName);
                    }
                  },
                  {
                    title: 'School Name',
                    dataIndex: 'school',
                    key: 'school_name',
                    sorter: (a: any, b: any) => (a.school || '').localeCompare(b.school || ''),
                  },
                  {
                    title: 'Sport',
                    dataIndex: 'sport',
                    key: 'sport_name',
                    sorter: (a: any, b: any) => (a.sport || '').localeCompare(b.sport || ''),
                    render: (sportName: string) => (
                      <Tag color="gold">{sportName}</Tag>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        ) : selectedDataType === 'customer' ? (
          <div>
            {/* Search Customers Section */}
            <div style={{ marginBottom: 24 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Search Customers:</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Text strong>Search:</Text>
                <Input
                  placeholder="Search by school name"
                  value={customerSearchInput}
                  onChange={(e) => setCustomerSearchInput(e.target.value)}
                  style={{ width: 400 }}
                  allowClear
                />
                <Text strong>Sport Filter:</Text>
                <Select
                  placeholder="All Sports"
                  value={selectedCustomerSport}
                  onChange={setSelectedCustomerSport}
                  allowClear
                  style={{ width: 200 }}
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={[
                    { value: undefined, label: 'All Sports' },
                    ...sports.map(sport => ({
                      value: sport.name,
                      label: sport.name
                    }))
                  ]}
                />
              </div>
              
              <Table
                dataSource={customerData}
                loading={loadingCustomerData}
                rowKey="id"
                pagination={{
                  current: customerPagination.current,
                  pageSize: customerPagination.pageSize,
                  total: customerPagination.total,
                  showSizeChanger: false,
                  showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} customers`,
                  onChange: (page) => fetchCustomerData(page)
                }}
                scroll={{ x: 'max-content' }}
                onRow={(record) => ({
                  onClick: () => handleCustomerClick(record),
                  style: { cursor: 'pointer' }
                })}
                columns={[
                  {
                    title: 'ID',
                    dataIndex: 'id',
                    key: 'id',
                    width: 300,
                    render: (id: string) => (
                      <Text code>{id}</Text>
                    ),
                  },
                  {
                    title: 'School Name',
                    dataIndex: 'school',
                    key: 'school_name',
                    sorter: (a: any, b: any) => (a.school || '').localeCompare(b.school || ''),
                  },
                  {
                    title: 'Sport',
                    dataIndex: 'sport',
                    key: 'sport_name',
                    sorter: (a: any, b: any) => (a.sport || '').localeCompare(b.sport || ''),
                    render: (sportName: string) => (
                      <Tag color="blue">{sportName}</Tag>
                    ),
                  },
                ]}
              />
            </div>
          </div>
        ) : selectedDataType ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">
              {selectedDataType.charAt(0).toUpperCase() + selectedDataType.slice(1)} data management interface will be implemented here.
            </Text>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">
              Please select a data type from the dropdown above to begin.
            </Text>
          </div>
        )}
      </Card>
      
      {/* School Modal - Global modal that can be opened from any data type */}
      <Modal
        title={`School ID: ${selectedSchool?.id || ''}`}
        open={isSchoolModalVisible}
        onCancel={() => setIsSchoolModalVisible(false)}
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
          loading={loadingSchoolDataTypes}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={[
            { 
              label: '✅ School Name', 
              value: 'name',
              style: { backgroundColor: '#f6ffed', fontWeight: 'bold' }
            },
            ...schoolDataTypes
              .sort((a, b) => {
                // Move school's data types to the top
                if (a.schoolHasIt && !b.schoolHasIt) return -1;
                if (!a.schoolHasIt && b.schoolHasIt) return 1;
                return a.name.localeCompare(b.name);
              })
              .map(dataType => ({
                label: dataType.schoolHasIt 
                  ? `✅ ${dataType.name}` 
                  : dataType.name,
                value: dataType.name,
                style: dataType.schoolHasIt 
                  ? { backgroundColor: '#f6ffed', fontWeight: 'bold' } 
                  : {}
              }))
          ]}
          value={selectedSchoolField}
          onChange={(value) => {

            
            setSelectedSchoolField(value);
            if (value === 'name') {

              // Handle school name field
              setSchoolFactData(null);
            } else {

              // Check if school data types are loaded before fetching school fact data
              if (schoolDataTypes.length === 0) {
                console.warn('⚠️ School data types not loaded yet');
                return;
              }
              // Fetch school fact data for data type fields
              loadSchoolFactData(selectedSchool?.id, value);
            }
          }}
        />
        
        {/* Display selected field data */}
        {selectedSchoolField && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <Text strong>Selected Field: {selectedSchoolField}</Text>
            <div style={{ marginTop: 8 }}>
              {loadingSchoolFactData ? (
                <Text>Loading...</Text>
              ) : selectedSchoolField === 'name' ? (
                <div>
                  {isEditingSchoolBasicInfo ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Input
                        value={editingSchoolName}
                        onChange={(e) => setEditingSchoolName(e.target.value)}
                        placeholder="Enter school name"
                        style={{ flex: 1 }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        loading={savingSchoolBasicInfo}
                        onClick={saveSchoolBasicInfo}
                        disabled={!editingSchoolName.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsEditingSchoolBasicInfo(false);
                          setEditingSchoolName('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Text>{selectedSchool?.name || 'N/A'}</Text>
                      <Button
                        size="small"
                        onClick={() => {
                          setIsEditingSchoolBasicInfo(true);
                          setEditingSchoolName(selectedSchool?.name || '');
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                </div>
              ) : schoolFactData ? (
                <div>
                  <Text>Value: {schoolFactData.value || 'N/A'}</Text>
                  {schoolFactData.unit && <Text> | Unit: {schoolFactData.unit}</Text>}
                  {schoolFactData.notes && <Text> | Notes: {schoolFactData.notes}</Text>}
                </div>
              ) : (
                <Text>No data found for this field</Text>
              )}
            </div>
            
            {/* Add new fact section for data type fields */}
            {selectedSchoolField !== 'name' && (
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Add New Fact:</Text>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Enter value for this field"
                    value={newSchoolFactValue}
                    onChange={(e) => setNewSchoolFactValue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    loading={savingSchoolFact}
                    onClick={() => {
                      if (newSchoolFactValue.trim()) {
                        saveSchoolFact(selectedSchool?.id, selectedSchoolField, newSchoolFactValue.trim());
                      }
                    }}
                    disabled={!newSchoolFactValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
      
      {/* Coach Modal - Global */}
      <Modal
        title={`Coach ID: ${selectedCoach?.id || ''}`}
        open={isCoachModalVisible}
        onCancel={() => setIsCoachModalVisible(false)}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16, padding: 8, backgroundColor: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            ℹ️ Name edits update the coach table. School and sport edits update the coach_school table. Other fields are coach facts.
          </Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Select Data Field:</Text>
        </div>
        <Select
          placeholder="Choose a data field to view"
          style={{ width: '100%', marginBottom: 16 }}
          loading={loadingCoachDataTypes}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={[
            { label: '✅ First Name', value: 'first_name', style: { backgroundColor: '#f6ffed', fontWeight: 'bold' } },
            { label: '✅ Last Name', value: 'last_name', style: { backgroundColor: '#f6ffed', fontWeight: 'bold' } },
            { label: '✅ School/Sport', value: 'school', style: { backgroundColor: '#f6ffed', fontWeight: 'bold' } },
            ...coachDataTypes
              .sort((a: any, b: any) => {
                if (a.coachHasIt && !b.coachHasIt) return -1;
                if (!a.coachHasIt && b.coachHasIt) return 1;
                return (a.name || '').localeCompare(b.name || '');
              })
              .map((dt: any) => ({
                label: dt.coachHasIt ? `✅ ${dt.name}` : dt.name,
                value: dt.name,
                style: dt.coachHasIt ? { backgroundColor: '#f6ffed', fontWeight: 'bold' } : {}
              }))
          ]}
          value={selectedCoachField}
          onChange={(value) => {
            setSelectedCoachField(value);
            if (value === 'first_name') {
              setNewCoachFactValue((selectedCoach?.first_name || '').toString());
              setCoachFactData(null);
            } else if (value === 'last_name') {
              setNewCoachFactValue((selectedCoach?.last_name || '').toString());
              setCoachFactData(null);
            } else if (value === 'school') {
              // Auto-load coach_school history

              (async () => {
                const history = await fetchCoachSchoolHistory(selectedCoach?.id);
                setCoachFactData({ history });
              })();
            } else if (value !== 'school') {
              // facts
              if (!coachDataTypes || coachDataTypes.length === 0) return;
              const dt = coachDataTypes.find((d: any) => d.name === value);
              if (!dt) return;
              loadCoachFactData(selectedCoach?.id, dt);
            } else {
              setCoachFactData(null);
            }
          }}
        />
        {selectedCoachField && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <Text strong>Selected Field: {selectedCoachField}</Text>
            <div style={{ marginTop: 8 }}>
              {loadingCoachFactData ? (
                <Text>Loading...</Text>
              ) : selectedCoachField === 'first_name' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Enter first name"
                    onChange={(e) => setNewCoachFactValue(e.target.value)}
                    value={newCoachFactValue}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    onClick={async () => {
                      if (!selectedCoach?.id || !newCoachFactValue.trim()) return;
                      await updateCoachBasicInfo(selectedCoach.id, { first_name: newCoachFactValue.trim() });
                      setSelectedCoach({ ...selectedCoach, first_name: newCoachFactValue.trim() });
                      // Refresh main coach table
                      await fetchCoachData();
                      setNewCoachFactValue('');
                    }}
                    disabled={!newCoachFactValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              ) : selectedCoachField === 'last_name' ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Enter last name"
                    onChange={(e) => setNewCoachFactValue(e.target.value)}
                    value={newCoachFactValue}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    onClick={async () => {
                      if (!selectedCoach?.id || !newCoachFactValue.trim()) return;
                      await updateCoachBasicInfo(selectedCoach.id, { last_name: newCoachFactValue.trim() });
                      setSelectedCoach({ ...selectedCoach, last_name: newCoachFactValue.trim() });
                      // Refresh main coach table
                      await fetchCoachData();
                      setNewCoachFactValue('');
                    }}
                    disabled={!newCoachFactValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              ) : selectedCoachField === 'school' ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Text strong>School/Sport History</Text>
                    <div style={{ marginTop: 8 }} />
                    {coachFactData?.history && (
                      <Table
                        dataSource={coachFactData.history}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: 'School', dataIndex: ['school','name'], key: 'school' },
                          { title: 'Sport', dataIndex: ['sport','name'], key: 'sport' },
                          { title: 'Start', dataIndex: 'start_date', key: 'start', render: (d: string) => d ? new Date(d).toLocaleDateString() : '' },
                          { title: 'End', dataIndex: 'end_date', key: 'end', render: (d: string|null) => d ? new Date(d).toLocaleDateString() : <Tag color="green">Current</Tag> },
                          { title: 'Actions', key: 'actions', render: (_: any, rec: any) => (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button size="small" onClick={() => { setCoachSchoolEditingRecord(rec); setCoachSchoolActionMode('end'); setCoachSchoolEndDate(''); setIsCoachSchoolActionVisible(true); }}>Assign End Date</Button>
                              <Button size="small" onClick={() => { 
                                setCoachSchoolEditingRecord(rec); 
                                setCoachSchoolActionMode('transfer'); 
                                setCoachSchoolTransferDate(''); 
                                setCoachSchoolSelectedSchool(null); 
                                setCoachSchoolNewSchoolQuery(''); 
                                setCoachSchoolNewSchoolOptions([]); 
                                setSelectedTransferSport(rec.sport || null); 
                                setIsCoachSchoolActionVisible(true); 
                              }}>Transfer</Button>
                              <Button size="small" onClick={() => { 
                                setCoachSchoolEditingRecord(rec); 
                                setCoachSchoolActionMode('edit'); 
                                setCoachSchoolStartDate(rec.start_date ? new Date(rec.start_date).toISOString().split('T')[0] : ''); 
                                setCoachSchoolEndDate(rec.end_date ? new Date(rec.end_date).toISOString().split('T')[0] : ''); 
                                setCoachSchoolSelectedSchool(rec.school || null); 
                                setSelectedEditSport(rec.sport || null); 
                                setIsCoachSchoolActionVisible(true); 
                              }}>Edit Row</Button>
                            </div>
                          )}
                        ]}
                      />
                    )}
                  </div>
                </div>
              ) : coachFactData ? (
                <div>
                  <Text>Value: {coachFactData.value || 'N/A'}</Text>
                </div>
              ) : (
                <Text>No data found for this field</Text>
              )}
            </div>
            {selectedCoachField !== 'first_name' && selectedCoachField !== 'last_name' && selectedCoachField !== 'school' && (
              <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Add New Fact:</Text>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    placeholder="Enter value for this field"
                    value={newCoachFactValue}
                    onChange={(e) => setNewCoachFactValue(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="primary"
                    loading={savingCoachFact}
                    onClick={async () => {
                      const dt = coachDataTypes.find((d: any) => d.name === selectedCoachField || d.data_type_id === selectedCoachField);
                      if (!dt || !newCoachFactValue.trim()) return;
                      setSavingCoachFact(true);
                      try {
                        await insertCoachFact(selectedCoach?.id, dt.data_type_id || dt.id, newCoachFactValue.trim());
                        setNewCoachFactValue('');
                      } finally {
                        setSavingCoachFact(false);
                      }
                    }}
                    disabled={!newCoachFactValue.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Coach School Action Modal */}
      <Modal
        title={coachSchoolActionMode === 'end' ? 'Assign End Date' : coachSchoolActionMode === 'transfer' ? 'Transfer Coach' : coachSchoolActionMode === 'edit' ? 'Edit Coach-School Row' : ''}
        open={isCoachSchoolActionVisible}
        onCancel={() => setIsCoachSchoolActionVisible(false)}
        footer={null}
        width={560}
      >
        {coachSchoolActionMode === 'end' && (
          <div>
            <Text strong>End Date</Text>
            <Input type="date" value={coachSchoolEndDate} onChange={(e) => setCoachSchoolEndDate(e.target.value)} style={{ marginTop: 8 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setIsCoachSchoolActionVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={async () => {
                if (!coachSchoolEndDate) return;
                await endCoachSchoolRecord(coachSchoolEditingRecord.id, coachSchoolEndDate);
                const history = await fetchCoachSchoolHistory(selectedCoach?.id);
                setCoachFactData({ history });
                await fetchCoachData();
                setIsCoachSchoolActionVisible(false);
              }}>Save</Button>
            </div>
          </div>
        )}
        {coachSchoolActionMode === 'transfer' && (
          <div>
            <Text strong>Transfer Date</Text>
            <Input type="date" value={coachSchoolTransferDate} onChange={(e) => setCoachSchoolTransferDate(e.target.value)} style={{ marginTop: 8, marginBottom: 12 }} />
            <Text strong>Sport</Text>
            <Select
              style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
              placeholder="Select sport"
              value={selectedTransferSport?.id}
              onChange={(sportId) => {
                const sport = sportOptions.find(s => s.id === sportId);
                setSelectedTransferSport(sport);
              }}
              loading={loadingSportOptions}
              options={sportOptions.map(sport => ({
                value: sport.id,
                label: sport.name
              }))}
            />
            <Text strong>Destination School</Text>
            <Input 
              placeholder="Type to search schools..." 
              value={coachSchoolNewSchoolQuery} 
              onChange={async (e) => {
                const q = e.target.value; 
                setCoachSchoolNewSchoolQuery(q);
                if (q.trim().length >= 2) {
                  setLoadingCoachSchoolOptions(true);
                  try {
                    const results = await searchSchools(q, 50); // Increased limit for better search
                    setCoachSchoolNewSchoolOptions(results.data || []);
                  } catch (error) {
                    console.error('Error searching schools:', error);
                    setCoachSchoolNewSchoolOptions([]);
                  } finally {
                    setLoadingCoachSchoolOptions(false);
                  }
                } else {
                  setCoachSchoolNewSchoolOptions([]);
                }
              }} 
              style={{ marginTop: 8 }} 
            />
            {loadingCoachSchoolOptions && (
              <div style={{ padding: '8px 12px', color: '#666', fontSize: '12px' }}>
                Searching schools...
              </div>
            )}
            {!loadingCoachSchoolOptions && coachSchoolNewSchoolOptions.length > 0 && (
              <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                {coachSchoolNewSchoolOptions.map((s) => (
                  <div 
                    key={s.id} 
                    style={{ 
                      padding: '8px 12px', 
                      cursor: 'pointer', 
                      background: coachSchoolSelectedSchool?.id === s.id ? '#e6f7ff' : 'transparent',
                      borderBottom: '1px solid #f0f0f0'
                    }} 
                    onClick={() => setCoachSchoolSelectedSchool(s)}
                    onMouseEnter={(e) => {
                      if (coachSchoolSelectedSchool?.id !== s.id) {
                        e.currentTarget.style.background = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (coachSchoolSelectedSchool?.id !== s.id) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{s.name}</div>
                    {s.city && s.state && (
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 2 }}>
                        {s.city}, {s.state}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!loadingCoachSchoolOptions && coachSchoolNewSchoolQuery.length >= 2 && coachSchoolNewSchoolOptions.length === 0 && (
              <div style={{ padding: '8px 12px', color: '#999', fontSize: '12px' }}>
                No schools found matching: {coachSchoolNewSchoolQuery}
              </div>
            )}
            {coachSchoolSelectedSchool && (
              <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
                <Text strong style={{ color: '#52c41a' }}>Selected: {coachSchoolSelectedSchool.name}</Text>
                <Button 
                  size="small" 
                  type="link" 
                  onClick={() => setCoachSchoolSelectedSchool(null)}
                  style={{ marginLeft: 8 }}
                >
                  Clear
                </Button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setIsCoachSchoolActionVisible(false)}>Cancel</Button>
              <Button 
                type="primary" 
                disabled={!coachSchoolTransferDate || !coachSchoolSelectedSchool || !selectedTransferSport}
                onClick={async () => {
                  if (!coachSchoolTransferDate || !coachSchoolSelectedSchool || !selectedTransferSport) return;
                  await transferCoach(selectedCoach?.id, coachSchoolEditingRecord.id, coachSchoolSelectedSchool.id, selectedTransferSport.id, coachSchoolTransferDate);
                  const history = await fetchCoachSchoolHistory(selectedCoach?.id);
                  setCoachFactData({ history });
                  await fetchCoachData();
                  setIsCoachSchoolActionVisible(false);
                }}
              >
                Transfer
              </Button>
            </div>
          </div>
        )}
        {coachSchoolActionMode === 'edit' && (
          <div>
            <Text strong>Start Date</Text>
            <Input type="date" value={coachSchoolStartDate} onChange={(e) => setCoachSchoolStartDate(e.target.value)} style={{ marginTop: 8, marginBottom: 12 }} />
            <Text strong>End Date</Text>
            <Input type="date" value={coachSchoolEndDate} onChange={(e) => setCoachSchoolEndDate(e.target.value)} style={{ marginTop: 8, marginBottom: 12 }} />
            <Text strong>Sport</Text>
            <Select
              style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
              placeholder="Select sport"
              value={selectedEditSport?.id}
              onChange={(sportId) => {
                const sport = sportOptions.find(s => s.id === sportId);
                setSelectedEditSport(sport);
              }}
              loading={loadingSportOptions}
              options={sportOptions.map(sport => ({
                value: sport.id,
                label: sport.name
              }))}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setIsCoachSchoolActionVisible(false)}>Cancel</Button>
              <Button type="primary" onClick={async () => {
                const updates: any = {};
                if (coachSchoolStartDate) updates.start_date = coachSchoolStartDate;
                updates.end_date = coachSchoolEndDate || null;
                if (selectedEditSport) updates.sport_id = selectedEditSport.id;
                await updateCoachSchoolRecord(coachSchoolEditingRecord.id, updates);
                const history = await fetchCoachSchoolHistory(selectedCoach?.id);
                setCoachFactData({ history });
                await fetchCoachData();
                setIsCoachSchoolActionVisible(false);
              }}>Save</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Customer Modal - Global modal that can be opened from any data type */}
      <Modal
        title={`Customer ID: ${selectedCustomer?.id || ''}`}
        open={isCustomerModalVisible}
        onCancel={() => setIsCustomerModalVisible(false)}
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
          loading={loadingCustomerDataTypes}
          showSearch
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={[
            ...customerDataTypes
              .sort((a, b) => {
                // Move customer's data types to the top
                if (a.customerHasIt && !b.customerHasIt) return -1;
                if (!a.customerHasIt && b.customerHasIt) return 1;
                return a.name.localeCompare(b.name);
              })
              .map(dataType => ({
                label: dataType.customerHasIt 
                  ? `✅ ${dataType.name}` 
                  : dataType.name,
                value: dataType.name,
                style: dataType.customerHasIt 
                  ? { backgroundColor: '#f6ffed', fontWeight: 'bold' } 
                  : {}
              }))
          ]}
          value={selectedCustomerField}
          onChange={(value) => {
            
            setSelectedCustomerField(value);
            // Check if customer data types are loaded before fetching customer fact data
            if (customerDataTypes.length === 0) {
              console.warn('⚠️ Customer data types not loaded yet');
              return;
            }
            // Fetch customer fact data for data type fields
            loadCustomerFactData(selectedCustomer?.id, value);
          }}
        />
        
        {/* Display selected field data */}
        {selectedCustomerField && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
            <Text strong>Selected Field: {selectedCustomerField}</Text>
            <div style={{ marginTop: 8 }}>
              {loadingCustomerFactData ? (
                <Text>Loading...</Text>
              ) : customerFactData ? (
                <div>
                  <Text>Value: {customerFactData.value || 'N/A'}</Text>
                  {customerFactData.unit && <Text> | Unit: {customerFactData.unit}</Text>}
                  {customerFactData.notes && <Text> | Notes: {customerFactData.notes}</Text>}
                </div>
              ) : (
                <Text>No data found for this field</Text>
              )}
            </div>
            
            {/* Add new fact section for data type fields */}
            <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Add New Fact:</Text>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input
                  placeholder="Enter value for this field"
                  value={newCustomerFactValue}
                  onChange={(e) => setNewCustomerFactValue(e.target.value)}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  loading={savingCustomerFact}
                  onClick={() => {
                    if (newCustomerFactValue.trim()) {
                      saveCustomerFact(selectedCustomer?.id, selectedCustomerField, newCustomerFactValue.trim());
                    }
                  }}
                  disabled={!newCustomerFactValue.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Coach Modal */}
      <Modal
        title="Add New Coach"
        open={isAddCoachModalVisible}
        onCancel={() => setIsAddCoachModalVisible(false)}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>Basic Information</Text>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Text strong>First Name *</Text>
            <Input
              value={newCoachFirstName}
              onChange={(e) => setNewCoachFirstName(e.target.value)}
              placeholder="Enter first name"
              style={{ marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Last Name *</Text>
            <Input
              value={newCoachLastName}
              onChange={(e) => setNewCoachLastName(e.target.value)}
              placeholder="Enter last name"
              style={{ marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>School Assignment</Text>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>School *</Text>
          <Input
            placeholder="Search for school..."
            value={newCoachSchoolQuery}
            onChange={async (e) => {
              const query = e.target.value;
              setNewCoachSchoolQuery(query);
              if (query.trim()) {
                const result = await searchSchools(query, 10);
                setNewCoachSchoolOptions(result.data || []);
              } else {
                setNewCoachSchoolOptions([]);
              }
            }}
            style={{ marginTop: 4 }}
          />
          {newCoachSchoolOptions.length > 0 && (
            <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, marginTop: 4, maxHeight: 200, overflow: 'auto' }}>
              {newCoachSchoolOptions.map((school) => (
                <div
                  key={school.id}
                  style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
                  onClick={() => {
                    setNewCoachSchool(school);
                    setNewCoachSchoolQuery(school.name);
                    setNewCoachSchoolOptions([]);
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{school.name}</div>
                  {school.city && school.state && (
                    <div style={{ fontSize: '12px', color: '#666' }}>{school.city}, {school.state}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {newCoachSchool && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4 }}>
              <Text strong style={{ color: '#52c41a' }}>Selected: {newCoachSchool.name}</Text>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <Text strong>Sport *</Text>
            <Select
              style={{ width: '100%', marginTop: 4 }}
              placeholder="Select sport"
              value={newCoachSport?.id}
              onChange={(sportId) => {
                const sport = sportOptions.find(s => s.id === sportId);
                setNewCoachSport(sport);
              }}
              options={sportOptions.map(sport => ({
                value: sport.id,
                label: sport.name
              }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>Start Date *</Text>
            <Input
              type="date"
              value={newCoachStartDate}
              onChange={(e) => setNewCoachStartDate(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong>End Date</Text>
            <Input
              type="date"
              value={newCoachEndDate}
              onChange={(e) => setNewCoachEndDate(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text strong>Additional Coach Facts</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: 4 }}>
            Add any additional information for this coach
          </Text>
        </div>
        
        {/* Add new fact section */}
        <div style={{ marginBottom: 16, padding: 16, border: '1px solid #f0f0f0', borderRadius: 4 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <Text strong>Select Fact Type</Text>
              <Select
                style={{ width: '100%', marginTop: 4 }}
                placeholder="Choose a fact type"
                value={newCoachSelectedFactType}
                onChange={(value) => {
                  const dataType = coachDataTypes.find(dt => dt.id === value);
                  setNewCoachSelectedFactType(value);
                  setNewCoachSelectedFactName(dataType?.name || '');
                }}
                options={coachDataTypes
                  .filter(dt => !newCoachFacts[dt.name]) // Only show facts not already added
                  .map(dataType => ({
                    value: dataType.id,
                    label: dataType.name
                  }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Text strong>Value</Text>
              <Input
                placeholder="Enter value"
                value={newCoachFactInputValue}
                onChange={(e) => setNewCoachFactInputValue(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button
                type="primary"
                onClick={() => {
                  if (newCoachSelectedFactType && newCoachFactInputValue.trim()) {
                    setNewCoachFacts(prev => ({
                      ...prev,
                      [newCoachSelectedFactName]: newCoachFactInputValue.trim()
                    }));
                    setNewCoachSelectedFactType(null);
                    setNewCoachSelectedFactName('');
                    setNewCoachFactInputValue('');
                  }
                }}
                disabled={!newCoachSelectedFactType || !newCoachFactInputValue.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Show added facts */}
        {Object.keys(newCoachFacts).length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <Text strong>Added Facts:</Text>
            <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
              {Object.entries(newCoachFacts).map(([factName, value]) => (
                <div key={factName} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '8px 12px', 
                  marginBottom: 4, 
                  background: '#f6ffed', 
                  border: '1px solid #b7eb8f', 
                  borderRadius: 4 
                }}>
                  <div>
                    <Text strong>{factName}:</Text> {value}
                  </div>
                  <Button
                    size="small"
                    type="text"
                    danger
                    onClick={() => {
                      setNewCoachFacts(prev => {
                        const newFacts = { ...prev };
                        delete newFacts[factName];
                        return newFacts;
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button onClick={() => setIsAddCoachModalVisible(false)}>
            Cancel
          </Button>
          <Button
            type="primary"
            loading={savingNewCoach}
            disabled={!newCoachFirstName.trim() || !newCoachLastName.trim() || !newCoachSchool || !newCoachSport || !newCoachStartDate}
            onClick={handleSaveNewCoach}
          >
            Add Coach
          </Button>
        </div>
      </Modal>
    </div>
  );
}
