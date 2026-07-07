// ═══════════════════════════════════════════════════════════════════════════
//  SimulationAdapter — the only live execution adapter today.
//  Implements the ExecutionAdapter interface:
//    { name, ready, connect(creds), executeOrder(account, order), close() }
//  executeOrder never touches a broker — it returns a simulated fill that the
//  caller records into copier_trades with status='simulated'.
// ═══════════════════════════════════════════════════════════════════════════
import { projectPnl, pointValue } from '../copierEngine'

export function createSimulationAdapter() {
  return {
    name: 'simulation',
    ready: true,

    // No credentials needed for simulation.
    async connect() { return { ok: true } },

    // order: { symbol, direction, entry, exit, size, rMultiple, copiedFrom }
    async executeOrder(account, order) {
      const pv = pointValue(order.symbol)
      return {
        ok: true,
        fill: {
          accountId: account.id,
          symbol: order.symbol,
          direction: order.direction,
          entry: order.entry ?? null,
          exit: order.exit ?? null,
          size: order.size,
          pnl: projectPnl({ ...order, pointVal: pv }),
          rMultiple: order.rMultiple ?? null,
          copiedFrom: order.copiedFrom ?? null,
          status: 'simulated',
          openedAt: new Date().toISOString(),
          closedAt: order.exit != null ? new Date().toISOString() : null,
        },
      }
    },

    async close() { /* nothing to tear down */ },
  }
}

export default createSimulationAdapter
