-- ═══════════════════════════════════════════════════════════════════════════
--  Trading Operating System (TOS) — Supabase schema
--  Run once in the Supabase SQL Editor for the project, then reload the app.
--  The Daily Plan, Risk Engine and Funded pages work without this table
--  (they use localStorage); only Trade Log / Performance / Review need it.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tos_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  trade_date date DEFAULT CURRENT_DATE,
  session text,
  instrument text,
  direction text,
  bias text,
  entry numeric,
  stop_loss numeric,
  target numeric,
  rr numeric,
  result text,
  liquidity_swept boolean,
  rejection_block boolean,
  wick_ce boolean,
  ote_present boolean,
  key_open boolean,
  loss_reason text,
  notes text,
  would_take_again boolean,
  no_reason text,
  process_score int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tos_trades ENABLE ROW LEVEL SECURITY;

-- Drop-and-recreate so re-running this file is safe.
DROP POLICY IF EXISTS "Users own TOS trades" ON tos_trades;
CREATE POLICY "Users own TOS trades" ON tos_trades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Helpful index for the per-user, date-ordered queries the app runs.
CREATE INDEX IF NOT EXISTS tos_trades_user_date_idx
  ON tos_trades (user_id, trade_date DESC);
