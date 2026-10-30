import * as React from "react";
import { cn } from "@/lib/utils";
import { Croc, type CrocFace, type CrocMood, type CrocPose, type CrocProp, type CrocTune } from "./croc";

/**
 * Peek's habitat: water, reeds, lily pads, a sandbank and a dragonfly, drawn behind the UI.
 * Every piece is decoration (aria-hidden, no pointer events): place it with absolute classes.
 * tone "paper" sits on the cream page, "side" on the dark sidebar and tab bar.
 * Colours come from the edition palette (the jobs blue is the water), motion lives in
 * index.css ('.hab*') and stops under prefers-reduced-motion.
 */
export type HabitatTone = "paper" | "side";
export type PeekLook = { mood: CrocMood; pose: CrocPose; prop?: CrocProp; tail?: boolean; face?: Partial<CrocFace>; tune?: CrocTune };

/** Peek's looks for the habitat, made in the Peek studio (/peek/studio). */
export const PEEK_LOOKS = {
  /** Eyes just over the water, one brow up: the sidebar pond and the tab bar. */
  lurker: { mood: "curious", pose: "water", tune: { depth: 7, eyeSize: 1.1, scutes: true } },
  /** Sunning on the bank, eyes closed, tail going: the sign-in shore. */
  basker: { mood: "proud", pose: "land", tail: true, tune: { scutes: true, snout: 8 } },
  /** Out of the water with a splash: the first briefing is on its way. */
  leaper: { mood: "done", pose: "leap", tune: { tilt: -4 } },
  /** Asleep in the water: the night edition. */
  dozer: { mood: "sleepy", pose: "water", tune: { depth: 4 } },
} satisfies Record<string, PeekLook>;

function useSvgId(name: string) {
  return "hab-" + name + "-" + React.useId().replace(/:/g, "");
}

/** Water with a moving crest and slow ripples. Give it a position (absolute) and a size. */
export function Water({ tone = "paper", className, style }: { tone?: HabitatTone; className?: string; style?: React.CSSProperties }) {
  const crest = useSvgId("crest");
  const ripple = useSvgId("ripple");
  return (
    <div aria-hidden className={cn("hab hab-water", tone === "side" && "hab--side", className)} style={style}>
      <svg className="hab-drift" width="100%" height="100%">
        <defs>
          <pattern id={crest} width="48" height="14" patternUnits="userSpaceOnUse">
            <path className="hab-water__crest" d="M0 6 q12 -5 24 0 t24 0 V14 H0 Z" />
            <path className="hab-water__foam" d="M0 6 q12 -5 24 0 t24 0" />
          </pattern>
          <pattern id={ripple} width="96" height="30" patternUnits="userSpaceOnUse">
            <path className="hab-water__ripple" d="M10 12 q7 -3 14 0 t14 0" />
            <path className="hab-water__ripple" d="M60 26 q5 -2.5 10 0 t10 0" />
          </pattern>
        </defs>
        <rect width="100%" height="14" fill={"url(#" + crest + ")"} />
        <rect y="16" width="100%" height="100%" fill={"url(#" + ripple + ")"} />
      </svg>
    </div>
  );
}

/** A clump of reeds with bulrushes, swaying from the root. The bottom is the root: tuck it behind the water or a card. */
export function Reeds({ tone = "paper", flip, rushes = 2, className, style }: { tone?: HabitatTone; flip?: boolean; rushes?: 0 | 1 | 2; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 100 160" preserveAspectRatio="xMidYMax meet" className={cn("hab hab-reeds", tone === "side" && "hab--side", className)} style={style}>
      <g transform={flip ? "translate(100 0) scale(-1 1)" : undefined}>
        <path className="hab-sway hab-reeds__blade--far" style={{ animationDelay: "-1.2s" }} d="M22 160 C20 128 10 104 0 90 C16 104 28 128 30 160 Z" />
        <path className="hab-sway hab-reeds__blade--far" style={{ animationDelay: "-3.4s" }} d="M70 160 C72 124 80 96 98 70 C86 102 78 128 78 160 Z" />
        {rushes > 0 && (
          <g className="hab-sway" style={{ animationDelay: "-2s" }}>
            <path className="hab-reeds__stem" d="M41 160 C41 118 39 82 36 40" />
            <rect className="hab-reeds__rush" x="31" y="22" width="10" height="26" rx="5" transform="rotate(-4 36 35)" />
            <path className="hab-reeds__stem" d="M35 22 L34 10" />
          </g>
        )}
        {rushes > 1 && (
          <g className="hab-sway" style={{ animationDelay: "-4.6s" }}>
            <path className="hab-reeds__stem" d="M60 160 C60 130 63 104 68 76" />
            <rect className="hab-reeds__rush" x="64" y="56" width="9" height="22" rx="4.5" transform="rotate(8 68 67)" />
            <path className="hab-reeds__stem" d="M70 56 L72 46" />
          </g>
        )}
        <path className="hab-sway hab-reeds__blade" style={{ animationDelay: "-0.6s" }} d="M30 160 C28 112 22 70 8 28 C26 64 36 108 40 160 Z" />
        <path className="hab-sway hab-reeds__blade" style={{ animationDelay: "-2.8s" }} d="M46 160 C46 108 50 58 58 6 C58 60 56 110 56 160 Z" />
        <path className="hab-sway hab-reeds__blade" style={{ animationDelay: "-5s" }} d="M56 160 C60 124 70 90 88 60 C76 94 66 126 66 160 Z" />
      </g>
    </svg>
  );
}

