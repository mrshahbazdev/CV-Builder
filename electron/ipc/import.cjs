const { ipcMain } = require('electron');

// pdf.js runs here in the main process: Node has no CSP, no opaque file://
// origin, and no worker-src restriction — a bundled ESM worker would be
// blocked in the packaged renderer. The file already arrives as base64
// from app:openFile, so no extra disk access is needed.
let pdfjsPromise = null;
function pdfjs() {
  if (!pdfjsPromise) pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsPromise;
}

function registerImportIPC() {
  ipcMain.handle('import:pdfText', async (_e, { base64 }) => {
    const { getDocument } = await pdfjs();
    const data = new Uint8Array(Buffer.from(base64, 'base64'));
    const pdf = await getDocument({ data, isEvalSupported: false }).promise;
    try {
      const parts = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        parts.push(tc.items.map(it => it.str).join('\n'));
      }
      return parts.join('\n');
    } finally {
      await pdf.destroy();
    }
  });
}

module.exports = { registerImportIPC };
