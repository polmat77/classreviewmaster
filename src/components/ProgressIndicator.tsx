
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, Loader } from 'lucide-react';
import { ProgressStatus } from '@/utils/api/types';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  isLoading?: boolean;
  status?: ProgressStatus;
  error?: string;
  errorDetails?: string;
  onRetry?: () => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentStep, 
  totalSteps, 
  steps,
  isLoading = false,
  status = ProgressStatus.PROCESSING,
  error,
  errorDetails,
  onRetry
}) => {
  const percentage = (currentStep / totalSteps) * 100;
  
  return (
    <div className="space-y-2 my-4">
      <div className="flex justify-between items-center text-sm mb-1">
        <div className="flex items-center font-medium">
          {status === ProgressStatus.ERROR ? (
            <AlertCircle className="h-4 w-4 text-destructive mr-2" />
          ) : isLoading ? (
            <Loader className="h-4 w-4 text-primary mr-2 animate-spin" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground mr-2" />
          )}
          <span>
            Étape {currentStep} sur {totalSteps}
            {isLoading && status === ProgressStatus.PROCESSING && (
              <span className="text-muted-foreground italic ml-2">En cours...</span>
            )}
            {status === ProgressStatus.SUCCESS && (
              <span className="text-green-600 dark:text-green-500 italic ml-2">Terminé</span>
            )}
          </span>
        </div>
        <span className={`${status === ProgressStatus.ERROR ? 'text-destructive' : 'text-muted-foreground'}`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      
      <Progress 
        value={percentage} 
        className={`h-2 ${status === ProgressStatus.ERROR ? 'bg-destructive/20' : ''}`} 
        {...(status === ProgressStatus.ERROR && { "aria-invalid": true })}
      />
      
      <div className="mt-2 space-y-2">
        <div className={`text-sm font-medium ${status === ProgressStatus.ERROR ? 'text-destructive' : ''}`}>
          {steps[currentStep - 1]}
        </div>
        
        {status === ProgressStatus.ERROR && error && (
          <div className="bg-destructive/10 border border-destructive/30 p-3 rounded text-sm">
            <div className="font-medium text-destructive">{error}</div>
            {errorDetails && (
              <div className="text-xs mt-1 text-destructive/90">{errorDetails}</div>
            )}
            {onRetry && (
              <button 
                onClick={onRetry}
                className="text-sm mt-2 text-primary hover:underline focus:outline-none"
              >
                Réessayer avec un autre fichier
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;
