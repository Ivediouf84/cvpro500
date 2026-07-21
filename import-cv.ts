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
    const { fileData, mimeType } = await req.json()
    
    // Séparer "data:image/png;base64," du vrai contenu en base64
    const base64Content = fileData.split(',')[1]
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
        throw new Error('La clé API Gemini est introuvable.')
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

    const prompt = `
Tu es un expert en recrutement.
Je te fournis un document qui est un ancien CV.
Ton but est d'extraire toutes les informations du CV et de les renvoyer STRICTEMENT au format JSON ci-dessous, sans aucun autre texte avant ou après.
S'il n'y a pas d'expérience ou de formation, renvoie une liste vide [].

Structure JSON attendue:
{
    "personal": {
        "firstName": "", "lastName": "", "jobTitle": "",
        "email": "", "phone": "",
        "address": "", "city": "", "nationality": "",
        "linkedin": "", "portfolio": "",
        "photo": ""
    },
    "profile": {
        "summary": "Résumé professionnel du candidat"
    },
    "experiences": [
        { "id": 1, "title": "", "company": "", "startDate": "", "endDate": "", "description": "" }
    ],
    "education": [
        { "id": 1, "degree": "", "school": "", "startDate": "", "endDate": "", "description": "" }
    ],
    "skills": [
        { "id": 1, "name": "" }
    ],
    "languages": [
        { "id": 1, "name": "", "level": "" }
    ],
    "interests": [
        { "id": 1, "name": "" }
    ],
    "references": []
}

Important: 
- Pour "id" dans les listes, commence à 1 et incrémente.
- Ne rajoute AUCUN texte, juste le JSON. N'écris pas "voici le json" ni les balises markdown.
`

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Content
              }
            }
          ]
        }
      ]
    }

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok) {
        throw new Error(JSON.stringify(geminiData))
    }

    // Extraire le texte de la réponse Gemini
    let extractedText = geminiData.candidates[0].content.parts[0].text
    
    // Nettoyer si Gemini renvoie quand même du Markdown
    extractedText = extractedText.replace(/```json/g, '').replace(/```/g, '').trim()
    
    const parsedData = JSON.parse(extractedText)

    return new Response(
      JSON.stringify({ data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
