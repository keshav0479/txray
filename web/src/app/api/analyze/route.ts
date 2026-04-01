import { NextResponse } from "next/server";
import { access, constants, mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import {
  getWorkspaceRoot,
  parseJsonFromCliOutput,
  runTxray,
} from "@/lib/server/txrayCli";

export const runtime = "nodejs";

const DEMO_FIXTURES: Record<string, { blk: string; rev: string }> = {
  "04330": { blk: "blk04330.dat", rev: "rev04330.dat" },
  "05051": { blk: "blk05051.dat", rev: "rev05051.dat" },
};

async function firstExistingPath(candidates: string[]): Promise<string | null> {
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.R_OK);
      return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

async function resolveDemoFixturePaths(
  id: string,
): Promise<{ blkPath: string; revPath: string; xorPath: string } | null> {
  const fixture = DEMO_FIXTURES[id];
  if (!fixture) return null;

  const workspaceRoot = getWorkspaceRoot();
  const blocksCandidateDirs = [
    path.join(workspaceRoot, "fixtures", "blocks"),
    path.resolve(
      workspaceRoot,
      "..",
      "2026-developer-challenge-1-chain-lens-keshav0479",
      "fixtures",
      "blocks",
    ),
    path.resolve(
      workspaceRoot,
      "..",
      "2026-developer-challenge-3-sherlock-keshav0479",
      "fixtures",
    ),
  ];

  for (const dir of blocksCandidateDirs) {
    const blkPath = path.join(dir, fixture.blk);
    const revPath = path.join(dir, fixture.rev);
    const xorPath = path.join(dir, "xor.dat");

    const found = await firstExistingPath([blkPath, revPath, xorPath]);
    if (!found) continue;

    try {
      await Promise.all([
        access(blkPath, constants.R_OK),
        access(revPath, constants.R_OK),
        access(xorPath, constants.R_OK),
      ]);
      return { blkPath, revPath, xorPath };
    } catch {
      // try next directory
    }
  }

  return null;
}

async function parseTxFixtureJson(fixture: unknown, tmpDir: string): Promise<NextResponse> {
  const fixturePath = path.join(tmpDir, "fixture.json");
  await writeFile(fixturePath, JSON.stringify(fixture), "utf-8");

  const result = await runTxray(["parse", "tx", fixturePath]);
  if (result.code !== 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CLI_ERROR",
          message: result.stderr || "txray parse tx failed",
        },
      },
      { status: 500 },
    );
  }

  const output = parseJsonFromCliOutput(result.stdout);
  return NextResponse.json(output);
}

async function parseBlockFiles(
  blkPath: string,
  revPath: string,
  xorPath: string,
): Promise<NextResponse> {
  const result = await runTxray(["parse", "block", blkPath, revPath, xorPath]);
  if (result.code !== 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CLI_ERROR",
          message: result.stderr || "txray parse block failed",
        },
      },
      { status: 500 },
    );
  }

  const output = parseJsonFromCliOutput(result.stdout);
  if (typeof output === "object" && output !== null) {
    return NextResponse.json({ ...(output as Record<string, unknown>), is_block: true });
  }

  return NextResponse.json(output);
}

export async function POST(req: Request) {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "txray-analyze-"));

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;

      const demoFixture = typeof body.demoFixture === "string" ? body.demoFixture : null;
      if (demoFixture) {
        const fixturePaths = await resolveDemoFixturePaths(demoFixture);
        if (!fixturePaths) {
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: "DEMO_NOT_FOUND",
                message: `Demo fixture ${demoFixture} is not available`,
              },
            },
            { status: 404 },
          );
        }
        return parseBlockFiles(
          fixturePaths.blkPath,
          fixturePaths.revPath,
          fixturePaths.xorPath,
        );
      }

      return parseTxFixtureJson(body, tmpDir);
    }

    if (contentType.includes("multipart/form-data")) {
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

      return parseBlockFiles(blkPath, revPath, xorPath);
    }

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
