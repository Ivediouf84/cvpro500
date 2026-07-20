/**
 * CV PRO 500 - Application Logic
 */

// Initial State
let cvData = {
    personal: {
        firstName: 'Moussa', lastName: 'Diouf', jobTitle: 'Développeur Full Stack',
        email: 'moussa.diouf@email.com', phone: '+221 77 123 45 67',
        address: 'Dakar', city: 'Dakar', nationality: 'Sénégalaise',
        linkedin: 'linkedin.com/in/mdiouf', portfolio: 'moussadiouf.dev',
        photo: ''
    },
    profile: {
        summary: 'Développeur Full Stack passionné avec plus de 5 ans d\'expérience dans la conception et le développement d\'applications web robustes.'
    },
    experiences: [
        { id: 1, title: 'Développeur Web Senior', company: 'TechAfrica', startDate: '2021', endDate: 'Présent', description: 'Développement d\'applications SaaS en React et Node.js. Management d\'une équipe de 3 développeurs juniors.' }
    ],
    education: [
        { id: 1, degree: 'Master Ingénierie Logicielle', school: 'ESMT Dakar', startDate: '2016', endDate: '2021', description: 'Major de promotion.' }
    ],
    skills: [
        { id: 1, name: 'JavaScript / TypeScript' },
        { id: 2, name: 'React.js & Node.js' },
        { id: 3, name: 'Architecture Cloud (AWS)' }
    ],
    languages: [
        { id: 1, name: 'Français', level: 'Courant' },
        { id: 2, name: 'Anglais', level: 'Professionnel' }
    ],
    interests: [
        { id: 1, name: 'Intelligence Artificielle' },
        { id: 2, name: 'Football' }
    ],
    references: []
};

// Supabase Configuration
const SUPABASE_URL = 'https://ahubfrxlycfkgriizmde.supabase.co';
const SUPABASE_KEY = 'sb_publishable_glyRa7Jq7_SVD11IZUamSg_fyaND8B4';
let supabaseClient = null;
let currentUserId = null;
let cloudDocumentId = null;
let saveTimeout = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Try to initialize Supabase
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        await initCloud();
    }
    
    // Check if we have AI-imported CV data
    const importedData = localStorage.getItem('importedCVData');
    if (importedData) {
        try {
            const parsedData = JSON.parse(importedData);
            cvData = parsedData;
            localStorage.removeItem('importedCVData');
            // Force save to cloud immediately since we have new data
            triggerCloudSave();
        } catch(e) {
            console.error("Error parsing imported CV data", e);
        }
    }
    
    initTabs();
    renderForms();
    renderCV();
    setupTemplateSelector();
});

async function initCloud() {
    try {
        // 1. Get or create anonymous session
        const { data: authData, error: authError } = await supabaseClient.auth.getSession();
        
        if (!authData.session) {
            const { data: signInData, error: signInError } = await supabaseClient.auth.signInAnonymously();
            if (signInError) throw signInError;
            currentUserId = signInData.user.id;
        } else {
            currentUserId = authData.session.user.id;
        }

        // 2. Fetch existing CV
        const { data: cvDoc, error: fetchError } = await supabaseClient
            .from('cv_documents')
            .select('*')
            .eq('user_id', currentUserId)
            .single();

        if (cvDoc) {
            cloudDocumentId = cvDoc.id;
            cvData = cvDoc.cv_data; // Replace local default with cloud data
        }
    } catch (err) {
        console.error("Cloud Init Error:", err);
        alert("Erreur de connexion Supabase (Init) : " + (err.message || JSON.stringify(err)));
    }
}

function triggerCloudSave() {
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

            const { data, error } = await supabaseClient
                .from('cv_documents')
                .upsert(payload)
                .select()
                .single();
                
            if (data && !cloudDocumentId) {
                cloudDocumentId = data.id; // Save ID for future upserts
            }
        } catch (err) {
            console.error("Auto-save Error:", err);
            alert("Erreur de connexion à la base de données : " + (err.message || err.error_description || JSON.stringify(err)));
        }
    }, 1500); // Save 1.5 seconds after user stops typing
}

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.step-section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(`step-${tab.dataset.step}`).classList.add('active');
        });
    });
}

