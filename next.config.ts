import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["prisma", "@prisma/client"],
  allowedDevOrigins: [
    ".space-z.ai",
    "space-z.ai",
    ".vercel.app",
    "vercel.app",
    "localhost:81",
    "0.0.0.0:3000",
    "localhost:3000",
  ],
};

export default nextConfig;
