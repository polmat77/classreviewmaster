
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { 
  BarChart2, 
  TrendingUp, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPreviousGradeFiles } from '@/utils/data-processing';

const Analyse = () => {
  const [hasPreviousFiles, setHasPreviousFiles] = useState(false);
  
  useEffect(() => {
    // Check if there are previous files to show appropriate analysis
    const prevFiles = getPreviousGradeFiles();
    setHasPreviousFiles(prevFiles && prevFiles.length > 0);
  }, []);
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Analyse par matière</h1>
          <p className="section-description">
            Explorez les performances détaillées par matière et identifiez les tendances.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 items-center mb-4">
          <div className="flex-1">
            <div className="relative">
              <Filter className="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Filtrer par matière..."
                className="glass-input pl-9 h-9 w-full text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select className="glass-input text-sm h-9 pr-8">
              <option>Tous les trimestres</option>
              <option>Trimestre 3</option>
              <option>Trimestre 2</option>
              <option>Trimestre 1</option>
            </select>
            
            <select className="glass-input text-sm h-9 pr-8">
              <option>Toutes les matières</option>
              <option>Français</option>
              <option>Mathématiques</option>
              <option>Histoire-Géo</option>
              <option>SVT</option>
              <option>Anglais</option>
            </select>
          </div>
        </div>
        
        <AnalyticsDashboard />
        
        {hasPreviousFiles && (
          <div className="glass-panel p-5 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Tendances clés identifiées</h3>
              <div className="bg-primary/10 rounded-full p-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-green-100 p-2 rounded-full">
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  </div>
                  <h4 className="ml-3 font-medium text-green-800">Progression significative</h4>
                </div>
                <p className="mt-2 text-sm text-green-700">
                  La classe a progressé de <strong>+0.8 point</strong> en moyenne générale 
                  depuis le trimestre précédent, particulièrement en Histoire-Géographie et SVT.
                </p>
              </div>
              
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <ArrowDownRight className="h-4 w-4 text-orange-600" />
                  </div>
                  <h4 className="ml-3 font-medium text-orange-800">Point d'attention</h4>
                </div>
                <p className="mt-2 text-sm text-orange-700">
                  Les résultats en Mathématiques sont en baisse de <strong>-0.9 point</strong>, 
                  ce qui pourrait nécessiter des mesures spécifiques.
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <BarChart2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <h4 className="ml-3 font-medium text-blue-800">Distribution des notes</h4>
                </div>
                <p className="mt-2 text-sm text-blue-700">
                  La répartition est équilibrée avec <strong>61%</strong> des élèves au-dessus 
                  de la moyenne. Les résultats sont plus homogènes qu'au trimestre précédent.
                </p>
              </div>
              
              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="bg-red-100 p-2 rounded-full">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <h4 className="ml-3 font-medium text-red-800">Élèves en difficulté</h4>
                </div>
                <p className="mt-2 text-sm text-red-700">
                  <strong>3 élèves</strong> sont en difficulté avec une moyenne générale inférieure à 8, 
                  principalement en Mathématiques et Français.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Analyse;
