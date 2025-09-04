/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    async headers() {
      return [
        {
          // Apply these headers to all routes in your application
          source: '/(.*)',
          headers: [
            {
              key: 'X-Frame-Options',
              value: 'ALLOWALL',
            },
            {
              key: 'Content-Security-Policy',
              value: "frame-ancestors 'self' https://verifiedathletics.com",
            },
          ],
        },
      ];
    },
    images: {
      domains: [
        'ljmvmaidepqbiyjvxoyo.supabase.co'
      ],
    },
  };
  
  export default nextConfig;
  