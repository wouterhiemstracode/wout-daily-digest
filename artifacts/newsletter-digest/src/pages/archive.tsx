import { Link } from "wouter";
import { useListDigests } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Archive() {
  const { data: digests, isLoading } = useListDigests();

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="border-t-[3px] border-b border-double border-foreground pt-3 pb-6 mb-8">
        <h1
          className="text-4xl font-black text-primary uppercase tracking-tight mt-3"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Past Editions
        </h1>
        <p className="text-sm font-sans text-muted-foreground mt-1">
          Every morning briefing, right where you left it.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : digests && digests.length > 0 ? (
        <div className="divide-y divide-border">
          {digests.map((digest) => (
            <Link key={digest.id} href={`/digest/${digest.id}`}>
              <div className="py-5 flex items-center justify-between group cursor-pointer hover:bg-card transition-colors px-2 -mx-2">
                <div>
                  <h3
                    className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Morning Edition — {format(new Date(digest.date), "MMMM d, yyyy")}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 font-sans text-[11px] uppercase tracking-wider text-muted-foreground">
                    <span>{digest.storyCount} stories</span>
                    <span>·</span>
                    <span className="capitalize">{digest.status}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transform group-hover:translate-x-1 transition-all shrink-0 ml-4" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-border bg-card">
          <p
            className="text-xl italic text-muted-foreground mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            The archive is empty — no editions yet.
          </p>
          <p className="text-sm font-sans text-muted-foreground">
            Head to the dashboard to generate your first briefing.
          </p>
        </div>
      )}
    </div>
  );
}
