import { useState } from "react";
import { useSearchDigests, getSearchDigestsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, ExternalLink, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Search() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  const { data: searchResults, isLoading } = useSearchDigests(
    { q: activeQuery },
    { query: { enabled: activeQuery.length > 2, queryKey: getSearchDigestsQueryKey({ q: activeQuery }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 2) {
      setActiveQuery(query.trim());
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="border-t-[3px] border-b border-double border-foreground pt-3 pb-6 mb-8">
        <h1
          className="text-4xl font-black text-primary uppercase tracking-tight mt-3"
         
        >
          Search the Archive
        </h1>
        <p className="text-sm font-sans text-muted-foreground mt-1">
          Find any story from any edition — just type a keyword.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-0 mb-10 border-2 border-foreground">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword, company, topic…"
            className="pl-11 h-12 text-base font-sans bg-background border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || query.trim().length <= 2}
          className="px-6 h-12 border-l-2 border-foreground bg-primary text-primary-foreground font-sans text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-40 whitespace-nowrap"
        >
          Search
        </button>
      </form>

      {/* Results */}
      {activeQuery && (
        <div>
          <div className="flex justify-between items-center font-sans text-[11px] uppercase tracking-widest text-muted-foreground border-b border-foreground pb-3 mb-6">
            <span>
              Results for: <span className="font-bold text-primary">{activeQuery}</span>
            </span>
            {searchResults && (
              <span>{searchResults.total} found</span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-14">
              <p
                className="text-xl italic text-muted-foreground"
               
              >
                Searching the archive…
              </p>
            </div>
          ) : searchResults && searchResults.stories.length > 0 ? (
            <div className="divide-y divide-border">
              {searchResults.stories.map((story) => (
                <article key={story.id} className="py-6 hover:bg-card transition-colors px-2 -mx-2">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/digest/${story.digestId}`}>
                      <span className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        Edition of {format(new Date(story.digestDate), "MMM d, yyyy")}
                        <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </Link>
                    <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground border border-border bg-card px-2 py-0.5">
                      {(story.relevanceScore * 100).toFixed(0)}% relevant
                    </span>
                  </div>

                  <h3
                    className="text-xl font-bold leading-tight text-foreground mt-2 mb-3"
                   
                  >
                    {story.headline}
                  </h3>

                  <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3 mb-4">
                    {story.summary}
                  </p>

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
                </article>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-dashed border-border bg-card">
              <p
                className="text-xl italic text-muted-foreground"
               
              >
                Nothing found for "{activeQuery}".
              </p>
              <p className="text-sm font-sans text-muted-foreground mt-2">
                Try a different keyword or browse past editions.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
