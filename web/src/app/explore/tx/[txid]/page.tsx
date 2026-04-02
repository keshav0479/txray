import { redirect } from "next/navigation";

/**
 * Redirect from old /explore/tx/[txid] route to unified /tx/[txid] page.
 */
export default async function ExploreTxRedirect({
  params,
}: {
  params: Promise<{ txid: string }>;
}) {
  const { txid } = await params;
  redirect(`/tx/${txid}`);
}
