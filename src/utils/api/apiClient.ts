
import { AnalysisRequest, AnalysisResponse, AIApiRequest, AIApiResponse } from './types';
import { formatPromptForAI, getSystemMessage } from './promptBuilder';

// URL de base pour le service IA (peut être configuré selon l'environnement)
const API_URL = 'https://hjrhsjrijhjnyyglxgfl.supabase.co/functions/v1/openai-proxy';

/**
 * Envoie une requête d'analyse à l'API IA avec gestion améliorée des erreurs et timeouts
 * @param data Données pour l'analyse
 * @returns Réponse de l'analyse
 */
export const sendAnalysisRequest = async (data: AnalysisRequest): Promise<AnalysisResponse> => {
  try {
    console.log('Préparation de la requête d\'analyse IA pour les données:', data.trimesters);
    const prompt = formatPromptForAI(data);
    
    // Préparer la requête pour l'API
    const requestData: AIApiRequest = {
      prompt,
      systemMessage: getSystemMessage(),
      model: "gpt-4o-mini", // Ou "gpt-4o" pour une analyse plus poussée
      temperature: 0.7,
      maxTokens: 1500
    };
    
    console.log('Envoi de la requête à l\'API IA avec le modèle:', requestData.model);
    
    // Configuration du timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 secondes de timeout
    
    // Envoi de la requête avec système de retry
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Tentative d'analyse IA: ${attempts}/${maxAttempts}`);
        
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Erreur API:', errorData);
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }
        
        const result: AIApiResponse = await response.json();
        
        if (!result.text) {
          throw new Error('Réponse de l\'API invalide: texte manquant');
        }
        
        console.log('Analyse IA reçue avec succès');
        
        return {
          summary: result.text,
          // D'autres champs pourraient être ajoutés selon la réponse
        };
      } catch (retryError: unknown) {
        const errorMessage = retryError instanceof Error ? retryError.message : 'Erreur inconnue';
        
        // Si c'est la dernière tentative ou si c'est une erreur d'abandon (timeout)
        if (attempts >= maxAttempts || errorMessage.includes('aborted')) {
          console.error(`Échec après ${attempts} tentatives:`, errorMessage);
          throw retryError;
        }
        
        console.warn(`Tentative ${attempts} échouée: ${errorMessage}, nouvelle tentative dans ${attempts * 2} secondes...`);
        // Attendre de plus en plus longtemps entre les tentatives
        await new Promise(resolve => setTimeout(resolve, attempts * 2000));
      }
    }
    
    throw new Error('Nombre maximal de tentatives dépassé');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
    console.error('Erreur lors de l\'analyse IA:', errorMessage);
    
    return {
      summary: "",
      error: errorMessage.includes('aborted') 
        ? "La requête a pris trop de temps et a été interrompue. Veuillez réessayer."
        : errorMessage
    };
  }
};
