/**
 * Interface for ChatGPT API message structure
 */
export interface ChatGptMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Interface for ChatGPT API request body
 */
export interface ChatGptRequestBody {
  model: string;
  messages: ChatGptMessage[];
  max_tokens: number;
  temperature: number;
}

/**
 * Interface for a single choice in the ChatGPT API response
 */
export interface ChatGptResponseChoice {
  message: {
    content: string;
  };
}

/**
 * Interface for the ChatGPT API response
 */
export interface ChatGptResponse {
  choices: ChatGptResponseChoice[];
}
