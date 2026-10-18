import { readFile } from 'node:fs/promises';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { getDestination, destinationInformationPath } from '../src/destinations.js';
import { qrColors, qrFilename, qrLayout } from '../src/qr-layout.js';

let logoPromise;
function logoImage() {
  if (!logoPromise) {
    logoPromise = readFile(new URL('../public/branding/sulyap-logo.jpg', import.meta.url))
      .then(bytes => sharp(bytes).extract({ left: 130, top: 95, width: 995, height: 1060 }).png().toBuffer())
      .catch(error => { logoPromise = undefined; throw error; });
  }
  return logoPromise;
}

async function renderQr(url) {
  const width = 1000, margin = 4;
  const { version, size, plateSize, start } = qrLayout(url, margin);
  const scale = width / size;
  const plateStart = Math.floor(start * scale);
  const plateEnd = Math.ceil((start + plateSize) * scale);
  const logoHeight = Math.round((plateSize - 2) * scale);
  const logoWidth = Math.round(logoHeight * 995 / 1060);
  const png = await QRCode.toBuffer(url, {
    type: 'png', width, margin, version, errorCorrectionLevel: 'H', color: qrColors,
  });
  const logo = await sharp(await logoImage()).resize(logoWidth, logoHeight).png().toBuffer();
  return sharp(png).composite([
    { input: { create: { width: plateEnd - plateStart, height: plateEnd - plateStart, channels: 3, background: '#fff' } }, left: plateStart, top: plateStart },
    { input: logo, left: Math.round((width - logoWidth) / 2), top: Math.round((width - logoHeight) / 2) },
  ]).png().toBuffer();
}

export function createQrDownloadHandler({ siteUrl = process.env.VITE_PUBLIC_SITE_URL } = {}) {
  return async function qrDownload(request, response) {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      response.statusCode = 405;
      response.end('Method not allowed');
      return;
    }
    try {
      const host = request.headers.host;
      const protocol = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? 'http' : 'https';
      const requestUrl = new URL(request.url, `${protocol}://${host}`);
      const destination = getDestination(requestUrl.searchParams.get('id'));
      if (!destination) {
        response.statusCode = 404;
        response.end('Destination not found');
        return;
      }
      const url = new URL(destinationInformationPath(destination), siteUrl || requestUrl.origin).href;
      const png = await renderQr(url);
      response.setHeader('Content-Type', 'image/png');
      response.setHeader('Content-Disposition', `attachment; filename="${qrFilename(destination)}"`);
      response.setHeader('Content-Length', png.length);
      response.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.statusCode = 200;
      response.end(request.method === 'HEAD' ? undefined : png);
    } catch {
      response.setHeader('Cache-Control', 'no-store');
      response.statusCode = 500;
      response.end('The QR download could not be prepared. Please try again.');
    }
  };
}
