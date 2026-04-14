import { NextResponse } from "next/server";
import { getRedis, loadPicks, savePicks } from "@/lib/kv";
import { runOrchestrator } from "@/lib/orchestrator";

export const maxDuration = 300;

const COOLDOWN_SECONDS = 600; // 10 minutes between manual runs

export async function POST() {
  // Cooldown check — prevents hammering the pipeline from the dashboard
  try {
    const lastRun = await getRedis().get<string>("last_run");
    if (lastRun) {
      const elapsed = (Date.now() - new Date(lastRun).getTime()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
        return NextResponse.json(
          { success: false, error: `Pipeline ran ${Math.floor(elapsed / 60)}m ago. Try again in ${remaining}s.` },
          { status: 429 }
        );
      }
    }
  } catch {
    // If Redis is unavailable, allow the run through
  }

  const runTimestamp = new Date().toISOString();
  let newPicks;

  try {
    console.log("[API/trigger] Manual pipeline run starting...");
    newPicks = await runOrchestrator();
  } catch (err) {
    console.error("[API/trigger] Orchestrator error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }

  try {
    await getRedis().set("last_run", runTimestamp);
  } catch (kvErr) {
    console.error("[API/trigger] KV last_run update failed:", kvErr);
  }

  if (newPicks.length === 0) {
    return NextResponse.json({ success: true, message: "No picks generated.", picks: [] });
  }

  try {
    const existing = await loadPicks();
    const combined = [...newPicks, ...existing];
    await savePicks(combined);
  } catch (kvErr) {
    console.error("[API/trigger] KV save failed:", kvErr);
    return NextResponse.json({
      success: true,
      picks: newPicks,
      kvError: "Picks generated but could not be persisted: " + String(kvErr),
    });
  }

  return NextResponse.json({ success: true, picks: newPicks });
}
