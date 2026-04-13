import type { CalendarEvent } from '../algorithms/anticipationAlgorithm.ts';
import { analyzeAnticipationOpportunities } from '../algorithms/anticipationAlgorithm.ts';
import type { EventGroup } from '../algorithms/anticipationAlgorithm.ts';
import { buildUnifiedEventCalendar } from '../calendar/eventCalendarEngine.ts';
import type { RawCalendarEvent } from '../calendar/eventCalendarEngine.ts';
// Polymarket Structural Scanner — TypeScript Refactor
import { analyzeDDS } from '../algorithms/ddsEngine.ts';
import { analyzeThresholdLadder } from '../algorithms/thresholdLadderEngine.ts';
import { analyzeTimeDecay } from '../algorithms/timeDecayEngine.ts';
import { analyzeCrossMarketArb } from '../algorithms/crossMarketArbEngine.ts';
import { analyzeEventDependency } from '../algorithms/eventDependencyEngine.ts';
import { analyzeLiquidityVacuum } from '../algorithms/liquidityVacuumEngine.ts';
import { analyzeVolatilityCompression } from '../algorithms/volatilityCompressionEngine.ts';
import { analyzeSentimentImbalance } from '../algorithms/sentimentImbalanceEngine.ts';
import { computeConfidenceScore, scoreSignals } from '../algorithms/confidenceScoringEngine.ts';
import { fetchOrderbooksForMarkets } from '../connectors/polymarket/fetchOrderbooks.ts';
import { classifyMarketStructure, MarketStructureType } from '../classifiers/marketStructureClassifier.ts';
import { saveMarketSnapshot } from '../snapshot/snapshotEngine.ts';

import { POLYMARKET_API, KALSHI_API, MANIFOLD_API, STOCKS_API, CURRENCIES_API, BONDS_API, ORDERBOOK_THROTTLE, EVENT_LIMIT, DEBUG } from '../env.ts';
import fetch from 'node-fetch';
import { fetchKalshiMarkets } from '../exchange/kalshi.ts';
import { fetchEvents as fetchKalshiEvents } from '../connectors/kalshi/fetchEvents.ts';

// =====================
// Argument Parsing
// =====================
const args = process.argv.slice(2);
let exchange = 'polymarket';
for (const arg of args) {
	if (arg.startsWith('--exchange=')) {
		exchange = arg.split('=')[1];
	}
}

// =====================
// Helpers (ported from scanner.js)
// =====================
function parseArr(str: string): any[] {
	try {
		return JSON.parse(str || '[]');
	} catch {
		return [];
	}
}
function toNum(v: any, fallback = 0): number {
	const n = parseFloat(v);
	return Number.isFinite(n) ? n : fallback;
}
function pct(n: number): string {
	return `${(toNum(n) * 100).toFixed(0)}%`;
}
function money(n: number): string {
	return `$${toNum(n).toFixed(2)}`;
}
function line(char = '═', len = 60): string {
	return char.repeat(len);
}
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
function safeQuestion(q: string): string {
	return (q || '').replace(/\s+/g, ' ').trim();
}
function shortQuestion(q: string, len = 42): string {
	const s = safeQuestion(q);
	return s.length <= len ? s.padEnd(len) : `${s.slice(0, len - 3)}...`;
}
function dedupeByQuestion(items: any[]): any[] {
	const seen = new Set();
	const out = [];
	for (const item of items) {
		const key = safeQuestion(item.question).toLowerCase();
		if (!key || seen.has(key)) continue;
		seen.add(key);
		out.push(item);
	}
	return out;
}
function buildProbRows(markets: any[]): any[] {
	return dedupeByQuestion(
		markets.map((m) => {
			const prices = parseArr(m.outcomePrices);
			return {
				question: safeQuestion(m.question),
				yes: toNum(prices[0]),
				no: toNum(prices[1]),
				volume: toNum(m.volume),
			};
		})
	).filter((row) => row.yes > 0 || row.no > 0);
}
function sortRowsAscending(rows: any[]): any[] {
	return rows;
}
function getEventTitle(event: any): string {
	return safeQuestion(event.title || event.slug || 'Untitled');
}
function isExtremePrice(yes: number): boolean {
	return yes <= 0.03 || yes >= 0.97;
}

