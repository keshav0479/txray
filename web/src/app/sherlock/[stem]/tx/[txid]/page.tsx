import TxDetailClient from "@/components/sherlock/TxDetailClient";

export default async function TxDetailPage({ params }: { params: Promise<{ stem: string; txid: string }> }) {
  const { stem, txid } = await params;
  return <TxDetailClient stem={stem} txid={txid} />;
}
