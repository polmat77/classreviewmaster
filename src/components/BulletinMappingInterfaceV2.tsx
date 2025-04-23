
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import TemplateManager from '@/components/TemplateManager';
import { ChevronRight } from 'lucide-react';

interface BulletinMappingInterfaceV2Props {
  extractedText: string;
  rawData?: any[];
  fileType: 'pdf' | 'csv' | 'excel';
  onMappingComplete: (data: any) => void;
}

const BulletinMappingInterfaceV2: React.FC<BulletinMappingInterfaceV2Props> = ({
  extractedText,
  rawData,
  fileType,
  onMappingComplete
}) => {
  const [currentTab, setCurrentTab] = useState<string>('fields');
  const [mappingConfig, setMappingConfig] = useState<Record<string, any>>({});
  const [mappedData, setMappedData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Fonction pour appliquer un template de mapping
  const applyTemplate = (templateConfig: Record<string, any>) => {
    setMappingConfig(templateConfig);
    
    // Si nous avons déjà des données, nous pouvons les traiter immédiatement avec le nouveau mapping
    if (extractedText || rawData) {
      processData(templateConfig);
    }
  };

  // Fonction pour traiter les données avec la configuration de mapping
  const processData = (config: Record<string, any> = mappingConfig) => {
    setIsProcessing(true);

    try {
      // Ici, nous simulons le traitement des données
      // Dans une implémentation réelle, vous utiliseriez un service dédié pour extraire
      // les données structurées selon la configuration de mapping

      // Exemple très simplifié de traitement (à remplacer par votre logique réelle)
      setTimeout(() => {
        // Créer un exemple de données mappées selon le type de fichier
        const mockProcessedData = {
          source: fileType,
          mapping: config,
          metadata: {
            className: fileType === 'pdf' ? 'Extrait du texte PDF' : 'Données tabulaires',
            term: 'Trimestre 2',
            schoolYear: '2023-2024'
          },
          students: fileType === 'pdf' 
            ? extractStudentsFromText(extractedText, config)
            : extractStudentsFromTabular(rawData || [], config)
        };
        
        setMappedData(mockProcessedData);
        setIsProcessing(false);
        toast.success('Mapping effectué avec succès');
      }, 1500);
    } catch (error) {
      console.error('Erreur lors du traitement des données:', error);
      setIsProcessing(false);
      toast.error('Erreur lors du mapping des données');
    }
  };

  // Fonctions d'extraction simulées (à remplacer par votre logique réelle)
  const extractStudentsFromText = (text: string, config: Record<string, any>) => {
    // Simuler l'extraction des données d'étudiants à partir du texte PDF
    return [
      { id: 1, name: 'Martin Dupont', average: 14.5, subjects: generateSubjectData() },
      { id: 2, name: 'Julie Martin', average: 16.2, subjects: generateSubjectData() },
      { id: 3, name: 'Thomas Bernard', average: 12.8, subjects: generateSubjectData() }
    ];
  };

  const extractStudentsFromTabular = (data: any[], config: Record<string, any>) => {
    // Simuler l'extraction à partir des données tabulaires
    return data.slice(0, 3).map((row, index) => ({
      id: index + 1,
      name: row[0] || `Élève ${index + 1}`,
      average: Number((Math.random() * 5 + 12).toFixed(1)),
      subjects: generateSubjectData()
    }));
  };

  const generateSubjectData = () => {
    const subjects = ['Mathématiques', 'Français', 'Histoire-Géo', 'Anglais', 'SVT'];
    return subjects.map(subject => ({
      name: subject,
      grade: Number((Math.random() * 8 + 10).toFixed(1)),
      comment: `Commentaire pour ${subject}`
    }));
  };

  // Fonction pour finaliser le mapping et envoyer les données
  const finalizeMappingAndSubmit = () => {
    if (!mappedData) {
      toast.error('Veuillez d\'abord effectuer le mapping');
      return;
    }
    
    onMappingComplete(mappedData);
  };

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="fields">Mapping des champs</TabsTrigger>
          <TabsTrigger value="preview">Aperçu</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card className="p-4">
            <TemplateManager
              currentMapping={mappingConfig}
              sourceType={fileType}
              onTemplateSelect={applyTemplate}
            />
          </Card>
          
          <div className="flex justify-end">
            <Button onClick={() => setCurrentTab('fields')}>
              Configurer le mapping
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card className="p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configuration du mapping</h3>
              <p className="text-sm text-muted-foreground">
                Configurez comment les données sont extraites de votre fichier {fileType.toUpperCase()}.
              </p>

              {/* Ici, vous pouvez implémenter l'interface de mapping spécifique à votre cas d'utilisation */}
              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-sm italic">
                  Interface de mapping à compléter selon vos besoins spécifiques.
                </p>
              </div>

              <Button 
                onClick={() => processData()} 
                disabled={isProcessing}
              >
                {isProcessing ? 'Traitement en cours...' : 'Appliquer le mapping'}
              </Button>
            </div>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentTab('templates')}>
              Retour aux templates
            </Button>
            <Button onClick={() => setCurrentTab('preview')} disabled={!mappedData}>
              Voir l'aperçu
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card className="p-4">
            {mappedData ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Aperçu des données mappées</h3>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Métadonnées</h4>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-muted/30 p-2 rounded">
                      <span className="font-medium">Classe:</span> {mappedData.metadata.className}
                    </div>
                    <div className="bg-muted/30 p-2 rounded">
                      <span className="font-medium">Période:</span> {mappedData.metadata.term}
                    </div>
                    <div className="bg-muted/30 p-2 rounded">
                      <span className="font-medium">Année:</span> {mappedData.metadata.schoolYear}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Élèves ({mappedData.students.length})</h4>
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Moyenne</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matières</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {mappedData.students.map((student: any) => (
                          <tr key={student.id}>
                            <td className="px-4 py-2 text-sm">{student.name}</td>
                            <td className="px-4 py-2 text-sm">{student.average}/20</td>
                            <td className="px-4 py-2 text-sm">{student.subjects.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucune donnée mappée disponible</p>
                <p className="text-sm">Configurez le mapping et appliquez-le pour voir un aperçu</p>
              </div>
            )}
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentTab('fields')}>
              Modifier le mapping
            </Button>
            <Button 
              onClick={finalizeMappingAndSubmit} 
              disabled={!mappedData}
              className="bg-primary"
            >
              Finaliser et continuer
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {isProcessing && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin h-6 w-6 border-b-2 border-primary rounded-full mb-2"></div>
          <p className="text-sm text-muted-foreground">Traitement des données en cours...</p>
        </div>
      )}
    </div>
  );
};

export default BulletinMappingInterfaceV2;
