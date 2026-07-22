/**
 * CV PRO - Authentication Guard & Middleware
 * Vérifie et sécurise l'accès aux pages de l'application
 */

const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
let supabaseClient = null;

// Initialiser le client Supabase globalement
if (window.supabase) {
    const supabaseKey = localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNm...'; // Clé anon par défaut si configurée
    // Auto-détecter et initialiser
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
 * @param {boolean} requireAuth - Si true, redirige vers auth.html si l'utilisateur n'est pas connecté
 */
async function checkAuthGuard(requireAuth = false) {
    if (!supabaseClient) return null;

    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error("Auth Guard Session Error:", error.message);
        }

        const user = session ? session.user : null;

        // Mettre à jour les éléments d'interface selon l'état de la connexion
        updateAuthUI(user);

        if (requireAuth && !user) {
            console.warn("Accès refusé : Utilisateur non authentifié. Redirection vers auth.html...");
            const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `auth.html?redirect=${currentPath}`;
            return null;
        }

        return user;
    } catch (err) {
        console.error("Auth Guard Check Failed:", err);
        return null;
    }
}

/**
 * Mettre à jour l'interface (Header, Bouton Connexion / Profil)
 */
function updateAuthUI(user) {
    const authBtn = document.getElementById('nav-auth-btn') || document.querySelector('.btn-auth');
    if (authBtn) {
        if (user) {
            authBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${user.email.split('@')[0]} <i class="fa-solid fa-right-from-bracket" title="Déconnexion" style="margin-left:8px; cursor:pointer;" onclick="logoutUser(event)"></i>`;
            authBtn.href = "#";
        } else {
            authBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Connexion`;
            authBtn.href = "auth.html";
        }
    }
}

/**
 * Fonction de déconnexion globale
 */
async function logoutUser(event) {
    if (event) event.preventDefault();
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
        window.location.reload();
    }
}

// Auto-exécution au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    // Détecter si la page nécessite une connexion obligatoire
    const isProtectedPage = document.body.hasAttribute('data-require-auth');
    checkAuthGuard(isProtectedPage);
});
