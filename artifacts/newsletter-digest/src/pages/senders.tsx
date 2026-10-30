import { useListSenders, useCreateSender, useDeleteSender, getListSendersQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Mail, Plus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function Senders() {
  const { data: senders, isLoading } = useListSenders();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const createMutation = useCreateSender({
    mutation: {
      onSuccess: () => {
        setNewEmail("");
        setNewName("");
        toast({ title: "Source added!", description: "We'll start tracking newsletters from this sender." });
        queryClient.invalidateQueries({ queryKey: getListSendersQueryKey() });
      },
      onError: () => {
        toast({ title: "Couldn't add sender", description: "Check the email address and try again.", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteSender({
    mutation: {
      onSuccess: () => {
        toast({ title: "Source removed", description: "We'll stop tracking that sender." });
        queryClient.invalidateQueries({ queryKey: getListSendersQueryKey() });
      }
    }
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    createMutation.mutate({ data: { email: newEmail, name: newName || undefined } });
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">

      {/* Header */}
      <div className="border-t-[3px] border-b border-double border-foreground pt-3 pb-6 mb-8">
        <h1
          className="text-4xl font-black text-primary uppercase tracking-tight mt-3"
         
        >
          My Sources
        </h1>
        <p className="text-sm font-sans text-muted-foreground mt-1">
          Add the newsletters you love — we'll do the reading for you.
        </p>
      </div>

      {/* Add form */}
      <div className="bg-card border border-border p-6 mb-8">
        <h2
          className="text-lg font-bold text-foreground mb-4"
         
        >
          Add a Newsletter Source
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground">
              Sender Email *
            </label>
            <Input
              type="email"
              placeholder="newsletter@company.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="font-sans bg-background border-border rounded-none h-10"
            />
          </div>
          <div className="w-full sm:w-48 space-y-1.5">
            <label className="text-[10px] font-sans font-bold uppercase tracking-widest text-muted-foreground">
              Display Name
            </label>
            <Input
              type="text"
              placeholder="e.g. The Batch"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="font-sans bg-background border-border rounded-none h-10"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !newEmail}
            className="h-10 px-5 border-2 border-primary bg-primary text-primary-foreground font-sans text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            {createMutation.isPending ? "Adding…" : "Add Source"}
          </button>
        </form>
      </div>

      {/* Sources list */}
      <div>
        <h2 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-3">
          <span>Your Active Sources</span>
          <span className="flex-1 h-px bg-border"></span>
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : senders && senders.length > 0 ? (
          <div className="divide-y divide-border border-t border-b border-border">
            {senders.map((sender) => (
              <div key={sender.id} className="flex items-center justify-between py-4 px-2 hover:bg-card transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 border border-border bg-card flex items-center justify-center shrink-0 group-hover:border-primary transition-colors">
                    <Mail className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">
                      {sender.name || sender.email}
                    </h3>
                    <div className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                      <span className="truncate max-w-[180px] sm:max-w-none">{sender.email}</span>
                      {sender.emailCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{sender.emailCount} emails processed</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate({ id: sender.id })}
                  disabled={deleteMutation.isPending}
                  className="p-2 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
                  aria-label="Remove source"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-14 border border-dashed border-border bg-card">
            <p
              className="text-xl italic text-muted-foreground mb-2"
             
            >
              No sources yet — it's quiet in here.
            </p>
            <p className="text-sm font-sans text-muted-foreground">
              Add a newsletter email above to start building your daily briefing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
