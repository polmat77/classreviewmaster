
// API key management service
const API_KEY_STORAGE_KEY = 'openai_api_key';

export const ApiKeyService = {
  /**
   * Get API key from localStorage
   */
  getApiKey(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem(API_KEY_STORAGE_KEY);
  },

  /**
   * Validate if API key format is correct
   */
  isValidApiKeyFormat(key: string): boolean {
    return key.startsWith('sk-') && key.length > 30;
  },

  /**
   * Check if API key is available
   */
  hasApiKey(): boolean {
    return !!this.getApiKey();
  },

  /**
   * Save API key to localStorage
   */
  saveApiKey(key: string): void {
    if (!this.isValidApiKeyFormat(key)) {
      throw new Error('Format de clé API invalide');
    }
    
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
      console.log('API key saved to localStorage');
    } catch (error) {
      console.error('Error saving API key to localStorage:', error);
      throw new Error('Erreur lors de l\'enregistrement de la clé API');
    }
  },

  /**
   * Clear API key from localStorage
   */
  clearApiKey(): void {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    console.log('API key removed from localStorage');
  },

  /**
   * Test the API key
   */
  async testApiKey(key: string): Promise<boolean> {
    try {
      // Make a minimal API call to test the key
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Test de connexion'
            }
          ],
          max_tokens: 5
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Error testing API key:', error);
      return false;
    }
  }
};
