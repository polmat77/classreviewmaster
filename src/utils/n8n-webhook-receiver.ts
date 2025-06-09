
export interface N8NWebhookResponse {
  status: string;
  message: string;
  rapport_html?: string;
  metadata?: {
    timestamp: string;
    source: string;
    summary: {
      syntheseLength: number;
      categoriesCount: number;
      hasEvolution: boolean;
      hasConseils: boolean;
    };
  };
}

export const handleN8NWebhookResponse = (data: N8NWebhookResponse) => {
  if (data.status === 'completed' && data.rapport_html) {
    // Afficher le rapport HTML dans l'interface
    console.log('Rapport N8N reçu:', data);
    
    // Vous pouvez ajouter ici la logique pour afficher le rapport HTML
    // dans votre interface utilisateur
    
    return {
      success: true,
      htmlReport: data.rapport_html,
      metadata: data.metadata
    };
  }
  
  return {
    success: false,
    error: 'Réponse N8N invalide'
  };
};
