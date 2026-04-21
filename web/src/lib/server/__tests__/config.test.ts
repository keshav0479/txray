import { afterEach, describe, expect, it } from "vitest";
import { getApiSources, getDataDir, getPrimaryApiBase, getResultsDir } from "../config";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("server config", () => {
  it("deduplicates and normalizes configured API sources", () => {
    process.env.TXRAY_MEMPOOL_API = "https://example.com/api/";
    process.env.TXRAY_ESPLORA_API = "https://example.com/api";

    expect(getApiSources()).toEqual(["https://example.com/api"]);
    expect(getPrimaryApiBase()).toBe("https://example.com/api");
  });

  it("uses a writable runtime data directory instead of the workspace root", () => {
    process.env.TXRAY_DATA_DIR = "/tmp/custom-txray";

    expect(getDataDir()).toBe("/tmp/custom-txray");
    expect(getResultsDir()).toBe("/tmp/custom-txray/out");
  });
});
