// src/utils/ai/promptBuilder.ts

import { AnalysisRequest } from './types';

/**
 * Formate les données de classe en un prompt structuré pour l'IA
 * @param data Les données de classe et trimestres à analyser
 * @returns Le prompt formaté pour l'IA
 */
export const formatPromptForAI = (data: AnalysisRequest): string => {
  const { classData, trimesters } = data;
  
  // Commencer par des instructions générales
  let prompt = `Analyse les résultats scolaires suivants pour une classe sur ${trimesters.length} trimestre(s): ${trimesters.join(', ')}.\n\n`;
  
  // Ajouter les moyennes de classe
  prompt += "MOYENNES DE CLASSE PAR TRIMESTRE:\n";
  trimesters.forEach(trimester => {
    const trimData = classData.find(d => d.trimester === trimester);
    if (trimData) {
      prompt += `${trimester}: ${trimData.averages.classAverage.toFixed(2)}/20\n`;
    }
  });
  
  // Ajouter les données de répartition
  prompt += "\nRÉPARTITION DES ÉLÈVES PAR TRANCHES DE NOTES:\n";
  trimesters.forEach(trimester => {
    const trimData = classData.find(d => d.trimester === trimester);
    if (trimData) {
      prompt += `${trimester}:\n`;
      trimData.averages.rangeDistribution.forEach((range) => {
        prompt += `- ${range.range}: ${range.count} élèves (${range.percentage}%)\n`;
      });
    }
  });
  
  // Ajouter les moyennes par matière
  prompt += "\nMOYENNES PAR MATIÈRE:\n";
  trimesters.forEach(trimester => {
    const trimData = classData.find(d => d.trimester === trimester);
    if (trimData) {
      prompt += `${trimester}:\n`;
      Object.entries(trimData.averages.subjects).forEach(([subject, average]) => {
        prompt += `- ${subject}: ${(average as number).toFixed(2)}/20\n`;
      });
    }
  });
  
  // Ajouter des instructions pour l'analyse
  prompt += "\nINSTRUCTIONS D'ANALYSE:\n";
  prompt += "1. Fournir un résumé général de l'évolution de la classe sur la période donnée.\n";
  prompt += "2. Analyser l'évolution de la moyenne générale de la classe.\n";
  prompt += "3. Commenter la répartition des élèves par tranches de notes (0-5, 5-10, 10-15, 15-20) et son évolution.\n";
  prompt += "4. Identifier les matières où les élèves excellent et celles qui posent des difficultés.\n";
  prompt += "5. Suggérer des pistes d'amélioration ciblées.\n";
  
  return prompt;
};

/**
 * Retourne le message système à utiliser pour l'IA
 */
export const getSystemMessage = (): string => {
  return "Vous êtes un professeur principal expérimenté qui analyse des résultats scolaires d'une classe. Votre analyse est factuelle, précise et constructive. Votre objectif est d'identifier les tendances, les forces et les points d'amélioration à partir des données fournies.";
};