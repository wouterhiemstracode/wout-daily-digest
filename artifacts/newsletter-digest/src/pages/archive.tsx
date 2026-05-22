import { Link } from "wouter";
import { useListDigests } from "@workspace/api-client-react";
import { format } from "date-fns";
import { FileText, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Archive() {
  const { data: digests, isLoading } = useListDigests();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Archive</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Past intelligence briefings.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : digests && digests.length > 0 ? (
        <div className="space-y-4">
          {digests.map((digest) => (
            <Link key={digest.id} href={`/digest/${digest.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-card">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FileText className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                        Briefing for {format(new Date(digest.date), "MMMM do, yyyy")}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 font-mono text-xs text-muted-foreground">
                        <span>{digest.storyCount} STORIES</span>
                        <span>|</span>
                        <span>STATUS: {digest.status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground font-mono bg-card border border-border rounded-xl">
          No past briefings found.
        </div>
      )}
    </div>
  );
}
