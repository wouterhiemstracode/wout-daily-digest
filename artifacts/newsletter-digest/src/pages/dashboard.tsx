import { Link } from "wouter";
import { 
  useGetStats, 
  useGetLatestDigest, 
  useGetGmailAuthStatus,
  useGetGmailAuthUrl,
  useGenerateDigest,
  useSyncEmails
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { RefreshCw, FileText, Mail, Activity, ArrowRight, Zap } from "lucide-react";
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
        toast({ title: "Digest generated", description: "Your latest intelligence briefing is ready." });
        refetchStats();
        refetchDigest();
      },
      onError: (err) => {
        toast({ title: "Generation failed", description: "Could not generate digest.", variant: "destructive" });
      }
    }
  });

  const syncMutation = useSyncEmails({
    mutation: {
      onSuccess: (data) => {
        toast({ 
          title: "Sync complete", 
          description: `Fetched ${data.fetched} emails from ${data.senders} senders.` 
        });
        refetchStats();
      },
      onError: () => {
        toast({ title: "Sync failed", description: "Could not sync emails from Gmail.", variant: "destructive" });
      }
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Intelligence Dashboard</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">System overview and latest signals.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => syncMutation.mutate()} 
            disabled={syncMutation.isPending || !authStatus?.connected}
            className="font-mono text-xs uppercase tracking-wider"
          >
            <RefreshCw className={`h-3 w-3 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync Sources
          </Button>
          <Button 
            onClick={() => generateMutation.mutate({ data: {} })} 
            disabled={generateMutation.isPending || !authStatus?.connected}
            className="font-mono text-xs uppercase tracking-wider"
          >
            <Zap className="h-3 w-3 mr-2" />
            {generateMutation.isPending ? "Compiling..." : "Generate Briefing"}
          </Button>
        </div>
      </div>

      {/* Auth Warning */}
      {!authStatus?.connected && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between p-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Mail className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-destructive">Gmail Not Connected</h3>
                <p className="text-sm text-destructive/80">Connect your Gmail account to sync newsletters and generate digests.</p>
              </div>
            </div>
            <Button asChild variant="default" className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              <a href={authUrl?.url || "#"}>Connect Gmail</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Digests" 
          value={stats?.totalDigests} 
          icon={FileText} 
          isLoading={statsLoading} 
        />
        <StatCard 
          title="Total Stories" 
          value={stats?.totalStories} 
          icon={Activity} 
          isLoading={statsLoading} 
        />
        <StatCard 
          title="Tracked Sources" 
          value={stats?.totalSenders} 
          icon={Mail} 
          isLoading={statsLoading} 
        />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">Last Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">
                {stats?.lastSyncAt ? format(new Date(stats.lastSyncAt), "HH:mm") : "--:--"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Digest Preview */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Latest Signal
        </h2>
        
        {digestLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : latestDigest ? (
          <Card className="border-primary/20 overflow-hidden">
            <div className="bg-muted p-4 border-b border-border flex justify-between items-center">
              <div className="font-mono text-sm">
                <span className="text-muted-foreground">ID: </span>
                <span className="text-foreground font-bold">{latestDigest.id.toString().padStart(4, '0')}</span>
                <span className="mx-3 text-muted-foreground">|</span>
                <span className="text-muted-foreground">DATE: </span>
                <span className="text-foreground font-bold">{format(new Date(latestDigest.date), "MMM dd, yyyy")}</span>
              </div>
              <div className="font-mono text-xs px-2 py-1 rounded bg-primary/20 text-primary font-bold">
                {latestDigest.storyCount} STORIES
              </div>
            </div>
            <CardContent className="p-0">
              {latestDigest.sections.slice(0, 1).map((section) => (
                <div key={section.id} className="p-6">
                  <h3 className="font-bold text-lg mb-4 text-primary border-b border-primary/20 pb-2 uppercase tracking-wide">{section.title}</h3>
                  <div className="space-y-6">
                    {section.stories.slice(0, 3).map((story) => (
                      <div key={story.id} className="group cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="font-medium text-lg leading-tight group-hover:text-primary transition-colors">
                            {story.headline}
                          </h4>
                          <div className="shrink-0 bg-muted px-2 py-1 rounded font-mono text-xs">
                            {(story.relevanceScore * 100).toFixed(0)}%
                          </div>
                        </div>
                        <p className="text-muted-foreground mt-2 text-sm line-clamp-2">
                          {story.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="p-4 bg-muted/50 border-t border-border flex justify-end">
                <Button asChild variant="ghost" className="font-mono text-xs uppercase tracking-wider hover:text-primary">
                  <Link href={`/digest/${latestDigest.id}`}>
                    Read Full Briefing <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
            <FileText className="h-12 w-12 mb-4 opacity-20" />
            <p>No digests available yet.</p>
            {authStatus?.connected && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => generateMutation.mutate({ data: {} })}
                disabled={generateMutation.isPending}
              >
                Generate First Digest
              </Button>
            )}
          </Card>
        )}
      </div>

    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading }: { title: string, value?: number, icon: any, isLoading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-mono uppercase tracking-wider">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-16" />
        ) : (
          <div className="text-2xl font-bold font-mono">{value?.toLocaleString() || 0}</div>
        )}
      </CardContent>
    </Card>
  );
}
