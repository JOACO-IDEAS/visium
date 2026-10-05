"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { GradientText } from "@/components/ui/GradientText";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { GlowOrb } from "@/components/ui/GlowOrb";
import { SPLAT_STEPS, SPLAT_STATS } from "@/data/platform";
import { gsap } from "@/lib/gsap";
import { useGsap } from "@/hooks/useGsap";
import { cn } from "@/lib/utils";

/**
 * Section 05 — Gaussian Splatting.
 * A sticky visual panel on the left; scroll-synced steps drive an active
 * index that reveals a layered "reality reconstruction" graphic.
 */
export function GaussianSplattingSection() {
  const [active, setActive] = useState(0);

  const scope = useGsap<HTMLDivElement>(({ self }) => {
    const steps = gsap.utils.toArray<HTMLElement>("[data-splat-step]", self);
    steps.forEach((step, i) => {
      gsap.to(step, {
        scrollTrigger: {
          trigger: step,
          start: "top 60%",
          end: "bottom 60%",
          onToggle: (s) => s.isActive && setActive(i),
        },
      });
    });
  }, []);

  return (
    <section id="gaussian-splatting" className="relative overflow-hidden py-section">
      <GlowOrb className="-left-40 top-20 h-[34rem] w-[34rem]" />
      <div className="container-wide relative">
        <div className="mb-20 flex flex-col items-start gap-6">
          <Badge dot={false}>Section 05 — Gaussian Splatting</Badge>
          <h2 className="max-w-4xl text-balance text-4xl font-semibold leading-[1.04] tracking-tightest sm:text-6xl md:text-7xl">
            We don&apos;t model reality.
            <br />
            We <GradientText>capture its light.</GradientText>
          </h2>
          <p className="max-w-2xl text-lg text-[color:var(--text-muted)]">
            Gaussian Splatting reconstructs a space from millions of points of
            light — delivering photorealism that polygonal 3D has chased for
            decades, rendered live in your browser.
          </p>
        </div>

        <div ref={scope} className="grid gap-16 lg:grid-cols-2">
          {/* Sticky visual */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="relative aspect-square overflow-hidden rounded-6xl border border-white/10 shadow-glass">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1400&q=80')",
                }}
              />
              {/* Splat overlay — animated point field */}
              <motion.div
                key={active}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 dotgrid mix-blend-screen"
                style={{ opacity: 0.35 + active * 0.12 }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-void/80 via-transparent to-transparent" />

              {/* Scan line */}
              <motion.div
                animate={{ top: ["0%", "100%", "0%"] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-highlight to-transparent shadow-[0_0_20px_2px_rgba(111,255,233,0.6)]"
              />

              {/* HUD */}
              <div className="absolute left-5 top-5 chip font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Reconstructing · {(active + 1) * 33}%
              </div>
              <div className="absolute bottom-5 left-5 right-5 glass-strong flex items-center justify-between rounded-2xl px-4 py-3 font-mono text-xs">
                <span className="text-[color:var(--text-muted)]">radiance_field.splat</span>
                <span className="text-primary">{SPLAT_STEPS[active].title}</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-6">
            {SPLAT_STEPS.map((step, i) => (
              <div
                key={step.index}
                data-splat-step
                className={cn(
                  "rounded-5xl border p-8 transition-all duration-500",
                  active === i
                    ? "border-primary/40 bg-surface/40 shadow-glow-soft"
                    : "border-white/8 bg-surface/10"
                )}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "font-mono text-sm transition-colors",
                      active === i ? "text-primary" : "text-[color:var(--text-faint)]"
                    )}
                  >
                    {step.index}
                  </span>
                  <h3 className="text-2xl font-semibold tracking-tightest text-white">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-4 text-base leading-relaxed text-[color:var(--text-muted)]">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Stat row */}
        <div className="mt-24 grid grid-cols-2 gap-px overflow-hidden rounded-5xl border border-white/10 md:grid-cols-4">
          {SPLAT_STATS.map((s) => (
            <div key={s.label} className="bg-surface/20 px-6 py-10 text-center">
              <AnimatedCounter
                value={s.value}
                decimals={s.decimals ?? 0}
                prefix={s.prefix ?? ""}
                suffix={s.suffix ?? ""}
                className="text-4xl font-semibold tracking-tightest text-gradient sm:text-5xl"
              />
              <p className="mt-3 text-xs text-[color:var(--text-faint)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
