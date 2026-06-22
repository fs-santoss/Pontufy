import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  outputFileTracingIncludes: {
    "/api/**": ["./prisma/dev.db"],
    "/dashboard": ["./prisma/dev.db"],
    "/admin/**": ["./prisma/dev.db"],
    "/player/**": ["./prisma/dev.db"],
  },
};

export default nextConfig;
