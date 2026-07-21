// cvpro-ai-app.js (Simplified for AI HTML flow)
const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = localStorage.getItem('supabase_anon_key');
let supabaseClient = null;
let currentUserId = null;
let cloudDocumentId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Check for SenePay payment success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        alert("Paiement réussi avec SenePay ! Votre CV va être généré et téléchargé automatiquement.");
        window.history.replaceState({}, document.title, window.location.pathname);
        exportPDF();
    }
    
    // Auth initialization
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        await initCloud();
    }
    
    // Load AI generated HTML
    const importedHtml = localStorage.getItem('importedCVHtml');
    if (importedHtml) {
        document.getElementById('cv-document').innerHTML = importedHtml;
        // Optionally trigger a save to cloud if logged in
        triggerCloudSaveHtml(importedHtml);
    } else {
        document.getElementById('cv-document').innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">Aucun CV importé. Veuillez scanner un CV depuis la page d\'accueil.</div>';
    }
    
    // Setup photo upload listener if there is a placeholder
    setupPhotoUploader();
});

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
                const placeholders = document.querySelectorAll('.cv-photo-placeholder');
                placeholders.forEach(img => {
                    img.src = e.target.result;
                });
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
        let senepayKey = localStorage.getItem('senepay_api_key');
        let senepaySecret = localStorage.getItem('senepay_api_secret');
        
        if (!senepayKey || !senepaySecret) {
            senepayKey = prompt("DEVELOPPEUR (Test) : Collez votre clé SenePay (X-Api-Key) publique :");
            senepaySecret = prompt("DEVELOPPEUR (Test) : Collez votre clé SenePay (X-Api-Secret) secrète :");
            if (senepayKey && senepaySecret) {
                localStorage.setItem('senepay_api_key', senepayKey);
                localStorage.setItem('senepay_api_secret', senepaySecret);
            } else {
                throw new Error("Clés SenePay manquantes pour le test.");
            }
        }

        const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': senepayKey,
                'X-Api-Secret': senepaySecret
            },
            body: JSON.stringify({
                amount: 500,
                currency: "XOF",
                orderReference: "CVPRO-AI-" + Date.now(),
                description: "Téléchargement de CV Premium IA (CV PRO)",
                returnUrl: window.location.href.split('?')[0] + "?payment=success",
                cancelUrl: window.location.href.split('?')[0] + "?payment=cancel"
            })
        });

        const data = await response.json();

        if (response.ok && data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        } else {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('senepay_api_key');
                localStorage.removeItem('senepay_api_secret');
            }
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

    styleTag.innerHTML = \`n        #cv-document {
            color: \ !important;
            font-size: \px !important;
            font-family: \ !important;
            line-height: \ !important;
        }
        #cv-document h1, #cv-document h2, #cv-document h3, #cv-document h4, #cv-document h5, #cv-document h6 {
            font-family: \ !important;
        }
        #cv-document p, #cv-document ul, #cv-document div, #cv-document span {
            margin-bottom: \rem;
        }
    \;
}

// Add event listeners to style controls
['style-text-color', 'style-font-size', 'style-font-family', 'style-line-height', 'style-spacing'].forEach(id => {
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

// Interactive Block Manipulation
let selectedBlock = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inject toolbar HTML
    const toolbar = document.createElement('div');
    toolbar.id = 'block-toolbar';
    toolbar.style.display = 'none';
    toolbar.style.position = 'absolute';
    toolbar.style.zIndex = '100';
    toolbar.style.background = 'var(--surface)';
    toolbar.style.border = '1px solid var(--border)';
    toolbar.style.borderRadius = 'var(--radius-md)';
    toolbar.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    toolbar.style.padding = '0.25rem';
    toolbar.style.gap = '0.25rem';
    
    toolbar.innerHTML = \`n        <button class=\"btn btn-ghost\" id=\"btn-block-up\" title=\"Monter\" style=\"padding: 0.25rem 0.5rem; font-size: 0.8rem;\"><i class=\"fa-solid fa-arrow-up\"></i></button>
        <button class=\"btn btn-ghost\" id=\"btn-block-down\" title=\"Descendre\" style=\"padding: 0.25rem 0.5rem; font-size: 0.8rem;\"><i class=\"fa-solid fa-arrow-down\"></i></button>
        <button class=\"btn btn-ghost\" id=\"btn-block-duplicate\" title=\"Dupliquer\" style=\"padding: 0.25rem 0.5rem; color: #10b981; font-size: 0.8rem;\"><i class=\"fa-solid fa-copy\"></i></button>
        <button class=\"btn btn-ghost\" id=\"btn-block-delete\" title=\"Supprimer\" style=\"padding: 0.25rem 0.5rem; color: #ef4444; font-size: 0.8rem;\"><i class=\"fa-solid fa-trash\"></i></button>
    \;
    
    document.body.appendChild(toolbar);

    const showToolbar = (element) => {
        selectedBlock = element;
        const rect = element.getBoundingClientRect();
        toolbar.style.display = 'flex';
        toolbar.style.top = (window.scrollY + rect.top - 40) + 'px';
        toolbar.style.left = (window.scrollX + rect.left) + 'px';
        
        document.querySelectorAll('.cv-block-selected').forEach(el => el.classList.remove('cv-block-selected'));
        element.classList.add('cv-block-selected');
    };

    const hideToolbar = () => {
        toolbar.style.display = 'none';
        document.querySelectorAll('.cv-block-selected').forEach(el => el.classList.remove('cv-block-selected'));
        selectedBlock = null;
    };

    const cvDocument = document.getElementById('cv-document');
    if (cvDocument) {
        cvDocument.addEventListener('click', (e) => {
            const block = e.target.closest('div, img, section, ul, h1, h2, h3');
            if (block && block !== cvDocument) {
                showToolbar(block);
                e.stopPropagation();
            } else {
                hideToolbar();
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (!toolbar.contains(e.target) && cvDocument && !cvDocument.contains(e.target)) {
            hideToolbar();
        }
    });

    document.getElementById('btn-block-up')?.addEventListener('click', () => {
        if (selectedBlock && selectedBlock.previousElementSibling) {
            selectedBlock.parentNode.insertBefore(selectedBlock, selectedBlock.previousElementSibling);
            showToolbar(selectedBlock);
            triggerCloudSaveHtml(cvDocument.innerHTML);
        }
    });

    document.getElementById('btn-block-down')?.addEventListener('click', () => {
        if (selectedBlock && selectedBlock.nextElementSibling) {
            selectedBlock.parentNode.insertBefore(selectedBlock.nextElementSibling, selectedBlock);
            showToolbar(selectedBlock);
            triggerCloudSaveHtml(cvDocument.innerHTML);
        }
    });

    document.getElementById('btn-block-duplicate')?.addEventListener('click', () => {
        if (selectedBlock) {
            const clone = selectedBlock.cloneNode(true);
            clone.classList.remove('cv-block-selected');
            selectedBlock.parentNode.insertBefore(clone, selectedBlock.nextSibling);
            triggerCloudSaveHtml(cvDocument.innerHTML);
        }
    });

    document.getElementById('btn-block-delete')?.addEventListener('click', () => {
        if (selectedBlock) {
            selectedBlock.remove();
            hideToolbar();
            triggerCloudSaveHtml(cvDocument.innerHTML);
        }
    });
});
