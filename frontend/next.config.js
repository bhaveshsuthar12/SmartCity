/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const defaultApiUrl = isDev ? 'http://localhost:5000/api/v1' : 'https://backend-bhai.onrender.com/api/v1';
const defaultBackendUrl = isDev ? 'http://localhost:5000' : 'https://backend-bhai.onrender.com';
const defaultSocketUrl = isDev ? 'http://localhost:5000' : 'https://backend-bhai.onrender.com';

const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'res.cloudinary.com',
                pathname: '/**',
            },
        ],
    },
    // Environment variables exposed to the browser (must be prefixed NEXT_PUBLIC_)
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? defaultApiUrl,
        NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL ?? defaultBackendUrl,
        NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL ?? defaultSocketUrl,
        NEXT_PUBLIC_MAP_PROVIDER: process.env.NEXT_PUBLIC_MAP_PROVIDER ?? 'leaflet',
    },
};

module.exports = nextConfig;
