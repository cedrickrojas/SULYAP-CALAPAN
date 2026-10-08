import QRCode from 'qrcode';

let logoPromise;

function loadLogo() {
  if (!logoPromise) {
    logoPromise = fetch('/branding/sulyap-logo.svg').then(async response => {
      if (!response.ok) throw new Error('Could not load the QR logo');
      return 'data:image/svg+xml;base64,' + btoa(await response.text());
    }).catch(error => {
      logoPromise = undefined;
      throw error;
    });
  }
  return logoPromise;
}

export async function brandedQrSvg(url, { width = 360, margin = 4 } = {}) {
  const logo = await loadLogo();
  const code = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const svg = await QRCode.toString(url, {
    type: 'svg', width, margin, version: code.version,
    errorCorrectionLevel: 'H', color: { dark: '#30232b', light: '#ffffff' },
  });
  // Keep the logo plate small and align its edges to whole QR modules.
  let plateSize = Math.floor(code.modules.size * 0.2);
  if (plateSize % 2 === 0) plateSize -= 1;
  const start = margin + (code.modules.size - plateSize) / 2;
  const logoSize = plateSize - 2;
  return svg.replace('</svg>',
    `<rect x="${start}" y="${start}" width="${plateSize}" height="${plateSize}" fill="#fff"/>` +
    `<image href="${logo}" x="${start + 1}" y="${start + 1}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/></svg>`);
}

export async function brandedQrDataUrl(url, options) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(await brandedQrSvg(url, options));
}
