import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const { 
      orgNom, orgAdresse, orgTel, 
      civilite, autoriteNom, autoriteFonction, autoriteInstitution, autoriteAdresse,
      activiteTitle, activiteType, objetCustom, description,
      dateEvent, heureEvent, lieuEvent, adresseComplete,
      rolesAttendus, rolePrecision,
      signataireNom, signataireQualite, dateRedaction
    } = body;

    const groqKey = Deno.env.get('GROQ_API_KEY');

    if (!groqKey) {
      throw new Error('La clé API GROQ_API_KEY n\'est pas configurée sur le serveur.');
    }

    const cleanOrgNom = String(orgNom || 'Organisation').trim().substring(0, 150);
    const cleanCivilite = String(civilite || 'Monsieur le Ministre').trim().substring(0, 100);
    const cleanAutoriteNom = String(autoriteNom || '').trim().substring(0, 100);
    const cleanAutoriteFonction = String(autoriteFonction || '').trim().substring(0, 150);
    const cleanAutoriteInstitution = String(autoriteInstitution || '').trim().substring(0, 150);
    const cleanActiviteTitle = String(activiteTitle || 'Événement Officiel').trim().substring(0, 200);
    const cleanActiviteType = String(activiteType || 'Cérémonie').trim().substring(0, 100);
    const cleanSignataireNom = String(signataireNom || 'Le Signataire').trim().toUpperCase().substring(0, 100);
    const cleanSignataireQualite = String(signataireQualite || 'Le Coordonnateur').trim().substring(0, 100);

    const promptText = `Tu es un haut fonctionnaire d'élite et un rédacteur d'exception en correspondance administrative solennelle pour le Sénégal.
Tu dois rédiger une lettre d'invitation officielle destinée à une autorité administrative/institutionnelle.

EXIGENCES STRICTES DE QUALITÉ ET DE CORRECTION :
1. CORRECTION ORTHOGRAPHIQUE ET DE GRAMMAIRE ABSOLUE : Corrige automatiquement toutes les fautes de frappe ou d'orthographe présentes dans les données saisies (ex: "coodonnateur" -> "Coordonnateur", "dakar" -> "Dakar", "pastef" -> "PASTEF").
2. FRANÇAIS ACADÉMIQUE D'ÉLITE : Utilise un style de haute chancellerie, solennel, fluide et élégant.
3. PAS DE MENTION "Pour l'Organisation," avant la signature : La signature doit comporter UNIQUEMENT la Qualité (ex: "Le Coordonnateur,") suivie du Nom en majuscules soulignées.
4. GABARIT COMPACT 1 PAGE A4 : Utilise le style CSS suivant : padding: 12mm 20mm 15mm 20mm, min-height: 296.5mm, max-height: 296.5mm, overflow: hidden.

CONTEXTE DE L'INVITATION :
- Organisation invitatrice : ${cleanOrgNom} (Adresse: ${orgAdresse}, Tél: ${orgTel})
- Autorité invitée : ${cleanCivilite} ${cleanAutoriteNom} (${cleanAutoriteFonction}, ${cleanAutoriteInstitution})
- Activité : ${cleanActiviteTitle} (${cleanActiviteType})
- Objet : ${objetCustom || `Invitation officielle à la cérémonie de ${cleanActiviteTitle}`}
- Description/Contexte : ${description || 'Événement majeur de rassemblement et de développement'}
- Date et lieu : Le ${dateEvent} à ${heureEvent} au ${lieuEvent} (${adresseComplete})
- Rôle(s) attendu(s) : ${Array.isArray(rolesAttendus) ? rolesAttendus.join(', ') : 'Président de cérémonie'} ${rolePrecision ? `(${rolePrecision})` : ''}
- Signataire : ${cleanSignataireNom} (${cleanSignataireQualite})

Renvoie STRICTEMENT un objet JSON valide avec la clé "htmlContent" contenant le HTML du document.`;

    const requestBody = JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "Tu es un rédacteur administratif sénégalais d'élite qui renvoie toujours du JSON valide."
        },
        {
          role: "user",
          content: promptText
        }
      ],
      response_format: { type: "json_object" }
    });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { 
      method: 'POST', 
      headers: { 
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      }, 
      body: requestBody 
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const contentText = data.choices[0].message.content;
    const jsonResult = JSON.parse(contentText);

    return new Response(JSON.stringify(jsonResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
