
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

// Fonction principale qui gère les requêtes
serve(async (req) => {
  // Gestion CORS pour les requêtes de développement
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      status: 204,
    });
  }

  try {
    // Récupération de la clé API OpenAI depuis les variables d'environnement
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Clé API OpenAI non configurée sur le serveur' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extraction des données de la requête
    const { prompt, systemMessage = 'Vous êtes un professeur principal français expérimenté qui rédige des appréciations scolaires précises et professionnelles.', model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 1000 } = await req.json() as GenerateTextRequest;

    // Vérification des paramètres requis
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
      })
    });

    // Traitement de la réponse
    if (!response.ok) {
      const error = await response.json();
      return new Response(
        JSON.stringify({ error: error.error?.message || 'Erreur avec l\'API OpenAI' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Renvoi de la réponse au client
    const data = await response.json();
    return new Response(
      JSON.stringify({ text: data.choices[0].message.content.trim() }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
