
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import StepIndicator from './StepIndicator';
import { ChevronLeft, ChevronRight, ChevronDown, BarChart, MessageCircle, UserCheck, FileText } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import Logo from './Logo';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  
  const steps = [
    { id: 1, name: 'Analyse des résultats', path: '/dashboard', icon: BarChart },
    { id: 2, name: 'Appréciation générale de classe', path: '/appreciation-generale', icon: MessageCircle },
    { id: 3, name: 'Appréciations individuelles', path: '/appreciations-individuelles', icon: UserCheck },
    { id: 4, name: 'Rapport final', path: '/rapport', icon: FileText },
  ];
  
  // Find current step
  const currentStep = steps.findIndex(step => step.path === currentPath) + 1;
  const currentStepIndex = Math.max(0, currentStep - 1);
  
  // Previous and next navigation
  const prevStep = currentStep > 1 ? steps[currentStep - 2].path : null;
  const nextStep = currentStep < steps.length ? steps[currentStep].path : null;
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="app-container flex justify-between items-center h-16">
          <Link 
            to="/" 
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <Logo size="xl" />
          </Link>
          
          <div className="flex items-center space-x-4">
            {/* Add menu items or user profile if needed */}
          </div>
        </div>
      </header>
      
      <div className="app-container flex-1 flex flex-col">
        <StepIndicator 
          steps={steps} 
          currentStep={currentStep} 
          className="my-6"
        />
        
        <main className="flex-1 animate-fade-in">
          {children}
        </main>
        
        <div className="flex justify-between my-8">
          {prevStep ? (
            <Link 
              to={prevStep} 
              className="button-secondary flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Précédent</span>
            </Link>
          ) : (
            <div /> /* Empty placeholder */
          )}
          
          {nextStep && (
            <Link 
              to={nextStep} 
              className={cn(
                "button-primary flex items-center space-x-2",
                !prevStep && "ml-auto" // Move to right if no previous button
              )}
            >
              <span>Suivant</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
      
      <footer className="border-t border-border/40 py-6 bg-secondary/50">
        <div className="app-container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ClassReviewMaster — Simplifiez l'analyse de vos bulletins scolaires</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
