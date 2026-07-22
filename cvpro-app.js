/**
 * CV PRO 500 - Application Logic (Ultra Fail-Safe Version)
 */

// Safe Storage Helpers
function safeGet(key) {
    try {
        return localStorage.getItem(key);
    } catch(e) {
        return null;
    }
}
function safeSet(key, val) {
    try {
        localStorage.setItem(key, val);
    } catch(e) {}
}

// Initial State
let cvData = {
    personal: {
        firstName: 'Moussa',
        lastName: 'Diop',
        jobTitle: 'Assistant Administratif et Commercial',
        email: 'moussa.diop@example.com',
        phone: '+221 77 123 45 67',
        city: 'Dakar, Sénégal',
        linkedin: 'linkedin.com/in/moussadiop',
        photo: null
    },
    profile: {
        summary: 'Professionnel dynamique avec 3 ans d\'expérience dans la gestion administrative, l\'accueil et le service client. Reconnu pour mon organisation, ma rigueur et ma capacité à m\'adapter rapidement à de nouveaux environnements.'
    },
    education: [
        { id: 1, studyType: 'Études Primaires', school: 'École Primaire Point E 1', degree: 'CFEE', year: '6 ans' },
        { id: 2, studyType: 'Études Secondaires', school: 'CEM David Diop', degree: 'BFEM', year: '4 ans' },
        { id: 3, studyType: 'Lycée', school: 'Lycée Blaise Diagne', degree: 'Baccalauréat Série L2', year: '3 ans' },
        { id: 4, studyType: 'Études Supérieures', school: 'Université Cheikh Anta Diop (UCAD)', degree: 'Licence en Gestion (FASEG)', year: '3 ans' }
    ],
    formations: [
        { id: 1, title: 'Formation en Secrétariat Bureautique', institution: 'Chambre de Commerce de Dakar', startDate: 'Janv 2022', endDate: 'Juin 2022', description: 'Apprentissage de la gestion du courrier, du classement et des outils de bureau.' },
        { id: 2, title: 'Certificat en Marketing Digital', institution: 'ONFP Sénégal', startDate: 'Sept 2021', endDate: 'Nov 2021', description: 'Techniques de communication et vente sur les réseaux sociaux.' },
        { id: 3, title: 'Formation en Entrepreneuriat', institution: 'ADEPME', startDate: 'Avril 2021', endDate: 'Juin 2021', description: 'Création de PME, élaboration de business plan et stratégie de vente.' },
        { id: 4, title: 'Séminaire en Techniques de Vente', institution: 'Cabinet Cible RH', startDate: 'Fév 2021', endDate: 'Mars 2021', description: 'Formation pratique sur la prospection, la négociation et la fidélisation client.' }
    ],
    experiences: [
        { id: 1, title: 'Assistant Commercial', company: 'Sonatel', startDate: 'Août 2022', endDate: 'Présent', description: 'Accueil des clients, traitement des réclamations et promotion des offres.' },
        { id: 2, title: 'Stagiaire en Administration', company: 'SENELEC', startDate: 'Sept 2021', endDate: 'Déc 2021', description: 'Classement des dossiers, saisie de données et appui aux ressources humaines.' }
    ],
    skills: [
        { id: 1, name: 'Maîtrise du Pack Office (Word, Excel)' },
        { id: 2, name: 'Gestion de la relation client' },
        { id: 3, name: 'Accueil physique et téléphonique' },
        { id: 4, name: 'Techniques de vente et négociation' },
        { id: 5, name: 'Rédaction de courriers administratifs' },
        { id: 6, name: 'Gestion des réseaux sociaux' }
    ],
    languages: [
        { id: 1, name: 'Français', level: 'Courant' },
        { id: 2, name: 'Anglais', level: 'Intermédiaire' },
        { id: 3, name: 'Arabe', level: 'Lu et écrit' },
        { id: 4, name: 'Wolof', level: 'Langue Maternelle' },
        { id: 5, name: 'Sérère', level: 'Bien parlé' },
        { id: 6, name: 'Pulaar', level: 'Notions de base' }
    ],
    interests: [
        { id: 1, name: 'Bénévolat et associatif' },
        { id: 2, name: 'Sport (Football, Basket)' },
        { id: 3, name: 'Nouvelles technologies' },
        { id: 4, name: 'Voyages et découverte' }
    ],
    references: []
};

