"use client";

import React, { useState } from 'react';
import { Modal, Typography, Space, Button, Table, Tag, Progress, Flex, Divider, Card, Row, Col, Statistic } from 'antd';
import Image from 'next/image';

interface NewModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const { Title, Text, Paragraph } = Typography;

export default function NewModal({ isVisible, onClose }: NewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Add your submission logic here
      console.log('Submitting school profile...');
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onClose();
    } catch (error) {
      console.error('Error submitting:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  // Sample data for the school profile
  const schoolData = {
    name: "ABERNATHY HS",
    state: "Texas",
    county: "Hale",
    headCoach: {
      name: "Justine Wiley",
      email: "jwiley@abernathysid.com",
      timestamp: "8/12/2024 3:45",
      address: "505 7th St Abernathy, Tx 79311",
      phone: "(805) 289 4940",
      homePhone: "(830) 229 9483",
      cellPhone: "(325) 977 2346",
      officePhone: "(806) 298 4910"
    },
    athleticDirector: {
      name: "Justin Wiley",
      email: "jwiley@abernathysid.com"
    },
    schoolInfo: {
      enrollment: 254,
      religiousAffiliation: "None",
      schoolType: "Public"
    },
    records: {
      current: "8W - 4L",
      previous: "5W - 6L"
    },
    conference: "3A - 2Region | District 4",
    stateClassification: "Division 2A-2",
    scores: [
      { name: "# of Prospects Score", value: 7, color: "#52c41a" },
      { name: "# of D1 Prospects Score", value: 5, color: "#fa8c16" },
      { name: "Team Quality Score", value: 2, color: "#f5222d" },
      { name: "Athlete Income Score", value: 8, color: "#52c41a" },
      { name: "Academics Score", value: 7, color: "#52c41a" }
    ]
  };

  const prospectsData = [
    {
      key: '1',
      name: 'Jerome Bell',
      gradYear: '2027',
      projection: 'D3 - Top half',
      bestOffer: '$2,203',
      gpa: '3.22',
      position: 'WR',
      height: '5100',
      weight: '135',
      score: 58.9
    },
    {
      key: '2',
      name: 'Darrell Steward',
      gradYear: '2027',
      projection: 'D3 - Top half',
      bestOffer: '$114',
      gpa: '3.22',
      position: 'WR',
      height: '5090',
      weight: '135',
      score: 45.2
    },
    {
      key: '3',
      name: 'Wade Warren',
      gradYear: '2027',
      projection: 'D3 - Top half',
      bestOffer: '$296',
      gpa: '3.22',
      position: 'DB',
      height: '5100',
      weight: '180',
      score: 52.1
    },
    {
      key: '4',
      name: 'Devon Lane',
      gradYear: '2027',
      projection: 'D3 - Top half',
      bestOffer: '$1,900',
      gpa: '3.22',
      position: 'QB',
      height: '6000',
      weight: '160',
      score: 67.8
    },
    {
      key: '5',
      name: 'Ronald Richards',
      gradYear: '2028',
      projection: 'D3',
      bestOffer: '$1,705',
      gpa: '3.55',
      position: 'OLB',
      height: '5020',
      weight: '220',
      score: 61.3
    },
    {
      key: '6',
      name: 'Darlene Robertson',
      gradYear: '2026',
      projection: 'D3 - Top half',
      bestOffer: '$207',
      gpa: '3.55',
      position: 'LB',
      height: '5100',
      weight: '135',
      score: 49.7
    }
  ];

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          <div style={{ 
            width: 40, 
            height: 40, 
            borderRadius: '50%', 
            backgroundColor: '#f0f0f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8
          }}>
            <Text strong>{text.charAt(0)}</Text>
          </div>
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8 
            }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: record.score > 60 ? '#52c41a' : record.score > 40 ? '#fa8c16' : '#f5222d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                {record.score}
              </div>
              <Text strong>{text}</Text>
              <span style={{ color: '#52c41a' }}>★</span>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Grad Year',
      dataIndex: 'gradYear',
      key: 'gradYear',
    },
    {
      title: 'Athletic Projection',
      dataIndex: 'projection',
      key: 'projection',
      render: (text: string) => <Tag color="blue">{text}</Tag>
    },
    {
      title: 'Best Offer',
      dataIndex: 'bestOffer',
      key: 'bestOffer',
      render: (text: string) => <Text strong style={{ color: '#52c41a' }}>{text}</Text>
    },
    {
      title: 'GPA',
      dataIndex: 'gpa',
      key: 'gpa',
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
    },
    {
      title: 'Height',
      dataIndex: 'height',
      key: 'height',
    },
    {
      title: 'Weight',
      dataIndex: 'weight',
      key: 'weight',
    },
    {
      title: 'Highlight',
      key: 'highlight',
      render: () => <Button type="link" size="small">Link</Button>
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="icon-school" style={{ fontSize: '18px' }}></i>
            <span>School Profile</span>
          </div>
          <Space>
            <Button icon={<i className="icon-close"></i>} type="text" onClick={handleCancel} />
            <Button icon={<i className="icon-edit"></i>} type="text" />
            <Button icon={<i className="icon-printer"></i>} type="text" />
          </Space>
        </div>
      }
      open={isVisible}
      onCancel={handleCancel}
      width={'90%'}
      centered
      footer={null}
      style={{ top: 20 }}
    >
      <div style={{ padding: '0', maxHeight: '80vh', overflowY: 'auto' }}>
        {/* Header Section */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={1} style={{ margin: 0, color: '#1890ff' }}>{schoolData.name}</Title>
            <Text type="secondary">State: {schoolData.state} / County: {schoolData.county}</Text>
          </div>
        </div>

        {/* Head Coach Section */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                backgroundColor: '#000', 
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}>
                <Text style={{ color: 'white', fontSize: '24px' }}>X</Text>
              </div>
              <Text strong>@justineWiley</Text>
              <br />
              <Button type="primary" size="small" style={{ marginTop: 8 }}>FOLLOW</Button>
            </div>
            <div style={{ flex: 1 }}>
              <Title level={4} style={{ margin: '0 0 8px 0' }}>
                Head Coach - {schoolData.headCoach.name}
                <Text type="secondary" style={{ fontSize: '14px', marginLeft: 8 }}>
                  {schoolData.headCoach.timestamp}
                </Text>
              </Title>
              <Text>{schoolData.headCoach.email}</Text>
              <br />
              <Text>{schoolData.headCoach.address}</Text>
              <br />
              <Text>{schoolData.headCoach.phone}</Text>
              
              <Divider />
              
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Athletic Director: {schoolData.athleticDirector.name}</Text>
                  <br />
                  <Text>{schoolData.athleticDirector.email}</Text>
                  <br />
                  <br />
                  <Text strong>Contact Numbers:</Text>
                  <br />
                  <Text>Home (Best): {schoolData.headCoach.homePhone}</Text>
                  <br />
                  <Text>Cell: {schoolData.headCoach.cellPhone}</Text>
                  <br />
                  <Text>Office: {schoolData.headCoach.officePhone}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Enrollment Size: {schoolData.schoolInfo.enrollment}</Text>
                  <br />
                  <Text>Religious Affiliation: {schoolData.schoolInfo.religiousAffiliation}</Text>
                  <br />
                  <Text>School Type: {schoolData.schoolInfo.schoolType}</Text>
                </Col>
              </Row>
            </div>
          </div>
        </Card>

        {/* School Performance */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic title="2024 Record" value={schoolData.records.current} />
            </Col>
            <Col span={6}>
              <Statistic title="2023 Record" value={schoolData.records.previous} />
            </Col>
            <Col span={6}>
              <Button type="primary">Make Schedule</Button>
            </Col>
            <Col span={6}>
              <div>
                <Text strong>Conference: {schoolData.conference}</Text>
                <br />
                <Text>State Classification: {schoolData.stateClassification}</Text>
              </div>
            </Col>
          </Row>
        </Card>

        {/* Score Cards */}
        <Card style={{ marginBottom: 24 }}>
          <Title level={4} style={{ marginBottom: 16 }}>School Performance Metrics</Title>
          <Row gutter={16}>
            {schoolData.scores.map((score, index) => (
              <Col span={4} key={index}>
                <div style={{ textAlign: 'center' }}>
                  <Title level={3} style={{ margin: 0, color: score.color }}>
                    {score.value}
                  </Title>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {score.name}
                  </Text>
                  <Progress 
                    percent={score.value * 10} 
                    strokeColor={score.color}
                    showInfo={false}
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {/* College Prospects */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={3} style={{ margin: 0, color: '#1890ff' }}>College Prospect</Title>
            <Space>
              <Button>Filters ▼</Button>
              <Button type="primary">Add Athlete</Button>
            </Space>
          </div>
          
          <Table
            dataSource={prospectsData}
            columns={columns}
            pagination={false}
            size="small"
            scroll={{ x: 800 }}
          />
        </Card>
      </div>
    </Modal>
  );
}
