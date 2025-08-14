import type { NextConfig } from "next";
import { API_URL } from '@/config';

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_URL}/api/:path*` },
    ];
  },
  
};

export default nextConfig;
