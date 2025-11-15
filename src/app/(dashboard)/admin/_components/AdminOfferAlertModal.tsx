"use client";

import React, { useEffect, useState } from "react";
import { Modal, Form, Input, Select, Button, Flex, message, Typography, Divider } from "antd";
import { CopyOutlined } from '@ant-design/icons';
import { supabase } from "@/lib/supabaseClient";
import { fetchUsersForCustomer } from "@/utils/utils";

const { Text } = Typography;

interface TeamUser {
  id: string;
  name_first: string;
  name_last: string;
}

interface AdminOfferAlertModalProps {
  open: boolean;
  onCancel: () => void;
  onSave: () => void;
  alertData: any;
  loading: boolean;
}

const AdminOfferAlertModal: React.FC<AdminOfferAlertModalProps> = ({
  open,
  onCancel,
  onSave,
  alertData,
  loading,
}) => {
  const [form] = Form.useForm();
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [recipientType, setRecipientType] = useState<"staff" | "individual">("individual");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Initialize form values when alertData changes
  useEffect(() => {
    if (alertData && open) {
      const isEntireStaff = alertData.recipient === "entire_staff";
      const currentRecipientType = isEntireStaff ? "staff" : "individual";
      const currentSelectedIds = isEntireStaff ? [] : (alertData.recipient || "").split(",").filter(Boolean);
      
      setRecipientType(currentRecipientType);
      setSelectedIds(currentSelectedIds);
      
      form.setFieldsValue({
        rule: alertData.rule || "",
        filter: alertData.filter || "",
        alert_frequency: alertData.alert_frequency || "",
        weekly_day: alertData.weekly_day || undefined,
        recipientType: currentRecipientType,
        selectedIds: currentSelectedIds,
      });

      // Fetch users for this customer
      if (alertData.customer_id) {
        setLoadingUsers(true);
        fetchUsersForCustomer(alertData.customer_id)
          .then((users) => {
            setTeamUsers(users);
          })
          .catch((error) => {
            console.error("Error fetching team users:", error);
            message.error("Failed to load team members");
          })
          .finally(() => {
            setLoadingUsers(false);
          });
      }
    }
  }, [alertData, open, form]);

  const handleFinish = async (values: any) => {
    if (values.recipientType === "individual" && (!values.selectedIds || values.selectedIds.length === 0)) {
      message.error("Please select at least one recipient");
      return;
    }

    setSaving(true);
    try {
      if (!alertData?.id) {
        message.error("Offer alert ID is missing");
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

      // Update the existing offer alert directly
      const recipient = values.recipientType === "staff" 
        ? "entire_staff" 
        : values.selectedIds.join(",");

      const updateData = {
        recipient,
        rule: values.rule,
        filter: values.filter,
        alert_frequency: values.alert_frequency,
        weekly_day: values.alert_frequency === 'weekly' ? values.weekly_day : null,
      };

      const { error } = await supabase
        .from("offer_alert")
        .update(updateData)
        .eq("id", alertData.id);
      if (error) {
        message.error("Error updating offer alert: " + error.message);
        setSaving(false);
        return;
      }

      message.success("Offer alert updated successfully");
      onSave();
    } catch (err) {
      console.error("Error updating offer alert:", err);
      message.error("Failed to update offer alert");
    }
    setSaving(false);
  };

  const handleRecipientTypeChange = (value: "staff" | "individual") => {
    setRecipientType(value);
    if (value === "staff") {
      setSelectedIds([]);
      form.setFieldValue("selectedIds", []);
    }
  };

  const handleSelectedIdsChange = (ids: string[]) => {
    setSelectedIds(ids);
    form.setFieldValue("selectedIds", ids);
  };

  const handleCopyCustomerId = async () => {
    if (alertData?.customer_id) {
      try {
        await navigator.clipboard.writeText(alertData.customer_id);
        message.success('Customer ID copied to clipboard');
      } catch (err) {
        console.error('Failed to copy customer ID:', err);
        message.error('Failed to copy customer ID');
      }
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title="Edit Offer Alert"
      footer={null}
      centered
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
      >
        {/* Read-only Customer Information */}
        <Form.Item label="Customer">
          <div style={{ 
            padding: '8px 12px', 
            background: '#f5f5f5', 
            border: '1px solid #d9d9d9', 
            borderRadius: 6,
            color: '#666'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              marginBottom: 4 
            }}>
              <span style={{ fontWeight: 'bold' }}>
                {alertData?.customer_name}
              </span>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={handleCopyCustomerId}
                title="Copy Customer ID"
                style={{ 
                  padding: '2px 4px',
                  height: 'auto',
                  color: '#666'
                }}
              />
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {alertData?.package_names}
            </Text>
            <div style={{ fontSize: '11px', color: '#999', marginTop: 2 }}>
              ID: {alertData?.customer_id}
            </div>
          </div>
          <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
            Customer cannot be changed
          </Text>
        </Form.Item>

        {/* Read-only Created By Information */}
        <Form.Item label="Created By">
          <div style={{ 
            padding: '8px 12px', 
            background: '#f5f5f5', 
            border: '1px solid #d9d9d9', 
            borderRadius: 6,
            color: '#666'
          }}>
            {alertData?.created_by_name}
          </div>
          <Text type="secondary" style={{ fontSize: '12px', fontStyle: 'italic' }}>
            Creator cannot be changed
          </Text>
        </Form.Item>

        <Divider />

        {/* Editable Rule Name */}
        <Form.Item 
          label="Rule Name" 
          name="rule" 
          rules={[{ required: true, message: 'Please enter a rule name' }]}
        >
          <Input placeholder="Enter a name for this offer alert" />
        </Form.Item>

        {/* Editable Filter */}
        <Form.Item 
          label="Filter" 
          name="filter"
        >
          <Input.TextArea 
            placeholder="Enter filter criteria"
            rows={3}
            showCount
          />
        </Form.Item>

        {/* Editable Alert Frequency */}
        <Form.Item
          label="Alert Frequency"
          name="alert_frequency"
          rules={[
            { required: true, message: 'Please select alert frequency' },
          ]}
        >
          <Select
            placeholder="Select frequency"
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
            ]}
            onChange={(value) => {
              if (value !== 'weekly') {
                form.setFieldValue('weekly_day', undefined);
              }
            }}
          />
        </Form.Item>

        {/* Conditional Weekly Day */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) => 
            prevValues.alert_frequency !== currentValues.alert_frequency
          }
        >
          {({ getFieldValue }) => 
            getFieldValue('alert_frequency') === 'weekly' ? (
              <Form.Item
                label="Weekly Day"
                name="weekly_day"
                rules={[
                  { required: true, message: 'Please select a day of the week' },
                ]}
              >
                <Select
                  placeholder="Select day of the week"
                  options={[
                    { value: 'Monday', label: 'Monday' },
                    { value: 'Tuesday', label: 'Tuesday' },
                    { value: 'Wednesday', label: 'Wednesday' },
                    { value: 'Thursday', label: 'Thursday' },
                    { value: 'Friday', label: 'Friday' },
                    { value: 'Saturday', label: 'Saturday' },
                    { value: 'Sunday', label: 'Sunday' },
                  ]}
                />
              </Form.Item>
            ) : null
          }
        </Form.Item>

        {/* Editable Recipients */}
        <Form.Item 
          label="Recipients" 
          name="recipientType" 
          rules={[{ required: true, message: 'Please select recipient type' }]}
        >
          <Select
            value={recipientType}
            onChange={handleRecipientTypeChange}
            options={[
              { value: "individual", label: "Select Individuals" },
              { value: "staff", label: "Entire Staff" },
            ]}
          />
        </Form.Item>

        {recipientType === "individual" && (
          <Form.Item 
            name="selectedIds" 
            rules={[
              {
                required: true,
                validator: (_, value) => {
                  if (!value || value.length === 0) {
                    return Promise.reject('Please select at least one recipient');
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Select team members"
              value={selectedIds}
              onChange={handleSelectedIdsChange}
              loading={loadingUsers}
              notFoundContent={loadingUsers ? 'Loading...' : 'No team members found'}
              options={teamUsers.map(user => ({
                value: user.id,
                label: `${user.name_first} ${user.name_last}`,
              }))}
            />
          </Form.Item>
        )}

        {recipientType === "staff" && (
          <div style={{ marginTop: 8, marginBottom: 16, color: "#666", fontStyle: 'italic' }}>
            Offer alert will be sent to all staff members for this customer.
          </div>
        )}

        <Form.Item>
          <Flex gap={8} justify="flex-end">
            <Button onClick={onCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={saving || loading}
            >
              Update Offer Alert
            </Button>
          </Flex>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AdminOfferAlertModal;

