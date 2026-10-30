import * as React from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Newspaper, Archive, Users, Search, Moon, Sun, LogOut } from "lucide-react";
import { useGetGmailAuthStatus, useSignOut, useGetLatestDigest } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Masthead } from "./primitives";
import { useNightEdition } from "./croc";
import { Dragonfly, LilyPad, PEEK_LOOKS, Reeds, Wading, Water } from "./habitat";

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
  const night = useNightEdition();

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
      {footer && <div className="px-3 pb-1">{footer}</div>}
      {/* Peek's pond: the inbox card floats in it, Peek keeps an eye on it from behind. */}
      <div className="relative overflow-hidden px-3 pb-3 pt-9">
        <Water tone="side" className="absolute inset-x-0 top-[18px] bottom-0" />
        <Reeds tone="side" rushes={1} className="absolute -left-3 bottom-14 h-[64px] w-[40px]" />
        <Reeds tone="side" flip rushes={0} className="absolute -right-2 bottom-14 h-[56px] w-[34px]" />
        <LilyPad tone="side" flower className="absolute left-[58px] top-[20px] w-9" />
        <Wading look={night ? PEEK_LOOKS.dozer : PEEK_LOOKS.lurker} className="absolute right-[40px] top-[-8px] w-[76px]" />
        <div className="relative rounded-xl bg-side-active px-4 py-3">
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
    <>
    {/* The tab bar floats on Peek's pond; Peek peeks over its top edge. */}
    <div aria-hidden className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 h-[58px]">
      <Water className="absolute inset-0" />
      <Reeds rushes={1} className="absolute -left-2 bottom-5 h-[74px] w-[34px]" />
      <Reeds flip rushes={0} className="absolute -right-2 bottom-5 h-[64px] w-[30px]" />
    </div>
    <Wading look={{ ...PEEK_LOOKS.lurker, tune: { ...PEEK_LOOKS.lurker.tune, depth: 0 } }} className="md:hidden fixed bottom-[74px] right-[78px] z-40 w-[64px]" />
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
    </>
  );
}

/** The edge of Peek's pond along the foot of the padded screens, behind the content. */
function PondEdge() {
  return (
    <div aria-hidden className="hidden md:block pointer-events-none sticky bottom-0 -mt-[150px] h-[150px]">
      <Water className="absolute inset-x-0 bottom-0 h-[54px]" />
      <Reeds className="absolute right-6 bottom-6 h-[150px] w-[80px]" />
      <Reeds flip rushes={1} className="absolute right-[88px] bottom-7 h-[96px] w-[54px]" />
      <Reeds rushes={0} className="absolute left-4 bottom-6 h-[84px] w-[46px]" />
      <LilyPad flower className="absolute left-[18%] bottom-[14px] w-14" />
      <LilyPad flip className="absolute right-[24%] bottom-[22px] w-10" />
      <Dragonfly className="absolute right-[150px] bottom-[96px] w-8" />
    </div>
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
        {padded ? (
          <div className="min-h-full flex flex-col">
            <div className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 pt-2 pb-28 md:px-12 md:py-10 md:pb-40">{children}</div>
            <PondEdge />
          </div>
        ) : children}
      </main>
      <PhoneTabBar />
    </div>
  );
}
