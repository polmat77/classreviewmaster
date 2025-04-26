// src/services/aiAnalysisService.ts

/**
 * Service for sending data to AI models for analysis
 */

interface AnalysisRequest {
  classData: any[];  // Ajouter des instructions de guidage pour l'IA
  prompt += "\nINSTRUCTIONS D'ANALYSE:\n";
  prompt += "1. Fournir un résumé général de l'évolution de la classe sur la période donnée.\n";
  prompt += "2. Analyser l'évolution de la moyenne générale de la classe.\n";
  prompt += "3. Commenter la répartition des élèves par tranches de notes (0-5, 5-10, 10-15, 15-20) et son évolution.\n";
  prompt += "4. Identifier les matières où les élèves excellent et celles qui posent des difficultés.\n";
  prompt += "5. Suggérer des pistes d'amélioration ciblées.\n";
  
  return prompt;
};

/**
 * Envoie une requête d'analyse à l'API AI
 */
export const sendAnalysisRequest = async (data: AnalysisRequest): Promise<AnalysisResponse> => {
  try {
    const prompt = formatPromptForAI(data);
    
    // Préparer la requête pour l'API
    const requestData = {
      prompt,
      systemMessage: "Vous êtes un professeur principal expérimenté qui analyse des résultats scolaires d'une classe. Votre analyse est factuelle, précise et constructive. Votre objectif est d'identifier les tendances, les forces et les points d'amélioration à partir des données fournies.",
      model: "gpt-4o-mini", // Ou "claude-3-opus-20240229" si vous utilisez Claude
      temperature: 0.7,
      maxTokens: 1500
    };
    
    // Envoi de la requête
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erreur lors de la communication avec l'API');
    }
    
    const result = await response.json();
    
    return {
      summary: result.text,
      // Autres champs pourraient être remplis selon la réponse de l'API
    };
  } catch (error) {
    console.error('Erreur lors de l\'analyse IA:', error);
    return {
      summary: "",
      error: error.message || 'Une erreur est survenue lors de l\'analyse'
    };
  }
};

// Version simplifiée pour tester sans API
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
      .sort(([, a], [, b]) => b as number - (a as number));
    
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
}; Formatted class data for analysis
  trimesters: string[];  // List of trimesters being analyzed
}

interface AnalysisResponse {
  summary: string;
  recommendations?: string;
  detailedAnalysis?: string;
  error?: string;
}

// Base URL for the AI service (can be configured based on environment)
// This would typically point to your backend or a service like Supabase Functions
const API_URL = import.meta.env.VITE_AI_API_URL || '/api/ai-analysis';

/**
 * Formats the class data into a prompt for the AI
 */
const formatPromptForAI = (data: AnalysisRequest): string => {
  // Create a structured text prompt with the data
  const { classData, trimesters } = data;
  
  // Start with general instructions
  let prompt = `Analyse les résultats scolaires suivants pour une classe sur ${trimesters.length} trimestre(s): ${trimesters.join(', ')}.\n\n`;
  
  // Add class averages
  prompt += "MOYENNES DE CLASSE PAR TRIMESTRE:\n";
  trimesters.forEach(trimester => {
    const trimData = classData.find(d => d.trimester === trimester);
    if (trimData) {
      prompt += `${trimester}: ${trimData.averages.classAverage.toFixed(2)}/20\n`;
    }
  });
  
  // Add distribution data
  prompt += "\nRÉPARTITION DES ÉLÈVES PAR TRANCHES DE NOTES:\n";
  trimesters.forEach(trimester => {
    const trimData = classData.find(d => d.trimester === trimester);
    if (trimData) {
      prompt += `${trimester}:\n`;
      trimData.averages.rangeDistribution.forEach((range: any) => {
        prompt += `- ${range.range}: ${range.count} élèves (${range.percentage}%)\n`;
      });
    }
  });
  
  // Add subject averages
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
  
  //