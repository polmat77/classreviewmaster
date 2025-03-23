
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AppreciationGenerator from '@/components/AppreciationGenerator';
import FileUploader from '@/components/FileUploader';
import { Search, Filter, RefreshCw, Save, UserPlus, Printer, FileText, List, Grid, Copy, BarChart, CheckCircle, AlertTriangle, RotateCw, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { processGradeFiles } from '@/utils/data-processing';
import { initPdfJs } from '@/utils/pdf-service';
import { parseClassBulletins, generateStudentSummary } from '@/utils/pdf-processing';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import AnalysisUploader from '@/components/AnalysisUploader';

const AppreciationsIndividuelles = () => {
  // Replace mock data with data from analysis
  const [individualReportFiles, setIndividualReportFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // State to track the currently selected student
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [appreciations, setAppreciations] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('manual-upload');

  // Initialize PDF.js when component mounts
  useEffect(() => {
    const cleanupPdfJs = initPdfJs();
    return () => cleanupPdfJs();
  }, []);

  // Extract students from analysis data or use empty array
  const students = analysisData?.currentTerm?.students || [];
  
  // Filter students based on search and category
  const filteredStudents = students.filter((student: any) => {
    const matchesSearch = student?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Determine category based on average
    const avg = student.average || 0;
    let category = '';
    if (avg >= 16) category = 'excellent';
    else if (avg >= 14) category = 'good';
    else if (avg >= 10) category = 'average';
    else category = 'struggling';
    
    const matchesFilter = filter === 'all' || category === filter;
    return matchesSearch && matchesFilter;
  });

  // Set a default selected student when analysis data changes
  React.useEffect(() => {
    if (analysisData?.currentTerm?.students?.length > 0 && !selectedStudent) {
      setSelectedStudent(analysisData.currentTerm.students[0]);
    }
  }, [analysisData, selectedStudent]);
  
  const handleIndividualReportUpload = (files: File[]) => {
    setIndividualReportFiles(files);
    setAnalysisData(null); // Reset analysis when new files are uploaded
    setSelectedStudent(null); // Reset selected student
    setAnalysisError(null); // Clear any previous errors
    toast.success("Bulletins individuels importés avec succès");
  };
  
  const handleAnalyzeData = async () => {
    if (individualReportFiles.length === 0) {
      toast.error("Veuillez d'abord importer des fichiers");
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysisError(null);
    
    try {
      // Show more descriptive processing message
      toast.info("Traitement des fichiers PDF en cours... Cela peut prendre un moment.", {
        duration: 10000,
      });
      
      // Use our new parsing function for class bulletins
      const file = individualReportFiles[0];
      const fileBuffer = await file.arrayBuffer();
      
      if (file.type === 'application/pdf') {
        const bulletinData = await parseClassBulletins(fileBuffer);
        
        // Map the bulletin data to the format expected by the rest of the application
        const mappedData = {
          currentTerm: {
            term: 'Trimestre actuel',
            classAverage: calculateClassAverage(bulletinData.students),
            studentCount: bulletinData.students.length,
            students: bulletinData.students.map(student => ({
              name: student.name,
              average: calculateStudentAverage(student.subjects),
              subjects: student.subjects.map(subject => ({
                name: subject.subject,
                grade: subject.average || 0,
                comment: subject.remark || '',
                teacher: subject.teacher || '',
              }))
            })),
            schoolName: bulletinData.students[0]?.class || 'École'
          },
          categories: categorizeStudents(bulletinData.students),
          analysisPoints: [bulletinData.classSummary]
        };
        
        setAnalysisData(mappedData);
      } else {
        // Fallback to original method for non-PDF files
        const data = await processGradeFiles(individualReportFiles);
        
        if (!data || !data.currentTerm || !data.currentTerm.students || data.currentTerm.students.length === 0) {
          throw new Error("Aucune donnée d'élève n'a pu être extraite des fichiers");
        }
        
        setAnalysisData(data);
      }
      
      // Set the first student as selected by default
      if (analysisData?.currentTerm?.students?.length > 0) {
        setSelectedStudent(analysisData.currentTerm.students[0]);
      }
      
      toast.success("Analyse des données terminée avec succès");
    } catch (error) {
      console.error("Error analyzing data:", error);
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue lors de l'analyse";
      setAnalysisError(errorMessage);
      toast.error(`Erreur lors de l'analyse des données: ${errorMessage}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const regenerateAllAppreciations = async () => {
    if (!analysisData?.currentTerm?.students) {
      toast.error("Veuillez d'abord analyser les données");
      return;
    }
    
    toast.info("Génération des appréciations en cours...", { duration: 3000 });
    
    // Generate appreciations for all students
    const newAppreciations: Record<string, string> = {};
    
    const students = analysisData.currentTerm.students;
    let completedCount = 0;
    
    for (const student of students) {
      try {
        // Format student data for our generator
        const studentBulletin = {
          name: student.name,
          class: analysisData.currentTerm.schoolName || 'Classe',
          subjects: student.subjects.map(subj => ({
            subject: subj.name,
            average: subj.grade,
            remark: subj.comment,
            teacher: subj.teacher
          }))
        };
        
        // Generate appreciation using our new AI-powered generator
        const appreciation = await generateStudentSummary(studentBulletin);
        newAppreciations[student.name] = appreciation;
        
        completedCount++;
        if (completedCount % 5 === 0) {
          toast.info(`Génération en cours: ${completedCount}/${students.length} appréciations`);
        }
      } catch (error) {
        console.error(`Error generating appreciation for ${student.name}:`, error);
        newAppreciations[student.name] = `Erreur lors de la génération de l'appréciation pour ${student.name}.`;
      }
    }
    
    setAppreciations(newAppreciations);
    toast.success(`Toutes les appréciations ont été régénérées (${completedCount}/${students.length})`);
  };
  
  const saveAllAppreciations = () => {
    // Create a text file with all appreciations
    const content = Object.entries(appreciations)
      .map(([name, text]) => `${name}\n${'='.repeat(name.length)}\n\n${text}\n\n`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appreciations-classe.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Toutes les appréciations ont été enregistrées");
  };
  
  const handleAppreciationGenerated = (studentName: string, appreciation: string) => {
    setAppreciations(prev => ({
      ...prev,
      [studentName]: appreciation
    }));
  };
  
  const getCategoryColor = (avg: number) => {
    if (avg >= 16) return 'bg-teal-100 text-teal-800';
    if (avg >= 14) return 'bg-green-100 text-green-800';
    if (avg >= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };
  
  const getCategoryName = (avg: number) => {
    if (avg >= 16) return 'Excellent';
    if (avg >= 14) return 'Bon';
    if (avg >= 10) return 'Moyen';
    return 'Difficulté';
  };
  
  const getTrendIcon = (student: any) => {
    // Calculate trend using previous data if available
    if (analysisData?.previousTerms && analysisData?.previousTerms.length > 0) {
      const prevData = analysisData.previousTerms[0];
      if (prevData) {
        // This is simplified - in reality you'd need to match the student across terms
        if (student.average > prevData.classAverage) return <span className="text-green-500">▲</span>;
        if (student.average < prevData.classAverage) return <span className="text-red-500">▼</span>;
      }
    }
    return <span className="text-yellow-500">◆</span>;
  };
  
  // Helper function to get subjects for a student with proper error handling
  const getStudentSubjects = (student: any) => {
    if (!student) return [];
    if (!student.subjects) return [];
    
    // Return either all subjects or first 4 if there are many
    const subjectsToShow = student.subjects.length > 4 
      ? student.subjects.slice(0, 4)
      : student.subjects;
      
    return subjectsToShow;
  };
  
  // Helper function to calculate class average from students
  const calculateClassAverage = (students: Array<{
    subjects: Array<{average: number | null}>
  }>) => {
    let totalSum = 0;
    let totalCount = 0;
    
    students.forEach(student => {
      student.subjects.forEach(subject => {
        if (subject.average !== null) {
          totalSum += subject.average;
          totalCount++;
        }
      });
    });
    
    return totalCount > 0 ? totalSum / totalCount : 0;
  };
  
  // Helper function to calculate student average from subjects
  const calculateStudentAverage = (subjects: Array<{average: number | null}>) => {
    const validGrades = subjects
      .map(s => s.average)
      .filter((avg): avg is number => avg !== null && avg !== undefined);
      
    return validGrades.length > 0
      ? validGrades.reduce((sum, grade) => sum + grade, 0) / validGrades.length
      : 0;
  };
  
  // Helper function to categorize students based on their average
  const categorizeStudents = (students: Array<{
    subjects: Array<{average: number | null}>
  }>) => {
    const result = {
      excellent: 0,
      good: 0,
      average: 0,
      struggling: 0,
      veryStruggling: 0
    };
    
    students.forEach(student => {
      const avg = calculateStudentAverage(student.subjects);
      if (avg >= 16) result.excellent++;
      else if (avg >= 14) result.good++;
      else if (avg >= 10) result.average++;
      else if (avg >= 8) result.struggling++;
      else result.veryStruggling++;
    });
    
    return result;
  };
  
  // Placeholder message when no data is available
  const noDataMessage = (
    <div className="text-center p-6 space-y-4">
      <div className="flex justify-center items-center space-x-2 text-muted-foreground">
        <FileText className="h-6 w-6" />
        <span className="text-lg font-medium">Aucune donnée disponible</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Veuillez importer des fichiers et cliquer sur "Analyser les données" pour commencer.
      </p>
    </div>
  );
  
  // Error message when analysis fails
  const errorMessage = (
    <div className="text-center p-6 space-y-4">
      <div className="flex justify-center items-center space-x-2 text-destructive">
        <AlertTriangle className="h-6 w-6" />
        <span className="text-lg font-medium">Erreur d'analyse</span>
      </div>
      <p className="text-sm text-muted-foreground">
        {analysisError || "Une erreur s'est produite lors de l'analyse des données."}
      </p>
      <p className="text-sm text-muted-foreground">
        Veuillez vérifier le format de vos fichiers et réessayer.
      </p>
    </div>
  );

  // Get school name from analysis data
  const schoolName = analysisData?.currentTerm?.schoolName;
  const termInfo = analysisData?.currentTerm?.term;
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Appréciations individuelles</h1>
          <p className="section-description">
            Générez et personnalisez des appréciations pour chaque élève de la classe.
          </p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="manual-upload" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Import manuel</span>
            </TabsTrigger>
            <TabsTrigger value="auto-analysis" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span>Analyse avancée</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual-upload">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="text-base font-medium">Bulletins individuels</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Importez les bulletins individuels des élèves pour faciliter la génération des appréciations personnalisées
              </p>
              <FileUploader 
                onFilesAccepted={handleIndividualReportUpload}
                acceptedFileTypes={['.pdf', '.csv', '.xlsx', '.xls']}
                maxFiles={30}
                label="Importer les bulletins individuels"
                description="Documents PDF, Excel ou CSV contenant les bulletins par élève"
              />
              
              <div className="flex justify-center mt-4">
                <Button 
                  onClick={handleAnalyzeData} 
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-300"
                  size="lg"
                  disabled={individualReportFiles.length === 0 || isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Analyse en cours...
                    </>
                  ) : (
                    <>
                      <BarChart className="mr-2 h-5 w-5" />
                      Analyser les données
                    </>
                  )}
                </Button>
              </div>
              
              {analysisData && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-md text-sm flex items-center text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Analyse terminée ! {analysisData.currentTerm.students.length} élèves analysés avec une moyenne générale de {analysisData.currentTerm.classAverage.toFixed(1)}.
                  {schoolName && ` Établissement : ${schoolName}.`}
                  {termInfo && ` Période : ${termInfo}.`}
                </div>
              )}

              {analysisError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-md text-sm flex items-center text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                  Erreur : {analysisError}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="auto-analysis">
            <AnalysisUploader />
          </TabsContent>
        </Tabs>
        
        {/* Only show content if there's analysis data in the manual tab */}
        {activeTab === 'manual-upload' && (
          <>
            {!analysisData && !analysisError && noDataMessage}
            {analysisError && errorMessage}
            
            {analysisData && (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-medium">Gestion des appréciations</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewMode('single')}
                      className={cn(
                        "p-2 rounded-md transition-colors",
                        viewMode === 'single' ? "bg-primary text-white" : "bg-secondary hover:bg-secondary/80"
                      )}
                      title="Vue individuelle"
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('all')}
                      className={cn(
                        "p-2 rounded-md transition-colors",
                        viewMode === 'all' ? "bg-primary text-white" : "bg-secondary hover:bg-secondary/80"
                      )}
                      title="Vue d'ensemble"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {viewMode === 'single' ? (
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="lg:w-1/3 flex flex-col">
                      <div className="glass-panel p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Liste des élèves</h3>
                          <div className="flex gap-2">
                            <button 
                              onClick={regenerateAllAppreciations}
                              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                              title="Régénérer toutes les appréciations"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={saveAllAppreciations}
                              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                              title="Enregistrer toutes les appréciations"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => toast.success("Impression lancée")}
                              className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                              title="Imprimer les appréciations"
                            >
                              <Printer className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Search className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                            <input 
                              type="text"
                              placeholder="Rechercher un élève..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="glass-input pl-9 h-9 w-full text-sm"
                            />
                          </div>
                          
                          <div className="relative">
                            <Filter className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
                            <select 
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                              className="glass-input pl-9 pr-8 h-9 text-sm appearance-none"
                            >
                              <option value="all">Tous</option>
                              <option value="excellent">Excellents</option>
                              <option value="good">Bons</option>
                              <option value="average">Moyens</option>
                              <option value="struggling">En difficulté</option>
                            </select>
                          </div>
                        </div>
                        
                        <div className="divide-y max-h-[500px] overflow-y-auto scrollbar-none">
                          {filteredStudents.length > 0 ? filteredStudents.map((student: any) => (
                            <button
                              key={student.name}
                              onClick={() => setSelectedStudent(student)}
                              className={cn(
                                "w-full flex items-center p-2.5 hover:bg-secondary/50 transition-colors text-left",
                                selectedStudent?.name === student.name && "bg-primary/5"
                              )}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{student.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                  <span>Moyenne: {student.average?.toFixed(1) || "N/A"}</span>
                                  <span>{getTrendIcon(student)}</span>
                                </div>
                              </div>
                              
                              <div className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                getCategoryColor(student.average || 0)
                              )}>
                                {getCategoryName(student.average || 0)}
                              </div>
                            </button>
                          )) : (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                              <div className="flex justify-center mb-2">
                                <UserPlus className="h-6 w-6" />
                              </div>
                              <p>Aucun élève trouvé</p>
                              <p className="text-xs">Ajustez vos critères de recherche</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="lg:w-2/3">
                      {selectedStudent && (
                        <div className="space-y-4">
                          <div className="glass-panel p-5">
                            <div className="flex justify-between items-center mb-4">
                              <div>
                                <h3 className="text-lg font-medium">{selectedStudent.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  Moyenne générale: {selectedStudent.average?.toFixed(1) || "N/A"} {getTrendIcon(selectedStudent)}
                                </p>
                              </div>
                              
                              <div className={cn(
                                "text-sm px-3 py-1 rounded-full font-medium",
                                getCategoryColor(selectedStudent.average || 0)
                              )}>
                                {getCategoryName(selectedStudent.average || 0)}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                              {getStudentSubjects(selectedStudent).map((subject: any, index: number) => (
                                <div key={index} className="p-3 bg-secondary/50 rounded-lg">
                                  <div className="text-xs text-muted-foreground">{subject.name}</div>
                                  <div className="text-lg font-medium">{subject.grade?.toFixed(1) || "N/A"}</div>
                                  {subject.comment && (
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1" title={subject.comment}>
                                      {subject.comment}
                                    </div>
                                  )}
                                  {subject.teacher && (
                                    <div className="text-xs font-medium mt-1">
                                      {subject.teacher}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <AppreciationGenerator 
                              type="individual"
                              studentName={selectedStudent.name}
                              studentData={selectedStudent}
                              maxChars={500}
                              className="mb-0"
                              analysisData={analysisData}
                              onAppreciationGenerated={(appreciation) => handleAppreciationGenerated(selectedStudent.name, appreciation)}
                            />
                            
                            {/* Add AI-powered appreciation button */}
                            <div className="mt-4 pt-4 border-t">
                              <Button
                                variant="outline"
                                className="w-full flex items-center justify-center gap-2"
                                onClick={async () => {
                                  try {
                                    toast.info("Génération de l'appréciation en cours...");
                                    
                                    // Format student data for our generator
                                    const studentBulletin = {
                                      name: selectedStudent.name,
                                      class: analysisData.currentTerm.schoolName || 'Classe',
                                      subjects: selectedStudent.subjects.map((subj: any) => ({
                                        subject: subj.name,
                                        average: subj.grade,
                                        remark: subj.comment,
                                        teacher: subj.teacher
                                      }))
                                    };
                                    
                                    const appreciation = await generateStudentSummary(studentBulletin);
                                    handleAppreciationGenerated(selectedStudent.name, appreciation);
                                    toast.success("Appréciation générée avec succès");
                                  } catch (error) {
                                    console.error("Error generating appreciation:", error);
                                    toast.error("Erreur lors de la génération de l'appréciation");
                                  }
                                }}
                              >
                                <RotateCw className="h-4 w-4" />
                                <span>Générer avec IA</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel p-5 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Vue d'ensemble des appréciations</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={regenerateAllAppreciations}
                          className="button-secondary flex items-center space-x-2 text-sm"
                          title="Régénérer toutes les appréciations"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Tout régénérer</span>
                        </button>
                        <Button
                          onClick={saveAllAppreciations}
                          variant="secondary"
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          <span>Exporter</span>
                        </Button>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-secondary/50">
                            <th className="p-3 text-left text-sm font-medium">Élève</th>
                            <th className="p-3 text-left text-sm font-medium">Moyenne</th>
                            <th className="p-3 text-left text-sm font-medium">Appréciation</th>
                            <th className="p-3 text-center text-sm font-medium w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredStudents.map((student: any) => (
                            <tr key={student.name} className="hover:bg-secondary/30 transition-colors">
                              <td className="p-3">
                                <div className="flex items-center">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mr-2",
                                    getCategoryColor(student.average || 0)
                                      .replace('bg-teal-100', 'bg-teal-500')
                                      .replace('bg-green-100', 'bg-green-500')
                                      .replace('bg-yellow-100', 'bg-yellow-500')
                                      .replace('bg-red-100', 'bg-red-500')
                                  )}></div>
                                  <span className="font-medium">{student.name}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center">
                                  <span>{student.average?.toFixed(1) || "N/A"}</span>
                                  <span className="ml-1">{getTrendIcon(student)}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="text-sm text-muted-foreground max-w-xl">
                                  {appreciations[student.name] || 
                                    <span className="italic">Cliquez sur "Tout régénérer" pour créer les appréciations</span>
                                  }
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex justify-center space-x-1">
                                  <button 
                                    onClick={() => {
                                      setSelectedStudent(student);
                                      setViewMode('single');
                                    }}
                                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                                    title="Modifier"
                                  >
                                    <Grid className="h-4 w-4" />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(appreciations[student.name] || '');
                                      toast.success("Appréciation copiée");
                                    }}
                                    className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                                    title="Copier"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AppreciationsIndividuelles;
