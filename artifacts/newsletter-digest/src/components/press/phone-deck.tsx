import * as React from "react";
import { Link, useLocation } from "wouter";
import { ArrowRight, ArrowUpRight, Bookmark, Check, Clock, Undo2, X } from "lucide-react";
import type { DigestSection } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { SectionKicker, SourceAvatar } from "./stories";
import { Confetti, Croc } from "./croc";
import { greeting, matchLabel, readMinutes, sectionColour, sectionTint, storyHref, type EditionStory } from "@/lib/press";

type Sheet = "next" | "list" | "sources" | "sections";
const TABS: [Sheet, string][] = [["next", "Up next"], ["list", "Reading list"], ["sources", "Sources"], ["sections", "Sections"]];

const SWIPE_THRESHOLD = 110;

/**
 * Today on a phone: a swipeable card stack (right keeps, left skips), the
 * decision buttons within thumb reach and a pull-up sheet for the rest.
 * Presentational; Today owns the queue and the feedback calls.
 */
export function PhoneDeck({
  digestId,
  stories,
  queue,
  kept,
  decisions,
  onDecide,
  onUndo,
  canUndo,
  sources,
  sections,
  reaction,
}: {
  digestId: number;
  stories: EditionStory[];
  queue: EditionStory[];
  kept: EditionStory[];
  decisions: Record<number, "up" | "down">;
  onDecide: (rating: "up" | "down") => void;
  onUndo: () => void;
  canUndo: boolean;
  sources: { name: string; count: number }[];
  sections: (DigestSection & { stories: EditionStory[] })[];
  reaction?: { mood: "keep" | "skip"; n: number } | null;
}) {
  const [, navigate] = useLocation();
  const current = queue[0];
  const position = stories.length - queue.length;
  const leftMinutes = queue.reduce((n, s) => n + readMinutes(s), 0);

  // Drag the top card; past the threshold it flies off as keep (right) or skip (left).
  const [dx, setDx] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);
  const [leaving, setLeaving] = React.useState<null | "left" | "right">(null);
  const [touched, setTouched] = React.useState(false);
  const startX = React.useRef(0);
  const moved = React.useRef(false);
  const [sheet, setSheet] = React.useState<Sheet | null>(null);

  const fling = (keep: boolean) => {
    if (leaving || !current) return;
    setTouched(true);
    setLeaving(keep ? "right" : "left");
    window.setTimeout(() => {
      onDecide(keep ? "up" : "down");
      setLeaving(null);
      setDx(0);
    }, 240);
  };
  const onDown = (e: React.PointerEvent) => {
    if (leaving) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    moved.current = false;
    setDragging(true);
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 6) moved.current = true;
    setDx(d);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(dx) > SWIPE_THRESHOLD) fling(dx > 0);
    else {
      setDx(0);
      if (!moved.current && current) navigate(storyHref(digestId, current));
    }
  };

  // Before the first touch the top card rests slightly mid-swipe, so the gesture explains itself.
  const shownDx = leaving ? (leaving === "right" ? 520 : -520) : !touched && position === 0 ? 40 : dx;
  const lean = Math.max(-1, Math.min(1, shownDx / SWIPE_THRESHOLD));

  const sheetBody = (tab: Sheet) => {
    if (tab === "next") {
      return queue.length > 1 ? (
        <ul>
          {queue.slice(1).map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 py-2.5 border-b border-rule last:border-0">
              <span className="w-5 t-caption tabular-nums">{position + i + 2}</span>
              <span className="flex-1 font-sans font-medium text-[15px] leading-[22px] text-ink">{s.headline}</span>
              <span className="t-caption shrink-0">{readMinutes(s)} min</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-body-sm">Nothing else in the queue.</p>
      );
    }
    if (tab === "list") {
      return kept.length === 0 ? (
        <div className="rounded-2xl bg-paper py-8 text-center">
          <Bookmark className="h-5 w-5 mx-auto mb-2 text-ink-3" strokeWidth={1.75} />
          <p className="font-serif text-[16px] leading-[26px] text-ink-2">Keep a story and it lands here.</p>
        </div>
      ) : (
        <ul>
          {kept.map((s, i) => (
            <li key={s.id}>
              <Link href={storyHref(digestId, s)}>
                <div className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-xl active:bg-paper-sunk cursor-pointer">
                  <span className="h-6 w-6 rounded-full grid place-items-center font-sans text-[12px] font-semibold shrink-0 mt-0.5" style={{ background: sectionTint(s.sectionType), color: sectionColour(s.sectionType) }}>{i + 1}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-sans font-medium text-[15px] leading-[22px] text-ink">{s.headline}</span>
                    <span className="block t-caption">{s.sectionTitle} · {readMinutes(s)} min</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 mt-1 text-ink-3" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      );
    }
    if (tab === "sources") {
      const max = sources[0]?.count ?? 1;
      return (
        <ul className="space-y-3">
          {sources.map((r) => (
            <li key={r.name} className="flex items-center gap-3">
              <SourceAvatar name={r.name} className="h-7 w-7" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between t-label text-ink mb-1">
                  <span className="truncate">{r.name}</span>
                  <span className="text-ink-3 tabular-nums">{r.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-paper-sunk">
                  <div className="h-1.5 rounded-full bg-sage" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-3">
        {sections.map((sec) => (
          <Link key={sec.id} href={`/digest/${digestId}`}>
            <div className="rounded-2xl p-4 cursor-pointer" style={{ background: sectionTint(sec.sectionType) }}>
              <div className="flex justify-between items-center">
                <span className="t-tag inline-flex items-center h-7 px-3 rounded-full bg-paper-raised" style={{ color: sectionColour(sec.sectionType) }}>{sec.title}</span>
                <span className="font-sans text-[13px] tabular-nums" style={{ color: sectionColour(sec.sectionType) }}>
                  {sec.stories.length} {sec.stories.length === 1 ? "story" : "stories"}
                </span>
              </div>
              <ul className="mt-3 space-y-1">
                {sec.stories.slice(0, 3).map((s) => (
                  <li key={s.id} className="font-sans text-[14px] leading-[20px] text-ink truncate">{s.headline}</li>
                ))}
              </ul>
            </div>
          </Link>
        ))}
      </div>
    );
  };

  const tabButton = (id: Sheet, label: string, active: boolean) => (
    <button
      key={id}
      onClick={() => setSheet(id)}
      className={cn("h-8 px-3 rounded-full t-tag whitespace-nowrap transition-colors", active ? "bg-sage text-sage-ink" : "bg-paper text-ink-2")}
    >
      {label}
      {id === "list" && kept.length > 0 ? ` · ${kept.length}` : ""}
    </button>
  );

  return (
    <div className="fixed inset-x-0 top-[60px] bottom-[84px] flex flex-col px-4 pt-2 overflow-hidden bg-paper">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="font-sans font-semibold text-[20px] leading-7 tracking-[-0.02em] text-ink truncate">{greeting()}, Wout</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-soft text-sec-ai px-3 h-8 t-tag tabular-nums shrink-0">
          <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
          {current ? `${queue.length} left · ${leftMinutes} min` : "All sorted"}
        </span>
      </div>
      <div className="flex gap-1 mb-5" aria-hidden>
        {stories.map((s, i) => (
          <span
            key={s.id}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              decisions[s.id] === "up" ? "bg-sage" : decisions[s.id] === "down" ? "bg-ink/25" : i === position ? "bg-sage/40" : "bg-paper-sunk",
            )}
          />
        ))}
      </div>

      {current ? (
        <>
          <div className="relative flex-1 min-h-0 mx-3 mb-5 select-none">
            {queue.slice(1, 4).reverse().map((s, i, arr) => {
              const depth = arr.length - i;
              const rot = [0, -3, 2.5, -1.5][depth];
              const d = Math.max(0, depth - (depth === 1 ? Math.abs(lean) * 0.6 : 0));
              return (
                <div
                  key={s.id}
                  className="absolute inset-0 rounded-[20px] bg-paper-sunk p-5 transition-transform duration-300"
                  style={{ transform: `translateY(${d * 8}px) rotate(${rot * (d / depth || 0)}deg) scale(${1 - d * 0.04})`, boxShadow: "var(--overlay-shadow)" }}
                  aria-hidden
                >
                  <div className="flex items-center gap-2 t-caption mb-3">
                    <SourceAvatar name={s.sourceName} className="h-5 w-5 text-[10px] bg-paper" />
                    {s.sourceName}
                  </div>
                  <p className="font-sans font-semibold text-[18px] leading-[24px] text-ink opacity-40 line-clamp-2">{s.headline}</p>
                </div>
              );
            })}
            <article
              key={current.id}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              className={cn("absolute inset-0 rounded-[20px] bg-paper-raised p-5 flex flex-col touch-none cursor-grab", !dragging && "transition-transform duration-300")}
              style={{ transform: `translateX(${shownDx * 0.4}px) rotate(${(shownDx / 16) * 0.6}deg)`, transformOrigin: "50% 100%", boxShadow: "var(--overlay-shadow)" }}
              aria-label={`${current.headline}. Swipe right to keep, left to skip, tap to read.`}
            >
              <span className="absolute -top-3 right-6 rounded-xl border-2 border-sage text-sage bg-paper-raised px-2.5 py-0.5 font-sans text-[15px] font-semibold rotate-12 pointer-events-none" style={{ opacity: Math.max(0, lean) }}>Keep</span>
              <span className="absolute -top-3 left-6 rounded-xl border-2 border-ink-3 text-ink-2 bg-paper-raised px-2.5 py-0.5 font-sans text-[15px] font-semibold -rotate-12 pointer-events-none" style={{ opacity: Math.max(0, -lean) }}>Skip</span>
              <div className="flex items-center justify-between gap-2">
                <SectionKicker story={current} />
                <span className="t-caption">{matchLabel(current)}</span>
              </div>
              <h2 className="font-sans font-semibold text-[26px] leading-[32px] tracking-[-0.025em] text-ink mt-4" style={{ textWrap: "balance" } as React.CSSProperties}>{current.headline}</h2>
              <p className="font-serif text-[16px] leading-[26px] text-ink-2 mt-3 line-clamp-5">{current.whyItMatters}</p>
              <div className="mt-auto pt-4 flex items-center justify-between t-meta">
                <span className="flex items-center gap-2 min-w-0">
                  <SourceAvatar name={current.sourceName} />
                  <span className="text-ink-2 truncate">{current.sourceName}</span>
                </span>
                <span className="tabular-nums shrink-0">{readMinutes(current)} min · {position + 1} / {stories.length}</span>
              </div>
            </article>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Croc key={reaction?.n ?? 0} mood={reaction?.mood ?? "idle"} className="w-12 shrink-0" />
            <p className="t-caption">Swipe right to keep, left to skip · tap to read</p>
          </div>
          <div className="flex items-center justify-center gap-5 mt-3 mb-4">
            <button onClick={onUndo} disabled={!canUndo || !!leaving} aria-label="Undo" className="h-11 w-11 rounded-full grid place-items-center text-ink-2 bg-paper-raised disabled:opacity-30">
              <Undo2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button onClick={() => fling(false)} aria-label="Skip" className="h-16 w-16 rounded-full bg-paper-sunk text-ink grid place-items-center active:bg-rule">
              <X className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button onClick={() => fling(true)} aria-label="Keep" className="h-16 w-16 rounded-full bg-sage text-sage-ink grid place-items-center active:opacity-90">
              <Check className="h-6 w-6" strokeWidth={2} />
            </button>
            <button onClick={() => setSheet("list")} aria-label="Reading list" className="h-11 w-11 rounded-full grid place-items-center bg-paper-raised text-ink-2 relative">
              <Bookmark className="h-4 w-4" strokeWidth={1.75} />
              {kept.length > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-sage text-sage-ink text-[11px] font-semibold grid place-items-center tabular-nums">{kept.length}</span>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="relative flex-1 rounded-[20px] bg-sage-soft p-6 flex flex-col justify-center mb-4 animate-in fade-in zoom-in-95">
          <Confetti />
          <Croc mood="done" label="The croc hops: all sorted" className="w-28" />
          <p className="t-h1 text-ink mt-5">All {stories.length} sorted</p>
          <p className="font-serif text-[17px] leading-[28px] text-ink-2 mt-2">
            {kept.length} {kept.length === 1 ? "story is" : "stories are"} waiting in your reading list.
          </p>
          {kept[0] && (
            <Link href={storyHref(digestId, kept[0])}>
              <span className="mt-6 self-start inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-sage text-sage-ink font-sans font-medium text-[14px] cursor-pointer">
                Start reading <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          )}
        </div>
      )}

      {/* Pull-up sheet, collapsed: the tabs plus a peek of what's next */}
      <div className="-mx-4 rounded-t-[20px] bg-paper-raised px-4 pt-2 pb-2 shrink-0" style={{ boxShadow: "var(--overlay-shadow)" }}>
        <button onClick={() => setSheet("next")} aria-label="Open sheet" className="block mx-auto h-1 w-10 rounded-full bg-ink/20 mb-2.5" />
        <div className="flex gap-1.5 mb-1 overflow-x-auto">{TABS.map(([id, label]) => tabButton(id, label, id === "next"))}</div>
        <ul>
          {queue.slice(1, 3).map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 py-1">
              <SourceAvatar name={s.sourceName} className="h-5 w-5 text-[10px]" />
              <span className="flex-1 truncate font-sans font-medium text-[13px] text-ink">{s.headline}</span>
              <span className="text-[12px] text-ink-3 shrink-0">{readMinutes(s)} min</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Pull-up sheet, open */}
      {sheet && (
        <>
          <div className="absolute inset-0 bg-ink/30 z-10 animate-in fade-in" onClick={() => setSheet(null)} />
          <div role="dialog" aria-label="Today" className="absolute inset-x-0 bottom-0 top-12 z-20 rounded-t-[20px] bg-paper-raised px-4 pt-2 flex flex-col animate-in slide-in-from-bottom duration-300">
            <button onClick={() => setSheet(null)} aria-label="Close sheet" className="block mx-auto h-1 w-10 rounded-full bg-ink/20 mb-3" />
            <div className="flex gap-1.5 mb-4 overflow-x-auto shrink-0">{TABS.map(([id, label]) => tabButton(id, label, sheet === id))}</div>
            <div className="flex-1 overflow-y-auto pb-4">{sheetBody(sheet)}</div>
          </div>
        </>
      )}
    </div>
  );
}
