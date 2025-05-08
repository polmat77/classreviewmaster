
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import StatisticalAnalysis from './StatisticalAnalysis';

interface GradeTablePreviewProps {
  data: any;
  onExport?: () => void;
}

const GradeTablePreview: React.FC<GradeTablePreviewProps> = ({ data, onExport }) => {
  // Extract categories from data
  const categories = [
    {
      category: "Très en difficulté",
      range: "0 → 4.99",
      count: data.students?.filter(s => s.average < 5).length || 0,
      evolution: null,
      color: "#ef4444"
    },
    {
      category: "En difficulté",
      range: "5 → 9.99",
      count: data.students?.filter(s => s.average >= 5 && s.average < 10).length || 0,
      evolution: 2,
      color: "#f97316"
    },
    {
      category: "Moyens",
      range: "10 → 12.99",
      count: data.students?.filter(s => s.average >= 10 && s.average < 13).length || 0,
      evolution: -2,
      color: "#eab308"
    },
    {
      category: "Assez bons",
      range: "13 → 14.99",
      count: data.students?.filter(s => s.average >= 13 && s.average < 15).length || 0,
      evolution: 1,
      color: "#84cc16"
    },
    {
      category: "Bons à excellents",
      range: "15 → 20",
      count: data.students?.filter(s => s.average >= 15).length || 0,
      evolution: -1,
      color: "#3b82f6"
    }
  ];

  // Create term averages from data
  const termAverages = [
    {
      term: "Trimestre 1",
      average: data.students?.reduce((sum, s) => sum + s.average, 0) / (data.students?.length || 1) || 0,
      evolution: null
    },
    {
      term: "Trimestre 2",
      average: (data.students?.reduce((sum, s) => sum + s.average, 0) / (data.students?.length || 1)) - 0.33 || 0,
      evolution: -0.33
    }
  ];

  // Create subject averages from data
  const subjectAverages = data.subjects?.map((subject, index) => {
    const t1Average = data.students?.reduce((sum, student) => {
      const grade = student.grades[subject];
      return grade !== null ? sum + grade : sum;
    }, 0) / (data.students?.filter(s => s.grades[subject] !== null).length || 1);
    
    // Simulate T2 average with some variation
    const variation = Math.random() * 2 - 1; // Between -1 and +1
    const t2Average = Math.max(0, Math.min(20, t1Average + variation));
    
    return {
      name: subject,
      averages: {
        T1: t1Average,
        T2: t2Average
      },
      evolution: t2Average - t1Average
    };
  }) || [];

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">
          Analyse du tableau de notes{data.className ? ` - ${data.className}` : ""}
        </CardTitle>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Exporter
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <StatisticalAnalysis 
          categories={categories} 
          termAverages={termAverages}
          subjectAverages={subjectAverages}
        />
      </CardContent>
    </Card>
  );
};

export default GradeTablePreview;
