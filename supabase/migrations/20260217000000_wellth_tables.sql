CREATE TABLE IF NOT EXISTS wellth_checkins (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, mood INTEGER, water INTEGER, sleep NUMERIC, exercise BOOLEAN, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, date));
ALTER TABLE wellth_checkins ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_journal (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, text TEXT, tags JSONB DEFAULT '[]', mood_tag TEXT, word_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, date));
ALTER TABLE wellth_journal ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_hydration (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, glasses INTEGER DEFAULT 0, timestamps JSONB DEFAULT '[]', created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, date));
ALTER TABLE wellth_hydration ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_breathing (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, duration_seconds INTEGER, cycles INTEGER, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE wellth_breathing ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_gratitude (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, items JSONB DEFAULT '[]', freeform TEXT, prompt TEXT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, date));
ALTER TABLE wellth_gratitude ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_sleep (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, hours NUMERIC, quality INTEGER, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, date));
ALTER TABLE wellth_sleep ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_evening_reflections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, date TEXT NOT NULL, day_rating INTEGER, prompt TEXT, response TEXT, gratitude TEXT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, date));
ALTER TABLE wellth_evening_reflections ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_favorites (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, tip_id TEXT, tip_text TEXT, category TEXT, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, tip_id));
ALTER TABLE wellth_favorites ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_pulse (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL, mood INTEGER, note TEXT, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE wellth_pulse ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_settings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL UNIQUE, settings JSONB DEFAULT '{}', created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE wellth_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS wellth_users (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID REFERENCES auth.users NOT NULL UNIQUE, display_name TEXT, onboarding_complete BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE wellth_users ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ BEGIN CREATE POLICY wellth_checkins_own ON wellth_checkins FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_journal_own ON wellth_journal FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_hydration_own ON wellth_hydration FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_breathing_own ON wellth_breathing FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_gratitude_own ON wellth_gratitude FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_sleep_own ON wellth_sleep FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_evening_reflections_own ON wellth_evening_reflections FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_favorites_own ON wellth_favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_pulse_own ON wellth_pulse FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_settings_own ON wellth_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY wellth_users_own ON wellth_users FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
