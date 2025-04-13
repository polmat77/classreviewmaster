
import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ className, showText = true, size = 'md' }) => {
  const logoSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn("relative", logoSizes[size])}>
        <img 
          src="/lovable-uploads/b6023dae-14a9-4284-a657-bdd5298b7835.png"
          alt="ClassReviewMaster Logo"
          className="w-full h-full object-contain"
        />
      </div>
      
      {showText && (
        <span className={cn("font-medium tracking-tight", textSizes[size])}>
          ClassReviewMaster
        </span>
      )}
    </div>
  );
};

export default Logo;
