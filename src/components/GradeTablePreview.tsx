
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Download, Search, Filter, ArrowUpDown } from 'lucide-react';

interface GradeTablePreviewProps {
  data: {
    className: string;
    subjects: string[];
    students: Array<{
      name: string;
      grades: { [subject: string]: number | null };
      average?: number;
    }>;
  };
  onExport: () => void;
}

const GradeTablePreview: React.FC<GradeTablePreviewProps> = ({ data, onExport }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter students based on search term
  const filteredStudents = data.students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort students based on current sort field and direction
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    if (sortField === 'name') {
      return sortDirection === 'asc' 
        ? a.name.localeCompare(b.name) 
        : b.name.localeCompare(a.name);
    } else if (sortField === 'average') {
      const avgA = a.average || 0;
      const avgB = b.average || 0;
      return sortDirection === 'asc' ? avgA - avgB : avgB - avgA;
    } else {
      // Sort by subject grade
      const gradeA = a.grades[sortField] || 0;
      const gradeB = b.grades[sortField] || 0;
      return sortDirection === 'asc' ? gradeA - gradeB : gradeB - gradeA;
    }
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking on the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const formatGrade = (grade: number | null): string => {
    if (grade === null) return '-';
    return grade.toFixed(1);
  };

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Résultats de la classe {data.className}
        </h3>
        <Button onClick={onExport} variant="secondary" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          <span>Exporter JSON</span>
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un élève..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Filter className="h-4 w-4 mr-2" />
          <span>{filteredStudents.length} élèves sur {data.students.length}</span>
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[600px]">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead className="min-w-[180px] cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center space-x-1">
                  <span>Élève</span>
                  {sortField === 'name' && 
                    <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
                  }
                </div>
              </TableHead>
              
              {data.subjects.map(subject => (
                <TableHead 
                  key={subject} 
                  className="min-w-[100px] cursor-pointer text-center"
                  onClick={() => handleSort(subject)}
                >
                  <div className="flex items-center space-x-1 justify-center">
                    <span>{subject}</span>
                    {sortField === subject && 
                      <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
                    }
                  </div>
                </TableHead>
              ))}
              
              <TableHead 
                className="min-w-[100px] cursor-pointer text-center"
                onClick={() => handleSort('average')}
              >
                <div className="flex items-center space-x-1 justify-center">
                  <span>Moyenne</span>
                  {sortField === 'average' && 
                    <ArrowUpDown className={`h-3 w-3 ${sortDirection === 'asc' ? 'rotate-0' : 'rotate-180'}`} />
                  }
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {sortedStudents.length > 0 ? (
              sortedStudents.map((student, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  
                  {data.subjects.map(subject => (
                    <TableCell key={subject} className="text-center">
                      <span className={student.grades[subject] !== null ? (
                        student.grades[subject]! < 10 ? 'text-red-500' : 
                        student.grades[subject]! < 14 ? 'text-orange-500' : 
                        'text-green-500'
                      ) : ''}>
                        {formatGrade(student.grades[subject])}
                      </span>
                    </TableCell>
                  ))}
                  
                  <TableCell className="text-center font-medium">
                    <span className={
                      student.average !== undefined ? (
                        student.average < 10 ? 'text-red-500' : 
                        student.average < 14 ? 'text-orange-500' : 
                        'text-green-500'
                      ) : ''
                    }>
                      {student.average !== undefined ? student.average.toFixed(1) : '-'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={data.subjects.length + 2} className="text-center py-4 text-muted-foreground">
                  Aucun élève trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between text-sm text-muted-foreground mt-2">
        <div>Total: {data.students.length} élèves</div>
        <div>
          Moyenne de classe: {
            data.students.length > 0 
              ? (data.students.reduce((sum, student) => sum + (student.average || 0), 0) / data.students.length).toFixed(1)
              : '-'
          }
        </div>
      </div>
    </div>
  );
};

export default GradeTablePreview;
