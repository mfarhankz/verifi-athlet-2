// ============================================================================
// FILTER CONFIGURATION SYSTEM
// ============================================================================
// This file defines the configuration system for different filter types
// Allows for flexible, reusable filter components across the application
// ============================================================================

export interface FilterField {
  key: string;
  label: string;
  type: "text" | "select" | "multiselect" | "number" | "date-range" | "checkbox" | "radio" | "slider" | "height" | "weight" | "time" | "location" | "stats" | "min-max-range" | "camp" | "offer-count";
  options?: { value: string | number | boolean; label: string }[];
  placeholder?: string;
  defaultValue?: string | string[] | number | number[] | boolean | { startDate?: string; endDate?: string } | { comparison: string; value?: number; minValue?: number; maxValue?: number };
  min?: number;
  max?: number;
  step?: number;
  mode?: "multiple" | "range";
  fetchOptions?: (query?: string) => Promise<{ value: string | number | boolean; label: string }[]>;
  loading?: boolean;
  disabled?: boolean;
  hidden?: boolean;
  dataSource?: string; // Add data source information
  showSearch?: boolean; // For Select
  filterOption?: (input: string, option?: { label: string; value: string | number | boolean }) => boolean;
}

export interface FilterSection {
  key: string;
  title: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  fields: FilterField[];
  fieldRefs?: string[]; // Reference existing fields by key
}

export interface FilterConfig {
  title?: string;
  showSaveFilter?: boolean;
  showActiveFilters?: boolean;
  maxWidth?: number;
  sections: FilterSection[];
}



// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getFieldByKey = (config: FilterConfig, key: string): FilterField | undefined => {
  for (const section of config.sections) {
    const field = section.fields.find(f => f.key === key);
    if (field) return field;
  }
  return undefined;
};

export const getSectionByKey = (config: FilterConfig, key: string): FilterSection | undefined => {
  return config.sections.find(s => s.key === key);
};

export const getAllFieldKeys = (config: FilterConfig): string[] => {
  return config.sections.flatMap(section => section.fields.map(field => field.key));
};

// Helper function to resolve field references
export const resolveFieldReferences = (config: FilterConfig): FilterConfig => {
  const resolvedConfig = { ...config };
  
  resolvedConfig.sections = config.sections.map(section => {
    if (!section.fieldRefs || section.fieldRefs.length === 0) {
      return section;
    }
    
    // Find referenced fields from other sections
    const referencedFields: FilterField[] = [];
    
    for (const fieldKey of section.fieldRefs) {
      const referencedField = getFieldByKey(config, fieldKey);
      if (referencedField) {
        referencedFields.push(referencedField);
      }
    }
    
    return {
      ...section,
      fields: [...section.fields, ...referencedFields]
    };
  });
  
  return resolvedConfig;
};