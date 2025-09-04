'use client';

import { useEffect } from 'react';
import { suppressAntdWarning } from '@/utils/antd-compat';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    suppressAntdWarning();
  }, []);

  return <>{children}</>;
} 