// =====================
// Stage Functions (ported)
// =====================
function stage1(markets: any[]): any {
	const first = markets[0];
	if (!first) {
		return { pass: false, reason: 'No markets found in event' };
	}
	const activeMarkets = markets.filter((m) => m.active === true && m.closed === false);
	if (activeMarkets.length === 0) {
		return { pass: false, reason: 'Market is not active / already closed' };
	}
	const priced = activeMarkets.filter((m) => {
		const prices = parseArr(m.outcomePrices);
		return prices.length >= 2 && prices.some((p) => toNum(p) > 0);
	});
	if (priced.length === 0) {
		return { pass: false, reason: 'No outcome prices available' };
	}
	const hasCatalyst = activeMarkets.some(
		(m) => !!(m.endDate || m.endDateIso || m.endTime)
	);
	if (!hasCatalyst) {
		return { pass: false, reason: 'No resolution date found' };
	}
	return {
		pass: true,
		reason: `Active · priced · has resolution date (${priced.length} market(s))`,
		markets: priced,
	};
}
function stage2(markets: any[], title: string): any {
	const rows = buildProbRows(markets);
	const structureType = classifyMarketStructure({ title, outcomes: markets[0]?.outcomes || [], question: markets[0]?.question });
	let type = 'BINARY';
	let label = 'Binary decision';
	switch (structureType) {
		case MarketStructureType.BINARY:
			type = 'BINARY';
			label = 'Binary decision';
			break;
		case MarketStructureType.TIMING_BUCKET:
			type = 'TIMING_BUCKET';
			label = 'Timing bucket';
			break;
		case MarketStructureType.EXACT_RANGE:
			type = 'EXACT_BUCKET';
			label = 'Exact bucket / range ladder';
			break;
		case MarketStructureType.THRESHOLD_LADDER:
			type = 'THRESHOLD_LADDER';
			label = 'Threshold ladder (cumulative)';
			break;
		case MarketStructureType.RANKING:
			type = 'CATEGORICAL';
			label = 'Ranking / categorical';
			break;
		case MarketStructureType.INDICATOR:
			type = 'THRESHOLD_LADDER';
			label = 'Indicator threshold ladder';
			break;
		case MarketStructureType.DEPENDENCY:
			type = 'DEPENDENCY';
			label = 'Dependency candidate';
			break;
		default:
			type = 'BINARY';
			label = 'Binary decision';
	}
	return {
		type,
		label,
		markets,
		rows: sortRowsAscending(rows),
	};
}
function stage3(structure: any): any {
	const { type, rows, markets } = structure;
	const byDateRegex = /by\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{4})/i;
	const allByDate = Array.isArray(rows) && rows.length > 1 && rows.every(r => byDateRegex.test(r.question));
	if (allByDate) {
		const timeDecayResult = analyzeTimeDecay(markets[0]);
		if (timeDecayResult.signals && timeDecayResult.signals.length > 0) {
			return {
				distortion: true,
				veto: false,
				rows,
				timeDecay: timeDecayResult.signals[0],
				reason: timeDecayResult.signals[0].message || 'Time decay mispricing detected',
			};
		}
		return {
			distortion: false,
			veto: false,
			rows,
			reason: 'No time decay mispricing detected',
		};
	}
	if (type === 'BINARY') {
		return {
			distortion: false,
			veto: true,
			rows,
			reason: 'Binary market — default avoid',
		};
	}
	if (type === 'CATEGORICAL') {
		return {
			distortion: false,
			veto: true,
			rows,
			reason: 'Categorical market — DDS not reliable here',
		};
	}
	if (type === 'THRESHOLD_LADDER') {
		const ladderResult = analyzeThresholdLadder(markets[0]);
		if (ladderResult.signals && ladderResult.signals.length > 0) {
			return {
				distortion: true,
				veto: false,
				rows,
				kink: ladderResult.signals[0],
				reason: ladderResult.signals[0].message || 'Threshold ladder distortion detected',
			};
		}
		return {
			distortion: false,
			veto: false,
			rows,
			reason: 'No threshold ladder distortion detected',
		};
	}
	if (type !== 'EXACT_BUCKET') {
		return {
			distortion: false,
			veto: true,
			rows,
			reason: 'Unknown structure — avoid',
		};
	}
	return analyzeDDS(structure);
}
function stage4(structure: any): any {
	const { type, rows } = structure;
	if (type === 'BINARY' || type === 'CATEGORICAL') {
		return {
			candidate: false,
			watchlist: false,
			reason: 'Binary/categorical markets default to avoid',
		};
	}
	const extreme = rows.find((r: any) => isExtremePrice(r.yes));
	if (extreme) {
		return {
			candidate: false,
			watchlist: false,
			reason: `Extreme price detected at ${pct(extreme.yes)} — auto avoid`,
		};
	}
	const sweetSpot = rows.find((r: any) => r.yes >= 0.3 && r.yes <= 0.6);
	if (sweetSpot) {
		return {
			candidate: false,
			watchlist: true,
			question: sweetSpot.question,
			yes: sweetSpot.yes,
			reason:
				`Watchlist only — "${sweetSpot.question}" at ${pct(sweetSpot.yes)} ` +
				`is in 30–60% zone but lacks confirmed structural edge`,
		};
	}
	return {
		candidate: false,
		watchlist: false,
		reason: 'No valid secondary confirmation',
	};
}
function stage5(s3Result: any): any {
	if (!s3Result || !s3Result.distortion) {
		return {
			action: 'AVOID',
			reason: 'No structural edge to execute',
		};
	}
	if (s3Result.spike) {
		const yes = s3Result.spike.yes;
		if (isExtremePrice(yes)) {
			return {
				action: 'AVOID',
				reason: `Extreme entry price at ${pct(yes)} — execution veto`,
			};
		}
		const direction = 'BUY NO';
		const noEntry = 1 - yes;
		const tpNo = clamp(noEntry * 1.8, noEntry + 0.03, 0.85);
		const slNo = clamp(noEntry * 0.55, 0.02, noEntry - 0.02);
		if (!(tpNo > noEntry && slNo < noEntry)) {
			return {
				action: 'AVOID',
				reason: 'Execution sanity check failed',
			};
		}
		return {
			action: 'TRADE',
			direction,
			entry: money(noEntry),
			tp: money(tpNo),
			sl: money(slNo),
			entryRaw: noEntry,
			tpRaw: tpNo,
			slRaw: slNo,
			note: s3Result.spike.question,
			source: 'Stage 3 — DDS structural distortion',
		};
	}
	if (s3Result.kink) {
		const { from, to, step, mean } = s3Result.kink;
		let direction = 'BUY YES';
		if (step > mean) direction = 'BUY NO';
		const entry = direction === 'BUY YES' ? from.yes : to.yes;
		if (isExtremePrice(entry)) {
			return {
				action: 'AVOID',
				reason: `Extreme entry price at ${pct(entry)} — execution veto`,
			};
		}
		const tp = clamp(entry * 1.7, entry + 0.03, 0.85);
		const sl = clamp(entry * 0.55, 0.02, entry - 0.02);
		if (!(tp > entry && sl < entry)) {
			return {
				action: 'AVOID',
				reason: 'Execution sanity check failed',
			};
		}
		return {
			action: 'TRADE',
			direction,
			entry: money(entry),
			tp: money(tp),
			sl: money(sl),
			entryRaw: entry,
			tpRaw: tp,
			slRaw: sl,
			note: direction === 'BUY YES' ? from.question : to.question,
			source: 'Stage 3 — Threshold ladder kink/gap/outlier',
		};
	}
	return {
		action: 'AVOID',
		reason: 'No structural edge to execute',
	};
}

