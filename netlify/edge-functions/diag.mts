// Funcion de diagnostico temporal -- NO toca el flujo de lecturas.
// Visitar https://lux-astral.netlify.app/api/diag directamente en el
// navegador (GET) para ver un JSON con el estado del entorno edge.
// Se borra despues de resolver el bug del 500 en tarot-interpret.

async function tryStep(label: string, fn: () => Promise<any> | any) {
  try {
    const value = await fn();
    return { label, ok: true, value };
  } catch (e: any) {
    return { label, ok: false, error: String((e && e.stack) || (e && e.message) || e) };
  }
}

export default async (req: Request, context: any) => {
  const results: any[] = [];

  results.push(await tryStep("netlify-env-anthropic-present", () => {
    return !!(typeof Netlify !== "undefined" && Netlify.env && Netlify.env.get("ANTHROPIC_API_KEY"));
  }));

  results.push(await tryStep("import-netlify-blobs", async () => {
    const mod = await import("@netlify/blobs");
    return Object.keys(mod);
  }));

  results.push(await tryStep("blobs-getStore-call", async () => {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "booking", consistency: "strong" });
    return typeof store;
  }));

  results.push(await tryStep("blobs-get-state", async () => {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: "booking", consistency: "strong" });
    const raw = await store.get("state", { type: "json" });
    return raw ? Object.keys(raw) : null;
  }));

  results.push(await tryStep("fetch-anthropic-reachable", async () => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": (typeof Netlify !== "undefined" && Netlify.env.get("ANTHROPIC_API_KEY")) || "missing",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 8, messages: [{ role: "user", content: "hi" }] }),
    });
    const text = await res.text();
    return { status: res.status, bodySnippet: text.slice(0, 300) };
  }));

  return new Response(JSON.stringify({ runtime: "edge", results }, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

export const config = {
  path: "/api/diag",
};
