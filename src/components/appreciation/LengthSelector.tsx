
import React from 'react';
import { Slider } from '@/components/ui/slider';

interface LengthSelectorProps {
  length: number[];
  maxChars: number;
  onLengthChange: (value: number[]) => void;
}

const LengthSelector: React.FC<LengthSelectorProps> = ({ 
  length, 
  maxChars, 
  onLengthChange 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl">Longueur :</h2>
        <span className="text-sm text-muted-foreground">
          {length[0]}/{maxChars} caractères
        </span>
      </div>
      <Slider
        value={length}
        max={maxChars}
        step={10}
        onValueChange={onLengthChange}
        className="w-full"
      />
    </div>
  );
};

export default LengthSelector;

