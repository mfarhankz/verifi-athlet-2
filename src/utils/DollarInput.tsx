import React, { forwardRef } from 'react';
import styles from './DollarInput.module.css';

interface DollarInputProps {
  value: number;
  onChange: (value: number) => void;
  name?: string;
  className?: string;
  disabled?: boolean;
  containerClassName?: string;
}

// Format number with commas
const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Handle input value changes and formatting with cursor management
const handleDollarInput = (e: React.ChangeEvent<HTMLInputElement>, onChange: (value: number) => void) => {
  const input = e.target;
  const cursorPosition = input.selectionStart || 0;
  const oldValue = input.value;
  
  // Count commas before cursor in old value
  const oldCommasBefore = oldValue.slice(0, cursorPosition).split(',').length - 1;
  
  // Allow digits and decimal points
  const cleanValue = input.value.replace(/[^\d.]/g, '');
  const numericValue = cleanValue ? parseFloat(cleanValue) : 0;
  
  onChange(numericValue);

  const formattedValue = formatNumber(numericValue);
  
  // Count commas before cursor in new value
  const newCommasBefore = formattedValue.slice(0, cursorPosition).split(',').length - 1;
  const commaDiff = newCommasBefore - oldCommasBefore;

  setTimeout(() => {
    input.value = formattedValue;
    const adjustedPosition = cursorPosition + commaDiff;
    input.setSelectionRange(adjustedPosition, adjustedPosition);
  }, 0);
};

export const DollarInput = forwardRef<HTMLInputElement, DollarInputProps>(
  ({ value, onChange, name, className, containerClassName, disabled = false }, ref) => {
    return (
      <div className={`${styles.inputContainer} ${containerClassName || ''}`}>
        <span className={styles.dollarSign}>$</span>
        <input
          ref={ref}
          type="text"
          name={name}
          value={formatNumber(value)}
          onChange={(e) => handleDollarInput(e, onChange)}
          disabled={disabled}
          className={`${styles.input} ${className || ''}`}
          style={{ textAlign: 'right', paddingRight: '8px' }}
        />
      </div>
    );
  }
);

DollarInput.displayName = 'DollarInput';

export default DollarInput;