// Supabase Configuration
const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = safeGet('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';
let supabaseClient = null;
let currentUserId = null;
let cloudDocumentId = null;
let saveTimeout = null;
let currentZoom = 0.8;

// Helper to sanitize and guarantee all cvData fields exist
function sanitizeCvData(raw) {
    const defaultData = {
        personal: {
            firstName: 'Moussa',
            lastName: 'Diop',
            jobTitle: 'Assistant Administratif et Commercial',
            email: 'moussa.diop@example.com',
            phone: '+221 77 123 45 67',
            city: 'Dakar, Sénégal',
            linkedin: 'linkedin.com/in/moussadiop',
            photo: null
        },
        profile: {
            summary: 'Professionnel dynamique avec 3 ans d\'expérience dans la gestion administrative...'
        },
        education: [],
        formations: [],
        experiences: [],
        skills: [],
        languages: [],
        interests: [],
        references: []
    };

    if (!raw || typeof raw !== 'object') return cvData;

    return {
        personal: {
            firstName: raw.personal?.firstName ?? cvData.personal?.firstName ?? '',
            lastName: raw.personal?.lastName ?? cvData.personal?.lastName ?? '',
            jobTitle: raw.personal?.jobTitle ?? cvData.personal?.jobTitle ?? '',
            email: raw.personal?.email ?? cvData.personal?.email ?? '',
            phone: raw.personal?.phone ?? cvData.personal?.phone ?? '',
            city: raw.personal?.city ?? cvData.personal?.city ?? '',
            linkedin: raw.personal?.linkedin ?? cvData.personal?.linkedin ?? '',
            photo: raw.personal?.photo || null
        },
        profile: {
            summary: raw.profile?.summary ?? cvData.profile?.summary ?? ''
        },
        education: Array.isArray(raw.education) ? raw.education : (Array.isArray(cvData.education) ? cvData.education : []),
        formations: Array.isArray(raw.formations) ? raw.formations : (Array.isArray(cvData.formations) ? cvData.formations : []),
        experiences: Array.isArray(raw.experiences) ? raw.experiences : (Array.isArray(cvData.experiences) ? cvData.experiences : []),
        skills: Array.isArray(raw.skills) ? raw.skills : (Array.isArray(cvData.skills) ? cvData.skills : []),
        languages: Array.isArray(raw.languages) ? raw.languages : (Array.isArray(cvData.languages) ? cvData.languages : []),
        interests: Array.isArray(raw.interests) ? raw.interests : (Array.isArray(cvData.interests) ? cvData.interests : []),
        references: Array.isArray(raw.references) ? raw.references : (Array.isArray(cvData.references) ? cvData.references : [])
    };
}

// Initialize app safely
function initApp() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('payment') === 'success') {
            alert("Paiement réussi avec SenePay ! Votre CV va être généré et téléchargé automatiquement.");
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => {
                if (typeof generatePDF === 'function') generatePDF();
            }, 1500);
        } else if (urlParams.get('payment') === 'cancel') {
            alert("Le paiement SenePay a été annulé.");
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const localData = safeGet('cvpro_data');
        if (localData) {
            try {
                const parsedLocal = JSON.parse(localData);
                cvData = sanitizeCvData(parsedLocal);
            } catch (e) {}
        }

        cvData = sanitizeCvData(cvData);
        
        initTabs();
        renderForms();
        renderCV();
        setupTemplateSelector();
        setupPaymentListeners();

        if (window.supabase) {
            try {
                supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
                initCloud().then(() => {
                    cvData = sanitizeCvData(cvData);
                    renderForms();
                    renderCV();
                });
            } catch(e) {
                console.warn("Supabase init handled:", e);
            }
        }
    } catch(err) {
        console.warn("Main init handled:", err);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

async function initCloud() {
    try {
        if (!supabaseClient) return;
        const { data: authData } = await supabaseClient.auth.getSession();
        
        if (!authData || !authData.session) {
            const btnLogin = document.getElementById('btn-login');
            if (btnLogin) btnLogin.style.display = 'inline-flex';
            return;
        }
        
        currentUserId = authData.session.user.id;
        
        const userMenu = document.getElementById('builder-user-menu');
        const userEmail = document.getElementById('builder-user-email');
        const btnLogin = document.getElementById('btn-login');
        
        if (userMenu && userEmail) {
            userMenu.style.display = 'flex';
            userEmail.innerText = authData.session.user.email;
            if (btnLogin) btnLogin.style.display = 'none';
        }
        
        window.handleLogout = async () => {
            try { await supabaseClient.auth.signOut(); } catch(e) {}
            window.location.href = "index.html";
        };

        let cvDoc = null;
        const { data: userCvData } = await supabaseClient
            .from('user_cvs')
            .select('*')
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (userCvData) {
            cvDoc = userCvData;
        } else {
            const { data: legacyDoc } = await supabaseClient
                .from('cv_documents')
                .select('*')
                .eq('user_id', currentUserId)
                .maybeSingle();
            if (legacyDoc) cvDoc = legacyDoc;
        }

        if (cvDoc && cvDoc.cv_data) {
            cloudDocumentId = cvDoc.id;
            cvData = sanitizeCvData(cvDoc.cv_data);
        }
    } catch (err) {
        console.warn("Cloud Init Handled:", err);
    }
}

function triggerCloudSave() {
    safeSet('cvpro_data', JSON.stringify(cvData));

    if (!supabaseClient || !currentUserId) return;
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            const payload = {
                user_id: currentUserId,
                cv_data: cvData,
                updated_at: new Date().toISOString()
            };
            if (cloudDocumentId) payload.id = cloudDocumentId;

            const { data } = await supabaseClient
                .from('cv_documents')
                .upsert(payload)
                .select()
                .single();
                
            if (data && !cloudDocumentId) {
                cloudDocumentId = data.id;
            }
        } catch (err) {}
    }, 1500);
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.onclick = function(e) {
            if (e) e.preventDefault();
            const stepNumber = this.dataset.step || this.getAttribute('data-step');
            
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.step-section').forEach(sec => {
                sec.classList.remove('active');
                sec.style.display = 'none';
            });
            
            const targetStep = document.getElementById(`step-${stepNumber}`);
            if (targetStep) {
                targetStep.classList.add('active');
                targetStep.style.display = 'block';
            }
        };
    });
}

