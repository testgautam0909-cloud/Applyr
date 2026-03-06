import { google } from 'googleapis';
import fs from 'fs';
import { config } from './config.js';

export class GoogleDriveService {
    private drive: any = null;

    constructor() {
        const clientId = config.googleClientId;
        const clientSecret = config.googleClientSecret;
        const refreshToken = config.googleRefreshToken;

        if (!clientId || !clientSecret || !refreshToken) {
            console.error('[GoogleDrive] ✗ Missing OAuth2 credentials. Need:');
            console.error('[GoogleDrive]   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN');
            console.error('[GoogleDrive]   Run: npx ts-node src/scripts/getDriveToken.ts  to generate them');
            return;
        }

        try {
            const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
            oauth2.setCredentials({ refresh_token: refreshToken });

            this.drive = google.drive({ version: 'v3', auth: oauth2 });
        } catch (err: any) {
            console.error('[GoogleDrive] ✗ Failed to initialize:', err.message);
        }
    }

    async uploadFile(filePath: string, fileName: string, mimeType: string): Promise<string> {
        if (!this.drive) {
            console.error(`[GoogleDrive] ✗ Not initialized — returning local:// for "${fileName}"`);
            return `local://${fileName}`;
        }

        if (!fs.existsSync(filePath)) {
            console.error(`[GoogleDrive] ✗ File not found: "${filePath}"`);
            return `local://${fileName}`;
        }

        const folderId = config.googleDriveFolderId;
        console.log(`[GoogleDrive] Uploading "${fileName}"${folderId ? ` to folder ${folderId}` : ''} …`);

        try {
            const createRes = await this.drive.files.create({
                requestBody: {
                    name: fileName,
                    mimeType,
                    ...(folderId ? { parents: [folderId] } : {}),
                },
                media: {
                    mimeType,
                    body: fs.createReadStream(filePath),
                },
                fields: 'id',
            });

            const fileId: string = createRes.data.id!;
            console.log(`[GoogleDrive] ✓ Created file id=${fileId}`);

            await this.drive.permissions.create({
                fileId,
                requestBody: { role: 'reader', type: 'anyone' },
            });

            const url = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

            try { fs.unlinkSync(filePath); } catch { /* ok */ }

            return url;
        } catch (err: any) {
            console.error(`[GoogleDrive] ✗ Upload failed: ${err.message}`);
            return `local://${fileName}`;
        }
    }

    async ping(): Promise<boolean> {
        if (!this.drive) return false;
        try {
            await this.drive.files.list({ pageSize: 1, fields: 'files(id)' });
            console.log('[GoogleDrive] ✓ Connection OK');
            return true;
        } catch (err: any) {
            console.error('[GoogleDrive] ✗ Ping failed:', err.message);
            return false;
        }
    }

    async deleteFileByUrl(url: string): Promise<boolean> {
        if (!this.drive || !url || !url.includes('drive.google.com')) return false;

        try {
            const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
            if (!match || !match[1]) return false;

            const fileId = match[1];
            await this.drive.files.delete({ fileId });
            console.log(`[GoogleDrive] ✓ Deleted file id=${fileId}`);
            return true;
        } catch (err: any) {
            console.error(`[GoogleDrive] ✗ Delete failed for ${url}: ${err.message}`);
            return false;
        }
    }
}