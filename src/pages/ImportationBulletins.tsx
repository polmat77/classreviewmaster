
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { useNavigate } from 'react-router-dom';
import FileUploader from '@/components/FileUploader';
import ProgressIndicator from '@/components/ProgressIndicator';
import BulletinMappingInterfaceV2 from '@/components/BulletinMappingInterfaceV2';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { extractTextFromPDF } from '@/utils/pdf-service';
import { parseTabularFile } from '@/utils/bulletin-mapping';
import { processGradeFiles } from '@/utils/data-processing';
import { parseClassBulletins } from '@/utils/pdf-processing';
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
  const [processingDirect, setProcessingDirect] = useState<boolean>(false);
  
  const [extractionStep, setExtractionStep] = useState(0);
  const extractionSteps = [
    "Lecture du fichier...",
    "Extraction du contenu...", 
    "Préparation des données...",
    "Extraction terminée"
  ];
  
  const [processingStep, setProcessingStep] = useState(0);
  const processingSteps = [
    "Traitement des données...",
    "Analyse des informations...", 
    "Préparation des résultats...",
    "Finalisation...",
    "Traitement terminé"
  ];
  
  const handlePdfUploaded = async (files: File[]) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setPdfFile(file);
    setPdfText('');
    setMappedData(null);
    setShowMapping(false);
    
    // Essayer d'abord de traiter directement comme un bulletin de classe
    try {
      setProcessingDirect(true);
      setProcessingStep(1);
      
      const fileBuffer = await file.arrayBuffer();
      const result = await parseClassBulletins(fileBuffer, (progress) => {
        setProcessingStep(Math.min(4, Math.floor(progress / 25) + 1));
      });
      
      if (result && result.students && result.students.length > 0) {
        // Si on a réussi à extraire des données de bulletin de classe directement
        const processedData = {
          className: result.students[0].class,
          students: result.students.map(student => ({
            name: student.name,
            subjects: student.subjects.map(subject => ({
              name: subject.subject,
              average: subject.average,
              comment: subject.remark,
              teacher: subject.teacher
            }))
          })),
          classSummary: result.classSummary
        };
        
        setProcessingStep(5);
        
        localStorage.setItem('analysisData', JSON.stringify(processedData));
        toast.success('Analyse du bulletin terminée avec succès');
        
        navigate('/appreciation-generale', { 
          state: { analysisData: processedData }
        });
        return;
      }
    } catch (error) {
      console.log("Traitement direct échoué, on passe à l'extraction classique", error);
    } finally {
      setProcessingDirect(false);
      setProcessingStep(0);
    }
    
    // Si le traitement direct a échoué, passer à la méthode normale d'extraction
    await extractPdfText(file);
  };
  
  const handleTabularFileUploaded = async (files: File[]) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setTabularFile(file);
    setTabularData([]);
    setMappedData(null);
    setShowMapping(false);
    
    await parseFile(file);
  };
  
  const extractPdfText = async (file: File) => {
    setIsExtracting(true);
    setExtractionStep(1);
    
    try {
      const simulateStep = async (step: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        setExtractionStep(step);
      };
      
      await simulateStep(1, 800);
      await simulateStep(2, 1200);
      
      const text = await extractTextFromPDF(file, (progress) => {
        console.log("Extraction progress:", progress);
      });
      
      await simulateStep(3, 1000);
      await simulateStep(4, 500);
      
      setPdfText(text);
      toast.success('Extraction du texte terminée');
      setShowMapping(true);
    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte:', error);
      toast.error(`Erreur lors de l'extraction: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setExtractionStep(0);
    } finally {
      setIsExtracting(false);
    }
  };
  
  const parseFile = async (file: File) => {
    setIsParsing(true);
    setExtractionStep(1);
    
    try {
      const simulateStep = async (step: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        setExtractionStep(step);
      };
      
      await simulateStep(1, 800);
      await simulateStep(2, 1200);
      
      const data = await parseTabularFile(file);
      
      await simulateStep(3, 1000);
      await simulateStep(4, 500);
      
      setTabularData(data);
      toast.success('Fichier analysé avec succès');
      setShowMapping(true);
    } catch (error) {
      console.error('Erreur lors du parsing du fichier:', error);
      toast.error(`Erreur lors de l'analyse: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setExtractionStep(0);
    } finally {
      setIsParsing(false);
    }
  };
  
  const handleMappingComplete = async (data: any) => {
    setMappedData(data);
    setIsProcessing(true);
    setProcessingStep(1);
    
    try {
      const simulateStep = async (step: number, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        setProcessingStep(step);
      };
      
      await simulateStep(1, 800);
      await simulateStep(2, 1200);
      
      const processedData = await processGradeFiles([
        new File(
          [JSON.stringify(data)], 
          `mapped-data-${Date.now()}.json`, 
          { type: 'application/json' }
        )
      ]);
      
      await simulateStep(3, 1000);
      await simulateStep(4, 800);
      await simulateStep(5, 500);
      
      localStorage.setItem('analysisData', JSON.stringify(processedData));
      
      toast.success('Analyse terminée avec succès');
      
      navigate('/appreciation-generale', { 
        state: { analysisData: processedData }
      });
    } catch (error) {
      console.error('Erreur lors du traitement final:', error);
      toast.error(`Erreur lors de l'analyse finale: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setProcessingStep(0);
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
                Importez un fichier PDF contenant un ou plusieurs bulletins scolaires. Le système analysera automatiquement le format du document.
              </p>
              
              <FileUploader
                onFilesAccepted={handlePdfUploaded}
                acceptedFileTypes={['.pdf']}
                maxFiles={1}
                label="Importer un bulletin PDF"
                description="Glissez-déposez votre fichier PDF ou cliquez pour parcourir"
              />
              
              {processingDirect && processingStep > 0 && (
                <div className="mt-4">
                  <ProgressIndicator 
                    currentStep={processingStep} 
                    totalSteps={processingSteps.length - 1}
                    steps={processingSteps}
                    isLoading={processingStep < processingSteps.length - 1}
                  />
                  <p className="text-sm text-muted-foreground mt-2">Analyse automatique en cours...</p>
                </div>
              )}
              
              {isExtracting && extractionStep > 0 && !processingDirect && (
                <div className="mt-4">
                  <ProgressIndicator 
                    currentStep={extractionStep} 
                    totalSteps={extractionSteps.length - 1}
                    steps={extractionSteps}
                    isLoading={extractionStep < extractionSteps.length - 1}
                  />
                </div>
              )}
              
              {showMapping && pdfText && !processingDirect && (
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
              
              {isParsing && extractionStep > 0 && (
                <div className="mt-4">
                  <ProgressIndicator 
                    currentStep={extractionStep} 
                    totalSteps={extractionSteps.length - 1}
                    steps={extractionSteps}
                    isLoading={extractionStep < extractionSteps.length - 1}
                  />
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
            <div className="bg-card shadow-lg rounded-lg p-6 max-w-md">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-medium mb-4 text-center">Traitement en cours...</h3>
              
              <ProgressIndicator 
                currentStep={processingStep} 
                totalSteps={processingSteps.length - 1}
                steps={processingSteps}
                isLoading={processingStep < processingSteps.length - 1}
              />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ImportationBulletins;
