const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';

let uploadedInvitationLogoDataUrl = '';

document.addEventListener('DOMContentLoaded', () => {
    // Set default date to today
    const dateInput = document.getElementById('inv-date-redaction');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    const dateEventInput = document.getElementById('inv-date');
    if (dateEventInput && !dateEventInput.value) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateEventInput.value = nextWeek.toISOString().split('T')[0];
    }

    // Restore saved logo if available
    const savedLogo = localStorage.getItem('invitation_uploaded_logo');
    if (savedLogo) {
        uploadedInvitationLogoDataUrl = savedLogo;
        const previewContainer = document.getElementById('inv-logo-preview-container');
        const previewImg = document.getElementById('inv-logo-preview');
        if (previewContainer && previewImg) {
            previewImg.src = savedLogo;
            previewContainer.style.display = 'block';
        }
    }

    // Check payment redirect parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isPaymentSuccess = urlParams.get('payment') === 'success' || urlParams.get('payment_success') === 'invitation';
    
    if (isPaymentSuccess) {
        alert("✅ Paiement de 500 FCFA réussi avec SenePay ! Votre Lettre d'Invitation va être téléchargée.");
        window.history.replaceState({}, document.title, window.location.pathname);
        
        const savedDoc = localStorage.getItem('invitation_doc_html');
        if (savedDoc) {
            const docOutput = document.getElementById('doc-invitation-output');
            if (docOutput) docOutput.innerHTML = savedDoc;
            const landingSec = document.getElementById('invitation-landing-section');
            const resSec = document.getElementById('invitation-results-section');
            if (landingSec) landingSec.style.display = 'none';
            if (resSec) resSec.style.display = 'block';
            
            setTimeout(() => {
                exportInvitationPDFDirect();
            }, 600);
        }
    } else {
        setTimeout(() => {
            const modal = document.getElementById('invitation-modal');
            const resSec = document.getElementById('invitation-results-section');
            if (modal && (!resSec || resSec.style.display !== 'block')) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }, 100);
    }
});

window.openInvitationModal = function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const modal = document.getElementById('invitation-modal');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('opacity', '1', 'important');
        modal.style.setProperty('visibility', 'visible', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
        document.body.style.overflow = 'hidden';
    } else {
        window.location.href = 'invitation-generator.html';
    }
};

window.closeInvitationModal = function() {
    const modal = document.getElementById('invitation-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = 'auto';
    }
};

window.openInvitationPaymentModal = function(exportType = 'pdf') {
    window.pendingExportType = exportType;

    // Save live edits before opening payment
    const paper = document.getElementById('doc-invitation-output');
    if (paper) {
        localStorage.setItem('invitation_doc_html', paper.innerHTML);
    }

    const modal = document.getElementById('invitation-payment-modal');
    if (modal) {
        modal.style.setProperty('display', 'flex', 'important');
        modal.style.setProperty('z-index', '999999', 'important');
    }
};

window.closeInvitationPaymentModal = function() {
    const modal = document.getElementById('invitation-payment-modal');
    if (modal) {
        modal.style.setProperty('display', 'none', 'important');
    }
};

function handleInvitationLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
        alert("La taille du logo ne doit pas dépasser 5 Mo.");
        event.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedInvitationLogoDataUrl = e.target.result;
        localStorage.setItem('invitation_uploaded_logo', uploadedInvitationLogoDataUrl);
        const previewContainer = document.getElementById('inv-logo-preview-container');
        const previewImg = document.getElementById('inv-logo-preview');
        if (previewContainer && previewImg) {
            previewImg.src = uploadedInvitationLogoDataUrl;
            previewContainer.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
}

