import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏡</span>
          <span className="font-display text-xl font-semibold">Homiesonline</span>
        </div>
        <Link to="/auth" className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground shadow-[var(--shadow-cozy)] transition hover:opacity-90">
          Inloggen
        </Link>
      </header>

      <section className="mx-auto max-w-5xl px-6 pb-20 pt-10 text-center">
        <span className="inline-block rounded-full bg-accent/60 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
          Het gezellige familie-dashboard
        </span>
        <h1 className="mt-6 text-5xl leading-tight md:text-7xl">
          Alles van het<br />
          <span className="italic" style={{ background: "var(--gradient-warm)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            hele huishouden
          </span><br />
          op één warme plek
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
          Taken, boodschappen, de familie-agenda, grappige notities en alle praktische dingen — Homiesonline houdt jullie samen op de hoogte.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/auth" className="rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-[var(--shadow-cozy)] transition hover:scale-105">
            Maak een account →
          </Link>
          <a href="#features" className="rounded-full border-2 border-primary/30 bg-card/60 px-7 py-3 font-semibold text-foreground transition hover:bg-card">
            Bekijk wat het kan
          </a>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { e: "✅", t: "Klusjes & taken", d: "Wie doet wat. Vink af en zie wie er weer eens niets deed." },
            { e: "🛒", t: "Boodschappen", d: "Iedereen voegt toe, een loopt boodschappen, allemaal blij." },
            { e: "📅", t: "Familie-agenda", d: "Verjaardagen, sport, oma op bezoek — alles overzichtelijk." },
            { e: "📌", t: "Mededelingen", d: "Belangrijke berichten voor het hele gezin." },
            { e: "😂", t: "Grappige dingen", d: "De beste familie-quotes en herinneringen." },
            { e: "🔧", t: "Praktische zaken", d: "Wifi-wachtwoord, recepten, weet-ik-veel-wat." },
          ].map((f) => (
            <div key={f.t} className="rounded-3xl border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1">
              <div className="text-3xl">{f.e}</div>
              <h3 className="mt-3 text-xl">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-card/40 py-6 text-center text-sm text-muted-foreground">
        Met liefde gemaakt voor jullie homies 🧡
      </footer>
    </div>
  );
}
