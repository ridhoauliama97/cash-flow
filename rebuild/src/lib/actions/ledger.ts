"use server";

import { revalidatePath } from "next/cache";
import { postJournal } from "@/lib/services/ledger";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Server action posting jurnal — tipis; logika di src/lib/services/ledger.ts. */
export async function postJournalAction(
  transactionId: string,
): Promise<ActionResult<{ alreadyPosted: boolean }>> {
  const result = await postJournal(transactionId);
  if (result.ok) {
    revalidatePath("/transactions");
    revalidatePath("/ledger");
  }
  return result;
}
