
import { serve } from 'https://deno.land/std@0.182.0/http/server.ts';

// Types pour les requêtes
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GenerateTextRequest {
  prompt: string;
  systemMessage?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// Headers CORS pour permettre l'accès depuis le frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Fonction principale qui gère les requêtes
serve(async (req) => {
  // Gestion CORS pour les requêtes de développement
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log('📥 Requête reçue');

    // Récupération de la clé API OpenAI depuis les variables d'environnement
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('❌ Clé API OpenAI non configurée');
      return new Response(
        JSON.stringify({ error: 'Clé API OpenAI non configurée sur le serveur' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Extraction des données de la requête
    const { 
      prompt, 
      systemMessage = 'Vous êtes un professeur principal français expérimenté qui rédige des appréciations scolaires précises et professionnelles.', 
      model = 'gpt-4o-mini', 
      temperature = 0.7, 
      maxTokens = 1000 
    } = await req.json() as GenerateTextRequest;

    // Vérification des paramètres requis
    if (!prompt) {
      console.error('❌ Prompt manquant');
      return new Response(
        JSON.stringify({ error: 'Prompt requis' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🤖 Modèle utilisé: ${model}`);
    console.log(`📝 Prompt (début): ${prompt.substring(0, 100)}...`);

    // Préparation des messages pour l'API OpenAI
    const messages: OpenAIMessage[] = [
      {
        role: 'system',
        content: systemMessage
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Configuration du timeout pour l'API OpenAI (90 secondes)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error('⏱️ Requête OpenAI interrompue pour cause de timeout (90s)');
    }, 90000);

    try {
      console.log('📤 Envoi de la requête à l\'API OpenAI');
      // Appel à l'API OpenAI
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        }),
        signal: controller.signal
      });

      // Annuler le timeout puisque la requête est terminée
      clearTimeout(timeoutId);

      // Traitement de la réponse
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Erreur API OpenAI:', error);
        return new Response(
          JSON.stringify({ error: error.error?.message || 'Erreur avec l\'API OpenAI' }),
          { 
            status: response.status, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Renvoi de la réponse au client
      const data = await response.json();
      const text = data.choices[0].message.content.trim();
      console.log('✅ Réponse reçue avec succès');
      console.log(`📝 Réponse (début): ${text.substring(0, 100)}...`);

      return new Response(
        JSON.stringify({ text }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (fetchError) {
      // Annuler le timeout si une erreur se produit
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ Requête interrompue par timeout');
        return new Response(
          JSON.stringify({ error: 'La requête à l\'API OpenAI a pris trop de temps et a été interrompue.' }),
          { 
            status: 408, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Relancer l'erreur pour être traitée par le bloc try/catch principal
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
