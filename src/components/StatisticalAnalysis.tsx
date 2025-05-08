
import React from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownIcon, ArrowUpIcon, MoveHorizontalIcon } from 'lucide-react';

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
  averages: Record<string, number>;
  evolution: number | null;
  teacher?: string; // Ajout du nom de l'enseignant
  comments?: string; // Ajout des appréciations
}

interface StatisticalAnalysisProps {
  categories: CategoryData[];
  termAverages: TermAverage[];
  subjectAverages: SubjectAverage[];
}

const StatisticalAnalysis: React.FC<StatisticalAnalysisProps> = ({ 
  categories, 
  termAverages,
  subjectAverages
}) => {
  const totalStudents = categories.reduce((sum, cat) => sum + cat.count, 0);
  
  const renderEvolutionIndicator = (evolution: number | null) => {
    if (evolution === null) return null;
    
    if (evolution > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-500" />;
    } else if (evolution < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-500" />;
    } else {
      return <MoveHorizontalIcon className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-3">Répartition des élèves par niveau</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categories}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="category" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  formatter={(value: number) => [`${value} élèves`, 'Effectif']}
                />
                <Bar dataKey="count">
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="overflow-hidden bg-secondary/20 rounded-lg">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/30">
                  <th className="px-3 py-2 text-left text-sm">Niveau</th>
                  <th className="px-3 py-2 text-left text-sm">Notes</th>
                  <th className="px-3 py-2 text-center text-sm">Nb élèves</th>
                  <th className="px-3 py-2 text-center text-sm">%</th>
                  <th className="px-3 py-2 text-center text-sm">Évolution</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={index} className="border-b border-secondary/20">
                    <td className="px-3 py-2 text-sm font-medium">{category.category}</td>
                    <td className="px-3 py-2 text-sm">{category.range}</td>
                    <td className="px-3 py-2 text-center text-sm">{category.count}</td>
                    <td className="px-3 py-2 text-center text-sm">
                      {totalStudents > 0 ? ((category.count / totalStudents) * 100).toFixed(1) : "0"}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      {renderEvolutionIndicator(category.evolution)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-secondary/30 font-medium">
                  <td className="px-3 py-2 text-sm" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-center text-sm">{totalStudents}</td>
                  <td className="px-3 py-2 text-center text-sm">100%</td>
                  <td className="px-3 py-2"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium mb-3">Évolution des moyennes par trimestre</h2>
        <div className="overflow-hidden bg-secondary/20 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/30">
                <th className="px-4 py-2 text-left text-sm">Trimestre</th>
                <th className="px-4 py-2 text-center text-sm">Moyenne</th>
                <th className="px-4 py-2 text-center text-sm">Évolution</th>
              </tr>
            </thead>
            <tbody>
              {termAverages.map((term, index) => (
                <tr key={index} className="border-b border-secondary/20">
                  <td className="px-4 py-2 text-sm font-medium">{term.term}</td>
                  <td className="px-4 py-2 text-center text-sm">
                    {typeof term.average === 'number' ? term.average.toFixed(2) : term.average}
                  </td>
                  <td className="px-4 py-2 text-center flex justify-center items-center">
                    {renderEvolutionIndicator(term.evolution)}
                    {term.evolution !== null && (
                      <span className={`ml-1 text-xs ${
                        term.evolution > 0 ? 'text-green-600' : 
                        term.evolution < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {term.evolution > 0 ? '+' : ''}{term.evolution.toFixed(2)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div>
        <h2 className="text-lg font-medium mb-3">Matières et appréciations</h2>
        <div className="overflow-hidden bg-secondary/20 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/30">
                <th className="px-4 py-2 text-left text-sm">Matière</th>
                <th className="px-4 py-2 text-left text-sm">Professeur</th>
                {Object.keys(subjectAverages[0]?.averages || {}).map(term => (
                  <th key={term} className="px-4 py-2 text-center text-sm">
                    {term}
                  </th>
                ))}
                <th className="px-4 py-2 text-center text-sm">Évolution</th>
                <th className="px-4 py-2 text-left text-sm">Appréciation</th>
              </tr>
            </thead>
            <tbody>
              {subjectAverages.map((subject, index) => (
                <tr key={index} className="border-b border-secondary/20">
                  <td className="px-4 py-2 text-sm font-medium">{subject.name}</td>
                  <td className="px-4 py-2 text-sm">{subject.teacher || '-'}</td>
                  {Object.entries(subject.averages).map(([term, avg]) => (
                    <td key={term} className="px-4 py-2 text-center text-sm">
                      {typeof avg === 'number' ? avg.toFixed(2) : avg}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center flex justify-center items-center">
                    {renderEvolutionIndicator(subject.evolution)}
                    {subject.evolution !== null && (
                      <span className={`ml-1 text-xs ${
                        subject.evolution > 0 ? 'text-green-600' : 
                        subject.evolution < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {subject.evolution > 0 ? '+' : ''}{subject.evolution.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm max-w-xs truncate hover:text-clip hover:whitespace-normal">
                    {subject.comments || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StatisticalAnalysis;
