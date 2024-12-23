/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Remove the experimental section since it's causing issues
  // experimental: {
  //   optimizeCss: true,
  // },
}

module.exports = nextConfig