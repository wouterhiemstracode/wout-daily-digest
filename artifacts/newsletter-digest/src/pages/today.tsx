import * as React from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Plus, ArrowRight } from "lucide-react";
import {
  useGetLatestDigest,
  useGetStats,
  useListSenders,
  useGetGmailAuthStatus,
  useGetGmailAuthUrl,
  getGetGmailAuthUrlQueryKey,
  useSubmitFeedback,
} from "@workspace/api-client-react";
import { useBriefing } from "@/hooks/use-briefing";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { PhoneDeck } from "@/components/press/phone-deck";
import { Croc, useCrocProp, useNightEdition } from "@/components/press/croc";
import { Dragonfly, LilyPad, PEEK_LOOKS, Reeds, Wading, Water } from "@/components/press/habitat";
import { PressButton, SectionHeader } from "@/components/press/primitives";
import { SortCard } from "@/components/press/sort-card";
import { ReadingListItem, SenderRow, SectionTile } from "@/components/press/stories";
import { flattenStories, greeting, storyHref, uniqueStories, type EditionStory } from "@/lib/press";

type Decision = "up" | "down";

/**
 * The sorting desk: one story at a time, kept or skipped. Every decision and undo is sent as story feedback.
 * The latest state lives in a ref as well, so quick key presses or taps each act on the next story.
 */
