"use client";

import {
  Button,
  Flex,
  Input,
  Layout,
  Radio,
  Space,
  Table,
  Typography,
  Select,
  Form,
  Tooltip,
  Popover,
  InputNumber,
  Modal,
  message,
  Spin,
  Dropdown,
  Collapse,
  Menu,
  App,
  Tabs,
  Card,
  Image,
  Checkbox,
  Divider
} from "antd";
import type { RadioChangeEvent, TableColumnsType } from "antd";
import { useState, useEffect } from "react";
import { useCustomer } from "@/contexts/CustomerContext";
import Link from "next/link";
import { 
  TagColorRule, 
  CustomerOption,
  fetchColorConfigurations,
  createColorConfiguration,
  updateColorConfiguration,
  deleteColorConfiguration,
  convertFactsToTagRules,
  updateConfigurationSelectionState,
  fetchCustomerOptionByName,
  createOrUpdateCustomerOption,
  fetchCustomerRatings,
  addCustomerRating,
  updateCustomerRating,
  deleteCustomerRating,
  type CustomerRating
} from "@/utils/utils";
import { hasFeatureAccess } from "@/utils/navigationUtils";
import { PlusOutlined, StarFilled, StarOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useColorConfig } from "@/contexts/ColorConfigContext";
import ConfigPreview from './ConfigPreview';
import SettingsDropdown from "@/app/(dashboard)/_components/SettingsDropdown";

