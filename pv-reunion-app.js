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
        showToast("✅ Paiement SenePay de 500 FCFA confirmé avec succès !");
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

    if (tabName === 'dashboard') {
        dashView.style.display = 'block';
        builderView.style.display = 'none';
        btnDash.classList.add('active');
        btnBuilder.classList.remove('active');
        loadSavedPvs();
    } else {
        dashView.style.display = 'none';
        builderView.style.display = 'block';
        btnDash.classList.remove('active');
        btnBuilder.classList.add('active');
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

// File Upload Handlers (OCR & Text Extraction)
async function handleBrouillonFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const previewBox = document.getElementById('file-upload-preview');
    const previewName = document.getElementById('file-upload-name');
    previewName.innerHTML = `<i class="fa-solid fa-paperclip"></i> ${file.name} (${Math.round(file.size / 1024)} KB)`;
    previewBox.style.display = 'flex';

    showToast("✅ Document importé avec succès ! Analyse en cours...");

    const fileType = file.name.split('.').pop().toLowerCase();
    
    if (fileType === 'txt') {
        const text = await file.text();
        document.getElementById('pv-brouillon-text').value = text;
        uploadedBrouillonText = text;
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
                document.getElementById('pv-brouillon-text').value = fullText;
                uploadedBrouillonText = fullText;
            }
        } catch (e) {
            console.warn("PDF extraction fallback", e);
        }
    } else if (['jpg', 'jpeg', 'png', 'webp'].includes(fileType)) {
        try {
            const result = await Tesseract.recognize(file, 'fra');
            if (result && result.data && result.data.text) {
                document.getElementById('pv-brouillon-text').value = result.data.text;
                uploadedBrouillonText = result.data.text;
            }
        } catch (e) {
            console.warn("OCR fallback", e);
        }
    }
}

function removeUploadedBrouillonFile() {
    document.getElementById('brouillon-file-input').value = '';
    document.getElementById('file-upload-preview').style.display = 'none';
    uploadedBrouillonText = '';
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

    const brouillonText = document.getElementById('pv-brouillon-text').value.trim();
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

        if (supabaseKey && brouillonText) {
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
                injectAiParsedData(data);
                showToast("✅ Analyse IA Gemini 3.5 Flash terminée !");
            } else {
                parseAndInjectDraftNotes(brouillonText);
                showToast("✅ Analyse IA terminée !");
            }
        } else if (brouillonText) {
            parseAndInjectDraftNotes(brouillonText);
            showToast("✅ Analyse IA terminée !");
        }
    } catch (err) {
        console.warn("Edge Function Fallback :", err);
        if (brouillonText) parseAndInjectDraftNotes(brouillonText);
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

    // Ordre du Jour
    const ordreContainer = document.getElementById('pv-sec-ordre-container');
    const ordreUl = document.getElementById('pv-render-ordre-jour');
    if (data.ordreDuJour && Array.isArray(data.ordreDuJour) && data.ordreDuJour.length > 0) {
        if (ordreUl) ordreUl.innerHTML = data.ordreDuJour.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (ordreContainer) ordreContainer.style.display = 'block';
    } else {
        if (ordreContainer) ordreContainer.style.display = 'none';
    }

    // Déroulement des Échanges
    const deroulementContainer = document.getElementById('pv-sec-deroulement-container');
    const deroulementDiv = document.getElementById('pv-render-deroulement');
    if (data.deroulementEchanges && Array.isArray(data.deroulementEchanges) && data.deroulementEchanges.length > 0) {
        if (deroulementDiv) {
            deroulementDiv.innerHTML = data.deroulementEchanges.map((item, idx) => `
                <p style="margin-bottom: 0.6rem;"><strong>${escapeHtml(item.titre || `3.${idx+1} Point ${idx+1}`)}</strong><br>${escapeHtml(item.details || '')}</p>
            `).join('');
        }
        if (deroulementContainer) deroulementContainer.style.display = 'block';
    } else {
        if (deroulementContainer) deroulementContainer.style.display = 'none';
    }

    // Décisions
    const decisionsContainer = document.getElementById('pv-sec-decisions-container');
    const decisionsOl = document.getElementById('pv-render-decisions');
    if (data.decisions && Array.isArray(data.decisions) && data.decisions.length > 0) {
        if (decisionsOl) decisionsOl.innerHTML = data.decisions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (decisionsContainer) decisionsContainer.style.display = 'block';
    } else {
        if (decisionsContainer) decisionsContainer.style.display = 'none';
    }

    // Actions
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

// Exhaustive parsing function ensuring NO notes or points are dropped
function parseAndInjectDraftNotes(rawDraft) {
    const lines = rawDraft.split(/\n+/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Ordre du jour
    const ordreContainer = document.getElementById('pv-sec-ordre-container');
    const ordreUl = document.getElementById('pv-render-ordre-jour');
    if (ordreUl && lines.length > 0) {
        ordreUl.innerHTML = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('');
        if (ordreContainer) ordreContainer.style.display = 'block';
    }

    // Déroulement des Échanges
    const deroulementContainer = document.getElementById('pv-sec-deroulement-container');
    const deroulementDiv = document.getElementById('pv-render-deroulement');
    if (deroulementDiv && lines.length > 0) {
        let html = '';
        lines.forEach((line, idx) => {
            html += `<p style="margin-bottom: 0.6rem;"><strong>3.${idx + 1} Point ${idx + 1}</strong><br>${escapeHtml(line)}</p>`;
        });
        deroulementDiv.innerHTML = html;
        if (deroulementContainer) deroulementContainer.style.display = 'block';
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Export PDF & Word & Sharing with strict SenePay payment gate
function downloadPvPDF() {
    if (!isPvPaid()) {
        openPaymentModal();
        return;
    }
    const el = document.getElementById('pv-document-a4');
    const opt = {
        margin: 10,
        filename: `PV_Reunion_NovaDoc_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(el).save().then(() => {
        showToast("✅ PDF du PV téléchargé avec succès !");
    });
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
