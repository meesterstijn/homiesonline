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
import { KitchenSection } from "@/components/dashboard/KitchenSection";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const TABS = [
  { id: "home", label: "Thuis", emoji: "🏡" },
  { id: "tasks", label: "Taken", emoji: "✅" },
  { id: "shopping", label: "Boodschappen", emoji: "🛒" },
  { id: "calendar", label: "Agenda", emoji: "📅" },
  { id: "kitchen", label: "Keuken & BBQ", emoji: "🍽️" },
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
        {tab === "kitchen" && <KitchenSection family={family} />}
        {tab === "notes" && <NotesSection family={family} />}
      </main>
    </div>
  );
}

function HomeView({ profileName, family, setTab }: { profileName: string; family: any[]; setTab: (t: TabId) => void }) {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const [tasks, shopping, events, notes, recipes, bbq] = await Promise.all([
        supabase.from("tasks").select("id,done", { count: "exact" }),
        supabase.from("shopping_items").select("id,in_cart", { count: "exact" }),
        supabase.from("calendar_events").select("id,event_date,title").gte("event_date", new Date().toISOString()).order("event_date").limit(3),
        supabase.from("notes").select("id,title,kind,created_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("recipes").select("id,title,description,servings"),
        supabase.from("bbq_bookings").select("id,booking_date,start_time,end_time,what_cooking,booked_by").gte("booking_date", todayStr).order("booking_date").order("start_time").limit(3),
      ]);
      const recipeList = recipes.data ?? [];
      const todays = recipeList.length ? recipeList[Math.floor(Math.random() * recipeList.length)] : null;
      return {
        openTasks: tasks.data?.filter(t => !t.done).length ?? 0,
        shopping: shopping.data?.filter(s => !s.in_cart).length ?? 0,
        events: events.data ?? [],
        notes: notes.data ?? [],
        todaysRecipe: todays,
        recipeCount: recipeList.length,
        bbq: bbq.data ?? [],
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
        <button onClick={() => setTab("kitchen")}
          className="group rounded-3xl border-2 border-primary/20 p-6 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-primary/40"
          style={{ background: "linear-gradient(135deg, oklch(0.92 0.06 80) 0%, oklch(0.84 0.13 85) 100%)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">🍽️ Wat eten we vandaag?</h2>
            <span className="text-sm opacity-60 group-hover:opacity-100">→</span>
          </div>
          {stats?.todaysRecipe ? (
            <>
              <div className="mt-3 text-2xl font-display font-semibold">{stats.todaysRecipe.title}</div>
              {stats.todaysRecipe.description && <p className="mt-1 text-sm opacity-80">{stats.todaysRecipe.description}</p>}
              <p className="mt-3 text-xs opacity-70">Voorstel uit jullie {stats.recipeCount} recepten</p>
            </>
          ) : (
            <p className="mt-3 text-sm opacity-80">Voeg recepten toe of laat AI iets bedenken!</p>
          )}
        </button>

        <button onClick={() => setTab("kitchen")}
          className="group rounded-3xl p-6 text-left text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-1"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.12 145) 0%, oklch(0.32 0.08 145) 100%)" }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">🥚 Big Green Egg</h2>
            <span className="text-sm opacity-60 group-hover:opacity-100">→</span>
          </div>
          {stats?.bbq.length ? (
            <ul className="mt-3 space-y-1 text-sm">
              {stats.bbq.slice(0, 3).map((b: any) => (
                <li key={b.id} className="opacity-90">
                  {new Date(b.booking_date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" })} · {b.start_time.slice(0,5)}–{b.end_time.slice(0,5)} {b.what_cooking && `· ${b.what_cooking}`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-90">Vrij! Reserveer Pa's BBQ voor je volgende sessie.</p>
          )}
        </button>
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
