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
        summary = rawText.substring(0, 300).replace(/[\{\}\[\]"]/g, '').trim();
    }

    return { summary, skills, phone, email };
}

const STAGE_SECTOR_TEMPLATES = {
    informatique: {
        objetLabel: "Développement Informatique et Numérique",
        p1: (dom, ent, dur, dat) => `Actuellement étudiant(e) et passionné(e) par les technologies du numérique en <strong>${dom}</strong>, je sollicite votre haute bienveillance afin de faire acte de candidature pour un stage pratique de <strong>${dur}</strong> au sein de votre entreprise <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Passionné(e) par le développement logiciel, les bases de données, le web et l'innovation technologique, je souhaite mettre en pratique les compétences acquises durant mon parcours ${skills ? 'notamment en ' + skills : ''} et développer des solutions numériques performantes adaptées aux besoins de vos projets.`,
        p3: (note) => `Sérieux(se), rigoureux(se) et doté(e) d'un fort esprit d'analyse et d'une grande capacité d'adaptation, je serais honoré(e) d'intégrer vos équipes techniques afin d'apporter une valeur ajoutée concrète tout en enrichissant mon expérience professionnelle.${note ? ' ' + note : ''}`,
        p4: (dest) => `Dans l'attente d'une suite favorable que vous voudrez bien réserver à ma requête, je vous prie d'agréer, ${dest}, l'expression de ma considération la plus distinguée et de mon profond respect.`
    },
    comptabilite: {
        objetLabel: "Comptabilité et Gestion Financière",
        p1: (dom, ent, dur, dat) => `Dans le cadre de ma formation en <strong>${dom}</strong>, j'ai l'honneur de solliciter votre haute bienveillance afin d'effectuer un stage pratique d'une durée de <strong>${dur}</strong> au sein de votre établissement <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Ce stage me permettra de renforcer mes compétences en comptabilité générale, tenue des livres, gestion financière et contrôle analytique. Rigoureux(se), méthodique et maîtrisant les outils bureautiques et logiciels spécialisés ${skills ? '(compétences en ' + skills + ')' : ''}, je souhaite m'investir concrètement auprès de vos équipes comptables.`,
        p3: (note) => `Consciencieux(se) et respectueux(se) des principes de confidentialité et d'éthique professionnelle, je serais ravi(e) de mettre mon sérieux et ma proactivité au service de vos travaux financiers et administratifs.${note ? ' ' + note : ''}`,
        p4: (dest) => `Restant à votre entière disposition pour tout entretien formel, je vous prie d'agréer, ${dest}, l'expression de ma considération la plus distinguée.`
    },
    marketing: {
        objetLabel: "Marketing Digital et Communication",
        p1: (dom, ent, dur, dat) => `Étudiant(e) spécialisé(e) en <strong>${dom}</strong>, je sollicite par la présente votre bienveillance afin d'effectuer un stage professionnel de <strong>${dur}</strong> au sein de votre entreprise <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Créatif(ve), curieux(se) et passionné(e) par la communication numérique, le SEO, le community management et les études de marché, je souhaite contribuer activement à vos actions marketing tout en développant des compétences terrain solides ${skills ? '(acquis en ' + skills + ')' : ''}.`,
        p3: (note) => `Dynamique, autonome et force de proposition, je suis convaincu(e) que ce stage constituera une opportunité d'apporter un regard neuf et percutant à vos campagnes promotionnelles et à la valorisation de votre image de marque.${note ? ' ' + note : ''}`,
        p4: (dest) => `Je vous prie d'agréer, ${dest}, l'expression de mes salutations distinguées et de mon profond respect.`
    },
    rh: {
        objetLabel: "Gestion des Ressources Humaines",
        p1: (dom, ent, dur, dat) => `Actuellement en formation en <strong>${dom}</strong>, j'ai l'honneur de faire acte de candidature pour un stage pratique de <strong>${dur}</strong> au sein du service des ressources humaines de <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Ce stage constitue pour moi l'opportunité d'approfondir mes compétences dans le recrutement, la gestion de l'administration du personnel, la formation continue et le suivi des compétences ${skills ? '(connaissances en ' + skills + ')' : ''}.`,
        p3: (note) => `Sérieux(se), discret(ète), méthodique et doté(e) d'une grande aisance relationnelle, je souhaite mettre mon sens de l'écoute et de l'organisation au service de l'épanouissement et de la performance de vos collaborateurs.${note ? ' ' + note : ''}`,
        p4: (dest) => `En espérant une suite favorable à ma candidature, je vous prie d'agréer, ${dest}, l'expression de ma très haute considération.`
    },
    geniecivil: {
        objetLabel: "Génie Civil et Bâtiment (BTP)",
        p1: (dom, ent, dur, dat) => `Dans le cadre de ma formation en <strong>${dom}</strong>, je sollicite votre bienveillance pour un stage pratique de <strong>${dur}</strong> au sein de votre entreprise <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Désireux(se) de participer à des projets de construction, de suivi de chantier et de conception d'ouvrages, je souhaite mettre en pratique mes connaissances techniques et acquérir une expérience de terrain auprès de vos équipes d'ingénieurs ${skills ? '(compétences en ' + skills + ')' : ''}.`,
        p3: (note) => `Méthodique, réactif(ve) et strictement respectueux(se) des normes de sécurité et de qualité, je suis prêt(e) à m'investir sur le terrain pour soutenir vos opérations et contribuer à la réussite de vos ouvrages.${note ? ' ' + note : ''}`,
        p4: (dest) => `Dans l'attente de vous rencontrer lors d'un entretien à votre convenance, je vous prie d'agréer, ${dest}, mes salutations distinguées.`
    },
    banque: {
        objetLabel: "Banque et Finance",
        p1: (dom, ent, dur, dat) => `Étudiant(e) en <strong>${dom}</strong>, je sollicite par la présente votre haute bienveillance afin d'effectuer un stage professionnel de <strong>${dur}</strong> au sein de votre établissement bancaire <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Soucieux(se) de développer mes compétences en gestion bancaire, analyse des risques financiers, opérations de guichet et relation clientèle, je souhaite mettre ma rigueur et mes acquis théoriques au service de vos guichets et départements financiers ${skills ? '(acquis en ' + skills + ')' : ''}.`,
        p3: (note) => `Motivé(e), rigoureux(se) et doté(e) d'un excellent sens du service et de l'éthique professionnelle, je suis déterminé(e) à m'investir avec l'efficacité et la discrétion requises.${note ? ' ' + note : ''}`,
        p4: (dest) => `Je vous prie d'agréer, ${dest}, l'expression de ma considération la plus distinguée.`
    },
    commerce: {
        objetLabel: "Commerce, Vente et Relation Client",
        p1: (dom, ent, dur, dat) => `Dans le cadre de ma formation commerciale en <strong>${dom}</strong>, je sollicite l'opportunité d'effectuer un stage de <strong>${dur}</strong> au sein de votre structure <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Dynamique et orienté(e) résultats, je souhaite développer mes compétences sur le terrain en prospection commerciale, négociation, gestion de portefeuille clients et développement du chiffre d'affaires ${skills ? '(compétences en ' + skills + ')' : ''}.`,
        p3: (note) => `Doté(e) d'une excellente aisance relationnelle, d'une grande réactivité et du goût du défi commercial, je serais ravi(e) de contribuer activement à l'atteinte de vos objectifs de développement.${note ? ' ' + note : ''}`,
        p4: (dest) => `Dans l'attente de votre retour, veuillez agréer, ${dest}, l'expression de mes salutations distinguées.`
    },
    sante: {
        objetLabel: "Santé et Soins Médicaux",
        p1: (dom, ent, dur, dat) => `Actuellement en formation dans le domaine de la <strong>${dom}</strong>, j'ai l'honneur de solliciter votre bienveillance pour un stage clinique/pratique de <strong>${dur}</strong> au sein de votre établissement <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Désireux(se) de renforcer mes compétences pratiques auprès de professionnels qualifiés, je souhaite apprendre l'accueil des patients, la pratique des Soins, et le strict respect des protocoles d'hygiène et de sécurité ${skills ? '(connaissances en ' + skills + ')' : ''}.`,
        p3: (note) => `Consciencieux(se), empathique, rigoureux(se) et respectueux(se) du secret médical, je m'engage à faire preuve d'un dévouement irréprochable au service de vos usagers et de votre équipe médicale.${note ? ' ' + note : ''}`,
        p4: (dest) => `Je vous prie d'agréer, ${dest}, l'expression de ma considération la plus distinguée.`
    },
    enseignement: {
        objetLabel: "Enseignement et Pédagogie",
        p1: (dom, ent, dur, dat) => `Dans le cadre de ma formation en éducation et <strong>${dom}</strong>, je me permets de solliciter votre haute bienveillance afin d'effectuer un stage d'immersion et de pratique pédagogique de <strong>${dur}</strong> au sein de votre établissement <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Patient(e), pédagogue et passionné(e) par la transmission des savoirs, je souhaite mettre en pratique mes compétences en préparation de cours, animation de classe et accompagnement individuel des élèves auprès de vos enseignants expérimentés ${skills ? '(acquis en ' + skills + ')' : ''}.`,
        p3: (note) => `Motivé(e) par la recherche constante de l'excellence éducative, je serais honoré(e) d'apporter mon dynamisme et ma rigueur au service de vos élèves et du projet pédagogique de votre école.${note ? ' ' + note : ''}`,
        p4: (dest) => `Je reste à votre entière disposition pour tout entretien et vous prie d'agréer, ${dest}, l'expression de mes salutations distinguées.`
    },
    generique: {
        objetLabel: "Stage Académique et Professionnel",
        p1: (dom, ent, dur, dat) => `Actuellement étudiant(e) en <strong>${dom}</strong>, j'ai l'honneur de solliciter votre haute bienveillance afin de faire acte de candidature pour un stage pratique de <strong>${dur}</strong> au sein de votre structure <strong>${ent}</strong>, à compter du <strong>${dat}</strong>.`,
        p2: (skills) => `Ce stage constitue une étape essentielle pour compléter ma formation théorique par une expérience professionnelle solide sur le terrain ${skills ? '(compétences valorisées en ' + skills + ')' : ''}.`,
        p3: (note) => `Motivé(e), sérieux(se) et désireux(se) d'apprendre, je souhaite m'investir avec rigueur dans toutes les missions que vous voudrez bien me confier au service de votre entreprise.${note ? ' ' + note : ''}`,
        p4: (dest) => `Dans l'attente d'une suite favorable à ma demande, je vous prie d'agréer, ${dest}, l'expression de ma considération la plus distinguée.`
    }
};

