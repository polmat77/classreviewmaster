
import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { BarChart, MessageCircle, UserCheck, FileText } from 'lucide-react';

interface Step {
  id: number;
  name: string;
  path: string;
  icon?: React.ElementType;
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
  // Add icons to steps if not provided
  const stepsWithIcons = steps.map((step) => {
    if (step.icon) return step;
    
    let icon;
    switch (step.id) {
      case 1:
        icon = BarChart;
        break;
      case 2:
        icon = MessageCircle;
        break;
      case 3:
        icon = UserCheck;
        break;
      case 4:
        icon = FileText;
        break;
      default:
        icon = BarChart;
    }
    
    return {
      ...step,
      icon
    };
  });

  return (
    <div className={cn("w-full", className)}>
      <div className="hidden sm:flex items-center justify-between">
        {stepsWithIcons.map((step, i) => {
          const isActive = step.id === currentStep;
          const StepIcon = step.icon || BarChart;
          
          return (
            <React.Fragment key={i}>
              <Link 
                to={step.path}
                className="relative flex flex-col items-center group"
                aria-current={isActive ? "step" : undefined}
              >
                <div 
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background z-10 transition-all duration-300 group-hover:scale-105 shadow-sm",
                    isActive 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : "",
                    status === 'complete' ? "border-primary bg-primary text-primary-foreground" : "",
                    status === 'current' ? "border-primary text-primary" : "",
                    status === 'upcoming' ? "border-muted-foreground/30 text-muted-foreground/70 hover:border-muted-foreground/50 hover:text-muted-foreground" : "",
                  )}
                >
                  <StepIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                
                <span 
                  className={cn(
                    "mt-2 text-sm font-medium text-center transition-colors max-w-28",
                    isActive ? "text-primary" : "",
                    status === 'complete' ? "text-primary" : "",
                    status === 'current' ? "text-foreground" : "",
                    status === 'upcoming' ? "text-muted-foreground/70 group-hover:text-muted-foreground" : "",
                  )}
                >
                  {step.name}
                </span>
              </Link>
              
              {i < steps.length - 1 && (
                <div 
                  className={cn(
                    "h-0.5 w-full max-w-[100px] bg-muted-foreground/30 transition-colors duration-300",
                    i + 1 < currentStep ? "bg-primary" : ""
                  )}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="sm:hidden">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          {stepsWithIcons.map((step, i) => {
            const isActive = i + 1 === currentStep;
            const StepIcon = step.icon || BarChart;
            
            return (
              <Link 
                key={i}
                to={step.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                {step.icon ? <StepIcon className="h-3 w-3" /> : <>{i + 1}.</>}
                <span>{step.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-2 overflow-hidden rounded-full bg-muted-foreground/30">
          <div 
            className="h-1 bg-primary transition-all duration-300" 
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
