import * as React from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Newspaper, Archive, Users, Search, Moon, Sun, LogOut } from "lucide-react";
import { useGetGmailAuthStatus, useSignOut, useGetLatestDigest } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Masthead } from "./primitives";

export const PRESS_NAV = [
  { href: "/", label: "Today", icon: Newspaper },
  { href: "/archive", label: "Past editions", icon: Archive },
  { href: "/senders", label: "My sources", icon: Users },
  { href: "/search", label: "Search", icon: Search },
];

export function isNavActive(href: string, location: string) {
  if (href === "/") return location === "/" || location.startsWith("/story");
  return location.startsWith(href);
}

export function useEditionLine() {
  const { data: digest } = useGetLatestDigest();
  if (!digest) return undefined;
  return `Edition ${digest.id} · ${format(new Date(digest.date + "T12:00:00"), "EEEE d MMM")}`;
}

/* ── Night edition (dark mode) ──────────────────────────── */
const EDITION_KEY = "wout.daily:edition";

function readStoredEdition() {
  try {
    return localStorage.getItem(EDITION_KEY);
  } catch {
    return null;
  }
}

/** Day or night edition: `?edition=night|day` wins, then the reader's last choice. */
export function useEdition() {
  const [night, setNight] = React.useState(() => {
    if (typeof window === "undefined") return false;
    const q = new URLSearchParams(window.location.search).get("edition");
    if (q) return q === "night";
    return readStoredEdition() === "night";
  });
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", night);
  }, [night]);
  const choose = React.useCallback((v: boolean) => {
    try {
      localStorage.setItem(EDITION_KEY, v ? "night" : "day");
    } catch {
      // private mode: the choice lasts for this visit
    }
    setNight(v);
  }, []);
  return [night, choose] as const;
}

export function NightToggle({ night, onChange }: { night: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!night)}
      className="w-full flex items-center justify-between gap-3 px-3 h-10 rounded-[10px] text-side-ink-2 hover:bg-side-active hover:text-side-ink transition-colors"
      aria-pressed={night}
    >
      <span className="flex items-center gap-3 t-label">
        {night ? <Sun className="h-4 w-4" strokeWidth={1.75} /> : <Moon className="h-4 w-4" strokeWidth={1.75} />}
        {night ? "Day edition" : "Night edition"}
      </span>
      <span className={cn("relative h-5 w-9 rounded-full transition-colors", night ? "bg-sage" : "bg-side-rule")}>
        <span className={cn("absolute top-[3px] h-3.5 w-3.5 rounded-full transition-all bg-side-ink", night ? "left-[19px]" : "left-[3px]")} />
      </span>
    </button>
  );
}

/* ── Sidebar nav ────────────────────────────────────────── */
export function PressSidebar({ footer, className }: { footer?: React.ReactNode; className?: string }) {
  const [location] = useLocation();
  const edition = useEditionLine();
  const { data: authStatus } = useGetGmailAuthStatus();
  const signOut = useSignOut();

  return (
    <aside className={cn("w-64 shrink-0 bg-side text-side-ink flex flex-col", className)}>
      <div className="px-6 pt-7 pb-6">
        <Masthead tone="side" edition={edition} />
      </div>
      <nav className="flex-1 px-3 pt-4 space-y-0.5" aria-label="Main">
        {PRESS_NAV.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(item.href, location);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 h-10 rounded-[10px] t-label cursor-pointer transition-colors",
                  active ? "bg-sage text-sage-ink" : "text-side-ink-2 hover:bg-side-active hover:text-side-ink",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      {footer && <div className="px-3 pb-3">{footer}</div>}
      <div className="mx-3 mb-3 rounded-xl bg-side-active px-4 py-3">
        <div className="font-sans text-[12px] text-side-ink-2 mb-1.5">Inbox</div>
        {authStatus?.connected ? (
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="h-1.5 w-1.5 rounded-full bg-positive shrink-0" />
              <span className="font-sans text-[13px] text-side-ink truncate">{authStatus.email}</span>
            </span>
            <button
              onClick={() => signOut.mutate(undefined, { onSuccess: () => window.location.assign(import.meta.env.BASE_URL) })}
              className="text-side-ink-2 hover:text-side-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <span className="flex items-center gap-2 font-sans text-[13px] text-side-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" /> Gmail not connected
          </span>
        )}
      </div>
    </aside>
  );
}

/**
 * App shell. Edition screens (Today, reading view) lay themselves out;
 * the older screens get the padded column they were written for.
 */
/* ── Phone tab bar (< 768px) ────────────────────────────── */
export function PhoneTabBar() {
  const [location] = useLocation();
  return (
    <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-2xl bg-side text-side-ink-2 grid grid-cols-4 p-1.5" style={{ boxShadow: "var(--overlay-shadow)" }} aria-label="Main">
      {PRESS_NAV.map((item) => {
        const Icon = item.icon;
        const active = isNavActive(item.href, location);
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={cn("flex flex-col items-center justify-center gap-1 h-14 rounded-xl cursor-pointer transition-colors", active ? "bg-sage text-sage-ink" : "active:bg-side-active")}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="font-sans text-[11px] font-medium leading-none">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export function PressLayout({ children, padded }: { children: React.ReactNode; padded?: boolean }) {
  const [night, setNight] = useEdition();
  return (
    <div className="flex h-dvh w-full bg-paper text-ink overflow-hidden">
      <PressSidebar className="hidden md:flex" footer={<NightToggle night={night} onChange={setNight} />} />
      <main className="flex-1 h-dvh overflow-y-auto">
        <header className="md:hidden h-[60px] px-4 flex items-center justify-between">
          <Masthead />
          <button
            onClick={() => setNight(!night)}
            className="h-10 w-10 -mr-2 rounded-full grid place-items-center text-ink-2 active:bg-paper-sunk"
            aria-label={night ? "Day edition" : "Night edition"}
            aria-pressed={night}
          >
            {night ? <Sun className="h-5 w-5" strokeWidth={1.75} /> : <Moon className="h-5 w-5" strokeWidth={1.75} />}
          </button>
        </header>
        {padded ? <div className="max-w-5xl mx-auto w-full px-4 pt-2 pb-28 md:px-12 md:py-10">{children}</div> : children}
      </main>
      <PhoneTabBar />
    </div>
  );
}
