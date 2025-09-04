import React from 'react';
import { Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

interface InfoIconProps {
  tooltip: string;
  className?: string;
  style?: React.CSSProperties;
}

const InfoIcon: React.FC<InfoIconProps> = ({ tooltip, className, style }) => {
  return (
    <Tooltip 
      title={tooltip}
      placement="top"
      overlayStyle={{ maxWidth: '300px' }}
    >
      <InfoCircleOutlined 
        className={className}
        style={{ 
          marginLeft: '6px', 
          cursor: 'help',
          color: '#1890ff',
          fontSize: '12px',
          position: 'relative',
          zIndex: 10,
          ...style 
        }} 
      />
    </Tooltip>
  );
};

export default InfoIcon;
