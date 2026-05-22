import { useState } from "react";
import { useSearchDigests } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Search() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  
  const { data: searchResults, isLoading } = useSearchDigests(
    { q: activeQuery }, 
    { query: { enabled: activeQuery.length > 2 } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 2) {
      setActiveQuery(query.trim());
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Signal Search</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Full-text search across all intelligence briefings.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, companies, trends..."
            className="pl-10 h-12 text-lg font-mono bg-card border-primary/20 focus-visible:ring-primary"
          />
        </div>
        <Button type="submit" disabled={isLoading || query.trim().length <= 2} className="h-12 px-8 font-mono text-xs uppercase tracking-wider">
          Search
        </Button>
      </form>

      {activeQuery && (
        <div className="space-y-6">
          <div className="font-mono text-sm text-muted-foreground border-b border-border pb-4 flex justify-between">
            <span>RESULTS FOR: <span className="text-primary font-bold">{activeQuery}</span></span>
            {searchResults && <span>{searchResults.total} FOUND</span>}
          </div>

          {isLoading ? (
            <div className="text-center py-12 font-mono text-muted-foreground animate-pulse">
              Searching databases...
            </div>
          ) : searchResults && searchResults.stories.length > 0 ? (
            <div className="space-y-6">
              {searchResults.stories.map((story) => (
                <div key={story.id} className="bg-card border border-border p-6 rounded-xl hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                      <Link href={`/digest/${story.digestId}`} className="hover:text-primary flex items-center gap-1">
                        DIGEST {format(new Date(story.digestDate), "MMM dd, yyyy")}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="font-mono text-xs font-bold text-primary/80 bg-primary/10 px-2 py-1 rounded">
                      {(story.relevanceScore * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold leading-tight text-foreground mt-2 mb-3">
                    {story.headline}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm line-clamp-3">
                    {story.summary}
                  </p>
                  
                  {story.sourceUrl && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <Button asChild variant="link" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary px-0">
                        <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-2" />
                          {story.sourceName || "Source"}
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground font-mono bg-card border border-border rounded-xl">
              No signals found matching your query.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
