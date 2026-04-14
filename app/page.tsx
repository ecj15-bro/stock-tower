"use client";

import { useEffect, useState, useCallback } from "react";
import { StockPick, JurorArgument, JurorRebuttal } from "@/lib/types";

type Tab = "picks" | "debate";

const JUROR_COLORS: Record<string, string> = {
  Marco: "#6C8EBF",
  Tara: "#D4A843",
  Victor: "#7BAE7F",
  Mia: "#C47CB5",
  Rex: "#B07070",
};

const SIGNAL_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  BULL: { color: "#4CAF7D", bg: "rgba(76,175,125,0.12)", label: "BULL" },
  BEAR: { color: "#E05C5C", bg: "rgba(224,92,92,0.12)", label: "BEAR" },
  HOLD: { color: "#888880", bg: "rgba(136,136,128,0.12)", label: "HOLD" },
};

const POSITION_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  LONG:  { color: "#4CAF7D", bg: "rgba(76,175,125,0.1)",  border: "rgba(76,175,125,0.3)" },
  SHORT: { color: "#E05C5C", bg: "rgba(224,92,92,0.1)",   border: "rgba(224,92,92,0.3)" },
  SKIP:  { color: "#888880", bg: "rgba(136,136,128,0.08)", border: "rgba(136,136,128,0.2)" },
};

function ConvictionBar({ score, position }: { score: number; position: string }) {
  const color = position === "LONG" ? "#4CAF7D" : position === "SHORT" ? "#E05C5C" : "#888880";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
      <div style={{
        flex: 1, height: 4, background: "rgba(255,255,255,0.06)",
        borderRadius: 2, overflow: "hidden"
      }}>
        <div style={{
          width: `${score}%`, height: "100%",
          background: color, borderRadius: 2,
          transition: "width 0.6s ease"
        }} />
      </div>
      <span style={{ fontSize: 11, color, fontFamily: "monospace", minWidth: 30 }}>
        {score}
      </span>
    </div>
  );
}

