import React from 'react';
import { getYearOptions } from '../../utils/utils';

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const YearSelector: React.FC<YearSelectorProps> = ({ selectedYear, onYearChange }) => {
  const years = getYearOptions();

  return (
    <div className="relative inline-block">
      <select 
        value={selectedYear} 
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 leading-tight focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
        </svg>
      </div>
    </div>
  );
};

export default YearSelector;