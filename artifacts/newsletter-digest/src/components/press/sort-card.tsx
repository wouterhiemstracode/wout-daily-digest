import { Check, X, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DecisionButton } from "./primitives";
import { Confetti, Croc } from "./croc";
import { SectionKicker, SourceAvatar } from "./stories";
import { matchLabel, readMinutes, type EditionStory } from "@/lib/press";

/**
 * The sorting card: one story at a time, kept (tick) or skipped (cross).
 * Presentational; the page owns the queue and the feedback calls.
 */
export function SortCard({
  story,
  position,
  total,
  onKeep,
  onSkip,
  onUndo,
  canUndo,
  kept,
  onStartReading,
  reaction,
  className,
}: {
  story: EditionStory | null;
  position: number;
  total: number;
  onKeep: () => void;
  onSkip: () => void;
  onUndo: () => void;
  canUndo: boolean;
  kept?: number;
  onStartReading?: () => void;
  /** The last keep or skip; a new `n` replays the croc's reaction. */
  reaction?: { mood: "keep" | "skip"; n: number } | null;
  className?: string;
}) {
  return (
    <section className={cn("bg-paper-raised rounded-[20px] flex flex-col", className)} aria-label="Sort today's stories">
      <header className="flex items-center justify-between px-8 pt-7">
        <div>
          <h2 className="font-sans font-semibold text-[20px] leading-7 tracking-[-0.02em] text-ink">Sort today’s {total}</h2>
          <p className="t-caption">Keep what you want to read tonight</p>
        </div>
        <div className="flex items-center gap-3">
          {story && <Croc key={reaction?.n ?? 0} mood={reaction?.mood ?? "idle"} className="w-14" />}
          <span className="h-8 px-3 rounded-full bg-paper grid place-items-center font-sans text-[13px] font-medium tabular-nums text-ink-2">
            {story ? <span>{position} <span className="text-ink-3">/ {total}</span></span> : "Done"}
          </span>
        </div>
      </header>

      <div className="flex gap-1 px-8 pt-5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i < position - 1 || !story ? "bg-ink/70" : i === position - 1 ? "bg-sage" : "bg-paper-sunk")} />
        ))}
      </div>

      {story ? (
        <div key={story.id} className="px-8 pt-8 pb-6 flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="flex items-center gap-3">
            <SectionKicker story={story} />
            <span className="t-caption">{matchLabel(story)}</span>
          </div>
          <h3 className="t-h1 mt-5 text-ink max-w-[24ch]">{story.headline}</h3>
          <p className="t-standfirst mt-4 max-w-[58ch]">{story.summary}</p>
          <div className="mt-6 rounded-xl bg-paper px-5 py-4 max-w-[60ch]">
            <div className="font-sans text-[13px] font-semibold text-sage">Why it matters</div>
            <p className="font-serif text-[16px] leading-[26px] text-ink mt-1">{story.whyItMatters}</p>
          </div>
          <div className="flex items-center gap-2 t-meta mt-6">
            <SourceAvatar name={story.sourceName} />
            <span className="text-ink-2">{story.sourceName}</span>
            <span>·</span>
            <span>{readMinutes(story)} min read</span>
          </div>
        </div>
      ) : (
        <div className="relative px-8 py-14 flex-1 text-center">
          <Confetti />
          <Croc mood="done" label="The croc hops: all sorted" className="mx-auto w-32" />
          <h3 className="t-h1 mt-5 text-ink">All {total} sorted</h3>
          <p className="t-standfirst mt-2">{kept ?? 0} {kept === 1 ? "story is" : "stories are"} waiting in your reading list.</p>
          {onStartReading && (kept ?? 0) > 0 && (
            <button onClick={onStartReading} className="mt-6 h-10 px-5 rounded-full bg-ink text-paper font-sans font-medium text-[14px] hover:bg-sage hover:text-sage-ink transition-colors">
              Start reading
            </button>
          )}
        </div>
      )}

      <footer className="flex items-start justify-center gap-10 px-8 pt-2 pb-7">
        <DecisionButton tone="skip" label="Skip" hint="←" onClick={onSkip} disabled={!story}>
          <X className="h-6 w-6" strokeWidth={1.75} />
        </DecisionButton>
        <div className="pt-1.5">
          <DecisionButton tone="undo" label="Undo" onClick={onUndo} disabled={!canUndo}>
            <Undo2 className="h-4 w-4" strokeWidth={1.75} />
          </DecisionButton>
        </div>
        <DecisionButton tone="keep" label="Keep" hint="→" onClick={onKeep} disabled={!story}>
          <Check className="h-6 w-6" strokeWidth={2} />
        </DecisionButton>
      </footer>
    </section>
  );
}
