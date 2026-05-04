"use client";

import { Button } from "@/components/ui/button";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";

type StepTone = "info" | "brand" | "success";

type Step = {
  label: string;
  tone: StepTone;
  title: string;
  description: string;
};

const steps: Step[] = [
  {
    label: "Step 1",
    tone: "info",
    title: "Companies publish",
    description:
      "Organizations create regulatory learning modules with rich content and compliance quizzes.",
  },
  {
    label: "Step 2",
    tone: "brand",
    title: "Investors learn",
    description:
      "Investors complete each module for $1, working through the material at their own pace.",
  },
  {
    label: "Step 3",
    tone: "success",
    title: "Access unlocked",
    description:
      "On passing the quiz, investors receive verified access to exclusive investment opportunities.",
  },
];

const stepBadgeStyles: Record<StepTone, string> = {
  info: "bg-[#ebf1fd] text-[#1f5fe8]",
  brand: "bg-brand-soft text-brand",
  success: "bg-[#dcfce7] text-[#3bb468]",
};

export function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Top + bottom soft glows. Pure CSS — no asset URL that
          can expire. The two blurred radial gradients sit behind
          the hero (top) and behind the steps (bottom). */}
      <GlowField position="top" />
      <GlowField position="bottom" />

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center gap-24 px-6 py-24 lg:py-32">
        <Hero />
        <HowItWorks />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Hero
--------------------------------------------------------------- */

function Hero() {
  const walletKit = useWalletKit();
  return (
    <section className="flex w-full max-w-[626px] flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="rounded-[10px] bg-primary/10 px-2 py-0.5 text-xs leading-normal text-primary">
          Regulatory Compliance Reimagined
        </span>
        <h1 className="text-[#545454] text-[32px] font-extrabold leading-tight">
          {/* Learn compliance.
          <br />
          Unlock opportunities. */}
          On-chain Regulatory Technology <br /> credential built on Solana using{" "}
          <br /> Anchor.
        </h1>
      </div>

      <p className="max-w-[420px] text-sm leading-6 text-[#545454]">
        Companies publish regulatory learning modules. Investors complete them
        for $1 to gain verified access to exclusive investment opportunities.
      </p>

      <Button onClick={walletKit.open} className="px-9">
        Get Started
      </Button>
    </section>
  );
}

/* ---------------------------------------------------------------
   How it works
--------------------------------------------------------------- */

function HowItWorks() {
  return (
    <section className="flex w-full max-w-[1016px] flex-col items-center gap-[78px]">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-display text-xs uppercase tracking-[0.33em] text-[#959583]">
          How it works
        </p>
        <h2 className="text-lg font-bold text-ink-strong">
          Three steps to compliance
        </h2>
      </div>

      <div className="grid w-full grid-cols-1 gap-7 md:grid-cols-3">
        {steps.map((step) => (
          <StepCard key={step.label} step={step} />
        ))}
      </div>
    </section>
  );
}

function StepCard({ step }: { step: Step }) {
  return (
    <article className="flex flex-col gap-6 rounded-lg border border-border bg-background/60 px-3.5 py-4 backdrop-blur-sm">
      <div className="flex flex-col items-start gap-6">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-[10px] px-2 py-0.5 text-xs font-medium leading-normal",
            stepBadgeStyles[step.tone],
          )}
        >
          {step.label}
        </span>
        <h3 className="font-display text-sm font-extrabold leading-normal text-ink-strong">
          {step.title}
        </h3>
      </div>
      <p className="font-display text-sm leading-6 text-ink-subtle">
        {step.description}
      </p>
    </article>
  );
}

function GlowField({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-1/2 z-0 h-[420px] w-[1100px] -translate-x-1/2",
        position === "top" ? "top-[-80px]" : "bottom-[-80px]",
      )}
    >
      <div
        className="size-full opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(178, 115, 255, 0.28) 0%, rgba(98, 71, 129, 0.14) 35%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
    </div>
  );
}
