
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpenAIService } from '@/utils/openai-service';
import { toast } from 'sonner';
import FileUploader from './FileUploader';
import ToneSelector from './appreciation/ToneSelector';
import LengthSelector from './appreciation/LengthSelector';
import AppreciationResult from './appreciation/AppreciationResult';

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
    // Générer l'appréciation si on a des données d'analyse
    if (analysisData && !appreciation) {
      generateAppreciation();
    }
  }, [analysisData]);
  
  // Ne pas générer automatiquement lors du téléchargement de fichiers
  // pour éviter les erreurs de timeout
  const handleFileUpload = (files: File[]) => {
    setClassReportFiles(files);
    toast.success(`${files.length} fichier(s) ajouté(s). Cliquez sur "Générer l'appréciation" pour continuer.`);
  };
  
  const generateAppreciation = async () => {
    // Si on n'a pas de données d'analyse mais des fichiers, on utilise les fichiers directement
    if (!analysisData && classReportFiles.length === 0) {
      toast.error("Aucune donnée d'analyse disponible. Veuillez d'abord importer des fichiers.");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let result = '';
      
      // Utiliser les données d'analyse si disponibles, sinon utiliser les fichiers directement
      const dataToUse = type === 'individual' && student 
        ? { student, classData: analysisData }
        : analysisData || { files: classReportFiles.map(f => f.name) };
      
      if (type === 'individual' && student) {
        result = await OpenAIService.generateStudentAppreciation(
          student.name,
          dataToUse,
          tone,
          length[0]
        );
      } else {
        // Générer une appréciation même avec des données minimales
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
      
      // Générer une appréciation de secours en cas d'erreur
      const fallbackAppreciation = `Classe dynamique qui a fait preuve d'implication tout au long du ${type === 'individual' ? 'trimestre' : 'trimestre'}. 
      Les résultats sont globalement satisfaisants avec quelques élèves en difficulté qui nécessitent un suivi particulier. 
      La moyenne de classe est correcte, mais pourrait être améliorée avec plus de rigueur dans le travail personnel. 
      Je vous encourage à maintenir vos efforts et à continuer sur cette lancée pour la suite de l'année.`;
      
      setAppreciation(fallbackAppreciation);
      if (onAppreciationGenerated) {
        onAppreciationGenerated(fallbackAppreciation);
      }
      
      toast.info('Une appréciation standard a été générée à la place');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(appreciation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

          <ToneSelector tone={tone} onToneChange={setTone} />
          <LengthSelector length={length} maxChars={maxChars} onLengthChange={setLength} />

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
            <AppreciationResult 
              appreciation={appreciation}
              onRegenerate={generateAppreciation}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppreciationGenerator;
