-- ============================================================
-- SCHÉMA SUPABASE & RLS POUR MODULE GENERATEUR DE PV DE RÉUNION
-- ============================================================

-- 1. Table organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    logo TEXT,
    nom TEXT NOT NULL,
    adresse TEXT,
    telephone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Table meeting_minutes
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    titre TEXT NOT NULL,
    type_reunion TEXT DEFAULT 'Réunion d''équipe',
    date DATE DEFAULT CURRENT_DATE,
    heure_debut TIME,
    heure_fin TIME,
    lieu TEXT,
    mode TEXT DEFAULT 'Présentiel',
    president TEXT,
    secretaire TEXT,
    contenu_original TEXT,
    contenu_genere TEXT,
    statut TEXT DEFAULT 'Généré' CHECK (statut IN ('Brouillon', 'Généré', 'Modifié', 'Finalisé')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Table participants
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    fonction TEXT,
    presence TEXT DEFAULT 'Présent' CHECK (presence IN ('Présent', 'Présente', 'Excusé', 'Excusée', 'Absent', 'Absente'))
);

-- 4. Table actions (Plan d'action)
CREATE TABLE IF NOT EXISTS public.actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    responsable TEXT,
    echeance DATE,
    statut TEXT DEFAULT 'À faire' CHECK (statut IN ('À faire', 'En cours', 'Terminé'))
);

-- Activation de la sécurité Row Level Security (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès isolées par utilisateur
CREATE POLICY "Utilisateurs gèrent leurs organisations" ON public.organizations
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs gèrent leurs PV de réunion" ON public.meeting_minutes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Utilisateurs gèrent leurs participants de PV" ON public.participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.meeting_minutes
            WHERE meeting_minutes.id = participants.meeting_id AND meeting_minutes.user_id = auth.uid()
        )
    );

CREATE POLICY "Utilisateurs gèrent leurs plans d'action de PV" ON public.actions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.meeting_minutes
            WHERE meeting_minutes.id = actions.meeting_id AND meeting_minutes.user_id = auth.uid()
        )
    );
