import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["172.20.10.5"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
