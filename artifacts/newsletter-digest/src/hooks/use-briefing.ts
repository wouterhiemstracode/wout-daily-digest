import { useQueryClient } from "@tanstack/react-query";
import {
  useGenerateDigest,
  useSyncEmails,
  getGetLatestDigestQueryKey,
  getListSendersQueryKey,
  getListDigestsQueryKey,
  type SyncResult,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

function foundLine(r: SyncResult) {
  if (r.discovered > 0) return `Found ${r.discovered} new ${r.discovered === 1 ? "newsletter" : "newsletters"} in Gmail.`;
  return `${r.fetched} new ${r.fetched === 1 ? "email" : "emails"} from ${r.senders} newsletters.`;
}

/**
 * The one action: check Gmail for newsletters, then write today's briefing.
 * `checkInbox` runs only the first half (My sources uses it).
 */
export function useBriefing() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sync = useSyncEmails();
  const generate = useGenerateDigest();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: getListSendersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetLatestDigestQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListDigestsQueryKey() });
  };

  const checkInbox = async () => {
    try {
      const r = await sync.mutateAsync();
      toast({ title: "Inbox checked", description: foundLine(r) });
      return r;
    } catch {
      toast({ title: "Couldn't reach Gmail", description: "Try again in a moment.", variant: "destructive" });
      return null;
    } finally {
      refresh();
    }
  };

  const make = async () => {
    const r = await checkInbox();
    if (!r) return;
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
  return { make, checkInbox, busy, checking: sync.isPending, label };
}
