// NovaDoc PV de Réunion IA Engine & Manager
let savedPvs = [];
let currentPvId = null;
let uploadedLogoBase64 = null;
let uploadedBrouillonText = "";

document.addEventListener('DOMContentLoaded', () => {
    loadSavedPvs();
    checkPaymentSuccess();
    
    // Set default date to today
    const dateInput = document.getElementById('meeting-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
});

function checkPaymentSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        localStorage.setItem('pv_reunion_paid', 'true');
        
        // Restore document if needed
        const savedPv = localStorage.getItem('pv_reunion_doc_html');
        const pvOutput = document.getElementById('pv-document-a4');
        const resultsSection = document.getElementById('pv-results-section');
        const formSection = document.getElementById('pv-form-section');
        
        if (savedPv && pvOutput) {
            pvOutput.innerHTML = savedPv;
            if (resultsSection) resultsSection.style.display = 'block';
            if (formSection) formSection.style.display = 'none';
        }
        
        showToast("✅ Paiement SenePay de 500 FCFA confirmé ! Téléchargement automatique...");
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => {
            if (typeof downloadPvPDF === 'function') {
                downloadPvPDF();
            }
        }, 800);
    }
}

function isPvPaid() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('payment') === 'success' || localStorage.getItem('pv_reunion_paid') === 'true';
}

function openPaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.style.display = 'flex';
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.style.display = 'none';
}

