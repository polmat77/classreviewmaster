
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, Save, RefreshCw, Table as TableIcon, ChevronRight } from 'lucide-react';
import { createMappingTemplate, applyMapping, MappingTemplate } from '@/utils/bulletin-mapping';

interface BulletinMappingInterfaceProps {
  extractedText: string;
  onMappingComplete: (data: any) => void;
  fileType: 'pdf' | 'csv' | 'excel';
  rawData?: any; // Pour les données CSV/Excel
}

const BulletinMappingInterface: React.FC<BulletinMappingInterfaceProps> = ({
  extractedText,
  onMappingComplete,
  fileType,
  rawData
}) => {
  const [currentTab, setCurrentTab] = useState<string>('extract');
  const [mappingTemplate, setMappingTemplate] = useState<MappingTemplate>({
    studentNamePattern: '',
    studentIdPattern: '',
    subjectPattern: '',
    gradePattern: '',
    classAveragePattern: '',
    teacherCommentPattern: '',
    termPattern: '',
    classNamePattern: '',
    schoolNamePattern: '',
    customRegex: '',
    delimiters: {
      student: '',
      subject: '',
    },
    columnMappings: {
      studentName: -1,
      studentId: -1,
      subject: -1,
      grade: -1,
      classAverage: -1,
      teacherComment: -1,
    }
  });
  
  const [mappingResult, setMappingResult] = useState<any>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<{name: string, template: MappingTemplate}[]>([]);
  const [isApplyingMapping, setIsApplyingMapping] = useState<boolean>(false);
  
  // Charger les templates sauvegardés au démarrage
  useEffect(() => {
    try {
      const savedTemplatesJson = localStorage.getItem('bulletinMappingTemplates');
      if (savedTemplatesJson) {
        const templates = JSON.parse(savedTemplatesJson);
        setSavedTemplates(Array.isArray(templates) ? templates : []);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des templates:", error);
    }
  }, []);
  
  // Appliquer le mapping et voir les résultats
  const handleApplyMapping = async () => {
    setIsApplyingMapping(true);
    try {
      const result = await applyMapping(
        fileType === 'pdf' ? extractedText : rawData,
        mappingTemplate,
        fileType
      );
      
      setMappingResult(result);
      setCurrentTab('result');
      toast.success('Mapping appliqué avec succès');
    } catch (error) {
      console.error("Erreur lors de l'application du mapping:", error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsApplyingMapping(false);
    }
  };
  
  // Sauvegarder le template actuel
  const saveTemplate = () => {
    if (!templateName.trim()) {
      toast.error('Veuillez saisir un nom pour ce template');
      return;
    }
    
    try {
      // Ajouter ou mettre à jour le template
      const updatedTemplates = [...savedTemplates];
      const existingIndex = updatedTemplates.findIndex(t => t.name === templateName);
      
      if (existingIndex >= 0) {
        updatedTemplates[existingIndex] = { name: templateName, template: mappingTemplate };
      } else {
        updatedTemplates.push({ name: templateName, template: mappingTemplate });
      }
      
      // Sauvegarder dans localStorage
      localStorage.setItem('bulletinMappingTemplates', JSON.stringify(updatedTemplates));
      setSavedTemplates(updatedTemplates);
      
      toast.success('Template sauvegardé');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du template:", error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };
  
  // Charger un template sauvegardé
  const loadTemplate = (templateName: string) => {
    const template = savedTemplates.find(t => t.name === templateName);
    if (template) {
      setMappingTemplate(template.template);
      setTemplateName(template.name);
      toast.success(`Template "${template.name}" chargé`);
    }
  };
  
  // Essayer de générer un template automatiquement
  const generateTemplateAutomatically = () => {
    try {
      const generatedTemplate = createMappingTemplate(
        fileType === 'pdf' ? extractedText : rawData,
        fileType
      );
      
      setMappingTemplate(generatedTemplate);
      toast.success('Template généré automatiquement');
    } catch (error) {
      console.error("Erreur lors de la génération automatique:", error);
      toast.error('Impossible de générer automatiquement. Veuillez configurer manuellement.');
    }
  };
  
  // Accepter le résultat et terminer le mapping
  const acceptMapping = () => {
    if (mappingResult) {
      onMappingComplete(mappingResult);
      toast.success('Données importées avec succès');
    } else {
      toast.error('Aucun résultat de mapping disponible');
    }
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="extract" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Données extraites</span>
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex items-center space-x-2">
            <TableIcon className="h-4 w-4" />
            <span>Configuration du mapping</span>
          </TabsTrigger>
          <TabsTrigger value="result" className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4" />
            <span>Résultats</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Onglet d'extraction */}
        <TabsContent value="extract" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-2">Données extraites du fichier</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Voici le contenu extrait de votre fichier. Vous pourrez définir comment interpréter ces données dans l'onglet suivant.
            </p>
            
            <ScrollArea className="h-[400px] w-full border rounded-md p-4 bg-muted/20">
              {fileType === 'pdf' ? (
                <pre className="text-sm whitespace-pre-wrap">{extractedText}</pre>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      {rawData && rawData[0] && 
                        Object.keys(rawData[0]).map((header, idx) => (
                          <TableHead key={idx}>{header}</TableHead>
                        ))
                      }
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawData && rawData.slice(0, 10).map((row: any, rowIdx: number) => (
                      <TableRow key={rowIdx}>
                        {Object.values(row).map((cell: any, cellIdx: number) => (
                          <TableCell key={cellIdx}>{cell?.toString() || ''}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
            
            <div className="flex justify-end mt-4">
              <Button onClick={() => setCurrentTab('mapping')} className="flex items-center">
                Configurer le mapping <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        {/* Onglet de mapping */}
        <TabsContent value="mapping" className="space-y-4">
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Configuration du mapping</h3>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={generateTemplateAutomatically}
                  className="text-sm"
                >
                  Générer automatiquement
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Templates sauvegardés</h4>
                
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nom du template" 
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={saveTemplate}
                    title="Sauvegarder le template"
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
                
                {savedTemplates.length > 0 && (
                  <div className="border rounded-md p-3 space-y-2">
                    <Label>Charger un template</Label>
                    <Select onValueChange={loadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un template" />
                      </SelectTrigger>
                      <SelectContent>
                        {savedTemplates.map((template, index) => (
                          <SelectItem key={index} value={template.name}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {fileType === 'pdf' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Motif pour identifier les noms d'élèves</Label>
                      <Input 
                        placeholder="Ex: Élève: ([A-Za-z\s]+)" 
                        value={mappingTemplate.studentNamePattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, studentNamePattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Motif pour identifier les matières</Label>
                      <Input 
                        placeholder="Ex: ([A-Za-z\-\s]+):" 
                        value={mappingTemplate.subjectPattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, subjectPattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Motif pour identifier les notes</Label>
                      <Input 
                        placeholder="Ex: Note: (\d+([.,]\d+)?)" 
                        value={mappingTemplate.gradePattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, gradePattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Délimiteur entre élèves</Label>
                      <Input 
                        placeholder="Ex: ----------" 
                        value={mappingTemplate.delimiters.student}
                        onChange={(e) => setMappingTemplate({
                          ...mappingTemplate, 
                          delimiters: {...mappingTemplate.delimiters, student: e.target.value}
                        })}
                      />
                    </div>
                  </div>
                )}
                
                {(fileType === 'csv' || fileType === 'excel') && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Correspondance des colonnes</h4>
                    
                    <div className="space-y-2">
                      <Label>Colonne des noms d'élèves</Label>
                      <Select 
                        value={mappingTemplate.columnMappings.studentName.toString()} 
                        onValueChange={(value) => setMappingTemplate({
                          ...mappingTemplate,
                          columnMappings: {
                            ...mappingTemplate.columnMappings,
                            studentName: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">Non utilisé</SelectItem>
                          {rawData && rawData[0] && 
                            Object.keys(rawData[0]).map((header, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {header}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Colonne des matières</Label>
                      <Select 
                        value={mappingTemplate.columnMappings.subject.toString()}
                        onValueChange={(value) => setMappingTemplate({
                          ...mappingTemplate,
                          columnMappings: {
                            ...mappingTemplate.columnMappings,
                            subject: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">Non utilisé</SelectItem>
                          {rawData && rawData[0] && 
                            Object.keys(rawData[0]).map((header, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {header}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Colonne des notes</Label>
                      <Select 
                        value={mappingTemplate.columnMappings.grade.toString()}
                        onValueChange={(value) => setMappingTemplate({
                          ...mappingTemplate,
                          columnMappings: {
                            ...mappingTemplate.columnMappings,
                            grade: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">Non utilisé</SelectItem>
                          {rawData && rawData[0] && 
                            Object.keys(rawData[0]).map((header, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {header}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Colonne des moyennes de classe</Label>
                      <Select 
                        value={mappingTemplate.columnMappings.classAverage.toString()}
                        onValueChange={(value) => setMappingTemplate({
                          ...mappingTemplate,
                          columnMappings: {
                            ...mappingTemplate.columnMappings,
                            classAverage: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">Non utilisé</SelectItem>
                          {rawData && rawData[0] && 
                            Object.keys(rawData[0]).map((header, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {header}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Colonne des commentaires</Label>
                      <Select 
                        value={mappingTemplate.columnMappings.teacherComment.toString()}
                        onValueChange={(value) => setMappingTemplate({
                          ...mappingTemplate,
                          columnMappings: {
                            ...mappingTemplate.columnMappings,
                            teacherComment: parseInt(value)
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une colonne" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">Non utilisé</SelectItem>
                          {rawData && rawData[0] && 
                            Object.keys(rawData[0]).map((header, idx) => (
                              <SelectItem key={idx} value={idx.toString()}>
                                {header}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h4 className="font-medium text-sm">Options avancées</h4>
                
                {fileType === 'pdf' && (
                  <>
                    <div className="space-y-2">
                      <Label>Motif pour identifier les moyennes de classe</Label>
                      <Input 
                        placeholder="Ex: Moyenne classe: (\d+([.,]\d+)?)" 
                        value={mappingTemplate.classAveragePattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, classAveragePattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Motif pour identifier les commentaires</Label>
                      <Input 
                        placeholder="Ex: Commentaire: (.+)" 
                        value={mappingTemplate.teacherCommentPattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, teacherCommentPattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Motif pour identifier le trimestre</Label>
                      <Input 
                        placeholder="Ex: Trimestre (\d)" 
                        value={mappingTemplate.termPattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, termPattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Motif pour identifier la classe</Label>
                      <Input 
                        placeholder="Ex: Classe: ([A-Za-z0-9\s]+)" 
                        value={mappingTemplate.classNamePattern}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, classNamePattern: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Expression régulière personnalisée</Label>
                      <Textarea 
                        placeholder="Entrez une regex personnalisée" 
                        value={mappingTemplate.customRegex}
                        onChange={(e) => setMappingTemplate({...mappingTemplate, customRegex: e.target.value})}
                        className="min-h-[80px]"
                      />
                    </div>
                  </>
                )}
                
                <div className="pt-4">
                  <Button 
                    onClick={handleApplyMapping}
                    disabled={isApplyingMapping}
                    className="w-full"
                  >
                    {isApplyingMapping ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Application en cours...
                      </>
                    ) : 'Appliquer le mapping et voir les résultats'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        {/* Onglet des résultats */}
        <TabsContent value="result" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-2">Résultats du mapping</h3>
            
            {mappingResult ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Élèves identifiés: {mappingResult.students?.length || 0}</Label>
                  <ScrollArea className="h-[150px] w-full border rounded-md p-2 bg-muted/20">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {mappingResult.students?.map((student: any, index: number) => (
                        <div key={index} className="p-2 bg-card rounded border">
                          {student.name}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="space-y-2">
                  <Label>Matières identifiées: {mappingResult.subjects?.length || 0}</Label>
                  <ScrollArea className="h-[100px] w-full border rounded-md p-2 bg-muted/20">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {mappingResult.subjects?.map((subject: string, index: number) => (
                        <div key={index} className="p-2 bg-card rounded border">
                          {subject}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                <div className="space-y-2">
                  <Label>Aperçu des données</Label>
                  <ScrollArea className="h-[300px] w-full border rounded-md bg-muted/20">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Élève</TableHead>
                          <TableHead>Matière</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead>Moyenne classe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappingResult.students?.slice(0, 10).flatMap((student: any) => 
                          Object.entries(student.grades || {}).map(([subject, grade]: [string, any], idx: number) => (
                            <TableRow key={`${student.name}-${subject}-${idx}`}>
                              <TableCell>{student.name}</TableCell>
                              <TableCell>{subject}</TableCell>
                              <TableCell>{grade}</TableCell>
                              <TableCell>{student.classAvg?.[subject] || '-'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
                
                <div className="pt-4 flex justify-end">
                  <Button onClick={acceptMapping} className="flex items-center">
                    Terminer l'import <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border rounded-md p-8 text-center bg-muted/20">
                <p className="text-muted-foreground">
                  Appliquez le mapping pour voir les résultats ici
                </p>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulletinMappingInterface;
