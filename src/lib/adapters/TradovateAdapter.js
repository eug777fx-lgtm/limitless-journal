// ═══════════════════════════════════════════════════════════════════════════
//  TradovateAdapter — STUB. Real execution against Tradovate's REST/WebSocket
//  API. Not wired up yet: requires Eugene's Tradovate API credentials.
//
//  TODO(eugene): to go live —
//   1. Create API access in Tradovate (Application Settings → API Access) and
//      obtain: clientId (cid), client secret, and your username/password or
//      dedicated API key. Docs: https://api.tradovate.com
//   2. Store credentials in Vercel env vars (never in the client bundle):
//      TRADOVATE_CID / TRADOVATE_SECRET / TRADOVATE_USER / TRADOVATE_PASS
//   3. Add a serverless proxy (api/copier-execute.js) that holds the session
//      token server-side — the browser must never see broker credentials.
//   4. Implement connect() → POST /auth/accesstokenrequest
//      executeOrder()     → POST /order/placeorder
//      and map Tradovate fill reports back into copier_trades rows.
// ═══════════════════════════════════════════════════════════════════════════

export function createTradovateAdapter() {
  return {
    name: 'tradovate',
    ready: false,

    async connect(/* credentials */) {
      throw new Error('Tradovate adapter not connected — API credentials required (see TODO in TradovateAdapter.js)')
    },

    async executeOrder(/* account, order */) {
      throw new Error('Tradovate adapter not connected — running in simulation mode only')
    },

    async close() {},
  }
}

export default createTradovateAdapter
