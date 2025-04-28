// src/utils/ai/types.ts

/**
 * Types pour le service d'analyse IA
 */

export interface Student {
  id: string;
  name: string;
  average: number;
  subjects: Record<string, number>;
}

export interface RangeDistribution {
  range: string;
  count: number;
  percentage: number;
}

export interface ClassAverages {
  classAverage: number;
  subjects: Record<string, number>;
  rangeDistribution: RangeDistribution[];
}

export interface TrimesterData {
  trimester: string;
  data: Student[];
  averages: ClassAverages;
}

export interface AnalysisRequest {
  classData: TrimesterData[];
  trimesters: string[];
}

export interface AnalysisResponse {
  summary: string;
  recommendations?: string;
  detailedAnalysis?: string;
  error?: string;
}

export interface AIApiRequest {
  prompt: string;
  systemMessage: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface AIApiResponse {
  text: string;
  error?: string;
}
