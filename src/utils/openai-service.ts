
import { AppreciationService } from './appreciation-service';
import { TextGenerationService } from './text-generation-service';

// Service OpenAI centralisé
export const OpenAIService = {
  // Indique si le service OpenAI est disponible
  // Toujours vrai maintenant que nous utilisons une Edge Function
  hasApiKey: () => true,
  
  // Appreciation generation
  generateClassAppreciation: AppreciationService.generateClassAppreciation,
  generateStudentAppreciation: AppreciationService.generateStudentAppreciation,
  
  // Text generation
  generateText: TextGenerationService.generateText
};
