
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Shield, Check } from 'lucide-react';

interface ApiKeyFormProps {
  onApiKeySubmitted?: () => void;
  className?: string;
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ className, onApiKeySubmitted }) => {
  // Si le callback onApiKeySubmitted existe, appelons-le immédiatement
  // puisque nous considérons que la clé API est toujours disponible
  React.useEffect(() => {
    if (onApiKeySubmitted) {
      onApiKeySubmitted();
    }
  }, [onApiKeySubmitted]);

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-lg font-medium">
          <Shield className="h-5 w-5 text-primary" />
          <span>Configuration de l'API OpenAI</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-lg font-medium">Configuration automatique</h3>
          <p className="text-sm text-muted-foreground">
            La clé API OpenAI est désormais configurée de manière sécurisée sur le serveur.
            Vous n'avez plus besoin de fournir votre propre clé API.
          </p>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex flex-col items-start">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Sécurité améliorée :</span> Votre clé API est stockée de façon sécurisée sur le serveur et n'est jamais exposée côté client.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ApiKeyForm;
