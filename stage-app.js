const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';
let supabaseClient = null;

document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const display = document.getElementById('file-name-display');
        display.textContent = "✅ CV prêt : " + file.name;
        display.style.color = "#10b981";
    }
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(s => s.str).join(" ") + "\n";
    }
    return fullText;
}

async function extractTextFromImage(file) {
    const result = await Tesseract.recognize(file, 'fra+eng', { 
        logger: m => {
            const overlay = document.getElementById('ai-loading-overlay');
            if (overlay && overlay.querySelector('h3') && m.status === 'recognizing text') {
                overlay.querySelector('h3').innerText = `Lecture Image (${Math.round(m.progress * 100)}%)...`;
            }
        }
    });
    return result.data.text;
}

async function extractRawText(file) {
    const overlay = document.getElementById('ai-loading-overlay');
    const filename = file.name ? file.name.toLowerCase() : '';

    if (file.type === 'application/pdf' || filename.endsWith('.pdf')) {
        if(overlay && overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Lecture du PDF...';
        return await extractTextFromPDF(file);
    } else if (file.type.startsWith('image/')) {
        if(overlay && overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Initialisation OCR...';
        return await extractTextFromImage(file);
    } else if (filename.endsWith('.docx') || filename.endsWith('.doc') || file.type.includes('word')) {
        if(overlay && overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Lecture du fichier Word...';
        const arrayBuffer = await file.arrayBuffer();
        if (window.mammoth) {
            const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            return result.value;
        } else {
            return new TextDecoder('utf-8').decode(arrayBuffer);
        }
    } else if (file.type.startsWith('text/') || filename.endsWith('.txt')) {
        return await file.text();
    } else {
        throw new Error('Format non supporté. Veuillez utiliser un PDF, une Image ou un fichier Word.');
    }
}

async function generateStageDocument(event) {
    event.preventDefault();
    
    const prenom = document.getElementById('input-prenom').value;
    const nom = document.getElementById('input-nom').value;
    const entreprise = document.getElementById('input-entreprise').value;
    const destinataire = document.getElementById('input-destinataire').value || 'Le Directeur Général';
    const domaine = document.getElementById('input-domaine').value;
    const dateDebut = document.getElementById('input-date-debut').value;
    const duree = document.getElementById('input-duree').value;
    const noteMotivation = document.getElementById('input-motivation-note').value;
    const fileInput = document.getElementById('input-cv');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Veuillez insérer votre CV (PDF, Image ou Word).");
        return;
    }

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.style.display = 'flex';

    try {
        const rawTextExtracted = await extractRawText(file);
        
        if (overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Rédaction de la Demande de Stage par l\'IA...';

        const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        // Extract contact info from CV text if available
        let phone = "";
        let email = "";
        const phoneMatch = rawTextExtracted.match(/(?:\+221|00221)?\s*[738][0-9]\s*[0-9]{3}\s*[0-9]{2}\s*[0-9]{2}/);
        if (phoneMatch) phone = phoneMatch[0];
        const emailMatch = rawTextExtracted.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) email = emailMatch[0];

        const promptText = `Tu es un rédacteur professionnel d'élite basé au Sénégal. 
        Rédige uniquement le corps de texte d'une DEMANDE DE STAGE OFFICIELLE de 4 paragraphes en Français académique pour :
        - Candidat : ${prenom} ${nom}
        - Entreprise : ${entreprise}
        - Domaine : ${domaine}
        - Durée : ${duree} à compter du ${dateDebut}
        - Note particulière : ${noteMotivation || 'Aucune'}
        
        CV du candidat :
        ${rawTextExtracted}

        Consignes pour les 4 paragraphes :
        1. Paragraphe 1 : Sollicitation officielle d'un stage de ${duree} à compter du ${dateDebut}.
        2. Paragraphe 2 : Mise en valeur des diplômes, études et compétences clés extraites du CV adaptées à ${entreprise}.
        3. Paragraphe 3 : Rigueur, autonomie, passion et valeur ajoutée apportée aux équipes.
        4. Paragraphe 4 : Formule solennelle de politesse administrative ("Dans l'attente d'une suite favorable que vous voudrez bien réserver à ma requête, je vous prie d'agréer, ${destinataire}, l'expression de ma considération la plus distinguée.").

        Renvoie UNIQUEMENT le texte brut des 4 paragraphes sans en-tête ni objet ni signature.`;

        let rawResponseText = "";
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-cv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    rawText: promptText,
                    customPrompt: true
                })
            });
            if (response.ok) {
                const data = await response.json();
                rawResponseText = typeof data === 'string' ? data : (data.stageHtml || data.demandeHtml || data.rawResponse || JSON.stringify(data));
            }
        } catch(e) {}

        const finalDocumentHtml = buildPerfectAdministrativeDocument({
            prenom,
            nom,
            email,
            phone,
            destinataire,
            entreprise,
            domaine,
            duree,
            dateDebut,
            todayStr,
            bodyText: rawResponseText
        });

        const docEl = document.getElementById('doc-stage');
        docEl.innerHTML = finalDocumentHtml;
        docEl.contentEditable = "true";

        document.getElementById('input-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'flex';

    } catch (err) {
        console.error("Stage generation error:", err);
        const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const fallbackHtml = buildPerfectAdministrativeDocument({
            prenom, nom, email: "", phone: "", destinataire, entreprise, domaine, duree, dateDebut, todayStr, bodyText: ""
        });
        const docEl = document.getElementById('doc-stage');
        docEl.innerHTML = fallbackHtml;
        docEl.contentEditable = "true";
        document.getElementById('input-section').style.display = 'none';
        document.getElementById('results-section').style.display = 'flex';
    } finally {
        overlay.style.display = 'none';
    }
}

