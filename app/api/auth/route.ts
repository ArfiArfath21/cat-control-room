import {
  clearOwnerSessionCookie,
  hasOwnerSession,
  ownerAccessConfigured,
  ownerSessionCookie,
  passwordMatches,
} from "../_owner-session";

export async function GET(request: Request) {
  if (!ownerAccessConfigured()) {
    return Response.json({ configured: false, authenticated: false }, { status: 503 });
  }
  return Response.json({ configured: true, authenticated: await hasOwnerSession(request) }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!ownerAccessConfigured()) {
    return Response.json({ error: "Owner access is not configured." }, { status: 503 });
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.password !== "string" || !(await passwordMatches(body.password))) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  return Response.json({ ok: true }, {
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": await ownerSessionCookie(),
    },
  });
}

export async function DELETE() {
  return Response.json({ ok: true }, {
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": clearOwnerSessionCookie(),
    },
  });
}