function renderForms() {
    const container = document.getElementById('form-container');
    if (!container) return;
    
    // Check if form is already rendered statically
    const step1 = document.getElementById('step-1');
    if (!step1) {
        container.innerHTML = `
            <!-- Step 1: Infos -->
            <div id="step-1" class="step-section active" style="display: block;">
                <h3 class="step-title">1. Informations Personnelles</h3>
                <div class="form-group">
                    <label>Photo de profil</label>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 0.5rem; background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px dashed #cbd5e1;">
                        <img id="photo-preview" src="${cvData.personal?.photo || ''}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); display: ${cvData.personal?.photo ? 'block' : 'none'};">
                        <div style="flex:1;">
                            <label for="cv-photo-upload" style="display: inline-block; background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 500; text-align: center; width: 100%; box-sizing: border-box;">
                                <i class="fa-solid fa-camera"></i> Choisir une photo
                            </label>
                            <input id="cv-photo-upload" type="file" accept="image/*" onchange="handlePhotoUpload(event)" style="display: none;">
                        </div>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Prénom</label><br><small style="color:#888;font-size:0.75rem;">Ex: Aminata</small>
                        <input type="text" class="form-control" data-section="personal" data-field="firstName" value="${cvData.personal?.firstName || ''}" oninput="updateData(event)" placeholder="Votre prénom">
                    </div>
                    <div class="form-group">
                        <label>Nom</label><br><small style="color:#888;font-size:0.75rem;">Ex: Sow</small>
                        <input type="text" class="form-control" data-section="personal" data-field="lastName" value="${cvData.personal?.lastName || ''}" oninput="updateData(event)" placeholder="Votre nom de famille">
                    </div>
                </div>
                <div class="form-group">
                    <label>Titre Professionnel</label><br><small style="color:#888;font-size:0.75rem;">Ex: Responsable Marketing, Développeur Web...</small>
                    <input type="text" class="form-control" data-section="personal" data-field="jobTitle" value="${cvData.personal?.jobTitle || ''}" oninput="updateData(event)" placeholder="Le poste que vous visez">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label><br><small style="color:#888;font-size:0.75rem;">Ex: aminata.sow@email.com</small>
                        <input type="email" class="form-control" data-section="personal" data-field="email" value="${cvData.personal?.email || ''}" oninput="updateData(event)" placeholder="Votre adresse email">
                    </div>
                    <div class="form-group">
                        <label>Téléphone</label><br><small style="color:#888;font-size:0.75rem;">Ex: +221 77 000 00 00</small>
                        <input type="text" class="form-control" data-section="personal" data-field="phone" value="${cvData.personal?.phone || ''}" oninput="updateData(event)" placeholder="Votre numéro de téléphone">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Ville / Adresse</label><br><small style="color:#888;font-size:0.75rem;">Ex: Dakar, Sénégal</small>
                        <input type="text" class="form-control" data-section="personal" data-field="city" value="${cvData.personal?.city || ''}" oninput="updateData(event)" placeholder="Votre lieu de résidence">
                    </div>
                    <div class="form-group">
                        <label>LinkedIn</label><br><small style="color:#888;font-size:0.75rem;">Ex: linkedin.com/in/aminatasow (Optionnel)</small>
                        <input type="text" class="form-control" data-section="personal" data-field="linkedin" value="${cvData.personal?.linkedin || ''}" oninput="updateData(event)" placeholder="Lien vers votre profil">
                    </div>
                </div>
            </div>

            <!-- Step 2: Profil -->
            <div id="step-2" class="step-section" style="display: none;">
                <h3 class="step-title">2. Profil Professionnel</h3>
                <div class="form-group">
                    <label>Description courte de votre parcours</label><br><small style="color:#888;font-size:0.75rem;">Résumez en 2-3 phrases vos années d'expérience, vos atouts majeurs et ce que vous recherchez.</small>
                    <textarea class="form-control" data-section="profile" data-field="summary" oninput="updateData(event)" placeholder="Ex: Professionnel motivé avec 5 ans d'expérience...">${cvData.profile?.summary || ''}</textarea>
                </div>
            </div>

            <!-- Step 3: Études -->
            <div id="step-3" class="step-section" style="display: none;">
                <h3 class="step-title">3. Études</h3>
                <div id="education-list" class="dynamic-list"></div>
                <button class="btn-add" onclick="addDynamicItem('education')"><i class="fa-solid fa-plus"></i> Ajouter une étude</button>
            </div>

            <!-- Step 4: Formations -->
            <div id="step-4" class="step-section" style="display: none;">
                <h3 class="step-title">4. Formations</h3>
                <div id="formations-list" class="dynamic-list"></div>
                <button class="btn-add" onclick="addDynamicItem('formations')"><i class="fa-solid fa-plus"></i> Ajouter une formation</button>
            </div>

            <!-- Step 5: Expériences -->
            <div id="step-5" class="step-section" style="display: none;">
                <h3 class="step-title">5. Expériences Professionnelles</h3>
                <div id="experiences-list" class="dynamic-list"></div>
                <button class="btn-add" onclick="addDynamicItem('experiences')"><i class="fa-solid fa-plus"></i> Ajouter une expérience</button>
            </div>
            
            <!-- Step 6: Compétences -->
            <div id="step-6" class="step-section" style="display: none;">
                <h3 class="step-title">6. Compétences</h3>
                <div id="skills-list" class="dynamic-list"></div>
                <button class="btn-add" onclick="addDynamicItem('skills')"><i class="fa-solid fa-plus"></i> Ajouter une compétence</button>
            </div>

            <!-- Step 7: Langues -->
            <div id="step-7" class="step-section" style="display: none;">
                <h3 class="step-title">7. Langues</h3>
                <div id="languages-list" class="dynamic-list"></div>
                <button class="btn-add" onclick="addDynamicItem('languages')"><i class="fa-solid fa-plus"></i> Ajouter une langue</button>
            </div>

            <!-- Step 8: Intérêts -->
            <div id="step-8" class="step-section" style="display: none;">
                <h3 class="step-title">8. Centres d'intérêt</h3>
                <div id="interests-list" class="dynamic-list"></div>
                <button class="btn-add" onclick="addDynamicItem('interests')"><i class="fa-solid fa-plus"></i> Ajouter un intérêt</button>
            </div>

            <!-- Step 9: Références -->
            <div id="step-9" class="step-section" style="display: none;">
                <h3 class="step-title">9. Références</h3>
                <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">Optionnel. Vous pouvez ajouter "Sur demande" ou lister des contacts.</p>
                <div class="form-group">
                    <textarea class="form-control" data-section="personal" data-field="references" oninput="updateData(event)" placeholder="Références disponibles sur demande..."></textarea>
                </div>
            </div>
        `;
    }

    renderDynamicLists();
}