function renderForms() {
    const container = document.getElementById('form-container');
    container.innerHTML = `
        <!-- Step 1: Infos -->
        <div id="step-1" class="step-section active">
            <h3 class="step-title">1. Informations Personnelles</h3>
            <div class="form-group" style="text-align: center; margin-bottom: 1.5rem;">
                <label>Photo de profil</label>
                <div style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 0.5rem;">
                    <img id="photo-preview" src="${cvData.personal.photo || ''}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border); display: ${cvData.personal.photo ? 'block' : 'none'};">
                    <input type="file" accept="image/*" onchange="handlePhotoUpload(event)" style="font-size: 0.85rem; color: var(--text-muted);">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Prénom</label>
                    <input type="text" class="form-control" data-section="personal" data-field="firstName" value="${cvData.personal.firstName}" oninput="updateData(event)">
                </div>
                <div class="form-group">
                    <label>Nom</label>
                    <input type="text" class="form-control" data-section="personal" data-field="lastName" value="${cvData.personal.lastName}" oninput="updateData(event)">
                </div>
            </div>
            <div class="form-group">
                <label>Titre Professionnel</label>
                <input type="text" class="form-control" data-section="personal" data-field="jobTitle" value="${cvData.personal.jobTitle}" oninput="updateData(event)">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" class="form-control" data-section="personal" data-field="email" value="${cvData.personal.email}" oninput="updateData(event)">
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="text" class="form-control" data-section="personal" data-field="phone" value="${cvData.personal.phone}" oninput="updateData(event)">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ville / Adresse</label>
                    <input type="text" class="form-control" data-section="personal" data-field="city" value="${cvData.personal.city}" oninput="updateData(event)">
                </div>
                <div class="form-group">
                    <label>LinkedIn</label>
                    <input type="text" class="form-control" data-section="personal" data-field="linkedin" value="${cvData.personal.linkedin}" oninput="updateData(event)">
                </div>
            </div>
        </div>

        <!-- Step 2: Profil -->
        <div id="step-2" class="step-section">
            <h3 class="step-title">2. Profil Professionnel <button class="btn btn-ghost" style="font-size:0.7rem; color:var(--secondary); border:1px solid var(--secondary); padding:0.2rem 0.5rem;" onclick="alert('Génération par IA bientôt disponible')"><i class="fa-solid fa-wand-magic-sparkles"></i> Générer IA</button></h3>
            <div class="form-group">
                <label>Description court de votre parcours</label>
                <textarea class="form-control" data-section="profile" data-field="summary" oninput="updateData(event)">${cvData.profile.summary}</textarea>
            </div>
        </div>

        <!-- Step 3: Experiences -->
        <div id="step-3" class="step-section">
            <h3 class="step-title">3. Expériences Professionnelles</h3>
            <div id="experiences-list" class="dynamic-list"></div>
            <button class="btn-add" onclick="addDynamicItem('experiences')"><i class="fa-solid fa-plus"></i> Ajouter une expérience</button>
        </div>

        <!-- Step 4: Formations -->
        <div id="step-4" class="step-section">
            <h3 class="step-title">4. Formations</h3>
            <div id="education-list" class="dynamic-list"></div>
            <button class="btn-add" onclick="addDynamicItem('education')"><i class="fa-solid fa-plus"></i> Ajouter une formation</button>
        </div>
        
        <!-- Step 5: Compétences -->
        <div id="step-5" class="step-section">
            <h3 class="step-title">5. Compétences</h3>
            <div id="skills-list" class="dynamic-list"></div>
            <button class="btn-add" onclick="addDynamicItem('skills')"><i class="fa-solid fa-plus"></i> Ajouter une compétence</button>
        </div>

        <!-- Step 6: Langues -->
        <div id="step-6" class="step-section">
            <h3 class="step-title">6. Langues</h3>
            <div id="languages-list" class="dynamic-list"></div>
            <button class="btn-add" onclick="addDynamicItem('languages')"><i class="fa-solid fa-plus"></i> Ajouter une langue</button>
        </div>

        <!-- Step 7: Intérêts -->
        <div id="step-7" class="step-section">
            <h3 class="step-title">7. Centres d'intérêt</h3>
            <div id="interests-list" class="dynamic-list"></div>
            <button class="btn-add" onclick="addDynamicItem('interests')"><i class="fa-solid fa-plus"></i> Ajouter un intérêt</button>
        </div>

        <!-- Step 8: Ref -->
        <div id="step-8" class="step-section">
            <h3 class="step-title">8. Références</h3>
            <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:1rem;">Optionnel. Vous pouvez ajouter "Sur demande" ou lister des contacts.</p>
            <div class="form-group">
                <textarea class="form-control" data-section="personal" data-field="references" oninput="updateData(event)" placeholder="Références disponibles sur demande..."></textarea>
            </div>
        </div>
    `;

    renderDynamicLists();
}

