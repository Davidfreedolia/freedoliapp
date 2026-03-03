export function base64UrlEncode(data: string | Uint8Array): string {
  const s = typeof data === "string" ? new TextEncoder().encode(data) : data;
  return btoa(String.fromCharCode(...s))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function createState(payload: Record<string, unknown>, secret: string): Promise<string> {
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = await signPayload(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function verifyState(state: string, secret: string): Promise<Record<string, unknown> | null> {
  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return null;
  const expectedSig = await signPayload(payloadB64, secret);
  if (expectedSig !== sig) return null;
  try {
    const raw = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(
      new TextDecoder().decode(new Uint8Array([...raw].map((c) => c.charCodeAt(0))))
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}
