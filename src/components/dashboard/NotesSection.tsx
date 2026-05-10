import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Kind = "announcement" | "funny" | "practical";
type Profile = { id: string; display_name: string; emoji: string };

const KINDS: { id: Kind | "all"; label: string; emoji: string }[] = [
  { id: "all", label: "Alles", emoji: "📚" },
  { id: "announcement", label: "Mededelingen", emoji: "📌" },
  { id: "funny", label: "Grappig", emoji: "😂" },
  { id: "practical", label: "Praktisch", emoji: "🔧" },
];

export function NotesSection({ family }: { family: Profile[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<Kind>("announcement");

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const { data } = await supabase.from("notes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Geef het een titel");
      const { error } = await supabase.from("notes").insert({
        title: title.trim(), content: content.trim() || null, kind, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setContent(""); qc.invalidateQueries({ queryKey: ["notes"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notes").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });

  const findP = (id: string) => family.find(f => f.id === id);
  const filtered = filter === "all" ? notes : notes.filter((n: any) => n.kind === filter);

  const colorFor = (k: Kind) => k === "funny" ? "bg-accent/50" : k === "practical" ? "bg-sage/30" : "bg-warm/30";

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">📌 Notities & berichten</h1>

      <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {KINDS.filter(k => k.id !== "all").map(k => (
              <button key={k.id} onClick={() => setKind(k.id as Kind)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold ${kind === k.id ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                {k.emoji} {k.label.replace(/en$/, "")}
              </button>
            ))}
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Titel (bijv. wifi-wachtwoord, of: papa's zin van de week)"
            className="w-full rounded-xl border bg-background px-4 py-2.5" />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={1000} rows={3}
            placeholder="Schrijf hier..." className="w-full rounded-xl border bg-background px-4 py-2.5" />
          <button onClick={() => add.mutate()} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
            Plakken op het prikbord
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map(k => (
          <button key={k.id} onClick={() => setFilter(k.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filter === k.id ? "bg-foreground text-background" : "bg-card border"}`}>
            {k.emoji} {k.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground">Niets te lezen hier.</p>}
        {filtered.map((n: any) => {
          const p = findP(n.created_by);
          return (
            <div key={n.id} className={`group relative rounded-2xl ${colorFor(n.kind)} p-5 shadow-[var(--shadow-soft)] transition hover:-rotate-1`}>
              <button onClick={() => remove.mutate(n.id)}
                className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">✕</button>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-70">
                {KINDS.find(k => k.id === n.kind)?.emoji} {KINDS.find(k => k.id === n.kind)?.label}
              </div>
              <h3 className="mt-1 text-xl">{n.title}</h3>
              {n.content && <p className="mt-2 whitespace-pre-wrap text-sm">{n.content}</p>}
              <div className="mt-3 text-xs opacity-70">
                {p && <>{p.emoji} {p.display_name} · </>}
                {new Date(n.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
