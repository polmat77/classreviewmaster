
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OpenAIService } from '@/utils/openai-service';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { KeyRound, Save, Lock, RefreshCw, Check, X } from 'lucide-react';

interface ApiKeyFormProps {
  onApiKeySubmitted?: () => void;
  className?: string;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onApiKeySubmitted, className }) => {
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'untested' | 'valid' | 'invalid'>('untested');

  useEffect(() => {
    // Check if API key is already stored in localStorage
    const hasKey = OpenAIService.hasApiKey();
    setIsKeySet(hasKey);
    
    // If key exists, mask it in the input
    if (hasKey) {
      setApiKey('••••••••••••••••••••••••••');
      setKeyStatus('valid'); // Assume valid since it was previously saved
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
      
      // Test the API key before saving
      setIsTesting(true);
      const isValid = await OpenAIService.testApiKey(apiKey);
      setIsTesting(false);

      if (!isValid) {
        toast.error('La clé API fournie est invalide ou a expiré');
        setKeyStatus('invalid');
        setIsSubmitting(false);
        return;
      }
      
      // Save the API key
      OpenAIService.saveApiKey(apiKey);
      setIsKeySet(true);
      setKeyStatus('valid');
      toast.success('Clé API OpenAI enregistrée avec succès');
      
      // Call the callback if provided
      if (onApiKeySubmitted) {
        onApiKeySubmitted();
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      toast.error('Erreur lors de l\'enregistrement de la clé API');
      setKeyStatus('invalid');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearKey = () => {
    OpenAIService.clearApiKey();
    setApiKey('');
    setIsKeySet(false);
    setKeyStatus('untested');
    toast.info('Clé API supprimée');
  };

  const getStatusIcon = () => {
    if (keyStatus === 'valid') {
      return <Check className="h-4 w-4 text-green-500" />;
    } else if (keyStatus === 'invalid') {
      return <X className="h-4 w-4 text-red-500" />;
    }
    return null;
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
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (keyStatus !== 'untested') {
                    setKeyStatus('untested');
                  }
                }}
                className="pl-9 pr-9"
                required
              />
              {getStatusIcon() && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {getStatusIcon()}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Votre clé API est stockée uniquement sur votre appareil et n'est jamais partagée.
              {!isKeySet && " Obtenez votre clé sur la plateforme OpenAI."}
            </p>
          </div>

          <div className="flex space-x-2">
            <Button 
              type="submit" 
              disabled={isSubmitting || isTesting} 
              className="flex-1"
            >
              {isSubmitting || isTesting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  {isTesting ? 'Test en cours...' : 'Enregistrement...'}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isKeySet ? 'Mettre à jour la clé API' : 'Enregistrer la clé API'}
                </>
              )}
            </Button>

            {isKeySet && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClearKey}
                disabled={isSubmitting || isTesting}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
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
