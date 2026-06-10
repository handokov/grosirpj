import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
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
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

export default nextConfig;
