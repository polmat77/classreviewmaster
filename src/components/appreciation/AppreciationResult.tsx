
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Copy, Save } from 'lucide-react';
import { toast } from 'sonner';

interface AppreciationResultProps {
  appreciation: string;
  onRegenerate: () => void;
  onCopy: () => void;
}

const AppreciationResult: React.FC<AppreciationResultProps> = ({
  appreciation,
  onRegenerate,
  onCopy,
}) => {
  const handleSave = () => toast.success("Appréciation sauvegardée");

  return (
    <div className="space-y-4">
      <h2 className="text-xl">Résultat :</h2>
      <div className="p-6 rounded-lg bg-white border min-h-[150px] text-lg">
        {appreciation}
      </div>
      
      <div className="flex gap-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={onRegenerate}
        >
          <RefreshCw className="mr-2" />
          Régénérer
        </Button>
        <Button 
          variant="outline"
          className="flex-1"
          onClick={onCopy}
        >
          <Copy className="mr-2" />
          Copier
        </Button>
        <Button 
          variant="outline"
          className="flex-1"
          onClick={handleSave}
        >
          <Save className="mr-2" />
          Sauvegarder
        </Button>
      </div>
    </div>
  );
};

export default AppreciationResult;

