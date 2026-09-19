'use client';

import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { Button } from './button';

interface QuantityStepperProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (max === undefined || value < max) onChange(value + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = parseInt(e.target.value, 10);
    if (isNaN(num)) {
      onChange(min);
    } else {
      let v = num;
      if (v < min) v = min;
      if (max !== undefined && v > max) v = max;
      onChange(v);
    }
  };

  return (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 shadow-2xs">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="h-8 w-8 rounded-md bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        min={min}
        max={max}
        className="h-8 w-12 bg-transparent text-center font-bold text-sm text-slate-900 focus:outline-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
        className="h-8 w-8 rounded-md bg-white border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