// =====================
// Engine
// =====================
function runEngine(event: any): any {
	const title = getEventTitle(event);
	const rawMarkets = Array.isArray(event.markets) ? event.markets : [];
	const s1 = stage1(rawMarkets);
	if (!s1.pass) {
		return {
			title,
			action: 'AVOID',
			stopStage: 1,
			trail: [
				{ stage: 'S1', label: 'Market filter', pass: false, reason: s1.reason },
			],
		};
	}
	const s2 = stage2(s1.markets, title);
	const s3 = stage3(s2);
	if (s3.veto) {
		return {
			title,
			action: 'AVOID',
			stopStage: 3,
			s3,
			trail: [
				{ stage: 'S1', label: 'Market filter', pass: true, reason: s1.reason },
				{ stage: 'S2', label: 'Market structure', pass: true, reason: s2.label },
				{ stage: 'S3', label: 'Structural edge', pass: false, reason: s3.reason },
			],
		};
	}
	if (s3.distortion) {
		const s5 = stage5(s3);
		const isTrade = s5.action === 'TRADE';
		return {
			title,
			action: isTrade ? 'TRADE' : 'AVOID',
			stopStage: 5,
			s3,
			execution: s5,
			trail: [
				{ stage: 'S1', label: 'Market filter', pass: true, reason: s1.reason },
				{ stage: 'S2', label: 'Market structure', pass: true, reason: s2.label },
				{ stage: 'S3', label: 'Structural edge', pass: true, reason: s3.reason },
				{
					stage: 'S5',
					label: 'Execution',
					pass: isTrade,
					reason: isTrade
						? `${s5.direction} | Entry ${s5.entry} | TP ${s5.tp} | SL ${s5.sl}`
						: s5.reason,
				},
			],
		};
	}
	const s4 = stage4(s2);
	if (s4.watchlist) {
		return {
			title,
			action: 'WATCHLIST',
			stopStage: 4,
			s3,
			trail: [
				{ stage: 'S1', label: 'Market filter', pass: true, reason: s1.reason },
				{ stage: 'S2', label: 'Market structure', pass: true, reason: s2.label },
				{ stage: 'S3', label: 'Structural edge', pass: false, reason: s3.reason },
				{ stage: 'S4', label: 'Secondary filter', pass: null, reason: s4.reason },
			],
		};
	}
	return {
		title,
		action: 'AVOID',
		stopStage: 4,
		s3,
		trail: [
			{ stage: 'S1', label: 'Market filter', pass: true, reason: s1.reason },
			{ stage: 'S2', label: 'Market structure', pass: true, reason: s2.label },
			{ stage: 'S3', label: 'Structural edge', pass: false, reason: s3.reason },
			{ stage: 'S4', label: 'Secondary filter', pass: false, reason: s4.reason },
		],
	};
}

