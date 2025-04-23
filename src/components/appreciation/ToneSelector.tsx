
import React from 'react';
import { Button } from '@/components/ui/button';
import { Frown, Meh, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToneSelectorProps {
  tone: string;
  onToneChange: (tone: string) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ tone, onToneChange }) => {
  const toneOptions = [
    { 
      value: 'exigeant', 
      icon: <Frown className="h-8 w-8" />,
      label: 'Exigeant'
    },
    { 
      value: 'neutre', 
      icon: <Meh className="h-8 w-8" />,
      label: 'Neutre'
    },
    { 
      value: 'dithyrambique', 
      icon: <Smile className="h-8 w-8" />,
      label: 'Élogieux'
    }
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl">Ton de l'appréciation :</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        {toneOptions.map(({ value, icon, label }) => (
          <Button 
            key={value}
            variant={tone === value ? "default" : "outline"}
            className="h-16 w-24 rounded-lg flex flex-col items-center justify-center gap-2"
            onClick={() => onToneChange(value)}
          >
            {icon}
            <span className="text-xs">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ToneSelector;
