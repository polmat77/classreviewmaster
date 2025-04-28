
// src/utils/ai/apiClient.ts

import { AnalysisRequest, AnalysisResponse, AIApiRequest, AIApiResponse } from './types';
import { formatPromptForAI, getSystemMessage } from './promptBuilder';

// URL de base pour le service IA (peut être configuré selon l'environnement)
const API_URL = import.meta.env.VITE_AI_API_URL || '/api/ai-analysis';

/**
 * Envoie une requête d'analyse à l'API IA
 * @param data Données pour l'analyse
 * @returns Réponse de l'analyse
 */
export const sendAnalysisRequest = async (data: AnalysisRequest): Promise<AnalysisResponse> => {
  try {
    const prompt = formatPromptForAI(data);
    
    // Préparer la requête pour l'API
    const requestData: AIApiRequest = {
      prompt,
      systemMessage: getSystemMessage(),
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
      throw new Error(errorData.error || "Erreur lors de la communication avec l'API");
    }
    
    const result: AIApiResponse = await response.json();
    
    if (!result.text) {
      throw new Error('Réponse de l\'API invalide');
    }
    
    return {
      summary: result.text,
      // D'autres champs pourraient être remplis selon la réponse de l'API
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    console.error('Erreur lors de l\'analyse IA:', errorMessage);
    return {
      summary: "",
      error: errorMessage
    };
  }
};