// =====================
// Printing
// =====================
function printProbabilityTable(s3: any): void {
	if (!s3 || !Array.isArray(s3.rows) || s3.rows.length === 0) return;
	console.log('         \x1b[90mProbability table:\x1b[0m');
	for (const row of s3.rows) {
		const isSpike = s3.spike && row.question === s3.spike.question;
		const bar = '█'.repeat(Math.round(row.yes * 20));
		const flag = isSpike ? ' \x1b[33m← DDS spike\x1b[0m' : '';
		console.log(
			`           ${shortQuestion(row.question)} ${pct(row.yes).padStart(4)}  ${bar}${flag}`
		);
	}
}
function printResult(result: any): void {
	function formatActionLabel(action: string): string {
		if (action === 'TRADE') return '\x1b[32m[⚡ TRADE]\x1b[0m';
		if (action === 'WATCHLIST') return '\x1b[33m[ WATCH ]\x1b[0m';
		return '\x1b[90m[ AVOID ]\x1b[0m';
	}
	console.log(`${formatActionLabel(result.action)} ${result.title}`);
	for (const step of result.trail) {
		const tick =
			step.pass === true
				? '\x1b[32m✓\x1b[0m'
				: step.pass === false
				? '\x1b[31m✗\x1b[0m'
				: '\x1b[90m—\x1b[0m';
		console.log(`         ${tick} ${step.stage} ${step.label}: ${step.reason}`);
	}
	if (result.s3) {
		printProbabilityTable(result.s3);
	}
	console.log('');
}

