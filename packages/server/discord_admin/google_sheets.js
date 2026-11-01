const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleSheetsClient {
    constructor(credentialsPath, sheetId, sheetName) {
        this.sheetId = sheetId;
        this.sheetName = sheetName;
        this.auth = null;
        this.sheets = null;
        try {
            const credsFile = path.isAbsolute(credentialsPath)
                ? credentialsPath
                : path.join(__dirname, credentialsPath);
            const creds = JSON.parse(fs.readFileSync(credsFile, 'utf-8'));
            this.auth = new google.auth.JWT(creds.client_email, null, creds.private_key, ['https://www.googleapis.com/auth/spreadsheets']);
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });
            console.log(`[GoogleSheets] Connected: ${sheetName}`);
        } catch (e) {
            console.error(`[GoogleSheets] Error (${sheetName}): ${e.message}`);
        }
    }

    async appendRow(values) {
        if (!this.sheets) throw new Error('Sheets not connected');
        await this.sheets.spreadsheets.values.append({
            spreadsheetId: this.sheetId,
            range: `${this.sheetName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [values] },
        });
    }
}

module.exports = { GoogleSheetsClient };
