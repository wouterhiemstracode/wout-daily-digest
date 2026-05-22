import { Link } from "wouter";
import {
  useGetStats,
  useGetLatestDigest,
  useGetGmailAuthStatus,
  useGetGmailAuthUrl,
  useGenerateDigest,
  useSyncEmails
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { RefreshCw, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetStats();
  const { data: latestDigest, isLoading: digestLoading, refetch: refetchDigest } = useGetLatestDigest();
  const { data: authStatus } = useGetGmailAuthStatus();
  const { data: authUrl } = useGetGmailAuthUrl({ query: { enabled: !authStatus?.connected } });
  const { toast } = useToast();

  const generateMutation = useGenerateDigest({
    mutation: {
      onSuccess: () => {
        toast({ title: "Briefing ready!", description: "Your morning digest has been generated." });
        refetchStats();
        refetchDigest();
      },
      onError: () => {
        toast({ title: "Couldn't generate", description: "Something went wrong. Try again in a moment.", variant: "destructive" });
      }
    }
  });

  const syncMutation = useSyncEmails({
    mutation: {
      onSuccess: (data) => {
        toast({
          title: "All caught up!",
          description: `Fetched ${data.fetched} emails from ${data.senders} sources.`
        });
        refetchStats();
      },
      onError: () => {
        toast({ title: "Sync failed", description: "Couldn't reach Gmail. Try again shortly.", variant: "destructive" });
      }
    }
  });

  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  return (
    <div className="animate-in fade-in duration-500">

      {/* Top rule + meta bar */}
      <div className="border-t-[3px] border-foreground pt-3 pb-2 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <span className="text-[11px] font-sans uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          Morning Edition
        </span>
        {authStatus?.connected && (
          <span className="flex items-center gap-1.5 text-[11px] font-sans text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {authStatus.email}
          </span>
        )}
        <span className="text-[11px] font-sans uppercase tracking-[0.15em] text-muted-foreground font-semibold">
          {today}
        </span>
      </div>

      {/* Masthead */}
      <div className="text-center border-b-[6px] border-double border-foreground pb-6 mb-8">
        {/* Mobile: stacked */}
        <div className="flex flex-col items-center gap-2 sm:hidden mb-3">
          <img src="/coffee-cup.png" alt="Coffee cup" className="w-16 h-16 opacity-85" />
          <h1
            className="text-5xl font-black text-primary uppercase tracking-tight leading-none"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Wout's Daily Digest
          </h1>
        </div>
        {/* Desktop: side by side */}
        <div className="hidden sm:flex items-center justify-center gap-6 mb-4">
          <img src="/coffee-cup.png" alt="Coffee cup" className="w-24 h-24 opacity-85" />
          <h1
            className="text-7xl lg:text-8xl font-black text-primary uppercase tracking-tight leading-none"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Wout's Daily Digest
          </h1>
        </div>
        <p
          className="text-lg sm:text-2xl italic text-muted-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Your morning intelligence, beautifully curated.
        </p>
      </div>

      {/* Gmail not connected warning */}
      {!authStatus?.connected && (
        <div className="border border-destructive/40 bg-destructive/5 p-6 mb-8 text-center">
          <p
            className="text-lg italic text-destructive mb-4"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Your Gmail account isn't connected yet.
          </p>
          <p className="text-sm font-sans text-muted-foreground mb-4">
            Connect it to start syncing newsletters and generating your daily briefing.
          </p>
          <a
            href={authUrl?.url || "#"}
            className="inline-block px-6 py-2.5 border-2 border-primary bg-primary text-primary-foreground font-sans text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            Connect Gmail
          </a>
        </div>
      )}

      {/* Actions + Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 border-b-2 border-foreground pb-8 mb-8">
        {/* Actions */}
        <div className="md:col-span-5 flex flex-col justify-center gap-3">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || !authStatus?.connected}
            className="w-full border-2 border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background transition-colors py-3 px-5 font-sans text-sm font-semibold uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            {syncMutation.isPending ? "Syncing…" : "Sync Today's Newsletters"}
          </button>
          <button
            onClick={() => generateMutation.mutate({ data: {} })}
            disabled={generateMutation.isPending || !authStatus?.connected}
            className="w-full border-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90 transition-colors py-3 px-5 font-sans text-sm font-semibold uppercase tracking-wider disabled:opacity-40 shadow-[3px_3px_0_0_rgba(0,0,0,0.15)]"
          >
            {generateMutation.isPending ? "Writing your briefing…" : "Generate My Briefing"}
          </button>
        </div>

        {/* Column divider */}
        <div className="hidden md:flex md:col-span-1 justify-center">
          <div className="w-px bg-border self-stretch"></div>
        </div>

        {/* Stats */}
        <div className="md:col-span-6 grid grid-cols-3 divide-x divide-border text-center">
          {[
            { label: "Digests\nGenerated", value: stats?.totalDigests },
            { label: "Stories\nCurated", value: stats?.totalStories },
            { label: "Sources\nTracked", value: stats?.totalSenders },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center justify-center px-4 py-2">
              {statsLoading ? (
                <Skeleton className="h-12 w-16 mb-2" />
              ) : (
                <span
                  className="text-5xl font-black text-primary leading-none mb-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {value ?? 0}
                </span>
              )}
              <span className="text-[10px] font-sans uppercase tracking-widest text-muted-foreground border-t border-border pt-2 whitespace-pre-line text-center leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Digest / Front Page */}
      <div>
        <h2
          className="text-2xl font-bold uppercase tracking-widest text-primary flex items-center gap-4 mb-6"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          <span className="flex-1 h-px bg-foreground inline-block"></span>
          Today's Front Page
          <span className="flex-1 h-px bg-foreground inline-block"></span>
        </h2>

        {digestLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : latestDigest ? (
          <div>
            {/* Edition meta */}
            <div className="flex items-center gap-4 font-sans text-[11px] uppercase tracking-widest text-muted-foreground mb-6 border-b border-border pb-3">
              <span>Edition of {format(new Date(latestDigest.date), "MMMM d, yyyy")}</span>
              <span>·</span>
              <span>{latestDigest.storyCount} Stories</span>
              <span>·</span>
              <span className="capitalize">{latestDigest.status}</span>
            </div>

            {/* Stories in newspaper column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative mb-8">
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2"></div>

              {latestDigest.sections.slice(0, 2).map((section, sectionIdx) => (
                <div key={section.id} className={sectionIdx === 1 ? "md:pl-4" : "md:pr-4"}>
                  <h3
                    className="text-xs font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground border-b border-border pb-2 mb-4"
                  >
                    {section.title}
                  </h3>
                  <div className="space-y-6">
                    {section.stories.slice(0, 3).map((story, i) => (
                      <article key={story.id} className={i > 0 ? "pt-5 border-t border-dashed border-border" : ""}>
                        <h4
                          className={`font-bold leading-tight mb-2 text-foreground hover:text-primary transition-colors cursor-pointer ${i === 0 ? "text-2xl" : "text-lg"}`}
                          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                        >
                          {story.headline}
                        </h4>
                        {story.sourceName && (
                          <p className="text-[11px] font-sans uppercase tracking-widest text-muted-foreground mb-2 border-y border-border/60 py-1 inline-block">
                            {story.sourceName}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3">
                          {story.summary}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-double border-foreground pt-4 flex justify-end">
              <Link href={`/digest/${latestDigest.id}`}>
                <span className="inline-flex items-center gap-2 font-sans text-xs font-semibold uppercase tracking-widest text-primary hover:text-foreground transition-colors cursor-pointer">
                  Read the full edition <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-14 border border-dashed border-border bg-card">
            <p
              className="text-xl italic text-muted-foreground mb-4"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              No briefing yet — the press is quiet.
            </p>
            <p className="text-sm font-sans text-muted-foreground mb-6">
              Add some newsletter sources, sync your inbox, and generate your first edition!
            </p>
            {authStatus?.connected && (
              <button
                onClick={() => generateMutation.mutate({ data: {} })}
                disabled={generateMutation.isPending}
                className="border-2 border-primary bg-primary text-primary-foreground px-6 py-2.5 font-sans text-sm font-semibold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                {generateMutation.isPending ? "Writing…" : "Generate First Briefing"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer nudge */}
      <div className="mt-14 pt-6 border-t-[3px] border-double border-foreground text-center">
        <p
          className="text-lg italic text-muted-foreground"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Add your favourite newsletters in{" "}
          <Link href="/senders">
            <span className="font-bold text-primary border-b border-primary hover:text-foreground transition-colors cursor-pointer">
              My Sources
            </span>
          </Link>{" "}
          to get started →
        </p>
      </div>
    </div>
  );
}
