import { NextResponse } from "next/server";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  getWorkspaceRoot,
  parseJsonFromCliOutput,
  runTxray,
} from "@/lib/server/txrayCli";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-sherlock-"));

  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "UNSUPPORTED_CONTENT",
            message: "Expected multipart/form-data",
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
