import { useParams, Link } from "wouter";
import { useGetDigest, useSubmitFeedback, getGetDigestQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown, ExternalLink, ArrowLeft } from "lucide-react";
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
        toast({ title: "Got it!", description: "We'll keep that in mind for tomorrow." });
        queryClient.invalidateQueries({ queryKey: getGetDigestQueryKey(id) });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in max-w-4xl mx-auto">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-12 w-2/3" />
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!digest) {
    return (
      <div className="text-center py-16 text-muted-foreground font-sans">
        <p
          className="text-2xl italic mb-2"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          This edition couldn't be found.
        </p>
        <Link href="/archive">
          <span className="text-sm text-primary underline cursor-pointer">Back to the archive</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 animate-in fade-in duration-500">

      {/* Back link */}
      <Link href="/archive">
        <span className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer mb-8 block">
          <ArrowLeft className="h-3 w-3" /> Back to Past Editions
        </span>
      </Link>

      {/* Masthead bar */}
      <div className="border-t-[3px] border-b-[3px] border-double border-foreground py-6 mb-10 text-center">
        <h1
          className="text-4xl sm:text-5xl font-black text-primary uppercase tracking-tight leading-tight"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Wout's Daily Digest
        </h1>
        <div className="flex items-center justify-center gap-4 mt-3 font-sans text-[11px] uppercase tracking-widest text-muted-foreground">
          <span>{format(new Date(digest.date), "EEEE, MMMM d, yyyy")}</span>
          <span>·</span>
          <span>{digest.storyCount} Stories</span>
          <span>·</span>
          <span className="capitalize">{digest.status}</span>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-14">
        {digest.sections.map((section) => (
          <section key={section.id}>
            {/* Section header */}
            <div className="flex items-center gap-4 mb-6">
              <span className="flex-1 h-0.5 bg-foreground"></span>
              <h2
                className="text-sm font-sans font-bold uppercase tracking-[0.2em] text-primary whitespace-nowrap"
              >
                {section.title}
              </h2>
              <span className="flex-1 h-0.5 bg-foreground"></span>
            </div>

            {/* Stories */}
            <div className="space-y-8">
              {section.stories.map((story, i) => (
                <article
                  key={story.id}
                  className={`${i > 0 ? "pt-8 border-t border-dashed border-border" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3
                      className="text-2xl font-bold leading-tight text-foreground"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {story.headline}
                    </h3>
                    <span className="shrink-0 text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground border border-border bg-card px-2 py-1 mt-1">
                      {(story.relevanceScore * 100).toFixed(0)}% relevant
                    </span>
                  </div>

                  {story.sourceName && (
                    <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground border-y border-border/60 py-1 inline-block mb-4">
                      {story.sourceName}
                    </p>
                  )}

                  <p className="text-base leading-relaxed text-foreground/85 mb-5">
                    {story.summary}
                  </p>

                  {story.whyItMatters && (
                    <div className="border-l-4 border-primary bg-card px-5 py-4 mb-5">
                      <div className="text-[10px] font-sans font-bold uppercase tracking-widest text-primary mb-2">
                        Why it matters
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/80 italic"
                         style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                        {story.whyItMatters}
                      </p>
                    </div>
                  )}

                  {/* Footer: feedback + source */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/60">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'up' } })}
                        className={`p-2 transition-colors rounded ${story.userFeedback === 'up' ? 'text-green-700 bg-green-50' : 'text-muted-foreground hover:text-green-700'}`}
                        aria-label="Good story"
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'down' } })}
                        className={`p-2 transition-colors rounded ${story.userFeedback === 'down' ? 'text-destructive bg-destructive/5' : 'text-muted-foreground hover:text-destructive'}`}
                        aria-label="Not useful"
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                      <span className="text-[10px] font-sans text-muted-foreground ml-1">
                        Helpful?
                      </span>
                    </div>
                    {story.sourceUrl && (
                      <a
                        href={story.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-sans text-muted-foreground hover:text-primary transition-colors uppercase tracking-wider"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {story.sourceName || "Read source"}
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer rule */}
      <div className="mt-14 pt-6 border-t-[3px] border-double border-foreground text-center">
        <p
          className="text-sm italic text-muted-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          End of edition · Wout's Daily Digest
        </p>
      </div>
    </div>
  );
}
