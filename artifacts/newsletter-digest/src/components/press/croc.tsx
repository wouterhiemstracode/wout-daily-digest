import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Peek, the wout.daily croc: two eyes above the water, like reading over a newspaper.
 * 'mood' sets the face and animation, 'pose' what Peek peeks over, 'prop' an extra for a
 * special edition. Animations live in index.css ('.croc--*') and stop under
 * prefers-reduced-motion. Changing 'key' on a keep/skip croc replays its reaction.
 * 'face' overrides parts of a mood's face and 'tune' its proportions and colours; both
 * are for design tools (/peek/*) and leave Peek unchanged when left out.
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
export type CrocPose = "water" | "card" | "newspaper" | "land" | "sit" | "leap" | "corner";
export type CrocProp = "newspaper" | "nightcap" | "glasses" | "sunglasses";
export type CrocEye = "open" | "happy" | "closed" | "curious" | "squint";
export type CrocFace = { left: CrocEye; right: CrocEye; blush?: boolean; smile?: boolean; brows?: "up" | "worried"; sweat?: boolean; zzz?: boolean };
/**
 * Proportions and colours, for design tools. Defaults leave Peek unchanged:
 * eyeSize 1, eyeGap 36, gaze {x:2,y:-1}, pupil 1, lid 0 (open), snout 0, tilt 0, depth 0, line 3.4.
 * depth: how far Peek sinks into the water or hides behind the corner.
 */
export type CrocTune = {
  eyeSize?: number; eyeGap?: number; gaze?: { x: number; y: number }; pupil?: number; lid?: number; blink?: boolean;
  snout?: number; tilt?: number; depth?: number; flip?: boolean; scutes?: boolean; teeth?: boolean; line?: number;
  skin?: string; belly?: string; blush?: string; eye?: string; pupilColor?: string; ink?: string;
};

/** Poses where Peek is out of the water: the whole body shows, with legs on land. */
const OUT: CrocPose[] = ["land", "sit", "leap", "corner"];
const LEGS: CrocPose[] = ["land", "sit", "leap"];

export const CROC_FACES: Record<CrocMood, CrocFace> = {
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

function EyeShape({ x, y, kind, s, p, gaze }: { x: number; y: number; kind: CrocEye; s: number; p: number; gaze: { x: number; y: number } }) {
  const w = 9 * s;
  if (kind === "happy") return <path className="croc__line" d={"M" + (x - w) + " " + (y + 3) + " Q" + x + " " + (y - 9 * s) + " " + (x + w) + " " + (y + 3)} />;
  if (kind === "closed") return <path className="croc__line" d={"M" + (x - w) + " " + (y - 1) + " Q" + x + " " + (y + 7 * s) + " " + (x + w) + " " + (y - 1)} />;
  const r = (kind === "curious" ? 12 : 10.5) * s;
  return (
    <>
      <circle className="croc__eye" cx={x} cy={y - 2} r={r} />
      <circle className="croc__pupil" cx={x + gaze.x} cy={y + gaze.y} r={Math.min(5 * s * p, r - 1)} />
      <ellipse className={cn("croc__lid", kind === "squint" && "croc__lid--squint")} cx={x} cy={y - 7} rx={r + 1.5} ry={r + 0.5} />
    </>
  );
}

function Leg({ x, far }: { x: number; far?: boolean }) {
  return <path className={far ? "croc__skin croc__skin--far" : "croc__skin"} d={"M" + x + " 84 h13 v16 q0 4 -4 4 h-9 q-5 0 -5 -3 q0 -2 3 -2 z"} />;
}

export function Croc({
  mood = "idle",
  pose = "water",
  prop,
  tail = false,
  face: faceOverride,
  tune,
  label,
  className,
  style,
}: {
  mood?: CrocMood;
  pose?: CrocPose;
  prop?: CrocProp;
  tail?: boolean;
  face?: Partial<CrocFace>;
  tune?: CrocTune;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const clip = "croc-clip-" + React.useId().replace(/:/g, "");
  const face = { ...CROC_FACES[mood], ...faceOverride };
  const s = tune?.eyeSize ?? 1;
  const p = tune?.pupil ?? 1;
  const gap = tune?.eyeGap ?? 36;
  const gaze = tune?.gaze ?? { x: 2, y: -1 };
  const n = tune?.snout ?? 0;
  const depth = tune?.depth ?? 0;
  const tilt = tune?.tilt ?? 0;
  const lx = 80 - gap / 2;
  const rx = 80 + gap / 2;
  const bump = 17 + 10.5 * (s - 1);
  const out = OUT.includes(pose);
  const legs = LEGS.includes(pose);
  const place =
    pose === "sit" ? "rotate(-16 30 100) translate(6 -2)" :
    pose === "leap" ? "translate(0 -26) rotate(-10 100 80)" :
    pose === "corner" ? "translate(" + (-4 - depth * 2) + " 0)" :
    pose === "land" ? undefined :
    depth ? "translate(0 " + depth + ")" : undefined;
  const vars = {
    ...(tune?.skin ? { "--sage": tune.skin } : {}),
    ...(tune?.belly ? { "--croc-belly": tune.belly } : {}),
    ...(tune?.blush ? { "--croc-blush": tune.blush } : {}),
    ...(tune?.eye ? { "--croc-eye": tune.eye } : {}),
    ...(tune?.pupilColor ? { "--croc-pupil": tune.pupilColor } : {}),
    ...(tune?.ink ? { "--croc-ink": tune.ink } : {}),
    ...(tune?.line ? { "--croc-line": tune.line } : {}),
    ...(tune?.lid ? { "--croc-lid": tune.lid } : {}),
    ...style,
  } as React.CSSProperties;
  const body = out
    ? "M18 86 C18 62 40 55 72 56 L" + (150 + n) + " 60 C" + (176 + n) + " 61 " + (188 + n) + " 70 " + (188 + n) + " 82 C" + (188 + n) + " 90 " + (176 + n) + " 93 " + (160 + n) + " 93 L40 93 C26 93 18 92 18 86 Z"
    : "M18 104 C18 62 40 55 72 56 L" + (150 + n) + " 60 C" + (176 + n) + " 61 " + (188 + n) + " 70 " + (188 + n) + " 104 Z";
  return (
    <svg
      viewBox="-10 -8 220 122"
      className={cn("croc", "croc--" + mood, "croc--pose-" + pose, tune?.blink === false && "croc--no-blink", className)}
      style={vars}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        {/* In the water, behind a card or over the paper, everything below the line is hidden. */}
        <clipPath id={clip}>
          <rect x="-30" y="-80" width="280" height={out ? 220 : 160} />
        </clipPath>
      </defs>
      <g transform={tune?.flip ? "translate(200 0) scale(-1 1)" : undefined}>
        {pose === "corner" && <ellipse className="croc__shadow" cx="130" cy="98" rx="76" ry="4" />}
        {(pose === "land" || pose === "sit") && <ellipse className="croc__shadow" cx="100" cy="106" rx="96" ry="5" />}
        <g clipPath={"url(#" + clip + ")"}>
          <g transform={place}>
            <g transform={tilt ? "rotate(" + tilt + " 100 80)" : undefined}>
              {tail && !legs && (
                <g className="croc__tail">
                  <path className="croc__skin" d="M-4 82 C0 62 12 52 26 56 C17 60 12 70 12 82 Z" />
                  <path className="croc__scute" d="M4 66 l4 -5 l3 5 M10 59 l4 -4 l3 5" />
                </g>
              )}
              <g className="croc__body">
                {legs && (
                  <>
                    <g className={tail ? "croc__tail croc__tail--long" : undefined}>
                      <path className="croc__skin" d="M24 88 C6 92 -8 86 -14 70 C-4 80 8 82 22 74 Z" />
                      <path className="croc__scute" d="M-4 80 l3 -5 l3 5 M6 82 l3 -5 l3 5" />
                    </g>
                    <Leg x={44} far />
                    <Leg x={140 + n * 0.6} far />
                  </>
                )}
                <path className="croc__skin" d={body} />
                {out && <path className="croc__belly" d={"M34 93 L" + (158 + n) + " 93 C" + (142 + n) + " 85 50 85 34 93 Z"} />}
                {legs && (
                  <>
                    <Leg x={28} />
                    <Leg x={124 + n * 0.6} />
                  </>
                )}
                {tune?.scutes && <path className="croc__scute" d="M24 70 l4 -6 l4 6 M33 63 l4 -6 l4 6 M118 62 l4 -5 l4 5 M132 62 l4 -5 l4 5" />}
                <circle className="croc__skin" cx={lx} cy="52" r={bump} />
                <circle className="croc__skin" cx={rx} cy="52" r={bump} />
                <EyeShape x={lx} y={52} kind={face.left} s={s} p={p} gaze={gaze} />
                <EyeShape x={rx} y={52} kind={face.right} s={s} p={p} gaze={gaze} />
                <ellipse className="croc__nostril" cx={172 + n} cy="66" rx="3" ry="2" />
                <ellipse className="croc__nostril" cx={180 + n} cy="68" rx="3" ry="2" />
                {tune?.teeth && (
                  <>
                    <path className="croc__teeth" d={"M" + (138 + n) + " 75 l3 5 l3 -5 Z M" + (152 + n) + " 76 l3 5 l3 -5 Z M" + (166 + n) + " 76 l3 5 l3 -5 Z M" + (178 + n) + " 75 l2.5 4 l2.5 -4 Z"} />
                    <path className="croc__line" d={"M120 74 Q150 78 " + (186 + n) + " 74"} />
                  </>
                )}
                {face.blush && (
                  <>
                    <ellipse className="croc__blush" cx={lx - 14} cy="66" rx="7" ry="4" />
                    <ellipse className="croc__blush" cx={rx + 14} cy="66" rx="7" ry="4" />
                  </>
                )}
                {face.smile && <path className="croc__line" d={"M" + (128 + n / 2) + " 72 Q" + (140 + n / 2) + " 78 " + (152 + n / 2) + " 72"} />}
                {face.brows === "up" && <path className="croc__line" d={"M" + (lx - 12) + " " + (30 - 8 * (s - 1)) + " Q" + lx + " " + (22 - 8 * (s - 1)) + " " + (lx + 12) + " " + (28 - 8 * (s - 1))} />}
                {face.brows === "worried" && <path className="croc__line" d={"M" + (lx - 12) + " 33 L" + (lx + 8) + " 28 M" + (rx - 8) + " 28 L" + (rx + 12) + " 33"} />}
                {face.sweat && <path className="croc__sweat" d={"M" + (rx + 26) + " 30 q6 10 0 14 q-6 -4 0 -14 Z"} />}
                {prop === "glasses" && (
                  <g className="croc__frames">
                    <circle cx={lx} cy="50" r={14 * s} />
                    <circle cx={rx} cy="50" r={14 * s} />
                    <path d={"M" + (lx + 14 * s) + " 49 Q80 45 " + (rx - 14 * s) + " 49"} />
                  </g>
                )}
                {prop === "sunglasses" && (
                  <g>
                    <rect className="croc__shades" x={lx - 16 * s} y={51 - 9 * s} width={32 * s} height={18 * s} rx={8 * s} />
                    <rect className="croc__shades" x={rx - 16 * s} y={51 - 9 * s} width={32 * s} height={18 * s} rx={8 * s} />
                    <path className="croc__shades-bridge" d={"M" + (lx + 16 * s) + " 48 L" + (rx - 16 * s) + " 48"} />
                    <path className="croc__glint" d={"M" + (lx - 10) + " 47 L" + (lx - 2) + " 47"} />
                  </g>
                )}
                {prop === "nightcap" && (
                  <g transform={"translate(" + (rx - 98) + " 0)"}>
                    <path className="croc__cap" d="M84 40 Q96 6 132 14 L126 26 Q106 22 110 44 Z" />
                    <path className="croc__cap-band" d="M82 42 Q98 34 112 44" />
                    <circle className="croc__eye" cx="134" cy="15" r="6" />
                  </g>
                )}
                {prop === "newspaper" && (
                  <g transform={"translate(" + n + " 0) rotate(-8 132 66)"}>
                    <rect className="croc__paper" x="112" y="52" width="40" height="28" rx="3" />
                    <path className="croc__paper-lines" d="M118 60 H146 M118 66 H146 M118 72 H136" />
                  </g>
                )}
              </g>
            </g>
          </g>
        </g>
        {pose === "corner" && (
          <g>
            <rect className="croc__wall" x="-14" y="-12" width="74" height="130" />
            <path className="croc__wall-edge" d="M60 -12 V118" />
            {/* A hand on the edge of the wall. */}
            <g transform={"translate(0 " + (-tilt * 0.6) + ")"}>
              <circle className="croc__skin" cx="62" cy="62" r="4.6" />
              <circle className="croc__skin" cx="63.5" cy="70" r="4.6" />
              <circle className="croc__skin" cx="62" cy="78" r="4.6" />
              <path className="croc__claw" d="M65 60 l3 1 M66.5 68 l3 1 M65 76 l3 1" />
            </g>
          </g>
        )}
        {pose === "water" && <path className="croc__wave" d="M6 80 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" />}
        {pose === "leap" && (
          <g>
            <path className="croc__wave" d="M-6 104 q12 -6 24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0 t24 0" />
            <circle className="croc__drop" cx="14" cy="94" r="3" />
            <circle className="croc__drop" cx="26" cy="86" r="2.2" />
            <circle className="croc__drop" cx="180" cy="90" r="2.6" />
            <circle className="croc__drop" cx="192" cy="98" r="2" />
          </g>
        )}
        {pose === "card" && <rect className="croc__card" x="-6" y="80" width="212" height="34" rx="10" />}
        {pose === "newspaper" && (
          <g>
            <rect className="croc__paper" x="-6" y="80" width="212" height="34" rx="4" />
            <path className="croc__paper-lines" d="M10 92 H90 M10 101 H76 M110 92 H190 M110 101 H170" />
            <path className="croc__paper-fold" d="M100 82 V112" />
          </g>
        )}
      </g>
      {face.zzz && (
        <g className="croc__zzz">
          <text x={(tune?.flip ? 200 - rx - 60 : rx + 20)} y="30">z</text>
          <text x={(tune?.flip ? 200 - rx - 70 : rx + 30)} y="22">z</text>
          <text x={(tune?.flip ? 200 - rx - 82 : rx + 42)} y="12">Z</text>
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
