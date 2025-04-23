
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, Copy, Save, Frown, Meh, Smile } from 'lucide-react';
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
  maxChars = 500,
  analysisData,
  className,
  onAppreciationGenerated
}) => {
  const [tone, setTone] = useState('neutre');
  const [length, setLength] = useState([250]); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [appreciation, setAppreciation] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Générer automatiquement l'appréciation au chargement du composant
  useEffect(() => {
    if ((analysisData || studentData || classData) && !appreciation) {
      generateAppreciation();
    }
  }, [analysisData, studentData, classData]);
  
  const generateAppreciation = async () => {
    // Check if we have analysis data
    if (!analysisData && !studentData && !classData) {
      toast.error("Aucune donnée d'analyse disponible. Veuillez d'abord importer et analyser des fichiers.");
      return;
    }
    
    setIsGenerating(true);
    
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
        if (!studentName) {
          throw new Error('Données élève manquantes');
        }
        
        // Use analysis data if available, otherwise use the mock student data
        const dataForGeneration = analysisData ? 
          { ...studentData, analysisData } : 
          studentData;
        
        console.log("Using student data for OpenAI:", { studentName, data: dataForGeneration });
        result = await OpenAIService.generateStudentAppreciation(
          studentName,
          dataForGeneration,
          tone,
          length[0]
        );
      }
      
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
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(appreciation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Custom icons based on tone
  const getToneIcon = (toneValue: string) => {
    switch(toneValue) {
      case 'exigeant': return <Frown className="h-5 w-5" />;
      case 'neutre': return <Meh className="h-5 w-5" />;
      case 'dithyrambique': return <Smile className="h-5 w-5" />;
      default: return <Meh className="h-5 w-5" />;
    }
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardContent className="pt-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-6">Générateur d'appréciations</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-xl mb-4">Sélectionnez un élève ou la classe entière</h2>
              <Select
                value={studentName}
                onValueChange={(value) => {
                  // Cette fonction sera gérée par le composant parent
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un élève" />
                </SelectTrigger>
                <SelectContent>
                  {/* Les élèves seront injectés par le composant parent */}
                  <SelectItem value="class">Classe entière</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl">Ton de l'appréciation:</h2>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  variant={tone === "exigeant" ? "default" : "outline"}
                  size="lg"
                  className="flex flex-col h-auto py-4 px-6 transition-all"
                  onClick={() => setTone("exigeant")}
                >
                  <Frown className={cn(
                    "h-8 w-8 mb-2 transition-colors",
                    tone === "exigeant" ? "text-white" : "text-muted-foreground"
                  )} />
                  <span>Exigeant</span>
                </Button>
                
                <Button 
                  variant={tone === "neutre" ? "default" : "outline"}
                  size="lg"
                  className="flex flex-col h-auto py-4 px-6 transition-all"
                  onClick={() => setTone("neutre")}
                >
                  <Meh className={cn(
                    "h-8 w-8 mb-2 transition-colors",
                    tone === "neutre" ? "text-white" : "text-muted-foreground"
                  )} />
                  <span>Neutre</span>
                </Button>
                
                <Button 
                  variant={tone === "dithyrambique" ? "default" : "outline"}
                  size="lg"
                  className="flex flex-col h-auto py-4 px-6 transition-all"
                  onClick={() => setTone("dithyrambique")}
                >
                  <Smile className={cn(
                    "h-8 w-8 mb-2 transition-colors",
                    tone === "dithyrambique" ? "text-white" : "text-muted-foreground"
                  )} />
                  <span>Dithyrambique</span>
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl">Longueur:</h2>
                <span className="text-sm text-muted-foreground">
                  {length[0]}/{maxChars} caractères
                </span>
              </div>
              <Slider
                value={length}
                max={maxChars}
                step={10}
                onValueChange={setLength}
                className="w-full"
              />
            </div>

            <Button 
              onClick={generateAppreciation}
              className="w-full h-14 text-lg"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                "Générer l'appréciation"
              )}
            </Button>

            {appreciation && (
              <div className="space-y-4">
                <h2 className="text-xl">Résultat:</h2>
                <div className="p-6 rounded-lg bg-white border min-h-[150px] text-lg">
                  {appreciation}
                </div>
                
                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={generateAppreciation}
                  >
                    <RefreshCw className="mr-2" />
                    Régénérer
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={copyToClipboard}
                  >
                    <Copy className="mr-2" />
                    Copier
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => toast.success("Appréciation sauvegardée")}
                  >
                    <Save className="mr-2" />
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppreciationGenerator;
