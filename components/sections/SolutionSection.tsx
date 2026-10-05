"use client";

import { Badge } from "@/components/ui/Badge";
import { SplitReveal } from "@/components/ui/SplitReveal";
import { Reveal } from "@/components/ui/Reveal";
import { FLOW_STEPS } from "@/data/content";
import { gsap } from "@/lib/gsap";
import { useGsap } from "@/hooks/useGsap";

const ICONS: Record<string, React.ReactNode> = {
  "01": (
    <path d="M15 10l4.5-2.5v9L15 14M4 6h11v12H4z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
  ),
  "02": (
    <path d="M12 3v4m0 10v4m9-9h-4M7 12H3m13.5-6.5-2.8 2.8M9.3 14.7l-2.8 2.8m11 0-2.8-2.8M9.3 9.3 6.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
  ),
  "03": (
    <path d="M12 5c5 0 9 5 9 7s-4 7-9 7-9-5-9-7 4-7 9-7Zm0 4a3 3 0 100 6 3 3 0 000-6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none" />
  ),
  "04": (
    <path d="M5 19V9m4 10V5m4 14v-7m4 7V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  ),
};

export function SolutionSection() {
  const scope = useGsap<HTMLDivElement>(({ self }) => {
    gsap.fromTo(
      self.querySelectorAll("[data-step]"),
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: "expo.out",
        stagger: 0.14,
        scrollTrigger: { trigger: self, start: "top 72%" },
      }
    );
    gsap.fromTo(
      self.querySelector("[data-flowline]"),
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 1.6,
        ease: "power2.out",
        scrollTrigger: { trigger: self, start: "top 70%" },
      }
    );
  }, []);

  return (
    <section id="como-funciona" className="relative py-section">
      <div className="container-tight">
        <div className="mb-16 flex flex-col items-center gap-6 text-center">
          <Badge dot={false}>Sección 03 — Cómo funciona</Badge>
          <SplitReveal
            text="De un video a una decisión de compra."
            stagger={0.05}
            className="fluid-h2 justify-center text-balance text-white"
          />
          <Reveal delay={1} className="max-w-2xl">
            <p className="fluid-lead text-[color:var(--text-muted)]">
              Sin equipos costosos ni técnicos. Cuatro pasos entre grabar una
              propiedad y saber exactamente a quién llamar.
            </p>
          </Reveal>
        </div>

        <div ref={scope} className="relative">
          {/* Línea de flujo */}
          <div className="absolute left-0 right-0 top-[3.25rem] hidden md:block">
            <div
              data-flowline
              className="mx-auto h-px w-[80%] origin-left bg-gradient-to-r from-gold/50 via-gold/30 to-transparent"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW_STEPS.map((step) => (
              <div
                key={step.index}
                data-step
                className="panel group relative rounded-4xl p-7"
              >
                <div className="mb-6 flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/25 bg-gold/5 text-gold">
                    <svg width="22" height="22" viewBox="0 0 24 24">{ICONS[step.index]}</svg>
                  </span>
                  <span className="font-mono text-xs text-[color:var(--text-faint)]">
                    {step.index}
                  </span>
                </div>
                <h3 className="text-lg font-medium tracking-tightest text-white">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[color:var(--text-muted)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
