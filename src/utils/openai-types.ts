
// Types for the OpenAI API
export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  max_tokens?: number;
}

export interface OpenAIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}
