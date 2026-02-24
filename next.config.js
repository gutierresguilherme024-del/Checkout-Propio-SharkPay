/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    images: {
        domains: [
            'xxx.supabase.co', // Replace with your supabase domain
            'files.stripe.com',
        ],
    },
};

module.exports = nextConfig;
