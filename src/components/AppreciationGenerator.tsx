
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
import { OpenAIService } from '@/utils/openai-service';
import { toast } from 'sonner';

interface AppreciationGeneratorProps {
  type: 'class' | 'individual';
  studentName?: string;
  studentData?: any;
  classData?: any;
  maxChars?: number;
  analysisData?: any;
  className?: string;
  onAppreciationGenerated?: (appreciation: string) => void;
}

const AppreciationGenerator: React.FC<AppreciationGeneratorProps> = ({
  type,
  studentName,
  studentData,
  classData,
  maxChars = 500, // Default to 500 characters
  analysisData,
  className,
  onAppreciationGenerated
}) => {
  const [tone, setTone] = useState('neutre');
  const [length, setLength] = useState([2]); // 1-3 scale for short to long
  const [isGenerating, setIsGenerating] = useState(false);
  const [appreciation, setAppreciation] = useState('');
  const [progressValue, setProgressValue] = useState('0');
  const [copied, setCopied] = useState(false);
  const [isApiAvailable, setIsApiAvailable] = useState(false);
  
  // Check if API is available on component mount
  useEffect(() => {
    setIsApiAvailable(OpenAIService.isApiAvailable());
    
    if (!OpenAIService.isApiAvailable()) {
      toast.error("L'API n'est pas configurée par l'administrateur", {
        duration: 5000,
      });
    }
  }, []);
  
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
    if (!isApiAvailable) {
      toast.error("L'API n'est pas configurée par l'administrateur");
      return;
    }

    // Check if we have analysis data
    if (!analysisData && !classData) {
      toast.error("Aucune donnée d'analyse disponible. Veuillez d'abord importer et analyser des fichiers.");
      return;
    }
    
    setIsGenerating(true);
    setProgressValue('0');
    
    try {
      let result = '';
      
      if (type === 'class') {
        // Use actual analysis data with a preference for analysisData over classData
        const dataToUse = analysisData || classData;
        console.log("Using class data for OpenAI:", dataToUse);
        
        result = await OpenAIService.generateClassAppreciation(
          dataToUse,
          tone,
          length[0]
        );
      } else {
        // Generate individual appreciation using OpenAI
        if (!studentName || !studentData) {
          throw new Error('Données élève manquantes');
        }
        
        console.log("Using student data for OpenAI:", { studentName, studentData });
        result = await OpenAIService.generateStudentAppreciation(
          studentName,
          studentData,
          tone,
          length[0]
        );
      }
      
      // No longer truncating the text with "..." regardless of length
      setAppreciation(result);
      if (onAppreciationGenerated) {
        onAppreciationGenerated(result);
      }
      
      toast.success('Appréciation générée avec succès');
    } catch (error) {
      console.error('Error generating appreciation:', error);
      toast.error('Erreur lors de la génération de l\'appréciation');
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
    <Card className={cn("w-full", className)}>
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
              <div className="pt-2">
                <div className="flex justify-between mb-2">
                  <span className="text-xs">Très sévère</span>
                  <span className="text-xs">Exigeant</span>
                  <span className="text-xs">Neutre</span>
                  <span className="text-xs">Bienveillant</span>
                  <span className="text-xs">Dithyrambique</span>
                </div>
                <Slider
                  value={[
                    tone === 'tres-severe' ? 1 : 
                    tone === 'exigeant' ? 2 : 
                    tone === 'neutre' ? 3 : 
                    tone === 'bienveillant' ? 4 : 5
                  ]}
                  min={1}
                  max={5}
                  step={1}
                  onValueChange={(value) => {
                    const toneMap: Record<number, string> = {
                      1: 'tres-severe',
                      2: 'exigeant',
                      3: 'neutre',
                      4: 'bienveillant',
                      5: 'dithyrambique'
                    };
                    setTone(toneMap[value[0]]);
                  }}
                />
              </div>
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
              disabled={isGenerating || !isApiAvailable}
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
                <div className="flex items-center gap-4">
                  <div className="text-xs text-muted-foreground">
                    <span className={cn(
                      "font-semibold",
                      maxChars && appreciation.length > maxChars * 0.8 ? "text-amber-500" : "",
                      maxChars && appreciation.length >= maxChars ? "text-red-500" : ""
                    )}>
                      {appreciation.length}
                    </span>
                    {maxChars && <span>/{maxChars} caractères</span>}
                  </div>
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
              </div>
              
              <div className={cn(
                "p-4 rounded-md bg-muted text-sm transition-opacity whitespace-pre-wrap",
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
