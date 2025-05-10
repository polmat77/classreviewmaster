import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OpenAIService } from '@/utils/openai-service';
import { toast } from 'sonner';
import FileUploader from './FileUploader';
import ToneSelector from './appreciation/ToneSelector';
import LengthSelector from './appreciation/LengthSelector';
import AppreciationResult from './appreciation/AppreciationResult';
import { extractTextFromPDF } from '@/utils/pdf-service';
import { parseClassBulletins } from '@/utils/pdf-processing';

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

const toneMap: Record<string, string> = {
  neutre: 'neutre',
  // Add other tone mappings as needed
};

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
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  useEffect(() => {
    // Générer l'appréciation si on a des données d'analyse
    if (analysisData && !appreciation) {
      generateAppreciation();
    }
  }, [analysisData]);
  
  const handleFileUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    
    setClassReportFiles(files);
    setIsExtracting(true);
    setExtractionProgress(0);
    setExtractionError(null);
    
    try {
      // Pour chaque fichier PDF, on extrait le texte et on analyse les bulletins
      for (const file of files) {
        if (file.name.toLowerCase().endsWith('.pdf')) {
          // Optimisation: créer un ArrayBuffer une seule fois pour tous les usages
          const arrayBuffer = await file.arrayBuffer();
          
          // 1. Extraction du texte brut pour avoir une version textuelle
          setExtractionProgress(10);
          toast.info(`Extraction du texte de ${file.name} en cours...`);
          
          try {
            // Premier essai: extraction des bulletins structurés
            const bulletinResult = await parseClassBulletins(
              arrayBuffer,
              (progress) => {
                setExtractionProgress(Math.min(progress, 90));
              }
            );
            
            // Afficher un message si des bulletins ont été trouvés
            if (bulletinResult.students.length > 0) {
              toast.success(`${bulletinResult.students.length} bulletins d'élèves extraits avec succès`);
              
              // Stocker les données extraites dans le format attendu par le générateur
              const processedData = {
                className: bulletinResult.students[0]?.class || "Classe inconnue",
                term: "Trimestre",  // À détecter dans le fichier
                students: bulletinResult.students.map(student => ({
                  name: student.name,
                  subjects: student.subjects.map(subj => ({
                    name: subj.subject,
                    grade: subj.average || 0,
                    comment: subj.remark || '',
                    teacher: subj.teacher || ""
                  })),
                  average: student.subjects.reduce(
                    (sum, subj) => sum + (subj.average || 0), 0
                  ) / student.subjects.filter(s => s.average !== null).length
                })),
                classSummary: bulletinResult.classSummary || ''
              };
              
              // Utiliser ces données pour l'analyse
              setAppreciation(''); // Réinitialiser pour forcer une nouvelle génération
              generateAppreciation(processedData);
            } else {
              // Si pas de bulletins trouvés, extraction en texte brut
              toast.warning(`Structure de bulletin non reconnue dans ${file.name}, utilisation du texte brut à la place`);
              const pdfText = await extractTextFromPDF(file, progress => {
                setExtractionProgress(progress);
              });
              setExtractedText(pdfText || '');
            }
          } catch (err) {
            console.error("Erreur lors de l'analyse des bulletins:", err);
            toast.error(`Erreur lors de l'analyse structurée. Tentative d'extraction en texte brut.`);
            
            // Fallback: extraction simple en texte
            try {
              const pdfText = await extractTextFromPDF(file, progress => {
                setExtractionProgress(progress);
              });
              if (pdfText) {
                setExtractedText(pdfText);
                
                // Auto-détection de certains éléments basée sur le texte extrait
                const classMatch = pdfText.match(/Classe\s*:?\s*(\d+)/i);
                const trimestreMatch = pdfText.match(/Trimestre\s*(\d)/i);
                
                toast.info(`Texte extrait avec succès (${pdfText.length} caractères)`);
                toast.info(`Cliquez sur "Générer l'appréciation" pour continuer.`);
              }
            } catch (textError) {
              console.error("Erreur également avec l'extraction de texte:", textError);
              toast.error(`Impossible d'extraire le contenu du fichier ${file.name}`);
              setExtractionError(`Échec de l'extraction pour ${file.name}`);
            }
          }
        } else {
          toast.info(`Le fichier ${file.name} n'est pas un PDF. Essayez un autre format.`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement des fichiers:', error);
      setExtractionError(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      toast.error(`Une erreur s'est produite lors de l'extraction du texte`);
    } finally {
      setIsExtracting(false);
      setExtractionProgress(100);
    }
  };
  
  const generateAppreciation = async (customData?: any) => {
    // Si on n'a pas de données d'analyse mais des fichiers, on utilise les fichiers directement
    if (!analysisData && !customData && classReportFiles.length === 0 && !extractedText) {
      toast.error("Aucune donnée d'analyse disponible. Veuillez d'abord importer des fichiers.");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      let result = '';
      
      // Utiliser les données personnalisées ou d'analyse si disponibles, sinon utiliser le texte extrait
      const dataToUse = customData || 
        (type === 'individual' && student 
          ? { student, classData: analysisData }
          : analysisData || { extractedText });
      
      // Traitement spécial pour les bulletins de classe du Collège Romain Rolland
      const isRomainRolland = extractedText && extractedText.includes("COLLEGE ROMAIN ROLLAND") && 
        extractedText.includes("Appréciations générales de la classe");

      if (type === 'class' && extractedText && 
          (/appréciations.*générales/i.test(extractedText) || 
           (extractedText.match(/([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s&\.]+)\s+(?:M\.|Mme\.?|M)\s+([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s\-]+)\s+(\d+[,\.]\d+)?\s+([^A-ZÉÈÊÀÔÙÛÇ][^]*?)(?=(?:[A-ZÉèêàôùûç\s&\.]{5,}\s+(?:M\.|Mme\.?|M)\s+|$))/gi) || []).length > 0)) {
        console.log("Traitement spécial pour bulletin avec appréciations par matière");
        
        // Si nous avons une synthèse de classe déjà extraite, l'utiliser comme base
        const classSummary = dataToUse?.classSummary || '';
        if (classSummary.length > 100) {
          result = classSummary;
          
          // Si le résumé est déjà suffisamment long, on l'utilise directement
          if (result.length > 200) {
            toast.success('Appréciation extraite du bulletin avec succès');
            setAppreciation(result);
            if (onAppreciationGenerated) {
              onAppreciationGenerated(result);
            }
            return;
          }
        }
        
        // Extraction des appréciations par matière si disponibles
        const subjectRemarks = [];
        
        if (dataToUse?.students && dataToUse.students[0]?.subjects) {
          // Format venant de l'analyse de bulletins
          const subjects = dataToUse.students[0].subjects;
          for (const subject of subjects) {
            if (subject.remark && subject.remark.length > 10) {
              subjectRemarks.push(`${subject.subject}: ${subject.remark}`);
            }
          }
        } else if (extractedText) {
          // Extraction directe depuis le texte
          const subjectPattern = /([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s&\.]+)\s+(?:M\.|Mme\.?|M)\s+([A-ZÉÈÊÀÔÙÛÇa-zéèêàôùûç\s\-]+)\s+(\d+[,\.]\d+)?\s+([^A-ZÉÈÊÀÔÙÛÇ][^]*?)(?=(?:[A-ZÉÈÊÀÔÙÛÇ\s&\.]{5,}\s+(?:M\.|Mme\.?|M)\s+|$))/gi;
          
          let match;
          while ((match = subjectPattern.exec(extractedText)) !== null) {
            if (match[1] && match[4]) {
              const subjectName = match[1].trim();
              const appreciation = match[4].trim().replace(/\s+/g, ' ');
              
              if (!subjectName.includes('POLE') && !subjectName.includes('OPTIONS') && appreciation.length > 10) {
                subjectRemarks.push(`${subjectName}: ${appreciation}`);
              }
            }
          }
        }
        
        // Si nous avons des appréciations par matière, générer une synthèse
        if (subjectRemarks.length > 0) {
          const prompt = `
Vous êtes un professeur principal qui doit rédiger une appréciation générale de classe pour le conseil de classe.

Voici les appréciations des professeurs par matière:
${subjectRemarks.map(r => `- ${r}`).join("\n")}

Rédigez une appréciation synthétique cohérente pour cette classe (environ ${length[0]} mots) qui:
1. Résume les points forts et les difficultés mentionnés dans les appréciations
2. Conserve le ton général utilisé par les professeurs (${toneMap[tone]})
3. Propose des axes d'amélioration adaptés
4. Reste cohérent avec les commentaires des différentes matières

Appréciation générale:`;

          result = await OpenAIService.generateText(prompt);
        } else {
          // Si aucune appréciation spécifique n'a été trouvée, générer une appréciation générique
          result = await OpenAIService.generateClassAppreciation(
            dataToUse,
            tone,
            length[0]
          );
        }
      } else if (type === 'individual' && student) {
        result = await OpenAIService.generateStudentAppreciation(
          student.name,
          dataToUse,
          tone,
          length[0]
        );
      } else {
        // Si on a du texte extrait, l'inclure dans la demande
        if (extractedText && !customData) {
          result = await OpenAIService.generateClassAppreciation(
            { extractedText, files: classReportFiles.map(f => f.name) },
            tone,
            length[0]
          );
        } else {
          // Utiliser les données d'analyse ou personnalisées
          result = await OpenAIService.generateClassAppreciation(
            dataToUse,
            tone,
            length[0]
          );
        }
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
              
              {isExtracting && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Extraction en cours...</span>
                    <span className="text-sm font-medium">{extractionProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${extractionProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Patientez pendant l'analyse des bulletins...</p>
                </div>
              )}
              
              {extractionError && (
                <div className="mt-4 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 flex items-start">
                  <AlertTriangle className="h-5 w-5 mr-2 shrink-0 text-amber-500" />
                  <div>
                    <p className="font-medium">Problème lors de l'extraction</p>
                    <p className="text-sm">{extractionError}</p>
                    <p className="text-sm mt-1">
                      Essayez un PDF différent ou utilisez un format Excel/CSV à la place.
                    </p>
                  </div>
                </div>
              )}
              
              {extractedText && (
                <div className="mt-4">
                  <details className="border rounded-md p-3">
                    <summary className="font-medium cursor-pointer">
                      Texte extrait ({Math.min(extractedText.length, 1000)} caractères)
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded-md max-h-[200px] overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap">
                        {extractedText.substring(0, 1000)}
                        {extractedText.length > 1000 && '...'}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          <ToneSelector tone={tone} onToneChange={setTone} />
          <LengthSelector length={length} maxChars={maxChars} onLengthChange={setLength} />

          <Button 
            onClick={() => generateAppreciation()}
            className="w-full h-14 text-lg"
            disabled={isGenerating || (type === 'class' && classReportFiles.length === 0 && !analysisData && !extractedText) || (type === 'individual' && !student)}
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
              onRegenerate={() => generateAppreciation()}
              onCopy={copyToClipboard}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AppreciationGenerator;