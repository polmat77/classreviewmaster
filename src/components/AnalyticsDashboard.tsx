
import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, Minus, BarChart3, TrendingUp } from 'lucide-react';
import AnalysisUploader from './AnalysisUploader';

interface AnalyticsDashboardProps {
  data?: any;
  className?: string;
}

// Mock data - would be replaced with actual data from CSV imports
const mockData = {
  averages: [
    { name: 'T1', moyenne: 11.8 },
    { name: 'T2', moyenne: 12.4 },
    { name: 'T3', moyenne: 13.2 },
  ],
  distribution: [
    { category: 'Difficulté', count: 3, color: '#f87171' },
    { category: 'Moyen', count: 8, color: '#facc15' },
    { category: 'Assez bon', count: 12, color: '#4ade80' },
    { category: 'Excellent', count: 5, color: '#2dd4bf' },
  ],
  subjects: [
    { name: 'Français', current: 12.4, previous: 11.8, change: 0.6 },
    { name: 'Mathématiques', current: 11.2, previous: 12.1, change: -0.9 },
    { name: 'Histoire-Géo', current: 13.8, previous: 12.9, change: 0.9 },
    { name: 'SVT', current: 14.1, previous: 13.5, change: 0.6 },
    { name: 'Anglais', current: 13.5, previous: 13.6, change: -0.1 },
  ]
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  data = mockData, 
  className 
}) => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const getChangeColor = (change: number) => {
    if (change > 0.2) return 'text-green-500';
    if (change < -0.2) return 'text-red-500';
    return 'text-yellow-500';
  };
  
  const getChangeIcon = (change: number) => {
    if (change > 0.2) return <ChevronUp className="h-4 w-4" />;
    if (change < -0.2) return <ChevronDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const handleFilesUploaded = () => {
    // Trigger a refresh of the component to reflect new data
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className={cn("space-y-6", className)}>
      <div className="glass-panel p-5 space-y-4 animate-slide-up" style={{ "--index": 0 } as React.CSSProperties}>
        <h3 className="text-lg font-medium">Importer des données pour l'analyse</h3>
        <AnalysisUploader onFilesUploaded={handleFilesUploaded} />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-5 space-y-4 col-span-2 animate-slide-up" style={{ "--index": 1 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Évolution de la moyenne générale</h3>
            <div className="bg-primary/10 rounded-full p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.averages}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  domain={[0, 20]} 
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: 'none'
                  }}
                  labelStyle={{ fontWeight: 500 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="moyenne" 
                  stroke="hsl(var(--primary))" 
                  activeDot={{ r: 6 }}
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="glass-panel p-5 space-y-4 animate-slide-up" style={{ "--index": 2 } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Répartition des élèves</h3>
            <div className="bg-primary/10 rounded-full p-2">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.distribution}
                margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis 
                  dataKey="category" 
                  tick={{ fill: '#888', fontSize: 11, dy: 10 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fill: '#888', fontSize: 12 }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    border: 'none'
                  }}
                  labelStyle={{ fontWeight: 500 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="glass-panel p-5 space-y-4 animate-slide-up" style={{ "--index": 3 } as React.CSSProperties}>
        <h3 className="text-lg font-medium">Performance par matière</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead className="text-left border-b">
              <tr>
                <th className="pb-3 font-medium text-sm">Matière</th>
                <th className="pb-3 font-medium text-sm text-right">Moyenne actuelle</th>
                <th className="pb-3 font-medium text-sm text-right">Trimestre précédent</th>
                <th className="pb-3 font-medium text-sm text-right">Évolution</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.subjects.map((subject: any, index: number) => (
                <tr key={index} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 text-sm font-medium">{subject.name}</td>
                  <td className="py-3 text-sm text-right">{subject.current}</td>
                  <td className="py-3 text-sm text-right text-muted-foreground">{subject.previous}</td>
                  <td className="py-3 text-sm text-right">
                    <div className={cn("flex items-center justify-end", getChangeColor(subject.change))}>
                      {getChangeIcon(subject.change)}
                      <span className="ml-1">{subject.change > 0 ? '+' : ''}{subject.change.toFixed(1)}</span>
                    </div>
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

export default AnalyticsDashboard;
