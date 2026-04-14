import { Redis } from "@upstash/redis";
import { StockPick } from "./types";

const REQUIRED_ENV = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "ANTHROPIC_API_KEY",
  "ALPHA_VANTAGE_API_KEY",
  "POLYGON_API_KEY",
  "SERPER_API_KEY",
  "CRON_SECRET",
];

let _redis: Redis | null = null;

// Lazily validate env vars and create the Redis client.
// Throws a descriptive error on first use if any required var is missing,
// so misconfigurations surface at request time rather than breaking the build.
export function getRedis(): Redis {
  if (!_redis) {
    for (const key of REQUIRED_ENV) {
      if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    }
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

const PICKS_KEY = "picks";
const MAX_PICKS = 100;

export async function loadPicks(): Promise<StockPick[]> {
  const picks = await getRedis().get<StockPick[]>(PICKS_KEY);
  return picks ?? [];
}

export async function savePicks(picks: StockPick[]): Promise<void> {
  await getRedis().set(PICKS_KEY, picks.slice(0, MAX_PICKS));
}
