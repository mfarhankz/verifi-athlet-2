import React from 'react';

interface ProgressBarProps {
  /**
   * The percentage value (0-100)
   */
  value: number;
  /**
   * Height of the progress bar in pixels
   * @default 20
   */
  height?: number;
  /**
   * Custom color for the progress bar
   * @default '#1C1D4D' (primary color)
   */
  color?: string;
  /**
   * Custom background color
   * @default '#E5E5E5' (light gray)
   */
  backgroundColor?: string;
  /**
   * Show the percentage text inside the bar
   * @default true
   */
  showText?: boolean;
  /**
   * Custom className for additional styling
   */
  className?: string;
  /**
   * Custom style for the container
   */
  style?: React.CSSProperties;
  /**
   * Label text to display at the start of the bar
   */
  label?: string;
  /**
   * Font size for the label
   * @default '14'
   */
  labelSize?: '12' | '14';
  /**
   * Font weight for the label
   * @default 500
   */
  labelWeight?: 400 | 500;
  /**
   * Width for the label in pixels
   */
  labelWidth?: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  height = 20,
  color = '#1C1D4D',
  backgroundColor = '#F4F4F6',
  showText = true,
  className = '',
  style = {},
  label,
  labelSize = '14',
  labelWeight = 500,
  labelWidth,
}) => {
  // Ensure value is between 0 and 100
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`relative flex items-center gap-2 ${className}`}
      style={style}
    >
      {/* Label at the start */}
      {label && (
        <span
          style={{
            fontSize: `${labelSize}px`,
            fontWeight: labelWeight,
            whiteSpace: 'nowrap',
            width: labelWidth ? `${labelWidth}px` : 'fit-content',
            textAlign: 'right',
          }}
        >
          {label}
        </span>
      )}

      {/* Progress bar container */}
      <div
        className="flex-1 relative"
        style={{
          height: `${height}px`,
          backgroundColor,
          overflow: 'hidden',
        }}
      >
        {/* Progress fill */}
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            transition: 'width 0.3s ease-in-out',
            display: 'flex',
          }}
        >
          {/* Percentage text */}
          {showText && percentage > 10 && (
            <span
              style={{
                color: '#FFFFFF',
                fontSize: `${Math.max(13, height * 0.6)}px`,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                background: "#1C1D4D",
                width: `${Math.max(32, height * 1)}px`,
                lineHeight: `${height}px`,
                textAlign: 'center',
                fontStyle: 'italic',
              }}
            >
              {Math.round(percentage)}
            </span>
          )}
        </div>

        {/* Text outside if percentage is too small to fit inside */}
        {showText && percentage <= 10 && (
          <div
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: color,
              fontSize: `${Math.max(10, height * 0.5)}px`,
              fontWeight: 500,
              zIndex: 1,
            }}
          >
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;

