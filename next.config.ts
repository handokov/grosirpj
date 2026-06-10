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
    "127.0.0.1:3000",
    "127.0.0.1:81",
    "21.0.14.92:3000",
    "21.0.14.92:81",
  ],
};

export default nextConfig;
