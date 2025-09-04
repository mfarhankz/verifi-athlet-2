"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import styles from "./ResetPassword.module.css";
import { Button, Input, Form, Alert, Steps } from 'antd';
import Image from 'next/image';
import { MailOutlined, LockOutlined, CheckCircleOutlined } from '@ant-design/icons';

const ResetPassword: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const steps = [
    {
      title: 'Enter Email',
      icon: <MailOutlined />,
    },
    {
      title: 'Enter Code',
      icon: <LockOutlined />,
    },
    {
      title: 'Set Password',
      icon: <CheckCircleOutlined />,
    },
  ];

  const handleSendCode = async (values: { email: string }) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      const response = await fetch('/api/send-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: values.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code');
        return;
      }

      setEmail(values.email);
      
      setMessage(`Verification code sent to ${values.email}. Please check your email and enter the 6-digit code.`);
      
      setCurrentStep(1);
      
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (values: { code: string }) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      const response = await fetch('/api/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email,
          code: values.code 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to verify code');
        return;
      }

      setVerificationCode(values.code);
      setUserId(data.userId);
      setCurrentStep(2);
      
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      if (values.password !== values.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      // Validate password strength
      const hasLowercase = /[a-z]/.test(values.password);
      const hasUppercase = /[A-Z]/.test(values.password);
      const hasNumber = /[0-9]/.test(values.password);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(values.password);

      if (!hasLowercase || !hasUppercase || !hasNumber || !hasSpecialChar) {
        setError("Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character.");
        return;
      }

      if (values.password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }

      if (!userId) {
        setError("Session expired. Please start over.");
        setCurrentStep(0);
        return;
      }

      // Use the API endpoint to update the password
      const response = await fetch('/api/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: userId,
          password: values.password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update password');
        return;
      }

      setMessage("Password has been reset successfully! Redirecting to login...");
      // Redirect to login page after successful password reset
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
      
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/send-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to resend code');
        return;
      }

      setMessage(`New verification code sent to ${email}. Please check your email.`);
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form
            name="sendCode"
            onFinish={handleSendCode}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input 
                type="email" 
                placeholder="Enter your email"
                style={{ height: '40px' }}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary"
                icon={<MailOutlined />}
                loading={loading} 
                htmlType="submit"
                block
                style={{ height: '40px' }}
              >
                Send Verification Code
              </Button>
            </Form.Item>
          </Form>
        );

      case 1:
        return (
          <Form
            name="verifyCode"
            onFinish={handleVerifyCode}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="code"
              rules={[
                { required: true, message: 'Please enter the verification code' },
                { len: 6, message: 'Code must be 6 digits' }
              ]}
            >
              <Input 
                placeholder="Enter 6-digit code"
                style={{ height: '40px' }}
                maxLength={6}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary"
                icon={<LockOutlined />}
                loading={loading} 
                htmlType="submit"
                block
                style={{ height: '40px' }}
              >
                Verify Code
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Button type="link" onClick={handleResendCode} loading={loading}>
                Resend Code
              </Button>
            </div>
          </Form>
        );

      case 2:
        return (
          <Form
            name="setPassword"
            onFinish={handleSetPassword}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 8, message: 'Password must be at least 8 characters' },
                {
                  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~])/,
                  message: 'Password must contain lowercase, uppercase, number, and special character'
                }
              ]}
              help="Password must be at least 8 characters and contain lowercase, uppercase, number, and special character"
            >
              <Input.Password 
                placeholder="New Password"
                style={{ height: '40px' }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password 
                placeholder="Confirm New Password"
                style={{ height: '40px' }}
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={loading} 
                htmlType="submit"
                block
                style={{ height: '40px' }}
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.resetPassword}>
      <div className={styles.resetPasswordCard}>
        <div className={styles.resetPasswordTitle}>
          <Image
            src="/Verified Athletics Logo.png"
            alt="Verified Athletics Logo"
            width={200}
            height={60}
            priority
            className={styles.logoImage}
          />
        </div>
        
        <h2>Reset Password</h2>
        
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((step, index) => (
            <Steps.Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>
        
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {message && (
          <Alert
            message="Success"
            description={message}
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {renderStepContent()}
      </div>
    </div>
  );
};

export default ResetPassword;
