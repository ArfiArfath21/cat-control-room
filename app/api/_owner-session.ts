const COOKIE_NAME = "cat-prep-owner";
const SESSION_DAYS = 90;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(bytes);
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

function ownerPassword() {
  return process.env.CAT_OWNER_PASSWORD?.trim() || null;
}

async function expectedSessionToken(password: string) {
  return bytesToBase64Url(await digest(`cat-prep-owner-session:v1:${password}`));
}

function cookieValue(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === COOKIE_NAME) return value.join("=");
  }
  return null;
}

export function ownerAccessConfigured() {
  return Boolean(ownerPassword());
}

export async function passwordMatches(candidate: string) {
  const expected = ownerPassword();
  if (!expected) return false;
  return equalBytes(await digest(candidate), await digest(expected));
}

export async function hasOwnerSession(request: Request) {
  const password = ownerPassword();
  const supplied = cookieValue(request);
  if (!password || !supplied) return false;
  const expected = await expectedSessionToken(password);
  return equalBytes(await digest(supplied), await digest(expected));
}

export async function ownerSessionCookie() {
  const password = ownerPassword();
  if (!password) throw new Error("CAT_OWNER_PASSWORD is not configured.");
  const token = await expectedSessionToken(password);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}${secure}`;
}

export function clearOwnerSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
