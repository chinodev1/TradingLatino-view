import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SubscribeClient } from "./SubscribeClient";

export default async function SubscribePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  return <SubscribeClient />;
}
