import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Button, Flex, message } from "antd";
import { supabase } from "@/lib/supabaseClient";
import { useCustomer } from "@/contexts/CustomerContext";

interface TeamUser {
  id: string;
  name_first: string;
  name_last: string;
}

interface AlertModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: (data?: any) => void;
  initialValues?: any;
  teamUsers: TeamUser[];
  loading: boolean;
  mode: "add" | "edit";
}

// Survey-related data type IDs that indicate survey data
const SURVEY_DATA_TYPE_IDS = [
  'cell',
  'when_transfer',
  'help_decision',
  'help_decision_contact',
  'leaving_other',
  'important',
  'major_importance',
  'games_eval',
  'walk_on_t25',
  'gpa',
  'academic_major_imp',
  'highlight',
  'hs_highlight',
  'honors_other',
  'leaving_playing_time',
  'leaving_higher_level',
  'leaving_coaches',
  'leaving_eligible_academic',
  'leaving_eligible_discipline',
  'leaving_eligible_other',
  'leaving_better_academics',
  'leaving_major',
  'leaving_home',
  'ideal_division',
  'full_scholarship_only',
  'distance_from_home',
  'ideal_campus_size',
  'campus_location_type',
  'cost_vs_acad_rep',
  'winning_vs_location',
  'playing_vs_championship',
  'cost_vs_campus_type',
  'playing_vs_size',
  'winning_vs_academics',
  'championship_vs_location',
  'party_vs_academics',
  'party_vs_winning',
  'male_to_female',
  'hbcu',
  'faith_based_school',
  'pref_d1_school',
  'pref_d2_school',
  'pref_d3_school',
  'pref_naia_school',
  'share_opt_in',
  'ideal_location',
  'military_school_yesno',
  'hs_club_coach',
  'survey_alert_sent',
  'athlete_id',
  'type_of_staff_preferred',
  'best_pos',
  'club_coach_name_info',
];

// Function to convert display names to standard data_type names
const convertDisplayNamesToDataTypes = (filterString: string): string => {
  const displayToDataTypeMap: { [key: string]: string } = {
    'Division:': 'division:',
    'Home State:': 'hometown_state:',
    'Hometown State:': 'hometown_state:',
    'Year:': 'year:',
    'Position:': 'primary_position:',
    'Status:': 'm_status:',
    'Athletic Aid:': 'is_receiving_athletic_aid:',
    'Date Entered:': 'initiated_date:',
    'GP:': 'gp:',
    'GS:': 'gs:',
    'Goals:': 'goals:',
    'Assists:': 'assists:',
    'GK Min:': 'goalkeeperMinutes:',
    'Survey Completed:': 'survey_completed:',
    'Div:': 'division:', // Handle "Div:" variant
  };

  let convertedFilter = filterString;
  
  // Convert statistical comparison filters (e.g., "fld_pct: greater 0.1" to "fld_pct Min: .1")
  convertedFilter = convertedFilter.replace(/([a-zA-Z_]+):\s*(greater|less)\s+(\d*\.?\d+)/gi, (match, statName, comparison, value) => {
    const comparisonLabel = comparison.toLowerCase() === 'greater' ? 'Min' : 'Max';
    // Remove leading zero from decimal values (0.1 becomes .1)
    const formattedValue = value.replace(/^0\./, '.');
    return `${statName} ${comparisonLabel}: ${formattedValue}`;
  });
  
  // Convert display names to data_type names
  Object.entries(displayToDataTypeMap).forEach(([displayName, dataTypeName]) => {
    // Use regex with word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${displayName.replace(':', '\\:')}`, 'gi');
    convertedFilter = convertedFilter.replace(regex, dataTypeName);
  });

  return convertedFilter;
};

