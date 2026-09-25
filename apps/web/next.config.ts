import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Produce a self-contained .next/standalone build for cPanel/Phusion Passenger
  output: "standalone",
  // Keep Prisma/auth workspace packages external on the server (not bundled)
  serverExternalPackages: ["@festas/db", "@festas/auth", "@prisma/client", "@resvg/resvg-wasm", "jpeg-js"],
  typedRoutes: true,
  // Assets lidos via fs no runtime do servidor (convite preenchido anexado ao
  // email de confirmação) - incluídos no build standalone para o cPanel.
  outputFileTracingIncludes: {
    "/api/reservas": [path.join(__dirname, "assets", "convite", "**", "*")],
    "/api/reservas/[id]/convite": [path.join(__dirname, "assets", "convite", "**", "*")],
    "/api/emails/reprocessar": [path.join(__dirname, "assets", "convite", "**", "*")],
  },
  compiler: {
    styledComponents: true,
  },
  // Monorepo root so standalone output traces workspace packages (@festas/*, @saas/*)
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  images: {
    unoptimized: true,
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
