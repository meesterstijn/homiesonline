import { createServerFn } from "@tanstack/react-start";

export const suggestRecipe = createServerFn({ method: "POST" })
  .inputValidator((input: { hint?: string }) => ({
    hint: typeof input?.hint === "string" ? input.hint.slice(0, 200) : "",
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI is niet geconfigureerd");

    const prompt = `Bedenk één gezellig avondmaal voor een Nederlands gezin. ${
      data.hint ? `Wens: ${data.hint}.` : ""
    } Antwoord uitsluitend in geldig JSON met deze velden: title (string), description (korte zin), servings (getal, standaard 4), ingredients (string met één ingredient per regel, met hoeveelheden), instructions (string met genummerde stappen). Geen extra tekst, geen markdown.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Je bent een gezellige Nederlandse familie-kok. Antwoord altijd in geldig JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Even rustig — te veel verzoeken. Probeer zo opnieuw.");
    if (res.status === 402) throw new Error("AI-tegoed op. Vul aan in Lovable Cloud.");
    if (!res.ok) throw new Error("AI gaf een foutje");

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/^```json\s*/i, "").replace(/```$/g, "").trim();

    try {
      const parsed = JSON.parse(cleaned);
      return {
        title: String(parsed.title ?? "Verrassing"),
        description: String(parsed.description ?? ""),
        servings: Number(parsed.servings ?? 4),
        ingredients: String(parsed.ingredients ?? ""),
        instructions: String(parsed.instructions ?? ""),
      };
    } catch {
      throw new Error("Kon het recept niet lezen, probeer nog eens");
    }
  });
