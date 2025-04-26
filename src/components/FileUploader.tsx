cat > src/components/FileUpload.tsx << 'EOF'
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, File, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  onFileProcessed: (data: any[], trimester: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed }) => {
  const [files, setFiles] = useState<{ file: File; trimester: string; processed: boolean }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const newFiles = acceptedFiles.map(file => ({
      file,
      trimester: getTrimesterFromFileName(file.name) || `Trimestre ${files.length + 1}`,
      processed: false
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${acceptedFiles.length} fichier(s) ajouté(s)`);
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  const getTrimesterFromFileName = (filename: string): string | null => {
    // Try to extract trimester information from filename
    const trimRegex = /tr(?:im(?:estre)?)?\s*([1-3])/i;
    const match = filename.match(trimRegex);
    
    if (match) {
      return `Trimestre ${match[1]}`;
    }
    return null;
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processFile = async (fileItem: { file: File; trimester: string; processed: boolean }, index: number) => {
    setIsProcessing(true);
    try {
      const data = await readFileAsArrayBuffer(fileItem.file);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Update file status
      setFiles(prev => {
        const newFiles = [...prev];
        newFiles[index] = { ...newFiles[index], processed: true };
        return newFiles;
      });
      
      onFileProcessed(jsonData, fileItem.trimester);
      toast.success(`Fichier ${fileItem.file.name} traité avec succès`);
    } catch (error) {
      console.error('Error processing file:', error);
      toast.error(`Erreur lors du traitement de ${fileItem.file.name}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          resolve(e.target.result);
        } else {
          reject(new Error('Failed to read file as ArrayBuffer'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  const updateTrimester = (index: number, value: string) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], trimester: value };
      return newFiles;
    });
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center space-y-2">
          <Upload className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-medium">
            {isDragActive ? 'Déposez les fichiers ici...' : 'Glissez-déposez des fichiers, ou cliquez pour sélectionner'}
          </p>
          <p className="text-sm text-muted-foreground">
            Formats supportés: XLSX, XLS, CSV
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Fichiers ({files.length})</h3>
            <div className="space-y-2">
              {files.map((fileItem, index) => (
                <div key={index} className="flex items-center justify-between bg-background p-3 rounded-md border">
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-primary" />
                    <div className="text-sm truncate max-w-[200px]">{fileItem.file.name}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={fileItem.trimester}
                      onChange={(e) => updateTrimester(index, e.target.value)}
                      className="text-sm border rounded px-2 py-1"
                    >
                      <option value="Trimestre 1">Trimestre 1</option>
                      <option value="Trimestre 2">Trimestre 2</option>
                      <option value="Trimestre 3">Trimestre 3</option>
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => processFile(fileItem, index)}
                      disabled={isProcessing || fileItem.processed}
                    >
                      {fileItem.processed ? 'Traité' : 'Traiter'}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;
EOF