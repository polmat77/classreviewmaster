
import React, { useState, useEffect } from 'react';
import FileUploader from '@/components/FileUploader';
import { savePreviousGradeFiles, getPreviousGradeFiles } from '@/utils/data-processing';
import { Button } from '@/components/ui/button';
import { BarChart2 } from 'lucide-react';
import { toast } from 'sonner';

interface AnalysisUploaderProps {
  onFilesUploaded?: () => void;
  onAnalyze?: () => void;
  isLoading?: boolean;
  hasCurrentFiles?: boolean;
}

const AnalysisUploader: React.FC<AnalysisUploaderProps> = ({ 
  onFilesUploaded,
  onAnalyze,
  isLoading,
  hasCurrentFiles = false
}) => {
  const [previousGradeTableFiles, setPreviousGradeTableFiles] = useState<File[]>([]);
  const [savedFiles, setSavedFiles] = useState<any[]>([]);
  
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
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium mb-2">Tableau des notes précédent (optionnel)</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Importez un tableau des notes d'une période précédente pour une analyse plus approfondie de l'évolution.
        </p>
        <FileUploader 
          onFilesAccepted={handlePreviousGradeTableUpload}
          acceptedFileTypes={['.csv', '.xlsx', '.xls', '.pdf']}
          maxFiles={1}
          label="Importer un tableau des notes"
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
      
      {onAnalyze && (
        <div className="flex justify-center mt-4">
          <Button 
            onClick={onAnalyze} 
            className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
            size="lg"
            disabled={isLoading || !hasCurrentFiles}
          >
            <BarChart2 className="mr-2 h-5 w-5" />
            {isLoading ? 'Analyse en cours...' : 'Analyser les données'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalysisUploader;
