import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validatePdfFile, initPdfJs } from '@/utils/pdf-service';
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
  const [processingMessage, setProcessingMessage] = useState<string>('');
  const [initError, setInitError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState<number>(0);
  
  // Initialiser PDF.js au chargement du composant et à chaque changement d'initAttempt
  useEffect(() => {
    try {
      initPdfJs(initAttempt > 0); // Force réinitialisation si ce n'est pas le premier chargement
      setInitError(null);
      console.log(`PDF.js initialisé (tentative #${initAttempt + 1})`);
    } catch (error) {
      console.error("Erreur d'initialisation PDF.js:", error);
      setInitError("Le système de traitement PDF n'a pas pu s'initialiser correctement.");
    }
  }, [initAttempt]);
  
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
      
      // Force PDF.js reinitialization
      try {
        initPdfJs(true);
      } catch (error) {
        console.warn("Erreur lors de la réinitialisation de PDF.js, continuation avec l'état actuel");
        // On augmente quand même le nombre de tentatives pour l'effet useEffect
        setInitAttempt(prev => prev + 1);
      }
      
      // Validate PDF files with progressive updates
      let validPdfCount = 0;
      const validatedFiles: File[] = [];
      
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        setProcessingMessage(`Validation du fichier ${i + 1}/${pdfFiles.length}: ${file.name}`);
        
        try {
          // Montrer la progression
          setProgress(((i) / pdfFiles.length) * 50);
          
          // Valider le fichier avec un système de timeout amélioré
          const validationPromise = validatePdfFile(file);
          const timeoutPromise = new Promise<{isValid: boolean, reason: string}>((resolve) => {
            setTimeout(() => resolve({
              isValid: true,  // On accepte le fichier même en cas de timeout
              reason: "Timeout dépassé mais fichier accepté quand même"
            }), 20000); // 20 secondes
          });
          
          const validationResult = await Promise.race([validationPromise, timeoutPromise]);
          
          if (validationResult.isValid) {
            validPdfCount++;
            validatedFiles.push(file);
            
            // Avertir si le fichier a été accepté malgré des problèmes
            if (validationResult.reason) {
              toast.warning(`${file.name}: ${validationResult.reason}`);
            }
          } else {
            console.warn(`Validation échouée pour ${file.name}: ${validationResult.reason}`);
            // On accepte quand même le fichier avec un avertissement
            toast.warning(`Le fichier ${file.name} pourrait poser des problèmes (${validationResult.reason})`);
            validatedFiles.push(file); // On l'ajoute quand même
            validPdfCount++;
          }
        } catch (error) {
          console.error(`Error validating ${file.name}:`, error);
          // On accepte quand même le fichier avec un avertissement
          toast.warning(`Le fichier ${file.name} n'a pas pu être validé mais sera utilisé quand même`);
          validatedFiles.push(file); // On l'ajoute quand même
          validPdfCount++;
        }
        
        // Update progress
        setProgress(50 + ((i + 1) / pdfFiles.length) * 50);
      }
      
      const allValidatedFiles = [...nonPdfFiles, ...validatedFiles];
      
      // Add valid files to state
      setFiles(prev => [...prev, ...allValidatedFiles]);
      setValidationStatus(ProgressStatus.SUCCESS);
      
      // Return files to parent component
      onFilesAccepted(allValidatedFiles);
      
      toast.success(`${allValidatedFiles.length} fichier(s) ajouté(s) avec succès`);
      
      // Instructions spéciales pour les bulletins
      if (validatedFiles.some(f => f.name.toLowerCase().includes("bulletin") || 
                                  f.name.toLowerCase().includes("trimestre"))) {
        toast.info("Ces fichiers semblent être des bulletins scolaires. Le traitement peut prendre quelques instants.", {
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Error handling files:', error);
      setValidationError(`Erreur lors du traitement des fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setValidationStatus(ProgressStatus.ERROR);
      
      // Message plus clair sur les causes possibles
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      if (errorMessage.includes("worker") || errorMessage.includes("PDF.js")) {
        toast.error("Problème avec le moteur de traitement PDF. Essayez de recharger la page.", {
          duration: 8000
        });
      } else {
        toast.error("Une erreur s'est produite lors du traitement des fichiers");
      }
      
      // Accepter quand même les fichiers en cas d'erreur pour permettre quand même l'utilisation
      setFiles(prev => [...prev, ...acceptedFiles]);
      onFilesAccepted(acceptedFiles);
      toast.info("Les fichiers ont été acceptés malgré l'erreur", {
        duration: 5000
      });
    } finally {
      setIsValidating(false);
      setProcessingMessage('');
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
    setInitError(null);
    // Forcer une réinitialisation complète de PDF.js
    setInitAttempt(prev => prev + 1);
  };

  return (
    <div className="space-y-4">
      {initError && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Problème d'initialisation</p>
            <p className="text-xs text-amber-700">{initError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs h-8 border-amber-300 text-amber-700"
              onClick={retryUpload}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Réessayer
            </Button>
          </div>
        </div>
      )}
    
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
          <div className="text-xs text-muted-foreground mt-2">
            Conseil: pour les bulletins scolaires PDF, assurez-vous qu'ils ne sont pas verrouillés ou protégés
          </div>
        </div>
      </div>
      
      {isValidating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {processingMessage || "Traitement des fichiers..."}
            </div>
            <div className="text-sm font-medium">{Math.round(progress)}%</div>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Les fichiers volumineux peuvent prendre du temps à traiter. Merci de patienter.
          </p>
        </div>
      )}
      
      {validationError && validationStatus === ProgressStatus.ERROR && (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-md flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Attention</p>
            <p className="text-xs text-amber-700">{validationError}</p>
            <p className="text-xs text-amber-700">Les fichiers ont été acceptés malgré l'erreur.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 text-xs h-8 border-amber-300 text-amber-700"
              onClick={retryUpload}
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Réessayer l'initialisation
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
      
      {acceptedFileTypes.includes('.pdf') && (
        <div className="text-xs text-muted-foreground mt-2 pt-2 border-t">
          <p>
            <strong>Conseils pour les bulletins PDF:</strong>
          </p>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Les bulletins issus de logiciels scolaires comme Pronote fonctionnent généralement bien</li>
            <li>Évitez les PDF scannés ou avec des images, privilégiez le format texte</li>
            <li>Des tableaux complexes peuvent être difficiles à extraire correctement</li>
            <li>Alternative: utilisez des formats Excel/CSV si disponibles</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
