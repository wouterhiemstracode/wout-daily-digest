import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import {
  useListSenders,
  useCreateSender,
  useUpdateSender,
  useGetGmailAuthStatus,
  useSignOut,
  getListSendersQueryKey,
  type Sender,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useBriefing } from "@/hooks/use-briefing";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { PressButton } from "@/components/press/primitives";
import { SourceAvatar } from "@/components/press/stories";
import { cn } from "@/lib/utils";

/**
 * My sources: the newsletters wout.daily found in Gmail, each with an on/off switch.
 * Adding one by hand is the fallback for senders that don't send mailing-list mail.
 */
export default function Senders() {
  const { data: senders, isLoading } = useListSenders();
  const { data: authStatus } = useGetGmailAuthStatus();
  const briefing = useBriefing();
  const signOut = useSignOut();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListSendersQueryKey() });

  const update = useUpdateSender({ mutation: { onSettled: refresh } });
  const create = useCreateSender({
    mutation: {
      onSuccess: () => {
        setEmail("");
        setAdding(false);
        refresh();
      },
      onError: () => toast({ title: "Couldn't add that sender", description: "Check the address and try again.", variant: "destructive" }),
    },
  });
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");

  const sorted = [...(senders ?? [])].sort((a, b) => Number(b.active) - Number(a.active) || b.emailCount - a.emailCount);
  const on = sorted.filter((s) => s.active).length;

  return (
    <div className="max-w-[760px] mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8">
        <div>
          <div className="t-meta">{senders ? `${on} of ${senders.length} on` : " "}</div>
          <h1 className="t-h1 text-ink mt-2">My sources</h1>
          <p className="t-standfirst mt-2 max-w-[52ch]">
            wout.daily finds the newsletters in your Gmail by itself. Switch off any you don’t want in your briefing.
          </p>
        </div>
        {authStatus?.connected && (
          <PressButton
            variant="secondary"
            className="shrink-0 self-start md:self-auto"
            onClick={briefing.checkInbox}
            disabled={briefing.busy}
            icon={<RefreshCw className={cn("h-4 w-4", briefing.checking && "animate-spin")} strokeWidth={1.75} />}
          >
            {briefing.checking ? "Checking Gmail…" : "Check Gmail now"}
          </PressButton>
        )}
      </header>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-[20px] bg-paper-raised px-6 py-12 text-center">
          <h2 className="t-h3 text-ink">No newsletters found yet</h2>
          <p className="t-body-sm mt-2 max-w-[44ch] mx-auto">
            {authStatus?.connected
              ? "Check Gmail and every newsletter from the last day shows up here."
              : "Connect Gmail and your newsletters show up here."}
          </p>
        </div>
      ) : (
        <ul className="rounded-[20px] bg-paper-raised p-2">
          {sorted.map((s) => (
            <SenderItem key={s.id} sender={s} onToggle={(active) => update.mutate({ id: s.id, data: { active } })} />
          ))}
        </ul>
      )}

      <div className="mt-6">
        {adding ? (
          <form
            className="flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) create.mutate({ data: { email: email.trim() } });
            }}
          >
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="newsletter@example.com"
              aria-label="Sender email"
              className="flex-1 h-10 px-4 rounded-full bg-paper-raised t-label text-ink placeholder:text-ink-3 outline-none focus-visible:ring-2 focus-visible:ring-sage"
            />
            <PressButton type="submit" variant="primary" disabled={create.isPending || !email.trim()}>Add</PressButton>
            <PressButton type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</PressButton>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 t-label text-ink-2 hover:text-ink">
            <Plus className="h-4 w-4" strokeWidth={1.75} /> Missing one? Add a sender by hand
          </button>
        )}
      </div>

      {authStatus?.email && (
        <p className="t-caption mt-12">
          Signed in as {authStatus.email} ·{" "}
          <button
            className="underline underline-offset-2 hover:text-ink"
            onClick={() => signOut.mutate(undefined, { onSuccess: () => window.location.assign(import.meta.env.BASE_URL) })}
          >
            Sign out
          </button>
        </p>
      )}
    </div>
  );
}

function SenderItem({ sender, onToggle }: { sender: Sender; onToggle: (active: boolean) => void }) {
  const label = sender.name ?? sender.email;
  return (
    <li className={cn("flex items-center gap-4 px-4 py-3 rounded-xl transition-opacity", !sender.active && "opacity-60")}>
      <SourceAvatar name={label} className="h-9 w-9 text-[14px]" />
      <div className="min-w-0 flex-1">
        <div className="t-label text-ink truncate">{label}</div>
        <div className="t-caption truncate">
          {sender.name ? `${sender.email} · ` : ""}
          {sender.emailCount} {sender.emailCount === 1 ? "email" : "emails"} · {sender.autoDetected ? "found in Gmail" : "added by you"}
        </div>
      </div>
      <KeepRate kept={sender.kept} skipped={sender.skipped} />
      <Switch checked={sender.active} onCheckedChange={onToggle} aria-label={`Include ${label} in my briefing`} />
    </li>
  );
}

/** How often you keep this newsletter's stories; the briefing leans on it (see lib/preferences.ts). */
function KeepRate({ kept, skipped }: { kept: number; skipped: number }) {
  const total = kept + skipped;
  if (total === 0) return null;
  const often = kept / total >= 0.6;
  return (
    <span
      className={cn("shrink-0 h-7 px-2.5 rounded-full grid place-items-center t-tag tabular-nums", often ? "bg-sage-soft text-sec-ai" : "bg-paper text-ink-2")}
      title={`You kept ${kept} and skipped ${skipped} of its stories in the last 90 days`}
    >
      kept {kept} of {total}
    </span>
  );
}
