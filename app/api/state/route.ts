import { createClient } from "redis";
import { hasOwnerSession, ownerAccessConfigured } from "../_owner-session";

function createRedisClient(url: string) {
  const client = createClient({ url });
  client.on("error", error => {
    console.error("Redis connection error", error instanceof Error ? error.message : "Unknown Redis error");
  });
  return client;
}

type RedisClient = ReturnType<typeof createRedisClient>;
let redisClientPromise: Promise<RedisClient> | null = null;

function redis(): Promise<RedisClient> {
  if (redisClientPromise) return redisClientPromise;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not configured.");

  const client = createRedisClient(url);
  redisClientPromise = client.connect().then(() => client).catch(error => {
    redisClientPromise = null;
    throw error;
  });
  return redisClientPromise;
}

function validKey(key: string | null): key is string {
  return Boolean(key?.startsWith("cat26-") && key.length <= 120);
}

function redisKey(key: string) {
  return `cat-prep:state:${key}`;
}

async function authorize(request: Request) {
  if (!ownerAccessConfigured()) {
    return Response.json({ error: "CAT_OWNER_PASSWORD is not configured." }, { status: 503 });
  }
  if (!(await hasOwnerSession(request))) {
    return Response.json({ error: "Owner sign-in required." }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const authorizationError = await authorize(request);
  if (authorizationError) return authorizationError;

  const key = new URL(request.url).searchParams.get("key");
  if (!validKey(key)) return Response.json({ error: "Invalid storage key." }, { status: 400 });

  try {
    const value = await (await redis()).get(redisKey(key));
    return Response.json({ value: value ?? null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Redis read failed", error);
    return Response.json({ error: "Persistent storage is unavailable." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const authorizationError = await authorize(request);
  if (authorizationError) return authorizationError;

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

  try {
    await (await redis()).set(redisKey(key), body.value);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Redis write failed", error);
    return Response.json({ error: "Persistent storage is unavailable." }, { status: 503 });
  }
}
