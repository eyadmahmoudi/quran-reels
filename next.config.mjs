/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // @huggingface/transformers is only ever used client-side (via a
  // dynamic import in lib/concept-search.ts). Marking it external on
  // the server side prevents Next from trying to bundle the
  // onnxruntime-node native bindings during SSR build.
  serverExternalPackages: ['@huggingface/transformers'],
}

export default nextConfig
