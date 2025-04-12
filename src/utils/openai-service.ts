
import { ApiKeyService } from './api-key-service';
import { AppreciationService } from './appreciation-service';

// Re-export functionality from the separate modules
export const OpenAIService = {
  // API Key management
  getApiKey: ApiKeyService.getApiKey,
  isValidApiKeyFormat: ApiKeyService.isValidApiKeyFormat,
  hasApiKey: ApiKeyService.hasApiKey,
  saveApiKey: ApiKeyService.saveApiKey,
  clearApiKey: ApiKeyService.clearApiKey,
  testApiKey: ApiKeyService.testApiKey,
  
  // Appreciation generation
  generateClassAppreciation: AppreciationService.generateClassAppreciation,
  generateStudentAppreciation: AppreciationService.generateStudentAppreciation,
};
