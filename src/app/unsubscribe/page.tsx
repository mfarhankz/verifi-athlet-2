"use client";

import { useState } from "react";
import { Form, Input, Button, message, Card, Typography, Result } from "antd";
import { MailOutlined, UserOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function UnsubscribePage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (values: { name: string; email: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          optOutType: 'All Marketing Emails'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process unsubscribe request');
      }

      message.success('You have been successfully unsubscribed from all emails.');
      setIsSuccess(true);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .unsubscribe-card .ant-card-body {
          padding: 24px !important;
        }
      `}} />
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        padding: '20px'
      }}>
        <Card
          className="unsubscribe-card"
          style={{
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
        {isSuccess ? (
          <Result
            status="success"
            title="Successfully Unsubscribed!"
            subTitle="You have been successfully unsubscribed from all emails."
            icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: '72px' }} />}
          />
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={2}>Unsubscribe</Title>
              <Text type="secondary">
                Please provide your information to unsubscribe from all emails.
              </Text>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              <Form.Item
                name="name"
                label="Name"
                rules={[
                  { required: true, message: 'Please enter your name' },
                  { min: 2, message: 'Name must be at least 2 characters' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Enter your name"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email address' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  type="email"
                  placeholder="Enter your email"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  style={{
                    background: 'linear-gradient(135deg, #6253e1, #04befe)',
                    border: 'none'
                  }}
                >
                  Unsubscribe
                </Button>
              </Form.Item>
            </Form>
          </>
        )}
        </Card>
      </div>
    </>
  );
}

