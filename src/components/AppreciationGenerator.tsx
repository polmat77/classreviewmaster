import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Loader2, RefreshCw, Copy, Save, Frown, Meh, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpenAIService } from '@/utils/openai-service';
import { toast } from 'sonner';
import FileUploader from './FileUploader';

interface AppreciationGeneratorProps {
  type: 'class' | 'individual';
  maxChars?: number;
  analysisData?: any;
  className?: string;
  onAppreciationGenerated?: (appreciation: string) => void;
  student?: {
    name: string;
    average: number;
    subjects: Array<{
      name: string;
      grade: number;
      comment?: string;
      teacher?: string;
    }>;
  };
}

const AppreciationGenerator: React.FC<AppreciationGeneratorProps> = ({
  type,
  maxChars = 500,
  analysisData,
  className,
  onAppreciationGenerated,
  student
}) => {
  const [tone, setTone] = useState('neutre');
  const [length, setLength] = useState([250]); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [appreciation, setAppreciation] = useState('');
  const [copied, setCopied] = useState(false);
  const [classReportFiles, setClassReportFiles] = useState<File[]>([]);
  
  useEffect(() => {
    if ((analysisData || classReportFiles.length > 0) && !appreciation) {
      generateAppreciation();
    }
  }, [analysisData, classReportFiles]);
  
  const generateAppreciation = async () => {
    if (!analysisData && classReportFiles.length === 0) {
      toast.error("Aucune donnée d'analyse disponible. Veuillez d'abord importer des fichiers.");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let result = '';
      
      const dataToUse = type === 'individual' && student 
        ? { student, classData: analysisData }
        : analysisData || classReportFiles;

      console.log("Using data for OpenAI:", dataToUse);
      
      if (type === 'individual' && student) {
        result = await OpenAIService.generateIndividualAppreciation(
          dataToUse,
          tone,
          length[0]
        );
      } else {
        result = await OpenAIService.generateClassAppreciation(
          dataToUse,
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

  const handleFileUpload = (files: File[]) => {
    setClassReportFiles(files);
    // Optional: trigger file analysis here if needed
  };

  return (
    <Card className={cn("w-full max-w-2xl mx-auto", className)}>
      <CardContent className="pt-6 space-y-8">
        <div className="space-y-6">
          {type === 'class' && (
            <div>
              <h2 className="text-xl mb-4">Importer les bulletins de classe</h2>
              <FileUploader 
                onFilesAccepted={handleFileUpload}
                acceptedFileTypes={['.pdf', '.csv', '.xlsx', '.xls']}
                maxFiles={3}
                label="Importer les bulletins de classe"
                description="Formats acceptés: PDF, CSV, Excel (XLSX, XLS)"
              />
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl">Ton de l'appréciation :</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {['exigeant', 'neutre', 'dithyrambique'].map((toneOption) => (
                <Button 
                  key={toneOption}
                  variant={tone === toneOption ? "default" : "outline"}
                  size="icon"
                  className="h-16 w-16 rounded-full"
                  onClick={() => setTone(toneOption)}
                >
                  {toneOption === 'exigeant' && <Frown className="h-8 w-8" />}
                  {toneOption === 'neutre' && <Meh className="h-8 w-8" />}
                  {toneOption === 'dithyrambique' && <Smile className="h-8 w-8" />}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl">Longueur :</h2>
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
            disabled={isGenerating || (type === 'class' && classReportFiles.length === 0 && !analysisData) || (type === 'individual' && !student)}
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
              <h2 className="text-xl">Résultat :</h2>
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
      </CardContent>
    </Card>
  );
};

export default AppreciationGenerator;
