
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { FileText, Download, Printer, Settings, Eye, Bookmark, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const Rapport = () => {
  const [currentView, setCurrentView] = useState('preview');
  
  const downloadReport = () => {
    toast.success("Téléchargement du rapport PDF en cours");
  };
  
  const printReport = () => {
    toast.success("Impression du rapport lancée");
  };
  
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="section-title">Rapport Final</h1>
          <p className="section-description">
            Prévisualisez et téléchargez le rapport complet de la classe.
          </p>
        </div>
        
        <div className="flex gap-4 bg-card shadow-subtle rounded-lg p-2">
          <button
            onClick={() => setCurrentView('preview')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
              currentView === 'preview' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            <Eye className="h-4 w-4" />
            <span>Aperçu</span>
          </button>
          
          <button
            onClick={() => setCurrentView('settings')}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-md transition-colors",
              currentView === 'settings' ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Paramètres</span>
          </button>
          
          <div className="flex-1"></div>
          
          <button
            onClick={printReport}
            className="flex items-center space-x-2 px-4 py-2 rounded-md hover:bg-secondary transition-colors"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer</span>
          </button>
          
          <button
            onClick={downloadReport}
            className="flex items-center space-x-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Télécharger le PDF</span>
          </button>
        </div>
        
        {currentView === 'preview' ? (
          <div className="glass-panel p-8 max-w-4xl mx-auto shadow-elevation-2">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold">Collège Michel Chasles</h2>
              <p className="text-muted-foreground">Bilan de classe - 4ème A - Trimestre 3</p>
              <p className="text-sm text-muted-foreground">Année scolaire 2022-2023</p>
            </div>
            
            <div className="border-t border-b py-4 mb-6">
              <h3 className="text-lg font-medium mb-2">Synthèse générale</h3>
              <p className="text-sm">
                Classe agréable et motivée, avec un bon niveau général et une ambiance de travail favorable 
                aux apprentissages. Les résultats sont en hausse par rapport au trimestre précédent, 
                particulièrement en Histoire-Géographie et SVT.
              </p>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Statistiques générales</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-secondary/40 p-3 rounded-lg text-center">
                  <div className="text-3xl font-bold">13.2</div>
                  <div className="text-xs text-muted-foreground">Moyenne générale</div>
                </div>
                <div className="bg-secondary/40 p-3 rounded-lg text-center">
                  <div className="text-3xl font-bold text-green-600">+0.8</div>
                  <div className="text-xs text-muted-foreground">Évolution</div>
                </div>
                <div className="bg-secondary/40 p-3 rounded-lg text-center">
                  <div className="text-3xl font-bold">14.1</div>
                  <div className="text-xs text-muted-foreground">Meilleure matière</div>
                </div>
                <div className="bg-secondary/40 p-3 rounded-lg text-center">
                  <div className="text-3xl font-bold">11.2</div>
                  <div className="text-xs text-muted-foreground">Matière à renforcer</div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Répartition des élèves</h3>
              <div className="h-8 bg-secondary rounded-full overflow-hidden flex">
                <div className="bg-red-400 h-full" style={{ width: '11%' }} title="En difficulté"></div>
                <div className="bg-yellow-400 h-full" style={{ width: '29%' }} title="Moyen"></div>
                <div className="bg-green-400 h-full" style={{ width: '42%' }} title="Assez bon"></div>
                <div className="bg-teal-400 h-full" style={{ width: '18%' }} title="Excellent"></div>
              </div>
              <div className="flex text-xs justify-between mt-1">
                <span>3 élèves en difficulté</span>
                <span>8 élèves moyens</span>
                <span>12 élèves assez bons</span>
                <span>5 élèves excellents</span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Moyennes par matière</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-sm">Matière</th>
                    <th className="text-right py-2 font-medium text-sm">T3</th>
                    <th className="text-right py-2 font-medium text-sm">T2</th>
                    <th className="text-right py-2 font-medium text-sm">Évolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2 text-sm">Français</td>
                    <td className="py-2 text-sm text-right">12.4</td>
                    <td className="py-2 text-sm text-right text-muted-foreground">11.8</td>
                    <td className="py-2 text-sm text-right text-green-600">+0.6</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">Mathématiques</td>
                    <td className="py-2 text-sm text-right">11.2</td>
                    <td className="py-2 text-sm text-right text-muted-foreground">12.1</td>
                    <td className="py-2 text-sm text-right text-red-600">-0.9</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">Histoire-Géographie</td>
                    <td className="py-2 text-sm text-right">13.8</td>
                    <td className="py-2 text-sm text-right text-muted-foreground">12.9</td>
                    <td className="py-2 text-sm text-right text-green-600">+0.9</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">SVT</td>
                    <td className="py-2 text-sm text-right">14.1</td>
                    <td className="py-2 text-sm text-right text-muted-foreground">13.5</td>
                    <td className="py-2 text-sm text-right text-green-600">+0.6</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-sm">Anglais</td>
                    <td className="py-2 text-sm text-right">13.5</td>
                    <td className="py-2 text-sm text-right text-muted-foreground">13.6</td>
                    <td className="py-2 text-sm text-right text-yellow-600">-0.1</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="text-center text-xs text-muted-foreground border-t pt-4">
              <p>Document généré par BulletinPro le {new Date().toLocaleDateString()}</p>
              <p>Confidentiel - Usage pédagogique uniquement</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-panel p-5 space-y-4">
              <h3 className="font-medium">Paramètres du rapport</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Titre du document
                  </label>
                  <input 
                    type="text"
                    defaultValue="Bilan de classe - 4ème A - Trimestre 3"
                    className="glass-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Établissement
                  </label>
                  <input 
                    type="text"
                    defaultValue="Collège Michel Chasles"
                    className="glass-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Année scolaire
                  </label>
                  <input 
                    type="text"
                    defaultValue="2022-2023"
                    className="glass-input w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Professeur principal
                  </label>
                  <input 
                    type="text"
                    defaultValue="Marie Dupont"
                    className="glass-input w-full"
                  />
                </div>
              </div>
            </div>
            
            <div className="glass-panel p-5 space-y-4">
              <h3 className="font-medium">Contenu du rapport</h3>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <input id="stats" type="checkbox" className="rounded" defaultChecked />
                  <label htmlFor="stats" className="ml-2 text-sm">
                    Statistiques générales
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input id="distribution" type="checkbox" className="rounded" defaultChecked />
                  <label htmlFor="distribution" className="ml-2 text-sm">
                    Répartition des élèves
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input id="subjects" type="checkbox" className="rounded" defaultChecked />
                  <label htmlFor="subjects" className="ml-2 text-sm">
                    Moyennes par matière
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input id="appreciation" type="checkbox" className="rounded" defaultChecked />
                  <label htmlFor="appreciation" className="ml-2 text-sm">
                    Appréciation générale
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input id="individual" type="checkbox" className="rounded" defaultChecked />
                  <label htmlFor="individual" className="ml-2 text-sm">
                    Liste des élèves avec appréciations individuelles
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input id="graphs" type="checkbox" className="rounded" defaultChecked />
                  <label htmlFor="graphs" className="ml-2 text-sm">
                    Graphiques d'évolution
                  </label>
                </div>
              </div>
            </div>
            
            <div className="glass-panel p-5 space-y-4">
              <h3 className="font-medium">Mise en page</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Format
                  </label>
                  <select className="glass-input w-full">
                    <option>A4 Portrait</option>
                    <option>A4 Paysage</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Marges
                  </label>
                  <select className="glass-input w-full">
                    <option>Normales</option>
                    <option>Étroites</option>
                    <option>Larges</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    En-tête et pied de page
                  </label>
                  <select className="glass-input w-full">
                    <option>Standards</option>
                    <option>Minimalistes</option>
                    <option>Détaillés</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="bg-accent/50 rounded-lg p-4 mt-4">
              <div className="flex space-x-3">
                <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-medium">Protection des données</h4>
                  <p className="text-muted-foreground mt-1">
                    Ce rapport peut contenir des données personnelles. Assurez-vous de respecter
                    les règles de confidentialité en vigueur dans votre établissement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Rapport;
