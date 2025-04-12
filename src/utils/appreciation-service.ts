
import { TextGenerationService } from './text-generation-service';

export const AppreciationService = {
  /**
   * Generate class appreciation using OpenAI
   */
  async generateClassAppreciation(
    classData: any, 
    tone: string, 
    length: number
  ): Promise<string> {
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

    return TextGenerationService.generateText(prompt, 'gpt-4o-mini');
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

    return TextGenerationService.generateText(prompt, 'gpt-4o-mini');
  }
};
