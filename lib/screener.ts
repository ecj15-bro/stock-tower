import { StockCandidate } from "./types";

function scoreCandidate(c: StockCandidate): number {
  const changeMagnitude = Math.abs(c.changePercent) * 2;   // weight: move size
  const volumeBoost = Math.min(c.volumeRatio, 5) * 10;     // weight: unusual volume (cap at 5x)
  const newsBoost = c.newsSummary && c.newsSummary !== "No recent news found." ? 15 : 0;
  return changeMagnitude + volumeBoost + newsBoost;
}

export function runScreener(candidates: StockCandidate[]): StockCandidate[] {
  console.log(`[Screener] Scoring ${candidates.length} candidates...`);

  const scored = candidates
    .map((c) => ({ ...c, _score: scoreCandidate(c) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5);

  console.log(`[Screener] Top picks: ${scored.map((c) => c.ticker).join(", ")}`);
  return scored;
}
