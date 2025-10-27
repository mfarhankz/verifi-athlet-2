import React from 'react';
import { Flex, InputNumber } from 'antd';

interface TimeInputProps {
  value?: number; // Value in seconds
  onChange?: (value: number | null) => void;
  placeholder?: string;
  min?: number;
  style?: React.CSSProperties;
}

export default function TimeInput({ value, onChange, placeholder = 'Enter time', min = 0, style }: TimeInputProps) {
  // Convert seconds to minutes and seconds
  const minutes = value ? Math.floor(value / 60) : undefined;
  const seconds = value ? Number((value % 60).toFixed(2)) : undefined;

  const handleMinutesChange = (newMinutes: number | null) => {
    if (newMinutes === null) {
      // If minutes is cleared, only keep seconds if they exist
      onChange?.(seconds || null);
    } else {
      // Update with new minutes value
      const newTotalSeconds = (newMinutes * 60) + (seconds || 0);
      onChange?.(newTotalSeconds);
    }
  };

  const handleSecondsChange = (newSeconds: number | null) => {
    if (newSeconds === null) {
      // If seconds is cleared, only keep minutes if they exist
      onChange?.(minutes ? minutes * 60 : null);
    } else {
      // Update with new seconds value
      const newTotalSeconds = ((minutes || 0) * 60) + newSeconds;
      onChange?.(newTotalSeconds);
    }
  };

  return (
    <Flex gap={8} style={style}>
      <InputNumber
        style={{ flex: 1 }}
        min={0}
        placeholder="Minutes"
        value={minutes}
        onChange={handleMinutesChange}
        parser={value => Math.floor(Number(value))}
      />
      <InputNumber
        style={{ flex: 1 }}
        min={0}
        max={59.99}
        step={0.01}
        precision={2}
        placeholder="Seconds"
        value={seconds}
        onChange={handleSecondsChange}
      />
    </Flex>
  );
}
