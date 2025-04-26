import { useState } from 'react';
import { Toaster } from 'sonner';
import ResultsAnalysisPage from '@/components/ResultsAnalysisPage';
import AIAnalysisComponent from '@/components/AIAnalysisComponent';
import { ThemeProvider } from '@/components/ThemeProvider';

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="class-review-theme">
      <div className="min-h-screen bg-background">
        <div className="py-4">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold mb-4">ClassReviewMaster</h1>
            <p className="text-muted-foreground mb-8">
              Analyse des résultats de classe pour les professeurs principaux
            </p>
            
            <ResultsAnalysisPage />
            
            {/* Intégration du composant d'analyse IA sera effectuée au niveau du ResultsAnalysisPage */}
          </div>
        </div>
        <Toaster position="top-right" />
      </div>
    </ThemeProvider>
  );
}

export default App;