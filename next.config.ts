import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
   webpack: (config, { isServer }) => {
    // This is the standard solution to the "Module not found: Can't resolve 'child_process'" error with mongodb.
    // It excludes a module that's not needed and causes build issues.
    config.externals.push('mongodb-client-encryption');
    return config;
  }
};

export default nextConfig;
