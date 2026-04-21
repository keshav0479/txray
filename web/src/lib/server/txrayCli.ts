import { execFile } from "child_process";
import { access, constants } from "fs/promises";
import path from "path";

type ExecResult = {
  stdout: string;
  stderr: string;
  code: number;
};

const MAX_BUFFER_BYTES = 1024 * 1024 * 50;
const DEFAULT_TIMEOUT_MS = 120_000;

function execFileAsync(
  bin: string,
  args: string[],
  cwd: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    execFile(
      bin,
      args,
      { cwd, timeout: timeoutMs, maxBuffer: MAX_BUFFER_BYTES },
      (error, stdout, stderr) => {
        resolve({
          stdout,
          stderr,
          code: typeof error?.code === "number" ? error.code : error ? 1 : 0,
        });
      },
    );
  });
}

export function getWorkspaceRoot(): string {
  const cwd = /* turbopackIgnore: true */ process.cwd();
  // In local Next dev route handlers, cwd is txray/web. In the standalone
  // Docker runtime it is /app, so do not walk above that into /.
  return path.basename(cwd) === "web"
    ? path.resolve(/* turbopackIgnore: true */ process.cwd(), "..")
    : cwd;
}

export async function resolveTxrayBinary(): Promise<string> {
  // Explicit override (used in Docker / production)
  const envBin = process.env.TXRAY_BIN;
  if (envBin) {
    try {
      await access(envBin, constants.X_OK);
      return envBin;
    } catch {
      throw new Error(
        `TXRAY_BIN is set to ${envBin} but that path is not executable`,
      );
    }
  }

  const workspaceRoot = getWorkspaceRoot();
  const releaseBin = path.join(
    /* turbopackIgnore: true */ workspaceRoot,
    "target",
    "release",
    "txray",
  );
  const debugBin = path.join(
    /* turbopackIgnore: true */ workspaceRoot,
    "target",
    "debug",
    "txray",
  );

  try {
    await access(releaseBin, constants.X_OK);
    return releaseBin;
  } catch {
    // fall through
  }

  try {
    await access(debugBin, constants.X_OK);
    return debugBin;
  } catch {
    throw new Error(
      "txray binary not found. Build it first with: cargo build -p txray-cli, or set TXRAY_BIN to the binary path",
    );
  }
}

export async function runTxray(
  args: string[],
  cwd = getWorkspaceRoot(),
): Promise<ExecResult> {
  const bin = await resolveTxrayBinary();
  return execFileAsync(bin, args, cwd);
}

export function parseJsonFromCliOutput(stdout: string): unknown {
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("CLI did not emit JSON output");
  }

  const jsonText = stdout.slice(start, end + 1);
  return JSON.parse(jsonText);
}