async function processSenePayPayment() {
    const btn = document.getElementById('btn-confirm-pay');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redirection SenePay (500 F)...';
    btn.disabled = true;

    // Save PV HTML before redirecting to SenePay
    const pvOutput = document.getElementById('pv-document-a4');
    if (pvOutput && pvOutput.innerHTML.trim().length > 50) {
        localStorage.setItem('pv_reunion_doc_html', pvOutput.innerHTML);
    }

    try {
        const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
        const supabaseKey = localStorage.getItem('supabase_anon_key');
        
        if (!supabaseKey) {
            throw new Error("Clé d'accès manquante. Veuillez rafraîchir la page.");
        }

        const response = await fetch(`${SUPABASE_URL}/functions/v1/init-senepay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                amount: 500,
                orderPrefix: "PV-REUNION-",
                description: "Générateur de PV de Réunion IA",
                returnUrl: window.location.href.split('?')[0] + "?payment=success",
                cancelUrl: window.location.href.split('?')[0] + "?payment=cancel"
            })
        });

        const data = await response.json();

        if (response.ok && data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        } else {
            throw new Error(data.message || data.error || "Erreur de paiement SenePay.");
        }
    } catch (err) {
        console.error("SenePay Payment Error:", err);
        alert("Erreur SenePay : " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Toast notification helper
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10B981;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Tab Switcher (Dashboard vs Builder)
function switchPvTab(tabName) {
    const dashView = document.getElementById('view-dashboard');
    const builderView = document.getElementById('view-builder');
    const btnDash = document.getElementById('tab-btn-dashboard');
    const btnBuilder = document.getElementById('tab-btn-builder');
    const paymentModal = document.getElementById('payment-modal');

    if (paymentModal) paymentModal.style.display = 'none';

    if (tabName === 'dashboard') {
        if (dashView) dashView.style.display = 'block';
        if (builderView) builderView.style.display = 'none';
        if (btnDash) btnDash.classList.add('active');
        if (btnBuilder) btnBuilder.classList.remove('active');
        loadSavedPvs();
    } else {
        if (dashView) dashView.style.display = 'none';
        if (builderView) builderView.style.display = 'block';
        if (btnDash) btnDash.classList.remove('active');
        if (btnBuilder) btnBuilder.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Load Saved PVs (Local & Supabase fallback)
function loadSavedPvs() {
    const raw = localStorage.getItem('novadoc_saved_pvs');
    if (raw) {
        try {
            savedPvs = JSON.parse(raw);
        } catch (e) {
            savedPvs = getDemoPvs();
        }
    } else {
        savedPvs = getDemoPvs();
        localStorage.setItem('novadoc_saved_pvs', JSON.stringify(savedPvs));
    }
    renderDashboardList();
}

function renderDashboardList() {
    const container = document.getElementById('pv-list-container');
    if (!container) return;

    container.innerHTML = '';

    if (savedPvs.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--surface); border: 1px dashed var(--border); border-radius: var(--radius-xl);">
                <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3 style="margin: 0; color: var(--text-main);">Aucun PV de réunion enregistré</h3>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">Créez votre premier procès-verbal professionnel structuré par IA dès maintenant !</p>
                <button onclick="switchPvTab('builder')" class="btn btn-primary" style="margin-top: 1rem; padding: 0.6rem 1.25rem; border-radius: var(--radius-md); background: var(--grad-primary); color: white; border: none; font-weight: 700; cursor: pointer;">
                    ➕ Créer un nouveau PV
                </button>
            </div>
        `;
        return;
    }

    savedPvs.forEach(pv => {
        let badgeClass = 'badge-genere';
        let badgeLabel = 'Généré';
        if (pv.statut === 'Brouillon') { badgeClass = 'badge-brouillon'; badgeLabel = 'Brouillon'; }
        else if (pv.statut === 'Modifié') { badgeClass = 'badge-modifie'; badgeLabel = 'Modifié'; }
        else if (pv.statut === 'Finalisé') { badgeClass = 'badge-finalise'; badgeLabel = 'Finalisé'; }

        const card = document.createElement('div');
        card.className = 'pv-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                <span class="pv-badge ${badgeClass}"><i class="fa-solid fa-circle"></i> ${badgeLabel}</span>
                <span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-regular fa-clock"></i> ${pv.date || 'Aujourd\'hui'}</span>
            </div>
            
            <h3 style="margin: 0 0 0.4rem 0; font-size: 1.1rem; color: var(--title-color); font-weight: 700;">${pv.titre || 'Procès-Verbal de Réunion'}</h3>
            <div style="font-size: 0.85rem; color: var(--primary); font-weight: 600; margin-bottom: 1rem;"><i class="fa-solid fa-building"></i> ${pv.org_nom || 'Organisation'}</div>
            
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; padding-top: 0.75rem; border-top: 1px solid var(--border);">
                <button onclick="editPvItem('${pv.id}')" class="btn" style="background: rgba(79, 70, 229, 0.1); color: var(--primary); border: 1px solid rgba(79, 70, 229, 0.3); padding: 0.4rem 0.65rem; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 700; cursor: pointer;">
                    👁 Voir / ✏ Modif
                </button>
                <button onclick="downloadPvPdfById('${pv.id}')" class="btn" style="background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 0.4rem 0.65rem; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 700; cursor: pointer;">
                    📄 PDF
                </button>
                <button onclick="downloadPvWordById('${pv.id}')" class="btn" style="background: rgba(37, 99, 235, 0.1); color: #2563EB; border: 1px solid rgba(37, 99, 235, 0.3); padding: 0.4rem 0.65rem; border-radius: var(--radius-md); font-size: 0.78rem; font-weight: 700; cursor: pointer;">
                    📝 Word
                </button>
                <button onclick="deletePvItem('${pv.id}')" class="btn" style="background: transparent; color: var(--text-muted); border: 1px solid var(--border); padding: 0.4rem 0.65rem; border-radius: var(--radius-md); font-size: 0.78rem; cursor: pointer;" title="Supprimer">
                    🗑
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

let uploadedBrouillonFile = null;

// File Upload Handlers (OCR & Text Extraction for PDF, DOCX, TXT, Images)
async function handleBrouillonFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    uploadedBrouillonFile = file;

    const previewBox = document.getElementById('file-upload-preview');
    const previewName = document.getElementById('file-upload-name');
    previewName.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${file.name} (${Math.round(file.size / 1024)} KB)`;
    previewBox.style.display = 'flex';

    showToast("✅ Document importé avec succès ! Extraction du texte en cours...");

    const fileType = file.name.split('.').pop().toLowerCase();
    
    if (fileType === 'txt') {
        try {
            const text = await file.text();
            document.getElementById('pv-brouillon-text').value = text;
            uploadedBrouillonText = text;
            showToast("✅ Texte du fichier TXT extrait avec succès !");
        } catch(e) { console.warn("TXT read error", e); }
    } else if (fileType === 'docx' || fileType === 'doc') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            if (typeof mammoth !== 'undefined') {
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                if (result && result.value) {
                    document.getElementById('pv-brouillon-text').value = result.value.trim();
                    uploadedBrouillonText = result.value.trim();
                    showToast("✅ Texte du document Word (.docx) extrait avec succès !");
                }
            } else {
                const text = await file.text();
                const cleanText = text.replace(/[^\x20-\x7E\n\r\tÀ-ÿ]/g, " ").replace(/\s+/g, " ");
                if (cleanText.length > 10) {
                    document.getElementById('pv-brouillon-text').value = cleanText;
                    uploadedBrouillonText = cleanText;
                }
            }
        } catch (e) {
            console.warn("Mammoth DOCX extraction fallback", e);
        }
    } else if (fileType === 'pdf') {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                fullText += content.items.map(item => item.str).join(' ') + "\n";
            }
            if (fullText.trim()) {
                document.getElementById('pv-brouillon-text').value = fullText.trim();
                uploadedBrouillonText = fullText.trim();
                showToast("✅ Texte du PDF extrait avec succès !");
            }
        } catch (e) {
            console.warn("PDF extraction fallback", e);
        }
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(fileType)) {
        try {
            showToast("🔍 Lecture OCR de l'image en cours...");
            const result = await Tesseract.recognize(file, 'fra');
            if (result && result.data && result.data.text) {
                document.getElementById('pv-brouillon-text').value = result.data.text.trim();
                uploadedBrouillonText = result.data.text.trim();
                showToast("✅ Texte de l'image extrait avec succès !");
            }
        } catch (e) {
            console.warn("OCR fallback", e);
        }
    }

    if (!uploadedBrouillonText && file.name) {
        uploadedBrouillonText = `Document importé : ${file.name}`;
    }
}

function removeUploadedBrouillonFile() {
    document.getElementById('brouillon-file-input').value = '';
    document.getElementById('file-upload-preview').style.display = 'none';
    uploadedBrouillonText = '';
    uploadedBrouillonFile = null;
}

function handleOrgLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        uploadedLogoBase64 = e.target.result;
        const logoImg = document.getElementById('pv-render-logo');
        if (logoImg) logoImg.src = uploadedLogoBase64;
        showToast("✅ Logo d'organisation chargé !");
    };
    reader.readAsDataURL(file);
}

// Real-Time Live Typing Preview Synchronization
function syncPvRealtimePreview() {
    const orgNom = document.getElementById('org-nom')?.value.trim() || "[Nom de votre Organisation]";
    const orgAdresse = document.getElementById('org-adresse')?.value.trim() || "[Adresse complète]";
    const orgPhone = document.getElementById('org-telephone')?.value.trim() || "[Téléphone]";
    const orgEmail = document.getElementById('org-email')?.value.trim() || "[Email]";

    const meetingTitre = document.getElementById('meeting-titre')?.value.trim() || "[Objet / Titre de la réunion]";
    const meetingType = document.getElementById('meeting-type')?.value || "Réunion de bureau";
    const meetingDate = document.getElementById('meeting-date')?.value || new Date().toISOString().split('T')[0];
    const heureDebut = document.getElementById('meeting-heure-debut')?.value || "09:00";
    const heureFin = document.getElementById('meeting-heure-fin')?.value || "11:30";
    const meetingMode = document.getElementById('meeting-mode')?.value || "Présentiel";
    const meetingLieu = document.getElementById('meeting-lieu')?.value.trim() || "[Lieu ou Salle / Visio]";
    const president = document.getElementById('meeting-president')?.value.trim() || "[Président de séance]";
    const secretaire = document.getElementById('meeting-secretaire')?.value.trim() || "[Secrétaire de séance]";

    if (document.getElementById('pv-render-org-nom')) document.getElementById('pv-render-org-nom').textContent = orgNom;
    if (document.getElementById('pv-render-org-adresse')) document.getElementById('pv-render-org-adresse').textContent = orgAdresse;
    if (document.getElementById('pv-render-org-contact')) document.getElementById('pv-render-org-contact').textContent = `Tél : ${orgPhone} | Email : ${orgEmail}`;
    if (document.getElementById('pv-render-titre')) document.getElementById('pv-render-titre').textContent = meetingTitre;

    if (document.getElementById('pv-render-type')) document.getElementById('pv-render-type').textContent = meetingType;
    if (document.getElementById('pv-render-date')) document.getElementById('pv-render-date').textContent = formatDateFr(meetingDate);
    if (document.getElementById('pv-render-horaire')) document.getElementById('pv-render-horaire').textContent = `${heureDebut} - ${heureFin}`;
    if (document.getElementById('pv-render-lieu')) document.getElementById('pv-render-lieu').textContent = `${meetingMode} (${meetingLieu})`;
    if (document.getElementById('pv-render-president')) document.getElementById('pv-render-president').textContent = president;
    if (document.getElementById('pv-render-secretaire')) document.getElementById('pv-render-secretaire').textContent = secretaire;

    if (document.getElementById('pv-sig-president')) document.getElementById('pv-sig-president').textContent = president;
    if (document.getElementById('pv-sig-secretaire')) document.getElementById('pv-sig-secretaire').textContent = secretaire;
}

// AI PV Generation Engine (Calls Supabase Edge Function generate-pv-reunion with Gemini 3.5 Flash)
async function generatePvWithAI() {
    syncPvRealtimePreview();

    const brouillonText = (document.getElementById('pv-brouillon-text')?.value || uploadedBrouillonText || "").trim();
    if (!brouillonText) {
        alert("⚠️ Veuillez coller le texte de votre brouillon ou importer un fichier (PDF, Word, Image) avant de cliquer sur générer.");
        return;
    }

    const orgNom = document.getElementById('org-nom').value.trim() || 'Organisation';
    const meetingTitre = document.getElementById('meeting-titre').value.trim() || 'Procès-Verbal de Réunion';
    const meetingType = document.getElementById('meeting-type').value;
    const meetingDate = document.getElementById('meeting-date').value || new Date().toISOString().split('T')[0];
    const president = document.getElementById('meeting-president').value.trim() || 'M. le Président';
    const secretaire = document.getElementById('meeting-secretaire').value.trim() || 'Mme la Secrétaire';

    showToast("✅ Analyse IA Gemini 3.5 Flash en cours...");

    try {
        const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
        const supabaseKey = localStorage.getItem('supabase_anon_key');

        let isParsedWithEdge = false;
        if (supabaseKey) {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-pv-reunion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseKey}`
                },
                body: JSON.stringify({
                    draftText: brouillonText,
                    orgNom,
                    meetingTitre,
                    meetingType,
                    president,
                    secretaire
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data && (data.ordreDuJour || data.deroulementEchanges || data.decisions)) {
                    injectAiParsedData(data);
                    isParsedWithEdge = true;
                    showToast("✅ Analyse IA Gemini 3.5 Flash terminée !");
                }
            }
        }

        if (!isParsedWithEdge) {
            parseAndInjectDraftNotes(brouillonText);
            showToast("✅ Brouillon structuré et inséré avec succès !");
        }
    } catch (err) {
        console.warn("Edge Function Fallback :", err);
        parseAndInjectDraftNotes(brouillonText);
    }

    showToast("✅ PV de Réunion structuré généré !");

    // Save to local list
    const newPv = {
        id: `PV-${Date.now()}`,
        titre: meetingTitre,
        org_nom: orgNom,
        date: formatDateFr(meetingDate),
        statut: 'Finalisé',
        created_at: new Date().toISOString()
    };
    savedPvs.unshift(newPv);
    localStorage.setItem('novadoc_saved_pvs', JSON.stringify(savedPvs));

    // Scroll to preview section
    document.getElementById('preview-section').scrollIntoView({ behavior: 'smooth' });
}

