// Market Snapshot Engine
// Stores and retrieves market state over time for historical analysis

import fs from 'fs';
import path from 'path';

export interface MarketSnapshot {
  timestamp: number; // ms since epoch
  exchange: string;
  marketId: string;
  data: any; // Raw market data (prices, volume, etc.)
}

const SNAPSHOT_DIR = path.resolve(process.cwd(), 'snapshots');

export function ensureSnapshotDir() {
  if (!fs.existsSync(SNAPSHOT_DIR)) {
    fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }
}

export function saveMarketSnapshot(snapshot: MarketSnapshot) {
  ensureSnapshotDir();
  const fname = `${snapshot.exchange}_${snapshot.marketId}_${snapshot.timestamp}.json`;
  const fpath = path.join(SNAPSHOT_DIR, fname);
  fs.writeFileSync(fpath, JSON.stringify(snapshot, null, 2));
}

export function loadMarketSnapshots({ exchange, marketId, since }: { exchange: string; marketId: string; since?: number }): MarketSnapshot[] {
  ensureSnapshotDir();
  const files = fs.readdirSync(SNAPSHOT_DIR).filter(f => f.startsWith(`${exchange}_${marketId}_`) && f.endsWith('.json'));
  const snapshots = files.map(f => {
    const content = fs.readFileSync(path.join(SNAPSHOT_DIR, f), 'utf8');
    return JSON.parse(content) as MarketSnapshot;
  });
  if (since) {
    return snapshots.filter(s => s.timestamp >= since);
  }
  return snapshots;
}
