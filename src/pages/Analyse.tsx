import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import FileUploader from '@/components/FileUploader';
import { 
  BarChart2, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Upload,
  Table,
  Calendar 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getPreviousGradeFiles, processGradeFiles } from '@/utils/data-processing';
import { toast } from 'sonner';

const Analyse = () => {
  const [hasPreviousFiles, setHasPreviousFiles] = useState(false);
  const [currentGradeFiles, setCurrentGradeFiles] = useState<File[]>([]);
  const [previousGradeFiles, setPreviousGradeFiles] = useState<File[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  useEffect(() => {
    // Check if there are previous files to show appropriate analysis
    const prevFiles = getPreviousGradeFiles();
    setHasPreviousFiles(prevFiles && prevFiles.length > 0);
  }, []);
  
  const handleCurrentFilesAccepted = (files: File[]) => {
    console.log("Current files accepted:", files);
    setCurrentGradeFiles(files);
    setShowResults(false);
  };
  
  const handlePreviousFilesAccepted = (files: File[]) => {
    console.log("Previous files accepted:", files);
    setPreviousGradeFiles(files);
    setShowResults(false);
  };
  
  const handleStartAnalysis = async () => {
    if (currentGradeFiles.length === 0) {
      toast.error("Veuillez d'abord importer un tableau de notes");
      return;
    }
    
    setIsAnalyzing(true);
    setShowResults(false);
    
    try {
      // Use local processing only for subject analysis
      console.log("Utilisation de l'analyse locale pour l'analyse par matière...");
      const data = await processGradeFiles([...currentGradeFiles, ...previousGradeFiles]);
      
      // Set the analysis data
      setAnalysisData(data);
      setShowResults(true);
      toast.success("Analyse par matière terminée");
    } catch (error) {
      console.error("Erreur lors de l'analyse:", error);
      toast.error("Erreur lors de l'analyse des données");
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Analyse par matière</h1>
          <p className="section-description">
            Importez vos données et explorez les performances détaillées par matière pour identifier les tendances.
          </p>
        </div>
        
        {!showResults && (
          <div className="glass-panel p-5 space-y-6">
            <h2 className="text-lg font-medium mb-3">Importation des tableaux de notes</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-medium">Tableau de notes actuel</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Importez le tableau des moyennes de tous les élèves (format PDF, CSV ou Excel)
                </p>
                <FileUploader 
                  onFilesAccepted={handleCurrentFilesAccepted}
                  acceptedFileTypes={['.csv', '.xlsx', '.xls', '.pdf']}
                  maxFiles={1}
                  label="Importer le tableau des notes actuel"
                  description="Glissez-déposez votre fichier PDF, CSV ou Excel"
                />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Table className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-medium">Tableaux des trimestres précédents (optionnel)</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Importez les tableaux des trimestres précédents pour une analyse comparative
                </p>
                <FileUploader 
                  onFilesAccepted={handlePreviousFilesAccepted}
                  acceptedFileTypes={['.csv', '.xlsx', '.xls', '.pdf']}
                  maxFiles={3}
                  label="Importer les tableaux précédents"
                  description="Fichiers PDF, CSV ou Excel des périodes antérieures"
                />
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <Button 
                onClick={handleStartAnalysis} 
                className="bg-primary hover:bg-primary/90 text-white py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                size="lg"
                disabled={isAnalyzing || currentGradeFiles.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <BarChart2 className="mr-2 h-5 w-5" />
                    Commencer l'analyse
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
        
        {isAnalyzing && (
          <div className="glass-panel p-5 flex flex-col items-center justify-center py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
            <h3 className="text-lg font-medium mb-2">Analyse en cours...</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Nous analysons vos données par matière. Veuillez patienter un instant.
            </p>
          </div>
        )}
        
        {showResults && (
          <>
            <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Filter className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text"
                    placeholder="Filtrer par matière..."
                    className="glass-input pl-9 h-9 w-full text-sm"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <select className="glass-input text-sm h-9 pr-8">
                  <option>Tous les trimestres</option>
                  <option>Trimestre 3</option>
                  <option>Trimestre 2</option>
                  <option>Trimestre 1</option>
                </select>
                
                <select className="glass-input text-sm h-9 pr-8">
                  <option>Toutes les matières</option>
                  <option>Français</option>
                  <option>Mathématiques</option>
                  <option>Histoire-Géo</option>
                  <option>SVT</option>
                  <option>Anglais</option>
                </select>
              </div>
            </div>
            
            <AnalyticsDashboard data={analysisData} />
            
            {hasPreviousFiles && (
              <div className="glass-panel p-5 space-y-4 animate-slide-up">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Tendances clés identifiées</h3>
                  <div className="bg-primary/10 rounded-full p-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="bg-green-100 p-2 rounded-full">
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      </div>
                      <h4 className="ml-3 font-medium text-green-800">Progression significative</h4>
                    </div>
                    <p className="mt-2 text-sm text-green-700">
                      La classe a progressé de <strong>+0.8 point</strong> en moyenne générale 
                      depuis le trimestre précédent, particulièrement en Histoire-Géographie et SVT.
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-full">
                        <ArrowDownRight className="h-4 w-4 text-orange-600" />
                      </div>
                      <h4 className="ml-3 font-medium text-orange-800">Point d'attention</h4>
                    </div>
                    <p className="mt-2 text-sm text-orange-700">
                      Les résultats en Mathématiques sont en baisse de <strong>-0.9 point</strong>, 
                      ce qui pourrait nécessiter des mesures spécifiques.
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-full">
                        <BarChart2 className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="ml-3 font-medium text-blue-800">Distribution des notes</h4>
                    </div>
                    <p className="mt-2 text-sm text-blue-700">
                      La répartition est équilibrée avec <strong>61%</strong> des élèves au-dessus 
                      de la moyenne. Les résultats sont plus homogènes qu'au trimestre précédent.
                    </p>
                  </div>
                  
                  <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="bg-red-100 p-2 rounded-full">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <h4 className="ml-3 font-medium text-red-800">Élèves en difficulté</h4>
                    </div>
                    <p className="mt-2 text-sm text-red-700">
                      <strong>3 élèves</strong> sont en difficulté avec une moyenne générale inférieure à 8, 
                      principalement en Mathématiques et Français.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowResults(false)} 
                variant="outline"
                className="mr-2"
              >
                Importer de nouvelles données
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Analyse;
