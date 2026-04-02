import { NextResponse } from "next/server";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { createHash } from "crypto";
import os from "os";
import path from "path";
import {
  getWorkspaceRoot,
  parseJsonFromCliOutput,
  runTxray,
} from "@/lib/server/txrayCli";

export const runtime = "nodejs";

function computeTxid(rawHex: string): string {
  const rawBytes = Buffer.from(rawHex, "hex");
  const first = createHash("sha256").update(rawBytes).digest();
  const second = createHash("sha256").update(first).digest();
  return Buffer.from(second).reverse().toString("hex");
}

function extractTxid(parsed: unknown): string | null {
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;

  if (typeof record.txid === "string") return record.txid;

  const tx = record.transaction;
  if (tx && typeof tx === "object") {
    const txRecord = tx as Record<string, unknown>;
    if (typeof txRecord.txid === "string") return txRecord.txid;
  }

  return null;
}

async function analyzeFixtureJson(
  body: unknown,
  tmpDir: string,
): Promise<NextResponse> {
  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  if (!payload) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Request body must be a JSON object",
        },
      },
      { status: 400 },
    );
  }

  const rawTx = typeof payload.raw_tx === "string" ? payload.raw_tx.trim() : "";
  if (!rawTx) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "MISSING_RAW_TX",
          message: "JSON body must include raw_tx",
        },
      },
      { status: 400 },
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(rawTx)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INVALID_RAW_TX",
          message: "raw_tx must be valid hexadecimal",
        },
      },
      { status: 400 },
    );
  }

  const fixture = {
    network: typeof payload.network === "string" ? payload.network : "mainnet",
    raw_tx: rawTx,
    prevouts: Array.isArray(payload.prevouts) ? payload.prevouts : [],
  };

  const derivedTxid = computeTxid(rawTx);

  const fixturePath = path.join(tmpDir, "fixture.json");
  await writeFile(fixturePath, JSON.stringify(fixture), "utf-8");

  const errors: string[] = [];
  let structure: unknown | null = null;
  let fingerprint: unknown | null = null;
  let advice: unknown | null = null;

  const [parseResult, fingerprintResult, adviseResult] = await Promise.all([
    runTxray(["parse", "tx", fixturePath]),
    runTxray(["fingerprint", fixturePath, "--json"]),
    runTxray(["advise", fixturePath, "--json"]),
  ]);

  if (parseResult.code === 0) {
    try {
      structure = parseJsonFromCliOutput(parseResult.stdout);
    } catch (error) {
      errors.push(
        `Structure parse error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  } else {
    errors.push(
      `Structure analysis failed: ${parseResult.stderr || "unknown error"}`,
    );
  }

  if (fingerprintResult.code === 0) {
    try {
      fingerprint = parseJsonFromCliOutput(fingerprintResult.stdout);
    } catch (error) {
      errors.push(
        `Fingerprint parse error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  } else {
    errors.push(
      `Fingerprint analysis failed: ${fingerprintResult.stderr || "unknown error"}`,
    );
  }

  if (adviseResult.code === 0) {
    try {
      advice = parseJsonFromCliOutput(adviseResult.stdout);
    } catch (error) {
      errors.push(
        `Advice parse error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  } else {
    errors.push(
      `Advice analysis failed: ${adviseResult.stderr || "unknown error"}`,
    );
  }

  if (!advice && !fingerprint) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CLI_ERROR",
          message: errors[0] || "Sherlock analysis failed",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    txid: extractTxid(structure) ?? derivedTxid,
    structure,
    privacy: {
      fingerprint,
      advice,
    },
    errors,
  });
}

export async function POST(req: Request) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-sherlock-"));

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await req.json();
      return analyzeFixtureJson(body, tmpDir);
    }

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNSUPPORTED_CONTENT",
            message: "Expected application/json or multipart/form-data",
          },
        },
        { status: 400 },
      );
    }

    const formData = await req.formData();
    const blkFile = formData.get("blk") as File | null;
    const revFile = formData.get("rev") as File | null;
    const xorFile = formData.get("xor") as File | null;

    if (!blkFile || !revFile || !xorFile) {
      const missing = [
        !blkFile ? "blk" : null,
        !revFile ? "rev" : null,
        !xorFile ? "xor" : null,
      ].filter(Boolean);
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "MISSING_FILES",
            message: `Missing required file(s): ${missing.join(", ")}`,
          },
        },
        { status: 400 },
      );
    }

    const blkPath = path.join(tmpDir, path.basename(blkFile.name));
    const revPath = path.join(tmpDir, path.basename(revFile.name));
    const xorPath = path.join(tmpDir, path.basename(xorFile.name));

    await Promise.all([
      writeFile(blkPath, Buffer.from(await blkFile.arrayBuffer())),
      writeFile(revPath, Buffer.from(await revFile.arrayBuffer())),
      writeFile(xorPath, Buffer.from(await xorFile.arrayBuffer())),
    ]);

    const result = await runTxray(["analyze", blkPath, revPath, xorPath]);
    if (result.code !== 0) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "CLI_ERROR",
            message: result.stderr || "txray analyze failed",
          },
        },
        { status: 500 },
      );
    }

    const json = parseJsonFromCliOutput(result.stdout);
    const stem = path.basename(blkFile.name, path.extname(blkFile.name));

    const workspaceRoot = getWorkspaceRoot();
    const outDir = path.join(workspaceRoot, "out");
    await mkdir(outDir, { recursive: true });
    await writeFile(
      path.join(outDir, `${stem}.json`),
      JSON.stringify(json),
      "utf-8",
    );

    return NextResponse.json({ ok: true, stem });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_ERROR", message } },
      { status: 500 },
    );
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
