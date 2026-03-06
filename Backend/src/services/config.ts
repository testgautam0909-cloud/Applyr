import dotenv from 'dotenv';
dotenv.config();

const keys = process.env.GOOGLE_API_KEYS
    ? process.env.GOOGLE_API_KEYS.split(',').map(k => k.trim()).filter(Boolean)
    : process.env.GOOGLE_API_KEY ? [process.env.GOOGLE_API_KEY.trim()] : [];

if (!keys.length) {
    console.error('❌ GOOGLE_API_KEYS or GOOGLE_API_KEY missing in .env');
    process.exit(1);
}

if (!process.env.OPENROUTER_API_KEY) {
    console.error('❌ OPENROUTER_API_KEY missing in .env');
    process.exit(1);
}

if (!process.env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    console.warn('⚠️  GOOGLE_SERVICE_ACCOUNT_PATH missing — Google Drive upload will fail');
}

console.log(`[Config] ${keys.length} Google API key(s) loaded`);

export const config = {
    googleApiKeys: keys,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openAIModel: 'openai/gpt-oss-120b:free',
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: 'llama-3.3-70b-versatile',
    googleServiceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_PATH
        ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_PATH)
        : null,
    googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
    googleClientId: process.env.GOOGLE_CLIENT_ID,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    maxTextLength: 8000,
    maxRetries: 3,
    port: process.env.PORT || 3000,
} as const;
