"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import styles from "./login.module.css";
import Link from 'next/link';
import { Button, Input, Form, Alert } from 'antd';
import Image from 'next/image';

interface LoginProps {
  onLoginSuccess?: (userId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [lastEmail, setLastEmail] = useState<string>("");

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    setLastEmail(values.email);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: values.email, 
        password: values.password 
      });
      
      if (error) {
        // Handle specific email confirmation error
        if (error.message.includes('Email not confirmed') || error.message.includes('email_confirmed')) {
          setError("Your email address has not been confirmed. Please check your email for a confirmation link, or click 'Resend Confirmation' below.");
        } else {
          setError(error.message);
        }
      } else if (data.session) {
        // Call the success callback if provided
        if (onLoginSuccess) {
          onLoginSuccess(data.session.user.id);
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!lastEmail) {
      setError("Please enter your email address first");
      return;
    }

    setResendLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: lastEmail,
      });

      if (error) {
        setError(`Failed to resend confirmation email: ${error.message}`);
      } else {
        setError("Confirmation email sent! Please check your inbox and click the confirmation link.");
      }
    } catch (err) {
      setError("An unexpected error occurred while sending confirmation email");
      console.error(err);
    } finally {
      setResendLoading(false);
    }
  };

  const showResendButton = error && (error.includes('Email not confirmed') || error.includes('email_confirmed'));

  return (
    <div className={styles.login}>
      <div className={styles.loginCard}>
        <div className={styles.loginTitle}>
          <Image
            src="/Verified Athletics Logo.png"
            alt="Verified Athletics Logo"
            width={200}
            height={60}
            priority
            className={styles.logoImage}
          />
        </div>
        
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form
          name="login"
          onFinish={handleLogin}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please enter your email' }]}
          >
            <Input 
              type="email" 
              placeholder="Email"
              style={{ height: '40px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password 
              placeholder="Password"
              style={{ height: '40px' }}
              className={styles.passwordInput}
            />
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading} 
              block
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>

        {showResendButton && (
          <Form.Item style={{ marginBottom: 16 }}>
            <Button 
              type="default" 
              onClick={handleResendConfirmation}
              loading={resendLoading}
              block
            >
              Resend Confirmation Email
            </Button>
          </Form.Item>
        )}
        
        <div className={styles.forgotPassword}>
          <Link href="/reset-password">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
