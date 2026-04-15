import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, Share2 } from "lucide-react";
import { trackEvent } from "../../api/tracking";

/**
 * /checkup/share -- Colleague share screen shown immediately after account creation.
 * This is the moment of maximum excitement. The doctor just saw their Oz moment,
 * created an account, and their colleague is standing 10 feet away.
 * One screen. One action. Make sharing effortless.
 */

interface ShareState {
  referralCode?: string | null;
  checkupScore?: number | null;
  businessName?: string | null;
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

export default function ColleagueShare() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ShareState | undefined;
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const referralCode = state?.referralCode || null;
  const checkupScore = state?.checkupScore || null;

  const checkupLink = referralCode
    ? `${window.location.origin}/checkup?ref=${referralCode}`
    : `${window.location.origin}/checkup`;

  const shareMessage =
    "I just found out where I rank in my market. Took 60 seconds. You should see yours: " +
    checkupLink;

  const handleShare = useCallback(async () => {
    trackEvent("colleague_share.attempted", {
      method: "native_share",
      has_referral: !!referralCode,
    });

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareMessage,
        });
        setShared(true);
        trackEvent("colleague_share.completed", {
          method: "native_share",
          has_referral: !!referralCode,
        });
      } catch {
        // User cancelled or share failed, that's fine
      }
    } else {
      // Fallback: open SMS with pre-filled body
      const smsUrl = `sms:?&body=${encodeURIComponent(shareMessage)}`;
      window.open(smsUrl, "_self");
      trackEvent("colleague_share.completed", {
        method: "sms_fallback",
        has_referral: !!referralCode,
      });
    }
  }, [shareMessage, referralCode]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(checkupLink);
      setCopied(true);
      trackEvent("colleague_share.link_copied", {
        has_referral: !!referralCode,
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API not available, select the text instead
      const input = document.querySelector<HTMLInputElement>("#share-link-input");
      if (input) {
        input.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    }
  }, [checkupLink, referralCode]);

  const handleSkip = useCallback(() => {
    trackEvent("colleague_share.skipped", {
      has_referral: !!referralCode,
    });
    navigate("/owner-profile", { replace: true });
  }, [navigate, referralCode]);

  return (
    <div className="w-full max-w-[440px] mt-4 sm:mt-10 space-y-5">

      {/* Score badge */}
      {checkupScore != null && (
        <div className="anim-fade-up flex justify-center mb-2" style={{ animationDelay: '0ms' }}>
          <div className="relative inline-flex flex-col items-center">
            <div
              className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center border-2 shadow-[0_8px_32px_rgba(26,29,35,0.08)]"
              style={{ borderColor: `${getScoreColor(checkupScore)}40`, background: `${getScoreColor(checkupScore)}08` }}
            >
              <span className="font-heading text-[40px] font-semibold leading-none text-[#1A1D23]">
                {checkupScore}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] mt-1" style={{ color: getScoreColor(checkupScore) }}>
                {getScoreLabel(checkupScore)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Headline */}
      <div className="anim-fade-up text-center space-y-2.5" style={{ animationDelay: '80ms' }}>
        <h1 className="font-heading text-[26px] sm:text-[30px] font-semibold text-[#1A1D23] tracking-tight leading-tight">
          Know someone who should see theirs?
        </h1>
        <p className="text-sm text-[#1A1D23]/45 leading-relaxed max-w-xs mx-auto">
          60 seconds. Send the link and they'll see exactly where they stand.
        </p>
      </div>

      {/* Message preview card */}
      <div className="anim-scale-in relative bg-white rounded-2xl border border-[#1A1D23]/6 shadow-[0_4px_24px_rgba(26,29,35,0.06)] overflow-hidden" style={{ animationDelay: '160ms' }}>
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-[#D56753] to-[#e57c6a]" />
        <div className="pl-6 pr-5 py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1A1D23]/30 mb-3">Your message</p>
          <p className="text-sm text-[#1A1D23]/70 leading-relaxed">
            "I just found out where I rank in my market. Took 60 seconds. You should see yours:{" "}
            <span className="text-[#D56753] font-semibold break-all">{checkupLink}</span>"
          </p>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        className="anim-fade-up w-full py-4 px-6 rounded-xl text-white font-bold text-[15px] tracking-tight transition-all duration-200 active:scale-[0.97] hover:brightness-110 shadow-[0_4px_20px_rgba(214,104,83,0.35)]"
        style={{ backgroundColor: "#D56753", animationDelay: '240ms' }}
      >
        <span className="flex items-center justify-center gap-2.5">
          <Share2 className="w-4.5 h-4.5" />
          {shared ? "Sent!" : "Send via text"}
        </span>
      </button>

      {/* Copy link */}
      <div className="anim-fade-up flex items-center gap-2" style={{ animationDelay: '300ms' }}>
        <input
          id="share-link-input"
          type="text"
          readOnly
          value={checkupLink}
          className="flex-1 text-xs text-[#1A1D23]/40 bg-white border border-[#1A1D23]/8 rounded-xl px-3.5 py-3 truncate focus:outline-none font-medium"
        />
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 px-4 py-3 rounded-xl border border-[#1A1D23]/8 bg-white text-sm font-semibold text-[#1A1D23] hover:bg-[#FDFCF9] transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-emerald-600">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Rise Together */}
      {referralCode && (
        <div className="anim-scale-in bg-[#D56753]/5 border border-[#D56753]/15 rounded-xl p-4" style={{ animationDelay: '360ms' }}>
          <p className="text-[10px] font-bold text-[#D56753] uppercase tracking-[0.18em] mb-1.5">Rise Together</p>
          <p className="text-sm text-[#1A1D23]/70 leading-relaxed">
            When they join, you both pay $1,000 instead of $2,000 for the first 3 months.
          </p>
        </div>
      )}

      {/* Skip */}
      <div className="flex justify-center pt-1">
        <button
          onClick={handleSkip}
          className="text-xs text-[#1A1D23]/25 hover:text-[#1A1D23]/45 transition-colors py-2 font-medium"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
