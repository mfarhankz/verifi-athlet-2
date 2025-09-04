'use client';

import { useState } from 'react';
import { Flex, Input, Button, Alert, Typography, Card, Space, Tag } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface SurveyTokenGeneratorProps {
  athleteId: string;
}

export default function SurveyTokenGenerator({ athleteId }: SurveyTokenGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateToken = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedToken(null);

    try {
      const response = await fetch('/api/create-survey-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          athleteId,
          expiresInDays: 365 
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGeneratedToken(data.token);
      } else {
        setError(data.error || 'Failed to generate token');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedToken) {
      try {
        await navigator.clipboard.writeText(generatedToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy token:', err);
      }
    }
  };

  const getSurveyUrl = (token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `${baseUrl}/survey/${athleteId}?token=${token}`;
  };

  return (
    <Card title="Survey Token Generator" style={{ marginBottom: '16px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Text type="secondary">Athlete ID: {athleteId}</Text>
        </div>

        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
          />
        )}

        {!generatedToken ? (
          <Button
            type="primary"
            onClick={generateToken}
            loading={isGenerating}
            size="large"
          >
            Generate Survey Token
          </Button>
        ) : (
          <div>
            <Alert
              message="Token Generated Successfully"
              description="This token will expire in 365 days"
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <div style={{ marginBottom: '16px' }}>
              <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                Survey URL:
              </Text>
              <Flex gap="small" align="center">
                <Input
                  value={getSurveyUrl(generatedToken)}
                  readOnly
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(getSurveyUrl(generatedToken));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch (err) {
                      console.error('Failed to copy URL:', err);
                    }
                  }}
                  type={copied ? 'default' : 'primary'}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Flex>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <strong>Instructions:</strong>
                <br />
                1. Copy the survey URL above
                <br />
                2. Send it to the athlete via email
                <br />
                3. The athlete can access their survey using this secure link
                <br />
                4. The token will expire in 365 days
              </Text>
            </div>

            <Button
              onClick={() => {
                setGeneratedToken(null);
                setCopied(false);
              }}
            >
              Generate New Token
            </Button>
          </div>
        )}
      </Space>
    </Card>
  );
}
