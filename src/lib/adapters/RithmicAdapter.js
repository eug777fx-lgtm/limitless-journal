// ═══════════════════════════════════════════════════════════════════════════
//  RithmicAdapter — STUB. Real execution against Rithmic R|API+.
//  Not wired up yet: requires Eugene's Rithmic API credentials + conformance.
//
//  TODO(eugene): to go live —
//   1. Rithmic access requires signing their API agreement and completing
//      conformance testing (contact your prop firm / Rithmic for R|API+ creds:
//      system name, gateway, user, password).
//   2. R|API+ is a binary protocol (no public REST). The practical path is a
//      small server-side bridge (Node bindings or their .NET/C++ SDK) exposed
//      to this app through api/copier-execute.js — never from the browser.
//   3. Store credentials in Vercel env vars:
//      RITHMIC_SYSTEM / RITHMIC_GATEWAY / RITHMIC_USER / RITHMIC_PASS
//   4. Implement connect() → login + heartbeat, executeOrder() → new order
//      single, and map ExecutionReport messages into copier_trades rows.
// ═══════════════════════════════════════════════════════════════════════════

export function createRithmicAdapter() {
  return {
    name: 'rithmic',
    ready: false,

    async connect(/* credentials */) {
      throw new Error('Rithmic adapter not connected — R|API+ credentials required (see TODO in RithmicAdapter.js)')
    },

    async executeOrder(/* account, order */) {
      throw new Error('Rithmic adapter not connected — running in simulation mode only')
    },

    async close() {},
  }
}

export default createRithmicAdapter
