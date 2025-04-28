
/**
 * Point d'entrée pour le service d'analyse IA
 */

// Exporter les types
export * from './types';

// Exporter les fonctions
export { formatPromptForAI, getSystemMessage } from './promptBuilder';
export { sendAnalysisRequest } from './apiClient';
export { getSimulatedAnalysis } from './simulatedData';

// Fonction utilitaire pour déterminer s'il faut utiliser l'API réelle ou simulée
// basée sur une variable d'environnement
export const analyzeClassData = async (data: any, useSimulation = import.meta.env.VITE_USE_SIMULATED_AI === 'true') => {
  if (useSimulation) {
    const { getSimulatedAnalysis } = await import('./simulatedData');
    return getSimulatedAnalysis(data);
  }
  const { sendAnalysisRequest } = await import('./apiClient');
  return sendAnalysisRequest(data);
};
