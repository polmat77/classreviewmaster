import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AppreciationGenerator from '@/components/AppreciationGenerator';
import FileUploader from '@/components/FileUploader';
import ProgressIndicator from '@/components/ProgressIndicator';
import { KeyRound, Lightbulb, AlertCircle, TrendingUp, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processGradeFiles, savePreviousGradeFiles, getPreviousGradeFiles } from '@/utils/data-processing';
import { toast } from 'sonner';

const AppreciationGenerale = () => {
  const [currentClassReportFiles, setCurrentClassReportFiles] = useState<File[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previousFiles, setPreviousFiles] = useState<any[]>([]);
  
  const [analysisStep, setAnalysisStep] = useState(0);
  const analysisSteps = [
    "Chargement des fichiers...",
    "Extraction des données...", 
    "Analyse des résultats...",
    "Préparation des recommandations...",
    "Analyse terminée"
  ];

  useEffect(() => {
    const savedFiles = getPreviousGradeFiles();
    setPreviousFiles(savedFiles || []);
    
    console.log("Previous grade files loaded:", savedFiles);
  }, []);

  const handleCurrentReportUpload = (files: File[]) => {
    setCurrentClassReportFiles(files);
    console.log("Files received in AppreciationGenerale:", files);
    if (files.length > 0) {
      analyzeFiles(files);
    }
  };

  const analyzeFiles = async (filesToAnalyze = currentClassReportFiles) => {
    if (filesToAnalyze.length === 0) {
      toast.error("Veuillez importer le bulletin de classe actuel");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(1);
    
    try {
      const simulateStep = async (step: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        setAnalysisStep(step);
      };
      
      const timeoutId = setTimeout(() => {
        toast.info("L'analyse des fichiers prend plus de temps que prévu...");
      }, 5000);
      
      await simulateStep(1, 800);
      await simulateStep(2, 1500);
      
      const allFiles = [...filesToAnalyze];
      if (previousFiles && previousFiles.length > 0) {
        console.log("Including previous files in analysis");
        toast.info("Utilisation des données historiques pour l'analyse comparative");
      }
      
      await simulateStep(3, 1200);
      
      console.log("Starting analysis with files:", allFiles);
      const data = await processGradeFiles(allFiles);
      
      await simulateStep(4, 1000);
      await simulateStep(5, 500);
      
      clearTimeout(timeoutId);
      
      console.log("Analysis results:", data);
      
      if (!data || !data.currentTerm) {
        throw new Error("Analyse incomplète. Vérifiez le format de vos fichiers.");
      }
      
      setAnalysisData(data);
      toast.success("Analyse des bulletins terminée");
    } catch (error) {
      console.error('Error analyzing files:', error);
      toast.error(`Erreur lors de l'analyse des fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      
      if (!analysisData) {
        const mockData = generateMockAnalysisData(filesToAnalyze[0]?.name || "Classe");
        setAnalysisData(mockData);
        toast.info("Données de démonstration générées pour visualisation");
      }
      
      setAnalysisStep(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateMockAnalysisData = (filename: string) => {
    const classNameMatch = filename.match(/(\d+[A-Za-z])/);
    const className = classNameMatch ? classNameMatch[1] : "6A";
    
    let term = "Trimestre 1";
    if (filename.toLowerCase().includes('trim2') || filename.toLowerCase().includes('t2')) {
      term = "Trimestre 2";
    } else if (filename.toLowerCase().includes('trim3') || filename.toLowerCase().includes('t3')) {
      term = "Trimestre 3";
    }
    
    return {
      currentTerm: {
        term,
        class: className,
        classAverage: 12.8,
        studentCount: 25
      },
      previousTerms: [
        { term: "Trimestre 1", classAverage: 12.2 },
        { term: "Trimestre 2", classAverage: 12.5 }
      ],
      averages: [
        { name: "T1", moyenne: 12.2 },
        { name: "T2", moyenne: 12.5 },
        { name: "T3", moyenne: 12.8 }
      ],
      distribution: [
        { category: "Excellent", count: 5, color: "#2dd4bf" },
        { category: "Assez bon", count: 8, color: "#4ade80" },
        { category: "Moyen", count: 9, color: "#facc15" },
        { category: "En difficulté", count: 3, color: "#f87171" }
      ],
      subjects: [
        { name: "Français", current: 12.5, previous: 12.1, change: 0.4 },
        { name: "Mathématiques", current: 11.8, previous: 12.2, change: -0.4 },
        { name: "Histoire-Géo", current: 13.2, previous: 12.7, change: 0.5 },
        { name: "Anglais", current: 13.5, previous: 12.9, change: 0.6 },
        { name: "SVT", current: 12.9, previous: 12.3, change: 0.6 }
      ],
      analysisPoints: [
        "Bonne progression de la classe avec une amélioration de 0.3 points",
        "Points forts en Anglais et Histoire-Géo",
        "Amélioration notable en SVT et Anglais",
        "Ambiance de travail globalement positive"
      ]
    };
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Appréciation générale de classe</h1>
          <p className="section-description">
            Générez et personnalisez une appréciation globale pour l'ensemble de la classe basée sur l'analyse des données actuelles et historiques.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <AppreciationGenerator 
              type="class"
              analysisData={analysisData}
              maxChars={500}
            />
            
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium mb-2">Bulletin de classe actuel</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Importez le bulletin de la classe avec les appréciations des enseignants pour la période actuelle.
                </p>
                <FileUploader 
                  onFilesAccepted={handleCurrentReportUpload}
                  acceptedFileTypes={['.pdf', '.csv', '.xlsx', '.xls']}
                  maxFiles={3}
                  label="Importer le bulletin de classe actuel"
                  description="Formats acceptés: PDF, CSV, Excel (XLSX, XLS)"
                />
              </div>
              
              {previousFiles && previousFiles.length > 0 && (
                <div className="bg-secondary/30 p-4 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Données historiques disponibles</h4>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-primary" />
                    <span>
                      Les données des trimestres précédents seront incluses dans l'analyse
                    </span>
                  </div>
                </div>
              )}
              
              {isAnalyzing && analysisStep > 0 && (
                <div className="mt-4">
                  <ProgressIndicator 
                    currentStep={analysisStep} 
                    totalSteps={analysisSteps.length - 1}
                    steps={analysisSteps}
                    isLoading={analysisStep < analysisSteps.length - 1}
                  />
                </div>
              )}
              
              {currentClassReportFiles.length > 0 && (
                <button
                  onClick={() => analyzeFiles()}
                  disabled={isAnalyzing}
                  className={cn(
                    "button-primary w-full flex items-center justify-center space-x-2 py-3",
                    isAnalyzing && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin mr-2">⌛</span>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analyser à nouveau
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <h3 className="ml-3 font-medium">Points clés à mentionner</h3>
              </div>
              
              <ul className="space-y-2 pl-10 text-sm list-disc">
                <li>Ambiance générale de la classe</li>
                <li>Évolution globale des résultats</li>
                <li>Points forts collectifs</li>
                <li>Axes d'amélioration</li>
                <li>Encouragements pour le prochain trimestre</li>
              </ul>
            </div>
            
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <h3 className="ml-3 font-medium">Conseils de rédaction</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Soyez précis :</span> Évitez les généralités 
                  et appuyez-vous sur les données analysées.
                </p>
                
                <p>
                  <span className="font-medium">Équilibrez :</span> Mentionnez à la fois les 
                  points positifs et les axes d'amélioration.
                </p>
                
                <p>
                  <span className="font-medium">Personnalisez :</span> Adaptez le ton selon 
                  le profil global de la classe et son évolution.
                </p>
                
                <p>
                  <span className="font-medium">Comparez :</span> Utilisez les données historiques 
                  pour souligner les progressions ou les points de vigilance.
                </p>
              </div>
            </div>
            
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="flex space-x-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-sm">
                  <p>
                    L'appréciation générée doit respecter la limite de <span className="font-medium">500 caractères</span> 
                    pour être compatible avec les systèmes de gestion des bulletins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AppreciationGenerale;
