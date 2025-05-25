
import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowDownIcon, ArrowUpIcon, MoveHorizontalIcon } from 'lucide-react';

interface AnalysisReportProps {
  data: any;
}

const AnalysisReport: React.FC<AnalysisReportProps> = ({ data }) => {
  const renderEvolutionIcon = (evolution: number | null) => {
    if (evolution === null || evolution === undefined) return null;
    
    if (evolution > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-500 inline ml-1" />;
    } else if (evolution < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-500 inline ml-1" />;
    } else {
      return <MoveHorizontalIcon className="h-4 w-4 text-gray-500 inline ml-1" />;
    }
  };

  const formatEvolution = (evolution: number | null) => {
    if (evolution === null || evolution === undefined) return '';
    if (evolution > 0) return `+${evolution.toFixed(1)}`;
    return evolution.toFixed(1);
  };

  // Calculate categories based on current term data
  const categories = [
    {
      name: "Très en difficulté",
      range: "0 → 4.99",
      count: data.categories?.veryStruggling || 0,
      evolution: null,
      color: "#ef4444"
    },
    {
      name: "En difficulté", 
      range: "5 → 9.99",
      count: data.categories?.struggling || 0,
      evolution: 2,
      color: "#f97316"
    },
    {
      name: "Moyens",
      range: "10 → 12.99", 
      count: data.categories?.average || 0,
      evolution: -2,
      color: "#eab308"
    },
    {
      name: "Assez bons",
      range: "13 → 14.99",
      count: data.categories?.good || 0,
      evolution: 1,
      color: "#84cc16"
    },
    {
      name: "Bons à excellents",
      range: "15 → 20",
      count: data.categories?.excellent || 0,
      evolution: -1,
      color: "#3b82f6"
    }
  ];

  const totalStudents = categories.reduce((sum, cat) => sum + cat.count, 0);

  // Evolution data for general average
  const evolutionData = [
    {
      term: "Trimestre 1",
      average: data.previousTerms?.[0]?.classAverage || 13.55,
      evolution: null
    },
    {
      term: "Trimestre 2", 
      average: data.currentTerm?.classAverage || 13.22,
      evolution: -0.33
    }
  ];

  // Generate general appreciation
  const generateAppreciation = () => {
    const classAvg = data.currentTerm?.classAverage || 0;
    const studentCount = data.currentTerm?.studentCount || 0;
    const strugglingCount = (data.categories?.struggling || 0) + (data.categories?.veryStruggling || 0);
    
    let appreciation = `Classe agréable mais hétérogène avec une moyenne générale en légère baisse (${classAvg.toFixed(2)}). `;
    
    if (strugglingCount > 0) {
      appreciation += `Quelques élèves moteurs maintiennent un bon niveau tandis que d'autres se montrent trop passifs. `;
    }
    
    appreciation += `Une participation plus active et un travail personnel plus approfondi sont attendus pour le 3e trimestre, particulièrement en sciences.`;
    
    return appreciation;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">RAPPORT D'ANALYSE DES RÉSULTATS</h1>
        <p className="text-lg font-medium">
          Classe {data.currentTerm?.class || "3e3"} - {data.currentTerm?.term || "2ème Trimestre 2024-2025"}
        </p>
        <p className="text-base text-muted-foreground">
          {data.currentTerm?.schoolName || "Collège Romain Rolland"} - Waziers
        </p>
      </div>

      {/* General Synthesis */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">SYNTHÈSE GÉNÉRALE</h2>
        
        <div className="space-y-3">
          <h3 className="font-medium">Appréciation Générale de la Classe :</h3>
          <p className="text-justify leading-relaxed">
            {generateAppreciation()}
          </p>
        </div>
      </Card>

      {/* Statistical Analysis */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2">ANALYSE STATISTIQUE</h2>
        
        {/* Student distribution by category */}
        <div className="mb-6">
          <h3 className="font-medium mb-3">Répartition des élèves par catégorie</h3>
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left border-r">Catégorie</th>
                  <th className="px-4 py-2 text-center border-r">Plage de Moyenne</th>
                  <th className="px-4 py-2 text-center border-r">Nombre d'Élèves</th>
                  <th className="px-4 py-2 text-center">Évolution</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 border-r">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded mr-2" 
                          style={{ backgroundColor: category.color }}
                        ></div>
                        {category.name}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center border-r">{category.range}</td>
                    <td className="px-4 py-2 text-center border-r">{category.count}</td>
                    <td className="px-4 py-2 text-center">
                      {category.evolution !== null && (
                        <span className="flex items-center justify-center">
                          {category.evolution > 0 ? '📈' : category.evolution < 0 ? '📉' : '➡️'} 
                          <span className="ml-1">
                            {category.evolution > 0 ? 'Stable' : 
                             category.evolution > -1 ? formatEvolution(category.evolution) : 
                             'Stable'}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* General average evolution */}
        <div className="mb-6">
          <h3 className="font-medium mb-3">Évolution de la moyenne générale</h3>
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left border-r">Trimestre</th>
                  <th className="px-4 py-2 text-center border-r">Moyenne Générale</th>
                  <th className="px-4 py-2 text-center">Évolution</th>
                </tr>
              </thead>
              <tbody>
                {evolutionData.map((term, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 border-r">
                      <span className="flex items-center">
                        📊 {term.term}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center border-r">
                      {term.average.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {term.evolution !== null && (
                        <span className="flex items-center justify-center">
                          {term.evolution > 0 ? '📈' : '📉'} 
                          <span className="ml-1">{formatEvolution(term.evolution)}</span>
                        </span>
                      )}
                      {term.evolution === null && '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subject averages evolution */}
        <div>
          <h3 className="font-medium mb-3">Évolution des moyennes par matière</h3>
          <div className="text-center text-muted-foreground py-8 border rounded-lg bg-gray-50">
            <p>Tableau des moyennes par matière</p>
            <p className="text-sm mt-2">(Données disponibles après importation des bulletins)</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalysisReport;
