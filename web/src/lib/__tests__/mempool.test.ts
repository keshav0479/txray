import { describe, expect, it } from "vitest";
import { detectSearchType } from "../mempool";

describe("detectSearchType", () => {
  it("flags small numbers as block heights", () => {
    expect(detectSearchType("0")).toBe("block_height");
    expect(detectSearchType("170")).toBe("block_height");
    expect(detectSearchType("800000")).toBe("block_height");
  });

  it("flags 64-char hex starting with many zeros as a block hash", () => {
    expect(
      detectSearchType(
        "00000000000000000002abcde0123456789abcdef0123456789abcdef0123456",
      ),
    ).toBe("block_hash");
  });

  it("flags 64-char hex without leading zeros as a txid", () => {
    expect(
      detectSearchType(
        "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b",
      ),
    ).toBe("txid");
  });

  it("returns unknown for short garbage", () => {
    expect(detectSearchType("hello world")).toBe("unknown");
    expect(detectSearchType("abc123")).toBe("unknown");
    expect(detectSearchType("")).toBe("unknown");
  });

  it("trims leading/trailing whitespace", () => {
    expect(detectSearchType("   170   ")).toBe("block_height");
  });
});
