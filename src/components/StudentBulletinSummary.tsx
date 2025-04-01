
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Copy, User, FileText, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';

interface StudentBulletinSummaryProps {
  summary: string;
  fileName?: string;
  isLoading?: boolean;
  error?: string;
}

const StudentBulletinSummary: React.FC<StudentBulletinSummaryProps> = ({ 
  summary, 
  fileName,
  isLoading = false,
  error
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Appréciation copiée dans le presse-papiers");
  };
  
  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Génération en cours...</h3>
            </div>
            {fileName && (
              <div className="flex items-center text-sm text-muted-foreground">
                <FileText className="h-3.5 w-3.5 mr-1" />
                {fileName}
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-full space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-9/12" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
            <span className="text-sm text-muted-foreground">
              Analyse du bulletin et génération de l'appréciation...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="overflow-hidden border-red-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-lg font-medium">Erreur lors de l'analyse</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">{error}</p>
          
          <p className="text-sm">
            Veuillez vérifier que votre fichier PDF est bien formaté et réessayer. 
            Si le problème persiste, essayez avec un fichier plus petit ou contactez le support.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Appréciation générée</h3>
          </div>
          {fileName && (
            <div className="flex items-center text-sm text-muted-foreground">
              <FileText className="h-3.5 w-3.5 mr-1" />
              {fileName}
            </div>
          )}
        </div>
        
        <div className="bg-secondary/30 p-4 rounded-lg leading-relaxed text-sm">
          {summary.split(/\n+/).map((paragraph, index) => (
            <p key={index} className={index > 0 ? 'mt-3' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
        
        <div className="flex justify-end">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={copyToClipboard}
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copier</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentBulletinSummary;