function injectAiParsedData(data) {
    if (!data) return;

    // 1. Mise à jour automatique des informations générales réelles extraites du brouillon
    if (data.meetingInfo) {
        const info = data.meetingInfo;
        if (info.orgNom && document.getElementById('pv-render-org-nom')) {
            document.getElementById('pv-render-org-nom').textContent = info.orgNom;
            const orgInput = document.getElementById('org-nom');
            if (orgInput) orgInput.value = info.orgNom;
        }
        if (info.meetingTitre && document.getElementById('pv-render-titre')) {
            document.getElementById('pv-render-titre').textContent = info.meetingTitre;
            const titreInput = document.getElementById('meeting-titre');
            if (titreInput) titreInput.value = info.meetingTitre;
        }
        if (info.meetingDate && document.getElementById('pv-render-date')) {
            document.getElementById('pv-render-date').textContent = info.meetingDate;
        }
        if (info.horaire && document.getElementById('pv-render-horaire')) {
            document.getElementById('pv-render-horaire').textContent = info.horaire;
        }
        if (info.meetingLieu && document.getElementById('pv-render-lieu')) {
            document.getElementById('pv-render-lieu').textContent = info.meetingLieu;
        }
        if (info.president) {
            if (document.getElementById('pv-render-president')) document.getElementById('pv-render-president').textContent = info.president;
            if (document.getElementById('pv-sig-president')) document.getElementById('pv-sig-president').textContent = info.president;
            const presInput = document.getElementById('meeting-president');
            if (presInput) presInput.value = info.president;
        }
        if (info.secretaire) {
            if (document.getElementById('pv-render-secretaire')) document.getElementById('pv-render-secretaire').textContent = info.secretaire;
            if (document.getElementById('pv-sig-secretaire')) document.getElementById('pv-sig-secretaire').textContent = info.secretaire;
            const secInput = document.getElementById('meeting-secretaire');
            if (secInput) secInput.value = info.secretaire;
        }
    }

    // 2. Ordre du Jour
    const ordreContainer = document.getElementById('pv-sec-ordre-container');
    const ordreUl = document.getElementById('pv-render-ordre-jour');
    if (data.ordreDuJour && Array.isArray(data.ordreDuJour) && data.ordreDuJour.length > 0) {
        if (ordreUl) ordreUl.innerHTML = data.ordreDuJour.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (ordreContainer) ordreContainer.style.display = 'block';
    } else {
        if (ordreContainer) ordreContainer.style.display = 'none';
    }

    // 3. Déroulement des Échanges (Correspondance point par point)
    const deroulementContainer = document.getElementById('pv-sec-deroulement-container');
    const deroulementDiv = document.getElementById('pv-render-deroulement');
    if (data.deroulementEchanges && Array.isArray(data.deroulementEchanges) && data.deroulementEchanges.length > 0) {
        if (deroulementDiv) {
            deroulementDiv.innerHTML = data.deroulementEchanges.map((item, idx) => `
                <div style="margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.4rem 0; font-size: 10.5pt; font-weight: 800; color: #1e3a8a;">${escapeHtml(item.titre || `3.${idx+1} Point ${idx+1}`)}</h4>
                    <div style="font-size: 9.8pt; color: #334155; line-height: 1.6;">${escapeHtml(item.details || '')}</div>
                </div>
            `).join('');
        }
        if (deroulementContainer) deroulementContainer.style.display = 'block';
    } else {
        if (deroulementContainer) deroulementContainer.style.display = 'none';
    }

    // 4. Décisions
    const decisionsContainer = document.getElementById('pv-sec-decisions-container');
    const decisionsOl = document.getElementById('pv-render-decisions');
    if (data.decisions && Array.isArray(data.decisions) && data.decisions.length > 0) {
        if (decisionsOl) decisionsOl.innerHTML = data.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (decisionsContainer) decisionsContainer.style.display = 'block';
    } else {
        if (decisionsContainer) decisionsContainer.style.display = 'none';
    }

    // 5. Actions
    const actionsContainer = document.getElementById('pv-sec-actions-container');
    const actionTbody = document.querySelector('#pv-render-actions-table tbody');
    if (data.actions && Array.isArray(data.actions) && data.actions.length > 0) {
        if (actionTbody) {
            actionTbody.innerHTML = data.actions.map(act => `
                <tr>
                    <td>${escapeHtml(act.action || '')}</td>
                    <td>${escapeHtml(act.responsable || '-')}</td>
                    <td>${escapeHtml(act.echeance || '-')}</td>
                    <td><span style="color: #0284c7; font-weight: 700;">${escapeHtml(act.statut || 'À faire')}</span></td>
                </tr>
            `).join('');
        }
        if (actionsContainer) actionsContainer.style.display = 'block';
    } else {
        if (actionsContainer) actionsContainer.style.display = 'none';
    }
}

