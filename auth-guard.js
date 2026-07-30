/**
 * CV PRO - Authentication Guard & Middleware (Encapsulated IIFE)
 * Vérifie et sécurise l'accès aux pages de l'application sans créer de conflit global
 */
(function() {
    const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';
    const ADMIN_EMAILS = ['ngalagne84@gmail.com'];
    
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

    window.checkIsAdminUser = function(user) {
        if (!user || !user.email) return false;
        const email = user.email.toLowerCase().trim();
        return ADMIN_EMAILS.includes(email);
    };

    async function checkAuthGuard(requireAuth) {
        if (!authClient) return null;
        try {
            const { data } = await authClient.auth.getSession();
            const user = data?.session?.user || null;
            updateAuthUI(user);

            // Vérification spécifique pour la page d'administration
            const isAdminPage = window.location.pathname.endsWith('admin.html');
            if (isAdminPage) {
                const isAdmin = window.checkIsAdminUser(user);
                if (!isAdmin) {
                    const renderAccessDeniedUI = () => {
                        const adminContainer = document.querySelector('.admin-container') || document.body;
                        if (adminContainer) {
                            adminContainer.innerHTML = `
                                <div style="max-width: 540px; margin: 4rem auto; padding: 2.5rem 2rem; background: var(--surface); border: 1px solid #EF4444; border-radius: var(--radius-xl); text-align: center; box-shadow: 0 10px 30px rgba(239,68,68,0.25);">
                                    <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(239,68,68,0.15); color: #EF4444; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 1.5rem;">
                                        <i class="fa-solid fa-lock"></i>
                                    </div>
                                    <h2 style="color: var(--title-color); margin: 0 0 0.75rem 0; font-size: 1.5rem; font-weight: 800;">⛔ Accès Restreint - Zone Admin</h2>
                                    <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.75rem;">
                                        Ce tableau de bord financier et analytique est exclusivement réservé à l'administrateur du site.
                                        ${user ? `<br><br>Compte actuel non autorisé : <code style="background: rgba(0,0,0,0.2); padding: 0.2rem 0.5rem; border-radius: 4px; color: #EF4444;">${user.email}</code>` : '<br><br>Veuillez vous connecter avec un compte administrateur autorisé.'}
                                    </p>
                                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                                        <a href="auth.html?redirect=admin.html" class="btn btn-pill-navy-red" style="font-size: 0.9rem; text-decoration: none;">
                                            <i class="fa-solid fa-right-to-bracket"></i> Connexion Administrateur
                                        </a>
                                        <a href="index.html" class="btn btn-ghost" style="padding: 0.65rem 1.2rem; border: 1px solid var(--border); color: var(--text-main); border-radius: 50px; text-decoration: none; font-weight: 600;">
                                            <i class="fa-solid fa-house"></i> Retour à l'accueil
                                        </a>
                                    </div>
                                </div>
                            `;
                        }
                    };
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', renderAccessDeniedUI);
                    } else {
                        renderAccessDeniedUI();
                    }
                }
            } else if (requireAuth && !user) {
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
            const isAdmin = window.checkIsAdminUser(user);
            const adminLinks = document.querySelectorAll('.admin-only-link');
            
            adminLinks.forEach(link => {
                if (isAdmin) {
                    link.style.setProperty('display', 'inline-flex', 'important');
                } else {
                    link.style.setProperty('display', 'none', 'important');
                }
            });

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
