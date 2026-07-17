"use client";

import { useSession } from "@/app/providers";
import { HomeLanding, type HomeLandingState } from "@/components/home/HomeLanding";

export default function HomePage() {
  const { user, loading } = useSession();
  const state: HomeLandingState = loading ? "loading" : user ? "signed-in" : "signed-out";

  return <HomeLanding state={state} />;
}
