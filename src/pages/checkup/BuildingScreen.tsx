import { useEffect, useState } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { isConferenceMode, clearFlowParams } from "./conferenceFallback";

interface BuildingState {
  businessName: string;
  specialty: string;
  email: string;
  referralCode?: string | null;
  checkupScore?: number | null;
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "At Risk";
  return "Needs Attention";
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

const CHECKS = [
  "Your competitors have been mapped",
  "Your clarity score is live",
  "First briefing queued for Monday at 7:15 AM",
];

export default function BuildingScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as BuildingState | undefined;
  const [ready, setReady] = useState(false);
  const [visibleChecks, setVisibleChecks] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      const retry = setTimeout(() => {
        const retryToken = localStorage.getItem("auth_token");
        if (retryToken) setReady(true);
        else navigate("/signin", { replace: true });
      }, 2000);
      return () => clearTimeout(retry);
    }
    setReady(true);
  }, [navigate]);

  // Stagger the check items in
  useEffect(() => {
    if (!ready) return;
    CHECKS.forEach((_, i) => {
      setTimeout(() => setVisibleChecks((v) => Math.max(v, i + 1)), i * 600 + 400);
    });
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const conference = isConferenceMode();
    const destination = conference ? "/checkup/share" : "/checkup/share";
    const timer = setTimeout(() => {
      clearFlowParams();
      navigate(destination, {
        replace: true,
        state: {
          referralCode: state?.referralCode || null,
          checkupScore: state?.checkupScore || null,
          businessName: state?.businessName || null,
        },
      });
    }, 4000);
    return () => clearTimeout(timer);
  }, [ready, navigate, state]);

  if (!state?.businessName) {
    return <Navigate to="/checkup" replace />;
  }

  const { businessName, email, checkupScore } = state;
  const scoreColor = checkupScore != null ? getScoreColor(checkupScore) : "#D56753";
  const scoreLabel = checkupScore != null ? getScoreLabel(checkupScore) : null;

  return (
    <div className="w-full max-w-[460px] mt-4 sm:mt-10 space-y-6">

      {/* Confirmation icon + headline */}
      <div className="anim-fade-up text-center space-y-4" style={{ animationDelay: '0ms' }}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div>
          <h2 className="font-heading text-[28px] sm:text-[34px] font-semibold text-[#1A1D23] tracking-tight leading-tight">
            {businessName} is set up.
          </h2>
          <p className="text-sm text-[#1A1D23]/45 mt-2">Here's what just happened.</p>
        </div>
      </div>

      {/* Score card */}
      {checkupScore != null && checkupScore > 0 && (
        <div className="anim-scale-in relative bg-white rounded-2xl border border-[#1A1D23]/6 shadow-[0_8px_40px_rgba(26,29,35,0.07)] overflow-hidden" style={{ animationDelay: '200ms' }}>
          <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `linear-gradient(to bottom, ${scoreColor}, ${scoreColor}99)` }} />
          <div className="pl-7 pr-6 py-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#1A1D23]/35 mb-1">
                Business Clarity Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[48px] font-heading font-semibold leading-none text-[#1A1D23]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {checkupScore}
                </span>
                <span className="text-sm font-bold" style={{ color: scoreColor }}>{scoreLabel}</span>
              </div>
              <p className="text-xs text-[#1A1D23]/35 mt-1.5">Updates every week in your dashboard</p>
            </div>
            <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: `${scoreColor}12` }}>
              <TrendingUp className="w-7 h-7" style={{ color: scoreColor }} />
            </div>
          </div>
        </div>
      )}

      {/* Staggered check list */}
      <div className="space-y-2.5">
        {CHECKS.map((text, i) => (
          <div
            key={i}
            className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all duration-500 ${
              visibleChecks > i
                ? "bg-white border-[#1A1D23]/6 opacity-100 shadow-[0_2px_12px_rgba(26,29,35,0.05)]"
                : "bg-transparent border-transparent opacity-0"
            }`}
          >
            <div className="shrink-0 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mt-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-[#1A1D23]/70 leading-snug">
              {text}
              {i === 2 && email && (
                <> — <span className="text-[#1A1D23]">{email}</span></>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
