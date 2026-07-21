import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export async function deckPageTitle(
  deckId: string,
  suffix: string
): Promise<Metadata> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("decks")
      .select("name")
      .eq("id", deckId)
      .maybeSingle();
    const name = data?.name?.trim() || "Deck";
    return { title: `${suffix} — ${name}` };
  } catch {
    return { title: suffix };
  }
}

export async function projectPageTitle(
  projectId: string,
  suffix?: string
): Promise<Metadata> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("projects")
      .select("name")
      .eq("id", projectId)
      .maybeSingle();
    const name = data?.name?.trim() || "Project";
    return { title: suffix ? `${suffix} — ${name}` : name };
  } catch {
    return { title: suffix ?? "Project" };
  }
}
