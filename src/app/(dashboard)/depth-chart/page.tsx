'use client';

import React from 'react';
import { Card } from 'antd';
import EnhancedDepthChart from '@/components/depth-chart/EnhancedDepthChart';
import { ZoomProvider } from '@/contexts/ZoomContext';

const DepthChartPage: React.FC = () => {
  return (
    <ZoomProvider>
      <div className="h-screen flex flex-col">
        <Card className="flex-1 m-4" bodyStyle={{ padding: 0, height: '100%' }}>
          <EnhancedDepthChart />
        </Card>
      </div>
    </ZoomProvider>
  );
};

export default DepthChartPage;
