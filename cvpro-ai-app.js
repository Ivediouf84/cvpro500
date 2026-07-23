// cvpro-ai-app.js (AI Textual CV Builder with Word-like editing)
const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const HARDCODED_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';

try {
    localStorage.setItem('supabase_anon_key', HARDCODED_ANON_KEY);
} catch(e) {}

const SUPABASE_KEY = HARDCODED_ANON_KEY;
let supabaseClient = null;
let currentUserId = null;
let cloudDocumentId = null;

// Initialize app
const initApp = async () => {
    // Check for SenePay payment success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        alert("Paiement réussi avec SenePay ! Votre CV va être généré et téléchargé automatiquement.");
        window.history.replaceState({}, document.title, window.location.pathname);
        exportPDF();
    }
    
    // Auth initialization
    if (window.supabase) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            await initCloud();
        } catch(e) {}
    }
    
    // Ensure #cv-document is contenteditable for Word-like direct editing
    const docEl = document.getElementById('cv-document');
    if (docEl) {
        docEl.contentEditable = "true";
        docEl.style.outline = "none";
    }

    // Load AI generated HTML or JSON
    const importedDataStr = localStorage.getItem('importedCVData');
    const importedHtml = localStorage.getItem('importedCVHtml');
        if (importedDataStr) {
            try {
                alert("Données importées trouvées ! Longueur: " + importedDataStr.length + " caractères. Début: " + importedDataStr.substring(0, 100));
                const parsed = JSON.parse(importedDataStr);
                renderParsedJsonToHtml(parsed);
                localStorage.removeItem('importedCVData');
                alert("Rendu HTML terminé avec succès.");
            } catch (e) {
                alert("Erreur lors du rendu HTML: " + e.message);
                console.error("Error generating HTML from imported JSON", e);
            }
        } else if (importedHtml && importedHtml.trim().length > 50) {
        if (docEl) docEl.innerHTML = importedHtml;
        triggerCloudSaveHtml(importedHtml);
    } else {
        // Render default demo CV template (Ibou Diouf) so the page is NEVER blank
        renderDefaultDemoCv();
    }
    
    // Setup photo upload listener if there is a placeholder
    setupPhotoUploader();
    updateCVStyles();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function renderDefaultDemoCv() {
    const docEl = document.getElementById('cv-document');
    if (!docEl) return;
    
    docEl.innerHTML = `
        <div class="cv-header" style="background: var(--primary, #4F46E5); padding: 1.5rem; color: white; border-radius: 8px; display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem;">
            <div class="cv-header-name" style="flex: 1;">
                <h1 style="font-size: 2rem; margin: 0; color: white;">Ibou <span style="color: #fef08a;">Diouf</span></h1>
                <h2 style="font-size: 1.1rem; margin-top: 0.3rem; font-weight: 400; color: #e0e7ff;">Chef de Projet Commercial & Marketing Digital</h2>
            </div>
            <div class="cv-header-contact" style="font-size: 0.85rem; line-height: 1.5;">
                <div><i class="fa-solid fa-envelope"></i> ibou.diouf@example.com</div>
                <div><i class="fa-solid fa-phone"></i> +221 77 654 32 10</div>
                <div><i class="fa-solid fa-location-dot"></i> Dakar, Sénégal</div>
                <div><i class="fa-brands fa-linkedin"></i> linkedin.com/in/iboudiouf</div>
            </div>
        </div>
        
        <div class="cv-body" style="display: flex; gap: 1.5rem;">
            <div class="cv-main" style="flex: 2;">
                <div class="cv-section" style="margin-bottom: 1.25rem;">
                    <h3 class="cv-section-title" style="font-size: 1.1rem; border-bottom: 2px solid #4F46E5; padding-bottom: 0.3rem; color: #1e1b4b; margin-bottom: 0.5rem;">Profil</h3>
                    <p class="cv-summary" style="font-size: 0.9rem; line-height: 1.5; color: #334155;">Professionnel passionné et stratégique comptant plus de 6 années d'expérience réussie dans la gestion de projets commerciaux, le développement des ventes et le marketing digital au Sénégal. Spécialisé dans la négociation B2B, l'animation d'équipes de vente et le déploiement de campagnes digitales à fort impact.</p>
                </div>
                
                <div class="cv-section" style="margin-bottom: 1.25rem;">
                    <h3 class="cv-section-title" style="font-size: 1.1rem; border-bottom: 2px solid #4F46E5; padding-bottom: 0.3rem; color: #1e1b4b; margin-bottom: 0.5rem;">Études</h3>
                    <div class="cv-item" style="margin-bottom: 0.6rem;">
                        <strong style="color: #0f172a;">Licence en Gestion & Marketing (FASEG)</strong> - <span style="color: #475569;">Université Cheikh Anta Diop (UCAD)</span> <span style="float: right; color: #64748b; font-size: 0.85rem;">3 ans</span>
                    </div>
                    <div class="cv-item" style="margin-bottom: 0.6rem;">
                        <strong style="color: #0f172a;">Baccalauréat Série L2</strong> - <span style="color: #475569;">Lycée Lamine Guèye</span> <span style="float: right; color: #64748b; font-size: 0.85rem;">3 ans</span>
                    </div>
                </div>

                <div class="cv-section" style="margin-bottom: 1.25rem;">
                    <h3 class="cv-section-title" style="font-size: 1.1rem; border-bottom: 2px solid #4F46E5; padding-bottom: 0.3rem; color: #1e1b4b; margin-bottom: 0.5rem;">Expériences</h3>
                    <div class="cv-item" style="margin-bottom: 0.8rem;">
                        <div style="display: flex; justify-content: space-between;"><strong style="color: #0f172a;">Responsable Commercial & Marketing</strong> <span style="color: #64748b; font-size: 0.85rem;">Janv 2023 - Présent</span></div>
                        <div style="color: #4F46E5; font-weight: 600; font-size: 0.9rem;">Sonatel / Orange Sénégal</div>
                        <p style="font-size: 0.85rem; color: #334155; margin-top: 0.2rem;">Supervision d'une équipe de 5 commerciaux, élaboration des stratégies de vente B2B et gestion d'un portefeuille grands comptes.</p>
                    </div>
                    <div class="cv-item" style="margin-bottom: 0.8rem;">
                        <div style="display: flex; justify-content: space-between;"><strong style="color: #0f172a;">Chef de Projet Ventes Junior</strong> <span style="color: #64748b; font-size: 0.85rem;">Juin 2021 - Déc 2022</span></div>
                        <div style="color: #4F46E5; font-weight: 600; font-size: 0.9rem;">Wave Digital Finance Sénégal</div>
                        <p style="font-size: 0.85rem; color: #334155; margin-top: 0.2rem;">Déploiement du réseau de distribution, formation des agents partenaires et animation des campagnes d'acquisition.</p>
                    </div>
                </div>
            </div>
            
            <div class="cv-sidebar" style="flex: 1; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <div class="cv-section" style="margin-bottom: 1.25rem;">
                    <h3 class="cv-section-title" style="font-size: 1rem; color: #1e1b4b; border-bottom: 1.5px solid #4F46E5; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Compétences</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                        <span style="background: #e0e7ff; color: #3730a3; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Pack Office</span>
                        <span style="background: #e0e7ff; color: #3730a3; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Négociation B2B</span>
                        <span style="background: #e0e7ff; color: #3730a3; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Marketing Digital</span>
                        <span style="background: #e0e7ff; color: #3730a3; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;">Gestion CRM</span>
                    </div>
                </div>
                
                <div class="cv-section" style="margin-bottom: 1.25rem;">
                    <h3 class="cv-section-title" style="font-size: 1rem; color: #1e1b4b; border-bottom: 1.5px solid #4F46E5; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Langues</h3>
                    <ul style="padding-left: 1.2rem; margin: 0; font-size: 0.85rem; color: #334155; line-height: 1.5;">
                        <li><strong>Wolof</strong> (Maternelle)</li>
                        <li><strong>Français</strong> (Courant)</li>
                        <li><strong>Anglais</strong> (Avancé)</li>
                    </ul>
                </div>
                
                <div class="cv-section">
                    <h3 class="cv-section-title" style="font-size: 1rem; color: #1e1b4b; border-bottom: 1.5px solid #4F46E5; padding-bottom: 0.2rem; margin-bottom: 0.5rem;">Intérêts</h3>
                    <ul style="padding-left: 1.2rem; margin: 0; font-size: 0.85rem; color: #334155; line-height: 1.5;">
                        <li>Football & Bénévolat</li>
                        <li>Lecture & Voyage</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function renderParsedJsonToHtml(parsed) {
    const docEl = document.getElementById('cv-document');
    if (!docEl || !parsed) return;

    const p = {
        firstName: parsed.personal?.firstName || parsed.firstName || 'Prénom',
        lastName: parsed.personal?.lastName || parsed.lastName || 'Nom',
        jobTitle: parsed.personal?.jobTitle || parsed.jobTitle || 'Titre Professionnel',
        email: parsed.personal?.email || parsed.email || '',
        phone: parsed.personal?.phone || parsed.phone || '',
        city: parsed.personal?.city || parsed.personal?.location || parsed.location || '',
        linkedin: parsed.personal?.linkedin || parsed.linkedin || ''
    };
    const profileSummary = parsed.profile?.summary || parsed.summary || '';
    const education = Array.isArray(parsed.education) ? parsed.education : [];
    const formations = Array.isArray(parsed.formations) ? parsed.formations : [];
    const experiences = Array.isArray(parsed.experiences) ? parsed.experiences : (Array.isArray(parsed.experience) ? parsed.experience : []);
    const skills = Array.isArray(parsed.skills) ? parsed.skills : [];
    const languages = Array.isArray(parsed.languages) ? parsed.languages : [];
    const interests = Array.isArray(parsed.interests) ? parsed.interests : [];

    const html = `
        <div style="padding: 2rem; font-family: Arial, sans-serif; color: #000; line-height: 1.6;">
            <div style="text-align: center; margin-bottom: 2rem;">
                <h1 style="font-size: 24pt; margin: 0; color: #000;">${p.firstName} ${p.lastName}</h1>
                <h2 style="font-size: 14pt; font-weight: normal; margin: 5px 0; color: #333;">${p.jobTitle}</h2>
                <p style="font-size: 11pt; margin: 5px 0;">
                    ${[p.email, p.phone, p.city, p.linkedin].filter(Boolean).join(' | ')}
                </p>
            </div>
            
            ${profileSummary ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Profil</h3>
                <p style="font-size: 11pt; margin: 0;">${profileSummary}</p>
            </div>` : ''}

            ${experiences.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Expériences Professionnelles</h3>
                ${experiences.map(e => `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11pt; font-weight: bold;">
                            <span>${e.title || 'Poste'} - ${e.company || 'Entreprise'}</span>
                            <span>${e.startDate || ''} ${e.endDate ? '- ' + e.endDate : ''}</span>
                        </div>
                        <p style="font-size: 11pt; margin: 3px 0 0 0;">${e.description || ''}</p>
                    </div>
                `).join('')}
            </div>` : ''}

            ${education.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Études et Diplômes</h3>
                ${education.map(e => `
                    <div style="margin-bottom: 5px; font-size: 11pt;">
                        <strong style="color: #000;">${e.degree || e.studyType || 'Diplôme'}</strong> - ${e.school || 'Établissement'} 
                        <span style="float: right;">${e.year || ''}</span>
                    </div>
                `).join('')}
            </div>` : ''}

            ${formations.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Formations / Certifications</h3>
                ${formations.map(f => `
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; font-size: 11pt; font-weight: bold;">
                            <span>${f.title || 'Formation'} - ${f.institution || 'Institution'}</span>
                            <span>${f.startDate || ''} ${f.endDate ? '- ' + f.endDate : ''}</span>
                        </div>
                        <p style="font-size: 11pt; margin: 3px 0 0 0;">${f.description || ''}</p>
                    </div>
                `).join('')}
            </div>` : ''}

            ${skills.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Compétences</h3>
                <p style="font-size: 11pt; margin: 0;">
                    ${skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean).join(' • ')}
                </p>
            </div>` : ''}

            ${languages.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Langues</h3>
                <ul style="font-size: 11pt; margin: 0; padding-left: 20px;">
                    ${languages.map(l => typeof l === 'string' ? `<li>${l}</li>` : `<li><strong>${l.name || ''}</strong> ${l.level ? '(' + l.level + ')' : ''}</li>`).join('')}
                </ul>
            </div>` : ''}
            
            ${interests.length > 0 ? `
            <div style="margin-bottom: 1.5rem;">
                <h3 style="font-size: 12pt; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; color: #000; text-transform: uppercase;">Centres d'intérêt</h3>
                <p style="font-size: 11pt; margin: 0;">
                    ${interests.map(i => typeof i === 'string' ? i : i.name).filter(Boolean).join(' • ')}
                </p>
            </div>` : ''}
        </div>
    `;

    docEl.innerHTML = html;
    triggerCloudSaveHtml(html);
}

function setupPhotoUploader() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'photo-upload-input';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const placeholders = document.querySelectorAll('.cv-photo-placeholder, img[alt*="Profil" i], img[alt*="Photo" i], .cv-profile-pic img, img');
                if (placeholders.length > 0) {
                    placeholders.forEach(img => {
                        img.src = e.target.result;
                    });
                }
                triggerCloudSaveHtml(document.getElementById('cv-document').innerHTML);
            };
            reader.readAsDataURL(file);
        }
    });
}

// Cloud functionality adapted for HTML
async function initCloud() {
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getSession();
        
        if (!authData.session) {
            window.location.href = "auth.html";
            return;
        }
        
        currentUserId = authData.session.user.id;
        
        // Update UI
        const userMenu = document.getElementById('builder-user-menu');
        const userEmail = document.getElementById('builder-user-email');
        const btnLogin = document.getElementById('btn-login');
        
        if (userMenu && userEmail && btnLogin) {
            userEmail.textContent = authData.session.user.email;
            userMenu.style.display = 'flex';
            btnLogin.style.display = 'none';
        }
        
        // Add logout listener
        window.handleLogout = async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        };

        // If no local importedHtml, try to load from cloud
        if (!localStorage.getItem('importedCVHtml')) {
            const { data: cvDoc, error: fetchError } = await supabaseClient
                .from('cv_documents')
                .select('*')
                .eq('user_id', currentUserId)
                .single();

            if (cvDoc && cvDoc.cv_html) {
                cloudDocumentId = cvDoc.id;
                document.getElementById('cv-document').innerHTML = cvDoc.cv_html;
            }
        }
    } catch (err) {
        console.error("Cloud initialization error:", err);
    }
}

async function triggerCloudSaveHtml(htmlContent) {
    // ALWAYS save locally so changes aren't lost on refresh for non-logged-in users
    localStorage.setItem('importedCVHtml', htmlContent);
    
    if (!supabaseClient || !currentUserId) return;
    
    try {
        const payload = {
            user_id: currentUserId,
            title: 'Mon CV IA',
            cv_html: htmlContent, // Save the raw HTML instead of JSON
            updated_at: new Date().toISOString()
        };
        
        if (cloudDocumentId) {
            await supabaseClient.from('cv_documents').update(payload).eq('id', cloudDocumentId);
        } else {
            const { data, error } = await supabaseClient.from('cv_documents').insert([payload]).select().single();
            if (data) {
                cloudDocumentId = data.id;
            }
        }
    } catch (e) {
        console.error("Cloud save failed:", e);
    }
}

// Ensure every edit saves to cloud
document.getElementById('cv-document').addEventListener('input', () => {
    // Debounce save
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(() => {
        triggerCloudSaveHtml(document.getElementById('cv-document').innerHTML);
    }, 1000);
});

// Allow clicking on empty spaces to add text
document.getElementById('cv-document').addEventListener('click', (e) => {
    if (e.target.id === 'cv-document') {
        const p = document.createElement('p');
        p.innerHTML = '<br>';
        e.target.appendChild(p);
        
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(p);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }
});

// Zoom logic
let currentZoom = 1;
function zoomIn() {
    if (currentZoom < 1.5) {
        currentZoom += 0.1;
        applyZoom();
    }
}
function zoomOut() {
    if (currentZoom > 0.5) {
        currentZoom -= 0.1;
        applyZoom();
    }
}
function applyZoom() {
    const doc = document.getElementById('cv-document');
    doc.style.transform = `scale(${currentZoom})`;
}

// Payment/Export logic
function exportPDF() {
    const doc = document.getElementById('cv-document');
    
    const opt = {
        margin: 0,
        filename: 'cv_professionnel_ia.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    doc.style.transform = 'scale(1)'; // Reset zoom before print
    html2pdf().set(opt).from(doc).save().then(() => {
        applyZoom();
    });
}

function openPaymentModal() {
    document.getElementById('payment-modal').classList.add('active');
}
function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}
function selectPayment(el) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
}
async function processPayment() {
    const btn = document.getElementById('btn-confirm-payment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redirection SenePay...';
    btn.disabled = true;

    try {
        const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
        const supabaseKey = localStorage.getItem('supabase_anon_key');
        
        if (!supabaseKey) {
            throw new Error("Clé Supabase manquante. Veuillez rafraîchir la page.");
        }

        // Appeler la fonction backend sécurisée
        const response = await fetch(`${SUPABASE_URL}/functions/v1/init-senepay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                amount: 1000,
                orderPrefix: "CVPRO-AI-",
                description: "CV PRO par Intelligence Artificielle",
                returnUrl: window.location.href.split('?')[0] + "?payment=success",
                cancelUrl: window.location.href.split('?')[0] + "?payment=cancel"
            })
        });

        const data = await response.json();

        if (response.ok && data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        } else {
            throw new Error(data.message || data.error || JSON.stringify(data));
        }

    } catch (err) {
        console.error("SenePay Error:", err);
        alert("Erreur SenePay : " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Add event listener to the download button
document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('btn-open-payment');
    if(downloadBtn) {
        downloadBtn.addEventListener('click', openPaymentModal);
    }
});