function buildPerfectAdministrativeDocument({ prenom, nom, email, phone, destinataire, entreprise, domaine, duree, dateDebut, todayStr, bodyText }) {
    
    let paragraphsHtml = "";
    
    if (bodyText && bodyText.trim().length > 100) {
        // Clean up any redundant headers Groq might have returned
        let cleanText = bodyText
            .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/Objet\s*:[^\n<]*/gi, '')
            .replace(/Fait à[^\n<]*/gi, '')
            .replace(/À [^\n<]*/gi, '')
            .replace(/Monsieur le Directeur[^\n<]*/gi, '')
            .replace(/L'intéressé\(e\)[\s\S]*/gi, '')
            .replace(/```json/g, '').replace(/```/g, '').trim();

        // Split text by newlines or paragraphs
        let rawParas = cleanText.split(/\n\s*\n|<p[^>]*>/).map(p => p.replace(/<\/p>/g, '').trim()).filter(p => p.length > 20);
        
        if (rawParas.length >= 3) {
            paragraphsHtml = rawParas.map(p => `<p style="text-align: justify; text-indent: 30px; margin-bottom: 18px; line-height: 1.65; font-size: 11pt; color: #111827;">${p}</p>`).join('');
        } else {
            // Split sentences if paras wasn't cleanly separated
            let sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
            if (sentences.length >= 4) {
                let p1 = sentences.slice(0, Math.ceil(sentences.length * 0.25)).join(' ');
                let p2 = sentences.slice(Math.ceil(sentences.length * 0.25), Math.ceil(sentences.length * 0.55)).join(' ');
                let p3 = sentences.slice(Math.ceil(sentences.length * 0.55), Math.ceil(sentences.length * 0.8)).join(' ');
                let p4 = sentences.slice(Math.ceil(sentences.length * 0.8)).join(' ');
                
                const style = 'text-align: justify; text-indent: 30px; margin-bottom: 18px; line-height: 1.65; font-size: 11pt; color: #111827;';
                paragraphsHtml = `
                    <p style="${style}">${p1}</p>
                    <p style="${style}">${p2}</p>
                    <p style="${style}">${p3}</p>
                    <p style="${style}">${p4}</p>
                `;
            } else {
                paragraphsHtml = `<p style="text-align: justify; text-indent: 30px; margin-bottom: 18px; line-height: 1.65; font-size: 11pt; color: #111827;">${cleanText}</p>`;
            }
        }
    }

    if (!paragraphsHtml) {
        const style = 'text-align: justify; text-indent: 30px; margin-bottom: 18px; line-height: 1.65; font-size: 11pt; color: #111827;';
        paragraphsHtml = `
            <p style="${style}">
                J'ai l'honneur de solliciter par la présente votre haute bienveillance afin de faire acte de candidature pour un stage académique et professionnel de <strong>${duree}</strong> au sein de votre prestigieuse structure <strong>${entreprise}</strong>, à compter du <strong>${dateDebut}</strong>.
            </p>
            <p style="${style}">
                Désireux de parfaire ma formation et d'acquérir une expérience pratique solide dans le secteur de <strong>${domaine}</strong>, le choix de votre établissement s'est imposé comme une évidence au regard de votre expertise reconnue et de la qualité de vos prestations au Sénégal.
            </p>
            <p style="${style}">
                Dynamique, rigoureux et rapidement opérationnel, je suis convaincu que ce stage sera pour moi l'opportunité de mettre mes compétences au service de vos équipes, tout en développant de nouveaux savoir-faire sous votre bienveillant encadrement.
            </p>
            <p style="${style}">
                Dans l'attente d'une suite favorable que vous voudrez bien réserver à ma requête, je vous prie d'agréer, ${destinataire}, l'expression de ma considération la plus distinguée et de mon profond respect.
            </p>
        `;
    }

    return `
        <!-- En-tête Expéditeur à gauche -->
        <div style="float: left; font-size: 11pt; line-height: 1.6; color: #111827; margin-bottom: 35px; width: 45%;">
            <strong>${prenom} ${nom}</strong><br>
            Dakar, Sénégal<br>
            ${phone ? 'Tél : ' + phone + '<br>' : ''}
            ${email ? 'Email : ' + email + '<br>' : ''}
        </div>

        <!-- Date & Destinataire à droite (Date descendue à la 3ème ligne, Destinataire descendu) -->
        <div style="float: right; text-align: right; font-size: 11pt; line-height: 1.6; color: #111827; margin-top: 30px; margin-bottom: 45px; width: 50%;">
            Fait à Dakar, le ${todayStr}<br><br><br><br>
            <strong>À ${destinataire}</strong><br>
            <strong>${entreprise}</strong>
        </div>
        <div style="clear: both;"></div>

        <!-- Objet (Souligner UNIQUEMENT le mot Objet) -->
        <div style="font-size: 11pt; margin: 35px 0 25px 0; color: #000;">
            <strong><u>Objet</u> : Demande de stage en ${domaine} (Durée : ${duree} - Début : ${dateDebut})</strong>
        </div>

        <!-- Formule d'appel -->
        <p style="font-weight: bold; margin-bottom: 20px; font-size: 11pt; color: #111827;">${destinataire},</p>

        <!-- Corps avec paragraphes bien espacés -->
        ${paragraphsHtml}

        <!-- Signature officielle en bas à droite -->
        <div style="float: right; text-align: center; margin-top: 45px; font-weight: bold; font-size: 11pt; color: #111827;">
            L'intéressé(e),<br><br><br><br>
            <strong>${prenom} ${nom}</strong>
        </div>
        <div style="clear: both;"></div>
    `;
}

