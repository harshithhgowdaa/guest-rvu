import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["exceljs-community"],
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
