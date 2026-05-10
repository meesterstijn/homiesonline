import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Profile = { id: string; display_name: string; emoji: string };

export function TasksSection({ family }: { family: Profile[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState<string>("");
  const [due, setDue] = useState("");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").order("done").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Geef de taak een naam");
      const { error } = await supabase.from("tasks").insert({
        title: title.trim(), assigned_to: assignee || null, due_date: due || null, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setAssignee(""); setDue(""); qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("tasks").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const findP = (id: string | null) => family.find(f => f.id === id);

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">✅ Klusjes & taken</h1>

      <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Wat moet er gebeuren?" className="rounded-xl border bg-background px-4 py-2.5 outline-none ring-primary focus:ring-2" />
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
            className="rounded-xl border bg-background px-3 py-2.5">
            <option value="">Iedereen</option>
            {family.map(f => <option key={f.id} value={f.id}>{f.emoji} {f.display_name}</option>)}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)}
            className="rounded-xl border bg-background px-3 py-2.5" />
          <button onClick={() => add.mutate()} disabled={add.isPending}
            className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
            Toevoegen
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {tasks.length === 0 && <p className="text-center text-muted-foreground">Geen klusjes — geniet ervan zolang het duurt 😉</p>}
        {tasks.map((t: any) => {
          const p = findP(t.assigned_to);
          return (
            <li key={t.id} className={`flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] transition ${t.done ? "opacity-60" : ""}`}>
              <button onClick={() => toggle.mutate({ id: t.id, done: !t.done })}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${t.done ? "border-sage bg-sage text-white" : "border-primary/40"}`}>
                {t.done && "✓"}
              </button>
              <div className="flex-1">
                <div className={`font-semibold ${t.done ? "line-through" : ""}`}>{t.title}</div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {p ? <span>{p.emoji} {p.display_name}</span> : <span>Iedereen</span>}
                  {t.due_date && <span>· {new Date(t.due_date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })}</span>}
                </div>
              </div>
              <button onClick={() => remove.mutate(t.id)} className="text-muted-foreground hover:text-destructive">✕</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
