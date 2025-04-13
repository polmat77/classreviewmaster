
import { toast } from 'sonner';
import { OpenAIMessage, OpenAIRequest, OpenAIResponse } from './openai-types';

// URL de l'Edge Function Supabase
const EDGE_FUNCTION_URL = import.meta.env.DEV 
  ? 'http://localhost:54321/functions/v1/openai-proxy'
  : 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co/functions/v1/openai-proxy';

export const TextGenerationService = {
  /**
   * Generate text using OpenAI API via our secure proxy
   */
  async generateText(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    try {
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
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur avec le service de génération de texte');
      }

      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Erreur lors de la génération de texte:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur avec le service de génération de texte');
      throw error;
    }
  }
};
