import { Link, useLocation } from "wouter";
import { Archive, Users, Search, BookOpen, LogOut } from "lucide-react";
import { useGetGmailAuthStatus, useDisconnectGmail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: authStatus } = useGetGmailAuthStatus();
  const disconnectMutation = useDisconnectGmail();

  const navItems = [
    { href: "/", label: "Today's Briefing", icon: BookOpen },
    { href: "/archive", label: "Past Editions", icon: Archive },
    { href: "/senders", label: "My Sources", icon: Users },
    { href: "/search", label: "Search", icon: Search },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-60 border-r-2 border-foreground bg-sidebar flex flex-col hidden md:flex shrink-0">

        {/* Masthead */}
        <div className="px-5 py-6 border-b-[3px] border-double border-foreground text-center">
          <div className="text-2xl mb-1">☕</div>
          <div
            className="text-xl font-black text-primary leading-tight tracking-tight uppercase"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Wout's<br />Daily Digest
          </div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 font-sans">
            Morning Edition
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          <div className="text-[9px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3 px-3">
            Navigate
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 text-sm font-sans transition-colors cursor-pointer border-l-2 ${
                  isActive
                    ? "border-primary bg-primary/8 text-primary font-semibold"
                    : "border-transparent text-sidebar-foreground hover:border-muted-foreground/40 hover:bg-accent"
                }`}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="px-4 py-4 border-t border-border">
          <div className="text-[9px] font-sans font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
            Gmail Status
          </div>
          {authStatus?.connected ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground font-sans">
                <div className="h-1.5 w-1.5 rounded-full bg-green-600 shrink-0"></div>
                <span className="truncate text-[11px]">{authStatus.email}</span>
              </div>
              <button
                onClick={() => disconnectMutation.mutate(undefined, { onSuccess: () => window.location.reload() })}
                disabled={disconnectMutation.isPending}
                className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-destructive font-sans transition-colors disabled:opacity-50 w-full"
              >
                <LogOut className="h-3 w-3" />
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans">
              <div className="h-1.5 w-1.5 rounded-full bg-destructive shrink-0"></div>
              <span>Not connected</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile header */}
        <header className="md:hidden border-b-2 border-foreground bg-sidebar px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">☕</span>
            <span
              className="font-black text-primary text-base uppercase tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Wout's Daily Digest
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-5xl mx-auto w-full px-4 py-8 md:px-10 md:py-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
