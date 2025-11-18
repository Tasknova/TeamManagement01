-- Disable RLS on webhook_settings table to allow all operations
-- Since you're using custom authentication (not Supabase Auth), 
-- RLS policies with auth.uid() won't work
ALTER TABLE webhook_settings DISABLE ROW LEVEL SECURITY;

-- Alternative: If you want to keep RLS enabled, use these permissive policies
-- that allow all authenticated users (uncomment if needed)
/*
ALTER TABLE webhook_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for webhook settings" ON webhook_settings;

CREATE POLICY "Allow all for webhook settings"
ON webhook_settings
FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
*/
