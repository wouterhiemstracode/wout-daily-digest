import { useParams, Link } from "wouter";
import { useGetDigest, useSubmitFeedback, getGetDigestQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown, ExternalLink, ArrowLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function DigestView() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { data: digest, isLoading } = useGetDigest(id, { query: { enabled: !!id, queryKey: getGetDigestQueryKey(id) } });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const feedbackMutation = useSubmitFeedback({
    mutation: {
      onSuccess: () => {
        toast({ title: "Got it!", description: "We'll keep that in mind for tomorrow's edition." });
        queryClient.invalidateQueries({ queryKey: getGetDigestQueryKey(id) });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-3 space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
          <div className="md:col-span-2 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="text-center py-16 text-muted-foreground font-sans">
        <p className="text-2xl italic mb-2" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          This edition couldn't be found.
        </p>
        <Link href="/archive">
          <span className="text-sm text-primary underline cursor-pointer">Back to the archive</span>
        </Link>
      </div>
    );
  }

  // Split sections
  const topSection = digest.sections.find((s) => s.sectionType === "top_stories");
  const howIAISection = digest.sections.find((s) => s.sectionType === "how_i_ai");
  const howIAIStory = howIAISection?.stories[0] ?? null;
  const top5 = topSection?.stories.slice(0, 5) ?? [];
  const jobsSection = digest.sections.find((s) => s.sectionType === "jobs");
  const restSections = digest.sections.filter(
    (s) => s.sectionType !== "top_stories" && s.sectionType !== "how_i_ai" && s.sectionType !== "jobs" && s.stories.length > 0
  );

  return (
    <div className="max-w-5xl mx-auto pb-24 animate-in fade-in duration-500">

      {/* Back link */}
      <Link href="/archive">
        <span className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer mb-6 block">
          <ArrowLeft className="h-3 w-3" /> Back to Past Editions
        </span>
      </Link>

      {/* Masthead */}
      <div className="border-t-[3px] border-b-[3px] border-double border-foreground py-5 mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="shrink-0 border-2 border-border overflow-hidden w-36 sm:w-44">
            <img src="/wout-reading.png" alt="Wout reading the digest" className="w-full object-cover mix-blend-multiply" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-black text-primary uppercase tracking-tight leading-tight mb-2"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Wout's Daily Digest
            </h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 font-sans text-[11px] uppercase tracking-widest text-muted-foreground border-t border-border pt-2 mb-3">
              <span>{format(new Date(digest.date), "EEEE, MMMM d, yyyy")}</span>
              <span>·</span>
              <span>{digest.storyCount} Stories</span>
            </div>
            {/* Good morning intro */}
            {digest.intro && (
              <p
                className="text-base italic text-foreground/75 leading-relaxed"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {digest.intro}
              </p>
            )}
            <p className="mt-2 text-[10px] font-sans text-muted-foreground/70">
              👍 / 👎 each story to tune tomorrow's edition
            </p>
          </div>
        </div>
      </div>

      {/* How I AI Takeaway of Today */}
      {howIAIStory && (
        <div className="mb-8 border-2 border-primary bg-primary/5 relative overflow-hidden">
          {/* Label tab */}
          <div className="bg-primary px-4 py-1.5 inline-flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-primary-foreground">
              ✦ How I AI — Takeaway of Today
            </span>
          </div>
          <div className="px-6 py-5">
            {/* Person */}
            <p className="text-[11px] font-sans uppercase tracking-widest text-primary/70 mb-2">
              {howIAIStory.sourceName ?? "Lenny's Newsletter"}
            </p>
            <h3
              className="text-xl sm:text-2xl font-bold text-primary leading-snug mb-3"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {howIAIStory.headline}
            </h3>
            <p className="text-sm leading-relaxed text-foreground/80 mb-4">
              {howIAIStory.summary}
            </p>
            {/* Takeaway bullets */}
            {howIAIStory.takeaways && howIAIStory.takeaways.length > 0 && (
              <ul className="space-y-2 border-t border-primary/20 pt-4">
                {howIAIStory.takeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-sans text-foreground/80">
                    <span className="text-primary font-black shrink-0 mt-0.5">✦</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            )}
            {/* Footer */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-primary/20">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => feedbackMutation.mutate({ data: { storyId: howIAIStory.id, rating: 'up' } })}
                  className={`p-1.5 transition-colors rounded ${howIAIStory.userFeedback === 'up' ? 'text-green-700 bg-green-50' : 'text-muted-foreground hover:text-green-700'}`}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => feedbackMutation.mutate({ data: { storyId: howIAIStory.id, rating: 'down' } })}
                  className={`p-1.5 transition-colors rounded ${howIAIStory.userFeedback === 'down' ? 'text-destructive bg-destructive/5' : 'text-muted-foreground hover:text-destructive'}`}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
              {howIAIStory.sourceUrl && (
                <a
                  href={howIAIStory.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-primary hover:text-primary/80 border border-primary px-3 py-1 transition-colors"
                >
                  Read full piece <ChevronRight className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main two-column layout */}
      <div className="flex flex-col lg:flex-row gap-10">

        {/* LEFT: Top 5 cards */}
        <div className="lg:w-[60%]">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-0.5 bg-foreground"></span>
            <h2 className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-primary whitespace-nowrap">
              Today's Top 5
            </h2>
            <span className="flex-1 h-0.5 bg-foreground"></span>
          </div>

          {top5.length === 0 ? (
            <p className="text-sm font-sans text-muted-foreground italic py-8 text-center">No top stories yet — generate a briefing first.</p>
          ) : (
            <div className="space-y-0">
              {top5.map((story, i) => (
                <article key={story.id} className={`py-6 ${i > 0 ? "border-t border-border" : ""}`}>
                  {/* Story number + source */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-3xl font-black text-border leading-none"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {i + 1}
                    </span>
                    {story.sourceName && (
                      <span className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground border border-border px-2 py-0.5">
                        {story.sourceName}
                      </span>
                    )}
                  </div>

                  {/* Headline */}
                  <h3
                    className="text-xl sm:text-2xl font-bold leading-tight text-foreground mb-2"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {story.headline}
                  </h3>

                  {/* Plain-English description */}
                  <p className="text-sm leading-relaxed text-foreground/80 mb-3">
                    {story.summary}
                  </p>

                  {/* Takeaway bullets */}
                  {story.takeaways && story.takeaways.length > 0 && (
                    <ul className="mb-4 space-y-1">
                      {story.takeaways.map((t, ti) => (
                        <li key={ti} className="flex items-start gap-2 text-sm font-sans text-foreground/75">
                          <span className="text-primary font-bold mt-0.5 shrink-0">—</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Footer: feedback + read more */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'up' } })}
                        className={`p-1.5 transition-colors rounded ${story.userFeedback === 'up' ? 'text-green-700 bg-green-50' : 'text-muted-foreground hover:text-green-700'}`}
                        aria-label="Good story"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'down' } })}
                        className={`p-1.5 transition-colors rounded ${story.userFeedback === 'down' ? 'text-destructive bg-destructive/5' : 'text-muted-foreground hover:text-destructive'}`}
                        aria-label="Not useful"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {story.sourceUrl && (
                      <a
                        href={story.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors border border-primary px-3 py-1"
                      >
                        Read More <ChevronRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Everything else */}
        <div className="lg:w-[40%] lg:border-l-2 lg:border-foreground lg:pl-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex-1 h-0.5 bg-foreground"></span>
            <h2 className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-primary whitespace-nowrap">
              Everything Else
            </h2>
            <span className="flex-1 h-0.5 bg-foreground"></span>
          </div>

          {restSections.length === 0 ? (
            <p className="text-sm font-sans text-muted-foreground italic">Nothing else in this edition.</p>
          ) : (
            <div className="space-y-7">
              {restSections.map((section) => (
                <div key={section.id}>
                  {/* Section label */}
                  <div className="text-[9px] font-sans font-bold uppercase tracking-[0.2em] text-muted-foreground mb-3 flex items-center gap-2">
                    <span>{section.title}</span>
                    <span className="flex-1 h-px bg-border"></span>
                  </div>

                  <div className="space-y-4">
                    {section.stories.map((story, i) => (
                      <div key={story.id} className={`${i > 0 ? "pt-4 border-t border-dashed border-border/60" : ""}`}>
                        {/* Headline + source */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4
                            className="text-[15px] font-bold leading-snug text-foreground"
                            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                          >
                            {story.headline}
                          </h4>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'up' } })}
                              className={`p-1 transition-colors rounded ${story.userFeedback === 'up' ? 'text-green-700' : 'text-muted-foreground/50 hover:text-green-700'}`}
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'down' } })}
                              className={`p-1 transition-colors rounded ${story.userFeedback === 'down' ? 'text-destructive' : 'text-muted-foreground/50 hover:text-destructive'}`}
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {story.sourceName && (
                          <span className="text-[9px] font-sans uppercase tracking-wider text-muted-foreground">
                            {story.sourceName}
                          </span>
                        )}

                        <p className="text-[13px] leading-relaxed text-foreground/70 mt-1">
                          {story.summary}
                        </p>

                        {story.sourceUrl && (
                          <a
                            href={story.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-sans text-muted-foreground hover:text-primary transition-colors mt-1 uppercase tracking-wider"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            Read more
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Job Openings */}
      {jobsSection && jobsSection.stories.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-1 h-px bg-border"></span>
            <h2 className="text-[11px] font-sans font-bold uppercase tracking-[0.2em] text-primary whitespace-nowrap">
              Job Openings
            </h2>
            <span className="flex-1 h-px bg-border"></span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobsSection.stories.slice(0, 5).map((job) => (
              <div key={job.id} className="border border-border p-4 bg-card hover:border-primary/40 transition-colors">
                <p className="text-[11px] font-sans font-bold uppercase tracking-widest text-primary/60 mb-1">
                  {job.sourceName ?? "Newsletter"}
                </p>
                <p className="text-sm font-semibold text-primary leading-snug mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                  {job.headline}
                </p>
                <p className="text-[12px] leading-relaxed text-foreground/65 mb-3">{job.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => feedbackMutation.mutate({ data: { storyId: job.id, rating: 'up' } })}
                      className={`p-1 transition-colors ${job.userFeedback === 'up' ? 'text-green-700' : 'text-muted-foreground hover:text-green-700'}`}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => feedbackMutation.mutate({ data: { storyId: job.id, rating: 'down' } })}
                      className={`p-1 transition-colors ${job.userFeedback === 'down' ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </button>
                  </div>
                  {job.sourceUrl && (
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-sans uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                      Apply <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-12 pt-6 border-t-[3px] border-double border-foreground text-center">
        <p className="text-sm italic text-muted-foreground" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          End of edition · Wout's Daily Digest
        </p>
      </div>
    </div>
  );
}
