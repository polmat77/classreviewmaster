import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ArrowUpRight, Loader2, AlertCircle, Upload, File, X, FileUp, BarChart3, PieChart } from 'lucide-react';
import * as XLSX from 'xlsx';
import { parseGradesFile, calculateStatistics, Student } from '@/utils/CSVParser';

interface AnalysisData {
  trimester: string;
  classe: string;
  eleves: Student[];
  matieres: string[];
  statistiques: {
    moyenneGenerale: number;
    moyennesParMatiere: Record<string, number>;
    distribution: { tranche: string; count: number; pourcentage: number }[];
  };
}

const ResultsAnalysisPage: React.FC = () => {
  const [files, setFiles] = useState<{ file: File; trimester: string; processed: boolean }[]>([]);
  const [analysisData, setAnalysisData] = useState<AnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fonction pour analyser les fichiers téléchargés
  const handleAnalyzeFiles = async () => {
    if (files.length === 0) {
      toast.error('Veuillez d\'abord charger des fichiers de résultats.');
      return;
    }

    const unprocessedFiles = files.filter(f => !f.processed);
    if (unprocessedFiles.length > 0) {
      toast.warning('Certains fichiers n\'ont pas encore été traités. Veuillez les traiter avant l\'analyse.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // L'analyse est déjà faite lors du traitement des fichiers
      // Nous affichons simplement les résultats
      setActiveTab('overview');
      toast.success('Analyse terminée avec succès');
    } catch (err) {
      console.error('Erreur lors de l\'analyse:', err);
      setError(`Erreur lors de l'analyse: ${err.message}`);
      toast.error('Une erreur est survenue lors de l\'analyse');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Traiter un fichier individuel
  const processFile = async (fileItem: { file: File; trimester: string; processed: boolean }, index: number) => {
    setIsLoading(true);
    try {
      const parsedData = await parseGradesFile(fileItem.file);
      
      // Calculer les statistiques
      const stats = calculateStatistics(parsedData.eleves, parsedData.matieres);
      
      // Créer le nouvel objet d'analyse
      const newAnalysisData: AnalysisData = {
        trimester: fileItem.trimester,
        classe: parsedData.classeInfo.classe || '',
        eleves: parsedData.eleves,
        matieres: parsedData.matieres,
        statistiques: stats
      };
      
      // Mettre à jour l'état des fichiers
      setFiles(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], processed: true };
        return updated;
      });
      
      // Ajouter les nouvelles données d'analyse
      setAnalysisData(prev => [...prev, newAnalysisData].sort((a, b) => {
        const trimA = parseInt(a.trimester.replace(/\D/g, ''));
        const trimB = parseInt(b.trimester.replace(/\D/g, ''));
        return trimA - trimB;
      }));
      
      toast.success(`Fichier ${fileItem.file.name} traité avec succès`);
    } catch (error) {
      console.error('Erreur lors du traitement du fichier:', error);
      toast.error(`Erreur lors du traitement de ${fileItem.file.name}: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Gestion du drag and drop
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const newFiles = acceptedFiles.map(file => ({
      file,
      trimester: getTrimesterFromFileName(file.name) || `Trimestre ${files.length + 1}`,
      processed: false
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${acceptedFiles.length} fichier(s) ajouté(s)`);
  };

  // Extraire le trimestre à partir du nom de fichier
  const getTrimesterFromFileName = (filename: string): string | null => {
    const trimRegex = /tr(?:im(?:estre)?)?\s*([1-3])/i;
    const match = filename.match(trimRegex);
    
    if (match) {
      return `Trimestre ${match[1]}`;
    }
    return null;
  };

  // Mise à jour du trimestre d'un fichier
  const updateTrimester = (index: number, value: string) => {
    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[index] = { ...newFiles[index], trimester: value };
      return newFiles;
    });
  };

  // Supprimer un fichier
  const removeFile = (index: number) => {
    const file = files[index];
    setFiles(prev => prev.filter((_, i) => i !== index));
    
    // Si le fichier était traité, supprimer également ses données d'analyse
    if (file.processed) {
      setAnalysisData(prev => prev.filter(data => data.trimester !== file.trimester));
    }
    
    toast.info(`Fichier supprimé`);
  };

  // Configuration de la zone de dépôt
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    multiple: true
  });

  // Préparation des données pour les graphiques
  const prepareAverageChartData = () => {
    return analysisData.map(data => ({
      name: data.trimester,
      moyenne: Number(data.statistiques.moyenneGenerale.toFixed(2))
    }));
  };

  const prepareDistributionChartData = () => {
    if (analysisData.length === 0) return [];
    
    // Créer un tableau de tranches
    const tranches = ['0 - 5', '5 - 10', '10 - 15', '15 - 20'];
    
    return tranches.map(tranche => {
      const data: Record<string, any> = { name: tranche };
      
      analysisData.forEach(trimData => {
        const distribution = trimData.statistiques.distribution.find(d => d.tranche === tranche);
        if (distribution) {
          data[trimData.trimester] = distribution.count;
          data[`${trimData.trimester} %`] = distribution.pourcentage;
        }
      });
      
      return data;
    });
  };
  
  const prepareSubjectsChartData = () => {
    if (analysisData.length === 0) return [];
    
    // Récupérer toutes les matières existantes
    const allSubjects = new Set<string>();
    analysisData.forEach(data => {
      Object.keys(data.statistiques.moyennesParMatiere).forEach(subject => {
        if (subject !== 'MOYENNE') {
          allSubjects.add(subject);
        }
      });
    });
    
    // Créer les données pour chaque matière
    return Array.from(allSubjects).map(subject => {
      const data: Record<string, any> = { name: subject };
      
      analysisData.forEach(trimData => {
        const average = trimData.statistiques.moyennesParMatiere[subject];
        if (average !== undefined) {
          data[trimData.trimester] = Number(average.toFixed(2));
        }
      });
      
      return data;
    });
  };
  
  const getEvolutionStats = () => {
    if (analysisData.length <= 1) return null;
    
    const firstTrim = analysisData[0];
    const lastTrim = analysisData[analysisData.length - 1];
    
    const diff = lastTrim.statistiques.moyenneGenerale - firstTrim.statistiques.moyenneGenerale;
    
    return {
      difference: diff.toFixed(2),
      isPositive: diff >= 0
    };
  };
  
  // Calcul du nombre d'élèves en difficulté (< 10)
  const getStudentsInDifficulty = () => {
    if (analysisData.length === 0) return 0;
    
    const lastTrim = analysisData[analysisData.length - 1];
    return lastTrim.statistiques.distribution
      .filter(d => d.tranche === '0 - 5' || d.tranche === '5 - 10')
      .reduce((sum, d) => sum + d.count, 0);
  };
  
  // Calcul du nombre d'élèves en réussite (>= 15)
  const getSuccessfulStudents = () => {
    if (analysisData.length === 0) return 0;
    
    const lastTrim = analysisData[analysisData.length - 1];
    return lastTrim.statistiques.distribution
      .filter(d => d.tranche === '15 - 20')
      .reduce((sum, d) => sum + d.count, 0);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analyse des résultats</h1>
        <p className="text-muted-foreground">
          Importez les tableaux de moyennes pour analyser les résultats des élèves par trimestre.
        </p>
      </div>

      <Separator />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileUp className="mr-2 h-5 w-5" />
            Importer des fichiers
          </CardTitle>
          <CardDescription>
            Importez les tableaux de moyennes au format XLSX, XLS ou CSV.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Déposez les fichiers ici...' : 'Glissez-déposez des fichiers, ou cliquez pour sélectionner'}
              </p>
              <p className="text-sm text-muted-foreground">
                Formats supportés: XLSX, XLS, CSV
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-sm mb-2">Fichiers importés ({files.length})</h3>
              <div className="space-y-2">
                {files.map((fileItem, index) => (
                  <div key={index} className="flex items-center justify-between bg-background p-3 rounded-md border">
                    <div className="flex items-center space-x-3">
                      <File className="h-5 w-5 text-primary" />
                      <div className="text-sm truncate max-w-[200px]">{fileItem.file.name}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={fileItem.trimester}
                        onChange={(e) => updateTrimester(index, e.target.value)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="Trimestre 1">Trimestre 1</option>
                        <option value="Trimestre 2">Trimestre 2</option>
                        <option value="Trimestre 3">Trimestre 3</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processFile(fileItem, index)}
                        disabled={isLoading || fileItem.processed}
                      >
                        {isLoading && index === files.findIndex(f => !f.processed) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Traitement...
                          </>
                        ) : (
                          fileItem.processed ? 'Traité' : 'Traiter'
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleAnalyzeFiles} 
            disabled={isAnalyzing || files.length === 0 || files.some(f => !f.processed)}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyser les résultats
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {analysisData.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Moyenne générale</CardTitle>
                <CardDescription>
                  Dernier trimestre: {analysisData[analysisData.length-1].trimester}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {analysisData[analysisData.length-1].statistiques.moyenneGenerale.toFixed(2)}/20
                </div>
                {analysisData.length > 1 && getEvolutionStats() && (
                  <div className={`flex items-center mt-2 ${getEvolutionStats()?.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    <ArrowUpRight className={`h-4 w-4 mr-1 ${!getEvolutionStats()?.isPositive && 'rotate-180'}`} />
                    <span>{getEvolutionStats()?.difference} points depuis {analysisData[0].trimester}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Élèves en difficulté</CardTitle>
                <CardDescription>Notes inférieures à 10</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {getStudentsInDifficulty()}
                  <span className="text-lg ml-1 font-normal text-muted-foreground">
                    élèves
                  </span>
                </div>
                {analysisData.length > 1 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Consultez l'onglet "Répartition" pour l'évolution
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Élèves en réussite</CardTitle>
                <CardDescription>Notes supérieures à 15</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {getSuccessfulStudents()}
                  <span className="text-lg ml-1 font-normal text-muted-foreground">
                    élèves
                  </span>
                </div>
                {analysisData.length > 1 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Consultez l'onglet "Répartition" pour l'évolution
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="distribution">Répartition</TabsTrigger>
              <TabsTrigger value="subjects">Par matière</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Évolution de la moyenne générale</CardTitle>
                  <CardDescription>
                    Évolution de la moyenne de classe par trimestre
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={prepareAverageChartData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 20]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="moyenne"
                          name="Moyenne générale"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="distribution" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Répartition des moyennes</CardTitle>
                  <CardDescription>
                    Nombre d'élèves par tranche de moyenne
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={prepareDistributionChartData()}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        {analysisData.map((data, index) => (
                          <Bar 
                            key={data.trimester}
                            dataKey={data.trimester} 
                            name={data.trimester}
                            fill={`hsl(${index * 60 + 200}, 70%, 50%)`} 
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="subjects" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Moyennes par matière</CardTitle>
                  <CardDescription>
                    Évolution des moyennes par matière et par trimestre
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={prepareSubjectsChartData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 100,
                        }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 20]} />
                        <YAxis type="category" dataKey="name" width={150} />
                        <Tooltip />
                        <Legend />
                        {analysisData.map((data, index) => (
                          <Bar 
                            key={data.trimester}
                            dataKey={data.trimester} 
                            name={data.trimester}
                            fill={`hsl(${index * 60 + 200}, 70%, 50%)`} 
                            barSize={20}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};