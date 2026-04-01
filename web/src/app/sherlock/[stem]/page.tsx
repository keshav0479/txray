import { Footer } from "@/components/shared/Footer";
import BlockDetailClient from "@/components/sherlock/BlockDetailClient";

export default async function SherlockBlockPage({
  params,
}: {
  params: Promise<{ stem: string }>;
}) {
  const { stem } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <BlockDetailClient stem={stem} />
      <Footer />
    </div>
  );
}
