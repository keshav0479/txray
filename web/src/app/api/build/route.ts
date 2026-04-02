import { NextResponse } from "next/server";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { parseJsonFromCliOutput, runTxray } from "@/lib/server/txrayCli";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-build-"));
  const fixturePath = path.join(tmpDir, "fixture.json");

  try {
    const body = await req.text();
    const parsed = JSON.parse(body) as Record<string, unknown>;

    if (!parsed.fee_rate_sat_vb || !parsed.utxos) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "Missing fee_rate_sat_vb or utxos",
          },
        },
        { status: 400 },
      );
    }

    await writeFile(fixturePath, body, "utf-8");

    const result = await runTxray(["build", fixturePath]);
    if (result.code !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "BUILD_FAILED",
            message: result.stderr || "txray build failed",
          },
        },
        { status: 500 },
      );
    }

    const output = parseJsonFromCliOutput(result.stdout);
    return NextResponse.json(output);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown build error";
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "BUILD_FAILED",
          message,
        },
      },
      { status: 500 },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
