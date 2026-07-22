/**
 * CV PRO - Authentication Guard & Middleware
 * Vérifie et sécurise l'accès aux pages de l'application
 */

const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
let supabaseClient = null;

// Initialiser le client Supabase globalement (avec protection Try/Catch complète)
if (window.supabase) {
    let supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';
    try {
        const storedKey = localStorage.getItem('supabase_anon_key');
        if (storedKey) supabaseKey = storedKey;
    } catch(e) {
        console.warn("Storage access restricted");
    }

    try {
        if (!window.supabaseAuthClient) {
            window.supabaseAuthClient = window.supabase.createClient(SUPABASE_URL, supabaseKey);
        }
        supabaseClient = window.supabaseAuthClient;
    } catch(e) {
        console.warn("Erreur d'initialisation de Supabase Client dans auth-guard:", e);
    }
}

/**
 * Exécuter la vérification de la session
 */
async function checkAuthGuard(requireAuth = false) {
    if (!supabaseClient) return null;

    try {
        const { data, error } = await supabaseClient.auth.getSession();
        const session = data ? data.session : null;
        
        if (error) {
            console.warn("Auth Guard Session Info:", error.message);
        }

        const user = session ? session.user : null;
        updateAuthUI(user);

        if (requireAuth && !user) {
            console.warn("Accès refusé : Utilisateur non authentifié.");
            const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `auth.html?redirect=${currentPath}`;
            return null;
        }

        return user;
    } catch (err) {
        console.warn("Auth Guard Check Handled:", err);
        return null;
    }
}

/**
 * Mettre à jour l'interface (Header, Bouton Connexion / Profil)
 */
function updateAuthUI(user) {
    try {
        const authBtn = document.getElementById('nav-auth-btn') || document.querySelector('.btn-auth');
        if (authBtn) {
            if (user) {
                authBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${user.email ? user.email.split('@')[0] : 'Profil'} <i class="fa-solid fa-right-from-bracket" title="Déconnexion" style="margin-left:8px; cursor:pointer;" onclick="logoutUser(event)"></i>`;
                authBtn.href = "#";
            } else {
                authBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Connexion`;
                authBtn.href = "auth.html";
            }
        }
    } catch(e) {}
}

/**
 * Fonction de déconnexion globale
 */
async function logoutUser(event) {
    if (event) event.preventDefault();
    if (supabaseClient) {
        try {
            await supabaseClient.auth.signOut();
        } catch(e) {}
        window.location.reload();
    }
}

// Auto-exécution au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    try {
        const isProtectedPage = document.body.hasAttribute('data-require-auth');
        checkAuthGuard(isProtectedPage);
    } catch(e) {
        console.warn("Auth guard DOM listener error handled:", e);
    }
});
