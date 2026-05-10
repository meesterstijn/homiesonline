import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Profile = { id: string; display_name: string; emoji: string };

export function ShoppingSection({ family }: { family: Profile[] }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["shopping"],
    queryFn: async () => {
      const { data } = await supabase.from("shopping_items").select("*").order("in_cart").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Wat moet erop?");
      const { error } = await supabase.from("shopping_items").insert({
        name: name.trim(), quantity: qty.trim() || null, added_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { setName(""); setQty(""); qc.invalidateQueries({ queryKey: ["shopping"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, in_cart }: { id: string; in_cart: boolean }) => {
      await supabase.from("shopping_items").update({ in_cart }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shopping"] }); qc.invalidateQueries({ queryKey: ["dashboard-stats"] }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("shopping_items").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const clearCart = useMutation({
    mutationFn: async () => { await supabase.from("shopping_items").delete().eq("in_cart", true); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shopping"] }); toast.success("Alles uit het mandje weg!"); },
  });

  const findP = (id: string) => family.find(f => f.id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl">🛒 Boodschappen</h1>
        {items.some((i: any) => i.in_cart) && (
          <button onClick={() => clearCart.mutate()} className="rounded-full border bg-card px-4 py-2 text-sm hover:bg-muted">
            Mandje legen
          </button>
        )}
      </div>

      <div className="rounded-3xl border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80}
            onKeyDown={(e) => e.key === "Enter" && add.mutate()}
            placeholder="Bijv. melk" className="rounded-xl border bg-background px-4 py-2.5 outline-none ring-primary focus:ring-2" />
          <input value={qty} onChange={(e) => setQty(e.target.value)} maxLength={20}
            placeholder="2 pakken" className="rounded-xl border bg-background px-4 py-2.5" />
          <button onClick={() => add.mutate()} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:opacity-90">
            Toevoegen
          </button>
        </div>
      </div>

      <ul className="space-y-2">
        {items.length === 0 && <p className="text-center text-muted-foreground">De lijst is leeg ✨</p>}
        {items.map((i: any) => {
          const p = findP(i.added_by);
          return (
            <li key={i.id} className={`flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)] ${i.in_cart ? "opacity-60" : ""}`}>
              <button onClick={() => toggle.mutate({ id: i.id, in_cart: !i.in_cart })}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${i.in_cart ? "border-sage bg-sage text-white" : "border-primary/40"}`}>
                {i.in_cart && "✓"}
              </button>
              <div className="flex-1">
                <div className={`font-semibold ${i.in_cart ? "line-through" : ""}`}>
                  {i.name} {i.quantity && <span className="text-muted-foreground">— {i.quantity}</span>}
                </div>
                {p && <div className="text-xs text-muted-foreground">door {p.emoji} {p.display_name}</div>}
              </div>
              <button onClick={() => remove.mutate(i.id)} className="text-muted-foreground hover:text-destructive">✕</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
