import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { StockPick } from "@/lib/types";

export async function GET() {
  try {
    const [picks, lastRun] = await Promise.all([
      kv.get<StockPick[]>("picks"),
      kv.get<string>("last_run"),
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
