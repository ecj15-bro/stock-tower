export interface StockCandidate {
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  volumeRatio: number;
  sector?: string;
  newsSummary?: string;
}

export type JurorName = "Marco" | "Tara" | "Victor" | "Mia" | "Rex";
export type JurorRole =
  | "Macro Economist"
  | "Technical Analyst"
  | "Value Investor"
  | "Momentum Trader"
  | "Risk Manager";

export interface JurorPersona {
  name: JurorName;
  role: JurorRole;
  systemPrompt: string;
}

export type Signal = "BULL" | "BEAR" | "HOLD";

export interface JurorArgument {
  juror: JurorName;
  role: JurorRole;
  signal: Signal;
  thesis: string;
  keyPoints: string[];
  confidence: number; // 0–100
}

export interface JurorRebuttal {
  juror: JurorName;
  updatedSignal: Signal;
  rebuttal: string;
  confidenceShift: number; // negative = lowered, positive = raised
}

export interface JuryDebate {
  ticker: string;
  round1: JurorArgument[];
  round2: JurorRebuttal[];
}

export type PositionType = "LONG" | "SHORT" | "SKIP";

export interface StockPick {
  id: string;
  ticker: string;
  companyName: string;
  price: number;
  changePercent: number;
  positionType: PositionType;
  convictionScore: number; // 0–100
  leadThesis: string;
  bullCount: number;
  bearCount: number;
  holdCount: number;
  debate: JuryDebate;
  generatedAt: string;
}
