
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import FileUploader from '@/components/FileUploader';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { ChevronRight, Info, FileSpreadsheet, Upload, Table, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { processGradeFiles, savePreviousGradeFiles, getPreviousGradeFiles } from '@/utils/data-processing';
import { toast } from 'sonner';

const Index = () => {
  const [hasUploaded, setHasUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  const [currentGradeFiles, setCurrentGradeFiles] = useState<File[]>([]);
  const [previousGradeFiles, setPreviousGradeFiles] = useState<File[]>([]);
  const [savedPreviousFiles, setSavedPreviousFiles] = useState<any[]>([]);
  
  useEffect(() => {
    // Check if there are any previously uploaded files
    const files = getPreviousGradeFiles();
    setSavedPreviousFiles(files || []);
    
    console.log("Saved previous files on init:", files);
  }, []);
  
  const handleCurrentFilesAccepted = (files: File[]) => {
    console.log("Current files accepted:", files);
    setCurrentGradeFiles(files);
    
    // Get the latest saved previous files
    const savedFiles = getPreviousGradeFiles();
    
    // If we have previously saved files or just uploaded previous files, use them
    if ((savedFiles && savedFiles.length > 0) || previousGradeFiles.length > 0) {
      processFiles(files, previousGradeFiles.length > 0 ? previousGradeFiles : []);
    } else {
      // Process just the current files if no previous files are available
      processFiles(files, []);
    }
  };
  
  const handlePreviousFilesAccepted = (files: File[]) => {
    console.log("Previous files accepted:", files);
    setPreviousGradeFiles(files);
    
    if (savePreviousGradeFiles(files)) {
      toast.success("Tableau des notes précédent enregistré");
      setSavedPreviousFiles(getPreviousGradeFiles());
      
      // If we already have current files, automatically process both
      if (currentGradeFiles.length > 0) {
        processFiles(currentGradeFiles, files);
      }
    }
  };
  
  const processFiles = async (current: File[], previous: File[]) => {
    if (current.length === 0 && previous.length === 0) {
      toast.error("Aucun fichier à traiter");
      return;
    }

    setIsLoading(true);
    console.log("Processing files - Current:", current, "Previous:", previous);
    
    try {
      // In a real app, this would actually process the files
      const data = await processGradeFiles([...current, ...previous]);
      console.log("Processed data:", data); // Debug log
      
      if (!data) {
        throw new Error("Le traitement des fichiers n'a pas produit de données");
      }
      
      setProcessedData(data);
      setHasUploaded(true);
      toast.success("Analyse des fichiers terminée");
    } catch (error) {
      console.error('Error processing files:', error);
      toast.error("Erreur lors du traitement des fichiers");
      setHasUploaded(false); // Reset in case of error
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Chargement des moyennes</h1>
          <p className="section-description">
            Importez vos fichiers Excel, CSV ou PDF pour commencer l'analyse.
          </p>
        </div>
        
        <div className="glass-panel p-5 space-y-6">
          <h2 className="text-lg font-medium">Fichiers de notes</h2>
          
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
          
          <div className="bg-secondary/30 p-4 rounded-lg">
            <div className="flex space-x-3">
              <Info className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="text-sm">
                <h4 className="font-medium">Conseil pour l'analyse</h4>
                <p className="text-muted-foreground mt-1">
                  Pour une analyse plus complète, importez à la fois les notes actuelles et celles des trimestres précédents.
                  L'application peut analyser plusieurs formats de fichiers, y compris les PDFs exportés depuis PRONOTE.
                </p>
              </div>
            </div>
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
            
            {!isLoading && (currentGradeFiles.length > 0 || hasUploaded) && processedData && (
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
        
        {hasUploaded && processedData && (
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
