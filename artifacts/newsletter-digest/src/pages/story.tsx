import * as React from "react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { useGetDigest, getGetDigestQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { SectionKicker, SourceAvatar } from "@/components/press/stories";
import { flattenStories, readMinutes, storyHref, uniqueStories } from "@/lib/press";

function hostOf(url?: string | null) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** Reading view: one story, set for long-form reading. */
export default function StoryPage() {
  const params = useParams();
  const digestId = parseInt(params.digestId || "0", 10);
  const storyId = parseInt(params.storyId || "0", 10);
  const { data: digest, isLoading } = useGetDigest(digestId, { query: { enabled: !!digestId, queryKey: getGetDigestQueryKey(digestId) } });

  const stories = React.useMemo(() => flattenStories(digest?.sections), [digest]);
  const story = stories.find((s) => s.id === storyId);
  // "Up next" follows Today's order, where a story appears once
  const order = uniqueStories(stories);
  const next = story ? order[order.findIndex((s) => s.headline === story.headline) + 1] : undefined;

  // reading progress, measured on the scrolling <main>
  const ref = React.useRef<HTMLDivElement>(null);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => {
    const scroller = ref.current?.closest("main");
    if (!scroller) return;
    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight;
      setProgress(max > 0 ? scroller.scrollTop / max : 0);
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, [story?.id]);

  if (isLoading) {
    return (
      <div className="max-w-[720px] mx-auto pt-24 space-y-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!digest || !story) {
    return (
      <div className="max-w-[720px] mx-auto pt-24 text-center">
        <div className="t-meta">Not in this edition</div>
        <h1 className="t-h1 mt-3">We couldn’t find that story.</h1>
        <Link href="/"><span className="mt-6 inline-flex items-center gap-1 font-sans font-semibold text-sage cursor-pointer"><ArrowLeft className="h-4 w-4" /> Back to today</span></Link>
      </div>
    );
  }

  // Digests written before full text existed have no body; the briefing fields carry them.
  const [lead, ...rest] = story.body ?? [];
  const quoteAfter = Math.min(2, rest.length - 1);
  const date = format(new Date(digest.date + "T12:00:00"), "EEEE d MMMM yyyy");
  const host = hostOf(story.sourceUrl);

  return (
    <div ref={ref}>
      {/* sticky reading bar */}
      <div className="sticky top-0 z-10 bg-paper/90 backdrop-blur">
        <div className="max-w-[1120px] mx-auto px-4 md:px-12 h-14 md:h-16 flex items-center justify-between gap-6">
          <Link href="/">
            <span className="inline-flex items-center gap-2 h-9 px-3.5 -ml-3.5 rounded-full t-label text-ink-2 hover:bg-paper-raised hover:text-ink cursor-pointer">
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Today
            </span>
          </Link>
          <div className="flex-1 max-w-[120px] md:max-w-[320px] h-1 rounded-full bg-paper-sunk overflow-hidden">
            <div className="h-full bg-sage rounded-full origin-left" style={{ transform: `scaleX(${Math.max(progress, 0.02)})` }} />
          </div>
          <span className="t-caption tabular-nums">{readMinutes(story)} min read</span>
        </div>
      </div>

      <article className="max-w-[704px] mx-auto px-4 pt-8 md:pt-14 pb-32 md:pb-24">
        <header>
          <SectionKicker story={story} />
          <h1 className="t-display max-md:text-[34px] max-md:leading-[40px] mt-6 text-ink">{story.headline}</h1>
          <p className="t-standfirst mt-5 md:text-[21px] md:leading-[34px]">{story.summary}</p>
          <div className="flex items-center gap-3 mt-8">
            <SourceAvatar name={story.sourceName} className="h-9 w-9 text-[14px]" />
            <div>
              <div className="t-label text-ink">{story.sourceName}</div>
              <div className="t-caption">Summarised for Wout · {date}</div>
            </div>
          </div>
        </header>

        {lead && (
          <div className="mt-12">
            <p className="t-body md:text-[22px] md:leading-[36px]">{lead}</p>
            {rest.map((p, i) => (
              <React.Fragment key={i}>
                <p className="t-body mt-7">{p}</p>
                {i === quoteAfter && story.pullQuote && (
                  <figure className="my-12 rounded-2xl bg-sage-soft px-6 py-7 md:px-10 md:py-9">
                    <blockquote className="font-sans font-medium text-[22px] leading-[30px] md:text-[28px] md:leading-[38px] tracking-[-0.025em] text-ink" style={{ textWrap: "balance" } as React.CSSProperties}>
                      “{story.pullQuote}”
                    </blockquote>
                    <figcaption className="t-caption mt-4 text-ink-2">{story.sourceName}</figcaption>
                  </figure>
              )}
            </React.Fragment>
          ))}
        </div>
        )}

        {/* Why it matters + takeaways */}
        <aside className={cn("mt-14 grid gap-4", story.takeaways.length > 0 && "md:grid-cols-2")}>
          <div className="rounded-2xl bg-paper-raised p-6">
            <div className="font-sans text-[14px] font-semibold text-sage">Why it matters</div>
            <p className="font-serif text-[17px] leading-[28px] text-ink mt-2">{story.whyItMatters}</p>
          </div>
          {story.takeaways.length > 0 && (
            <div className="rounded-2xl bg-paper-raised p-6">
              <div className="font-sans text-[14px] font-semibold text-ink">Takeaways</div>
              <ol className="mt-3 space-y-3">
                {story.takeaways.map((t, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="h-6 w-6 rounded-full bg-paper grid place-items-center font-sans text-[12px] font-semibold text-ink-2 shrink-0 mt-0.5">{i + 1}</span>
                    <span className="font-serif text-[17px] leading-[28px] text-ink">{t}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>

        {host && (
          <a href={story.sourceUrl!} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between gap-4 rounded-2xl bg-paper-raised px-6 py-5 hover:bg-paper-sunk transition-colors group">
            <span className="flex items-center gap-3">
              <SourceAvatar name={story.sourceName} className="h-9 w-9 text-[14px] bg-paper" />
              <span>
                <span className="t-caption block">Original newsletter</span>
                <span className="t-label text-sage">Read it in full at {host}</span>
              </span>
            </span>
            <ArrowUpRight className="h-5 w-5 text-ink-2 group-hover:text-ink" strokeWidth={1.75} />
          </a>
        )}

        {next && (
          <Link href={storyHref(digest.id, next)}>
            <div className="mt-16 cursor-pointer group rounded-[20px] bg-ink text-paper p-6 md:p-8">
              <div className="flex items-center justify-between">
                <span className="font-sans text-[13px] font-medium opacity-70">Up next</span>
                <span className="font-sans text-[13px] opacity-70">{next.sectionTitle}</span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-6">
                <h2 className="t-h2">{next.headline}</h2>
                <span className="h-10 w-10 rounded-full bg-paper text-ink grid place-items-center shrink-0 group-hover:translate-x-1 transition-transform"><ArrowRight className="h-5 w-5" strokeWidth={1.75} /></span>
              </div>
              <p className="font-sans text-[15px] leading-6 mt-2 opacity-70 max-w-[60ch]">{next.summary}</p>
            </div>
          </Link>
        )}
      </article>
    </div>
  );
}
