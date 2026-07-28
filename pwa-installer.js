let deferredPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA Service Worker enregistré :', reg.scope))
      .catch(err => console.error('Erreur Service Worker :', err));
  });
}

// Create and inject PWA Install Banner UI
function createPwaInstallBanner() {
  if (document.getElementById('pwa-install-modal')) {
    document.getElementById('pwa-install-modal').style.display = 'flex';
    return;
  }

  const modalHtml = `
    <div id="pwa-install-modal" style="display: flex; position: fixed; bottom: 15px; left: 50%; transform: translateX(-50%); width: 92%; max-width: 440px; background: rgba(14, 20, 36, 0.98); backdrop-filter: blur(16px); border: 2px solid #4F46E5; border-radius: 20px; padding: 1rem 1.25rem; z-index: 999999; box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 25px rgba(79, 70, 229, 0.5); align-items: center; gap: 0.85rem; font-family: 'Inter', sans-serif;">
      <div style="flex-shrink: 0; width: 62px; height: 62px; border-radius: 50%; overflow: hidden; border: 2px solid #4F46E5; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
        <img src="./icon-192.png" alt="NovaDoc Logo" style="width: 100%; height: 100%; object-fit: cover;">
      </div>
      <div style="flex: 1; min-width: 0;">
        <h4 style="margin: 0; color: #FFFFFF; font-size: 0.95rem; font-weight: 800; font-family: 'Outfit', sans-serif;">Installer l'application NovaDoc</h4>
        <p style="margin: 3px 0 0 0; color: #A5B4FC; font-size: 0.78rem; line-height: 1.25;">Tous vos documents professionnels & CV en 1 clic sur votre mobile !</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.35rem; flex-shrink: 0;">
        <button id="pwa-install-btn" style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; border: none; padding: 0.55rem 0.85rem; border-radius: 10px; font-weight: 700; font-size: 0.82rem; cursor: pointer; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); white-space: nowrap;">
          <i class="fa-solid fa-download"></i> Installer
        </button>
        <button onclick="dismissPwaPrompt()" style="background: transparent; color: #94A3B8; border: none; font-size: 0.72rem; cursor: pointer; text-decoration: underline; text-align: center;">
          Fermer
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Résultat de l'installation : ${outcome}`);
      deferredPrompt = null;
      dismissPwaPrompt();
    } else {
      // Direct instructions for iOS or desktop browsers where beforeinstallprompt didn't trigger
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        alert("Pour installer NovaDoc sur iPhone/iPad :\n\n1. Appuyez sur le bouton 'Partager' (icône carrée avec une flèche vers le haut).\n2. Défilez vers le bas et sélectionnez 'Sur l'écran d'accueil'.");
      } else {
        alert("Pour installer NovaDoc :\n\nCliquez sur le menu de votre navigateur (3 petits points en haut à droite) puis choisissez 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
      }
    }
  });
}

function dismissPwaPrompt() {
  const modal = document.getElementById('pwa-install-modal');
  if (modal) modal.style.display = 'none';
}
window.dismissPwaPrompt = dismissPwaPrompt;

// Catch install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  createPwaInstallBanner();
});

// Show banner on mobile automatically if not already installed
document.addEventListener('DOMContentLoaded', () => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (!isStandalone) {
    // Show prompt automatically after 1.5 seconds on mobile devices
    setTimeout(() => {
      createPwaInstallBanner();
    }, 1500);
  }
});
