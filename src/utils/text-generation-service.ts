
import { toast } from 'sonner';
import { ApiKeyService } from './api-key-service';
import { OpenAIMessage, OpenAIRequest, OpenAIResponse } from './openai-types';

// OpenAI API endpoint
const API_URL = 'https://api.openai.com/v1/chat/completions';

export const TextGenerationService = {
  /**
   * Generate text using OpenAI API
   */
  async generateText(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    try {
      const apiKey = ApiKeyService.getApiKey();
      if (!apiKey) {
        throw new Error('Clé API non configurée');
      }

      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: 'Vous êtes un professeur principal français expérimenté qui rédige des appréciations scolaires précises et professionnelles.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        } as OpenAIRequest)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Erreur avec l\'API OpenAI');
      }

      const data = await response.json() as OpenAIResponse;
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Erreur lors de la génération de texte:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur avec l\'API OpenAI');
      throw error;
    }
  }
};
