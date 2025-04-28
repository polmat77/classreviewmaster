
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSimulatedAnalysis } from '@/utils/aiAnalysisService';
import ReactMarkdown from 'react-markdown';

interface AIAnalysisProps {
  analysisData: any[];
  isDisabled?: boolean;
}

const AIAnalysisComponent: React.FC<AIAnalysisProps> = ({ analysisData, isDisabled = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleGenerateAnalysis = async () => {
    if (analysisData.length === 0) {
      toast.error('Aucune donnée à analyser.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Préparer les données pour l'analyse
      const requestData = {
        classData: analysisData,
        trimesters: analysisData.map(data => data.trimester)
      };

      // Utiliser la fonction simulée pour l'instant
      // Dans une version production, vous utiliseriez sendAnalysisRequest
      const result = getSimulatedAnalysis(requestData);

      if (result.error) {
        throw new Error(result.error);
      }

      // Afficher le résultat
      setAnalysisResult(result.summary);
      toast.success('Analyse générée avec succès');
    } catch (err: any) {
      console.error('Erreur lors de la génération de l\'analyse:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'analyse');
      toast.error('Erreur lors de la génération de l\'analyse');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BrainCircuit className="mr-2 h-5 w-5" />
          Analyse intelligente
        </CardTitle>
        <CardDescription>
          Générez une analyse détaillée des résultats à l'aide de l'intelligence artificielle
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!analysisResult ? (
          <div className="bg-muted/50 rounded-lg p-6 text-center">
            <p className="text-muted-foreground">
              Cliquez sur le bouton ci-dessous pour générer une analyse détaillée des résultats
              à l'aide de l'intelligence artificielle.
            </p>
          </div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown>
              {analysisResult}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button
          onClick={handleGenerateAnalysis}
          disabled={isLoading || isDisabled || analysisData.length === 0}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : analysisResult ? (
            'Régénérer l\'analyse'
          ) : (
            'Générer une analyse détaillée'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AIAnalysisComponent;
