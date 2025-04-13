
import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Logo: React.FC<LogoProps> = ({ className, showText = true, size = 'md' }) => {
  const logoSizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
    xl: 'h-16 w-16', // New extra-large size
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl', // Corresponding text size for xl
  };
  
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className={cn("relative", logoSizes[size])}>
        <img 
          src="/lovable-uploads/96cab2f2-9e89-4149-83f9-3109aa888e3b.png"
          alt="ClassReviewMaster Logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            console.error('Error loading logo image');
            e.currentTarget.style.display = 'none';
          }}
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
