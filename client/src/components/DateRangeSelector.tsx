import React, { useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { Check } from 'lucide-react';

interface DateRangeSelectorProps {
  startDate: Date;
  endDate: Date;
  onChange: (startDate: Date, endDate: Date) => void;
}

export default function DateRangeSelector({ startDate, endDate, onChange }: DateRangeSelectorProps) {
  const [range, setRange] = useState([
    { startDate, endDate, key: 'selection' },
  ]);

  const handleSelect = (ranges: any) => {
    setRange([ranges.selection]);
  };

  const handleApply = () => {
    onChange(range[0].startDate, range[0].endDate);
  };

  return (
    <div className="w-full">
      <DateRange
        ranges={range}
        onChange={handleSelect}
        moveRangeOnFirstSelection={false}
        months={1}
        direction="horizontal"
        rangeColors={['#3B82F6']}
        className="rounded-lg w-full"
      />
      
      <button
        onClick={handleApply}
        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-[#0F172A] text-white rounded-lg text-sm font-medium hover:bg-[#1E293B] transition-colors"
      >
        <Check className="w-4 h-4" />
        Apply Range
      </button>
    </div>
  );
}