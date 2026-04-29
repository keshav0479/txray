import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  reactCompiler: true,
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
  output: "standalone",
  outputFileTracingExcludes: {
    "/api/analyze": [
      "./*.config.*",
      "./*.md",
      "./src/**/*",
      "./tsconfig*.json",
      "./tsconfig.tsbuildinfo",
      "./vitest.config.mts",
    ],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
        ],
      },
    ];
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: ["remark-gfm"],
    rehypePlugins: [
      ["rehype-pretty-code", { theme: "github-dark", keepBackground: false }]
    ],
  },
});

export default withMDX(nextConfig);
