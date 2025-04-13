
// API key management service - Obsolète, maintenu pour compatibilité
// La clé API est maintenant gérée côté serveur via Supabase Edge Function

export const ApiKeyService = {
  /**
   * Vérifie si une clé API est disponible (toujours true avec la nouvelle architecture)
   */
  getApiKey(): string {
    return "server_managed_key";
  },

  /**
   * Vérifie si le format de la clé API est valide (toujours true avec la nouvelle architecture)
   */
  isValidApiKeyFormat(): boolean {
    return true;
  },

  /**
   * Vérifie si une clé API est disponible (toujours true avec la nouvelle architecture)
   */
  hasApiKey(): boolean {
    return true;
  },

  /**
   * Sauvegarde la clé API (ne fait rien avec la nouvelle architecture)
   */
  saveApiKey(): void {
    console.log('API key is now managed on the server');
  },

  /**
   * Supprime la clé API (ne fait rien avec la nouvelle architecture)
   */
  clearApiKey(): void {
    console.log('API key is now managed on the server');
  },

  /**
   * Teste la clé API (toujours true avec la nouvelle architecture)
   */
  async testApiKey(): Promise<boolean> {
    return true;
  }
};
