
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import FileUploader from '@/components/FileUploader';
import BulletinMappingInterfaceV2 from '@/components/BulletinMappingInterfaceV2';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { extractTextFromPDF } from '@/utils/pdf-service';
import { parseTabularFile } from '@/utils/bulletin-mapping';
import { processGradeFiles } from '@/utils/data-processing';
import { FileSpreadsheet, FileText, ChevronRight, BarChart2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const ImportationBulletins: React.FC = () => {
  const navigate = useNavigate();
  
  const [currentTab, setCurrentTab] = useState<string>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [tabularFile, setTabularFile] = useState<File | null>(null);
  const [tabularData, setTabularData] = useState<any[]>([]);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [mappedData, setMappedData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showMapping, setShowMapping] = useState<boolean>(false);
  
  // Gérer l'upload d'un fichier PDF
  const handlePdfUploaded = async (files: File[]) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setPdfFile(file);
    setPdfText('');
    setMappedData(null);
    setShowMapping(false);
    
    // Extraire le texte automatiquement
    await extractPdfText(file);
  };
  
  // Gérer l'upload d'un fichier Excel/CSV
  const handleTabularFileUploaded = async (files: File[]) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setTabularFile(file);
    setTabularData([]);
    setMappedData(null);
    setShowMapping(false);
    
    // Parser le fichier automatiquement
    await parseFile(file);
  };
  
  // Extraire le texte du PDF
  const extractPdfText = async (file: File) => {
    setIsExtracting(true);
    try {
      const text = await extractTextFromPDF(file, (progress) => {
        // On pourrait afficher la progression ici
      });
      setPdfText(text);
      toast.success('Extraction du texte terminée');
      setShowMapping(true);
    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte:', error);
      toast.error(`Erreur lors de l'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsExtracting(false);
    }
  };
  
  // Parser un fichier Excel/CSV
  const parseFile = async (file: File) => {
    setIsParsing(true);
    try {
      const data = await parseTabularFile(file);
      setTabularData(data);
      toast.success('Fichier analysé avec succès');
      setShowMapping(true);
    } catch (error) {
      console.error('Erreur lors du parsing du fichier:', error);
      toast.error(`Erreur lors de l'analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsParsing(false);
    }
  };
  
  // Gérer la fin du mapping
  const handleMappingComplete = async (data: any) => {
    setMappedData(data);
    
    // Préparer les données pour le traitement par processGradeFiles
    try {
      setIsProcessing(true);
      
      // Créer un "faux" fichier pour le traitement
      const processedData = await processGradeFiles([
        new File(
          [JSON.stringify(data)], 
          `mapped-data-${Date.now()}.json`, 
          { type: 'application/json' }
        )
      ]);
      
      // Stocker les données dans le localStorage pour les récupérer dans d'autres pages
      localStorage.setItem('analysisData', JSON.stringify(processedData));
      
      toast.success('Analyse terminée avec succès');
      
      // Rediriger vers la page d'analyse
      navigate('/appreciation-generale', { 
        state: { analysisData: processedData }
      });
    } catch (error) {
      console.error('Erreur lors du traitement final:', error);
      toast.error(`Erreur lors de l'analyse finale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Importation de bulletins scolaires</h1>
          <p className="section-description">
            Importez des bulletins scolaires dans différents formats pour les analyser.
          </p>
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="pdf" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Bulletins PDF</span>
            </TabsTrigger>
            <TabsTrigger value="tabular" className="flex items-center space-x-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Fichiers Excel/CSV</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pdf" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-medium mb-4">Importation de bulletins PDF</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Importez un fichier PDF contenant un ou plusieurs bulletins scolaires. Le système extraira le texte pour vous permettre de configurer le mapping des données.
              </p>
              
              <FileUploader
                onFilesAccepted={handlePdfUploaded}
                acceptedFileTypes={['.pdf']}
                maxFiles={1}
                label="Importer un bulletin PDF"
                description="Glissez-déposez votre fichier PDF ou cliquez pour parcourir"
              />
              
              {isExtracting && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-md flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-sm">Extraction du texte en cours...</span>
                </div>
              )}
              
              {showMapping && pdfText && (
                <div className="mt-6">
                  <BulletinMappingInterfaceV2
                    extractedText={pdfText}
                    onMappingComplete={handleMappingComplete}
                    fileType="pdf"
                  />
                </div>
              )}
            </Card>
          </TabsContent>
          
          <TabsContent value="tabular" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-medium mb-4">Importation de fichiers Excel/CSV</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Importez un fichier Excel ou CSV contenant les données de notes. Vous pourrez ensuite configurer le mapping des colonnes.
              </p>
              
              <FileUploader
                onFilesAccepted={handleTabularFileUploaded}
                acceptedFileTypes={['.xlsx', '.xls', '.csv']}
                maxFiles={1}
                label="Importer un fichier Excel/CSV"
                description="Glissez-déposez votre fichier Excel/CSV ou cliquez pour parcourir"
              />
              
              {isParsing && (
                <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-md flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-sm">Analyse du fichier en cours...</span>
                </div>
              )}
              
              {showMapping && tabularData.length > 0 && (
                <div className="mt-6">
                  <BulletinMappingInterfaceV2
                    extractedText=""
                    onMappingComplete={handleMappingComplete}
                    fileType={tabularFile?.name.endsWith('.csv') ? 'csv' : 'excel'}
                    rawData={tabularData}
                  />
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
        
        {isProcessing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card shadow-lg rounded-lg p-6 max-w-md text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-2">Traitement en cours...</h3>
              <p className="text-sm text-muted-foreground">
                Nous analysons vos données. Veuillez patienter un instant.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ImportationBulletins;
