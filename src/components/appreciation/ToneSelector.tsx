
import React from 'react';
import { Button } from '@/components/ui/button';
import { Frown, Meh, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToneSelectorProps {
  tone: string;
  onToneChange: (tone: string) => void;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({ tone, onToneChange }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl">Ton de l'appréciation :</h2>
      <div className="flex flex-wrap gap-4 justify-center">
        {[
          { value: 'exigeant', icon: <Frown className="h-8 w-8" /> },
          { value: 'neutre', icon: <Meh className="h-8 w-8" /> },
          { value: 'dithyrambique', icon: <Smile className="h-8 w-8" /> }
        ].map(({ value, icon }) => (
          <Button 
            key={value}
            variant={tone === value ? "default" : "outline"}
            size="icon"
            className="h-16 w-16 rounded-full"
            onClick={() => onToneChange(value)}
          >
            {icon}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default ToneSelector;

