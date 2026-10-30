import * as React from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

/* ── Wordmark ───────────────────────────────────────────── */
export function Masthead({
  edition,
  tone = "paper",
  className,
}: {
  edition?: string;
  tone?: "paper" | "side";
  className?: string;
}) {
  const ink = tone === "side" ? "text-side-ink" : "text-ink";
  const sub = tone === "side" ? "text-side-ink-2" : "text-ink-3";
  return (
    <Link href="/">
      <div className={cn("cursor-pointer select-none", className)}>
        <div className={cn("flex items-center gap-2.5", ink)}>
          <span className="h-7 w-7 rounded-[9px] bg-sage text-sage-ink grid place-items-center font-sans font-semibold text-[15px] tracking-[-0.04em]">w</span>
          <span className="font-sans text-[19px] leading-6 font-semibold tracking-[-0.035em]">wout<span className="text-sage">.</span>daily</span>
        </div>
        {edition && <div className={cn("font-sans text-[12px] leading-4 mt-2", sub)}>{edition}</div>}
      </div>
    </Link>
  );
}

/* ── Section tag ────────────────────────────────────────── */
export function Kicker({ children, colour, tint, className }: { children: React.ReactNode; colour?: string; tint?: string; className?: string }) {
  return (
    <span
      className={cn("t-tag inline-flex items-center h-7 px-3 rounded-full", className)}
      style={{ color: colour ?? "var(--sage)", background: tint ?? "var(--sage-soft)" }}
    >
      {children}
    </span>
  );
}

export function Tag({ children, colour, className }: { children: React.ReactNode; colour?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 t-tag text-ink-2", className)}>
      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: colour ?? "var(--ink-3)" }} />
      {children}
    </span>
  );
}

/* ── Section header ─────────────────────────────────────── */
export function SectionHeader({
  title,
  colour,
  aside,
  className,
}: {
  title: React.ReactNode;
  colour?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <h2 className="font-sans font-semibold text-[17px] leading-6 tracking-[-0.015em] text-ink flex items-center gap-2">
        {colour && <span className="h-2 w-2 rounded-full" style={{ background: colour }} />}
        {title}
      </h2>
      {aside && <div className="t-caption">{aside}</div>}
    </div>
  );
}

/* ── Buttons ────────────────────────────────────────────── */
type PressButtonVariant = "primary" | "accent" | "secondary" | "ghost";
const VARIANT: Record<PressButtonVariant, string> = {
  primary: "bg-sage text-sage-ink hover:bg-sage/90",
  accent: "bg-ink text-paper hover:bg-ink/88",
  secondary: "bg-paper-raised text-ink hover:bg-paper-sunk",
  ghost: "bg-transparent text-ink-2 hover:bg-paper-raised hover:text-ink",
};

export const PressButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: PressButtonVariant; size?: "sm" | "md"; icon?: React.ReactNode }
>(({ variant = "primary", size = "md", icon, className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 rounded-full font-sans font-medium tracking-[-0.01em] transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage",
      size === "md" ? "h-10 px-5 text-[14px] leading-5" : "h-8 px-3.5 text-[13px] leading-4",
      VARIANT[variant],
      className,
    )}
    {...props}
  >
    {icon}
    {children}
  </button>
));
PressButton.displayName = "PressButton";

/** Round decision button used on the sorting card. */
export const DecisionButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone: "keep" | "skip" | "undo"; label: string; hint?: string }
>(({ tone, label, hint, className, children, ...props }, ref) => (
  <div className="flex flex-col items-center gap-2">
    <button
      ref={ref}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage",
        tone === "undo" ? "h-11 w-11 bg-transparent text-ink-2 hover:bg-paper-sunk hover:text-ink" : "h-14 w-14",
        tone === "skip" && "bg-paper text-ink hover:bg-paper-sunk",
        tone === "keep" && "bg-sage text-sage-ink hover:bg-sage/90",
        className,
      )}
      {...props}
    >
      {children}
    </button>
    <span className="font-sans text-[12px] leading-4 font-medium text-ink-2">
      {label}
      {hint && <span className="ml-1.5 text-ink-3">{hint}</span>}
    </span>
  </div>
));
DecisionButton.displayName = "DecisionButton";
