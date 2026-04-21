import { afterEach, describe, expect, it } from "vitest";
import { getRateLimitKey } from "../rateLimit";

afterEach(() => {
  delete process.env.TXRAY_TRUST_PROXY_HEADERS;
});

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/test", { headers });
}

describe("rate limit keys", () => {
  it("does not trust spoofable forwarded headers by default", () => {
    const key = getRateLimitKey(
      request({
        "user-agent": "vitest",
        "x-forwarded-for": "203.0.113.8",
      }),
    );

    expect(key).toBe("direct:vitest");
  });

  it("uses trusted proxy headers only when explicitly enabled", () => {
    process.env.TXRAY_TRUST_PROXY_HEADERS = "true";

    const key = getRateLimitKey(
      request({
        "user-agent": "vitest",
        "x-forwarded-for": "203.0.113.8, 10.0.0.2",
      }),
    );

    expect(key).toBe("ip:203.0.113.8");
  });

  it("rejects malformed forwarded header values", () => {
    process.env.TXRAY_TRUST_PROXY_HEADERS = "true";

    const key = getRateLimitKey(
      request({
        "user-agent": "vitest",
        "x-forwarded-for": "bad value with spaces",
      }),
    );

    expect(key).toBe("direct:vitest");
  });
});
