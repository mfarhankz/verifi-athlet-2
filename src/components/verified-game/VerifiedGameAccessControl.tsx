"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Result, Button } from 'antd';
import { fetchUserDetails } from '@/utils/utils';
import { hasPackageAccess } from '@/utils/navigationUtils';

interface VerifiedGameAccessControlProps {
  children: React.ReactNode;
}

const VerifiedGameAccessControl: React.FC<VerifiedGameAccessControlProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const userDetails = await fetchUserDetails();
        
        if (!userDetails) {
          setHasAccess(false);
          setLoading(false);
          return;
        }

        const userPackages = (userDetails.packages || []).map(Number);
        const requiredPackages = [3, 4, 5, 78];
        
        const access = hasPackageAccess(userPackages, requiredPackages);
        setHasAccess(access);
      } catch (error) {
        console.error('Error checking verified game access:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="container mx-auto p-2 sm:p-4">
        <Result
          status="403"
          title="Access Denied"
          subTitle="You do not have permission to access the Verified Game feature. Please contact your administrator if you believe this is an error."
          extra={
            <Button type="primary" onClick={() => router.push('/transfers')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    );
  }

  return <>{children}</>;
};

export default VerifiedGameAccessControl;
