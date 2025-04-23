
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import FileUploader from '@/components/FileUploader';
import ToneSelector from '@/components/appreciation/ToneSelector';
import LengthSelector from '@/components/appreciation/LengthSelector';
import AppreciationResult from '@/components/appreciation/AppreciationResult';
import { toast } from 'sonner';
import { Grid, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { processMultiBulletins } from '@/utils/data-processing';

interface StudentData {
  id: string;
  name: string;
  average: number;
  category: string;
  subjects: Array<{
    name: string;
    grade: number;
    comment?: string;
  }>;
}

const AppreciationsIndividuelles = () => {
  const [tone, setTone] = useState('neutre');
  const [length, setLength] = useState([250]);
  const [appreciation, setAppreciation] = useState('');
  const [individualReportFiles, setIndividualReportFiles] = useState<File[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Process files when uploaded
  useEffect(() => {
    const processFiles = async () => {
      if (individualReportFiles.length === 0) return;
      
      setIsProcessing(true);
      try {
        // Process the first file (assuming it contains all student data)
        const pdfFile = individualReportFiles.find(file => 
          file.name.toLowerCase().endsWith('.pdf')
        );
        
        if (!pdfFile) {
          toast.error("Aucun fichier PDF trouvé parmi les fichiers importés");
          return;
        }
        
        console.log("Processing PDF file:", pdfFile.name);
        const bulletins = await processMultiBulletins(pdfFile);
        
        if (!bulletins || bulletins.length === 0) {
          toast.error("Aucune donnée d'élève n'a pu être extraite des fichiers");
          return;
        }
        
        // Transform bulletin data into student data
        const extractedStudents = bulletins.map((bulletin, index) => ({
          id: `student-${index}`,
          name: bulletin.nom || `Élève ${index + 1}`,
          average: bulletin.moyenne_generale || 0,
          category: getCategoryFromAverage(bulletin.moyenne_generale || 0),
          subjects: Object.entries(bulletin.matieres).map(([name, data]) => ({
            name,
            grade: data.note || 0,
            comment: data.appreciation || ''
          }))
        }));
        
        console.log(`Extracted ${extractedStudents.length} students from bulletins`);
        setStudents(extractedStudents);
        
        if (extractedStudents.length > 0) {
          toast.success(`${extractedStudents.length} élèves importés avec succès`);
        }
      } catch (error) {
        console.error("Error processing files:", error);
        toast.error(`Erreur lors du traitement des fichiers: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      } finally {
        setIsProcessing(false);
      }
    };
    
    processFiles();
  }, [individualReportFiles]);

  const handleFileUpload = (files: File[]) => {
    setIndividualReportFiles(files);
  };

  const handleGenerateAppreciation = async () => {
    if (!selectedStudent) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // In a real app, we would call the OpenAI service here
      // For now, generate a mock appreciation based on the student data
      const { AppreciationService } = await import('@/utils/appreciation-service');
      
      const studentData = {
        name: selectedStudent.name,
        average: selectedStudent.average,
        category: selectedStudent.category,
        trend: 'stable', // This would be calculated from real data
      };
      
      const generatedAppreciation = await AppreciationService.generateStudentAppreciation(
        selectedStudent.name,
        studentData,
        tone,
        length[0]
      );
      
      setAppreciation(generatedAppreciation);
      
      toast({
        title: "Appréciation générée",
        description: "L'appréciation a été générée avec succès."
      });
    } catch (error) {
      console.error("Error generating appreciation:", error);
      toast.error(`Erreur lors de la génération de l'appréciation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      setAppreciation("Impossible de générer l'appréciation. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryFromAverage = (average: number): string => {
    if (average >= 16) return 'excellent';
    if (average >= 14) return 'good';
    if (average >= 10) return 'average';
    if (average >= 8) return 'struggling';
    return 'veryStruggling';
  };

  const getCategoryColor = (average: number) => {
    if (average >= 16) return 'bg-teal-100 text-teal-800';
    if (average >= 14) return 'bg-green-100 text-green-800';
    if (average >= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getCategoryLabel = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'excellent': 'Excellent',
      'good': 'Bon',
      'average': 'Moyen',
      'struggling': 'Difficulté',
      'veryStruggling': 'Grande difficulté'
    };
    
    return categoryMap[category] || 'Non classé';
  };

  const filteredStudents = students.filter(student => {
    // Filter by search term
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by category
    if (filter === 'all') return matchesSearch;
    return matchesSearch && student.category === filter;
  });

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Appréciations individuelles</h1>
          <p className="text-muted-foreground">
            Générez et personnalisez des appréciations pour chaque élève de la classe.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-1/3">
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium">Liste des élèves</h2>
                  {isProcessing && (
                    <div className="text-xs text-muted-foreground animate-pulse">
                      Traitement en cours...
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un élève..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {filteredStudents.length === 0 && !isProcessing && (
                    <div className="py-8 text-center text-muted-foreground">
                      {individualReportFiles.length === 0 
                        ? "Importez des bulletins pour voir les élèves"
                        : "Aucun élève trouvé"}
                    </div>
                  )}
                  
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        "w-full flex items-center p-2 hover:bg-secondary/50 transition-colors text-left",
                        selectedStudent?.id === student.id && "bg-secondary"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Moyenne: {student.average.toFixed(1)}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        getCategoryColor(student.average)
                      )}>
                        {getCategoryLabel(student.category)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* Main content */}
          <div className="lg:w-2/3">
            <Card className="p-6 space-y-6">
              <FileUploader
                onFilesAccepted={handleFileUpload}
                acceptedFileTypes={['.pdf', '.csv', '.xlsx', '.xls']}
                maxFiles={3}
                label="Importer les bulletins individuels"
                description="Formats acceptés: PDF, CSV, Excel (XLSX, XLS)"
              />

              {selectedStudent && (
                <>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">{selectedStudent.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Moyenne générale: {selectedStudent.average.toFixed(1)}
                      </p>
                    </div>

                    <ToneSelector tone={tone} onToneChange={setTone} />
                    <LengthSelector 
                      length={length} 
                      maxChars={500} 
                      onLengthChange={setLength} 
                    />

                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={handleGenerateAppreciation}
                      disabled={isGenerating}
                    >
                      {isGenerating ? 'Génération en cours...' : "Générer l'appréciation"}
                    </Button>

                    {appreciation && (
                      <AppreciationResult
                        appreciation={appreciation}
                        onRegenerate={handleGenerateAppreciation}
                        onCopy={() => {
                          navigator.clipboard.writeText(appreciation);
                          toast({
                            title: "Copié !",
                            description: "L'appréciation a été copiée dans le presse-papiers."
                          });
                        }}
                      />
                    )}
                  </div>
                </>
              )}

              {!selectedStudent && (
                <div className="text-center py-12 text-muted-foreground">
                  <Grid className="mx-auto h-12 w-12 mb-4" />
                  <h3 className="text-lg font-medium">Sélectionnez un élève</h3>
                  <p className="text-sm">
                    {students.length > 0 
                      ? "Choisissez un élève dans la liste pour générer son appréciation"
                      : "Importez des bulletins pour pouvoir sélectionner un élève"
                    }
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AppreciationsIndividuelles;
