import { Footer } from "@/components/shared/Footer";
import { SherlockBackground } from "@/components/sherlock/SherlockBackground";
import BlockDetailClient from "@/components/sherlock/BlockDetailClient";

export default async function SherlockBlockPage({
  params,
}: {
  params: Promise<{ stem: string }>;
}) {
  const { stem } = await params;

  return (
    <>
      <SherlockBackground />
      <div className="min-h-screen flex flex-col">
        <BlockDetailClient stem={stem} />
        <Footer />
      </div>
    </>
  );
}
