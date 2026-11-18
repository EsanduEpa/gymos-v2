import type { NextConfig } from "next";

// Next streams inline bootstrap scripts for partially prerendered pages.
// Restrict origins and executable content while keeping that rendering mode.
const development = process.env.NODE_ENV === 'development';
const contentSecurityDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "font-src 'self'",
  `connect-src 'self'${development ? ' ws://localhost:3000' : ''}`,
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
];
const defaultContentSecurityPolicy = [...contentSecurityDirectives, "form-action 'self'"].join('; ');
const checkoutContentSecurityPolicy = [...contentSecurityDirectives,
  "form-action 'self' https://sandbox.payhere.lk/pay/checkout",
].join('; ');

const nextConfig: NextConfig = {
  distDir: process.env.GYMOS_NEXT_DIST_DIR ?? '.next',
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: defaultContentSecurityPolicy },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ],
    }, {
      source: '/gyms/:slug/member/membership',
      headers: [{ key: 'Content-Security-Policy', value: checkoutContentSecurityPolicy }],
    }, {
      source: '/gyms/:slug/owner/subscription',
      headers: [{ key: 'Content-Security-Policy', value: checkoutContentSecurityPolicy }],
    }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
