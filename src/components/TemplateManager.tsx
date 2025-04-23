
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { TemplateService } from '@/utils/template-service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Save, Trash2, FileText, FileSpreadsheet } from 'lucide-react';

interface TemplateManagerProps {
  currentMapping: Record<string, any> | null;
  sourceType: 'pdf' | 'excel' | 'csv';
  onTemplateSelect: (mappingConfig: Record<string, any>) => void;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({
  currentMapping,
  sourceType,
  onTemplateSelect,
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isNewTemplateDialogOpen, setIsNewTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    mappingConfig: currentMapping || {}
  });

  // Charger les templates au montage
  useEffect(() => {
    refreshTemplates();
  }, []);

  const refreshTemplates = () => {
    const allTemplates = TemplateService.getAllTemplates();
    // Filtrer par type de source si nécessaire
    const filteredTemplates = sourceType ? 
      allTemplates.filter(template => template.sourceType === sourceType) :
      allTemplates;
    
    setTemplates(filteredTemplates);
  };

  const handleSaveTemplate = () => {
    if (!newTemplate.name.trim()) {
      toast.error("Le nom du template est requis");
      return;
    }

    try {
      TemplateService.saveTemplate({
        name: newTemplate.name,
        description: newTemplate.description,
        sourceType,
        mappingConfig: currentMapping || {}
      });
      
      setIsNewTemplateDialogOpen(false);
      setNewTemplate({ name: '', description: '', mappingConfig: {} });
      refreshTemplates();
      toast.success("Template sauvegardé avec succès");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast.error("Erreur lors de la sauvegarde du template");
    }
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = TemplateService.getTemplateById(templateId);
    if (template) {
      onTemplateSelect(template.mappingConfig);
      TemplateService.updateLastUsed(templateId);
      refreshTemplates();
      toast.success(`Template "${template.name}" appliqué`);
    }
  };

  const handleDeleteTemplate = (templateId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (TemplateService.deleteTemplate(templateId)) {
      refreshTemplates();
      toast.success("Template supprimé avec succès");
    } else {
      toast.error("Erreur lors de la suppression du template");
    }
  };

  const getSourceTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">Templates de mapping</h3>
        
        <Dialog open={isNewTemplateDialogOpen} onOpenChange={setIsNewTemplateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={!currentMapping}
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder la configuration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sauvegarder en tant que template</DialogTitle>
              <DialogDescription>
                Créez un template réutilisable à partir de votre configuration de mapping actuelle.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nom du template</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Ex: Bulletins Collège Jean Moulin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description (optionnelle)</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Ex: Configuration pour les bulletins trimestriels du collège"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsNewTemplateDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={handleSaveTemplate}>
                Sauvegarder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dernière utilisation</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(template => (
                <TableRow 
                  key={template.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{template.name}</p>
                      {template.description && (
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getSourceTypeIcon(template.sourceType)}
                      <span className="ml-2 text-xs capitalize">{template.sourceType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {template.lastUsed ? (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(template.lastUsed), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Jamais utilisé</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteTemplate(template.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm border rounded-md bg-muted/20">
          <p>Aucun template sauvegardé pour les fichiers de type {sourceType.toUpperCase()}</p>
          <p className="mt-1">Configurez votre mapping puis sauvegardez-le comme template pour une utilisation future</p>
        </div>
      )}
    </div>
  );
};

export default TemplateManager;
