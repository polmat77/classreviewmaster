
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validatePdfFile } from '@/utils/pdf-service';
import { Progress } from '@/components/ui/progress';
import { ProgressStatus } from '@/utils/api/types';

interface FileUploaderProps {
  onFilesAccepted: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  label: string;
  description?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesAccepted,
  acceptedFileTypes = ['.pdf'],
  maxFiles = 3,
  label,
  description
}) => {
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [files, setFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<ProgressStatus>(ProgressStatus.IDLE);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    // Check if we're over the limit
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`Vous ne pouvez pas ajouter plus de ${maxFiles} fichiers à la fois.`);
      return;
    }
    
    setIsValidating(true);
    setProgress(0);
    setValidationError(null);
    setValidationStatus(ProgressStatus.PROCESSING);
    
    try {
      // Pour tout fichier non-PDF (CSV, Excel), on accepte directement
      const nonPdfFiles = acceptedFiles.filter(file => !file.name.toLowerCase().endsWith('.pdf'));
      const pdfFiles = acceptedFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      
      if (nonPdfFiles.length > 0) {
        console.log(`${nonPdfFiles.length} fichiers non-PDF acceptés sans validation`);
        setFiles(prev => [...prev, ...nonPdfFiles]);
        
        // Si tous les fichiers sont non-PDF, on les accepte directement
        if (pdfFiles.length === 0) {
          setIsValidating(false);
          setValidationStatus(ProgressStatus.SUCCESS);
          onFilesAccepted(nonPdfFiles);
          toast.success(`${nonPdfFiles.length} fichier(s) ajouté(s) avec succès`);
          return;
        }
      }
      
      // On continue avec les fichiers PDF
      if (pdfFiles.length === 0) return;
      
      // Validate PDF files with a shorter timeout
      let validPdfCount = 0;
      
      const validationPromises = pdfFiles.map(async (file, index) => {
        try {
          // Update progress
          setProgress(((index + 0.5) / pdfFiles.length) * 100);
          
          // Validate the file with a shorter timeout using Promise.race
          const validationPromise = validatePdfFile(file);
          const timeoutPromise = new Promise<{isValid: boolean, reason: string}>((resolve) => {
            setTimeout(() => resolve({
              isValid: true,  // On accepte le fichier même en cas de timeout
              reason: "Timeout dépassé mais fichier accepté quand même"
            }), 10000);
          });
          
          const validationResult = await Promise.race([validationPromise, timeoutPromise]);
          
          if (validationResult.isValid) {
            validPdfCount++;
            return file;
          } else {
            console.warn(`Validation échouée pour ${file.name}: ${validationResult.reason}`);
            // On accepte quand même le fichier avec un avertissement
            toast.warning(`Le fichier ${file.name} pourrait poser des problèmes (${validationResult.reason})`);
            validPdfCount++;
            return file;
          }
        } catch (error) {
          console.error(`Error validating ${file.name}:`, error);
          // On accepte quand même le fichier avec un avertissement
          toast.warning(`Le fichier ${file.name} n'a pas pu être validé mais sera utilisé quand même`);
          validPdfCount++;
          return file;
        } finally {
          // Update progress
          setProgress(((index + 1) / pdfFiles.length) * 100);
        }
      });
      
      const validatedFiles = await Promise.all(validationPromises);
      const allValidatedFiles = [...nonPdfFiles, ...validatedFiles.filter(Boolean)];
      
      // Add valid files to state
      setFiles(prev => [...prev, ...allValidatedFiles]);
      setValidationStatus(ProgressStatus.SUCCESS);
      
      // Return files to parent component
      onFilesAccepted(allValidatedFiles);
      
      toast.success(`${allValidatedFiles.length} fichier(s) ajouté(s) avec succès`);
    } catch (error) {
      console.error('Error handling files:', error);
      setValidationError(`Erreur lors du traitement des fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setValidationStatus(ProgressStatus.ERROR);
      toast.error("Une erreur s'est produite lors du traitement des fichiers");
      
      // Accepter quand même les fichiers en cas d'erreur
      setFiles(prev => [...prev, ...acceptedFiles]);
      onFilesAccepted(acceptedFiles);
      toast.info("Les fichiers ont été acceptés malgré l'erreur");
    } finally {
      setIsValidating(false);
    }
  }, [files, maxFiles, onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      // Map file extensions to MIME types
      if (type === '.pdf') acc['application/pdf'] = ['.pdf'];
      else if (['.xls', '.xlsx'].includes(type)) {
        acc['application/vnd.ms-excel'] = ['.xls'];
        acc['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx'];
      } else if (type === '.csv') acc['text/csv'] = ['.csv'];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles
  });
  
  const removeFile = (fileToRemove: File) => {
    setFiles(files.filter(file => file !== fileToRemove));
  };

  const retryUpload = () => {
    setValidationError(null);
    setValidationStatus(ProgressStatus.IDLE);
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">
            {isDragActive ? 'Déposez les fichiers ici...' : label}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      
      {isValidating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Traitement des fichiers...</div>
            <div className="text-sm font-medium">{Math.round(progress)}%</div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">Les fichiers volumineux peuvent prendre du temps à traiter</p>
        </div>
      )}
      
      {validationError && validationStatus === ProgressStatus.ERROR && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Attention</p>
            <p className="text-xs text-amber-700">{validationError}</p>
            <p className="text-xs text-amber-700">Les fichiers ont été acceptés malgré l'erreur.</p>
          </div>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Fichiers ({files.length})</p>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-accent/50 p-2 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-primary" />
                  <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / (1024 * 1024)).toFixed(1)} MB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeFile(file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
