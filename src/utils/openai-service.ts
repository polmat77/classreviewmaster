
import { toast } from 'sonner';

// OpenAI API endpoints
const API_URL = 'https://api.openai.com/v1/chat/completions';

// localStorage key for storing the API key
const API_KEY_STORAGE_KEY = 'openai_api_key';

// Types for the OpenAI API
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens?: number;
}

interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export const OpenAIService = {
  /**
   * Get API key from localStorage
   */
  getApiKey(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Validate if API key format is correct
   */
  isValidApiKeyFormat(key: string): boolean {
    return key.startsWith('sk-') && key.length > 30;
  },

  /**
   * Check if API key is available
   */
  hasApiKey(): boolean {
    return !!this.getApiKey();
  },

  /**
   * Save API key to localStorage
   */
  saveApiKey(key: string): void {
    if (!this.isValidApiKeyFormat(key)) {
      throw new Error('Format de clé API invalide');
    }
    
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      console.log('API key saved to localStorage');
    } catch (error) {
      console.error('Error saving API key to localStorage:', error);
      throw new Error('Erreur lors de l\'enregistrement de la clé API');
    }
  },

  /**
   * Clear API key from localStorage
   */
  clearApiKey(): void {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    console.log('API key removed from localStorage');
  },

  /**
   * Generate class appreciation using OpenAI
   */
  async generateClassAppreciation(
    classData: any, 
    tone: string, 
    length: number
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Clé API non configurée');
    }

    const toneMap: Record<string, string> = {
      'tres-severe': 'très sévère et critique',
      'exigeant': 'exigeant et strict',
      'neutre': 'neutre et objectif',
      'bienveillant': 'bienveillant et encourageant',
      'dithyrambique': 'très élogieux et dithyrambique'
    };

    const lengthMap: Record<number, string> = {
      1: 'courte (2-3 phrases)',
      2: 'moyenne (4-5 phrases)',
      3: 'longue et détaillée (plus de 6 phrases)'
    };

    // Prepare class data summary for the prompt
    const classAverage = classData?.currentTerm?.classAverage || 'non disponible';
    const previousAverage = classData?.previousTerms?.[0]?.classAverage || 'non disponible';
    const evolution = classData?.currentTerm && classData?.previousTerms?.[0] 
      ? (classData.currentTerm.classAverage - classData.previousTerms[0].classAverage).toFixed(1) 
      : 'non disponible';

    const classDataSummary = `
      Moyenne de classe actuelle: ${classAverage}/20
      Moyenne précédente: ${previousAverage}/20
      Évolution: ${evolution}
      Répartition des élèves: ${classData?.categories?.excellent || 0} excellents, 
      ${classData?.categories?.good || 0} bons, 
      ${classData?.categories?.average || 0} moyens, 
      ${classData?.categories?.struggling || 0} en difficulté
    `;

    const prompt = `
      En tant que professeur principal, rédigez une appréciation générale pour une classe
      avec un ton ${toneMap[tone]} et d'une longueur ${lengthMap[length]}.
      
      Basez-vous sur les données suivantes:
      ${classDataSummary}
      
      L'appréciation doit mentionner l'ambiance générale, l'évolution des résultats,
      les points forts collectifs et les axes d'amélioration.
      
      Rédigez en français avec un style professionnel adapté à un bulletin scolaire.
    `;

    return this.generateText(prompt, 'gpt-4o-mini');
  },

  /**
   * Generate individual student appreciation using OpenAI
   */
  async generateStudentAppreciation(
    studentName: string,
    studentData: any,
    tone: string,
    length: number
  ): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Clé API non configurée');
    }

    const toneMap: Record<string, string> = {
      'tres-severe': 'très sévère et critique',
      'exigeant': 'exigeant et strict',
      'neutre': 'neutre et objectif',
      'bienveillant': 'bienveillant et encourageant',
      'dithyrambique': 'très élogieux et dithyrambique'
    };

    const lengthMap: Record<number, string> = {
      1: 'courte (2-3 phrases)',
      2: 'moyenne (4-5 phrases)',
      3: 'longue et détaillée (plus de 6 phrases)'
    };

    const prompt = `
      En tant que professeur principal, rédigez une appréciation individuelle pour l'élève ${studentName}
      avec un ton ${toneMap[tone]} et d'une longueur ${lengthMap[length]}.
      
      Basez-vous sur les données suivantes:
      - Moyenne générale: ${studentData.average}/20
      - Tendance: ${studentData.trend === 'up' ? 'en progression' : studentData.trend === 'down' ? 'en baisse' : 'stable'}
      - Niveau global: ${
        studentData.category === 'excellent' ? 'excellent' :
        studentData.category === 'good' ? 'bon' :
        studentData.category === 'average' ? 'moyen' :
        'en difficulté'
      }
      
      L'appréciation doit évaluer l'attitude en classe, les résultats obtenus,
      les progrès réalisés et formuler des conseils personnalisés.
      
      Rédigez en français avec un style professionnel adapté à un bulletin scolaire.
    `;

    return this.generateText(prompt, 'gpt-4o-mini');
  },

  /**
   * Generate text using OpenAI API
   */
  async generateText(prompt: string, model: string = 'gpt-4o-mini'): Promise<string> {
    try {
      const apiKey = this.getApiKey();
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
  },

  /**
   * Test the API key
   */
  async testApiKey(key: string): Promise<boolean> {
    try {
      // Make a minimal API call to test the key
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Test de connexion'
            }
          ],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }
};
