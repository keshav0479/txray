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
    const MAX_BODY = 1 * 1024 * 1024; // 1 MB
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY) {
      return NextResponse.json(
        { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds 1 MB limit" } },
        { status: 413 },
      );
    }
    const body = await req.text();
    if (body.length > MAX_BODY) {
      return NextResponse.json(
        { ok: false, error: { code: "PAYLOAD_TOO_LARGE", message: "Request body exceeds 1 MB limit" } },
        { status: 413 },
      );
    }

    const parsed = JSON.parse(body) as Record<string, unknown>;

    const feeRate = parsed.fee_rate_sat_vb;
    const utxos = parsed.utxos;
    if (typeof feeRate !== "number" || feeRate <= 0 || !Array.isArray(utxos) || utxos.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVALID_INPUT",
            message: "fee_rate_sat_vb must be a positive number and utxos must be a non-empty array",
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
