-- Trade chart images — make the `trade-charts` storage bucket readable so the
-- public image links the app stores actually load. Run once in Supabase → SQL.
--
-- Why this is the fix:
--   • On upload the app stores PUBLIC storage URLs via getPublicUrl():
--       https://fngdbdcpfamcoctmdhyc.supabase.co/storage/v1/object/public/trade-charts/<path>
--   • Those /object/public/ URLs ONLY resolve when the bucket is public-readable.
--   • The <img src> is a plain browser GET with no Supabase auth header, so the
--     viewer's identity is irrelevant — if the bucket serves the URL, EVERYONE
--     (the owner AND an admin viewing in read-only "View User Dashboard" mode)
--     sees the image; if it doesn't, nobody does.
--   • So admins seeing blank charts means the bucket isn't serving these public
--     URLs. Making it public (read-only) fixes it for owners and admins alike.

-- 1) Mark the bucket public so /object/public/ links serve the images.
update storage.buckets set public = true where id = 'trade-charts';

-- 2) Explicit read policy on the objects (covers projects that have RLS enabled
--    on storage.objects). SELECT is open — these charts are already shared via
--    public URLs. Writes stay restricted by the bucket's existing owner policies,
--    so this does NOT let anyone upload or delete another user's images.
drop policy if exists "trade-charts public read" on storage.objects;
create policy "trade-charts public read"
  on storage.objects for select
  using ( bucket_id = 'trade-charts' );

-- ── Optional, stricter alternative ───────────────────────────────────────────
-- If you'd rather NOT expose charts via public URLs at all (admins + owners only),
-- that requires switching the app from getPublicUrl() to signed URLs — a code
-- change, not just a policy. Ask and I'll wire that up instead.
