export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Truncated(
  text: string,
  length: number = 32,
): Promise<string> {
  const full = await sha256(text);
  return full.slice(0, Math.max(20, Math.min(length, 64)));
}
