/**
 * CV PRO - Authentication Guard & Middleware (Encapsulated IIFE)
 * Vérifie et sécurise l'accès aux pages de l'application sans créer de conflit global
 */
(function() {
    const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';
    
    try {
        localStorage.setItem('supabase_anon_key', supabaseKey);
    } catch(e) {}

    let authClient = null;
    if (window.supabase) {
        try {
            if (!window.supabaseAuthClient) {
                window.supabaseAuthClient = window.supabase.createClient(SUPABASE_URL, supabaseKey);
            }
            authClient = window.supabaseAuthClient;
        } catch(e) {}
    }

    async function checkAuthGuard(requireAuth) {
        if (!authClient) return null;
        try {
            const { data } = await authClient.auth.getSession();
            const user = data?.session?.user || null;
            updateAuthUI(user);
            if (requireAuth && !user) {
                const currentPath = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `auth.html?redirect=${currentPath}`;
            }
            return user;
        } catch(e) {
            return null;
        }
    }

    function updateAuthUI(user) {
        try {
            const authBtn = document.getElementById('nav-auth-btn') || document.querySelector('.btn-auth');
            if (authBtn) {
                if (user) {
                    authBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${user.email ? user.email.split('@')[0] : 'Profil'} <i class="fa-solid fa-right-from-bracket" title="Déconnexion" style="margin-left:8px; cursor:pointer;" onclick="window.logoutUser(event)"></i>`;
                    authBtn.href = "#";
                } else {
                    authBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Connexion`;
                    authBtn.href = "auth.html";
                }
            }
        } catch(e) {}
    }

    window.logoutUser = async function(event) {
        if (event) event.preventDefault();
        if (authClient) {
            try { await authClient.auth.signOut(); } catch(e) {}
            window.location.reload();
        }
    };

    const runGuard = () => {
        const isProtectedPage = document.body && document.body.hasAttribute('data-require-auth');
        checkAuthGuard(isProtectedPage);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runGuard);
    } else {
        runGuard();
    }
})();
