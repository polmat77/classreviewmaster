
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Copy, User, FileText, AlertCircle, KeyRound, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { Link } from 'react-router-dom';

interface StudentBulletinSummaryProps {
  summary: string;
  fileName?: string;
  isLoading?: boolean;
  error?: string;
  progress?: number;
}

const StudentBulletinSummary: React.FC<StudentBulletinSummaryProps> = ({ 
  summary, 
  fileName,
  isLoading = false,
  error,
  progress = 0
}) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Appréciation copiée dans le presse-papiers");
  };
  
  if (isLoading) {
    const progressText = progress > 0 
      ? `${progress}% - ${getProgressStage(progress)}` 
      : 'Démarrage du traitement...';
      
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
          
          <div className="flex flex-col">
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden mb-2">
              <div className="bg-primary h-full rounded-full transition-all duration-300"
                   style={{ width: `${progress}%` }}></div>
            </div>
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
              <span className="text-sm text-muted-foreground">
                {progressText}
              </span>
            </div>
            
            {progress > 0 && progress < 30 && (
              <div className="mt-2 flex items-center text-amber-600 dark:text-amber-400 text-sm">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                <span>Ce fichier est volumineux, l'analyse peut prendre quelques minutes...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    const isApiKeyError = error.includes('API key') || error.includes('clé API');
    const isTimeoutError = error.includes('temps') || error.includes('trop long') || error.includes('timeout');
    const isSizeError = error.includes('volumineux') || error.includes('taille');
    
    return (
      <Card className="overflow-hidden border-red-200">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <h3 className="text-lg font-medium">
              {isApiKeyError ? 'Erreur de clé API' : 
               isTimeoutError ? 'Délai d\'analyse dépassé' :
               isSizeError ? 'Fichier trop volumineux' : 
               'Erreur lors de l\'analyse'}
            </h3>
          </div>
          
          <p className="text-sm text-muted-foreground">{error}</p>
          
          {isApiKeyError ? (
            <div className="bg-secondary/30 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Configuration de la clé API requise</p>
              </div>
              <p className="text-sm mb-3">
                Pour générer des appréciations avec l'IA, vous devez configurer votre clé API OpenAI.
              </p>
              <Link to="/dashboard">
                <Button variant="secondary" size="sm" className="w-full">
                  Configurer ma clé API
                </Button>
              </Link>
            </div>
          ) : isTimeoutError || isSizeError ? (
            <div className="bg-secondary/30 p-4 rounded-lg">
              <p className="text-sm mb-3">
                Conseils pour résoudre ce problème :
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>Utilisez un PDF moins volumineux (moins de 20 pages si possible)</li>
                <li>Vérifiez que le PDF n'est pas protégé ou corrompu</li>
                <li>Assurez-vous que le contenu est bien du texte et non des images scannées</li>
                <li>Essayez d'extraire uniquement un bulletin à la fois</li>
              </ul>
            </div>
          ) : (
            <p className="text-sm">
              Veuillez vérifier que votre fichier PDF est bien formaté et réessayer. 
              Si le problème persiste, essayez avec un fichier plus petit ou contactez le support.
            </p>
          )}
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

// Helper to get text description of the current progress stage
function getProgressStage(progress: number): string {
  if (progress < 15) return "Chargement du document";
  if (progress < 50) return "Extraction du texte";
  if (progress < 60) return "Identification des bulletins";
  if (progress < 90) return "Analyse des données";
  if (progress < 95) return "Génération de l'appréciation";
  return "Finalisation";
}

export default StudentBulletinSummary;
