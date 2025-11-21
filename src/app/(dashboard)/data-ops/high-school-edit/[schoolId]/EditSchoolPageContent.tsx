"use client";

import React, { useState, useEffect } from "react";
import { Card, Button, Typography, Spin, message } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import EditSchoolModal from "@/app/(dashboard)/_components/EditSchoolModal";
import { fetchSchoolWithFacts } from "@/lib/queries";

const { Title } = Typography;

interface EditSchoolPageContentProps {
  schoolId: string;
}

export default function EditSchoolPageContent({ schoolId }: EditSchoolPageContentProps) {
  const router = useRouter();
  const [schoolName, setSchoolName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadSchoolName();
  }, [schoolId]);

  const loadSchoolName = async () => {
    try {
      setLoading(true);
      const schoolData = await fetchSchoolWithFacts(schoolId);
      setSchoolName(schoolData?.school?.name || "High School");
    } catch (error) {
      console.error("Error loading school name:", error);
      setSchoolName("High School");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    message.success("School information updated successfully");
    // Refresh the data by incrementing the key
    setRefreshKey((prev) => prev + 1);
    loadSchoolName();
  };

  const handleClose = () => {
    router.push("/data-ops?tab=highschools");
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto" }}>
      <Card>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleClose}
            type="text"
          >
            Back to Data Ops
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            Edit School: {schoolName}
          </Title>
        </div>

        <div style={{ position: "relative" }} className="edit-school-page-wrapper">
          <EditSchoolModal
            key={refreshKey}
            isVisible={true}
            onClose={handleClose}
            schoolId={schoolId}
            schoolName={schoolName}
            onSave={handleSave}
          />
        </div>
      </Card>

      <style dangerouslySetInnerHTML={{__html: `
        /* Override modal styles to make it look like a page */
        .edit-school-page-wrapper .ant-modal-mask {
          display: none !important;
        }
        .edit-school-page-wrapper .ant-modal-wrap {
          position: static !important;
          z-index: 0 !important;
        }
        .edit-school-page-wrapper .ant-modal {
          position: relative !important;
          top: 0 !important;
          padding-bottom: 0 !important;
          max-width: 100% !important;
        }
        .edit-school-page-wrapper .ant-modal-content {
          box-shadow: none !important;
          border: none !important;
        }
        .edit-school-page-wrapper .ant-modal-header {
          display: none !important;
        }
        .edit-school-page-wrapper .ant-modal-body {
          padding: 0 !important;
          max-height: none !important;
        }
        .edit-school-page-wrapper .ant-modal-footer {
          position: sticky !important;
          bottom: 0 !important;
          background: white !important;
          border-top: 1px solid #f0f0f0 !important;
          padding: 16px 24px !important;
          margin-top: 24px !important;
        }
      `}} />
    </div>
  );
}