function selectSectorTemplate(domaineText) {
    const text = (domaineText || '').toLowerCase();
    if (text.includes('info') || text.includes('dev') || text.includes('web') || text.includes('logiciel') || text.includes('réseau') || text.includes('it') || text.includes('numérique')) return STAGE_SECTOR_TEMPLATES.informatique;
    if (text.includes('compta') || text.includes('financ') || text.includes('gestion') || text.includes('audit')) return STAGE_SECTOR_TEMPLATES.comptabilite;
    if (text.includes('market') || text.includes('communic') || text.includes('digital') || text.includes('media') || text.includes('pub')) return STAGE_SECTOR_TEMPLATES.marketing;
    if (text.includes('rh') || text.includes('ressource') || text.includes('personnel') || text.includes('recrutement')) return STAGE_SECTOR_TEMPLATES.rh;
    if (text.includes('civil') || text.includes('btp') || text.includes('bâtiment') || text.includes('chantier') || text.includes('ouvrage')) return STAGE_SECTOR_TEMPLATES.geniecivil;
    if (text.includes('banque') || text.includes('crédit') || text.includes('caisse')) return STAGE_SECTOR_TEMPLATES.banque;
    if (text.includes('commer') || text.includes('vent') || text.includes('négociat') || text.includes('client')) return STAGE_SECTOR_TEMPLATES.commerce;
    if (text.includes('santé') || text.includes('médic') || text.includes('soin') || text.includes('infirm') || text.includes('pharmac')) return STAGE_SECTOR_TEMPLATES.sante;
    if (text.includes('enseign') || text.includes('éduc') || text.includes('école') || text.includes('pédagog') || text.includes('prof')) return STAGE_SECTOR_TEMPLATES.enseignement;
    return STAGE_SECTOR_TEMPLATES.generique;
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

        if (overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Génération de la Demande de Stage sur mesure...';

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
    
    const tpl = selectSectorTemplate(domaine);
    const pStyle = 'text-align: justify; margin-bottom: 22px; line-height: 1.65; font-size: 12pt; color: #000; font-family: "Times New Roman", Times, serif;';
    
    const p1 = tpl.p1(domaine, entreprise, duree, dateDebut);
    const p2 = tpl.p2(cvSkills);
    const p3 = tpl.p3(noteMotivation);
    const p4 = tpl.p4(destinataire);

    const formattedNom = nom ? nom.toUpperCase() : '';
    const objetTitle = tpl.objetLabel || domaine;

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
                <strong><u>Objet</u> : Demande de stage en ${objetTitle} (Durée : ${duree})</strong>
            </div>

            <!-- Formule d'appel -->
            <p style="margin-bottom: 22px; font-size: 12pt; color: #000; font-family: 'Times New Roman', Times, serif;">${destinataire},</p>

            <!-- Paragraphes espacés d'une ligne entière -->
            <p style="${pStyle}">${p1}</p>
            <p style="${pStyle}">${p2}</p>
            <p style="${pStyle}">${p3}</p>
            <p style="${pStyle}">${p4}</p>

            <!-- Signature en bas à droite -->
            <div style="float: right; text-align: right; margin-top: 45px; font-size: 12pt; color: #000; padding-right: 20px;">
                L'intéressé,<br><br><br>
                <strong>${prenom} ${formattedNom}</strong>
            </div>
            <div style="clear: both;"></div>
        </div>
    `;
}

function openStagePaymentModal() {
    const modal = document.getElementById('stage-payment-modal');
    if (modal) modal.style.display = 'flex';
}

function closeStagePaymentModal() {
    const modal = document.getElementById('stage-payment-modal');
    if (modal) modal.style.display = 'none';
}

function processStagePayment() {
    closeStagePaymentModal();
    // Trigger PDF download directly after payment confirmation
    generateStagePDFDirect();
}

function exportStagePDF() {
    openStagePaymentModal();
}

function generateStagePDFDirect() {
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
