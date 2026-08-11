import assert from "node:assert/strict";
import test from "node:test";

process.env.CAT_OWNER_PASSWORD = "deployment-smoke-password";

const serverUrl = new URL(
  "../.vercel/output/functions/__server.func/index.mjs",
  import.meta.url,
);
serverUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);

const { default: server } = await import(serverUrl.href);
const context = { waitUntil() {} };

test("Vercel server function renders the home page", async () => {
  const response = await server.fetch(
    new Request("https://example.test/", {
      headers: { accept: "text/html" },
    }),
    context,
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>CAT 2026 Control Room<\/title>/i);
  assert.match(html, /CAT 2026/);
  assert.match(html, /https:\/\/cat-prep\.arfath\.me\/og-cat-2026\.png/i);
  assert.match(html, /property=["']og:image["']/i);
  assert.match(html, /name=["']twitter:card["'][^>]*content=["']summary_large_image["']/i);
  assert.match(html, /href=["']\/favicon\.svg["']/i);
});

test("Vercel server function renders Admissions without changing Prep", async () => {
  const response = await server.fetch(
    new Request("https://example.test/admissions", {
      headers: { accept: "text/html" },
    }),
    context,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<title>Admissions Control Room<\/title>/i);
  assert.match(html, /ADMISSIONS \/\/ HQ/);
});

test("Vercel server function protects state and creates an owner session", async () => {
  const response = await server.fetch(
    new Request("https://example.test/api/state?key=cat26-deployment-smoke"),
    context,
  );

  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json\b/i);
  assert.deepEqual(await response.json(), { error: "Owner sign-in required." });

  const login = await server.fetch(
    new Request("https://example.test/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "deployment-smoke-password" }),
    }),
    context,
  );

  assert.equal(login.status, 200);
  assert.match(login.headers.get("set-cookie") ?? "", /cat-prep-owner=/);

  const admissions = await server.fetch(
    new Request("https://example.test/api/admissions"),
    context,
  );
  assert.equal(admissions.status, 401);
});
