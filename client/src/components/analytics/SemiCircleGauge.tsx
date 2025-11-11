import React, { useState } from 'react';

interface SemiCircleGaugeProps {
  title: string;
  percentage: number;
  convertedValue: number;
  totalValue: number;
  label: string;
  isLoading: boolean;
  color: string;
}

const SemiCircleGauge: React.FC<SemiCircleGaugeProps> = ({
  title,
  percentage,
  convertedValue,
  totalValue,
  label,
  isLoading,
  color,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate the arc for semi-circle (180 degrees = half circle)
  const size = 200;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI; // Half circle circumference
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-[#E2E8F0] p-6 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Title */}
      <h3 className="text-sm font-medium text-[#64748B] text-center mb-4">{title}</h3>

      {/* Semi-Circle Container */}
      <div className="relative flex justify-center items-center mb-4" style={{ height: '140px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
          </div>
        ) : (
          <svg width={size} height={size / 2 + 20} className="overflow-visible">
            {/* Background Semi-Circle */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} 
                  A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            
            {/* Colored Progress Semi-Circle with Animation */}
            <path
              d={`M ${strokeWidth / 2} ${size / 2} 
                  A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-in-out"
              style={{
                filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none',
              }}
            />
          </svg>
        )}

        {/* Center Content - Animated Transition */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '40%' }}>
          <div className="text-center">
            {/* Percentage Display (Shows on Hover) */}
            <div 
              className={`transition-all duration-300 ${
                isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75 absolute'
              }`}
            >
              <div className="text-4xl font-bold" style={{ color }}>
                {percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-[#64748B] mt-1">Conversion Rate</p>
            </div>

            {/* Values Display (Default) */}
            <div 
              className={`transition-all duration-300 ${
                isHovered ? 'opacity-0 scale-75 absolute' : 'opacity-100 scale-100'
              }`}
            >
              <div className="text-3xl font-bold text-[#1E293B]">
                {convertedValue}
              </div>
              <p className="text-sm text-[#64748B] mt-1">/ {totalValue}</p>
              <p className="text-xs text-[#94A3B8]">{label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Footer with Hover Effect */}
      <div className={`grid grid-cols-2 gap-3 pt-4 border-t transition-colors duration-300 ${
        isHovered ? 'border-[#CBD5E1]' : 'border-[#F1F5F9]'
      }`}>
        <div className="text-center">
          <p className="text-xs text-[#94A3B8] mb-1">Total</p>
          <p className={`text-lg font-semibold transition-all duration-300 ${
            isHovered ? 'text-[#0F172A] scale-110' : 'text-[#1E293B]'
          }`}>
            {totalValue}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-[#94A3B8] mb-1">{label}</p>
          <p 
            className={`text-lg font-semibold transition-all duration-300 ${
              isHovered ? 'scale-110' : ''
            }`}
            style={{ color: isHovered ? color : color }}
          >
            {convertedValue}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SemiCircleGauge;