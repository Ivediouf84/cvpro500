const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { text, prompt, imageBase64 } = await req.json();
    const groqKey = Deno.env.get('GROQ_API_KEY');

    if (!groqKey) throw new Error("Clé GROQ_API_KEY absente des secrets Supabase.");

    const userContent = text || prompt || "Extrais les données de ce CV d'exemple.";

    const requestBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Tu es un expert en analyse et structuration de CV. Ton rôle est de lire les informations du CV et de renvoyer UNIQUEMENT un objet JSON valide (sans aucun texte autour) respectant ce schéma :\n{\n  \"personal\": { \"firstName\": \"\", \"lastName\": \"\", \"jobTitle\": \"\", \"email\": \"\", \"phone\": \"\", \"city\": \"\", \"linkedin\": \"\" },\n  \"profile\": { \"summary\": \"\" },\n  \"education\": [ { \"studyType\": \"\", \"school\": \"\", \"degree\": \"\", \"year\": \"\" } ],\n  \"formations\": [ { \"title\": \"\", \"institution\": \"\", \"startDate\": \"\", \"endDate\": \"\", \"description\": \"\" } ],\n  \"experiences\": [ { \"title\": \"\", \"company\": \"\", \"startDate\": \"\", \"endDate\": \"\", \"description\": \"\" } ],\n  \"skills\": [ { \"name\": \"\" } ],\n  \"languages\": [ { \"name\": \"\", \"level\": \"\" } ],\n  \"interests\": [ { \"name\": \"\" } ]\n}"
        },
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.2,
      max_tokens: 2048
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Erreur de réponse Groq AI (Status " + response.status + ")");
    }

    const rawJson = result.choices[0]?.message?.content || "{}";
    const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();

    return new Response(cleanJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
