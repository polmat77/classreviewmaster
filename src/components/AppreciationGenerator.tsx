
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AppreciationGeneratorProps {
  studentData?: any;
  maxChars?: number;
  className?: string;
  type?: 'class' | 'individual';
  analysisData?: any;
}

const AppreciationGenerator: React.FC<AppreciationGeneratorProps> = ({
  studentData,
  maxChars = 255,
  className,
  type = 'class',
  analysisData
}) => {
  const [appreciation, setAppreciation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Suggestion templates - now they consider the analysis data
  const getSuggestions = () => {
    if (type === 'class') {
      if (analysisData) {
        // If we have analysis data, create more specific suggestions
        return [
          `La classe a montré une bonne dynamique de travail ce trimestre, avec une moyenne générale de ${analysisData?.currentTerm?.classAverage.toFixed(1)}/20. Les efforts sont notables.`,
          `Ensemble studieux et participatif, avec une progression de ${analysisData?.currentTerm?.classAverage - analysisData?.previousTerms?.[0]?.classAverage > 0 ? '+' : ''}${(analysisData?.currentTerm?.classAverage - analysisData?.previousTerms?.[0]?.classAverage).toFixed(1)} points par rapport au trimestre précédent.`,
          `Classe de niveau ${analysisData?.currentTerm?.classAverage >= 14 ? 'très satisfaisant' : analysisData?.currentTerm?.classAverage >= 12 ? 'satisfaisant' : 'moyen'} avec une ambiance de travail favorable aux apprentissages. Continuez vos efforts.`
        ];
      } else {
        // Default suggestions without analysis data
        return [
          "La classe a montré une bonne dynamique de travail tout au long du trimestre, avec une progression notable des résultats.", 
          "Ensemble studieux et participatif, bien que quelques élèves présentent des difficultés qui nécessitent une attention particulière.", 
          "Classe agréable et motivée, avec un bon niveau général et une ambiance de travail favorable aux apprentissages."
        ];
      }
    } else {
      // Individual student suggestions
      if (studentData) {
        // Create personalized suggestions based on student data
        return [
          `Élève ${studentData.average >= 14 ? 'excellent' : studentData.average >= 12 ? 'sérieux' : 'moyen'} qui a fourni un travail ${studentData.average >= 12 ? 'régulier' : 'irrégulier'} ce trimestre, avec des résultats ${studentData.average >= 14 ? 'très satisfaisants' : studentData.average >= 12 ? 'satisfaisants' : 'à améliorer'}.`,
          `Des efforts ${studentData.effort >= 3 ? 'constants' : 'irréguliers'} et une participation ${studentData.participation >= 3 ? 'active' : 'à développer'} qui témoignent d'une ${studentData.average >= 14 ? 'grande' : 'certaine'} motivation.`,
          `${studentData.average >= 14 ? 'Excellent' : studentData.average >= 12 ? 'Bon' : 'Trimestre moyen'} dans l'ensemble, avec des résultats ${studentData.consistency >= 3 ? 'homogènes' : 'hétérogènes'} selon les matières.`
        ];
      } else {
        // Default suggestions without student data
        return [
          "Élève sérieux et investi qui a fourni un travail régulier ce trimestre, avec des résultats très satisfaisants.",
          "Des efforts constants et une participation active qui témoignent d'une grande motivation. À poursuivre !",
          "Bon trimestre dans l'ensemble, mais des résultats irréguliers selon les matières. Plus de rigueur permettrait de progresser davantage."
        ];
      }
    }
  };
  
  const generateAppreciation = () => {
    setIsGenerating(true);
    
    // In a real implementation, this would be an API call to an AI service
    setTimeout(() => {
      const suggestions = getSuggestions();
      const randomAppreciation = suggestions[Math.floor(Math.random() * suggestions.length)];
      setAppreciation(randomAppreciation);
      setIsGenerating(false);
      toast.success("Appréciation générée avec succès");
    }, 1500);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(appreciation);
    setCopied(true);
    toast.success("Copié dans le presse-papier");
    
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Generate on component mount or when analysis data changes
  useEffect(() => {
    generateAppreciation();
  }, [analysisData]);
  
  return (
    <div className={cn("glass-panel p-5 space-y-4", className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          {type === 'class' ? 'Appréciation générale de classe' : 'Appréciation de l\'élève'}
        </h3>
        
        <button
          onClick={generateAppreciation}
          disabled={isGenerating}
          className="button-secondary flex items-center space-x-2 text-xs h-8"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Génération...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Régénérer</span>
            </>
          )}
        </button>
      </div>
      
      <div className="relative">
        <div className="absolute top-3 left-3">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
        
        <textarea
          value={appreciation}
          onChange={(e) => setAppreciation(e.target.value)}
          maxLength={maxChars}
          placeholder="L'appréciation générée apparaîtra ici..."
          className="w-full min-h-[120px] p-4 pl-10 rounded-lg glass-input resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        
        <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
          <div>
            {appreciation.length} / {maxChars} caractères
          </div>
          
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Copié</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copier</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Suggestions</h4>
        
        <div className="flex flex-wrap gap-2">
          {getSuggestions().map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setAppreciation(suggestion)}
              className="text-xs py-1.5 px-3 rounded-full bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
            >
              {suggestion.substring(0, 30)}...
            </button>
          ))}
        </div>
      </div>
      
      {analysisData && (
        <div className="mt-4 pt-4 border-t border-border/30">
          <h4 className="text-sm font-medium mb-2">Données d'analyse</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Moyenne générale</div>
              <div className="text-lg font-medium">{analysisData.currentTerm.classAverage.toFixed(1)}/20</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Évolution</div>
              <div className={cn(
                "text-lg font-medium",
                analysisData.currentTerm.classAverage - analysisData.previousTerms[0].classAverage > 0 
                  ? "text-green-500" 
                  : "text-red-500"
              )}>
                {analysisData.currentTerm.classAverage - analysisData.previousTerms[0].classAverage > 0 ? "+" : ""}
                {(analysisData.currentTerm.classAverage - analysisData.previousTerms[0].classAverage).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppreciationGenerator;
