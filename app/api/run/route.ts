import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { runOrchestrator } from "@/lib/orchestrator";
import { loadPicks, savePicks } from "@/lib/kv";

export const maxDuration = 300;

export async function POST() {
  let newPicks;

  // Record that the cron fired regardless of whether picks were generated
  const runTimestamp = new Date().toISOString();

  try {
    console.log("[API/run] Triggering orchestrator...");
    newPicks = await runOrchestrator();
  } catch (err) {
    console.error("[API/run] Orchestrator error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }

  // Always update last_run so we know the cron fired, even with 0 picks
  try {
    await kv.set("last_run", runTimestamp);
  } catch (kvErr) {
    console.error("[API/run] KV last_run update failed:", kvErr);
    // Non-fatal — continue
  }

  if (newPicks.length === 0) {
    return NextResponse.json({ success: true, message: "No picks generated.", picks: [] });
  }

  try {
    const existing = await loadPicks();
    const combined = [...newPicks, ...existing];
    await savePicks(combined);
  } catch (kvErr) {
    console.error("[API/run] KV save failed:", kvErr);
    return NextResponse.json({
      success: true,
      picks: newPicks,
      kvError: "Picks generated but could not be persisted: " + String(kvErr),
    });
  }

  return NextResponse.json({ success: true, picks: newPicks });
}

export async function GET() {
  return NextResponse.json({ message: "POST to this endpoint to run the pipeline." });
}
