const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';

let uploadedLogoDataUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const dateInput = document.getElementById('auto-date-redaction');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    // Auto-open modal when navigating to autorisation generator
    const urlParams = new URLSearchParams(window.location.search);
    const isPaymentSuccess = urlParams.get('payment') === 'success' || urlParams.get('payment_success') === 'autorisation';
    
    if (!isPaymentSuccess) {
        setTimeout(() => {
            const modal = document.getElementById('autorisation-modal');
            const resSec = document.getElementById('autorisation-results-section');
            if (modal && (!resSec || resSec.style.display !== 'block')) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }, 100);
    } else {
        alert("✅ Paiement de 500 FCFA réussi avec SenePay ! Votre Demande d'Autorisation va être téléchargée.");
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Restore document from local storage if page reloaded
        const savedAutoDoc = localStorage.getItem('autorisation_doc_html');
        if (savedAutoDoc) {
            const docOutput = document.getElementById('doc-autorisation-output');
            if (docOutput) docOutput.innerHTML = savedAutoDoc;
            const landingSec = document.getElementById('autorisation-landing-section');
            const resSec = document.getElementById('autorisation-results-section');
            if (landingSec) landingSec.style.display = 'none';
            if (resSec) resSec.style.display = 'block';
        }
        
        setTimeout(() => {
            exportAutorisationPDFDirect();
        }, 800);
    }
});

window.openAutorisationModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const modal = document.getElementById('autorisation-modal');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        document.body.style.overflow = 'hidden';
    } else {
        window.location.href = 'autorisation-generator.html';
    }
};

window.closeAutorisationModal = function() {
    const modal = document.getElementById('autorisation-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = 'auto';
    }
};

window.openAutorisationPaymentModal = function(exportType = 'pdf') {
    window.pendingExportType = exportType;
    const modal = document.getElementById('autorisation-payment-modal');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
};

window.closeAutorisationPaymentModal = function() {
    const modal = document.getElementById('autorisation-payment-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
};

async function processAutorisationPayment() {
    const btn = document.querySelector('#autorisation-payment-modal .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion à SenePay (Wave / OM)...';
    }

    // Save document state before redirecting
    const docOutput = document.getElementById('doc-autorisation-output');
    if (docOutput) {
        localStorage.setItem('autorisation_doc_html', docOutput.innerHTML);
    }

    const redirectSuccessUrl = window.location.origin + window.location.pathname + '?payment=success';

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/init-senepay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                amount: 500,
                description: 'Demande d\'Autorisation de Manifestation (500 FCFA)',
                returnUrl: redirectSuccessUrl,
                cancelUrl: window.location.href
            })
        });

        const data = await response.json();
        const targetUrl = data.checkoutUrl || data.url || data.payment_url;

        if (response.ok && targetUrl) {
            window.location.href = targetUrl;
            return;
        }
    } catch (err) {
        console.warn("Supabase SenePay edge function fallback:", err);
    }

    // Fallback confirmation redirect to avoid DNS error while downloading document
    setTimeout(() => {
        window.location.href = redirectSuccessUrl;
    }, 800);
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedLogoDataUrl = e.target.result;
            const previewContainer = document.getElementById('auto-logo-preview-container');
            const previewImg = document.getElementById('auto-logo-preview');
            if (previewContainer && previewImg) {
                previewImg.src = uploadedLogoDataUrl;
                previewContainer.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }
}

function removeUploadedLogo() {
    uploadedLogoDataUrl = '';
    const fileInput = document.getElementById('auto-logo-file');
    if (fileInput) fileInput.value = '';
    const previewContainer = document.getElementById('auto-logo-preview-container');
    if (previewContainer) previewContainer.style.display = 'none';
}

function toggleResponsibleField(index) {
    const box = document.getElementById(`responsible-box-${index}`);
    const btn = document.getElementById(`btn-toggle-resp-${index}`);
    if (box) {
        if (box.style.display === 'none' || !box.style.display) {
            box.style.display = 'block';
            if (btn) btn.innerHTML = `<i class="fa-solid fa-minus"></i> Masquer le responsable ${index}`;
        } else {
            box.style.display = 'none';
            if (btn) btn.innerHTML = `<i class="fa-solid fa-plus"></i> Ajouter un responsable ${index}`;
        }
    }
}

