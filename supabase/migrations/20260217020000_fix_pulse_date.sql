ALTER TABLE wellth_pulse ADD COLUMN IF NOT EXISTS date TEXT;
ALTER TABLE wellth_pulse ADD CONSTRAINT wellth_pulse_user_date UNIQUE(user_id, date);