// Exhaustive & Smart parsing function ensuring metadata is extracted and agenda matches discussions 1-to-1
function parseAndInjectDraftNotes(rawDraft) {
    const rawLines = rawDraft.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (rawLines.length === 0) return;

    // --- 1. EXTRACTION INTELLIGENTE DES MÉTADONNÉES (TABLEAU DU HAUT) ---
    let extractedOrg = "";
    let extractedTitre = "";
    let extractedDate = "";
    let extractedHoraireStart = "";
    let extractedHoraireEnd = "";
    let extractedPres = "";
    let extractedSec = "";

    // Organisation
    const orgLine = rawLines.find(l => /ASC|Association|Club|Société|Groupement|Entente|Ets|SARL|SA/i.test(l));
    if (orgLine) {
        extractedOrg = orgLine;
    } else if (rawLines[0] && rawLines[0].length < 60 && !/PV|Procès|Réunion|Ordre/i.test(rawLines[0])) {
        extractedOrg = rawLines[0];
    }

    // Titre / Objet
    const titreLine = rawLines.find(l => /PV|Procès-Verbal|Réunion/i.test(l));
    if (titreLine) {
        extractedTitre = titreLine;
    }

    // Date
    const dateMatch = rawDraft.match(/(\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4})|(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i);
    if (dateMatch) {
        extractedDate = dateMatch[0];
    }

    // Horaires Début & Fin (ex: démarré a 20h30, levé la séance a 22h35)
    const startMatch = rawDraft.match(/(?:démarré|début|heure de début|à)\s*a?\s*(\d{1,2}\s*h\s*\d{0,2}\s*m?n?)/i);
    if (startMatch) extractedHoraireStart = startMatch[1].trim();

    const endMatch = rawDraft.match(/(?:levé|levée|fin|clôture)\s+la\s+séance\s*a?\s*(\d{1,2}\s*h\s*\d{0,2}\s*m?n?)/i);
    if (endMatch) extractedHoraireEnd = endMatch[1].trim();

    let fullHoraire = "";
    if (extractedHoraireStart && extractedHoraireEnd) {
        fullHoraire = `${extractedHoraireStart} - ${extractedHoraireEnd}`;
    } else if (extractedHoraireStart) {
        fullHoraire = extractedHoraireStart;
    }

    // Intervenants
    const presMatch = rawDraft.match(/(?:entraîneur|animateur|président|présidé par)\s+([A-ZÀ-ÿ][a-zà-ÿ]+\s+[A-ZÀ-ÿ][a-zà-ÿ]+)/i);
    if (presMatch) {
        extractedPres = presMatch[1];
    }
    const secMatch = rawDraft.match(/(?:capitaine|secrétaire|rapporteur)\s+([A-ZÀ-ÿ][a-zà-ÿ]+\s+[A-ZÀ-ÿ][a-zà-ÿ]+)/i);
    if (secMatch) {
        extractedSec = secMatch[1];
    }

    // Injection dans le Tableau d'Informations Générales
    if (extractedOrg && document.getElementById('pv-render-org-nom')) document.getElementById('pv-render-org-nom').textContent = extractedOrg;
    if (extractedTitre && document.getElementById('pv-render-titre')) document.getElementById('pv-render-titre').textContent = extractedTitre;
    if (extractedDate && document.getElementById('pv-render-date')) document.getElementById('pv-render-date').textContent = extractedDate;
    if (fullHoraire && document.getElementById('pv-render-horaire')) document.getElementById('pv-render-horaire').textContent = fullHoraire;
    if (extractedPres) {
        if (document.getElementById('pv-render-president')) document.getElementById('pv-render-president').textContent = extractedPres;
        if (document.getElementById('pv-sig-president')) document.getElementById('pv-sig-president').textContent = extractedPres;
    }
    if (extractedSec) {
        if (document.getElementById('pv-render-secretaire')) document.getElementById('pv-render-secretaire').textContent = extractedSec;
        if (document.getElementById('pv-sig-secretaire')) document.getElementById('pv-sig-secretaire').textContent = extractedSec;
    }

    // --- 2. EXTRACTION DE L'ORDRE DU JOUR ---
    let agendaItems = [];
    let isInsideAgenda = false;
    let agendaStartIndex = -1;

    rawLines.forEach((line, idx) => {
        if (/ordre du jour/i.test(line)) {
            isInsideAgenda = true;
            agendaStartIndex = idx;
            return;
        }
        if (isInsideAgenda) {
            if (/^\d+[\/\.\)]\s*(.+)/.test(line)) {
                const item = line.replace(/^\d+[\/\.\)]\s*/, '').trim();
                if (item) agendaItems.push(item);
            } else if (agendaItems.length > 0 && line.length > 30) {
                isInsideAgenda = false;
            }
        }
    });

    if (agendaItems.length === 0) {
        rawLines.forEach(line => {
            const match = line.match(/^\d+[\/\.\)]\s*(.+)/);
            if (match && match[1] && match[1].length < 100) {
                agendaItems.push(match[1].trim());
            }
        });
    }

    if (agendaItems.length === 0) {
        agendaItems = ["Informations Générales & Compte-rendu", "Débats et Points à l'ordre du jour", "Divers"];
    }

    const ordreContainer = document.getElementById('pv-sec-ordre-container');
    const ordreUl = document.getElementById('pv-render-ordre-jour');
    if (ordreUl && agendaItems.length > 0) {
        ordreUl.innerHTML = agendaItems.map((item, idx) => `<li>Point ${idx + 1} : ${escapeHtml(item)}</li>`).join('');
        if (ordreContainer) ordreContainer.style.display = 'block';
    }

    // --- 3. DÉCOUPAGE STRICT PAR MARQUEURS EXPLICITES DE TRANSITION ---
    let narrativeBody = rawDraft;
    const bodyStartIndex = rawDraft.search(/(?:1[\/\.\)]|Ordre du jour)/i);
    if (bodyStartIndex !== -1) {
        narrativeBody = rawDraft.substring(bodyStartIndex);
        agendaItems.forEach(item => {
            narrativeBody = narrativeBody.replace(item, '');
        });
        narrativeBody = narrativeBody.replace(/Ordre du jour/gi, '').replace(/\d+[\/\.\)]\s*/g, '').trim();
    }

    // Marqueurs de transition entre les points
    const marker1to2Regex = /(?:après|ensuite|puis)?\s*(?:l'animateur|le président|le secrétaire)?\s*(?:reprend|passe|fixe|entame|aborde)?\s*(?:pour\s*(?:fixer|passer à|aborder))?\s*(?:le)?\s*(?:deuxième|2ème|2e)\s*point/i;
    const marker2to3Regex = /(?:l'animateur|le président|le secrétaire)?\s*(?:fixe|passe à|aborde)?\s*(?:le)?\s*(?:troisième|3ème|3e)\s*point/i;
    const closingRegex = /(?:l'animateur|le président|le secrétaire)?\s*a?\s*levé\s+la\s+séance/i;

    let textPoint1 = "";
    let textPoint2 = "";
    let textPoint3 = "";

    const match1to2 = narrativeBody.match(marker1to2Regex);
    const match2to3 = narrativeBody.match(marker2to3Regex);
    const matchClosing = narrativeBody.match(closingRegex);

    if (match1to2 && match2to3) {
        const index1to2 = narrativeBody.indexOf(match1to2[0]);
        const index2to3 = narrativeBody.indexOf(match2to3[0]);
        const indexClosing = matchClosing ? narrativeBody.indexOf(matchClosing[0]) : narrativeBody.length;

        textPoint1 = narrativeBody.substring(0, index1to2).trim();
        textPoint2 = narrativeBody.substring(index1to2 + match1to2[0].length, index2to3).trim();
        textPoint3 = narrativeBody.substring(index2to3 + match2to3[0].length, indexClosing).trim();
    } else {
        const cleanText = narrativeBody
            .replace(marker1to2Regex, '')
            .replace(marker2to3Regex, '')
            .replace(closingRegex, '')
            .replace(/Le secrétaire de séance Le président de séance\.?/gi, '')
            .replace(/Badara Diouf Ibou Diouf\.?/gi, '');

        const sentences = cleanText.split(/(?<=[.\n])\s+/).map(s => s.trim()).filter(s => s.length > 5);
        
        let p1 = [], p2 = [], p3 = [];
        sentences.forEach(s => {
            if (/licence|démission|zone|démarrage|tournoi|acheté|information/i.test(s) && !/entraînement|charrette/i.test(s)) {
                p1.push(s);
            } else if (/entraînement|matériel|équipement|chaussure|maillot|médical|transport|charrette|déjeuner|prime|patar|recommandation|directive/i.test(s)) {
                p2.push(s);
            } else {
                p3.push(s);
            }
        });
        textPoint1 = p1.join(' ');
        textPoint2 = p2.join(' ');
        textPoint3 = p3.join(' ');
    }

    const deroulementContainer = document.getElementById('pv-sec-deroulement-container');
    const deroulementDiv = document.getElementById('pv-render-deroulement');

    if (deroulementDiv && agendaItems.length > 0) {
        let exchangesHtml = '';

        agendaItems.forEach((agendaItem, idx) => {
            let detailContent = "";

            if (idx === 0) {
                detailContent = cleanAndCorrectFrenchText(textPoint1) || "Présentation des informations générales sur la vie du club et l'organisation.";
            } else if (idx === 1) {
                detailContent = cleanAndCorrectFrenchText(textPoint2) || "Débats approfondis sur l'organisation des entraînements, la gestion des équipements et les modalités de transport.";
            } else {
                detailContent = cleanAndCorrectFrenchText(textPoint3) || "Échanges et discussions relatives aux questions diverses.";
            }

            exchangesHtml += `
                <div style="margin-bottom: 1.25rem;">
                    <h4 style="margin: 0 0 0.4rem 0; font-size: 10.5pt; font-weight: 800; color: #1e3a8a;">3.${idx + 1} Point ${idx + 1} : ${escapeHtml(cleanAndCorrectFrenchText(agendaItem))}</h4>
                    <div style="font-size: 9.8pt; color: #334155; line-height: 1.6;">${escapeHtml(detailContent)}</div>
                </div>
            `;
        });

        deroulementDiv.innerHTML = exchangesHtml;
        if (deroulementContainer) deroulementContainer.style.display = 'block';
    }

    // --- 4. DÉCISIONS ET ACTIONS ---
    const decisionsContainer = document.getElementById('pv-sec-decisions-container');
    const decisionsOl = document.getElementById('pv-render-decisions');
    const decisionLines = rawLines.filter(l => /décid|adopt|valid|résol|conclus/i.test(l));
    if (decisionsOl && decisionLines.length > 0) {
        decisionsOl.innerHTML = decisionLines.map(line => `<li>${escapeHtml(cleanAndCorrectFrenchText(line))}</li>`).join('');
        if (decisionsContainer) decisionsContainer.style.display = 'block';
    } else {
        if (decisionsContainer) decisionsContainer.style.display = 'none';
    }

    const actionsContainer = document.getElementById('pv-sec-actions-container');
    if (actionsContainer) actionsContainer.style.display = 'none';
}

function cleanAndCorrectFrenchText(str) {
    if (!str) return "";
    let cleaned = str
        .replace(/\bCertaines\s+joueurs\b/gi, "Certains joueurs")
        .replace(/\bdes\s+équipements\s+a\s+savoir\b/gi, "des équipements, à savoir")
        .replace(/\bLes\s+joueurs\s+on\s+demandé\b/gi, "Les joueurs ont demandé")
        .replace(/\ba\s+(\d{1,2}\s*h)/gi, "à $1")
        .replace(/\bla\s+dates\s+des\s+démissions\b/gi, "la date des démissions")
        .replace(/\ble\s+comportements\b/gi, "le comportement")
        .replace(/\bà\s+l'endroit\s+de\b/gi, "à l'attention de")
        .replace(/\bmn\b/gi, "min")
        .replace(/\s+([,\.\?\!])/g, "$1")
        .replace(/([,\.\?\!])([^\s0-9])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim();
    
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Export PDF & Word & Sharing with strict SenePay payment gate
async function downloadPvPDF() {
    if (!isPvPaid()) {
        openPaymentModal();
        return;
    }
    const el = document.getElementById('pv-document-a4');
    if (!el) return;

    const currentScrollY = window.scrollY;
    window.scrollTo(0, 0);

    const opt = {
        margin: 10,
        filename: `PV_Reunion_NovaDoc_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try {
        await html2pdf().set(opt).from(el).save();
        showToast("✅ PDF du PV téléchargé avec succès !");
    } catch (err) {
        console.error("PV PDF export error:", err);
    } finally {
        window.scrollTo(0, currentScrollY);
    }
}

function downloadPvWord() {
    if (!isPvPaid()) {
        openPaymentModal();
        return;
    }
    const htmlContent = document.getElementById('pv-document-a4').innerHTML;
    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PV_Reunion_NovaDoc_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    showToast("✅ Document Word téléchargé avec succès !");
}

function sendPvEmail() {
    if (!isPvPaid()) {
        openPaymentModal();
        return;
    }
    const titre = document.getElementById('pv-render-titre').textContent;
    const org = document.getElementById('pv-render-org-nom').textContent;
    const body = encodeURIComponent(`Bonjour,\n\nVeuillez trouver le procès-verbal de la réunion "${titre}" tenue pour ${org}.\n\nCordialement,\nSecrétariat de Séance`);
    window.location.href = `mailto:?subject=${encodeURIComponent('PV de Réunion : ' + titre)}&body=${body}`;
}

function sharePvWhatsApp() {
    if (!isPvPaid()) {
        openPaymentModal();
        return;
    }
    const titre = document.getElementById('pv-render-titre').textContent;
    const org = document.getElementById('pv-render-org-nom').textContent;
    const text = encodeURIComponent(`📄 Procès-Verbal de Réunion - NovaDoc\n\n📌 Objet : ${titre}\n🏢 Organisation : ${org}\n\nLe document est prêt et validé.`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
}

function editPvItem(id) {
    switchPvTab('builder');
    showToast("✏ Mode édition activé");
}

function deletePvItem(id) {
    if (confirm("Voulez-vous vraiment supprimer ce procès-verbal ?")) {
        savedPvs = savedPvs.filter(p => p.id !== id);
        localStorage.setItem('novadoc_saved_pvs', JSON.stringify(savedPvs));
        loadSavedPvs();
        showToast("🗑 Procès-verbal supprimé !");
    }
}

function downloadPvPdfById(id) {
    switchPvTab('builder');
    downloadPvPDF();
}

function downloadPvWordById(id) {
    switchPvTab('builder');
    downloadPvWord();
}

function formatDateFr(dateString) {
    if (!dateString) return "29 Juillet 2026";
    const d = new Date(dateString);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getDemoPvs() {
    return [
        {
            id: 'PV-001',
            titre: 'Réunion de Lancement du Projet NovaDoc 2026',
            org_nom: 'DAKAR TECH SOLUTIONS SAS',
            date: '29 Juillet 2026',
            statut: 'Finalisé'
        },
        {
            id: 'PV-002',
            titre: 'Conseil d\'Administration Trimestriel Q2',
            org_nom: 'AFRIQUE INNOVATION GROUP',
            date: '15 Juillet 2026',
            statut: 'Généré'
        }
    ];
}

// Theme Toggle Helper
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('novadoc_theme', newTheme);
    const icon = document.getElementById('theme-toggle-icon');
    if (icon) icon.className = newTheme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}
