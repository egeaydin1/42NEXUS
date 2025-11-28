import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    domains: ["cdn.intra.42.fr"],
  },
};

export default nextConfig;
