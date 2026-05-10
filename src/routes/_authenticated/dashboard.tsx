import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TasksSection } from "@/components/dashboard/TasksSection";
import { ShoppingSection } from "@/components/dashboard/ShoppingSection";
import { CalendarSection } from "@/components/dashboard/CalendarSection";
import { NotesSection } from "@/components/dashboard/NotesSection";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TABS = [
  { id: "home", label: "Thuis", emoji: "🏡" },
  { id: "tasks", label: "Taken", emoji: "✅" },
  { id: "shopping", label: "Boodschappen", emoji: "🛒" },
  { id: "calendar", label: "Agenda", emoji: "📅" },
  { id: "notes", label: "Notities", emoji: "📌" },
] as const;

type TabId = typeof TABS[number]["id"];

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("home");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: family = [] } = useQuery({
    queryKey: ["family"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at");
      return data ?? [];
    },
  });

  const logout = async () => {
    await supabase.auth.signOut();
    qc.clear();
    toast.success("Tot snel 👋");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏡</span>
            <span className="font-display text-lg font-semibold">Homiesonline</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5">
              <span className="text-lg">{profile?.emoji ?? "🏡"}</span>
              <span className="text-sm font-semibold">{profile?.display_name ?? "..."}</span>
            </div>
            <button onClick={logout} className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-muted">
              Uitloggen
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-primary text-primary-foreground shadow-[var(--shadow-cozy)]" : "bg-card hover:bg-muted"
              }`}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {tab === "home" && <HomeView profileName={profile?.display_name ?? "homie"} family={family} setTab={setTab} />}
        {tab === "tasks" && <TasksSection family={family} />}
        {tab === "shopping" && <ShoppingSection family={family} />}
        {tab === "calendar" && <CalendarSection />}
        {tab === "notes" && <NotesSection family={family} />}
      </main>
    </div>
  );
}

function HomeView({ profileName, family, setTab }: { profileName: string; family: any[]; setTab: (t: TabId) => void }) {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [tasks, shopping, events, notes] = await Promise.all([
        supabase.from("tasks").select("id,done", { count: "exact" }),
        supabase.from("shopping_items").select("id,in_cart", { count: "exact" }),
        supabase.from("calendar_events").select("id,event_date").gte("event_date", new Date().toISOString()).order("event_date").limit(3),
        supabase.from("notes").select("id,title,kind,created_at").order("created_at", { ascending: false }).limit(3),
      ]);
      return {
        openTasks: tasks.data?.filter(t => !t.done).length ?? 0,
        shopping: shopping.data?.filter(s => !s.in_cart).length ?? 0,
        events: events.data ?? [],
        notes: notes.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-8 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
        <p className="text-sm font-semibold uppercase tracking-wider text-warm-foreground/70">Welkom thuis</p>
        <h1 className="mt-1 text-4xl text-warm-foreground md:text-5xl">Hoi {profileName} 👋</h1>
        <p className="mt-2 text-warm-foreground/80">Hier is wat er speelt in jullie huis.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard emoji="✅" label="Open klusjes" value={stats?.openTasks ?? 0} onClick={() => setTab("tasks")} />
        <StatCard emoji="🛒" label="Te kopen" value={stats?.shopping ?? 0} onClick={() => setTab("shopping")} />
        <StatCard emoji="📅" label="Komende afspraken" value={stats?.events.length ?? 0} onClick={() => setTab("calendar")} />
        <StatCard emoji="👨‍👩‍👧" label="Familieleden" value={family.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-2xl">📅 Binnenkort</h2>
          {stats?.events.length === 0 && <p className="text-sm text-muted-foreground">Nog niks in de agenda.</p>}
          <ul className="space-y-2">
            {stats?.events.map((e: any) => (
              <li key={e.id} className="rounded-xl bg-secondary px-4 py-3">
                <div className="text-xs text-muted-foreground">{new Date(e.event_date).toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" })}</div>
                <div className="font-semibold">{e.title}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
          <h2 className="mb-4 text-2xl">📌 Laatste notities</h2>
          {stats?.notes.length === 0 && <p className="text-sm text-muted-foreground">Schrijf de eerste!</p>}
          <ul className="space-y-2">
            {stats?.notes.map((n: any) => (
              <li key={n.id} className="rounded-xl bg-secondary px-4 py-3">
                <div className="text-xs text-muted-foreground">{kindLabel(n.kind)}</div>
                <div className="font-semibold">{n.title}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-4 text-2xl">👨‍👩‍👧 De homies</h2>
        <div className="flex flex-wrap gap-3">
          {family.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2">
              <span className="text-2xl">{f.emoji}</span>
              <span className="font-semibold">{f.display_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ emoji, label, value, onClick }: { emoji: string; label: string; value: number; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="rounded-3xl border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition enabled:hover:-translate-y-1 enabled:hover:border-primary/40">
      <div className="text-3xl">{emoji}</div>
      <div className="mt-2 text-3xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </button>
  );
}

function kindLabel(k: string) {
  return k === "funny" ? "😂 Grappig" : k === "practical" ? "🔧 Praktisch" : "📌 Mededeling";
}
