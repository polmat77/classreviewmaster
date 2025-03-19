
import React from 'react';
import Layout from '@/components/Layout';
import AppreciationGenerator from '@/components/AppreciationGenerator';
import { KeyRound, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const AppreciationGenerale = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Appréciation générale de classe</h1>
          <p className="section-description">
            Générez et personnalisez une appréciation globale pour l'ensemble de la classe.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AppreciationGenerator 
              maxChars={255}
              type="class"
            />
          </div>
          
          <div className="space-y-4">
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full">
                  <KeyRound className="h-4 w-4 text-primary" />
                </div>
                <h3 className="ml-3 font-medium">Points clés à mentionner</h3>
              </div>
              
              <ul className="space-y-2 pl-10 text-sm list-disc">
                <li>Ambiance générale de la classe</li>
                <li>Évolution globale des résultats</li>
                <li>Points forts collectifs</li>
                <li>Axes d'amélioration</li>
                <li>Encouragements pour le prochain trimestre</li>
              </ul>
            </div>
            
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-full">
                  <Lightbulb className="h-4 w-4 text-primary" />
                </div>
                <h3 className="ml-3 font-medium">Conseils de rédaction</h3>
              </div>
              
              <div className="space-y-3 text-sm">
                <p>
                  <span className="font-medium">Soyez précis :</span> Évitez les généralités 
                  et appuyez-vous sur les données analysées.
                </p>
                
                <p>
                  <span className="font-medium">Équilibrez :</span> Mentionnez à la fois les 
                  points positifs et les axes d'amélioration.
                </p>
                
                <p>
                  <span className="font-medium">Personnalisez :</span> Adaptez le ton selon 
                  le profil global de la classe et son évolution.
                </p>
              </div>
            </div>
            
            <div className="bg-accent/50 rounded-lg p-4">
              <div className="flex space-x-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-sm">
                  <p>
                    L'appréciation générée doit respecter la limite de <span className="font-medium">255 caractères</span> 
                    pour être compatible avec les systèmes de gestion des bulletins.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AppreciationGenerale;
