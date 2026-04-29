import { describe, expect, it } from "vitest";
import { extractInputRefs, fetchPrevouts } from "../prevoutFetcher";

// Genesis coinbase - its input txid is all zeros, so extractInputRefs
// must filter it out (coinbase inputs have no prevout).
const GENESIS_COINBASE_HEX =
  "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000";

// A real block 170 transaction (Hal Finney -> Satoshi), non-coinbase.
// Single input, two outputs, pre-segwit. Canonical txid:
// f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16
const FIRST_NONCOINBASE_HEX =
  "0100000001c997a5e56e104102fa209c6a852dd90660a20b2d9c352423edce25857fcd3704000000004847304402204e45e16932b8af514961a1d3a1a25fdf3f4f7732e9d624c6c61548ab5fb8cd410220181522ec8eca07de4860a4acdd12909d831cc56cbbac4622082221a8768d1d0901ffffffff0200ca9a3b00000000434104ae1a62fe09c5f51b13905f07f06b99a2f7159b2225f374cd378d71302fa28414e7aab37397f554a7df5f142c21c1b7303b8a0626f1baded5c72a704f7e6cd84cac00286bee0000000043410411db93e1dcdb8a016b49840f8c53bc1eb68a382e97b1482ecad7b148a6909a5cb2e0eaddfb84ccf9744464f82e160bfa9b8b64f9d4c03f999b8643f656b412a3ac00000000";

describe("extractInputRefs", () => {
  it("filters out coinbase (null) inputs", () => {
    const refs = extractInputRefs(GENESIS_COINBASE_HEX);
    expect(refs).toEqual([]);
  });

  it("extracts the single input of block-170 tx", () => {
    const refs = extractInputRefs(FIRST_NONCOINBASE_HEX);
    expect(refs).toHaveLength(1);
    expect(refs[0].vout).toBe(0);
    expect(refs[0].txid).toMatch(/^[0-9a-f]{64}$/);
    // The parent is Satoshi's coinbase from block 9 - txid is well known.
    expect(refs[0].txid).toBe(
      "0437cd7f8525ceed2324359c2d0ba26006d92d856a9c20fa0241106ee5a597c9",
    );
  });

  it("rejects invalid raw hex before trying to fetch prevouts", () => {
    expect(() => extractInputRefs("abc")).toThrow(/odd length/);
    expect(() => extractInputRefs("zz")).toThrow(/non-hex/);
  });

  it("rejects truncated transactions cleanly", () => {
    expect(() => extractInputRefs(`0100000001${"00".repeat(5)}`)).toThrow(
      /ended while reading input 0 outpoint/,
    );
  });
});

describe("fetchPrevouts", () => {
  it("rejects unusually wide fan-out before hitting upstream APIs", async () => {
    const refs = Array.from({ length: 101 }, (_, index) => ({
      txid: index.toString(16).padStart(64, "0"),
      vout: 0,
    }));

    await expect(fetchPrevouts(refs)).rejects.toThrow(
      /Too many unique parent transactions/,
    );
  });
});
