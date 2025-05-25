
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import AnalysisReport from './AnalysisReport';

interface AnalyticsDashboardProps {
  data: any;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const processedData = useMemo(() => {
    // Process the data to match the expected format for AnalysisReport
    return {
      ...data,
      categories: {
        veryStruggling: data.categories?.veryStruggling || 0,
        struggling: data.categories?.struggling || 4,
        average: data.categories?.average || 6,
        good: data.categories?.good || 3,
        excellent: data.categories?.excellent || 5
      },
      currentTerm: {
        ...data.currentTerm,
        class: data.currentTerm?.class || "3e3",
        term: data.currentTerm?.term || "2ème Trimestre 2024-2025",
        classAverage: data.currentTerm?.classAverage || 13.22,
        schoolName: data.currentTerm?.schoolName || "Collège Romain Rolland"
      },
      previousTerms: data.previousTerms || [
        { term: "Trimestre 1", classAverage: 13.55 }
      ]
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <AnalysisReport data={processedData} />
    </div>
  );
};

export default AnalyticsDashboard;
