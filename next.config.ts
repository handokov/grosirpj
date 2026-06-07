import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["prisma", "@prisma/client"],
  allowedDevOrigins: [
    ".space-z.ai",
    ".vercel.app",
  ],
};

export default nextConfig;
