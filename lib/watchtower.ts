import { StockCandidate } from "./types";

const POLYGON_API_KEY = process.env.POLYGON_API_KEY!;
const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY!;

interface AVMover {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string; // e.g. "3.45%"
  volume: string;
}

interface AVTopMovers {
  top_gainers?: AVMover[];
  top_losers?: AVMover[];
}

interface PolygonTickerDetail {
  name: string;
  sic_description?: string;
}

// Fetch top gainers and losers from Alpha Vantage (free tier)
async function fetchMovers(): Promise<{ ticker: string; price: number; changePercent: number; volume: number }[]> {
  const url = `https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Alpha Vantage movers fetch failed: ${res.status}`);
  const data: AVTopMovers = await res.json();

  const gainers = data.top_gainers ?? [];
  const losers = data.top_losers ?? [];

  return [...gainers, ...losers].map((m) => ({
    ticker: m.ticker,
    price: parseFloat(m.price),
    changePercent: parseFloat(m.change_percentage.replace("%", "")),
    volume: parseInt(m.volume, 10),
  }));
}

// Fetch company name and sector for a ticker (Polygon reference — free tier)
async function fetchTickerDetail(ticker: string): Promise<PolygonTickerDetail> {
  const url = `https://api.polygon.io/v3/reference/tickers/${ticker}?apiKey=${POLYGON_API_KEY}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return { name: ticker };
  const data = await res.json();
  return data.results ?? { name: ticker };
}

// Fetch recent news headlines for a ticker via Serper
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

  const raw = await fetchMovers();

  // Filter: price > $5, volume > 500k, change > ±3%
  const filtered = raw.filter((s) =>
    s.price > 5 && s.volume > 500_000 && Math.abs(s.changePercent) > 3
  );

  // Sort by absolute % change, take top 8
  const top = filtered
    .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
    .slice(0, 8);

  // Enrich with company names and news
  const candidates = await Promise.all(
    top.map(async (s): Promise<StockCandidate> => {
      const detail = await fetchTickerDetail(s.ticker);
      const newsSummary = await fetchNewsSummary(s.ticker, detail.name);

      return {
        ticker: s.ticker,
        companyName: detail.name,
        price: s.price,
        changePercent: s.changePercent,
        volume: s.volume,
        avgVolume: s.volume, // Alpha Vantage doesn't provide avg volume; volumeRatio defaults to 1
        volumeRatio: 1,
        sector: detail.sic_description,
        newsSummary,
      };
    })
  );

  console.log(`[Watchtower] Found ${candidates.length} candidates.`);
  return candidates;
}
