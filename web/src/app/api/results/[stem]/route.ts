import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { getWorkspaceRoot } from "@/lib/server/txrayCli";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stem: string }> },
) {
  const { stem } = await params;

  // Reject anything that isn't a plain alphanumeric/dash/underscore stem
  if (!/^[a-zA-Z0-9_-]+$/.test(stem)) {
    return NextResponse.json(
      { ok: false, error: "Invalid stem" },
      { status: 400 },
    );
  }

  const workspaceRoot = getWorkspaceRoot();
  const outPath = path.join(workspaceRoot, "out", `${stem}.json`);

  try {
    const raw = await readFile(outPath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(
      { ok: false, error: "File not found" },
      { status: 404 },
    );
  }
}
