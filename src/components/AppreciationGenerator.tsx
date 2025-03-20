import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppreciationGeneratorProps {
  type: 'class' | 'individual';
  studentName?: string;
  studentData?: any;
  classData?: any;
  onAppreciationGenerated?: (appreciation: string) => void;
}

const AppreciationGenerator: React.FC<AppreciationGeneratorProps> = ({
  type,
  studentName,
  studentData,
  classData,
  onAppreciationGenerated
}) => {
  const [tone, setTone] = useState('balanced');
  const [length, setLength] = useState([2]); // 1-3 scale for short to long
  const [isGenerating, setIsGenerating] = useState(false);
  const [appreciation, setAppreciation] = useState('');
  const [progressValue, setProgressValue] = useState('0');
  const [copied, setCopied] = useState(false);
  
  // Reset progress when starting generation
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgressValue(prev => {
          const newValue = Number(prev) + Math.random() * 10;
          if (Number(progressValue) > 100) {
            clearInterval(interval);
            return '100';
          }
          return newValue.toString();
        });
      }, 300);
      
      return () => clearInterval(interval);
    }
  }, [isGenerating, progressValue]);
  
  const generateAppreciation = async () => {
    setIsGenerating(true);
    setProgressValue('0');
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Generate different sample text based on type and tone
      let result = '';
      
      if (type === 'class') {
        if (tone === 'strict') {
          result = "La classe présente des résultats très hétérogènes ce trimestre. Un groupe d'élèves sérieux et impliqués obtient d'excellents résultats, mais une part importante de la classe montre un manque de travail et de concentration préoccupant. L'ambiance de travail est souvent perturbée par des bavardages et un manque d'attention. Un effort collectif est absolument nécessaire pour progresser.";
        } else if (tone === 'balanced') {
          result = "Classe de niveau satisfaisant dans l'ensemble, avec une bonne participation en cours. Les résultats sont assez homogènes, bien qu'un petit groupe d'élèves rencontre encore des difficultés. L'ambiance de travail est généralement positive, mais pourrait être améliorée en limitant les bavardages occasionnels. La classe montre un potentiel certain qui pourrait être davantage exploité avec plus de régularité dans le travail personnel.";
        } else {
          result = "Classe dynamique et agréable, avec une excellente participation et un réel enthousiasme pour les apprentissages. Les résultats sont globalement très bons, témoignant d'un investissement sérieux. L'entraide entre élèves est remarquable et contribue à une ambiance de travail particulièrement favorable. Les quelques élèves en difficulté font preuve de persévérance et progressent régulièrement grâce à leurs efforts.";
        }
      } else {
        // Individual appreciation
        if (tone === 'strict') {
          result = `${studentName} obtient des résultats insuffisants ce trimestre. Un manque évident de travail personnel et d'implication en classe explique ces difficultés. L'attention en cours est trop souvent défaillante et les devoirs rendus manquent de rigueur. Un changement radical d'attitude face au travail est indispensable pour progresser et atteindre le niveau attendu.`;
        } else if (tone === 'balanced') {
          result = `${studentName} présente un bilan trimestriel satisfaisant. Les résultats sont corrects, reflétant un travail régulier, bien que des progrès soient encore possibles dans certaines matières. La participation en classe est positive mais pourrait être plus fréquente. Avec un peu plus d'approfondissement dans le travail personnel, les capacités réelles de l'élève pourraient s'exprimer pleinement.`;
        } else {
          result = `${studentName} réalise un excellent trimestre, avec des résultats très satisfaisants dans l'ensemble des matières. Son implication constante en classe et son travail personnel sérieux et approfondi sont remarquables. Sa curiosité intellectuelle et sa participation pertinente enrichissent les cours. Félicitations pour cette attitude exemplaire qui témoigne d'une belle maturité.`;
        }
      }
      
      // Adjust length
      if (length[0] === 1) {
        // Shorter version - roughly half the length
        result = result.split('. ').slice(0, 2).join('. ') + '.';
      } else if (length[0] === 3) {
        // Longer version - add more content
        if (type === 'class') {
          result += " Les compétences transversales sont bien développées, notamment l'esprit critique et la capacité à travailler en équipe. La classe a montré un intérêt particulier pour les projets interdisciplinaires, ce qui est très encourageant pour la suite de l'année. Il serait bénéfique de maintenir cette dynamique positive tout en renforçant l'autonomie dans le travail personnel.";
        } else {
          result += ` ${studentName} fait preuve d'une bonne autonomie et développe progressivement des méthodes de travail efficaces. Les compétences transversales sont bien maîtrisées, particulièrement l'expression écrite et orale. La poursuite de ces efforts permettra certainement d'atteindre l'excellence dans toutes les matières.`;
        }
      }
      
      setAppreciation(result);
      if (onAppreciationGenerated) {
        onAppreciationGenerated(result);
      }
    } catch (error) {
      console.error('Error generating appreciation:', error);
    } finally {
      setIsGenerating(false);
      setProgressValue('100');
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(appreciation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {type === 'class' ? 'Appréciation générale de classe' : `Appréciation pour ${studentName}`}
            </h3>
            <p className="text-sm text-muted-foreground">
              Générez une appréciation {type === 'class' ? 'pour l\'ensemble de la classe' : 'personnalisée'} en ajustant les paramètres ci-dessous.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ton de l'appréciation</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un ton" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strict">Exigeant</SelectItem>
                  <SelectItem value="balanced">Équilibré</SelectItem>
                  <SelectItem value="encouraging">Très bienveillant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Longueur</label>
                <span className="text-xs text-muted-foreground">
                  {length[0] === 1 ? 'Courte' : length[0] === 2 ? 'Moyenne' : 'Détaillée'}
                </span>
              </div>
              <Slider
                value={length}
                min={1}
                max={3}
                step={1}
                onValueChange={setLength}
              />
            </div>
            
            <Button 
              onClick={generateAppreciation} 
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Générer l'appréciation
                </>
              )}
            </Button>
          </div>
          
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Analyse des données</span>
                <span>{Math.min(100, Math.round(Number(progressValue)))}%</span>
              </div>
              <Progress value={Number(progressValue)} className="h-2" />
            </div>
          )}
          
          {appreciation && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Résultat</h4>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="h-8"
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-3 w-3" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-3 w-3" />
                      Copier
                    </>
                  )}
                </Button>
              </div>
              
              <div className={cn(
                "p-3 rounded-md bg-muted text-sm transition-opacity",
                isGenerating && "opacity-50"
              )}>
                {appreciation}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppreciationGenerator;
