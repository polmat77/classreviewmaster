
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
          src="/lovable-uploads/6853d6c2-6c7b-49a4-b0d4-1659fc9c01c5.png"
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
