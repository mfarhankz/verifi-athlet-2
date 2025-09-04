'use client';

import { useState } from 'react';
import { Card, Button, Typography, Space, Alert, Input, Divider } from 'antd';
import { KeyOutlined, LinkOutlined, ExperimentOutlined } from '@ant-design/icons';
import SurveyTokenGenerator from '../survey/_components/SurveyTokenGenerator';

const { Title, Text, Paragraph } = Typography;

export default function TestSurveyPage() {
  const [testAthleteId, setTestAthleteId] = useState('80dd9abb-d895-4548-888e-6031449084aa');

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <div className="text-center mb-6">
          <ExperimentOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          <Title level={2} className="mt-4">Survey Token Creator</Title>
        </div>

        <Divider />

        <div className="mb-6">
          <Title level={4}>Test Configuration</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>Test Athlete ID:</Text>
              <Input
                value={testAthleteId}
                onChange={(e) => setTestAthleteId(e.target.value)}
                placeholder="Enter athlete ID to test with"
                className="mt-2"
              />
            </div>
          </Space>
        </div>

        <Divider />

        <div className="mb-6">
          <Title level={4}>Token Generator</Title>
          <SurveyTokenGenerator
            athleteId={testAthleteId}
          />
        </div>

        <Divider />

        <div className="mb-6">
          <Title level={4}>API Endpoints</Title>
          <Space direction="vertical" style={{ width: '100%' }}>         
            <Card size="small">
              <Text code>POST /api/create-survey-token</Text>
              <br />
              <Text code>POST /api/validate-survey-token</Text>
            </Card>
          </Space>
        </div>
      </Card>
    </div>
  );
}
