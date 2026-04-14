import { runWatchtower } from "./watchtower";
import { runScreener } from "./screener";
import { runJury } from "./jury";
import { runVerdict } from "./verdict";
import { StockPick } from "./types";

export async function runOrchestrator(): Promise<StockPick[]> {
  console.log("[Orchestrator] Stock Tower pipeline starting...");

  // Floor 1: Fetch movers
  const candidates = await runWatchtower();
  if (candidates.length === 0) {
    console.log("[Orchestrator] No candidates found. Exiting.");
    return [];
  }

  // Floor 2: Screen to top 5
  const shortlist = runScreener(candidates);

  // Floor 3 + 4: Run jury debate and verdict for each candidate (sequentially to respect rate limits)
  const picks: StockPick[] = [];
  for (const candidate of shortlist) {
    try {
      const debate = await runJury(candidate);
      const pick = runVerdict(candidate, debate);
      picks.push(pick);
      console.log(
        `[Orchestrator] ${candidate.ticker} → ${pick.positionType} | Conviction: ${pick.convictionScore}`
      );
    } catch (err) {
      console.error(`[Orchestrator] Failed on ${candidate.ticker}:`, err);
    }
  }

  // Sort by conviction score descending, skip SKIP positions to the bottom
  picks.sort((a, b) => {
    if (a.positionType === "SKIP" && b.positionType !== "SKIP") return 1;
    if (b.positionType === "SKIP" && a.positionType !== "SKIP") return -1;
    return b.convictionScore - a.convictionScore;
  });

  console.log(`[Orchestrator] Pipeline complete. ${picks.length} picks generated.`);
  return picks;
}
