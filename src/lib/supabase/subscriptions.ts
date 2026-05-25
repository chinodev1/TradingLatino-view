import { supabase } from "./client";

export interface Subscription {
  id: string;
  user_id: string;
  status: "active" | "expired" | "pending";
  expires_at: string;
  payment_id: string | null;
  created_at: string;
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getSubscription error:", error.message);
    return null;
  }
  return data;
}