function renderDynamicLists() {
    renderList('experiences', (item) => `
        <div class="form-group"><input type="text" class="form-control" placeholder="Poste (ex: Développeur Web)" value="${item.title || ''}" oninput="updateListItem(event, 'experiences', ${item.id}, 'title')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Entreprise" value="${item.company || ''}" oninput="updateListItem(event, 'experiences', ${item.id}, 'company')"></div>
        <div class="form-row">
            <div class="form-group"><input type="text" class="form-control" placeholder="De (ex: 2021)" value="${item.startDate || ''}" oninput="updateListItem(event, 'experiences', ${item.id}, 'startDate')"></div>
            <div class="form-group"><input type="text" class="form-control" placeholder="À (ex: Présent)" value="${item.endDate || ''}" oninput="updateListItem(event, 'experiences', ${item.id}, 'endDate')"></div>
        </div>
        <div class="form-group"><textarea class="form-control" placeholder="Description des tâches" oninput="updateListItem(event, 'experiences', ${item.id}, 'description')">${item.description || ''}</textarea></div>
    `);

    renderList('education', (item) => `
        <div class="form-group"><input type="text" class="form-control" placeholder="Étude (ex: Primaire, Supérieure...)" value="${item.studyType || ''}" oninput="updateListItem(event, 'education', ${item.id}, 'studyType')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Établissement" value="${item.school || ''}" oninput="updateListItem(event, 'education', ${item.id}, 'school')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Diplôme" value="${item.degree || ''}" oninput="updateListItem(event, 'education', ${item.id}, 'degree')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Année (ex: 2021 ou '3 ans')" value="${item.year || ''}" oninput="updateListItem(event, 'education', ${item.id}, 'year')"></div>
    `);

    renderList('formations', (item) => `
        <div class="form-group"><input type="text" class="form-control" placeholder="Formation (ex: Certificat en Secourisme)" value="${item.title || ''}" oninput="updateListItem(event, 'formations', ${item.id}, 'title')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Centre / Institution" value="${item.institution || ''}" oninput="updateListItem(event, 'formations', ${item.id}, 'institution')"></div>
        <div class="form-row">
            <div class="form-group"><input type="text" class="form-control" placeholder="De (ex: Mars 2021)" value="${item.startDate || ''}" oninput="updateListItem(event, 'formations', ${item.id}, 'startDate')"></div>
            <div class="form-group"><input type="text" class="form-control" placeholder="À (ex: Juin 2021)" value="${item.endDate || ''}" oninput="updateListItem(event, 'formations', ${item.id}, 'endDate')"></div>
        </div>
        <div class="form-group"><textarea class="form-control" placeholder="Description des apprentissages" oninput="updateListItem(event, 'formations', ${item.id}, 'description')">${item.description || ''}</textarea></div>
    `);
    
    renderList('skills', (item) => `
        <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Compétence (ex: React.js)" value="${item.name || ''}" oninput="updateListItem(event, 'skills', ${item.id}, 'name')"></div>
    `);
    
    renderList('languages', (item) => `
        <div class="form-row" style="margin-bottom:0;">
            <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Langue" value="${item.name || ''}" oninput="updateListItem(event, 'languages', ${item.id}, 'name')"></div>
            <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Niveau" value="${item.level || ''}" oninput="updateListItem(event, 'languages', ${item.id}, 'level')"></div>
        </div>
    `);
    
    renderList('interests', (item) => `
        <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Centre d'intérêt" value="${item.name || ''}" oninput="updateListItem(event, 'interests', ${item.id}, 'name')"></div>
    `);
}

