
import { AnalysisRequest, AnalysisResponse } from './types';

/**
 * Génère une analyse simulée pour les tests et le développement
 * @param data Données de classe
 * @returns Réponse d'analyse simulée
 */
export const getSimulatedAnalysis = (data: AnalysisRequest): AnalysisResponse => {
  const { classData, trimesters } = data;
  
  // Simuler une analyse basique
  let summary = `# Analyse des résultats de la classe\n\n`;
  
  // Évolution de la moyenne générale
  summary += `## Évolution de la moyenne générale\n\n`;
  
  if (trimesters.length > 1) {
    const firstTrim = classData.find(d => d.trimester === trimesters[0]);
    const lastTrim = classData.find(d => d.trimester === trimesters[trimesters.length - 1]);
    
    if (firstTrim && lastTrim) {
      const evolution = lastTrim.averages.classAverage - firstTrim.averages.classAverage;
      const evolutionText = evolution >= 0 
        ? `augmentation de ${evolution.toFixed(2)} points` 
        : `baisse de ${Math.abs(evolution).toFixed(2)} points`;
      
      summary += `La moyenne générale de la classe est passée de ${firstTrim.averages.classAverage.toFixed(2)}/20 au ${trimesters[0]} à ${lastTrim.averages.classAverage.toFixed(2)}/20 au ${trimesters[trimesters.length - 1]}, soit une ${evolutionText}.\n\n`;
    }
  } else if (trimesters.length === 1) {
    const trimData = classData[0];
    summary += `La moyenne générale de la classe au ${trimesters[0]} est de ${trimData.averages.classAverage.toFixed(2)}/20.\n\n`;
  }
  
  // Répartition des élèves
  summary += `## Répartition des élèves par tranches de notes\n\n`;
  
  const lastTrimData = classData.find(d => d.trimester === trimesters[trimesters.length - 1]);
  if (lastTrimData) {
    summary += `Au ${trimesters[trimesters.length - 1]} :\n`;
    lastTrimData.averages.rangeDistribution.forEach(range => {
      summary += `- **${range.range}** : ${range.count} élèves (${range.percentage}%)\n`;
    });
    
    // Identifier les élèves en difficulté
    const inDifficulty = lastTrimData.averages.rangeDistribution
      .filter(r => r.range === '0 - 5' || r.range === '5 - 10')
      .reduce((sum, r) => sum + r.count, 0);
    
    const excellent = lastTrimData.averages.rangeDistribution
      .filter(r => r.range === '15 - 20')
      .reduce((sum, r) => sum + r.count, 0);
    
    summary += `\n${inDifficulty} élèves sont en difficulté (moyenne < 10) et ${excellent} élèves ont d'excellents résultats (moyenne ≥ 15).\n\n`;
  }
  
  // Analyse par matière
  summary += `## Analyse par matière\n\n`;
  
  if (lastTrimData) {
    const subjects = Object.entries(lastTrimData.averages.subjects)
      .filter(([subject]) => subject !== 'MOYENNE')
      .sort(([, a], [, b]) => (b as number) - (a as number));
    
    // Matières avec les meilleures moyennes
    summary += `### Points forts de la classe\n`;
    subjects.slice(0, 3).forEach(([subject, average]) => {
      summary += `- **${subject}** : ${(average as number).toFixed(2)}/20\n`;
    });
    
    // Matières avec les moins bonnes moyennes
    summary += `\n### Points à améliorer\n`;
    subjects.slice(-3).reverse().forEach(([subject, average]) => {
      summary += `- **${subject}** : ${(average as number).toFixed(2)}/20\n`;
    });
  }
  
  // Recommandations
  summary += `\n## Recommandations\n\n`;
  
  if (lastTrimData) {
    // Identifier les matières avec des moyennes faibles
    const weakSubjects = Object.entries(lastTrimData.averages.subjects)
      .filter(([subject, avg]) => subject !== 'MOYENNE' && (avg as number) < 10)
      .map(([subject]) => subject);
    
    if (weakSubjects.length > 0) {
      summary += `1. **Renforcement en ${weakSubjects.join(', ')}** : Ces matières présentent les moyennes les plus faibles. Envisager des heures de soutien ou des exercices supplémentaires.\n\n`;
    }
    
    // Recommandation basée sur la répartition
    const belowAverage = lastTrimData.averages.rangeDistribution
      .filter(r => r.range === '0 - 5' || r.range === '5 - 10')
      .reduce((sum, r) => sum + r.count, 0);
    
    if (belowAverage > 0) {
      const percentage = Math.round((belowAverage / lastTrimData.data.length) * 100);
      if (percentage > 30) {
        summary += `2. **Accompagnement personnalisé** : ${percentage}% des élèves ont une moyenne inférieure à 10. Il serait pertinent de mettre en place un accompagnement personnalisé pour ces élèves.\n\n`;
      }
    }
    
    summary += `3. **Valorisation des réussites** : Continuer à encourager les élèves ayant de bons résultats et mettre en place un système de tutorat entre pairs.\n\n`;
  }
  
  return {
    summary,
    recommendations: "Ces recommandations sont basées sur une analyse automatique des données et devraient être adaptées selon votre connaissance de la classe."
  };
};
