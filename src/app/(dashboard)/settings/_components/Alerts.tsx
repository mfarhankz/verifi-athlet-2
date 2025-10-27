"use client";

import React, { useEffect, useState } from "react";
import {
  Flex,
  Layout,
  Typography,
  App,
  Card,
  Table,
  Button,
  Popconfirm,
  message,
} from "antd";
import { fetchActiveAlerts, fetchUserDetailsByIds, fetchUserDetails, fetchUsersForCustomer } from "@/utils/utils";
import type { Alert } from "@/types/database";
import AlertModal from "../../_components/AlertModal";
import { supabase } from "@/lib/supabaseClient";
import { useCustomer } from "@/contexts/CustomerContext";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<any[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const { activeCustomerId } = useCustomer();

  // Fetch alerts
  useEffect(() => {
    if (!activeCustomerId) return; // Don't fetch if no active customer
    
    setLoading(true);
    fetchActiveAlerts()
      .then(async (data) => {
        // Filter alerts by the active customer ID
        const filteredAlerts = data.filter(alert => alert.customer_id === activeCustomerId);
        
        // Collect all unique user IDs from recipient fields
        const allIds = Array.from(
          new Set(
            filteredAlerts
              .filter(a => a.recipient !== "entire_staff")
              .flatMap(a => a.recipient.split(",").map(id => id.trim()))
              .filter(Boolean)
          )
        );
        // Fetch user details for these IDs
        const idToName = await fetchUserDetailsByIds(allIds);

        // Add a new field to each alert for display
        const alertsWithNames = filteredAlerts.map(alert => ({
          ...alert,
          recipient_names:
            alert.recipient === "entire_staff"
              ? "Entire Staff"
              : alert.recipient
                  .split(",")
                  .map(id => idToName[id] || id)
                  .join(", "),
        }));
        setAlerts(alertsWithNames);
      })
      .catch(() => message.error("Failed to load alerts"))
      .finally(() => setLoading(false));
  }, [activeCustomerId]);

  // Open edit modal
  const onEdit = async (alert: Alert) => {
    setEditingAlert(alert);
    setEditModalOpen(true);
    setEditLoading(true);
    // Fetch team users for the recipient selector
    const userDetails = await fetchUserDetails();
    if (userDetails?.customer_id) {
      const users = await fetchUsersForCustomer(userDetails.customer_id);
      setTeamUsers(users);
    }
    setEditLoading(false);
  };

  // Save edit
  const handleEditSave = async () => {
    setEditLoading(true);
    try {
      // Refresh alerts list after edit
      await fetchActiveAlerts()
        .then(async (data) => {
          // Filter alerts by the active customer ID
          const filteredAlerts = data.filter(alert => alert.customer_id === activeCustomerId);
          
          const allIds = Array.from(
            new Set(
              filteredAlerts
                .filter(a => a.recipient !== "entire_staff")
                .flatMap(a => a.recipient.split(",").map(id => id.trim()))
                .filter(Boolean)
            )
          );
          const idToName = await fetchUserDetailsByIds(allIds);
          const alertsWithNames = filteredAlerts.map(alert => ({
            ...alert,
            recipient_names:
              alert.recipient === "entire_staff"
                ? "Entire Staff"
                : alert.recipient
                    .split(",")
                    .map(id => idToName[id] || id)
                    .join(", "),
          }));
          setAlerts(alertsWithNames);
        });
      setEditModalOpen(false);
      setEditingAlert(null);
      message.success("Alert updated");
    } catch (err) {
      message.error("Failed to update alert");
    }
    setEditLoading(false);
  };

  // Delete (mark ended_date)
  const onDelete = async (id: number) => {
    try {
      await supabase
        .from("tp_alert")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", id);
      // Refresh alerts list after delete
      await fetchActiveAlerts()
        .then(async (data) => {
          // Filter alerts by the active customer ID
          const filteredAlerts = data.filter(alert => alert.customer_id === activeCustomerId);
          
          const allIds = Array.from(
            new Set(
              filteredAlerts
                .filter(a => a.recipient !== "entire_staff")
                .flatMap(a => a.recipient.split(",").map(id => id.trim()))
                .filter(Boolean)
            )
          );
          const idToName = await fetchUserDetailsByIds(allIds);
          const alertsWithNames = filteredAlerts.map(alert => ({
            ...alert,
            recipient_names:
              alert.recipient === "entire_staff"
                ? "Entire Staff"
                : alert.recipient
                    .split(",")
                    .map(id => idToName[id] || id)
                    .join(", "),
          }));
          setAlerts(alertsWithNames);
        });
      message.success("Alert deleted");
    } catch (err) {
      message.error("Failed to delete alert");
    }
  };

  const columns = [
    {
      title: "Created/Last Updated",
      dataIndex: "created_at",
      key: "created_at",
      render: (created_at: string) =>
        created_at
          ? new Date(created_at).toLocaleString()
          : "",
    },
    {
      title: "Rule Name",
      dataIndex: "rule",
      key: "rule",
      render: (rule: string, record: Alert) => (
        <Flex align="center" gap={8}>
          <span>{rule}</span>
          {record.survey_alert && (
            <span 
              style={{
                backgroundColor: '#1890ff',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Survey
            </span>
          )}
        </Flex>
      ),
    },
    {
      title: "Recipient",
      dataIndex: "recipient_names",
      key: "recipient_names",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: any, record: Alert) => (
        <Flex gap={8} align="center">
          <Button 
            size="small" 
            onClick={() => onEdit(record)}
            style={{ height: '24px' }}
          >
            Edit
          </Button>
          <Popconfirm
            title="Are you sure to delete this alert?"
            onConfirm={() => onDelete(record.id)}
          >
            <Button 
              size="small" 
              danger
              style={{ height: '24px' }}
            >
              Delete
            </Button>
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <App>
      <Layout>
        <Flex vertical className="team-tag-colors">
          <Flex justify="space-between" align="center" className="mb-4">
            <Typography.Title level={4}>
              <i className="icon-bell"></i> Alerts
            </Typography.Title>
          </Flex>
          <div className="mb-2">
            Configure your alert preferences here.
         </div>
            <Table
              dataSource={alerts}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={false}
            />
          <div className="mt-4 alert-text">
            <b>Info:</b> To create a New Alert, start by creating a filter on the Transfers Tab
          </div>
        </Flex>
        <AlertModal
          open={editModalOpen}
          onCancel={() => {
            setEditModalOpen(false);
            setEditingAlert(null);
          }}
          onSave={handleEditSave}
          initialValues={editingAlert || {}}
          teamUsers={teamUsers}
          loading={editLoading}
          mode="edit"
        />
      </Layout>
    </App>
  );
} 