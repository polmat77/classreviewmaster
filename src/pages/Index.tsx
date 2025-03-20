
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import FileUploader from '@/components/FileUploader';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { ChevronRight, Info, FileSpreadsheet, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { processGradeFiles } from '@/utils/data-processing';

const Index = () => {
  const [hasUploaded, setHasUploaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processedData, setProcessedData] = useState<any>(null);
  
  const handleFilesAccepted = async (files: File[]) => {
    setIsLoading(true);
    
    try {
      // In a real app, this would actually process the files
      const data = await processGradeFiles(files);
      setProcessedData(data);
      setHasUploaded(true);
    } catch (error) {
      console.error('Error processing files:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Chargement des moyennes</h1>
          <p className="section-description">
            Importez vos fichiers Excel ou CSV pour commencer l'analyse.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <FileUploader 
              onFilesAccepted={handleFilesAccepted}
              label="Importer vos fichiers de notes"
              description="Glissez-déposez vos fichiers Excel/CSV depuis PRONOTE ou cliquez pour parcourir"
            />
          </div>
          
          <div className="glass-panel p-5 space-y-4">
            <h3 className="font-medium">Guide d'importation</h3>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Fichiers acceptés</h4>
                  <p className="text-xs text-muted-foreground">
                    Format Excel (.xlsx, .xls) ou CSV (.csv) exportés depuis PRONOTE
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Données requises</h4>
                  <p className="text-xs text-muted-foreground">
                    Les fichiers doivent contenir au minimum les noms et moyennes des élèves.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="bg-primary/10 rounded-full p-1.5 mt-0.5">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-medium">Confidentialité</h4>
                  <p className="text-xs text-muted-foreground">
                    Vos données restent sur votre appareil et ne sont jamais stockées sur nos serveurs.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {hasUploaded && (
          <div className={cn("space-y-6", isLoading && "opacity-60 pointer-events-none")}>
            <h2 className="text-xl font-medium">Analyse préliminaire</h2>
            
            <AnalyticsDashboard />
            
            <div className="flex justify-end">
              <Link 
                to="/appreciation-generale" 
                className="button-primary flex items-center space-x-2"
              >
                <span>Continuer vers l'appréciation générale</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;
