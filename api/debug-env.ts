export default async function handler(req: any, res: any) {
    return res.status(200).json({
        SUPABASE_URL: process.env.SUPABASE_URL || 'not set',
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'not set'
    })
}
