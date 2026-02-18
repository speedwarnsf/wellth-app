CREATE TABLE IF NOT EXISTS wellth_encryption_keys (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  wrapped_key text NOT NULL,
  recovery_wrapped_key text NOT NULL,
  salt text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE wellth_encryption_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keys" ON wellth_encryption_keys
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