// Style Panel Logic
function updateCVStyles() {
    const color = document.getElementById('style-text-color')?.value || '#1a1a1a';
    const headerColor = document.getElementById('style-header-color')?.value || '#4f46e5';
    const fontSize = document.getElementById('style-font-size')?.value || '14';
    const fontFamily = document.getElementById('style-font-family')?.value || 'inherit';
    const lineHeight = document.getElementById('style-line-height')?.value || '1.3';
    const spacing = document.getElementById('style-spacing')?.value || '0.5';

    let styleTag = document.getElementById('dynamic-cv-styles');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'dynamic-cv-styles';
        document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
        #cv-document,
        #cv-document p,
        #cv-document li,
        #cv-document span,
        #cv-document div:not(.cv-header):not(.cv-header-name):not(.cv-header-contact),
        #cv-document .cv-summary,
        #cv-document .cv-item-title,
        #cv-document .cv-item-company,
        #cv-document .cv-item-date,
        #cv-document .cv-item-desc {
            color: ${color};
        }
        
        #cv-document {
            font-size: ${fontSize}px !important;
            font-family: ${fontFamily} !important;
            line-height: ${lineHeight} !important;
        }
        #cv-document h1, #cv-document h2, #cv-document h3, #cv-document h4, #cv-document h5, #cv-document h6 {
            font-family: ${fontFamily} !important;
        }
        #cv-document p, #cv-document ul, #cv-document div, #cv-document span {
            margin-bottom: ${spacing}rem;
        }
        #cv-document .cv-header {
            background-color: ${headerColor} !important;
        }
    `;
}

// Add event listeners to style controls
['style-text-color', 'style-header-color', 'style-font-size', 'style-font-family', 'style-line-height', 'style-spacing'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('input', (e) => {
            // Update displayed values for sliders
            if (id === 'style-font-size') document.getElementById('val-font-size').innerText = e.target.value + 'px';
            if (id === 'style-line-height') document.getElementById('val-line-height').innerText = e.target.value;
            if (id === 'style-spacing') document.getElementById('val-spacing').innerText = e.target.value + 'rem';
            updateCVStyles();
        });
    }
});

// Block manipulation has been removed to allow native Word-like editing behavior.
// ----------------------------------------------------
// FREE MOVE LOGIC (Drag & Drop for non-text elements)
// ----------------------------------------------------
let isFreeMoveActive = false;
let draggedElement = null;
let startX = 0, startY = 0;
let initialLeft = 0, initialTop = 0;

document.addEventListener('DOMContentLoaded', () => {
    const btnFreeMove = document.getElementById('btn-free-move');
    if (!btnFreeMove) return;
    
    btnFreeMove.addEventListener('click', (e) => {
        isFreeMoveActive = !isFreeMoveActive;
        const cvDoc = document.getElementById('cv-document');
        
        if (isFreeMoveActive) {
            btnFreeMove.style.background = 'var(--primary)';
            btnFreeMove.style.color = 'white';
            btnFreeMove.innerHTML = '<i class="fa-solid fa-check"></i> Déplacement Libre Actif';
            cvDoc.style.cursor = 'grab';
        } else {
            btnFreeMove.style.background = 'transparent';
            btnFreeMove.style.color = 'var(--primary)';
            btnFreeMove.innerHTML = 'Activer le déplacement libre';
            cvDoc.style.cursor = 'default';
            cvDoc.querySelectorAll('.free-move-element').forEach(el => el.style.cursor = '');
        }
    });

    const cvDoc = document.getElementById('cv-document');
    if (!cvDoc) return;

    cvDoc.addEventListener('mousedown', (e) => {
        if (!isFreeMoveActive) return;
        
        // Target images, icons, lines, or elements with specific classes
        // Avoid text blocks like p, h1, span (unless it's an icon)
        const target = e.target.closest('img, svg, i, hr, .cv-profile-pic, .cv-header-contact');
        
        if (target && target !== cvDoc) {
            draggedElement = target;
            draggedElement.classList.add('free-move-element');
            
            // Ensure position is relative or absolute so transform works well
            if (window.getComputedStyle(draggedElement).position === 'static') {
                draggedElement.style.position = 'relative';
            }
            
            // Parse existing transform if any
            const style = window.getComputedStyle(draggedElement);
            const transform = style.transform;
            initialLeft = 0;
            initialTop = 0;
            
            if (transform !== 'none') {
                const matrix = transform.match(/^matrix\((.+)\)$/);
                if (matrix) {
                    const values = matrix[1].split(', ');
                    initialLeft = parseFloat(values[4]);
                    initialTop = parseFloat(values[5]);
                }
            }
            
            startX = e.clientX;
            startY = e.clientY;
            
            draggedElement.style.transition = 'none';
            draggedElement.style.cursor = 'grabbing';
            cvDoc.style.cursor = 'grabbing';
            
            e.preventDefault(); // Prevent text selection while dragging
            e.stopPropagation();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (!draggedElement || !isFreeMoveActive) return;
        
        // Account for the zoom scale!
        const dx = (e.clientX - startX) / currentZoom;
        const dy = (e.clientY - startY) / currentZoom;
        
        draggedElement.style.transform = `translate(${initialLeft + dx}px, ${initialTop + dy}px)`;
    });

    document.addEventListener('mouseup', () => {
        if (draggedElement) {
            draggedElement.style.cursor = 'grab';
            cvDoc.style.cursor = 'grab';
            draggedElement = null;
            
            // Save state
            triggerCloudSaveHtml(cvDoc.innerHTML);
        }
    });
});

// AI Upload Handler for cvpro-ai-builder.html
function triggerAiCvImportInAiBuilder() {
    const fileInput = document.getElementById('ai-cv-file-input-builder');
    if (fileInput) {
        fileInput.value = '';
        fileInput.click();
    }
}

async function extractTextFromPDF_AIBuilder(file) {
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

async function extractTextFromImage_AIBuilder(file) {
    const result = await Tesseract.recognize(file, 'fra', { 
        logger: m => {
            const btn = document.getElementById('btn-import-cv-ai');
            if (btn && m.status === 'recognizing text') {
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Lecture Image (${Math.round(m.progress * 100)}%)...`;
            }
        }
    });
    return result.data.text;
}

