import { Footer } from "@/components/shared/Footer";
import TxDetailClient from "@/components/sherlock/TxDetailClient";

export default async function SherlockTxPage({
  params,
}: {
  params: Promise<{ stem: string; txid: string }>;
}) {
  const { stem, txid } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <TxDetailClient stem={stem} txid={txid} />
      <Footer />
    </div>
  );
}
