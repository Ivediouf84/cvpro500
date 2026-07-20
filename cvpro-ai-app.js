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
    document.getElementById('payment-modal').style.display = 'flex';
}
function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}
function processPayment() {
    const btn = document.getElementById('btn-confirm-payment');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement...';
    btn.disabled = true;

    // Simulate SenePay
    setTimeout(() => {
        closePaymentModal();
        alert("Paiement réussi avec SenePay !");
        exportPDF();
        btn.innerHTML = '<i class="fa-solid fa-credit-card"></i> Payer 1000 FCFA avec SenePay';
        btn.disabled = false;
    }, 2000);
}
