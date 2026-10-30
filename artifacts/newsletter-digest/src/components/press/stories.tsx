import { Link } from "wouter";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Kicker } from "./primitives";
import { sectionColour, sectionTint, readMinutes, storyHref, type EditionStory } from "@/lib/press";

export function SectionKicker({ story, className }: { story: { sectionType: string; sectionTitle: string }; className?: string }) {
  return <Kicker colour={sectionColour(story.sectionType)} tint={sectionTint(story.sectionType)} className={className}>{story.sectionTitle}</Kicker>;
}

/* ── Source avatar ──────────────────────────────────────── */
export function SourceAvatar({ name, className }: { name?: string | null; className?: string }) {
  const letter = (name ?? "?").replace(/^The\s+/i, "").charAt(0).toUpperCase();
  return (
    <span className={cn("h-6 w-6 rounded-full bg-paper-sunk text-ink-2 grid place-items-center font-sans text-[11px] font-semibold shrink-0", className)}>
      {letter}
    </span>
  );
}

/* ── Reading-list item ──────────────────────────────────── */
export function ReadingListItem({
  story,
  digestId,
  index,
  className,
}: {
  story: EditionStory;
  digestId: number;
  index: number;
  className?: string;
}) {
  return (
    <Link href={storyHref(digestId, story)}>
      <div className={cn("group flex gap-3 items-start p-3 -mx-3 rounded-xl cursor-pointer hover:bg-paper-sunk transition-colors", className)}>
        <span className="h-6 w-6 rounded-full grid place-items-center font-sans text-[12px] font-semibold shrink-0 mt-0.5" style={{ background: sectionTint(story.sectionType), color: sectionColour(story.sectionType) }}>{index}</span>
        <div className="min-w-0 flex-1">
          <div className="font-sans font-medium text-[15px] leading-[22px] tracking-[-0.01em] text-ink">{story.headline}</div>
          <div className="t-caption mt-0.5">{story.sectionTitle} · {readMinutes(story)} min</div>
        </div>
        <ArrowUpRight className="h-4 w-4 mt-1 text-ink-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

/* ── Sender row ("Who wrote in") ────────────────────────── */
export function SenderRow({ name, count, className }: { name: string; count: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-2", className)}>
      <SourceAvatar name={name} />
      <span className="t-label text-ink truncate flex-1">{name}</span>
      <span className="min-w-7 h-6 px-2 rounded-full bg-paper grid place-items-center font-sans text-[12px] font-semibold tabular-nums text-ink-2">{count}</span>
    </div>
  );
}

/* ── Section tile ───────────────────────────────────────── */
export function SectionTile({
  title,
  sectionType,
  stories,
  digestId,
  className,
}: {
  title: string;
  sectionType: string;
  stories: EditionStory[];
  digestId: number;
  className?: string;
}) {
  const lead = stories[0];
  return (
    <div className={cn("rounded-2xl p-6 flex flex-col", className)} style={{ background: sectionTint(sectionType) }}>
      <div className="flex items-center justify-between">
        <Kicker colour={sectionColour(sectionType)} tint="var(--paper-raised)">{title}</Kicker>
        <span className="font-sans text-[13px] leading-5 tabular-nums" style={{ color: sectionColour(sectionType) }}>{stories.length} {stories.length === 1 ? "story" : "stories"}</span>
      </div>
      {lead && (
        <Link href={storyHref(digestId, lead)}>
          <h3 className="mt-5 t-h3 text-ink hover:opacity-75 cursor-pointer transition-opacity">{lead.headline}</h3>
        </Link>
      )}
      {stories.slice(1, 2).map((s) => (
        <Link key={s.id} href={storyHref(digestId, s)}>
          <p className="mt-3 font-sans text-[14px] leading-[22px] text-ink hover:opacity-75 cursor-pointer">{s.headline}</p>
        </Link>
      ))}
      <Link href={`/digest/${digestId}`}>
        <span className="mt-auto pt-5 inline-flex items-center gap-1 font-sans text-[13px] font-medium cursor-pointer" style={{ color: sectionColour(sectionType) }}>
          Open section <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </div>
  );
}
