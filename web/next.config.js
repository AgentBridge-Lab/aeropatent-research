/** @type {import('next').NextConfig} */
const isGithubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  output: 'export',
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubPages ? '/aeropatent-research' : '',
  },
  images: {
    unoptimized: true,
  },
  basePath: isGithubPages ? '/aeropatent-research' : '',
  assetPrefix: isGithubPages ? '/aeropatent-research/' : '',
};

module.exports = nextConfig;
