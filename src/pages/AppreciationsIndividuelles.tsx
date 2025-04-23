
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import FileUploader from '@/components/FileUploader';
import ToneSelector from '@/components/appreciation/ToneSelector';
import LengthSelector from '@/components/appreciation/LengthSelector';
import AppreciationResult from '@/components/appreciation/AppreciationResult';
import { useToast } from '@/components/ui/use-toast';
import { Grid, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const AppreciationsIndividuelles = () => {
  const { toast } = useToast();
  const [tone, setTone] = useState('neutre');
  const [length, setLength] = useState([250]);
  const [appreciation, setAppreciation] = useState('');
  const [individualReportFiles, setIndividualReportFiles] = useState<File[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  // Mock data - replace with actual data from file processing
  const students = [
    { id: 1, name: "Alice Martin", average: 15.5 },
    { id: 2, name: "Bob Dupont", average: 12.8 },
    { id: 3, name: "Claire Thomas", average: 17.2 },
  ];

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileUpload = (files: File[]) => {
    setIndividualReportFiles(files);
    toast({
      title: "Fichiers importés avec succès",
      description: `${files.length} fichier(s) ont été chargés.`
    });
  };

  const handleGenerateAppreciation = () => {
    // Implement generation logic
    const mockAppreciation = `Appréciation générée pour ${selectedStudent?.name || 'l\'élève'}`;
    setAppreciation(mockAppreciation);
    toast({
      title: "Appréciation générée",
      description: "L'appréciation a été générée avec succès."
    });
  };

  const getCategoryColor = (average: number) => {
    if (average >= 16) return 'bg-teal-100 text-teal-800';
    if (average >= 14) return 'bg-green-100 text-green-800';
    if (average >= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

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

                <div className="divide-y">
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
                          Moyenne: {student.average}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        getCategoryColor(student.average)
                      )}>
                        {student.average >= 16 ? 'Excellent' : 
                         student.average >= 14 ? 'Bon' :
                         student.average >= 10 ? 'Moyen' : 'Difficulté'}
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
                        Moyenne générale: {selectedStudent.average}
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
                    >
                      Générer l'appréciation
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
                    Choisissez un élève dans la liste pour générer son appréciation
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