function formatDateFR(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

function getSelectedCheckboxes(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

function formatTitleCase(str) {
    if (!str) return '';
    return str.trim().split(/\s+/).map(word => {
        const lower = word.toLowerCase();
        if (['de', 'du', 'des', 'la', 'le', 'en', 'au', 'aux'].includes(lower)) {
            return lower;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

function fixCommonSpelling(str) {
    if (!str) return '';
    let res = str;
    res = res.replace(/\bcoodonnateur\b/gi, 'Coordonnateur');
    res = res.replace(/\bcordonnateur\b/gi, 'Coordonnateur');
    res = res.replace(/\bcoordonateur\b/gi, 'Coordonnateur');
    res = res.replace(/\bse du cndn\b/gi, 'Secrétaire du CNDN');
    res = res.replace(/\bmarche\b/gi, 'Marché');
    res = res.replace(/\bpastef\b/gi, 'PASTEF');
    return res;
}

function getSenegalPolitesseFormulas(civilite) {
    let appel = civilite;
    let politesse = `Veuillez agréer, ${civilite}, l'assurance de ma très haute considération.`;

    if (civilite.includes('Ministre')) {
        appel = civilite.startsWith('Monsieur') ? 'Monsieur le Ministre' : 'Madame la Ministre';
        politesse = `Veuillez agréer, ${appel}, l'expression de ma très haute considération solennelle.`;
    } else if (civilite.includes('Gouverneur')) {
        appel = 'Monsieur le Gouverneur';
        politesse = `Je vous prie d'agréer, Monsieur le Gouverneur, l'assurance de ma haute considération.`;
    } else if (civilite.includes('Préfet')) {
        appel = civilite.includes('Sous') ? 'Monsieur le Sous-préfet' : 'Monsieur le Préfet';
        politesse = `Je vous prie d'agréer, ${appel}, l'expression de mes sentiments respectueux.`;
    } else if (civilite.includes('Maire')) {
        appel = 'Monsieur le Maire';
        politesse = `Je vous prie d'agréer, Monsieur le Maire, l'assurance de mes sentiments les plus distingués.`;
    } else if (civilite.includes('Directeur')) {
        appel = 'Monsieur le Directeur Général';
        politesse = `Je vous prie d'agréer, Monsieur le Directeur Général, l'assurance de ma considération distinguée.`;
    } else if (civilite.includes('Excellence')) {
        appel = 'Excellence';
        politesse = `Je vous prie d'agréer, Excellence, l'hommage de mon très profond respect.`;
    } else if (civilite.includes('Honorable')) {
        appel = 'Honorable Député';
        politesse = `Je vous prie d'agréer, Honorable Député, l'assurance de ma très haute considération.`;
    }

    return { appel, politesse };
}

async function generateInvitationDocument(event) {
    if (event) event.preventDefault();

    uploadedInvitationLogoDataUrl = uploadedInvitationLogoDataUrl || localStorage.getItem('invitation_uploaded_logo') || '';

    const rawOrgNom = document.getElementById('inv-org-nom')?.value.trim() || 'Organisation';
    const rawOrgAdresse = document.getElementById('inv-org-adresse')?.value.trim() || 'Dakar, Sénégal';
    const orgTel = document.getElementById('inv-org-tel')?.value.trim() || '';

    const civilite = document.getElementById('inv-civilite')?.value || 'Monsieur le Ministre';
    const rawAutoriteNom = document.getElementById('inv-autorite-nom')?.value.trim() || '';
    const rawAutoriteFonction = document.getElementById('inv-autorite-fonction')?.value.trim() || '';
    const rawAutoriteInstitution = document.getElementById('inv-autorite-institution')?.value.trim() || '';
    const rawAutoriteAdresse = document.getElementById('inv-autorite-adresse')?.value.trim() || 'Dakar';

    const rawActiviteTitle = document.getElementById('inv-activite-title')?.value.trim() || 'Événement Officiel';
    const activiteType = document.getElementById('inv-activite-type')?.value || 'Cérémonie';
    const rawObjetCustom = document.getElementById('inv-objet')?.value.trim() || `Invitation officielle à la cérémonie de ${rawActiviteTitle}`;
    const description = document.getElementById('inv-description')?.value.trim() || '';

    const dateEvent = document.getElementById('inv-date')?.value || '';
    const heureEvent = document.getElementById('inv-heure')?.value || '09:00';
    const rawLieuEvent = document.getElementById('inv-lieu')?.value.trim() || 'Dakar';
    const rawAdresseComplete = document.getElementById('inv-adresse-complete')?.value.trim() || '';

    const rolesAttendus = getSelectedCheckboxes('role_attendu');
    const rolePrecision = document.getElementById('inv-role-precision')?.value.trim() || '';

    const rawSignataireNom = document.getElementById('inv-signataire-nom')?.value.trim() || 'Le Signataire';
    const rawSignataireQualite = document.getElementById('inv-signataire-qualite')?.value.trim() || 'Le Coordonnateur';
    const dateRedaction = document.getElementById('inv-date-redaction')?.value || new Date().toISOString().split('T')[0];

    // Clean & Auto-correct Spelling and Capitalization
    const orgNom = fixCommonSpelling(formatTitleCase(rawOrgNom));
    const orgAdresse = fixCommonSpelling(formatTitleCase(rawOrgAdresse));
    const autoriteNom = fixCommonSpelling(formatTitleCase(rawAutoriteNom));
    const autoriteFonction = fixCommonSpelling(formatTitleCase(rawAutoriteFonction));
    const autoriteInstitution = fixCommonSpelling(formatTitleCase(rawAutoriteInstitution));
    const autoriteAdresse = fixCommonSpelling(formatTitleCase(rawAutoriteAdresse));
    const activiteTitle = fixCommonSpelling(formatTitleCase(rawActiviteTitle));
    const objetCustom = fixCommonSpelling(rawObjetCustom);
    const lieuEvent = fixCommonSpelling(formatTitleCase(rawLieuEvent));
    const adresseComplete = fixCommonSpelling(formatTitleCase(rawAdresseComplete));
    const signataireNom = fixCommonSpelling(rawSignataireNom.toUpperCase());
    const signataireQualite = fixCommonSpelling(formatTitleCase(rawSignataireQualite));

    const formattedDateRedaction = formatDateFR(dateRedaction);
    const formattedDateEvent = formatDateFR(dateEvent);

    const { appel, politesse } = getSenegalPolitesseFormulas(civilite);
    const rolesFormattedText = rolesAttendus.length > 0 ? rolesAttendus.join(' et ') : "Invité d'honneur";

    let htmlDoc = '';

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-invitation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                orgNom, orgAdresse, orgTel,
                civilite, autoriteNom, autoriteFonction, autoriteInstitution, autoriteAdresse,
                activiteTitle, activiteType, objetCustom, description,
                dateEvent, heureEvent, lieuEvent, adresseComplete,
                rolesAttendus, rolePrecision,
                signataireNom, signataireQualite, dateRedaction
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data && data.htmlContent) {
                htmlDoc = data.htmlContent;
            }
        }
    } catch (err) {
        console.warn("Supabase Edge Function fallback to local generator:", err);
    }

    if (!htmlDoc) {
        htmlDoc = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; color: #0f172a; line-height: 1.6; padding: 8mm 15mm 10mm 15mm; background: #ffffff; min-height: 297mm; box-sizing: border-box;">
            <!-- En-tête : Logo & Organisation à gauche / Date à droite -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.2rem; border-bottom: 2px solid #1e3a8a; padding-bottom: 0.5rem;">
                <div style="max-width: 58%;">
                    ${uploadedInvitationLogoDataUrl ? `<img src="${uploadedInvitationLogoDataUrl}" style="max-height: 65px; max-width: 150px; object-fit: contain; display: block; margin-bottom: 4px;">` : ''}
                    <div style="font-weight: bold; font-size: 11.5pt; text-transform: uppercase; color: #1e3a8a;">${orgNom}</div>
                    ${orgAdresse ? `<div style="font-size: 9.5pt; color: #334155;">${orgAdresse}</div>` : ''}
                    ${orgTel ? `<div style="font-size: 9.5pt; color: #334155;">Tél : ${orgTel}</div>` : ''}
                </div>
                <div style="text-align: right; font-size: 10.5pt; color: #1e293b; padding-top: 4px;">
                    <strong>Fait à Dakar, le ${formattedDateRedaction}</strong>
                </div>
            </div>

            <!-- Destinataire (Bloc Administrateur) -->
            <div style="margin-left: 45%; margin-bottom: 1.5rem; font-size: 11.5pt; line-height: 1.45;">
                <strong>À ${civilite}${autoriteNom ? ' ' + autoriteNom : ''}</strong><br>
                ${autoriteFonction ? `<span>${autoriteFonction}</span><br>` : ''}
                ${autoriteInstitution ? `<span><strong>${autoriteInstitution}</strong></span><br>` : ''}
                ${autoriteAdresse ? `<span style="font-size: 10.5pt; color: #334155;">${autoriteAdresse}</span>` : ''}
            </div>

            <!-- Objet -->
            <div style="margin-bottom: 1.3rem; font-size: 11.5pt; background: #f8fafc; padding: 0.5rem 0.9rem; border-left: 4px solid #1e3a8a; border-radius: 4px;">
                <strong><u>OBJET :</u> ${objetCustom}</strong>
            </div>

            <!-- Formule d'Appel -->
            <div style="margin-bottom: 1rem; font-weight: bold;">
                ${appel},
            </div>

            <!-- Corps de la lettre -->
            <div style="text-align: justify; text-justify: inter-word; margin-bottom: 1.1rem; text-indent: 1.5rem;">
                C'est avec un immense honneur et un profond respect que nous venons, au nom de la structure <strong>${orgNom}</strong>, solliciter votre très haute bienveillance afin de prendre part au <strong>${activiteTitle}</strong> (${activiteType}).
            </div>

            ${description ? `
            <div style="text-align: justify; text-justify: inter-word; margin-bottom: 1.1rem;">
                ${description}
            </div>
            ` : ''}

            <div style="text-align: justify; text-justify: inter-word; margin-bottom: 1.1rem;">
                Eu égard à votre engagement remarquable et à votre leadership éclairé au service du développement, nous serions particulièrement honorés de vous compter parmi nous en qualité de <strong>${rolesFormattedText}</strong>. ${rolePrecision ? `À ce titre, il vous sera réservé l'opportunité de ${rolePrecision}.` : ''}
            </div>

            <!-- Fiche Synthétique de l'événement -->
            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.75rem 0.9rem; margin: 1.1rem 0; font-size: 10.5pt; font-family: Arial, sans-serif;">
                <div style="font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase;">
                    <i class="fa-solid fa-calendar-check"></i> Informations Pratiques sur la Cérémonie
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <div><strong>• Date :</strong> Le ${formattedDateEvent}</div>
                    <div><strong>• Heure :</strong> À partir de ${heureEvent}</div>
                    <div><strong>• Lieu :</strong> ${lieuEvent}</div>
                    <div><strong>• Adresse :</strong> ${adresseComplete || orgAdresse}</div>
                </div>
            </div>

            <div style="text-align: justify; text-justify: inter-word; margin-bottom: 1.3rem;">
                Convaincus de l'impact majeur de votre présence solennelle sur le succès de cette manifestation, nous restons à votre entière disposition pour tout renseignement complémentaire.
            </div>

            <!-- Formule de politesse -->
            <div style="margin-bottom: 2rem;">
                ${politesse}
            </div>

            <!-- Signature (Sans la mention Pour l'Organisation) -->
            <div style="margin-left: 55%; text-align: center; margin-top: 1rem;">
                <div style="font-style: italic; font-weight: bold; font-size: 11pt; color: #1e293b; margin-bottom: 2.2rem;">${signataireQualite}</div>
                <div style="font-weight: bold; font-size: 11.5pt; text-decoration: underline; text-transform: uppercase; color: #0f172a;">${signataireNom}</div>
            </div>
        </div>
        `;
    }

    localStorage.setItem('invitation_doc_html', htmlDoc);

    const docOutput = document.getElementById('doc-invitation-output');
    if (docOutput) docOutput.innerHTML = htmlDoc;

    closeInvitationModal();

    const landingSec = document.getElementById('invitation-landing-section');
    const resSec = document.getElementById('invitation-results-section');
    if (landingSec) landingSec.style.display = 'none';
    if (resSec) resSec.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function processInvitationPayment() {
    const btn = document.querySelector('#invitation-payment-modal .btn-institutional');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion SenePay...';
    }

    // Preserve live edits in localStorage
    const paper = document.getElementById('doc-invitation-output');
    if (paper) {
        localStorage.setItem('invitation_doc_html', paper.innerHTML);
    }

    try {
        const baseUrl = window.location.href.split('?')[0].split('#')[0];
        const response = await fetch(`${SUPABASE_URL}/functions/v1/init-senepay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                amount: 500,
                orderPrefix: "INVITATION-",
                description: "Lettre d'Invitation Officielle (PDF)",
                returnUrl: `${baseUrl}?payment=success`,
                cancelUrl: `${baseUrl}?payment=cancel`
            })
        });

        const data = await response.json();
        const checkoutUrl = data.checkoutUrl || data.url || (data.data && data.data.url);

        if (checkoutUrl) {
            window.location.href = checkoutUrl;
        } else {
            console.warn("SenePay API error or offline fallback:", data);
            alert("⚠️ Note : La passerelle SenePay est temporairement indisponible. Téléchargement direct débloqué.");
            closeInvitationPaymentModal();
            exportInvitationPDFDirect();
        }
    } catch (err) {
        console.error("SenePay Error:", err);
        alert("⚠️ Connexion au serveur de paiement impossible. Téléchargement direct débloqué.");
        closeInvitationPaymentModal();
        exportInvitationPDFDirect();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function exportInvitationPDFDirect() {
    const originalPaper = document.getElementById('doc-invitation-output');
    if (!originalPaper || !originalPaper.innerHTML.trim()) {
        alert("Aucun document à exporter.");
        return;
    }

    // Save live edits
    localStorage.setItem('invitation_doc_html', originalPaper.innerHTML);

    // Create a temporary hidden container with fixed 794px width (A4)
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '794px';
    tempContainer.style.background = '#ffffff';

    // Clone the inner document
    const clone = originalPaper.cloneNode(true);
    clone.style.width = '794px';
    clone.style.minWidth = '794px';
    clone.style.maxWidth = '794px';
    clone.style.minHeight = '1122px';
    clone.style.maxHeight = '1122px';
    clone.style.overflow = 'hidden';
    clone.style.padding = '8mm 15mm 10mm 15mm';
    clone.style.margin = '0';
    clone.style.transform = 'none';
    clone.style.boxSizing = 'border-box';
    clone.style.background = '#ffffff';
    clone.style.color = '#0f172a';
    clone.removeAttribute('contenteditable');

    tempContainer.appendChild(clone);
    document.body.appendChild(tempContainer);

    const opt = {
        margin: 0,
        filename: 'Lettre_d_Invitation_Officielle.pdf',
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false, 
            backgroundColor: '#ffffff',
            width: 794,
            windowWidth: 794
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(clone).save();
    } catch (err) {
        console.error("PDF export error:", err);
        alert("Erreur lors du téléchargement du PDF. Veuillez réessayer.");
    } finally {
        document.body.removeChild(tempContainer);
    }
}

window.exportInvitationPDFDirect = exportInvitationPDFDirect;
window.processInvitationPayment = processInvitationPayment;
window.generateInvitationDocument = generateInvitationDocument;
window.handleInvitationLogoUpload = handleInvitationLogoUpload;
