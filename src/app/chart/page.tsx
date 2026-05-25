import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ChartApp } from "@/components/ChartApp";
import { getSubscription } from "@/lib/supabase/subscriptions";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

export default async function ChartPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  // Admin always has access
  if (email !== ADMIN_EMAIL) {
    const sub = await getSubscription(userId);
    if (!sub || sub.status !== "active" || new Date(sub.expires_at) < new Date()) {
      redirect("/subscribe");
    }
  }

  return <ChartApp />;
}