// Helper function to convert RGB to HEX
const rgbToHex = (rgb: string): string => {
  // If already in hex format, return as is
  if (rgb.startsWith('#')) {
    return rgb;
  }
  
  // Extract RGB values
  const rgbMatch = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  // For rgba values
  const rgbaMatch = rgb.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = Math.round(parseFloat(rgbaMatch[4]) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${a.toString(16).padStart(2, '0')}`;
  }
  
  // If format not recognized, return as is
  return rgb;
};

// Extend TagColorRule to include 'key' for Table component
interface TagColorRuleWithKey extends TagColorRule {
  key: React.Key;
  colorType: 'background' | 'side'; // Add a field to track if this is for background or side color
  order?: number; // Add order field to store position in the list
}

// Define the ColorConfig interface for organizing the tag rules by color type
interface ColorConfig {
  backgroundCategory: string;
  backgroundRules: TagColorRuleWithKey[];
  sideCategory: string;
  sideRules: TagColorRuleWithKey[];
}

export default function MyTeam() {
  // Get current customer ID from context
  const { activeCustomerId, isLoading: customerLoading, userDetails } = useCustomer();
  
  // Get color config context
  const { setColorConfig } = useColorConfig();
  
  // Get user packages for feature access control
  const userPackages = (userDetails?.packages || []).map(Number);
  
  // State for category selection for each color type
  const [backgroundCategory, setBackgroundCategory] = useState<string>("eligibility_remaining");
  const [sideCategory, setSideCategory] = useState<string>("tier");
  
  // Default configuration (cannot be edited)
  const defaultConfig: CustomerOption = {
    id: -1, // Use -1 to indicate this is the default built-in configuration
    name: "System Default",
    customer_id: "",
    facts: []
  };

  // Create default background rules based on the CSS values
  const defaultBackgroundRules: TagColorRuleWithKey[] = [
    {
      key: "bg1",
      colorType: "background",
      category: "eligibility_remaining",
      operator: "=",
      value1: 1,
      color: "#75686069"
    },
    {
      key: "bg2",
      colorType: "background",
      category: "eligibility_remaining",
      operator: "=",
      value1: 2,
      color: "#b3746580"
    },
    {
      key: "bg3",
      colorType: "background",
      category: "eligibility_remaining",
      operator: "=",
      value1: 3,
      color: "#edb3806c"
    },
    {
      key: "bg4",
      colorType: "background",
      category: "eligibility_remaining",
      operator: "=",
      value1: 4,
      color: "#f7d38081"
    },
    {
      key: "bg5",
      colorType: "background",
      category: "eligibility_remaining",
      operator: "=",
      value1: 5,
      color: "#faf5d681"
    }
  ];

  // Create default side color rules based on the CSS values
  const defaultSideRules: TagColorRuleWithKey[] = [
    {
      key: "side1",
      colorType: "side",
      category: "tier",
      operator: "=",
      value1: "1",
      color: "#95b3d7" // rgb(149, 179, 215)
    },
    {
      key: "side2",
      colorType: "side",
      category: "tier",
      operator: "=",
      value1: "2",
      color: "#c4d79b" // rgb(196, 215, 155)
    },
    {
      key: "side3",
      colorType: "side",
      category: "tier",
      operator: "=",
      value1: "3",
      color: "#ffff99" // rgb(255, 255, 153)
    },
    {
      key: "side4",
      colorType: "side",
      category: "tier",
      operator: "=",
      value1: "4",
      color: "#da9694" // rgb(218, 150, 148)
    },
    {
      key: "side5",
      colorType: "side",
      category: "tier",
      operator: "=",
      value1: "5",
      color: "#c0504d" // rgb(192, 80, 77)
    },
    {
      key: "side6",
      colorType: "side",
      category: "tier",
      operator: "=",
      value1: "6",
      color: "#ff0000" // rgb(255, 0, 0)
    }
  ];
  
  // State for tag color rules by type - initialize with default values
  const [backgroundRules, setBackgroundRules] = useState<TagColorRuleWithKey[]>(defaultBackgroundRules);
  
  const [sideRules, setSideRules] = useState<TagColorRuleWithKey[]>(defaultSideRules);
  
  // Card preview state
  const [showPicture, setShowPicture] = useState(true);
  const [dataPoint1, setDataPoint1] = useState('academy');
  const [dataPoint2, setDataPoint2] = useState('school');
  const [dataPoint3, setDataPoint3] = useState('');
  const [dataPoint4, setDataPoint4] = useState('');
  const [dataPoint5, setDataPoint5] = useState('');
  const [dataPoint6, setDataPoint6] = useState('');
  const [dataPoint7, setDataPoint7] = useState('recruiting_coach');

  // Helper function to get display text for data points
  const getDataPointText = (dataPoint: string) => {
    switch (dataPoint) {
      case 'academy': return 'Lee HS (Huntsville)';
      case 'school': return 'University of North Alabama';
      case 'state': return 'Alabama';
      case 'year': return 'Senior';
      case 'position': return 'WR';
      case 'rating': return '4-Star';
      case 'height_weight': return '6\'4", 212 lbs';
      case 'contact': return 'James Alex';
      case 'gpa': return '3.2 GPA';
      case 'test_score': return '1200 SAT';
      case 'offers': return '12 Offers';
      case 'committed': return 'Committed';
      case 'recruiting_coach': return 'John Smith';
      default: return '';
    }
  };
  
  // State for saved configurations
  const [configurations, setConfigurations] = useState<CustomerOption[]>([defaultConfig]);
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(-1); // Start with default selected
  const [configName, setConfigName] = useState<string>("System Default");
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  
  // Card layout state
  const [savedLayouts, setSavedLayouts] = useState([{ id: '1', name: 'Default Layout' }]);
  const [isLayoutDropdownVisible, setIsLayoutDropdownVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'save' | 'saveAs'>('save');
  const [scholarshipType, setScholarshipType] = useState<'equivalencies' | 'dollars'>('equivalencies');
  const [scholarshipSaveLoading, setScholarshipSaveLoading] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [ratingModalMode, setRatingModalMode] = useState<'add' | 'edit'>('add');
  const [selectedRating, setSelectedRating] = useState<CustomerRating | null>(null);
  const [ratingName, setRatingName] = useState('');
  const [ratingType, setRatingType] = useState('too_good');  // Set default to first option
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [customColor, setCustomColor] = useState('');
  const [ratings, setRatings] = useState<CustomerRating[]>([]);

  // Check if the current configuration is the default (cannot be edited)
  const isDefaultConfig = selectedConfigId === -1;
  
  // Category options for the dropdown
  const categoryOptions = [
    { value: "eligibility_remaining", label: "Eligibility Remaining" },
    { value: "compensation", label: "Compensation" },
    { value: "year", label: "Year" },
    { value: "position", label: "Position" },
    { value: "redshirt_status", label: "Redshirt Status" },
    { value: "tier", label: "Tier" }
  ];

  // Helper function to organize tag rules by colorType
  const organizeRulesByType = (rules: TagColorRuleWithKey[]): ColorConfig => {
    // Extract unique categories by colorType
    const bgCategory = rules.find(r => r.colorType === 'background')?.category || 'eligibility_remaining';
    const sideCategory = rules.find(r => r.colorType === 'side')?.category || 'position';
    
    // Sort background rules by order
    const backgroundRules = rules
      .filter(r => r.colorType === 'background')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Sort side rules by order
    const sideRules = rules
      .filter(r => r.colorType === 'side')
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    return {
      backgroundCategory: bgCategory,
      backgroundRules: backgroundRules,
      sideCategory: sideCategory,
      sideRules: sideRules
    };
  };
  
  // Load saved configurations when component mounts
  useEffect(() => {
    const loadConfigurations = async () => {
      if (!activeCustomerId) {
        return;
      }
      
      setLoading(true);
      try {
        const configs = await fetchColorConfigurations(activeCustomerId);
        
        // Always add the default configuration as the first option
        const allConfigs = [defaultConfig, ...configs];
        setConfigurations(allConfigs);
        
        // Find the selected configuration (where selected = 1) or use default
        const selectedConfig = configs.find(config => config.selected === 1);
        
        if (selectedConfig && selectedConfig.id) {
          // Set the selected config from the database
          setSelectedConfigId(selectedConfig.id);
          setConfigName(selectedConfig.name);
          
          // Convert facts to tag rules
          if (selectedConfig.facts && selectedConfig.facts.length > 0) {
            const rules = convertFactsToTagRules(selectedConfig.facts);
            
            // Add colorType to each rule based on option_type in the fact
            const rulesWithColorType = rules.map((rule, index) => {
              const fact = selectedConfig.facts?.[index];
              return {
                ...rule,
                key: index.toString(),
                colorType: fact?.option_type === 'side_color' ? 'side' : 'background',
                order: (fact as any)?.order !== undefined ? (fact as any).order : index
              } as TagColorRuleWithKey;
            });
            
            // Organize rules by colorType
            const { backgroundCategory, backgroundRules, sideCategory, sideRules } = organizeRulesByType(rulesWithColorType);
            
            // Update state
            setBackgroundCategory(backgroundCategory);
            setBackgroundRules(backgroundRules);
            setSideCategory(sideCategory);
            setSideRules(sideRules);
            
            // Update color config context
            setColorConfig({
              id: selectedConfig.id,
              backgroundCategory,
              backgroundRules,
              sideCategory,
              sideRules
            });
          }
        } else {
          // If no configuration is selected, use the default
          setSelectedConfigId(-1);
          setConfigName("System Default");
          // Set default categories
          setBackgroundCategory("eligibility_remaining");
          setSideCategory("tier");
          // Set default rules from CSS values
          setBackgroundRules(defaultBackgroundRules);
          setSideRules(defaultSideRules);
          
          // Update color config context with default values
          setColorConfig({
            id: -1,
            backgroundCategory: "eligibility_remaining",
            backgroundRules: defaultBackgroundRules.map(rule => ({
              category: rule.category,
              operator: rule.operator,
              value1: rule.value1,
              color: rule.color
            })),
            sideCategory: "tier",
            sideRules: defaultSideRules.map(rule => ({
              category: rule.category,
              operator: rule.operator,
              value1: rule.value1,
              color: rule.color
            }))
          });
        }
      } catch (error) {
        console.error('Error loading configurations:', error);
        message.error('Failed to load color configurations');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfigurations();
  }, [activeCustomerId]);

  // Handle configuration selection
  const handleConfigSelect = async (configId: number) => {
    
    // If selecting a non-default configuration
    if (configId !== -1) {
      // First, update any previously selected configuration to be not selected (0)
      // Find currently selected configuration in the database
      const currentlySelectedConfig = configurations.find(config => config.selected === 1 && config.id !== -1);
      
      if (currentlySelectedConfig && currentlySelectedConfig.id && currentlySelectedConfig.id !== configId) {
        try {
          await updateConfigurationSelectionState(currentlySelectedConfig.id, 0);
        } catch (error) {
          console.error('Error updating previous selection state:', error);
          // Continue even if there's an error - we still want to update the new selection
        }
      }
      
      // Then update the newly selected configuration to be selected (1)
      try {
        await updateConfigurationSelectionState(configId, 1);
      } catch (error) {
        console.error('Error updating new selection state:', error);
        message.error('Failed to update configuration selection state');
        // Continue with the UI update even if there's a database error
      }
    } 
    // If selecting the default configuration, deselect any currently selected config
    else if (configId === -1) {
      // Find currently selected configuration in the database
      const currentlySelectedConfig = configurations.find(config => config.selected === 1 && config.id !== -1);
      
      if (currentlySelectedConfig && currentlySelectedConfig.id) {
        try {
          await updateConfigurationSelectionState(currentlySelectedConfig.id, 0);
        } catch (error) {
          console.error('Error updating previous selection state:', error);
        }
      }
      
      // Set to default configuration values
      setSelectedConfigId(-1);
      setConfigName("System Default");
      // Set default categories
      setBackgroundCategory("eligibility_remaining");
      setSideCategory("tier");
      // Set default rules from CSS values
      setBackgroundRules(defaultBackgroundRules);
      setSideRules(defaultSideRules);
      
      // Update color config context with default values
      setColorConfig({
        id: -1,
        backgroundCategory: "eligibility_remaining",
        backgroundRules: defaultBackgroundRules.map(rule => ({
          category: rule.category,
          operator: rule.operator,
          value1: rule.value1,
          color: rule.color
        })),
        sideCategory: "tier",
        sideRules: defaultSideRules.map(rule => ({
          category: rule.category,
          operator: rule.operator,
          value1: rule.value1,
          color: rule.color
        }))
      });
      
      return; // We're done, no need to load configuration data
    }
    
    // Handle regular configuration selection - loading configuration data
    const selectedConfig = configurations.find(config => config.id === configId);
    
    if (!selectedConfig) {
      return;
    }
    
    setSelectedConfigId(configId);
    setConfigName(selectedConfig.name);
    
    // Convert facts to tag rules
    if (selectedConfig.facts && selectedConfig.facts.length > 0) {
      console.log('DEBUG_SELECT: Processing selected config facts:', selectedConfig.facts);
      const rules = convertFactsToTagRules(selectedConfig.facts);
      console.log('DEBUG_SELECT: Converted facts to rules:', rules);
      
      // Add colorType to each rule based on option_type in the fact
      const rulesWithColorType = rules.map((rule, index) => {
        const fact = selectedConfig.facts?.[index];
        return {
          ...rule,
          key: index.toString(),
          colorType: fact?.option_type === 'side_color' ? 'side' : 'background',
          order: (fact as any)?.order !== undefined ? (fact as any).order : index
        } as TagColorRuleWithKey;
      });
      
      // Organize rules by colorType
      const { backgroundCategory, backgroundRules, sideCategory, sideRules } = organizeRulesByType(rulesWithColorType);
      console.log('DEBUG_SELECT: Organized rules:');
      console.log('DEBUG_SELECT: - Background category:', backgroundCategory);
      console.log('DEBUG_SELECT: - Background rules:', backgroundRules);
      console.log('DEBUG_SELECT: - Side category:', sideCategory);
      console.log('DEBUG_SELECT: - Side rules:', sideRules);
      
      // Update state
      setBackgroundCategory(backgroundCategory);
      setBackgroundRules(backgroundRules);
      setSideCategory(sideCategory);
      setSideRules(sideRules);
      
      // Update color config context
      console.log('DEBUG_SELECT: Updating color config context with new config');
      setColorConfig({
        id: configId,
        backgroundCategory,
        backgroundRules,
        sideCategory,
        sideRules
      });
    } else {
      // Clear rules if no facts
      console.log('DEBUG_SELECT: No facts found in selected config, using empty rules');
      setBackgroundCategory("eligibility_remaining");
      setBackgroundRules([]);
      setSideCategory("position");
      setSideRules([]);
      
      // Update color config context with empty config
      console.log('DEBUG_SELECT: Updating color config context with empty config');
      setColorConfig({
        id: configId,
        backgroundCategory: "eligibility_remaining",
        backgroundRules: [],
        sideCategory: "position",
        sideRules: []
      });
    }
  };

  // Save configuration
  const saveConfiguration = async () => {
    if (!activeCustomerId) {
      message.error('No active customer selected');
      return;
    }
    
    if (!configName.trim()) {
      message.error('Configuration name cannot be empty');
      return;
    }
    
    setLoading(true);
    try {
      // Add order to the rules before saving
      // Background rules ordered from 1 to n
      const orderedBackgroundRules = backgroundRules.map((rule, index) => {
        // Force operator to be "=" for special categories
        const isSpecialCategory = ["year", "position", "redshirt_status"].includes(rule.category);
        return {
          ...rule,
          operator: isSpecialCategory ? "=" : rule.operator,
          order: index + 1
        };
      });
      
      // Side rules ordered from 1 to n
      const orderedSideRules = sideRules.map((rule, index) => {
        // Force operator to be "=" for special categories
        const isSpecialCategory = ["year", "position", "redshirt_status"].includes(rule.category);
        return {
          ...rule,
          operator: isSpecialCategory ? "=" : rule.operator,
          order: index + 1
        };
      });
      
      // Prepare tag rules with correct option_type
      const backgroundTagRules = orderedBackgroundRules.map(({ key, colorType, order, ...rest }) => ({
        ...rest,
        option_type: 'card_color',
        order: order || 0,
        category: backgroundCategory // Ensure category matches the selected one
      }));
      
      const sideTagRules = orderedSideRules.map(({ key, colorType, order, ...rest }) => ({
        ...rest,
        option_type: 'side_color',
        order: order || 0,
        category: sideCategory // Ensure category matches the selected one
      }));
      
      // Combine all rules
      const allRules = [...backgroundTagRules, ...sideTagRules];
      
      if (modalMode === 'saveAs' || !selectedConfigId || selectedConfigId === -1) {
        // First, update any currently selected configuration to be not selected
        const currentlySelectedConfig = configurations.find(config => config.selected === 1 && config.id !== -1);
        
        if (currentlySelectedConfig && currentlySelectedConfig.id) {
          await updateConfigurationSelectionState(currentlySelectedConfig.id, 0);
        }
        
        // Create new configuration (initially selected)
        const newOption: CustomerOption = {
          name: configName,
          customer_id: activeCustomerId,
          selected: 1 // Mark as selected
        };
        
        const newConfigId = await createColorConfiguration(newOption, allRules);
        if (newConfigId) {
          // Refresh configurations
          const configs = await fetchColorConfigurations(activeCustomerId);
          setConfigurations([defaultConfig, ...configs]);
          setSelectedConfigId(newConfigId);
        } else {
          message.error('Failed to save configuration');
        }
      } else {
        // Update existing configuration (already selected, no need to update selected state)
        const success = await updateColorConfiguration(selectedConfigId, configName, allRules);
        if (success) {
          // Refresh configurations
          const configs = await fetchColorConfigurations(activeCustomerId);
          setConfigurations([defaultConfig, ...configs]);
        } else {
          message.error('Failed to update configuration');
        }
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      message.error('An error occurred while saving');
    } finally {
      setLoading(false);
      setIsModalVisible(false);
    }
  };

  // Delete configuration
  const handleDeleteConfig = async () => {
    if (!selectedConfigId) {
      message.error('No configuration selected');
      return;
    }
    
    Modal.confirm({
      title: 'Delete Configuration',
      content: 'Are you sure you want to delete this configuration?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        setLoading(true);
        try {
          // Check if we're deleting the selected configuration
          const isDeletingSelected = configurations.find(
            config => config.id === selectedConfigId && config.selected === 1
          ) !== undefined;
          
          const success = await deleteColorConfiguration(selectedConfigId);
          if (success) {
            message.success('Configuration deleted successfully');
            
            // Refresh configurations
            const configs = await fetchColorConfigurations(activeCustomerId || '');
            // Always ensure the default config is present
            const allConfigs = [defaultConfig, ...configs];
            setConfigurations(allConfigs);
            
            // If we deleted the selected configuration, select the System Default
            if (isDeletingSelected) {
              setSelectedConfigId(-1);
              setConfigName("System Default");
              setBackgroundCategory("eligibility_remaining");
              setSideCategory("tier");
              setBackgroundRules(defaultBackgroundRules);
              setSideRules(defaultSideRules);
            }
          } else {
            message.error('Failed to delete configuration');
          }
        } catch (error) {
          console.error('Error deleting configuration:', error);
          message.error('An error occurred while deleting');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Function to add a new rule to either background or side
  const addRule = (colorType: 'background' | 'side') => {
    const category = colorType === 'background' ? backgroundCategory : sideCategory;
    let defaultValue: string | number = "";
    
    // Set default values based on category
    if (category === "year") {
      defaultValue = "FR";
    } else if (category === "redshirt_status") {
      defaultValue = "has";
    } else if (["eligibility_remaining", "compensation"].includes(category)) {
      defaultValue = 0;
    }
    
    const newRule: TagColorRuleWithKey = {
      key: colorType === 'background' 
        ? `bg${backgroundRules.length + 1}` 
        : `side${sideRules.length + 1}`,
      colorType: colorType,
      category: category,
      operator: "=", // Always equals for all categories
      value1: defaultValue,
      color: "#1C1D4D",
      // Set order to last+1 so new rules are added at the end
      order: colorType === 'background' 
        ? (backgroundRules.length > 0 ? Math.max(...backgroundRules.map(r => r.order || 0)) + 1 : 1) 
        : (sideRules.length > 0 ? Math.max(...sideRules.map(r => r.order || 0)) + 1 : 1)
    };
    
    if (colorType === 'background') {
      setBackgroundRules([...backgroundRules, newRule]);
    } else {
      setSideRules([...sideRules, newRule]);
    }
  };

  // Function to remove a rule
  const removeRule = (key: React.Key, colorType: 'background' | 'side') => {
    if (colorType === 'background') {
      setBackgroundRules(backgroundRules.filter(rule => rule.key !== key));
    } else {
      setSideRules(sideRules.filter(rule => rule.key !== key));
    }
  };

  // Function to update a rule
  const updateRule = (key: React.Key, field: string, value: any, colorType: 'background' | 'side') => {
    // Convert color values to hex format if the field is "color"
    if (field === "color" && typeof value === "string") {
      value = rgbToHex(value);
    }
    
    if (colorType === 'background') {
      setBackgroundRules(
        backgroundRules.map(rule => 
          rule.key === key ? { ...rule, [field]: value } : rule
        )
      );
    } else {
      setSideRules(
        sideRules.map(rule => 
          rule.key === key ? { ...rule, [field]: value } : rule
        )
      );
    }
  };

  // Helper function to render value input based on category
  const renderValueInput = (record: TagColorRuleWithKey, field: "value1" | "value2") => {
    // Determine category based on colorType
    const category = record.colorType === 'background' ? backgroundCategory : sideCategory;
    
    // Special cases for Year, Position, and Redshirt Status
    if (category === "year") {
      return (
        <Select
          style={{ width: 120 }}
          value={record[field] as string}
          onChange={(value) => updateRule(record.key, field, value, record.colorType)}
          options={[
            { value: "FR", label: "FR" },
            { value: "SO", label: "SO" },
            { value: "JR", label: "JR" },
            { value: "SR", label: "SR" },
            { value: "GR", label: "GR" }
          ]}
        />
      );
    } else if (category === "position") {
      return (
        <Input 
          style={{ width: 60 }} 
          value={record[field] as string} 
          onChange={(e) => updateRule(record.key, field, e.target.value, record.colorType)}
          placeholder="Position"
        />
      );
    } else if (category === "redshirt_status") {
      return (
        <Select
          style={{ width: 140 }}
          value={record[field] as string}
          onChange={(value) => updateRule(record.key, field, value, record.colorType)}
          options={[
            { value: "has", label: "Has Used" },
            { value: "not", label: "Has Not Used" }
          ]}
        />
      );
    } else if (category === "tier") {
      // Tier should be InputNumber to show increment/decrement buttons
      return (
        <InputNumber 
          style={{ width: 60 }} 
          value={typeof record[field] === 'string' ? parseInt(record[field] as string) : record[field] as number} 
          onChange={(value) => updateRule(record.key, field, value?.toString() || '', record.colorType)}
          placeholder="Value"
        />
      );
    } else if (category === "position") {
      return (
        <Input 
          style={{ width: 60 }} 
          value={record[field] as string} 
          onChange={(e) => updateRule(record.key, field, e.target.value, record.colorType)}
          placeholder="Position"
        />
      );
    } else {
      return (
        <InputNumber 
          style={{ width: 60 }} 
          value={record[field] as number} 
          onChange={(value) => updateRule(record.key, field, value, record.colorType)}
          placeholder="Value"
        />
      );
    }
  };

  // Operator options for the dropdown
  const operatorOptions = [
    { value: "<", label: "Less than (<)" },
    { value: "=", label: "Equals (=)" },
    { value: ">", label: "Greater than (>)" },
    { value: "between", label: "Between" }
  ];

  // Columns for the tag color rules table
  const getRuleColumns = (colorType: 'background' | 'side'): TableColumnsType<TagColorRuleWithKey> => [
    {
      title: "Condition",
      key: "condition",
      render: (_, record) => {
        // Determine category based on colorType
        const category = record.colorType === 'background' ? backgroundCategory : sideCategory;
        
        // Simplified display for special categories
        const isSpecialCategory = ["year", "position", "redshirt_status"].includes(category);
        
        return (
          <Flex align="center">
            {/* Only show operator dropdown for non-special categories */}
            {!isSpecialCategory && (
              <Select
                style={{ width: 140 }}
                value={record.operator}
                onChange={(value) => updateRule(record.key, "operator", value, colorType)}
                options={operatorOptions}
              />
            )}
            
            <Space size="small" style={{ marginLeft: isSpecialCategory ? 0 : 10 }}>
              {renderValueInput(record, "value1")}
              
              {record.operator === "between" && !isSpecialCategory && (
                <>
                  <Typography.Text>and</Typography.Text>
                  {renderValueInput(record, "value2")}
                </>
              )}
            </Space>
          </Flex>
        );
      },
    },
    {
      title: "Color",
      key: "color",
      render: (_, record) => (
        <Flex align="center">
          <Popover
            trigger="click"
            content={
              <Flex vertical>
                <Typography.Text className="mb-2">Select Color</Typography.Text>
                <Flex>
                  <ul className="flex flex-wrap gap-1" style={{ maxWidth: "260px" }}>
                    {[
                      '#006400', // Dark Green
                      '#228B22', // Forest Green
                      '#32CD32', // Lime Green
                      '#7CFC00', // Lawn Green
                      '#ADFF2F', // Green-Yellow
                      '#FFFF00', // Yellow
                      '#FFD700', // Gold
                      '#FFA500', // Orange
                      '#FF4500', // Orange Red
                      '#FF0000'  // Red
                    ].map((color) => (
                      <li 
                        key={color} 
                        className={`p-1 border cursor-pointer ${record.color === color.toLowerCase() ? 'border-[#1C1D4D]' : ''}`}
                        onClick={() => updateRule(record.key, "color", color, colorType)}
                      >
                        <span className="w-8 h-8 block" style={{ backgroundColor: color }}></span>
                      </li>
                    ))}
                  </ul>
                </Flex>
                <Flex align="center" className="mt-3" style={{ flexWrap: 'nowrap' }}>
                  <Typography.Text style={{ whiteSpace: 'nowrap', marginRight: '8px' }}>Custom:</Typography.Text>
                  <Input 
                    placeholder="#RRGGBB" 
                    value={record.color}
                    style={{ width: '110px' }}
                    onChange={(e) => updateRule(record.key, "color", e.target.value, colorType)}
                  />
                </Flex>
              </Flex>
            }
          >
            <div className="flex items-center cursor-pointer">
              <div 
                className="w-4 h-4 mr-2 border" 
                style={{ backgroundColor: record.color }} 
              />
              <Typography.Text>{record.color.toLowerCase()}</Typography.Text>
            </div>
          </Popover>
        </Flex>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button 
          type="text" 
          danger 
          icon={<i className="icon-trash text-xl"></i>}
          onClick={() => removeRule(record.key, colorType)}
        />
      ),
    },
  ];

  // JSX for configuration selection dropdown
  const configDropdown = (
    <Select
      style={{ width: 250 }}
      value={selectedConfigId}
      placeholder="Select a configuration"
      onChange={handleConfigSelect}
      disabled={loading}
      dropdownRender={(menu) => (
        <div>
          <div 
            style={{ 
              padding: '8px 12px', 
              cursor: 'pointer',
              borderBottom: '1px solid rgba(28, 29, 77, 0.1)',
              fontWeight: 500,
              color: '#1c1d4d'
            }}
            onClick={() => {
              // Set config name to empty to trigger the naming modal
              setConfigName('');
              setModalMode('saveAs');
              setIsModalVisible(true);
              
              // Clear existing rules to start with a blank setup
              setBackgroundCategory("eligibility_remaining");
              setBackgroundRules([]);
              setSideCategory("tier");
              setSideRules([]);
              
              // Set selectedConfigId to null to indicate we're creating a new config
              setSelectedConfigId(null);
            }}
          >
            <PlusOutlined style={{ marginRight: 8 }} /> Add New Configuration
          </div>
          {menu}
        </div>
      )}
    >
      {/* Always ensure System Default is the first option */}
      <Select.Option key={-1} value={-1}>
        System Default
      </Select.Option>
      {/* Filter out the default configuration since we've added it explicitly above */}
      {configurations
        .filter(config => config.id !== -1)
        .map(config => (
          <Select.Option key={config.id} value={config.id}>
            {config.name}
          </Select.Option>
        ))
      }
    </Select>
  );

  // Save configuration modal
  const saveConfigModal = (
    <Modal
      title={modalMode === 'save' ? "Save Configuration" : "Create New Configuration"}
      open={isModalVisible}
      onOk={saveConfiguration}
      onCancel={() => setIsModalVisible(false)}
      confirmLoading={loading}
    >
      <Form layout="vertical">
        <Form.Item label="Configuration Name" required>
          <Input
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Enter configuration name"
          />
        </Form.Item>
      </Form>
    </Modal>
  );

  useEffect(() => {
    if (!activeCustomerId) return;
    fetchCustomerOptionByName(activeCustomerId, 'scholarship_display_dollars')
      .then(option => {
        if (option && option.selected === 1) {
          setScholarshipType('dollars');
        } else {
          setScholarshipType('equivalencies');
        }
      });
  }, [activeCustomerId]);

  const handleSaveScholarshipType = async () => {
    if (!activeCustomerId) {
      message.error('No active customer selected');
      return;
    }
    setScholarshipSaveLoading(true);
    try {
      const option = await fetchCustomerOptionByName(activeCustomerId, 'scholarship_display_dollars');
      const selected = scholarshipType === 'dollars' ? 1 : 0;
      if (option) {
        await createOrUpdateCustomerOption({
          id: option.id,
          name: 'scholarship_display_dollars',
          customer_id: activeCustomerId,
          selected,
        });
      } else {
        await createOrUpdateCustomerOption({
          name: 'scholarship_display_dollars',
          customer_id: activeCustomerId,
          selected,
        });
      }
      message.success('Scholarship display preference saved!');
    } catch (e) {
      message.error('Failed to save scholarship display preference');
    } finally {
      setScholarshipSaveLoading(false);
    }
  };

  useEffect(() => {
    if (activeCustomerId) {
      loadRatings();
    }
  }, [activeCustomerId]);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomerRatings(activeCustomerId || '');
      setRatings(data);
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSave = async () => {
    try {
      if (!ratingName || !ratingType || !selectedColor) {
        message.error('Please fill in all required fields');
        return;
      }

      if (!activeCustomerId) {
        message.error('No active customer selected');
        return;
      }

      // Convert the internal type to display format
      const typeMap: { [key: string]: string } = {
        'too_good': 'Too Good',
        'great_get': 'Great Get',
        'good_get': 'Good Get',
        'not_good_enough': 'Not Good Enough',
        'other': 'Other'
      };
      const displayType = typeMap[ratingType] || ratingType;

      if (ratingModalMode === 'add') {
        await addCustomerRating(activeCustomerId, {
          name: ratingName,
          type: displayType,
          color: selectedColor
        });
        message.success('Rating added successfully');
      } else if (ratingModalMode === 'edit' && selectedRating) {
        await updateCustomerRating(selectedRating.id, {
          name: ratingName,
          type: displayType,
          color: selectedColor
        });
        message.success('Rating updated successfully');
      }

      // Reload ratings after save
      await loadRatings();
      setIsRatingModalVisible(false);
    } catch (error) {
      console.error('Error saving rating:', error);
      message.error('Failed to save rating');
    }
  };

  const handleRatingAction = async (action: 'edit' | 'delete', rating?: CustomerRating) => {
    if (action === 'edit' && rating) {
      setRatingModalMode('edit');
      setSelectedRating(rating);
      setRatingName(rating.name);
      // Convert the type to match our radio button values
      const typeMap: { [key: string]: string } = {
        'Too Good': 'too_good',
        'Great Get': 'great_get',
        'Good Get': 'good_get',
        'Not Good Enough': 'not_good_enough',
        'Other': 'other'
      };
      const mappedType = typeMap[rating.type] || rating.type;
      setRatingType(mappedType);
      setSelectedColor(rating.color);
      setCustomColor(rating.color);
      setIsRatingModalVisible(true);
    } else if (action === 'delete' && rating) {
      try {
        await deleteCustomerRating(rating.id);
        message.success('Rating deleted successfully');
        await loadRatings();
      } catch (error) {
        console.error('Error deleting rating:', error);
        message.error('Failed to delete rating');
      }
    }
  };

  // Show loading state if customer data is still loading
  if (customerLoading) {
    return (
      <Flex justify="center" align="center" style={{ height: '100vh' }}>
        <Spin size="large" />
      </Flex>
    );
  }

  const ratingModal = (
    <Modal
      title={
        <Typography.Title level={4}>
          <i className="icon-star"></i> {ratingModalMode === 'add' ? 'Add New Rating' : 'Edit Rating'}
        </Typography.Title>
      }
      open={isRatingModalVisible}
      onOk={handleRatingSave}
      onCancel={() => setIsRatingModalVisible(false)}
      okText={ratingModalMode === 'add' ? 'Add' : 'Save'}
      width={600}
    >
      <Flex vertical gap={16}>
        <Flex vertical className="mb-3">
          <Typography.Text>Rating Name</Typography.Text>
          <Input 
            value={ratingName}
            onChange={(e) => setRatingName(e.target.value)}
            placeholder="Enter rating name"
          />
        </Flex>
        
        <Flex vertical className="mb-1">
          <Typography.Text>Choose Rating Type</Typography.Text>
          <Radio.Group 
            onChange={(e) => setRatingType(e.target.value)} 
            value={ratingType} 
            className="rating-type"
            optionType="button"
            buttonStyle="solid"
          >
            <Space>
              <Radio.Button 
                value="too_good" 
                className="border-0"
              >
                Too Good
              </Radio.Button>
              <Radio.Button 
                value="great_get" 
                className="border-0"
              >
                Great Get
              </Radio.Button>
              <Radio.Button 
                value="good_get" 
                className="border-0"
              >
                Good Get
              </Radio.Button>
              <Radio.Button 
                value="not_good_enough" 
                className="border-0"
              >
                Not Good Enough
              </Radio.Button>
              <Radio.Button 
                value="other" 
                className="border-0"
              >
                Other
              </Radio.Button>
            </Space>
          </Radio.Group>
        </Flex>

        <Flex vertical className="mb-3">
          <Typography.Text className="mb-2">Rating Color</Typography.Text>
          <Flex className="gap-2">
            <ul className="flex flex-wrap gap-1">
              {[
                '#228B22', // Forest Green
                '#32CD32', // Lime Green
                '#7CFC00', // Lawn Green
                '#ADFF2F', // Green-Yellow
                '#FFFF00', // Yellow
                '#FFD700', // Gold
                '#FFA500', // Orange
                '#FF4500', // Orange Red
                '#FF0000'  // Red
              ].map((color) => (
                <li 
                  key={color} 
                  className={`p-1 border ${selectedColor === color ? 'border-[#1677ff] ring-2 ring-[#1677ff]' : ''}`}
                  onClick={() => {
                    setSelectedColor(color);
                    setCustomColor(color);
                  }}
                >
                  <span 
                    className="w-8 h-8 block" 
                    style={{ backgroundColor: color }}
                  />
                </li>
              ))}
            </ul>
          </Flex>
        </Flex>

        <Flex align="center">
          <Typography.Paragraph className="w-[120px]">
            Custom Color
          </Typography.Paragraph>
          <Space>
            <Input 
              value={customColor}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setSelectedColor(e.target.value);
              }}
              placeholder="#"
            />
            <div 
              className="w-8 h-8 border rounded cursor-pointer"
              style={{ backgroundColor: customColor }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'color';
                input.value = customColor;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  setCustomColor(target.value);
                  setSelectedColor(target.value);
                };
                input.click();
              }}
            />
          </Space>
        </Flex>
      </Flex>
    </Modal>
  );

  return (
    <App>
      <Layout>
        <Flex className="grid grid-cols-2 gap-3 mt-3">
          {/* Left Column */}
          <Flex vertical className="space-y-6">
            {/* Player Rating Scale Section */}
            <Card className="mb-1">
              <Flex justify="space-between" align="center" className="mb-4">
                <Typography.Title level={4} className="!mb-0">
                  {/* <i className="icon-star"></i>  */}
                  Player Rating Scale
                </Typography.Title>
                <Button 
                  className="border-0"
                  onClick={() => {
                    setRatingModalMode('add');
                    setSelectedRating(null);
                    setRatingName('');
                    setRatingType('too_good');
                    setSelectedColor('#000000');
                    setCustomColor('');
                    setIsRatingModalVisible(true);
                  }}
                >
                  Add New Rating
                </Button>
              </Flex>

              {loading ? (
                <div>Loading ratings...</div>
              ) : (
                ratings.map((rating) => (
                  <Flex key={rating.id} className="rating-item" align="center" justify="space-between">
                    <Flex vertical>
                      <Typography.Text type="secondary" style={{ fontSize: '13px' }}>{rating.type}</Typography.Text>
                      <h6 className="m-0 flex items-center">
                        <div
                          className="mr-1 flex items-center justify-center"
                          style={{
                            width: 32,
                            height: 32,
                            backgroundColor: rating.color,
                          }}
                        >
                          <StarFilled style={{ color: '#fff', fontSize: 14 }} />
                        </div>
                        <Typography.Title level={5} style={{ margin: 0 }}>{rating.name}</Typography.Title>
                      </h6>
                    </Flex>
                    <Flex className="gap-5">
                      <Link 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleRatingAction('edit', rating);
                        }}
                      >
                        <i className="icon-edit-2 edit text-xl"></i>
                      </Link>
                      <Link 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleRatingAction('delete', rating);
                        }}
                      >
                        <i className="icon-trash remove text-xl"></i>
                      </Link>
                    </Flex>
                  </Flex>
                ))
              )}
            </Card>

            {hasFeatureAccess(userPackages, 'boardTagColors') && (
              <Flex vertical className="card team-tag-colors">
                <Flex justify="space-between" align="center" className="mb-4">
                  <Typography.Title level={4}>
                    {/* <i className="icon-star"></i>  */}
                    Board Tag Colors
                  </Typography.Title>
                
                <Flex gap={10}>
                  {configDropdown}
                  
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'save',
                          label: <span style={{ color: '#1c1d4d', fontWeight: '500' }}>Save</span>,
                          disabled: isDefaultConfig || !selectedConfigId,
                          onClick: () => {
                            setModalMode('save');
                            setIsModalVisible(true);
                          }
                        },
                        {
                          key: 'saveAs',
                          label: <span style={{ color: '#1c1d4d', fontWeight: '500' }}>Save As New</span>,
                          onClick: () => {
                            setModalMode('saveAs');
                            setConfigName('');
                            setIsModalVisible(true);
                          }
                        },
                        {
                          key: 'delete',
                          label: <span style={{ color: '#ff4d4f', fontWeight: '500' }}>Delete</span>,
                          danger: true,
                          disabled: isDefaultConfig || !selectedConfigId,
                          onClick: handleDeleteConfig
                        }
                      ]
                    }}
                    placement="bottomRight"
                  >
                    <Button className="border-0">
                      Configuration Options
                    </Button>
                  </Dropdown>
                </Flex>
              </Flex>
              
              <Typography.Paragraph>
                Configure color tags for your team based on different categories and conditions. 
                These colors will help you quickly identify players based on their attributes.
              </Typography.Paragraph>

              {loading ? (
                <Flex justify="center" align="center" style={{ height: '300px' }}>
                  <Spin size="large" />
                </Flex>
              ) : (
                <Flex vertical gap={16}>
                  {/* Card Design Section */}
                  <Flex vertical className="card">
                    <Flex justify="space-between" align="center" className="mb-4">
                      <Typography.Title level={4}>Card Design</Typography.Title>
                      <div style={{ position: 'relative' }}>
                        <SettingsDropdown
                          trigger={
                            <Button 
                              type="primary"
                              style={{ backgroundColor: '#1c1d4d', borderColor: '#1c1d4d' }}
                              onClick={() => setIsLayoutDropdownVisible(!isLayoutDropdownVisible)}
                            >
                              Save Changes
                            </Button>
                          }
                          isVisible={isLayoutDropdownVisible}
                          onClose={() => setIsLayoutDropdownVisible(false)}
                          onSelect={(layoutId) => {
                            console.log('Selected card layout:', layoutId);
                            const layout = savedLayouts.find(l => l.id === layoutId);
                            if (layout) {
                              message.info(`Loading card layout: ${layout.name}`);
                              // TODO: Load the selected layout configuration
                            }
                            setIsLayoutDropdownVisible(false);
                          }}
                          onNewItem={(layoutName) => {
                            console.log('Saving new card layout:', layoutName);
                            const newLayout = {
                              id: Date.now().toString(),
                              name: layoutName
                            };
                            setSavedLayouts([...savedLayouts, newLayout]);
                            message.success(`Saved layout: ${layoutName}`);
                            setIsLayoutDropdownVisible(false);
                          }}
                          items={savedLayouts}
                          searchPlaceholder="Search saved layouts..."
                          newItemPlaceholder="Save current layout as..."
                          placement="bottomRight"
                        />
                      </div>
                    </Flex>
                    
                    <Typography.Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 16 }}>
                      Configure the appearance and data fields displayed on recruiting board cards.
                    </Typography.Text>
                    
                    {/* Preview Section */}
                    <Typography.Title level={5} style={{ marginBottom: 12 }}>Preview</Typography.Title>
                    <div style={{ 
                      marginBottom: 24,
                      display: 'flex',
                      justifyContent: 'flex-start'
                    }}>
                      {/* Player Card - exact match to recruiting board card */}
                      <div style={{
                        backgroundColor: '#f5f5f5',
                        padding: '10px',
                        borderRadius: '8px',
                        position: 'relative',
                        width: '380px',
                        minWidth: '380px'
                      }}>
                        {/* Actions - top right */}
                        <div style={{ 
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          zIndex: 10
                        }}>
                          {/* Close button */}
                          <span style={{ 
                            cursor: 'default',
                            color: '#ff4d4f',
                            fontSize: '16px',
                            fontWeight: 'normal',
                            lineHeight: '1',
                            userSelect: 'none'
                          }}>×</span>
                        </div>
                        {/* Drag handle - below close button */}
                        <div style={{ 
                          position: 'absolute',
                          top: '38px',
                          right: '10px',
                          zIndex: 10
                        }}>
                          <span style={{ 
                            cursor: 'default',
                            color: '#8c8c8c',
                            fontSize: '16px',
                            lineHeight: '1',
                            userSelect: 'none'
                          }}>⋮⋮</span>
                        </div>

                        <Flex style={{ gap: '10px', alignItems: 'flex-start' }}>
                          {/* Left: Picture and stats */}
                          <div style={{ 
                            width: '85px', 
                            flexShrink: 0
                          }}>
                            {showPicture && (
                              <div style={{ 
                                width: '90px', 
                                height: '90px',
                                backgroundColor: '#bfbfbf',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '6px'
                              }}>
                                <span style={{ fontSize: '40px' }}>👤</span>
                              </div>
                            )}
                            {/* Data Point 5 and 6 shown under the picture */}
                            {(dataPoint5 && getDataPointText(dataPoint5)) || (dataPoint6 && getDataPointText(dataPoint6)) ? (
                              <div>
                                {dataPoint5 && getDataPointText(dataPoint5) && (
                                  <Typography.Text style={{ 
                                    fontSize: '12px', 
                                    color: '#1c1d4d', 
                                    fontWeight: 500,
                                    display: 'block'
                                  }}>
                                    {getDataPointText(dataPoint5)}
                                  </Typography.Text>
                                )}
                                {dataPoint6 && getDataPointText(dataPoint6) && (
                                  <Typography.Text style={{ 
                                    fontSize: '12px', 
                                    color: '#1c1d4d', 
                                    fontWeight: 500,
                                    display: 'block'
                                  }}>
                                    {getDataPointText(dataPoint6)}
                                  </Typography.Text>
                                )}
                              </div>
                            ) : null}
                          </div>
                          
                          {/* Right: Name and info */}
                          <div style={{ flex: 1, paddingTop: '2px', position: 'relative' }}>
                            <Typography.Title 
                              level={5}
                              style={{ 
                                margin: '0 0 6px 0', 
                                fontSize: '16px', 
                                fontWeight: 600,
                                color: '#1c1d4d',
                                lineHeight: '1.2'
                              }}
                            >
                              Taye Fields
                            </Typography.Title>
                            
                            {/* Data Point 1 - only show if not blank */}
                            {dataPoint1 && getDataPointText(dataPoint1) && (
                              <Typography.Paragraph style={{ 
                                margin: '2px 0', 
                                fontSize: '13px', 
                                color: '#1c1d4d',
                                lineHeight: '1.3'
                              }}>
                                {getDataPointText(dataPoint1)}
                              </Typography.Paragraph>
                            )}
                            
                            {/* Data Point 2 - only show if not blank */}
                            {dataPoint2 && getDataPointText(dataPoint2) && (
                              <Typography.Paragraph style={{ 
                                margin: '2px 0', 
                                fontSize: '13px', 
                                color: '#1c1d4d',
                                lineHeight: '1.3'
                              }}>
                                {getDataPointText(dataPoint2)}
                              </Typography.Paragraph>
                            )}
                            
                            {/* Data Point 3 - only show if not blank */}
                            {dataPoint3 && getDataPointText(dataPoint3) && (
                              <Typography.Paragraph style={{ 
                                margin: '2px 0', 
                                fontSize: '13px', 
                                color: '#1c1d4d',
                                lineHeight: '1.3'
                              }}>
                                {getDataPointText(dataPoint3)}
                              </Typography.Paragraph>
                            )}
                            
                            {/* Data Point 4 - only show if not blank */}
                            {dataPoint4 && getDataPointText(dataPoint4) && (
                              <Typography.Paragraph style={{ 
                                margin: '2px 0', 
                                fontSize: '13px', 
                                color: '#1c1d4d',
                                lineHeight: '1.3'
                              }}>
                                {getDataPointText(dataPoint4)}
                              </Typography.Paragraph>
                            )}
                            
                            {/* Data Point 7 - right aligned at end of data points */}
                            {dataPoint7 && getDataPointText(dataPoint7) && (
                              <div style={{ 
                                textAlign: 'right',
                                marginTop: '12px'
                              }}>
                                {(dataPoint7 === 'contact' || dataPoint7 === 'recruiting_coach') ? (
                                  <Flex align="center" gap={6} justify="flex-end">
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '50%',
                                      backgroundColor: '#a8f59c',
                                      color: '#1c1d4d',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}>JS</div>
                                    <Typography.Text style={{ 
                                      fontSize: '13px', 
                                      color: '#1c1d4d',
                                      fontWeight: 500
                                    }}>
                                      {getDataPointText(dataPoint7)}
                                    </Typography.Text>
                                  </Flex>
                                ) : (
                                  <Typography.Text style={{ 
                                    fontSize: '13px', 
                                    color: '#1c1d4d',
                                    fontWeight: 500
                                  }}>
                                    {getDataPointText(dataPoint7)}
                                  </Typography.Text>
                                )}
                              </div>
                            )}
                          </div>
                        </Flex>
                      </div>
                    </div>

                    {/* Configuration Options */}
                    <Collapse
                      defaultActiveKey={[]}
                      ghost
                      expandIcon={({ isActive }) =>
                        isActive ? (
                          <i className="icon-minus" style={{ fontSize: '18px' }}></i>
                        ) : (
                          <i className="icon-add" style={{ fontSize: '18px' }}></i>
                        )
                      }
                      expandIconPosition="end"
                      style={{ backgroundColor: '#fff' }}
                    >
                      {/* Card Background Color Section - INTEGRATED */}
                      <Collapse.Panel
                        key="background"
                        header="Card Background Color"
                        style={{ marginBottom: '8px' }}
                      >
                        <div style={{ padding: '12px' }}>
                          <Flex align="center" style={{ marginBottom: 16 }}>
                        <Typography.Text strong className="mr-3">Category:</Typography.Text>
                        <Select
                          value={backgroundCategory}
                          style={{ width: 200 }}
                          options={categoryOptions}
                          onChange={(value) => setBackgroundCategory(value)}
                              suffixIcon={<i className="icon-arrow-down" style={{ fontSize: '12px' }}></i>}
                        />
                      </Flex>
                      
                      <Flex vertical>
                        <Typography.Text strong className="mb-2">Conditions:</Typography.Text>
                        
                        <Table 
                          columns={getRuleColumns('background')}
                          dataSource={backgroundRules}
                          pagination={false}
                          rowKey="key"
                          locale={{ 
                            emptyText: 'No conditions defined. Click "Add Condition" to create one.' 
                          }}
                        />
                        
                        <Button 
                          type="dashed" 
                          onClick={() => addRule('background')} 
                          icon={<PlusOutlined />}
                          className="mt-3"
                        >
                          Add Condition
                        </Button>
                      </Flex>
                        </div>
                      </Collapse.Panel>

                      {/* Card Side Color Section - INTEGRATED */}
                      <Collapse.Panel
                        key="side"
                        header="Card Side Color"
                        style={{ marginBottom: '8px' }}
                      >
                        <div style={{ padding: '12px' }}>
                          <Flex align="center" style={{ marginBottom: 16 }}>
                        <Typography.Text strong className="mr-3">Category:</Typography.Text>
                        <Select
                          value={sideCategory}
                          style={{ width: 200 }}
                          options={categoryOptions}
                          onChange={(value) => setSideCategory(value)}
                              suffixIcon={<i className="icon-arrow-down" style={{ fontSize: '12px' }}></i>}
                        />
                      </Flex>
                      
                      <Flex vertical>
                        <Typography.Text strong className="mb-2">Conditions:</Typography.Text>
                        
                        <Table 
                          columns={getRuleColumns('side')}
                          dataSource={sideRules}
                          pagination={false}
                          rowKey="key"
                          locale={{ 
                            emptyText: 'No conditions defined. Click "Add Condition" to create one.' 
                          }}
                        />
                        
                        <Button 
                          type="dashed" 
                          onClick={() => addRule('side')} 
                          icon={<PlusOutlined />}
                          className="mt-3"
                        >
                          Add Condition
                        </Button>
                      </Flex>
                        </div>
                      </Collapse.Panel>

                      {/* Picture Toggle and Data Points */}
                      <Collapse.Panel
                        key="data"
                        header="Data Points & Display Options"
                        style={{ marginBottom: '8px' }}
                      >
                        <div style={{ padding: '12px' }}>
                          <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                            <Typography.Text strong>Show Picture</Typography.Text>
                            <Checkbox
                              checked={showPicture}
                              onChange={(e) => {
                                setShowPicture(e.target.checked);
                              }}
                            />
                    </Flex>

                          <Divider />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 1</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            First data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint1}
                            onChange={(value) => setDataPoint1(value)}
                            style={{ width: '100%', marginBottom: 16 }}
                            options={[
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'School', value: 'school' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 2</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            Second data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint2}
                            onChange={(value) => setDataPoint2(value)}
                            style={{ width: '100%', marginBottom: 16 }}
                            options={[
                              { label: 'School', value: 'school' },
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 3</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            Third data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint3}
                            onChange={(value) => setDataPoint3(value)}
                            style={{ width: '100%', marginBottom: 16 }}
                            options={[
                              { label: 'School', value: 'school' },
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 4</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            Fourth data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint4}
                            onChange={(value) => setDataPoint4(value)}
                            style={{ width: '100%', marginBottom: 16 }}
                            options={[
                              { label: 'School', value: 'school' },
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 5</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            Fifth data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint5}
                            onChange={(value) => setDataPoint5(value)}
                            style={{ width: '100%', marginBottom: 16 }}
                            options={[
                              { label: 'School', value: 'school' },
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 6</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            Sixth data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint6}
                            onChange={(value) => setDataPoint6(value)}
                            style={{ width: '100%', marginBottom: 16 }}
                            options={[
                              { label: 'School', value: 'school' },
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />

                          <Typography.Text strong style={{ fontSize: '14px', marginBottom: 4, display: 'block' }}>Data Point 7</Typography.Text>
                          <Typography.Text style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: 8, display: 'block' }}>
                            Seventh data point under the name
                          </Typography.Text>
                          <Select
                            value={dataPoint7}
                            onChange={(value) => setDataPoint7(value)}
                            style={{ width: '100%' }}
                            options={[
                              { label: 'School', value: 'school' },
                              { label: 'Academy / Title', value: 'academy' },
                              { label: 'State', value: 'state' },
                              { label: 'Year', value: 'year' },
                              { label: 'Position', value: 'position' },
                              { label: 'Rating', value: 'rating' },
                              { label: 'Height & Weight', value: 'height_weight' },
                              { label: 'Contact', value: 'contact' },
                              { label: 'GPA', value: 'gpa' },
                              { label: 'Test Score', value: 'test_score' },
                              { label: 'Offers', value: 'offers' },
                              { label: 'Committed', value: 'committed' },
                              { label: 'Recruiting Coach', value: 'recruiting_coach' },
                              { label: 'None', value: '' }
                            ]}
                          />
                        </div>
                      </Collapse.Panel>
                    </Collapse>
                  </Flex>
                </Flex>
              )}
            </Flex>
            )}

            {hasFeatureAccess(userPackages, 'scholarshipType') && (
              <Flex vertical className="card team-tag-colors">
                <Flex justify="space-between" align="center" className="mb-4">
                  <Typography.Title level={4}>
                    <i className="icon-cash"></i> Scholarship Type
                  </Typography.Title>
                </Flex>
                <Typography.Paragraph>
                  Choose how you want scholarships to be displayed throughout the Cap Manager.
                </Typography.Paragraph>
                <Radio.Group
                  value={scholarshipType}
                  onChange={e => setScholarshipType(e.target.value)}
                  options={[
                    { label: 'Equivalencies', value: 'equivalencies' },
                    { label: 'Dollars', value: 'dollars' }
                  ]}
                  optionType="button"
                  buttonStyle="solid"
                  style={{ marginTop: 32 }}
                />
                <Button
                  type="primary"
                  loading={scholarshipSaveLoading}
                  onClick={handleSaveScholarshipType}
                  style={{ marginTop: 24, width: 180 }}
                >
                  Save
                </Button>
              </Flex>
            )}
          </Flex>

          {/* Right Column - Coaches Section */}
          <Flex vertical className="card team-tag-colors">
            <Flex justify="space-between" align="center" className="mb-4">
              <Typography.Title level={4}>
                {/* <i className="icon-user"></i>  */}
                Coaches (Coming Soon)
              </Typography.Title>
            </Flex>

            <Flex justify="space-between" className="mb-4">
              <div>
                <Input className="w-56" placeholder="Search..." />
              </div>
              <Button className="linear-gradient border-0">
                {/* Invite Coach */}
              </Button>
            </Flex>

            <Table
              columns={[
                {
                  title: "Coach Name",
                  dataIndex: "name",
                  render: (_: unknown, record: any) => (
                    <div className="coaches flex items-center">
                      {record.firstName && (
                        <div className="flex justify-center items-center mr-3">
                          <Image
                            src={record.img}
                            alt={record.firstName}
                            width={90}
                            height={90}
                          />
                        </div>
                      )}
                      <Flex vertical>
                        <h4 className="custom-h3">
                          <span>{record.firstName}</span> {record.lastName}
                        </h4>
                        <a className="text-lg">{record.email}</a>
                      </Flex>
                    </div>
                  ),
                },
                {
                  title: "Resend Setup Email",
                  dataIndex: "resend",
                  render: (_: unknown, record: any) => (
                    <Link
                      className="flex justify-center underline text-lg"
                      href=""
                      id={record.firstName}
                    >
                      Send again
                    </Link>
                  ),
                },
                {
                  title: "Remove",
                  dataIndex: "remove",
                  render: (_: unknown, record: any) => (
                    <Link className="flex justify-center" href="" id={record.firstName}>
                      <i className="icon-profile-remove remove text-2xl"></i>
                    </Link>
                  ),
                },
              ]}
              dataSource={[
                // {
                //   key: "1",
                //   id: "1",
                //   firstName: "John",
                //   lastName: "Brown",
                //   email: "michael.mitc@example.com",
                //   img: "/c1.svg",
                // },
                // {
                //   key: "2",
                //   id: "2",
                //   firstName: "Abigail",
                //   lastName: "Wright",
                //   email: "michelle.rivera@example.com",
                //   img: "/c2.svg",
                // },
                // {
                //   key: "3",
                //   id: "3",
                //   firstName: "Michael",
                //   lastName: "Johnson",
                //   email: "nathan.roberts@example.com",
                //   img: "/c1.svg",
                // },
                // {
                //   key: "4",
                //   id: "4",
                //   firstName: "David",
                //   lastName: "Miller",
                //   email: "georgia.young@example.com",
                //   img: "/c3.svg",
                // },
                // {
                //   key: "5",
                //   id: "5",
                //   firstName: "Ella",
                //   lastName: "Green",
                //   email: "tanya.hill@example.com",
                //   img: "/c4.svg",
                // },
                // {
                //   key: "6",
                //   id: "6",
                //   firstName: "Chloe",
                //   lastName: "King",
                //   email: "kenzi.lawson@example.com",
                //   img: "/c5.svg",
                // },
                // {
                //   key: "7",
                //   id: "7",
                //   firstName: "Matthew",
                //   lastName: "Clark",
                //   email: "deanna.curtis@example.com",
                //   img: "/c6.svg",
                // },
                // {
                //   key: "8",
                //   id: "8",
                //   firstName: "Martin",
                //   lastName: "James",
                //   email: "jackson.graham@example.com",
                //   img: "/c2.svg",
                // },
              ]}
              pagination={false}
            />
          </Flex>
        </Flex>
        
        {saveConfigModal}
        {ratingModal}
      </Layout>
      
      <style jsx global>{`
        /* Fix for double carets in Select components */
        .team-tag-colors .ant-select .anticon-down {
          display: none;
        }
        
        /* Ensure the custom caret from _common.scss doesn't appear */
        .team-tag-colors .ant-select-arrow .anticon-down::after {
          display: none !important;
        }
        
        /* Add a single custom caret */
        .team-tag-colors .ant-select-arrow:after {
          content: "▼";
          font-size: 10px;
          color: rgba(0, 0, 0, 0.45);
        }

        /* Add spacing between rating items */
        .rating-item {
         
           padding: 0px 12px 12px 12px;
          &:nth-child(odd) {
            background-color: rgba(18, 109, 184, 0.05);
        }
        .rating-item:last-child {
          margin-bottom: 0 !important;
        }

        /* Add styles for rating modal */
        .rating-type .ant-radio-button-wrapper {
          border-radius: 4px !important;
          margin-right: 8px;
        }
        
        .rating-type .ant-radio-button-wrapper:not(:first-child)::before {
          display: none;
        }
      `}</style>
    </App>
  );
}
