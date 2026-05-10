import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { suggestRecipe } from "@/lib/recipe.functions";
import { toast } from "sonner";

type Profile = { id: string; display_name: string; emoji: string };
type Recipe = { id: string; title: string; description: string | null; ingredients: string; instructions: string | null; servings: number; created_by: string };

export function KitchenSection({ family }: { family: Profile[] }) {
  const [view, setView] = useState<"food" | "bbq">("food");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setView("food")}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${view === "food" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
          🍽️ Wat eten we vandaag
        </button>
        <button onClick={() => setView("bbq")}
          className={`rounded-full px-5 py-2 text-sm font-semibold ${view === "bbq" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
          🔥 Big Green Egg bij Pa
        </button>
      </div>
      {view === "food" ? <Recipes family={family} /> : <BBQ family={family} />}
    </div>
  );
}

/* ---------------- Recipes ---------------- */

function Recipes({ family }: { family: Profile[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const askAI = useServerFn(suggestRecipe);
  const [pick, setPick] = useState<Recipe | null>(null);
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null);
  const [aiHint, setAiHint] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const { data: recipes = [] } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const { data } = await supabase.from("recipes").select("*").order("created_at", { ascending: false });
      return (data as Recipe[]) ?? [];
    },
  });

  const surprise = () => {
    if (!recipes.length) return toast.info("Voeg eerst een recept toe of vraag AI om eentje");
    setPick(recipes[Math.floor(Math.random() * recipes.length)]);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!editing?.title?.trim() || !editing?.ingredients?.trim()) throw new Error("Titel en ingrediënten zijn verplicht");
      const payload = {
        title: editing.title.trim(),
        description: editing.description?.trim() || null,
        ingredients: editing.ingredients.trim(),
        instructions: editing.instructions?.trim() || null,
        servings: Number(editing.servings) || 4,
      };
      if (editing.id) {
        const { error } = await supabase.from("recipes").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("recipes").insert({ ...payload, created_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ["recipes"] }); toast.success("Opgeslagen!"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("recipes").delete().eq("id", id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recipes"] }); setPick(null); },
  });

  const askAIClick = async () => {
    setAiBusy(true);
    try {
      const r = await askAI({ data: { hint: aiHint } });
      setEditing({ ...r });
      setAiHint("");
      toast.success("Klaar! Bewerk en bewaar 🌟");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setAiBusy(false); }
  };

  const findP = (id: string) => family.find(f => f.id === id);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl p-8 shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-warm)" }}>
        <h1 className="text-4xl text-warm-foreground">🍽️ Wat eten we vandaag?</h1>
        <p className="mt-2 text-warm-foreground/80">Geen idee? Druk op de knop en laat het lot beslissen.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={surprise}
            className="rounded-full bg-foreground px-6 py-3 font-semibold text-background hover:opacity-90">
            🎲 Verras me
          </button>
          <button onClick={() => setEditing({ servings: 4 })}
            className="rounded-full border-2 border-foreground/30 bg-card/60 px-6 py-3 font-semibold hover:bg-card">
            + Nieuw recept
          </button>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold">✨ Vraag AI om een ideetje</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={aiHint} onChange={(e) => setAiHint(e.target.value)} maxLength={200}
            placeholder="bv. snel, vegetarisch, met kip..."
            className="flex-1 rounded-xl border bg-background px-4 py-2.5" />
          <button onClick={askAIClick} disabled={aiBusy}
            className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-50">
            {aiBusy ? "Aan het koken..." : "Geef een idee"}
          </button>
        </div>
      </div>

      {pick && <RecipeView recipe={pick} onClose={() => setPick(null)} onDelete={() => remove.mutate(pick.id)} onEdit={() => { setEditing(pick); setPick(null); }} authorName={findP(pick.created_by)?.display_name} />}

      <div>
        <h2 className="mb-3 text-2xl">📖 Recepten van het gezin ({recipes.length})</h2>
        {recipes.length === 0 && <p className="text-muted-foreground">Nog geen recepten. Voeg er eentje toe of vraag AI!</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map(r => {
            const p = findP(r.created_by);
            return (
              <button key={r.id} onClick={() => setPick(r)}
                className="rounded-2xl border bg-card p-5 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-primary/40">
                <div className="text-2xl">🍳</div>
                <h3 className="mt-2 text-xl">{r.title}</h3>
                {r.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>}
                <div className="mt-3 text-xs text-muted-foreground">{r.servings} pers · {p ? `${p.emoji} ${p.display_name}` : ""}</div>
              </button>
            );
          })}
        </div>
      </div>

      {editing && <RecipeEditor editing={editing} setEditing={setEditing} onSave={() => save.mutate()} busy={save.isPending} />}
    </div>
  );
}

function RecipeView({ recipe, onClose, onDelete, onEdit, authorName }: { recipe: Recipe; onClose: () => void; onDelete: () => void; onEdit: () => void; authorName?: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const copyIngredients = async () => {
    await navigator.clipboard.writeText(recipe.ingredients);
    toast.success("Ingrediënten gekopieerd!");
  };

  const download = () => {
    const text = `${recipe.title}\n${"=".repeat(recipe.title.length)}\n\nVoor ${recipe.servings} personen\n\nINGREDIËNTEN:\n${recipe.ingredients}\n\n${recipe.instructions ? `BEREIDING:\n${recipe.instructions}\n` : ""}`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${recipe.title.replace(/[^\w]+/g, "_")}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const addToShopping = useMutation({
    mutationFn: async () => {
      const lines = recipe.ingredients.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!lines.length) return;
      const rows = lines.map(l => ({ name: l, added_by: user!.id }));
      const { error } = await supabase.from("shopping_items").insert(rows);
      if (error) throw error;
      return lines.length;
    },
    onSuccess: (n) => { toast.success(`${n} ingrediënten op de boodschappenlijst!`); qc.invalidateQueries({ queryKey: ["shopping"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-3xl">{recipe.title}</h2>
            {recipe.description && <p className="mt-1 text-muted-foreground">{recipe.description}</p>}
            <div className="mt-2 text-xs text-muted-foreground">Voor {recipe.servings} personen{authorName ? ` · door ${authorName}` : ""}</div>
          </div>
          <button onClick={onClose} className="text-2xl text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl">🥕 Ingrediënten</h3>
            <div className="flex gap-2 text-sm">
              <button onClick={copyIngredients} className="rounded-full bg-secondary px-3 py-1 hover:bg-accent/40">📋 Kopieer</button>
              <button onClick={download} className="rounded-full bg-secondary px-3 py-1 hover:bg-accent/40">⬇️ Download</button>
            </div>
          </div>
          <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-secondary p-4 font-sans text-sm">{recipe.ingredients}</pre>
          <button onClick={() => addToShopping.mutate()} disabled={addToShopping.isPending}
            className="mt-3 w-full rounded-xl bg-sage py-2.5 font-semibold text-sage-foreground hover:opacity-90 disabled:opacity-50">
            🛒 Zet op boodschappenlijst
          </button>
        </div>

        {recipe.instructions && (
          <div className="mt-6">
            <h3 className="text-xl">👩‍🍳 Bereiding</h3>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl bg-secondary p-4 font-sans text-sm">{recipe.instructions}</pre>
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <button onClick={onEdit} className="rounded-full border bg-background px-4 py-2 text-sm">Bewerken</button>
          <button onClick={onDelete} className="rounded-full border border-destructive/40 bg-background px-4 py-2 text-sm text-destructive">Verwijderen</button>
        </div>
      </div>
    </div>
  );
}

function RecipeEditor({ editing, setEditing, onSave, busy }: { editing: Partial<Recipe>; setEditing: (r: Partial<Recipe> | null) => void; onSave: () => void; busy: boolean }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl">
        <h2 className="text-2xl">{editing.id ? "Bewerk recept" : "Nieuw recept"}</h2>
        <div className="mt-4 space-y-3">
          <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            maxLength={120} placeholder="Titel" className="w-full rounded-xl border bg-background px-4 py-2.5" />
          <input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            maxLength={200} placeholder="Korte omschrijving" className="w-full rounded-xl border bg-background px-4 py-2.5" />
          <div className="flex items-center gap-2">
            <label className="text-sm">Voor</label>
            <input type="number" min={1} max={20} value={editing.servings ?? 4}
              onChange={(e) => setEditing({ ...editing, servings: Number(e.target.value) })}
              className="w-20 rounded-xl border bg-background px-3 py-2" />
            <label className="text-sm">personen</label>
          </div>
          <div>
            <label className="text-sm font-semibold">Ingrediënten (één per regel)</label>
            <textarea value={editing.ingredients ?? ""} onChange={(e) => setEditing({ ...editing, ingredients: e.target.value })}
              rows={6} placeholder="500g pasta&#10;2 uien&#10;..." className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 font-mono text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold">Bereiding</label>
            <textarea value={editing.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })}
              rows={6} placeholder="1. Snij de uien...&#10;2. ..." className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 font-mono text-sm" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setEditing(null)} className="rounded-full border bg-background px-5 py-2">Annuleer</button>
          <button onClick={onSave} disabled={busy}
            className="rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "Opslaan..." : "Bewaren"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- BBQ ---------------- */

type Booking = { id: string; booking_date: string; start_time: string; end_time: string; what_cooking: string | null; notes: string | null; booked_by: string };

function BBQ({ family }: { family: Profile[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("17:00");
  const [end, setEnd] = useState("21:00");
  const [what, setWhat] = useState("");

  const { data: bookings = [] } = useQuery({
    queryKey: ["bbq"],
    queryFn: async () => {
      const { data } = await supabase.from("bbq_bookings").select("*").gte("booking_date", today).order("booking_date").order("start_time");
      return (data as Booking[]) ?? [];
    },
  });

  const overlaps = (a: Booking, d: string, s: string, e: string) =>
    a.booking_date === d && a.start_time < e && s < a.end_time;

  const book = useMutation({
    mutationFn: async () => {
      if (!date || !start || !end) throw new Error("Vul datum en tijd in");
      if (start >= end) throw new Error("Eindtijd moet na starttijd zijn");
      const conflict = bookings.find(b => overlaps(b, date, start, end));
      if (conflict) {
        const who = family.find(f => f.id === conflict.booked_by);
        throw new Error(`Botst met reservering van ${who?.display_name ?? "iemand"} (${conflict.start_time.slice(0,5)}–${conflict.end_time.slice(0,5)})`);
      }
      const { error } = await supabase.from("bbq_bookings").insert({
        booking_date: date, start_time: start, end_time: end,
        what_cooking: what.trim() || null, booked_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { setWhat(""); qc.invalidateQueries({ queryKey: ["bbq"] }); toast.success("Egg geboekt 🔥"); },
    onError: (e) => toast.error((e as Error).message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => { await supabase.from("bbq_bookings").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bbq"] }),
  });

  const findP = (id: string) => family.find(f => f.id === id);
  const grouped = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    (acc[b.booking_date] ??= []).push(b); return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border-2 border-foreground/10 p-8 shadow-[var(--shadow-soft)]" style={{ background: "linear-gradient(135deg, oklch(0.55 0.12 145) 0%, oklch(0.35 0.08 145) 100%)" }}>
        <div className="flex items-center gap-3 text-warm-foreground">
          <span className="text-5xl">🥚</span>
          <div>
            <h1 className="text-4xl text-white">Big Green Egg bij Pa</h1>
            <p className="mt-1 text-white/80">Reserveer een tijdslot — voorkom dubbele boekingen.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <h3 className="text-lg font-semibold">Nieuwe reservering</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs font-semibold">Datum</label>
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5" />
          </div>
          <div>
            <label className="text-xs font-semibold">Vanaf</label>
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5" />
          </div>
          <div>
            <label className="text-xs font-semibold">Tot</label>
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-xl border bg-background px-3 py-2.5" />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold">Wat ga je maken?</label>
            <input value={what} onChange={(e) => setWhat(e.target.value)} maxLength={120}
              placeholder="Picanha, pulled pork, pizza..."
              className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5" />
          </div>
        </div>
        <button onClick={() => book.mutate()} disabled={book.isPending}
          className="mt-4 w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-8">
          🔥 Reserveer de Egg
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl">Komende reserveringen</h2>
        {bookings.length === 0 && <p className="text-muted-foreground">Nog geen boekingen — Pa's Egg staat klaar.</p>}
        {Object.entries(grouped).map(([d, list]) => (
          <div key={d}>
            <div className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {new Date(d).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <ul className="space-y-2">
              {list.map(b => {
                const p = findP(b.booked_by);
                const isMine = b.booked_by === user?.id;
                return (
                  <li key={b.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
                    <div className="grid h-14 w-20 shrink-0 place-items-center rounded-xl bg-sage/30 font-bold">
                      {b.start_time.slice(0,5)}<br />–<br />{b.end_time.slice(0,5)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{b.what_cooking || "BBQ-sessie"}</div>
                      <div className="text-sm text-muted-foreground">{p ? `${p.emoji} ${p.display_name}` : "Iemand"}</div>
                    </div>
                    {isMine && (
                      <button onClick={() => cancel.mutate(b.id)} className="text-sm text-muted-foreground hover:text-destructive">
                        Annuleren
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
