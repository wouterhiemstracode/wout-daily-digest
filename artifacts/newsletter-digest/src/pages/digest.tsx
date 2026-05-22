import { useParams, Link } from "wouter";
import { useGetDigest, useSubmitFeedback, getGetDigestQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ThumbsUp, ThumbsDown, ExternalLink, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        toast({ title: "Feedback recorded", description: "Signal logged for future briefings." });
        queryClient.invalidateQueries({ queryKey: getGetDigestQueryKey(id) });
      }
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-12 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!digest) {
    return <div className="text-center py-12 text-muted-foreground font-mono">Digest not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-4 border-b border-border pb-8">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider -ml-3 text-muted-foreground hover:text-primary">
          <Link href="/archive"><ArrowLeft className="h-3 w-3 mr-2" /> Back to Archive</Link>
        </Button>
        <h1 className="text-4xl font-bold tracking-tight mt-4">Intelligence Briefing</h1>
        <div className="flex items-center gap-4 font-mono text-sm">
          <div className="text-primary font-bold">{format(new Date(digest.date), "EEEE, MMMM do, yyyy")}</div>
          <div className="text-muted-foreground">|</div>
          <div className="text-muted-foreground">{digest.storyCount} STORIES</div>
          <div className="text-muted-foreground">|</div>
          <div className="text-muted-foreground">STATUS: {digest.status.toUpperCase()}</div>
        </div>
      </div>

      <div className="space-y-16">
        {digest.sections.map((section) => (
          <section key={section.id} className="space-y-6">
            <h2 className="text-2xl font-bold border-b border-primary/20 pb-2 uppercase tracking-wide text-primary">
              {section.title}
            </h2>
            
            <div className="space-y-8">
              {section.stories.map((story) => (
                <div key={story.id} className="bg-card border border-border p-6 rounded-xl relative group transition-colors hover:border-primary/50">
                  <div className="absolute top-6 right-6 font-mono text-xs font-bold text-primary/80 bg-primary/10 px-2 py-1 rounded">
                    {(story.relevanceScore * 100).toFixed(0)}%
                  </div>
                  <h3 className="text-xl font-bold leading-tight pr-16 text-foreground group-hover:text-primary transition-colors">
                    {story.headline}
                  </h3>
                  
                  <div className="mt-4 space-y-4">
                    <p className="text-muted-foreground leading-relaxed text-sm">
                      {story.summary}
                    </p>
                    <div className="bg-muted p-4 rounded-lg border border-border/50">
                      <div className="font-mono text-xs font-bold uppercase tracking-wider mb-2 text-primary">Why it matters</div>
                      <p className="text-sm">{story.whyItMatters}</p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'up' } })}
                        className={story.userFeedback === 'up' ? 'text-green-500 bg-green-500/10' : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => feedbackMutation.mutate({ data: { storyId: story.id, rating: 'down' } })}
                        className={story.userFeedback === 'down' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                    {story.sourceUrl && (
                      <Button asChild variant="link" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary">
                        <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          {story.sourceName || "Source"}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
