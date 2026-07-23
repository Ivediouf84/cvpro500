# 🚀 CV PRO 500 — Documentation du Projet & Guide pour Modèle IA

> **Documentation d'architecture, de sécurité et d'instructions pour les futurs assistants IA.**

---

## 📌 1. Vue d'Ensemble du Projet

**CV PRO 500** est une application web moderne développée pour le marché francophone (axée Sénégal et Afrique de l'Ouest). Elle permet aux candidats de générer facilement des **CVs professionnels**, des **Demandes d'Emploi formelles** et des **Lettres de Motivation sur-mesure** propulsées par l'Intelligence Artificielle (**Google Gemini 3.5 Flash**).

---

## 🌟 2. Fonctionnalités Clés Implémentées

1. **Générateur de Lettre de Motivation & Demande d'Emploi (IA)** :
   - Analyse le CV existant (image ou PDF).
   - Extrait et filtre **uniquement** les compétences et expériences pertinentes pour le poste visé (ignore les expériences non liées).
   - Génère deux documents HTML prêts à imprimer/télécharger en PDF avec une mise en page formelle respectant les normes de correspondance administratives (Dakar, le ..., destinataire à droite, texte justifié, signature à droite).

2. **Analyseur de CV par IA (`analyze-cv`)** :
   - Extrait les données structurées JSON d'une photo ou d'un fichier PDF de CV.
   - Sépare automatiquement les diplômes universitaires/scolaires des formations professionnelles et certificats.

3. **Générateur de CV Manuel & Assisté par IA** :
   - Modèles de CV professionnels et modernes stylisés avec du CSS pur (`cvpro-templates.css`).
   - Exportation directe au format PDF haute résolution avec `html2pdf.js`.

4. **Intégration SenePay (Orange Money & Wave)** :
   - Système de paiement mobile (500 FCFA pour la lettre/demande, 1000 FCFA pour le CV IA).
   - Session de paiement générée de manière sécurisée par le backend (`init-senepay`).

5. **Sécurité & Authentification Stricte** :
   - **Row Level Security (RLS)** sur Supabase : Isolation totale des données utilisateur (`profiles`, `user_cvs`, `user_payments`).
   - **Validation Backend** : Contrôle de la taille des fichiers (5 Mo max), whitelist des types MIME (`JPG`, `PNG`, `WEBP`, `PDF`), assainissement des entrées texte.
   - **Auth Guard Middleware (`auth-guard.js`)** : Vérification des sessions Supabase Auth et redirection automatique.
   - **Gestion des Secrets** : Les clés sensibles (`GEMINI_API_KEY`, `SENEPAY_API_SECRET`) sont stockées exclusivement dans les Secrets Supabase Backend.

---

## 🏗️ 3. Technologies Utilisées

- **Front-End** : HTML5, Vanilla CSS3 (Variables CSS, Glassmorphism, Design Responsive), JavaScript (ES6+), FontAwesome 6, `html2pdf.js` / `jsPDF`.
- **Back-End & Base de Données** : Supabase (PostgreSQL, Auth, Deno Edge Functions).
- **Intelligence Artificielle** : Google Gemini API (Modèle officiel `gemini-3.5-flash`).
- **Passerelle de Paiement** : SenePay API (Mobile Money Sénégal : Wave, Orange Money).

---

## 📁 4. Architecture et Structure des Fichiers

```text
├── index.html                  # Page d'accueil / Landing Page (Tarifs, Fonctionnalités)
├── auth.html                   # Page de Connexion / Inscription (Supabase Auth)
├── auth-guard.js               # Middleware JS d'authentification et gestion de session
├── styles.css                  # Design system global, variables CSS, glassmorphism
├── cvpro-templates.css         # Styles des modèles de CV professionnels
│
├── cvpro-builder.html          # Générateur de CV manuel (Étape par étape)
├── cvpro-app.js                # Logique du générateur manuel & paiement SenePay
│
├── cvpro-ai-builder.html       # Générateur de CV assisté par IA (Analyse de photo/PDF)
├── cvpro-ai-app.js             # Logique de création de CV par IA
│
├── motivation-generator.html   # Générateur de Demande d'Emploi & Lettre de Motivation
├── motivation-app.js           # Logique du générateur de lettres & paiement SenePay
│
├── .env.example                # Modèle des variables d'environnement (Sans secrets)
├── .gitignore                  # Exclusion Git des secrets et node_modules
│
└── supabase/
    ├── security_rls_hardening.sql # Script SQL complet d'activation RLS et Triggers
    └── functions/
        ├── generate-motivation/
        │   └── index.ts        # Edge function : Génération HTML Demande + Lettre via Gemini 3.5
        ├── analyze-cv/
        │   └── index.ts        # Edge function : Extraction JSON structuré du CV via Gemini 3.5
        └── init-senepay/
            └── index.ts        # Edge function : Création sécurisée de checkout SenePay
```

---

## 🎨 5. Décisions de Design & UX

1. **Aesthétique Sombre / Glassmorphism** : Palette de couleurs sombres élégantes (HSL tailored, violet/bleu moderne `#6366f1` / `#8b5cf6`), cartes en verre fumé avec légers contours brillants.
2. **Génération HTML directe** : Gemini renvoie directement les balises HTML formelles pour éviter tout problème d'échappement de retours à la ligne (`\n`) et préserver l'alignement strict.
3. **Expérience Sans Friction** : L'utilisateur remplit le formulaire et prévisualise le travail avant d'être invité au téléchargement final.

---

## 🤖 6. Instructions pour les Futurs Modèles IA

Si vous êtes un modèle IA reprenant le développement de ce projet, **respectez scrupuleusement les consignes suivantes** :

1. **Nom du Modèle Gemini** :
   - Utilisez **TOUJOURS** `gemini-3.5-flash` dans l'URL de l'API Google AI Studio :
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiKey}`
   - Ne rétrogradez **JAMAIS** vers `gemini-2.0-flash` ou `gemini-2.5-flash` (ces versions sont obsolètes ou dépréciées pour les nouveaux projets).

2. **Sécurité des Clés API** :
   - Ne remettez **JAMAIS** `GEMINI_API_KEY` ou `SENEPAY_API_SECRET` dans le code Front-End JavaScript (`motivation-app.js`, `cvpro-app.js`, etc.).
   - Passez systématiquement par les Supabase Edge Functions (`functions/v1/...`).

3. **Format des Réponses de `init-senepay`** :
   - La fonction `init-senepay` doit retourner l'objet SenePay direct `Response(JSON.stringify(data))` sans ré-empaqueter sous la forme `{ checkoutUrl: data.url }`.

4. **Mise en Page des Lettres de Motivation** :
   - Conservez le prompt exigeant une sortie au format HTML enrichi (`demandeHtml`, `motivationHtml`) et non du texte brut Markdown.

5. **Sanitisation et Limites Backend** :
   - Conservez les vérifications de taille de payload (`MAX_BASE64_LENGTH`) et la liste blanche MIME dans les Edge Functions Deno.