function exportStagePDF() {
    const originalDoc = document.getElementById('doc-stage');
    if (!originalDoc) return;

    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'fixed';
    cloneContainer.style.top = '0';
    cloneContainer.style.left = '0';
    cloneContainer.style.width = '100vw';
    cloneContainer.style.height = '100vh';
    cloneContainer.style.background = '#ffffff';
    cloneContainer.style.zIndex = '999999';
    cloneContainer.style.overflow = 'auto';
    cloneContainer.style.display = 'flex';
    cloneContainer.style.justifyContent = 'center';
    cloneContainer.style.alignItems = 'flex-start';
    cloneContainer.style.padding = '0';

    const clone = originalDoc.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.margin = '0';
    clone.style.boxShadow = 'none';
    clone.style.width = '210mm';
    clone.style.minHeight = '297mm';
    clone.style.background = '#ffffff';
    clone.style.color = '#000000';
    clone.style.padding = '3.5rem 4.5rem';

    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);

    const opt = {
        margin: 0,
        filename: 'demande_de_stage_officielle.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone).save().then(() => {
        if (cloneContainer.parentNode) {
            document.body.removeChild(cloneContainer);
        }
    }).catch(err => {
        console.error("PDF generation error:", err);
        if (cloneContainer.parentNode) {
            document.body.removeChild(cloneContainer);
        }
        alert("Erreur lors du téléchargement du PDF.");
    });
}
