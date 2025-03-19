
import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

interface Step {
  id: number;
  name: string;
  path: string;
}

interface StepIndicatorProps {
  steps: Step[];
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
              <Link 
                to={step.path}
                className="relative flex flex-col items-center group"
              >
                <div 
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background z-10 transition-all duration-300",
                    status === 'complete' ? "border-primary bg-primary text-primary-foreground" : "",
                    status === 'current' ? "border-primary text-primary" : "",
                    status === 'upcoming' ? "border-muted-foreground/30 text-muted-foreground/70 hover:border-muted-foreground/50 hover:text-muted-foreground" : "",
                  )}
                >
                  {i + 1}
                </div>
                <p 
                  className={cn(
                    "mt-2 text-sm font-medium text-center transition-colors max-w-28",
                    status === 'complete' ? "text-primary" : "",
                    status === 'current' ? "text-foreground" : "",
                    status === 'upcoming' ? "text-muted-foreground/70 group-hover:text-muted-foreground" : "",
                  )}
                >
                  {step.name}
                </p>
              </Link>
              
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
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          {steps.map((step, i) => {
            const isActive = i + 1 === currentStep;
            return (
              <Link 
                key={i}
                to={step.path}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
              >
                {i + 1}. {step.name}
              </Link>
            );
          })}
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
