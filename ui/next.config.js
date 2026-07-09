/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [{ source: "/", destination: "/rustlings", permanent: false }];
  },
  async rewrites() {
    // Proxy all API calls to the Rust API server.
    // In production both run in the same container: Next.js on 8080, Rust on 3000.
    // In local dev Next.js runs on 3001 and proxies to Rust on 3000.
    const apiBase = process.env.API_BASE_URL ?? "http://localhost:3000";
    return [
      { source: "/auth/:path*",                destination: `${apiBase}/auth/:path*` },
      { source: "/user/:path*",                destination: `${apiBase}/user/:path*` },
      { source: "/rustlings/categories",       destination: `${apiBase}/rustlings/categories` },
      { source: "/rustlings/categories/:slug", destination: `${apiBase}/rustlings/categories/:slug` },
      { source: "/rustlings/run",              destination: `${apiBase}/rustlings/run` },
    ];
  },
};

export default nextConfig;
