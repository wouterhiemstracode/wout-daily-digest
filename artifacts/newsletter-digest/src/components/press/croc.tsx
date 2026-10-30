import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Peek, the wout.daily croc: two eyes above the water, like reading over a newspaper.
 * Moods mark moments; the animations live in index.css (`.croc--*`) and stop under
 * prefers-reduced-motion. Changing `key` on a keep/skip croc replays its reaction.
 */
export type CrocMood = "idle" | "hello" | "reading" | "keep" | "skip" | "done" | "sleepy";

export function Croc({ mood = "idle", label, className }: { mood?: CrocMood; label?: string; className?: string }) {
  const clip = `croc-clip-${React.useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 200 104"
      className={cn("croc", `croc--${mood}`, className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        {/* Everything below the waterline is under water. */}
        <clipPath id={clip}>
          <rect x="-20" y="-60" width="240" height="140" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g className="croc__body">
          <path className="croc__skin" d="M18 84 C18 62 40 55 72 56 L150 60 C176 61 188 70 188 86 Z" />
          <circle className="croc__skin" cx="62" cy="52" r="17" />
          <circle className="croc__skin" cx="98" cy="52" r="17" />
          <circle className="croc__eye" cx="62" cy="50" r="10.5" />
          <circle className="croc__eye" cx="98" cy="50" r="10.5" />
          <circle className="croc__pupil" cx="64" cy="51" r="5" />
          <circle className="croc__pupil" cx="100" cy="51" r="5" />
          <ellipse className="croc__lid" cx="62" cy="45" rx="12" ry="11" />
          <ellipse className="croc__lid" cx="98" cy="45" rx="12" ry="11" />
          <ellipse className="croc__nostril" cx="172" cy="66" rx="3" ry="2" />
          <ellipse className="croc__nostril" cx="180" cy="68" rx="3" ry="2" />
        </g>
      </g>
      <path className="croc__wave" d="M6 80 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" />
      {mood === "sleepy" && (
        <g className="croc__zzz">
          <text x="118" y="34">z</text>
          <text x="128" y="26">z</text>
          <text x="140" y="16">Z</text>
        </g>
      )}
    </svg>
  );
}

const CONFETTI = ["var(--sage)", "var(--sec-top-soft)", "var(--sec-product-soft)", "var(--sec-eng-soft)", "var(--sec-jobs-soft)", "var(--sec-ai)"];

/** A one-off burst in the section colours, for "all sorted". */
export function Confetti({ className }: { className?: string }) {
  return (
    <div className={cn("confetti", className)} aria-hidden>
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const style = {
          background: CONFETTI[i % CONFETTI.length],
          animationDelay: `${(i % 5) * 0.03}s`,
          "--dx": `${Math.round(Math.cos(a) * (110 + (i % 3) * 30))}px`,
          "--dy": `${Math.round(Math.sin(a) * (80 + (i % 4) * 18))}px`,
        } as React.CSSProperties;
        return <span key={i} style={style} />;
      })}
    </div>
  );
}

/** Whether the night edition is on (the `dark` class on <html>). */
export function useNightEdition() {
  const [night, setNight] = React.useState(() => typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
  React.useEffect(() => {
    const html = document.documentElement;
    const observer = new MutationObserver(() => setNight(html.classList.contains("dark")));
    observer.observe(html, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return night;
}
