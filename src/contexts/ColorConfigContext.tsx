import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TagColorRule, fetchColorConfigurations, convertFactsToTagRules } from '@/utils/utils';
import { useCustomer } from './CustomerContext';

interface ColorConfig {
  id: number | null;
  backgroundCategory: string;
  backgroundRules: TagColorRule[];
  sideCategory: string;
  sideRules: TagColorRule[];
}

const defaultColorConfig: ColorConfig = {
  id: -1,
  backgroundCategory: 'eligibility_remaining',
  backgroundRules: [
    {
      category: 'eligibility_remaining',
      operator: '=',
      value1: 1,
      color: '#75686069'
    },
    {
      category: 'eligibility_remaining',
      operator: '=',
      value1: 2,
      color: '#b3746580'
    },
    {
      category: 'eligibility_remaining',
      operator: '=',
      value1: 3,
      color: '#edb3806c'
    },
    {
      category: 'eligibility_remaining',
      operator: '=',
      value1: 4,
      color: '#f7d38081'
    },
    {
      category: 'eligibility_remaining',
      operator: '=',
      value1: 5,
      color: '#faf5d681'
    }
  ],
  sideCategory: 'tier',
  sideRules: [
    {
      category: 'tier',
      operator: '=',
      value1: '1',
      color: '#95b3d7'
    },
    {
      category: 'tier',
      operator: '=',
      value1: '2',
      color: '#c4d79b'
    },
    {
      category: 'tier',
      operator: '=',
      value1: '3',
      color: '#ffff99'
    },
    {
      category: 'tier',
      operator: '=',
      value1: '4',
      color: '#da9694'
    },
    {
      category: 'tier',
      operator: '=',
      value1: '5',
      color: '#c0504d'
    },
    {
      category: 'tier',
      operator: '=',
      value1: '6',
      color: '#ff0000'
    }
  ]
};

interface ColorConfigContextType {
  colorConfig: ColorConfig;
  setColorConfig: React.Dispatch<React.SetStateAction<ColorConfig>>;
  getBackgroundColor: (category: string, value: any) => string | undefined;
  getSideColor: (category: string, value: any) => string | undefined;
  loadSelectedColorConfig: (customerId: string) => Promise<void>;
}

const ColorConfigContext = createContext<ColorConfigContextType | undefined>(undefined);

export const useColorConfig = () => {
  const context = useContext(ColorConfigContext);
  if (!context) {
    throw new Error('useColorConfig must be used within a ColorConfigProvider');
  }
  return context;
};

interface ColorConfigProviderProps {
  children: ReactNode;
}