function useSortDesk(digestId: number | undefined, stories: EditionStory[]) {
  const [desk, setDesk] = React.useState<{ decisions: Record<number, Decision>; history: number[] }>({ decisions: {}, history: [] });
  // What the croc reacts to: the last keep or skip (`n` replays the animation).
  const [reaction, setReaction] = React.useState<{ mood: "keep" | "skip"; n: number } | null>(null);
  const latest = React.useRef(desk);
  const commit = (next: typeof desk) => {
    latest.current = next;
    setDesk(next);
  };
  React.useEffect(() => {
    const decisions: Record<number, Decision> = {};
    stories.forEach((s) => {
      if (s.userFeedback === "up" || s.userFeedback === "down") decisions[s.id] = s.userFeedback;
    });
    commit({ decisions, history: [] });
  }, [digestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const feedback = useSubmitFeedback();
  const { decisions, history } = desk;
  const queue = stories.filter((s) => !decisions[s.id]);
  const current = queue[0] ?? null;
  const kept = stories.filter((s) => decisions[s.id] === "up");
  const skipped = stories.filter((s) => decisions[s.id] === "down").length;

  const decide = React.useCallback(
    (rating: Decision) => {
      const { decisions, history } = latest.current;
      const next = stories.find((s) => !decisions[s.id]);
      if (!next) return;
      commit({ decisions: { ...decisions, [next.id]: rating }, history: [...history, next.id] });
      setReaction((r) => ({ mood: rating === "up" ? "keep" : "skip", n: (r?.n ?? 0) + 1 }));
      feedback.mutate({ data: { storyId: next.id, rating } });
    },
    [stories, feedback],
  );
  const undo = React.useCallback(() => {
    const { decisions, history } = latest.current;
    const last = history[history.length - 1];
    if (last === undefined) return;
    const rest = { ...decisions };
    delete rest[last];
    commit({ decisions: rest, history: history.slice(0, -1) });
    setReaction(null);
    feedback.mutate({ data: { storyId: last, rating: "none" } });
  }, [feedback]);

  return { queue, current, kept, skipped, decisions, decide, undo, reaction, canUndo: history.length > 0 };
}

export default function Today() {
  const { data: digest, isLoading } = useGetLatestDigest();
  const { data: senders } = useListSenders();
  const { data: authStatus } = useGetGmailAuthStatus();
  const { data: authUrl } = useGetGmailAuthUrl({
    query: { enabled: authStatus ? !authStatus.connected : false, queryKey: getGetGmailAuthUrlQueryKey() },
  });
  const [, navigate] = useLocation();
  const isPhone = useIsMobile();

  const allStories = React.useMemo(() => flattenStories(digest?.sections), [digest]);
  const stories = React.useMemo(() => uniqueStories(allStories), [allStories]);
  const desk = useSortDesk(digest?.id, stories);
  const { queue, current, kept, skipped, decide, undo } = desk;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") decide("up");
      else if (e.key === "ArrowLeft") decide("down");
      else if (e.key === "Backspace" || e.key.toLowerCase() === "z") undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo]);

  const briefing = useBriefing();
  const night = useNightEdition();
  const crocProp = useCrocProp();
  const { data: stats } = useGetStats();
  const streak = stats?.streakDays ?? 0;
  const makeBriefing = () => briefing.make({ hasBriefing: !!digest });
  const connected = !!authStatus?.connected;

  const editionDate = format(digest ? new Date(digest.date + "T12:00:00") : new Date(), "EEEE d MMMM yyyy");
  const intro = digest?.intro?.replace(/^Good (morning|afternoon|evening)[^.]*\.\s*/i, "");

  // "Who wrote in": today's stories per sender
  const bySource = React.useMemo(() => {
    const counts = new Map<string, number>();
    stories.forEach((s) => s.sourceName && counts.set(s.sourceName, (counts.get(s.sourceName) ?? 0) + 1));
    const names = new Set([...(senders?.map((s) => s.name ?? s.email) ?? []), ...counts.keys()]);
    return [...names]
      .map((name) => ({ name, count: counts.get(name) ?? 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [stories, senders]);

  const sectionsForTiles = (digest?.sections ?? []).filter((s) => s.sectionType !== "top_stories" && s.stories.length > 0);

  if (isPhone && digest && stories.length > 0) {
    return (
      <PhoneDeck
        digestId={digest.id}
        stories={stories}
        queue={queue}
        kept={kept}
        decisions={desk.decisions}
        onDecide={decide}
        onUndo={undo}
        canUndo={desk.canUndo}
        sources={bySource}
        sections={sectionsForTiles.map((sec) => ({ ...sec, stories: allStories.filter((s) => s.sectionId === sec.id) }))}
        reaction={desk.reaction}
        crocProp={crocProp}
        streak={streak}
      />
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-12 pt-4 md:pt-10 pb-28 md:pb-16">
      {/* ── Header ─────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-10 pt-2 pb-8 md:pb-10">
        <div className="min-w-0">
          <div className="t-meta">{editionDate}{digest && ` · Edition ${digest.id} · ${stories.length} stories`}</div>
          <h1 className="t-display max-md:text-[36px] max-md:leading-[42px] text-ink mt-3">{greeting()}, Wout</h1>
          {intro && <p className="t-standfirst mt-3 max-w-[60ch]">{intro}</p>}
        </div>
        {connected && (
          <PressButton
            variant="primary"
            className="shrink-0 self-start md:self-auto"
            onClick={makeBriefing}
            disabled={briefing.busy}
            icon={<Plus className="h-4 w-4" strokeWidth={2} />}
          >
            {briefing.label ?? "New briefing"}
          </PressButton>
        )}
      </header>

      {authStatus && !authStatus.connected && (
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 bg-sec-ai-soft px-6 py-4 rounded-2xl">
          <p className="font-serif text-[16px] leading-6 text-ink">Connect Gmail. wout.daily finds your newsletters there and writes your briefing from them.</p>
          <a href={authUrl?.url || "#"} className="h-10 px-5 shrink-0 inline-flex items-center rounded-full bg-sage text-sage-ink font-sans font-medium text-[14px]">Connect Gmail</a>
        </div>
      )}

      {briefing.busy && (
        <div role="status" className="mb-8 flex items-center gap-5 rounded-[20px] bg-paper-raised px-6 py-4">
          <Croc mood="reading" pose="newspaper" className="w-20 shrink-0" />
          <div>
            <div className="t-label text-ink">{briefing.checking ? "Checking your Gmail…" : "Reading your newsletters…"}</div>
            <div className="t-caption">Usually about a minute. Ads and receipts get skipped.</div>
          </div>
        </div>
      )}

      {briefing.outcome === "gmail-error" && (
        <div role="alert" className="mb-8 flex flex-wrap items-center gap-5 rounded-[20px] bg-paper-raised px-6 py-4">
          <Croc mood="worried" className="w-20 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <div className="t-label text-ink">Gmail didn’t answer</div>
            <div className="t-caption">Couldn’t reach your inbox. Try again in a moment.</div>
          </div>
          <PressButton variant="primary" size="sm" onClick={makeBriefing}>Try again</PressButton>
          <PressButton variant="ghost" size="sm" onClick={briefing.dismiss}>Dismiss</PressButton>
        </div>
      )}

      {briefing.outcome === "quiet" && (
        <div role="status" className="mb-8 flex flex-wrap items-center gap-5 rounded-[20px] bg-paper-raised px-6 py-4">
          <Croc mood="bored" pose="card" className="w-20 shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <div className="t-label text-ink">A quiet day</div>
            <div className="t-caption">No new newsletters since your last briefing, so this one stays.</div>
          </div>
          <PressButton variant="ghost" size="sm" onClick={briefing.dismiss}>Dismiss</PressButton>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
          <Skeleton className="h-[560px] rounded-[20px]" />
          <Skeleton className="h-[560px] rounded-[20px]" />
        </div>
      ) : !digest || stories.length === 0 ? (
        <div className="py-20 text-center">
          {/* Peek's pond: he leaps out for the first briefing, and dozes in it at night. */}
          <div aria-hidden className="relative mx-auto mb-6 h-[170px] w-[440px] max-w-full">
            <Reeds className="absolute left-0 bottom-[22px] h-[150px] w-[84px]" />
            <Reeds flip rushes={1} className="absolute right-2 bottom-[22px] h-[120px] w-[70px]" />
            <Water className="absolute inset-x-[34px] bottom-0 h-[60px]" style={{ borderRadius: "0 0 50% 50% / 0 0 100% 100%" }} />
            <LilyPad flower className="absolute left-[92px] bottom-[18px] w-14" />
            <LilyPad flip className="absolute right-[100px] bottom-[30px] w-9" />
            {night ? (
              <Wading look={{ ...PEEK_LOOKS.dozer, prop: crocProp }} className="absolute left-1/2 -translate-x-1/2 bottom-[52px] w-[150px]" />
            ) : (
              <>
                <Croc {...PEEK_LOOKS.leaper} prop={crocProp} className="absolute left-1/2 -translate-x-1/2 bottom-[30px] w-[190px]" />
                <Dragonfly className="absolute left-[70px] top-2 w-9" />
              </>
            )}
          </div>
          <div className="t-meta">The press is quiet</div>
          <h2 className="t-h1 mt-3">No briefing yet</h2>
          <p className="t-standfirst mt-3 max-w-[48ch] mx-auto">
            {connected
              ? "wout.daily reads the newsletters in your Gmail and writes one calm briefing from them."
              : "Connect Gmail and wout.daily finds your newsletters by itself."}
          </p>
          {connected && (
            <PressButton variant="primary" className="mt-8" onClick={makeBriefing} disabled={briefing.busy} icon={<Plus className="h-4 w-4" strokeWidth={2} />}>
              {briefing.label ?? "Make my first briefing"}
            </PressButton>
          )}
        </div>
      ) : (
        <>
          {/* ── Desk + rail ───────────────────────── */}
          <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6">
            <SortCard
              story={current}
              position={stories.length - queue.length + 1}
              total={stories.length}
              onKeep={() => decide("up")}
              onSkip={() => decide("down")}
              onUndo={undo}
              canUndo={desk.canUndo}
              kept={kept.length}
              reaction={desk.reaction}
              crocProp={crocProp}
              onStartReading={() => kept[0] && navigate(storyHref(digest.id, kept[0]))}
              className="min-h-[560px] self-start"
            />

            <aside className="space-y-6">
              {streak >= 7 && (
                <div className="rounded-[20px] bg-sage-soft p-5 flex items-center gap-4">
                  <Croc mood="proud" className="w-16 shrink-0" />
                  <div>
                    <div className="t-label text-ink">{streak} days in a row</div>
                    <div className="t-caption">You’ve sorted your briefing every day.</div>
                  </div>
                </div>
              )}
              <div className="rounded-[20px] bg-ink text-paper p-6">
                <div className="font-sans text-[13px] font-medium opacity-70">Left to sort</div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="t-numeral text-[64px] leading-[68px]">{queue.length}</span>
                  <span className="font-sans text-[14px] opacity-60">of {stories.length}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  <span className="h-7 px-3 rounded-full bg-paper/10 font-sans text-[13px] grid place-items-center"><span><b className="font-semibold tabular-nums">{kept.length}</b> kept</span></span>
                  <span className="h-7 px-3 rounded-full bg-paper/10 font-sans text-[13px] grid place-items-center"><span><b className="font-semibold tabular-nums">{skipped}</b> skipped</span></span>
                </div>
              </div>

              <div className="rounded-[20px] bg-paper-raised p-6">
                <SectionHeader title="Your reading list" aside={kept.length ? `${kept.length} saved` : undefined} />
                {kept.length ? (
                  <div className="mt-3">
                    {kept.map((s, i) => (
                      <ReadingListItem key={s.id} story={s} digestId={digest.id} index={i + 1} />
                    ))}
                  </div>
                ) : (
                  <p className="font-serif text-[16px] leading-[26px] text-ink-2 mt-3">
                    Nothing saved yet. Keep a story on the card and it lands here for later.
                  </p>
                )}
              </div>

              {bySource.length > 0 && (
                <div className="rounded-[20px] bg-paper-raised p-6">
                  <SectionHeader title="Who wrote in" aside={`${bySource.length} ${bySource.length === 1 ? "newsletter" : "newsletters"}`} />
                  <div className="mt-2">
                    {bySource.map((r) => (
                      <SenderRow key={r.name} name={r.name} count={r.count} />
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>

          {/* ── Sections ─────────────────────────── */}
          {sectionsForTiles.length > 0 && (
            <div className="mt-16">
              <SectionHeader
                title="Inside today’s edition"
                aside={
                  <Link href={`/digest/${digest.id}`}>
                    <span className="inline-flex items-center gap-1 font-sans font-medium text-ink hover:text-ink-2 cursor-pointer">
                      Read the full edition <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                }
              />
              <div className="grid grid-cols-4 gap-4 mt-5">
                {sectionsForTiles.map((sec) => (
                  <SectionTile
                    key={sec.id}
                    title={sec.title}
                    sectionType={sec.sectionType}
                    stories={allStories.filter((s) => s.sectionId === sec.id)}
                    digestId={digest.id}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
