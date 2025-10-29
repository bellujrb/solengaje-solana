/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  
  // Farcaster manifest redirect
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/01984a60-ba64-05f8-b4e7-8ada2d1e3654',
        permanent: false, // This creates a 307 redirect (temporary)
      },
    ];
  },
};

export default nextConfig;
