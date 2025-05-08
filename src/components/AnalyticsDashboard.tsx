
import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import StatisticalAnalysis from './StatisticalAnalysis';

interface AnalyticsDashboardProps {
  data: any;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ data }) => {
  const categories = useMemo(() => {
    return [
      {
        category: "Très en difficulté",
        range: "0 → 4.99",
        count: data.categories.veryStruggling || 0,
        evolution: null,
        color: "#ef4444"
      },
      {
        category: "En difficulté",
        range: "5 → 9.99",
        count: data.categories.struggling || 0,
        evolution: 2,
        color: "#f97316"
      },
      {
        category: "Moyens",
        range: "10 → 12.99",
        count: data.categories.average || 0,
        evolution: -2,
        color: "#eab308"
      },
      {
        category: "Assez bons",
        range: "13 → 14.99",
        count: data.categories.good || 0,
        evolution: 1,
        color: "#84cc16"
      },
      {
        category: "Bons à excellents",
        range: "15 → 20",
        count: data.categories.excellent || 0,
        evolution: -1,
        color: "#3b82f6"
      }
    ];
  }, [data.categories]);

  const termAverages = useMemo(() => {
    // Extract term data from the previous terms plus current term
    const terms = [
      ...(Array.isArray(data.previousTerms) ? data.previousTerms : []),
      {
        term: data.currentTerm.term,
        classAverage: data.currentTerm.classAverage
      }
    ];
    
    return terms.map((term, index) => {
      // Calculate evolution for terms after the first one
      const evolution = index > 0 ? 
        Number((term.classAverage - terms[index - 1].classAverage).toFixed(2)) : null;
      
      return {
        term: term.term,
        average: term.classAverage,
        evolution: evolution
      };
    });
  }, [data.previousTerms, data.currentTerm]);

  const subjectAverages = useMemo(() => {
    const allTermsWithData = [
      ...(Array.isArray(data.previousTerms) ? data.previousTerms.map(t => t.term) : []),
      data.currentTerm.term
    ];

    // Get all subjects from the current term
    const subjects = data.subjects || [];
    
    return subjects.map(subject => {
      const averages = {};
      
      // For each term, find the corresponding average for this subject
      allTermsWithData.forEach((term, index) => {
        const shortTerm = `T${index + 1}`;
        
        if (index === allTermsWithData.length - 1) {
          // Current term
          averages[shortTerm] = subject.current;
        } else {
          // Previous terms
          averages[shortTerm] = subject.previous || 0;
        }
      });
      
      return {
        name: subject.name,
        averages,
        evolution: subject.change
      };
    });
  }, [data.subjects, data.previousTerms, data.currentTerm]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <StatisticalAnalysis 
          categories={categories}
          termAverages={termAverages}
          subjectAverages={subjectAverages}
        />
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
