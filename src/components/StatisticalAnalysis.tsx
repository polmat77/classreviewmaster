
import React from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryData {
  category: string;
  range: string;
  count: number;
  evolution: number | null;
  color: string;
}

interface TermAverage {
  term: string;
  average: number;
  evolution: number | null;
}

interface SubjectAverage {
  name: string;
  averages: {
    [key: string]: number;
  };
  evolution: number | null;
}

interface StatisticalAnalysisProps {
  categories: CategoryData[];
  termAverages: TermAverage[];
  subjectAverages: SubjectAverage[];
}

const StatisticalAnalysis: React.FC<StatisticalAnalysisProps> = ({ 
  categories, termAverages, subjectAverages 
}) => {
  const renderEvolutionIndicator = (evolution: number | null) => {
    if (evolution === null) return '-';
    
    if (evolution > 0) {
      return (
        <div className="flex items-center text-green-500">
          <TrendingUp className="h-4 w-4 mr-1" />
          <span>+{evolution}</span>
        </div>
      );
    } else if (evolution < 0) {
      return (
        <div className="flex items-center text-red-500">
          <TrendingDown className="h-4 w-4 mr-1" />
          <span>{evolution}</span>
        </div>
      );
    } else {
      return <span className="text-blue-500">Stable</span>;
    }
  };
  
  const renderCategoryColor = (color: string, category: string) => {
    return (
      <div className="flex items-center">
        <div 
          className="w-4 h-4 mr-2 rounded" 
          style={{ backgroundColor: color }}
        />
        <span>{category}</span>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">ANALYSE STATISTIQUE</h2>
        
        <div>
          <h3 className="text-xl font-semibold mb-3">Répartition des élèves par catégorie</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Plage de Moyenne</TableHead>
                  <TableHead>Nombre d'Élèves</TableHead>
                  <TableHead>Évolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category, index) => (
                  <TableRow key={index}>
                    <TableCell>{renderCategoryColor(category.color, category.category)}</TableCell>
                    <TableCell>{category.range}</TableCell>
                    <TableCell>{category.count}</TableCell>
                    <TableCell>{renderEvolutionIndicator(category.evolution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Évolution de la moyenne générale</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trimestre</TableHead>
                  <TableHead>Moyenne Générale</TableHead>
                  <TableHead>Évolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termAverages.map((term, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center">
                        <span className="bg-gray-100 p-1 rounded text-xs font-medium mr-2">📊</span>
                        {term.term}
                      </div>
                    </TableCell>
                    <TableCell>{term.average.toFixed(2)}</TableCell>
                    <TableCell>{renderEvolutionIndicator(term.evolution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-3">Évolution des moyennes par matière</h3>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matière</TableHead>
                  {Object.keys(subjectAverages[0]?.averages || {}).map((term, i) => (
                    <TableHead key={i}>Moyenne {term}</TableHead>
                  ))}
                  <TableHead>Évolution</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjectAverages.map((subject, index) => (
                  <TableRow key={index}>
                    <TableCell>{subject.name}</TableCell>
                    {Object.values(subject.averages).map((avg, i) => (
                      <TableCell key={i}>{avg.toFixed(2)}</TableCell>
                    ))}
                    <TableCell>{renderEvolutionIndicator(subject.evolution)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StatisticalAnalysis;
