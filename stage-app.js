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

function parseCVDetails(rawText) {
    let summary = "";
    let skills = "";
    let phone = "";
    let email = "";

    const phoneMatch = rawText.match(/(?:\+221|00221)?\s*[738][0-9]\s*[0-9]{3}\s*[0-9]{2}\s*[0-9]{2}/);
    if (phoneMatch) phone = phoneMatch[0];
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) email = emailMatch[0];

    if (rawText.trim().startsWith('{')) {
        try {
            const parsed = JSON.parse(rawText);
            if (parsed.personal) {
                if (parsed.personal.summary) summary = parsed.personal.summary;
                if (parsed.personal.jobTitle) skills = parsed.personal.jobTitle;
                if (parsed.personal.phone && !phone) phone = parsed.personal.phone;
                if (parsed.personal.email && !email) email = parsed.personal.email;
            }
            if (parsed.skills && Array.isArray(parsed.skills)) {
                const skillNames = parsed.skills.map(s => (typeof s === 'string' ? s : s.name)).filter(Boolean);
                if (skillNames.length > 0) skills += (skills ? ', ' : '') + skillNames.slice(0, 5).join(', ');
            }
        } catch(e) {}
    } else {
        // Plain text parsing
        summary = rawText.substring(0, 300).replace(/[\{\}\[\]"]/g, '').trim();
    }

    return { summary, skills, phone, email };
}

async function generateStageDocument(event) {
    event.preventDefault();
    
    const prenom = document.getElementById('input-prenom').value.trim();
    const nom = document.getElementById('input-nom').value.trim();
    const entreprise = document.getElementById('input-entreprise').value.trim();
    const destinataire = document.getElementById('input-destinataire').value.trim() || 'Le Directeur Général';
    const domaine = document.getElementById('input-domaine').value.trim();
    const dateDebut = document.getElementById('input-date-debut').value.trim();
    const duree = document.getElementById('input-duree').value.trim();
    const noteMotivation = document.getElementById('input-motivation-note').value.trim();
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
        const cvDetails = parseCVDetails(rawTextExtracted);

        if (overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Rédaction de la Demande de Stage par l\'IA...';

        const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

        const finalDocumentHtml = buildPerfectAdministrativeDocument({
            prenom,
            nom,
            email: cvDetails.email || 'ngalagne84@gmail.com',
            phone: cvDetails.phone || '782124456 / 782532353',
            destinataire,
            entreprise,
            domaine,
            duree,
            dateDebut,
            noteMotivation,
            cvSkills: cvDetails.skills,
            todayStr
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
            prenom, nom, email: 'ngalagne84@gmail.com', phone: '782124456 / 782532353', destinataire, entreprise, domaine, duree, dateDebut, noteMotivation: "", cvSkills: "", todayStr
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

function buildPerfectAdministrativeDocument({ prenom, nom, email, phone, destinataire, entreprise, domaine, duree, dateDebut, noteMotivation, cvSkills, todayStr }) {
    
    const pStyle = 'text-align: justify; margin-bottom: 22px; line-height: 1.65; font-size: 12pt; color: #000; font-family: "Times New Roman", Times, serif;';
    
    let skillText = cvSkills ? `notamment en ${cvSkills}` : `dans le secteur de ${domaine}`;
    let noteText = noteMotivation ? ` Particulièrement motivé par vos projets récents, ${noteMotivation.toLowerCase()}` : '';

    const p1 = `Je me permets de solliciter par la présente votre haute bienveillance afin de faire acte de candidature pour un stage académique et professionnel en <strong>${domaine}</strong> au sein de votre établissement <strong>${entreprise}</strong>, pour une durée de <strong>${duree}</strong>, à compter du <strong>${dateDebut}</strong>.`;
    
    const p2 = `Ce stage représente pour moi une opportunité exceptionnelle de mettre en pratique les connaissances théoriques et les compétences techniques acquises tout au long de mon parcours de formation ${skillText}. Désireux de parfaire mon expérience, je souhaite m'investir pleinement au service de votre équipe.`;

    const p3 = `Sérieux, rigoureux et doté d'un grand sens du devoir, je suis convaincu que mon profil et ma détermination me permettront d'apporter une valeur ajoutée concrète à vos activités quotidiennes.${noteText}`;

    const p4 = `Dans l'attente d'une suite favorable à ma demande, je vous remercie chaleureusement de l'attention que vous porterez à ma candidature. Je reste à votre entière disposition pour tout entretien ou complément d'information.`;

    const formattedNom = nom ? nom.toUpperCase() : '';

    return `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.5; padding: 10px;">
            <!-- En-tête Expéditeur et Date -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px;">
                <div style="font-size: 12pt; line-height: 1.5; color: #000;">
                    <strong>${prenom} ${nom}</strong><br>
                    Dakar, Sénégal<br>
                    ${phone ? 'Tél : ' + phone + '<br>' : ''}
                    ${email ? 'Email : ' + email : ''}
                </div>
                <div style="font-size: 12pt; text-align: right; margin-top: 45px;">
                    Fait à Dakar, le ${todayStr}
                </div>
            </div>

            <!-- Destinataire (À Monsieur le Directeur...) -->
            <div style="text-align: right; font-size: 12pt; line-height: 1.5; color: #000; margin-bottom: 40px; padding-right: 10px;">
                <strong>À ${destinataire}</strong><br>
                <strong>${entreprise}</strong>
            </div>

            <!-- Objet (Seul le mot Objet est souligné) -->
            <div style="font-size: 12pt; margin-bottom: 25px; color: #000;">
                <strong><u>Objet</u> : Demande de stage en ${domaine} (Durée : ${duree})</strong>
            </div>

            <!-- Formule d'appel -->
            <p style="margin-bottom: 22px; font-size: 12pt; color: #000; font-family: 'Times New Roman', Times, serif;">${destinataire},</p>

            <!-- Paragraphes espacés d'une ligne entière -->
            <p style="${pStyle}">${p1}</p>
            <p style="${pStyle}">${p2}</p>
            <p style="${pStyle}">${p3}</p>
            <p style="${pStyle}">${p4}</p>

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
