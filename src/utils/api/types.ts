
// src/utils/ai/types.ts

/**
 * Types utilisés dans le service d'analyse IA
 */

/** Requête d'analyse à traiter */
export interface AnalysisRequest {
  classData: any[];  // Données de classe formatées pour l'analyse
  trimesters: string[];  // Liste des trimestres à analyser
}

/** Réponse d'analyse générée */
export interface AnalysisResponse {
  summary: string;  // Résumé de l'analyse
  recommendations?: string;  // Recommandations optionnelles
  detailedAnalysis?: string;  // Analyse détaillée optionnelle
  error?: string;  // Message d'erreur en cas de problème
}

/** Requête formatée pour l'API IA externe */
export interface AIApiRequest {
  prompt: string;  // Texte du prompt
  systemMessage: string;  // Message système pour définir le comportement de l'IA
  model: string;  // Modèle à utiliser (ex: "gpt-4o-mini")
  temperature: number;  // Température de génération
  maxTokens: number;  // Nombre maximum de tokens à générer
}

/** Réponse de l'API IA externe */
export interface AIApiResponse {
  text: string;  // Texte généré par l'IA
  usage?: {  // Informations d'utilisation (optionnelles)
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  error?: string;  // Message d'erreur en cas de problème
}
