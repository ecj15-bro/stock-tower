import { NextResponse } from "next/server";
import { getRedis } from "@/lib/kv";
import { StockPick } from "@/lib/types";

export async function GET() {
  try {
    const redis = getRedis();
    const [picks, lastRun] = await Promise.all([
      redis.get<StockPick[]>("picks"),
      redis.get<string>("last_run"),
    ]);

    return NextResponse.json({
      picks: picks ?? [],
      lastRun: lastRun ?? null,
    });
  } catch (err) {
    console.error("[API/picks] KV unavailable:", err);
    return NextResponse.json(
      { picks: [], lastRun: null, error: "KV unavailable" },
      { status: 200 }
    );
  }
}
