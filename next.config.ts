import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    /**
     * `lucide-react` exposes hundreds of icons from one entry point. This
     * rewrites the imports so a page only pulls in the icons it actually uses
     * instead of the whole barrel.
     */
    optimizePackageImports: ['lucide-react'],

    /**
     * How long the client may reuse an already-fetched RSC payload when moving
     * between pages. A short window makes admin navigation feel instant while
     * still re-checking soon after. Explicit `router.refresh()` calls (the
     * live queue boards) always bypass this, so freshness is unaffected.
     */
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
};

export default nextConfig;
