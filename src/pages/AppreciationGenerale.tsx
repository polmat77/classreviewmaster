
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import AppreciationGenerator from '@/components/AppreciationGenerator';
import FileUploader from '@/components/FileUploader';
import { KeyRound, Lightbulb, AlertCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { processGradeFiles } from '@/utils/data-processing';
import { toast } from 'sonner';

const AppreciationGenerale = () => {
  const [currentClassReportFiles, setCurrentClassReportFiles] = useState<File[]>([]);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCurrentReportUpload = (files: File[]) => {
    setCurrentClassReportFiles(files);
  };

  const analyzeFiles = async () => {
    if (currentClassReportFiles.length === 0) {
      toast.error("Veuillez importer le bulletin de classe actuel");
      return;
    }

    setIsAnalyzing(true);
    try {
      const data = await processGradeFiles([...currentClassReportFiles]);
      setAnalysisData(data);
      toast.success("Analyse des bulletins terminée");
    } catch (error) {
      console.error('Error analyzing files:', error);
      toast.error("Erreur lors de l'analyse des fichiers");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Appréciation générale de classe</h1>
          <p className="section-description">
            Générez et personnalisez une appréciation globale pour l'ensemble de la classe basée sur l'analyse des données actuelles et historiques.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-5 space-y-5">
              <h2 className="text-lg font-medium">Importation des documents</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-medium mb-2">Bulletin de classe actuel</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Importez le bulletin de la classe avec les appréciations des enseignants pour la période actuelle.
                  </p>
                  <FileUploader 
                    onFilesAccepted={handleCurrentReportUpload}
                    acceptedFileTypes={['.pdf', '.csv', '.xlsx', '.xls']}
                    maxFiles={1}
                    label="Importer le bulletin de classe actuel"
                    description="Le document PDF contenant les appréciations des enseignants"
                  />
                </div>
                
                <button
                  onClick={analyzeFiles}
                  disabled={isAnalyzing || currentClassReportFiles.length === 0}
                  className={cn(
                    "button-primary w-full flex items-center justify-center space-x-2 py-3",
                    (isAnalyzing || currentClassReportFiles.length === 0) && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isAnalyzing ? (
                    <>
                      <span className="animate-spin mr-2">⌛</span>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Analyser les documents
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <AppreciationGenerator 
              type="class"
              analysisData={analysisData}
              maxChars={255}
            />
          </div>
          
          <div className="space-y-4">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <h3 className="ml-3 font-medium">Points clés à mentionner</h3>
              </div>
              
              <ul className="space-y-2 pl-10 text-sm list-disc">
                <li>Ambiance générale de la classe</li>
                <li>Évolution globale des résultats</li>
                <li>Points forts collectifs</li>
                <li>Axes d'amélioration</li>
                <li>Encouragements pour le prochain trimestre</li>
              </ul>
            </div>
            
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <h3 className="ml-3 font-medium">Conseils de rédaction</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Soyez précis :</span> Évitez les généralités 
                  et appuyez-vous sur les données analysées.
                </p>
                
                <p>
                  <span className="font-medium">Équilibrez :</span> Mentionnez à la fois les 
                  points positifs et les axes d'amélioration.
                </p>
                
                <p>
                  <span className="font-medium">Personnalisez :</span> Adaptez le ton selon 
                  le profil global de la classe et son évolution.
                </p>
                
                <p>
                  <span className="font-medium">Comparez :</span> Utilisez les données historiques 
                  pour souligner les progressions ou les points de vigilance.
                </p>
              </div>
            </div>
            
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="flex space-x-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-sm">
                  <p>
                    L'appréciation générée doit respecter la limite de <span className="font-medium">255 caractères</span> 
                    pour être compatible avec les systèmes de gestion des bulletins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AppreciationGenerale;
