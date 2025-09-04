"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import styles from "./ResetPasswordConfirmation.module.css";
import { Button, Input, Form, Alert } from 'antd';
import Image from 'next/image';

const ResetPasswordConfirmation: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // Listen for auth state change events
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsReady(true);
        }
      });

      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const handleResetPassword = async (values: { password: string; confirmPassword: string }) => {
    setLoading(true);
    setMessage(null);
    setError(null);
    
    try {
      if (values.password !== values.confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ 
        password: values.password 
      });

      if (error) {
        setError(`Error updating password: ${error.message}`);
      } else {
        setMessage("Password has been reset successfully.");
        // Redirect to homepage after successful password reset
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.resetPasswordConfirmation}>
      <div className={styles.resetPasswordCard}>
        <div className={styles.resetPasswordTitle}>
          <Image
            src="/Verified Athletics Logo.png"
            alt="Verified Athletics Logo"
            width={200}
            height={40}
            priority
          />
        </div>
        
        <h2>Reset Password</h2>
        
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
        
        {!isReady && !message && !error && (
          <Alert
            message="Loading"
            description="Verifying your reset token..."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        {isReady && (
          <Form
            name="resetPasswordConfirmation"
            onFinish={handleResetPassword}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
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
                htmlType="submit" 
                loading={loading} 
                block
              >
                Reset Password
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordConfirmation;