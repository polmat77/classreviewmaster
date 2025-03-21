
import React, { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, BarChart2, FileText, Users, FileSpreadsheet, GraduationCap } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
        
        {/* PRONOTE Export Instructions */}
        <div className="mb-8">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pronote-export">
              <AccordionTrigger className="font-medium text-lg flex items-center">
                <GraduationCap className="mr-2 h-5 w-5" />
                Comment exporter mes données depuis PRONOTE ?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="space-y-4 mt-2">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">🎓 Exporter un tableau de notes PDF pour une classe (par trimestre)</h3>
                    
                    <div className="ml-4 space-y-4">
                      <div>
                        <h4 className="font-medium text-foreground">1️⃣ Je vérifie que mes notes sont bien saisies</h4>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Je vais dans Notes &gt; Saisie des notes.</li>
                          <li>Je choisis la période (ex. Trimestre 1).</li>
                          <li>Je contrôle que toutes les notes sont bien entrées, que les coefficients sont bons, et que les moyennes sont calculées.</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground">2️⃣ Je prépare le relevé à imprimer</h4>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Je vais dans Notes &gt; Relevé de notes &gt; Consultation et saisie des appréciations.</li>
                          <li>Je sélectionne ma classe, puis en haut à droite, je clique sur l'icône de maquette 🧾 (ou clic droit dans la colonne "Relevé").</li>
                          <li>Je choisis une maquette déjà prête (souvent définie par l'établissement), ou j'en choisis une qui me convient (affichage des moyennes, appréciations, rang…).</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground">3️⃣ Je lance l'édition PDF</h4>
                        <ul className="list-disc ml-6 space-y-1">
                          <li>Toujours dans Relevé de notes, je clique sur Impression.</li>
                          <li>Dans la fenêtre qui s'ouvre :</li>
                          <ul className="list-circle ml-6 space-y-1">
                            <li>Je coche la classe entière ou les élèves souhaités.</li>
                            <li>En sortie, je sélectionne PDF.</li>
                            <li>Je peux ajuster la mise en page dans les onglets (Présentation, Police, etc.).</li>
                          </ul>
                          <li>Puis je clique sur Imprimer → un seul fichier PDF est généré avec tous les relevés.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        
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
