
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Webhook, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface N8NWebhookIntegrationProps {
  onWebhookConfigured: (webhookUrl: string) => void;
  isConfigured: boolean;
  currentWebhookUrl?: string;
}

const N8NWebhookIntegration: React.FC<N8NWebhookIntegrationProps> = ({
  onWebhookConfigured,
  isConfigured,
  currentWebhookUrl
}) => {
  const defaultWebhookUrl = 'https://polmat.app.n8n.cloud/webhook-test/upload-notes';
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || defaultWebhookUrl);
  const [isValidating, setIsValidating] = useState(false);

  // Auto-configure with default URL on component mount
  React.useEffect(() => {
    if (!isConfigured && !currentWebhookUrl) {
      onWebhookConfigured(defaultWebhookUrl);
    }
  }, []);

  const validateWebhookUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleConfigureWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error("Veuillez saisir l'URL du webhook N8N");
      return;
    }

    if (!validateWebhookUrl(webhookUrl)) {
      toast.error("URL du webhook invalide");
      return;
    }

    setIsValidating(true);

    try {
      // Test the webhook with a ping
      const testPayload = {
        type: 'ping',
        timestamp: new Date().toISOString(),
        message: 'Test de connexion depuis ClassReviewMaster'
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(testPayload),
      });

      // Since we're using no-cors, we can't check the actual response
      // We'll assume success if no error is thrown
      onWebhookConfigured(webhookUrl);
      toast.success("Webhook N8N configuré avec succès");
    } catch (error) {
      console.error('Erreur lors du test du webhook:', error);
      toast.error("Erreur lors de la configuration du webhook");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveWebhook = () => {
    setWebhookUrl(defaultWebhookUrl);
    onWebhookConfigured('');
    toast.info("Configuration du webhook supprimée");
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Webhook className="h-5 w-5" />
          <span>Intégration N8N</span>
        </CardTitle>
        <CardDescription>
          Analysez vos données PDF avec le workflow N8N configuré
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured || currentWebhookUrl ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Webhook N8N configuré et prêt à l'emploi
              <div className="mt-2 text-sm text-muted-foreground">
                URL: {currentWebhookUrl || defaultWebhookUrl}
              </div>
              <div className="mt-2 flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveWebhook}
                >
                  Modifier la configuration
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="webhook-url">URL du webhook N8N</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                L'URL par défaut de votre workflow N8N est déjà configurée. 
                Vous pouvez modifier l'URL si nécessaire ou utiliser celle par défaut.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={handleConfigureWebhook}
              disabled={isValidating || !webhookUrl.trim()}
              className="w-full"
            >
              {isValidating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Test de connexion...
                </>
              ) : (
                <>
                  <Webhook className="mr-2 h-4 w-4" />
                  Configurer le webhook
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default N8NWebhookIntegration;
