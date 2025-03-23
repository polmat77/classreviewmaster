
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Download, ChevronDown, ChevronRight, Users, Search } from 'lucide-react';
import { Input } from './ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Card, CardContent } from './ui/card';

interface ClassBulletinSummaryProps {
  data: {
    students: Array<{
      name: string;
      class: string;
      subjects: Array<{
        subject: string;
        average: number | null;
        teacher?: string;
        remark: string;
      }>;
    }>;
    classSummary: string;
  };
  onExport: () => void;
}

const ClassBulletinSummary: React.FC<ClassBulletinSummaryProps> = ({ data, onExport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [openStudent, setOpenStudent] = useState<string | null>(null);
  
  const filteredStudents = data.students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const toggleStudent = (studentName: string) => {
    if (openStudent === studentName) {
      setOpenStudent(null);
    } else {
      setOpenStudent(studentName);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-medium">Synthèse de classe</h3>
            </div>
            <Badge variant="outline">{data.students.length} élèves</Badge>
          </div>
          
          <div className="bg-secondary/30 p-4 rounded-lg italic text-sm leading-relaxed">
            {data.classSummary}
          </div>
        </CardContent>
      </Card>
      
      <div className="glass-panel p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Appréciations par élève</h3>
          <Button onClick={onExport} variant="secondary" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            <span>Exporter JSON</span>
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {filteredStudents.map((student, index) => (
              <Collapsible
                key={index}
                open={openStudent === student.name}
                onOpenChange={() => toggleStudent(student.name)}
                className="border rounded-lg overflow-hidden"
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2">
                      {openStudent === student.name ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.class}</div>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {student.subjects.length} matières
                    </Badge>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="p-3 pt-0 space-y-3">
                    <Separator className="my-3" />
                    
                    {student.subjects.map((subject, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{subject.subject}</div>
                          {subject.average && (
                            <Badge className={
                              subject.average < 10 ? 'bg-red-100 text-red-800 hover:bg-red-100' : 
                              subject.average < 14 ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' : 
                              'bg-green-100 text-green-800 hover:bg-green-100'
                            }>
                              {subject.average.toFixed(1)}/20
                            </Badge>
                          )}
                        </div>
                        
                        {subject.teacher && (
                          <div className="text-xs text-muted-foreground">
                            Professeur: {subject.teacher}
                          </div>
                        )}
                        
                        <div className="text-sm bg-secondary/20 p-2 rounded">
                          {subject.remark || "Pas d'appréciation disponible"}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Aucun élève trouvé
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default ClassBulletinSummary;
