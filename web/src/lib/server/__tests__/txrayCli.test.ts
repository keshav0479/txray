import { afterEach, describe, expect, it, vi } from "vitest";
import { getWorkspaceRoot, parseJsonFromCliOutput } from "../txrayCli";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseJsonFromCliOutput", () => {
  it("extracts a plain JSON object", () => {
    const out = '{"ok":true,"count":3}';
    expect(parseJsonFromCliOutput(out)).toEqual({ ok: true, count: 3 });
  });

  it("ignores surrounding log lines the CLI prints", () => {
    const out = [
      "Loading fixture...",
      'Parsing tx "fixture.json"',
      '{"txid":"abcdef","inputs":[],"outputs":[]}',
      "Done.",
    ].join("\n");
    const parsed = parseJsonFromCliOutput(out) as {
      txid: string;
      inputs: unknown[];
      outputs: unknown[];
    };
    expect(parsed.txid).toBe("abcdef");
    expect(parsed.inputs).toHaveLength(0);
    expect(parsed.outputs).toHaveLength(0);
  });

  it("throws when there's no JSON in the output", () => {
    expect(() => parseJsonFromCliOutput("no json here at all")).toThrow(
      /did not emit JSON/,
    );
  });

  it("picks the outermost braces, not the inner ones", () => {
    const out = 'prelude {"outer":{"inner":1}} trailing';
    expect(parseJsonFromCliOutput(out)).toEqual({ outer: { inner: 1 } });
  });
});

describe("getWorkspaceRoot", () => {
  it("walks up from the local web directory in development", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/repo/txray/web");
    expect(getWorkspaceRoot()).toBe("/repo/txray");
  });

  it("keeps the standalone runtime cwd instead of resolving to /", () => {
    vi.spyOn(process, "cwd").mockReturnValue("/app");
    expect(getWorkspaceRoot()).toBe("/app");
  });
});