function JurorChip({ arg, rebuttal }: { arg: JurorArgument; rebuttal?: JurorRebuttal }) {
  const [expanded, setExpanded] = useState(false);
  const finalSignal = rebuttal?.updatedSignal ?? arg.signal;
  const sig = SIGNAL_STYLE[finalSignal];
  const color = JUROR_COLORS[arg.juror] ?? "#888";
  const shifted = rebuttal && rebuttal.updatedSignal !== arg.signal;

  return (
    <div style={{
      border: "0.5px solid rgba(255,255,255,0.08)",
      borderRadius: 8,
      overflow: "hidden",
      marginBottom: 6,
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", cursor: "pointer",
          background: expanded ? "rgba(255,255,255,0.03)" : "transparent",
          transition: "background 0.15s"
        }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: "50%",
          background: color + "22", border: `1px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 600, color, flexShrink: 0,
          fontFamily: "monospace"
        }}>
          {arg.juror[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
            {arg.juror}
            <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400, marginLeft: 6, fontSize: 11 }}>
              {arg.role}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
            {arg.thesis.length > 80 ? arg.thesis.slice(0, 80) + "…" : arg.thesis}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {shifted && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
              {arg.signal} →
            </span>
          )}
          <span style={{
            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
            fontFamily: "monospace", background: sig.bg, color: sig.color,
            border: `0.5px solid ${sig.color}44`
          }}>
            {finalSignal}
          </span>
          <span style={{
            fontSize: 11, color: "rgba(255,255,255,0.2)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s", display: "inline-block"
          }}>▾</span>
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
          <div style={{ paddingTop: 12 }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Round 1 thesis
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: 10 }}>
              {arg.thesis}
            </p>
            {arg.keyPoints?.length > 0 && (
              <ul style={{ paddingLeft: 0, listStyle: "none", marginBottom: 10 }}>
                {arg.keyPoints.map((pt, i) => (
                  <li key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", display: "flex", gap: 8, marginBottom: 4 }}>
                    <span style={{ color, flexShrink: 0 }}>—</span>
                    {pt}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, overflow: "hidden" }}>
                <div style={{ width: `${arg.confidence}%`, height: "100%", background: color, opacity: 0.6 }} />
              </div>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                R1 conf: {arg.confidence}
              </span>
            </div>
          </div>

          {rebuttal && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "0.5px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Round 2 rebuttal
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                {rebuttal.rebuttal}
              </p>
              {rebuttal.confidenceShift !== 0 && (
                <div style={{
                  marginTop: 8, fontSize: 10, fontFamily: "monospace",
                  color: rebuttal.confidenceShift > 0 ? "#4CAF7D" : "#E05C5C"
                }}>
                  Confidence {rebuttal.confidenceShift > 0 ? "+" : ""}{rebuttal.confidenceShift}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PickCard({
  pick,
  onViewDebate,
}: {
  pick: StockPick;
  onViewDebate: (p: StockPick) => void;
}) {
  const pos = POSITION_STYLE[pick.positionType];
  const changePos = pick.changePercent >= 0;

  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: `0.5px solid ${pos.border}`,
      borderRadius: 10, padding: "16px 18px",
      transition: "border-color 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 600, fontFamily: "monospace", color: "rgba(255,255,255,0.9)", letterSpacing: "0.03em" }}>
              {pick.ticker}
            </span>
            <span style={{
              padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
              fontFamily: "monospace", background: pos.bg, color: pos.color,
              border: `0.5px solid ${pos.border}`, letterSpacing: "0.08em"
            }}>
              {pick.positionType}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>
            {pick.companyName}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 15, fontFamily: "monospace", color: "rgba(255,255,255,0.8)", fontWeight: 500 }}>
            ${pick.price.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, fontFamily: "monospace", color: changePos ? "#4CAF7D" : "#E05C5C", marginTop: 2 }}>
            {changePos ? "+" : ""}{pick.changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
        {pick.leadThesis}
      </p>

      <ConvictionBar score={pick.convictionScore} position={pick.positionType} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "BULL", count: pick.bullCount, color: "#4CAF7D" },
            { label: "BEAR", count: pick.bearCount, color: "#E05C5C" },
            { label: "HOLD", count: pick.holdCount, color: "#888880" },
          ].map(({ label, count, color }) => (
            <span key={label} style={{ fontSize: 10, fontFamily: "monospace", color: count > 0 ? color : "rgba(255,255,255,0.2)" }}>
              {count} {label}
            </span>
          ))}
        </div>
        <button
          onClick={() => onViewDebate(pick)}
          style={{
            background: "transparent", border: "0.5px solid rgba(255,255,255,0.12)",
            borderRadius: 5, padding: "4px 10px", fontSize: 10,
            color: "rgba(255,255,255,0.45)", cursor: "pointer", fontFamily: "monospace",
            letterSpacing: "0.05em", transition: "all 0.15s"
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.3)";
            (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.7)";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
            (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)";
          }}
        >
          VIEW DEBATE ↗
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
        {new Date(pick.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

function DebatePanel({ pick, onClose }: { pick: StockPick; onClose: () => void }) {
  const pos = POSITION_STYLE[pick.positionType];
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, padding: "20px"
    }} onClick={onClose}>
      <div
        style={{
          background: "#0E0E0F", border: `0.5px solid rgba(255,255,255,0.1)`,
          borderRadius: 12, width: "100%", maxWidth: 600,
          maxHeight: "90vh", overflowY: "auto", padding: "24px"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 20, fontWeight: 600, fontFamily: "monospace", color: "rgba(255,255,255,0.9)" }}>
              {pick.ticker}
            </span>
            <span style={{
              marginLeft: 10, padding: "2px 8px", borderRadius: 4,
              fontSize: 10, fontWeight: 700, fontFamily: "monospace",
              background: pos.bg, color: pos.color, border: `0.5px solid ${pos.border}`
            }}>
              {pick.positionType}
            </span>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Jury debate transcript</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "0.5px solid rgba(255,255,255,0.12)",
              borderRadius: 6, width: 32, height: 32, cursor: "pointer",
              color: "rgba(255,255,255,0.4)", fontSize: 14, display: "flex",
              alignItems: "center", justifyContent: "center"
            }}
          >✕</button>
        </div>

        {pick.debate.round1.map((arg, i) => (
          <JurorChip
            key={arg.juror}
            arg={arg}
            rebuttal={pick.debate.round2[i]}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [picks, setPicks] = useState<StockPick[]>([]);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [runStatus, setRunStatus] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("picks");
  const [selectedPick, setSelectedPick] = useState<StockPick | null>(null);
  const [filter, setFilter] = useState<"ALL" | "LONG" | "SHORT" | "SKIP">("ALL");

  const fetchPicks = useCallback(async () => {
    try {
      const res = await fetch("/api/picks");
      const data = await res.json();
      setPicks(data.picks ?? []);
      setLastRun(data.lastRun ?? null);
    } catch {
      setPicks([]);
      setLastRun(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPicks(); }, [fetchPicks]);

  const handleRun = async () => {
    setRunning(true);
    setRunStatus("Running pipeline...");
    try {
      const res = await fetch("/api/run", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setRunStatus(`Done — ${data.picks?.length ?? 0} picks generated`);
        await fetchPicks();
      } else {
        setRunStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setRunStatus(`Failed: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const displayed = picks.filter((p) => filter === "ALL" || p.positionType === filter);
  const longCount = picks.filter((p) => p.positionType === "LONG").length;
  const shortCount = picks.filter((p) => p.positionType === "SHORT").length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0B",
      color: "rgba(255,255,255,0.85)",
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{
        borderBottom: "0.5px solid rgba(255,255,255,0.06)",
        padding: "16px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 32, height: 32, background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14
          }}>▲</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.1em", color: "rgba(255,255,255,0.9)" }}>
              STOCK TOWER
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
              jury-powered market intelligence
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {runStatus && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
              {runStatus}
            </span>
          )}
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              background: running ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.05)",
              border: "0.5px solid rgba(255,255,255,0.15)",
              borderRadius: 6, padding: "7px 14px", fontSize: 10,
              color: running ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.7)",
              cursor: running ? "not-allowed" : "pointer",
              fontFamily: "monospace", letterSpacing: "0.08em",
              transition: "all 0.15s"
            }}
          >
            {running ? "RUNNING..." : "▶ RUN PIPELINE"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        display: "flex", gap: 1, padding: "0 28px",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)"
      }}>
        {[
          { label: "Total picks", value: picks.length },
          { label: "Long", value: longCount, color: "#4CAF7D" },
          { label: "Short", value: shortCount, color: "#E05C5C" },
          { label: "Last run", value: lastRun ? new Date(lastRun).toLocaleString() : "Never" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "12px 20px",
            borderRight: "0.5px solid rgba(255,255,255,0.05)"
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: color ?? "rgba(255,255,255,0.8)", fontFamily: "monospace" }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{
        display: "flex", gap: 0, padding: "0 28px",
        borderBottom: "0.5px solid rgba(255,255,255,0.06)"
      }}>
        {(["ALL", "LONG", "SHORT", "SKIP"] as const).map((f) => {
          const active = filter === f;
          const color = f === "LONG" ? "#4CAF7D" : f === "SHORT" ? "#E05C5C" : f === "SKIP" ? "#888880" : "rgba(255,255,255,0.7)";
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: "transparent",
                border: "none",
                borderBottom: active ? `1px solid ${color}` : "1px solid transparent",
                padding: "12px 16px",
                fontSize: 10, fontFamily: "monospace", letterSpacing: "0.1em",
                color: active ? color : "rgba(255,255,255,0.25)",
                cursor: "pointer", transition: "all 0.15s", marginBottom: -1
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ padding: "24px 28px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
            Loading picks...
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", marginBottom: 12 }}>
              No picks yet. Run the pipeline to generate today's analysis.
            </div>
            <button
              onClick={handleRun}
              disabled={running}
              style={{
                background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.12)",
                borderRadius: 6, padding: "10px 20px", fontSize: 11,
                color: "rgba(255,255,255,0.5)", cursor: "pointer", fontFamily: "monospace"
              }}
            >
              ▶ Run first analysis
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 12
          }}>
            {displayed.map((pick) => (
              <PickCard
                key={pick.id}
                pick={pick}
                onViewDebate={setSelectedPick}
              />
            ))}
          </div>
        )}
      </div>

      {selectedPick && (
        <DebatePanel pick={selectedPick} onClose={() => setSelectedPick(null)} />
      )}
    </div>
  );
}
