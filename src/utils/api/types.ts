
/**
 * Types pour les services d'analyse IA
 */

// Interface pour les données de requête d'analyse
export interface AnalysisRequest {
  classData: any[];
  trimesters: string[];
}

// Interface pour la réponse d'analyse
export interface AnalysisResponse {
  summary: string;
  recommendations?: string;
  detailedAnalysis?: string;
  error?: string;
}

// Interface pour la requête API vers l'IA
export interface AIApiRequest {
  prompt: string;
  systemMessage: string;
  model: string;
  temperature: number;
  maxTokens?: number;
}

// Interface pour la réponse API de l'IA
export interface AIApiResponse {
  text: string;
  error?: string;
}

// Statut de progression pour les opérations longues
export enum ProgressStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error'
}

// Type pour les messages d'erreur détaillés
export interface ProcessingError {
  code: string;
  message: string;
  details?: string;
  retry?: boolean;
}
