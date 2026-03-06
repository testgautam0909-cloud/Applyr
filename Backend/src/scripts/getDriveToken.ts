/**
 * One-time script to generate a Google OAuth2 refresh token for Drive uploads.
 *
 * Prerequisites:
 *   1. Go to https://console.cloud.google.com/apis/credentials
 *   2. Create an OAuth 2.0 Client ID (type: Desktop app)
 *   3. Copy the Client ID and Client Secret
 *   4. Add them to your .env:
 *        GOOGLE_CLIENT_ID=your-client-id
 *        GOOGLE_CLIENT_SECRET=your-client-secret
 *
 * Usage:
 *   npx tsx src/scripts/getDriveToken.ts
 *
 * It will open a browser for you to authorize. Once done,
 * paste the code back into the terminal and it will print
 * the GOOGLE_REFRESH_TOKEN to add to your .env.
 */

import dotenv from 'dotenv';
dotenv.config();

import { google } from 'googleapis';
import readline from 'readline';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.');
    console.error('   → Go to https://console.cloud.google.com/apis/credentials');
    console.error('   → Create OAuth 2.0 Client ID (Desktop app)');
    process.exit(1);
}

const oauth2 = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'   // out-of-band redirect for CLI
);

const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
});

console.log('\n🔗 Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nAuthorize the app, then paste the code below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Enter the authorization code: ', async (code) => {
    try {
        const { tokens } = await oauth2.getToken(code.trim());
        console.log('\n✅ Success! Add this to your .env file:\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\nThen restart the server.');
    } catch (err: any) {
        console.error('❌ Failed to exchange code:', err.message);
    }
    rl.close();
});
