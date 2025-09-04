"use client";

import { ResponsivePie } from '@nivo/pie';
import { Flex } from 'antd';

interface ProgressPieChartProps {
  currentStep: number;
  totalSteps: number;
  size?: number;
}

export default function ProgressPieChart({ currentStep, totalSteps, size = 32 }: ProgressPieChartProps) {
  const percentage = (currentStep / totalSteps) * 100;
  
     const data = [
     {
       id: 'completed',
       label: 'Completed',
       value: percentage,
       color: '#52c41a' // Green for completed
     },
     {
       id: 'remaining',
       label: 'Remaining',
       value: 100 - percentage,
       color: '#d9f7be' // Light green for remaining
     }
   ];

  return (
    <div style={{ width: size, height: size }}>
      <ResponsivePie
        data={data}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        innerRadius={0.6}
        padAngle={0}
        cornerRadius={0}
                 activeOuterRadiusOffset={0}
         colors={(d) => d.data.color}
         borderWidth={0}
        borderColor={{
          from: 'color',
          modifiers: [['darker', 0.2]]
        }}
        enableArcLinkLabels={false}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
                 enableArcLabels={false}
        legends={[]}
               tooltip={() => null}
      />
    </div>
  );
} 