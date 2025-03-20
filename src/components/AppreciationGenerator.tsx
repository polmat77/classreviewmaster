
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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
  const [tone, setTone] = useState<string>('neutre');
  
  // Tone descriptions
  const tones = [
    { value: 'exigeant', label: 'Exigeant', description: 'Ton ferme qui met l\'accent sur les attentes et les points à améliorer' },
    { value: 'neutre', label: 'Neutre', description: 'Ton équilibré qui présente objectivement les forces et faiblesses' },
    { value: 'bienveillant', label: 'Bienveillant', description: 'Ton encourageant qui valorise les efforts et le potentiel' },
    { value: 'tres-bienveillant', label: 'Très bienveillant', description: 'Ton très positif qui célèbre les réussites et minimise les difficultés' }
  ];
  
  // Suggestion templates - now they consider the analysis data and tone
  const getSuggestions = () => {
    if (type === 'class') {
      if (analysisData) {
        // If we have analysis data, create more specific suggestions with different tones
        const avg = analysisData?.currentTerm?.classAverage.toFixed(1);
        const evolution = (analysisData?.currentTerm?.classAverage - analysisData?.previousTerms?.[0]?.classAverage).toFixed(1);
        const isPositiveEvolution = evolution > 0;
        
        switch(tone) {
          case 'exigeant':
            return [
              `Classe au niveau ${avg >= 14 ? 'satisfaisant' : 'insuffisant'} (${avg}/20). Des efforts plus soutenus et une concentration accrue sont attendus pour le prochain trimestre.`,
              `Performance globale ${isPositiveEvolution ? 'en légère hausse' : 'en baisse'} (${evolution} points). Travail trop irrégulier qui nécessite plus de rigueur et d'implication.`,
              `Ensemble au potentiel certain mais qui manque de constance dans l'effort. Des progrès sont impérativement attendus en termes de participation et d'approfondissement.`
            ];
          case 'neutre':
            return [
              `La classe a montré une dynamique de travail ce trimestre, avec une moyenne générale de ${avg}/20. Les efforts sont notables mais des marges de progression existent.`,
              `Ensemble studieux avec une progression de ${isPositiveEvolution ? '+' : ''}${evolution} points par rapport au trimestre précédent. Résultats globalement ${avg >= 12 ? 'satisfaisants' : 'à améliorer'}.`,
              `Classe de niveau ${avg >= 14 ? 'très satisfaisant' : avg >= 12 ? 'satisfaisant' : 'moyen'} avec une ambiance de travail favorable aux apprentissages. Continuez vos efforts.`
            ];
          case 'bienveillant':
            return [
              `Classe agréable qui progresse bien, avec une moyenne générale encourageante de ${avg}/20. Les efforts fournis par l'ensemble des élèves sont à souligner.`,
              `Belle dynamique collective avec une évolution positive de ${isPositiveEvolution ? '+' : ''}${evolution} points. Le travail sérieux de la majorité des élèves permet une progression constante.`,
              `Groupe motivé au potentiel certain, avec une ambiance propice aux apprentissages. Les progrès réalisés témoignent de l'investissement de chacun.`
            ];
          case 'tres-bienveillant':
            return [
              `Excellente dynamique de classe avec une très belle moyenne de ${avg}/20. Félicitations pour l'investissement collectif qui porte ses fruits !`,
              `Remarquable progression de ${isPositiveEvolution ? '+' : ''}${evolution} points qui témoigne d'un travail assidu et d'une motivation exemplaire. Continuez ainsi !`,
              `Groupe exceptionnel tant par son ambiance que par son implication. Chaque élève contribue positivement à cette réussite collective qui mérite d'être soulignée.`
            ];
          default:
            return [];
        }
      } else {
        // Default suggestions without analysis data, with different tones
        switch(tone) {
          case 'exigeant':
            return [
              "Classe au niveau insuffisant qui doit impérativement fournir des efforts plus réguliers et plus soutenus.", 
              "Travail trop superficiel et manque de rigueur général. Une implication plus conséquente est attendue pour le prochain trimestre.", 
              "Résultats décevants qui reflètent un manque d'investissement. Des progrès significatifs sont attendus dans toutes les matières."
            ];
          case 'neutre':
            return [
              "La classe a montré une dynamique de travail correcte tout au long du trimestre, avec une progression notable des résultats.", 
              "Ensemble studieux et participatif, bien que quelques élèves présentent des difficultés qui nécessitent une attention particulière.", 
              "Classe agréable avec un niveau général satisfaisant et une ambiance de travail favorable aux apprentissages."
            ];
          case 'bienveillant':
            return [
              "Classe agréable qui progresse bien. Les efforts fournis par l'ensemble des élèves sont à souligner et à encourager.", 
              "Belle dynamique collective qui permet une progression constante. Le travail sérieux de la majorité des élèves est à valoriser.", 
              "Groupe motivé au potentiel certain. Les progrès réalisés témoignent de l'investissement de chacun."
            ];
          case 'tres-bienveillant':
            return [
              "Excellente dynamique de classe ! Félicitations pour l'investissement collectif qui porte ses fruits et permet une progression remarquable.", 
              "Groupe exceptionnel tant par son ambiance que par son implication. Chaque élève contribue positivement à cette réussite collective.", 
              "Classe exemplaire dont les résultats témoignent d'un travail assidu et d'une motivation sans faille. Continuez ainsi !"
            ];
          default:
            return [];
        }
      }
    } else {
      // Individual student suggestions
      if (studentData) {
        // Create personalized suggestions based on student data and tone
        switch(tone) {
          case 'exigeant':
            return [
              `Élève ${studentData.average >= 14 ? 'au potentiel certain' : 'aux résultats insuffisants'} qui doit impérativement fournir un travail plus ${studentData.average >= 12 ? 'approfondi' : 'sérieux'} pour exploiter pleinement ses capacités.`,
              `Des efforts ${studentData.effort >= 3 ? 'corrects mais' : 'nettement'} insuffisants et une participation ${studentData.participation >= 3 ? 'à développer davantage' : 'trop rare'}. Plus de rigueur est attendue.`,
              `${studentData.average >= 14 ? 'Résultats satisfaisants mais' : 'Trimestre décevant avec des performances'} ${studentData.consistency >= 3 ? 'qui masquent un manque d\'approfondissement' : 'trop irrégulières'}. Doit viser l'excellence.`
            ];
          case 'neutre':
            return [
              `Élève ${studentData.average >= 14 ? 'sérieux' : studentData.average >= 12 ? 'correct' : 'moyen'} qui a fourni un travail ${studentData.average >= 12 ? 'régulier' : 'irrégulier'} ce trimestre, avec des résultats ${studentData.average >= 14 ? 'satisfaisants' : studentData.average >= 12 ? 'corrects' : 'à améliorer'}.`,
              `Des efforts ${studentData.effort >= 3 ? 'constants' : 'irréguliers'} et une participation ${studentData.participation >= 3 ? 'active' : 'à développer'} qui témoignent d'une ${studentData.average >= 14 ? 'certaine' : 'relative'} motivation.`,
              `${studentData.average >= 14 ? 'Bon' : studentData.average >= 12 ? 'Trimestre correct' : 'Trimestre moyen'} dans l'ensemble, avec des résultats ${studentData.consistency >= 3 ? 'homogènes' : 'hétérogènes'} selon les matières.`
            ];
          case 'bienveillant':
            return [
              `Élève ${studentData.average >= 14 ? 'très investi' : 'sérieux'} qui progresse bien. Le travail ${studentData.average >= 12 ? 'régulier' : 'en amélioration'} fourni ce trimestre est encourageant.`,
              `Des efforts ${studentData.effort >= 3 ? 'soutenus' : 'visibles'} et une participation ${studentData.participation >= 3 ? 'constructive' : 'qui s\'améliore'}. Continuez dans cette voie prometteuse.`,
              `${studentData.average >= 14 ? 'Très bon' : 'Bon'} trimestre qui montre le potentiel certain de cet élève. Les progrès réalisés sont à souligner et à encourager.`
            ];
          case 'tres-bienveillant':
            return [
              `Excellent élève qui s'épanouit dans son travail ! Les résultats ${studentData.average >= 14 ? 'remarquables' : 'en nette progression'} témoignent d'un investissement de qualité.`,
              `Efforts exemplaires et participation précieuse qui enrichissent la classe. Votre motivation et votre curiosité sont de véritables atouts.`,
              `Félicitations pour ce trimestre ${studentData.average >= 14 ? 'exceptionnel' : 'très prometteur'} ! Votre sérieux et votre persévérance vous permettent de progresser constamment.`
            ];
          default:
            return [];
        }
      } else {
        // Default suggestions without student data, with different tones
        switch(tone) {
          case 'exigeant':
            return [
              "Élève qui doit impérativement fournir un travail plus sérieux et plus approfondi pour exploiter pleinement ses capacités.",
              "Des efforts insuffisants et une participation trop rare. Plus de rigueur et d'implication sont attendus pour le prochain trimestre.",
              "Résultats décevants qui ne reflètent pas le potentiel réel. Un travail plus rigoureux et plus constant est nécessaire."
            ];
          case 'neutre':
            return [
              "Élève sérieux qui a fourni un travail régulier ce trimestre, avec des résultats satisfaisants dans l'ensemble.",
              "Des efforts constants et une participation active qui témoignent d'une certaine motivation. À poursuivre.",
              "Bon trimestre dans l'ensemble, mais des résultats parfois irréguliers selon les matières. Plus de constance permettrait de progresser davantage."
            ];
          case 'bienveillant':
            return [
              "Élève investi qui progresse bien. Le travail sérieux fourni ce trimestre est encourageant et mérite d'être souligné.",
              "Des efforts soutenus et une participation constructive qui enrichissent la classe. Continuez dans cette voie prometteuse.",
              "Bon trimestre qui montre le potentiel certain de cet élève. Les progrès réalisés sont à souligner et à encourager."
            ];
          case 'tres-bienveillant':
            return [
              "Excellent élève qui s'épanouit dans son travail ! Les résultats remarquables témoignent d'un investissement de qualité.",
              "Efforts exemplaires et participation précieuse qui enrichissent la classe. Votre motivation et votre curiosité sont de véritables atouts.",
              "Félicitations pour ce trimestre exceptionnel ! Votre sérieux et votre persévérance vous permettent de progresser constamment."
            ];
          default:
            return [];
        }
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
  
  // Generate on component mount, when analysis data changes, or when tone changes
  useEffect(() => {
    generateAppreciation();
  }, [analysisData, tone]);
  
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
      
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium">Choisir le ton</h4>
          <RadioGroup 
            className="grid grid-cols-2 md:grid-cols-4 gap-2"
            value={tone}
            onValueChange={setTone}
          >
            {tones.map(t => (
              <div key={t.value} className="flex items-start space-x-2">
                <RadioGroupItem value={t.value} id={t.value} className="mt-1" />
                <label 
                  htmlFor={t.value} 
                  className="flex flex-col cursor-pointer text-sm"
                >
                  <span className="font-medium">{t.label}</span>
                  <span className="text-xs text-muted-foreground hidden md:inline-block">{t.description}</span>
                </label>
              </div>
            ))}
          </RadioGroup>
        </div>
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