// =====================
// Fetchers for each exchange (Polymarket implemented, others placeholder)
// =====================
async function fetchPolymarketEvents(): Promise<any[]> {
	const url = `${POLYMARKET_API}/events?active=true&closed=false&limit=${EVENT_LIMIT}&order=volume&ascending=false`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Gamma API returned ${res.status}`);
	const data = await res.json();
	return Array.isArray(data) ? data : [];
}
// const fetchKalshiEvents(): Promise<any[]> {
// 	// Fetch Kalshi markets and wrap as events
// 	const markets = await fetchKalshiMarkets();
// 	// Group by ticker root (event) if possible, otherwise treat each market as an event
// 	const eventsMap: Record<string, any> = {};
// 	for (const m of markets) {
// 		// Use ticker root as event id (e.g., "INFLATION23_YES" -> "INFLATION23")
// 		const eventId = m.ticker.split('_')[0];
// 		if (!eventsMap[eventId]) {
// 			eventsMap[eventId] = {
// 				id: eventId,
// 				title: m.title,
// 				markets: [],
// 				tags: [],
// 			};
// 		}
// 		// Avoid duplicate id/title by spreading first, then explicitly setting
// 		eventsMap[eventId].markets.push({
// 			...m,
// 			question: m.title,
// 			outcomes: [], // Kalshi API v2 does not provide outcome prices directly
// 			volume: 0,
// 			tags: [],
// 		});
// 	}
// 	return Object.values(eventsMap);
// }
// fetchKalshiEvents is now imported directly from the connector, matching the modular pattern.
async function fetchManifoldEvents(): Promise<any[]> {
	const url = `${MANIFOLD_API}/v0/markets`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Manifold API returned ${res.status}`);
	const data = await res.json();
	if (!Array.isArray(data)) return [];

	// Group markets by groupId if present, else by normalized question stem
	const eventsMap: Record<string, any> = {};
	for (const m of data) {
		// Prefer groupId, else use normalized question stem
		const groupId = m.groupId || (m.question ? m.question.replace(/\s+/g, ' ').toLowerCase().replace(/[^a-z0-9 ]/g, '').slice(0, 48) : 'ungrouped');
		if (!eventsMap[groupId]) {
			eventsMap[groupId] = {
				id: groupId,
				title: m.groupName || m.question || 'Untitled',
				markets: [],
				tags: m.tags || [],
			};
		}
		eventsMap[groupId].markets.push(m);
	}
	return Object.values(eventsMap);
}
async function fetchStocksEvents(): Promise<any[]> {
	// TODO: Implement Stocks API fetch
	console.log('Stocks fetch not implemented yet.');
	return [];
}
async function fetchCurrenciesEvents(): Promise<any[]> {
	// TODO: Implement Currencies API fetch
	console.log('Currencies fetch not implemented yet.');
	return [];
}
async function fetchBondsEvents(): Promise<any[]> {
	// TODO: Implement Bonds API fetch
	console.log('Bonds fetch not implemented yet.');
	return [];
}

