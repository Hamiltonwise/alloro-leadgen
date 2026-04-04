/**
 * SharedResults -- /checkup/shared/:shareId
 *
 * Public page that renders a shared Checkup result card.
 * Shows market data only (no practice name). Prompts visitor
 * to run their own Checkup. Viral loop.
 */

import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Loader2, BarChart3, Users, Star } from "lucide-react";

interface SharedCard {
  score: number;
  city: string;
  specialty: string;
  rank: number;
  totalCompetitors: number;
  topCompetitorName: string | null;
}

function getScoreColor(score: number): string {
  if (score >= 75) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#D56753";
}

function getScoreLabel(score: number): string {
  if (score >= 75) return "Strong Position";
  if (score >= 40) return "Building Momentum";
  return "Your Starting Point";
}

export default function SharedResults() {
  const { shareId } = useParams<{ shareId: string }>();
  const [card, setCard] = useState<SharedCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    fetch(`/api/checkup/shared/${shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.card) {
          setCard(data.card);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [shareId]);

  const color = card ? getScoreColor(card.score) : "#D56753";
  const label = card ? getScoreLabel(card.score) : "";

  return (
    <div className="min-h-dvh bg-linen-grid flex flex-col">
      {/* Header */}
      <header className="flex flex-col items-center pt-10 pb-7 px-4 anim-slide-down">
        <Link to="/checkup" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Alloro" className="h-9 w-auto" />
          <span className="font-heading font-bold text-[22px] tracking-tight text-[#1A1D23]">
            Alloro
          </span>
        </Link>
        <div className="flex items-center gap-4 mt-5 w-full max-w-[280px]">
          <div className="flex-1 h-px bg-[#1A1D23]/8" />
          <span className="text-[10px] font-bold tracking-[0.22em] text-[#1A1D23]/22 uppercase whitespace-nowrap">
            Business Clarity
          </span>
          <div className="flex-1 h-px bg-[#1A1D23]/8" />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-5 pb-12">
        {loading && (
          <div className="flex flex-col items-center gap-3 mt-20 anim-fade-in">
            <div className="w-8 h-8 rounded-full border-2 border-[#D56753]/20 border-t-[#D56753] animate-spin" />
            <p className="text-sm text-[#1A1D23]/35 font-medium tracking-wide">Loading market data…</p>
          </div>
        )}

        {error && (
          <div className="max-w-[440px] w-full text-center mt-16 anim-fade-up">
            <h1 className="font-heading text-[26px] font-semibold text-[#1A1D23] mb-3">
              This link has expired
            </h1>
            <p className="text-[15px] text-[#1A1D23]/45 mb-8 leading-relaxed">
              Run your own free Checkup to see your market.
            </p>
            <Link
              to="/checkup"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D56753] text-white text-sm font-bold px-7 py-3.5 hover:bg-[#bf4b36] active:scale-[0.97] transition-all shadow-[0_4px_20px_rgba(214,104,83,0.35)]"
            >
              Run your free Checkup
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {card && (
          <div className="max-w-[440px] w-full mt-6 space-y-5">
            {/* Framing headline */}
            <div className="anim-fade-up text-center" style={{ animationDelay: '0ms' }}>
              <p className="font-heading text-[22px] sm:text-[26px] font-semibold text-[#1A1D23] tracking-tight leading-tight">
                A colleague scored{" "}
                <span style={{ color }}>{card.score}</span>.
                <br />Where do you rank?
              </p>
              <p className="text-sm text-[#1A1D23]/40 mt-2">
                {card.specialty} in {card.city}
              </p>
            </div>

            {/* Score card */}
            <div className="anim-scale-in relative bg-white rounded-2xl border border-[#1A1D23]/6 shadow-[0_8px_40px_rgba(26,29,35,0.08)] overflow-hidden" style={{ animationDelay: '120ms' }}>
              {/* Top accent bar */}
              <div className="h-[3px]" style={{ background: `linear-gradient(to right, ${color}, ${color}99)` }} />

              <div className="px-7 pt-7 pb-6 space-y-6">
                {/* Score ring */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div
                      className="w-32 h-32 rounded-full flex flex-col items-center justify-center border-[6px]"
                      style={{
                        borderColor: `${color}25`,
                        background: `${color}06`,
                        boxShadow: `0 4px 24px ${color}18`,
                      }}
                    >
                      <span className="font-heading text-[40px] font-semibold leading-none text-[#1A1D23]">{card.score}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color }}>
                        {label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Context message */}
                <p className="text-sm text-center font-medium leading-relaxed" style={{ color }}>
                  {card.score >= 75
                    ? "Strong foundation."
                    : card.score >= 40
                      ? "Room to grow — and we know exactly where."
                      : "There's a clear path forward."}
                </p>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: BarChart3, value: `#${card.rank}`, label: "Rank" },
                    { icon: Users, value: card.totalCompetitors, label: "Competitors" },
                    { icon: Star, value: card.score, label: "Score" },
                  ].map(({ icon: Icon, value, label: statLabel }) => (
                    <div key={statLabel} className="text-center bg-[#FDFCF9] rounded-xl py-3.5 border border-[#1A1D23]/5">
                      <Icon className="w-3.5 h-3.5 mx-auto mb-1.5" style={{ color }} />
                      <p className="font-heading text-[18px] font-semibold text-[#1A1D23] leading-none">{value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#1A1D23]/30 mt-1">{statLabel}</p>
                    </div>
                  ))}
                </div>

                {card.topCompetitorName && (
                  <p className="text-sm text-[#1A1D23]/50 text-center leading-relaxed -mt-2">
                    Top competitor:{" "}
                    <span className="font-semibold text-[#1A1D23]">{card.topCompetitorName}</span>
                  </p>
                )}

                {/* CTA */}
                <div className="pt-4 border-t border-[#1A1D23]/6 space-y-3">
                  <Link
                    to="/checkup"
                    className="flex items-center justify-center gap-2 w-full rounded-xl text-white text-sm font-bold px-6 py-3.5 hover:brightness-110 active:scale-[0.97] transition-all shadow-[0_4px_16px_rgba(214,104,83,0.35)]"
                    style={{ backgroundColor: "#D56753" }}
                  >
                    Check your score
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-center text-[11px] text-[#1A1D23]/28 font-medium">
                    Free · 60 seconds · No one sees your results but you
                  </p>
                  <p className="text-center font-heading text-sm font-semibold text-[#1A1D23] pt-1">
                    Can you beat {card.score}?
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 text-center anim-fade-in" style={{ animationDelay: '400ms' }}>
        <div className="flex items-center gap-4 mx-auto max-w-[240px] mb-5">
          <div className="flex-1 h-px bg-[#1A1D23]/6" />
          <div className="w-1 h-1 rounded-full bg-[#D56753]/30" />
          <div className="flex-1 h-px bg-[#1A1D23]/6" />
        </div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#1A1D23]/20 uppercase">
          Alloro &middot; Business Clarity
        </p>
      </footer>
    </div>
  );
}
