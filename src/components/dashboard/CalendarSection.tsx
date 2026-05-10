import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function CalendarSection() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const { data: events = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await supabase.from("calendar_events").select("*").order("event_date");
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !date) throw new Error("Vul titel en datum in");
      const { error } = await supabase.from("calendar_events").insert({
        title: title.trim(), event_date: new Date(date).toISOString(),
        location: location.trim() || null, created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); setDate(""); setLocation(""); qc.invalidateQueries({ queryKey: ["events"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("calendar_events").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  const upcoming = events.filter((e: any) => new Date(e.event_date) >= new Date(Date.now() - 86400000));
  const past = events.filter((e: any) => new Date(e.event_date) < new Date(Date.now() - 86400000));

  return (
    <div className="space-y-6">
      <h1 className="text-4xl">📅 Familie-agenda</h1>

      <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Bijv. tandarts Lucas" className="rounded-xl border bg-background px-4 py-2.5" />
          <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border bg-background px-3 py-2.5" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80}
            placeholder="Locatie (optioneel)" className="rounded-xl border bg-background px-4 py-2.5" />
          <button onClick={() => add.mutate()} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
            Toevoegen
          </button>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-2xl">Komt eraan</h2>
        {upcoming.length === 0 && <p className="text-muted-foreground">Niks gepland.</p>}
        <ul className="space-y-2">
          {upcoming.map((e: any) => <EventCard key={e.id} e={e} onDelete={() => remove.mutate(e.id)} />)}
        </ul>
      </div>

      {past.length > 0 && (
        <div>
          <h2 className="mb-3 text-2xl text-muted-foreground">Geweest</h2>
          <ul className="space-y-2">
            {past.slice(0, 5).map((e: any) => <EventCard key={e.id} e={e} onDelete={() => remove.mutate(e.id)} muted />)}
          </ul>
        </div>
      )}
    </div>
  );
}

function EventCard({ e, onDelete, muted }: { e: any; onDelete: () => void; muted?: boolean }) {
  const d = new Date(e.event_date);
  return (
    <li className={`flex gap-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] ${muted ? "opacity-60" : ""}`}>
      <div className="flex w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-accent/40 p-2">
        <div className="text-xs font-semibold uppercase">{d.toLocaleString("nl-NL", { month: "short" })}</div>
        <div className="text-2xl font-bold">{d.getDate()}</div>
        <div className="text-xs">{d.toLocaleString("nl-NL", { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
      <div className="flex-1">
        <div className="font-semibold">{e.title}</div>
        {e.location && <div className="text-sm text-muted-foreground">📍 {e.location}</div>}
        {e.description && <div className="mt-1 text-sm">{e.description}</div>}
      </div>
      <button onClick={onDelete} className="text-muted-foreground hover:text-destructive">✕</button>
    </li>
  );
}
