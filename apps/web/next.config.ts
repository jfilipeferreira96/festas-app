import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Produce a self-contained .next/standalone build for cPanel/Phusion Passenger
  output: "standalone",
  // Keep Prisma/auth workspace packages external on the server (not bundled)
  serverExternalPackages: ["@festas/db", "@festas/auth", "@prisma/client"],
  typedRoutes: true,
  compiler: {
    styledComponents: true,
  },
  // Monorepo root so standalone output traces workspace packages (@festas/*, @saas/*)
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Fix for Leaflet with Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
