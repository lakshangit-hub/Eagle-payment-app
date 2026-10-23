import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const APK_PATH = path.resolve(__dirname, 'app/build/outputs/apk/debug/app-debug.apk');
const PUBLIC_DIR = path.resolve(__dirname, 'app/src/main/assets/public');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Serve APK download directly
  if (
    pathname === '/download/eagle-credit.apk' ||
    pathname === '/eagle-credit.apk' ||
    pathname === '/app-debug.apk'
  ) {
    if (fs.existsSync(APK_PATH)) {
      const stat = fs.statSync(APK_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Disposition': 'attachment; filename="eagle-credit.apk"',
        'Content-Length': stat.size,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      });
      const stream = fs.createReadStream(APK_PATH);
      stream.pipe(res);
      return;
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK build file not found. Please assemble APK first.');
      return;
    }
  }

  // Dedicated Mobile Download Portal Page
  if (pathname === '/' || pathname === '/download' || pathname === '/download.html') {
    const apkSize = fs.existsSync(APK_PATH)
      ? `${(fs.statSync(APK_PATH).size / (1024 * 1024)).toFixed(1)} MB`
      : '22 MB';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Eagle Credit POS — Mobile APK Download</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0c182c;
      color: #ffffff;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
      text-align: center;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: #14233d;
      border: 1px solid #20375e;
      border-radius: 24px;
      padding: 32px 20px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .badge {
      display: inline-block;
      background: rgba(36, 116, 232, 0.2);
      border: 1px solid rgba(36, 116, 232, 0.4);
      color: #60a5fa;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 16px;
    }
    .logo-box {
      width: 72px;
      height: 72px;
      background: linear-gradient(135deg, #2474e8, #164e9a);
      border-radius: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
      font-size: 32px;
      box-shadow: 0 8px 24px rgba(36, 116, 232, 0.35);
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 6px;
      color: #ffffff;
    }
    .subtitle {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 24px;
      line-height: 1.4;
    }
    .download-btn {
      display: block;
      width: 100%;
      background: #2474e8;
      color: #ffffff;
      text-decoration: none;
      font-size: 16px;
      font-weight: 800;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(36, 116, 232, 0.4);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .download-btn:active {
      transform: scale(0.98);
      background: #1c62cb;
    }
    .meta-tag {
      font-size: 11px;
      color: #64748b;
      margin-top: 10px;
    }
    .instructions {
      text-align: left;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid #1e293b;
      border-radius: 16px;
      padding: 16px;
      margin-top: 24px;
      font-size: 12px;
      line-height: 1.5;
    }
    .instructions h3 {
      font-size: 12px;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .instructions ol {
      padding-left: 20px;
      color: #cbd5e1;
    }
    .instructions li {
      margin-bottom: 6px;
    }
    .pin-box {
      background: rgba(36, 116, 232, 0.15);
      border: 1px dashed #2474e8;
      border-radius: 8px;
      padding: 8px;
      margin-top: 8px;
      text-align: center;
      font-weight: 700;
      color: #93c5fd;
    }
    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Official Android POS App</div>
    <div class="logo-box">◈</div>
    <h1>Eagle Credit (PVT) LTD</h1>
    <p class="subtitle">Field Collection &amp; POS Mobile Terminal<br>Sunmi V2 &amp; Android Smartphone Edition</p>

    <a href="/download/eagle-credit.apk" class="download-btn" download="eagle-credit.apk">
      📲 Download APK (${apkSize})
    </a>
    <div class="meta-tag">Signed APK · Android 7.0+ (minSdk 24) · Verified</div>

    <div class="instructions">
      <h3>Quick 3-Step Setup</h3>
      <ol>
        <li>Tap the <strong>Download APK</strong> button above to download <code>eagle-credit.apk</code>.</li>
        <li>Open your notification or Downloads folder, tap the APK, and enable <em>"Allow from this source"</em> if prompted.</li>
        <li>Tap <strong>Install</strong> and open the app.</li>
      </ol>
      <div class="pin-box">
        Default Officer PIN: 4020
      </div>
    </div>
  </div>

  <div class="footer">
    Eagle Credit (PVT) LTD · Secure Field Operations
  </div>
</body>
</html>`;

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(html);
    return;
  }

  // Serve static assets from PUBLIC_DIR if available
  const filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
    };
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(302, { Location: '/' });
  res.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Eagle Credit APK Download server running on http://0.0.0.0:${PORT}`);
});
