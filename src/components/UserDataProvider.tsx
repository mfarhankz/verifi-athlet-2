"use client";

import React, { ReactNode } from 'react';
import { Skeleton, Result, Button } from 'antd';
import { useUserData } from '@/hooks/useUserData';
import ContextErrorBoundary from './ContextErrorBoundary';

interface UserDataProviderProps {
  children: ReactNode;
  fallback?: ReactNode;
  showLoading?: boolean;
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ 
  children, 
  fallback,
  showLoading = true 
}) => {
  const { isLoading, isAvailable, retryLoad } = useUserData();

  // Show loading state
  if (isLoading && showLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <Skeleton active />
      </div>
    );
  }

  // Show fallback or error state if data is not available
  if (!isAvailable) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Result
        status="warning"
        title="Data Not Available"
        subTitle="User data is not available. Please try refreshing the page."
        extra={[
          <Button type="primary" key="retry" onClick={retryLoad}>
            Retry
          </Button>,
        ]}
      />
    );
  }

  return (
    <ContextErrorBoundary onRetry={retryLoad}>
      {children}
    </ContextErrorBoundary>
  );
};

export default UserDataProvider; 