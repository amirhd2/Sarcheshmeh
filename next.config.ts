import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true";
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split("/")[1] : "";
const basePath = isGithubPages && repoName && !repoName.endsWith(".github.io") ? `/${repoName}` : "";

const nextConfig: NextConfig = {
  output: isGithubPages ? "export" : "standalone",
  basePath: basePath || undefined,
  assetPrefix: basePath ? `${basePath}/` : undefined,
  images: {
    unoptimized: true,
  },
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

