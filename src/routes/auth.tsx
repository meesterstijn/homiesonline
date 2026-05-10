import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const EMOJIS = ["🏡","🌻","🐻","🦊","🐼","🦁","🐧","🦄","🌸","⭐","🍕","🎈","🚀","🎸"];

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin"|"signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🏡");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate({ to: "/dashboard" }); }, [user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { display_name: name || email.split("@")[0], emoji },
          },
        });
        if (error) throw error;
        toast.success("Welkom thuis! Check je mail om te bevestigen.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welkom terug 🧡");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Er ging iets mis";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 text-xl">
          <span className="text-2xl">🏡</span>
          <span className="font-display font-semibold">Homiesonline</span>
        </Link>

        <div className="rounded-3xl border bg-card p-8 shadow-[var(--shadow-soft)]">
          <h1 className="text-center text-3xl">
            {mode === "signin" ? "Welkom thuis" : "Word familielid"}
          </h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Log in om bij jullie dashboard te komen." : "Maak een account aan voor jezelf."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-sm font-semibold">Naam</label>
                  <input
                    value={name} onChange={(e) => setName(e.target.value)}
                    required maxLength={50}
                    placeholder="Pieter, mama, Lucas..."
                    className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 outline-none ring-primary focus:ring-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold">Kies je emoji</label>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {EMOJIS.map((e) => (
                      <button type="button" key={e} onClick={() => setEmoji(e)}
                        className={`h-10 w-10 rounded-full text-xl transition ${emoji === e ? "scale-110 bg-primary/20 ring-2 ring-primary" : "bg-secondary hover:bg-accent/40"}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-semibold">E-mail</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required maxLength={255}
                className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 outline-none ring-primary focus:ring-2"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Wachtwoord</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} maxLength={72}
                className="mt-1 w-full rounded-xl border bg-background px-4 py-2.5 outline-none ring-primary focus:ring-2"
              />
            </div>

            <button disabled={busy}
              className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground shadow-[var(--shadow-cozy)] transition hover:opacity-90 disabled:opacity-50">
              {busy ? "Even..." : mode === "signin" ? "Inloggen" : "Account maken"}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground">
            {mode === "signin" ? "Nog geen account? Maak er een aan" : "Heb je al een account? Inloggen"}
          </button>
        </div>
      </div>
    </div>
  );
}
