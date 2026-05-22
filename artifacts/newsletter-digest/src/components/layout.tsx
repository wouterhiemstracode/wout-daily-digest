import { Link, useLocation } from "wouter";
import { 
  BarChart, 
  BookOpen, 
  Archive, 
  Users, 
  Search, 
  Terminal,
  LogOut,
  Mail
} from "lucide-react";
import { useGetGmailAuthStatus, useDisconnectGmail } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: authStatus } = useGetGmailAuthStatus();
  const disconnectMutation = useDisconnectGmail();

  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart },
    { href: "/archive", label: "Archive", icon: Archive },
    { href: "/senders", label: "Sources", icon: Users },
    { href: "/search", label: "Search", icon: Search },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="font-mono font-bold tracking-tight text-lg">Briefing</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-mono text-muted-foreground mb-4 px-2 uppercase tracking-wider">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs font-mono text-muted-foreground mb-3 px-2 uppercase tracking-wider">System Status</div>
          {authStatus?.connected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2 text-sm text-foreground">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="truncate">{authStatus.email}</span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start text-muted-foreground border-border hover:bg-destructive/10 hover:text-destructive"
                onClick={() => disconnectMutation.mutate(undefined, { onSuccess: () => window.location.reload() })}
                disabled={disconnectMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span>Disconnected</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="md:hidden border-b border-border bg-sidebar p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <span className="font-mono font-bold tracking-tight text-lg">Briefing</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