export const ColorConfigProvider: React.FC<ColorConfigProviderProps> = ({ children }) => {
  const [colorConfig, setColorConfig] = useState<ColorConfig>(defaultColorConfig);
  const { activeCustomerId } = useCustomer();
  // console.log('DEBUG_COLOR: Color config initialized:', colorConfig);
  
  // Load selected color configuration when the customer ID changes
  useEffect(() => {
    const loadConfig = async () => {
      if (activeCustomerId) {
        // console.log('DEBUG_COLOR: Customer ID changed, loading color configuration:', activeCustomerId);
        try {
          await loadSelectedColorConfig(activeCustomerId);
        } catch (error) {
          console.error('Failed to load color configuration:', error);
        }
      }
    };
    
    loadConfig();
  }, [activeCustomerId]);
  
  // Function to determine background color based on rules
  const getBackgroundColor = (category: string, value: any): string | undefined => {
    if (colorConfig.backgroundCategory !== category) {
    //   console.log('DEBUG_COLOR: Background category mismatch:', {
        // requestedCategory: category,
        // configCategory: colorConfig.backgroundCategory
    //   });
      return undefined;
    }

    // Convert value to number or string based on what's expected by the rule
    const normalizedValue = typeof value === 'string' ? value : Number(value);
    // console.log('DEBUG_COLOR: Finding background color for:', {
    //   category,
    //   value,
    //   normalizedValue,
    //   rulesCount: colorConfig.backgroundRules.length
    // });

    // Find matching rule
    for (const rule of colorConfig.backgroundRules) {
    //   console.log('DEBUG_COLOR: Checking background rule:', rule);
      switch (rule.operator) {
        case '=':
          if (normalizedValue === rule.value1) {
            // console.log('DEBUG_COLOR: Background match found (=):', rule.color);
            return rule.color;
          }
          break;
        case '<':
          // Ensure we're comparing numbers
          if (typeof normalizedValue === 'number' && normalizedValue < Number(rule.value1)) {
            // console.log('DEBUG_COLOR: Background match found (<):', rule.color);
            return rule.color;
          }
          break;
        case '>':
          // Ensure we're comparing numbers
          if (typeof normalizedValue === 'number' && normalizedValue > Number(rule.value1)) {
            // console.log('DEBUG_COLOR: Background match found (>):', rule.color);
            return rule.color;
          }
          break;
        case 'between':
          // Ensure we're comparing numbers
          if (typeof normalizedValue === 'number' && rule.value2 !== undefined && 
              normalizedValue >= Number(rule.value1) && normalizedValue <= Number(rule.value2)) {
            // console.log('DEBUG_COLOR: Background match found (between):', rule.color);
            return rule.color;
          }
          break;
      }
    }
    // console.log('DEBUG_COLOR: No background match found');
    return undefined;
  };

  // Function to determine side color based on rules
  const getSideColor = (category: string, value: any): string | undefined => {
    if (colorConfig.sideCategory !== category) {
    //   console.log('DEBUG_COLOR: Side category mismatch:', {
        // requestedCategory: category,
        // configCategory: colorConfig.sideCategory
    //   });
      return undefined;
    }

    // Convert value to number or string based on what's expected by the rule
    const normalizedValue = typeof value === 'string' ? value : String(value);
    // console.log('DEBUG_COLOR: Finding side color for:', {
    //   category,
    //   value,
    //   normalizedValue,
    //   rulesCount: colorConfig.sideRules.length
    // });

    // Find matching rule
    for (const rule of colorConfig.sideRules) {
    //   console.log('DEBUG_COLOR: Checking side rule:', rule);
      switch (rule.operator) {
        case '=':
          if (normalizedValue === String(rule.value1)) {
            // console.log('DEBUG_COLOR: Side match found (=):', rule.color);
            return rule.color;
          }
          break;
        case '<':
          if (Number(normalizedValue) < Number(rule.value1)) {
            // console.log('DEBUG_COLOR: Side match found (<):', rule.color);
            return rule.color;
          }
          break;
        case '>':
          if (Number(normalizedValue) > Number(rule.value1)) {
            // console.log('DEBUG_COLOR: Side match found (>):', rule.color);
            return rule.color;
          }
          break;
        case 'between':
          if (rule.value2 && Number(normalizedValue) >= Number(rule.value1) && Number(normalizedValue) <= Number(rule.value2)) {
            // console.log('DEBUG_COLOR: Side match found (between):', rule.color);
            return rule.color;
          }
          break;
      }
    }
    // console.log('DEBUG_COLOR: No side match found');
    return undefined;
  };

  // Load the selected color configuration
  const loadSelectedColorConfig = async (customerId: string) => {
    try {
      // console.log('DEBUG: loadSelectedColorConfig starting for customer:', customerId);
      const configs = await fetchColorConfigurations(customerId);
      // console.log('DEBUG: fetchColorConfigurations returned:', configs);
      
      const selectedConfig = configs.find(config => config.selected === 1);
      // console.log('DEBUG: Selected configuration:', selectedConfig);

      if (selectedConfig && selectedConfig.facts && selectedConfig.facts.length > 0) {
        // console.log('DEBUG: Processing selected configuration with ID:', selectedConfig.id);
        const rules = convertFactsToTagRules(selectedConfig.facts);
        // console.log('DEBUG: Converted facts to rules, count:', rules.length);
        
        // Separate rules by type
        const backgroundRules = rules.filter(rule => rule.option_type === 'card_color' || !rule.option_type);
        const sideRules = rules.filter(rule => rule.option_type === 'side_color');
        
        // console.log('DEBUG: Background rules count:', backgroundRules.length);
        // console.log('DEBUG: Side rules count:', sideRules.length);
        
        // Determine categories
        const backgroundCategory = backgroundRules.length > 0 ? backgroundRules[0].category : 'eligibility_remaining';
        const sideCategory = sideRules.length > 0 ? sideRules[0].category : 'tier';
        
        // console.log('DEBUG: Setting colorConfig state');
        setColorConfig({
          id: selectedConfig.id || -1,
          backgroundCategory,
          backgroundRules,
          sideCategory,
          sideRules
        });
        // console.log('DEBUG: colorConfig state updated');
      } else {
        // console.log('DEBUG: No selected config or no rules, using default config');
        // No selected config or no rules, use default
        setColorConfig(defaultColorConfig);
      }
    } catch (error) {
      // console.error('DEBUG: Error in loadSelectedColorConfig:', error);
      // Fallback to default config
      setColorConfig(defaultColorConfig);
    }
  };

  return (
    <ColorConfigContext.Provider
      value={{
        colorConfig,
        setColorConfig,
        getBackgroundColor,
        getSideColor,
        loadSelectedColorConfig
      }}
    >
      {children}
    </ColorConfigContext.Provider>
  );
}; 