function renderDynamicLists() {
    renderList('experiences', (item) => `
        <div class="form-group"><input type="text" class="form-control" placeholder="Poste (ex: Développeur Web)" value="${item.title}" oninput="updateListItem(event, 'experiences', ${item.id}, 'title')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Entreprise" value="${item.company}" oninput="updateListItem(event, 'experiences', ${item.id}, 'company')"></div>
        <div class="form-row">
            <div class="form-group"><input type="text" class="form-control" placeholder="De (ex: 2021)" value="${item.startDate}" oninput="updateListItem(event, 'experiences', ${item.id}, 'startDate')"></div>
            <div class="form-group"><input type="text" class="form-control" placeholder="À (ex: Présent)" value="${item.endDate}" oninput="updateListItem(event, 'experiences', ${item.id}, 'endDate')"></div>
        </div>
        <div class="form-group"><textarea class="form-control" placeholder="Description des tâches" oninput="updateListItem(event, 'experiences', ${item.id}, 'description')">${item.description || ''}</textarea></div>
    `);

    renderList('education', (item) => `
        <div class="form-group"><input type="text" class="form-control" placeholder="Diplôme" value="${item.degree}" oninput="updateListItem(event, 'education', ${item.id}, 'degree')"></div>
        <div class="form-group"><input type="text" class="form-control" placeholder="École / Université" value="${item.school}" oninput="updateListItem(event, 'education', ${item.id}, 'school')"></div>
        <div class="form-row">
            <div class="form-group"><input type="text" class="form-control" placeholder="De (ex: 2016)" value="${item.startDate}" oninput="updateListItem(event, 'education', ${item.id}, 'startDate')"></div>
            <div class="form-group"><input type="text" class="form-control" placeholder="À (ex: 2021)" value="${item.endDate}" oninput="updateListItem(event, 'education', ${item.id}, 'endDate')"></div>
        </div>
        <div class="form-group"><input type="text" class="form-control" placeholder="Description" value="${item.description || ''}" oninput="updateListItem(event, 'education', ${item.id}, 'description')"></div>
    `);
    
    renderList('skills', (item) => `
        <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Compétence (ex: React.js)" value="${item.name}" oninput="updateListItem(event, 'skills', ${item.id}, 'name')"></div>
    `);
    
    renderList('languages', (item) => `
        <div class="form-row" style="margin-bottom:0;">
            <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Langue" value="${item.name}" oninput="updateListItem(event, 'languages', ${item.id}, 'name')"></div>
            <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Niveau" value="${item.level || ''}" oninput="updateListItem(event, 'languages', ${item.id}, 'level')"></div>
        </div>
    `);
    
    renderList('interests', (item) => `
        <div class="form-group" style="margin-bottom:0;"><input type="text" class="form-control" placeholder="Centre d'intérêt" value="${item.name}" oninput="updateListItem(event, 'interests', ${item.id}, 'name')"></div>
    `);
}

