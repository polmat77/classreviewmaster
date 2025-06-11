
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import FileUploader from '@/components/FileUploader';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ProgressIndicator from '@/components/ProgressIndicator';
import N8NWebhookIntegration from '@/components/N8NWebhookIntegration';
import { ChevronRight, Info, FileSpreadsheet, Upload, Table, Calendar, GraduationCap, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { processGradeFiles, savePreviousGradeFiles, getPreviousGradeFiles } from '@/utils/data-processing';
import { sendToN8NWebhook, convertN8NResponseToAnalysisData } from '@/utils/n8n-service';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import AnalysisUploader from '@/components/AnalysisUploader';

const Index = () => {
  const [hasUploaded, setHasUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  const [currentGradeFiles, setCurrentGradeFiles] = useState<File[]>([]);
  const [previousGradeFiles, setPreviousGradeFiles] = useState<File[]>([]);
  const [savedPreviousFiles, setSavedPreviousFiles] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState<string>('https://polmat.app.n8n.cloud/webhook-test/upload-notes');
  const [useN8N, setUseN8N] = useState(true); // Auto-enable N8N
  
  const analysisSteps = [
    "Chargement des fichiers...",
    "Extraction des données...",
    "Analyse des résultats...",
    "Génération des visualisations...",
    "Analyse terminée"
  ];

  useEffect(() => {
    const files = getPreviousGradeFiles();
    setSavedPreviousFiles(files || []);
    
    console.log("Saved previous files on init:", files);
  }, []);
  
  const handleCurrentFilesAccepted = (files: File[]) => {
    console.log("Current files accepted:", files);
    setCurrentGradeFiles(files);
    setShowResults(false);
    
    const savedFiles = getPreviousGradeFiles();
    
    if ((savedFiles && savedFiles.length > 0) || previousGradeFiles.length > 0) {
      // We don't immediately process files anymore - wait for button click
      // processFiles(files, previousGradeFiles.length > 0 ? previousGradeFiles : []);
    }
  };
  
  const handlePreviousFilesAccepted = (files: File[]) => {
    console.log("Previous files accepted:", files);
    setPreviousGradeFiles(files);
    setShowResults(false);
    
    if (savePreviousGradeFiles(files)) {
      toast.success("Tableau des notes précédent enregistré");
      setSavedPreviousFiles(getPreviousGradeFiles());
    }
  };

  const handleWebhookConfigured = (url: string) => {
    setWebhookUrl(url);
    setUseN8N(!!url);
  };
  
  const handleAnalyzeButtonClick = async () => {
    if (currentGradeFiles.length === 0) {
      toast.error("Veuillez importer au moins un fichier de notes actuel");
      return;
    }
    
    const previousFiles = previousGradeFiles.length > 0 ? 
      previousGradeFiles : 
      (savedPreviousFiles && savedPreviousFiles.length > 0 ? savedPreviousFiles : []);
    
    if (useN8N && webhookUrl) {
      // Use N8N analysis
      await processFilesWithN8N([...currentGradeFiles, ...previousFiles]);
    } else {
      // Use local analysis
      await processFiles(currentGradeFiles, previousFiles);
    }
  };

  const processFilesWithN8N = async (allFiles: File[]) => {
    setIsLoading(true);
    setShowResults(false);
    setAnalysisStep(1);
    
    try {
      console.log("Utilisation de l'analyse N8N...");
      
      // Simuler les étapes de progression
      const simulateStep = async (step: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        setAnalysisStep(step);
      };
      
      await simulateStep(1, 800);  // Chargement des fichiers
      await simulateStep(2, 1000); // Extraction des données
      
      const n8nResponse = await sendToN8NWebhook(webhookUrl, allFiles);
      
      await simulateStep(3, 1200); // Analyse des résultats
      
      if (n8nResponse.success) {
        const data = convertN8NResponseToAnalysisData(n8nResponse);
        await simulateStep(4, 1000); // Génération des visualisations
        await simulateStep(5, 500);  // Analyse terminée
        
        setProcessedData(data);
        setHasUploaded(true);
        setShowResults(true);
        toast.success("Analyse N8N terminée avec succès");
      } else {
        throw new Error(n8nResponse.error || 'Erreur lors de l\'analyse N8N');
      }
    } catch (error) {
      console.error("Erreur lors de l'analyse N8N:", error);
      toast.error("Erreur lors de l'analyse N8N. Basculement vers l'analyse locale...");
      
      // Fallback to local analysis
      await processFiles(currentGradeFiles, previousGradeFiles);
    } finally {
      setIsLoading(false);
    }
  };
  
  const processFiles = async (current: File[], previous: File[]) => {
    if (current.length === 0 && previous.length === 0) {
      toast.error("Aucun fichier à traiter");
      return;
    }

    setIsLoading(true);
    setShowResults(false);
    setAnalysisStep(1); // Démarrer la progression
    console.log("Processing files - Current:", current, "Previous:", previous);
    
    try {
      // Simuler les différentes étapes du processus
      const simulateStep = async (step: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        setAnalysisStep(step);
      };
      
      await simulateStep(1, 800);  // Chargement des fichiers
      
      // Set a timeout to prevent UI from appearing stuck
      const timeoutId = setTimeout(() => {
        toast.info("L'analyse des fichiers prend plus de temps que prévu...");
      }, 5000);
      
      await simulateStep(2, 1500); // Extraction des données
      
      const data = await processGradeFiles([...current, ...previous]);
      
      await simulateStep(3, 1200); // Analyse des résultats
      await simulateStep(4, 1000); // Génération des visualisations
      await simulateStep(5, 500);  // Analyse terminée
      
      clearTimeout(timeoutId);
      
      console.log("Processed data:", data);
      
      if (!data || !data.currentTerm) {
        throw new Error("Le traitement des fichiers n'a pas produit de données complètes");
      }
      
      setProcessedData(data);
      setHasUploaded(true);
      setShowResults(true);
      toast.success("Analyse des fichiers terminée");
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error("Erreur lors du traitement des fichiers. Vérifiez le format de vos fichiers.");
      // Don't reset hasUploaded if we already have data
      if (!processedData) {
        setHasUploaded(false);
      }
      setShowResults(false);
      setAnalysisStep(0); // Réinitialiser en cas d'erreur
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Analyse des résultats</h1>
          <p className="section-description">
            Importez vos fichiers Excel, CSV ou PDF pour commencer l'analyse des résultats de classe.
          </p>
          
          <div className="mt-4">
            <Accordion type="single" collapsible className="w-full bg-secondary/20 rounded-lg">
              <AccordionItem value="pronote-export" className="border-none">
                <AccordionTrigger className="px-4 py-3 text-base font-medium">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span>Comment exporter mes données depuis PRONOTE ?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4 text-sm">
                    <h3 className="font-medium text-base">🎓 Exporter un tableau de notes PDF pour une classe (par trimestre)</h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">1️⃣ Je vérifie que mes notes sont bien saisies</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Je vais dans Notes &gt; Saisie des notes.</li>
                          <li>Je choisis la période (ex. Trimestre 1).</li>
                          <li>Je contrôle que toutes les notes sont bien entrées, que les coefficients sont bons, et que les moyennes sont calculées.</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">2️⃣ Je prépare le relevé à imprimer</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Je vais dans Notes &gt; Relevé de notes &gt; Consultation et saisie des appréciations.</li>
                          <li>Je sélectionne ma classe, puis en haut à droite, je clique sur l'icône de maquette 🧾 (ou clic droit dans la colonne "Relevé").</li>
                          <li>Je choisis une maquette déjà prête (souvent définie par l'établissement), ou j'en choisis une qui me convient (affichage des moyennes, appréciations, rang…).</li>
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <h4 className="font-medium">3️⃣ Je lance l'édition PDF</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                          <li>Toujours dans Relevé de notes, je clique sur Impression.</li>
                          <li>Dans la fenêtre qui s'ouvre :</li>
                          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>Je coche la classe entière ou les élèves souhaités.</li>
                            <li>En sortie, je sélectionne PDF.</li>
                            <li>Je peux ajuster la mise en page dans les onglets (Présentation, Police, etc.).</li>
                          </ul>
                          <li>Puis je clique sur Imprimer → un seul fichier PDF est généré avec tous les relevés.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
        
        <N8NWebhookIntegration
          onWebhookConfigured={handleWebhookConfigured}
          isConfigured={useN8N}
          currentWebhookUrl={webhookUrl}
        />
        
        <div className="glass-panel p-5 space-y-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-medium">Fichiers de notes</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Trimestre actuel</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Importez les notes du trimestre en cours pour analyse
              </p>
              <FileUploader 
                onFilesAccepted={handleCurrentFilesAccepted}
                acceptedFileTypes={['.csv', '.xlsx', '.xls', '.pdf']}
                maxFiles={3}
                label="Importer les notes du trimestre actuel"
                description="Glissez-déposez vos fichiers Excel/CSV/PDF depuis PRONOTE"
              />
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Table className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Trimestres précédents (optionnel)</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Importez les notes des trimestres précédents pour une analyse comparative
              </p>
              <FileUploader 
                onFilesAccepted={handlePreviousFilesAccepted}
                acceptedFileTypes={['.csv', '.xlsx', '.xls', '.pdf']}
                maxFiles={3}
                label="Importer les notes des trimestres précédents"
                description="Fichiers Excel, CSV ou PDF des périodes antérieures"
              />
            </div>
          </div>
          
          {isLoading && analysisStep > 0 && (
            <div className="mt-4">
              <ProgressIndicator 
                currentStep={analysisStep} 
                totalSteps={analysisSteps.length - 1}
                steps={analysisSteps}
                isLoading={analysisStep < analysisSteps.length - 1}
              />
            </div>
          )}
          
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleAnalyzeButtonClick} 
              className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
              size="lg"
              disabled={isLoading || currentGradeFiles.length === 0}
            >
              <BarChart2 className="mr-2 h-5 w-5" />
              {isLoading ? (
                useN8N ? 'Analyse N8N en cours...' : 'Analyse en cours...'
              ) : (
                useN8N ? 'Analyser avec N8N' : 'Analyser les données'
              )}
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {isLoading && (
              <div className="glass-panel p-5 flex flex-col items-center justify-center py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <h3 className="text-lg font-medium mb-2">Traitement en cours...</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Nous analysons vos fichiers. Veuillez patienter un instant.
                </p>
              </div>
            )}
            
            {!isLoading && currentGradeFiles.length === 0 && !hasUploaded && (
              <div className="glass-panel p-5 flex flex-col items-center justify-center py-12 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucun fichier importé</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Importez vos fichiers de notes en utilisant le formulaire ci-dessus pour commencer l'analyse.
                </p>
              </div>
            )}
            
            {!isLoading && (currentGradeFiles.length > 0 || hasUploaded) && !showResults && (
              <div className="glass-panel p-5 flex flex-col items-center justify-center py-12 text-center">
                <BarChart2 className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-lg font-medium mb-2">Prêt pour l'analyse</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Cliquez sur le bouton "Analyser les données" pour visualiser les résultats.
                </p>
              </div>
            )}
            
            {!isLoading && showResults && processedData && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium">Analyse préliminaire</h2>
                <AnalyticsDashboard data={processedData} />
              </div>
            )}
          </div>
          
          <div className="glass-panel p-5 space-y-4">
            <h3 className="font-medium">Guide d'importation</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Fichiers acceptés</h4>
                  <p className="text-xs text-muted-foreground">
                    Format Excel (.xlsx, .xls), CSV (.csv) ou PDF (.pdf) exportés depuis PRONOTE
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Données requises</h4>
                  <p className="text-xs text-muted-foreground">
                    Les fichiers doivent contenir au minimum les noms et moyennes des élèves.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Confidentialité</h4>
                  <p className="text-xs text-muted-foreground">
                    Vos données restent sur votre appareil et ne sont jamais stockées sur nos serveurs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {hasUploaded && processedData && showResults && (
          <div className="flex justify-end">
            <Link 
              to="/appreciation-generale" 
              className="button-primary flex items-center space-x-2"
            >
              <span>Continuer vers l'appréciation générale</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
