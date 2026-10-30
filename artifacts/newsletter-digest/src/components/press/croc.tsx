import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Peek, the wout.daily croc: two eyes above the water, like reading over a newspaper.
 * `mood` sets the face and animation, `pose` what Peek peeks over, `prop` an extra for a
 * special edition. Animations live in index.css (`.croc--*`) and stop under
 * prefers-reduced-motion. Changing `key` on a keep/skip croc replays its reaction.
 * Every combination is on the Peek sheet (/peek).
 */
export type CrocMood =
  | "idle" // blinks, bobs
  | "hello" // rises out of the water
  | "reading" // eyes scan left and right
  | "keep" // happy eyes, a hop
  | "skip" // a head shake
  | "done" // happy eyes, two hops
  | "sleepy" // heavy lids, floating Zs
  | "bored" // heavy lids, no Zs
  | "curious" // one big eye, one squint, a raised brow
  | "worried" // brows up, a sweat drop, a shiver
  | "proud"; // eyes closed, blushing, smiling
export type CrocPose = "water" | "card" | "newspaper";
export type CrocProp = "newspaper" | "nightcap" | "glasses" | "sunglasses";

type Eye = "open" | "happy" | "closed" | "curious" | "squint";

const FACE: Record<CrocMood, { left: Eye; right: Eye; blush?: boolean; smile?: boolean; brows?: "up" | "worried"; sweat?: boolean; zzz?: boolean }> = {
  idle: { left: "open", right: "open" },
  hello: { left: "open", right: "open" },
  reading: { left: "open", right: "open" },
  keep: { left: "happy", right: "happy", blush: true },
  skip: { left: "open", right: "open" },
  done: { left: "happy", right: "happy", blush: true },
  sleepy: { left: "open", right: "open", zzz: true },
  bored: { left: "open", right: "open" },
  curious: { left: "curious", right: "squint", brows: "up" },
  worried: { left: "open", right: "open", brows: "worried", sweat: true },
  proud: { left: "closed", right: "closed", blush: true, smile: true },
};

function EyeShape({ x, y, kind }: { x: number; y: number; kind: Eye }) {
  if (kind === "happy") return <path className="croc__line" d={`M${x - 9} ${y + 3} Q${x} ${y - 9} ${x + 9} ${y + 3}`} />;
  if (kind === "closed") return <path className="croc__line" d={`M${x - 9} ${y - 1} Q${x} ${y + 7} ${x + 9} ${y - 1}`} />;
  const r = kind === "curious" ? 12 : 10.5;
  return (
    <>
      <circle className="croc__eye" cx={x} cy={y - 2} r={r} />
      <circle className="croc__pupil" cx={x + 2} cy={y - 1} r={5} />
      <ellipse className={cn("croc__lid", kind === "squint" && "croc__lid--squint")} cx={x} cy={y - 7} rx={r + 1.5} ry={r + 0.5} />
    </>
  );
}

export function Croc({
  mood = "idle",
  pose = "water",
  prop,
  tail = false,
  label,
  className,
  style,
}: {
  mood?: CrocMood;
  pose?: CrocPose;
  prop?: CrocProp;
  tail?: boolean;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const clip = `croc-clip-${React.useId().replace(/:/g, "")}`;
  const face = FACE[mood];
  return (
    <svg
      viewBox="-10 -8 220 122"
      className={cn("croc", `croc--${mood}`, className)}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        {/* Everything below the line (water, card edge or newspaper) is hidden. */}
        <clipPath id={clip}>
          <rect x="-30" y="-80" width="260" height="160" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {tail && (
          <g className="croc__tail">
            <path className="croc__skin" d="M-4 82 C0 62 12 52 26 56 C17 60 12 70 12 82 Z" />
            <path className="croc__scute" d="M4 66 l4 -5 l3 5 M10 59 l4 -4 l3 5" />
          </g>
        )}
        <g className="croc__body">
          <path className="croc__skin" d="M18 104 C18 62 40 55 72 56 L150 60 C176 61 188 70 188 104 Z" />
          <circle className="croc__skin" cx="62" cy="52" r="17" />
          <circle className="croc__skin" cx="98" cy="52" r="17" />
          <EyeShape x={62} y={52} kind={face.left} />
          <EyeShape x={98} y={52} kind={face.right} />
          <ellipse className="croc__nostril" cx="172" cy="66" rx="3" ry="2" />
          <ellipse className="croc__nostril" cx="180" cy="68" rx="3" ry="2" />
          {face.blush && (
            <>
              <ellipse className="croc__blush" cx="48" cy="66" rx="7" ry="4" />
              <ellipse className="croc__blush" cx="112" cy="66" rx="7" ry="4" />
            </>
          )}
          {face.smile && <path className="croc__line" d="M128 72 Q140 78 152 72" />}
          {face.brows === "up" && <path className="croc__line" d="M50 30 Q62 22 74 28" />}
          {face.brows === "worried" && <path className="croc__line" d="M50 33 L70 28 M90 28 L110 33" />}
          {face.sweat && <path className="croc__sweat" d="M124 30 q6 10 0 14 q-6 -4 0 -14 Z" />}
          {prop === "glasses" && (
            <g className="croc__frames">
              <circle cx="62" cy="50" r="14" />
              <circle cx="98" cy="50" r="14" />
              <path d="M76 49 Q80 45 84 49" />
            </g>
          )}
          {prop === "sunglasses" && (
            <g>
              <rect className="croc__shades" x="46" y="42" width="32" height="18" rx="8" />
              <rect className="croc__shades" x="82" y="42" width="32" height="18" rx="8" />
              <path className="croc__shades-bridge" d="M78 48 L82 48" />
              <path className="croc__glint" d="M52 47 L60 47" />
            </g>
          )}
          {prop === "nightcap" && (
            <g>
              <path className="croc__cap" d="M84 40 Q96 6 132 14 L126 26 Q106 22 110 44 Z" />
              <path className="croc__cap-band" d="M82 42 Q98 34 112 44" />
              <circle className="croc__eye" cx="134" cy="15" r="6" />
            </g>
          )}
          {prop === "newspaper" && (
            <g transform="rotate(-8 132 66)">
              <rect className="croc__paper" x="112" y="52" width="40" height="28" rx="3" />
              <path className="croc__paper-lines" d="M118 60 H146 M118 66 H146 M118 72 H136" />
            </g>
          )}
        </g>
      </g>
      {pose === "water" && <path className="croc__wave" d="M6 80 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" />}
      {pose === "card" && <rect className="croc__card" x="-6" y="80" width="212" height="34" rx="10" />}
      {pose === "newspaper" && (
        <g>
          <rect className="croc__paper" x="-6" y="80" width="212" height="34" rx="4" />
          <path className="croc__paper-lines" d="M10 92 H90 M10 101 H76 M110 92 H190 M110 101 H170" />
          <path className="croc__paper-fold" d="M100 82 V112" />
        </g>
      )}
      {face.zzz && (
        <g className="croc__zzz">
          <text x="118" y="30">z</text>
          <text x="128" y="22">z</text>
          <text x="140" y="12">Z</text>
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

/** The prop Peek wears today: a night cap after dark, sunglasses at the weekend. */
export function useCrocProp(): CrocProp | undefined {
  const night = useNightEdition();
  if (night) return "nightcap";
  const day = new Date().getDay();
  return day === 0 || day === 6 ? "sunglasses" : undefined;
}