function renderList(section, templateFn) {
    const container = document.getElementById(`${section}-list`);
    if (!container) return;
    
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

// Data updating
function updateData(e) {
    const sec = e.target.dataset.section;
    const field = e.target.dataset.field;
    cvData[sec][field] = e.target.value;
    renderCV();
    triggerCloudSave();
}

function updateListItem(e, section, id, field) {
    const item = cvData[section].find(i => i.id === id);
    if (item) {
        item[field] = e.target.value;
        renderCV();
        triggerCloudSave();
    }
}

function addDynamicItem(section) {
    const newId = cvData[section].length > 0 ? Math.max(...cvData[section].map(i => i.id)) + 1 : 1;
    cvData[section].push({ id: newId, name: '', title: '', degree: '' }); // defaults
    renderDynamicLists();
    renderCV();
    triggerCloudSave();
}

function removeDynamicItem(section, id) {
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
    const p = cvData.personal;
    
    // Check which template is active
    const template = document.getElementById('template-select').value;
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
                    ${cvData.profile.summary ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Profil</h3>
                        <p class="cv-summary">${cvData.profile.summary}</p>
                    </div>` : ''}
                    
                    ${cvData.experiences.length > 0 ? `
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
                    
                    ${cvData.education.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Formation</h3>
                        ${cvData.education.map(e => `
                            <div class="cv-item">
                                <div class="cv-item-header">
                                    <div class="cv-item-title">${e.degree || 'Diplôme'} - <span class="cv-item-company">${e.school || 'École'}</span></div>
                                    <div class="cv-item-date">${e.startDate || ''} ${e.endDate ? '- ' + e.endDate : ''}</div>
                                </div>
                                <p class="cv-item-desc">${e.description || ''}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}
                </div>
                
                <div class="cv-sidebar">
                    ${cvData.skills.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Compétences</h3>
                        <div class="cv-skills-list">
                            ${cvData.skills.map(s => s.name ? `<span class="cv-skill-tag">${s.name}</span>` : '').join('')}
                        </div>
                    </div>` : ''}
                    
                    ${cvData.languages.length > 0 ? `
                    <div class="cv-section">
                        <h3 class="cv-section-title">Langues</h3>
                        <ul class="cv-list">
                            ${cvData.languages.map(l => l.name ? `<li><strong>${l.name}</strong> ${l.level ? `<span class="cv-level-text">- ${l.level}</span>` : ''}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                    
                    ${cvData.interests.length > 0 ? `
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
                ${cvData.profile.summary ? `
                <div class="cv-section">
                    <h3>Profil</h3>
                    <p>${cvData.profile.summary}</p>
                </div>` : ''}
                
                ${cvData.experiences.length > 0 ? `
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

                ${cvData.education.length > 0 ? `
                <div class="cv-section">
                    <h3>Formation</h3>
                    ${cvData.education.map(e => `
                        <div class="cv-item">
                            <div class="cv-item-header">
                                <div class="cv-title">${e.degree} - ${e.school}</div>
                                <div class="cv-date">${e.startDate} ${e.endDate ? '- ' + e.endDate : ''}</div>
                            </div>
                            <p>${e.description || ''}</p>
                        </div>
                    `).join('')}
                </div>` : ''}
                
                <div class="cv-classic-grid">
                    ${cvData.skills.length > 0 ? `
                    <div class="cv-section">
                        <h3>Compétences</h3>
                        <ul>
                            ${cvData.skills.map(s => s.name ? `<li>${s.name}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                    ${cvData.languages.length > 0 ? `
                    <div class="cv-section">
                        <h3>Langues</h3>
                        <ul>
                            ${cvData.languages.map(l => l.name ? `<li>${l.name} ${l.level ? ' - ' + l.level : ''}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                </div>
            </div>
        `;
    } else if (template === 'elegant') {
        html = `
            <div class="cv-elegant-header">
                <div class="cv-elegant-header-content">
                    ${p.photo ? `<img src="${p.photo}" class="cv-profile-pic">` : ''}
                    <div class="cv-header-text">
                        <h1>${p.firstName || 'Prénom'} ${p.lastName || 'Nom'}</h1>
                        <h2>${p.jobTitle || 'Titre Professionnel'}</h2>
                    </div>
                </div>
                <div class="cv-contact-info">
                    ${p.email ? `<div><i class="fa-solid fa-envelope"></i> ${p.email}</div>` : ''}
                    ${p.phone ? `<div><i class="fa-solid fa-phone"></i> ${p.phone}</div>` : ''}
                    ${p.city ? `<div><i class="fa-solid fa-location-dot"></i> ${p.city}</div>` : ''}
                    ${p.linkedin ? `<div><i class="fa-brands fa-linkedin"></i> ${p.linkedin}</div>` : ''}
                </div>
            </div>
            <div class="cv-elegant-body">
                <div class="cv-sidebar">
                    ${cvData.skills.length > 0 ? `
                    <div class="cv-section">
                        <h3>Compétences</h3>
                        <div class="cv-skills-list">
                            ${cvData.skills.map(s => s.name ? `<span class="cv-skill-tag">${s.name}</span>` : '').join('')}
                        </div>
                    </div>` : ''}
                    ${cvData.languages.length > 0 ? `
                    <div class="cv-section">
                        <h3>Langues</h3>
                        <ul class="cv-list">
                            ${cvData.languages.map(l => l.name ? `<li><strong>${l.name}</strong><br>${l.level || ''}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                    ${cvData.interests.length > 0 ? `
                    <div class="cv-section">
                        <h3>Centres d'intérêt</h3>
                        <ul class="cv-list">
                            ${cvData.interests.map(i => i.name ? `<li>${i.name}</li>` : '').join('')}
                        </ul>
                    </div>` : ''}
                </div>
                <div class="cv-main">
                    ${cvData.profile.summary ? `
                    <div class="cv-section">
                        <h3>Profil</h3>
                        <p>${cvData.profile.summary}</p>
                    </div>` : ''}
                    ${cvData.experiences.length > 0 ? `
                    <div class="cv-section">
                        <h3>Expériences</h3>
                        ${cvData.experiences.map(e => `
                            <div class="cv-item">
                                <h4>${e.title} - <span>${e.company}</span></h4>
                                <div class="cv-date">${e.startDate} ${e.endDate ? '- ' + e.endDate : ''}</div>
                                <p>${e.description}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}
                    ${cvData.education.length > 0 ? `
                    <div class="cv-section">
                        <h3>Formation</h3>
                        ${cvData.education.map(e => `
                            <div class="cv-item">
                                <h4>${e.degree} - <span>${e.school}</span></h4>
                                <div class="cv-date">${e.startDate} ${e.endDate ? '- ' + e.endDate : ''}</div>
                                <p>${e.description || ''}</p>
                            </div>
                        `).join('')}
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
                
                ${cvData.profile.summary ? `
                <div class="cv-section">
                    <div class="cv-section-left">Profil</div>
                    <div class="cv-section-right"><p>${cvData.profile.summary}</p></div>
                </div>` : ''}
                
                ${cvData.experiences.length > 0 ? `
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
                
                ${cvData.education.length > 0 ? `
                <div class="cv-section">
                    <div class="cv-section-left">Formation</div>
                    <div class="cv-section-right">
                        ${cvData.education.map(e => `
                            <div class="cv-item">
                                <div class="cv-date">${e.startDate} ${e.endDate ? '- ' + e.endDate : ''}</div>
                                <div class="cv-content">
                                    <h4>${e.degree}</h4>
                                    <div class="cv-company">${e.school}</div>
                                    <p>${e.description || ''}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}
                
                ${cvData.skills.length > 0 ? `
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
    document.getElementById('template-select').addEventListener('change', (e) => {
        renderCV();
    });
    
    const colorPicker = document.getElementById('theme-color');
    if (colorPicker) {
        // Initialize current color
        document.getElementById('cv-document').style.setProperty('--primary', colorPicker.value);
        
        colorPicker.addEventListener('input', (e) => {
            document.getElementById('cv-document').style.setProperty('--primary', e.target.value);
        });
    }
}

// Zoom Controls
function zoomIn() {
    if (currentZoom < 1.5) {
        currentZoom += 0.1;
        document.getElementById('cv-scale-wrapper').style.transform = `scale(${currentZoom})`;
    }
}
function zoomOut() {
    if (currentZoom > 0.4) {
        currentZoom -= 0.1;
        document.getElementById('cv-scale-wrapper').style.transform = `scale(${currentZoom})`;
    }
}

// Payment & PDF Generation
document.getElementById('btn-open-payment').addEventListener('click', () => {
    document.getElementById('payment-modal').classList.add('active');
});

function closePaymentModal() {
    document.getElementById('payment-modal').classList.remove('active');
}

function selectPayment(el) {
    document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
}

async function processPayment() {
    if (!supabaseClient || !cloudDocumentId) {
        alert("Veuillez remplir au moins un champ du CV pour le sauvegarder avant de payer.");
        return;
    }

    const btn = document.getElementById('btn-confirm-payment');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Création de la facture...';
    btn.disabled = true;
    
    try {
        // 1. Appeler l'Edge Function Supabase pour créer la facture PayDunya
        const { data, error } = await supabaseClient.functions.invoke('init-payment', {
            body: { document_id: cloudDocumentId }
        });
        
        if (error) throw error;
        
        if (data && data.url) {
            // Ouvrir la page de paiement PayDunya dans un nouvel onglet
            window.open(data.url, '_blank');
            
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> En attente du paiement... (Regardez votre téléphone)';
            
            // 2. Écouter la base de données en temps réel pour savoir quand PayDunya a confirmé
            supabaseClient
                .channel('payment-check')
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'cv_documents', 
                    filter: `id=eq.${cloudDocumentId}` 
                }, (payload) => {
                    if (payload.new.payment_status === true) {
                        // L'argent a été reçu !
                        btn.innerHTML = '<i class="fa-solid fa-check"></i> Paiement réussi ! Génération...';
                        btn.style.background = '#10b981';
                        
                        setTimeout(() => {
                            closePaymentModal();
                            generatePDF();
                            
                            // Reset button
                            setTimeout(() => {
                                btn.innerHTML = originalText;
                                btn.style.background = 'var(--grad-primary)';
                                btn.disabled = false;
                            }, 2000);
                        }, 1500);
                    }
                })
                .subscribe();
        } else {
            throw new Error("Pas d'URL de paiement renvoyée");
        }
    } catch (err) {
        console.error("Payment Error:", err);
        alert("Erreur lors de l'initialisation du paiement : " + (err.message || JSON.stringify(err)));
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function generatePDF() {
    const element = document.getElementById('cv-document');
    
    // Configuration for html2pdf
    const opt = {
        margin:       0,
        filename:     `CV_${cvData.personal.firstName || 'PRO'}_${cvData.personal.lastName || '500'}.pdf`.replace(/ /g, '_'),
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate and save
    html2pdf().set(opt).from(element).save();
}
