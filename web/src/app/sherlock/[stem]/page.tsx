import BlockDetailClient from "@/components/sherlock/BlockDetailClient";

export default async function BlockDetailPage({ params }: { params: Promise<{ stem: string }> }) {
  const { stem } = await params;
  return <BlockDetailClient stem={stem} />;
}
