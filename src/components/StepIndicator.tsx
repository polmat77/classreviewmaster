
import React from 'react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ 
  steps, 
  currentStep,
  className 
}) => {
  return (
    <div className={cn("w-full", className)}>
      <div className="hidden sm:flex items-center justify-between">
        {steps.map((step, i) => {
          const status = i + 1 < currentStep 
            ? 'complete' 
            : i + 1 === currentStep 
              ? 'current' 
              : 'upcoming';
          
          return (
            <React.Fragment key={i}>
              <div className="relative flex flex-col items-center">
                <div 
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 bg-background z-10 transition-all duration-300",
                    status === 'complete' ? "border-primary bg-primary text-primary-foreground" : "",
                    status === 'current' ? "border-primary text-primary" : "",
                    status === 'upcoming' ? "border-muted-foreground/30 text-muted-foreground/70" : "",
                  )}
                >
                  {i + 1}
                </div>
                <p 
                  className={cn(
                    "mt-2 text-xs font-medium transition-colors",
                    status === 'complete' ? "text-primary" : "",
                    status === 'current' ? "text-foreground" : "",
                    status === 'upcoming' ? "text-muted-foreground/70" : "",
                  )}
                >
                  {step}
                </p>
              </div>
              
              {i < steps.length - 1 && (
                <div 
                  className={cn(
                    "h-0.5 w-full max-w-[100px] bg-muted-foreground/30 transition-colors duration-300",
                    i + 1 < currentStep ? "bg-primary" : ""
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="sm:hidden">
        <div className="flex items-center justify-center">
          <p className="text-sm font-medium">
            Étape {currentStep} sur {steps.length}: <span className="text-primary">{steps[currentStep - 1]}</span>
          </p>
        </div>
        <div className="mt-2 overflow-hidden rounded-full bg-muted-foreground/30">
          <div 
            className="h-1 bg-primary transition-all duration-300" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
