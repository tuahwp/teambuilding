/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/semak',
        destination: '/',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
