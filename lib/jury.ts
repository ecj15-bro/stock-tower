import Anthropic from "@anthropic-ai/sdk";
import {
  StockCandidate,
  JurorPersona,
  JurorArgument,
  JurorRebuttal,
  JuryDebate,
  Signal,
} from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const JURORS: JurorPersona[] = [
  {
    name: "Marco",
    role: "Macro Economist",
    systemPrompt: `You are Marco, a seasoned macro economist on a stock jury. 
You evaluate stocks through the lens of macroeconomic conditions: interest rates, inflation, GDP trends, sector cycles, Fed policy, and global capital flows. 
You think in cycles and regimes. You're decisive, slightly bearish on overvalued sectors, and always tie your argument to the bigger economic picture.
Respond ONLY with a JSON object, no markdown or preamble.`,
  },
  {
    name: "Tara",
    role: "Technical Analyst",
    systemPrompt: `You are Tara, a sharp technical analyst on a stock jury.
You read price action, volume, support/resistance levels, moving averages, and momentum indicators.
You don't care about fundamentals — you care about what the chart is doing. You're pattern-driven and probabilistic.
Respond ONLY with a JSON object, no markdown or preamble.`,
  },
  {
    name: "Victor",
    role: "Value Investor",
    systemPrompt: `You are Victor, a disciplined value investor on a stock jury. 
You evaluate intrinsic value, P/E ratios, free cash flow, balance sheet strength, and margin of safety.
You're skeptical of hype and momentum plays. You love beaten-down quality businesses and are patient.
Respond ONLY with a JSON object, no markdown or preamble.`,
  },
  {
    name: "Mia",
    role: "Momentum Trader",
    systemPrompt: `You are Mia, an aggressive momentum trader on a stock jury.
You follow price momentum, relative strength, earnings surprises, and news catalysts.
You get in early, ride the wave, and get out fast. You're bullish on big movers with volume confirmation.
Respond ONLY with a JSON object, no markdown or preamble.`,
  },
  {
    name: "Rex",
    role: "Risk Manager",
    systemPrompt: `You are Rex, a cautious risk manager on a stock jury.
You evaluate downside scenarios, tail risks, liquidity, short interest, insider selling, and volatility.
You're the voice of skepticism. You ask "what could go wrong?" and size your conviction by asymmetry of outcomes.
Respond ONLY with a JSON object, no markdown or preamble.`,
  },
];

const ARGUMENT_PROMPT = (c: StockCandidate) => `
Evaluate this stock for a potential trade entry TODAY.

Ticker: ${c.ticker}
Company: ${c.companyName}
Current Price: $${c.price.toFixed(2)}
Today's Change: ${c.changePercent > 0 ? "+" : ""}${c.changePercent.toFixed(2)}%
Volume: ${c.volume.toLocaleString()} (${c.volumeRatio.toFixed(1)}x average)
Sector: ${c.sector ?? "Unknown"}
Recent News:
${c.newsSummary}

Return ONLY this JSON:
{
  "signal": "BULL" | "BEAR" | "HOLD",
  "thesis": "One sentence summary of your position",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "confidence": <number 0-100>
}
`;

const REBUTTAL_PROMPT = (
  c: StockCandidate,
  myArg: JurorArgument,
  otherArgs: JurorArgument[]
) => `
You previously argued ${myArg.signal} on ${c.ticker} with ${myArg.confidence}% confidence.
Your thesis: ${myArg.thesis}

The other jurors have weighed in:
${otherArgs.map((a) => `${a.juror} (${a.role}): ${a.signal} — ${a.thesis}`).join("\n")}

Having heard the full jury, do you hold your position or update it? 

Return ONLY this JSON:
{
  "updatedSignal": "BULL" | "BEAR" | "HOLD",
  "rebuttal": "One to two sentences: do you stand firm or shift, and why?",
  "confidenceShift": <number, e.g. +10 or -15>
}
`;

async function callJuror<T>(
  persona: JurorPersona,
  userPrompt: string
): Promise<T> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: persona.systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = (msg.content[0] as { text: string }).text.trim();
  const cleaned = raw
    .replace(/```json|```/g, "")
    .replace(/:\s*\+(\d)/g, ": $1")
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function runJury(candidate: StockCandidate): Promise<JuryDebate> {
  console.log(`[Jury] Starting debate for ${candidate.ticker}...`);

  // Round 1: All 5 jurors argue in parallel
  const round1Raw = await Promise.all(
    JURORS.map((juror) =>
      callJuror<{ signal: Signal; thesis: string; keyPoints: string[]; confidence: number }>(
        juror,
        ARGUMENT_PROMPT(candidate)
      ).then((result) => ({
        juror: juror.name,
        role: juror.role,
        signal: result.signal,
        thesis: result.thesis,
        keyPoints: result.keyPoints,
        confidence: result.confidence,
      }))
    )
  );

  console.log(
    `[Jury] Round 1 complete for ${candidate.ticker}: ${round1Raw.map((j) => `${j.juror}:${j.signal}`).join(", ")}`
  );

  // Round 2: Each juror sees everyone else's round 1, then rebuts in parallel
  const round2Raw = await Promise.all(
    JURORS.map((juror, i) => {
      const myArg = round1Raw[i];
      const otherArgs = round1Raw.filter((_, j) => j !== i);
      return callJuror<{ updatedSignal: Signal; rebuttal: string; confidenceShift: number }>(
        juror,
        REBUTTAL_PROMPT(candidate, myArg, otherArgs)
      ).then((result) => ({
        juror: juror.name,
        updatedSignal: result.updatedSignal,
        rebuttal: result.rebuttal,
        confidenceShift: result.confidenceShift,
      }));
    })
  );

  console.log(`[Jury] Round 2 complete for ${candidate.ticker}.`);

  return {
    ticker: candidate.ticker,
    round1: round1Raw,
    round2: round2Raw,
  };
}
