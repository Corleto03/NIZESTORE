"use client";
import { Minus, Plus } from 'lucide-react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export default function Stepper({ value, onChange, min = 1, max = 99 }: StepperProps) {
  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white w-fit">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="p-2 hover:bg-gray-50 text-gray-600 disabled:opacity-30 transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="px-4 text-sm font-medium text-gray-900 select-none">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="p-2 hover:bg-gray-50 text-gray-600 disabled:opacity-30 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
