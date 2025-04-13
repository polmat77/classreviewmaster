
import { AppreciationService } from './appreciation-service';
import { TextGenerationService } from './text-generation-service';

// Nous n'avons plus besoin d'importer ApiKeyService

// Re-export functionality from the separate modules
export const OpenAIService = {
  // Nous n'avons plus besoin des méthodes de gestion de clé API
  // Nous utilisons maintenant directement notre Edge Function
  
  // Indique si le service OpenAI est disponible
  // Toujours vrai maintenant que nous utilisons une Edge Function
  hasApiKey: () => true,
  
  // Appreciation generation
  generateClassAppreciation: AppreciationService.generateClassAppreciation,
  generateStudentAppreciation: AppreciationService.generateStudentAppreciation,
  
  // Text generation
  generateText: TextGenerationService.generateText
};
