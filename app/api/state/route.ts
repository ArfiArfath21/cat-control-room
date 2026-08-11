type MemoryState = typeof globalThis & {
  __catTrackerMemory?: Map<string, string>;
};

const memoryGlobal = globalThis as MemoryState;
const memoryStore = memoryGlobal.__catTrackerMemory ??= new Map<string, string>();

function validKey(key: string | null): key is string {
  return Boolean(key?.startsWith("cat26-") && key.length <= 120);
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!validKey(key)) return Response.json({ error: "Invalid storage key." }, { status: 400 });
  return Response.json({ value: memoryStore.get(key) ?? null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  let body: { key?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const key = typeof body.key === "string" ? body.key : null;
  if (!validKey(key) || typeof body.value !== "string") {
    return Response.json({ error: "A valid key and string value are required." }, { status: 400 });
  }
  if (body.value.length > 1_000_000) {
    return Response.json({ error: "Stored value is too large." }, { status: 413 });
  }

  memoryStore.set(key, body.value);
  return Response.json({ ok: true });
}
