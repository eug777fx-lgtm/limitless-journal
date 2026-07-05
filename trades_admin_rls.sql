-- Admin View-As: let admins read every user's trades.
-- Run once in Supabase → SQL editor. Safe to re-run.
--
-- Why: the trades table's RLS almost certainly only has the owner policy
-- (auth.uid() = user_id). RLS does NOT raise an error for blocked selects —
-- it silently filters the rows, so the admin View-As query returns an empty
-- array with error = null. Adding a second permissive SELECT policy for the
-- admin emails lets those accounts read all rows; policies are OR'd together,
-- so regular users are unaffected and can still only see their own trades.
-- Writes are untouched: admins gain read-only access, matching the UI.

DROP POLICY IF EXISTS "Users can view own trades" ON trades;
CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all trades" ON trades;
CREATE POLICY "Admins can view all trades" ON trades FOR SELECT USING (
  auth.email() IN ('eug777fx@gmail.com', 'pirchmark@gmail.com', 'clozoya333@gmail.com')
);

-- NOTE on chart images: trades fetching is only half the fix. The <img> tags
-- load public storage URLs (getPublicUrl), which only resolve when the
-- trade-charts bucket is public-readable. If images are still blank after
-- this, also run trade_charts_storage.sql (in this repo) to make the bucket
-- public and add its read policy.
