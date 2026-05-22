import { useListSenders, useCreateSender, useDeleteSender, getListSendersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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
        toast({ title: "Source added", description: "Now tracking newsletters from this sender." });
        queryClient.invalidateQueries({ queryKey: getListSendersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to add", description: "Could not add sender. Check email format.", variant: "destructive" });
      }
    }
  });

  const deleteMutation = useDeleteSender({
    mutation: {
      onSuccess: () => {
        toast({ title: "Source removed", description: "Stopped tracking this sender." });
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tracked Sources</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">Manage newsletter senders you want to monitor.</p>
      </div>

      <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
        <h2 className="font-bold text-lg mb-4">Add New Source</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
          <div className="grid w-full sm:w-1/2 gap-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Email Address *</label>
            <Input 
              type="email" 
              placeholder="newsletter@company.com" 
              value={newEmail} 
              onChange={(e) => setNewEmail(e.target.value)} 
              required 
              className="font-mono bg-background"
            />
          </div>
          <div className="grid w-full sm:w-1/3 gap-2">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Name (Optional)</label>
            <Input 
              type="text" 
              placeholder="Tech Company" 
              value={newName} 
              onChange={(e) => setNewName(e.target.value)} 
              className="font-mono bg-background"
            />
          </div>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || !newEmail}
            className="w-full sm:w-auto mt-6 sm:mt-0 font-mono text-xs uppercase tracking-wider h-10"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sender
          </Button>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="font-mono text-sm text-muted-foreground uppercase tracking-wider">Active Sources</h2>
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : senders && senders.length > 0 ? (
          <div className="space-y-3">
            {senders.map((sender) => (
              <div key={sender.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold">{sender.name || sender.email}</h3>
                    <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground mt-1">
                      <span>{sender.email}</span>
                      <span className="hidden sm:inline">|</span>
                      <span className="hidden sm:inline">{sender.emailCount} EMAILS PROCESSED</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deleteMutation.mutate({ id: sender.id })}
                  disabled={deleteMutation.isPending}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground font-mono bg-card border border-border rounded-xl">
            No tracked senders. Add one above to begin.
          </div>
        )}
      </div>
    </div>
  );
}
