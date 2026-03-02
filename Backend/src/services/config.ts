import dotenv from 'dotenv';
dotenv.config();

export const config = {
    googleApiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",
    maxTextLength: 8000,
    maxRetries: 3,
    port: process.env.PORT || 3000,
};

if (!config.googleApiKey) {
    console.error('❌ GOOGLE_API_KEY missing in .env');
    process.exit(1);
}
