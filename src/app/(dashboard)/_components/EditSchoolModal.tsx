"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Button,
  Row,
  Col,
  Divider,
  message,
  Card,
  Typography,
  Space,
  Select,
  DatePicker,
} from "antd";
import { fetchSchoolFacts, fetchCoachInfo, updateSchoolFact, updateCoachFact, updateCoachBasicInfo, searchSchools, fetchSports, saveNewCoach, endCoachSchoolRecord, transferCoach, updateCoachSchoolRecord, fetchCoachSchoolHistory } from "@/lib/queries";
import { supabase } from "@/lib/supabaseClient";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface EditSchoolModalProps {
  isVisible: boolean;
  onClose: () => void;
  schoolId: string;
  schoolName: string;
  onSave: () => void;
}

interface SchoolFact {
  id: string;
  data_type_id: number;
  value: string;
  data_type: {
    id: number;
    name: string;
  };
}

interface CoachInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  best_phone: string;
  twitterHandle: string;
  facts: SchoolFact[];
}

export default function EditSchoolModal({
  isVisible,
  onClose,
  schoolId,
  schoolName,
  onSave,
}: EditSchoolModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolFacts, setSchoolFacts] = useState<SchoolFact[]>([]);
  const [coachInfo, setCoachInfo] = useState<CoachInfo | null>(null);
  const [dataTypes, setDataTypes] = useState<any[]>([]);
  
  // Coach management states
  const [isCoachManagementVisible, setIsCoachManagementVisible] = useState(false);
  const [coachManagementMode, setCoachManagementMode] = useState<'add'|'manage'|'end'|'transfer'|'edit'|null>(null);
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [coachSchoolHistory, setCoachSchoolHistory] = useState<any[]>([]);
  const [loadingCoachHistory, setLoadingCoachHistory] = useState(false);
  
  // Add new coach states
  const [newCoachFirstName, setNewCoachFirstName] = useState('');
  const [newCoachLastName, setNewCoachLastName] = useState('');
  const [newCoachChangeDate, setNewCoachChangeDate] = useState('');
  const [savingNewCoach, setSavingNewCoach] = useState(false);
  
  // Coach school action states (keeping for manage mode)
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
  const [savingCoachChanges, setSavingCoachChanges] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isVisible && schoolId) {
      loadData();
      loadSportOptions();
    }
  }, [isVisible, schoolId]);

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

  // Load coach school history
  const loadCoachSchoolHistory = async (coachId: string) => {
    try {
      setLoadingCoachHistory(true);
      const history = await fetchCoachSchoolHistory(coachId);
      setCoachSchoolHistory(history);
    } catch (error) {
      console.error('Error loading coach school history:', error);
    } finally {
      setLoadingCoachHistory(false);
    }
  };


  // Search schools for transfer
  const searchSchoolsForTransfer = async (query: string) => {
    if (!query.trim()) {
      setCoachSchoolNewSchoolOptions([]);
      return;
    }
    
    try {
      setLoadingCoachSchoolOptions(true);
      const result = await searchSchools(query, 50);
      setCoachSchoolNewSchoolOptions(result.data || []);
    } catch (error) {
      console.error('Error searching schools:', error);
      setCoachSchoolNewSchoolOptions([]);
    } finally {
      setLoadingCoachSchoolOptions(false);
    }
  };

  // Save new coach
  const handleSaveNewCoach = async () => {
    if (!newCoachFirstName.trim() || !newCoachLastName.trim() || !newCoachChangeDate) {
      message.error('Please fill in all required fields');
      return;
    }

    try {
      setSavingNewCoach(true);
      
      // Get Football sport ID (assuming it exists)
      const sports = await fetchSports();
      const footballSport = sports.find(sport => sport.name.toLowerCase().includes('football'));
      
      if (!footballSport) {
        message.error('Football sport not found');
        return;
      }
      
      // Create new coach
      await saveNewCoach(
        newCoachFirstName.trim(),
        newCoachLastName.trim(),
        schoolId, // Use current school ID
        footballSport.id,
        newCoachChangeDate,
        null, // No end date for new coach
        {}, // No coach facts
        dataTypes.filter(dt => dt.name) // Filter out invalid data types
      );

      // End the current coach's record with the same date
      if (coachInfo && coachInfo.id) {
        await endCoachSchoolRecord(coachInfo.id, newCoachChangeDate);
      }

      // Reset form
      setNewCoachFirstName('');
      setNewCoachLastName('');
      setNewCoachChangeDate('');
      setIsCoachManagementVisible(false);
      setCoachManagementMode(null);

      // Clear form before loading new data
      form.resetFields();
      
      // Refresh coach data
      await loadData();
      message.success('Coaching change completed successfully');
    } catch (error) {
      console.error('Error saving coaching change:', error);
      message.error('Failed to complete coaching change');
    } finally {
      setSavingNewCoach(false);
    }
  };

  // Handle coach school actions
  const handleEndCoach = async () => {
    if (!coachSchoolEndDate || !coachSchoolEditingRecord) return;
    
    try {
      setSavingCoachChanges(true);
      await endCoachSchoolRecord(coachSchoolEditingRecord.id, coachSchoolEndDate);
      
      // Refresh coach data
      await loadData();
      setIsCoachManagementVisible(false);
      setCoachManagementMode(null);
      message.success('Coach end date assigned successfully');
    } catch (error) {
      console.error('Error ending coach:', error);
      message.error('Failed to assign end date');
    } finally {
      setSavingCoachChanges(false);
    }
  };

  const handleTransferCoach = async () => {
    if (!coachSchoolTransferDate || !coachSchoolSelectedSchool || !selectedTransferSport || !coachSchoolEditingRecord) return;
    
    try {
      setSavingCoachChanges(true);
      await transferCoach(
        coachSchoolEditingRecord.coach_id,
        coachSchoolEditingRecord.id,
        coachSchoolSelectedSchool.id,
        selectedTransferSport.id,
        coachSchoolTransferDate
      );
      
      // Refresh coach data
      await loadData();
      setIsCoachManagementVisible(false);
      setCoachManagementMode(null);
      message.success('Coach transferred successfully');
    } catch (error) {
      console.error('Error transferring coach:', error);
      message.error('Failed to transfer coach');
    } finally {
      setSavingCoachChanges(false);
    }
  };

  const handleEditCoachRecord = async () => {
    if (!coachSchoolEditingRecord) return;
    
    try {
      setSavingCoachChanges(true);
      const updates: any = {};
      if (coachSchoolStartDate) updates.start_date = coachSchoolStartDate;
      updates.end_date = coachSchoolEndDate || null;
      if (selectedEditSport) updates.sport_id = selectedEditSport.id;
      
      await updateCoachSchoolRecord(coachSchoolEditingRecord.id, updates);
      
      // Refresh coach data
      await loadData();
      setIsCoachManagementVisible(false);
      setCoachManagementMode(null);
      message.success('Coach record updated successfully');
    } catch (error) {
      console.error('Error updating coach record:', error);
      message.error('Failed to update coach record');
    } finally {
      setSavingCoachChanges(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load school facts
      const facts = await fetchSchoolFacts(schoolId);
      console.log('Loaded school facts:', facts);
      setSchoolFacts(facts);
      
      // Load coach info
      const coach = await fetchCoachInfo(schoolId);
      console.log('Loaded coach info:', coach);
      setCoachInfo(coach);
      
      // Load data types for dropdowns
      const { data: dataTypesData, error: dataTypesError } = await supabase
        .from('data_type')
        .select('id, name')
        .order('name');
      
      if (dataTypesError) throw dataTypesError;
      setDataTypes(dataTypesData || []);
      
      // Set form values
      const formValues: any = {};
      
      // Set school facts - map to the specific editable fields
      facts.forEach(fact => {
        const dataTypeName = fact.data_type.name;
        let fieldName = '';
        
        // Map data type names to form field names
        switch (dataTypeName) {
          case 'address_state':
          case 'state_id':
            fieldName = 'address_state';
            break;
          case 'address_street':
          case 'address_street1':
            fieldName = 'address_street';
            break;
          case 'address_street2':
            fieldName = 'address_street2';
            break;
          case 'address_city':
            fieldName = 'address_city';
            break;
          case 'address_zip':
          case 'address_zipcode':
            fieldName = 'address_zip';
            break;
          case 'ad_name_first':
          case 'ad_first_name':
            fieldName = 'ad_name_first';
            break;
          case 'ad_name_last':
          case 'ad_last_name':
            fieldName = 'ad_name_last';
            break;
          case 'ad_email':
            fieldName = 'ad_email';
            break;
          case 'fb_2025_record':
            fieldName = 'fb_2025_record';
            break;
          case 'fb_2024_record':
            fieldName = 'fb_2024_record';
            break;
          case 'conference':
            fieldName = 'conference';
            break;
          case 'enrollment_size':
            fieldName = 'enrollment_size';
            break;
          case 'affiliation':
            fieldName = 'affiliation';
            break;
          case 'private_public':
            fieldName = 'private_public';
            break;
          case 'school_phone':
            fieldName = 'school_phone';
            break;
          default:
            return; // Skip fields not in our editable list
        }
        
        if (fieldName && fact.value) {
          if (dataTypeName.includes('date')) {
            formValues[fieldName] = dayjs(fact.value);
          } else {
            formValues[fieldName] = fact.value;
          }
        }
      });
      
      // Set coach info
      if (coach) {
        formValues.coach_firstName = coach.firstName;
        formValues.coach_lastName = coach.lastName;
        formValues.coach_email = coach.email;
        formValues.coach_phone = coach.phone;
        formValues.coach_twitterHandle = coach.twitterHandle;
        formValues.coach_best_phone = coach.best_phone;
        
      // Set coach facts - map to the specific editable fields
      coach.facts?.forEach((fact: SchoolFact) => {
        const dataTypeId = fact.data_type_id;
        const dataTypeName = fact.data_type.name;
        let fieldName = '';
        
        // Map coach data type IDs and names to form field names
        switch (dataTypeId) {
          case 13: // Twitter handle
            fieldName = 'coach_twitterHandle';
            break;
          case 27: // Cell phone
            fieldName = 'coach_cell_phone';
            break;
          case 571: // Email
            fieldName = 'coach_email';
            break;
          case 969: // Best phone
            fieldName = 'coach_best_phone';
            break;
          case 970: // Best contact
            fieldName = 'coach_best_contact';
            break;
          default:
            // Also try by name as fallback
            switch (dataTypeName) {
              case 'home_phone':
                fieldName = 'coach_home_phone';
                break;
              case 'cell_phone':
                fieldName = 'coach_cell_phone';
                break;
              case 'office_phone':
                fieldName = 'coach_office_phone';
                break;
              case 'best_contact':
                fieldName = 'coach_best_contact';
                break;
              default:
                return; // Skip fields not in our editable list
            }
        }
        
        if (fieldName && fact.value) {
          if (dataTypeName.includes('date')) {
            formValues[fieldName] = dayjs(fact.value);
          } else if (fieldName === 'coach_best_contact') {
            // Convert comma-separated string to array for multi-select, maintaining order: Call, Text, Email
            const orderedOptions = ['Call', 'Text', 'Email'];
            const selectedItems = fact.value.split(',').map((item: string) => item.trim()).filter((item: string) => item);
            const orderedSelection = selectedItems
              .filter((item: string) => orderedOptions.includes(item))
              .sort((a: string, b: string) => orderedOptions.indexOf(a) - orderedOptions.indexOf(b));
            formValues[fieldName] = orderedSelection;
          } else {
            formValues[fieldName] = fact.value;
          }
        }
      });
      }
      
      console.log('Setting form values:', formValues);
      form.setFieldsValue(formValues);
    } catch (error) {
      console.error('Error loading data:', error);
      message.error('Failed to load school data');
    } finally {
      setLoading(false);
    }
  };

  const resetCoachFields = () => {
    if (!coachInfo) return;
    
    // First, reset all coach fields to empty values to clear any changes
    const coachFieldsToReset = [
      'coach_firstName',
      'coach_lastName', 
      'coach_email',
      'coach_twitterHandle',
      'coach_best_phone',
      'coach_home_phone',
      'coach_cell_phone',
      'coach_office_phone',
      'coach_best_contact'
    ];
    
    const emptyValues: any = {};
    coachFieldsToReset.forEach(field => {
      emptyValues[field] = '';
    });
    form.setFieldsValue(emptyValues);
    
    // Now set the original values
    const coachFieldValues: any = {
      coach_firstName: coachInfo.firstName || '',
      coach_lastName: coachInfo.lastName || '',
      coach_email: coachInfo.email || '',
      coach_twitterHandle: coachInfo.twitterHandle || '',
      coach_best_phone: coachInfo.best_phone || ''
    };
    
    // Reset coach facts to their original values
    if (coachInfo.facts) {
      coachInfo.facts.forEach((fact: any) => {
        const dataTypeId = fact.data_type_id;
        const dataTypeName = fact.data_type.name;
        let fieldName = '';
        
        switch (dataTypeId) {
          case 27: // Cell phone
            fieldName = 'coach_cell_phone';
            break;
          case 571: // Email
            fieldName = 'coach_email';
            break;
          case 968: // Home phone
            fieldName = 'coach_home_phone';
            break;
          case 967: // Office phone
            fieldName = 'coach_office_phone';
            break;
          case 969: // Best phone
            fieldName = 'coach_best_phone';
            break;
          case 970: // Best contact
            fieldName = 'coach_best_contact';
            break;
          default:
            // Also try by name as fallback
            switch (dataTypeName) {
              case 'home_phone':
                fieldName = 'coach_home_phone';
                break;
              case 'cell_phone':
                fieldName = 'coach_cell_phone';
                break;
              case 'office_phone':
                fieldName = 'coach_office_phone';
                break;
              case 'best_contact':
                fieldName = 'coach_best_contact';
                break;
            }
        }
        
        if (fieldName && fact.value) {
          if (fieldName === 'coach_best_contact') {
            // Convert comma-separated string to array for multi-select, maintaining order: Call, Text, Email
            const orderedOptions = ['Call', 'Text', 'Email'];
            const selectedItems = fact.value.split(',').map((item: string) => item.trim()).filter((item: string) => item);
            const orderedSelection = selectedItems
              .filter((item: string) => orderedOptions.includes(item))
              .sort((a: string, b: string) => orderedOptions.indexOf(a) - orderedOptions.indexOf(b));
            coachFieldValues[fieldName] = orderedSelection;
          } else {
            coachFieldValues[fieldName] = fact.value;
          }
        }
      });
    }
    
    // Set the form values to reset coach fields
    form.setFieldsValue(coachFieldValues);
  };

  const handleSaveCoachChanges = async () => {
    if (!coachInfo) return;
    
    try {
      setSavingCoachChanges(true);
      
      // Get form values for coach fields
      const formValues = form.getFieldsValue();
      
      // Update coach basic info (only fields that exist in coach table)
      await updateCoachBasicInfo(coachInfo.id, {
        first_name: formValues.coach_firstName || coachInfo.firstName,
        last_name: formValues.coach_lastName || coachInfo.lastName
        // Note: email, phone, twitter_handle, and best_phone are stored in coach_fact table, not coach table
      });
      
      // Update coach facts for all coach data
      const phoneUpdates = [];
      if (formValues.coach_email !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 571, formValues.coach_email)); // Email
      }
      if (formValues.coach_phone !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 27, formValues.coach_phone)); // Phone
      }
      if (formValues.coach_twitterHandle !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 13, formValues.coach_twitterHandle)); // Twitter handle
      }
      if (formValues.coach_home_phone !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 968, formValues.coach_home_phone)); // Home phone
      }
      if (formValues.coach_cell_phone !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 27, formValues.coach_cell_phone)); // Cell phone
      }
      if (formValues.coach_office_phone !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 967, formValues.coach_office_phone)); // Office phone
      }
      if (formValues.coach_best_phone !== undefined) {
        phoneUpdates.push(updateCoachFact(coachInfo.id, 969, formValues.coach_best_phone)); // Best phone
      }
      if (formValues.coach_best_contact !== undefined) {
        // Convert array to comma-separated string for storage, maintaining order: Call, Text, Email
        let bestContactValue;
        if (Array.isArray(formValues.coach_best_contact)) {
          const orderedOptions = ['Call', 'Text', 'Email'];
          const orderedSelection = formValues.coach_best_contact
            .filter((item: string) => orderedOptions.includes(item))
            .sort((a: string, b: string) => orderedOptions.indexOf(a) - orderedOptions.indexOf(b));
          bestContactValue = orderedSelection.join(', ');
        } else {
          bestContactValue = formValues.coach_best_contact;
        }
        phoneUpdates.push(updateCoachFact(coachInfo.id, 970, bestContactValue)); // Best contact
      }
      
      // Execute all phone updates
      await Promise.all(phoneUpdates);
      
      // Clear form before loading new data
      form.resetFields();
      
      // Refresh data
      await loadData();
      setIsEditingCoach(false);
    } catch (error) {
      console.error('Error updating coach:', error);
      message.error('Failed to update coach information');
    } finally {
      setSavingCoachChanges(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();
      
      // Update school facts with timeout protection
      try {
        await Promise.race([
          updateSchoolFacts(values),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('School facts update timeout')), 30000)
          )
        ]);
      } catch (error) {
        console.error('Error updating school facts:', error);
        message.warning('Some school information may not have been saved. Please try again.');
      }
      
      // Update coach info
      if (coachInfo) {
        try {
        await updateCoachInfo(values);
          
          // If in edit mode, also update coach basic info and facts
          if (isEditingCoach) {
            await handleSaveCoachChanges();
          }
        } catch (error) {
          console.error('Error updating coach info:', error);
          message.warning('Coach information may not have been saved. Please try again.');
        }
      }
      
      message.success('School information updated successfully');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving data:', error);
      if (error instanceof Error && error.message === 'School facts update timeout') {
        message.error('Save operation timed out. Please try again with fewer changes.');
      } else {
      message.error('Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const updateSchoolFacts = async (values: any) => {
    // Map form field names to data type names and update
    const fieldMappings = [
      { formField: 'address_street', dataTypeName: 'address_street' },
      { formField: 'address_street2', dataTypeName: 'address_street2' },
      { formField: 'address_city', dataTypeName: 'address_city' },
      { formField: 'address_state', dataTypeName: 'address_state' },
      { formField: 'address_zip', dataTypeName: 'address_zip' },
      { formField: 'ad_name_first', dataTypeName: 'ad_name_first' },
      { formField: 'ad_name_last', dataTypeName: 'ad_name_last' },
      { formField: 'ad_email', dataTypeName: 'ad_email' },
      { formField: 'fb_2025_record', dataTypeName: 'fb_2025_record' },
      { formField: 'fb_2024_record', dataTypeName: 'fb_2024_record' },
      { formField: 'conference', dataTypeName: 'conference' },
      { formField: 'enrollment_size', dataTypeName: 'enrollment_size' },
      { formField: 'affiliation', dataTypeName: 'affiliation' },
      { formField: 'private_public', dataTypeName: 'private_public' },
      { formField: 'school_phone', dataTypeName: 'school_phone' },
      { formField: 'coach_visit_info', dataTypeName: 'visit_info' }
    ];

    // Prepare all updates to be done in parallel
    const updatePromises = [];

    for (const mapping of fieldMappings) {
      const value = values[mapping.formField];
      console.log(`[updateSchoolFacts] Processing field: ${mapping.formField}, value: "${value}", dataTypeName: ${mapping.dataTypeName}`);
      
      if (value !== undefined) {
        let dataTypeId;
        
        // Special handling for visit_info which uses data type ID 926
        if (mapping.formField === 'coach_visit_info' && mapping.dataTypeName === 'visit_info') {
          dataTypeId = 926;
        } else {
          const dataType = dataTypes.find(dt => dt.name === mapping.dataTypeName);
          if (!dataType) {
            console.log(`[updateSchoolFacts] No dataType found for ${mapping.dataTypeName}, skipping`);
            continue;
          }
          dataTypeId = dataType.id;
        }
        
        console.log(`[updateSchoolFacts] Found dataTypeId: ${dataTypeId} for ${mapping.formField}`);
        
        // Convert dayjs objects back to string format for database storage
        let stringValue = value;
        if (dayjs.isDayjs(value)) {
          stringValue = value.format('YYYY-MM-DD');
        } else if (typeof value === 'string') {
          stringValue = value;
        }
        
        console.log(`[updateSchoolFacts] Final stringValue for ${mapping.formField}: "${stringValue}"`);
        
        // Add to promises array instead of awaiting immediately
        updatePromises.push(updateSchoolFact(schoolId, dataTypeId, stringValue));
      } else {
        console.log(`[updateSchoolFacts] Skipping ${mapping.formField} because value is undefined`);
      }
    }

    // Special handling for address_state -> also update school_state
    if (values.address_state) {
      const schoolStateDataType = dataTypes.find(dt => dt.name === 'school_state');
      if (schoolStateDataType) {
        updatePromises.push(updateSchoolFact(schoolId, schoolStateDataType.id, values.address_state));
      }
    }

    // Execute all updates in parallel with error handling
    if (updatePromises.length > 0) {
      try {
        await Promise.allSettled(updatePromises);
      } catch (error) {
        console.error('Error updating school facts:', error);
        // Continue execution even if some updates fail
      }
    }
  };

  const updateCoachInfo = async (values: any) => {
    if (!coachInfo) return;

    // Update coach basic info (only fields that exist in coach table)
    await updateCoachBasicInfo(coachInfo.id, {
      first_name: values.coach_firstName,
      last_name: values.coach_lastName
      // Note: email, phone, twitter_handle, and best_phone are stored in coach_fact table, not coach table
    });

    // Update coach facts - map form field names to data type IDs
    const coachFieldMappings = [
      { formField: 'coach_email', dataTypeId: 571 },        // Email
      { formField: 'coach_phone', dataTypeId: 27 },         // Phone (cell phone as primary)
      { formField: 'coach_twitterHandle', dataTypeId: 13 }, // Twitter handle
      { formField: 'coach_home_phone', dataTypeId: 968 }, 
      { formField: 'coach_cell_phone', dataTypeId: 27 },
      { formField: 'coach_office_phone', dataTypeId: 967 }, 
      { formField: 'coach_best_phone', dataTypeId: 969 },
      { formField: 'coach_best_contact', dataTypeId: 970 }
    ];

    // Prepare all coach fact updates to run in parallel
    const coachFactPromises = [];

    for (const mapping of coachFieldMappings) {
      const value = values[mapping.formField];
      if (value !== undefined && mapping.dataTypeId) {
        // Convert dayjs objects back to string format for database storage
        let stringValue = value;
        if (dayjs.isDayjs(value)) {
          stringValue = value.format('YYYY-MM-DD');
        } else if (Array.isArray(value)) {
          // Handle multi-select arrays (like best_contact)
          if (mapping.formField === 'coach_best_contact') {
            // Maintain order: Call, Text, Email
            const orderedOptions = ['Call', 'Text', 'Email'];
            const orderedSelection = value
              .filter((item: string) => orderedOptions.includes(item))
              .sort((a: string, b: string) => orderedOptions.indexOf(a) - orderedOptions.indexOf(b));
            stringValue = orderedSelection.join(', ');
          } else {
            stringValue = value.join(', ');
          }
        } else if (typeof value === 'string') {
          stringValue = value;
        }
        
        coachFactPromises.push(updateCoachFact(coachInfo.id, mapping.dataTypeId, stringValue));
      }
    }

    // Execute all coach fact updates in parallel
    if (coachFactPromises.length > 0) {
      try {
        await Promise.allSettled(coachFactPromises);
      } catch (error) {
        console.error('Error updating coach facts:', error);
        // Continue execution even if some updates fail
      }
    }
  };


  const renderEditableField = (fieldName: string, label: string, type: string = 'text') => {
    // Check if this is a coach field and we're not in edit mode
    const isCoachField = fieldName.startsWith('coach_');
    const isReadOnly = isCoachField && !isEditingCoach;
    
    if (type === 'date') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
        >
          <DatePicker 
            style={{ width: '100%' }} 
            disabled={isReadOnly}
          />
        </Form.Item>
      );
    }
    
    if (type === 'url') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
        >
          <Input 
            type="url" 
            placeholder="https://..." 
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
          />
        </Form.Item>
      );
    }
    
    if (type === 'email') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
          rules={[{ type: 'email', message: 'Please enter a valid email' }]}
        >
          <Input 
            type="email" 
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
          />
        </Form.Item>
      );
    }
    
    if (type === 'tel') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
          rules={[
            {
              pattern: /^[\d\s\-\(\)\+\.]+$/,
              message: 'Please enter a valid phone number'
            }
          ]}
        >
          <Input 
            type="tel" 
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
          />
        </Form.Item>
      );
    }
    
    // Special case for best contact - multi-select with specific options
    if (fieldName === 'coach_best_contact') {
    return (
      <Form.Item
        key={fieldName}
        label={label}
        name={fieldName}
      >
          <Select
            mode="multiple"
            placeholder="Select contact methods"
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
            options={[
              { value: 'Call', label: 'Call' },
              { value: 'Text', label: 'Text' },
              { value: 'Email', label: 'Email' }
            ]}
          />
        </Form.Item>
      );
    }

    // Special case for ZIP code - must be 5 digits
    if (fieldName === 'address_zip') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
          rules={[
            {
              pattern: /^\d{5}$/,
              message: 'ZIP code must be exactly 5 digits'
            }
          ]}
        >
          <Input 
            maxLength={5}
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
          />
        </Form.Item>
      );
    }

    // Special case for enrollment size - must be a number
    if (fieldName === 'enrollment_size') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
          rules={[
            {
              pattern: /^\d+$/,
              message: 'Enrollment size must be a number'
            }
          ]}
        >
          <Input 
            type="number"
            min={0}
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
          />
        </Form.Item>
      );
    }

    // Special case for private/public - dropdown
    if (fieldName === 'private_public') {
      return (
        <Form.Item
          key={fieldName}
          label={label}
          name={fieldName}
        >
          <Select
            placeholder="Select type"
            disabled={isReadOnly}
            style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
            options={[
              { value: 'Public', label: 'Public' },
              { value: 'Private', label: 'Private' }
            ]}
          />
        </Form.Item>
      );
    }
    
    return (
      <Form.Item
        key={fieldName}
        label={label}
        name={fieldName}
      >
        <Input 
          type={type} 
          disabled={isReadOnly}
          style={isReadOnly ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
        />
      </Form.Item>
    );
  };


  return (
    <Modal
      title={`Edit School Information - ${schoolName}`}
      open={isVisible}
      onCancel={onClose}
      width="90%"
      style={{ maxWidth: 1200 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={handleSave}>
          Save Changes
        </Button>,
      ]}
    >
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading school data...</p>
          </div>
        </div>
      ) : (
        <Form form={form} layout="vertical" className="max-h-[70vh] overflow-y-auto">
          {/* Head Coach Information Section */}
          <Card 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Head Coach Information</span>
                <Space>
                  <Button 
                    type="primary" 
                    size="small"
                    onClick={() => {
                      setCoachManagementMode('add');
                      setIsCoachManagementVisible(true);
                    }}
                  >
                    Coaching Change
                  </Button>
                  {coachInfo && (
                    <Button 
                      size="small"
                      onClick={() => {
                        if (isEditingCoach) {
                          // Exit edit mode and reset coach fields to original values
                          resetCoachFields();
                          setIsEditingCoach(false);
                        } else {
                          // Enter edit mode
                          setIsEditingCoach(true);
                        }
                      }}
                      type={isEditingCoach ? "default" : "default"}
                    >
                      {isEditingCoach ? 'Cancel Edit' : 'Edit Existing Coach'}
                    </Button>
                  )}
                </Space>
              </div>
            } 
            className="mb-6"
          >
            <Row gutter={16}>
              <Col span={12}>
                {renderEditableField('coach_firstName', 'First Name', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('coach_lastName', 'Last Name', 'text')}
              </Col>
              {isEditingCoach && (
                <Col span={24}>
                  <div style={{ 
                    backgroundColor: '#ffebee', 
                    border: '2px solid #f44336', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginTop: '8px',
                    textAlign: 'center'
                  }}>
                    <Typography.Text strong style={{ 
                      color: '#d32f2f', 
                      fontSize: '16px',
                      display: 'block'
                    }}>
                      ⚠️ IF THERE WAS A COACHING CHANGE, HIT THE COACHING CHANGE BUTTON ⚠️
                    </Typography.Text>
                    <Typography.Text style={{ 
                      color: '#d32f2f', 
                      fontSize: '14px',
                      display: 'block',
                      marginTop: '4px'
                    }}>
                      This is to edit information and correct typos on a coach that is the right coach
                    </Typography.Text>
                  </div>
                </Col>
              )}
              <Col span={12}>
                {renderEditableField('coach_email', 'Email', 'email')}
              </Col>
              <Col span={12}>
                {renderEditableField('coach_home_phone', 'Home Phone', 'tel')}
              </Col>
              <Col span={12}>
                {renderEditableField('coach_cell_phone', 'Cell Phone', 'tel')}
              </Col>
              <Col span={12}>
                {renderEditableField('coach_office_phone', 'Office Phone', 'tel')}
              </Col>
              <Col span={12}>
                {renderEditableField('coach_twitterHandle', 'Twitter Handle', 'text')}
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Best Phone"
                  name="coach_best_phone"
                >
                  <Select 
                    placeholder="Select best phone"
                    disabled={!isEditingCoach}
                    style={!isEditingCoach ? { backgroundColor: '#f5f5f5', color: '#999' } : {}}
                  >
                    <Select.Option value="Home">Home</Select.Option>
                    <Select.Option value="Cell">Cell</Select.Option>
                    <Select.Option value="Office">Office</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                {renderEditableField('coach_best_contact', 'Best Contact', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('coach_visit_info', 'Visit Info', 'text')}
              </Col>
            </Row>
          </Card>

          {/* Address Information Section */}
          <Card title="School Address" className="mb-6">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Street Address"
                  name="address_street"
                >
                  <Input placeholder="123 Main Street" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="Street Address Line 2 (Optional)"
                  name="address_street2"
                >
                  <Input placeholder="Apartment, suite, unit, building, floor, etc." />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="City"
                  name="address_city"
                >
                  <Input placeholder="City" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="State"
                  name="address_state"
                >
                  <Select placeholder="State" showSearch>
                    <Select.Option value="AL">Alabama</Select.Option>
                    <Select.Option value="AK">Alaska</Select.Option>
                    <Select.Option value="AZ">Arizona</Select.Option>
                    <Select.Option value="AR">Arkansas</Select.Option>
                    <Select.Option value="CA">California</Select.Option>
                    <Select.Option value="CO">Colorado</Select.Option>
                    <Select.Option value="CT">Connecticut</Select.Option>
                    <Select.Option value="DE">Delaware</Select.Option>
                    <Select.Option value="FL">Florida</Select.Option>
                    <Select.Option value="GA">Georgia</Select.Option>
                    <Select.Option value="HI">Hawaii</Select.Option>
                    <Select.Option value="ID">Idaho</Select.Option>
                    <Select.Option value="IL">Illinois</Select.Option>
                    <Select.Option value="IN">Indiana</Select.Option>
                    <Select.Option value="IA">Iowa</Select.Option>
                    <Select.Option value="KS">Kansas</Select.Option>
                    <Select.Option value="KY">Kentucky</Select.Option>
                    <Select.Option value="LA">Louisiana</Select.Option>
                    <Select.Option value="ME">Maine</Select.Option>
                    <Select.Option value="MD">Maryland</Select.Option>
                    <Select.Option value="MA">Massachusetts</Select.Option>
                    <Select.Option value="MI">Michigan</Select.Option>
                    <Select.Option value="MN">Minnesota</Select.Option>
                    <Select.Option value="MS">Mississippi</Select.Option>
                    <Select.Option value="MO">Missouri</Select.Option>
                    <Select.Option value="MT">Montana</Select.Option>
                    <Select.Option value="NE">Nebraska</Select.Option>
                    <Select.Option value="NV">Nevada</Select.Option>
                    <Select.Option value="NH">New Hampshire</Select.Option>
                    <Select.Option value="NJ">New Jersey</Select.Option>
                    <Select.Option value="NM">New Mexico</Select.Option>
                    <Select.Option value="NY">New York</Select.Option>
                    <Select.Option value="NC">North Carolina</Select.Option>
                    <Select.Option value="ND">North Dakota</Select.Option>
                    <Select.Option value="OH">Ohio</Select.Option>
                    <Select.Option value="OK">Oklahoma</Select.Option>
                    <Select.Option value="OR">Oregon</Select.Option>
                    <Select.Option value="PA">Pennsylvania</Select.Option>
                    <Select.Option value="RI">Rhode Island</Select.Option>
                    <Select.Option value="SC">South Carolina</Select.Option>
                    <Select.Option value="SD">South Dakota</Select.Option>
                    <Select.Option value="TN">Tennessee</Select.Option>
                    <Select.Option value="TX">Texas</Select.Option>
                    <Select.Option value="UT">Utah</Select.Option>
                    <Select.Option value="VT">Vermont</Select.Option>
                    <Select.Option value="VA">Virginia</Select.Option>
                    <Select.Option value="WA">Washington</Select.Option>
                    <Select.Option value="WV">West Virginia</Select.Option>
                    <Select.Option value="WI">Wisconsin</Select.Option>
                    <Select.Option value="WY">Wyoming</Select.Option>
                    <Select.Option value="DC">District of Columbia</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="ZIP Code"
                  name="address_zip"
                >
                  <Input placeholder="12345" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* AD Information Section */}
          <Card title="Athletic Director Information" className="mb-6">
            <Row gutter={16}>
              <Col span={12}>
                {renderEditableField('ad_name_first', 'AD Name First', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('ad_name_last', 'AD Name Last', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('ad_email', 'AD Email', 'email')}
              </Col>
            </Row>
          </Card>

          {/* School Information Section */}
          <Card title="School Information" className="mb-6">
            <Row gutter={16}>
              <Col span={12}>
                {renderEditableField('fb_2025_record', '2025 Record', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('fb_2024_record', '2024 Record', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('conference', 'Conference', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('enrollment_size', 'Enrollment Size', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('affiliation', 'Affiliation', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('private_public', 'Private Public', 'text')}
              </Col>
              <Col span={12}>
                {renderEditableField('school_phone', 'School Phone', 'tel')}
              </Col>
            </Row>
          </Card>
        </Form>
      )}

      {/* Coach Management Modal */}
      <Modal
        title={
          coachManagementMode === 'add' ? 'Coaching Change' : 
          coachManagementMode === 'manage' ? 'Edit Existing Coach' : 
          'Coach Management'
        }
        open={isCoachManagementVisible}
        onCancel={() => {
          setIsCoachManagementVisible(false);
          setCoachManagementMode(null);
        }}
        footer={null}
        width={800}
      >
        {coachManagementMode === 'add' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Coaching Change Information</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: 4 }}>
                This will end the current coach and add a new coach starting on the same date
              </Text>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <Text strong>New Coach First Name *</Text>
                <Input
                  value={newCoachFirstName}
                  onChange={(e) => setNewCoachFirstName(e.target.value)}
                  placeholder="Enter first name"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <Text strong>New Coach Last Name *</Text>
                <Input
                  value={newCoachLastName}
                  onChange={(e) => setNewCoachLastName(e.target.value)}
                  placeholder="Enter last name"
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text strong>Coaching Change Date *</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: 4 }}>
                This date will end the current coach and start the new coach
              </Text>
              <Input
                type="date"
                value={newCoachChangeDate}
                onChange={(e) => setNewCoachChangeDate(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>



            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setIsCoachManagementVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                loading={savingNewCoach}
                disabled={!newCoachFirstName.trim() || !newCoachLastName.trim() || !newCoachChangeDate}
                onClick={handleSaveNewCoach}
              >
                Complete Coaching Change
              </Button>
            </div>
          </div>
        )}

        {coachManagementMode === 'manage' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <Text strong>Edit Coach Information</Text>
              <Text type="secondary" style={{ display: 'block', fontSize: '12px', marginTop: 4 }}>
                Update the current coach&apos;s basic information and facts
              </Text>
            </div>
            
            {/* Coach Basic Info Editing */}
            <div style={{ marginBottom: 24, padding: 16, border: '1px solid #f0f0f0', borderRadius: 4 }}>
              <Text strong style={{ marginBottom: 16, display: 'block' }}>Basic Information</Text>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <Text strong>First Name</Text>
                  <Input
                    value={coachInfo?.firstName || ''}
                    onChange={(e) => {
                      if (coachInfo) {
                        setCoachInfo({ ...coachInfo, firstName: e.target.value });
                      }
                    }}
                    style={{ marginTop: 4 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong>Last Name</Text>
                  <Input
                    value={coachInfo?.lastName || ''}
                    onChange={(e) => {
                      if (coachInfo) {
                        setCoachInfo({ ...coachInfo, lastName: e.target.value });
                      }
                    }}
                    style={{ marginTop: 4 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <Text strong>Email</Text>
                  <Input
                    value={coachInfo?.email || ''}
                    onChange={(e) => {
                      if (coachInfo) {
                        setCoachInfo({ ...coachInfo, email: e.target.value });
                      }
                    }}
                    style={{ marginTop: 4 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong>Phone</Text>
                  <Input
                    value={coachInfo?.phone || ''}
                    onChange={(e) => {
                      if (coachInfo) {
                        setCoachInfo({ ...coachInfo, phone: e.target.value });
                      }
                    }}
                    style={{ marginTop: 4 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <Text strong>Twitter Handle</Text>
                  <Input
                    value={coachInfo?.twitterHandle || ''}
                    onChange={(e) => {
                      if (coachInfo) {
                        setCoachInfo({ ...coachInfo, twitterHandle: e.target.value });
                      }
                    }}
                    style={{ marginTop: 4 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong>Best Phone</Text>
                  <Select
                    style={{ width: '100%', marginTop: 4 }}
                    value={coachInfo?.best_phone || ''}
                    onChange={(value) => {
                      if (coachInfo) {
                        setCoachInfo({ ...coachInfo, best_phone: value });
                      }
                    }}
                    placeholder="Select best phone"
                  >
                    <Select.Option value="home_phone">Home Phone</Select.Option>
                    <Select.Option value="cell_phone">Cell Phone</Select.Option>
                    <Select.Option value="office_phone">Office Phone</Select.Option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Coach School History with Actions */}
            <div style={{ marginBottom: 16 }}>
              <Text strong>Coach School History</Text>
              <div style={{ marginTop: 8 }}>
                {loadingCoachHistory ? (
                  <Text>Loading coach history...</Text>
                ) : coachSchoolHistory.length > 0 ? (
                  <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, maxHeight: 300, overflow: 'auto' }}>
                    {coachSchoolHistory.map((record) => (
                      <div key={record.id} style={{ 
                        padding: '12px', 
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <Text strong>{record.school?.name || 'Unknown School'}</Text>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {record.sport?.name || 'Unknown Sport'} • 
                            {record.start_date ? ` Started: ${new Date(record.start_date).toLocaleDateString()}` : ''}
                            {record.end_date ? ` • Ended: ${new Date(record.end_date).toLocaleDateString()}` : ' • Current'}
                          </div>
                        </div>
                        <Space>
                          <Button
                            size="small"
                            onClick={() => {
                              setCoachSchoolEditingRecord(record);
                              setCoachManagementMode('end');
                              setCoachSchoolEndDate('');
                            }}
                          >
                            End
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setCoachSchoolEditingRecord(record);
                              setCoachManagementMode('transfer');
                              setCoachSchoolTransferDate('');
                              setCoachSchoolSelectedSchool(null);
                              setCoachSchoolNewSchoolQuery('');
                              setCoachSchoolNewSchoolOptions([]);
                              setSelectedTransferSport(record.sport || null);
                            }}
                          >
                            Transfer
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setCoachSchoolEditingRecord(record);
                              setCoachManagementMode('edit');
                              setCoachSchoolStartDate(record.start_date ? new Date(record.start_date).toISOString().split('T')[0] : '');
                              setCoachSchoolEndDate(record.end_date ? new Date(record.end_date).toISOString().split('T')[0] : '');
                              setCoachSchoolSelectedSchool(record.school || null);
                              setSelectedEditSport(record.sport || null);
                            }}
                          >
                            Edit
                          </Button>
                        </Space>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text>No coach history found</Text>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Button onClick={() => setIsCoachManagementVisible(false)}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={async () => {
                  if (!coachInfo) return;
                  
                  try {
                    // Update coach basic info
                    await updateCoachBasicInfo(coachInfo.id, {
                      first_name: coachInfo.firstName,
                      last_name: coachInfo.lastName,
                      email: coachInfo.email,
                      phone: coachInfo.phone,
                      twitter_handle: coachInfo.twitterHandle,
                      best_phone: coachInfo.best_phone
                    });
                    
                    // Refresh data
                    await loadData();
                    setIsCoachManagementVisible(false);
                    setCoachManagementMode(null);
                    message.success('Coach information updated successfully');
                  } catch (error) {
                    console.error('Error updating coach:', error);
                    message.error('Failed to update coach information');
                  }
                }}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* End Coach Modal */}
        {coachManagementMode === 'end' && (
          <div>
            <Text strong>End Date</Text>
            <Input 
              type="date" 
              value={coachSchoolEndDate} 
              onChange={(e) => setCoachSchoolEndDate(e.target.value)} 
              style={{ marginTop: 8, marginBottom: 16 }} 
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button onClick={() => setCoachManagementMode('manage')}>Cancel</Button>
              <Button 
                type="primary" 
                loading={savingCoachChanges}
                disabled={!coachSchoolEndDate}
                onClick={handleEndCoach}
              >
                End Coach
              </Button>
            </div>
          </div>
        )}

        {/* Transfer Coach Modal */}
        {coachManagementMode === 'transfer' && (
          <div>
            <Text strong>Transfer Date</Text>
            <Input 
              type="date" 
              value={coachSchoolTransferDate} 
              onChange={(e) => setCoachSchoolTransferDate(e.target.value)} 
              style={{ marginTop: 8, marginBottom: 12 }} 
            />
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
                  await searchSchoolsForTransfer(q);
                } else {
                  setCoachSchoolNewSchoolOptions([]);
                }
              }} 
              style={{ marginTop: 8, marginBottom: 8 }} 
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
              <Button onClick={() => setCoachManagementMode('manage')}>Cancel</Button>
              <Button 
                type="primary" 
                loading={savingCoachChanges}
                disabled={!coachSchoolTransferDate || !coachSchoolSelectedSchool || !selectedTransferSport}
                onClick={handleTransferCoach}
              >
                Transfer Coach
              </Button>
            </div>
          </div>
        )}

        {/* Edit Coach Record Modal */}
        {coachManagementMode === 'edit' && (
          <div>
            <Text strong>Start Date</Text>
            <Input 
              type="date" 
              value={coachSchoolStartDate} 
              onChange={(e) => setCoachSchoolStartDate(e.target.value)} 
              style={{ marginTop: 8, marginBottom: 12 }} 
            />
            <Text strong>End Date</Text>
            <Input 
              type="date" 
              value={coachSchoolEndDate} 
              onChange={(e) => setCoachSchoolEndDate(e.target.value)} 
              style={{ marginTop: 8, marginBottom: 12 }} 
            />
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
              <Button onClick={() => setCoachManagementMode('manage')}>Cancel</Button>
              <Button 
                type="primary" 
                loading={savingCoachChanges}
                onClick={handleEditCoachRecord}
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Modal>
  );
}
