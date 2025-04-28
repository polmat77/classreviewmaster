
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  isLoading?: boolean;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentStep, 
  totalSteps, 
  steps,
  isLoading = false 
}) => {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="space-y-2 my-4">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-medium">
          Étape {currentStep} sur {totalSteps}
          {isLoading && <span className="text-muted-foreground italic ml-2">En cours...</span>}
        </span>
        <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
      </div>
      
      <Progress value={percentage} className="h-2" />
      
      <div className="mt-2 text-sm font-medium">
        {steps[currentStep - 1]}
      </div>
    </div>
  );
};

export default ProgressIndicator;
