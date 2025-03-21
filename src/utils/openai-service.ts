
import { toast } from 'sonner';

// OpenAI API endpoints
const API_URL = 'https://api.openai.com/v1/chat/completions';

// API key provided by the admin
const FIXED_API_KEY = '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';

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
   * Check if API is available
   */
  isApiAvailable(): boolean {
    return !!FIXED_API_KEY;
  },

  /**
   * Check if API key is available
   */
  hasApiKey(): boolean {
    return this.isApiAvailable();
  },

  /**
   * Save API key
   */
  saveApiKey(key: string): void {
    // This function is a no-op since we're using a fixed API key
    // But we keep it to maintain compatibility with existing code
    console.log('Using fixed API key provided by administrator');
  },

  /**
   * Generate class appreciation using OpenAI
   */
  async generateClassAppreciation(
    classData: any, 
    tone: string, 
    length: number
  ): Promise<string> {
    if (!this.isApiAvailable()) {
      throw new Error('API key not configured by administrator');
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
    if (!this.isApiAvailable()) {
      throw new Error('API key not configured by administrator');
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
      if (!this.isApiAvailable()) {
        throw new Error('API key not configured by administrator');
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
          'Authorization': `Bearer ${FIXED_API_KEY}`
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
