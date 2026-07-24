const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';
let supabaseClient = null;

let generatedDemandeHtml = '';
let generatedMotivationHtml = '';

document.addEventListener('DOMContentLoaded', () => {
    // Check for SenePay payment success redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
        alert("Paiement réussi avec SenePay ! Vos documents vont être téléchargés.");
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Restore from local storage in case of redirect
        const savedDemande = localStorage.getItem('motivation_demande');
        const savedMotivation = localStorage.getItem('motivation_lettre');
        
        if (savedDemande && savedMotivation) {
            document.getElementById('doc-demande').innerHTML = savedDemande;
            document.getElementById('doc-motivation').innerHTML = savedMotivation;
            document.getElementById('input-section').style.display = 'none';
            document.getElementById('results-section').style.display = 'flex';
            
            exportBothPDFs();
        }
    }
    
    // Auth initialization
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        const display = document.getElementById('file-name-display');
        display.textContent = "✅ CV prêt : " + file.name;
        display.style.color = "#10b981"; // Success green color
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
    const result = await Tesseract.recognize(file, 'fra', { 
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
    if (file.type === 'application/pdf') {
        if(overlay && overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Lecture du PDF...';
        return await extractTextFromPDF(file);
    } else if (file.type.startsWith('image/')) {
        if(overlay && overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Initialisation OCR...';
        return await extractTextFromImage(file);
    } else {
        throw new Error('Format non supporté. Veuillez utiliser un PDF ou une Image (JPG, PNG).');
    }
}

async function generateDocuments(event) {
    event.preventDefault();
    
    const prenom = document.getElementById('input-prenom').value;
    const nom = document.getElementById('input-nom').value;
    const poste = document.getElementById('input-poste').value;
    const fileInput = document.getElementById('input-cv');
    const file = fileInput.files[0];
    
    if (!file) {
        alert("Veuillez insérer une photo de votre CV ou un document PDF.");
        return;
    }
    
    if (!supabaseClient) {
        alert("Client de base de données non initialisé. Veuillez recharger la page.");
        return;
    }

    const overlay = document.getElementById('ai-loading-overlay');
    const originalOverlayText = overlay.querySelector('h3') ? overlay.querySelector('h3').innerText : 'Génération en cours...';
    overlay.style.display = 'flex';

    try {
        // 1. Extraction locale du texte
        const rawTextExtracted = await extractRawText(file);
        
        if (!rawTextExtracted || rawTextExtracted.trim().length < 20) {
            throw new Error("Impossible d'extraire suffisamment de texte de ce fichier.");
        }

        const entreprise = document.getElementById('input-entreprise').value;
        const destinataire = document.getElementById('input-destinataire').value;

        if (overlay.querySelector('h3')) overlay.querySelector('h3').innerText = 'Analyse et Rédaction par l\'IA Groq...';

        // 2. Call Supabase Edge Function
        const { data, error } = await supabaseClient.functions.invoke('generate-motivation', {
            body: {
                firstName: prenom,
                lastName: nom,
                jobTitle: poste,
                companyName: entreprise,
                addressedTo: destinataire,
                rawText: rawTextExtracted
            }
        });

        if (error) throw error;
        
        let result = data;
        if (typeof result === 'string') {
            try {
                result = JSON.parse(result);
            } catch(e) {}
        }

        if (result && (result.demandeHtml || result.demandeText)) {
            
            generatedDemandeHtml = result.demandeHtml || result.demandeText;
            generatedMotivationHtml = result.motivationHtml || result.motivationText;
            
            const demandeEl = document.getElementById('doc-demande');
            const motivationEl = document.getElementById('doc-motivation');
            if (demandeEl) {
                demandeEl.innerHTML = generatedDemandeHtml;
                demandeEl.contentEditable = "true";
            }
            if (motivationEl) {
                motivationEl.innerHTML = generatedMotivationHtml;
                motivationEl.contentEditable = "true";
            }
            
            // Save to localStorage to survive SenePay redirect
            localStorage.setItem('motivation_demande', generatedDemandeHtml);
            localStorage.setItem('motivation_lettre', generatedMotivationHtml);
            
            // Show results
            document.getElementById('input-section').style.display = 'none';
            document.getElementById('results-section').style.display = 'flex';
        } else {
            throw new Error("Format de réponse IA invalide: " + JSON.stringify(result));
        }
        
    } catch (error) {
        console.error("Full error:", error);
        
        let errorMsg = error.message;
        if (error.context && typeof error.context.json === 'function') {
            try {
                const errorData = await error.context.json();
                if (errorData && errorData.error) {
                    errorMsg = errorData.error;
                }
            } catch(e) {}
        }

        alert("Erreur lors de la génération. " + errorMsg);
    } finally {
        overlay.style.display = 'none';
    }
}

function openPaymentModal() {
    document.getElementById('payment-modal').style.display = 'flex';
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

async function processPayment() {
    const btn = document.getElementById('btn-confirm-pay');
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
                amount: 500,
                orderPrefix: "MOTIVATION-",
                description: "Demande et Lettre de Motivation",
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

async function exportBothPDFs() {
    const demandeElement = document.getElementById('doc-demande');
    const motivationElement = document.getElementById('doc-motivation');
    
    const prenom = document.getElementById('input-prenom')?.value || "Candidat";
    const nom = document.getElementById('input-nom')?.value || "";
    const namePrefix = `${prenom}_${nom}`.trim().replace(/\s+/g, '_');

    const opt = {
        margin: [10, 10, 10, 10],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Download Demande
    try {
        opt.filename = `Demande_Emploi_${namePrefix}.pdf`;
        await html2pdf().set(opt).from(demandeElement).save();
        
        // Wait a small moment before downloading the second one to ensure browser doesn't block it
        setTimeout(async () => {
            opt.filename = `Lettre_Motivation_${namePrefix}.pdf`;
            await html2pdf().set(opt).from(motivationElement).save();
            alert("Vos 2 documents ont été téléchargés avec succès !");
        }, 1000);
        
    } catch(err) {
        console.error("PDF Export Error:", err);
        alert("Erreur lors de la création du PDF.");
    }
}