// =====================
// Main
// =====================
async function main() {
	console.log('');
	console.log(line('═'));
	console.log('  UNIVERSAL STRUCTURAL SCANNER');
	console.log(`  Exchange: ${exchange}`);
	console.log(line('═'));
	console.log('');

	let events: any[] = [];
	if (exchange === 'polymarket') {
		events = await fetchPolymarketEvents();
	} else if (exchange === 'kalshi') {
		events = await fetchKalshiEvents();
	} else if (exchange === 'manifold') {
		events = await fetchManifoldEvents();
	} else if (exchange === 'stocks') {
		events = await fetchStocksEvents();
	} else if (exchange === 'currencies') {
		events = await fetchCurrenciesEvents();
	} else if (exchange === 'bonds') {
		events = await fetchBondsEvents();
	} else {
		console.error(`Unknown exchange: ${exchange}`);
		process.exit(1);
	}

	// Gather all markets for orderbook fetch (Polymarket only for now)
	let allMarkets: any[] = [];
	if (exchange === 'polymarket') {
		allMarkets = events.flatMap(e => Array.isArray(e.markets) ? e.markets : []);
		// Fetch orderbooks for all markets (throttled)
		const orderbookMap = await fetchOrderbooksForMarkets(allMarkets, ORDERBOOK_THROTTLE);
		// Merge orderbook info into each market
		for (const event of events) {
			if (!event.markets) continue;
			for (const market of event.markets) {
				const ob = orderbookMap[market.id];
				if (ob && ob.outcomes) {
					for (let i = 0; i < (market.outcomes?.length || 0); ++i) {
						if (ob.outcomes[i]) {
							market.outcomes[i].bestBid = ob.outcomes[i].bestBid;
							market.outcomes[i].bestAsk = ob.outcomes[i].bestAsk;
						}
					}
				}
			}
		}
	}

	console.log(`Fetched ${events.length} events. Running engine...\n`);
	console.log(line());
	console.log('');


	// Run engine and score/sort signals
	const results = events.map(runEngine);
	let trades = results.filter((r) => r.action === 'TRADE');
	let watchlist = results.filter((r) => r.action === 'WATCHLIST');
	const avoids = results.filter((r) => r.action === 'AVOID');

	trades = scoreSignals(trades).sort((a, b) => b.confidenceScore - a.confidenceScore);
	watchlist = scoreSignals(watchlist).sort((a, b) => b.confidenceScore - a.confidenceScore);

	// Save a snapshot for each detected trade
	const now = Date.now();
	for (const trade of trades) {
		if (trade && trade.execution && trade.execution.entryRaw !== undefined) {
			saveMarketSnapshot({
				timestamp: now,
				exchange,
				marketId: trade.execution.marketId || trade.id || 'unknown',
				data: trade
			});
		}
	}

	// --- Anticipation Algorithm Integration (Advanced) ---

	// --- Fetch unified event calendar (automatic, from all sources) ---
	const rawCalendar: RawCalendarEvent[] = await buildUnifiedEventCalendar();
	// Optionally map RawCalendarEvent to CalendarEvent if needed (they are compatible)
	const calendar: CalendarEvent[] = rawCalendar;

	// Normalize events to EventGroup[] for anticipation algorithm
	const eventGroups: EventGroup[] = events.map((e: any, idx: number) => ({
		id: e.id || `event_${idx}`,
		title: e.title || e.question || `Event ${idx + 1}`,
		tags: e.tags || inferTagsFromTitle(e.title || e.question || ''),
		markets: Array.isArray(e.markets) ? e.markets.map((m: any, mIdx: number) => ({
			id: m.id || `market_${mIdx}`,
			question: m.question || m.title || `Market ${mIdx + 1}`,
			title: m.title || m.question || `Market ${mIdx + 1}`,
			resolutionDate: m.resolutionDate || m.endDate || '',
			outcomes: Array.isArray(m.outcomes) ? m.outcomes.map((o: any) => ({
				price: typeof o.price === 'number' ? o.price : parseFloat(o.price),
				history: o.history || []
			})) : [],
			volume: m.volume,
			tags: m.tags || inferTagsFromTitle(m.question || m.title || '')
		})) : []
	}));

	// Run anticipation algorithm
	const anticipationResults = analyzeAnticipationOpportunities(eventGroups, calendar, { anticipationWindowDays: 10, debug: false });
	if (anticipationResults.length > 0) {
		console.log('\x1b[35mANTICIPATION WATCHLIST\x1b[0m');
		console.log(line());
		anticipationResults.forEach((r) => {
			console.log(`  [${r.priority}] Score: ${r.score} | Event: ${r.calendarEvent}`);
			console.log(`    Market: ${r.market}`);
			console.log(`    Group: ${r.eventGroup}`);
			console.log(`    Days to event: ${r.daysToEvent}`);
			console.log(`    Reason: ${r.reason}`);
			console.log('');
		});
	} else {
		console.log('\x1b[90mNo anticipation watchlist signals found.\x1b[0m\n');
	}

// --- Helper to infer tags from title/question (simple keyword extraction) ---
function inferTagsFromTitle(title: string): string[] {
	if (!title) return [];
	const keywords = ['cpi', 'inflation', 'fed', 'rates', 'interest', 'election', 'weather', 'crypto', 'launch', 'unemployment', 'gdp', 'jobs', 'meeting'];
	const lower = title.toLowerCase();
	return keywords.filter(k => lower.includes(k));
}

	if (trades.length > 0) {
		console.log('\x1b[32mTRADE SIGNALS\x1b[0m');
		console.log(line());
		console.log('');
		trades.forEach((r) => {
			printResult(r);
			console.log(`         \x1b[36mConfidence Score: ${r.confidenceScore}\x1b[0m\n`);
		});
	} else {
		console.log('\x1b[90mNo TRADE signals found in this scan.\x1b[0m\n');
	}

	if (watchlist.length > 0) {
		console.log('\x1b[33mWATCHLIST\x1b[0m');
		console.log(line());
		console.log('');
		watchlist.forEach((r) => {
			printResult(r);
			console.log(`         \x1b[36mConfidence Score: ${r.confidenceScore}\x1b[0m\n`);
		});
	} else {
		console.log('\x1b[90mNo WATCHLIST markets found in this scan.\x1b[0m\n');
	}

	console.log('\x1b[90mAVOID\x1b[0m');
	console.log(line());
	console.log('');
	avoids.forEach(printResult);

	// Cross-market arbitrage detection (Polymarket only for now)
	if (exchange === 'polymarket') {
		const arbSignals = analyzeCrossMarketArb(events);
		if (arbSignals.length > 0) {
			console.log('\x1b[35mCROSS-MARKET ARBITRAGE SIGNALS\x1b[0m');
			console.log(line());
			for (const sig of arbSignals) {
				console.log(`  ${sig.message}`);
				console.log(`    Market A: ${sig.marketA.question} (${(sig.marketA.price * 100).toFixed(1)}%)`);
				console.log(`    Market B: ${sig.marketB.question} (${(sig.marketB.price * 100).toFixed(1)}%)`);
				console.log('');
			}
		} else {
			console.log('\x1b[90mNo cross-market arbitrage signals found.\x1b[0m\n');
		}
		const depSignals = analyzeEventDependency(events);
		if (depSignals.length > 0) {
			console.log('\x1b[36mEVENT DEPENDENCY DISTORTION SIGNALS\x1b[0m');
			console.log(line());
			for (const sig of depSignals) {
				console.log(`  ${sig.message}`);
				console.log(`    Trigger:   ${sig.marketA} (${(sig.probA * 100).toFixed(1)}%) [${sig.eventA}]`);
				console.log(`    Dependent: ${sig.marketB} (${(sig.probB * 100).toFixed(1)}%) [${sig.eventB}]`);
				console.log('');
			}
		} else {
			console.log('\x1b[90mNo event dependency distortion signals found.\x1b[0m\n');
		}
		const liquiditySignals = analyzeLiquidityVacuum(allMarkets);
		if (liquiditySignals.length > 0) {
			console.log('\x1b[34mLIQUIDITY VACUUM DISTORTION SIGNALS\x1b[0m');
			console.log(line());
			for (const sig of liquiditySignals) {
				console.log(`  Market: ${sig.marketTitle}`);
				console.log(`    Outcome: ${sig.outcome}`);
				if (sig.priceChangeAbs !== undefined) {
					console.log(`    Price: ${(sig.price * 100).toFixed(1)}% | Δ ${(sig.priceChangeAbs * 100).toFixed(1)}% | Vol: $${sig.volume}`);
				}
				if (sig.bestBid !== undefined && sig.bestAsk !== undefined) {
					console.log(`    Orderbook gap: ${(sig.bestBid * 100).toFixed(1)}% → ${(sig.bestAsk * 100).toFixed(1)}%`);
				}
				console.log(`    Reason: ${sig.reason}`);
				console.log('');
			}
		} else {
			console.log('\x1b[90mNo liquidity vacuum distortion signals found.\x1b[0m\n');
		}
		let foundVolCompression = false;
		for (const event of events) {
			if (!event.markets) continue;
			for (const market of event.markets) {
				const result = analyzeVolatilityCompression(market);
				if (result.signals && result.signals.length > 0) {
					if (!foundVolCompression) {
						console.log('\x1b[35mVOLATILITY COMPRESSION SIGNALS\x1b[0m');
						console.log(line());
						foundVolCompression = true;
					}
					for (const sig of result.signals) {
						console.log(`  Market: ${market.title || market.question}`);
						console.log(`    Outcome: ${sig.outcome}`);
						console.log(`    ${sig.message}`);
					}
				}
			}
		}
		if (!foundVolCompression) {
			console.log('\x1b[90mNo volatility compression signals found.\x1b[0m\n');
		}
		const sentimentSignals = analyzeSentimentImbalance(events);
		if (sentimentSignals.length > 0) {
			console.log('\x1b[36mSENTIMENT IMBALANCE SIGNALS\x1b[0m');
			console.log(line());
			for (const sig of sentimentSignals) {
				console.log(`  Market: ${sig.marketTitle}`);
				console.log(`    ${sig.message}`);
				if (sig.ladder && sig.ladder.length > 0) {
					console.log('    Ladder:');
					for (const q of sig.ladder) {
						console.log(`      - ${q}`);
					}
				}
				if (sig.details && sig.details.probs) {
					console.log(`    Probabilities: ${sig.details.probs.map((p: number) => (p*100).toFixed(1)+"%").join(", ")}`);
				}
				console.log('');
			}
		} else {
			console.log('\x1b[90mNo sentiment imbalance signals found.\x1b[0m\n');
		}
	}
	console.log(line('═'));
	console.log(
		`  SCAN COMPLETE — ${trades.length} TRADE · ${watchlist.length} WATCHLIST · ${avoids.length} AVOID across ${results.length} markets`
	);
	console.log(line('═'));
	console.log('');
}

main().catch((err) => {
	console.error('\x1b[31mUnhandled error:\x1b[0m', err);
	process.exit(1);
});
