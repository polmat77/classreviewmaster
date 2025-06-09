
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
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || '');
  const [isValidating, setIsValidating] = useState(false);

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
    setWebhookUrl('');
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
          Configurez votre webhook N8N pour l'analyse automatisée des données PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Webhook N8N configuré et prêt à l'emploi
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
                Assurez-vous que votre workflow N8N est configuré pour recevoir des données JSON
                et qu'il peut traiter les fichiers PDF encodés en base64.
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
