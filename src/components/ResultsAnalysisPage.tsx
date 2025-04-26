
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const ResultsAnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Analyse des résultats</h2>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Importation de bulletins</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Importez les bulletins de vos élèves pour les analyser et générer des appréciations.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/importation-bulletins')}>
              Importer des bulletins
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Appréciations individuelles</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Générez des appréciations personnalisées pour chaque élève à partir des données des bulletins.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/appreciations-individuelles')}>
              Appréciations individuelles
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Appréciation générale</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Générez une appréciation générale pour l'ensemble de la classe à partir des résultats.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/appreciation-generale')}>
              Appréciation générale
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Analyse des résultats</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Analysez les résultats de la classe avec des graphiques et statistiques.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/analyse')}>
              Voir l'analyse
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Rapport de conseil</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Générez un rapport complet pour le conseil de classe.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/rapport')}>
              Générer le rapport
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResultsAnalysisPage;
