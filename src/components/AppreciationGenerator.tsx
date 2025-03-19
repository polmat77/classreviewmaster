
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface AppreciationGeneratorProps {
  studentData?: any;
  maxChars?: number;
  className?: string;
  type?: 'class' | 'individual';
}

const AppreciationGenerator: React.FC<AppreciationGeneratorProps> = ({
  studentData,
  maxChars = 255,
  className,
  type = 'class'
}) => {
  const [appreciation, setAppreciation] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Suggestion templates
  const suggestions = type === 'class' 
    ? [
        "La classe a montré une bonne dynamique de travail tout au long du trimestre, avec une progression notable des résultats.", 
        "Ensemble studieux et participatif, bien que quelques élèves présentent des difficultés qui nécessitent une attention particulière.", 
        "Classe agréable et motivée, avec un bon niveau général et une ambiance de travail favorable aux apprentissages."
      ]
    : [
        "Élève sérieux et investi qui a fourni un travail régulier ce trimestre, avec des résultats très satisfaisants.",
        "Des efforts constants et une participation active qui témoignent d'une grande motivation. À poursuivre !",
        "Bon trimestre dans l'ensemble, mais des résultats irréguliers selon les matières. Plus de rigueur permettrait de progresser davantage."
      ];
  
  const generateAppreciation = () => {
    setIsGenerating(true);
    
    // Simulate AI generation (would be replaced with actual API call)
    setTimeout(() => {
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
  
  // Generate on component mount
  useEffect(() => {
    generateAppreciation();
  }, []);
  
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
          {suggestions.map((suggestion, index) => (
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
    </div>
  );
};

export default AppreciationGenerator;
