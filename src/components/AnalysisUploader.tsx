import React, { useState, useEffect } from 'react';
import FileUploader from '@/components/FileUploader';
import { savePreviousGradeFiles, getPreviousGradeFiles } from '@/utils/data-processing';
import { Button } from '@/components/ui/button';
import { BarChart2, Table, FileText, Users, User } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseGradeTable, parseClassBulletins, summarizeStudentBulletin } from '@/utils/pdf-processing';
import GradeTablePreview from '@/components/GradeTablePreview';
import ClassBulletinSummary from '@/components/ClassBulletinSummary';
import StudentBulletinSummary from '@/components/StudentBulletinSummary';

interface AnalysisUploaderProps {
  onFilesUploaded?: () => void;
  onAnalyze?: () => void;
  isLoading?: boolean;
  hasCurrentFiles?: boolean;
}

const AnalysisUploader: React.FC<AnalysisUploaderProps> = ({ 
  onFilesUploaded,
  onAnalyze,
  isLoading: parentIsLoading,
  hasCurrentFiles = false
}) => {
  const [previousGradeTableFiles, setPreviousGradeTableFiles] = useState<File[]>([]);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('grade-table');
  
  // State for file uploads
  const [gradeTableFile, setGradeTableFile] = useState<File | null>(null);
  const [classBulletinFile, setClassBulletinFile] = useState<File | null>(null);
  const [studentBulletinFile, setStudentBulletinFile] = useState<File | null>(null);
  
  // State for analysis results
  const [gradeTableData, setGradeTableData] = useState<any>(null);
  const [classBulletinData, setClassBulletinData] = useState<any>(null);
  const [studentSummary, setStudentSummary] = useState<string>('');
  
  // Loading states
  const [isAnalyzingGradeTable, setIsAnalyzingGradeTable] = useState<boolean>(false);
  const [isAnalyzingClassBulletin, setIsAnalyzingClassBulletin] = useState<boolean>(false);
  const [isAnalyzingStudentBulletin, setIsAnalyzingStudentBulletin] = useState<boolean>(false);
  
  // Error states
  const [gradeTableError, setGradeTableError] = useState<string | null>(null);
  const [classBulletinError, setClassBulletinError] = useState<string | null>(null);
  const [studentBulletinError, setStudentBulletinError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if there are any previously uploaded files
    try {
      const files = getPreviousGradeFiles();
      setSavedFiles(Array.isArray(files) ? files : []);
      console.log("Loaded saved files:", files);
    } catch (error) {
      console.error("Error loading previous files:", error);
      setSavedFiles([]);
    }
  }, []);
  
  const handlePreviousGradeTableUpload = (files: File[]) => {
    if (!files || files.length === 0) {
      console.log("No files provided to handlePreviousGradeTableUpload");
      return;
    }
    
    console.log("Handling previous grade table upload:", files);
    setPreviousGradeTableFiles(files);
    
    try {
      if (savePreviousGradeFiles(files)) {
        toast.success("Tableau des notes précédent enregistré");
        const updatedFiles = getPreviousGradeFiles();
        setSavedFiles(Array.isArray(updatedFiles) ? updatedFiles : []);
        console.log("Saved files updated:", updatedFiles);
        
        if (onFilesUploaded) {
          console.log("Calling onFilesUploaded callback");
          onFilesUploaded();
        }
      }
    } catch (error) {
      console.error("Error saving files:", error);
      toast.error("Erreur lors de l'enregistrement des fichiers");
    }
  };
  
  const handleGradeTableUpload = (files: File[]) => {
    if (!files || files.length === 0) return;
    setGradeTableFile(files[0]);
    // Reset previous results when a new file is uploaded
    setGradeTableData(null);
    setGradeTableError(null);
  };
  
  const handleClassBulletinUpload = (files: File[]) => {
    if (!files || files.length === 0) return;
    setClassBulletinFile(files[0]);
    // Reset previous results when a new file is uploaded
    setClassBulletinData(null);
    setClassBulletinError(null);
  };
  
  const handleStudentBulletinUpload = (files: File[]) => {
    if (!files || files.length === 0) return;
    setStudentBulletinFile(files[0]);
    // Reset previous results when a new file is uploaded
    setStudentSummary('');
    setStudentBulletinError(null);
  };
  
  const analyzeGradeTable = async () => {
    if (!gradeTableFile) {
      toast.error("Veuillez d'abord importer un fichier");
      return;
    }
    
    setIsAnalyzingGradeTable(true);
    setGradeTableError(null);
    
    try {
      const fileBuffer = await gradeTableFile.arrayBuffer();
      
      // Ajout d'un timeout pour éviter un blocage indéfini
      const timeout = 30000; // 30 secondes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Le traitement a pris trop de temps")), timeout);
      });
      
      // Utiliser Promise.race pour avoir une limite de temps
      const data = await Promise.race([
        parseGradeTable(fileBuffer, (progress) => {
          // Vous pouvez ajouter ici un indicateur de progression si vous le souhaitez
          console.log(`Progression de l'analyse: ${progress}%`);
        }),
        timeoutPromise
      ]);
      
      setGradeTableData(data);
      toast.success(`Tableau analysé avec succès : ${data.students.length} élèves, ${data.subjects.length} matières`);
    } catch (error) {
      console.error("Error analyzing grade table:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      setGradeTableError(errorMessage);
      toast.error(`Erreur lors de l'analyse : ${errorMessage}`);
      
      // Ajouter une option pour réessayer avec un mode de compatibilité
      toast.info("Essayez de réimporter le fichier ou utilisez l'option CSV/Excel pour ce format", {
        duration: 6000
      });
    } finally {
      setIsAnalyzingGradeTable(false);
    }
  };
  
  const analyzeClassBulletin = async () => {
    if (!classBulletinFile) {
      toast.error("Veuillez d'abord importer un fichier");
      return;
    }
    
    setIsAnalyzingClassBulletin(true);
    setClassBulletinError(null);
    
    try {
      const fileBuffer = await classBulletinFile.arrayBuffer();
      
      // Ajout d'un timeout pour éviter un blocage indéfini
      const timeout = 60000; // 60 secondes car l'analyse des bulletins peut être plus longue
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Le traitement a pris trop de temps")), timeout);
      });
      
      // Utiliser Promise.race pour avoir une limite de temps
      const data = await Promise.race([
        parseClassBulletins(fileBuffer, (progress) => {
          // Indicateur de progression
          console.log(`Progression de l'analyse des bulletins: ${progress}%`);
        }),
        timeoutPromise
      ]);
      
      setClassBulletinData(data);
      toast.success(`Bulletins analysés avec succès : ${data.students.length} élèves`);
    } catch (error) {
      console.error("Error analyzing class bulletins:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      setClassBulletinError(errorMessage);
      toast.error(`Erreur lors de l'analyse : ${errorMessage}`);
      
      // Suggestions en cas d'erreur
      toast.info("Le format de ce bulletin peut être difficile à analyser. Essayez un autre format ou exportez-le différemment.", {
        duration: 6000
      });
    } finally {
      setIsAnalyzingClassBulletin(false);
    }
  };
  
  const analyzeStudentBulletin = async () => {
    if (!studentBulletinFile) {
      toast.error("Veuillez d'abord importer un fichier");
      return;
    }
    
    setIsAnalyzingStudentBulletin(true);
    setStudentBulletinError(null);
    
    try {
      const fileBuffer = await studentBulletinFile.arrayBuffer();
      
      // Ajout d'un timeout pour éviter un blocage indéfini
      const timeout = 45000; // 45 secondes
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Le traitement a pris trop de temps")), timeout);
      });
      
      // Utiliser Promise.race pour avoir une limite de temps
      const summary = await Promise.race([
        summarizeStudentBulletin(fileBuffer, (progress) => {
          // Indicateur de progression
          console.log(`Progression de l'analyse du bulletin: ${progress}%`);
        }),
        timeoutPromise
      ]);
      
      setStudentSummary(summary);
      toast.success("Appréciation générée avec succès");
    } catch (error) {
      console.error("Error analyzing student bulletin:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      setStudentBulletinError(errorMessage);
      toast.error(`Erreur lors de l'analyse : ${errorMessage}`);
      
      // Suggestions en cas d'erreur
      if (errorMessage.includes("temps")) {
        toast.info("Le bulletin semble complexe. Essayez de le diviser en plusieurs fichiers plus petits.", {
          duration: 6000
        });
      }
    } finally {
      setIsAnalyzingStudentBulletin(false);
    }
  };
  
  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="grade-table" className="flex items-center space-x-2">
            <Table className="h-4 w-4" />
            <span>Tableau des notes</span>
          </TabsTrigger>
          <TabsTrigger value="class-bulletin" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Bulletins de classe</span>
          </TabsTrigger>
          <TabsTrigger value="student-bulletin" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Bulletin individuel</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="grade-table" className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="text-base font-medium mb-2">Tableau des notes de la classe</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Importez un tableau des notes de la classe (PDF exporté de PRONOTE ou autre logiciel).
            </p>
            <FileUploader 
              onFilesAccepted={handleGradeTableUpload}
              acceptedFileTypes={['.pdf']}
              maxFiles={1}
              label="Importer le tableau des notes"
              description="Fichier PDF contenant le tableau des notes de la classe"
            />
            
            {gradeTableFile && (
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={analyzeGradeTable} 
                  className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all"
                  size="lg"
                  disabled={isAnalyzingGradeTable}
                >
                  {isAnalyzingGradeTable ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <Table className="mr-2 h-5 w-5" />
                      Analyser le tableau
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {gradeTableError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md text-sm text-red-700 dark:text-red-400">
                Erreur : {gradeTableError}
              </div>
            )}
          </div>
          
          {gradeTableData && (
            <GradeTablePreview 
              data={gradeTableData} 
              onExport={() => downloadJson(gradeTableData, 'tableau-notes.json')} 
            />
          )}
          
          <div>
            <h3 className="text-base font-medium mb-2">Tableau des notes précédent (optionnel)</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Importez un tableau des notes d'une période précédente pour une analyse comparative.
            </p>
            <FileUploader 
              onFilesAccepted={handlePreviousGradeTableUpload}
              acceptedFileTypes={['.csv', '.xlsx', '.xls', '.pdf']}
              maxFiles={1}
              label="Importer un tableau des notes précédent"
              description="Fichier Excel, CSV ou PDF contenant les notes"
            />
          </div>
          
          {savedFiles && savedFiles.length > 0 && (
            <div className="bg-secondary/30 p-4 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Fichiers de notes enregistrés</h4>
              <ul className="text-sm space-y-1">
                {savedFiles.map((file, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">📊</span>
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Ces fichiers seront utilisés pour l'analyse comparative dans toutes les sections de l'application.
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="class-bulletin" className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="text-base font-medium mb-2">Bulletins de la classe entière</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Importez un PDF contenant les bulletins de tous les élèves de la classe pour analyser les appréciations.
            </p>
            <FileUploader 
              onFilesAccepted={handleClassBulletinUpload}
              acceptedFileTypes={['.pdf']}
              maxFiles={1}
              label="Importer les bulletins de classe"
              description="Fichier PDF contenant les bulletins de tous les élèves"
            />
            
            {classBulletinFile && (
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={analyzeClassBulletin} 
                  className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all"
                  size="lg"
                  disabled={isAnalyzingClassBulletin}
                >
                  {isAnalyzingClassBulletin ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Analyser les bulletins
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {classBulletinError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md text-sm text-red-700 dark:text-red-400">
                Erreur : {classBulletinError}
              </div>
            )}
          </div>
          
          {classBulletinData && (
            <ClassBulletinSummary 
              data={classBulletinData}
              onExport={() => downloadJson(classBulletinData, 'bulletins-classe.json')}
            />
          )}
        </TabsContent>
        
        <TabsContent value="student-bulletin" className="space-y-4">
          <div className="glass-panel p-5">
            <h3 className="text-base font-medium mb-2">Bulletin individuel d'élève</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Importez le bulletin d'un élève pour générer une appréciation globale synthétisant les commentaires des professeurs.
            </p>
            <FileUploader 
              onFilesAccepted={handleStudentBulletinUpload}
              acceptedFileTypes={['.pdf']}
              maxFiles={1}
              label="Importer un bulletin individuel"
              description="Fichier PDF contenant le bulletin d'un élève"
            />
            
            {studentBulletinFile && (
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={analyzeStudentBulletin}
                  className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all"
                  size="lg"
                  disabled={isAnalyzingStudentBulletin}
                >
                  {isAnalyzingStudentBulletin ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <User className="mr-2 h-5 w-5" />
                      Générer l'appréciation
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {studentBulletinError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md text-sm text-red-700 dark:text-red-400">
                Erreur : {studentBulletinError}
              </div>
            )}
          </div>
          
          {studentSummary && (
            <StudentBulletinSummary 
              summary={studentSummary}
              fileName={studentBulletinFile?.name}
            />
          )}
        </TabsContent>
      </Tabs>
      
      {onAnalyze && (
        <div className="flex justify-center mt-4">
          <Button 
            onClick={onAnalyze} 
            className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            size="lg"
            disabled={parentIsLoading || !hasCurrentFiles}
          >
            <BarChart2 className="mr-2 h-5 w-5" />
            {parentIsLoading ? 'Analyse en cours...' : 'Analyser les données'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalysisUploader;