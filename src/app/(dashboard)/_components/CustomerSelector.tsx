"use client";

import React from 'react';
import { Select, Flex, Spin } from 'antd';
import { useCustomer } from '@/contexts/CustomerContext';
import { DownOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Option } = Select;

// Import Customer type or define it here
type Customer = {
  customer_id: string;
  sport_id: string;
  sport_abbrev?: string;
  sport_name?: string;
  [key: string]: any;
};

// Custom styles
const selectStyle = {
  minWidth: 60,
  width: 'auto',
  maxWidth: 100
};

const CustomerSelector: React.FC = () => {
  const { customers, activeCustomerId, setActiveCustomerId, isLoading } = useCustomer();
  const router = useRouter();

  // Only show the selector if there's more than one customer
  if (customers.length <= 1) {
    return null;
  }

  if (isLoading) {
    return <Spin size="small" />;
  }

  const handleChange = (value: string) => {
    // Set the new active customer ID
    setActiveCustomerId(value);
    
    // Force a refresh to reload all data with the new customer_id
    // We use a small timeout to ensure the localStorage is updated first
    setTimeout(() => {
      // Refresh the current page to reload all data
      window.location.reload();
    }, 50);
  };

  // Convert abbreviation to uppercase for display
  const getDisplayText = (customer: Customer) => {
    const text = customer.sport_abbrev || customer.sport_id || 'Unknown';
    return text.toUpperCase();
  };

  // Find the active customer
  const activeCustomer = customers.find(c => c.customer_id === activeCustomerId);
  const activeText = activeCustomer ? getDisplayText(activeCustomer) : '';

  return (
    <div style={{ marginRight: '15px', position: 'relative' }}>
      {/* Hide the default arrow */}
      <style jsx global>{`
        .customer-select .ant-select-arrow {
          opacity: 0;
        }
      `}</style>
      
      {/* The select component */}
      <Select
        value={activeCustomerId || undefined}
        onChange={handleChange}
        style={{
          ...selectStyle,
          paddingRight: '8px' // Make room for our custom arrow
        }}
        loading={isLoading}
        className="customer-select"
        styles={{ popup: { root: { minWidth: '80px' } } }}
        popupMatchSelectWidth={false}
      >
        {customers.map((customer) => (
          <Option key={customer.customer_id} value={customer.customer_id}>
            {getDisplayText(customer)}
          </Option>
        ))}
      </Select>
      
      {/* Custom arrow overlay */}
      <div style={{
        position: 'absolute',
        right: '16px',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none'
      }}>
        <DownOutlined style={{ fontSize: '10px', color: 'rgba(0,0,0,0.45)' }} />
      </div>
    </div>
  );
};

export default CustomerSelector; 