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
        document.getElementById('file-name-display').textContent = "CV sélectionné : " + file.name;
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
        alert("Veuillez insérer une photo de votre CV.");
        return;
    }
    
    if (!supabaseClient) {
        alert("Client de base de données non initialisé. Veuillez recharger la page.");
        return;
    }

    const overlay = document.getElementById('ai-loading-overlay');
    overlay.style.display = 'flex';

    try {
        // 1. Convert file to base64
        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (file.type.startsWith('image/')) {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1200;
                        const MAX_HEIGHT = 1600;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.8));
                    };
                    img.onerror = reject;
                    img.src = e.target.result;
                } else {
                    // For PDF, return the result directly
                    resolve(e.target.result);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });

        const b64Str = base64Data.split(',')[1];
        const mimeType = file.type || 'application/pdf';

        const entreprise = document.getElementById('input-entreprise').value;
        const destinataire = document.getElementById('input-destinataire').value;

        // 2. Call Supabase Edge Function
        const { data, error } = await supabaseClient.functions.invoke('generate-motivation', {
            body: {
                firstName: prenom,
                lastName: nom,
                jobTitle: poste,
                companyName: entreprise,
                addressedTo: destinataire,
                cvImageBase64: b64Str,
                mimeType: mimeType
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
            
            document.getElementById('doc-demande').innerHTML = generatedDemandeHtml;
            document.getElementById('doc-motivation').innerHTML = generatedMotivationHtml;
            
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
                amount: 500, // 500 FCFA as requested
                currency: "XOF",
                orderReference: "MOTIVATION-" + Date.now(),
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
