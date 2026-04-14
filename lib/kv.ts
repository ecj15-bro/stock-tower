import { kv } from "@vercel/kv";
import { StockPick } from "./types";

const PICKS_KEY = "picks";
const MAX_PICKS = 100;

export async function loadPicks(): Promise<StockPick[]> {
  const picks = await kv.get<StockPick[]>(PICKS_KEY);
  return picks ?? [];
}

export async function savePicks(picks: StockPick[]): Promise<void> {
  await kv.set(PICKS_KEY, picks.slice(0, MAX_PICKS));
}
