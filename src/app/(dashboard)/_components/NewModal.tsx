"use client";

import React, { useState } from 'react';
import { Modal, Form, Input, Button, Typography, Space, Divider } from 'antd';

interface NewModalProps {
  isVisible: boolean;
  onClose: () => void;
}

const { Title, Paragraph } = Typography;

export default function NewModal({ isVisible, onClose }: NewModalProps) {
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      // Add your form submission logic here
      console.log('Form values:', values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reset form and close modal
      form.resetFields();
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="icon-plus-circle" style={{ fontSize: '18px' }}></i>
          <span>New Modal</span>
        </div>
      }
      open={isVisible}
      onCancel={handleCancel}
      onOk={() => form.submit()}
      width={600}
      centered
      okText="Submit"
      cancelText="Cancel"
      confirmLoading={isSubmitting}
    >
      <div style={{ padding: '20px 0' }}>
        <Title level={3}>Welcome to the New Modal!</Title>
        <Paragraph>
          This is a custom modal component that can be reused throughout your application.
          You can customize the content, form fields, and functionality as needed.
        </Paragraph>
        
        <Divider />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[
              { required: true, message: 'Please enter your name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input placeholder="Enter your full name" />
          </Form.Item>
          
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter your email address" />
          </Form.Item>
          
          <Form.Item
            label="Department"
            name="department"
            rules={[{ required: true, message: 'Please select a department' }]}
          >
            <Input placeholder="Enter your department" />
          </Form.Item>
          
          <Form.Item
            label="Message"
            name="message"
            rules={[
              { required: true, message: 'Please enter a message' },
              { min: 10, message: 'Message must be at least 10 characters' }
            ]}
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Enter your message or description"
              showCount
              maxLength={500}
            />
          </Form.Item>
          
          <Form.Item
            label="Priority"
            name="priority"
            rules={[{ required: true, message: 'Please select a priority' }]}
          >
            <Input placeholder="High, Medium, or Low" />
          </Form.Item>
        </Form>
        
        <Divider />
        
        <div style={{ 
          background: '#f5f5f5', 
          padding: '16px', 
          borderRadius: '6px',
          marginTop: '16px'
        }}>
          <Title level={5}>Instructions:</Title>
          <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
            <li>Fill out all required fields</li>
            <li>Make sure your email is valid</li>
            <li>Provide a clear and detailed message</li>
            <li>Select an appropriate priority level</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}
