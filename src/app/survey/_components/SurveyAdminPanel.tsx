'use client';

import { useState } from 'react';
import { Card, Button, Typography, Space, Alert, Collapse } from 'antd';
import { KeyOutlined, MailOutlined, CopyOutlined } from '@ant-design/icons';
import SurveyTokenGenerator from './SurveyTokenGenerator';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface SurveyAdminPanelProps {
  athleteId: string;
  athleteName: string;
  isAdmin: boolean;
}

export default function SurveyAdminPanel({ 
  athleteId, 
  athleteName, 
  isAdmin 
}: SurveyAdminPanelProps) {
  const [showTokenGenerator, setShowTokenGenerator] = useState(false);

  if (!isAdmin) {
    return null;
  }

  return (
    <Card 
      title={
        <Space>
          <KeyOutlined />
          <span>Survey Management</span>
        </Space>
      }
      style={{ marginBottom: '16px' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text>
            Generate secure survey tokens for <strong>{athleteName}</strong> to access their survey.
          </Text>
        </div>

        {!showTokenGenerator ? (
          <Button
            type="primary"
            icon={<KeyOutlined />}
            onClick={() => setShowTokenGenerator(true)}
            size="large"
          >
            Generate Survey Token
          </Button>
        ) : (
          <div>
            <Alert
              message="Survey Token Generator"
              description="Generate a secure token for this athlete to access their survey"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            
            <SurveyTokenGenerator 
              athleteId={athleteId}
            />
            
            <Button
              onClick={() => setShowTokenGenerator(false)}
              style={{ marginTop: '8px' }}
            >
              Hide Token Generator
            </Button>
          </div>
        )}

        <Collapse size="small" ghost>
          <Panel header="Survey Security Information" key="1">
            <Space direction="vertical" size="small">
              <Text type="secondary">
                <strong>How it works:</strong>
              </Text>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Generate a secure token for the athlete</li>
                <li>Copy the generated survey URL</li>
                <li>Send the URL to the athlete via email</li>
                <li>Athlete can access their survey using the secure link</li>
                <li>Token expires after 30 days for security</li>
              </ul>
              
              <Text type="secondary">
                <strong>Security features:</strong>
              </Text>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>256-bit cryptographically secure tokens</li>
                <li>Database-level Row Level Security (RLS)</li>
                <li>Athletes can only access their own data</li>
                <li>Time-based token expiration</li>
                <li>Secure session management</li>
              </ul>
            </Space>
          </Panel>
        </Collapse>
      </Space>
    </Card>
  );
}
