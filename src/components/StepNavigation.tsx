
import React, { useState } from 'react';
import { BarChart, MessageCircle, UserCheck, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

export type Step = {
  id: number;
  label: string;
  icon: React.ElementType;
  path: string;
};

interface StepNavigationProps {
  steps?: Step[];
  currentStep?: number;
  onStepChange?: (stepIndex: number) => void;
  className?: string;
  showContent?: boolean;
  children?: React.ReactNode;
}

const defaultSteps: Step[] = [
  {
    id: 1,
    label: "Analyse des données",
    icon: BarChart,
    path: "/dashboard",
  },
  {
    id: 2,
    label: "Appréciation classe",
    icon: MessageCircle,
    path: "/appreciation-generale",
  },
  {
    id: 3,
    label: "Appréciation individuelle",
    icon: UserCheck,
    path: "/appreciations-individuelles",
  },
  {
    id: 4,
    label: "Votre conseil de classe en résumé",
    icon: FileText,
    path: "/rapport",
  },
];

const StepNavigation: React.FC<StepNavigationProps> = ({
  steps = defaultSteps,
  currentStep = 1,
  onStepChange,
  className,
  showContent = false,
  children,
}) => {
  const [activeStep, setActiveStep] = useState(currentStep);
  
  const handleStepClick = (stepIndex: number) => {
    setActiveStep(stepIndex);
    if (onStepChange) {
      onStepChange(stepIndex);
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <nav aria-label="Étapes du processus" className="mb-8">
        {/* Desktop view */}
        <ul className="hidden md:flex justify-between items-center">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep;
            const StepIcon = step.icon;
            
            return (
              <li key={step.id} className="flex flex-col items-center relative w-full">
                {index > 0 && (
                  <div 
                    className={cn(
                      "absolute h-0.5 w-full -left-1/2 top-6 z-0",
                      index < activeStep ? "bg-blue-500" : "bg-gray-200"
                    )}
                    aria-hidden="true"
                  />
                )}
                
                <Link
                  to={step.path}
                  className="group flex flex-col items-center"
                  onClick={(e) => {
                    if (!onStepChange) return; // If no handler, let normal navigation happen
                    e.preventDefault();
                    handleStepClick(step.id);
                  }}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center z-10 transition-all duration-300 ease-in-out group-hover:scale-105 shadow-sm",
                      isActive 
                        ? "bg-blue-500 text-white group-hover:bg-blue-600" 
                        : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                    )}
                  >
                    <StepIcon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  
                  <span 
                    className={cn(
                      "mt-2 text-sm font-medium text-center max-w-[120px] transition-colors",
                      isActive ? "text-blue-600" : "text-gray-600"
                    )}
                  >
                    {step.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* Mobile view */}
        <div className="md:hidden">
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {steps.map((step, index) => {
              const isActive = step.id === activeStep;
              const StepIcon = step.icon;
              
              return (
                <Link
                  key={step.id}
                  to={step.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300",
                    isActive 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  onClick={(e) => {
                    if (!onStepChange) return;
                    e.preventDefault();
                    handleStepClick(step.id);
                  }}
                  aria-current={isActive ? "step" : undefined}
                >
                  <StepIcon className="w-4 h-4" aria-hidden="true" />
                  <span className="line-clamp-1">{step.label}</span>
                </Link>
              );
            })}
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(activeStep / steps.length) * 100}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </nav>
      
      {showContent && children && (
        <div className="mt-8 animate-fade-in">
          {React.Children.toArray(children)[activeStep - 1]}
        </div>
      )}
    </div>
  );
};

export default StepNavigation;
