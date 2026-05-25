import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const PRICE_USD = 2;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currency: string = body.currency ?? "usdtbsc"; // usdtbsc = USDT BEP20

  // Validate currency
  const allowed = ["usdtbsc", "usdcarbitrum", "usdtarbitrum", "usdcbsc"];
  if (!allowed.includes(currency)) {
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const payload = {
    price_amount: PRICE_USD,
    price_currency: "usd",
    pay_currency: currency,
    order_id: `${userId}_${Date.now()}`,
    order_description: "TradingLatino — 1 month subscription",
    ipn_callback_url: `${process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin}/api/payment/webhook`,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin}/chart`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin}/subscribe`,
  };

  const res = await fetch(`${NOWPAYMENTS_API}/payment`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("NOWPayments create error:", err);
    return NextResponse.json({ error: "Payment provider error" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({
    paymentId: data.payment_id,
    payAddress: data.pay_address,
    payAmount: data.pay_amount,
    payCurrency: data.pay_currency,
    status: data.payment_status,
  });
}
