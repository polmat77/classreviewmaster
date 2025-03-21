
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { CloudUpload, FileSpreadsheet, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFilesAccepted: (files: File[]) => void;
  acceptedFileTypes?: string[];
  maxFiles?: number;
  label?: string;
  description?: string;
  className?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesAccepted,
  acceptedFileTypes = ['.csv', '.xlsx', '.xls', '.pdf'],
  maxFiles = 5,
  label = "Importer vos fichiers",
  description = "Glissez-déposez vos fichiers ou cliquez pour parcourir",
  className,
}) => {
  const [files, setFiles] = useState<Array<File & { preview?: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxFiles) {
      toast.error(`Vous ne pouvez pas télécharger plus de ${maxFiles} fichiers`);
      return;
    }
    
    // Process the files here
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file),
      })
    );
    
    setIsUploading(true);
    
    // Simulate processing time
    setTimeout(() => {
      setFiles(prev => [...prev, ...newFiles]);
      onFilesAccepted(acceptedFiles);
      setIsUploading(false);
      toast.success(`${acceptedFiles.length} fichier(s) importé(s) avec succès`);
    }, 1000);
    
  }, [files.length, maxFiles, onFilesAccepted]);
  
  const removeFile = (index: number) => {
    setFiles(prevFiles => {
      const newFiles = [...prevFiles];
      // Revoke object URL to avoid memory leaks
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };
  
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      const mimeTypes = {
        '.csv': { 'text/csv': [] },
        '.xlsx': { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [] },
        '.xls': { 'application/vnd.ms-excel': [] },
        '.pdf': { 'application/pdf': [] },
      };
      return { ...acc, ...(mimeTypes[type as keyof typeof mimeTypes] || {}) };
    }, {}),
    maxFiles,
    multiple: true,
  });
  
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return <FileText className="h-5 w-5 text-primary" />;
    }
    return <FileSpreadsheet className="h-5 w-5 text-primary" />;
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      <div 
        {...getRootProps()} 
        className={cn(
          "flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer group",
          isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-secondary/50",
          isDragReject && "border-destructive bg-destructive/5"
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center text-center space-y-2">
          <div className={cn(
            "p-3 rounded-full bg-secondary text-muted-foreground transition-all duration-200 group-hover:text-primary",
            isDragActive && "text-primary"
          )}>
            <CloudUpload className="h-8 w-8" />
          </div>
          
          <h3 className="text-lg font-medium">{label}</h3>
          
          <p className="text-sm text-muted-foreground max-w-md">
            {isDragActive ? "Déposez vos fichiers ici" : description}
          </p>
          
          <div className="text-xs text-muted-foreground mt-2">
            {acceptedFileTypes.join(', ')} · {maxFiles > 1 ? `${maxFiles} fichiers max` : '1 fichier max'}
          </div>
        </div>
      </div>
      
      {(files.length > 0 || isUploading) && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium">Fichiers importés ({files.length}/{maxFiles})</h4>
          
          <div className="space-y-2">
            {isUploading && (
              <div className="flex items-center p-3 rounded-lg bg-secondary animate-pulse">
                <div className="p-2 rounded-md bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div className="ml-3 flex-1">
                  <div className="h-2.5 w-1/3 bg-secondary-foreground/10 rounded"></div>
                  <div className="h-2 w-1/5 bg-secondary-foreground/5 rounded mt-1"></div>
                </div>
              </div>
            )}
            
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-card shadow-subtle">
                <div className="flex items-center overflow-hidden">
                  <div className="p-2 rounded-md bg-secondary">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="ml-3 truncate">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="ml-2 p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {files.length > 0 && (
        <div className="pt-2 flex items-center">
          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
          <span className="text-sm">Fichiers prêts à être analysés</span>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
