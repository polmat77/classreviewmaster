
import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, BarChart2, FileText, Users, FileSpreadsheet } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <div className="border-b">
        <div className="container py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded flex items-center justify-center font-semibold">P</div>
            <span className="font-medium text-xl hidden sm:inline-block">ProReport</span>
          </Link>
          
          <nav className="hidden md:flex space-x-6">
            <Link to="/" className="nav-link">Accueil</Link>
            <Link to="/appreciation-generale" className="nav-link">Appréciation générale</Link>
            <Link to="/appreciations-individuelles" className="nav-link">Appréciations individuelles</Link>
            <Link to="/analyse" className="nav-link">Analyse</Link>
            <Link to="/rapport" className="nav-link">Rapport</Link>
          </nav>
          
          <div className="md:hidden">
            {/* Mobile menu button would go here */}
          </div>
        </div>
      </div>
      
      <main className="container py-8">
        <h1 className="text-center text-3xl font-bold mb-6">Importez vos fichiers...</h1>
        <div className={cn("app-container flex-1 flex flex-col", className)}>
          {children}
        </div>
      </main>
      
      {/* Bottom navigation for mobile */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background z-10">
          <div className="grid grid-cols-5 h-14">
            <Link to="/" className="mobile-nav-link">
              <Home className="h-5 w-5" />
              <span className="text-xs">Accueil</span>
            </Link>
            <Link to="/appreciation-generale" className="mobile-nav-link">
              <FileText className="h-5 w-5" />
              <span className="text-xs">Générale</span>
            </Link>
            <Link to="/appreciations-individuelles" className="mobile-nav-link">
              <Users className="h-5 w-5" />
              <span className="text-xs">Individuelles</span>
            </Link>
            <Link to="/analyse" className="mobile-nav-link">
              <BarChart2 className="h-5 w-5" />
              <span className="text-xs">Analyse</span>
            </Link>
            <Link to="/rapport" className="mobile-nav-link">
              <FileSpreadsheet className="h-5 w-5" />
              <span className="text-xs">Rapport</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
