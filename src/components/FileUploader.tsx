
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
      // Validate PDF files
      const pdfFiles = acceptedFiles.filter(file => file.name.toLowerCase().endsWith('.pdf'));
      
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        console.log(`Validation du fichier ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
        
        // Update progress
        setProgress(((i + 0.5) / pdfFiles.length) * 100);
        
        // Validate the file
        const validationResult = await validatePdfFile(file);
        
        if (!validationResult?.isValid) {
          const errorMsg = `Validation échouée pour ${file.name}: ${validationResult?.reason || "Erreur inconnue"}`;
          setValidationError(errorMsg);
          setValidationStatus(ProgressStatus.ERROR);
          toast.error(errorMsg);
          setIsValidating(false);
          return;
        }
        
        // Update progress
        setProgress(((i + 1) / pdfFiles.length) * 100);
      }
      
      // Add valid files to state
      setFiles(prev => [...prev, ...acceptedFiles]);
      setValidationStatus(ProgressStatus.SUCCESS);
      
      // Return files to parent component
      onFilesAccepted(acceptedFiles);
      
      toast.success(`${acceptedFiles.length} fichier(s) ajouté(s) avec succès`);
    } catch (error) {
      console.error('Error validating files:', error);
      const errorMsg = `Erreur lors de la validation des fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
      setValidationError(errorMsg);
      setValidationStatus(ProgressStatus.ERROR);
      toast.error(errorMsg);
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
            <div className="text-sm text-muted-foreground">Validation des fichiers...</div>
            <div className="text-sm font-medium">{Math.round(progress)}%</div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">Les fichiers volumineux peuvent prendre du temps à valider</p>
        </div>
      )}
      
      {validationError && validationStatus === ProgressStatus.ERROR && (
        <div className="bg-destructive/10 border border-destructive/30 p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Erreur de validation</p>
            <p className="text-xs text-destructive/90">{validationError}</p>
            <Button variant="link" size="sm" className="p-0 h-auto text-xs mt-1" onClick={retryUpload}>
              Réessayer avec un autre fichier
            </Button>
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
