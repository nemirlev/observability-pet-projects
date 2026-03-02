import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // So Alloy faro.receiver can resolve stack traces from disk (sourcemaps.location).
  productionBrowserSourceMaps: true,
};

export default nextConfig;
