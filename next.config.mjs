/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pbcdnw.aoneroom.com' },
      { protocol: 'https', hostname: 'macdn.aoneroom.com' },
      { protocol: 'https', hostname: 'bcdnxw.hakunaymatata.com' },
      { protocol: 'https', hostname: '**.aoneroom.com' },
      { protocol: 'https', hostname: '**.hakunaymatata.com' },
      { protocol: 'https', hostname: 'h5-static.aonerroom.com' },
    ],
  },
  reactStrictMode: true,
};

export default nextConfig;
