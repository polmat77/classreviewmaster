
import React from 'react';
import { Card, CardContent } from './ui/card';
import { Copy, User, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface StudentBulletinSummaryProps {
  summary: string;
  fileName?: string;
}

const StudentBulletinSummary: React.FC<StudentBulletinSummaryProps> = ({ summary, fileName }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast.success("Appréciation copiée dans le presse-papiers");
  };
  
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

export default StudentBulletinSummary;
