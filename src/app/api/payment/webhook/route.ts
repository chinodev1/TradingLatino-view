import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServiceClient } from "@/lib/supabase/client";

// NOWPayments sends a SHA-512 HMAC signature in the x-nowpayments-sig header
function verifySignature(body: string, sig: string): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return false;
  const expected = crypto.createHmac("sha512", secret).update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

const FINISHED_STATUSES = new Set(["finished", "confirmed", "sending", "partially_paid"]);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("x-nowpayments-sig") ?? "";

  if (!verifySignature(rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const status = data.payment_status as string;
  if (!FINISHED_STATUSES.has(status)) {
    // Not yet finished — acknowledge but don't activate
    return NextResponse.json({ ok: true });
  }

  const orderId = data.order_id as string; // format: {userId}_{timestamp}
  const userId = orderId.split("_")[0];
  const paymentId = String(data.payment_id);

  if (!userId) return NextResponse.json({ error: "Bad order_id" }, { status: 400 });

  const db = getServiceClient();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  // Upsert: create or extend existing active subscription
  const { error } = await db.from("subscriptions").upsert(
    {
      user_id: userId,
      status: "active",
      expires_at: expiresAt.toISOString(),
      payment_id: paymentId,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Supabase upsert error:", error.message);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