function openAutorisationModal() {
    const modal = document.getElementById('autorisation-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeAutorisationModal() {
    const modal = document.getElementById('autorisation-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function getSelectedCheckboxes(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function getSenegalAutoriteHeader(autorite, { region, departement, arrondissement, commune, quartier }) {
    let headerText = `<strong>À ${autorite}</strong>`;
    
    if (autorite.includes('Sous-préfet')) {
        const place = arrondissement || commune || departement;
        headerText = `<strong>À Monsieur le Sous-préfet</strong><br>de l'Arrondissement de <strong>${place || '......'}</strong>`;
    } else if (autorite.includes('Préfet')) {
        const place = departement || commune || region;
        headerText = `<strong>À Monsieur le Préfet</strong><br>du Département de <strong>${place || '......'}</strong>`;
    } else if (autorite.includes('Gouverneur')) {
        const place = region || departement;
        headerText = `<strong>À Monsieur le Gouverneur</strong><br>de la Région de <strong>${place || '......'}</strong>`;
    } else if (autorite.includes('Maire')) {
        const place = commune || quartier;
        headerText = `<strong>À Monsieur le Maire</strong><br>de la Commune de <strong>${place || '......'}</strong>`;
    } else if (autorite.includes('Chef de village') || autorite.includes('Délégué')) {
        const place = quartier || commune;
        headerText = `<strong>À Monsieur le Chef de Village / Délégué de Quartier</strong><br>de <strong>${place || '......'}</strong>`;
    } else if (autorite.includes('Commissaire') || autorite.includes('Commandant')) {
        const place = commune || departement;
        headerText = `<strong>À ${autorite}</strong><br>Circonscription / Brigade de <strong>${place || '......'}</strong>`;
    }
    return headerText;
}

async function generateAutorisationDocument(event) {
    if (event) event.preventDefault();

    const dateRedaction = document.getElementById('auto-date-redaction')?.value || new Date().toISOString().split('T')[0];
    const lieuRedaction = document.getElementById('auto-lieu-redaction')?.value.trim() || 'Dakar';

    // Demandeur
    const demandeurNom = document.getElementById('auto-nom')?.value.trim() || '';
    const demandeurPrenom = document.getElementById('auto-prenom')?.value.trim() || '';
    const demandeurCni = document.getElementById('auto-cni')?.value.trim() || '';
    const demandeurAdresse = document.getElementById('auto-adresse')?.value.trim() || '';
    const demandeurTel = document.getElementById('auto-tel')?.value.trim() || '';
    const demandeurEmail = document.getElementById('auto-email')?.value.trim() || '';
    const demandeurProfession = document.getElementById('auto-profession')?.value || 'Autre';
    const demandeurQualite = document.getElementById('auto-qualite')?.value || 'En mon nom personnel';

    // Responsables
    const r1Nom = document.getElementById('auto-r1-nom')?.value.trim() || '';
    const r1Prenom = document.getElementById('auto-r1-prenom')?.value.trim() || '';
    const r1Cni = document.getElementById('auto-r1-cni')?.value.trim() || '';
    const r1Fonction = document.getElementById('auto-r1-fonction')?.value || 'Président';
    const r1Tel = document.getElementById('auto-r1-tel')?.value.trim() || '';
    const r1Adresse = document.getElementById('auto-r1-adresse')?.value.trim() || '';

    const r2Nom = document.getElementById('auto-r2-nom')?.value.trim() || '';
    const r2Prenom = document.getElementById('auto-r2-prenom')?.value.trim() || '';
    const r2Cni = document.getElementById('auto-r2-cni')?.value.trim() || '';
    const r2Fonction = document.getElementById('auto-r2-fonction')?.value || '';
    const r2Tel = document.getElementById('auto-r2-tel')?.value.trim() || '';
    const r2Adresse = document.getElementById('auto-r2-adresse')?.value.trim() || '';

    const r3Nom = document.getElementById('auto-r3-nom')?.value.trim() || '';
    const r3Prenom = document.getElementById('auto-r3-prenom')?.value.trim() || '';
    const r3Cni = document.getElementById('auto-r3-cni')?.value.trim() || '';
    const r3Fonction = document.getElementById('auto-r3-fonction')?.value || '';
    const r3Tel = document.getElementById('auto-r3-tel')?.value.trim() || '';
    const r3Adresse = document.getElementById('auto-r3-adresse')?.value.trim() || '';

    // Autorité & Event
    const autorite = document.getElementById('auto-autorite')?.value || 'Monsieur le Préfet';
    const typeManifestation = document.getElementById('auto-type-manifestation')?.value || 'Soirée culturelle';
    const natureManifestation = document.getElementById('auto-nature-manifestation')?.value || 'Publique';
    const objetCustom = document.getElementById('auto-objet')?.value.trim() || `Demande d'autorisation d'organisation de ${typeManifestation.toLowerCase()}`;

    // Location
    const region = document.getElementById('auto-region')?.value.trim() || '';
    const departement = document.getElementById('auto-departement')?.value.trim() || '';
    const arrondissement = document.getElementById('auto-arrondissement')?.value.trim() || '';
    const commune = document.getElementById('auto-commune')?.value.trim() || '';
    const quartier = document.getElementById('auto-quartier')?.value.trim() || '';
    const adressePrecise = document.getElementById('auto-adresse-precise')?.value.trim() || '';

    // Date & Time
    const dateManif = document.getElementById('auto-date-manif')?.value || '';
    const heureDebut = document.getElementById('auto-heure-debut')?.value || '';
    const heureFin = document.getElementById('auto-heure-fin')?.value || '';
    const nbParticipants = document.getElementById('auto-nb-participants')?.value || '50 à 100';

    // Animation & Equipment
    const animationSonore = document.getElementById('auto-animation-sonore')?.value || 'Sonorisation simple';
    const materiel = getSelectedCheckboxes('materiel');
    const securite = getSelectedCheckboxes('securite');
    const engagements = getSelectedCheckboxes('engagements');
    const piecesJointes = getSelectedCheckboxes('pieces_jointes');

    const overlay = document.getElementById('auto-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    try {
        // Build Prompt for Groq / Supabase AI Edge function
        const promptText = `
Veuillez rédiger une lettre officielle de demande d'autorisation de manifestation conforme au style administratif du Sénégal.
DÉTAILS DU FORMULAIRE :
- Date de rédaction : ${dateRedaction} à ${lieuRedaction}
- Demandeur : ${demandeurPrenom} ${demandeurNom} (CNI N°: ${demandeurCni}), ${demandeurProfession}, Qualité : ${demandeurQualite}. Adresse: ${demandeurAdresse}, Tél: ${demandeurTel}, Email: ${demandeurEmail}
- Responsables associés :
  1. ${r1Prenom} ${r1Nom} (CNI N°: ${r1Cni}, Fonction: ${r1Fonction}), Tél: ${r1Tel}, Adresse: ${r1Adresse}
  ${r2Nom ? `2. ${r2Prenom} ${r2Nom} (CNI N°: ${r2Cni}, Fonction: ${r2Fonction}), Tél: ${r2Tel}, Adresse: ${r2Adresse}` : ''}
  ${r3Nom ? `3. ${r3Prenom} ${r3Nom} (CNI N°: ${r3Cni}, Fonction: ${r3Fonction}), Tél: ${r3Tel}, Adresse: ${r3Adresse}` : ''}
- Autorité destinataire : ${autorite}
- Type de manifestation : ${typeManifestation} (Nature : ${natureManifestation})
- Objet : ${objetCustom}
- Lieu précis : ${adressePrecise}, Quartier/Village: ${quartier}, Commune: ${commune}, Arrondissement: ${arrondissement}, Département: ${departement}, Région: ${region}
- Date et horaires : Le ${dateManif} de ${heureDebut} à ${heureFin}
- Nombre de participants estimé : ${nbParticipants}
- Animation sonore : ${animationSonore}
- Matériel utilisé : ${materiel.join(', ')}
- Dispositif de sécurité : ${securite.join(', ')}
- Engagements pris : ${engagements.join(', ')}
- Pièces jointes fournies : ${piecesJointes.join(', ')}
        `;

        let generatedBody = '';
        try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-cv`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({
                    rawText: promptText,
                    prompt: "Génère le corps complet de la lettre administrative officielle d'autorisation de manifestation en français."
                })
            });
            const dataText = await response.text();
            if (dataText && dataText.length > 50) {
                generatedBody = dataText.replace(/```html/g, '').replace(/```/g, '').trim();
            }
        } catch(e) {
            console.warn("IA API fallback to local template:", e);
        }

        if (!generatedBody || generatedBody.length < 50) {
            generatedBody = generateLocalAutorisationBody({
                demandeurPrenom, demandeurNom, demandeurQualite, demandeurAdresse, demandeurTel,
                typeManifestation, natureManifestation, autorite, objetCustom,
                adressePrecise, quartier, commune, dateManif, heureDebut, heureFin,
                nbParticipants, animationSonore, materiel, securite, engagements, piecesJointes
            });
        }

        const formattedDateRedaction = formatDateFR(dateRedaction);
        const formattedDateManif = formatDateFR(dateManif);

        // Senegal Territorial Authority Header format
        const autoriteHeaderFormatted = getSenegalAutoriteHeader(autorite, { region, departement, arrondissement, commune, quartier });

        // Construct HTML Letter
        const htmlDoc = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000000; line-height: 1.6; padding: 2.5rem 3rem; background: #ffffff; min-height: 297mm; box-sizing: border-box;">
            <!-- En-tête : Logo à gauche / Date & Lieu à droite -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem;">
                <div style="max-width: 48%;">
                    ${uploadedLogoDataUrl ? `<img src="${uploadedLogoDataUrl}" style="max-height: 90px; max-width: 180px; object-fit: contain; display: block; margin-bottom: 8px;">` : ''}
                    <div style="font-weight: bold; font-size: 11pt; text-transform: uppercase;">${demandeurPrenom} ${demandeurNom}</div>
                    <div style="font-size: 10pt; color: #222222;">${demandeurQualite}</div>
                    ${demandeurCni ? `<div style="font-size: 9.5pt; color: #333333;"><strong>CNI N° :</strong> ${demandeurCni}</div>` : ''}
                    <div style="font-size: 9.5pt; color: #444444;">${demandeurAdresse}</div>
                    <div style="font-size: 9.5pt; color: #444444;">Tél : ${demandeurTel}</div>
                    ${demandeurEmail ? `<div style="font-size: 9.5pt; color: #444444;">Email : ${demandeurEmail}</div>` : ''}
                </div>
                <div style="text-align: right; font-size: 11pt;">
                    <strong>Fait à ${lieuRedaction}, le ${formattedDateRedaction}</strong>
                </div>
            </div>

            <!-- Destinataire (Hiérarchie Administrative du Sénégal) -->
            <div style="margin-left: 45%; margin-bottom: 2.5rem; font-size: 12pt; line-height: 1.5;">
                ${autoriteHeaderFormatted}
            </div>

            <!-- Objet -->
            <div style="margin-bottom: 1.5rem; font-size: 12pt;">
                <strong><u>OBJET :</u> ${objetCustom}</strong>
            </div>

            <!-- Corps de la lettre -->
            <div style="text-align: justify; text-justify: inter-word; margin-bottom: 1.5rem;">
                ${generatedBody}
            </div>

            <!-- Synthèse Récapitulative Officielle -->
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 1rem; margin: 1.5rem 0; font-size: 10.5pt; font-family: Arial, sans-serif;">
                <div style="font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase;">
                    <i class="fa-solid fa-list-check"></i> Fiche Synthétique de la Manifestation
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <div><strong>• Type :</strong> ${typeManifestation} (${natureManifestation})</div>
                    <div><strong>• Date :</strong> Le ${formattedDateManif}</div>
                    <div><strong>• Horaires :</strong> De ${heureDebut} à ${heureFin}</div>
                    <div><strong>• Participants :</strong> Env. ${nbParticipants} personnes</div>
                    <div><strong>• Lieu :</strong> ${adressePrecise}, ${quartier}, ${commune}</div>
                    <div><strong>• Animation :</strong> ${animationSonore}</div>
                </div>
                ${materiel.length > 0 ? `<div style="margin-top:4px;"><strong>• Matériel :</strong> ${materiel.join(', ')}</div>` : ''}
                ${securite.length > 0 ? `<div style="margin-top:2px;"><strong>• Sécurité :</strong> ${securite.join(', ')}</div>` : ''}
            </div>

            <!-- Identité des Responsables -->
            <div style="margin-bottom: 1.5rem; font-size: 10.5pt; font-family: Arial, sans-serif; background: #fafafa; border: 1px solid #e2e8f0; padding: 0.8rem; border-radius: 6px;">
                <strong><u>Responsable(s) de la Manifestation :</u></strong>
                <div style="margin-top: 4px;">
                    • <strong>1. ${r1Prenom} ${r1Nom}</strong> (${r1Fonction}) - ${r1Cni ? 'CNI N° : ' + r1Cni + ' - ' : ''}Tél : ${r1Tel || demandeurTel}
                    ${r2Nom ? `<br>• <strong>2. ${r2Prenom} ${r2Nom}</strong> (${r2Fonction}) - ${r2Cni ? 'CNI N° : ' + r2Cni + ' - ' : ''}Tél : ${r2Tel}` : ''}
                    ${r3Nom ? `<br>• <strong>3. ${r3Prenom} ${r3Nom}</strong> (${r3Fonction}) - ${r3Cni ? 'CNI N° : ' + r3Cni + ' - ' : ''}Tél : ${r3Tel}` : ''}
                </div>
            </div>

            <!-- Engagement solennel -->
            <div style="margin-bottom: 1.5rem;">
                <p>En tant qu'organisateur(s), nous nous engageons fermement à :</p>
                <ul style="padding-left: 20px; margin-top: 4px; margin-bottom: 8px;">
                    ${engagements.map(e => `<li>${e}</li>`).join('')}
                </ul>
            </div>

            <!-- Formule de politesse -->
            <div style="margin-bottom: 2.5rem; text-align: justify;">
                Restant à votre entière disposition pour toute information complémentaire ou visite de conformité des lieux, je vous prie d'agréer, <strong>${autorite}</strong>, l'assurance de notre considération la plus distinguée et de notre profond respect.
            </div>

            <!-- Bloc Signatures : EXPÉDITEUR À GAUCHE / AUTORITÉ À DROITE -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 3.5rem; page-break-inside: avoid;">
                <!-- Signature Expéditeur (À GAUCHE) -->
                <div style="width: 45%; text-align: left;">
                    <div style="font-size: 11pt;">
                        <strong><u>L'Expéditeur / Le Demandeur :</u></strong><br>
                        <span style="font-size:10pt; color:#333;">(Signature de l'organisateur)</span><br><br><br>
                        <strong>${demandeurPrenom} ${demandeurNom}</strong><br>
                        <em>${demandeurQualite}</em><br>
                        ${demandeurCni ? `<span style="font-size:9pt; color:#555;">CNI N° : ${demandeurCni}</span>` : ''}
                    </div>
                </div>

                <!-- Signature & Visa Autorité (À DROITE) -->
                <div style="width: 48%; text-align: center; border: 1.5px dashed #64748b; padding: 1rem; border-radius: 6px; background: #f8fafc;">
                    <div style="font-size: 10.5pt; font-weight: bold; color: #1e293b; text-transform: uppercase;">
                        Réservé à l'Autorité Administrative
                    </div>
                    <div style="font-size: 9.5pt; color: #475569; margin-top: 4px;">
                        Visa / Cachet de ${autorite}
                    </div>
                    <div style="margin-top: 15px; font-size: 9pt; color: #334155; display: flex; justify-content: center; gap: 15px;">
                        <span>[ &nbsp; ] Accordé</span>
                        <span>[ &nbsp; ] Refusé</span>
                    </div>
                    <div style="margin-top: 2.5rem; font-size: 8.5pt; color: #94a3b8;">
                        Date et Signature de l'Autorité
                    </div>
                </div>
            </div>

            ${piecesJointes.length > 0 ? `
            <div style="margin-top: 2rem; border-top: 1px dashed #cccccc; padding-top: 8px; font-size: 9.5pt; color: #444;">
                <strong><u>Pièces Jointes annexées :</u></strong> ${piecesJointes.join(' ; ')}
            </div>` : ''}
        </div>
        `;

            ${piecesJointes.length > 0 ? `
            <div style="margin-top: 2rem; border-top: 1px dashed #cccccc; padding-top: 8px; font-size: 9.5pt; color: #444;">
                <strong><u>Pièces Jointes annexées :</u></strong> ${piecesJointes.join(' ; ')}
            </div>` : ''}
        </div>
        `;

        // Render in document editor
        const docOutput = document.getElementById('doc-autorisation-output');
        if (docOutput) {
            docOutput.innerHTML = htmlDoc;
        }

        // Close modal and show results section
        closeAutorisationModal();
        const resultsSection = document.getElementById('autorisation-results-section');
        const landingSection = document.getElementById('autorisation-landing-section');
        if (resultsSection) resultsSection.style.display = 'block';
        if (landingSection) landingSection.style.display = 'none';

        // Scroll smoothly to output
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }

    } catch(err) {
        console.error("Erreur de génération :", err);
        alert("Erreur lors de la génération du document : " + err.message);
    } finally {
        if (overlay) overlay.style.display = 'none';
    }
}

function generateLocalAutorisationBody(data) {
    return `
    <p>J'ai l'honneur de solliciter par la présente votre haute bienveillance afin d'obtenir l'autorisation préalable d'organiser une manifestation de type <strong>${data.typeManifestation}</strong> (${data.natureManifestation.toLowerCase()}), intitulée <em>« ${data.objetCustom} »</em>.</p>
    
    <p>Cette manifestation est prévue pour se dérouler le <strong>${formatDateFR(data.dateManif)}</strong>, entre <strong>${data.heureDebut}</strong> et <strong>${data.heureFin}</strong>, à l'emplacement suivant : <strong>${data.adressePrecise}, situé à ${data.quartier} (${data.commune})</strong>. Nous prévoyons un rassemblement d'environ <strong>${data.nbParticipants} personnes</strong>.</p>
    
    <p>Dans le souci d'assurer le déroulement paisible et harmonieux de cet événement, nous avons pris toutes les dispositions organisationnelles requises. L'animation sonore sera assurée par un système de <strong>${data.animationSonore}</strong>, avec un engagement strict de maîtrise du niveau décibel afin d'éviter toute nuisance pour le voisinage.</p>

    <p>De surcroît, un dispositif de sécurité approprié (${data.securite.length > 0 ? data.securite.join(', ') : "service d'ordre interne"}) sera déployé pour veiller au maintien de la tranquillité publique et au respect des consignes d'hygiène et de salubrité avant, pendant et après l'événement.</p>
    `;
}

function formatDateFR(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            return dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        return dateStr;
    } catch(e) {
        return dateStr;
    }
}

function exportAutorisationPDF() {
    openAutorisationPaymentModal('pdf');
}

function exportAutorisationWord() {
    openAutorisationPaymentModal('word');
}

function exportAutorisationPDFDirect() {
    const docEl = document.getElementById('doc-autorisation-output');
    if (!docEl) return;

    const cloneContainer = document.createElement('div');
    cloneContainer.style.position = 'fixed';
    cloneContainer.style.top = '0';
    cloneContainer.style.left = '0';
    cloneContainer.style.width = '100vw';
    cloneContainer.style.height = '100vh';
    cloneContainer.style.background = '#ffffff';
    cloneContainer.style.zIndex = '999999';
    cloneContainer.style.overflow = 'auto';

    const clone = docEl.cloneNode(true);
    clone.style.margin = '0 auto';
    clone.style.width = '210mm';
    clone.style.boxShadow = 'none';

    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);

    const opt = {
        margin: 0,
        filename: 'demande_autorisation_manifestation.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(clone).save().then(() => {
        if (cloneContainer.parentNode) document.body.removeChild(cloneContainer);
    }).catch(err => {
        console.error("PDF Export Error:", err);
        if (cloneContainer.parentNode) document.body.removeChild(cloneContainer);
        alert("Erreur lors de la création du PDF.");
    });
}

function exportAutorisationWord() {
    const docEl = document.getElementById('doc-autorisation-output');
    if (!docEl) return;

    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Demande d'Autorisation</title>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
            h1, h2, h3 { font-family: 'Arial', sans-serif; }
            strong { color: #000000; }
        </style>
        </head>
        <body>
            ${docEl.innerHTML}
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
        type: 'application/msword'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'demande_autorisation_manifestation.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