function renderList(section, templateFn) {
    const container = document.getElementById(`${section}-list`);
    if (!container || !Array.isArray(cvData[section])) return;
    
    container.innerHTML = '';
    cvData[section].forEach(item => {
        const div = document.createElement('div');
        div.className = 'dynamic-item';
        div.innerHTML = `
            <button class="btn-remove" onclick="removeDynamicItem('${section}', ${item.id})" title="Supprimer"><i class="fa-solid fa-xmark"></i></button>
            ${templateFn(item)}
        `;
        container.appendChild(div);
    });
}

function updateData(e) {
    const sec = e.target.dataset.section;
    const field = e.target.dataset.field;
    if (!cvData[sec]) cvData[sec] = {};
    cvData[sec][field] = e.target.value;
    renderCV();
    triggerCloudSave();
}

function updateListItem(e, section, id, field) {
    if (!Array.isArray(cvData[section])) return;
    const item = cvData[section].find(i => i.id === id);
    if (item) {
        item[field] = e.target.value;
        renderCV();
        triggerCloudSave();
    }
}

function addDynamicItem(section) {
    if (!Array.isArray(cvData[section])) cvData[section] = [];
    const newId = cvData[section].length > 0 ? Math.max(...cvData[section].map(i => i.id || 0)) + 1 : 1;
    cvData[section].push({ id: newId, name: '', title: '', degree: '' });
    renderDynamicLists();
    renderCV();
    triggerCloudSave();
}

