"use server";

import { revalidatePath } from "next/cache";
import { modelerFetch } from "@/lib/api-client";

// Server Actions für die Bibliothek (ADR-103). Mutation läuft server-seitig
// über modelerFetch (Bearer aus der Session); revalidate aktualisiert die
// Karten-Badges nach dem Übernehmen/Entfernen.

export async function adoptClassic(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await modelerFetch("/edit/classic/adopt", { method: "POST", body: JSON.stringify({ ids }) });
  revalidatePath("/bibliothek");
}

export async function unadoptClassic(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await modelerFetch("/edit/classic/unadopt", { method: "POST", body: JSON.stringify({ ids }) });
  revalidatePath("/bibliothek");
}
