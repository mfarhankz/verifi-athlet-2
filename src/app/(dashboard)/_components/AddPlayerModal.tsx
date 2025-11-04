"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  InputNumber,
  message,
} from "antd";
import { addAthleteToDatabase, AddAthleteData } from '@/lib/athleteService';

const { Title } = Typography;
const { Option } = Select;

interface AddPlayerModalProps {
  isVisible: boolean;
  onClose: () => void;
  schoolName: string;
  schoolId: string;
  onAddPlayer: (playerData: any) => void;
}

const POSITION_OPTIONS = [
  "ATH", "QB", "WR", "RB", "FB", "TE", "OL", "OC", "OG", "OT",
  "DL", "DE", "DT", "LB", "ILB", "OLB", "DB", "CB", "S", "P", "K", "PR", "KR", "LS"
];

// Generate year options dynamically based on current date
const getYearOptions = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-11 (January = 0)
  
  // If after July 1st (month >= 6), start from next year
  const startYear = currentMonth >= 6 ? currentYear + 1 : currentYear;
  
  // Generate 5 years starting from startYear
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push((startYear + i).toString());
  }
  
  return years;
};

const YEAR_OPTIONS = getYearOptions();

export default function AddPlayerModal({ isVisible, onClose, schoolName, schoolId, onAddPlayer }: AddPlayerModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<any>({});

  // Check if required fields are filled
  const areRequiredFieldsFilled = () => {
    return formValues.firstName && 
           formValues.lastName && 
           formValues.year;
  };

  // Function to show warning without clearing field
  const showWarning = (fieldName: string, warningMessage: string) => {
    // Show warning message
    setWarnings(prev => ({ ...prev, [fieldName]: warningMessage }));
    
    // Clear warning after 5 seconds
    setTimeout(() => {
      setWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[fieldName];
        return newWarnings;
      });
    }, 5000);
  };

  // Phone number formatting functions
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as (xxx) xxx-xxxx progressively
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 3) {
      return `(${phoneNumber}`;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  // Simple field change handler - just update form values
  const handleFieldChange = useCallback((fieldName: string, value: any) => {
    console.log(`Field change: ${fieldName} = "${value}"`);
    
    // Update form values
    setFormValues((prev: any) => ({ ...prev, [fieldName]: value }));
    
    // Clear any existing warning for this field
    if (warnings[fieldName]) {
      console.log(`Clearing warning for ${fieldName}`);
      setWarnings(prev => {
        const newWarnings = { ...prev };
        delete newWarnings[fieldName];
        return newWarnings;
      });
    }
  }, [warnings]);

  // Phone number change handler with real-time formatting
  const handlePhoneChange = useCallback((fieldName: string, value: string) => {
    const formatted = formatPhoneNumber(value);
    handleFieldChange(fieldName, formatted);
  }, [handleFieldChange]);

  // Validate all fields when submit button is clicked
  const validateAllFields = () => {
    console.log('Validating all fields...');
    console.log('Current form values:', formValues);
    const newWarnings: Record<string, string> = {};
    let hasErrors = false;

    // Required field validation
    if (!formValues.firstName || formValues.firstName.trim() === '') {
      newWarnings.firstName = 'Please enter first name';
      hasErrors = true;
    } else if (formValues.firstName.length < 1) {
      newWarnings.firstName = 'First name must be at least 1 character';
      hasErrors = true;
    } else if (formValues.firstName.length > 50) {
      newWarnings.firstName = 'First name must be less than 50 characters';
      hasErrors = true;
    }

    if (!formValues.lastName || formValues.lastName.trim() === '') {
      newWarnings.lastName = 'Please enter last name';
      hasErrors = true;
    } else if (formValues.lastName.length < 1) {
      newWarnings.lastName = 'Last name must be at least 1 character';
      hasErrors = true;
    } else if (formValues.lastName.length > 50) {
      newWarnings.lastName = 'Last name must be less than 50 characters';
      hasErrors = true;
    }

    if (!formValues.year) {
      newWarnings.year = 'Please select graduation year';
      hasErrors = true;
    }

    // Email validation
    if (formValues.email && formValues.email.trim() !== '') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
        newWarnings.email = 'Please enter a valid email';
        hasErrors = true;
      } else if (formValues.email.length > 100) {
        newWarnings.email = 'Email must be less than 100 characters';
        hasErrors = true;
      }
    }

    // Cell phone validation
    if (formValues.cellPhone && formValues.cellPhone.trim() !== '') {
      const cleanedPhone = formValues.cellPhone.replace(/[\s\-\(\)]/g, '');
      if (!/^[\+]?[1-9][\d]{8,14}$/.test(cleanedPhone)) {
        newWarnings.cellPhone = 'Please enter a valid phone number';
        hasErrors = true;
      }
    }

    // Parent email validation
    if (formValues.parentEmail && formValues.parentEmail.trim() !== '') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.parentEmail)) {
        newWarnings.parentEmail = 'Please enter a valid email';
        hasErrors = true;
      } else if (formValues.parentEmail.length > 100) {
        newWarnings.parentEmail = 'Email must be less than 100 characters';
        hasErrors = true;
      }
    }

    // URL validation
    if (formValues.highlightTape && formValues.highlightTape.trim() !== '') {
      // Allow URLs with or without protocol (http/https)
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!urlPattern.test(formValues.highlightTape)) {
        newWarnings.highlightTape = 'Please enter a valid URL';
        hasErrors = true;
      }
    }

    // Twitter handle validation
    if (formValues.twitterHandle && formValues.twitterHandle.trim() !== '') {
      if (formValues.twitterHandle.length > 50) {
        newWarnings.twitterHandle = 'Twitter handle must be less than 50 characters';
        hasErrors = true;
      } else if (!/^@?[a-zA-Z0-9_]+$/.test(formValues.twitterHandle)) {
        newWarnings.twitterHandle = 'Twitter handle can only contain letters, numbers, and underscores';
        hasErrors = true;
      }
    }

    // Height validation
    if (formValues.feet !== undefined && formValues.feet !== null && formValues.feet !== '') {
      if (formValues.feet < 4 || formValues.feet > 7) {
        newWarnings.feet = 'Feet must be between 4-7';
        hasErrors = true;
      }
    }

    if (formValues.inches !== undefined && formValues.inches !== null && formValues.inches !== '') {
      if (formValues.inches < 0 || formValues.inches > 11) {
        newWarnings.inches = 'Inches must be between 0-11';
        hasErrors = true;
      }
    }

    if (formValues.eighths !== undefined && formValues.eighths !== null && formValues.eighths !== '') {
      if (formValues.eighths < 0 || formValues.eighths > 7) {
        newWarnings.eighths = 'Eighths must be between 0-7';
        hasErrors = true;
      }
    }

    // Weight validation
    if (formValues.weight !== undefined && formValues.weight !== null && formValues.weight !== '') {
      if (formValues.weight < 100 || formValues.weight > 500) {
        newWarnings.weight = 'Weight must be between 100-500 lbs';
        hasErrors = true;
      }
    }

    // GPA validation
    if (formValues.gpa !== undefined && formValues.gpa !== null && formValues.gpa !== '') {
      if (formValues.gpa < 0 || formValues.gpa > 4) {
        newWarnings.gpa = 'GPA must be between 0.0-4.0';
        hasErrors = true;
      }
    }

    // SAT validation
    if (formValues.sat !== undefined && formValues.sat !== null && formValues.sat !== '') {
      if (formValues.sat < 400 || formValues.sat > 1600) {
        newWarnings.sat = 'SAT score must be between 400-1600';
        hasErrors = true;
      }
    }

    // ACT validation
    if (formValues.act !== undefined && formValues.act !== null && formValues.act !== '') {
      if (formValues.act < 1 || formValues.act > 36) {
        newWarnings.act = 'ACT score must be between 1-36';
        hasErrors = true;
      }
    }

    // Parent name validation
    if (formValues.parentFirstName && formValues.parentFirstName.length > 50) {
      newWarnings.parentFirstName = 'Parent first name must be less than 50 characters';
      hasErrors = true;
    }

    if (formValues.parentLastName && formValues.parentLastName.length > 50) {
      newWarnings.parentLastName = 'Parent last name must be less than 50 characters';
      hasErrors = true;
    }

    // Parent phone validation
    if (formValues.parentPhone && formValues.parentPhone.trim() !== '') {
      const cleanedPhone = formValues.parentPhone.replace(/[\s\-\(\)]/g, '');
      if (!/^[\+]?[1-9][\d]{8,14}$/.test(cleanedPhone)) {
        newWarnings.parentPhone = 'Please enter a valid phone number';
        hasErrors = true;
      }
    }

    console.log('Validation results:', { hasErrors, newWarnings });

    // Set all warnings at once
    setWarnings(newWarnings);

    // Clear warnings after 5 seconds
    if (hasErrors) {
      setTimeout(() => {
        setWarnings({});
      }, 5000);
    }

    return !hasErrors;
  };

  const handleSubmit = async (values: any) => {
    console.log('Submit button clicked');
    console.log('Form values from Ant Design:', values);
    console.log('Our form values state:', formValues);
    
    // Validate all fields first
    if (!validateAllFields()) {
      console.log('Validation failed, not submitting');
      return; // Don't submit if validation fails
    }

    setLoading(true);
    try {
      // Prepare data for database insertion
      const athleteData: AddAthleteData = {
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        email: formValues.email,
        cellPhone: formValues.cellPhone ? formValues.cellPhone.replace(/\D/g, '') : undefined,
        year: formValues.year,
        position: formValues.position,
        highlightTape: formValues.highlightTape,
        twitterHandle: formValues.twitterHandle,
        feet: formValues.feet,
        inches: formValues.inches,
        eighths: formValues.eighths,
        weight: formValues.weight,
        gpa: formValues.gpa,
        sat: formValues.sat,
        act: formValues.act,
        parentName: formValues.parentFirstName && formValues.parentLastName 
          ? `${formValues.parentFirstName} ${formValues.parentLastName}`.trim()
          : formValues.parentFirstName || formValues.parentLastName || undefined,
        parentEmail: formValues.parentEmail,
        parentPhone: formValues.parentPhone ? formValues.parentPhone.replace(/\D/g, '') : undefined,
      };

      // Add athlete to database
      const result = await addAthleteToDatabase(athleteData, schoolId);
      
      if (result.success) {
        message.success('Player added successfully!');
        
        // Also call the original callback for any additional handling
        const playerData = {
          ...formValues,
          height: `${formValues.feet}'${formValues.inches}"${formValues.eighths || 0}/8`,
          heightInInches: formValues.feet * 12 + formValues.inches + (formValues.eighths || 0) / 8,
          schoolName,
          athleteId: result.athleteId,
        };
        
        await onAddPlayer(playerData);
        
        // Reset form and close modal
        form.resetFields();
        setFormValues({});
        setWarnings({});
        onClose();
      } else {
        message.error(result.error || 'Failed to add player');
      }
    } catch (error) {
      console.error('Error adding player:', error);
      message.error('An unexpected error occurred while adding the player');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setWarnings({});
    setFormValues({});
    onClose();
  };

  // Simple warning display component
  const WarningDisplay = ({ fieldName }: { fieldName: string }) => {
    const warning = warnings[fieldName];
    
    if (!warning) return null;
    
    return (
      <div 
        className="text-red-500 text-sm mt-1 animate-fade-in"
        style={{
          animation: 'fadeIn 0.3s ease-in-out'
        }}
      >
        {warning}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
      <Modal
        title={
          <Title level={3} className="mb-0">
            Add New Player
          </Title>
        }
        open={isVisible}
        onCancel={handleCancel}
        width={800}
        footer={null}
        className="add-player-modal"
      >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          console.log('Ant Design onFinish called with:', values);
          handleSubmit(values);
        }}
        className="mt-4"
      >
        {/* School Name - Read Only */}
        <Form.Item label="School">
          <Input value={schoolName} disabled className="bg-gray-50" />
        </Form.Item>

        <Form.Item label={<span>Name & Graduation Year <span className="text-red-500">*</span></span>}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="firstName"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  placeholder="First name" 
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                />
              </Form.Item>
              <WarningDisplay fieldName="firstName" />
            </Col>
            <Col span={8}>
              <Form.Item
                name="lastName"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  placeholder="Last name" 
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                />
              </Form.Item>
              <WarningDisplay fieldName="lastName" />
            </Col>
            <Col span={8}>
              <Form.Item
                name="year"
                style={{ marginBottom: 0 }}
              >
                <Select 
                  placeholder="Select graduation year"
                  onChange={(value) => handleFieldChange('year', value)}
                >
                  {YEAR_OPTIONS.map(year => (
                    <Option key={year} value={year}>{year}</Option>
                  ))}
                </Select>
              </Form.Item>
              <WarningDisplay fieldName="year" />
            </Col>
          </Row>
        </Form.Item>

        <Row gutter={16}>
          {/* Email and Cell Phone */}
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
            >
              <Input 
                placeholder="Enter email address" 
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="email" />
          </Col>
          <Col span={12}>
            <Form.Item
              name="cellPhone"
              label="Cell Phone"
            >
              <Input 
                placeholder="(555) 123-4567" 
                onChange={(e) => handlePhoneChange('cellPhone', e.target.value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="cellPhone" />
          </Col>
        </Row>

        <Row gutter={16}>
          {/* Position and Highlight Tape */}
          <Col span={12}>
            <Form.Item
              name="position"
              label="Position"
            >
              <Select placeholder="Select position">
                {POSITION_OPTIONS.map(position => (
                  <Option key={position} value={position}>{position}</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="highlightTape"
              label="Highlight Tape Link"
            >
              <Input 
                placeholder="Enter highlight tape URL" 
                onChange={(e) => handleFieldChange('highlightTape', e.target.value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="highlightTape" />
          </Col>
        </Row>

        <Row gutter={16}>
          {/* Twitter Handle and Height */}
          <Col span={12}>
            <Form.Item
              name="twitterHandle"
              label="Twitter Handle"
            >
              <Input 
                placeholder="@username" 
                onChange={(e) => handleFieldChange('twitterHandle', e.target.value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="twitterHandle" />
          </Col>
          <Col span={12}>
            <Form.Item label="Height">
              <Row gutter={8}>
                <Col span={6}>
                  <Form.Item
                    name="feet"
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={4}
                      max={7}
                      placeholder="Ft"
                      className="w-full"
                      onChange={(value) => handleFieldChange('feet', value)}
                    />
                  </Form.Item>
                  <WarningDisplay fieldName="feet" />
                </Col>
                <Col span={6}>
                  <Form.Item
                    name="inches"
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber
                      min={0}
                      max={11}
                      placeholder="In"
                      className="w-full"
                      onChange={(value) => handleFieldChange('inches', value)}
                    />
                  </Form.Item>
                  <WarningDisplay fieldName="inches" />
                </Col>
                <Col span={6}>
                  <Form.Item 
                    name="eighths"
                    initialValue={0}
                    style={{ marginBottom: 0 }}
                  >
                    <Select 
                      placeholder="1/8" 
                      className="w-full"
                      onChange={(value) => handleFieldChange('eighths', value)}
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7].map(eighth => (
                        <Option key={eighth} value={eighth}>{eighth}/8</Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <WarningDisplay fieldName="eighths" />
                </Col>
                <Col span={6}>
                  <div className="flex items-center h-8 text-sm text-gray-500">
                    inches
                  </div>
                </Col>
              </Row>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* Weight and GPA */}
          <Col span={12}>
            <Form.Item
              name="weight"
              label="Weight (lbs)"
            >
              <InputNumber
                placeholder="Enter weight"
                className="w-full"
                onChange={(value) => handleFieldChange('weight', value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="weight" />
          </Col>
          <Col span={12}>
            <Form.Item
              name="gpa"
              label="GPA"
            >
              <InputNumber
                step={0.01}
                placeholder="Enter GPA"
                className="w-full"
                onChange={(value) => handleFieldChange('gpa', value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="gpa" />
          </Col>
        </Row>

        <Row gutter={16}>
          {/* SAT and ACT */}
          <Col span={12}>
            <Form.Item
              name="sat"
              label="SAT Score"
            >
              <InputNumber
                placeholder="Enter SAT score"
                className="w-full"
                onChange={(value) => handleFieldChange('sat', value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="sat" />
          </Col>
          <Col span={12}>
            <Form.Item
              name="act"
              label="ACT Score"
            >
              <InputNumber
                placeholder="Enter ACT score"
                className="w-full"
                onChange={(value) => handleFieldChange('act', value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="act" />
          </Col>
        </Row>

        {/* Parent Information Section */}
        <Title level={4} className="mt-6 mb-4">Parent Information</Title>

        <Form.Item label="Parent Name">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="parentFirstName"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  placeholder="First name" 
                  onChange={(e) => handleFieldChange('parentFirstName', e.target.value)}
                />
              </Form.Item>
              <WarningDisplay fieldName="parentFirstName" />
            </Col>
            <Col span={12}>
              <Form.Item
                name="parentLastName"
                style={{ marginBottom: 0 }}
              >
                <Input 
                  placeholder="Last name" 
                  onChange={(e) => handleFieldChange('parentLastName', e.target.value)}
                />
              </Form.Item>
              <WarningDisplay fieldName="parentLastName" />
            </Col>
          </Row>
        </Form.Item>

        <Row gutter={16}>
          {/* Parent Contact */}
          <Col span={12}>
            <Form.Item
              name="parentEmail"
              label="Parent Email"
            >
              <Input 
                placeholder="Enter parent email" 
                onChange={(e) => handleFieldChange('parentEmail', e.target.value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="parentEmail" />
          </Col>
          <Col span={12}>
            <Form.Item
              name="parentPhone"
              label="Parent Phone"
            >
              <Input 
                placeholder="(555) 123-4567" 
                onChange={(e) => handlePhoneChange('parentPhone', e.target.value)}
              />
            </Form.Item>
            <WarningDisplay fieldName="parentPhone" />
          </Col>
        </Row>

        {/* Form Actions */}
        <div className="mt-6 pt-4 border-t">
          {/* Required fields warning */}
          {!areRequiredFieldsFilled() && (
            <div className="text-red-500 text-sm mb-4 text-center">
              Please fill in all required fields (Name and Graduation Year) before adding a player.
            </div>
          )}
          
          <div className="flex justify-end gap-3">
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              disabled={!areRequiredFieldsFilled()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Player
            </Button>
          </div>
        </div>
      </Form>
    </Modal>
    </>
  );
}