function removeDynamicItem(section, id) {
    if (!Array.isArray(cvData[section])) return;
    cvData[section] = cvData[section].filter(i => i.id !== id);
    renderDynamicLists();
    renderCV();
    triggerCloudSave();
}

function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            if (!cvData.personal) cvData.personal = {};
            cvData.personal.photo = event.target.result;
            const preview = document.getElementById('photo-preview');
            if(preview) {
                preview.src = event.target.result;
                preview.style.display = 'block';
            }
            renderCV();
            triggerCloudSave();
        };
        reader.readAsDataURL(file);
    }
}

// Preview Engine
function renderCV() {
    const doc = document.getElementById('cv-document');
    if (!doc) return;
    const p = cvData.personal || {};
    
    const templateEl = document.getElementById('template-select');
    const template = templateEl ? templateEl.value : 'modern';
    doc.className = `cv-page-container cv-template-${template}`;
    
    let html = '';
    
    if (template === 'modern') {
        html = `
            <div class="cv-header">
                ${p.photo ? `<div class="cv-profile-pic" style="margin-right: 25px;"><img src="${p.photo}" alt="Profil" style="width: 110px; height: 110px; border-radius: 50%; object-fit: cover; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>` : ''}
                <div class="cv-header-name" style="flex: 1;">
                    <h1>${p.firstName || 'Prénom'} <span class="text-primary">${p.lastName || 'Nom'}</span></h1>
                    <h2>${p.jobTitle || 'Titre Professionnel'}</h2>
                </div>
                <div class="cv-header-contact">
                    ${p.email ? `<div><i class="fa-solid fa-envelope"></i> ${p.email}</div>` : ''}
                    ${p.phone ? `<div><i class="fa-solid fa-phone"></i> ${p.phone}</div>` : ''}
                    ${p.city ? `<div><i class="fa-solid fa-location-dot"></i> ${p.city}</div>` : ''}
                    ${p.linkedin ? `<div><i class="fa-brands fa-linkedin"></i> ${p.linkedin}</div>` : ''}
                </div>
            </div>
            
            <div class="cv-body">
                <div class="cv-main">
                    ${cvData.profile?.summary ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Profil</h3>
                        <p class="cv-summary">${cvData.profile.summary}</p>
                    </div>` : ''}
                    
                    ${cvData.education?.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Études</h3>
                        ${cvData.education.map(e => `
                            <div class="cv-item">
                                <div class="cv-item-header">
                                    <div class="cv-item-title">${e.studyType ? e.studyType + ' - ' : ''}${e.degree || 'Diplôme'} - <span class="cv-item-company">${e.school || 'Établissement'}</span></div>
                                    <div class="cv-item-date">${e.year || ''}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>` : ''}

                    ${cvData.formations?.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Formations</h3>
                        ${cvData.formations.map(f => `
                            <div class="cv-item">
                                <div class="cv-item-header">
                                    <div class="cv-item-title">${f.title || 'Formation'} - <span class="cv-item-company">${f.institution || 'Institution'}</span></div>
                                    <div class="cv-item-date">${f.startDate || ''} ${f.endDate ? '- ' + f.endDate : ''}</div>
                                </div>
                                <p class="cv-item-desc">${f.description || ''}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}

                    ${cvData.experiences?.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Expérience Professionnelle</h3>
                        ${cvData.experiences.map(e => `
                            <div class="cv-item">
                                <div class="cv-item-header">
                                    <div class="cv-item-title">${e.title || 'Poste'} - <span class="cv-item-company">${e.company || 'Entreprise'}</span></div>
                                    <div class="cv-item-date">${e.startDate || ''} ${e.endDate ? '- ' + e.endDate : ''}</div>
                                </div>
                                <p class="cv-item-desc">${e.description || ''}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}
                </div>
                
                <div class="cv-sidebar">
                    ${cvData.skills?.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Compétences</h3>
                        <div class="cv-skills-list">
                            ${cvData.skills.map(s => s.name ? `<span class="cv-skill-tag">${s.name}</span>` : '').join('')}
                        </div>
                    </div>` : ''}
                    
                    ${cvData.languages?.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Langues</h3>
                        <ul class="cv-list">
                            ${cvData.languages.map(l => l.name ? `<li><strong>${l.name}</strong> ${l.level ? `<span class="cv-level-text">- ${l.level}</span>` : ''}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                    
                    ${cvData.interests?.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Intérêts</h3>
                        <ul class="cv-list">
                            ${cvData.interests.map(i => i.name ? `<li>${i.name}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    } else if (template === 'classic') {
        html = `
            <div class="cv-classic-header">
                ${p.photo ? `<img src="${p.photo}" class="cv-profile-pic">` : ''}
                <div class="cv-header-text">
                    <h1>${p.firstName || 'Prénom'} ${p.lastName || 'Nom'}</h1>
                    <h2>${p.jobTitle || 'Titre Professionnel'}</h2>
                    <div class="cv-contact-info">
                        ${p.email ? `<span>${p.email}</span>` : ''}
                        ${p.phone ? `<span>${p.phone}</span>` : ''}
                        ${p.city ? `<span>${p.city}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="cv-classic-body">
                ${cvData.profile?.summary ? `
                <div class="cv-section">
                    <h3>Profil</h3>
                    <p>${cvData.profile.summary}</p>
                </div>` : ''}
                
                ${cvData.education?.length > 0 ? `
                <div class="cv-section">
                    <h3>Études</h3>
                    ${cvData.education.map(e => `
                        <div class="cv-item">
                            <div class="cv-item-header">
                                <div class="cv-title">${e.studyType ? e.studyType + ' - ' : ''}${e.degree || 'Diplôme'} - ${e.school || 'Établissement'}</div>
                                <div class="cv-date">${e.year || ''}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>` : ''}

                ${cvData.formations?.length > 0 ? `
                <div class="cv-section">
                    <h3>Formations</h3>
                    ${cvData.formations.map(f => `
                        <div class="cv-item">
                            <div class="cv-item-header">
                                <div class="cv-title">${f.title} - ${f.institution}</div>
                                <div class="cv-date">${f.startDate} ${f.endDate ? '- ' + f.endDate : ''}</div>
                            </div>
                            <p>${f.description}</p>
                        </div>
                    `).join('')}
                </div>` : ''}

                ${cvData.experiences?.length > 0 ? `
                <div class="cv-section">
                    <h3>Expériences</h3>
                    ${cvData.experiences.map(e => `
                        <div class="cv-item">
                            <div class="cv-item-header">
                                <div class="cv-title">${e.title} - ${e.company}</div>
                                <div class="cv-date">${e.startDate} ${e.endDate ? '- ' + e.endDate : ''}</div>
                            </div>
                            <p>${e.description}</p>
                        </div>
                    `).join('')}
                </div>` : ''}
                
                <div class="cv-classic-grid">
                    ${cvData.skills?.length > 0 ? `
                    <div class="cv-section">
                        <h3>Compétences</h3>
                        <ul>
                            ${cvData.skills.map(s => s.name ? `<li>${s.name}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                    ${cvData.languages?.length > 0 ? `
                    <div class="cv-section">
                        <h3>Langues</h3>
                        <ul>
                            ${cvData.languages.map(l => l.name ? `<li>${l.name} ${l.level ? ' - ' + l.level : ''}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    } else if (template === 'minimalist') {
        html = `
            <div class="cv-minimalist-body">
                <div class="cv-header">
                    ${p.photo ? `<img src="${p.photo}" class="cv-profile-pic">` : ''}
                    <div class="cv-header-text">
                        <h1>${p.firstName || 'Prénom'} ${p.lastName || 'Nom'}</h1>
                        <h2>${p.jobTitle || 'Titre Professionnel'}</h2>
                        <div class="cv-contact-info">
                            ${p.email ? `<span>${p.email}</span>` : ''}
                            ${p.phone ? `<span>${p.phone}</span>` : ''}
                            ${p.city ? `<span>${p.city}</span>` : ''}
                            ${p.linkedin ? `<span>${p.linkedin}</span>` : ''}
                        </div>
                    </div>
                </div>
                
                ${cvData.profile?.summary ? `
                <div class="cv-section">
                    <div class="cv-section-left">Profil</div>
                    <div class="cv-section-right"><p>${cvData.profile.summary}</p></div>
                </div>` : ''}
                
                ${cvData.education?.length > 0 ? `
                <div class="cv-section">
                    <div class="cv-section-left">Études</div>
                    <div class="cv-section-right">
                        ${cvData.education.map(e => `
                            <div class="cv-item">
                                <div class="cv-date">${e.year || ''}</div>
                                <div class="cv-content">
                                    <h4>${e.studyType ? e.studyType + ' - ' : ''}${e.degree || 'Diplôme'}</h4>
                                    <div class="cv-company">${e.school || 'Établissement'}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                ${cvData.formations?.length > 0 ? `
                <div class="cv-section">
                    <div class="cv-section-left">Formations</div>
                    <div class="cv-section-right">
                        ${cvData.formations.map(f => `
                            <div class="cv-item">
                                <div class="cv-date">${f.startDate} ${f.endDate ? '- ' + f.endDate : ''}</div>
                                <div class="cv-content">
                                    <h4>${f.title}</h4>
                                    <div class="cv-company">${f.institution}</div>
                                    <p>${f.description || ''}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                ${cvData.experiences?.length > 0 ? `
                <div class="cv-section">
                    <div class="cv-section-left">Expériences</div>
                    <div class="cv-section-right">
                        ${cvData.experiences.map(e => `
                            <div class="cv-item">
                                <div class="cv-date">${e.startDate} ${e.endDate ? '- ' + e.endDate : ''}</div>
                                <div class="cv-content">
                                    <h4>${e.title}</h4>
                                    <div class="cv-company">${e.company}</div>
                                    <p>${e.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
                
                ${cvData.skills?.length > 0 ? `
                <div class="cv-section">
                    <div class="cv-section-left">Compétences</div>
                    <div class="cv-section-right">
                        <div class="cv-skills-list">
                            ${cvData.skills.map(s => s.name ? `<span>${s.name}</span>` : '').join('')}
                        </div>
                    </div>
                </div>` : ''}
            </div>
        `;
    }
    
    doc.innerHTML = html;
}

// Template Switching
function setupTemplateSelector() {
    const select = document.getElementById('template-select');
    if (select) {
        select.onchange = function() {
            renderCV();
        };
    }
    
    const colorPicker = document.getElementById('theme-color');
    if (colorPicker) {
        const cvDoc = document.getElementById('cv-document');
        if (cvDoc) cvDoc.style.setProperty('--primary', colorPicker.value);
        colorPicker.oninput = function(e) {
            if (cvDoc) cvDoc.style.setProperty('--primary', e.target.value);
        };
    }
}

// Zoom Controls
function zoomIn() {
    if (currentZoom < 1.5) {
        currentZoom += 0.1;
        const el = document.getElementById('cv-scale-wrapper');
        if (el) el.style.transform = `scale(${currentZoom})`;
    }
}
function zoomOut() {
    if (currentZoom > 0.4) {
        currentZoom -= 0.1;
        const el = document.getElementById('cv-scale-wrapper');
        if (el) el.style.transform = `scale(${currentZoom})`;
    }
}

// Setup Payment Modal Listeners
function setupPaymentListeners() {
    const btnOpen = document.getElementById('btn-open-payment');
    if (btnOpen) {
        btnOpen.onclick = function(e) {
            if (e) e.preventDefault();
            const modal = document.getElementById('payment-modal');
            if (modal) modal.classList.add('active');
        };
    }
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.classList.remove('active');
}

async function processPayment() {
    const btn = document.getElementById('btn-confirm-payment');
    if (!btn) return;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Redirection SenePay...';
    btn.disabled = true;
    
    try {
        const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
        const supabaseKey = safeGet('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFodWJmcnhseWNma2dyaWl6bWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTA5NTIsImV4cCI6MjA5OTcyNjk1Mn0.dCzbPw4wWgnYRU4XCH2B2WOgm1O3KaH6s2UCbsQ73bY';

        const response = await fetch(`${SUPABASE_URL}/functions/v1/init-senepay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
                returnUrl: window.location.href.split('?')[0] + "?payment=success",
                cancelUrl: window.location.href.split('?')[0] + "?payment=cancel"
            })
        });

        const rawText = await response.text();
        let data = {};
        try {
            data = JSON.parse(rawText);
        } catch(e) {
            throw new Error("Invalid JSON from backend. Status: " + response.status + " Body: " + rawText);
        }

        if (response.ok && data.checkoutUrl) {
            window.location.href = data.checkoutUrl;
        } else {
            throw new Error("Backend Error (Status " + response.status + "): " + rawText);
        }

    } catch (err) {
        console.error("SenePay Error:", err);
        alert("Erreur SenePay : " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function selectPayment(el) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
}

function generatePDF() {
    const element = document.getElementById('cv-document');
    if (!element) return;
    
    const opt = {
        margin:       0,
        filename:     `CV_${cvData.personal?.firstName || 'PRO'}_${cvData.personal?.lastName || '500'}.pdf`.replace(/ /g, '_'),
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
}

document.getElementById('cv-document')?.addEventListener('click', (e) => {
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
