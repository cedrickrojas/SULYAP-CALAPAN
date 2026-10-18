import QRCode from 'qrcode';
import { qrColors, qrLayout } from './qr-layout.js';

let logoPromise;

function loadLogo() {
  if (!logoPromise) {
    logoPromise = (async () => {
      const image = new Image();
      image.src = '/branding/sulyap-logo.jpg';
      await image.decode();
      // Match the branding SVG's viewBox crop, using its original raster image.
      // Nested SVG images can lose their contents when rasterized by mobile WebKit.
      const canvas = document.createElement('canvas');
      canvas.width = 995;
      canvas.height = 1060;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare the QR logo');
      context.drawImage(image, 130, 95, 995, 1060, 0, 0, 995, 1060);
      return { image: canvas, dataUrl: canvas.toDataURL('image/png') };
    })().catch(error => {
      logoPromise = undefined;
      throw error;
    });
  }
  return logoPromise;
}

export async function brandedQrSvg(url, { width = 360, margin = 4 } = {}) {
  const logo = await loadLogo();
  const { version, plateSize, start } = qrLayout(url, margin);
  const svg = await QRCode.toString(url, {
    type: 'svg', width, margin, version,
    errorCorrectionLevel: 'H', color: qrColors,
  });
  const logoSize = plateSize - 2;
  return svg.replace('</svg>',
    `<rect x="${start}" y="${start}" width="${plateSize}" height="${plateSize}" fill="#fff"/>` +
    `<image href="${logo.dataUrl}" x="${start + 1}" y="${start + 1}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/></svg>`);
}

export async function brandedQrDataUrl(url, options) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await brandedQrSvg(url, options));
}

// Phone galleries and photo pickers need a raster image rather than an SVG.
export async function brandedQrPngBlob(url, { width = 1000, margin = 4 } = {}) {
  const logo = await loadLogo();
  const { version, size, plateSize, start } = qrLayout(url, margin);
  const canvas = document.createElement('canvas');
  await QRCode.toCanvas(canvas, url, {
    width, margin, version, errorCorrectionLevel: 'H', color: qrColors,
  });
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare the QR image');
  const scale = canvas.width / size;
  context.fillStyle = '#ffffff';
  context.fillRect(start * scale, start * scale, plateSize * scale, plateSize * scale);
  // Composite the decoded raster logo directly; do not rasterize a nested SVG.
  const logoHeight = (plateSize - 2) * scale;
  const logoWidth = logoHeight * logo.image.width / logo.image.height;
  context.drawImage(logo.image, (canvas.width - logoWidth) / 2, (canvas.height - logoHeight) / 2, logoWidth, logoHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export the QR image'));
    }, 'image/png');
  });
}

// Prepare before the tap: native sharing must run within the user's gesture.
export async function prepareQrExport(url, filename) {
  const blob = await brandedQrPngBlob(url);
  const imageUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not prepare the QR preview'));
    reader.readAsDataURL(blob);
  });
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
  return { file: new File([blob], filename, { type: 'image/png' }), imageUrl };
}
