import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @react-pdf/renderer y sus dependencias nativas no deben bundlearse en el
  // server bundle: la route del PDF las carga en runtime Node.
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig
