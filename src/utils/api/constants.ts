// src/utils/ai/constants.ts

/**
 * Constants utilisées dans le service d'analyse IA
 */

export const AI_MODELS = {
    GPT_4O_MINI: "gpt-4o-mini",
    CLAUDE_3_OPUS: "claude-3-opus-20240229"
  };
  
  export const DEFAULT_MODEL = AI_MODELS.GPT_4O_MINI;
  
  export const DEFAULT_TEMPERATURE = 0.7;
  export const DEFAULT_MAX_TOKENS = 1500;
  
  export const NOTE_RANGES = [
    '0 - 5',
    '5 - 10',
    '10 - 15',
    '15 - 20'
  ];
  
  export const DIFFICULTY_THRESHOLD = 10; // Note en dessous de laquelle un élève est considéré en difficulté
  export const EXCELLENCE_THRESHOLD = 15; // Note au-dessus de laquelle un élève est considéré excellent