import { Outlet } from "react-router-dom";

/**
 * Public layout for the Checkup flow — warm editorial feel.
 * Linen background with subtle grid texture + top warm glow.
 */
export default function CheckupLayout() {
  return (
    <div className="min-h-dvh bg-linen-grid flex flex-col">
      {/* Branded header */}
      <header className="flex flex-col items-center pt-10 pb-7 px-4 anim-slide-down">
        <a href="https://getalloro.com" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Alloro" className="h-9 w-auto" />
          <span className="font-heading font-bold text-[22px] tracking-tight text-[#1A1D23]">
            Alloro
          </span>
        </a>

        {/* Thin rule with tagline */}
        <div className="flex items-center gap-4 mt-5 w-full max-w-[280px]">
          <div className="flex-1 h-px bg-[#1A1D23]/8" />
          <span className="text-[10px] font-bold tracking-[0.22em] text-[#1A1D23]/22 uppercase whitespace-nowrap">
            Business Clarity
          </span>
          <div className="flex-1 h-px bg-[#1A1D23]/8" />
        </div>
      </header>

      {/* Flow content */}
      <main className="flex-1 flex flex-col items-center px-5 pb-12">
        <Outlet />
      </main>

      {/* Footer */}
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
