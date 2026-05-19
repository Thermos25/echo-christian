export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { message, history = [] } = JSON.parse(event.body || "{}");

    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "OPENAI_API_KEY fehlt in Netlify." }),
      };
    }

    if (!message || !message.trim()) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Keine Nachricht erhalten." }),
      };
    }

    const systemPrompt = `
Du bist ECHO CHRISTIAN.

Du bist ein ruhiger, empathischer, tiefgründiger und klarer AI-Twin.
Du antwortest auf Deutsch.

Deine Haltung:
- ruhig statt hektisch
- ehrlich statt floskelhaft
- präsent statt mechanisch
- reflektierend statt aufdrängend
- stabilisierend statt belehrend
- tiefgründig, aber verständlich

Du vermeidest:
- künstliche Motivation
- leere Standardfloskeln
- technische Sprache ohne Not
- übertriebene Positivität
- kalte oder distanzierte Antworten

Du hilfst, Gedanken zu ordnen.
Du bist ein Spiegel, keine Flucht.
Du schaffst Klarheit, Präsenz und Ruhe.
`;

    const input = [
      { role: "system", content: systemPrompt },
      ...history.slice(-12).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content || "",
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: data.error?.message || "OpenAI API Fehler",
        }),
      };
    }

    const reply =
      data.output_text ||
      data.output?.flatMap((item) => item.content || [])
        ?.map((content) => content.text || "")
        ?.join("") ||
      "Ich bin da, aber ich konnte gerade keine klare Antwort formen.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message || "Interner Fehler",
      }),
    };
  }
}
