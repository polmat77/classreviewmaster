
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import AppreciationGenerator from '@/components/AppreciationGenerator';
import FileUploader from '@/components/FileUploader';
import { Search, Filter, RefreshCw, Save, UserPlus, Printer, FileText, List, Grid, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mock data for student list
const mockStudents = [
  { id: 1, name: 'Martin Louise', average: 16.7, category: 'excellent', trend: 'up' },
  { id: 2, name: 'Dubois Thomas', average: 14.2, category: 'good', trend: 'stable' },
  { id: 3, name: 'Bernard Julie', average: 12.8, category: 'average', trend: 'up' },
  { id: 4, name: 'Petit Nicolas', average: 9.5, category: 'struggling', trend: 'down' },
  { id: 5, name: 'Robert Emma', average: 15.3, category: 'good', trend: 'up' },
  { id: 6, name: 'Richard Lucas', average: 11.9, category: 'average', trend: 'stable' },
  { id: 7, name: 'Moreau Hugo', average: 13.4, category: 'average', trend: 'up' },
  { id: 8, name: 'Simon Chloé', average: 8.7, category: 'struggling', trend: 'down' },
];

const AppreciationsIndividuelles = () => {
  const [selectedStudent, setSelectedStudent] = useState<any>(mockStudents[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
  const [individualReportFiles, setIndividualReportFiles] = useState<File[]>([]);
  const [appreciations, setAppreciations] = useState<Record<number, string>>({});
  
  const filteredStudents = mockStudents.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || student.category === filter;
    return matchesSearch && matchesFilter;
  });
  
  const handleIndividualReportUpload = (files: File[]) => {
    setIndividualReportFiles(files);
    toast.success("Bulletins individuels importés avec succès");
  };
  
  const regenerateAllAppreciations = () => {
    // Simulate regenerating for all students
    const newAppreciations: Record<number, string> = {};
    mockStudents.forEach(student => {
      // Generate simple appreciations based on category
      let appreciation = "";
      switch(student.category) {
        case 'excellent':
          appreciation = `${student.name} réalise un excellent trimestre avec des résultats remarquables.`;
          break;
        case 'good':
          appreciation = `${student.name} présente un bon niveau général avec un travail sérieux.`;
          break;
        case 'average':
          appreciation = `${student.name} obtient des résultats corrects mais qui pourraient être améliorés.`;
          break;
        case 'struggling':
          appreciation = `${student.name} rencontre des difficultés qui nécessitent un travail plus approfondi.`;
          break;
      }
      newAppreciations[student.id] = appreciation;
    });
    
    setAppreciations(newAppreciations);
    toast.success("Toutes les appréciations ont été régénérées");
  };
  
  const saveAllAppreciations = () => {
    toast.success("Toutes les appréciations ont été enregistrées");
  };
  
  const handleAppreciationGenerated = (id: number, appreciation: string) => {
    setAppreciations(prev => ({
      ...prev,
      [id]: appreciation
    }));
  };
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'excellent': return 'bg-teal-100 text-teal-800';
      case 'good': return 'bg-green-100 text-green-800';
      case 'average': return 'bg-yellow-100 text-yellow-800';
      case 'struggling': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <span className="text-green-500">▲</span>;
      case 'down': return <span className="text-red-500">▼</span>;
      default: return <span className="text-yellow-500">◆</span>;
    }
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Appréciations individuelles</h1>
          <p className="section-description">
            Générez et personnalisez des appréciations pour chaque élève de la classe.
          </p>
        </div>
        
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
            maxFiles={5}
            label="Importer les bulletins individuels"
            description="Documents PDF, Excel ou CSV contenant les bulletins par élève"
          />
        </div>
        
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
                  {filteredStudents.length > 0 ? filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={cn(
                        "w-full flex items-center p-2.5 hover:bg-secondary/50 transition-colors text-left",
                        selectedStudent.id === student.id && "bg-primary/5"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground flex items-center space-x-1">
                          <span>Moyenne: {student.average}</span>
                          <span>{getTrendIcon(student.trend)}</span>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        getCategoryColor(student.category)
                      )}>
                        {student.category === 'excellent' && 'Excellent'}
                        {student.category === 'good' && 'Bon'}
                        {student.category === 'average' && 'Moyen'}
                        {student.category === 'struggling' && 'Difficulté'}
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
                          Moyenne générale: {selectedStudent.average} {getTrendIcon(selectedStudent.trend)}
                        </p>
                      </div>
                      
                      <div className={cn(
                        "text-sm px-3 py-1 rounded-full font-medium",
                        getCategoryColor(selectedStudent.category)
                      )}>
                        {selectedStudent.category === 'excellent' && 'Excellent'}
                        {selectedStudent.category === 'good' && 'Bon'}
                        {selectedStudent.category === 'average' && 'Moyen'}
                        {selectedStudent.category === 'struggling' && 'En difficulté'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Français</div>
                        <div className="text-lg font-medium">13.5</div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Maths</div>
                        <div className="text-lg font-medium">12.0</div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Histoire-Géo</div>
                        <div className="text-lg font-medium">15.5</div>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <div className="text-xs text-muted-foreground">Anglais</div>
                        <div className="text-lg font-medium">14.0</div>
                      </div>
                    </div>
                    
                    <AppreciationGenerator 
                      type="individual"
                      studentName={selectedStudent.name}
                      studentData={selectedStudent}
                      maxChars={500} 
                      className="mb-0"
                      onAppreciationGenerated={(appreciation) => handleAppreciationGenerated(selectedStudent.id, appreciation)}
                    />
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
                <button
                  onClick={() => toast.success("Impression lancée")}
                  className="button-primary flex items-center space-x-2 text-sm"
                  title="Imprimer les appréciations"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimer</span>
                </button>
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
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center">
                          <div className={cn(
                            "w-2 h-2 rounded-full mr-2",
                            student.category === 'excellent' && 'bg-teal-500',
                            student.category === 'good' && 'bg-green-500',
                            student.category === 'average' && 'bg-yellow-500',
                            student.category === 'struggling' && 'bg-red-500',
                          )}></div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <span>{student.average}</span>
                          <span className="ml-1">{getTrendIcon(student.trend)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-muted-foreground max-w-xl line-clamp-2">
                          {appreciations[student.id] || 
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
                              navigator.clipboard.writeText(appreciations[student.id] || '');
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
      </div>
    </Layout>
  );
};

export default AppreciationsIndividuelles;
