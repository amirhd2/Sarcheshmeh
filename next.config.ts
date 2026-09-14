import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "ais-dev-ctwb7czmev2nk4kjny4ev5-9084906297.us-west2.run.app",
    "ais-pre-ctwb7czmev2nk4kjny4ev5-9084906297.us-west2.run.app",
    "*.run.app",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
