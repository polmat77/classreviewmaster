
import React, { useState } from 'react';
import { 
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
import { ChevronUp, ChevronDown, Minus, TrendingUp, Users, BookOpen } from 'lucide-react';

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
    { 
      category: 'Excellent', 
      count: 5, 
      color: '#2dd4bf',
      criteria: '≥ 16/20',
      characteristics: 'Maîtrise parfaite, excellente autonomie'
    },
    { 
      category: 'Assez bon', 
      count: 12, 
      color: '#4ade80',
      criteria: '14-15,9/20',
      characteristics: 'Bonne maîtrise, travail régulier'
    },
    { 
      category: 'Moyen', 
      count: 8, 
      color: '#facc15',
      criteria: '10-13,9/20',
      characteristics: 'Maîtrise partielle, manque de régularité'
    },
    { 
      category: 'En difficulté', 
      count: 3, 
      color: '#f87171',
      criteria: '< 10/20',
      characteristics: 'Difficultés importantes, lacunes à combler'
    }
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
  
  return (
    <div className={cn("space-y-6", className)}>
      <div className="glass-panel p-5 space-y-4 animate-slide-up" style={{ "--index": 1 } as React.CSSProperties}>
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
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="bg-secondary/50">
                <th className="p-3 text-left text-sm font-medium">Niveau</th>
                <th className="p-3 text-left text-sm font-medium">Nombre d'élèves</th>
                <th className="p-3 text-left text-sm font-medium">Critères</th>
                <th className="p-3 text-left text-sm font-medium">Caractéristiques</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.distribution.map((item: any, index: number) => (
                <tr 
                  key={index} 
                  className="hover:bg-secondary/30 transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium">{item.category}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center">
                      <div className="w-full bg-secondary rounded-full h-2 mr-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${(item.count / data.distribution.reduce((acc: number, curr: any) => acc + curr.count, 0)) * 100}%`,
                            backgroundColor: item.color 
                          }}
                        ></div>
                      </div>
                      <span className="whitespace-nowrap">{item.count} élèves</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm">{item.criteria}</td>
                  <td className="p-3 text-sm text-muted-foreground">{item.characteristics}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="glass-panel p-5 space-y-4 animate-slide-up" style={{ "--index": 3 } as React.CSSProperties}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Performance par matière</h3>
          <div className="bg-primary/10 rounded-full p-2">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
        </div>
        
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
