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
        Rédige uniquement le corps de texte d'une DEMANDE DE STAGE OFFICIELLE de 4 à 5 paragraphes bien séparés en Français académique pour :
        - Candidat : ${prenom} ${nom}
        - Entreprise : ${entreprise}
        - Domaine : ${domaine}
        - Durée : ${duree} à compter du ${dateDebut}
        - Note particulière : ${noteMotivation || 'Aucune'}
        
        CV du candidat :
        ${rawTextExtracted}

        Consignes strictes :
        - Rédige 4 à 5 paragraphes distincts et bien développés.
        - Ne mets PAS d'en-tête, PAS de date, PAS d'objet, PAS de signature dans ta réponse.
        - Renvoie UNIQUEMENT le texte des paragraphes du corps de la lettre.`;

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
    const pStyle = 'text-align: justify; margin-bottom: 22px; line-height: 1.6; font-size: 11pt; color: #000; font-family: "Times New Roman", Times, serif;';
    
    if (bodyText && bodyText.trim().length > 80) {
        let cleanText = bodyText
            .replace(/<div[^>]*>[\s\S]*?<\/div>/gi, '')
            .replace(/Objet\s*:[^\n<]*/gi, '')
            .replace(/Fait à[^\n<]*/gi, '')
            .replace(/À [^\n<]*/gi, '')
            .replace(/Monsieur le Directeur[^\n<]*/gi, '')
            .replace(/L'intéressé\(e\)[\s\S]*/gi, '')
            .replace(/```json/g, '').replace(/```/g, '').trim();

        let rawParas = cleanText.split(/\n\s*\n|<p[^>]*>/).map(p => p.replace(/<\/p>/g, '').trim()).filter(p => p.length > 20);
        
        if (rawParas.length >= 3) {
            paragraphsHtml = rawParas.map(p => `<p style="${pStyle}">${p}</p>`).join('');
        } else {
            let sentences = cleanText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 10);
            if (sentences.length >= 4) {
                let p1 = sentences.slice(0, Math.ceil(sentences.length * 0.25)).join(' ');
                let p2 = sentences.slice(Math.ceil(sentences.length * 0.25), Math.ceil(sentences.length * 0.55)).join(' ');
                let p3 = sentences.slice(Math.ceil(sentences.length * 0.55), Math.ceil(sentences.length * 0.8)).join(' ');
                let p4 = sentences.slice(Math.ceil(sentences.length * 0.8)).join(' ');
                
                paragraphsHtml = `
                    <p style="${pStyle}">${p1}</p>
                    <p style="${pStyle}">${p2}</p>
                    <p style="${pStyle}">${p3}</p>
                    <p style="${pStyle}">${p4}</p>
                `;
            } else {
                paragraphsHtml = `<p style="${pStyle}">${cleanText}</p>`;
            }
        }
    }

    if (!paragraphsHtml) {
        paragraphsHtml = `
            <p style="${pStyle}">
                Je me permets de vous adresser cette demande de stage dans le cadre de ma formation en ${domaine}, pour une durée de ${duree}, à compter du ${dateDebut}.
            </p>
            <p style="${pStyle}">
                Ce stage serait, pour moi, une opportunité de mettre en pratique les connaissances et les compétences acquises au cours de mes études et de mon expérience professionnelle. Tout au long de mon parcours académique et professionnel, j'ai développé des compétences qui me permettent de contribuer de manière significative à votre équipe.
            </p>
            <p style="${pStyle}">
                Pendant ce stage, je serais entièrement dédié à apporter une valeur ajoutée à votre équipe. Je suis convaincu que mon expertise et mon engagement pourraient être un atout pour votre établissement <strong>${entreprise}</strong>.
            </p>
            <p style="${pStyle}">
                Dans l'attente d'une suite favorable à ma demande, je vous remercie de l'attention que vous porterez à ma candidature. Je reste à votre disposition pour fournir tout complément d'information que vous pourriez nécessiter.
            </p>
        `;
    }

    const formattedNom = nom ? nom.toUpperCase() : '';

    return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; line-height: 1.5; padding: 10px;">
            <!-- En-tête Expéditeur et Date -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <div style="font-size: 11pt; line-height: 1.5; color: #000;">
                    <strong>${prenom} ${nom}</strong><br>
                    Dakar, Sénégal<br>
                    ${phone ? 'Tél : ' + phone + '<br>' : ''}
                    ${email ? 'Email : ' + email : ''}
                </div>
                <div style="font-size: 11pt; text-align: right; margin-top: 45px;">
                    Fait à Dakar, le ${todayStr}
                </div>
            </div>

            <!-- Destinataire (À Monsieur le Directeur...) -->
            <div style="text-align: right; font-size: 11pt; line-height: 1.5; color: #000; margin-bottom: 40px; padding-right: 10px;">
                <strong>À ${destinataire}</strong><br>
                <strong>${entreprise}</strong>
            </div>

            <!-- Objet (Seul le mot Objet est souligné) -->
            <div style="font-size: 11pt; margin-bottom: 25px; color: #000;">
                <strong><u>Objet</u> : Demande de stage en ${domaine} (Durée : ${duree})</strong>
            </div>

            <!-- Formule d'appel -->
            <p style="margin-bottom: 22px; font-size: 11pt; color: #000; font-family: 'Times New Roman', Times, serif;">${destinataire},</p>

            <!-- Paragraphes espacés d'une ligne entière -->
            ${paragraphsHtml}

            <!-- Signature en bas à droite -->
            <div style="float: right; text-align: right; margin-top: 45px; font-size: 11pt; color: #000; padding-right: 20px;">
                L'intéressé,<br><br><br>
                <strong>${prenom} ${formattedNom}</strong>
            </div>
            <div style="clear: both;"></div>
        </div>
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
