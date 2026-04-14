import { StockCandidate } from "./types";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY!;
const BASE = "https://api.polygon.io";

interface PolygonSnapshot {
  ticker: string;
  day: { o: number; h: number; l: number; c: number; v: number };
  prevDay: { c: number; v: number };
  todaysChangePerc: number;
  todaysChange: number;
}

interface PolygonTickerDetail {
  name: string;
  sic_description?: string;
}

// Fetch gainers and losers from the snapshot endpoint
async function fetchMovers(direction: "gainers" | "losers"): Promise<PolygonSnapshot[]> {
  const url = `${BASE}/v2/snapshot/locale/us/markets/stocks/${direction}?apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Polygon ${direction} fetch failed: ${res.status}`);
  const data = await res.json();
  return data.tickers ?? [];
}

// Fetch company name for a ticker
async function fetchTickerDetail(ticker: string): Promise<PolygonTickerDetail> {
  const url = `${BASE}/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { name: ticker };
  const data = await res.json();
  return data.results ?? { name: ticker };
}

// Fetch recent news headline summary for a ticker using Serper
async function fetchNewsSummary(ticker: string, companyName: string): Promise<string> {
  const apiKey = process.env.SERPER_API_KEY!;
  try {
    const res = await fetch("https://google.serper.dev/news", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${companyName} ${ticker} stock`, num: 3 }),
    });
    const data = await res.json();
    const headlines = (data.news ?? [])
      .slice(0, 3)
      .map((n: { title: string; snippet?: string }) => `- ${n.title}: ${n.snippet ?? ""}`)
      .join("\n");
    return headlines || "No recent news found.";
  } catch {
    return "News unavailable.";
  }
}

export async function runWatchtower(): Promise<StockCandidate[]> {
  console.log("[Watchtower] Fetching market movers...");

  const [gainers, losers] = await Promise.all([
    fetchMovers("gainers"),
    fetchMovers("losers"),
  ]);

  // Combine and filter: price > $5, volume > 500k, change > ±3%
  const raw = [...gainers, ...losers].filter((s) => {
    const price = s.day?.c ?? 0;
    const vol = s.day?.v ?? 0;
    const change = Math.abs(s.todaysChangePerc ?? 0);
    return price > 5 && vol > 500_000 && change > 3;
  });

  // Sort by absolute % change, take top 8
  const top = raw
    .sort((a, b) => Math.abs(b.todaysChangePerc) - Math.abs(a.todaysChangePerc))
    .slice(0, 8);

  // Enrich with company names and news
  const candidates = await Promise.all(
    top.map(async (s): Promise<StockCandidate> => {
      const detail = await fetchTickerDetail(s.ticker);
      const avgVolume = s.prevDay?.v ?? s.day?.v ?? 1;
      const volumeRatio = s.day?.v / avgVolume;
      const newsSummary = await fetchNewsSummary(s.ticker, detail.name);

      return {
        ticker: s.ticker,
        companyName: detail.name,
        price: s.day?.c ?? 0,
        changePercent: s.todaysChangePerc ?? 0,
        volume: s.day?.v ?? 0,
        avgVolume,
        volumeRatio,
        sector: detail.sic_description,
        newsSummary,
      };
    })
  );

  console.log(`[Watchtower] Found ${candidates.length} candidates.`);
  return candidates;
}
