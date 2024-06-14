/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/v1-sdk-frontend-example',
  output: 'export',
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

function assertEnvVar(name) {
  if (!process.env[name]) {
    throw new Error(`${name} environment variable is not set`);
  }
}

assertEnvVar('NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID');

export default nextConfig;