// Function to determine if an alert should be marked as a survey alert
const determineSurveyAlert = async (customerId: string, filterString: string): Promise<boolean> => {
  try {
    // First, check if the customer is assigned to a school with non-NCAA data_type_id
    const { data: customerData, error: customerError } = await supabase
      .from('customer')
      .select('school_id')
      .eq('id', customerId)
      .single();

    if (customerError) {
      console.error('Error fetching customer data:', customerError);
      return false;
    }

    if (customerData?.school_id) {
      // Check if the school has school_fact with data_type_id = 118 but value != 'NCAA'
      const { data: schoolFactData, error: schoolFactError } = await supabase
        .from('school_fact')
        .select('value')
        .eq('school_id', customerData.school_id)
        .eq('data_type_id', 118)
        .neq('value', 'NCAA')
        .limit(1);

      if (schoolFactError) {
        console.error('Error fetching school_fact data:', schoolFactError);
      } else if (schoolFactData && schoolFactData.length > 0) {
        // Customer is assigned to a school with non-NCAA value for data_type_id 118
        return true;
      }
    }

    // Second, check if the filter includes survey-related data
    // Parse the filter string to look for survey-related terms
    const filterLower = filterString.toLowerCase();
    
    // Check for survey completion filters first
    if (filterLower.includes('survey completed')) {
      return true;
    }
    
    // Check if any survey data type names are mentioned in the filter
    for (const surveyDataType of SURVEY_DATA_TYPE_IDS) {
      if (filterLower.includes(surveyDataType.toLowerCase())) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error determining survey alert:', error);
    return false;
  }
};

const AlertModal: React.FC<AlertModalProps> = ({
  open,
  onCancel,
  onSave,
  initialValues = {},
  teamUsers,
  loading,
  mode,
}) => {
  const { activeCustomerId } = useCustomer();
  const [form] = Form.useForm();
  const [recipientType, setRecipientType] = useState<"staff" | "individual">(
    initialValues.recipient === "entire_staff" ? "staff" : "individual"
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialValues.recipient && initialValues.recipient !== "entire_staff"
      ? initialValues.recipient.split(",")
      : []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      ruleName: initialValues.rule || "",
      recipientType:
        initialValues.recipient === "entire_staff" ? "staff" : "individual",
      selectedIds:
        initialValues.recipient && initialValues.recipient !== "entire_staff"
          ? initialValues.recipient.split(",")
          : [],
    });
    setRecipientType(
      initialValues.recipient === "entire_staff" ? "staff" : "individual"
    );
    setSelectedIds(
      initialValues.recipient && initialValues.recipient !== "entire_staff"
        ? initialValues.recipient.split(",")
        : []
    );
  }, [initialValues, form, open]);

  const handleFinish = async (values: any) => {
    setSaving(true);
    if (mode === "add") {
      // Add mode: insert new alert
      try {
        if (!activeCustomerId) {
          message.error("No active customer ID found");
          setSaving(false);
          return;
        }
        
        // Get current user ID from session
        const { data: { session } } = await supabase.auth.getSession();
        const user_id = session?.user?.id;
        
        if (!user_id) {
          message.error("No user session found");
          setSaving(false);
          return;
        }
        
        const recipient =
          values.recipientType === "staff"
            ? "entire_staff"
            : values.selectedIds.join(",");
        let filter = initialValues.filter || ""; // Use filter from initialValues
        
        // Replace survey completion filters with division filters for alert rules
        if (filter.toLowerCase().includes('survey completed')) {
          // Check if division filter already exists
          const hasExistingDivisionFilter = filter.toLowerCase().includes('division:') || filter.toLowerCase().includes('div:');
          
          if (hasExistingDivisionFilter) {
            // Just remove the survey completion part, keep existing division filter
            filter = filter.replace(/survey completed: (yes|no)(\s*\|\s*)?/gi, '');
            // Clean up any trailing separators
            filter = filter.replace(/\|\s*$/, '').replace(/^\s*\|\s*/, '');
          } else {
            // Replace survey completion with all divisions for the alert rule
            filter = filter.replace(/survey completed: (yes|no)/gi, 'division: D1, D2, D3');
          }
        }
        
        // Remove date filters as they are time-sensitive and become outdated
        filter = filter.replace(/Date Entered: [^|]+(\s*\|\s*)?/gi, '');
        filter = filter.replace(/initiated_date: [^|]+(\s*\|\s*)?/gi, '');
        // Clean up any trailing or leading separators
        filter = filter.replace(/\|\s*$/, '').replace(/^\s*\|\s*/, '').trim();
        
        // Convert display names to standard data_type names before saving
        filter = convertDisplayNamesToDataTypes(filter);
        
        // Determine if this should be a survey alert (use original filter before transformation)
        const originalFilter = initialValues.filter || "";
        const isSurveyAlert = await determineSurveyAlert(activeCustomerId, originalFilter);
        
        const alertData = {
          customer_id: activeCustomerId,
          user_id,
          recipient,
          rule: values.ruleName,
          filter,
          survey_alert: isSurveyAlert,
          created_at: new Date().toISOString(),
        };
        
        const { error } = await supabase.from("tp_alert").insert(alertData);
        if (error) {
          message.error("Error saving alert: " + error.message);
          setSaving(false);
          return;
        }
        onSave({ rule: values.ruleName, recipient });
      } catch (err) {
        message.error("Unexpected error saving alert");
      }
      setSaving(false);
    } else if (mode === "edit") {
      // Edit mode: end old alert, insert new
      try {
        if (!initialValues.id) return;
        // 1. End the old alert
        await supabase
          .from("tp_alert")
          .update({ ended_at: new Date().toISOString() })
          .eq("id", initialValues.id);
        // 2. Insert the new alert
        if (!activeCustomerId) {
          message.error("No active customer ID found");
          setSaving(false);
          return;
        }
        
        // Get current user ID from session
        const { data: { session } } = await supabase.auth.getSession();
        const user_id = session?.user?.id;
        
        if (!user_id) {
          message.error("No user session found");
          setSaving(false);
          return;
        }
        
        const recipient =
          values.recipientType === "staff"
            ? "entire_staff"
            : values.selectedIds.join(",");
        
        let editFilter = initialValues.filter || "";
        
        // Replace survey completion filters with division filters for alert rules (edit mode)
        if (editFilter.toLowerCase().includes('survey completed')) {
          // Check if division filter already exists
          const hasExistingDivisionFilter = editFilter.toLowerCase().includes('division:') || editFilter.toLowerCase().includes('div:');
          
          if (hasExistingDivisionFilter) {
            // Just remove the survey completion part, keep existing division filter
            editFilter = editFilter.replace(/survey completed: (yes|no)(\s*\|\s*)?/gi, '');
            // Clean up any trailing separators
            editFilter = editFilter.replace(/\|\s*$/, '').replace(/^\s*\|\s*/, '');
          } else {
            // Replace survey completion with all divisions for the alert rule
            editFilter = editFilter.replace(/survey completed: (yes|no)/gi, 'division: D1, D2, D3');
          }
        }
        
        // Remove date filters as they are time-sensitive and become outdated
        editFilter = editFilter.replace(/Date Entered: [^|]+(\s*\|\s*)?/gi, '');
        editFilter = editFilter.replace(/initiated_date: [^|]+(\s*\|\s*)?/gi, '');
        // Clean up any trailing or leading separators
        editFilter = editFilter.replace(/\|\s*$/, '').replace(/^\s*\|\s*/, '').trim();
        
        // Convert display names to standard data_type names before saving
        editFilter = convertDisplayNamesToDataTypes(editFilter);
        
        // Determine if this should be a survey alert (use original filter before transformation)
        const originalEditFilter = initialValues.filter || "";
        const isSurveyAlert = await determineSurveyAlert(activeCustomerId, originalEditFilter);
        
        const newAlertData = {
          customer_id: activeCustomerId,
          user_id,
          recipient,
          rule: values.ruleName,
          created_at: new Date().toISOString(),
          filter: editFilter, // Use the transformed filter
          survey_alert: isSurveyAlert,
        };
        
        const { error } = await supabase.from("tp_alert").insert(newAlertData);
        if (error) {
          message.error("Error updating alert: " + error.message);
          setSaving(false);
          return;
        }
        onSave();
      } catch (err) {
        message.error("Failed to update alert");
      }
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={mode === "add" ? "Set Up Email Alert" : "Edit Alert"}
      footer={null}
      centered
      confirmLoading={loading || saving}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ruleName: initialValues.rule || "",
          recipientType:
            initialValues.recipient === "entire_staff"
              ? "staff"
              : "individual",
          selectedIds:
            initialValues.recipient && initialValues.recipient !== "entire_staff"
              ? initialValues.recipient.split(",")
              : [],
        }}
        onFinish={handleFinish}
      >
        <Form.Item label="Rule Name" name="ruleName" required>
          <Input placeholder="Enter a name for this alert" />
        </Form.Item>
        {(mode === "edit" || initialValues.filter) && (
          <Form.Item label="Filter">
            <div style={{ padding: '4px 11px', background: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 4, color: '#555' }}>
              {initialValues.filter || <span style={{ color: '#aaa' }}>(No filter)</span>}
            </div>
            {mode === "edit" && (
              <div style={{ marginTop: 4, fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                This filter can not be changed. Build a new alert instead.
              </div>
            )}
          </Form.Item>
        )}
        <Form.Item label="Recipients" name="recipientType" required>
          <Select
            value={recipientType}
            onChange={val => setRecipientType(val)}
            style={{ width: "100%", marginBottom: 8 }}
            options={[
              { value: "individual", label: "Select Individuals" },
              { value: "staff", label: "Entire Staff" },
            ]}
          />
        </Form.Item>
        {recipientType === "individual" && (
          <Form.Item name="selectedIds" required>
            <Select
              mode="multiple"
              style={{ width: "100%" }}
              placeholder="Select team members"
              value={selectedIds}
              onChange={setSelectedIds}
              options={teamUsers.map(user => ({
                value: user.id,
                label: `${user.name_first} ${user.name_last}`,
              }))}
            />
          </Form.Item>
        )}
        {recipientType === "staff" && (
          <div style={{ marginTop: 8, color: "#888" }}>
            Alert will be sent to all staff members.
          </div>
        )}
        <Form.Item>
          <Flex gap={8} justify="flex-end">
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading || saving}
              disabled={loading || saving}
            >
              {mode === "add" ? "Save" : "Update"}
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AlertModal; 