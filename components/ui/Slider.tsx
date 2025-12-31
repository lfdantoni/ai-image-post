"use client";

import { cn } from "@/lib/utils";

interface SliderProps {
  value: number[];
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 0.1,
  onValueChange,
  className,
}: SliderProps) {
  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-full bg-primary rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => onValueChange([parseFloat(e.target.value)])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow-sm pointer-events-none"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
}
