/** Server-only Razorpay helpers (never imported from client code). */

function keys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const missing = [!keyId && "RAZORPAY_KEY_ID", !keySecret && "RAZORPAY_KEY_SECRET"].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `Online payment is unavailable: missing server environment variable(s) ${missing.join(", ")}. Add them to the deployment environment and redeploy.`,
    );
  }
  return { keyId: keyId!, keySecret: keySecret! };
}


export async function createRemoteOrder(amountPaise: number, receipt: string) {
  const { keyId, keySecret } = keys();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
    },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, payment_capture: 1 }),
  });
  const json = (await res.json()) as { id?: string; error?: { description?: string } };
  if (!res.ok || !json.id) throw new Error(json.error?.description ?? "Could not create Razorpay order");
  return { razorpayOrderId: json.id, amount: amountPaise, keyId };
}

export async function isValidSignature(razorpayOrderId: string, paymentId: string, signature: string) {
  const { keySecret } = keys();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(keySecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${razorpayOrderId}|${paymentId}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}