async function extractRawText_AIBuilder(file) {
    const btn = document.getElementById('btn-import-cv-ai');
    if (file.type === 'application/pdf') {
        if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Lecture du PDF...';
        return await extractTextFromPDF_AIBuilder(file);
    } else if (file.type.startsWith('image/')) {
        if(btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Initialisation OCR...';
        return await extractTextFromImage_AIBuilder(file);
    } else {
        throw new Error('Format non supporté. Veuillez utiliser un PDF ou une Image (JPG, PNG).');
    }
}

async function handleAiCvUploadInAiBuilder(e) {
    const file = e.target?.files?.[0];
    if (!file) return;

    const btn = document.getElementById('btn-import-cv-ai');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
    }

    try {
        const rawTextExtracted = await extractRawText_AIBuilder(file);
        
        if (!rawTextExtracted || rawTextExtracted.trim().length < 20) {
            throw new Error("Impossible d'extraire suffisamment de texte de ce fichier.");
        }

        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyse par l\'IA Groq...';

        const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-cv`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                rawText: rawTextExtracted
            })
        });

        const rawText = await response.text();
        let parsed = {};
        try {
            let cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const startIndex = cleanJson.indexOf('{');
            const endIndex = cleanJson.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
                cleanJson = cleanJson.substring(startIndex, endIndex + 1);
            }
            parsed = JSON.parse(cleanJson);
        } catch(err) {
            throw new Error("Erreur de format de réponse de l'IA : " + rawText.substring(0, 100));
        }

        if (response.ok && parsed) {
            alert("Debug JSON Llama 3.3: " + rawText.substring(0, 500));
            renderParsedJsonToHtml(parsed);
            alert("✨ Votre CV a été analysé et mis à jour avec succès par l'IA !");
        } else {
            throw new Error(parsed.error || rawText);
        }

    } catch(err) {
        console.error("AI Import Error:", err);
        alert("Erreur d'importation : " + err.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        if (e.target) e.target.value = '';
    }
}

// Floating rich text toolbar has been removed as per user request. 
// The formatting tools are now always accessible in the left style panel.
