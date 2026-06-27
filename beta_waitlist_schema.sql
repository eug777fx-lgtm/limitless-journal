-- Beta Closed / Waitlist support.
-- Run once in the Supabase SQL editor.
--
-- Allows profiles.status to hold 'waitlist' (in addition to the existing
-- pending / approved / rejected / banned values) so that new signups can be
-- placed on the waitlist while the beta is closed. Safe to re-run.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending','approved','rejected','banned','waitlist'));
