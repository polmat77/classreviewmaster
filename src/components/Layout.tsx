
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import StepIndicator from './StepIndicator';
import { ChevronLeft, ChevronRight, GraduationCap, ChevronDown } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isMobile = useIsMobile();
  
  const steps = [
    { id: 1, name: 'Analyse des résultats', path: '/dashboard' },
    { id: 2, name: 'Appréciation générale de classe', path: '/appreciation-generale' },
    { id: 3, name: 'Appréciations individuelles', path: '/appreciations-individuelles' },
    { id: 4, name: 'Rapport final', path: '/rapport' },
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
            className="flex items-center space-x-2 text-xl font-medium transition-opacity hover:opacity-80"
          >
            <span className="bg-primary text-primary-foreground p-1 rounded">BP</span>
            <span className="hidden sm:inline-block">BulletinPro</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {/* Add menu items or user profile if needed */}
          </div>
        </div>
      </header>
      
      <div className="app-container flex-1 flex flex-col">
        {/* PRONOTE Export Instructions Accordion */}
        {currentPath === '/dashboard' && (
          <div className="mb-6 mt-6">
            <Accordion type="single" collapsible className="w-full bg-secondary/20 rounded-lg">
              <AccordionItem value="pronote-export" className="border-none">
                <AccordionTrigger className="px-4 py-3 text-base font-medium">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span>Comment exporter mes données depuis PRONOTE ?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 text-sm">
                    <h3 className="font-medium text-base">🎓 Exporter un tableau de notes PDF pour une classe (par trimestre)</h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">1️⃣ Je vérifie que mes notes sont bien saisies</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Je vais dans Notes &gt; Saisie des notes.</li>
                          <li>Je choisis la période (ex. Trimestre 1).</li>
                          <li>Je contrôle que toutes les notes sont bien entrées, que les coefficients sont bons, et que les moyennes sont calculées.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">2️⃣ Je prépare le relevé à imprimer</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Je vais dans Notes &gt; Relevé de notes &gt; Consultation et saisie des appréciations.</li>
                          <li>Je sélectionne ma classe, puis en haut à droite, je clique sur l'icône de maquette 🧾 (ou clic droit dans la colonne "Relevé").</li>
                          <li>Je choisis une maquette déjà prête (souvent définie par l'établissement), ou j'en choisis une qui me convient (affichage des moyennes, appréciations, rang…).</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">3️⃣ Je lance l'édition PDF</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Toujours dans Relevé de notes, je clique sur Impression.</li>
                          <li>Dans la fenêtre qui s'ouvre :</li>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Je coche la classe entière ou les élèves souhaités.</li>
                            <li>En sortie, je sélectionne PDF.</li>
                            <li>Je peux ajuster la mise en page dans les onglets (Présentation, Police, etc.).</li>
                          </ul>
                          <li>Puis je clique sur Imprimer → un seul fichier PDF est généré avec tous les relevés.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}

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
          <p>© {new Date().getFullYear()} BulletinPro — Simplifiez l'analyse de vos bulletins scolaires</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
