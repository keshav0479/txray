import { describe, expect, it } from "vitest";

// Smoke-level coverage for every API route module. Importing each one
// is enough to fail CI on broken imports, missing type exports, or a
// syntax regression in the shared server libs. The routes that fan out
// to the txray binary are exercised end-to-end by the Rust cli_smoke
// tests and the docker healthcheck - these tests stay hermetic.

type RouteModule = {
  GET?: unknown;
  POST?: unknown;
};

const ROUTES: { name: string; verbs: ("GET" | "POST")[]; loader: () => Promise<RouteModule> }[] = [
  { name: "health",              verbs: ["GET"],  loader: () => import("../health/route") },
  { name: "analyze",             verbs: ["POST"], loader: () => import("../analyze/route") },
  { name: "build",               verbs: ["POST"], loader: () => import("../build/route") },
  { name: "tx/[txid]",           verbs: ["GET"],  loader: () => import("../tx/[txid]/route") },
  { name: "block/[height]",      verbs: ["GET"],  loader: () => import("../block/[height]/route") },
  { name: "results/[stem]",      verbs: ["GET"],  loader: () => import("../results/[stem]/route") },
  { name: "sherlock/analyze",    verbs: ["POST"], loader: () => import("../sherlock/analyze/route") },
  { name: "sherlock/block/[height]", verbs: ["GET"], loader: () => import("../sherlock/block/[height]/route") },
];

describe("api routes", () => {
  for (const route of ROUTES) {
    it(`/api/${route.name} exports ${route.verbs.join(", ")}`, async () => {
      const mod = await route.loader();
      for (const verb of route.verbs) {
        expect(typeof mod[verb]).toBe("function");
      }
    });
  }

  it("health GET returns a Response object", async () => {
    const { GET } = await import("../health/route");
    // resolveTxrayBinary() will throw because TXRAY_BIN isn't set and no
    // built binary exists under target/; we expect a 503 and a JSON body.
    const res: Response = await (GET as () => Promise<Response>)();
    expect(res).toBeInstanceOf(Response);
    expect([200, 503]).toContain(res.status);
    const body = await res.json();
    expect(body).toHaveProperty("ok");
  });
});
