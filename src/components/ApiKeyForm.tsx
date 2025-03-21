
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpenAIService } from '@/utils/openai-service';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Save, Lock } from 'lucide-react';

interface ApiKeyFormProps {
  onApiKeySubmitted?: () => void;
  className?: string;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySubmitted, className }) => {
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if API key is already stored
    const hasKey = OpenAIService.hasApiKey();
    setIsKeySet(hasKey);
    
    // If key exists, mask it in the input
    if (hasKey) {
      setApiKey('••••••••••••••••••••••••••');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || apiKey.includes('•')) {
      toast.error('Veuillez entrer une clé API valide');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Simple validation - API keys typically start with "sk-"
      if (!apiKey.startsWith('sk-')) {
        toast.error('La clé API OpenAI semble invalide (devrait commencer par "sk-")');
        setIsSubmitting(false);
        return;
      }
      
      // Save the API key
      OpenAIService.saveApiKey(apiKey);
      setIsKeySet(true);
      toast.success('Clé API OpenAI enregistrée avec succès');
      
      // Call the callback if provided
      if (onApiKeySubmitted) {
        onApiKeySubmitted();
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Erreur lors de l\'enregistrement de la clé API');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg font-medium">
          <KeyRound className="h-5 w-5 text-primary" />
          <span>Configuration de l'API OpenAI</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="apiKey" className="text-sm font-medium">
              Clé API OpenAI
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pl-9"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Votre clé API est stockée uniquement sur votre appareil et n'est jamais partagée.
              {!isKeySet && " Obtenez votre clé sur la plateforme OpenAI."}
            </p>
          </div>
          <Button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⌛</span>
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isKeySet ? 'Mettre à jour la clé API' : 'Enregistrer la clé API'}
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col items-start">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Important:</span> Cette clé est nécessaire pour générer les appréciations avec l'IA.
          </p>
          <p>
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Obtenir une clé API sur OpenAI →
            </a>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ApiKeyForm;