/** A floating lily pad, with a flower if you like. Sits on the water: put its middle on the surface or below. */
export function LilyPad({ tone = "paper", flower, flip, className, style }: { tone?: HabitatTone; flower?: boolean; flip?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 60 30" className={cn("hab hab-pad hab-bob", tone === "side" && "hab--side", className)} style={style}>
      <g transform={flip ? "translate(60 0) scale(-1 1)" : undefined}>
        <ellipse className="hab-pad__shadow" cx="30" cy="21" rx="27" ry="7" />
        <path className="hab-pad__leaf" d="M30 18 L57.6 16.3 A28 10 0 1 1 54.2 13 Z" />
        <path className="hab-pad__vein" d="M30 18 L12 14 M30 18 L18 25 M30 18 L42 26" />
        {flower && (
          <g transform="translate(22 12)">
            <path className="hab-pad__petal--back" d="M0 4 Q-8 -4 -2 -10 Q2 -4 0 4 Z M0 4 Q8 -4 2 -10 Q-2 -4 0 4 Z" />
            <path className="hab-pad__petal" d="M0 5 Q-11 2 -9 -5 Q-3 -2 0 5 Z M0 5 Q11 2 9 -5 Q3 -2 0 5 Z M0 5 Q-4 -6 0 -12 Q4 -6 0 5 Z" />
            <circle className="hab-pad__heart" cx="0" cy="1" r="2" />
          </g>
        )}
      </g>
    </svg>
  );
}

/** A sandbank to sun on, with tufts of grass. Its foot goes under the water's top edge. */
export function Bank({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 240 50" preserveAspectRatio="none" className={cn("hab hab-bank", className)} style={style}>
      <path className="hab-bank__sand" d="M0 50 C20 20 64 8 120 8 C176 8 220 20 240 50 Z" />
      <path className="hab-bank__lip" d="M30 30 C60 18 92 14 120 14" />
      <path className="hab-bank__grass" d="M196 20 l-4 -10 M200 19 l1 -12 M205 21 l5 -9 M38 26 l-3 -8 M42 24 l2 -9" />
    </svg>
  );
}

/** A dragonfly hovering about. */
export function Dragonfly({ tone = "paper", className, style }: { tone?: HabitatTone; className?: string; style?: React.CSSProperties }) {
  return (
    <svg aria-hidden viewBox="0 0 40 24" className={cn("hab hab-fly", tone === "side" && "hab--side", className)} style={style}>
      <g className="hab-fly__wings">
        <ellipse className="hab-fly__wing" cx="15" cy="7" rx="9" ry="3" transform="rotate(-18 15 7)" />
        <ellipse className="hab-fly__wing" cx="25" cy="7" rx="9" ry="3" transform="rotate(18 25 7)" />
        <ellipse className="hab-fly__wing" cx="15" cy="13" rx="7" ry="2.4" transform="rotate(14 15 13)" />
        <ellipse className="hab-fly__wing" cx="25" cy="13" rx="7" ry="2.4" transform="rotate(-14 25 13)" />
      </g>
      <path className="hab-fly__body" d="M20 6 V22" />
      <circle className="hab-fly__head" cx="20" cy="5" r="2.6" />
    </svg>
  );
}

/**
 * Peek in the water: everything under his waterline is cut off, so the water around him shows.
 * Put its bottom edge on the water's surface (a Water's top edge, plus about 6px for the crest).
 */
export function Wading({ look, className, style }: { look: PeekLook; className?: string; style?: React.CSSProperties }) {
  return (
    <div aria-hidden className={cn("hab-wade", className)} style={{ aspectRatio: "220 / 91", ...style }}>
      <Croc {...look} className="w-full" />
    </div>
  );
}
