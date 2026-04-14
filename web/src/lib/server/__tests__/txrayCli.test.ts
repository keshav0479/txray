import { describe, expect, it } from "vitest";
import { parseJsonFromCliOutput } from "../txrayCli";

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
