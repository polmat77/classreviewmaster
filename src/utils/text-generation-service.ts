
import { toast } from 'sonner';
import { OpenAIMessage, OpenAIRequest, OpenAIResponse } from './openai-types';

const EDGE_FUNCTION_URL = 'https://hjrhsjrijhjnyyglxgfl.supabase.co/functions/v1/openai-proxy';

export const TextGenerationService = {
  /**
   * Generate text using OpenAI API via our secure proxy
   */
  async generateText(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    try {
      // Ajout d'un timeout de 30 secondes pour éviter les requêtes bloquées
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          model,
          systemMessage: 'Vous êtes un professeur principal français expérimenté qui rédige des appréciations scolaires précises et professionnelles.',
          temperature: 0.7,
          maxTokens: 1000
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur avec le service de génération de texte');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Erreur lors de la génération de texte:', error);
      
      // Message d'erreur plus spécifique selon le type d'erreur
      if (error.name === 'AbortError') {
        toast.error('La génération de texte a pris trop de temps et a été interrompue');
      } else {
        toast.error(error instanceof Error ? error.message : 'Erreur avec le service de génération de texte');
      }
      
      throw error;
    }
  }
};
