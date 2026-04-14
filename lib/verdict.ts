import { JuryDebate, StockCandidate, StockPick, PositionType, Signal } from "./types";

const SIGNAL_WEIGHT = { BULL: 1, BEAR: -1, HOLD: 0 };

// Juror weights: momentum and technicals get a slight edge for short-term picks
const JUROR_WEIGHTS: Record<string, number> = {
  Marco: 0.85,  // macro is slower-moving
  Tara: 1.1,    // technicals matter now
  Victor: 0.8,  // value investor is long-horizon
  Mia: 1.15,    // momentum is most relevant for big movers
  Rex: 1.1,     // risk manager keeps us honest
};

export function runVerdict(
  candidate: StockCandidate,
  debate: JuryDebate
): StockPick {
  const { round1, round2 } = debate;

  // Final signal = round2 updated signal; fallback to round1 if parse failed
  const finalSignals = round2.map((r2, i) => ({
    juror: r2.juror,
    signal: r2.updatedSignal ?? round1[i].signal,
    confidence:
      Math.min(100, Math.max(0, round1[i].confidence + (r2.confidenceShift ?? 0))),
  }));

  // Weighted vote tally
  let weightedScore = 0;
  let totalWeight = 0;
  let bullCount = 0;
  let bearCount = 0;
  let holdCount = 0;

  for (const fs of finalSignals) {
    const w = JUROR_WEIGHTS[fs.juror] ?? 1;
    const signalVal = SIGNAL_WEIGHT[fs.signal as Signal];
    const confidenceNorm = fs.confidence / 100;
    weightedScore += signalVal * confidenceNorm * w;
    totalWeight += w;

    if (fs.signal === "BULL") bullCount++;
    else if (fs.signal === "BEAR") bearCount++;
    else holdCount++;
  }

  const normalizedScore = weightedScore / totalWeight; // -1 to +1

  // Map to conviction score (0–100) and position type
  let positionType: PositionType;
  let convictionScore: number;

  if (normalizedScore >= 0.25) {
    positionType = "LONG";
    convictionScore = Math.round(50 + normalizedScore * 50);
  } else if (normalizedScore <= -0.25) {
    positionType = "SHORT";
    convictionScore = Math.round(50 + Math.abs(normalizedScore) * 50);
  } else {
    positionType = "SKIP";
    convictionScore = Math.round(50 - Math.abs(normalizedScore) * 100);
  }

  // Lead thesis: use the highest-confidence juror who matches the final position
  const matchingSignal: Signal = positionType === "LONG" ? "BULL" : positionType === "SHORT" ? "BEAR" : "HOLD";
  const leadJurorIdx = round1
    .map((r, i) => ({ ...r, finalSignal: finalSignals[i].signal, finalConf: finalSignals[i].confidence }))
    .filter((r) => r.finalSignal === matchingSignal)
    .sort((a, b) => b.finalConf - a.finalConf)[0];

  const leadThesis = leadJurorIdx?.thesis ?? round1[0].thesis;

  return {
    id: `${candidate.ticker}-${Date.now()}`,
    ticker: candidate.ticker,
    companyName: candidate.companyName,
    price: candidate.price,
    changePercent: candidate.changePercent,
    positionType,
    convictionScore,
    leadThesis,
    bullCount,
    bearCount,
    holdCount,
    debate,
    generatedAt: new Date().toISOString(),
  };
}
