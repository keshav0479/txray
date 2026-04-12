import { NextResponse } from "next/server";
import { resolveTxrayBinary } from "@/lib/server/txrayCli";

export async function GET() {
  try {
    await resolveTxrayBinary();
    return NextResponse.json({ ok: true, uptime: process.uptime() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 503 },
    );
  }
}
