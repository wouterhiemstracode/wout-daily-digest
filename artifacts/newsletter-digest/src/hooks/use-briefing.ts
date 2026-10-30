import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateDigest,
  useSyncEmails,
  getGetLatestDigestQueryKey,
  getListSendersQueryKey,
  getListDigestsQueryKey,
  getGetStatsQueryKey,
  type SyncResult,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function foundLine(r: SyncResult) {
  if (r.discovered > 0) return `Found ${r.discovered} new ${r.discovered === 1 ? "newsletter" : "newsletters"} in Gmail.`;
  return `${r.fetched} new ${r.fetched === 1 ? "email" : "emails"} from ${r.senders} newsletters.`;
}

/** How the last "New briefing" ended, when Today should say more than a toast. */
export type BriefingOutcome = "gmail-error" | "quiet" | null;

/**
 * The one action: check Gmail for newsletters, then write today's briefing.
 * With nothing new since the last briefing it stops there (no Claude call, no cost).
 * `checkInbox` runs only the first half (My sources uses it).
 */
export function useBriefing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sync = useSyncEmails();
  const generate = useGenerateDigest();
  const [outcome, setOutcome] = React.useState<BriefingOutcome>(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListSendersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLatestDigestQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListDigestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
  };

  const syncInbox = async () => {
    try {
      return await sync.mutateAsync();
    } catch {
      return null;
    } finally {
      refresh();
    }
  };

  const checkInbox = async () => {
    const r = await syncInbox();
    if (r) toast({ title: "Inbox checked", description: foundLine(r) });
    else toast({ title: "Couldn't reach Gmail", description: "Try again in a moment.", variant: "destructive" });
    return r;
  };

  /** `hasBriefing`: whether there is already a briefing to keep when nothing new arrived. */
  const make = async ({ hasBriefing = false }: { hasBriefing?: boolean } = {}) => {
    setOutcome(null);
    const r = await syncInbox();
    if (!r) {
      setOutcome("gmail-error");
      return;
    }
    if (r.fetched === 0 && hasBriefing) {
      setOutcome("quiet");
      return;
    }
    try {
      await generate.mutateAsync({ data: {} });
      toast({ title: "Your briefing is ready", description: foundLine(r) });
    } catch {
      toast({ title: "Couldn't write a briefing", description: "Try again in a moment.", variant: "destructive" });
    } finally {
      refresh();
    }
  };

  const busy = sync.isPending || generate.isPending;
  const label = sync.isPending ? "Checking Gmail…" : generate.isPending ? "Writing…" : null;
  return { make, checkInbox, busy, checking: sync.isPending, label, outcome, dismiss: () => setOutcome(null) };
}
